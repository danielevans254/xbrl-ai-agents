import { NextRequest, NextResponse } from 'next/server';
import { Logger, LogLevel } from '@/lib/logger';
import { normalizeAcraData } from '@/utils/normalize-api-response';

const logger = Logger.getInstance({
  minLevel: LogLevel.DEBUG,
  includeContext: true,
  colorizeOutput: true
});

const SERVICE_NAME = 'mapping-api';
const BASE_URL = process.env.BACKEND_API_URL || 'http://127.0.0.1:8000/api/v1';
const MAPPING_API_URL = `${BASE_URL}/mapping/map/`;
const MAPPING_STATUS_URL = `${BASE_URL}/mapping/status/`;
const XBRL_PARTIAL_URL = `${BASE_URL}/mapping/partial-xbrl/`;

function validateThreadId(threadId: string | null): threadId is string {
  return Boolean(threadId && threadId.trim().length > 0);
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
    toastTitle: 'Error Occurred',
    toastMessage: typeof error === 'string' ? error : message,
  }, { status });
}

async function pollMappingStatus(taskId: string, requestId: string, maxAttempts = 3000): Promise<any> {
  let attempts = 0;
  const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

  while (attempts < maxAttempts) {
    try {
      logger.debug(`Polling attempt ${attempts + 1} for task ${taskId}`, SERVICE_NAME);

      const statusResponse = await fetch(`${MAPPING_STATUS_URL}${taskId}/`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'X-Request-ID': requestId,
        },
      });

      if (!statusResponse.ok) {
        const errorText = await statusResponse.text();
        logger.error(`Status check failed: ${statusResponse.status} - ${errorText}`, SERVICE_NAME);

        // If we get a 404 or 410, the task may have been removed or expired
        if (statusResponse.status === 404 || statusResponse.status === 410) {
          return {
            success: false,
            message: 'Mapping task not found',
            error: `Task ID ${taskId} no longer exists or has expired`,
            showToast: true,
            toastType: 'error',
            toastTitle: 'Mapping Error',
            toastMessage: 'The mapping task could not be found. Please try again.'
          };
        }

        // If we get a 5xx, the server is having issues
        if (statusResponse.status >= 500) {
          if (attempts >= maxAttempts - 1) {
            return {
              success: false,
              message: 'Backend server error',
              error: `Status: ${statusResponse.status} - ${errorText}`,
              showToast: true,
              toastType: 'error',
              toastTitle: 'Server Error',
              toastMessage: 'The mapping service is currently unavailable. Please try again later.'
            };
          }

          const backoffTime = Math.min(5000 * Math.pow(1.5, attempts), 60000);
          await delay(backoffTime);
          attempts++;
          continue;
        }

        const backoffTime = Math.min(5000 * Math.pow(1.5, attempts), 60000);
        await delay(backoffTime);
        attempts++;
        continue;
      }

      let statusData;
      try {
        statusData = await statusResponse.json();
      } catch (parseError) {
        logger.error(`Failed to parse status response: ${parseError}`, SERVICE_NAME);

        if (attempts >= maxAttempts - 1) {
          return {
            success: false,
            message: 'Failed to parse status response',
            error: String(parseError),
            showToast: true,
            toastType: 'error',
            toastTitle: 'Data Error',
            toastMessage: 'Invalid response received from the mapping service.'
          };
        }

        const backoffTime = Math.min(5000 * Math.pow(1.5, attempts), 60000);
        await delay(backoffTime);
        attempts++;
        continue;
      }

      if (!statusData?.success) {
        logger.error(`Error response from status API: ${JSON.stringify(statusData)}`, SERVICE_NAME);

        // Check if the API returned a specific error message
        const errorMessage = statusData?.message || statusData?.error || 'Unknown error from mapping service';

        if (attempts >= maxAttempts - 1) {
          return {
            success: false,
            message: 'Mapping service reported an error',
            error: errorMessage,
            showToast: true,
            toastType: 'error',
            toastTitle: 'Mapping Error',
            toastMessage: errorMessage
          };
        }

        const backoffTime = Math.min(5000 * Math.pow(1.5, attempts), 60000);
        await delay(backoffTime);
        attempts++;
        continue;
      }

      if (!statusData.data || !statusData.data.status || typeof statusData.data.status !== 'string') {
        logger.error(`Invalid status response structure: ${JSON.stringify(statusData)}`, SERVICE_NAME);

        if (attempts >= maxAttempts - 1) {
          return {
            success: false,
            message: 'Invalid status data structure',
            error: 'The mapping service returned an invalid response format',
            showToast: true,
            toastType: 'error',
            toastTitle: 'Data Error',
            toastMessage: 'The mapping service returned invalid data. Please contact support.'
          };
        }

        const backoffTime = Math.min(5000 * Math.pow(1.5, attempts), 60000);
        await delay(backoffTime);
        attempts++;
        continue;
      }

      switch (statusData.data.status) {
        case 'completed': {
          if (!statusData.data.filing_id) {
            logger.error('Missing filing ID in completed status', SERVICE_NAME);

            if (attempts >= maxAttempts - 1) {
              return {
                success: false,
                message: 'Missing filing ID in completed status',
                error: 'The mapping process completed but failed to provide a document ID',
                showToast: true,
                toastType: 'error',
                toastTitle: 'Data Error',
                toastMessage: 'The mapping completed but failed to generate a document ID. Please try again.'
              };
            }

            const backoffTime = Math.min(5000 * Math.pow(1.5, attempts), 60000);
            await delay(backoffTime);
            attempts++;
            continue;
          }

          try {
            logger.info(`Mapping completed successfully, fetching XBRL data for filing ID: ${statusData.data.filing_id}`, SERVICE_NAME);

            const xbrlResponse = await fetch(`${XBRL_PARTIAL_URL}${statusData.data.filing_id}/`, {
              headers: {
                'Content-Type': 'application/json',
                'X-Request-ID': requestId,
              },
            });

            if (!xbrlResponse.ok) {
              const errorText = await xbrlResponse.text();
              logger.error(`XBRL fetch failed: ${xbrlResponse.status} - ${errorText}`, SERVICE_NAME);

              if (attempts >= maxAttempts - 1) {
                return {
                  success: false,
                  message: 'Failed to fetch XBRL data',
                  error: `Status: ${xbrlResponse.status} - ${errorText}`,
                  showToast: true,
                  toastType: 'error',
                  toastTitle: 'Data Retrieval Error',
                  toastMessage: 'The mapping completed but we could not retrieve the formatted data. Please try again.'
                };
              }

              const backoffTime = Math.min(5000 * Math.pow(1.5, attempts), 60000);
              await delay(backoffTime);
              attempts++;
              continue;
            }

            let xbrlData;
            try {
              xbrlData = await xbrlResponse.json();
            } catch (jsonError) {
              logger.error(`Failed to parse XBRL response: ${jsonError}`, SERVICE_NAME);

              if (attempts >= maxAttempts - 1) {
                return {
                  success: false,
                  message: 'Failed to parse XBRL data',
                  error: String(jsonError),
                  showToast: true,
                  toastType: 'error',
                  toastTitle: 'Data Error',
                  toastMessage: 'Could not parse the financial data format. Please try again.'
                };
              }

              const backoffTime = Math.min(5000 * Math.pow(1.5, attempts), 60000);
              await delay(backoffTime);
              attempts++;
              continue;
            }

            // FIXME:
            let normalizedData;
            try {
              normalizedData = normalizeAcraData(xbrlData);
            } catch (normalizeError) {
              logger.error(`Failed to normalize XBRL data: ${normalizeError}`, SERVICE_NAME);

              return {
                success: false,
                message: 'Failed to normalize financial data',
                error: String(normalizeError),
                showToast: true,
                toastType: 'error',
                toastTitle: 'Data Processing Error',
                toastMessage: 'Failed to process the financial data format. Please contact support.'
              };
            }

            // Add document_id to response data
            const documentId = statusData.data.filing_id;

            logger.info(`Successfully retrieved and normalized XBRL data for document ID: ${documentId}`, SERVICE_NAME);

            return {
              success: true,
              data: {
                ...normalizedData,
                id: documentId
              }
            };
          } catch (xbrlError) {
            logger.error(`Failed to fetch or parse XBRL response: ${xbrlError}`, SERVICE_NAME);

            if (attempts >= maxAttempts - 1) {
              return {
                success: false,
                message: 'Failed to retrieve financial data',
                error: String(xbrlError),
                showToast: true,
                toastType: 'error',
                toastTitle: 'Data Retrieval Error',
                toastMessage: 'Failed to retrieve the financial data. Please try again later.'
              };
            }

            const backoffTime = Math.min(5000 * Math.pow(1.5, attempts), 60000);
            await delay(backoffTime);
            attempts++;
            continue;
          }
        }

        case 'processing':
          logger.debug(`Mapping still processing, attempt ${attempts + 1}`, SERVICE_NAME);
          const waitTime = Math.min(2000 + (attempts * 500), 10000);
          await delay(waitTime);
          attempts++;
          break;

        case 'failed':
          logger.error(`Mapping processing failed: ${statusData.data.error || 'Unknown error'}`, SERVICE_NAME);
          return {
            success: false,
            message: 'Financial data mapping failed',
            error: statusData.data.error || 'Unknown error',
            showToast: true,
            toastType: 'error',
            toastTitle: 'Mapping Process Failed',
            toastMessage: statusData.data.error || 'Financial data mapping failed due to an error in the mapping process.'
          };

        default:
          logger.error(`Unexpected status: ${statusData.data.status}`, SERVICE_NAME);

          if (attempts >= maxAttempts - 1) {
            return {
              success: false,
              message: 'Unexpected mapping status',
              error: `Unexpected status: ${statusData.data.status}`,
              showToast: true,
              toastType: 'error',
              toastTitle: 'Mapping Error',
              toastMessage: 'The mapping process returned an unexpected status. Please try again.'
            };
          }

          await delay(5000);
          attempts++;
          break;
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      logger.error(`Polling attempt ${attempts + 1} failed: ${errorMessage}`, SERVICE_NAME);

      if (attempts >= maxAttempts - 1) {
        return {
          success: false,
          message: 'Maximum polling attempts exceeded',
          error: errorMessage,
          showToast: true,
          toastType: 'error',
          toastTitle: 'Polling Error',
          toastMessage: `Failed after ${maxAttempts} attempts: ${errorMessage}`
        };
      }

      const backoffTime = Math.min(5000 * Math.pow(1.5, attempts), 60000);
      await delay(backoffTime);
      attempts++;
    }
  }

  return {
    success: false,
    message: 'Maximum polling attempts exceeded',
    error: 'Timed out waiting for mapping process to complete',
    showToast: true,
    toastType: 'error',
    toastTitle: 'Timeout Error',
    toastMessage: 'Timed out waiting for mapping process to complete. The service may be experiencing high load.'
  };
}

export async function GET(request: NextRequest) {
  const requestId = crypto.randomUUID();
  logger.info(`Processing GET request [${requestId}]`, SERVICE_NAME);

  try {
    const searchParams = request.nextUrl.searchParams;
    const threadId = searchParams.get('threadId');

    if (!validateThreadId(threadId)) {
      return createErrorResponse(
        'Bad request',
        'threadId is required and cannot be empty',
        400
      );
    }

    logger.debug(`Processing request for threadId: ${threadId}`, SERVICE_NAME);

    const origin = request.headers.get('origin') || 'http://localhost:3000';
    const extractUrl = `${origin}/api/extract?threadId=${threadId}`;

    logger.debug(`Fetching data from extract service: ${extractUrl}`, SERVICE_NAME);

    let extractResponse;
    try {
      extractResponse = await fetch(extractUrl, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'X-Request-ID': requestId,
        },
      });
    } catch (fetchError) {
      return createErrorResponse(
        'Failed to connect to extract service',
        `Error connecting to extract service: ${String(fetchError)}`,
        502
      );
    }

    if (!extractResponse.ok) {
      let errorText;
      try {
        errorText = await extractResponse.text();
      } catch (readError) {
        errorText = 'Could not read error response';
      }

      return createErrorResponse(
        'Failed to fetch extract data',
        `Status: ${extractResponse.status} - ${errorText}`,
        extractResponse.status
      );
    }

    let extractData;
    try {
      extractData = await extractResponse.json();
    } catch (parseError) {
      return createErrorResponse(
        'Failed to parse extract service response',
        `Error parsing response: ${String(parseError)}`,
        502
      );
    }

    if (!extractData || !extractData.success) {
      return createErrorResponse(
        'Invalid response from extract service',
        extractData?.message || 'Extract service reported failure',
        502
      );
    }

    if (!Array.isArray(extractData.data) || extractData.data.length === 0) {
      return createErrorResponse(
        'Invalid response from extract service',
        'Missing or empty data array',
        502
      );
    }

    const firstDataItem = extractData.data[0];
    if (!firstDataItem || !firstDataItem.data) {
      return createErrorResponse(
        'Invalid response from extract service',
        'Missing required data field in the first data item',
        502
      );
    }

    const payload = {
      data: firstDataItem.data,
    };

    logger.debug(`Submitting mapping request with data`, SERVICE_NAME);

    let mappingResponse;
    try {
      mappingResponse = await fetch(MAPPING_API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Request-ID': requestId,
        },
        body: JSON.stringify(payload)
      });
    } catch (fetchError) {
      return createErrorResponse(
        'Failed to connect to mapping service',
        `Error connecting to mapping service: ${String(fetchError)}`,
        502
      );
    }

    if (!mappingResponse.ok) {
      let errorText;
      try {
        errorText = await mappingResponse.text();
      } catch (readError) {
        errorText = 'Could not read error response';
      }

      return createErrorResponse(
        'Failed to submit mapping request',
        `Status: ${mappingResponse.status} - ${errorText}`,
        mappingResponse.status
      );
    }

    let mappingData;
    try {
      mappingData = await mappingResponse.json();
    } catch (parseError) {
      return createErrorResponse(
        'Failed to parse mapping service response',
        `Error parsing response: ${String(parseError)}`,
        502
      );
    }

    if (!mappingData.success) {
      return createErrorResponse(
        'Mapping service reported failure',
        mappingData.message || mappingData.error || 'Unknown error from mapping service',
        502
      );
    }

    if (!mappingData.data || !mappingData.data.task_id) {
      return createErrorResponse(
        'Invalid mapping service response',
        'Missing task ID in mapping service response',
        502
      );
    }

    logger.info(`Mapping initiated successfully, task ID: ${mappingData.data.task_id}`, SERVICE_NAME);
    logger.debug(`Beginning polling for mapping task: ${mappingData.data.task_id}`, SERVICE_NAME);

    const finalData = await pollMappingStatus(mappingData.data.task_id, requestId);

    if (!finalData.success) {
      if (finalData.showToast) {
        return NextResponse.json(finalData, {
          status: 500,
          headers: {
            'X-Request-ID': requestId
          }
        });
      }

      return createErrorResponse(
        finalData.message,
        finalData.error,
        500
      );
    }

    logger.info(`Successfully processed mapping request for threadId: ${threadId}`, SERVICE_NAME);

    return NextResponse.json({
      ...finalData,
      showToast: true,
      toastType: 'success',
      toastTitle: 'Success',
      toastMessage: 'Financial data mapping completed successfully'
    }, {
      status: 200,
      headers: {
        'X-Request-ID': requestId
      }
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.error(`Unhandled exception in map API: ${errorMessage}`, SERVICE_NAME);

    if (error instanceof Error && error.stack) {
      logger.error(`Stack trace: ${error.stack}`, SERVICE_NAME);
    }

    return createErrorResponse(
      'Internal server error',
      errorMessage,
      500
    );
  }
}