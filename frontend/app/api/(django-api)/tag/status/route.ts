import { NextRequest, NextResponse } from 'next/server';
import { Logger, LogLevel } from '@/lib/logger';

const logger = Logger.getInstance({
  minLevel: LogLevel.DEBUG,
  includeContext: true,
  colorizeOutput: true
});

const SERVICE_NAME = 'tagging-status-api';
const BASE_API_URL = 'http://localhost:8000';

function validateTaskId(taskId: string | null): taskId is string {
  return Boolean(taskId && taskId.trim().length > 0);
}

function createErrorResponse(
  message: string,
  error: string | object,
  status: number
): NextResponse {
  logger.error(`${message}: ${JSON.stringify(error)}`, SERVICE_NAME);
  return NextResponse.json({ message, error }, { status });
}

/**
 * Handles GET requests to fetch the status of a tagging task
 * Acts as a proxy to avoid CORS issues
 */
export async function GET(request: NextRequest) {
  const requestId = crypto.randomUUID();
  logger.info(`Processing GET request [${requestId}] to check tagging status`, SERVICE_NAME);

  try {
    const searchParams = request.nextUrl.searchParams;
    const taskId = searchParams.get('taskId');

    if (!validateTaskId(taskId)) {
      logger.warn(`Invalid taskId: ${taskId}`, SERVICE_NAME);
      return createErrorResponse(
        'Bad request',
        'taskId is required and cannot be empty',
        400
      );
    }

    logger.debug(`Checking status for taskId: ${taskId}`, SERVICE_NAME);

    const STATUS_API_URL = `${BASE_API_URL}/api/v1/tagging/tag/status/${taskId}/`;

    logger.debug(`Sending request to tagging status service: ${STATUS_API_URL}`, SERVICE_NAME);

    let statusResponse;
    try {
      statusResponse = await fetch(STATUS_API_URL, {
        method: 'GET',
        headers: {
          'X-Request-ID': requestId,
        }
      });
      logger.debug(`Received response from tagging status service with status: ${statusResponse.status}`, SERVICE_NAME);
    } catch (fetchError) {
      logger.error(`Failed to connect to tagging status service: ${String(fetchError)}`, SERVICE_NAME);
      return createErrorResponse(
        'Failed to connect to tagging status service',
        String(fetchError),
        503
      );
    }

    if (!statusResponse.ok) {
      const errorData = await statusResponse.json().catch(() => null);
      logger.error(`Error from tagging status service: ${JSON.stringify(errorData)}`, SERVICE_NAME);
      return createErrorResponse(
        'Error from tagging status service',
        errorData || `Failed with status: ${statusResponse.status}`,
        statusResponse.status
      );
    }

    const statusData = await statusResponse.json();
    logger.debug(`Received tagging status response: ${JSON.stringify(statusData)}`, SERVICE_NAME);

    // Forward the response to the client
    return NextResponse.json(statusData);
  } catch (error) {
    logger.error(`Internal server error: ${String(error)}`, SERVICE_NAME);
    return createErrorResponse(
      'Internal server error',
      String(error),
      500
    );
  }
}