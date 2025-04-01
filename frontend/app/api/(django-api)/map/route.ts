import { NextRequest, NextResponse } from 'next/server';
import { Logger, LogLevel } from '@/lib/logger';

const logger = Logger.getInstance({
  minLevel: LogLevel.DEBUG,
  includeContext: true,
  colorizeOutput: true
});

const SERVICE_NAME = 'mapping-api';
const BASE_URL = 'http://127.0.0.1:8000/api/v1';
const MAPPING_API_URL = `${BASE_URL}/mapping/map/`;
const MAPPING_STATUS_URL = `${BASE_URL}/mapping/status/`;
const XBRL_PARTIAL_URL = `${BASE_URL}/mapping/partial-xbrl/`;

function validateThreadId(threadId: string | null): threadId is string {
  return Boolean(threadId && threadId.trim().length > 0);
}

function createErrorResponse(
  message: string,
  error: string | object,
  status: number
): NextResponse {
  logger.error(`${message}: ${JSON.stringify(error)}`, SERVICE_NAME);
  return NextResponse.json({
    success: false,
    message,
    error
  }, { status });
}

async function pollMappingStatus(taskId: string, requestId: string, maxAttempts = 3000): Promise<any> {
  let attempts = 0;
  const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

  while (attempts < maxAttempts) {
    try {
      const statusResponse = await fetch(`${MAPPING_STATUS_URL}${taskId}/`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'X-Request-ID': requestId,
        },
      });

      if (!statusResponse.ok) {
        const errorText = await statusResponse.text();
        throw new Error(`Status check failed: ${statusResponse.status} - ${errorText}`);
      }

      let statusData;
      try {
        statusData = await statusResponse.json();
      } catch (parseError) {
        throw new Error(`Failed to parse status response: ${parseError}`);
      }

      if (!statusData?.success) {
        logger.error(`Error response from status API: ${JSON.stringify(statusData)}`, SERVICE_NAME);

        const backoffTime = Math.min(5000 * Math.pow(1.5, attempts), 60000);
        await delay(backoffTime);
        attempts++;
        continue;
      }

      if (!statusData.data || !statusData.data.status || typeof statusData.data.status !== 'string') {
        throw new Error(`Invalid status response structure: ${JSON.stringify(statusData)}`);
      }

      switch (statusData.data.status) {
        case 'completed': {
          if (!statusData.data.filing_id) {
            throw new Error('Missing filing ID in completed status');
          }

          const xbrlResponse = await fetch(`${XBRL_PARTIAL_URL}${statusData.data.filing_id}/`, {
            headers: {
              'X-Request-ID': requestId,
            },
          });

          if (!xbrlResponse.ok) {
            const errorText = await xbrlResponse.text();
            throw new Error(`XBRL fetch failed: ${xbrlResponse.status} - ${errorText}`);
          }

          try {
            return await xbrlResponse.json();
          } catch (parseError) {
            throw new Error(`Failed to parse XBRL response: ${parseError}`);
          }
        }

        case 'processing':
          const waitTime = Math.min(2000 + (attempts * 500), 10000);
          await delay(waitTime);
          attempts++;
          break;

        case 'failed':
          throw new Error(`Mapping processing failed: ${statusData.data.error || 'Unknown error'}`);

        default:
          throw new Error(`Unexpected status: ${statusData.data.status}`);
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      logger.error(`Polling attempt ${attempts + 1} failed: ${errorMessage}`, SERVICE_NAME);

      if (attempts === maxAttempts - 1) {
        throw new Error(`Maximum polling attempts exceeded: ${errorMessage}`);
      }

      const backoffTime = Math.min(5000 * Math.pow(1.5, attempts), 60000);
      await delay(backoffTime);
      attempts++;
    }
  }
  throw new Error('Maximum polling attempts exceeded');
}

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

    const extractResponse = await fetch(extractUrl, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'X-Request-ID': requestId,
      },
    });

    if (!extractResponse.ok) {
      const errorText = await extractResponse.text();
      return createErrorResponse(
        'Failed to fetch extract data',
        `Status: ${extractResponse.status} - ${errorText}`,
        extractResponse.status
      );
    }

    let extractData;
    try {
      extractData = await extractResponse.json();
    } catch (parseError) {
      return createErrorResponse(
        'Failed to parse extract service response',
        String(parseError),
        502
      );
    }

    if (!extractData || !extractData.success || !Array.isArray(extractData.data) || extractData.data.length === 0) {
      return createErrorResponse(
        'Invalid response from extract service',
        'Missing or invalid data',
        502
      );
    }

    const firstDataItem = extractData.data[0];
    if (!firstDataItem || !firstDataItem.data) {
      return createErrorResponse(
        'Invalid response from extract service',
        'Missing required data field',
        502
      );
    }

    const payload = {
      data: firstDataItem.data,
    };

    const mappingResponse = await fetch(MAPPING_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Request-ID': requestId,
      },
      body: JSON.stringify(payload)
    });

    if (!mappingResponse.ok) {
      const errorText = await mappingResponse.text();
      return createErrorResponse(
        'Failed to submit mapping request',
        `Status: ${mappingResponse.status} - ${errorText}`,
        mappingResponse.status
      );
    }

    let mappingData;
    try {
      mappingData = await mappingResponse.json();
    } catch (parseError) {
      return createErrorResponse(
        'Failed to parse mapping service response',
        String(parseError),
        502
      );
    }

    if (!mappingData.success || !mappingData.data || !mappingData.data.task_id) {
      return createErrorResponse(
        'Invalid mapping service response',
        'Missing task ID',
        502
      );
    }

    const finalXbrlData = await pollMappingStatus(mappingData.data.task_id, requestId);

    logger.info(`Successfully processed mapping request for threadId: ${threadId}`, SERVICE_NAME);

    return NextResponse.json(finalXbrlData, {
      status: 200,
      headers: {
        'X-Request-ID': requestId
      }
    });

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    return createErrorResponse(
      'Internal server error',
      errorMessage,
      500
    );
  }
}