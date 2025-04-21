/**
 * API Route for updating mapped data
 * Acts as a proxy to the backend API to solve CORS issues
 *
 * Route: PUT /api/v1/mapping/update/:uuid/
 */

import { NextResponse } from 'next/server';
import { Logger, LogLevel } from '@/lib/logger';
import { denormalizeAcraData } from '@/utils/denormalize-api-response';

const logger = Logger.getInstance({
  minLevel: LogLevel.DEBUG,
  includeContext: true,
  colorizeOutput: true
});

const SERVICE_NAME = 'mapping-update-api';

interface RouteParams {
  params: {
    uuid: string;
  };
}

/**
 * The denormalizeAcraData function is imported from @/lib/utils/data-transformers
 * It converts application data (PascalCase) to API format (snake_case)
 */

/**
 * Handler for PUT requests to update mapped data
 * This forwards the request to the backend API
 * 
 * @param request - The request object
 * @param context - The context containing route parameters
 * @returns Next.js response object
 */
export async function PUT(
  request: Request,
  { params }: RouteParams
) {
  const { uuid } = params;
  const requestId = crypto.randomUUID();

  logger.info(`Processing PUT request for UUID: ${uuid} [${requestId}]`, SERVICE_NAME);

  try {
    // Validate UUID
    if (!uuid) {
      logger.error(`Missing UUID parameter [${requestId}]`, SERVICE_NAME);
      return NextResponse.json(
        {
          status: 'error',
          message: 'UUID parameter is required',
          showToast: true,
          toastType: 'error',
          toastTitle: 'Invalid Request',
          toastMessage: 'Missing document identifier'
        },
        { status: 400 }
      );
    }

    if (!isValidUUID(uuid)) {
      logger.error(`Invalid UUID format: ${uuid} [${requestId}]`, SERVICE_NAME);
      return NextResponse.json(
        {
          status: 'error',
          message: 'Invalid UUID format',
          showToast: true,
          toastType: 'error',
          toastTitle: 'Invalid Request',
          toastMessage: 'Document identifier has an invalid format'
        },
        { status: 400 }
      );
    }

    // Parse request body
    let payload;
    try {
      payload = await request.json();
    } catch (parseError) {
      logger.error(`Failed to parse request body [${requestId}]: ${parseError}`, SERVICE_NAME);
      return NextResponse.json(
        {
          status: 'error',
          message: 'Invalid request body: ' + (parseError instanceof Error ? parseError.message : 'Could not parse JSON'),
          showToast: true,
          toastType: 'error',
          toastTitle: 'Invalid Request',
          toastMessage: 'The data you submitted is not in a valid format'
        },
        { status: 400 }
      );
    }

    logger.debug(`Request payload for UUID ${uuid} [${requestId}]:`, SERVICE_NAME);

    // Validate payload
    if (!payload) {
      logger.error(`Empty request payload for UUID ${uuid} [${requestId}]`, SERVICE_NAME);
      return NextResponse.json(
        {
          status: 'error',
          message: 'Request body is empty',
          showToast: true,
          toastType: 'error',
          toastTitle: 'Missing Data',
          toastMessage: 'No data was provided to update'
        },
        { status: 400 }
      );
    }

    const transformedPayload = denormalizeAcraData(payload);

    if (!transformedPayload.mapped_data) {
      logger.error(`Missing mapped_data field in payload for UUID ${uuid} [${requestId}]`, SERVICE_NAME);
      return NextResponse.json(
        {
          status: 'error',
          message: 'Missing required field: mapped_data',
          showToast: true,
          toastType: 'error',
          toastTitle: 'Missing Data',
          toastMessage: 'The required financial data is missing from your submission'
        },
        { status: 400 }
      );
    }

    // Get the backend API URL from environment variable or use default
    const backendApiUrl = process.env.BACKEND_API_URL || 'http://localhost:8000';
    const apiEndpoint = `${backendApiUrl}/api/v1/mapping/update/${uuid}/`;

    logger.info(`Forwarding request to backend API: ${apiEndpoint} [${requestId}]`, SERVICE_NAME);
    logger.debug(`Transformed payload: ${JSON.stringify(transformedPayload)}`, SERVICE_NAME);

    // Forward the request to the backend API with timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 60000); // 60 second timeout for updates

    let backendResponse;
    try {
      backendResponse = await fetch(apiEndpoint, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'X-Request-ID': requestId
          // Add any required authentication headers here
          // 'Authorization': `Bearer ${process.env.API_TOKEN}`,
        },
        body: JSON.stringify(transformedPayload),
        signal: controller.signal
      });
    } catch (fetchError) {
      clearTimeout(timeoutId);

      // Handle abort/timeout specifically
      if (fetchError instanceof DOMException && fetchError.name === 'AbortError') {
        logger.error(`Request timeout for UUID ${uuid} [${requestId}]`, SERVICE_NAME);
        return NextResponse.json(
          {
            status: 'error',
            message: 'Request timed out',
            showToast: true,
            toastType: 'error',
            toastTitle: 'Request Timeout',
            toastMessage: 'The update request timed out. Please try again.'
          },
          { status: 504 }
        );
      }

      logger.error(`Connection error for UUID ${uuid}: ${fetchError} [${requestId}]`, SERVICE_NAME);
      return NextResponse.json(
        {
          status: 'error',
          message: fetchError instanceof Error ? fetchError.message : 'Failed to connect to backend API',
          showToast: true,
          toastType: 'error',
          toastTitle: 'Connection Error',
          toastMessage: 'Could not connect to the update service. Please try again later.'
        },
        { status: 502 }
      );
    } finally {
      clearTimeout(timeoutId);
    }

    // Check if the backend request was successful
    if (!backendResponse.ok) {
      // Try to get error details from response
      let errorMessage;
      try {
        const errorData = await backendResponse.json();
        errorMessage = errorData.message || errorData.error || `Backend API error: ${backendResponse.status}`;
        logger.error(`Backend API error response for UUID ${uuid}: ${JSON.stringify(errorData)} [${requestId}]`, SERVICE_NAME);
      } catch (parseError) {
        // If we can't parse JSON, use text or status
        try {
          const errorText = await backendResponse.text();
          errorMessage = errorText || `Backend API error: ${backendResponse.status} ${backendResponse.statusText}`;
        } catch (textError) {
          errorMessage = `Backend API error: ${backendResponse.status} ${backendResponse.statusText}`;
        }
        logger.error(`Failed to parse backend error for UUID ${uuid}: ${errorMessage} [${requestId}]`, SERVICE_NAME);
      }

      // Map common HTTP status codes to appropriate messages
      let toastMessage = 'An error occurred while updating the document.';
      let clientStatus = backendResponse.status;

      switch (backendResponse.status) {
        case 400:
          toastMessage = 'The data format is invalid. Please check your changes and try again.';
          break;
        case 404:
          toastMessage = 'The document you are trying to update could not be found.';
          break;
        case 401:
          toastMessage = 'Authentication required to update this document.';
          break;
        case 403:
          toastMessage = 'You do not have permission to update this document.';
          break;
        case 409:
          toastMessage = 'Update conflict. Another user may have modified this document.';
          break;
        case 413:
          toastMessage = 'The data you are trying to submit is too large.';
          break;
        case 422:
          toastMessage = 'The server could not process your data. Please check for errors.';
          break;
        case 429:
          toastMessage = 'Too many requests. Please try again later.';
          break;
        case 500:
        case 502:
        case 503:
        case 504:
          toastMessage = 'The update service is currently unavailable. Please try again later.';
          clientStatus = 502;
          break;
      }

      // Return error to client
      return NextResponse.json(
        {
          status: 'error',
          message: errorMessage,
          showToast: true,
          toastType: 'error',
          toastTitle: 'Update Failed',
          toastMessage: toastMessage
        },
        { status: clientStatus }
      );
    }

    let responseData;
    try {
      responseData = await backendResponse.json();
      logger.debug(`Backend response status: ${backendResponse.status} [${requestId}]`, SERVICE_NAME);
    } catch (parseError) {
      logger.error(`Failed to parse backend response for UUID ${uuid}: ${parseError} [${requestId}]`, SERVICE_NAME);
      return NextResponse.json(
        {
          status: 'error',
          message: 'Failed to parse backend response',
          showToast: true,
          toastType: 'error',
          toastTitle: 'Data Error',
          toastMessage: 'Failed to process the update response. Your changes may not have been saved.'
        },
        { status: 502 }
      );
    }

    if (!responseData) {
      logger.error(`Empty response from backend for UUID ${uuid} [${requestId}]`, SERVICE_NAME);
      return NextResponse.json(
        {
          status: 'error',
          message: 'Received empty response from backend',
          showToast: true,
          toastType: 'error',
          toastTitle: 'Data Error',
          toastMessage: 'The update service returned an empty response. Please verify your changes were saved.'
        },
        { status: 502 }
      );
    }

    logger.info(`Successfully updated data for UUID ${uuid} [${requestId}]`, SERVICE_NAME);

    return NextResponse.json(
      {
        status: 'success',
        message: 'Data updated successfully',
        data: payload,
        showToast: true,
        toastType: 'success',
        toastTitle: 'Update Successful',
        toastMessage: 'Your changes have been saved successfully'
      },
      {
        status: 200,
        headers: {
          'X-Request-ID': requestId
        }
      }
    );
  } catch (error) {
    logger.error(`Unhandled exception for UUID ${uuid}: ${error} [${requestId}]`, SERVICE_NAME);

    if (error instanceof Error && error.stack) {
      logger.error(`Stack trace: ${error.stack}`, SERVICE_NAME);
    }

    // Return error response
    return NextResponse.json(
      {
        status: 'error',
        message: error instanceof Error
          ? error.message
          : 'An error occurred while communicating with the backend API',
        showToast: true,
        toastType: 'error',
        toastTitle: 'Server Error',
        toastMessage: 'An unexpected error occurred. Please try again later.'
      },
      { status: 500 }
    );
  }
}

/**
 * Validate UUID format
 * @param uuid - The UUID to validate
 * @returns Boolean indicating if the UUID is valid
 */
function isValidUUID(uuid: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(uuid);
}