import { PDFLoader } from '@langchain/community/document_loaders/fs/pdf';
import { Document } from '@langchain/core/documents';
import fs from 'fs/promises';
import os from 'os';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';

/**
 * Checks if a document contains financial information.
 * @param content - The document content to analyze.
 * @returns Boolean indicating whether the document appears to be financial.
 */
export function isFinancialPage(content: string): boolean {
  // Convert to lowercase for case-insensitive matching
  const lowerContent = content.toLowerCase();

  // Financial keywords to look for
  const financialTerms = [
    // Banking terms
    'bank', 'credit', 'debit', 'loan', 'mortgage', 'interest rate', 'deposit', 'withdrawal',

    // Investment terms
    'investment', 'stock', 'bond', 'equity', 'portfolio', 'dividend', 'share', 'shareholder',
    'mutual fund', 'etf', 'hedge fund', 'asset', 'liability', 'capital gain', 'broker',

    // Financial statements
    'balance sheet', 'income statement', 'cash flow', 'financial statement', 'profit', 'loss',
    'revenue', 'expense', 'earning', 'ebitda', 'net income', 'gross margin', 'depreciation',

    // Corporate finance
    'merger', 'acquisition', 'ipo', 'debt', 'equity financing', 'venture capital', 'leverage',
    'valuation', 'market cap', 'liquidity', 'solvency', 'capital structure',

    // Insurance terms
    'insurance', 'premium', 'policy', 'claim', 'underwriting', 'annuity', 'risk management',

    // Accounting terms
    'accounting', 'audit', 'tax', 'fiscal', 'gaap', 'ifrs', 'journal entry', 'depreciation',
    'amortization', 'accrual', 'asset', 'liability', 'equity', 'ledger', 'book value',

    // Regulatory terms
    'sec', 'regulatory', 'compliance', 'finra', 'fdic', 'federal reserve', 'fsoc', 'cftc',

    // Finance terminology
    'finance', 'financial', 'budget', 'forecast', 'fiscal', 'quarter', 'annual report',
    '10-k', '10-q', 'prospectus', 'cost of capital', 'roi', 'irr', 'npv', 'payback period',

    // Schema-based terms
    'cash and bank balances', 'trade and other receivables', 'current assets', 'non-current assets',
    'total assets', 'current liabilities', 'non-current liabilities', 'total liabilities',
    'equity', 'revenue', 'profit or loss', 'income statement', 'balance sheet', 'audit report'
  ];

  // Check for presence of financial terms
  const hasFinancialTerms = financialTerms.some(term => lowerContent.includes(term));

  // Currency symbols and codes
  const currencyPatterns = [
    /\$\s*\d+(?:[,.]\d+)?/,
    /€\s*\d+(?:[,.]\d+)?/,
    /£\s*\d+(?:[,.]\d+)?/,             // £1,000.00
    /¥\s*\d+(?:[,.]\d+)?/,
    /\d+(?:[,.]\d+)?\s*(?:usd|eur|gbp|jpy|cad|aud|chf)/i,
    /\d+(?:[,.]\d+)?\s*(?:dollars|euros|pounds|yen)/i,
  ];

  // Check for currency patterns
  const hasCurrencyPatterns = currencyPatterns.some(pattern => pattern.test(content));

  // Percentage patterns (common in financial documents)
  const percentagePattern = /\d+(?:\.\d+)?\s*%/;
  const hasPercentages = percentagePattern.test(content);

  // Financial table indicators - multiple numbers in sequence or tabular format
  const hasFinancialTables = /(?:\d+[,.s]){4,}/.test(content);

  // Check for date patterns followed by numbers (common in financial reports)
  const dateValuePattern = /(?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\s+\d{1,2}(?:,|\s)\s*\d{4}\s*[\s:]\s*\d+[,.\d]*/i;
  const hasDateValues = dateValuePattern.test(content);

  // Check for financial analysis metrics
  const financialMetricsPattern = /(?:ratio|margin|return on|yield|rate|growth|performance)\s+(?:of|on|is|was|:)?\s+\d+(?:\.\d+)?%?/i;
  const hasFinancialMetrics = financialMetricsPattern.test(content);

  // Look for accounting entry patterns (debits and credits)
  const accountingEntryPattern = /(?:debit|credit|dr|cr)s?\s+(?:to|from)?\s+[\w\s]+\s+\d+(?:[,\.]\d+)?/i;
  const hasAccountingEntries = accountingEntryPattern.test(content);

  const numberCount = (content.match(/\d+(?:[,\.]\d+)?/g) || []).length;
  const highNumberDensity = numberCount > content.length / 200; // Arbitrary threshold

  let score = 0;
  if (hasFinancialTerms) score += 3;
  if (hasCurrencyPatterns) score += 4;
  if (hasPercentages) score += 2;
  if (hasFinancialTables) score += 3;
  if (hasDateValues) score += 1;
  if (hasFinancialMetrics) score += 3;
  if (hasAccountingEntries) score += 4;
  if (highNumberDensity) score += 2;

  // Return true if score exceeds threshold
  return score >= 5;
}

/**
 * Processes a PDF file by parsing it into Document objects.
 * @param file - The PDF file to process.
 * @returns An array of Document objects extracted from the PDF.
 */
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

    // Add metadata to each document
    docs.forEach((doc) => {
      doc.metadata.filename = file.name;
      doc.metadata.pdfId = pdfId;
      doc.metadata.processedAt = processedAt;
      doc.metadata.isFinancialPage = isFinancialPage(doc.pageContent);
    });

    return docs;
  } finally {
    // Clean up temporary files
    await fs
      .unlink(tempFilePath)
      .catch((err) => console.error('Error deleting temp file:', err));
    await fs
      .rmdir(tempDir)
      .catch((err) => console.error('Error deleting temp dir:', err));
  }
}

/**
 * Converts a File object to a Buffer.
 * @param file - The uploaded file.
 * @returns A Buffer containing the file content.
 */
async function bufferFile(file: File): Promise<Buffer> {
  try {
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    return buffer;
  } catch (error) {
    console.error('Error buffering file:', error);
    throw new Error('Failed to read file content.');
  }
}
