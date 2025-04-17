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
  if (!uuid) return false;
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(uuid);
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
    error,
    showToast: true,
    toastType: 'error',
    toastTitle: 'Tagging Error',
    toastMessage: typeof error === 'string' ? error : message,
  }, { status });
}

/**
 * Handles POST requests to initiate tagging for a document
 */
export async function POST(request: NextRequest) {
  const requestId = crypto.randomUUID();
  logger.info(`Processing POST request [${requestId}] to initiate tagging`, SERVICE_NAME);

  try {
    // Parse the request body
    let requestBody;
    try {
      requestBody = await request.json();
      logger.debug(`Request body: ${JSON.stringify(requestBody)}`, SERVICE_NAME);
    } catch (parseError) {
      return createErrorResponse(
        'Invalid request body',
        `Failed to parse request body: ${String(parseError)}`,
        400
      );
    }

    // Extract the UUID from the request
    const { uuid } = requestBody;

    if (!validateUuid(uuid)) {
      logger.warn(`Invalid uuid format: ${uuid}`, SERVICE_NAME);
      return createErrorResponse(
        'Bad request',
        'Valid UUID is required and cannot be empty',
        400
      );
    }

    logger.debug(`Processing tagging request for uuid: ${uuid}`, SERVICE_NAME);

    // First, fetch the data from the mapping endpoint
    const MAPPING_API_URL = `${BASE_API_URL}/api/v1/mapping/partial-xbrl/${uuid}/`;

    logger.debug(`Fetching mapping data from: ${MAPPING_API_URL}`, SERVICE_NAME);

    // Set up timeout for mapping fetch
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout

    let mappingResponse;
    try {
      mappingResponse = await fetch(MAPPING_API_URL, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'X-Request-ID': requestId,
        },
        signal: controller.signal
      });
      logger.debug(`Received response from mapping service with status: ${mappingResponse.status}`, SERVICE_NAME);
    } catch (fetchError) {
      clearTimeout(timeoutId);

      // Handle timeout specifically
      if (fetchError instanceof DOMException && fetchError.name === 'AbortError') {
        logger.error(`Request timeout fetching mapping data: ${uuid}`, SERVICE_NAME);
        return createErrorResponse(
          'Request timeout',
          'Connection to mapping service timed out',
          504
        );
      }

      logger.error(`Failed to connect to mapping service: ${String(fetchError)}`, SERVICE_NAME);
      return createErrorResponse(
        'Failed to connect to mapping service',
        String(fetchError),
        503
      );
    } finally {
      clearTimeout(timeoutId);
    }

    if (!mappingResponse.ok) {
      let errorData;
      try {
        errorData = await mappingResponse.json();
      } catch (e) {
        try {
          errorData = await mappingResponse.text();
        } catch {
          errorData = `Failed with status: ${mappingResponse.status}`;
        }
      }

      logger.error(`Error from mapping service: ${JSON.stringify(errorData)}`, SERVICE_NAME);

      // Handle different error status codes appropriately
      let errorMessage = 'Error retrieving mapping data';
      let statusCode = mappingResponse.status;

      switch (mappingResponse.status) {
        case 404:
          errorMessage = 'Document not found in mapping service';
          break;
        case 400:
          errorMessage = 'Invalid document ID or format';
          break;
        case 401:
        case 403:
          errorMessage = 'Authorization error accessing document';
          break;
        case 500:
        case 502:
        case 503:
        case 504:
          errorMessage = 'Mapping service is currently unavailable';
          statusCode = 502; // Consistent status for server errors
          break;
      }

      return createErrorResponse(
        errorMessage,
        errorData || `Failed with status: ${mappingResponse.status}`,
        statusCode
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

    // Validate mapping data structure
    if (!mappingData || (!mappingData.data && !mappingData.documents)) {
      logger.error(`Invalid mapping data structure: ${JSON.stringify(mappingData)}`, SERVICE_NAME);
      return createErrorResponse(
        'Invalid mapping response',
        'Missing required data in mapping response',
        502
      );
    }

    // Extract the document UUID from the mapping data
    const mappingUuid = mappingData.data?.id || mappingData.documents?.id || uuid;

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

    // Set up timeout for tagging request
    const taggingController = new AbortController();
    const taggingTimeoutId = setTimeout(() => taggingController.abort(), 60000); // 60 second timeout

    let taggingResponse;
    try {
      taggingResponse = await fetch(TAGGING_API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'X-Request-ID': requestId,
        },
        body: JSON.stringify({ requestId }),
        signal: taggingController.signal
      });
      logger.debug(`Received response from tagging service with status: ${taggingResponse.status}`, SERVICE_NAME);
    } catch (fetchError) {
      clearTimeout(taggingTimeoutId);

      // Handle timeout specifically
      if (fetchError instanceof DOMException && fetchError.name === 'AbortError') {
        logger.error(`Request timeout initiating tagging for document: ${mappingUuid}`, SERVICE_NAME);
        return createErrorResponse(
          'Request timeout',
          'Connection to tagging service timed out',
          504
        );
      }

      logger.error(`Failed to connect to tagging service: ${String(fetchError)}`, SERVICE_NAME);
      return createErrorResponse(
        'Failed to connect to tagging service',
        String(fetchError),
        503
      );
    } finally {
      clearTimeout(taggingTimeoutId);
    }

    if (!taggingResponse.ok) {
      let errorData;
      try {
        errorData = await taggingResponse.json();
      } catch (e) {
        try {
          errorData = await taggingResponse.text();
        } catch {
          errorData = `Failed with status: ${taggingResponse.status}`;
        }
      }

      logger.error(`Error from tagging service: ${JSON.stringify(errorData)}`, SERVICE_NAME);

      // Handle different error status codes appropriately
      let errorMessage = 'Error initiating tagging process';
      let statusCode = taggingResponse.status;

      switch (taggingResponse.status) {
        case 404:
          errorMessage = 'Document not found for tagging';
          break;
        case 400:
          errorMessage = 'Invalid document or tagging request';
          break;
        case 401:
        case 403:
          errorMessage = 'Authorization error accessing tagging service';
          break;
        case 409:
          errorMessage = 'Document is already being processed';
          break;
        case 500:
        case 502:
        case 503:
        case 504:
          errorMessage = 'Tagging service is currently unavailable';
          statusCode = 502;
          break;
      }

      return createErrorResponse(
        errorMessage,
        errorData || `Failed with status: ${taggingResponse.status}`,
        statusCode
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

    // Check for error in response even if HTTP status was 200
    if (taggingData.success === false || taggingData.error) {
      const errorMessage = taggingData.message ||
        (taggingData.error && taggingData.error.error) ||
        'Unknown error from tagging service';

      logger.error(`Tagging service reported error: ${errorMessage}`, SERVICE_NAME);
      return createErrorResponse(
        'Tagging service reported error',
        errorMessage,
        400
      );
    }

    // Validate the structure of the tagging response
    if (!taggingData.data) {
      logger.error(`Missing data field in tagging response: ${JSON.stringify(taggingData)}`, SERVICE_NAME);
      return createErrorResponse(
        'Invalid response from tagging service',
        'Missing data field in response',
        500
      );
    }

    // Extract the task_id from the response
    const task_id = taggingData.data.task_id;

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
        task_id: task_id,
        document_id: mappingUuid
      },
      showToast: true,
      toastType: 'info',
      toastTitle: 'Tagging Started',
      toastMessage: 'XBRL tagging process has been initiated.'
    });

  } catch (error) {
    logger.error(`Internal server error: ${String(error)}`, SERVICE_NAME);

    if (error instanceof Error && error.stack) {
      logger.error(`Stack trace: ${error.stack}`, SERVICE_NAME);
    }

    return createErrorResponse(
      'Internal server error',
      String(error),
      500
    );
  }
}