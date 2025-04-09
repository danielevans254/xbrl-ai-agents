import { NextRequest, NextResponse } from 'next/server';
import { Logger, LogLevel } from '@/lib/logger';

const logger = Logger.getInstance({
  minLevel: LogLevel.DEBUG,
  includeContext: true,
  colorizeOutput: true
});

const SERVICE_NAME = 'tagging-api';
const BASE_API_URL = process.env.BASE_API_URL || 'http://localhost:8000';

function validateUuid(uuid: string | null): uuid is string {
  return Boolean(uuid && uuid.trim().length > 0);
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
 * Handles POST requests to initiate tagging for a document
 */
export async function POST(request: NextRequest) {
  const requestId = crypto.randomUUID();
  logger.info(`Processing POST request [${requestId}] to initiate tagging`, SERVICE_NAME);

  try {
    // Parse the request body
    const requestBody = await request.json();
    logger.debug(`Request body: ${JSON.stringify(requestBody)}`, SERVICE_NAME);

    // Extract the UUID from the request
    const { uuid } = requestBody;

    if (!validateUuid(uuid)) {
      logger.warn(`Invalid uuid: ${uuid}`, SERVICE_NAME);
      return createErrorResponse(
        'Bad request',
        'uuid is required and cannot be empty',
        400
      );
    }

    logger.debug(`Processing tagging request for uuid: ${uuid}`, SERVICE_NAME);

    // First, fetch the data from the mapping endpoint
    const MAPPING_API_URL = `${BASE_API_URL}/api/v1/mapping/partial-xbrl/${uuid}/`;

    logger.debug(`Fetching mapping data from: ${MAPPING_API_URL}`, SERVICE_NAME);

    let mappingResponse;
    try {
      mappingResponse = await fetch(MAPPING_API_URL, {
        method: 'GET',
        headers: {
          'X-Request-ID': requestId,
        }
      });
      logger.debug(`Received response from mapping service with status: ${mappingResponse.status}`, SERVICE_NAME);
    } catch (fetchError) {
      logger.error(`Failed to connect to mapping service: ${String(fetchError)}`, SERVICE_NAME);
      return createErrorResponse(
        'Failed to connect to mapping service',
        String(fetchError),
        503
      );
    }

    if (!mappingResponse.ok) {
      const errorData = await mappingResponse.json().catch(() => null);
      logger.error(`Error from mapping service: ${JSON.stringify(errorData)}`, SERVICE_NAME);
      return createErrorResponse(
        'Error from mapping service',
        errorData || `Failed with status: ${mappingResponse.status}`,
        mappingResponse.status
      );
    }

    // Parse the mapping response
    let mappingData;
    try {
      mappingData = await mappingResponse.json();
      logger.debug(`Successfully retrieved mapping data`, SERVICE_NAME);
    } catch (jsonError) {
      logger.error(`Failed to parse mapping response as JSON: ${String(jsonError)}`, SERVICE_NAME);
      return createErrorResponse(
        'Failed to parse mapping response',
        String(jsonError),
        500
      );
    }

    // Extract the document UUID from the mapping data
    const mappingUuid = mappingData.data?.id || uuid;

    if (!mappingUuid) {
      logger.error(`No document UUID found in mapping response: ${JSON.stringify(mappingData)}`, SERVICE_NAME);
      return createErrorResponse(
        'Invalid mapping response',
        'No document UUID found in mapping data',
        500
      );
    }

    logger.info(`Using document UUID from mapping data: ${mappingUuid}`, SERVICE_NAME);

    // Now call the tagging endpoint with the extracted document UUID
    const TAGGING_API_URL = `${BASE_API_URL}/api/v1/tagging/tag/${mappingUuid}/`;

    logger.debug(`Sending request to tagging service: ${TAGGING_API_URL}`, SERVICE_NAME);

    let taggingResponse;
    try {
      taggingResponse = await fetch(TAGGING_API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Request-ID': requestId,
        },
        body: JSON.stringify({ requestId })
      });
      logger.debug(`Received response from tagging service with status: ${taggingResponse.status}`, SERVICE_NAME);
    } catch (fetchError) {
      logger.error(`Failed to connect to tagging service: ${String(fetchError)}`, SERVICE_NAME);
      return createErrorResponse(
        'Failed to connect to tagging service',
        String(fetchError),
        503
      );
    }

    if (!taggingResponse.ok) {
      let errorData;
      try {
        errorData = await taggingResponse.json();
      } catch (e) {
        errorData = await taggingResponse.text();
      }
      logger.error(`Error from tagging service: ${JSON.stringify(errorData)}`, SERVICE_NAME);
      return createErrorResponse(
        'Error from tagging service',
        errorData || `Failed with status: ${taggingResponse.status}`,
        taggingResponse.status
      );
    }

    // Parse the tagging response
    let taggingData;
    try {
      taggingData = await taggingResponse.json();
      logger.debug(`Full tagging response: ${JSON.stringify(taggingData)}`, SERVICE_NAME);
    } catch (jsonError) {
      logger.error(`Failed to parse tagging response as JSON: ${String(jsonError)}`, SERVICE_NAME);
      return createErrorResponse(
        'Failed to parse tagging response',
        String(jsonError),
        500
      );
    }

    // Extract the task_id from the response
    const task_id = taggingData?.data?.task_id;

    if (!task_id) {
      logger.error(`No task_id found in tagging response: ${JSON.stringify(taggingData)}`, SERVICE_NAME);
      return createErrorResponse(
        'Invalid response from tagging service',
        'No task_id found in response',
        500
      );
    }

    logger.info(`Tagging request accepted with task_id: ${task_id}`, SERVICE_NAME);

    return NextResponse.json({
      success: true,
      message: 'XBRL tagging request accepted for processing',
      data: {
        status: 'PROCESSING',
        task_id: task_id
      }
    });

  } catch (error) {
    logger.error(`Internal server error: ${String(error)}`, SERVICE_NAME);
    return createErrorResponse(
      'Internal server error',
      String(error),
      500
    );
  }
}