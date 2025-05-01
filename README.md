# Financial Data Extraction System

This system is designed to automate the extraction, processing, and standardization of financial data from PDF documents into structured XBRL (eXtensible Business Reporting Language) format. The system uses AI-powered extraction through LangGraph workflows and presents financial data in multiple standardized views. The django backend deals with the mapping, and tagging process and the final output would be a JSON format with the tags for each element names. (WIP)

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
  - [Complete Application Flow](#complete-application-flow)
    - [1. Uploading Financial Documents](#1-uploading-financial-documents)
    - [2. Extracting Financial Data](#2-extracting-financial-data)
    - [3. Mapping Extracted Data](#3-mapping-extracted-data)
    - [4. Validating Mapped Data](#4-validating-mapped-data)
    - [5. Data Editing](#5-data-editing)
    - [6. Tagging Financial Data](#6-tagging-financial-data)
    - [7. Viewing Results](#7-viewing-results)
  - [XBRL Framework Viewing](#xbrl-framework-viewing)
  - [Important Limitations](#important-limitations)
    - [No Session Persistence](#no-session-persistence)
  - [Troubleshooting](#troubleshooting)
    - [Common Issues](#common-issues)
    - [Database Maintenance](#database-maintenance)
- [Sample UI/UX and Application Workflow Pipeline](#pipeline)
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

                                             ┌───────────────────────────┐
                         5. Mapping/Validation│Django Backend            │
┌─────────────────────┐ ────────────────────> │ - Data normalization     │
│Frontend (Next.js)   │                      │ - Business rule validation│
│ - Data editing      │ <────────────────────┤ - Format conversion       │
└─────────────────────┘  6. Validation results└───────────────────────────┘
```

- **Frontend**: Next.js/React app that provides:
  - PDF upload interface
  - Data visualization components
  - XBRL framework selector
  - Edit and validation interfaces

- **LangGraph Backend**: Node.js/TypeScript service with LangGraph agent workflows for:
  - **Ingestion**: Handles PDF parsing and embedding storage
  - **Extraction**: AI-powered financial data extraction

- **Django Backend**: Python-based service that handles:
  - **Mapping**: Transforms extracted data to XBRL schema
  - **Validation**: Verifies data against business rules
  - **Tagging**: Applies XBRL tags to financial data

## Prerequisites

1. **Node.js v18+** (v20 recommended)
2. **Yarn** package manager
3. **Python 3.9+** (for Django backend)
4. **Supabase project** with vector extension enabled
5. **OpenAI API Key** (GPT-4o recommended for best extraction quality)
6. **LangGraph deployed assistants** for ingestion and retrieval graphs

## Installation

1. **Clone the repository**:

   ```bash
   git clone https://github.com/your-organization/financial-data-extraction.git
   cd financial-data-extraction
   ```

2. **Install frontend dependencies**:

   ```bash
   cd frontend
   yarn install
   ```

3. **Install backend dependencies**:

   ```bash
   cd ../backend
   yarn install
   ```

4. **Install Django backend dependencies**:

   ```bash
   cd ../django-backend
   pip install -r requirements.txt
   ```

5. **Create environment files**:

   ```bash
   # In frontend directory
   cp .env.example .env

   # In backend directory
   cp .env.example .env

   # In django-backend/team_repo directory
   cp .env.example .env
   ```

6. **Configure environment variables** (see [Environment Variables](#environment-variables) section)

## Environment Variables

Create `.env` files in each directory with the appropriate variables:

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

3. **Database Connection URLs**:
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

To start the entire application, you need to run three servers:

1. **Start the frontend development server**:

   ```bash
   cd frontend
   yarn dev
   ```

   This starts the Next.js server on port 3000 by default.

2. **Start the LangGraph backend server**:

   ```bash
   cd backend
   yarn langgraph:dev
   ```

   This launches the LangGraph server on port 2024 by default.

3. **Start the Django backend server**:

   ```bash
   cd django-backend/team_repo
   # On first run, migrate the database
   python manage.py migrate
   # Start the server
   python manage.py runserver
   ```

   This starts the Django server on port 8000 by default.

4. **Access the application**:

   Open [http://localhost:3000](http://localhost:3000) in your browser.

## Complete Application Flow

### 1. Uploading Financial Documents

- From the main dashboard, click the "Upload Document" button
- Select a financial PDF document to upload (e.g., annual report, financial statement)
- **IMPORTANT**: Ensure your PDF contains text that is within the 128K token context window limit. Larger documents will fail during extraction.
- The system processes the document through the ingestion pipeline
- Wait for the ingestion confirmation message

### 2. Extracting Financial Data

- Once ingestion completes, click the "Extract" button to begin the AI extraction process
- The extraction agent analyzes the document to identify key financial information
- This process uses an AI agent to locate specific fields according to the XBRL schema
- A progress indicator shows the extraction status
- When extraction completes, you'll see a success notification

### 3. Mapping Extracted Data

- After extraction, click the "Map Data" button to start the mapping process
- The system transforms the extracted raw data into a standardized XBRL schema format
- This involves organizing and structuring the data according to XBRL taxonomy
- The mapping process normalizes field names and ensures proper data structure
- When mapping completes, you'll see the structured data in the interface

### 4. Validating Mapped Data

- Once mapping is complete, click the "Validate" button
- The validation process checks the data against business rules and schema requirements
- It ensures consistency, completeness, and adherence to financial reporting standards
- If validation errors are found, they will be displayed in a validation summary panel
- Each error includes specific information about what needs to be corrected

### 5. Data Editing

- **IMPORTANT**: The frontend table editor may not work as expected due to data format mismatch between the Django backend (snake_case) and frontend components (PascalCase)
- To correct validation errors, you need to use the PUT API endpoint directly:
- Endpoint: `{{base_url}}/api/v1/mapping/update/:uuid/`
- Payload format example:
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
        "entity_operations_description": "01421 Poultry breeding/hatcheries"
      }
      // other fields...
    }
  }
  ```
- Note that all field names must be in snake_case (e.g., `company_name` instead of `NameOfCompany`)
- Use a tool like Postman to make these update requests

### 6. Tagging Financial Data

- After validation passes (or is bypassed), click the "Tag" button to start the tagging process
- Tagging applies standardized XBRL tags to each financial data element
- The system generates appropriate XBRL taxonomy references for each data point
- The tagging process outputs JSON that shows which XBRL tags apply to each element
- Note: The system does not generate full XBRL XML output as this is outside the current scope

### 7. Viewing Results

- After tagging completes, the financial data is ready for viewing
- Use the framework selector to view the data in different standardized formats
- You can export the data as JSON for further processing

## XBRL Framework Viewing

The system provides multiple framework views for financial data:

1. **SFRS Full Framework** - Complete view with all disclosures following Singapore Financial Reporting Standards
2. **Financial Statements Framework** - Focuses only on the main financial statements
3. **SFRS Simplified Framework** - Streamlined view based on SFRS for Small Entities
4. **Compliance-Focused Framework** - Emphasizes regulatory and compliance information
5. **Analytical Framework** - Focuses on financial ratios and metrics
6. **Industry-specific Frameworks** - Tailored views for banking, insurance, etc.

To switch between frameworks, use the "Framework" selector in the data visualization component.

## Important Limitations

### No Session Persistence

A critical limitation of the current system is the lack of session persistence:

- There is no user account or authentication system
- Session data is not stored between page reloads
- **If you refresh the page or close the browser, all session data will be lost**
- You will need to restart the entire process from document upload
- The database will retain the documents and extracted data, but your session context will be gone
- This is a known limitation of the current implementation
- Always complete your workflow in a single session without refreshing

## Troubleshooting

### Common Issues

1. **PDF Extraction Issues**
   - Ensure PDF format is text-based, not scanned images
   - **Critical**: PDFs must be within the 128K token context window limit
   - Large PDFs (>70 pages) may exceed context window limits
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

5. **Data Format Mismatch Issues**
   - Frontend components expect PascalCase (e.g., `CashAndBankBalances`)
   - Django API endpoints expect snake_case (e.g., `cash_and_bank_balances`)
   - This mismatch prevents proper frontend editing functionality
   - For data updates, use Postman with snake_case field names
   - The validation editing UI won't work properly due to case mismatch
   - Use direct API calls to update data with the correct format

6. **Tagging Failure Issues**
   - Tagging may exceed retry limits without proper error handling
   - When tagging errors exceed retries, a full application reload is required
   - There is no automatic recovery mechanism for failed tagging
   - If status is stuck in "tagging", try reloading the application

7. **Multiple Server Issues**
   - Ensure all three servers (frontend, LangGraph backend, Django backend) are running
   - If any communication errors occur, check that all server URLs are correctly configured
   - The frontend expects the LangGraph backend at port 2024 and Django backend at port 8000

8. **Django Migration Issues**
   - If you encounter database errors in the Django backend, ensure migrations are applied
   - Run `python manage.py migrate` in the django-backend/team_repo directory
   - Check the Django logs for specific migration errors

### Database Maintenance

This is a critical step before each processing run:

```sql
-- MUST RUN BEFORE EACH NEW DOCUMENT UPLOAD
TRUNCATE TABLE document_chunks;
```

This prevents document contamination between processing runs. The system doesn't properly filter by pdfId when retrieving document chunks, so all previous chunks must be removed before processing a new document.

### Pipeline
Initial UI
  ![image](https://github.com/user-attachments/assets/b663d72e-6e5d-428b-b3d0-05619b76f145)

Workflow Pipeline

Upload/Ingestion Complete
![image](https://github.com/user-attachments/assets/8a0b4256-c009-4b82-922d-a96b2e121f54)

Langgraph Ingestion Run Trace: https://smith.langchain.com/public/17cf7ad5-66b9-49ba-b198-178c2a78690b/r

Extraction Complete
![image](https://github.com/user-attachments/assets/0c45d9d7-91c7-4b5c-a5fe-62e9edf20eae)
Langgraph Extraction Run Trace: [https://smith.langchain.com/public/17cf7ad5-66b9-49ba-b198-178c2a78690b/r](https://smith.langchain.com/public/71457166-8dae-4b67-bc66-36b3443ce1a9/r)


Mapping Complete 
![image](https://github.com/user-attachments/assets/0c45d9d7-91c7-4b5c-a5fe-62e9edf20eae)

Validation Error
![image](https://github.com/user-attachments/assets/b8eb1748-48ae-4fae-9e34-29aaf71c25f9)

Validation Complete
![image](https://github.com/user-attachments/assets/fe0e0786-e612-4ecd-bb8e-1f035a2da220)

Tagging Start
![image](https://github.com/user-attachments/assets/c7a4e711-d024-4449-adc7-55e2ab5d566a)

Tagging Log Firelogs
![image](https://github.com/user-attachments/assets/545e470f-e1b6-4a18-a876-765e6802ade2)

Note the framework no longer works on the tagging pipeline because the data the framework component expects is a different format
Tagging Complete (Table View)
![image](https://github.com/user-attachments/assets/adfbca3f-44e1-45e0-a51e-3cb403f2beb4)

Tagging Complete JSON View
![image](https://github.com/user-attachments/assets/aea2cb1f-e5e6-4392-ad46-a3cf1e5f0aad)

Framework Views (For viewing only and doesn't incluence the output) (WIP)
![image](https://github.com/user-attachments/assets/1027dd47-6661-4cdb-aa1d-f447e79dd22b)
