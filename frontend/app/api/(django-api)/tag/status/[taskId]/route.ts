import { NextRequest, NextResponse } from 'next/server';
import { Logger, LogLevel } from '@/lib/logger';

const logger = Logger.getInstance({
  minLevel: LogLevel.DEBUG,
  includeContext: true,
  colorizeOutput: true
});

const SERVICE_NAME = 'tagging-status-api';
const BASE_API_URL = process.env.BASE_API_URL || 'http://localhost:8000';

/**
 * Handles GET requests to fetch the status of a tagging task
 * Acts as a proxy to avoid CORS issues
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { taskId: string } }
) {
  const requestId = crypto.randomUUID();
  const { taskId } = params;

  logger.info(`Processing GET request [${requestId}] to check tagging status for taskId: ${taskId}`, SERVICE_NAME);

  if (!taskId) {
    logger.warn('No taskId provided in path parameters', SERVICE_NAME);
    return NextResponse.json(
      { message: 'Bad request', error: 'taskId is required' },
      { status: 400 }
    );
  }

  try {
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
      return NextResponse.json(
        { message: 'Failed to connect to tagging status service', error: String(fetchError) },
        { status: 503 }
      );
    }

    if (!statusResponse.ok) {
      let errorData;
      try {
        errorData = await statusResponse.json();
      } catch (e) {
        errorData = await statusResponse.text();
      }

      logger.error(`Error from tagging status service: ${JSON.stringify(errorData)}`, SERVICE_NAME);
      return NextResponse.json(
        { message: 'Error from tagging status service', error: errorData },
        { status: statusResponse.status }
      );
    }

    const statusData = await statusResponse.json();
    logger.debug(`Received tagging status response: ${JSON.stringify(statusData)}`, SERVICE_NAME);

    // Forward the response to the client
    return NextResponse.json(statusData);
  } catch (error) {
    logger.error(`Internal server error: ${String(error)}`, SERVICE_NAME);
    return NextResponse.json(
      { message: 'Internal server error', error: String(error) },
      { status: 500 }
    );
  }
}