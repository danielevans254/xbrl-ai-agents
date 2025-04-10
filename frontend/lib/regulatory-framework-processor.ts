/**
 * ACRA Taxonomy Compliant Processor
 * 
 * This module processes XBRL data strictly according to the ACRA taxonomy.
 * No assumptions or calculations are made - data is presented exactly as provided.
 */

/**
 * Process data for the Regulatory Reporting Framework
 * Organizes the data according to ACRA XBRL taxonomy without any assumed values
 * 
 * @param data The original XBRL data
 * @returns Processed data structured for regulatory submission
 */
export const processRegulatoryReportingFramework = (data: any): any => {
  if (!data) return null;

  // Create a deep copy to avoid mutations
  const dataCopy = JSON.parse(JSON.stringify(data));

  // Primary result structure following ACRA XBRL requirements
  const result: any = {
    // Filing information is always required for regulatory submission
    filingInformation: extractSection(dataCopy, 'filingInformation'),

    // Four key financial statements required for XBRL reporting
    financialStatements: {
      // 1. Income Statement (Profit and Loss)
      incomeStatement: extractSection(dataCopy, 'incomeStatement'),

      // 2. Statement of Financial Position (with standardized ordering)
      financialPosition: processFinancialPosition(extractSection(dataCopy, 'statementOfFinancialPosition')),

      // 3. Statement of Changes in Equity
      changesInEquity: extractSection(dataCopy, 'statementOfChangesInEquity'),

      // 4. Statement of Cash Flows
      cashFlows: extractSection(dataCopy, 'statementOfCashFlows')
    },

    // Supporting documentation required for regulatory compliance
    complianceDocumentation: {
      directorsStatement: extractSection(dataCopy, 'directorsStatement'),
      auditReport: extractSection(dataCopy, 'auditReport')
    },

    // Notes to financial statements
    notes: extractSection(dataCopy, 'notes')
  };

  // Add metadata about this framework
  return {
    ...result,
    _frameworkMetadata: {
      name: 'Regulatory Reporting Framework',
      description: 'XBRL format optimized for ACRA regulatory submission requirements',
      sections: Object.keys(result).filter(key => key !== '_frameworkMetadata'),
      regulatoryCompliant: true
    }
  };
};

/**
 * Process Financial Position Statement with standardized ordering
 * No calculations are performed - data is presented as provided
 */
const processFinancialPosition = (financialPosition: any): any => {
  if (!financialPosition) return null;

  // Create a new object with properly ordered sections
  // This is purely structural reordering, not calculation
  const orderedFinancialPosition: any = {
    // Start with assets in order of liquidity (most liquid to least liquid)
    currentAssets: financialPosition.currentAssets,
    nonCurrentAssets: financialPosition.nonCurrentAssets,
    Assets: financialPosition.Assets,

    // Then liabilities in order of liquidity (most liquid to least liquid)
    currentLiabilities: financialPosition.currentLiabilities,
    nonCurrentLiabilities: financialPosition.nonCurrentLiabilities,
    Liabilities: financialPosition.Liabilities,

    // Finally equity
    equity: financialPosition.equity
  };

  return orderedFinancialPosition;
};

/**
 * Extract a specific section from the data
 * No modifications are made to the extracted data
 */
const extractSection = (data: any, sectionName: string): any => {
  if (!data) return null;
  return data[sectionName] || null;
};