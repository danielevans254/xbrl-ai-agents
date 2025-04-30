import { NextRequest, NextResponse } from 'next/server';
import { Logger, LogLevel } from '@/lib/logger';

const logger = Logger.getInstance({
  minLevel: LogLevel.DEBUG,
  includeContext: true,
  colorizeOutput: true
});

const SERVICE_NAME = 'tagging-api';
const BASE_API_URL = process.env.BASE_API_URL || 'http://localhost:8000';
const TAGGING_API_URL = `${BASE_API_URL}/api/v1/tagging/tag/`;

/**
 * Validates UUID format
 * @param uuid The UUID to validate
 * @returns Boolean indicating if the UUID is valid
 */
function isValidUUID(uuid: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(uuid);
}

/**
 * Creates and returns a standardized error response with proper logging
 * @param message Error message
 * @param error Error details
 * @param status HTTP status code
 * @returns NextResponse with formatted error
 */
function createErrorResponse(
  message: string,
  error: string | object,
  status: number,
  retryable: boolean = true
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
    retryable
  }, { status });
}

/**
 * Handler for POST requests to initiate the tagging process
 * Acts as a proxy to the backend tagging service
 */
export async function POST(request: NextRequest) {
  const requestId = crypto.randomUUID();
  logger.info(`Processing POST request [${requestId}] to initiate tagging`, SERVICE_NAME);

  try {
    // Parse request body
    let requestData;
    try {
      requestData = await request.json();
    } catch (parseError) {
      logger.error(`Failed to parse request body: ${parseError}`, SERVICE_NAME);
      return createErrorResponse(
        'Invalid request',
        'Failed to parse request body as JSON',
        400,
        true
      );
    }

    const { uuid } = requestData;

    if (!uuid) {
      logger.error('Missing uuid in request body', SERVICE_NAME);
      return createErrorResponse(
        'Bad request',
        'uuid is required in the request body',
        400,
        true
      );
    }

    if (!isValidUUID(uuid)) {
      logger.error(`Invalid UUID format: ${uuid}`, SERVICE_NAME);
      return createErrorResponse(
        'Bad request',
        'Invalid UUID format',
        400,
        true
      );
    }

    logger.debug(`Initiating tagging for document UUID: ${uuid}`, SERVICE_NAME);

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000);

    let taggingResponse;
    try {
      taggingResponse = await fetch(TAGGING_API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Request-ID': requestId,
        },
        body: JSON.stringify({ document_id: uuid }),
        signal: controller.signal
      });
      logger.debug(`Received response from tagging service with status: ${taggingResponse.status}`, SERVICE_NAME);
    } catch (fetchError) {
      clearTimeout(timeoutId);

      if (fetchError instanceof DOMException && fetchError.name === 'AbortError') {
        logger.error(`Request timeout initiating tagging for UUID ${uuid}`, SERVICE_NAME);
        return createErrorResponse(
          'Request timeout',
          'Connection to tagging service timed out',
          504,
          true
        );
      }

      logger.error(`Failed to connect to tagging service: ${fetchError}`, SERVICE_NAME);
      return createErrorResponse(
        'Connection error',
        `Failed to connect to tagging service: ${String(fetchError)}`,
        503,
        true
      );
    } finally {
      clearTimeout(timeoutId);
    }

    if (!taggingResponse.ok) {
      let errorDetails;
      try {
        errorDetails = await taggingResponse.json();
      } catch (jsonError) {
        try {
          errorDetails = await taggingResponse.text();
        } catch (textError) {
          errorDetails = `Status: ${taggingResponse.status} ${taggingResponse.statusText}`;
        }
      }

      logger.error(`Error from tagging service: ${JSON.stringify(errorDetails)}`, SERVICE_NAME);

      let errorMessage;
      let isRetryable = true;
      let statusCode = taggingResponse.status;

      switch (taggingResponse.status) {
        case 400:
          errorMessage = 'Invalid document ID or format';
          break;
        case 404:
          errorMessage = 'Document not found for tagging';
          isRetryable = false;
          break;
        case 401:
        case 403:
          errorMessage = 'Authentication or authorization error';
          isRetryable = false;
          break;
        case 409:
          errorMessage = 'Document is already being processed';
          isRetryable = true;
          break;
        case 429:
          errorMessage = 'Too many requests. Please try again later';
          isRetryable = true;
          break;
        case 500:
        case 502:
        case 503:
        case 504:
          errorMessage = 'The tagging service is currently unavailable';
          statusCode = 502;
          isRetryable = true;
          break;
        default:
          errorMessage = `Request failed with status: ${taggingResponse.status}`;
          isRetryable = true;
      }

      return createErrorResponse(
        errorMessage,
        errorDetails || `Failed with status: ${taggingResponse.status}`,
        statusCode,
        isRetryable
      );
    }

    // Process successful response
    let responseData;
    try {
      responseData = await taggingResponse.json();
      logger.debug(`Received tagging response: ${JSON.stringify(responseData)}`, SERVICE_NAME);
    } catch (jsonError) {
      logger.error(`Failed to parse tagging response as JSON: ${jsonError}`, SERVICE_NAME);
      return createErrorResponse(
        'Data parsing error',
        `Failed to parse tagging service response: ${String(jsonError)}`,
        500,
        true
      );
    }

    // Verify response structure
    if (!responseData || !responseData.data || !responseData.data.task_id) {
      logger.error(`Invalid tagging response structure: ${JSON.stringify(responseData)}`, SERVICE_NAME);
      return createErrorResponse(
        'Invalid response',
        'Missing task ID in tagging service response',
        500,
        true
      );
    }

    logger.info(`Successfully initiated tagging for UUID ${uuid}, task ID: ${responseData.data.task_id}`, SERVICE_NAME);

    // Return successful response to client
    return NextResponse.json({
      success: true,
      message: 'Tagging process initiated successfully',
      data: {
        task_id: responseData.data.task_id,
        document_id: uuid
      },
      showToast: true,
      toastType: 'success',
      toastTitle: 'Tagging Started',
      toastMessage: 'XBRL tagging process has been initiated'
    }, {
      status: 200,
      headers: {
        'X-Request-ID': requestId
      }
    });

  } catch (error) {
    logger.error(`Unhandled exception in tagging API: ${error}`, SERVICE_NAME);

    if (error instanceof Error && error.stack) {
      logger.error(`Stack trace: ${error.stack}`, SERVICE_NAME);
    }

    return createErrorResponse(
      'Internal server error',
      String(error),
      500,
      true
    );
  }
}