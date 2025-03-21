import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { z } from 'zod';
import { Logger, LogLevel } from '@/lib/logger';

export const runtime = 'edge';
export const maxDuration = 60;

const CONFIG = {
  MAX_DATA_SIZE: 1024 * 1024,
  DB_QUERY_TIMEOUT_MS: 5000,
  RETRY_ATTEMPTS: 3,
  RETRY_DELAY_MS: 500,
  RESPONSE_CACHE_CONTROL: 'no-cache, no-store, must-revalidate',
};

const ERROR_MESSAGES = {
  MISSING_ENV: 'Database configuration is incomplete. SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set.',
  INVALID_UUID: 'Invalid thread ID format. Must be a valid UUID.',
  MISSING_THREAD_ID: 'Thread ID is required for this operation.',
  MISSING_DATA: 'Data payload is required.',
  DATA_TOO_LARGE: `Data payload exceeds maximum allowed size of ${CONFIG.MAX_DATA_SIZE / 1024}KB.`,
  DATABASE_ERROR: 'Database operation failed. Please try again later.',
  SERVER_ERROR: 'Internal server error occurred. Our team has been notified.',
  REQUEST_TIMEOUT: 'Request timed out. Please try again later.',
  PARSE_ERROR: 'Failed to parse request body. Please ensure it is valid JSON.',
  CONTENT_TYPE_ERROR: 'Content-Type must be application/json.',
  MISSING_BODY: 'Request body is required.',
  CLIENT_INIT_ERROR: 'Database connection could not be established. Please try again later.'
};

const logger = new Logger({
  minLevel: process.env.NODE_ENV === 'development' ? LogLevel.DEBUG : LogLevel.INFO,
  includeTimestamp: true,
  timestampFormat: 'iso',
  includeContext: true,
  colorizeOutput: process.env.NODE_ENV === 'development'
});

const threadIdSchema = z.string()
  .uuid({ message: ERROR_MESSAGES.INVALID_UUID })
  .min(36, { message: 'Thread ID must be 36 characters long.' })
  .max(36, { message: 'Thread ID must be 36 characters long.' });

const postDataSchema = z.object({
  threadId: threadIdSchema,
  data: z.any().refine(data => {
    if (!data) return false;
    const size = new TextEncoder().encode(JSON.stringify(data)).length;
    return size <= CONFIG.MAX_DATA_SIZE;
  }, {
    message: ERROR_MESSAGES.DATA_TOO_LARGE,
    path: ['data']
  })
});

async function withRetry<T>(
  operation: () => Promise<T>,
  context: string,
  requestId: string,
  threadId?: string,
  retries = CONFIG.RETRY_ATTEMPTS
): Promise<T> {
  try {
    return await operation();
  } catch (error) {
    if (retries > 0) {
      logger.warn(
        `Retrying database operation (${CONFIG.RETRY_ATTEMPTS - retries + 1}/${CONFIG.RETRY_ATTEMPTS})`,
        context,
        { requestId, threadId }
      );
      await new Promise(resolve => setTimeout(resolve, CONFIG.RETRY_DELAY_MS));
      return withRetry(operation, context, requestId, threadId, retries - 1);
    }
    throw error;
  }
}

function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number,
  context: string
): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) => {
      setTimeout(() => {
        reject(new Error(`Operation timed out after ${timeoutMs}ms: ${context}`));
      }, timeoutMs);
    })
  ]);
}

const getSupabaseClient = async (context: string, requestId: string) => {
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseServiceKey) {
    logger.error(ERROR_MESSAGES.MISSING_ENV, context, { requestId });
    throw new Error(ERROR_MESSAGES.MISSING_ENV);
  }

  const client = createClient(supabaseUrl, supabaseServiceKey);

  try {
    await withTimeout(
      client.auth.getSession(),
      CONFIG.DB_QUERY_TIMEOUT_MS,
      'Supabase client initialization'
    );
    logger.debug('Supabase client initialized successfully', context, { requestId });
    return client;
  } catch (error) {
    logger.error('Failed to initialize Supabase client', context, error, { requestId });
    throw new Error(ERROR_MESSAGES.CLIENT_INIT_ERROR);
  }
};

function createResponse(
  success: boolean,
  data?: any,
  error?: string,
  status = 200,
  meta: Record<string, any> = {}
) {
  const response: Record<string, any> = { success };

  if (success && data) {
    response.data = data;
  } else if (success && !data) {
    response.message = 'Operation completed successfully';
  }

  if (!success && error) {
    response.error = error;
    if (process.env.NODE_ENV === 'development' && meta.details) {
      response.details = meta.details;
      delete meta.details;
    }
  }

  response.meta = meta;

  return NextResponse.json(response, {
    status,
    headers: {
      'Cache-Control': CONFIG.RESPONSE_CACHE_CONTROL
    }
  });
}

export async function GET(req: Request) {
  const requestId = crypto.randomUUID();
  const startTime = performance.now();
  const context = 'ExtractedDataGET';

  logger.debug('Request received', context, { requestId, url: req.url });

  try {
    const url = new URL(req.url);
    const threadId = url.searchParams.get('threadId');

    if (!threadId) {
      logger.info('Missing thread ID in request', context, { requestId });
      return createResponse(false, undefined, ERROR_MESSAGES.MISSING_THREAD_ID, 400, { requestId });
    }

    const threadIdResult = threadIdSchema.safeParse(threadId);
    if (!threadIdResult.success) {
      logger.info('Invalid thread ID format', context, { requestId, threadId });
      return createResponse(false, undefined, ERROR_MESSAGES.INVALID_UUID, 400, { requestId });
    }

    const supabase = await getSupabaseClient(context, requestId);

    const abortController = new AbortController();
    const timeoutId = setTimeout(() => abortController.abort(), CONFIG.DB_QUERY_TIMEOUT_MS);

    try {
      const queryOperation = async () => {
        logger.debug('Querying extracted_data table', context, { requestId, threadId });
        const result = await supabase
          .from('extracted_data')
          .select('*')
          .eq('thread_id', threadId)
          .abortSignal(abortController.signal);

        if (result.error) throw result.error;
        return result;
      };

      const { data, error, status } = await withRetry(
        queryOperation,
        context,
        requestId,
        threadId
      );

      clearTimeout(timeoutId);

      if (error) {
        logger.error('Database query failed', context, error, { requestId, threadId, status });
        return createResponse(
          false,
          undefined,
          ERROR_MESSAGES.DATABASE_ERROR,
          status === 406 ? 400 : 500,
          { requestId, details: error.message }
        );
      }

      const duration = Math.round(performance.now() - startTime);
      logger.info('GET request completed successfully', context, {
        requestId,
        threadId,
        duration,
        recordCount: data?.length || 0
      });

      return createResponse(
        true,
        data || [],
        undefined,
        200,
        {
          count: data?.length || 0,
          requestId,
          duration
        }
      );
    } catch (error) {
      clearTimeout(timeoutId);

      if (error instanceof DOMException && error.name === 'AbortError') {
        logger.error('Database query timed out', context, null, { requestId, threadId });
        return createResponse(
          false,
          undefined,
          ERROR_MESSAGES.REQUEST_TIMEOUT,
          504,
          { requestId }
        );
      }

      throw error;
    }
  } catch (error) {
    const duration = Math.round(performance.now() - startTime);
    logger.error('GET request failed', context, error, { requestId, duration });

    return createResponse(
      false,
      undefined,
      ERROR_MESSAGES.SERVER_ERROR,
      500,
      {
        requestId,
        duration,
        details: error instanceof Error ? error.message : String(error)
      }
    );
  }
}

export async function POST(req: Request) {
  const requestId = crypto.randomUUID();
  const startTime = performance.now();
  const context = 'ExtractedDataPOST';

  logger.debug('Request received', context, { requestId });

  try {
    if (!req.body) {
      logger.info('Missing request body', context, { requestId });
      return createResponse(false, undefined, ERROR_MESSAGES.MISSING_BODY, 400, { requestId });
    }

    const contentType = req.headers.get('content-type');
    if (!contentType?.includes('application/json')) {
      logger.info('Invalid content type', context, { requestId, contentType });
      return createResponse(false, undefined, ERROR_MESSAGES.CONTENT_TYPE_ERROR, 415, { requestId });
    }

    let requestBody;
    try {
      requestBody = await req.json();
    } catch (error) {
      logger.error('Failed to parse JSON body', context, error, { requestId });
      return createResponse(false, undefined, ERROR_MESSAGES.PARSE_ERROR, 400, { requestId });
    }

    const validationResult = postDataSchema.safeParse(requestBody);
    if (!validationResult.success) {
      const errorPath = validationResult.error.errors[0]?.path.join('.') || '';
      const errorMessage = validationResult.error.errors[0]?.message || 'Invalid request data';

      logger.info('Validation failed', context, {
        requestId,
        errors: validationResult.error.errors
      });

      return createResponse(
        false,
        undefined,
        `${errorMessage}${errorPath ? ` (${errorPath})` : ''}`,
        400,
        { requestId }
      );
    }

    const { threadId, data } = validationResult.data;

    const supabase = await getSupabaseClient(context, requestId);

    const sessionId = crypto.randomUUID();

    const createSessionOperation = async () => {
      logger.debug('Creating session record', context, { requestId, threadId, sessionId });
      const result = await supabase
        .from('session_thread')
        .insert({
          session_id: sessionId,
          thread_id: threadId,
          created_at: new Date().toISOString()
        });

      if (result.error) throw result.error;
      return result;
    };

    const { error: sessionError } = await withRetry(
      createSessionOperation,
      context,
      requestId,
      threadId
    );

    if (sessionError) {
      logger.error('Error persisting session data', context, sessionError, { requestId, threadId });
      return createResponse(
        false,
        undefined,
        ERROR_MESSAGES.DATABASE_ERROR,
        500,
        { requestId, details: sessionError.message }
      );
    }

    const checkExistingOperation = async () => {
      logger.debug('Checking for existing data', context, { requestId, threadId });
      const result = await supabase
        .from('extracted_data')
        .select('id')
        .eq('thread_id', threadId)
        .maybeSingle();

      if (result.error) throw result.error;
      return result;
    };

    const { data: existingData, error: checkError } = await withRetry(
      checkExistingOperation,
      context,
      requestId,
      threadId
    );

    if (checkError) {
      logger.error('Error checking for existing data', context, checkError, { requestId, threadId });
      return createResponse(
        false,
        undefined,
        ERROR_MESSAGES.DATABASE_ERROR,
        500,
        { requestId, details: checkError.message }
      );
    }

    let result;
    if (existingData) {
      const updateOperation = async () => {
        logger.debug('Updating existing record', context, { requestId, threadId, recordId: existingData.id });
        const result = await supabase
          .from('extracted_data')
          .update({
            data: data,
            updated_at: new Date().toISOString()
          })
          .eq('thread_id', threadId);

        if (result.error) throw result.error;
        return result;
      };

      result = await withRetry(
        updateOperation,
        context,
        requestId,
        threadId
      );

      logger.info('Updated existing record', context, { requestId, threadId, recordId: existingData.id });
    } else {
      const insertOperation = async () => {
        logger.debug('Inserting new record', context, { requestId, threadId });
        const result = await supabase
          .from('extracted_data')
          .insert({
            thread_id: threadId,
            data: data,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          });

        if (result.error) throw result.error;
        return result;
      };

      result = await withRetry(
        insertOperation,
        context,
        requestId,
        threadId
      );

      logger.info('Inserted new record', context, { requestId, threadId });
    }

    if (result.error) {
      logger.error('Database operation failed', context, result.error, {
        requestId,
        threadId,
        operation: existingData ? 'update' : 'insert'
      });

      return createResponse(
        false,
        undefined,
        ERROR_MESSAGES.DATABASE_ERROR,
        500,
        { requestId, details: result.error.message }
      );
    }

    const duration = Math.round(performance.now() - startTime);
    logger.info('POST request completed successfully', context, {
      requestId,
      threadId,
      operation: existingData ? 'update' : 'insert',
      duration,
      dataSize: new TextEncoder().encode(JSON.stringify(data)).length
    });

    return createResponse(
      true,
      {
        message: `Data ${existingData ? 'updated' : 'saved'} successfully`,
        sessionId: sessionId
      },
      undefined,
      existingData ? 200 : 201,
      {
        requestId,
        operation: existingData ? 'update' : 'insert',
        duration
      }
    );
  } catch (error) {
    const duration = Math.round(performance.now() - startTime);
    logger.error('POST request failed', context, error, { requestId, duration });

    return createResponse(
      false,
      undefined,
      ERROR_MESSAGES.SERVER_ERROR,
      500,
      {
        requestId,
        duration,
        details: error instanceof Error ? error.message : String(error)
      }
    );
  }
}