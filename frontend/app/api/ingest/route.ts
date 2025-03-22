import { indexConfig, retrievalAssistantStreamConfig } from '@/constants/graphConfigs';
import { createServerClient, langGraphServerClient } from '@/lib/langgraph-server';
import { processPDF } from '@/lib/pdf';
import { Document } from '@langchain/core/documents';
import { NextRequest, NextResponse } from 'next/server';
import { PartialXBRLSchema } from '../../../../backend/src/retrieval_graph/schema';
import { z } from 'zod';
import { logger } from '@/lib/logger';

// Configuration constants
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const MAX_FILES = 1;
const ALLOWED_FILE_TYPES = ['application/pdf'];
const REQUIRED_ENV_VARS = [
  'LANGGRAPH_INGESTION_ASSISTANT_ID',
  'LANGGRAPH_RETRIEVAL_ASSISTANT_ID'
];

interface IngestionRunResult {
  output?: {
    financialStatement?: z.infer<typeof PartialXBRLSchema>;
  };
  state?: Record<string, any>;
}

/**
 * Validates environment variables required for the API
 * @returns Error message if validation fails, null otherwise
 */
function validateEnvironment(): string | null {
  const missingVars = REQUIRED_ENV_VARS.filter(varName => !process.env[varName]);
  if (missingVars.length > 0) {
    return `Missing required environment variables: ${missingVars.join(', ')}`;
  }
  return null;
}

/**
 * Validates file against size and type constraints
 * @param file The file to validate
 * @returns Validation result object with status and error message if applicable
 */
function validateFile(file: File): { valid: boolean; error?: string } {
  if (!file) {
    return { valid: false, error: 'File is undefined or null' };
  }

  if (!ALLOWED_FILE_TYPES.includes(file.type)) {
    return { valid: false, error: `Invalid file type: ${file.type}. Only PDF files are allowed.` };
  }

  if (file.size > MAX_FILE_SIZE) {
    return {
      valid: false,
      error: `File size (${(file.size / (1024 * 1024)).toFixed(2)}MB) exceeds maximum allowed (${MAX_FILE_SIZE / (1024 * 1024)}MB).`
    };
  }

  return { valid: true };
}

/**
 * Extracts files from form data with validation
 * @param formData The request form data
 * @returns Object containing files array and any validation errors
 */
async function extractFiles(formData: FormData): Promise<{ files: File[], error?: string }> {
  const files: File[] = [];

  // Extract files from form data
  for (const [key, value] of formData.entries()) {
    if (key === 'files' && value instanceof File) {
      files.push(value);
    }
  }

  // Validate file count
  if (files.length === 0) {
    return { files: [], error: 'No files provided' };
  }

  if (files.length > MAX_FILES) {
    return { files: [], error: `Too many files. Maximum ${MAX_FILES} file(s) allowed.` };
  }

  return { files };
}

export async function POST(request: NextRequest) {
  const requestId = `req_${Date.now()}_${Math.random().toString(36).substring(2, 10)}`;
  logger.info(`[${requestId}] Starting file ingestion process`);

  try {
    // Environment validation
    const envError = validateEnvironment();
    if (envError) {
      logger.error(`[${requestId}] Environment validation failed: ${envError}`);
      return NextResponse.json({ error: envError }, { status: 500 });
    }

    // Request validation
    if (!request) {
      logger.error(`[${requestId}] Invalid request object`);
      return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
    }

    // Check content-type header
    const contentType = request.headers.get('content-type');
    if (!contentType || !contentType.includes('multipart/form-data')) {
      logger.error(`[${requestId}] Invalid content type: ${contentType}`);
      return NextResponse.json(
        { error: 'Request must be multipart/form-data' },
        { status: 400 }
      );
    }

    // Parse form data with error handling
    let formData: FormData;
    try {
      formData = await request.formData();
    } catch (error: any) {
      logger.error(`[${requestId}] Failed to parse form data: ${error.message}`);
      return NextResponse.json(
        { error: 'Invalid form data', details: error.message },
        { status: 400 }
      );
    }

    // Extract and validate files
    logger.info(`[${requestId}] Extracting files from request`);
    const { files, error: extractionError } = await extractFiles(formData);
    if (extractionError) {
      logger.warn(`[${requestId}] File extraction failed: ${extractionError}`);
      return NextResponse.json({ error: extractionError }, { status: 400 });
    }

    // Validate individual files
    logger.info(`[${requestId}] Validating ${files.length} file(s)`);
    const invalidFiles: { name: string; error: string }[] = [];
    const validFiles: File[] = [];

    for (const file of files) {
      const validation = validateFile(file);
      if (!validation.valid) {
        invalidFiles.push({ name: file.name, error: validation.error || 'Unknown validation error' });
      } else {
        validFiles.push(file);
      }
    }

    if (invalidFiles.length > 0) {
      logger.warn(`[${requestId}] Found ${invalidFiles.length} invalid file(s): ${JSON.stringify(invalidFiles)}`);
      return NextResponse.json(
        {
          error: 'Some files failed validation',
          invalidFiles
        },
        { status: 400 }
      );
    }

    logger.info(`[${requestId}] Processing ${validFiles.length} valid file(s)`);
    const allDocs: Document[] = [];
    const failedFiles: { name: string; error: string }[] = [];

    for (const file of validFiles) {
      try {
        logger.info(`[${requestId}] Processing file: ${file.name} (${file.size} bytes)`);
        const docs = await processPDF(file);

        if (!docs || docs.length === 0) {
          logger.warn(`[${requestId}] No documents extracted from file: ${file.name}`);
          failedFiles.push({ name: file.name, error: 'No documents extracted' });
          continue;
        }

        logger.info(`[${requestId}] Successfully extracted ${docs.length} documents from ${file.name}`);
        allDocs.push(...docs);
      } catch (error: any) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        logger.error(`[${requestId}] Error processing file ${file.name}: ${errorMessage}`);
        failedFiles.push({ name: file.name, error: errorMessage });
      }
    }

    if (!allDocs.length) {
      logger.error(`[${requestId}] No valid documents extracted from any files`);
      return NextResponse.json(
        {
          error: 'No valid documents extracted from uploaded files',
          failedFiles: failedFiles.length > 0 ? failedFiles : undefined
        },
        { status: 422 }
      );
    }

    // Create ingestion thread with timeout handling
    logger.info(`[${requestId}] Creating a new thread for ingestion`);
    let thread;
    try {
      thread = await Promise.race([
        langGraphServerClient.createThread(),
        new Promise<never>((_, reject) => {
          setTimeout(() => reject(new Error('Thread creation timed out after 10 seconds')), 10000);
        })
      ]);
    } catch (error: any) {
      logger.error(`[${requestId}] Failed to create thread: ${error.message}`);
      return NextResponse.json(
        { error: 'Failed to create ingestion thread', details: error.message },
        { status: 500 }
      );
    }

    if (!thread || !thread.thread_id) {
      logger.error(`[${requestId}] Invalid thread response`);
      return NextResponse.json(
        { error: 'Failed to create valid ingestion thread' },
        { status: 500 }
      );
    }

    logger.info(`[${requestId}] Thread created successfully with ID: ${thread.thread_id}`);

    // Run ingestion with timeout and retry logic
    logger.info(`[${requestId}] Starting ingestion run on thread ${thread.thread_id}`);
    let ingestionRun: IngestionRunResult;
    let retryCount = 0;
    const maxRetries = 2;

    while (true) {
      try {
        ingestionRun = await Promise.race([
          langGraphServerClient.client.runs.wait(
            thread.thread_id,
            'ingestion_graph',
            {
              input: { docs: allDocs },
              config: {
                configurable: {
                  ...indexConfig,
                  queryModel: 'openai/gpt-4o',
                },
              },
            },
          ) as unknown as IngestionRunResult,
          new Promise<never>((_, reject) => {
            setTimeout(() => reject(new Error('Ingestion run timed out after 60 seconds')), 60000);
          })
        ]);

        break; // Success, exit retry loop
      } catch (error: any) {
        retryCount++;
        logger.warn(`[${requestId}] Ingestion attempt ${retryCount} failed: ${error.message}`);

        if (retryCount >= maxRetries) {
          logger.error(`[${requestId}] All ingestion attempts failed after ${maxRetries} retries`);
          return NextResponse.json(
            {
              error: 'Ingestion process failed after multiple attempts',
              threadId: thread.thread_id, // Return thread ID for potential debugging
              details: error.message
            },
            { status: 500 }
          );
        }

        // Exponential backoff
        const backoffMs = 1000 * Math.pow(2, retryCount);
        logger.info(`[${requestId}] Retrying ingestion in ${backoffMs}ms...`);
        await new Promise(resolve => setTimeout(resolve, backoffMs));
      }
    }

    // Extract structured data from ingestion result
    const structuredData = ingestionRun?.state?.financialStatement ??
      ingestionRun?.output?.financialStatement;

    logger.info(`[${requestId}] Ingestion completed successfully for thread ${thread.thread_id}`);

    // Prepare response with detailed information
    const response = {
      message: 'Documents ingested successfully',
      threadId: thread.thread_id,
      documentsProcessed: allDocs.length,
      ...(structuredData && { structuredData }),
      ...(failedFiles.length > 0 && {
        warning: 'Some files were processed with warnings',
        failedFiles
      })
    };

    return NextResponse.json(response);
  } catch (error: any) {
    // Global error handler for unexpected errors
    const errorMessage = error instanceof Error ? error.message : String(error);
    const errorStack = error instanceof Error ? error.stack : undefined;

    logger.error(`[${requestId}] Unhandled error in ingestion API: ${errorMessage}`, {
      stack: errorStack,
      error
    });

    return NextResponse.json(
      {
        error: 'Failed to process files',
        details: errorMessage,
        requestId, // Include request ID for troubleshooting
        stack: process.env.NODE_ENV === 'development' ? errorStack : undefined
      },
      { status: 500 },
    );
  }
}