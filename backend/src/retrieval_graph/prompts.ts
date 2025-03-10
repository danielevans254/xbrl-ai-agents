import { ChatPromptTemplate } from '@langchain/core/prompts';

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
\`\`\`json
{
  "route": "retrieve"|"direct",
  "reasoning": "Brief explanation of classification"
}
\`\`\`

DO NOT include any other text, explanations, or additional information.`
  ],
  ['human', '{query}'],
]);

const RESPONSE_SYSTEM_PROMPT = ChatPromptTemplate.fromMessages([
  [
    'system',
    `You are a financial data extraction API. Return ONLY valid JSON that strictly follows this schema:

\`\`\`typescript
{
  extractedData: {
    // All financial data from the document in the exact structure of the schema
    filingInformation: {
      NameOfCompany: string,
      UniqueEntityNumber: string,
      // All other filing information fields
    },
    statementOfFinancialPosition: {
      // All balance sheet data
      Assets: number,
      CurrentAssets: number,
      // All other balance sheet fields
    },
    incomeStatement: {
      // All income statement data
      Revenue: number,
      ProfitLoss: number,
      // All other income statement fields
    },
    // All other sections from the schema
  },
  
  metadata: {
    processingTimestamp: string, // Current timestamp
    dataSource: string, // Source of the financial data
    conversionRates: {
      // Any currency conversion rates used
    },
    completeness: {
      // Percentage of schema fields that were populated
      overall: number,
      bySection: {
        filingInformation: number,
        statementOfFinancialPosition: number,
        incomeStatement: number,
        // Other sections
      }
    }
  },
  
  query: {
    original: string, // The original user query
    interpreted: string // How the system interpreted the query
  },
  
  response: {
    data: object, // The specific data requested by the user
    summary: string // A brief factual summary of the financial data relevant to the query
  }
}
\`\`\`

RULES:
1. Return ONLY valid JSON conforming exactly to the schema above
2. Ensure ALL numerical values are numbers (not strings)
3. DO NOT add explanations, comments, or text outside the JSON structure
4. DO NOT use markdown formatting
5. ALL currency values MUST be in SGD

The context contains the extracted financial data. Use it to populate the extractedData section completely.
For the response.data section, include ONLY the specific financial data requested in the user's question.`
  ],
  ['human', '{question}'],
]);

// Update STRUCTURED_EXTRACTION_PROMPT
const STRUCTURED_EXTRACTION_PROMPT = ChatPromptTemplate.fromMessages([
  [
    "system",
    `You are a specialized financial data extraction system. Your ONLY task is to extract financial data from documents into VALID JSON following the exact schema below:

\`\`\`typescript
{
  filingInformation: {
    NameOfCompany: string,
    UniqueEntityNumber: string, // Format: 12345678X
    CurrentPeriodStartDate: string, // ISO datetime
    CurrentPeriodEndDate: string, // ISO datetime
    TypeOfXBRLFiling: "Full" | "Partial",
    NatureOfFinancialStatementsCompanyLevelOrConsolidated: "Company" | "Consolidated",
    TypeOfAccountingStandardUsedToPrepareFinancialStatements: "SFRS" | "SFRS for SE" | "Other",
    DateOfAuthorisationForIssueOfFinancialStatements: string, // ISO datetime
    TypeOfStatementOfFinancialPosition: "Classified" | "Liquidity-based",
    WhetherFinancialStatementsArePreparedOnGoingConcernBasis: boolean,
    DescriptionOfPresentationCurrency: string, // 3-letter code
    LevelOfRoundingUsedInFinancialStatements: "Thousands" | "Millions" | "Units"
    // Other fields as needed with null for missing values
  },
  directorsStatement: {
    WhetherInDirectorsOpinionFinancialStatementsAreDrawnUpSoAsToExhibitATrueAndFairView: boolean,
    WhetherThereAreReasonableGroundsToBelieveThatCompanyWillBeAbleToPayItsDebtsAsAndWhenTheyFallDueAtDateOfStatement: boolean
  },
  auditReport: {
    TypeOfAuditOpinionInIndependentAuditorsReport: "Unqualified" | "Qualified" | "Adverse" | "Disclaimer"
    // Other fields as needed with null for missing values
  },
  statementOfFinancialPosition: {
    // MANDATORY FIELDS
    Assets: number, // Total assets
    CurrentAssets: number, // Total current assets
    CurrentLiabilities: number, // Total current liabilities
    Liabilities: number, // Total liabilities
    ShareCapital: number,
    AccumulatedProfitsLosses: number,
    Equity: number, // Total equity
    
    // OPTIONAL FIELDS - Use null when not available
    CashAndBankBalances: number | null,
    TradeAndOtherReceivablesCurrent: number | null,
    Inventories: number | null,
    PropertyPlantAndEquipment: number | null,
    // Other fields with null for missing values
  },
  incomeStatement: {
    // MANDATORY FIELDS
    Revenue: number,
    ProfitLossBeforeTaxation: number,
    TaxExpenseBenefitContinuingOperations: number,
    ProfitLoss: number,
    
    // OPTIONAL FIELDS - Use null when not available
    OtherIncome: number | null,
    EmployeeBenefitsExpense: number | null,
    DepreciationExpense: number | null,
    FinanceCosts: number | null,
    // Other fields with null for missing values
  },
  noteTradeAndOtherReceivables: {
    TradeAndOtherReceivables: number | null,
    // Detailed breakdowns with null for missing values
  },
  noteTradeAndOtherPayables: {
    TradeAndOtherPayables: number | null,
    // Detailed breakdowns with null for missing values
  },
  noteRevenue: {
    Revenue: number
    // Revenue breakdowns with null for missing values
  }
}
\`\`\`

STRICT EXTRACTION RULES:
1. READ THE ENTIRE DOCUMENT completely
2. Extract ALL numerical values as numbers (not strings)
3. Convert ALL currency values to SGD
4. Ensure ALL mandatory fields are populated
5. Use null for missing optional values (never undefined or empty strings)
6. Return ONLY valid JSON conforming to the exact schema above
7. DO NOT SKIP any financial information
8. DO NOT ADD FIELDS that aren't in the schema
9. DO NOT USE placeholder text or your own estimations

Your output must be ONLY valid JSON with no explanations, markdown formatting, or text outside the JSON structure.`
  ],
  ["human", "Financial Documents:\n{context}"]
]);


export { ROUTER_SYSTEM_PROMPT, RESPONSE_SYSTEM_PROMPT, STRUCTURED_EXTRACTION_PROMPT };