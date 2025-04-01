import { NextRequest, NextResponse } from 'next/server';
import { Logger, LogLevel } from '@/lib/logger';

const logger = Logger.getInstance({
  minLevel: LogLevel.DEBUG,
  includeContext: true,
  colorizeOutput: true
});

const SERVICE_NAME = 'tagging-api';
const MAPPING_API_URL = process.env.MAPPING_API_URL || 'http://localhost:8000/api/v1/mapping/partial-xbrl/';
const TAGGING_API_URL = process.env.TAGGING_API_URL || 'http://localhost:8000/api/v1/tagging/tag/';

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
 * Handles GET requests to retrieve mapping data and send it for tagging
 * 1. Fetches partial XBRL data from mapping endpoint
 * 2. Sends data to tagging endpoint
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

    let mappingResponse;
    try {
      mappingResponse = await fetch(`${MAPPING_API_URL}${documentId}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'X-Request-ID': requestId,
        }
      });
    } catch (fetchError) {
      return createErrorResponse(
        'Failed to connect to mapping service',
        String(fetchError),
        503
      );
    }

    if (!mappingResponse.ok) {
      const errorData = await mappingResponse.json().catch(() => null);
      return createErrorResponse(
        'Error from mapping service',
        errorData || `Failed with status: ${mappingResponse.status}`,
        mappingResponse.status
      );
    }

    const mappingData = await mappingResponse.json();

    if (!mappingData || !mappingData.data) {
      return createErrorResponse(
        'Invalid response from mapping service',
        'Missing required data',
        502
      );
    }

    logger.info(
      `Successfully retrieved mapping data for documentId: ${documentId}`,
      SERVICE_NAME
    );

    logger.debug(`Sending data to tagging service: ${TAGGING_API_URL}`, SERVICE_NAME);

    const payload = {
      mapped_data: mappingData.data,
      documentId: documentId,
      requestId: requestId
    };

    let taggingResponse;
    try {
      taggingResponse = await fetch(TAGGING_API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Request-ID': requestId,
        },
        body: JSON.stringify(payload)
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