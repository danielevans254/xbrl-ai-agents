import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { z } from 'zod'; // For validation
import { rateLimit } from '@/lib/rate-limit'; // Assuming you create this utility

export const runtime = 'edge';

// Configure request timeout
export const maxDuration = 60; // 60 seconds timeout

// Constants
const MAX_DATA_SIZE = 1024 * 1024; // 1MB limit
const ERROR_MESSAGES = {
  MISSING_ENV: 'Database configuration is incomplete',
  INVALID_UUID: 'Invalid thread ID format',
  MISSING_THREAD_ID: 'Thread ID is required',
  MISSING_DATA: 'Data payload is required',
  DATA_TOO_LARGE: 'Data payload exceeds maximum allowed size',
  DATABASE_ERROR: 'Database operation failed',
  RATE_LIMIT: 'Too many requests, please try again later',
  SERVER_ERROR: 'Internal server error occurred'
};

// Logger for structured logging
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

// Request validation schemas
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

  // Test connection (can be removed in production)
  client.auth.getSession().catch(error => {
    logger.error('Failed to initialize Supabase client', error);
    throw new Error('Database connection could not be established');
  });

  return client;
};

// Utility function to handle errors consistently
const handleError = (error: unknown, defaultMessage: string, statusCode = 500) => {
  const errorMessage = error instanceof Error ? error.message : String(error);
  logger.error(defaultMessage, error);

  return NextResponse.json(
    {
      success: false,
      error: defaultMessage,
      details: process.env.NODE_ENV === 'development' ? errorMessage : undefined
    },
    { status: statusCode }
  );
};

// Rate limiter middleware wrapper
const withRateLimit = async (req: Request, handler: (req: Request) => Promise<NextResponse>) => {
  try {
    // Extract IP for rate limiting
    const ip = req.headers.get('x-forwarded-for') || 'unknown';
    const { success, limit, remaining, reset } = await rateLimit(ip);

    if (!success) {
      return NextResponse.json(
        { success: false, error: ERROR_MESSAGES.RATE_LIMIT },
        {
          status: 429,
          headers: {
            'X-RateLimit-Limit': limit.toString(),
            'X-RateLimit-Remaining': remaining.toString(),
            'X-RateLimit-Reset': reset.toString()
          }
        }
      );
    }

    const response = await handler(req);

    // Add rate limit headers to successful responses
    response.headers.set('X-RateLimit-Limit', limit.toString());
    response.headers.set('X-RateLimit-Remaining', remaining.toString());
    response.headers.set('X-RateLimit-Reset', reset.toString());

    return response;
  } catch (error) {
    return handleError(error, ERROR_MESSAGES.SERVER_ERROR);
  }
};

export async function GET(req: Request) {
  return withRateLimit(req, async (req) => {
    const requestId = crypto.randomUUID();
    const startTime = performance.now();

    try {
      logger.info('Processing GET request', { requestId, url: req.url });

      // Parse and validate URL parameters
      const url = new URL(req.url);
      const threadId = url.searchParams.get('threadId');

      if (!threadId) {
        logger.info('Missing thread ID', { requestId });
        return NextResponse.json(
          { success: false, error: ERROR_MESSAGES.MISSING_THREAD_ID },
          { status: 400 }
        );
      }

      // Validate thread ID format
      const threadIdResult = threadIdSchema.safeParse(threadId);
      if (!threadIdResult.success) {
        logger.info('Invalid thread ID format', { requestId, threadId });
        return NextResponse.json(
          { success: false, error: ERROR_MESSAGES.INVALID_UUID },
          { status: 400 }
        );
      }

      // Initialize DB client
      const supabase = getSupabaseClient();

      // Query with timeout
      const abortController = new AbortController();
      const timeoutId = setTimeout(() => abortController.abort(), 5000); // 5s timeout

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

        throw error; // Re-throw for the outer catch block
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
  });
}

export async function POST(req: Request) {
  return withRateLimit(req, async (req) => {
    const requestId = crypto.randomUUID();
    const startTime = performance.now();

    try {
      logger.info('Processing POST request', { requestId });

      // Validate request body exists
      if (!req.body) {
        logger.info('Missing request body', { requestId });
        return NextResponse.json(
          { success: false, error: 'Request body is required' },
          { status: 400 }
        );
      }

      // Check content type
      const contentType = req.headers.get('content-type');
      if (!contentType?.includes('application/json')) {
        logger.info('Invalid content type', { requestId, contentType });
        return NextResponse.json(
          { success: false, error: 'Content-Type must be application/json' },
          { status: 415 }
        );
      }

      // Parse and validate request body
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

      // Validate against schema
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

      // Initialize DB client
      const supabase = getSupabaseClient();

      // Check if record already exists
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

      // Execute db operation based on existence check
      let result;
      if (existingData) {
        // Update existing record
        result = await supabase
          .from('extracted_data')
          .update({
            data: data,
            updated_at: new Date().toISOString()
          })
          .eq('thread_id', threadId);

        logger.info('Updated existing record', { requestId, threadId, recordId: existingData.id });
      } else {
        // Insert new record
        result = await supabase
          .from('extracted_data')
          .insert({
            thread_id: threadId,
            data: data,
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
  });
}