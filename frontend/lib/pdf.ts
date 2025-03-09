import { PDFLoader } from '@langchain/community/document_loaders/fs/pdf';
import { Document } from '@langchain/core/documents';
import fs from 'fs/promises';
import os from 'os';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import crypto from 'crypto';

/**
 * Processes a PDF file by parsing it into Document objects.
 * @param file - The PDF file to process.
 * @returns An array of Document objects extracted from the PDF.
 */
export async function processPDF(file: File): Promise<Document[]> {
  const buffer = await bufferFile(file);
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'pdf-'));
  const tempFilePath = path.join(tempDir, file.name);

  try {
    await fs.writeFile(tempFilePath, buffer);
    const loader = new PDFLoader(tempFilePath);

    const pdfId = uuidv4();
    const processedAt = new Date().toISOString();
    const checksum = await generateChecksum(buffer);
    const docs = await loader.load();

    // Add filename to metadata for each document
    docs.forEach((doc, index) => {
      doc.metadata = {
        ...doc.metadata,
        filename: file.name,
        pdfId: pdfId,
        processedAt: processedAt,
        pageNumber: index + 1,
        totalPages: docs.length,
        checksum: checksum
      };
    });

    return docs;
  } finally {
    // Clean up temporary files
    await fs
      .unlink(tempFilePath)
      .catch((err) => console.error('Error deleting temp file:', err));
    await fs
      .rmdir(tempDir)
      .catch((err) => console.error('Error deleting temp dir:', err));
  }
}

/**
 * Converts a File object to a Buffer.
 * @param file - The uploaded file.
 * @returns A Buffer containing the file content.
 */
async function bufferFile(file: File): Promise<Buffer> {
  try {
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    return buffer;
  } catch (error) {
    console.error('Error buffering file:', error);
    throw new Error('Failed to read file content.');
  }
}

/**
 * Generates a SHA-256 checksum for a buffer.
 * @param buffer - The buffer to generate a checksum for.
 * @returns A hexadecimal string representation of the checksum.
 */
async function generateChecksum(buffer: Buffer): Promise<string> {
  // For Node.js environment
  if (typeof window === 'undefined') {
    return crypto.createHash('sha256').update(buffer).digest('hex');
  }

  // For browser environment
  const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}