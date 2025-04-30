# Financial Data Extraction System

This system is designed to automate the extraction, processing, and standardization of financial data from PDF documents into structured XBRL (eXtensible Business Reporting Language) format. The system uses AI-powered extraction through LangGraph workflows and presents financial data in multiple standardized views.

<p align="center">
  <img width="800" alt="Financial Data Extraction System" src="public/images/system-overview.png" />
</p>

## Table of Contents

- [Financial Data Extraction System](#financial-data-extraction-system)
  - [Table of Contents](#table-of-contents)
  - [Features](#features)
  - [Architecture Overview](#architecture-overview)
  - [Prerequisites](#prerequisites)
  - [Installation](#installation)
  - [Environment Variables](#environment-variables)
    - [How to Obtain Environment Variables](#how-to-obtain-environment-variables)
  - [Database Setup](#database-setup)
  - [Local Development](#local-development)
  - [Usage](#usage)
    - [1. Uploading Financial Documents](#1-uploading-financial-documents)
    - [2. Processing Financial Data](#2-processing-financial-data)
    - [3. Viewing Financial Data](#3-viewing-financial-data)
    - [4. Exporting Results](#4-exporting-results)
  - [XBRL Framework Viewing](#xbrl-framework-viewing)
  - [Troubleshooting](#troubleshooting)
    - [Common Issues](#common-issues)
    - [Database Maintenance](#database-maintenance)

## Features

- **PDF Document Ingestion**: Upload and process financial PDF documents
- **AI-Powered Extraction**: Extract structured financial data using advanced AI models
- **XBRL Schema Mapping**: Map extracted data to standardized XBRL schema
- **Multiple Framework Views**: View financial data in various formats (SFRS Full, SFRS Simplified, etc.)
- **Data Validation**: Validate financial data against business rules
- **XBRL Tagging**: Apply standard XBRL tags to financial data
- **Vector Database Storage**: Store document chunks with embeddings for efficient retrieval
- **Structured JSON Output**: Generate standardized JSON representing XBRL data

## Architecture Overview

```
┌─────────────────────┐    1. Upload PDFs    ┌───────────────────────────┐
│Frontend (Next.js)   │ ────────────────────> │Backend (LangGraph)       │
│ - React UI w/ forms │                      │ - Ingestion Graph         │
│ - Upload .pdf files │ <────────────────────┤   + Vector embedding via  │
└─────────────────────┘    2. Confirmation   │     SupabaseVectorStore   │
                                             └───────────────────────────┘

┌─────────────────────┐    3. Process data   ┌───────────────────────────┐
│Frontend (Next.js)   │ ────────────────────> │Backend (LangGraph)       │
│ - XBRL framework    │                      │ - Retrieval Graph         │
│ - Data visualization│ <────────────────────┤   + Mapping & Validation  │
└─────────────────────┘  4. Structured data  └───────────────────────────┘
```

- **Backend**: Node.js/TypeScript service with LangGraph agent workflows for:
  - **Ingestion**: Handles PDF parsing and embedding storage
  - **Extraction**: AI-powered financial data extraction
  - **Mapping**: Transforms extracted data to XBRL schema
  - **Validation**: Verifies data against business rules
  - **Tagging**: Applies XBRL tags to financial data

- **Frontend**: Next.js/React app that provides:
  - PDF upload interface
  - Data visualization components
  - XBRL framework selector
  - Edit and validation interfaces

## Prerequisites

1. **Node.js v18+** (v20 recommended)
2. **Yarn** package manager
3. **Supabase project** with vector extension enabled
4. **OpenAI API Key** (GPT-4o recommended for best extraction quality)
5. **LangGraph deployed assistants** for ingestion and retrieval graphs

## Installation

1. **Clone the repository**:

   ```bash
   git clone https://github.com/your-organization/financial-data-extraction.git
   cd financial-data-extraction
   ```

2. **Install dependencies**:

   ```bash
   yarn install
   ```

3. **Create environment files**:

   ```bash
   cp .env.example .env
   ```

4. **Configure environment variables** (see [Environment Variables](#environment-variables) section)

## Environment Variables

Create a `.env` file in the root directory with the following variables:

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

### How to Obtain Environment Variables

1. **OpenAI API Key**:
   - Sign up at [OpenAI](https://openai.com/)
   - Navigate to API section → Create new secret key
   - Copy the key (format: `sk-...`)

2. **Supabase Configuration**:
   - Create a project at [Supabase](https://supabase.com/)
   - Get `SUPABASE_URL` from Project Settings → API → Project URL
   - Get `SUPABASE_SERVICE_ROLE_KEY` from Project Settings → API → Project API keys → service_role key

3. **LangGraph Assistant IDs**:
   - Deploy your graphs using LangGraph CLI:
     ```bash
     npx @langchain/langgraph-cli deploy --project-name financial-extractor
     npx @langchain/langgraph-cli deploy retrieval_graph/graph.ts --project-name financial-extractor
     ```
   - Get the assistant IDs from the deployment output

4. **Database Connection URLs**:
   - Get from Supabase Project Settings → Database
   - Use Connection Pooling URL for `DATABASE_URL`
   - Use direct connection URL for `DIRECT_URL`

## Database Setup

1. **Enable Vector Extension**:

   In Supabase SQL Editor, run:
   ```sql
   CREATE EXTENSION IF NOT EXISTS vector;
   ```

2. **Create Required Tables**:

   ```sql
   CREATE TABLE documents (
     id UUID PRIMARY KEY DEFAULT gen_random_uuid()
   );

   CREATE TABLE document_chunks (
     id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
     content TEXT,
     metadata JSONB,
     embedding vector(1536),
     document_id UUID REFERENCES documents(id)
   );

   CREATE TABLE extracted_data (
     id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
     thread_id TEXT NOT NULL,
     pdf_id UUID REFERENCES documents(id),
     data JSONB NOT NULL,
     created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
     updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
   );

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

3. **Create Vector Search Function**:

   ```sql
   CREATE OR REPLACE FUNCTION match_documents (
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

## Local Development

1. **Start LangGraph development server**:

   ```bash
   yarn langgraph:dev
   ```

   This launches the LangGraph server on port 2024 by default.

2. **Start the frontend development server**:

   ```bash
   yarn dev
   ```

   This starts the Next.js server on port 3000 by default.

3. **Access the application**:

   Open [http://localhost:3000](http://localhost:3000) in your browser.

## Usage

### 1. Uploading Financial Documents

- From the main dashboard, click the "Upload Document" button
- Select a financial PDF document to upload (e.g., annual report, financial statement)
- The system will process the document through the ingestion pipeline
- Wait for the ingestion confirmation message

### 2. Processing Financial Data

- Once ingestion completes, the system extracts financial data using AI
- The extraction process identifies key financial information following XBRL schema
- Extracted data is mapped to standardized XBRL format
- The system validates data against business rules

### 3. Viewing Financial Data

- Use the framework selector to choose different views:
  - SFRS Full Framework
  - Financial Statements Framework
  - SFRS Simplified Framework
  - Compliance-Focused Framework
  - Analytical Framework
  - Industry-specific Frameworks
- Toggle between table and JSON views
- Edit data if needed and save changes

### 4. Exporting Results

- Use the "Export" button to download the formatted financial data as JSON
- The exported data maintains the selected framework structure

## XBRL Framework Viewing

The system provides multiple framework views for financial data:

1. **SFRS Full Framework** - Complete view with all disclosures following Singapore Financial Reporting Standards
2. **Financial Statements Framework** - Focuses only on the main financial statements
3. **SFRS Simplified Framework** - Streamlined view based on SFRS for Small Entities
4. **Compliance-Focused Framework** - Emphasizes regulatory and compliance information
5. **Analytical Framework** - Focuses on financial ratios and metrics
6. **Industry-specific Frameworks** - Tailored views for banking, insurance, etc.

To switch between frameworks, use the "Framework" selector in the data visualization component.

## Troubleshooting

### Common Issues

1. **PDF Extraction Issues**
   - Ensure PDF format is text-based, not scanned images
   - Large PDFs (>30 pages) may exceed AI context window limits
   - For large documents, split into smaller files or use a model with larger context window
   - Too large PDFs (>10MB) will be rejected by the API with a 413 error

2. **Database Connection Issues**
   - Verify Supabase credentials in .env file
   - Check that vector extension is enabled
   - Ensure tables and functions are created correctly

3. **Missing or Contaminated Extracted Data**
   - **CRITICAL**: Always clear the document_chunks table between processing runs
   - The pdfId is not properly referenced throughout the application
   - Previous document chunks will contaminate new extraction results
   - Execute `TRUNCATE TABLE document_chunks;` before each new document upload

4. **Mapping Timeout Issues**
   - When mapping takes too long, it typically indicates incomplete extraction data
   - The frontend doesn't display errors when mapping silently fails
   - Incomplete extraction data causes mapping to throw errors without frontend notification
   - Check backend logs for timeout errors if mapping seems stuck

5. **Tagging Failure Issues**
   - Tagging may exceed retry limits without proper error handling
   - When tagging errors exceed retries, a full application reload is required
   - There is no automatic recovery mechanism for failed tagging
   - If status is stuck in "tagging", try reloading the application

6. **Validation and Editing Issues**
   - Frontend components expect PascalCase (e.g., `CashAndBankBalances`)
   - API endpoints expect snake_case (e.g., `cash_and_bank_balances`)
   - This mismatch prevents proper frontend editing functionality
   - For data updates, use Postman with snake_case field names
   - The validation editing UI won't work properly due to case mismatch
   - Use Postman with the correct field naming to update data directly

7. **Framework Viewing Issues**
   - Different frameworks show the same data in different formats
   - No changes to underlying data are made when switching frameworks
   - Framework selection is for visualization only
   - The system outputs JSON only, not actual XBRL XML
   - XBRL XML format generation was deemed too technical for implementation

### Database Maintenance

This is a critical step before each processing run:

```sql
-- MUST RUN BEFORE EACH NEW DOCUMENT UPLOAD
TRUNCATE TABLE document_chunks;
```

This prevents document contamination between processing runs. The system doesn't properly filter by pdfId when retrieving document chunks, so all previous chunks must be removed before processing a new document.