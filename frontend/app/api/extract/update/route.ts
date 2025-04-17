import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { z } from 'zod';

export const runtime = 'edge';
export const maxDuration = 60;

// Constants
const MAX_DATA_SIZE = 5 * 1024 * 1024; // 5MB limit
const ERROR_MESSAGES = {
  MISSING_ENV: 'Database configuration is incomplete',
  INVALID_UUID: 'Invalid thread ID format',
  MISSING_THREAD_ID: 'Thread ID is required',
  MISSING_DATA: 'Data payload is required',
  DATA_TOO_LARGE: 'Data payload exceeds maximum allowed size',
  DATABASE_ERROR: 'Database operation failed',
  SERVER_ERROR: 'Internal server error occurred',
  NOT_FOUND: 'Record not found'
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

// Don't validate data structure to be flexible - just ensure it's present
const updateDataSchema = z.object({
  threadId: z.string(),
  data: z.any(), // Accept any data structure
  pdfId: z.string().optional(),
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
    logger.info('Processing update request', { requestId });

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
      logger.info('Request body received', {
        requestId,
        threadId: requestBody.threadId,
        hasData: !!requestBody.data,
        dataSample: requestBody.data ? JSON.stringify(requestBody.data).substring(0, 100) + '...' : null
      });
    } catch (error) {
      logger.error('Invalid JSON payload', error, { requestId });
      return NextResponse.json(
        { success: false, error: 'Invalid JSON payload' },
        { status: 400 }
      );
    }

    const validationResult = updateDataSchema.safeParse(requestBody);
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

    const { threadId, data, pdfId } = validationResult.data;

    // Verify data isn't null/undefined
    if (data === null || data === undefined) {
      logger.error('Missing data in request', { requestId });
      return NextResponse.json(
        { success: false, error: ERROR_MESSAGES.MISSING_DATA },
        { status: 400 }
      );
    }

    const supabase = getSupabaseClient();

    // First check if the record exists
    const { data: existingData, error: checkError } = await supabase
      .from('extracted_data')
      .select('*')
      .eq('thread_id', threadId)
      .maybeSingle();

    if (checkError) {
      logger.error('Database check failed', checkError, { requestId, threadId });
      return NextResponse.json(
        {
          success: false,
          error: ERROR_MESSAGES.DATABASE_ERROR,
          details: checkError.message
        },
        { status: 500 }
      );
    }

    if (!existingData) {
      logger.info('Record not found', { requestId, threadId });
      return NextResponse.json(
        {
          success: false,
          error: ERROR_MESSAGES.NOT_FOUND,
          details: `No record found with thread ID: ${threadId}`
        },
        { status: 404 }
      );
    }

    // Log the existing data for comparison
    logger.info('Found existing record', {
      requestId,
      recordId: existingData.id,
      existingDataSample: JSON.stringify(existingData.data).substring(0, 100) + '...'
    });

    // Prepare update payload
    const updatePayload: any = {
      data: data,
      updated_at: new Date().toISOString()
    };

    // Only include pdf_id if it's a valid UUID
    if (pdfId && isValidUuid(pdfId)) {
      updatePayload.pdf_id = pdfId;
    } else if (pdfId) {
      // Don't modify pdf_id field if the provided value isn't a valid UUID
      logger.info('Skipping invalid pdfId', { requestId, threadId, pdfId });
    }

    // Perform the update
    const { data: updatedData, error } = await supabase
      .from('extracted_data')
      .update(updatePayload)
      .eq('thread_id', threadId)
      .select('*');

    if (error) {
      logger.error('Database update failed', error, { requestId, threadId });
      return NextResponse.json(
        {
          success: false,
          error: ERROR_MESSAGES.DATABASE_ERROR,
          details: error.message
        },
        { status: 500 }
      );
    }

    if (!updatedData || updatedData.length === 0) {
      logger.error('Update returned no data', null, { requestId, threadId });
      return NextResponse.json(
        {
          success: false,
          error: ERROR_MESSAGES.DATABASE_ERROR,
          details: 'Update operation did not return any data'
        },
        { status: 500 }
      );
    }

    // Log the updated data for verification
    logger.info('Database update successful', {
      requestId,
      threadId,
      updatedDataSample: JSON.stringify(updatedData[0].data).substring(0, 100) + '...'
    });

    const duration = Math.round(performance.now() - startTime);

    logger.info('Update request completed successfully', {
      requestId,
      threadId,
      duration
    });

    // Return the exact database row format for maximum compatibility
    return NextResponse.json({
      success: true,
      data: updatedData[0]
    });
  } catch (error) {
    const duration = Math.round(performance.now() - startTime);
    logger.error('Update request failed', error, { requestId, duration });

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

// Helper function to check if a string is a valid UUID
function isValidUuid(str: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(str);
}