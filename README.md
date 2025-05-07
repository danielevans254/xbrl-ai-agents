# XRRL AI Agents System

This system automates the extraction, processing, and standardization of financial data from PDF documents into structured XBRL (eXtensible Business Reporting Language) format. It uses AI-powered extraction through LangGraph workflows and presents financial data in multiple standardized views. The Django backend handles mapping and tagging processes with final output in JSON format with tags for each element name.

## Table of Contents

- [Features](#features)
- [Architecture Overview](#architecture-overview)
- [Prerequisites](#prerequisites)
- [Installation](#installation)
- [Environment Setup](#environment-setup)
- [Database Setup](#database-setup)
- [Local Development](#local-development)
- [Application Workflow](#application-workflow)
- [Framework Views](#framework-views)
- [Important Limitations](#important-limitations)
- [Troubleshooting](#troubleshooting)

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

### System Components

- **Frontend**: Next.js/React app providing:
  - PDF upload interface
  - Data visualization components
  - XBRL framework selector
  - Edit and validation interfaces

- **LangGraph Backend**: Node.js/TypeScript service with LangGraph agent workflows for:
  - **Ingestion**: Handles PDF parsing and embedding storage
  - **Extraction**: AI-powered financial data extraction

- **Django Backend**: Python-based service handling:
  - **Mapping**: Transforms extracted data to XBRL schema
  - **Validation**: Verifies data against business rules
  - **Tagging**: Applies XBRL tags to financial data

1. **Document Upload & Ingestion**
   - User uploads a financial PDF document through the Next.js frontend
   - Frontend sends the PDF to the LangGraph backend
   - LangGraph Ingestion Graph processes the PDF:
     - Parses the PDF text content
     - Chunks the text into manageable segments
     - Generates vector embeddings for each chunk
     - Stores chunks and embeddings in Supabase Vector database
     - Creates a document record in the `documents` table
     - Updates session status to `upload_complete`
   - Frontend receives confirmation and updates the UI

2. **Data Extraction**
   - User initiates extraction process via frontend
   - Frontend sends extraction request to LangGraph backend
   - LangGraph Retrieval Graph:
     - Retrieves document chunks from vector database
     - Uses AI models (GPT-4o) to identify and extract financial data
     - Structures data according to preliminary schema
     - Stores extracted data in `extracted_data` table
     - Updates session status to `extracting_complete`
   - Frontend receives extraction result notification

3. **Data Mapping**
   - User triggers mapping process via frontend
   - Frontend sends mapping request to Django backend
   - Django backend:
     - Retrieves extracted data from database
     - Transforms data into standardized XBRL schema format
     - Normalizes field names and ensures proper structure
     - Applies initial data typing and formatting
     - Stores mapped data in the database
     - Updates session status to `mapping_complete`
   - Frontend displays the mapped data structure

4. **Data Validation**
   - User initiates validation via frontend
   - Frontend sends validation request to Django backend
   - Django backend:
     - Retrieves mapped data from database
     - Checks data against business rules and schema requirements
     - Validates consistency, completeness, and format compliance
     - Identifies any validation errors
     - Stores validation results
     - Updates session status to `validation_complete` or `validation_failed`
   - Frontend displays validation results and errors if any

5. **Data Editing** (if validation errors exist)
   - User corrects validation errors:
     - Due to format mismatch between frontend (PascalCase) and backend (snake_case)
     - User must use direct API calls through Postman or similar tool
   - PUT requests to API endpoint update the mapped data
   - Database is updated with corrected data
   - Validation can be run again to confirm corrections

6. **XBRL Tagging**
   - User initiates tagging process via frontend after validation passes
   - Frontend sends tagging request to Django backend
   - Django backend:
     - Retrieves validated data from database
     - Applies standardized XBRL tags to each financial element
     - Generates taxonomy references for each data point
     - Creates JSON output with XBRL tag associations
     - Stores tagged data in the database
     - Updates session status to `tagging_complete`
   - Frontend receives tagging completion notification

7. **Final Output & Viewing**
   - User accesses the tagged data via frontend
   - Frontend fetches the completed data from Django backend
   - The system renders the data according to selected framework view:
     - Different frameworks highlight different aspects of the financial data
     - User can switch between frameworks without reprocessing
   - User can export the final JSON data with XBRL tags
   - Data can be used for regulatory filing or further analysis
   - Note: The system outputs structured JSON rather than full XBRL XML

8. **Data Persistence**
   - All processed data remains in the database
   - Documents, extracted data, and tagged results are stored
   - However, session context is not persisted between browser sessions
   - If user refreshes or closes browser, workflow must restart from beginning
   - Database maintenance (clearing `document_chunks` table) is required between processing runs

## Prerequisites

1. **Node.js v18+** (v20 recommended)
2. **Yarn** package manager
3. **Python 3.9+** (for Django backend)
4. **PostgreSQL database** with PgAdmin
5. **Supabase project** with vector extension enabled
6. **OpenAI API Key** (GPT-4o recommended for best extraction quality)
7. **LangGraph deployed assistants** for ingestion and retrieval graphs

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

5. **Create environment files** (see next section)

## Environment Setup

Create `.env` files in each directory with the appropriate variables:

### Frontend `.env`

```
# Required Environment Variables
NEXT_PUBLIC_API_BASE_URL=http://localhost:2024
NEXT_PUBLIC_DJANGO_API_BASE_URL=http://localhost:8000/api/v1
```

### Backend `.env`

```
# OpenAI API Key (Required)
OPENAI_API_KEY="your_openai_api_key"

# Supabase Configuration (Required)
SUPABASE_URL="your_supabase_url"
SUPABASE_SERVICE_ROLE_KEY="your_supabase_service_role_key"

# LangGraph Configuration (Optional but recommended for development)
LANGSMITH_TRACING=true
LANGSMITH_ENDPOINT="https://api.smith.langchain.com"
LANGSMITH_API_KEY="your_langsmith_api_key"
LANGSMITH_PROJECT="your_langsmith_project"
LANGGRAPH_INGESTION_ASSISTANT_ID=ingestion_graph
LANGGRAPH_RETRIEVAL_ASSISTANT_ID=retrieval_graph
LANGCHAIN_TRACING_V2=true

# Database Connection (Required)
DATABASE_URL="postgresql://your_username:your_password@your_host:your_port/your_db_name?pgbouncer=true"
DIRECT_URL="postgresql://your_username:your_password@your_host:your_port/your_db_name"
```

### Django Backend `.env`

```
# OpenAI API Key (Required)
OPENAI_API_KEY="your_openai_api_key"

# Logging
LOGFIRE_TOKEN="your_logfire_token"
DJANGO_LOG_LEVEL=INFO

# Database Configuration
DB_NAME="your_db_name"
DB_USER="your_db_user"
DB_PASSWORD="your_db_password"
DB_HOST="your_db_host"
DB_PORT="your_db_port"

# Django Settings
DJANGO_SECRET_KEY="your_django_secret_key"
DJANGO_DEBUG=1
DJANGO_ALLOWED_HOSTS=localhost 127.0.0.1 [::1] localhost:3000
CSRF_ALLOWED_HOSTS=http://localhost:3000

# API Keys (Optional)
DEEPSEEK_API="your_deepseek_api_key"
GOOGLE_API_KEY="your_google_api_key"
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
   
4. **Django Secret Key**:
   - Generate a random secret key for Django
   - You can use online generators or run this Python command:
     ```python
     python -c "import secrets; print(secrets.token_urlsafe(50))"
     ```

## Database Setup

### PostgreSQL Setup with PgAdmin

1. **Install and launch PgAdmin**:
   - Download and install PgAdmin from the [official website](https://www.pgadmin.org/download/)
   - Launch PgAdmin

2. **Create a new database**:
   - In the PgAdmin browser panel, right-click on "Servers" → "Create" → "Server"
   - In the "General" tab, enter a name for your connection (e.g., "XRRL Database")
   - In the "Connection" tab, enter:
     - Host: your_db_host (typically "localhost" for local development)
     - Port: your_db_port (typically "5432")
     - Maintenance database: "postgres"
     - Username: your_db_user (typically "postgres")
     - Password: your_db_password
   - Click "Save"

3. **Create the application database**:
   - Expand your server in the browser panel
   - Right-click on "Databases" → "Create" → "Database"
   - Enter database name: your_db_name (e.g., "xbrl_db")
   - Click "Save"

4. **Update your Django `.env` file** with these database credentials:
   ```
   DB_NAME="your_db_name"
   DB_USER="your_db_user"
   DB_PASSWORD="your_db_password"
   DB_HOST="your_db_host"
   DB_PORT="your_db_port"
   ```

### Supabase Vector Database Setup

1. **Enable Vector Extension**:
   - In Supabase dashboard, navigate to "SQL Editor"
   - Create a new query and run:
     ```sql
     CREATE EXTENSION IF NOT EXISTS vector;
     ```

2. **Create Required Tables**:
   - In the SQL Editor, run the following SQL script:
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
   - In the SQL Editor, run:
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

To start the entire application, run three servers:

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

## Application Workflow

### 1. Uploading Financial Documents

- From the main dashboard, click "Upload Document" 
- Select a financial PDF document (e.g., annual report, financial statement)
- **IMPORTANT**: Ensure PDF contains text within the 128K token context window limit
- The system processes the document through the ingestion pipeline
- Wait for the ingestion confirmation message

### 2. Extracting Financial Data

- Once ingestion completes, click "Extract" to begin AI extraction
- The extraction agent identifies key financial information
- A progress indicator shows extraction status
- When complete, you'll see a success notification

### 3. Mapping Extracted Data

- After extraction, click "Map Data" to start mapping
- The system transforms raw data into standardized XBRL schema format
- When complete, you'll see structured data in the interface

### 4. Validating Mapped Data

- Once mapping is complete, click "Validate"
- Validation checks data against business rules and schema requirements
- If errors are found, they'll be displayed in a validation summary panel

### 5. Data Editing

- **IMPORTANT**: The frontend table editor may not work due to format mismatch (Django backend uses snake_case, frontend uses PascalCase)
- To correct validation errors, use the PUT API endpoint directly:
  - Endpoint: `{{base_url}}/api/v1/mapping/update/:uuid/`
  - Use Postman or similar tool with snake_case field names

### 6. Tagging Financial Data

- After validation passes, click "Tag" to start tagging
- Tagging applies standardized XBRL tags to each financial data element
- The process outputs JSON showing which XBRL tags apply to each element

### 7. Viewing Results

- After tagging completes, the financial data is ready for viewing
- Use the framework selector to view data in different standardized formats
- Export the data as JSON for further processing

## Framework Views

The system provides multiple framework views for financial data:

1. **SFRS Full Framework** - Complete view with all disclosures following Singapore Financial Reporting Standards
2. **Financial Statements Framework** - Focuses only on main financial statements
3. **SFRS Simplified Framework** - Streamlined view based on SFRS for Small Entities
4. **Compliance-Focused Framework** - Emphasizes regulatory and compliance information
5. **Analytical Framework** - Focuses on financial ratios and metrics
6. **Industry-specific Frameworks** - Tailored views for banking, insurance, etc.

To switch between frameworks, use the "Framework" selector in the data visualization component.

## Important Limitations

### No Session Persistence

A critical limitation of the current system:

- No user account or authentication system
- Session data is not stored between page reloads
- **If you refresh the page or close the browser, all session data will be lost**
- You must restart the entire process from document upload
- The database retains documents and extracted data, but session context will be gone
- Always complete your workflow in a single session without refreshing

## Troubleshooting

### Common Issues

1. **PDF Extraction Issues**
   - Ensure PDF format is text-based, not scanned images
   - **Critical**: PDFs must be within the 128K token context window limit
   - Large PDFs (>70 pages) may exceed context window limits
   - For large documents, split into smaller files or use a model with larger context
   - PDFs >10MB will be rejected by the API with a 413 error

2. **Database Connection Issues**
   - Verify Supabase credentials in .env file
   - Check that vector extension is enabled
   - Ensure tables and functions are created correctly

3. **Missing or Contaminated Extracted Data**
   - **CRITICAL**: Always clear the document_chunks table between processing runs
   - Previous document chunks will contaminate new extraction results
   - Execute `TRUNCATE TABLE document_chunks;` before each new document upload

4. **Mapping Timeout Issues**
   - When mapping takes too long, it typically indicates incomplete extraction data
   - Check backend logs for timeout errors if mapping seems stuck

5. **Data Format Mismatch Issues**
   - Frontend components expect PascalCase (e.g., `CashAndBankBalances`)
   - Django API endpoints expect snake_case (e.g., `cash_and_bank_balances`)
   - For data updates, use Postman with snake_case field names

6. **Tagging Failure Issues**
   - Tagging may exceed retry limits without proper error handling
   - If status is stuck in "tagging", try reloading the application

7. **Multiple Server Issues**
   - Ensure all three servers (frontend, LangGraph backend, Django backend) are running
   - The frontend expects LangGraph backend at port 2024 and Django backend at port 8000

8. **Django Migration Issues**
   - If you encounter database errors, ensure migrations are applied
   - Run `python manage.py migrate` in the django-backend/team_repo directory

### Database Maintenance

Critical step before each processing run:

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
