import { NextRequest, NextResponse } from 'next/server';
import { Logger, LogLevel } from '@/lib/logger';

const logger = Logger.getInstance({
  minLevel: LogLevel.DEBUG,
  includeContext: true,
  colorizeOutput: true
});

const SERVICE_NAME = 'tagging-result-api';
const BASE_API_URL = process.env.BASE_API_URL || 'http://localhost:8000';

/**
 * Handles GET requests to fetch the result of a tagging task
 * Acts as a proxy to avoid CORS issues
 * Uses documentId as a query parameter instead of path parameter
 */
export async function GET(request: NextRequest) {
  const requestId = crypto.randomUUID();
  logger.info(`Processing GET request [${requestId}] to fetch tagging result`, SERVICE_NAME);

  try {
    // Get documentId from query parameter
    const { searchParams } = new URL(request.url);
    const documentId = searchParams.get('documentId');

    if (!documentId) {
      logger.warn('No documentId provided in query parameters', SERVICE_NAME);
      return NextResponse.json(
        { message: 'Bad request', error: 'documentId is required as a query parameter' },
        { status: 400 }
      );
    }

    logger.debug(`Fetching result for documentId: ${documentId}`, SERVICE_NAME);

    const RESULT_API_URL = `${BASE_API_URL}/api/v1/tagging/get/${documentId}/`;

    logger.debug(`Sending request to tagging result service: ${RESULT_API_URL}`, SERVICE_NAME);

    let resultResponse;
    try {
      resultResponse = await fetch(RESULT_API_URL, {
        method: 'GET',
        headers: {
          'X-Request-ID': requestId,
          'Content-Type': 'application/json',
        }
      });
      logger.debug(`Received response from tagging result service with status: ${resultResponse.status}`, SERVICE_NAME);
    } catch (fetchError) {
      logger.error(`Failed to connect to tagging result service: ${String(fetchError)}`, SERVICE_NAME);
      return NextResponse.json(
        { message: 'Failed to connect to tagging result service', error: String(fetchError) },
        { status: 503 }
      );
    }

    if (!resultResponse.ok) {
      let errorData;
      try {
        errorData = await resultResponse.json();
      } catch (e) {
        errorData = await resultResponse.text();
      }

      logger.error(`Error from tagging result service: ${JSON.stringify(errorData)}`, SERVICE_NAME);
      return NextResponse.json(
        { message: 'Error from tagging result service', error: errorData },
        { status: resultResponse.status }
      );
    }

    const resultData = await resultResponse.json();
    logger.debug(`Received tagging result response: ${JSON.stringify(resultData)}`, SERVICE_NAME);

    // Forward the response to the client
    return NextResponse.json(resultData);
  } catch (error) {
    logger.error(`Internal server error: ${String(error)}`, SERVICE_NAME);
    return NextResponse.json(
      { message: 'Internal server error', error: String(error) },
      { status: 500 }
    );
  }
}