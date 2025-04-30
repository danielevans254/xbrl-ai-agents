import { indexConfig } from '@/constants/graphConfigs';
import { langGraphServerClient } from '@/lib/langgraph-server';
import { processPDF } from '@/lib/pdf';
import { Document } from '@langchain/core/documents';
import { NextRequest, NextResponse } from 'next/server';
import { PartialXBRLSchema } from '../../../../backend/src/retrieval_graph/schema';
import { z } from 'zod';
import { logger } from '@/lib/logger';
import { createClient } from '@supabase/supabase-js';
import { v4 as uuidv4 } from 'uuid';

// Configuration constants
const MAX_FILE_SIZE = 10 * 1024 * 1024;
const MAX_FILES = 1;
const ALLOWED_FILE_TYPES = ['application/pdf'];
const REQUIRED_ENV_VARS = [
  'LANGGRAPH_INGESTION_ASSISTANT_ID',
  'LANGGRAPH_RETRIEVAL_ASSISTANT_ID',
  'SUPABASE_URL',
  'SUPABASE_SERVICE_ROLE_KEY'
];

const ERROR_MESSAGES = {
  MISSING_SUPABASE_CONFIG: 'Supabase configuration is incomplete',
  SERVER_ERROR: 'Internal server error',
  SESSION_CREATION_ERROR: 'Failed to create session',
  DOCUMENT_CREATION_ERROR: 'Failed to create document record',
  THREAD_CREATION_ERROR: 'Failed to create ingestion thread',
  THREAD_CREATION_TIMEOUT: 'Thread creation timed out after 10 seconds',
  INGESTION_TIMEOUT: 'Ingestion run timed out after 60 seconds',
  INGESTION_FAILED: 'Ingestion process failed after multiple attempts',
  NO_DOCUMENTS_EXTRACTED: 'No valid documents extracted from uploaded files',
  INVALID_REQUEST: 'Invalid request',
  INVALID_CONTENT_TYPE: 'Request must be multipart/form-data',
  NO_FILES_PROVIDED: 'No files provided',
  TOO_MANY_FILES: `Too many files. Maximum ${MAX_FILES} file(s) allowed.`,
  INVALID_FILE_TYPE: 'Invalid file type. Only PDF files are allowed.',
  FILE_TOO_LARGE: `File size exceeds maximum allowed (${MAX_FILE_SIZE / (1024 * 1024)}MB).`
};

interface IngestionRunResult {
  output?: {
    financialStatement?: z.infer<typeof PartialXBRLSchema>;
  };
  state?: Record<string, any>;
}

/**
 * Creates and returns a Supabase client with error handling
 */
const getSupabaseClient = () => {
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseServiceKey) {
    logger.error('[API] Supabase configuration missing');
    throw new Error(ERROR_MESSAGES.MISSING_SUPABASE_CONFIG);
  }

  try {
    return createClient(supabaseUrl, supabaseServiceKey);
  } catch (error) {
    logger.error('[API] Failed to create Supabase client:', error);
    throw new Error(`${ERROR_MESSAGES.MISSING_SUPABASE_CONFIG}: ${error instanceof Error ? error.message : String(error)}`);
  }
};

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
    return {
      valid: false,
      error: ERROR_MESSAGES.INVALID_FILE_TYPE
    };
  }

  if (file.size > MAX_FILE_SIZE) {
    return {
      valid: false,
      error: `${ERROR_MESSAGES.FILE_TOO_LARGE} Current size: ${(file.size / (1024 * 1024)).toFixed(2)}MB.`
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
    return { files: [], error: ERROR_MESSAGES.NO_FILES_PROVIDED };
  }

  if (files.length > MAX_FILES) {
    return { files: [], error: ERROR_MESSAGES.TOO_MANY_FILES };
  }

  return { files };
}

/**
 * Creates a new session in the database
 * @param supabase Supabase client
 * @param threadId Thread ID to associate with the session
 * @param requestId Request ID for tracking
 * @returns The created session ID
 */
async function createSession(supabase: any, threadId: string, requestId: string): Promise<string> {
  const sessionId = uuidv4();
  logger.info(`[${requestId}] Creating new session: ${sessionId}`);

  try {
    const { error } = await supabase
      .from('session_thread')
      .insert({
        session_id: sessionId,
        thread_id: threadId,
        status: 'upload_complete',
        current_step: 'extracting',
        metadata: { requestId }
      });

    if (error) {
      logger.error(`[${requestId}] Session creation failed: ${JSON.stringify(error)}`);
      throw new Error(`${ERROR_MESSAGES.SESSION_CREATION_ERROR}: ${error.message}`);
    }

    logger.info(`[${requestId}] Session created successfully`);
    return sessionId;
  } catch (error) {
    logger.error(`[${requestId}] Database error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    throw new Error(ERROR_MESSAGES.SESSION_CREATION_ERROR);
  }
}

/**
 * Creates a document record in the database
 * @param supabase Supabase client
 * @param requestId Request ID for tracking
 * @returns The created document ID
 */
async function createDocument(supabase: any, requestId: string): Promise<string> {
  logger.info(`[${requestId}] Creating new document record`);

  try {
    const { data, error } = await supabase
      .from('documents')
      .insert({})
      .select();

    if (error) {
      logger.error(`[${requestId}] Failed to create document record: ${error.message}`);
      throw new Error(`${ERROR_MESSAGES.DOCUMENT_CREATION_ERROR}: ${error.message}`);
    }

    if (!data || data.length === 0) {
      throw new Error('Document record created but no ID returned');
    }

    logger.info(`[${requestId}] Document record created with ID: ${data[0].id}`);
    return data[0].id;
  } catch (dbError) {
    logger.error(`[${requestId}] Error creating document record:`, dbError);
    throw new Error(ERROR_MESSAGES.DOCUMENT_CREATION_ERROR);
  }
}

/**
 * Saves document chunks to the database
 * @param supabase Supabase client
 * @param documentId Document ID to associate chunks with
 * @param docs Array of document chunks
 * @param requestId Request ID for tracking
 */
async function saveDocumentChunks(supabase: any, documentId: string, docs: Document[], requestId: string): Promise<void> {
  logger.info(`[${requestId}] Saving ${docs.length} document chunks for document ID: ${documentId}`);

  try {
    // Process chunks in batches of 100 to avoid potential payload size limits
    const batchSize = 100;
    const batches: any[][] = [];

    for (let i = 0; i < docs.length; i += batchSize) {
      batches.push(docs.slice(i, i + batchSize));
    }

    for (let i = 0; i < batches.length; i++) {
      const chunks = batches[i].map(doc => ({
        content: doc.pageContent,
        metadata: doc.metadata,
        document_id: documentId
      }));

      logger.info(`[${requestId}] Saving batch ${i + 1}/${batches.length} (${chunks.length} chunks)`);
      const { error } = await supabase
        .from('document_chunks')
        .insert(chunks);

      if (error) {
        logger.error(`[${requestId}] Failed to save document chunks batch ${i + 1}: ${error.message}`);
        throw new Error(`Failed to save document chunks: ${error.message}`);
      }
    }

    logger.info(`[${requestId}] Successfully saved all ${docs.length} document chunks`);
  } catch (dbError) {
    logger.error(`[${requestId}] Error saving document chunks:`, dbError);
    throw new Error('Failed to save document chunks');
  }
}

/**
 * Saves extracted data to the database
 * @param supabase Supabase client
 * @param threadId Thread ID associated with the extraction
 * @param documentId Document ID to associate with the extracted data
 * @param structuredData The extracted structured data
 * @param requestId Request ID for tracking
 */
async function saveExtractedData(supabase: any, threadId: string, documentId: string, structuredData: any, requestId: string): Promise<void> {
  if (!structuredData) {
    logger.info(`[${requestId}] No structured data to save`);
    return;
  }

  logger.info(`[${requestId}] Saving extracted data for document ID: ${documentId}`);

  try {
    const { error } = await supabase
      .from('extracted_data')
      .insert({
        thread_id: threadId,
        pdf_id: documentId,
        data: structuredData
      });

    if (error) {
      logger.error(`[${requestId}] Failed to save extracted data: ${error.message}`);
      throw new Error(`Failed to save extracted data: ${error.message}`);
    }

    logger.info(`[${requestId}] Successfully saved extracted data`);
  } catch (dbError) {
    logger.error(`[${requestId}] Error saving extracted data:`, dbError);
    throw new Error('Failed to save extracted data');
  }
}

/**
 * Updates session status in database
 * @param supabase Supabase client
 * @param sessionId Session ID to update
 * @param status New status value
 * @param step New step value
 * @param metadata Additional metadata to include
 * @param requestId Request ID for tracking
 */
async function updateSessionStatus(
  supabase: any,
  sessionId: string,
  status: string,
  step: string,
  metadata: Record<string, any> = {},
  requestId: string
): Promise<void> {
  try {
    const { error } = await supabase
      .from('session_thread')
      .update({
        status,
        current_step: step,
        metadata: {
          requestId,
          ...metadata
        }
      })
      .eq('session_id', sessionId);

    if (error) {
      logger.error(`[${requestId}] Failed to update session status: ${error.message}`);
    } else {
      logger.info(`[${requestId}] Session status updated to: ${status}, step: ${step}`);
    }
  } catch (dbError) {
    logger.error(`[${requestId}] Error updating session status:`, dbError);
  }
}

/**
 * Run ingestion process with retry logic
 * @param threadId ID of the thread to run ingestion on
 * @param docs Document chunks to process
 * @param requestId Request ID for tracking
 * @returns Result of the ingestion run
 */
async function runIngestionWithRetries(threadId: string, docs: Document[], requestId: string): Promise<IngestionRunResult> {
  let retryCount = 0;
  const maxRetries = 2;

  while (true) {
    try {
      logger.info(`[${requestId}] Starting ingestion run attempt ${retryCount + 1} on thread ${threadId}`);

      const result = await Promise.race([
        langGraphServerClient.client.runs.wait(
          threadId,
          'ingestion_graph',
          {
            input: { docs },
            config: {
              configurable: {
                ...indexConfig,
                queryModel: 'openai/gpt-4o',
              },
            },
          },
        ) as unknown as IngestionRunResult,
        new Promise<never>((_, reject) => {
          setTimeout(() => reject(new Error(ERROR_MESSAGES.INGESTION_TIMEOUT)), 60000);
        })
      ]);

      logger.info(`[${requestId}] Ingestion run completed successfully`);
      return result;
    } catch (error: any) {
      retryCount++;
      logger.warn(`[${requestId}] Ingestion attempt ${retryCount} failed: ${error.message}`);

      if (retryCount >= maxRetries) {
        logger.error(`[${requestId}] All ingestion attempts failed after ${maxRetries} retries`);
        throw new Error(`${ERROR_MESSAGES.INGESTION_FAILED}: ${error.message}`);
      }

      // Exponential backoff
      const backoffMs = 1000 * Math.pow(2, retryCount);
      logger.info(`[${requestId}] Retrying ingestion in ${backoffMs}ms...`);
      await new Promise(resolve => setTimeout(resolve, backoffMs));
    }
  }
}

/**
 * Main API handler function for POST requests
 */
export async function POST(request: NextRequest) {
  const requestId = `req_${Date.now()}_${Math.random().toString(36).substring(2, 10)}`;
  logger.info(`[${requestId}] Starting file ingestion process`);

  let sessionId: string | undefined;
  let threadId: string | undefined;
  let documentId: string | undefined;
  let supabase: any;

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
      return NextResponse.json({ error: ERROR_MESSAGES.INVALID_REQUEST }, { status: 400 });
    }

    // Check content-type header
    const contentType = request.headers.get('content-type');
    if (!contentType || !contentType.includes('multipart/form-data')) {
      logger.error(`[${requestId}] Invalid content type: ${contentType}`);
      return NextResponse.json(
        { error: ERROR_MESSAGES.INVALID_CONTENT_TYPE },
        { status: 400 }
      );
    }

    try {
      supabase = getSupabaseClient();
      logger.info(`[${requestId}] Supabase client initialized successfully`);
    } catch (error) {
      logger.error(`[${requestId}] Failed to initialize Supabase client:`, error);
      return NextResponse.json({
        error: ERROR_MESSAGES.MISSING_SUPABASE_CONFIG,
        details: error instanceof Error ? error.message : String(error),
        requestId
      }, { status: 500 });
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

    // Create a document record
    try {
      documentId = await createDocument(supabase, requestId);
    } catch (error) {
      logger.error(`[${requestId}] Failed to create document record:`, error);
      return NextResponse.json({
        error: ERROR_MESSAGES.DOCUMENT_CREATION_ERROR,
        details: error instanceof Error ? error.message : String(error),
        requestId
      }, { status: 500 });
    }

    // Process valid files
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
          error: ERROR_MESSAGES.NO_DOCUMENTS_EXTRACTED,
          failedFiles: failedFiles.length > 0 ? failedFiles : undefined
        },
        { status: 422 }
      );
    }

    // Save document chunks (continue even if this fails)
    try {
      await saveDocumentChunks(supabase, documentId, allDocs, requestId);
    } catch (error) {
      logger.error(`[${requestId}] Failed to save document chunks:`, error);
      // Non-fatal error, continue with the process
    }

    // Create ingestion thread with timeout handling
    logger.info(`[${requestId}] Creating a new thread for ingestion`);
    let thread;
    try {
      thread = await Promise.race([
        langGraphServerClient.createThread(),
        new Promise<never>((_, reject) => {
          setTimeout(() => reject(new Error(ERROR_MESSAGES.THREAD_CREATION_TIMEOUT)), 10000);
        })
      ]);
    } catch (error: any) {
      logger.error(`[${requestId}] Failed to create thread: ${error.message}`);
      return NextResponse.json(
        {
          error: ERROR_MESSAGES.THREAD_CREATION_ERROR,
          details: error.message,
          documentId  // Include document ID for reference
        },
        { status: 500 }
      );
    }

    if (!thread || !thread.thread_id) {
      logger.error(`[${requestId}] Invalid thread response`);
      return NextResponse.json(
        { error: ERROR_MESSAGES.THREAD_CREATION_ERROR },
        { status: 500 }
      );
    }

    threadId = thread.thread_id;
    logger.info(`[${requestId}] Thread created successfully with ID: ${threadId}`);

    // Create session in database
    try {
      sessionId = await createSession(supabase, threadId, requestId);
    } catch (error) {
      logger.error(`[${requestId}] Failed to create session:`, error);
      return NextResponse.json({
        error: ERROR_MESSAGES.SESSION_CREATION_ERROR,
        details: error instanceof Error ? error.message : String(error),
        threadId,
        documentId,
        requestId
      }, { status: 500 });
    }

    // Run ingestion with retry logic
    let ingestionRun: IngestionRunResult;
    try {
      ingestionRun = await runIngestionWithRetries(threadId, allDocs, requestId);
    } catch (error) {
      // If ingestion fails, update session status and return error
      if (sessionId) {
        await updateSessionStatus(
          supabase,
          sessionId,
          'upload_failed',
          'uploading',
          { failReason: error instanceof Error ? error.message : String(error) },
          requestId
        );
      }

      return NextResponse.json(
        {
          error: ERROR_MESSAGES.INGESTION_FAILED,
          sessionId,
          threadId,
          documentId,
          details: error instanceof Error ? error.message : String(error)
        },
        { status: 500 }
      );
    }

    // Extract structured data from ingestion result
    const structuredData = ingestionRun?.state?.financialStatement ??
      ingestionRun?.output?.financialStatement;

    // Save extracted data if available (continue even if this fails)
    if (structuredData) {
      try {
        await saveExtractedData(supabase, threadId, documentId, structuredData, requestId);
      } catch (error) {
        logger.error(`[${requestId}] Failed to save extracted data:`, error);
        // Non-fatal error, continue with the process
      }
    }

    logger.info(`[${requestId}] Ingestion completed successfully for thread ${threadId}`);

    // Update session status to completed
    await updateSessionStatus(
      supabase,
      sessionId,
      'active',
      'ingestion_complete',
      {
        documentsProcessed: allDocs.length,
        documentId,
        hasStructuredData: !!structuredData
      },
      requestId
    );

    // Prepare response with detailed information
    const response = {
      message: 'Documents ingested successfully',
      sessionId,
      threadId,
      documentId,
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

    if (sessionId && supabase) {
      try {
        await updateSessionStatus(
          supabase,
          sessionId,
          'generation_failed',
          'generating',
          { error: errorMessage },
          requestId
        );
      } catch (updateError) {
        logger.error(`[${requestId}] Failed to update session status after error:`, updateError);
      }
    }

    return NextResponse.json(
      {
        error: ERROR_MESSAGES.SERVER_ERROR,
        details: errorMessage,
        requestId,
        ...(threadId && { threadId }),
        ...(documentId && { documentId }),
        ...(sessionId && { sessionId }),
        stack: process.env.NODE_ENV === 'development' ? errorStack : undefined
      },
      { status: 500 },
    );
  }
}