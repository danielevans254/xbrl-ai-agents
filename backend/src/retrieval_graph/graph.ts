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
    // Step 1: Extract structured data using the extraction prompt
    const extractionPrompt = await STRUCTURED_EXTRACTION_PROMPT.invoke({
      context: context,
    });

    const systemMessage = new SystemMessage(
      `You are a precision financial data extraction system. Process the ENTIRE document completely, 
      ensuring NO information is missed. Extract ALL financial data according to the schema provided.
      Your output MUST be valid JSON with ALL required fields populated. Only use the uploaded PDF documents 
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

    try {
      JSON.parse(finalResponse.content as string);
    } catch (e) {
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
    if (error instanceof Error && error.stack) {
      error.stack = error.stack
        .replace(/file:\/\/\//g, '')
        .replace(/\//g, '\\');
    }
    const errorResponse = await model.invoke([
      new SystemMessage(`There was an error processing the financial data from the uploaded PDF. 
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
        let windowsPath = importPath.replace(/^file:\/\/\//, '');
        windowsPath = windowsPath.replace(/file:/g, '');
        windowsPath = windowsPath.replace(/\//g, '\\');
        windowsPath = windowsPath.replace(/\\\\/g, '\\');
        return windowsPath;
      }
      return importPath;
    }
  }
});