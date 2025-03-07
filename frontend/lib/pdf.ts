import { PDFLoader } from '@langchain/community/document_loaders/fs/pdf';
import { Document } from '@langchain/core/documents';
import { v4 as uuidv4 } from 'uuid';

const MAX_PDF_SIZE = 10 * 1024 * 1024;
const MAX_PAGE_COUNT = 50;

export async function processPDF(file: File): Promise<Document[]> {
  try {
    if (!file) throw new Error('No file provided');
    if (file.size > MAX_PDF_SIZE) {
      throw new Error(`File size exceeds ${MAX_PDF_SIZE / 1024 / 1024}MB limit`);
    }

    const buffer = await file.arrayBuffer();
    const blob = new Blob([buffer], { type: file.type });

    const loader = new PDFLoader(blob, {
      splitPages: true,
      parsedItemSeparator: '\n\n',
    });

    const docs = await loader.load();

    if (docs.length > MAX_PAGE_COUNT) {
      throw new Error(`PDF exceeds ${MAX_PAGE_COUNT} page limit`);
    }

    const pdfId = uuidv4();
    const processedAt = new Date().toISOString();
    const checksum = await generateChecksum(buffer);

    // Explicitly type the metadata and document structure
    return Promise.all(docs.map(async (doc, index) =>
      new Document({
        pageContent: doc.pageContent,
        metadata: {
          ...doc.metadata as Record<string, any>,
          pdfId,
          source: file.name,
          processedAt,
          pageNumber: index + 1,
          totalPages: docs.length,
          checksum,
        }
      })
    ));
  } catch (error) {
    console.error(`PDF processing failed for ${file?.name}:`, error);
    throw new Error(`Failed to process PDF: ${(error as Error).message}`);
  }
}

async function generateChecksum(buffer: ArrayBuffer): Promise<string> {
  const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}