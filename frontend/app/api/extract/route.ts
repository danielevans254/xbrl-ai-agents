import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { z } from 'zod'; // For validation

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
    console.log(JSON.stringify({ level: 'info', message, timestamp: new Date().toISOString(), ...meta }));
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

const threadIdSchema = z.string().uuid({ message: ERROR_MESSAGES.INVALID_UUID });
const postDataSchema = z.object({
  threadId: threadIdSchema,
  data: z.any().refine(data => {
    const size = new TextEncoder().encode(JSON.stringify(data)).length;
    return size <= MAX_DATA_SIZE;
  }, ERROR_MESSAGES.DATA_TOO_LARGE)
});

// Create and validate Supabase client
const getSupabaseClient = () => {
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseServiceKey) {
    logger.error(ERROR_MESSAGES.MISSING_ENV);
    throw new Error(ERROR_MESSAGES.MISSING_ENV);
  }

  const client = createClient(supabaseUrl, supabaseServiceKey);

  client.auth.getSession().catch(error => {
    logger.error('Failed to initialize Supabase client', error);
    throw new Error('Database connection could not be established');
  });

  return client;
};

export async function GET(req: Request) {
  const requestId = crypto.randomUUID();
  const startTime = performance.now();

  try {
    logger.info('Processing GET request', { requestId, url: req.url });

    const url = new URL(req.url);
    const threadId = url.searchParams.get('threadId');

    if (!threadId) {
      logger.info('Missing thread ID', { requestId });
      return NextResponse.json(
        { success: false, error: ERROR_MESSAGES.MISSING_THREAD_ID },
        { status: 400 }
      );
    }

    const threadIdResult = threadIdSchema.safeParse(threadId);
    if (!threadIdResult.success) {
      logger.info('Invalid thread ID format', { requestId, threadId });
      return NextResponse.json(
        { success: false, error: ERROR_MESSAGES.INVALID_UUID },
        { status: 400 }
      );
    }

    const supabase = getSupabaseClient();

    const abortController = new AbortController();
    const timeoutId = setTimeout(() => abortController.abort(), 5000);

    try {
      const { data, error, status } = await supabase
        .from('extracted_data')
        .select('*')
        .eq('thread_id', threadId)
        .abortSignal(abortController.signal);

      clearTimeout(timeoutId);

      if (error) {
        logger.error('Database query failed', error, { requestId, threadId, status });
        return NextResponse.json(
          { success: false, error: ERROR_MESSAGES.DATABASE_ERROR, details: error.message },
          { status: status === 406 ? 400 : 500 }
        );
      }

      const duration = Math.round(performance.now() - startTime);

      logger.info('GET request completed successfully', {
        requestId,
        threadId,
        duration,
        recordCount: data?.length || 0
      });

      return NextResponse.json({
        success: true,
        data: data || [],
        meta: {
          count: data?.length || 0,
          requestId
        }
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

    if (!req.body) {
      logger.info('Missing request body', { requestId });
      return NextResponse.json(
        { success: false, error: 'Request body is required' },
        { status: 400 }
      );
    }

    const contentType = req.headers.get('content-type');
    if (!contentType?.includes('application/json')) {
      logger.info('Invalid content type', { requestId, contentType });
      return NextResponse.json(
        { success: false, error: 'Content-Type must be application/json' },
        { status: 415 }
      );
    }

    let requestBody;
    try {
      requestBody = await req.json();
    } catch (error) {
      logger.error('Failed to parse JSON body', error, { requestId });
      return NextResponse.json(
        { success: false, error: 'Invalid JSON in request body' },
        { status: 400 }
      );
    }

    const validationResult = postDataSchema.safeParse(requestBody);
    if (!validationResult.success) {
      const errorMessage = validationResult.error.errors[0]?.message || 'Invalid request data';
      logger.info('Validation failed', {
        requestId,
        errors: validationResult.error.errors
      });

      return NextResponse.json(
        { success: false, error: errorMessage },
        { status: 400 }
      );
    }

    const { threadId, data } = validationResult.data;

    const supabase = getSupabaseClient();

    const { data: existingData, error: checkError } = await supabase
      .from('extracted_data')
      .select('id')
      .eq('thread_id', threadId)
      .maybeSingle();

    if (checkError) {
      logger.error('Error checking for existing data', checkError, { requestId, threadId });
      return NextResponse.json(
        { success: false, error: ERROR_MESSAGES.DATABASE_ERROR, details: checkError.message },
        { status: 500 }
      );
    }

    let result;
    if (existingData) {
      // Update existing record
      result = await supabase
        .from('extracted_data')
        .update({
          data: { data },
          updated_at: new Date().toISOString()
        })
        .eq('thread_id', threadId);

      logger.info('Updated existing record', { requestId, threadId, recordId: existingData.id });
    } else {
      result = await supabase
        .from('extracted_data')
        .insert({
          thread_id: threadId,
          data: { data },
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        });

      logger.info('Inserted new record', { requestId, threadId });
    }

    if (result.error) {
      logger.error('Database operation failed', result.error, {
        requestId,
        threadId,
        operation: existingData ? 'update' : 'insert'
      });

      return NextResponse.json(
        { success: false, error: ERROR_MESSAGES.DATABASE_ERROR, details: result.error.message },
        { status: 500 }
      );
    }

    const duration = Math.round(performance.now() - startTime);

    logger.info('POST request completed successfully', {
      requestId,
      threadId,
      operation: existingData ? 'update' : 'insert',
      duration
    });

    return NextResponse.json({
      success: true,
      message: `Data ${existingData ? 'updated' : 'saved'} successfully`,
      meta: {
        requestId,
        operation: existingData ? 'update' : 'insert'
      }
    });
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