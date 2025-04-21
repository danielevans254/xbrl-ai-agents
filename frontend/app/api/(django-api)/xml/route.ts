import { NextRequest, NextResponse } from 'next/server';
import { Logger, LogLevel } from '@/lib/logger';
import { XmlTransformer, XmlTransformError, TransformOptions } from '@/lib/xml-transformer';
import { withErrorHandler, safeJsonParse, ServiceUnavailableError } from '@/middleware/errorHandler';
import convert from 'xml-js';

const logger = Logger.getInstance({
  minLevel: LogLevel.DEBUG,
  includeContext: true,
  colorizeOutput: true
});

const SERVICE_NAME = 'json-to-xml-api';

/**
 * Handles GET requests to convert tagged JSON data to XML
 * 
 * @param request The incoming NextRequest object
 * @returns XML response or error in appropriate format
 */
export async function GET(request: NextRequest) {
  const requestId = crypto.randomUUID();
  logger.info(`Processing GET request [${requestId}] to convert JSON to XML`, SERVICE_NAME);

  try {
    // Get documentId from query parameter
    const { searchParams } = new URL(request.url);
    const documentId = searchParams.get('documentId');
    const compact = searchParams.get('compact') === 'true';
    const spaces = Number(searchParams.get('spaces') || '2');

    if (!documentId) {
      logger.warn('No documentId provided in query parameters', SERVICE_NAME);
      return NextResponse.json(
        { message: 'Bad request', error: 'documentId is required as a query parameter' },
        { status: 400 }
      );
    }

    logger.debug(`Converting JSON to XML for documentId: ${documentId}`, SERVICE_NAME);
    logger.debug(`Using conversion options - compact: ${compact}, spaces: ${spaces}`, SERVICE_NAME);

    // Construct URL for the tagging result API
    const API_URL = new URL('/api/tag/result', request.url);
    API_URL.searchParams.set('documentId', documentId);

    logger.debug(`Fetching data from tagging result API: ${API_URL.toString()}`, SERVICE_NAME);

    // Fetch tagged data from the existing API
    let resultResponse;
    try {
      resultResponse = await fetch(API_URL, {
        method: 'GET',
        headers: {
          'X-Request-ID': requestId,
          'Content-Type': 'application/json',
        }
      });
      logger.debug(`Received response from tagging result API with status: ${resultResponse.status}`, SERVICE_NAME);
    } catch (fetchError) {
      logger.error(`Failed to connect to tagging result API: ${String(fetchError)}`, SERVICE_NAME);
      return NextResponse.json(
        { message: 'Failed to connect to tagging result API', error: String(fetchError) },
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

      logger.error(`Error from tagging result API: ${JSON.stringify(errorData)}`, SERVICE_NAME);
      return NextResponse.json(
        { message: 'Error from tagging result API', error: errorData },
        { status: resultResponse.status }
      );
    }

    // Get the response body as text first
    let responseBody;
    try {
      responseBody = await resultResponse.text();
      logger.debug(`Received text response from tagging API, length: ${responseBody.length} bytes`, SERVICE_NAME);
    } catch (textError) {
      logger.error(`Error reading response text: ${String(textError)}`, SERVICE_NAME);
      return NextResponse.json(
        { message: 'Error reading response from tagging API', error: String(textError) },
        { status: 500 }
      );
    }

    // Try to parse the JSON
    let jsonData;
    try {
      jsonData = JSON.parse(responseBody);
      logger.debug(`Successfully parsed JSON data from tagging API`, SERVICE_NAME);

      // Check if the API returned a success response
      if (!jsonData.success) {
        logger.error(`Tagging API returned error: ${jsonData.message || 'Unknown error'}`, SERVICE_NAME);
        return NextResponse.json(
          { message: 'Error from tagging API', error: jsonData.message || 'Unknown error' },
          { status: 400 }
        );
      }

      // Extract the actual data if it's wrapped in a response structure
      if (jsonData.data && typeof jsonData.data === 'object') {
        logger.debug(`Found data property in response, using it for conversion`, SERVICE_NAME);
        jsonData = jsonData.data;
      }
    } catch (parseError) {
      logger.error(`Error parsing JSON from tagging API: ${String(parseError)}`, SERVICE_NAME);

      // If parsing fails, try to return a meaningful error
      let errorMessage = `Failed to parse JSON: ${String(parseError)}`;
      let errorDetails = "Response could not be parsed as valid JSON";

      // Show a snippet of the response for debugging
      const previewLength = Math.min(200, responseBody.length);
      errorDetails += `\nResponse preview: ${responseBody.substring(0, previewLength)}${previewLength < responseBody.length ? '...' : ''}`;

      return NextResponse.json(
        { message: errorMessage, error: errorDetails },
        { status: 500 }
      );
    }

    // Convert JSON to XML using our specialized transformer
    let xmlResult;
    try {
      // Define transformation options
      const transformOptions: TransformOptions = {
        compact,
        spaces,
        fullTagEmptyElement: true,
        detectXbrl: true,
        indentAttributes: searchParams.get('indentAttributes') === 'true',
        includeDeclaration: searchParams.get('includeDeclaration') !== 'false'
      };

      // Add custom namespaces if provided
      const customNamespaces = searchParams.get('namespaces');
      if (customNamespaces) {
        try {
          transformOptions.customNamespaces = JSON.parse(customNamespaces);
        } catch (parseError) {
          logger.warn(`Invalid namespaces parameter: ${String(parseError)}`, SERVICE_NAME);
        }
      }

      // Use the specialized transformer
      xmlResult = XmlTransformer.toXml(jsonData, transformOptions);
      logger.debug(`Successfully converted JSON to XML`, SERVICE_NAME);
    } catch (conversionError) {
      logger.error(`Error converting JSON to XML: ${String(conversionError)}`, SERVICE_NAME);
      return NextResponse.json(
        { message: 'Error converting JSON to XML', error: String(conversionError) },
        { status: 500 }
      );
    }

    // Return the XML result
    return new NextResponse(xmlResult, {
      headers: {
        'Content-Type': 'application/xml',
        'X-Request-ID': requestId
      }
    });
  } catch (error) {
    logger.error(`Internal server error: ${String(error)}`, SERVICE_NAME);
    return NextResponse.json(
      { message: 'Internal server error', error: String(error) },
      { status: 500 }
    );
  }
}

/**
 * Utility functions for analyzing and describing the content of JSON data
 */
const JsonAnalyzer = {
  /**
   * Analyzes the JSON structure to determine its type and content
   * Useful for debugging and generating descriptive logs
   * 
   * @param data The JSON data to analyze
   * @returns Description of the data structure
   */
  describeStructure(data: any): string {
    if (data === null) return 'null';
    if (data === undefined) return 'undefined';

    if (Array.isArray(data)) {
      if (data.length === 0) return 'empty array';
      return `array with ${data.length} items, first item is ${this.describeStructure(data[0])}`;
    }

    if (typeof data === 'object') {
      const keys = Object.keys(data);
      if (keys.length === 0) return 'empty object';

      // Check for possible XBRL data structure
      if (keys.includes('tagged_data') || keys.includes('financial_position') ||
        keys.includes('filing_information') || keys.includes('data')) {
        return 'XBRL-like data structure';
      }

      // Return sample of keys to help with debugging
      const keySample = keys.slice(0, 3).join(', ') + (keys.length > 3 ? '...' : '');
      return `object with ${keys.length} properties: ${keySample}`;
    }

    return typeof data;
  },

  /**
   * Checks if the JSON data appears to be XBRL financial data
   * 
   * @param data The JSON data to check
   * @returns Boolean indicating if the data appears to be XBRL
   */
  isLikelyXbrlData(data: any): boolean {
    if (!data || typeof data !== 'object') return false;

    // Check data directly
    const directXbrlIndicators = [
      'tagged_data',
      'filing_information',
      'financial_position',
      'income_statement',
      'statement_of_financial_position',
      'xbrl_source'
    ];

    const keys = Object.keys(data);
    if (directXbrlIndicators.some(indicator => keys.includes(indicator))) {
      return true;
    }

    // Check if data is in a 'data' property
    if (data.data && typeof data.data === 'object') {
      const dataKeys = Object.keys(data.data);
      if (directXbrlIndicators.some(indicator => dataKeys.includes(indicator))) {
        return true;
      }
    }

    return false;
  }
};

/**
 * Handles POST requests to convert provided JSON data to XML
 * Allows clients to directly post JSON data for conversion
 */
export async function POST(request: NextRequest) {
  const requestId = crypto.randomUUID();
  logger.info(`Processing POST request [${requestId}] to convert JSON to XML`, SERVICE_NAME);

  try {
    // Get options from query parameters
    const { searchParams } = new URL(request.url);
    const compact = searchParams.get('compact') === 'true';
    const spaces = Number(searchParams.get('spaces') || '2');

    // Parse JSON body
    let jsonData;
    try {
      jsonData = await request.json();
    } catch (parseError) {
      logger.error(`Error parsing JSON body: ${String(parseError)}`, SERVICE_NAME);
      return NextResponse.json(
        { message: 'Invalid JSON format in request body', error: String(parseError) },
        { status: 400 }
      );
    }

    // Convert JSON to XML using our specialized transformer
    let xmlResult;
    try {
      // Define transformation options
      const transformOptions: TransformOptions = {
        compact,
        spaces,
        fullTagEmptyElement: true,
        detectXbrl: true,
        indentAttributes: searchParams.get('indentAttributes') === 'true',
        includeDeclaration: searchParams.get('includeDeclaration') !== 'false'
      };

      // Add custom namespaces if provided
      const customNamespaces = searchParams.get('namespaces');
      if (customNamespaces) {
        try {
          transformOptions.customNamespaces = JSON.parse(customNamespaces);
        } catch (parseError) {
          logger.warn(`Invalid namespaces parameter: ${String(parseError)}`, SERVICE_NAME);
        }
      }

      // Use the specialized transformer
      xmlResult = XmlTransformer.toXml(jsonData, transformOptions);
      logger.debug(`Successfully converted JSON to XML`, SERVICE_NAME);
    } catch (conversionError) {
      logger.error(`Error converting JSON to XML: ${String(conversionError)}`, SERVICE_NAME);
      return NextResponse.json(
        { message: 'Error converting JSON to XML', error: String(conversionError) },
        { status: 500 }
      );
    }

    return new NextResponse(xmlResult, {
      headers: {
        'Content-Type': 'application/xml',
        'X-Request-ID': requestId
      }
    });
  } catch (error) {
    logger.error(`Internal server error: ${String(error)}`, SERVICE_NAME);
    return NextResponse.json(
      { message: 'Internal server error', error: String(error) },
      { status: 500 }
    );
  }
}