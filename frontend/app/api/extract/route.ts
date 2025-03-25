import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { z } from 'zod';

export const runtime = 'edge';
export const maxDuration = 60;

// Constants
const MAX_DATA_SIZE = 1024 * 1024;
const ERROR_MESSAGES = {
  MISSING_ENV: 'Database configuration is incomplete',
  INVALID_UUID: 'Invalid thread ID format',
  MISSING_THREAD_ID: 'Thread ID is required',
  MISSING_DATA: 'Data payload is required',
  DATA_TOO_LARGE: 'Data payload exceeds maximum allowed size',
  DATABASE_ERROR: 'Database operation failed',
  SERVER_ERROR: 'Internal server error occurred'
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

const dataSchema = z.object({
  threadId: z.string(),
  data: z.record(z.any()).or(z.array(z.any())),
  pdfId: z.string().uuid().optional(),
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

export async function GET(req: Request) {
  const requestId = crypto.randomUUID();
  const startTime = performance.now();

  try {
    logger.info('Processing GET request', { requestId, url: req.url });

    const url = new URL(req.url);
    const threadId = url.searchParams.get('threadId');

    if (!threadId) {
      return NextResponse.json(
        { success: false, error: ERROR_MESSAGES.MISSING_THREAD_ID },
        { status: 400 }
      );
    }

    const supabase = getSupabaseClient();

    const abortController = new AbortController();
    const timeoutId = setTimeout(() => abortController.abort(), 5000);

    try {
      const { data, error } = await supabase
        .from('extracted_data')
        .select('*')
        .eq('thread_id', threadId)
        .abortSignal(abortController.signal);

      clearTimeout(timeoutId);

      if (error) {
        logger.error('Database query failed', error, { requestId, threadId });
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

      const processedData = data.map(item => ({
        threadId: item.thread_id,
        data: item.data,
        pdfId: item.pdf_id,
        createdAt: item.created_at,
        updatedAt: item.updated_at
      }));

      logger.info('GET request completed successfully', {
        requestId,
        threadId,
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
        logger.error('Database query timed out', null, { requestId, threadId });
        return NextResponse.json(
          { success: false, error: 'Database query timed out' },
          { status: 504 }
        );
      }

      throw error;
    }
  } catch (error) {
    const duration = Math.round(performance.now() - startTime);
    logger.error('GET request failed', error, { requestId, duration });

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

export async function POST(req: Request) {
  const requestId = crypto.randomUUID();
  const startTime = performance.now();

  try {
    logger.info('Processing POST request', { requestId });

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

    const validationResult = dataSchema.safeParse(requestBody);
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

    const supabase = getSupabaseClient();

    const abortController = new AbortController();
    const timeoutId = setTimeout(() => abortController.abort(), 5000);

    try {
      const { data: upsertedData, error } = await supabase
        .from('extracted_data')
        .upsert({
          thread_id: threadId,
          data: data,
          pdf_id: pdfId,
        })
        .select()
        .abortSignal(abortController.signal);

      clearTimeout(timeoutId);

      if (error) {
        logger.error('Database upsert failed', error, { requestId, threadId });
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

      logger.info('POST request completed successfully', {
        requestId,
        threadId,
        duration
      });

      return NextResponse.json({
        success: true,
        data: upsertedData
      });
    } catch (error) {
      clearTimeout(timeoutId);

      if (error instanceof DOMException && error.name === 'AbortError') {
        logger.error('Database operation timed out', null, { requestId, threadId });
        return NextResponse.json(
          { success: false, error: 'Database operation timed out' },
          { status: 504 }
        );
      }

      throw error;
    }
  } catch (error) {
    const duration = Math.round(performance.now() - startTime);
    logger.error('POST request failed', error, { requestId, duration });

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