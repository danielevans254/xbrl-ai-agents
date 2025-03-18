import { Document } from '@langchain/core/documents';

export function formatDoc(doc: Document): string {
  const metadata = doc.metadata || {};

  // Format metadata properly
  const metadataStr = Object.entries(metadata)
    .filter(([_, v]) => v !== undefined && v !== null)
    .map(([k, v]) => {
      // Handle objects in metadata by converting to string instead of [object Object]
      const value = typeof v === 'object' ? JSON.stringify(v) : v;
      return `${k}="${value}"`;
    })
    .join(' ');

  // Return only id, content and metadata
  return `<document id="${doc.metadata?.uuid || 'unknown'}">
  <content>${doc.pageContent}</content>
  <metadata ${metadataStr}></metadata>
</document>`;
}

export function formatDocs(docs?: Document[]): string {
  /**Format a list of documents as XML. */
  if (!docs || docs.length === 0) {
    return '';
  }
  const formatted = docs.map(formatDoc).join('\n');
  return `<documents>\n${formatted}\n</documents>`;
}

// New function to split documents into batches
export function splitDocumentsIntoBatches(docs: Document[], maxBatchSize = 40): Document[][] {
  const batches: Document[][] = [];
  let currentBatch: Document[] = [];
  let currentBatchSize = 0;

  const estimateDocumentSize = (doc: Document): number => {
    const metadataSize = Object.entries(doc.metadata || {}).reduce((sum, [k, v]) => {
      return sum + k.length + (typeof v === 'string' ? v.length :
        typeof v === 'object' ? JSON.stringify(v).length : String(v).length);
    }, 0);

    // Estimate: 1 token ~ 4 characters
    return Math.ceil((doc.pageContent.length + metadataSize) / 4);
  };

  for (const doc of docs) {
    const docSize = estimateDocumentSize(doc);

    // If adding this doc would exceed batch size, start a new batch
    if (currentBatchSize + docSize > maxBatchSize && currentBatch.length > 0) {
      batches.push(currentBatch);
      currentBatch = [];
      currentBatchSize = 0;
    }

    currentBatch.push(doc);
    currentBatchSize += docSize;
  }

  if (currentBatch.length > 0) {
    batches.push(currentBatch);
  }

  return batches;
}

export async function processDocumentsInBatches<T>(
  docs: Document[],
  processBatch: (batch: Document[]) => Promise<T>,
  maxBatchSize = 40
): Promise<T[]> {
  const batches = splitDocumentsIntoBatches(docs, maxBatchSize);
  console.log(`Split ${docs.length} documents into ${batches.length} batches`);

  const results: T[] = [];
  for (let i = 0; i < batches.length; i++) {
    console.log(`Processing batch ${i + 1}/${batches.length} (${batches[i].length} documents)`);
    const result = await processBatch(batches[i]);
    results.push(result);
  }

  return results;
}