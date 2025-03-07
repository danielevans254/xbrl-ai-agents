import { Annotation } from '@langchain/langgraph';
import { Document } from '@langchain/core/documents';
import { reduceDocs } from '../shared/state.js';
import { FinancialStatementSchema } from '../retrieval_graph/schema.js';
import { z } from 'zod';

/**
 * Represents the state for document indexing and retrieval.
 *
 * This interface defines the structure of the index state, which includes
 * the documents to be indexed and the retriever used for searching
 * these documents.
 */
export const IndexStateAnnotation = Annotation.Root({
  docs: Annotation<
    Document[],
    Document[] | { [key: string]: any }[] | string[] | string | 'delete'
  >({
    default: () => [],
    reducer: reduceDocs,
  }),
  financialStatement: Annotation<z.infer<typeof FinancialStatementSchema> | null>({
    default: () => null,
    reducer: (_current, update) => update,
  }),
});

export type IndexStateType = typeof IndexStateAnnotation.State;
