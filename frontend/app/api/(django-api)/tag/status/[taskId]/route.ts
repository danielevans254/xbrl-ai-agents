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
 * Validates if the provided taskId is valid
 * @param taskId Task ID to validate
 * @returns Boolean indicating if taskId is valid
 */
function validateTaskId(taskId: string | null): taskId is string {
  if (!taskId) return false;
  return taskId.trim().length > 0;
}

/**
 * Creates standardized error response with logging
 * @param message Error message
 * @param error Error details
 * @param status HTTP status code
 * @returns NextResponse with error formatting
 */
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
    toastTitle: 'Tagging Status Error',
    toastMessage: typeof error === 'string' ? error : message,
  }, { status });
}

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

  try {
    if (!validateTaskId(taskId)) {
      logger.warn(`Invalid taskId: ${taskId}`, SERVICE_NAME);
      return createErrorResponse(
        'Bad request',
        'taskId is required and cannot be empty',
        400
      );
    }

    logger.debug(`Checking status for taskId: ${taskId}`, SERVICE_NAME);

    const STATUS_API_URL = `${BASE_API_URL}/api/v1/tagging/tag/status/${taskId}/`;

    logger.debug(`Sending request to tagging status service: ${STATUS_API_URL}`, SERVICE_NAME);

    // Set up timeout for status request
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout

    let statusResponse;
    try {
      statusResponse = await fetch(STATUS_API_URL, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'X-Request-ID': requestId,
        },
        signal: controller.signal
      });
      logger.debug(`Received response from tagging status service with status: ${statusResponse.status}`, SERVICE_NAME);
    } catch (fetchError) {
      clearTimeout(timeoutId);

      // Handle timeout specifically
      if (fetchError instanceof DOMException && fetchError.name === 'AbortError') {
        logger.error(`Request timeout checking status for task: ${taskId}`, SERVICE_NAME);
        return createErrorResponse(
          'Request timeout',
          'Connection to tagging status service timed out',
          504
        );
      }

      logger.error(`Failed to connect to tagging status service: ${String(fetchError)}`, SERVICE_NAME);
      return createErrorResponse(
        'Failed to connect to tagging status service',
        String(fetchError),
        503
      );
    } finally {
      clearTimeout(timeoutId);
    }

    // Parse response regardless of status code to get detailed error info if available
    let statusData;
    try {
      statusData = await statusResponse.json();
      logger.debug(`Received tagging status response: ${JSON.stringify(statusData)}`, SERVICE_NAME);
    } catch (jsonError) {
      const textResponse = await statusResponse.text().catch(() => 'Unable to read response');
      logger.error(`Failed to parse tagging status response as JSON: ${textResponse}`, SERVICE_NAME);
      return createErrorResponse(
        'Failed to parse response from tagging status service',
        String(jsonError),
        500
      );
    }

    // Check for explicit failure status in the response
    if (statusData &&
      (statusData.success === false ||
        statusData.error?.status === 'FAILED' ||
        statusData.data?.status === 'FAILED')) {

      const errorMessage = statusData.message ||
        (statusData.error && statusData.error.error) ||
        (statusData.data && statusData.data.error) ||
        'Tagging process reported failure';

      logger.error(`Tagging status reported failure: ${errorMessage}`, SERVICE_NAME);

      return NextResponse.json({
        success: false,
        message: errorMessage,
        error: statusData.error || { error: errorMessage, status: 'FAILED' },
        data: statusData.data || { status: 'FAILED', error: errorMessage },
        showToast: true,
        toastType: 'error',
        toastTitle: 'Tagging Failed',
        toastMessage: errorMessage,
        retryable: true // Flag to indicate this error can be retried
      }, { status: 400 });
    }

    if (!statusResponse.ok) {
      logger.error(`Error response from tagging status service: ${JSON.stringify(statusData)}`, SERVICE_NAME);

      // Handle different error status codes appropriately
      let errorMessage = 'Error retrieving tagging status';
      let statusCode = statusResponse.status;

      switch (statusResponse.status) {
        case 404:
          errorMessage = 'Tagging task not found';
          break;
        case 400:
          errorMessage = 'Invalid tagging task ID or format';
          break;
        case 401:
        case 403:
          errorMessage = 'Authorization error accessing tagging status';
          break;
        case 500:
        case 502:
        case 503:
        case 504:
          errorMessage = 'Tagging service is currently unavailable';
          statusCode = 502; // Consistent status for server errors
          break;
      }

      return createErrorResponse(
        errorMessage,
        statusData || `Failed with status: ${statusResponse.status}`,
        statusCode
      );
    }

    // Validate the structure of the status response
    if (!statusData.data || !statusData.data.status) {
      logger.error(`Missing status information in response: ${JSON.stringify(statusData)}`, SERVICE_NAME);
      return createErrorResponse(
        'Invalid status response',
        'Missing status information in response',
        500
      );
    }

    // Add toast notifications based on status
    let responseWithToast = { ...statusData };

    if (statusData.data.status === 'COMPLETED') {
      responseWithToast = {
        ...statusData,
        showToast: true,
        toastType: 'success',
        toastTitle: 'Tagging Complete',
        toastMessage: 'XBRL tagging process completed successfully'
      };
    } else if (statusData.data.status === 'PROCESSING') {
      responseWithToast = {
        ...statusData,
        showToast: false // No toast for ongoing processing
      };
    }

    // Forward the success response to the client
    return NextResponse.json(responseWithToast);
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