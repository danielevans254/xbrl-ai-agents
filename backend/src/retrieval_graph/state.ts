import { Annotation, MessagesAnnotation } from '@langchain/langgraph';
import { reduceDocs } from '../shared/state.js';
import { Document } from '@langchain/core/documents';
import { FinancialStatementSchema, StructuredResponseSchema } from './schema.js';
import { z } from 'zod';

/**
 * Represents the state of the retrieval graph / agent.
 */
export const AgentStateAnnotation = Annotation.Root({
  query: Annotation<string>(),
  route: Annotation<string>(),
  ...MessagesAnnotation.spec,

  /**
   * Populated by the retriever. This is a list of documents that the agent can reference.
   * @type {Document[]}
   */
  documents: Annotation<
    Document[],
    Document[] | { [key: string]: any }[] | string[] | string | 'delete'
  >({
    default: () => [],
    // @ts-ignore
    reducer: reduceDocs,
  }),

  // TODO:
  /**
 * Financial statement data validated with Zod schema
 * @type {z.infer<typeof FinancialStatementSchema> | null}
 */
  financialStatement: Annotation<z.infer<typeof FinancialStatementSchema> | null>({
    default: () => null,
    reducer: (_current, update) => update,
  }),

  structuredResponse: Annotation<z.infer<typeof StructuredResponseSchema> | null>({
    default: () => null,
    reducer: (_current, update) => update,
  }),

  // Additional attributes can be added here as needed
});
