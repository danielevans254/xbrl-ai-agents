import { normalizeAcraData } from '@/utils/normalize-api-response';
import { NextResponse } from 'next/server';

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

  try {
    // Validate UUID
    if (!uuid || !isValidUUID(uuid)) {
      return NextResponse.json(
        {
          status: 'error',
          message: 'Invalid UUID format'
        },
        { status: 400 }
      );
    }

    // Get the backend API URL from environment variable or use default
    const backendApiUrl = process.env.BACKEND_API_URL || 'http://localhost:8000';
    const apiEndpoint = `${backendApiUrl}/api/v1/mapping/partial-xbrl/${uuid}/`;

    console.log(`Fetching data from backend API: ${apiEndpoint}`);

    // Forward the request to the backend API
    const backendResponse = await fetch(apiEndpoint, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        // Add any required authentication headers here
        // 'Authorization': `Bearer ${process.env.API_TOKEN}`,
      },
      // Optional cache control for Next.js
      next: { revalidate: 60 } // Revalidate every 60 seconds
    });

    // Check if the backend request was successful
    if (!backendResponse.ok) {
      // Try to get error details from response
      let errorMessage;
      try {
        const errorData = await backendResponse.json();
        errorMessage = errorData.message || errorData.error || `Backend API error: ${backendResponse.status}`;
      } catch (parseError) {
        // If we can't parse JSON, use text or status
        const errorText = await backendResponse.text();
        errorMessage = errorText || `Backend API error: ${backendResponse.status} ${backendResponse.statusText}`;
      }

      console.error(`Backend API error for UUID ${uuid}:`, errorMessage);

      // Return error to client
      return NextResponse.json(
        {
          status: 'error',
          message: errorMessage
        },
        { status: backendResponse.status }
      );
    }

    // Get the response data from the backend
    const responseData = await backendResponse.json();

    // FIXME:
    // Normalize the XBRL data before returning
    const normalizedData = normalizeAcraData(responseData);

    // Return success response with normalized data
    return NextResponse.json(
      {
        status: 'success',
        message: 'Data fetched successfully',
        data: normalizedData
      },
      { status: 200 }
    );
  } catch (error) {
    console.error(`Error fetching data for UUID ${uuid}:`, error);

    // Return error response
    return NextResponse.json(
      {
        status: 'error',
        message: error instanceof Error
          ? error.message
          : 'An error occurred while communicating with the backend API'
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