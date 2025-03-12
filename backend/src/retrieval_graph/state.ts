import { Annotation, MessagesAnnotation } from '@langchain/langgraph';
import { reduceDocs } from '../shared/state.js';
import { Document } from '@langchain/core/documents';
import { PartialXBRL } from './schema.js';

export const AgentStateAnnotation = Annotation.Root({
  query: Annotation<string>(),
  route: Annotation<string>(),
  ...MessagesAnnotation.spec,

  documents: Annotation<
    Document[],
    Document[] | { [key: string]: any }[] | string[] | string | 'delete'
  >({
    default: () => [],
    reducer: reduceDocs,
  }),

  structuredData: Annotation<PartialXBRL>({
    default: () => ({} as PartialXBRL),
    value: (prev: PartialXBRL, current: PartialXBRL) => ({
      ...prev,
      ...current,
    }),
  }),
});