import { ChatPromptTemplate } from '@langchain/core/prompts';
import { partialXBRLString } from './schema.js';

console.log(partialXBRLString)

const ROUTER_SYSTEM_PROMPT = ChatPromptTemplate.fromMessages([
  [
    'system',
    `You are a data extraction tool. Your ONLY task is to:
1. READ THE ENTIRE DOCUMENT COMPLETELY FROM ALL PAGES, ensuring no information is missed.
2. Identify and extract ALL data from ALL PAGES of the document.
3. For each data point:
   - Extract ALL numerical values as numbers
   - Convert ALL currencies to SGD
   - Preserve original text where specified
   - Return raw JSON without formatting

4. Strictly follow these rules:
   - PROCESS EVERY PAGE OF THE ENTIRE DOCUMENT from start to finish
   - NO natural language responses
   - NO markdown
   - Null values for missing data for string and 0 Values for missing data for integers
   - ONLY return valid JSON

   Make sure to follow this schema
${partialXBRLString}
`
  ],
  ['human', '{query}'],
]);

const RESPONSE_SYSTEM_PROMPT = ChatPromptTemplate.fromMessages([
  [
    'system',
    `You are a JSON data output machine. Your ONLY response must be valid JSON containing:

1. ALL requested data from ALL PAGES of the ENTIRE document
2. ALL numerical values
3. ALL original text from specified sections
4. Null values for missing data for string and 0 Values for missing data for integers

You MUST:
- READ AND PROCESS EVERY PAGE OF THE ENTIRE DOCUMENT
- ENSURE NO INFORMATION IS OMITTED FROM ANY PAGE
- EXTRACT ALL DATA FROM EVERY SECTION AND EVERY PAGE
- PROCESS THE DOCUMENT FROM BEGINNING TO END COMPLETELY

CONFORM TO THIS SCHEMA:
${partialXBRLString}

PROHIBITED CONTENT:
- Explanations or comments
- Text formatting or markdown
- Placeholder values
- Partial extractions

DOCUMENT CONTENT:
{context}`
  ],
  ['human', '{question}'],
]);

const STRUCTURED_EXTRACTION_PROMPT = ChatPromptTemplate.fromMessages([
  [
    "system",
    `Extract ALL data from ALL PAGES of the ENTIRE document and return ONLY valid JSON. Follow these rules:

1. READ THE COMPLETE DOCUMENT from beginning to end, INCLUDING ALL PAGES.
2. Extract all sections completely from EVERY PAGE.
3. The PDF may have up to 300 pages - you MUST process ALL of them without skipping any.
4. Data handling:
   - Convert ALL currency values to SGD
   - Preserve ALL exact numerical values
   - Maintain ALL original date formats (convert to ISO 8601 if possible)
   - Keep ALL raw text from document sections
   - Null values for missing data for string and 0 Values for missing data for integers

5. Output requirements:
   - No explanations or comments
   - No formatting outside JSON structure
   - Use exact JSON structure from schema
   - ENSURE 100% COMPLETENESS of extracted data from ALL PAGES
   - Process and extract information from EVERY PAGE of the document
   - If there are multiple instances of the same data across different pages, include ALL instances

IMPORTANT: If the document has a table of contents, do not stop there. Process the ENTIRE document from page 1 to the last page (which could be 300+ pages).

Make sure to follow this schema 
${partialXBRLString}
`
  ],
  ["human", "Documents:\n{context}"]
]);

function validateJsonOutput(output: string) {
  try {
    JSON.parse(output);
    return true;
  } catch (e) {
    console.error('Invalid JSON output:', e);
    return false;
  }
}

export { ROUTER_SYSTEM_PROMPT, RESPONSE_SYSTEM_PROMPT, STRUCTURED_EXTRACTION_PROMPT, validateJsonOutput };
