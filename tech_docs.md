# Financial Data Extraction System: Technical Documentation

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [System Components](#system-components)
3. [Processing Pipeline](#processing-pipeline)
4. [API Reference](#api-reference)
5. [Database Schema](#database-schema)
6. [Environment Setup](#environment-setup)
7. [System Behaviors](#system-behaviors)

## Architecture Overview

The system is built on a microservices architecture with Next.js-based API routes handling backend functionality and React-based frontend. The application uses LangGraph for AI workflow orchestration and Supabase for data storage.

### Technology Stack

- **Frontend**: Next.js 14.2, React 18, Tailwind CSS
- **Backend**: Next.js API routes, TypeScript
- **AI Framework**: LangGraph 0.2.41, LangChain Core 0.3.32
- **Vector Database**: Supabase with pgvector extension
- **AI Models**: OpenAI models (GPT-4o default)
- **Document Processing**: PDF.js, pdf-parse (Not Fully Implemented)
- **Database**: PostgreSQL (via Supabase)

### Environment Dependencies

```
OPENAI_API_KEY=""
SUPABASE_URL=""
SUPABASE_SERVICE_ROLE_KEY=""
LANGGRAPH_INGESTION_ASSISTANT_ID=""
LANGGRAPH_RETRIEVAL_ASSISTANT_ID=""
DATABASE_URL=""
DIRECT_URL=""
```

## System Components

### 1. PDF Ingestion Module

Handles PDF upload, parsing, and chunking for AI processing.

**Key Files:**
- `api/ingest/route.ts` - Main ingestion API endpoint
- `pdf.ts` - PDF processing utilities

**Implementation Details:**
```typescript
// From pdf.ts
export async function processPDF(file: File): Promise<Document[]> {
  const buffer = await bufferFile(file);
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'pdf-'));
  const tempFilePath = path.join(tempDir, file.name);

  try {
    await fs.writeFile(tempFilePath, buffer);
    const loader = new PDFLoader(tempFilePath);
    const pdfId = uuidv4();
    const processedAt = new Date().toISOString();

    const docs = await loader.load();
    docs.forEach((doc) => {
      doc.metadata.filename = file.name;
      doc.metadata.pdfId = pdfId;
      doc.metadata.processedAt = processedAt;
    });

    return docs;
  } finally {
    await fs.unlink(tempFilePath).catch((err) => console.error('Error deleting temp file:', err));
    await fs.rmdir(tempDir).catch((err) => console.error('Error deleting temp dir:', err));
  }
}
```

### 2. LangGraph Processing Engine

Orchestrates AI-powered extraction workflow with state management.

**Key Files:**
- `retrieval_graph/graph.ts` - Main graph definition
- `retrieval_graph/prompts.ts` - AI prompt templates
- `retrieval_graph/schema.ts` - Schema definition

**Core Functions:**
```typescript
// From retrieval_graph/graph.ts
async function retrieveDocuments(
  state: typeof AgentStateAnnotation.State,
  config: RunnableConfig,
): Promise<typeof AgentStateAnnotation.Update> {
  const retriever = await makeRetriever(config);

  // Custom retriever for PDF documents
  const customRetriever = {
    invoke: async (query: string) => {
      const allDocs = await retriever.invoke(query);
      const pdfDocs = allDocs.filter(doc =>
        doc.metadata && (doc.metadata.isUploadedPdf === true ||
          (doc.metadata.source &&
            typeof doc.metadata.source === 'string' &&
            doc.metadata.source.toLowerCase().endsWith('.pdf')))
      );
      return pdfDocs.length === 0 ? [] : pdfDocs;
    }
  };

  const response = await customRetriever.invoke(state.query);
  return { documents: response };
}

async function generateResponse(
  state: typeof AgentStateAnnotation.State,
  config: RunnableConfig,
): Promise<typeof AgentStateAnnotation.Update> {
  // Implementation details...
}
```

### 3. Vector Store Integration

Handles document embeddings and similarity search.

**Key Files:**
- `shared/retrieval.ts` - Retriever implementations
- `shared/configuration.ts` - Retrieval configuration

**Implementation Details:**
```typescript
export class AllChunksRetriever extends VectorStoreRetriever<SupabaseVectorStore> {
  constructor(
    vectorStore: SupabaseVectorStore,
    filter?: SupabaseVectorStore['FilterType'],
    private batchSize: number = 40
  ) {
    super({
      vectorStore,
      k: 100,
      filter,
      searchType: 'similarity',
    });
  }

  async _getRelevantDocuments(_query: string): Promise<Document[]> {
    try {
      const { data, error } = await this.vectorStore.client.rpc('match_documents', {
        query_embedding: null,
        match_count: null,
        filter: this.filter,
      });
      
      if (error) throw new Error(`Supabase RPC error: ${error.message}`);
      if (!data || data.length === 0) return [];

      const cleanedDocs = data.map((doc: { [x: string]: any; embedding: any; }) => {
        const { embedding, ...docWithoutEmbedding } = doc;
        return docWithoutEmbedding as Document;
      });

      return cleanedDocs;
    } catch (error) {
      console.error("Error retrieving documents:", error);
      throw error;
    }
  }

  async getDocumentsInBatches(query: string, batchProcessor: (formattedDocs: string) => Promise<any>): Promise<any[]> {
    const allDocs = await this._getRelevantDocuments(query);
    return processDocumentsInBatches(
      allDocs,
      async (batch) => {
        const formattedBatch = formatDocs(batch);
        return await batchProcessor(formattedBatch);
      },
      this.batchSize
    );
  }
}
```

### 4. Session State Tracker

Manages the processing state through the pipeline.

**Key Files:**
- `api/session/create` - Session creation endpoint
- `api/session/update` - Session status update endpoint

**State Transitions:**
```
uploading → upload_complete → extracting → extracting_complete → 
mapping → mapping_complete → validating → validation_complete → 
tagging → tagging_complete → generating → generation_complete
```

### 5. Data Mapping Module

Maps extracted data to XBRL schema.

**Key Files:**
- `api/map/route.ts` - Main mapping endpoint
- `api/map/fetch/[uuid]/route.ts` - Data fetching endpoint
- `api/map/update/[uuid]/route.ts` - Data update endpoint

### 6. Validation Module

Validates mapped data against business rules.

**Key Files:**
- `api/validate/route.ts` - Validation endpoint

### 7. XBRL Tagging Module

Applies XBRL tags to validated data.

**Key Files:**
- `api/tag/route.ts` - Main tagging endpoint
- `api/tag/status/[taskId]/route.ts` - Status checking endpoint
- `api/tag/[documentId]/route.ts` - Tagged document retrieval

## Processing Pipeline

### Pipeline Flow

1. **PDF Upload** → `api/ingest.ts`
2. **Document Chunking** → `pdf.ts`
3. **Vector Storage** → `shared/retrieval.ts`
4. **AI Extraction** → `retrieval_graph/graph.ts`
5. **Data Mapping** → `api/map/route.ts`
6. **Validation** → `api/validate/route.ts`
7. **XBRL Tagging** → `api/tag/route.ts`

### Thread & Session Management

Each document processing creates:
- A document ID in the `documents` table
- A thread ID via LangGraph
- A session ID in the `session_thread` table

The session state tracks progress through each pipeline stage. Each API component updates the session state.

# API Reference

## 1. Ingestion API

The Ingestion API enables you to upload PDF financial documents for processing and data extraction.



### Endpoint Details

**Endpoint**: `/api/ingest`  
**Method**: POST  
**Content-Type**: multipart/form-data  
**Max File Size**: 10MB

### Request Parameters

* **files** `File` (required)  
  The PDF file to upload and process. Only one file is accepted per request.

### Returns

A JSON object containing:

* **message** `string`  
  A success message confirming document ingestion.

* **sessionId** `string`  
  A unique session identifier for tracking the processing.

* **threadId** `string`  
  A unique thread identifier for the processing job.

* **documentId** `string`  
  A unique identifier for the document.

* **documentsProcessed** `integer`  
  The number of document chunks processed.

* **structuredData** `object` (optional)  
  Initial structured data if extraction was successful.

### Response Example

```json
{
  "message": "Documents ingested successfully",
  "sessionId": "c4a760a8-10a3-4446-8251-91dea9f3b238",
  "threadId": "thread_abc123",
  "documentId": "550e8400-e29b-41d4-a716-446655440000",
  "documentsProcessed": 24
}
```

### Error Codes

* **400** - Invalid file type or missing files
* **413** - File too large (exceeds 10MB limit)
* **422** - No documents extracted from the PDF
* **500** - Server or processing error

## 2. Extraction API

The Extraction API retrieves structured financial data that has been extracted from processed PDF documents.



### The Extracted Data Object

#### Attributes

* **threadId** `string`  
  Identifier linking the data to its processing thread.

* **data** `object`  
  The extracted financial data in XBRL-compatible format.

* **pdfId** `string` (optional)  
  Identifier of the source PDF document, formatted as a UUID.
  
* **createdAt** `timestamp`  
  Time when the data record was first created.

* **updatedAt** `timestamp`  
  Time when the data record was last updated.

### Endpoint Details

**Endpoint**: `/api/extract`  
**Method**: GET

### Request Parameters

* **threadId** `string` (required)  
  The thread identifier to retrieve data for.

### Returns

A JSON object containing:

* **success** `boolean`  
  Whether the request was successful.

* **data** `array`  
  An array of extracted data objects.

### Response Example

```json
{
  "success": true,
  "data": [
    {
      "threadId": "thread_abc123",
      "data": {
        "filingInformation": {
          "NameOfCompany": "Example Corp",
          "UniqueEntityNumber": "123456789X",
          "CurrentPeriodStartDate": "2024-01-01",
          "CurrentPeriodEndDate": "2024-12-31"
        },
        "statementOfFinancialPosition": {
          "Assets": 1500000,
          "Liabilities": 900000,
          "equity": {
            "Equity": 600000
          }
        },
        "incomeStatement": {
          "Revenue": 2500000,
          "ProfitLoss": 350000
        }
      },
      "pdfId": "550e8400-e29b-41d4-a716-446655440000",
      "createdAt": "2025-04-15T08:30:45Z",
      "updatedAt": "2025-04-15T08:30:45Z"
    }
  ]
}
```

### Error Codes

* **400** - Missing thread ID
* **500** - Database error
* **504** - Request timeout

## 3. Extraction Update API

The Extraction Update API allows you to create or update extracted financial data for a specific thread.



### Endpoint Details

**Endpoint**: `/api/extract`  
**Method**: POST  
**Content-Type**: application/json  
**Max Payload Size**: 1MB

### Request Parameters

* **threadId** `string` (required)  
  The thread identifier to associate with this data.

* **data** `object` (required)  
  The extracted financial data to store.

* **pdfId** `string` (optional)  
  The PDF document identifier this data was extracted from.

### Request Example

```json
{
  "threadId": "thread_abc123",
  "data": {
    "filingInformation": {
      "NameOfCompany": "Example Corp",
      "UniqueEntityNumber": "123456789X",
      "CurrentPeriodStartDate": "2024-01-01",
      "CurrentPeriodEndDate": "2024-12-31"
    },
    "statementOfFinancialPosition": {
      "Assets": 1500000,
      "Liabilities": 900000,
      "equity": {
        "Equity": 600000
      }
    },
    "incomeStatement": {
      "Revenue": 2500000,
      "ProfitLoss": 350000
    }
  },
  "pdfId": "550e8400-e29b-41d4-a716-446655440000"
}
```

### Returns

A JSON object containing:

* **success** `boolean`  
  Whether the request was successful.

* **data** `array`  
  The upserted data record(s).

### Response Example

```json
{
  "success": true,
  "data": [
    {
      "id": "7f9c24e0-3f70-4b9a-8aac-8edb7574bd3a",
      "thread_id": "thread_abc123",
      "pdf_id": "550e8400-e29b-41d4-a716-446655440000",
      "data": {
        "filingInformation": {
          "NameOfCompany": "Example Corp",
          "UniqueEntityNumber": "123456789X",
          "CurrentPeriodStartDate": "2024-01-01",
          "CurrentPeriodEndDate": "2024-12-31"
        },
        "statementOfFinancialPosition": {
          "Assets": 1500000,
          "Liabilities": 900000,
          "equity": {
            "Equity": 600000
          }
        },
        "incomeStatement": {
          "Revenue": 2500000,
          "ProfitLoss": 350000
        }
      },
      "created_at": "2025-04-15T08:30:45Z",
      "updated_at": "2025-04-15T08:30:45Z"
    }
  ]
}
```

### Error Codes

* **400** - Invalid request body or JSON payload
* **413** - Data payload too large (exceeds 1MB)
* **500** - Database operation failed
* **504** - Request timeout

## 4. Mapping API

The Mapping API transforms extracted raw financial data into standardized XBRL format based on Singapore Financial Reporting Standards.

### Endpoint Details

**Endpoint**: `/api/map`  
**Method**: GET

### Request Parameters

* **threadId** `string` (required)  
  The thread identifier with extracted data to map.

### Returns

A JSON object containing:

* **success** `boolean`  
  Whether the mapping was successful.

* **data** `object`  
  The mapped XBRL data with document ID.

* **showToast** `boolean`  
  Whether to show a notification toast.

* **toastType** `string`  
  The type of toast notification (success, error, info).

* **toastTitle** `string`  
  The toast notification title.

* **toastMessage** `string`  
  The toast notification message.

### Response Example

```json
{
  "success": true,
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "filingInformation": {
      "NameOfCompany": "Example Corp",
      "UniqueEntityNumber": "123456789X",
      "CurrentPeriodStartDate": "2024-01-01",
      "CurrentPeriodEndDate": "2024-12-31",
      "DescriptionOfPresentationCurrency": "SGD"
    },
    "statementOfFinancialPosition": {
      "currentAssets": {
        "CashAndBankBalances": 250000,
        "CurrentAssets": 450000
      },
      "nonCurrentAssets": {
        "PropertyPlantAndEquipment": 1050000,
        "NoncurrentAssets": 1050000
      },
      "Assets": 1500000,
      "currentLiabilities": {
        "TradeAndOtherPayablesCurrent": 200000,
        "CurrentLiabilities": 300000
      },
      "nonCurrentLiabilities": {
        "NoncurrentLoansAndBorrowings": 600000,
        "NoncurrentLiabilities": 600000
      },
      "Liabilities": 900000,
      "equity": {
        "ShareCapital": 400000,
        "AccumulatedProfitsLosses": 200000,
        "Equity": 600000
      }
    },
    "incomeStatement": {
      "Revenue": 2500000,
      "ProfitLoss": 350000,
      "ProfitLossAttributableToOwnersOfCompany": 350000
    }
  },
  "showToast": true,
  "toastType": "success",
  "toastTitle": "Success",
  "toastMessage": "Financial data mapping completed successfully"
}
```

### Error Codes

* **400** - Missing thread ID parameter
* **502** - Error communicating with mapping service
* **504** - Mapping service timeout

## 5. Map Update API

The Map Update API allows you to modify mapped financial data for a specific document.


### Endpoint Details

**Endpoint**: `/api/map/update/[uuid]`  
**Method**: PUT  
**Content-Type**: application/json

### Path Parameters

* **uuid** `string` (required)  
  The document UUID to update.

### Request Parameters

* **mapped_data** `object` (required)  
  The updated XBRL financial data.

### Request Example

```json
{
    "mapped_data": {
        "id": "20d3a414-d469-4841-8fb7-50d8c418a124",
        "filing_information": {
            "company_name": "Automa8e Technologies Pte. Ltd.",
            "unique_entity_number": "20211234B",
            "current_period_start": "2023-01-01",
            "current_period_end": "2023-12-31",
            "prior_period_start": null,
            "xbrl_filing_type": "Full",
            "financial_statement_type": "Company",
            "accounting_standard": "IFRS",
            "authorisation_date": "2023-11-11",
            "financial_position_type": "Classified",
            "is_going_concern": true,
            "has_comparative_changes": false,
            "presentation_currency": "SGD",
            "functional_currency": "SGD",
            "rounding_level": "Thousands",
            "entity_operations_description": "01421 Poultry breeding/hatcheries",
            "principal_place_of_business": "N/A",
            "has_more_than_50_employees": false,
            "parent_entity_name": null,
            "ultimate_parent_name": null,
            "taxonomy_version": "2022.2",
            "xbrl_software": "N/A",
            "xbrl_preparation_method": "Automated"
        },
        "directors_statement": {
            "directors_opinion_true_fair_view": true,
            "reasonable_grounds_company_debts": true
        },
        "audit_report": {
            "audit_opinion": "Unqualified",
            "auditing_standards": null,
            "material_uncertainty_going_concern": null,
            "proper_accounting_records": null
        },
        "statement_of_financial_position": {
            "current_assets": {
                "cash_and_bank_balances": 151819470.0,
                "trade_and_other_receivables": 168920988.0,
                "current_finance_lease_receivables": 0.0,
                "current_derivative_financial_assets": 0.0,
                "current_financial_assets_at_fair_value": 0.0,
                "other_current_financial_assets": 1711486.0,
                "development_properties": 0.0,
                "inventories": 0.0,
                "other_current_nonfinancial_assets": 0.0,
                "held_for_sale_assets": 0.0,
                "total_current_assets": 10751943.0
            },
            "noncurrent_assets": {
                "trade_and_other_receivables": 0.0,
                "noncurrent_finance_lease_receivables": 0.0,
                "noncurrent_derivative_financial_assets": 0.0,
                "noncurrent_financial_assets_at_fair_value": 0.0,
                "other_noncurrent_financial_assets": 0.0,
                "property_plant_equipment": 202077.0,
                "investment_properties": 18462236.0,
                "goodwill": 0.0,
                "intangible_assets": 763169.0,
                "investments_in_entities": 0.0,
                "deferred_tax_assets": 0.0,
                "other_noncurrent_nonfinancial_assets": 0.0,
                "total_noncurrent_assets": 1434534.0
            },
            "current_liabilities": {
                "trade_and_other_payables": 13991532.0,
                "current_loans_and_borrowings": 1866171.0,
                "current_financial_liabilities_at_fair_value": 0.0,
                "current_finance_lease_liabilities": 1861290.0,
                "other_current_financial_liabilities": 0.0,
                "current_income_tax_liabilities": 1497071.0,
                "current_provisions": 232448.0,
                "other_current_nonfinancial_liabilities": 20889.0,
                "liabilities_held_for_sale": 0.0,
                "total_current_liabilities": 9469401.0
            },
            "noncurrent_liabilities": {
                "trade_and_other_payables": 0.0,
                "noncurrent_loans_and_borrowings": 3266237.0,
                "noncurrent_financial_liabilities_at_fair_value": 0.0,
                "noncurrent_finance_lease_liabilities": 408005.0,
                "other_noncurrent_financial_liabilities": 0.0,
                "deferred_tax_liabilities": 0.0,
                "noncurrent_provisions": 0.0,
                "other_noncurrent_nonfinancial_liabilities": 0.0,
                "total_noncurrent_liabilities": 3674242.0
            },
            "equity": {
                "share_capital": 2000.0,
                "treasury_shares": 0.0,
                "accumulated_profits_losses": -959165.0,
                "other_reserves": 0.0,
                "noncontrolling_interests": 0.0,
                "total_equity": -957165.0
            },
            "total_assets": 12186477.0,
            "total_liabilities": 13143642.0
        },
        "income_statement": {
            "revenue": 3249989.0,
            "other_income": 52778718.0,
            "employee_expenses": 4000.0,
            "depreciation_expense": 73584.0,
            "amortisation_expense": 185123.0,
            "repairs_and_maintenance_expense": 0.0,
            "sales_and_marketing_expense": 0.0,
            "other_expenses_by_nature": 632646.0,
            "other_gains_losses": 0.0,
            "finance_costs": 296616.0,
            "share_of_profit_loss_of_associates_and_joint_ventures_accounted_for_using_equity_method": 0.0,
            "profit_loss_before_taxation": 1798276.0,
            "tax_expense_benefit_continuing_operations": 1016255.0,
            "profit_loss_from_discontinued_operations": 0.0,
            "profit_loss": 782022.0,
            "profit_loss_attributable_to_owners_of_company": 782022.0,
            "profit_loss_attributable_to_noncontrolling_interests": 0.0
        },
        "statement_of_cash_flows": {
            "cash_flows_from_used_in_operating_activities": 38799.0,
            "cash_flows_from_used_in_investing_activities": 0.0,
            "cash_flows_from_used_in_financing_activities": 1169141.0
        },
        "statement_of_changes_in_equity": {
            "share_capital_at_beginning": 0.0,
            "treasury_shares_at_beginning": 0.0,
            "accumulated_profits_losses_at_beginning": -1740826.0,
            "other_reserves_at_beginning": 0.0,
            "noncontrolling_interests_at_beginning": 0.0,
            "total_equity_at_beginning": -1740826.0,
            "issue_of_share_capital": 2000.0,
            "purchase_of_treasury_shares": 0.0,
            "profit_loss_for_period": 782022.0,
            "other_comprehensive_income": 0.0,
            "total_comprehensive_income": 782022.0,
            "dividends_declared": 0.0,
            "transfers_to_from_reserves": 0.0,
            "changes_in_noncontrolling_interests": 0.0,
            "share_capital_at_end": 2000.0,
            "treasury_shares_at_end": 0.0,
            "accumulated_profits_losses_at_end": -959165.0,
            "other_reserves_at_end": 0.0,
            "noncontrolling_interests_at_end": 0.0,
            "total_equity_at_end": -957165.0
        },
        "notes": {
            "trade_and_other_receivables": {
                "receivables_from_third_parties": 0.0,
                "receivables_from_related_parties": 0.0,
                "unbilled_receivables": 0.0,
                "other_receivables": 0.0,
                "total_trade_and_other_receivables": 168920988.0
            },
            "trade_and_other_payables": {
                "payables_to_third_parties": 0.0,
                "payables_to_related_parties": 0.0,
                "deferred_income": 0.0,
                "other_payables": 0.0,
                "total_trade_and_other_payables": 13991532.0
            },
            "revenue": {
                "revenue_from_property_point_in_time": 0.0,
                "revenue_from_goods_point_in_time": 0.0,
                "revenue_from_services_point_in_time": 0.0,
                "revenue_from_property_over_time": 0.0,
                "revenue_from_construction_over_time": 0.0,
                "revenue_from_services_over_time": 0.0,
                "other_revenue": 0.0,
                "total_revenue": 3249989.0
            }
        }
    }
}
```

### Returns

A JSON object containing:

* **success** `boolean`  
  Whether the update was successful.

* **data** `object`  
  The updated data record.

* **showToast** `boolean`  
  Whether to show a notification toast.

* **toastType** `string`  
  The type of toast notification.

* **toastTitle** `string`  
  The toast notification title.

* **toastMessage** `string`  
  The toast notification message.

### Response Example

```json
{
  "success": true,
{
    "mapped_data": {
        "id": "20d3a414-d469-4841-8fb7-50d8c418a124",
        "filing_information": {
            "company_name": "Automa8e Technologies Pte. Ltd.",
            "unique_entity_number": "20211234B",
            "current_period_start": "2023-01-01",
            "current_period_end": "2023-12-31",
            "prior_period_start": null,
            "xbrl_filing_type": "Full",
            "financial_statement_type": "Company",
            "accounting_standard": "IFRS",
            "authorisation_date": "2023-11-11",
            "financial_position_type": "Classified",
            "is_going_concern": true,
            "has_comparative_changes": false,
            "presentation_currency": "SGD",
            "functional_currency": "SGD",
            "rounding_level": "Thousands",
            "entity_operations_description": "01421 Poultry breeding/hatcheries",
            "principal_place_of_business": "N/A",
            "has_more_than_50_employees": false,
            "parent_entity_name": null,
            "ultimate_parent_name": null,
            "taxonomy_version": "2022.2",
            "xbrl_software": "N/A",
            "xbrl_preparation_method": "Automated"
        },
        "directors_statement": {
            "directors_opinion_true_fair_view": true,
            "reasonable_grounds_company_debts": true
        },
        "audit_report": {
            "audit_opinion": "Unqualified",
            "auditing_standards": null,
            "material_uncertainty_going_concern": null,
            "proper_accounting_records": null
        },
        "statement_of_financial_position": {
            "current_assets": {
                "cash_and_bank_balances": 151819470.0,
                "trade_and_other_receivables": 168920988.0,
                "current_finance_lease_receivables": 0.0,
                "current_derivative_financial_assets": 0.0,
                "current_financial_assets_at_fair_value": 0.0,
                "other_current_financial_assets": 1711486.0,
                "development_properties": 0.0,
                "inventories": 0.0,
                "other_current_nonfinancial_assets": 0.0,
                "held_for_sale_assets": 0.0,
                "total_current_assets": 10751943.0
            },
            "noncurrent_assets": {
                "trade_and_other_receivables": 0.0,
                "noncurrent_finance_lease_receivables": 0.0,
                "noncurrent_derivative_financial_assets": 0.0,
                "noncurrent_financial_assets_at_fair_value": 0.0,
                "other_noncurrent_financial_assets": 0.0,
                "property_plant_equipment": 202077.0,
                "investment_properties": 18462236.0,
                "goodwill": 0.0,
                "intangible_assets": 763169.0,
                "investments_in_entities": 0.0,
                "deferred_tax_assets": 0.0,
                "other_noncurrent_nonfinancial_assets": 0.0,
                "total_noncurrent_assets": 1434534.0
            },
            "current_liabilities": {
                "trade_and_other_payables": 13991532.0,
                "current_loans_and_borrowings": 1866171.0,
                "current_financial_liabilities_at_fair_value": 0.0,
                "current_finance_lease_liabilities": 1861290.0,
                "other_current_financial_liabilities": 0.0,
                "current_income_tax_liabilities": 1497071.0,
                "current_provisions": 232448.0,
                "other_current_nonfinancial_liabilities": 20889.0,
                "liabilities_held_for_sale": 0.0,
                "total_current_liabilities": 9469401.0
            },
            "noncurrent_liabilities": {
                "trade_and_other_payables": 0.0,
                "noncurrent_loans_and_borrowings": 3266237.0,
                "noncurrent_financial_liabilities_at_fair_value": 0.0,
                "noncurrent_finance_lease_liabilities": 408005.0,
                "other_noncurrent_financial_liabilities": 0.0,
                "deferred_tax_liabilities": 0.0,
                "noncurrent_provisions": 0.0,
                "other_noncurrent_nonfinancial_liabilities": 0.0,
                "total_noncurrent_liabilities": 3674242.0
            },
            "equity": {
                "share_capital": 2000.0,
                "treasury_shares": 0.0,
                "accumulated_profits_losses": -959165.0,
                "other_reserves": 0.0,
                "noncontrolling_interests": 0.0,
                "total_equity": -957165.0
            },
            "total_assets": 12186477.0,
            "total_liabilities": 13143642.0
        },
        "income_statement": {
            "revenue": 3249989.0,
            "other_income": 52778718.0,
            "employee_expenses": 4000.0,
            "depreciation_expense": 73584.0,
            "amortisation_expense": 185123.0,
            "repairs_and_maintenance_expense": 0.0,
            "sales_and_marketing_expense": 0.0,
            "other_expenses_by_nature": 632646.0,
            "other_gains_losses": 0.0,
            "finance_costs": 296616.0,
            "share_of_profit_loss_of_associates_and_joint_ventures_accounted_for_using_equity_method": 0.0,
            "profit_loss_before_taxation": 1798276.0,
            "tax_expense_benefit_continuing_operations": 1016255.0,
            "profit_loss_from_discontinued_operations": 0.0,
            "profit_loss": 782022.0,
            "profit_loss_attributable_to_owners_of_company": 782022.0,
            "profit_loss_attributable_to_noncontrolling_interests": 0.0
        },
        "statement_of_cash_flows": {
            "cash_flows_from_used_in_operating_activities": 38799.0,
            "cash_flows_from_used_in_investing_activities": 0.0,
            "cash_flows_from_used_in_financing_activities": 1169141.0
        },
        "statement_of_changes_in_equity": {
            "share_capital_at_beginning": 0.0,
            "treasury_shares_at_beginning": 0.0,
            "accumulated_profits_losses_at_beginning": -1740826.0,
            "other_reserves_at_beginning": 0.0,
            "noncontrolling_interests_at_beginning": 0.0,
            "total_equity_at_beginning": -1740826.0,
            "issue_of_share_capital": 2000.0,
            "purchase_of_treasury_shares": 0.0,
            "profit_loss_for_period": 782022.0,
            "other_comprehensive_income": 0.0,
            "total_comprehensive_income": 782022.0,
            "dividends_declared": 0.0,
            "transfers_to_from_reserves": 0.0,
            "changes_in_noncontrolling_interests": 0.0,
            "share_capital_at_end": 2000.0,
            "treasury_shares_at_end": 0.0,
            "accumulated_profits_losses_at_end": -959165.0,
            "other_reserves_at_end": 0.0,
            "noncontrolling_interests_at_end": 0.0,
            "total_equity_at_end": -957165.0
        },
        "notes": {
            "trade_and_other_receivables": {
                "receivables_from_third_parties": 0.0,
                "receivables_from_related_parties": 0.0,
                "unbilled_receivables": 0.0,
                "other_receivables": 0.0,
                "total_trade_and_other_receivables": 168920988.0
            },
            "trade_and_other_payables": {
                "payables_to_third_parties": 0.0,
                "payables_to_related_parties": 0.0,
                "deferred_income": 0.0,
                "other_payables": 0.0,
                "total_trade_and_other_payables": 13991532.0
            },
            "revenue": {
                "revenue_from_property_point_in_time": 0.0,
                "revenue_from_goods_point_in_time": 0.0,
                "revenue_from_services_point_in_time": 0.0,
                "revenue_from_property_over_time": 0.0,
                "revenue_from_construction_over_time": 0.0,
                "revenue_from_services_over_time": 0.0,
                "other_revenue": 0.0,
                "total_revenue": 3249989.0
            }
        }
    }
  }
  "showToast": true,
  "toastType": "success",
  "toastTitle": "Update Successful",
  "toastMessage": "Your changes have been saved successfully"
}
```

### Error Codes

* **400** - Invalid request body or document ID format
* **404** - Document not found
* **502** - Backend service error
* **504** - Request timeout

## 6. Validation API

The Validation API checks the quality and compliance of mapped financial data against financial reporting standards.



### Endpoint Details

**Endpoint**: `/api/validate`  
**Method**: GET

### Request Parameters

* **documentId** `string` (required)  
  The document identifier to validate.

### Returns

A JSON object containing:

* **validation_status** `string`  
  Status of the validation process: "success" or "error".

* **is_valid** `boolean`  
  Whether the data is valid.

* **validation_errors** `array` (optional)  
  Array of validation errors if any.

### Response Example - Valid Data

```json
{
  "validation_status": "success",
  "is_valid": true,
  "document_id": "550e8400-e29b-41d4-a716-446655440000"
}
```

### Response Example - Invalid Data

```json
{
  "validation_status": "error",
  "is_valid": false,
  "validation_errors": [
    {
      "field": "statementOfFinancialPosition.currentAssets.CashAndBankBalances",
      "error": "Value cannot be negative",
      "severity": "error"
    },
    {
      "field": "statementOfFinancialPosition.Assets",
      "error": "Total assets must equal the sum of current and non-current assets",
      "severity": "warning"
    }
  ],
  "document_id": "550e8400-e29b-41d4-a716-446655440000"
}
```

### Error Codes

* **400** - Missing document ID parameter
* **502** - Error communicating with validation service
* **504** - Validation service timeout

## 7. Tagging API

The Tagging API initiates XBRL tagging for mapped financial data, preparing it for regulatory filing.



### Endpoint Details

**Endpoint**: `/api/tag`  
**Method**: POST  
**Content-Type**: application/json

### Request Parameters

* **uuid** `string` (required)  
  The unique identifier of the mapped document to tag.

### Request Example

```json
{
  "uuid": "550e8400-e29b-41d4-a716-446655440000"
}
```

### Returns

A JSON object containing:

* **success** `boolean`  
  Whether the tagging request was accepted.

* **message** `string`  
  A descriptive message.

* **data** `object`  
  Details about the tagging task.
  
* **showToast** `boolean`  
  Whether to show a notification toast.

* **toastType** `string`  
  The type of toast notification.

* **toastTitle** `string`  
  The toast notification title.

* **toastMessage** `string`  
  The toast notification message.

### Response Example

```json
{
  "success": true,
  "message": "XBRL tagging request accepted for processing",
  "data": {
    "status": "PROCESSING",
    "task_id": "task_abc123",
    "document_id": "550e8400-e29b-41d4-a716-446655440000"
  },
  "showToast": true,
  "toastType": "info",
  "toastTitle": "Tagging Started",
  "toastMessage": "XBRL tagging process has been initiated."
}
```

### Error Codes

* **400** - Invalid document UUID format
* **404** - Document not found
* **502** - Error communicating with tagging service
* **504** - Tagging service timeout

## 8. Tagging Status API

The Tagging Status API checks the progress of an XBRL tagging task.



### Endpoint Details

**Endpoint**: `/api/tag/status/[taskId]`  
**Method**: GET

### Path Parameters

* **taskId** `string` (required)  
  The identifier of the tagging task.

### Returns

A JSON object containing:

* **success** `boolean`  
  Whether the status check was successful.

* **data** `object`  
  Details about the tagging task status.

* **showToast** `boolean` (optional)  
  Whether to show a notification toast.

* **toastType** `string` (optional)  
  The type of toast notification.

* **toastTitle** `string` (optional)  
  The toast notification title.

* **toastMessage** `string` (optional)  
  The toast notification message.

### Response Example - Processing

```json
{
  "success": true,
  "data": {
    "status": "PROCESSING",
    "document_id": "550e8400-e29b-41d4-a716-446655440000"
  },
  "showToast": false
}
```

### Response Example - Completed

```json
{
  "success": true,
  "data": {
    "status": "COMPLETED",
    "document_id": "550e8400-e29b-41d4-a716-446655440000",
    "completed_at": "2025-04-15T09:15:30Z"
  },
  "showToast": true,
  "toastType": "success",
  "toastTitle": "Tagging Complete",
  "toastMessage": "XBRL tagging process completed successfully"
}
```

### Response Example - Failed

```json
{
  "success": false,
  "data": {
    "status": "FAILED",
    "document_id": "550e8400-e29b-41d4-a716-446655440000",
    "error": "Invalid financial data structure"
  },
  "showToast": true,
  "toastType": "error",
  "toastTitle": "Tagging Failed",
  "toastMessage": "Invalid financial data structure",
  "retryable": true
}
```

### Error Codes

* **400** - Invalid task ID
* **404** - Task not found
* **502** - Error communicating with tagging service
* **504** - Status check timeout

## 9. Tagging Result API

The Tagging Result API retrieves the completed tagged XBRL data.



### Endpoint Details

**Endpoint**: `/api/tag/[documentId]`  
**Method**: GET

### Path Parameters

* **documentId** `string` (required)  
  The identifier of the tagged document.

### Returns

A JSON object containing:

* **success** `boolean`  
  Whether the request was successful.

* **data** `object`  
  The tagged XBRL data.

* **showToast** `boolean`  
  Whether to show a notification toast.

* **toastType** `string`  
  The type of toast notification.

* **toastTitle** `string`  
  The toast notification title.

* **toastMessage** `string`  
  The toast notification message.

### Response Example

```json
{
  "success": true,
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "xbrlData": {
      "filingInformation": {
        "NameOfCompany": "Example Corp",
        "UniqueEntityNumber": "123456789X",
        "TaxonomyVersion": "2022.2"
      },
      "tags": {
        "CompanyName": {
          "value": "Example Corp",
          "concept": "sgpt:NameOfCompany",
          "contextRef": "AsOf31Dec2024"
        },
        "Assets": {
          "value": 1500000,
          "concept": "sgpt:Assets",
          "contextRef": "AsOf31Dec2024"
        }
      }
    },
    "created_at": "2025-04-15T09:15:30Z"
  },
  "showToast": true,
  "toastType": "success",
  "toastTitle": "Data Retrieved",
  "toastMessage": "Tagged document data loaded successfully"
}
```

### Error Codes

* **400** - Invalid document ID format
* **404** - Document not found
* **502** - Error communicating with tagging result service
* **504** - Result retrieval timeout

## 10. Session Management API

The Session Management API creates and updates processing sessions for tracking document workflows.



### Create Session Endpoint

**Endpoint**: `/api/session/create`  
**Method**: POST  
**Content-Type**: application/json

#### Request Parameters

* **threadId** `string` (optional)  
  An optional thread identifier to associate with the session.

#### Request Example

```json
{
  "threadId": "thread_abc123"
}
```

#### Returns

A JSON object containing:

* **message** `string`  
  A success message.

* **session_id** `string`  
  The created session identifier.

* **thread_id** `string` (optional)  
  The associated thread identifier if provided.

#### Response Example

```json
{
  "message": "Session created successfully",
  "session_id": "c4a760a8-10a3-4446-8251-91dea9f3b238",
  "thread_id": "thread_abc123"
}
```

### Update Session Endpoint

**Endpoint**: `/api/session/update`  
**Method**: POST  
**Content-Type**: application/json

#### Request Parameters

* **sessionId** `string` (required)  
  The session identifier to update.

* **status** `string` (required)  
  The new status value from the allowed list:
  - `uploading`, `upload_complete`, `upload_failed`
  - `extracting`, `extracting_complete`, `extracting_failed`
  - `mapping`, `mapping_complete`, `mapping_failed`
  - `validating`, `validation_complete`, `validation_failed`
  - `tagging`, `tagging_complete`, `tagging_failed`
  - `generating`, `generation_complete`, `generation_failed`

* **currentStep** `string` (optional)  
  The current processing step from the allowed list:
  - `uploading`, `extracting`, `mapping`, `validating`, `tagging`, `generating`

#### Request Example

```json
{
  "sessionId": "c4a760a8-10a3-4446-8251-91dea9f3b238",
  "status": "mapping_complete",
  "currentStep": "mapping"
}
```

#### Returns

A JSON object containing:

* **message** `string`  
  A success message.

* **sessionId** `string`  
  The updated session identifier.

* **status** `string`  
  The new status value.

* **current_step** `string`  
  The current step value.

#### Response Example

```json
{
  "message": "Session status updated successfully",
  "sessionId": "c4a760a8-10a3-4446-8251-91dea9f3b238",
  "status": "mapping_complete",
  "current_step": "mapping"
}
```

### Error Codes

* **400** - Missing required parameters or invalid status/step values
* **500** - Database error

## 11. Chat API

The Chat API enables real-time communication with the processing system for querying document status and extracting insights.



### Chat Status Endpoint

**Endpoint**: `/api/chat`  
**Method**: GET

#### Request Parameters

* **threadId** `string` (required)  
  The thread identifier to check.

#### Returns

A JSON object containing:

* **status** `string`  
  Either 'complete' or 'processing'.

* **data** `object`  
  Detailed status information.

* **message** `string` (optional)  
  The latest assistant message if processing is complete.

* **requestId** `string`  
  A unique request identifier.

#### Response Example

```json
{
  "status": "complete",
  "data": {
    "id": "run_abc123",
    "status": "completed",
    "created_at": "2025-04-15T08:30:45Z",
    "completed_at": "2025-04-15T08:32:15Z"
  },
  "message": "I've successfully extracted the financial data from your PDF document.",
  "requestId": "req_xyz789"
}
```

#### Error Codes

* **400** - Invalid thread ID
* **500** - Server error
* **504** - Request timeout

### Chat Message Endpoint

**Endpoint**: `/api/chat`  
**Method**: POST  
**Content-Type**: application/json

#### Request Parameters

* **message** `string` (required)  
  The message to send.

* **threadId** `string` (required)  
  The thread identifier to send to.

#### Request Example

```json
{
  "message": "Can you summarize the key financial metrics from this report?",
  "threadId": "thread_abc123"
}
```

#### Returns

An event stream with JSON objects containing processing updates and the final response.

#### Event Stream Example

```
data: {"kind":"messageDelta","role":"assistant","content":[{"type":"text","text":"I'm analyzing"}],"requestId":"req_abc123"}

data: {"kind":"messageDelta","role":"assistant","content":[{"type":"text","text":" your document"}],"requestId":"req_abc123"}

data: {"kind":"messageDelta","role":"assistant","content":[{"type":"text","text":". The key financial metrics are:"}],"requestId":"req_abc123"}

data: {"kind":"messageDelta","role":"assistant","content":[{"type":"text","text":"\n\n- Revenue: $2,500,000\n- Net Profit: $350,000\n- Total Assets: $1,500,000\n- Total Equity: $600,000\n- Current Ratio: 1.5"}],"requestId":"req_abc123"}

data: {"kind":"streamEnd","requestId":"req_abc123","totalChunks":15}

data: {"kind":"status","status":"complete","requestId":"req_abc123","totalChunks":15}
```

#### Error Codes

* **400** - Missing message or thread ID
* **500** - Server error
* **504** - Stream connection timeout

## 12. Map Fetch API

The Map Fetch API retrieves mapped XBRL data for a specific document.



### Endpoint Details

**Endpoint**: `/api/map/fetch/[uuid]`  
**Method**: GET

### Path Parameters

* **uuid** `string` (required)  
  The document UUID to retrieve.

### Returns

A JSON object containing:

* **status** `string`  
  The status of the request: "success" or "error".

* **message** `string`  
  A descriptive message.

* **data** `object`  
  The mapped XBRL data.

* **showToast** `boolean`  
  Whether to show a notification toast.

* **toastType** `string`  
  The type of toast notification.

* **toastTitle** `string`  
  The toast notification title.

* **toastMessage** `string`  
  The toast notification message.

### Response Example

```json
{
  "status": "success",
  "message": "Data fetched successfully",
  "data": {
    "filingInformation": {
      "NameOfCompany": "Example Corp",
      "UniqueEntityNumber": "123456789X",
      "CurrentPeriodStartDate": "2024-01-01",
      "CurrentPeriodEndDate": "2024-12-31",
      "DescriptionOfPresentationCurrency": "SGD"
    },
    "statementOfFinancialPosition": {
      "currentAssets": {
        "CashAndBankBalances": 250000,
        "CurrentAssets": 450000
      },
      "Assets": 1500000,
      "Liabilities": 900000,
      "equity": {
        "ShareCapital": 400000,
        "AccumulatedProfitsLosses": 200000,
        "Equity": 600000
      }
    },
    "incomeStatement": {
      "Revenue": 2500000,
      "ProfitLoss": 350000
    }
  },
  "showToast": true,
  "toastType": "success",
  "toastTitle": "Document Retrieved",
  "toastMessage": "Financial data loaded successfully"
}
```

### Error Codes

* **400** - Invalid document UUID format
* **404** - Document not found
* **502** - Backend service error
* **504** - Request timeout

## Authentication and Security

### Authentication

Authentication for the API is handled through environment variables:

* **SUPABASE_URL** `string`  
  Your Supabase instance URL.

* **SUPABASE_SERVICE_ROLE_KEY** `string`  
  Service role key for database access.

* **LANGSMITH_API_KEY** `string` (optional)  
  API key for LangSmith (for tracing).

### Rate Limiting

The API implements reasonable rate limits to ensure system stability:

* Maximum request timeout: 60 seconds
* Maximum file size for uploads: 10MB
* Maximum data payload size: 5MB for updates, 1MB for other requests

### Error Handling

All API endpoints return standardized error responses with the following structure:

```json
{
  "success": false,
  "error": "Error type description",
  "details": "Detailed error message",
  "requestId": "req_xyz789"
}
```

Status codes follow standard HTTP conventions:
- 400 for client errors
- 404 for not found
- 413 for payload too large
- 500 for server errors
- 504 for timeouts

## Database Schema

The API uses Supabase with the following key tables:

* **documents** - Stores document metadata
* **document_chunks** - Stores document content chunks
* **extracted_data** - Stores extracted financial data
* **session_thread** - Tracks processing session status

## XBRL Schema

The API uses a standardized XBRL schema for financial data based on Singapore Financial Reporting Standards. Below is a partial representation:

```javascript
{
  filingInformation: {
    NameOfCompany: "string",
    UniqueEntityNumber: "string - pattern: ^\\d{9}[A-Z]$",
    CurrentPeriodStartDate: "string - ISO 8601 date",
    CurrentPeriodEndDate: "string - ISO 8601 date",
    // Additional fields...
  },
  
  statementOfFinancialPosition: {
    currentAssets: {
      CashAndBankBalances: "number",
      // Other current assets...
      CurrentAssets: "number - total current assets"
    },
    nonCurrentAssets: {
      PropertyPlantAndEquipment: "number",
      // Other non-current assets...
      NoncurrentAssets: "number - total non-current assets"
    },
    Assets: "number - total assets",
    
    currentLiabilities: {
      // Current liabilities fields...
      CurrentLiabilities: "number - total current liabilities"
    },
    nonCurrentLiabilities: {
      // Non-current liabilities fields...
      NoncurrentLiabilities: "number - total non-current liabilities"
    },
    Liabilities: "number - total liabilities",
    
    equity: {
      ShareCapital: "number",
      AccumulatedProfitsLosses: "number",
      // Other equity fields...
      Equity: "number - total equity"
    }
  },
  
  incomeStatement: {
    Revenue: "number",
    // Income statement fields...
    ProfitLoss: "number - net profit/loss"
  }
}

## Database Schema

### `documents`

```sql
CREATE TABLE documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid()
);
```

### `document_chunks`

```sql
CREATE TABLE document_chunks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  content TEXT,
  metadata JSONB,
  embedding vector(1536),
  document_id UUID REFERENCES documents(id)
);
```

### `extracted_data`

```sql
CREATE TABLE extracted_data (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  thread_id TEXT NOT NULL,
  pdf_id UUID REFERENCES documents(id),
  data JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);
```

### `session_thread`

```sql
CREATE TABLE session_thread (
  session_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  thread_id TEXT,
  status TEXT NOT NULL CHECK (status IN (
    'uploading', 'upload_complete', 'upload_failed',
    'extracting', 'extracting_complete', 'extracting_failed',
    'mapping', 'mapping_complete', 'mapping_failed',
    'validating', 'validation_complete', 'validation_failed',
    'tagging', 'tagging_complete', 'tagging_failed',
    'generating', 'generation_complete', 'generation_failed'
  )),
  current_step TEXT CHECK (current_step IN (
    'uploading', 'extracting', 'mapping', 'validating', 'tagging', 'generating'
  )),
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);
```

### `processing_status`

```sql
CREATE TABLE processing_status (
  processing_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES session_thread(session_id),
  status TEXT NOT NULL CHECK (status IN (
    'processing', 'completed', 'failed', 'idle', 'cancelled'
  )),
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);
```

### Vector Search Function

```sql
CREATE FUNCTION match_documents (
  query_embedding vector(1536),
  match_count INT DEFAULT NULL,
  filter JSONB DEFAULT '{}'
) RETURNS TABLE (
  id UUID,
  content TEXT,
  metadata JSONB,
  embedding JSONB,
  similarity FLOAT
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    dc.id,
    dc.content,
    dc.metadata,
    (dc.embedding::text)::jsonb AS embedding,
    1 - (dc.embedding <=> query_embedding) AS similarity
  FROM document_chunks dc
  WHERE dc.metadata @> filter
  ORDER BY dc.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;
```

# Environment Keys Setup Guide

This guide provides detailed instructions on how to obtain each environment key required for the Financial Data Extraction System.

## OpenAI API Key

The `OPENAI_API_KEY` is used for AI model access to power the extraction, processing, and tagging features.

### Steps to obtain:

1. Go to [OpenAI's website](https://openai.com) and sign up or log in
2. Navigate to the API section by clicking on your profile icon and selecting "View API keys"
3. Click "Create new secret key"
4. Give your key a descriptive name (e.g., "Financial Data Extraction System")
5. Copy the generated key (note: this is the only time OpenAI will show you the full key)
6. Add to your `.env` file as `OPENAI_API_KEY="sk-..."` (starts with "sk-")

**Note:** OpenAI API usage incurs costs based on the models used and token consumption. GPT-4o, used by default in this system, has higher pricing than older models.

## Supabase Configuration

Supabase provides the vector database and PostgreSQL storage for the application.

### SUPABASE_URL

1. Log in to [Supabase](https://supabase.com/) or create a new account
2. Create a new project from the dashboard
3. Once the project is created, go to the project settings (gear icon)
4. Select "API" from the sidebar
5. Copy the "Project URL" value
6. Add to your `.env` file as `SUPABASE_URL="https://your-project-id.supabase.co"`

### SUPABASE_SERVICE_ROLE_KEY

1. In the same Supabase project settings page, under "API"
2. Find the "Project API keys" section
3. Copy the "service_role" key (it starts with "eyJ...")
4. Add to your `.env` file as `SUPABASE_SERVICE_ROLE_KEY="eyJ..."`

**Important Security Note:** The service role key has admin privileges. Never expose it in client-side code or public repositories.

### Supabase Database Setup

After creating your Supabase project, you need to:

1. Enable the Vector extension in Supabase:
   - Go to the SQL Editor in your Supabase dashboard
   - Run: `CREATE EXTENSION IF NOT EXISTS vector;`

2. Create the required tables using the schema defined in the [Database Schema](#database-schema) section of the technical documentation

3. Retrieve the database connection strings:
   - Go to Project Settings > Database
   - Find the "Connection string" section
   - Copy both the "Connection string (with pooling)" for `DATABASE_URL` and "Connection string (direct connection)" for `DIRECT_URL`

## Database Connection URLs

These URLs are used for connecting to your Supabase database.

### DATABASE_URL

This is the pooled connection string from Supabase, typically used for most operations:

1. Go to your Supabase project dashboard
2. Navigate to Project Settings > Database
3. Under "Connection Pooling", find "Connection string"
4. Replace the password placeholder with your database password
5. Add to your `.env` file as `DATABASE_URL="postgresql://postgres:[YOUR-PASSWORD]@db.xxxxxxxxxxxxx.supabase.co:5432/postgres?pgbouncer=true"`

### DIRECT_URL

This is the direct connection string, used for database migrations:

1. In the same Supabase Database settings page
2. Under "Connection string", copy the "URI" value
3. Replace the password placeholder with your database password
4. Add to your `.env` file as `DIRECT_URL="postgresql://postgres:[YOUR-PASSWORD]@db.xxxxxxxxxxxxx.supabase.co:5432/postgres"`

## Complete .env File Example

```
# OpenAI API Key
OPENAI_API_KEY="sk-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"

# Supabase
SUPABASE_URL="https://xxxxxxxxxxxxxxxx.supabase.co"
SUPABASE_SERVICE_ROLE_KEY="eyJxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"

# LangGraph Configuration
LANGGRAPH_INGESTION_ASSISTANT_ID="asst_xxxxxxxxxxxxxxxxxxxxxxxx"
LANGGRAPH_RETRIEVAL_ASSISTANT_ID="asst_xxxxxxxxxxxxxxxxxxxxxxxx"

# Database Connection
DATABASE_URL="postgresql://postgres:yourpassword@db.xxxxxxxxxxxxx.supabase.co:5432/postgres?pgbouncer=true"
DIRECT_URL="postgresql://postgres:yourpassword@db.xxxxxxxxxxxxx.supabase.co:5432/postgres"
```

### LangGraph Setup

The system uses LangGraph for orchestrating AI workflows:

1. **Ingestion Graph**: Handles document ingestion and initial processing
   - Defined in `graph.ts`
   - Uses `IndexStateAnnotation` and `IndexConfigurationAnnotation`

2. **Retrieval Graph**: Handles document analysis and extraction
   - Defined in `retrieval_graph/graph.ts`
   - Uses `AgentStateAnnotation` and `AgentConfigurationAnnotation`

### Data Schema Definition

The core schema for financial data is defined in `retrieval_graph/schema.ts`:

```typescript
export const PartialXBRLSchema = z.object({
  filingInformation: z.object({
    NameOfCompany: z.string().min(1)
      .describe("Registered name of the entity in BizFile"),
    UniqueEntityNumber: z.string().regex(/^\d{9}[A-Z]$/)
      .describe("Unique Entity Number assigned by ACRA"),
    // More fields...
  }),
  
  statementOfFinancialPosition: z.object({
    currentAssets: z.object({
      CashAndBankBalances: OptionalMonetaryAmount
        .describe("Cash and bank balances, current"),
      // More fields...
    }),
    // More sections...
  }),
  // More sections...
});
```

## System Behaviors

### Document Chunking Strategy

The system splits documents into chunks using:

```typescript
// From retrieval_graph/utils.ts
export function splitDocumentsIntoBatches(docs: Document[], maxBatchSize = 40): Document[][] {
  const batches: Document[][] = [];
  let currentBatch: Document[] = [];
  let currentBatchSize = 0;

  const estimateDocumentSize = (doc: Document): number => {
    const metadataSize = Object.entries(doc.metadata || {}).reduce((sum, [k, v]) => {
      return sum + k.length + (typeof v === 'string' ? v.length :
        typeof v === 'object' ? JSON.stringify(v).length : String(v).length);
    }, 0);

    // Estimate: 1 token ~ 4 characters
    return Math.ceil((doc.pageContent.length + metadataSize) / 4);
  };

  for (const doc of docs) {
    const docSize = estimateDocumentSize(doc);

    // If adding this doc would exceed batch size, start a new batch
    if (currentBatchSize + docSize > maxBatchSize && currentBatch.length > 0) {
      batches.push(currentBatch);
      currentBatch = [];
      currentBatchSize = 0;
    }

    currentBatch.push(doc);
    currentBatchSize += docSize;
  }

  if (currentBatch.length > 0) {
    batches.push(currentBatch);
  }

  return batches;
}
```

### Document Chunk Management

The system stores document chunks in the `document_chunks` table. The `pdfId` in metadata is generated during PDF processing but is not consistently used for filtering throughout the application. For clean operation, truncate the `document_chunks` table between processing runs.

### Case Handling in APIs

The system has inconsistent case handling between components:
- Frontend components use PascalCase (e.g., `CashAndBankBalances`)
- Some API endpoints expect snake_case (e.g., `cash_and_bank_balances`)

This creates challenges when using the Map Update API through the frontend.

### AI Context Window Limitations

The AI models have finite context windows. Large documents (>30 pages) may exceed these limits, resulting in partial extraction. Options:
1. Use models with larger context windows
2. Process documents in smaller batches
3. Split large PDFs before upload

### Asynchronous Processing

The mapping and tagging processes run asynchronously:
- Status is tracked through polling endpoints
- Long-running processes may timeout without notification
- The frontend implements polling with exponential backoff

### Output Format Limitation

The system outputs JSON representations of XBRL data, not actual XBRL XML files. The implementation focuses on structured data extraction rather than XBRL XML generation.

### Database Maintenance

The `document_chunks` table should be truncated between processing runs to prevent contamination from previous documents:

```sql
TRUNCATE TABLE document_chunks;
```

## XBRL Framework Viewer

The system includes a framework viewer component that allows for different presentations of the XBRL data. This component doesn't modify the underlying data but provides multiple visualization options for the same data.

### Framework Implementation

The framework viewer is implemented in `EditableDataVisualizer` component and uses the `processDataByFramework` function from `@/lib/acra-data-processor` to transform the data presentation.

**Key Files:**
- `acra-data-processor.ts` - Main framework processing implementation
- `EditableDataVisualizer.tsx` - Framework selector UI component
- `framework-view/framework-selector.tsx` - Framework option selection UI

### Supported Frameworks

The system supports multiple XBRL viewing frameworks that organize and present the financial data in different formats:

```typescript
// From acra-data-processor.ts
export const processDataByFramework = (data: any, frameworkId: string): any => {
  if (!data) return null;
  
  // Create a deep copy of the data to avoid mutation
  const dataCopy = JSON.parse(JSON.stringify(data));
  
  try {
    switch (frameworkId) {
      case 'sfrs-full':
        return processSFRSFullFramework(dataCopy);
      case 'financial-statements':
        return processFinancialStatementsFramework(dataCopy);
      case 'sfrs-simplified':
        return processSFRSSimplifiedFramework(dataCopy);
      case 'compliance-focused':
        return processComplianceFocusedFramework(dataCopy);
      case 'analytical':
        return processAnalyticalFramework(dataCopy);
      case 'industry-banking':
        return processBankingIndustryFramework(dataCopy);
      case 'industry-insurance':
        return processInsuranceIndustryFramework(dataCopy);
      case 'regulatory-reporting':
        return processRegulatoryReportingFramework(dataCopy);
      default:
        return addMetadata(dataCopy, 'Default ACRA View', 'Standard view of the XBRL data');
    }
  } catch (error) {
    console.error(`Error processing framework ${frameworkId}:`, error);
    // Return original data with error metadata if processing fails
    return {
      ...dataCopy,
      _frameworkMetadata: {
        name: 'Error Processing Framework',
        description: `An error occurred while processing the ${frameworkId} framework. Showing original data.`,
        error: error instanceof Error ? error.message : String(error)
      }
    };
  }
};
```

### Framework Descriptions

1. **SFRS Full Framework** (`sfrs-full`):
   - Comprehensive view based on Singapore Financial Reporting Standards
   - Includes all standard financial statements and disclosures
   - Maintains all XBRL elements in their original structure

2. **Financial Statements Framework** (`financial-statements`):
   - Focuses only on the main financial statements
   - Includes Statement of Financial Position, Income Statement, Cash Flows, and Changes in Equity
   - Simplified view removing detailed notes and supplementary information

3. **SFRS Simplified Framework** (`sfrs-simplified`):
   - Based on SFRS for Small Entities
   - Simplified structure with fewer disclosures
   - Streamlined for easier reading of core financial data

4. **Compliance-Focused Framework** (`compliance-focused`):
   - Emphasizes regulatory and compliance information
   - Highlights Director's Statement and Audit Report
   - Organizes data by compliance requirements

5. **Analytical Framework** (`analytical`):
   - Focuses on ratios, metrics, and analytics
   - Restructures data for financial analysis
   - Calculates key financial ratios and trends

6. **Banking Industry Framework** (`industry-banking`):
   - Specialized view for financial institutions
   - Highlights banking-specific metrics
   - Organizes data according to banking industry standards

7. **Insurance Industry Framework** (`industry-insurance`):
   - Specialized view for insurance companies
   - Highlights insurance-specific metrics
   - Organizes data according to insurance industry standards

8. **Regulatory Reporting Framework** (`regulatory-reporting`):
   - Formatted for regulatory submission
   - Structured according to regulatory requirements
   - Emphasizes compliance elements

### Framework Processing Implementation

The framework processing functions transform the data organization without modifying the underlying values:

```typescript
const processSFRSFullFramework = (data: any): any => {
  // Keep all data as is but organize it according to SFRS Full taxonomy
  const result: any = {
    filingInformation: extractFilingInformation(data),
    statementOfFinancialPosition: extractFinancialPosition(data),
    incomeStatement: extractIncomeStatement(data),
    statementOfCashFlows: extractCashFlows(data),
    statementOfChangesInEquity: extractChangesInEquity(data),
    notes: extractNotes(data),
    complianceStatements: extractComplianceStatements(data)
  };

  return addMetadata(
    result,
    'SFRS Full XBRL Framework',
    'Complete representation with all disclosures according to Singapore Financial Reporting Standards',
    { standard: 'SFRS Full' }
  );
};
```

### UI Integration

The framework selector is integrated into the data visualization component:

```tsx
// From EditableDataVisualizer.tsx
const [selectedFramework, setSelectedFramework] = useState<string>('sfrs-full');
const [showFrameworkSelector, setShowFrameworkSelector] = useState<boolean>(false);

// Process data through selected framework
const processData = useCallback((dataToProcess, framework) => {
  if (!dataToProcess || !isMounted.current) return;
  
  setIsFrameworkProcessing(true);
  
  setTimeout(() => {
    try {
      // Process the data through the framework
      const newProcessedData = processDataByFramework(dataToProcess, framework);
      
      if (isMounted.current) {
        setProcessedData(newProcessedData);
        frameworkRef.current = framework;
      }
    } catch (error) {
      console.error('Error processing data for framework:', error);
    } finally {
      if (isMounted.current) {
        setIsFrameworkProcessing(false);
      }
    }
  }, 100);
}, []);

// Framework selection handler
const handleFrameworkChange = useCallback((frameworkId: string) => {
  if (frameworkId === selectedFramework) return;
  
  setSelectedFramework(frameworkId);
  setShowFrameworkSelector(false);
  
  // Get the latest data for processing
  const dataToProcess = isEditing ? editableData : originalData;
  processData(dataToProcess, frameworkId);
}, [selectedFramework, processData, isEditing, editableData, originalData]);
```

### Important Framework Viewing Template Implementation Notes

1. The framework viewer is for presentation only and does not modify the underlying data structure stored in the database.

2. When saving data after editing, the original data structure is preserved regardless of which framework view is active.

3. The system outputs XBRL data in JSON format only. While the frameworks present data in different XBRL-compatible structures, actual XBRL XML generation is not implemented.

4. The framework selector UI is implemented as a dropdown component that allows switching between different views without reprocessing the original data.