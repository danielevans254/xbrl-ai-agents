import { NextRequest, NextResponse } from 'next/server';
import { Logger, LogLevel } from '@/lib/logger';

const logger = Logger.getInstance({
  minLevel: LogLevel.DEBUG,
  includeContext: true,
  colorizeOutput: true
});

const SERVICE_NAME = 'tagging-api';

function validateDocumentId(documentId: string | null): documentId is string {
  return Boolean(documentId && documentId.trim().length > 0);
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
 * Handles GET requests to retrieve tagging data by documentId
 * But sends a POST to the backend service since that's what it accepts
 */
export async function GET(request: NextRequest) {
  const requestId = crypto.randomUUID();
  logger.info(`Processing GET request [${requestId}]`, SERVICE_NAME);

  try {
    const searchParams = request.nextUrl.searchParams;
    const documentId = searchParams.get('documentId');

    if (!validateDocumentId(documentId)) {
      return createErrorResponse(
        'Bad request',
        'documentId is required and cannot be empty',
        400
      );
    }

    logger.debug(`Processing request for documentId: ${documentId}`, SERVICE_NAME);

    // Fix the URL to use the proper endpoint with the UUID parameter
    const TAGGING_API_URL = `http://localhost:8000/api/v1/tagging/tag/${documentId}/`;

    logger.debug(`Sending request to tagging service: ${TAGGING_API_URL}`, SERVICE_NAME);

    let taggingResponse;
    try {
      taggingResponse = await fetch(TAGGING_API_URL, {
        method: 'POST',  // Keep this as POST since the backend only accepts POST
        headers: {
          'Content-Type': 'application/json',
          'X-Request-ID': requestId,
        },
        body: JSON.stringify({
          requestId: requestId
        })
      });
    } catch (fetchError) {
      return createErrorResponse(
        'Failed to connect to tagging service',
        String(fetchError),
        503
      );
    }

    if (!taggingResponse.ok) {
      const errorData = await taggingResponse.json().catch(() => null);
      return createErrorResponse(
        'Error from tagging service',
        errorData || `Failed with status: ${taggingResponse.status}`,
        taggingResponse.status
      );
    }

    const taggingResult = await taggingResponse.json();
    logger.info(`Successfully processed tagging for documentId: ${documentId}`, SERVICE_NAME);

    return NextResponse.json(taggingResult, {
      status: 200,
      headers: {
        'X-Request-ID': requestId
      }
    });
  } catch (error) {
    return createErrorResponse(
      'Internal server error',
      String(error),
      500
    );
  }
}

/**
 * Handles POST requests for tagging data
 */
export async function POST(request: NextRequest) {
  const requestId = crypto.randomUUID();
  logger.info(`Processing POST request [${requestId}]`, SERVICE_NAME);

  try {
    const searchParams = request.nextUrl.searchParams;
    const documentId = searchParams.get('documentId');

    if (!validateDocumentId(documentId)) {
      return createErrorResponse(
        'Bad request',
        'documentId is required and cannot be empty',
        400
      );
    }

    // Parse the request body
    const requestBody = await request.json();

    logger.debug(`Processing tagging request for documentId: ${documentId}`, SERVICE_NAME);

    // Fix the URL to use the proper endpoint with the UUID parameter
    const TAGGING_API_URL = `http://localhost:8000/api/v1/tagging/tag/${documentId}/`;

    logger.debug(`Sending request to tagging service: ${TAGGING_API_URL}`, SERVICE_NAME);

    let taggingResponse;
    try {
      taggingResponse = await fetch(TAGGING_API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Request-ID': requestId,
        },
        body: JSON.stringify({
          ...requestBody,
          requestId: requestId
        })
      });
    } catch (fetchError) {
      return createErrorResponse(
        'Failed to connect to tagging service',
        String(fetchError),
        503
      );
    }

    if (!taggingResponse.ok) {
      const errorData = await taggingResponse.json().catch(() => null);
      return createErrorResponse(
        'Error from tagging service',
        errorData || `Failed with status: ${taggingResponse.status}`,
        taggingResponse.status
      );
    }

    const taggingResult = await taggingResponse.json();
    logger.info(`Successfully processed tagging for documentId: ${documentId}`, SERVICE_NAME);

    return NextResponse.json(taggingResult, {
      status: 200,
      headers: {
        'X-Request-ID': requestId
      }
    });
  } catch (error) {
    return createErrorResponse(
      'Internal server error',
      String(error),
      500
    );
  }
}