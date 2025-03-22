import { VectorStoreRetriever } from '@langchain/core/vectorstores';
import type { Document } from '@langchain/core/documents';
import { OpenAIEmbeddings } from '@langchain/openai';
import { SupabaseVectorStore } from '@langchain/community/vectorstores/supabase';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { RunnableConfig } from '@langchain/core/runnables';
import {
  BaseConfigurationAnnotation,
  ensureBaseConfiguration,
} from './configuration.js';
import { formatDocs, processDocumentsInBatches } from '../retrieval_graph/utils.js';

interface SupabaseConfig {
  SUPABASE_URL: string;
  SUPABASE_SERVICE_ROLE_KEY: string;
}

function getSupabaseConfig(): SupabaseConfig {
  const { SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY } = process.env;
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error(
      'SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY environment variables are not defined'
    );
  }
  return { SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY };
}

async function createSupabaseClient(): Promise<SupabaseClient> {
  const { SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY } = getSupabaseConfig();
  return createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
}

/**
 * Custom retriever that returns all chunks (pages) from the vector store.
 * This retriever bypasses similarity filtering by calling the RPC function with a null query_embedding.
 * Enhanced with batch processing capability and removes embeddings from output.
 */
export class AllChunksRetriever extends VectorStoreRetriever<SupabaseVectorStore> {
  constructor(
    vectorStore: SupabaseVectorStore,
    filter?: SupabaseVectorStore['FilterType'],
    private batchSize: number = 40
  ) {
    super({
      vectorStore,
      k: 100,
      filter,
      searchType: 'similarity',
    });
  }

  async _getRelevantDocuments(_query: string): Promise<Document[]> {
    try {
      // Call the Supabase RPC "match_documents" with query_embedding set to null
      const { data, error } = await this.vectorStore.client.rpc('match_documents', {
        query_embedding: null,
        match_count: null,
        filter: this.filter,
      });
      if (error) {
        throw new Error(`Supabase RPC error: ${error.message}`);
      }
      if (!data || data.length === 0) {
        return [];
      }

      console.log(`Retrieved ${data.length} pages from the vector store.`);

      // Remove embeddings from the documents
      const cleanedDocs = data.map((doc: { [x: string]: any; embedding: any; }) => {
        // Create a new document without the embedding field
        const { embedding, ...docWithoutEmbedding } = doc;
        return docWithoutEmbedding as Document;
      });

      return cleanedDocs;
    } catch (error) {
      console.error("Error retrieving documents:", error);
      throw error;
    }
  }

  async getDocumentsInBatches(query: string, batchProcessor: (formattedDocs: string) => Promise<any>): Promise<any[]> {
    const allDocs = await this._getRelevantDocuments(query);

    return processDocumentsInBatches(
      allDocs,
      async (batch) => {
        const formattedBatch = formatDocs(batch);
        return await batchProcessor(formattedBatch);
      },
      this.batchSize
    );
  }
}

export async function makeSupabaseRetriever(
  configuration: typeof BaseConfigurationAnnotation.State,
): Promise<AllChunksRetriever> {
  const embeddings = new OpenAIEmbeddings({
    model: 'text-embedding-3-small',
  });

  const supabaseClient = await createSupabaseClient();
  const vectorStore = new SupabaseVectorStore(embeddings, {
    client: supabaseClient,
    tableName: 'document_chunks',
    queryName: 'match_documents',
  });

  // Extract batchSize from the configuration if available, otherwise use the default of 40.
  const batchSize = (configuration as any).batchSize ?? 40;

  // Return our custom retriever with the filter extended to only include uploaded PDFs.
  return new AllChunksRetriever(
    vectorStore,
    {
      ...configuration.filterKwargs,
      isUploadedPdf: true,
    },
    batchSize
  );
}

export async function makeRetriever(
  config: RunnableConfig,
): Promise<AllChunksRetriever> {
  const configuration = ensureBaseConfiguration(config);

  switch (configuration.retrieverProvider) {
    case 'supabase':
      return makeSupabaseRetriever(configuration);
    default:
      throw new Error(
        `Unsupported retriever provider: ${configuration.retrieverProvider}`,
      );
  }
}