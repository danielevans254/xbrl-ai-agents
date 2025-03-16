import { StateGraph, START, END } from '@langchain/langgraph';
import { AgentStateAnnotation } from './state.js';
import { makeRetriever } from '../shared/retrieval.js';
import { formatDocs } from './utils.js';
import { HumanMessage, SystemMessage } from '@langchain/core/messages';
import { RunnableConfig } from '@langchain/core/runnables';
import {
  AgentConfigurationAnnotation,
  ensureAgentConfiguration,
} from './configuration.js';
import { loadChatModel } from '../shared/utils.js';
import {
  RESPONSE_SYSTEM_PROMPT,
  STRUCTURED_EXTRACTION_PROMPT
} from './prompts.js';
import { schemaString } from './schema.js';

async function retrieveDocuments(
  state: typeof AgentStateAnnotation.State,
  config: RunnableConfig,
): Promise<typeof AgentStateAnnotation.Update> {
  const retriever = await makeRetriever(config);

  // Modify the retriever to only consider documents with isUploadedPdf flag
  const customRetriever = {
    invoke: async (query: string) => {
      const allDocs = await retriever.invoke(query);

      // Filter to only include uploaded PDF documents
      const pdfDocs = allDocs.filter(doc =>
        doc.metadata && (doc.metadata.isUploadedPdf === true ||
          (doc.metadata.source &&
            typeof doc.metadata.source === 'string' &&
            doc.metadata.source.toLowerCase().endsWith('.pdf')))
      );

      // If no PDF documents found, return empty array
      if (pdfDocs.length === 0) {
        return [];
      }

      return pdfDocs;
    }
  };

  const response = await customRetriever.invoke(state.query);

  return { documents: response };
}

async function generateResponse(
  state: typeof AgentStateAnnotation.State,
  config: RunnableConfig,
): Promise<typeof AgentStateAnnotation.Update> {
  const configuration = ensureAgentConfiguration(config);
  const model = await loadChatModel(configuration.queryModel);
  const userHumanMessage = new HumanMessage(state.query);

  // Check if we have any documents
  if (!state.documents || state.documents.length === 0) {
    // No documents were found, inform the user
    const noDocsResponse = await model.invoke([
      new SystemMessage(
        "You must only answer based on the uploaded PDF documents. " +
        "No relevant PDF documents were found for this query."
      ),
      userHumanMessage
    ]);

    return { messages: [userHumanMessage, noDocsResponse] };
  }

  // Format the documents
  const context = formatDocs(state.documents);

  try {
    const extractionPrompt = await STRUCTURED_EXTRACTION_PROMPT.invoke({
      context: context,
    });

    const systemMessage = new SystemMessage(
      `You are a precision data extraction system. Process the ENTIRE document completely,
      ensuring NO information is missed. Extract ALL data according to the schema provided.
      ${schemaString}

      Your output MUST be valid JSON. Only use the uploaded PDF documents
      as your source of information. Never answer based on your general knowledge.`
    );

    const extractionResponse = await model.invoke([
      systemMessage,
      new HumanMessage(extractionPrompt.toString())
    ]);

    const responsePrompt = await RESPONSE_SYSTEM_PROMPT.invoke({
      question: state.query,
      context: extractionResponse.content,
    });

    const finalResponse = await model.invoke([
      new SystemMessage(responsePrompt.toString() +
        " Only use the uploaded PDF documents as your source of information. " +
        "If the information is not in the documents, state that it cannot be found " +
        "in the uploaded documents."),
      userHumanMessage
    ]);

    let isValidJSON = false;
    try {
      JSON.parse(finalResponse.content as string);
      isValidJSON = true;
    } catch (e) {
    }

    if (!isValidJSON) {
      const fixMessage = new SystemMessage(
        `The previous response was not valid JSON. Please return ONLY valid JSON
        following the exact schema provided, with no additional text or explanations.
        Only use information from the uploaded PDF documents.`
      );

      const fixedResponse = await model.invoke([
        fixMessage,
        new HumanMessage(extractionResponse.content as string)
      ]);

      return { messages: [userHumanMessage, fixedResponse] };
    }

    return { messages: [userHumanMessage, finalResponse] };
  } catch (error) {
    let errorMessage = 'Unknown error occurred';

    if (error instanceof Error) {
      errorMessage = error.message;

      if (error.stack) {
        error.stack = error.stack
          .replace(/file:\/\/\//g, '')
          .replace(/\//g, '\\')
          .split('\n')
          .slice(0, 5)
          .join('\n');
      }
    }

    const errorResponse = await model.invoke([
      new SystemMessage(`There was an error processing the data from the uploaded PDF: ${errorMessage}.
      Please respond with valid JSON indicating the error occurred.`),
      userHumanMessage
    ]);

    return { messages: [userHumanMessage, errorResponse] };
  }
}

const builder = new StateGraph(
  AgentStateAnnotation,
  AgentConfigurationAnnotation,
)
  .addNode('retrieveDocuments', retrieveDocuments)
  .addNode('generateResponse', generateResponse)
  .addEdge(START, 'retrieveDocuments')
  .addEdge('retrieveDocuments', 'generateResponse')
  .addEdge('generateResponse', END);

export const graph = builder.compile().withConfig({
  runName: 'PDFFinancialDataExtractionGraph',
  recursionLimit: 50,
  configurable: {
    pathResolver: (importPath: string) => {
      if (importPath.startsWith('file:')) {
        // More robust path handling
        return importPath
          .replace(/^file:\/\/\//, '')
          .replace(/file:/g, '')
          .replace(/\//g, '\\')
          .replace(/\\\\/g, '\\');
      }
      return importPath;
    }
  }
});