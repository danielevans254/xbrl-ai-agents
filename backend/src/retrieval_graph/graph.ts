import { StateGraph, START, END } from '@langchain/langgraph';
import { AgentStateAnnotation } from './state.js';
import { makeRetriever } from '../shared/retrieval.js';
import { formatDocs } from './utils.js';
import { HumanMessage, SystemMessage } from '@langchain/core/messages';
import { z } from 'zod';
import {
  RESPONSE_SYSTEM_PROMPT,
  ROUTER_SYSTEM_PROMPT,
  STRUCTURED_EXTRACTION_PROMPT
} from './prompts.js';
import { RunnableConfig } from '@langchain/core/runnables';
import {
  AgentConfigurationAnnotation,
  ensureAgentConfiguration,
} from './configuration.js';
import { loadChatModel } from '../shared/utils.js';
import { ChatPromptTemplate } from '@langchain/core/prompts';

async function checkQueryType(
  state: typeof AgentStateAnnotation.State,
  config: RunnableConfig,
): Promise<{
  route: 'retrieve' | 'direct';
}> {
  // Schema for routing
  const schema = z.object({
    route: z.enum(['retrieve', 'direct']),
    reasoning: z.string().optional(),
  });

  const configuration = ensureAgentConfiguration(config);
  const model = await loadChatModel(configuration.queryModel);

  // Create a router prompt specifically for determining if the query requires retrieval
  const routerPrompt = ROUTER_SYSTEM_PROMPT

  const formattedPrompt = await routerPrompt.invoke({
    query: state.query,
  });

  const response = await model
    .withStructuredOutput(schema)
    .invoke(formattedPrompt.toString());

  const route = response.route;

  return { route };
}

async function answerQueryDirectly(
  state: typeof AgentStateAnnotation.State,
  config: RunnableConfig,
): Promise<typeof AgentStateAnnotation.Update> {
  const configuration = ensureAgentConfiguration(config);
  const model = await loadChatModel(configuration.queryModel);
  const userHumanMessage = new HumanMessage(state.query);

  const response = await model.invoke([userHumanMessage]);
  return { messages: [userHumanMessage, response] };
}

async function routeQuery(
  state: typeof AgentStateAnnotation.State,
): Promise<'retrieveDocuments' | 'directAnswer'> {
  const route = state.route;
  if (!route) {
    throw new Error('Route is not set');
  }

  if (route === 'retrieve') {
    return 'retrieveDocuments';
  } else if (route === 'direct') {
    return 'directAnswer';
  } else {
    throw new Error('Invalid route');
  }
}

async function retrieveDocuments(
  state: typeof AgentStateAnnotation.State,
  config: RunnableConfig,
): Promise<typeof AgentStateAnnotation.Update> {
  const retriever = await makeRetriever(config);
  const response = await retriever.invoke(state.query);

  return { documents: response };
}

async function generateResponse(
  state: typeof AgentStateAnnotation.State,
  config: RunnableConfig,
): Promise<typeof AgentStateAnnotation.Update> {
  const configuration = ensureAgentConfiguration(config);
  const context = formatDocs(state.documents);
  const model = await loadChatModel(configuration.queryModel);
  const userHumanMessage = new HumanMessage(state.query);

  // First, extract structured data from the documents using STRUCTURED_EXTRACTION_PROMPT
  const extractionPrompt = await STRUCTURED_EXTRACTION_PROMPT.invoke({
    context: context,
  });

  // Process the extraction prompt with a system message emphasizing completeness
  const systemMessage = new SystemMessage(
    `You are a financial data extraction assistant. Read and process the ENTIRE document, 
    ensuring NO information is missed or omitted. Extract ALL required financial information 
    and return it in valid JSON format as specified.`
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
    new SystemMessage(responsePrompt.toString()),
    userHumanMessage
  ]);
  return { messages: [userHumanMessage, finalResponse] };
}

const builder = new StateGraph(
  AgentStateAnnotation,
  AgentConfigurationAnnotation,
)
  .addNode('retrieveDocuments', retrieveDocuments)
  .addNode('generateResponse', generateResponse)
  .addNode('checkQueryType', checkQueryType)
  .addNode('directAnswer', answerQueryDirectly)
  .addEdge(START, 'checkQueryType')
  .addConditionalEdges('checkQueryType', routeQuery, [
    'retrieveDocuments',
    'directAnswer',
  ])
  .addEdge('retrieveDocuments', 'generateResponse')
  .addEdge('generateResponse', END)
  .addEdge('directAnswer', END);

export const graph = builder.compile().withConfig({
  runName: 'ComprehensiveFinancialDataExtractionGraph',
});