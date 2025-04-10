/**
 * API Route for updating mapped data
 * Acts as a proxy to the backend API to solve CORS issues
 *
 * Route: PUT /api/v1/mapping/update/:uuid/
 */

import { NextResponse } from 'next/server';

interface RouteParams {
  params: {
    uuid: string;
  };
}

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

    // Parse request body
    const payload = await request.json();

    console.log('Request payload:', payload);
    if (!payload || !payload.mapped_data) {
      return NextResponse.json(
        {
          status: 'error',
          message: 'Missing required field: mapped_data'
        },
        { status: 400 }
      );
    }

    // Get the backend API URL from environment variable or use default
    const backendApiUrl = process.env.BACKEND_API_URL || 'http://localhost:8000';
    const apiEndpoint = `${backendApiUrl}/api/v1/mapping/update/${uuid}/`;

    console.log(`Forwarding request to backend API: ${apiEndpoint}`);

    // Forward the request to the backend API
    const backendResponse = await fetch(apiEndpoint, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        // Add any required authentication headers here
        // 'Authorization': `Bearer ${process.env.API_TOKEN}`,
      },
      body: JSON.stringify(payload),
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

    console.log('Backend response status:', backendResponse.status);
    const responseData = await backendResponse.json();


    // Return success response with data from backend
    return NextResponse.json(
      {
        status: 'success',
        message: 'Data updated successfully',
        data: responseData.data || responseData
      },
      { status: 200 }
    );
  } catch (error) {
    console.error(`Error forwarding request for UUID ${uuid}:`, error);

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
