import { NextResponse } from 'next/server';
import { processPDF } from '@/lib/pdf';
import { Document } from '@langchain/core/documents';

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const ALLOWED_FILE_TYPES = ['application/pdf'];
const PARTIAL_XBRL_MESSAGE = "Extract financial data according to XBRL schema";

export const runtime = 'edge';

export async function POST(req: Request) {
  try {
    // Process incoming PDF file
    const formData = await req.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return new NextResponse(
        JSON.stringify({ error: 'No file provided' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Validate file
    if (!ALLOWED_FILE_TYPES.includes(file.type)) {
      return new NextResponse(
        JSON.stringify({ error: 'Invalid file type. Only PDFs are allowed.' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    if (file.size > MAX_FILE_SIZE) {
      return new NextResponse(
        JSON.stringify({ error: 'File size exceeds 10MB limit.' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Process PDF
    let docs: Document[];
    try {
      docs = await processPDF(file);
    } catch (error) {
      console.error('Error processing PDF:', error);
      return new NextResponse(
        JSON.stringify({ error: 'Failed to process PDF' }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }

    if (!docs.length) {
      return new NextResponse(
        JSON.stringify({ error: 'No text extracted from PDF' }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Use chat API with predefined message
    try {
      const chatResponse = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: PARTIAL_XBRL_MESSAGE }),
      });

      if (!chatResponse.ok) {
        throw new Error('Chat API request failed');
      }

      const chatData = await chatResponse.json();
      return new NextResponse(JSON.stringify(chatData), {
        headers: { 'Content-Type': 'application/json' },
      });
    } catch (error) {
      console.error('Chat API error:', error);
      return new NextResponse(
        JSON.stringify({ error: 'Failed to use chat API' }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }
  } catch (error) {
    console.error('Extract route error:', error);
    return new NextResponse(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}
