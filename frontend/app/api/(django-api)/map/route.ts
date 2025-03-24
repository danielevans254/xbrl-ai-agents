import { NextRequest, NextResponse } from 'next/server';
import { Logger, LogLevel } from '@/lib/logger';

const logger = Logger.getInstance({
  minLevel: LogLevel.DEBUG,
  includeContext: true,
  colorizeOutput: true
});

const SERVICE_NAME = 'mapping-api';
const DEFAULT_MAPPING_URL = 'http://localhost:8000/api/v1/mapping/map/';
const MAPPING_API_URL = process.env.MAPPING_API_URL || DEFAULT_MAPPING_URL;

function validateThreadId(threadId: string | null): threadId is string {
  return Boolean(threadId && threadId.trim().length > 0);
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
 * Handles GET requests to retrieve mapping data
 * First fetches data from the extract endpoint using threadId
 * Then sends that data to the mapping endpoint
 */
export async function GET(request: NextRequest) {
  const requestId = crypto.randomUUID();
  logger.info(`Processing GET request [${requestId}]`, SERVICE_NAME);

  try {
    const searchParams = request.nextUrl.searchParams;
    const threadId = searchParams.get('threadId');

    if (!validateThreadId(threadId)) {
      return createErrorResponse(
        'Bad request',
        'threadId is required and cannot be empty',
        400
      );
    }

    logger.debug(`Processing request for threadId: ${threadId}`, SERVICE_NAME);

    const origin = request.headers.get('origin') || 'http://localhost:3000';
    const extractUrl = `${origin}/api/extract?threadId=${threadId}`;

    logger.debug(`Fetching data from extract service: ${extractUrl}`, SERVICE_NAME);

    let extractResponse;
    try {
      extractResponse = await fetch(extractUrl, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'X-Request-ID': requestId,
        },
      });
    } catch (fetchError) {
      return createErrorResponse(
        'Failed to connect to extract service',
        String(fetchError),
        503
      );
    }

    if (!extractResponse.ok) {
      const errorData = await extractResponse.json().catch(() => null);
      return createErrorResponse(
        'Error from extract service',
        errorData || `Failed with status: ${extractResponse.status}`,
        extractResponse.status
      );
    }

    const extractData = await extractResponse.json();

    // Validate response structure
    if (!extractData || !extractData.success) {
      return createErrorResponse(
        'Invalid response from extract service',
        'Response missing success flag or indicates failure',
        502
      );
    }

    // Check if data array exists and has at least one entry
    if (!Array.isArray(extractData.data) || extractData.data.length === 0) {
      return createErrorResponse(
        'Invalid response from extract service',
        'Missing or empty data array',
        502
      );
    }

    // Extract the necessary data from the first item in the array
    const firstDataItem = extractData.data[0];

    // Check if data property exists in the first item
    if (!firstDataItem || !firstDataItem.data) {
      return createErrorResponse(
        'Invalid response from extract service',
        'Missing required data field in data item',
        502
      );
    }

    logger.info(
      `Successfully retrieved data from extract service for threadId: ${threadId}`,
      SERVICE_NAME
    );

    logger.debug(`Sending data to mapping service: ${MAPPING_API_URL}`, SERVICE_NAME);

    // Prepare payload with just the data.data property
    const payload = {
      data: firstDataItem.data,
      // threadId: threadId,
      // requestId: extractData.meta?.requestId || requestId
    };
    console.log(payload)

    let mappingResponse;
    try {
      mappingResponse = await fetch(MAPPING_API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Request-ID': requestId,
        },
        body: JSON.stringify(payload)
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
    logger.info(`Successfully processed mapping request for threadId: ${threadId}`, SERVICE_NAME);

    return NextResponse.json(mappingData, {
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
 * Handles POST requests that already have the necessary data
 * This allows direct posting to the mapping endpoint if needed
 */
export async function POST(request: NextRequest) {
  const requestId = crypto.randomUUID();
  logger.info(`Processing POST request [${requestId}]`, SERVICE_NAME);

  try {
    // Extract and validate threadId
    const searchParams = request.nextUrl.searchParams;
    const threadId = searchParams.get('threadId');

    if (!validateThreadId(threadId)) {
      return createErrorResponse(
        'Bad request',
        'threadId is required and cannot be empty',
        400
      );
    }

    let body;
    try {
      body = await request.json();
    } catch (jsonError) {
      return createErrorResponse(
        'Bad request',
        'Invalid JSON body',
        400
      );
    }

    if (!body || typeof body !== 'object') {
      return createErrorResponse(
        'Bad request',
        'Request body must be a valid JSON object',
        400
      );
    }

    if (!body.data) {
      return createErrorResponse(
        'Bad request',
        'Request body must contain a "data" property',
        400
      );
    }

    logger.debug(
      `Processing direct mapping request for threadId: ${threadId}`,
      SERVICE_NAME
    );

    const payload = {
      ...body,
      threadId,
      requestId: body.requestId || requestId
    };

    let mappingResponse;
    try {
      mappingResponse = await fetch(MAPPING_API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Request-ID': requestId
        },
        body: JSON.stringify(payload)
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
    logger.info(`Successfully processed direct mapping request for threadId: ${threadId}`, SERVICE_NAME);

    return NextResponse.json(mappingData, {
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