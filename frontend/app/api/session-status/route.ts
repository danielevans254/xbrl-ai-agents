import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { z } from 'zod';
import { Logger, LogLevel } from '@/lib/logger';

export const runtime = 'edge';

const CONFIG = {
  DEFAULT_PROGRESS_TIME_SECONDS: 180,
  MAX_PROGRESS_PERCENT: 95,
  REQUEST_TIMEOUT_MS: 10000,
  RETRY_ATTEMPTS: 3,
  RETRY_DELAY_MS: 500
};

const ERROR_MESSAGES = {
  MISSING_ENV: 'Database configuration is incomplete. SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be provided.',
  INVALID_UUID: 'Invalid thread ID format. Must be a valid UUID.',
  MISSING_THREAD_ID: 'Thread ID is required for this operation.',
  DATABASE_ERROR: 'Database operation failed. Please try again later.',
  SERVER_ERROR: 'Internal server error occurred. Our team has been notified.',
  REQUEST_TIMEOUT: 'Request timed out. Please try again later.',
  SESSION_NOT_FOUND: 'No session found for the provided thread ID.'
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

const getSupabaseClient = () => {
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseServiceKey) {
    logger.error(ERROR_MESSAGES.MISSING_ENV, 'ConfigError');
    throw new Error(ERROR_MESSAGES.MISSING_ENV);
  }

  return createClient(supabaseUrl, supabaseServiceKey);
};

async function withRetry<T>(operation: () => Promise<T>, context: string, requestId: string, retries = CONFIG.RETRY_ATTEMPTS): Promise<T> {
  try {
    return await operation();
  } catch (error) {
    if (retries > 0) {
      logger.warn(`Retrying database operation (${CONFIG.RETRY_ATTEMPTS - retries + 1}/${CONFIG.RETRY_ATTEMPTS})`, context, { requestId });
      await new Promise(resolve => setTimeout(resolve, CONFIG.RETRY_DELAY_MS));
      return withRetry(operation, context, requestId, retries - 1);
    }
    throw error;
  }
}

function createResponse(success: boolean, data?: any, error?: string, status = 200, meta: Record<string, any> = {}) {
  const response: Record<string, any> = { success };

  if (success && data) {
    response.data = data;
  }

  if (!success && error) {
    response.error = error;
    if (process.env.NODE_ENV === 'development' && meta.details) {
      response.details = meta.details;
      delete meta.details;
    }
  }

  response.meta = meta;

  return NextResponse.json(response, { status });
}

function withTimeout<T>(promise: Promise<T>, timeoutMs: number, context: string): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) => {
      setTimeout(() => {
        reject(new Error(`Operation timed out after ${timeoutMs}ms: ${context}`));
      }, timeoutMs);
    })
  ]);
}

export async function GET(req: Request) {
  const requestId = crypto.randomUUID();
  const startTime = performance.now();
  const context = 'SessionStatus';

  logger.debug('Request received', context, { requestId, url: req.url });

  try {
    // Extract and validate query parameters
    const url = new URL(req.url);
    const threadId = url.searchParams.get('threadId');

    // Validate thread ID presence
    if (!threadId) {
      logger.info('Missing thread ID in request', context, { requestId });
      return createResponse(false, undefined, ERROR_MESSAGES.MISSING_THREAD_ID, 400, { requestId });
    }

    // Validate thread ID format
    const threadIdResult = threadIdSchema.safeParse(threadId);
    if (!threadIdResult.success) {
      logger.info('Invalid thread ID format', context, { requestId, threadId });
      return createResponse(false, undefined, ERROR_MESSAGES.INVALID_UUID, 400, { requestId });
    }

    const supabase = getSupabaseClient();
    logger.debug('Supabase client initialized', context, { requestId });

    const extractedDataOperation = async () => {
      logger.debug('Querying extracted_data table', context, { requestId, threadId });
      const { data, error } = await supabase
        .from('extracted_data')
        .select('*')
        .eq('thread_id', threadId)
        .maybeSingle();

      if (error) throw error;
      return { data, error };
    };

    const { data: extractedData, error: extractedError } = await withTimeout(
      withRetry(extractedDataOperation, context, requestId),
      CONFIG.REQUEST_TIMEOUT_MS,
      'extractedData query'
    );

    if (extractedError) {
      logger.error('Database query failed for extracted data', context, extractedError, { requestId, threadId });
      return createResponse(
        false,
        undefined,
        ERROR_MESSAGES.DATABASE_ERROR,
        500,
        { requestId, details: extractedError.message }
      );
    }

    if (extractedData) {
      logger.info('Extraction already complete', context, { requestId, threadId });

      // Get associated session data
      const sessionDataOperation = async () => {
        logger.debug('Querying session_thread table for complete extraction', context, { requestId, threadId });
        const { data, error } = await supabase
          .from('session_thread')
          .select('*')
          .eq('thread_id', threadId)
          .maybeSingle();

        if (error) throw error;
        return { data, error };
      };

      const { data: sessionData } = await withTimeout(
        withRetry(sessionDataOperation, context, requestId),
        CONFIG.REQUEST_TIMEOUT_MS,
        'sessionData query'
      );

      const duration = Math.round(performance.now() - startTime);
      logger.info('Session status request completed', context, {
        requestId,
        threadId,
        duration,
        status: 'complete'
      });

      return createResponse(
        true,
        {
          status: 'complete',
          progress: 100,
          sessionId: sessionData?.session_id,
          currentStep: 'Extraction complete',
          extractionTime: new Date(extractedData.created_at).toISOString()
        },
        undefined,
        200,
        { requestId, duration }
      );
    }

    const sessionDataOperation = async () => {
      logger.debug('Querying session_thread table for processing status', context, { requestId, threadId });
      const { data, error } = await supabase
        .from('session_thread')
        .select('*')
        .eq('thread_id', threadId)
        .order('created_at', { ascending: false })
        .maybeSingle();

      if (error) throw error;
      return { data, error };
    };

    const { data: sessionData, error: sessionError } = await withTimeout(
      withRetry(sessionDataOperation, context, requestId),
      CONFIG.REQUEST_TIMEOUT_MS,
      'sessionData query'
    );

    if (sessionError) {
      logger.error('Database query failed for session data', context, sessionError, { requestId, threadId });
      return createResponse(
        false,
        undefined,
        ERROR_MESSAGES.DATABASE_ERROR,
        500,
        { requestId, details: sessionError.message }
      );
    }

    if (!sessionData) {
      logger.info('No session found for thread ID', context, { requestId, threadId });
      return createResponse(
        false,
        undefined,
        ERROR_MESSAGES.SESSION_NOT_FOUND,
        404,
        { requestId }
      );
    }

    const sessionStartTime = new Date(sessionData.created_at).getTime();
    const currentTime = new Date().getTime();
    const elapsedTimeSeconds = Math.floor((currentTime - sessionStartTime) / 1000);

    // Calculate progress percentage more intelligently
    // Start fast, then slow down - using a non-linear curve
    const progressPercentage = Math.min(
      CONFIG.MAX_PROGRESS_PERCENT,
      Math.round(100 * (1 - Math.exp(-elapsedTimeSeconds / CONFIG.DEFAULT_PROGRESS_TIME_SECONDS)))
    );

    let currentStep = 'Initializing';
    if (progressPercentage > 10) currentStep = 'Scanning document';
    if (progressPercentage > 30) currentStep = 'Analyzing content';
    if (progressPercentage > 60) currentStep = 'Extracting data';
    if (progressPercentage > 80) currentStep = 'Finalizing extraction';

    const duration = Math.round(performance.now() - startTime);
    logger.info('Session status request completed', context, {
      requestId,
      threadId,
      duration,
      status: 'processing',
      elapsedTime: elapsedTimeSeconds,
      progress: progressPercentage
    });

    return createResponse(
      true,
      {
        status: 'processing',
        sessionId: sessionData.session_id,
        created_at: sessionData.created_at,
        elapsedTime: elapsedTimeSeconds,
        progress: progressPercentage,
        currentStep
      },
      undefined,
      200,
      { requestId, duration }
    );
  } catch (error) {
    const duration = Math.round(performance.now() - startTime);
    const isTimeout = error instanceof Error && error.message.includes('timed out');

    if (isTimeout) {
      logger.error('Request timed out', context, error, { requestId, duration });
      return createResponse(
        false,
        undefined,
        ERROR_MESSAGES.REQUEST_TIMEOUT,
        504,
        { requestId, duration }
      );
    }

    logger.error('Session status request failed', context, error, { requestId, duration });

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