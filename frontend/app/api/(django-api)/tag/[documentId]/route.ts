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
 * Validates document ID format
 * @param documentId The document ID to validate
 * @returns Boolean indicating if the document ID is valid
 */
function validateDocumentId(documentId: string | null): documentId is string {
  if (!documentId) return false;

  // You can implement more specific validation if needed
  // e.g., UUID validation or other format checks
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(documentId);
}

/**
 * Creates a standardized error response
 * @param message Error message
 * @param error Error details
 * @param status HTTP status code
 * @returns NextResponse with formatted error
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
    toastTitle: 'Document Data Error',
    toastMessage: typeof error === 'string' ? error : message,
  }, { status });
}

/**
 * Handles GET requests to fetch the result of a tagging task
 * Acts as a proxy to avoid CORS issues
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { documentId: string } }
) {
  const requestId = crypto.randomUUID();
  const { documentId } = params;

  logger.info(`Processing GET request [${requestId}] to fetch tagging result for documentId: ${documentId}`, SERVICE_NAME);

  try {
    if (!validateDocumentId(documentId)) {
      logger.warn(`Invalid documentId format: ${documentId}`, SERVICE_NAME);
      return createErrorResponse(
        'Bad request',
        'Valid document ID is required',
        400
      );
    }

    const RESULT_API_URL = `${BASE_API_URL}/api/v1/tagging/get/${documentId}/`;

    logger.debug(`Sending request to tagging result service: ${RESULT_API_URL}`, SERVICE_NAME);

    // Set up timeout for result fetch
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 45000); // 45 second timeout (longer for potentially large data)

    let resultResponse;
    try {
      resultResponse = await fetch(RESULT_API_URL, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'X-Request-ID': requestId,
        },
        signal: controller.signal
      });
      logger.debug(`Received response from tagging result service with status: ${resultResponse.status}`, SERVICE_NAME);
    } catch (fetchError) {
      clearTimeout(timeoutId);

      // Handle timeout specifically
      if (fetchError instanceof DOMException && fetchError.name === 'AbortError') {
        logger.error(`Request timeout fetching result for document: ${documentId}`, SERVICE_NAME);
        return createErrorResponse(
          'Request timeout',
          'Connection to tagging result service timed out',
          504
        );
      }

      logger.error(`Failed to connect to tagging result service: ${String(fetchError)}`, SERVICE_NAME);
      return createErrorResponse(
        'Failed to connect to tagging result service',
        String(fetchError),
        503
      );
    } finally {
      clearTimeout(timeoutId);
    }

    if (!resultResponse.ok) {
      let errorData;
      try {
        errorData = await resultResponse.json();
      } catch (e) {
        try {
          errorData = await resultResponse.text();
        } catch {
          errorData = `Failed with status: ${resultResponse.status}`;
        }
      }

      logger.error(`Error from tagging result service: ${JSON.stringify(errorData)}`, SERVICE_NAME);

      // Handle different error status codes appropriately
      let errorMessage = 'Error retrieving document data';
      let statusCode = resultResponse.status;

      switch (resultResponse.status) {
        case 404:
          errorMessage = 'Tagged document not found';
          break;
        case 400:
          errorMessage = 'Invalid document ID format';
          break;
        case 401:
        case 403:
          errorMessage = 'Authorization error accessing document data';
          break;
        case 500:
        case 502:
        case 503:
        case 504:
          errorMessage = 'Tagging result service is currently unavailable';
          statusCode = 502; // Consistent status for server errors
          break;
      }

      return createErrorResponse(
        errorMessage,
        errorData || `Failed with status: ${resultResponse.status}`,
        statusCode
      );
    }

    // Parse the result data
    let resultData;
    try {
      resultData = await resultResponse.json();
      logger.debug(`Received tagging result data with length: ${JSON.stringify(resultData).length} bytes`, SERVICE_NAME);
    } catch (jsonError) {
      logger.error(`Failed to parse tagging result response as JSON: ${String(jsonError)}`, SERVICE_NAME);
      return createErrorResponse(
        'Failed to parse tagging result data',
        String(jsonError),
        500
      );
    }

    // Check for error in response even if HTTP status was 200
    if (resultData.success === false || resultData.error) {
      const errorMessage = resultData.message ||
        (resultData.error && resultData.error.error) ||
        'Unknown error retrieving tagged document';

      logger.error(`Tagging result service reported error: ${errorMessage}`, SERVICE_NAME);
      return createErrorResponse(
        'Tagging result service reported error',
        errorMessage,
        400
      );
    }

    // Validate the structure of the response
    if (!resultData.data && !resultData.documents) {
      logger.error(`Missing data in tagging result response: ${JSON.stringify(resultData)}`, SERVICE_NAME);
      return createErrorResponse(
        'Invalid response from tagging result service',
        'Missing data in response',
        500
      );
    }

    logger.info(`Successfully retrieved tagging result data for documentId: ${documentId}`, SERVICE_NAME);

    // Forward the response to the client with success toast
    return NextResponse.json({
      ...resultData,
      showToast: true,
      toastType: 'success',
      toastTitle: 'Data Retrieved',
      toastMessage: 'Tagged document data loaded successfully'
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