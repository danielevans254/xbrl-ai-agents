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
  return NextResponse.json({ message, error }, { status });
}

async function pollMappingStatus(taskId: string, requestId: string, maxAttempts = 30): Promise<any> {
  let attempts = 0;
  const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

  while (attempts < maxAttempts) {
    logger.debug(`Polling mapping status for task ${taskId}, attempt ${attempts + 1}`, SERVICE_NAME);

    try {
      const statusResponse = await fetch(`${MAPPING_STATUS_URL}${taskId}/`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'X-Request-ID': requestId,
        },
      });

      if (!statusResponse.ok) {
        throw new Error(`Status check failed: ${statusResponse.status}`);
      }

      const statusData = await statusResponse.json();

      if (statusData.data.status === 'completed') {
        const filingId = statusData.data.filing_id;

        const xbrlResponse = await fetch(`${XBRL_PARTIAL_URL}${filingId}/`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'X-Request-ID': requestId,
          },
        });

        if (!xbrlResponse.ok) {
          throw new Error(`XBRL fetch failed: ${xbrlResponse.status}`);
        }

        return await xbrlResponse.json();
      }

      if (statusData.data.status === 'processing') {
        await delay(2000);
        attempts++;
        continue;
      }

      throw new Error(`Unexpected status: ${statusData.data.status}`);

    } catch (error) {
      logger.error(`Error polling mapping status: ${error}`, SERVICE_NAME);

      if (attempts === maxAttempts - 1) {
        throw error;
      }

      await delay(2000);
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
      return createErrorResponse(
        'Failed to fetch extract data',
        `Status: ${extractResponse.status}`,
        extractResponse.status
      );
    }

    const extractData = await extractResponse.json();

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
      return createErrorResponse(
        'Failed to submit mapping request',
        `Status: ${mappingResponse.status}`,
        mappingResponse.status
      );
    }

    const mappingData = await mappingResponse.json();

    if (!mappingData.success || !mappingData.data.task_id) {
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
    return createErrorResponse(
      'Internal server error',
      String(error),
      500
    );
  }
}