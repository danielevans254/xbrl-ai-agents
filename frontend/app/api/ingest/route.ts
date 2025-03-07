import { indexConfig } from '@/constants/graphConfigs';
import { langGraphServerClient } from '@/lib/langgraph-server';
import { processPDF } from '@/lib/pdf';
import { Document } from '@langchain/core/documents';
import { NextRequest, NextResponse } from 'next/server';
import { FinancialStatementSchema } from '../../../../backend/src/retrieval_graph/schema';
import { z } from 'zod';

// Configuration constants
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const ALLOWED_FILE_TYPES = ['application/pdf'];

interface IngestionRunResult {
  output?: {
    financialStatement?: z.infer<typeof FinancialStatementSchema>;
  };
  state?: Record<string, any>;
}

export async function POST(request: NextRequest) {
  try {
    if (!process.env.LANGGRAPH_INGESTION_ASSISTANT_ID) {
      return NextResponse.json(
        {
          error:
            'LANGGRAPH_INGESTION_ASSISTANT_ID is not set in your environment variables',
        },
        { status: 500 },
      );
    }

    const formData = await request.formData();
    const files: File[] = [];

    for (const [key, value] of formData.entries()) {
      if (key === 'files' && value instanceof File) {
        files.push(value);
      }
    }

    if (!files || files.length === 0) {
      return NextResponse.json({ error: 'No files provided' }, { status: 400 });
    }

    // Validate file count
    if (files.length > 5) {
      return NextResponse.json(
        { error: 'Too many files. Maximum 5 files allowed.' },
        { status: 400 },
      );
    }

    // Validate file types and sizes
    const invalidFiles = files.filter((file) => {
      return (
        !ALLOWED_FILE_TYPES.includes(file.type) || file.size > MAX_FILE_SIZE
      );
    });

    if (invalidFiles.length > 0) {
      return NextResponse.json(
        {
          error:
            'Only PDF files are allowed and file size must be less than 10MB',
        },
        { status: 400 },
      );
    }

    // Process all PDFs into Documents
    const allDocs: Document[] = [];
    for (const file of files) {
      try {
        const docs = await processPDF(file);
        allDocs.push(...docs);
      } catch (error: any) {
        console.error(`Error processing file ${file.name}:`, error);
        // Continue processing other files; errors are logged
      }
    }

    if (!allDocs.length) {
      return NextResponse.json(
        { error: 'No valid documents extracted from uploaded files' },
        { status: 500 },
      );
    }

    // Run the ingestion graph
    const thread = await langGraphServerClient.createThread();
    const ingestionRun = await langGraphServerClient.client.runs.wait(
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
    ) as unknown as IngestionRunResult;
    const structuredData = ingestionRun.state?.financialStatement ??
      ingestionRun.output?.financialStatement;

    return NextResponse.json({
      message: 'Documents ingested successfully',
      threadId: thread.thread_id,
      ...(structuredData && { structuredData }),
    });
  } catch (error: any) {
    console.error('Error processing files:', error);
    return NextResponse.json(
      {
        error: 'Failed to process files',
        details: error.message,
        stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
      },
      { status: 500 },
    );
  }
}
