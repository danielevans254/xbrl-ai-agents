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
 * Cleans the API response data by removing unnecessary properties
 * @param data The raw data object from the tagging service
 * @returns A cleaned data object
 */
function cleanResponseData(data: any) {
  if (!data || !data.data) return data;

  // Create a new response object without modifying the original
  const cleanedData = {
    success: data.success,
    message: data.message,
    data: {} // We'll populate this with cleaned data
  };

  // Process each section of the data property
  const processedData = {};

  // Skip the fields we don't want in our response
  const fieldsToSkip = ['xbrl_source', 'created_at', 'updated_at', 'notes'];

  for (const [sectionKey, sectionValue] of Object.entries(data.data)) {
    // Skip unwanted fields
    if (fieldsToSkip.includes(sectionKey)) continue;

    if (!sectionValue || typeof sectionValue !== 'object') {
      processedData[sectionKey] = sectionValue;
      continue;
    }

    // Process the section recursively
    processedData[sectionKey] = processSection(sectionValue);
  }

  cleanedData.data = processedData;
  return cleanedData;
}

/**
 * Recursively processes a section of the data to clean it
 * @param section A section of data to process
 * @returns The cleaned section
 */
function processSection(section: any) {
  if (!section || typeof section !== 'object') return section;

  // If it's an array, process each item
  if (Array.isArray(section)) {
    return section.map(item => processSection(item));
  }

  const cleanedSection = {};

  for (const [key, value] of Object.entries(section)) {
    // Skip document, mapped_*, and meta_tags properties
    if (key === 'document' || key.startsWith('mapped_') || key === 'meta_tags') {
      continue;
    }

    if (value && typeof value === 'object' && !Array.isArray(value)) {
      if ('value' in value || 'tags' in value) {
        // If it's a data item with value and tags, only keep those
        const cleanedValue: any = {};

        if ('value' in value) {
          cleanedValue.value = value.value;
        }

        if ('tags' in value && Array.isArray(value.tags)) {
          cleanedValue.tags = value.tags;
        }

        cleanedSection[key] = cleanedValue;
      } else {
        // Recursively process nested objects
        cleanedSection[key] = processSection(value);
      }
    } else {
      // Directly copy primitive values or arrays
      cleanedSection[key] = value;
    }
  }

  return cleanedSection;
}

/**
 * Handles GET requests to fetch the result of a tagging task
 * Acts as a proxy to avoid CORS issues
 * Uses documentId as a query parameter instead of path parameter
 */
export async function GET(request: NextRequest) {
  const requestId = crypto.randomUUID();
  logger.info(`Processing GET request [${requestId}] to fetch tagging result`, SERVICE_NAME);

  try {
    // Get documentId from query parameter
    const { searchParams } = new URL(request.url);
    const documentId = searchParams.get('documentId');

    if (!documentId) {
      logger.warn('No documentId provided in query parameters', SERVICE_NAME);
      return NextResponse.json(
        { message: 'Bad request', error: 'documentId is required as a query parameter' },
        { status: 400 }
      );
    }

    logger.debug(`Fetching result for documentId: ${documentId}`, SERVICE_NAME);

    const RESULT_API_URL = `${BASE_API_URL}/api/v1/tagging/get/${documentId}/`;

    logger.debug(`Sending request to tagging result service: ${RESULT_API_URL}`, SERVICE_NAME);

    let resultResponse;
    try {
      resultResponse = await fetch(RESULT_API_URL, {
        method: 'GET',
        headers: {
          'X-Request-ID': requestId,
          'Content-Type': 'application/json',
        }
      });
      logger.debug(`Received response from tagging result service with status: ${resultResponse.status}`, SERVICE_NAME);
    } catch (fetchError) {
      logger.error(`Failed to connect to tagging result service: ${String(fetchError)}`, SERVICE_NAME);
      return NextResponse.json(
        { message: 'Failed to connect to tagging result service', error: String(fetchError) },
        { status: 503 }
      );
    }

    if (!resultResponse.ok) {
      let errorData;
      try {
        errorData = await resultResponse.json();
      } catch (e) {
        errorData = await resultResponse.text();
      }

      logger.error(`Error from tagging result service: ${JSON.stringify(errorData)}`, SERVICE_NAME);
      return NextResponse.json(
        { message: 'Error from tagging result service', error: errorData },
        { status: resultResponse.status }
      );
    }

    const resultData = await resultResponse.json();
    logger.debug(`Received tagging result response`, SERVICE_NAME);

    // Clean the response data
    const cleanedData = cleanResponseData(resultData);
    logger.debug(`Cleaned response data for client`, SERVICE_NAME);

    // Forward the cleaned response to the client
    return NextResponse.json(cleanedData);
  } catch (error) {
    logger.error(`Internal server error: ${String(error)}`, SERVICE_NAME);
    return NextResponse.json(
      { message: 'Internal server error', error: String(error) },
      { status: 500 }
    );
  }
}