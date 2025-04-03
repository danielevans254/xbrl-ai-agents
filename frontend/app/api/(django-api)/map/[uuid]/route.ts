import { NextRequest, NextResponse } from 'next/server';
import { Logger, LogLevel } from '@/lib/logger';

const logger = Logger.getInstance({
  minLevel: LogLevel.DEBUG,
  includeContext: true,
  colorizeOutput: true
});

const SERVICE_NAME = 'mapping-api';
const BASE_URL = 'http://127.0.0.1:8000/api/v1';

function createErrorResponse(
  message: string,
  error: string | object,
  status: number
): NextResponse {
  logger.error(`${message}: ${JSON.stringify(error)}`, SERVICE_NAME);
  return NextResponse.json({
    success: false,
    message,
    error
  }, { status });
}

// Handler for the route /api/map/[uuid]
export async function PUT(
  request: NextRequest,
  { params }: { params: { uuid: string } }
) {
  const requestId = crypto.randomUUID();
  const uuid = params.uuid;

  logger.info(`Processing PUT request [${requestId}] for UUID: ${uuid}`, SERVICE_NAME);

  try {
    if (!uuid || uuid.trim().length === 0) {
      return createErrorResponse(
        'Bad request',
        'UUID is required and cannot be empty',
        400
      );
    }

    let payload;
    try {
      payload = await request.json();
    } catch (parseError) {
      return createErrorResponse(
        'Failed to parse request body',
        String(parseError),
        400
      );
    }

    if (!payload) {
      return createErrorResponse(
        'Bad request',
        'Request body is required',
        400
      );
    }

    const updateUrl = `${BASE_URL}/mapping/update/${uuid}/`;

    logger.debug(`Sending update request to: ${updateUrl}`, SERVICE_NAME);

    const formattedPayload = {
      mapped_data: payload
    };

    logger.debug(`Request payload: ${JSON.stringify(formattedPayload)}`, SERVICE_NAME);

    const updateResponse = await fetch(updateUrl, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'X-Request-ID': requestId,
      },
      body: JSON.stringify(formattedPayload)
    });

    if (!updateResponse.ok) {
      const errorText = await updateResponse.text();
      return createErrorResponse(
        'Failed to update mapping data',
        `Status: ${updateResponse.status} - ${errorText}`,
        updateResponse.status
      );
    }

    let updatedData;
    try {
      updatedData = await updateResponse.json();
    } catch (parseError) {
      return createErrorResponse(
        'Failed to parse update response',
        String(parseError),
        502
      );
    }

    logger.info(`Successfully updated mapping data for UUID: ${uuid}`, SERVICE_NAME);

    return NextResponse.json(updatedData, {
      status: 200,
      headers: {
        'X-Request-ID': requestId
      }
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    return createErrorResponse(
      'Internal server error',
      errorMessage,
      500
    );
  }
}