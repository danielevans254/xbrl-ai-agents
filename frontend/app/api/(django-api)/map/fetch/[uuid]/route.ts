import { normalizeAcraData } from '@/utils/normalize-api-response';
import { NextResponse } from 'next/server';
import { Logger, LogLevel } from '@/lib/logger';

const logger = Logger.getInstance({
  minLevel: LogLevel.DEBUG,
  includeContext: true,
  colorizeOutput: true
});

const SERVICE_NAME = 'mapping-fetch-api';

interface RouteParams {
  params: {
    uuid: string;
  };
}

/**
 * Handler for GET requests to fetch partial XBRL data
 * 
 * @param request - The request object
 * @param context - The context containing route parameters
 * @returns Next.js response object
 */
export async function GET(
  request: Request,
  { params }: RouteParams
) {
  const { uuid } = params;
  const requestId = crypto.randomUUID();

  logger.info(`Processing GET request for UUID: ${uuid} [${requestId}]`, SERVICE_NAME);

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

    // Get the backend API URL from environment variable or use default
    const backendApiUrl = process.env.BACKEND_API_URL || 'http://localhost:8000';
    const apiEndpoint = `${backendApiUrl}/api/v1/mapping/partial-xbrl/${uuid}/`;

    logger.info(`Fetching data from backend API: ${apiEndpoint} [${requestId}]`, SERVICE_NAME);

    // Forward the request to the backend API with timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout

    let backendResponse;
    try {
      backendResponse = await fetch(apiEndpoint, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'X-Request-ID': requestId
          // Add any required authentication headers here
          // 'Authorization': `Bearer ${process.env.API_TOKEN}`,
        },
        signal: controller.signal
        // Optional cache control for Next.js
        // next: { revalidate: 60 } // Revalidate every 60 seconds
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
            toastMessage: 'The request to fetch document data timed out. Please try again.'
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
          toastMessage: 'Could not connect to the data service. Please try again later.'
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
      let toastMessage = 'An error occurred while retrieving document data.';
      let clientStatus = backendResponse.status;

      switch (backendResponse.status) {
        case 404:
          toastMessage = 'The requested document could not be found.';
          break;
        case 401:
          toastMessage = 'Authentication required to access this document.';
          break;
        case 403:
          toastMessage = 'You do not have permission to access this document.';
          break;
        case 429:
          toastMessage = 'Too many requests. Please try again later.';
          break;
        case 500:
        case 502:
        case 503:
        case 504:
          toastMessage = 'The document service is currently unavailable. Please try again later.';
          clientStatus = 502; // Use a consistent status for server errors
          break;
      }

      // Return error to client
      return NextResponse.json(
        {
          status: 'error',
          message: errorMessage,
          showToast: true,
          toastType: 'error',
          toastTitle: 'Document Fetch Failed',
          toastMessage: toastMessage
        },
        { status: clientStatus }
      );
    }

    // Get the response data from the backend
    let responseData;
    try {
      responseData = await backendResponse.json();
    } catch (parseError) {
      logger.error(`Failed to parse backend response for UUID ${uuid}: ${parseError} [${requestId}]`, SERVICE_NAME);
      return NextResponse.json(
        {
          status: 'error',
          message: 'Failed to parse backend response',
          showToast: true,
          toastType: 'error',
          toastTitle: 'Data Error',
          toastMessage: 'Failed to process the document data. Please try again.'
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
          toastMessage: 'The document service returned an empty response. Please try again.'
        },
        { status: 502 }
      );
    }

    // FIXME:
    // Normalize the XBRL data before returning
    let normalizedData;
    try {
      normalizedData = normalizeAcraData(responseData);
    } catch (normalizeError) {
      logger.error(`Failed to normalize data for UUID ${uuid}: ${normalizeError} [${requestId}]`, SERVICE_NAME);
      return NextResponse.json(
        {
          status: 'error',
          message: normalizeError instanceof Error ? normalizeError.message : 'Failed to normalize XBRL data',
          showToast: true,
          toastType: 'error',
          toastTitle: 'Data Processing Error',
          toastMessage: 'Failed to process the document data format. Please contact support.'
        },
        { status: 500 }
      );
    }

    logger.info(`Successfully fetched and normalized data for UUID ${uuid} [${requestId}]`, SERVICE_NAME);

    // Return success response with normalized data
    return NextResponse.json(
      {
        status: 'success',
        message: 'Data fetched successfully',
        data: normalizedData,
        showToast: true,
        toastType: 'success',
        toastTitle: 'Document Retrieved',
        toastMessage: 'Financial data loaded successfully'
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