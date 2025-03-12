import { ChatPromptTemplate } from '@langchain/core/prompts';
import { PartialXBRLSchema } from './schema.js';

// Use the schema object (NOT the type) to generate a description
const schemaDescription = JSON.stringify(PartialXBRLSchema.shape, (key, value) => {
  if (value && typeof value === 'object' && '_def' in value) {
    // For Zod types, return a simplified description
    if (value._def.typeName === 'ZodObject') {
      return '[Object]';
    } else if (value._def.typeName === 'ZodNumber') {
      return value._def.typeName === 'ZodOptional' || value.isOptional?.() ? 'number?' : 'number';
    } else if (value._def.typeName === 'ZodString') {
      return value._def.typeName === 'ZodOptional' || value.isOptional?.() ? 'string?' : 'string';
    } else if (value._def.typeName === 'ZodBoolean') {
      return value._def.typeName === 'ZodOptional' || value.isOptional?.() ? 'boolean?' : 'boolean';
    } else if (value._def.typeName === 'ZodEnum') {
      return value._def.typeName === 'ZodOptional' || value.isOptional?.() ?
        `[${value._def.values.join('|')}]?` :
        `[${value._def.values.join('|')}]`;
    } else if (value._def.typeName === 'ZodOptional') {
      // Handle optional types by checking their inner type
      if (value._def.innerType?._def) {
        const innerType = value._def.innerType._def.typeName;
        if (innerType === 'ZodString') return 'string?';
        if (innerType === 'ZodNumber') return 'number?';
        if (innerType === 'ZodBoolean') return 'boolean?';
        if (innerType === 'ZodEnum') {
          return `[${value._def.innerType._def.values.join('|')}]?`;
        }
        return `${innerType}?`;
      }
      return 'optional';
    }
    return value._def.typeName;
  }
  return value;
}, 2);

// Create a simplified schema structure that highlights mandatory fields
function extractFieldRequirements(schema) {
  const requirements = {};

  if (!schema || !schema.shape) {
    return requirements;
  }

  Object.entries(schema.shape).forEach(([sectionName, section]) => {
    if (section && section._def?.typeName === 'ZodObject' && section.shape) {
      requirements[sectionName] = {
        mandatory: [],
        optional: []
      };

      Object.entries(section.shape).forEach(([fieldName, field]) => {
        // Skip fields that are marked as Abstract
        if (fieldName.includes('Abstract')) return;

        // Check if field is optional (either directly or via ZodOptional wrapper)
        const isOptional = field._def?.typeName === 'ZodOptional' || field.isOptional?.();

        if (isOptional) {
          requirements[sectionName].optional.push(fieldName);
        } else {
          requirements[sectionName].mandatory.push(fieldName);
        }
      });
    } else if (section && section._def?.typeName === 'ZodOptional' &&
      section._def.innerType?._def?.typeName === 'ZodObject' &&
      section._def.innerType.shape) {
      // Handle optional objects
      requirements[sectionName] = {
        mandatory: [],
        optional: []
      };

      Object.entries(section._def.innerType.shape).forEach(([fieldName]) => {
        if (fieldName.includes('Abstract')) return;

        // All fields in an optional section are technically optional
        requirements[sectionName].optional.push(fieldName);
      });
    }
  });

  return requirements;
}

const fieldRequirements = extractFieldRequirements(PartialXBRLSchema);
const fieldRequirementsString = JSON.stringify(fieldRequirements, null, 2);

const ROUTER_SYSTEM_PROMPT = ChatPromptTemplate.fromMessages([
  [
    'system',
    `You are a financial query classifier. Your ONLY task is to determine if a query requires document retrieval to extract financial data, or if it can be answered directly.

CLASSIFY THE QUERY INTO ONE OF THESE CATEGORIES:
1. "retrieve" - If the query mentions any of these patterns:
   - Specific financial metrics (revenue, profit, assets, etc.)
   - Company financial information
   - Financial statements or reports
   - Financial data for specific time periods
   - Comparison of financial metrics
   - Analysis of financial performance
   - Extraction of financial data
   - Any mention of financial documents

2. "direct" - If the query:
   - Asks for general information about financial concepts
   - Requests explanations of financial terms
   - Asks how to interpret financial data
   - Needs help with financial calculations
   - Doesn't require specific company financial data

Return ONLY valid JSON in this exact format:
{
  "route": "retrieve"|"direct",
  "reasoning": "Brief explanation of classification"
}

DO NOT include any other text, explanations, or additional information.`
  ],
  ['human', '{query}'],
]);

const RESPONSE_SYSTEM_PROMPT = ChatPromptTemplate.fromMessages([
  [
    'system',
    `You are a financial data extraction API. Return ONLY valid JSON that follows the schema from our financial data system.

The schema includes:
- extractedData (containing all the financial information structured according to our schema)
- metadata (processing information, data sources, completeness metrics)
- query information
- response data specifically addressing the user's question

RULES:
1. Return ONLY valid JSON conforming to the expected schema
2. Ensure ALL numerical values are numbers (not strings)
3. DO NOT add explanations, comments, or text outside the JSON structure
4. DO NOT use markdown formatting
5. ALL currency values MUST be in SGD

The context contains the extracted financial data. Use it to populate the extractedData section completely.
For the response.data section, include ONLY the specific financial data requested in the user's question.`
  ],
  ['human', '{question}\n\nContext:\n{context}'],
]);

// Create a template for the extraction prompt that accepts the mandatoryFields as a parameter
const STRUCTURED_EXTRACTION_PROMPT = ChatPromptTemplate.fromMessages([
  [
    "system",
    `You are a specialized financial data extraction system. Your ONLY task is to extract financial data from documents into VALID JSON following the exact schema structure.

The schema consists of these main sections:
- filingInformation: Basic details about the company and filing
- directorsStatement: Information from the directors' statement
- auditReport: Details from the independent auditors' report
- statementOfFinancialPosition: Balance sheet information (assets, liabilities, equity)
- incomeStatement: Profit and loss information
- noteTradeAndOtherReceivables: Details about receivables
- noteTradeAndOtherPayables: Details about payables
- noteRevenue: Breakdown of revenue sources

MANDATORY FIELDS (must be populated):
{mandatoryFields}

STRICT EXTRACTION RULES:
1. READ THE ENTIRE DOCUMENT completely
2. Extract ALL numerical values as numbers (not strings)
3. Convert ALL currency values to SGD
4. Ensure ALL mandatory fields are populated
5. Use null for missing optional values (never undefined or empty strings)
6. Return ONLY valid JSON conforming to the schema
7. DO NOT SKIP any financial information
8. DO NOT ADD FIELDS that aren't in the schema
9. DO NOT USE placeholder text or your own estimations

Your output must be ONLY valid JSON with no explanations, markdown formatting, or text outside the JSON structure.`
  ],
  ["human", "Financial Documents:\n{context}"]
]);

export {
  ROUTER_SYSTEM_PROMPT,
  RESPONSE_SYSTEM_PROMPT,
  STRUCTURED_EXTRACTION_PROMPT,
  fieldRequirementsString
};