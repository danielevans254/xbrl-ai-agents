import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { z } from 'zod';

export const runtime = 'edge';
export const maxDuration = 60;

// Constants
const MAX_DATA_SIZE = 1024 * 1024 * 5; // 5MB for bulk updates
const OPERATION_TIMEOUT = 15000; // 15 seconds for bulk operations
const MAX_BATCH_SIZE = 100; // Maximum number of records to update in one request
const ERROR_MESSAGES = {
  MISSING_ENV: 'Database configuration is incomplete',
  MISSING_DATA: 'Data payload is required',
  DATA_TOO_LARGE: 'Data payload exceeds maximum allowed size',
  DATABASE_ERROR: 'Database operation failed',
  SERVER_ERROR: 'Internal server error occurred',
  BATCH_TOO_LARGE: 'Batch size exceeds maximum allowed limit',
  INVALID_ITEMS: 'One or more items in the batch are invalid',
  ITEM_NOT_FOUND: 'One or more items could not be found to update'
};

const logger = {
  info: (message: string, meta?: Record<string, any>) => {
    console.log(JSON.stringify({
      level: 'info',
      message,
      timestamp: new Date().toISOString(),
      ...meta
    }));
  },
  error: (message: string, error?: any, meta?: Record<string, any>) => {
    console.error(JSON.stringify({
      level: 'error',
      message,
      timestamp: new Date().toISOString(),
      errorMessage: error instanceof Error ? error.message : String(error),
      stackTrace: error instanceof Error ? error.stack : undefined,
      ...meta
    }));
  }
};

// Schema for each item in the batch
const updateItemSchema = z.object({
  threadId: z.string(),
  data: z.record(z.any()).or(z.array(z.any())),
}).strict();

// Schema for the entire batch update request
const bulkUpdateSchema = z.object({
  items: z.array(updateItemSchema).min(1).max(MAX_BATCH_SIZE)
}).strict();

const getSupabaseClient = () => {
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseServiceKey) {
    logger.error(ERROR_MESSAGES.MISSING_ENV);
    throw new Error(ERROR_MESSAGES.MISSING_ENV);
  }

  return createClient(supabaseUrl, supabaseServiceKey);
};

export async function POST(req: Request) {
  const requestId = crypto.randomUUID();
  const startTime = performance.now();

  try {
    logger.info('Processing bulk update request', { requestId });

    const contentLength = Number(req.headers.get('content-length') || 0);
    if (contentLength > MAX_DATA_SIZE) {
      logger.info('Data payload too large', { requestId, size: contentLength });
      return NextResponse.json(
        { success: false, error: ERROR_MESSAGES.DATA_TOO_LARGE },
        { status: 413 }
      );
    }

    let requestBody;
    try {
      requestBody = await req.json();
    } catch (error) {
      logger.error('Invalid JSON payload', error, { requestId });
      return NextResponse.json(
        { success: false, error: 'Invalid JSON payload' },
        { status: 400 }
      );
    }

    const validationResult = bulkUpdateSchema.safeParse(requestBody);
    if (!validationResult.success) {
      logger.info('Invalid request body', {
        requestId,
        errors: validationResult.error.errors
      });
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid request body',
          details: validationResult.error.errors
        },
        { status: 400 }
      );
    }

    const { items } = validationResult.data;

    if (items.length > MAX_BATCH_SIZE) {
      logger.info('Batch size too large', { requestId, size: items.length, maxSize: MAX_BATCH_SIZE });
      return NextResponse.json(
        { success: false, error: ERROR_MESSAGES.BATCH_TOO_LARGE },
        { status: 400 }
      );
    }

    const supabase = getSupabaseClient();

    const abortController = new AbortController();
    const timeoutId = setTimeout(() => abortController.abort(), OPERATION_TIMEOUT); // 15s timeout for bulk operations

    try {
      // Perform bulk updates one by one, only updating the data field
      const updatePromises = items.map(item =>
        supabase
          .from('extracted_data')
          .update({ data: item.data })
          .eq('thread_id', item.threadId)
          .abortSignal(abortController.signal)
      );

      // Execute all updates in parallel
      const updateResults = await Promise.all(updatePromises);

      // Check for errors in any of the updates
      const errors = updateResults
        .map((result, index) => result.error ? { error: result.error, threadId: items[index].threadId } : null)
        .filter(result => result !== null);

      if (errors.length > 0) {
        logger.error('Some database updates failed', errors, { requestId });
        return NextResponse.json(
          {
            success: false,
            error: ERROR_MESSAGES.DATABASE_ERROR,
            details: errors
          },
          { status: 500 }
        );
      }

      // Fetch all updated records
      const threadIds = items.map(item => item.threadId);
      const { data: upsertedData, error } = await supabase
        .from('extracted_data')
        .select('*')
        .in('thread_id', threadIds)
        .abortSignal(abortController.signal);

      clearTimeout(timeoutId);

      if (error) {
        logger.error('Database bulk upsert failed', error, { requestId });
        return NextResponse.json(
          {
            success: false,
            error: ERROR_MESSAGES.DATABASE_ERROR,
            details: error.message
          },
          { status: 500 }
        );
      }

      const duration = Math.round(performance.now() - startTime);

      // Transform the response data to match the API format
      const processedData = upsertedData.map(item => ({
        threadId: item.thread_id,
        data: item.data,
        pdfId: item.pdf_id,
        createdAt: item.created_at,
        updatedAt: item.updated_at
      }));

      // Verify all records were updated
      if (processedData.length !== items.length) {
        const missingThreadIds = items
          .map(item => item.threadId)
          .filter(threadId => !processedData.some(record => record.threadId === threadId));

        logger.info('Some records were not found for update', {
          requestId,
          missingThreadIds
        });

        return NextResponse.json({
          success: false,
          error: ERROR_MESSAGES.ITEM_NOT_FOUND,
          details: {
            missingThreadIds,
            updatedRecords: processedData.length
          }
        }, { status: 404 });
      }

      logger.info('Bulk update completed successfully', {
        requestId,
        duration,
        recordCount: processedData.length
      });

      return NextResponse.json({
        success: true,
        data: processedData
      });
    } catch (error) {
      clearTimeout(timeoutId);

      if (error instanceof DOMException && error.name === 'AbortError') {
        logger.error('Database operation timed out', null, { requestId });
        return NextResponse.json(
          { success: false, error: 'Database operation timed out' },
          { status: 504 }
        );
      }

      throw error;
    }
  } catch (error) {
    const duration = Math.round(performance.now() - startTime);
    logger.error('Bulk update request failed', error, { requestId, duration });

    return NextResponse.json(
      {
        success: false,
        error: ERROR_MESSAGES.SERVER_ERROR,
        details: process.env.NODE_ENV === 'development' ?
          (error instanceof Error ? error.message : String(error)) : undefined,
        requestId
      },
      { status: 500 }
    );
  }
}