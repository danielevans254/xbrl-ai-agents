import { AgentConfiguration, IndexConfiguration } from '@/types/graphTypes';

type StreamConfigurables = AgentConfiguration;
type IndexConfigurables = IndexConfiguration;

export const retrievalAssistantStreamConfig: StreamConfigurables = {
  queryModel: 'openai/gpt-4o-mini',
  retrieverProvider: 'supabase',
  k: 5,
};

/**
 * The configuration for the indexing/ingestion process.
 */
export const indexConfig = {
  retrieverProvider: 'supabase',
  k: 5,
  filterKwargs: {},
  docsFile: '',
  useSampleDocs: false,
  queryModel: 'openai/gpt-4o',
};