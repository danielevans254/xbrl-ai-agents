import { Annotation } from '@langchain/langgraph';
import { RunnableConfig } from '@langchain/core/runnables';
import {
  BaseConfigurationAnnotation,
  ensureBaseConfiguration,
} from '../shared/configuration.js';

// This file contains sample documents to index, based on the following LangChain and LangGraph documentation pages:
/**
 * The configuration for the indexing process.
 */
export const IndexConfigurationAnnotation = Annotation.Root({
  ...BaseConfigurationAnnotation.spec,

  /**
   * Path to a JSON file containing default documents to index.
   */
  docsFile: Annotation<string>,
  useSampleDocs: Annotation<boolean>,
  queryModel: Annotation<string>,
});

/**
 * Create an typeof IndexConfigurationAnnotation.State instance from a RunnableConfig object.
 *
 * @param config - The configuration object to use.
 * @returns An instance of typeof IndexConfigurationAnnotation.State with the specified configuration.
 */
export function ensureIndexConfiguration(
  config: RunnableConfig,
): typeof IndexConfigurationAnnotation.State {
  const configurable = (config?.configurable || {}) as Partial<
    typeof IndexConfigurationAnnotation.State
  >;
  const baseConfig = ensureBaseConfiguration(config);

  return {
    ...baseConfig,
    docsFile: configurable.docsFile || "No Document File Specified",
    useSampleDocs: configurable.useSampleDocs || false,
    queryModel: configurable.queryModel || 'openai/gpt-4o',
  };
}
