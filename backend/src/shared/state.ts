import { Document } from '@langchain/core/documents';
import { v4 as uuidv4 } from 'uuid';

/**
 * Reduces the document array based on the provided new documents or actions.
 * Ensures only uploaded PDF files are referenced using their given IDs.
 *
 * @param existing - The existing array of documents.
 * @param newDocs - The new documents or actions to apply.
 * @returns The updated array of documents.
 */
export function reduceDocs(
  existing?: Document[],
  newDocs?:
    | Document[]
    | { [key: string]: any }[]
    | string[]
    | string
    | 'delete',
): Document[] {
  // If delete action is specified, clear all documents
  if (newDocs === 'delete') {
    return [];
  }

  const existingList = existing || [];

  // Handle string input (should be rare case)
  if (typeof newDocs === 'string') {
    const docId = uuidv4();
    return [
      ...existingList,
      { pageContent: newDocs, metadata: { uuid: docId, source: 'manual_input' } },
    ];
  }

  // If no new documents, return existing
  if (!newDocs || !Array.isArray(newDocs)) {
    return existingList;
  }

  const newList: Document[] = [];

  // Process array of new documents
  for (const item of newDocs) {
    if (typeof item === 'object') {
      const metadata = (item as Document).metadata || {};

      // Check if this is a PDF file upload by looking for file extension or mime type indicators
      const isPdfUpload =
        (metadata.source && typeof metadata.source === 'string' &&
          (metadata.source.toLowerCase().endsWith('.pdf') ||
            metadata.mimetype === 'application/pdf')) ||
        (metadata.filename && typeof metadata.filename === 'string' &&
          metadata.filename.toLowerCase().endsWith('.pdf'));

      // Use the existing ID if available, otherwise generate a new one
      const itemId = metadata.uuid || (isPdfUpload && metadata.fileId) || uuidv4();

      if ('pageContent' in item) {
        // It's a Document-like object
        newList.push({
          ...(item as Document),
          metadata: {
            ...metadata,
            uuid: itemId,
            isUploadedPdf: isPdfUpload
          },
        });
      } else {
        // It's a generic object, treat it as metadata
        newList.push({
          pageContent: '',
          metadata: {
            ...(item as { [key: string]: any }),
            uuid: itemId,
            isUploadedPdf: isPdfUpload
          },
        });
      }
    } else if (typeof item === 'string') {
      // Handle string items in the array
      const itemId = uuidv4();
      newList.push({
        pageContent: item,
        metadata: {
          uuid: itemId,
          source: 'manual_input'
        }
      });
    }
  }

  // Combine existing and new documents
  return [...existingList, ...newList];
}