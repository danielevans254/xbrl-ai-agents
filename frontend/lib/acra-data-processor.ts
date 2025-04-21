/**
 * Enhanced ACRA Taxonomy Data Processor
 * 
 * A specialized module for processing XBRL data according to the ACRA taxonomy standards
 * based on Singapore Financial Reporting Standards (SFRS).
 */

import { processRegulatoryReportingFramework } from './regulatory-framework-processor';

/**
 * Process data according to the selected ACRA framework
 * @param data The original XBRL data following ACRA taxonomy
 * @param frameworkId The selected framework ID
 * @returns Processed data according to framework specifications
 */
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

/**
 * Add metadata to processed data
 */
const addMetadata = (data: any, name: string, description: string, additionalMeta: any = {}): any => {
  return {
    ...data,
    _frameworkMetadata: {
      name,
      description,
      sections: Object.keys(data).filter(key => key !== '_frameworkMetadata'),
      ...additionalMeta
    }
  };
};

/**
 * Extract insurance regulatory info
 */
const extractInsuranceRegulatoryInfo = (data: any): any => {
  // Placeholder for insurance-specific regulatory information
  // In a real implementation, this would extract data specific to insurance regulations
  return {
    regulatoryCompliance: 'Standard',
    riskManagement: 'Standard'
  };
};

/**
 * Process financial position for regulatory reporting
 */
const processFinancialPositionForRegulatory = (financialPosition: any): any => {
  // Reformat financial position for regulatory reporting
  // This is primarily about ordering and structure, not calculation
  return {
    currentAssets: financialPosition.currentAssets,
    nonCurrentAssets: financialPosition.nonCurrentAssets,
    Assets: financialPosition.Assets,
    currentLiabilities: financialPosition.currentLiabilities,
    nonCurrentLiabilities: financialPosition.nonCurrentLiabilities,
    Liabilities: financialPosition.Liabilities,
    equity: financialPosition.equity
  };
};

/**
 * Helper function to calculate a ratio and handle division by zero
 */
const calculateRatio = (numerator: number, denominator: number): number | null => {
  if (numerator === null || numerator === undefined) return null;
  if (denominator === null || denominator === undefined || denominator === 0) return null;
  return parseFloat((numerator / denominator).toFixed(4));
};

/**
 * Calculate insurance metrics
 */
const calculateInsuranceMetrics = (data: any): any => {
  const incomeStatement = data.incomeStatement;
  const balanceSheet = data.statementOfFinancialPosition;

  // Calculate industry-specific metrics for insurance
  const premiumRevenue = incomeStatement.Revenue || 0;
  const totalAssets = balanceSheet.Assets || 0;
  const totalEquity = balanceSheet.equity?.Equity || 0;

  return {
    solvency: {
      equityToAssets: calculateRatio(totalEquity, totalAssets)
    },
    profitability: {
      returnOnEquity: calculateRatio(incomeStatement.ProfitLoss || 0, totalEquity),
      combinedRatio: 'N/A' // Would need specific data
    },
    liquidity: {
      liquidAssetsToTotalAssets: calculateRatio(
        balanceSheet.currentAssets?.CashAndBankBalances || 0,
        totalAssets
      )
    }
  };
};

/**
 * Extract banking regulatory info
 */
const extractBankingRegulatoryInfo = (data: any): any => {
  // Placeholder for banking-specific regulatory information
  // In a real implementation, this would extract data specific to banking regulations
  return {
    regulatoryCompliance: 'Standard',
    riskManagement: 'Standard'
  };
};

/**
 * Extract insurance-specific items
 */
const extractInsuranceSpecificItems = (data: any): any => {
  const balanceSheet = data.statementOfFinancialPosition;

  // Extract items that would be relevant for insurance industry
  return {
    assets: {
      financialAssets: balanceSheet.currentAssets?.CurrentFinancialAssetsMeasuredAtFairValueThroughProfitOrLoss,
      investmentProperties: balanceSheet.nonCurrentAssets?.InvestmentProperties,
      reinsuranceAssets: 'N/A' // Would need specific data
    },
    liabilities: {
      insuranceContractLiabilities: 'N/A', // Would need specific data
      investmentContractLiabilities: 'N/A', // Would need specific data
      insurancePayables: balanceSheet.currentLiabilities?.TradeAndOtherPayablesCurrent
    }
  };
};

/**
 * Calculate banking metrics
 */
const calculateBankingMetrics = (data: any): any => {
  const incomeStatement = data.incomeStatement;
  const balanceSheet = data.statementOfFinancialPosition;

  // Calculate industry-specific metrics for banking
  const netInterestIncome = incomeStatement.Revenue || 0;
  const totalAssets = balanceSheet.Assets || 0;
  const totalEquity = balanceSheet.equity?.Equity || 0;
  const loansAndAdvances = balanceSheet.currentAssets?.TradeAndOtherReceivablesCurrent || 0;

  return {
    capitalAdequacy: {
      equityToAssets: calculateRatio(totalEquity, totalAssets)
    },
    assetQuality: {
      nonPerformingLoanRatio: 'N/A' // Would need specific data
    },
    earnings: {
      returnOnAssets: calculateRatio(incomeStatement.ProfitLoss || 0, totalAssets),
      netInterestMargin: calculateRatio(netInterestIncome, totalAssets)
    },
    liquidity: {
      loanToDepositRatio: calculateRatio(
        loansAndAdvances,
        balanceSheet.currentLiabilities?.TradeAndOtherPayablesCurrent || 0
      )
    }
  };
};

/**
 * Extract banking-specific items
 */
const extractBankingSpecificItems = (data: any): any => {
  const balanceSheet = data.statementOfFinancialPosition;

  return {
    assets: {
      cashAndBalancesWithCentralBanks: balanceSheet.currentAssets?.CashAndBankBalances,
      loansAndAdvancesToCustomers: balanceSheet.currentAssets?.TradeAndOtherReceivablesCurrent,
      investmentSecurities: balanceSheet.currentAssets?.CurrentFinancialAssetsMeasuredAtFairValueThroughProfitOrLoss
    },
    liabilities: {
      depositsFromCustomers: balanceSheet.currentLiabilities?.TradeAndOtherPayablesCurrent,
      debtSecuritiesIssued: balanceSheet.currentLiabilities?.CurrentLoansAndBorrowings,
      subordinatedLiabilities: balanceSheet.nonCurrentLiabilities?.NoncurrentLoansAndBorrowings
    }
  };
};

/**
 * Calculate trend analysis
 */
const calculateTrendAnalysis = (data: any): any => {
  // In a real implementation, this would use historical data
  // This is a simplified placeholder that returns current period values
  const incomeStatement = data.incomeStatement;
  const balanceSheet = data.statementOfFinancialPosition;

  return {
    revenue: {
      current: incomeStatement.Revenue || 0,
      previousYear: null, // Would need historical data
      trend: 'N/A'      // Would calculate growth trend
    },
    netIncome: {
      current: incomeStatement.ProfitLoss || 0,
      previousYear: null,
      trend: 'N/A'
    },
    totalAssets: {
      current: balanceSheet.Assets || 0,
      previousYear: null,
      trend: 'N/A'
    },
    totalLiabilities: {
      current: balanceSheet.Liabilities || 0,
      previousYear: null,
      trend: 'N/A'
    },
    totalEquity: {
      current: balanceSheet.equity?.Equity || 0,
      previousYear: null,
      trend: 'N/A'
    }
  };
};

/**
 * Process data for SFRS Full Framework
 * Comprehensive view based on Singapore Financial Reporting Standards
 */
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

/**
 * Process data for Financial Statements Framework
 * Focuses on the main financial statements
 */
const processFinancialStatementsFramework = (data: any): any => {
  // Extract only the key financial statements
  const result: any = {};

  // Include key financial statements
  if (data.statementOfFinancialPosition) {
    result.statementOfFinancialPosition = data.statementOfFinancialPosition;
  }

  if (data.incomeStatement) {
    result.incomeStatement = data.incomeStatement;
  }

  if (data.statementOfCashFlows) {
    result.statementOfCashFlows = data.statementOfCashFlows;
  }

  if (data.statementOfChangesInEquity) {
    result.statementOfChangesInEquity = data.statementOfChangesInEquity;
  }

  if (data.notes) {
    result.notes = data.notes;
  }

  // Add minimal company information
  if (data.filingInformation) {
    result.filingInformation = {
      NameOfCompany: data.filingInformation.NameOfCompany,
      UniqueEntityNumber: data.filingInformation.UniqueEntityNumber,
      CurrentPeriodStartDate: data.filingInformation.CurrentPeriodStartDate,
      CurrentPeriodEndDate: data.filingInformation.CurrentPeriodEndDate,
      DescriptionOfPresentationCurrency: data.filingInformation.DescriptionOfPresentationCurrency,
      LevelOfRoundingUsedInFinancialStatements: data.filingInformation.LevelOfRoundingUsedInFinancialStatements
    };
  }

  return addMetadata(
    result,
    'Financial Statements',
    'Statement of Financial Position, Income Statement, Cash Flows, and Changes in Equity'
  );
};

/**
 * Process data for SFRS Simplified Framework
 * Based on SFRS for Small Entities
 */
const processSFRSSimplifiedFramework = (data: any): any => {
  // Create simplified view according to SFRS for Small Entities
  const result: any = {
    filingInformation: extractSimplifiedFilingInformation(data),
    statementOfFinancialPosition: extractSimplifiedFinancialPosition(data),
    incomeStatement: extractSimplifiedIncomeStatement(data),
    notes: extractSimplifiedNotes(data)
  };

  return addMetadata(
    result,
    'SFRS Simplified XBRL Framework',
    'Simplified financial reporting framework for small entities',
    { standard: 'SFRS for Small Entities' }
  );
};

/**
 * Process data for Compliance-Focused Framework
 * Emphasizes regulatory and compliance information
 */
const processComplianceFocusedFramework = (data: any): any => {
  const result: any = {
    filingInformation: extractFilingInformation(data),
    complianceStatements: extractComplianceStatements(data),
    auditInformation: extractAuditInformation(data),
    complianceMetrics: calculateComplianceMetrics(data)
  };

  return addMetadata(
    result,
    'Compliance-Focused Framework',
    'Directors\' Statement, Auditor\'s Report, Regulatory Disclosures',
    { standard: 'Regulatory Compliance' }
  );
};

/**
 * Process data for Analytical Framework
 * Focuses on ratios, trends and metrics
 */
const processAnalyticalFramework = (data: any): any => {
  const result: any = {};

  // Minimal company information
  if (data.filingInformation) {
    result.companyInfo = extractMinimalCompanyInfo(data);
  }

  // Financial summary for context
  result.financialSummary = extractFinancialSummary(data);

  // Calculate financial ratios and add to result
  result.keyRatios = calculateFinancialRatios(data);

  // Calculate trend analysis
  result.trendAnalysis = calculateTrendAnalysis(data);

  // Calculate compliance status
  result.complianceStatus = extractComplianceStatus(data);

  return addMetadata(
    result,
    'Analytical Framework',
    'Financial Ratios, Trend Analysis, Performance Metrics',
    { standard: 'Financial Analysis' }
  );
};

/**
 * Process data for Banking Industry Framework
 */
const processBankingIndustryFramework = (data: any): any => {
  // Specialized view for banking industry
  const result: any = {
    companyInfo: extractMinimalCompanyInfo(data),
    bankingSpecificItems: extractBankingSpecificItems(data),
    keyBankingMetrics: calculateBankingMetrics(data),
    regulatoryCompliance: extractBankingRegulatoryInfo(data)
  };

  return addMetadata(
    result,
    'Banking Industry Framework',
    'Specialized view for financial institutions including banking-specific metrics',
    { industry: 'Banking and Financial Services' }
  );
};

/**
 * Process data for Insurance Industry Framework
 */
const processInsuranceIndustryFramework = (data: any): any => {
  // Specialized view for insurance industry
  const result: any = {
    companyInfo: extractMinimalCompanyInfo(data),
    insuranceSpecificItems: extractInsuranceSpecificItems(data),
    keyInsuranceMetrics: calculateInsuranceMetrics(data),
    regulatoryCompliance: extractInsuranceRegulatoryInfo(data)
  };

  return addMetadata(
    result,
    'Insurance Industry Framework',
    'Specialized view for insurance companies including insurance-specific metrics',
    { industry: 'Insurance' }
  );
};

/**
 * Extract compliance notes from the data
 */
const extractComplianceNotes = (data: any): any => {
  const result: any = {};

  // Filing compliance information
  if (data.filingInformation) {
    result.filingCompliance = {
      TypeOfXBRLFiling: data.filingInformation.TypeOfXBRLFiling,
      TypeOfAccountingStandard: data.filingInformation.TypeOfAccountingStandardUsedToPrepareFinancialStatements,
      DateOfAuthorisation: data.filingInformation.DateOfAuthorisationForIssueOfFinancialStatements,
      ComparativeChanges: data.filingInformation.WhetherThereAreAnyChangesToComparativeAmounts,
      HowXBRLFilePrepared: data.filingInformation.HowWasXBRLFilePrepared
    };
  }

  // Audit compliance
  if (data.auditReport) {
    result.auditCompliance = {
      AuditOpinion: data.auditReport.TypeOfAuditOpinionInIndependentAuditorsReport,
      AuditingStandards: data.auditReport.AuditingStandardsUsedToConductTheAudit,
      GoingConcernUncertainty: data.auditReport.WhetherThereIsAnyMaterialUncertaintyRelatingToGoingConcern,
      ProperRecordsKept: data.auditReport.WhetherInAuditorsOpinionAccountingAndOtherRecordsRequiredAreProperlyKept
    };
  }

  // Directors' compliance statements
  if (data.directorsStatement) {
    result.directorCompliance = {
      TrueAndFairView: data.directorsStatement.WhetherInDirectorsOpinionFinancialStatementsAreDrawnUpSoAsToExhibitATrueAndFairView,
      SolvencyStatement: data.directorsStatement.WhetherThereAreReasonableGroundsToBelieveThatCompanyWillBeAbleToPayItsDebtsAsAndWhenTheyFallDueAtDateOfStatement
    };
  }

  return result;
};

/**
 * Extract filing information 
 */
const extractFilingInformation = (data: any): any => {
  const filingInfo = data.filingInformation || {};

  return {
    NameOfCompany: filingInfo.NameOfCompany,
    UniqueEntityNumber: filingInfo.UniqueEntityNumber,
    CurrentPeriodStartDate: filingInfo.CurrentPeriodStartDate,
    CurrentPeriodEndDate: filingInfo.CurrentPeriodEndDate,
    PriorPeriodStartDate: filingInfo.PriorPeriodStartDate,
    TypeOfXBRLFiling: filingInfo.TypeOfXBRLFiling,
    NatureOfFinancialStatementsCompanyLevelOrConsolidated: filingInfo.NatureOfFinancialStatementsCompanyLevelOrConsolidated,
    TypeOfAccountingStandardUsedToPrepareFinancialStatements: filingInfo.TypeOfAccountingStandardUsedToPrepareFinancialStatements,
    DateOfAuthorisationForIssueOfFinancialStatements: filingInfo.DateOfAuthorisationForIssueOfFinancialStatements,
    TypeOfStatementOfFinancialPosition: filingInfo.TypeOfStatementOfFinancialPosition,
    WhetherTheFinancialStatementsArePreparedOnGoingConcernBasis: filingInfo.WhetherTheFinancialStatementsArePreparedOnGoingConcernBasis,
    WhetherThereAreAnyChangesToComparativeAmounts: filingInfo.WhetherThereAreAnyChangesToComparativeAmounts,
    DescriptionOfPresentationCurrency: filingInfo.DescriptionOfPresentationCurrency,
    DescriptionOfFunctionalCurrency: filingInfo.DescriptionOfFunctionalCurrency,
    LevelOfRoundingUsedInFinancialStatements: filingInfo.LevelOfRoundingUsedInFinancialStatements,
    DescriptionOfNatureOfEntitysOperationsAndPrincipalActivities: filingInfo.DescriptionOfNatureOfEntitysOperationsAndPrincipalActivities,
    PrincipalPlaceOfBusinessIfDifferentFromRegisteredOffice: filingInfo.PrincipalPlaceOfBusinessIfDifferentFromRegisteredOffice,
    WhetherCompanyOrGroupIfConsolidatedAccountsArePreparedHasMoreThan50Employees: filingInfo.WhetherCompanyOrGroupIfConsolidatedAccountsArePreparedHasMoreThan50Employees,
    NameOfParentEntity: filingInfo.NameOfParentEntity,
    NameOfUltimateParentOfGroup: filingInfo.NameOfUltimateParentOfGroup,
    TaxonomyVersion: filingInfo.TaxonomyVersion,
    NameAndVersionOfSoftwareUsedToGenerateXBRLFile: filingInfo.NameAndVersionOfSoftwareUsedToGenerateXBRLFile,
    HowWasXBRLFilePrepared: filingInfo.HowWasXBRLFilePrepared
  };
};

/**
 * Extract simplified filing information
 */
const extractSimplifiedFilingInformation = (data: any): any => {
  const filingInfo = data.filingInformation;

  return {
    NameOfCompany: filingInfo.NameOfCompany,
    UniqueEntityNumber: filingInfo.UniqueEntityNumber,
    CurrentPeriodStartDate: filingInfo.CurrentPeriodStartDate,
    CurrentPeriodEndDate: filingInfo.CurrentPeriodEndDate,
    TypeOfXBRLFiling: filingInfo.TypeOfXBRLFiling,
    TypeOfAccountingStandardUsedToPrepareFinancialStatements: filingInfo.TypeOfAccountingStandardUsedToPrepareFinancialStatements,
    WhetherTheFinancialStatementsArePreparedOnGoingConcernBasis: filingInfo.WhetherTheFinancialStatementsArePreparedOnGoingConcernBasis,
    DescriptionOfPresentationCurrency: filingInfo.DescriptionOfPresentationCurrency,
    LevelOfRoundingUsedInFinancialStatements: filingInfo.LevelOfRoundingUsedInFinancialStatements,
    DescriptionOfNatureOfEntitysOperationsAndPrincipalActivities: filingInfo.DescriptionOfNatureOfEntitysOperationsAndPrincipalActivities,
    TaxonomyVersion: filingInfo.TaxonomyVersion,
    HowWasXBRLFilePrepared: filingInfo.HowWasXBRLFilePrepared
  };
};

/**
 * Extract financial position statement
 */
const extractFinancialPosition = (data: any): any => {
  const position = data.statementOfFinancialPosition;

  return {
    currentAssets: position.currentAssets || {
      CashAndBankBalances: null,
      TradeAndOtherReceivablesCurrent: null,
      CurrentFinanceLeaseReceivables: null,
      CurrentDerivativeFinancialAssets: null,
      CurrentFinancialAssetsMeasuredAtFairValueThroughProfitOrLoss: null,
      OtherCurrentFinancialAssets: null,
      DevelopmentProperties: null,
      Inventories: null,
      OtherCurrentNonfinancialAssets: null,
      NoncurrentAssetsOrDisposalGroupsClassifiedAsHeldForSaleOrAsHeldForDistributionToOwners: null,
      CurrentAssets: null
    },
    nonCurrentAssets: position.nonCurrentAssets || {
      TradeAndOtherReceivablesNoncurrent: null,
      NoncurrentFinanceLeaseReceivables: null,
      NoncurrentDerivativeFinancialAssets: null,
      NoncurrentFinancialAssetsMeasuredAtFairValueThroughProfitOrLoss: null,
      OtherNoncurrentFinancialAssets: null,
      PropertyPlantAndEquipment: null,
      InvestmentProperties: null,
      Goodwill: null,
      IntangibleAssetsOtherThanGoodwill: null,
      InvestmentsInSubsidiariesAssociatesOrJointVentures: null,
      DeferredTaxAssets: null,
      OtherNoncurrentNonfinancialAssets: null,
      NoncurrentAssets: null
    },
    Assets: position.Assets,
    currentLiabilities: position.currentLiabilities || {
      TradeAndOtherPayablesCurrent: null,
      CurrentLoansAndBorrowings: null,
      CurrentFinancialLiabilitiesMeasuredAtFairValueThroughProfitOrLoss: null,
      CurrentFinanceLeaseLiabilities: null,
      OtherCurrentFinancialLiabilities: null,
      CurrentIncomeTaxLiabilities: null,
      CurrentProvisions: null,
      OtherCurrentNonfinancialLiabilities: null,
      LiabilitiesClassifiedAsHeldForSale: null,
      CurrentLiabilities: null
    },
    nonCurrentLiabilities: position.nonCurrentLiabilities || {
      TradeAndOtherPayablesNoncurrent: null,
      NoncurrentLoansAndBorrowings: null,
      NoncurrentFinancialLiabilitiesMeasuredAtFairValueThroughProfitOrLoss: null,
      NoncurrentFinanceLeaseLiabilities: null,
      OtherNoncurrentFinancialLiabilities: null,
      DeferredTaxLiabilities: null,
      NoncurrentProvisions: null,
      OtherNoncurrentNonfinancialLiabilities: null,
      NoncurrentLiabilities: null
    },
    Liabilities: position.Liabilities,
    equity: position.equity || {
      ShareCapital: null,
      TreasuryShares: null,
      AccumulatedProfitsLosses: null,
      ReservesOtherThanAccumulatedProfitsLosses: null,
      NoncontrollingInterests: null,
      Equity: null
    }
  };
};

/**
 * Extract simplified financial position
 */
const extractSimplifiedFinancialPosition = (data: any): any => {
  const position = data.statementOfFinancialPosition;

  // Extract only key elements according to SFRS for Small Entities
  return {
    currentAssets: {
      CashAndBankBalances: position.currentAssets?.CashAndBankBalances,
      TradeAndOtherReceivablesCurrent: position.currentAssets?.TradeAndOtherReceivablesCurrent,
      Inventories: position.currentAssets?.Inventories,
      CurrentAssets: position.currentAssets?.CurrentAssets
    },
    nonCurrentAssets: {
      PropertyPlantAndEquipment: position.nonCurrentAssets?.PropertyPlantAndEquipment,
      NoncurrentAssets: position.nonCurrentAssets?.NoncurrentAssets
    },
    Assets: position.Assets,
    currentLiabilities: {
      TradeAndOtherPayablesCurrent: position.currentLiabilities?.TradeAndOtherPayablesCurrent,
      CurrentLoansAndBorrowings: position.currentLiabilities?.CurrentLoansAndBorrowings,
      CurrentLiabilities: position.currentLiabilities?.CurrentLiabilities
    },
    nonCurrentLiabilities: {
      NoncurrentLoansAndBorrowings: position.nonCurrentLiabilities?.NoncurrentLoansAndBorrowings,
      NoncurrentLiabilities: position.nonCurrentLiabilities?.NoncurrentLiabilities
    },
    Liabilities: position.Liabilities,
    equity: {
      ShareCapital: position.equity?.ShareCapital,
      AccumulatedProfitsLosses: position.equity?.AccumulatedProfitsLosses,
      Equity: position.equity?.Equity
    }
  };
};

/**
 * Extract income statement
 */
const extractIncomeStatement = (data: any): any => {
  const income = data.incomeStatement;

  return {
    Revenue: income.Revenue,
    OtherIncome: income.OtherIncome,
    EmployeeBenefitsExpense: income.EmployeeBenefitsExpense,
    DepreciationExpense: income.DepreciationExpense,
    AmortisationExpense: income.AmortisationExpense,
    RepairsAndMaintenanceExpense: income.RepairsAndMaintenanceExpense,
    SalesAndMarketingExpense: income.SalesAndMarketingExpense,
    OtherExpensesByNature: income.OtherExpensesByNature,
    OtherGainsLosses: income.OtherGainsLosses,
    FinanceCosts: income.FinanceCosts,
    ShareOfProfitLossOfAssociatesAndJointVenturesAccountedForUsingEquityMethod: income.ShareOfProfitLossOfAssociatesAndJointVenturesAccountedForUsingEquityMethod,
    ProfitLossBeforeTaxation: income.ProfitLossBeforeTaxation,
    TaxExpenseBenefitContinuingOperations: income.TaxExpenseBenefitContinuingOperations,
    ProfitLossFromDiscontinuedOperations: income.ProfitLossFromDiscontinuedOperations,
    ProfitLoss: income.ProfitLoss,
    ProfitLossAttributableToOwnersOfCompany: income.ProfitLossAttributableToOwnersOfCompany,
    ProfitLossAttributableToNoncontrollingInterests: income.ProfitLossAttributableToNoncontrollingInterests
  };
};

/**
 * Extract simplified income statement
 */
const extractSimplifiedIncomeStatement = (data: any): any => {
  const income = data.incomeStatement;

  // Extract only key elements for simplified framework
  return {
    Revenue: income.Revenue,
    OtherIncome: income.OtherIncome,
    ProfitLossBeforeTaxation: income.ProfitLossBeforeTaxation,
    TaxExpenseBenefitContinuingOperations: income.TaxExpenseBenefitContinuingOperations,
    ProfitLoss: income.ProfitLoss
  };
};

/**
 * Extract cash flows statement
 */
const extractCashFlows = (data: any): any => {
  const cashFlows = data.statementOfCashFlows;

  return {
    ProfitLossBeforeTaxation: cashFlows.ProfitLossBeforeTaxation,
    AdjustmentsForDepreciation: cashFlows.AdjustmentsForDepreciation,
    AdjustmentsForAmortisation: cashFlows.AdjustmentsForAmortisation,
    AdjustmentsForImpairment: cashFlows.AdjustmentsForImpairment,
    AdjustmentsForProvisions: cashFlows.AdjustmentsForProvisions,
    AdjustmentsForOtherNonCashItems: cashFlows.AdjustmentsForOtherNonCashItems,
    ChangesInWorkingCapital: cashFlows.ChangesInWorkingCapital,
    CashGeneratedFromOperations: cashFlows.CashGeneratedFromOperations,
    InterestPaid: cashFlows.InterestPaid,
    IncomeTaxesPaid: cashFlows.IncomeTaxesPaid,
    NetCashFromOperatingActivities: cashFlows.NetCashFromOperatingActivities,
    PurchaseOfPropertyPlantEquipment: cashFlows.PurchaseOfPropertyPlantEquipment,
    ProceedsFromSaleOfPropertyPlantEquipment: cashFlows.ProceedsFromSaleOfPropertyPlantEquipment,
    PurchaseOfIntangibleAssets: cashFlows.PurchaseOfIntangibleAssets,
    ProceedsFromSaleOfIntangibleAssets: cashFlows.ProceedsFromSaleOfIntangibleAssets,
    PurchaseOfInvestments: cashFlows.PurchaseOfInvestments,
    ProceedsFromSaleOfInvestments: cashFlows.ProceedsFromSaleOfInvestments,
    NetCashFromInvestingActivities: cashFlows.NetCashFromInvestingActivities,
    ProceedsFromIssueOfShareCapital: cashFlows.ProceedsFromIssueOfShareCapital,
    PurchaseOfTreasuryShares: cashFlows.PurchaseOfTreasuryShares,
    ProceedsFromBorrowings: cashFlows.ProceedsFromBorrowings,
    RepaymentOfBorrowings: cashFlows.RepaymentOfBorrowings,
    PaymentOfLeaseLiabilities: cashFlows.PaymentOfLeaseLiabilities,
    DividendsPaid: cashFlows.DividendsPaid,
    NetCashFromFinancingActivities: cashFlows.NetCashFromFinancingActivities,
    NetIncreaseDecreaseInCashAndCashEquivalents: cashFlows.NetIncreaseDecreaseInCashAndCashEquivalents,
    CashAndCashEquivalentsAtBeginningOfPeriod: cashFlows.CashAndCashEquivalentsAtBeginningOfPeriod,
    CashAndCashEquivalentsAtEndOfPeriod: cashFlows.CashAndCashEquivalentsAtEndOfPeriod
  };
};

/**
 * Extract changes in equity statement
 */
const extractChangesInEquity = (data: any): any => {
  const equity = data.statementOfChangesInEquity;

  return {
    ShareCapitalAtBeginning: equity.ShareCapitalAtBeginning,
    TreasurySharesAtBeginning: equity.TreasurySharesAtBeginning,
    AccumulatedProfitsLossesAtBeginning: equity.AccumulatedProfitsLossesAtBeginning,
    OtherReservesAtBeginning: equity.OtherReservesAtBeginning,
    NoncontrollingInterestsAtBeginning: equity.NoncontrollingInterestsAtBeginning,
    TotalEquityAtBeginning: equity.TotalEquityAtBeginning,
    IssueOfShareCapital: equity.IssueOfShareCapital,
    PurchaseOfTreasuryShares: equity.PurchaseOfTreasuryShares,
    ProfitLossForPeriod: equity.ProfitLossForPeriod,
    OtherComprehensiveIncome: equity.OtherComprehensiveIncome,
    TotalComprehensiveIncome: equity.TotalComprehensiveIncome,
    DividendsDeclared: equity.DividendsDeclared,
    TransfersToFromReserves: equity.TransfersToFromReserves,
    ChangesInNoncontrollingInterests: equity.ChangesInNoncontrollingInterests,
    ShareCapitalAtEnd: equity.ShareCapitalAtEnd,
    TreasurySharesAtEnd: equity.TreasurySharesAtEnd,
    AccumulatedProfitsLossesAtEnd: equity.AccumulatedProfitsLossesAtEnd,
    OtherReservesAtEnd: equity.OtherReservesAtEnd,
    NoncontrollingInterestsAtEnd: equity.NoncontrollingInterestsAtEnd,
    TotalEquityAtEnd: equity.TotalEquityAtEnd
  };
};

/**
 * Extract notes
 */
const extractNotes = (data: any): any => {
  const notes = data.notes;

  return {
    tradeAndOtherReceivables: notes.tradeAndOtherReceivables || {
      TradeAndOtherReceivablesDueFromThirdParties: null,
      TradeAndOtherReceivablesDueFromRelatedParties: null,
      UnbilledReceivables: null,
      OtherReceivables: null,
      TradeAndOtherReceivables: null
    },
    tradeAndOtherPayables: notes.tradeAndOtherPayables || {
      TradeAndOtherPayablesDueToThirdParties: null,
      TradeAndOtherPayablesDueToRelatedParties: null,
      DeferredIncome: null,
      OtherPayables: null,
      TradeAndOtherPayables: null
    },
    revenue: notes.revenue || {
      RevenueFromPropertyTransferredAtPointInTime: null,
      RevenueFromGoodsTransferredAtPointInTime: null,
      RevenueFromServicesTransferredAtPointInTime: null,
      RevenueFromPropertyTransferredOverTime: null,
      RevenueFromConstructionContractsOverTime: null,
      RevenueFromServicesTransferredOverTime: null,
      OtherRevenue: null,
      Revenue: null
    }
  };
};

/**
 * Extract simplified notes
 */
const extractSimplifiedNotes = (data: any): any => {
  const notes = data.notes;

  // Simplified notes structure
  return {
    tradeAndOtherReceivables: {
      TradeAndOtherReceivables: notes.tradeAndOtherReceivables?.TradeAndOtherReceivables
    },
    tradeAndOtherPayables: {
      TradeAndOtherPayables: notes.tradeAndOtherPayables?.TradeAndOtherPayables
    },
    revenue: {
      Revenue: notes.revenue?.Revenue
    }
  };
};

/**
 * Extract compliance statements
 */
const extractComplianceStatements = (data: any): any => {
  return {
    directorsStatement: data.directorsStatement || {
      WhetherInDirectorsOpinionFinancialStatementsAreDrawnUpSoAsToExhibitATrueAndFairView: null,
      WhetherThereAreReasonableGroundsToBelieveThatCompanyWillBeAbleToPayItsDebtsAsAndWhenTheyFallDueAtDateOfStatement: null
    },
    auditReport: data.auditReport || {
      TypeOfAuditOpinionInIndependentAuditorsReport: null,
      AuditingStandardsUsedToConductTheAudit: null,
      WhetherThereIsAnyMaterialUncertaintyRelatingToGoingConcern: null,
      WhetherInAuditorsOpinionAccountingAndOtherRecordsRequiredAreProperlyKept: null
    }
  };
};

/**
 * Extract audit information
 */
const extractAuditInformation = (data: any): any => {
  const auditReport = data.auditReport;

  return {
    TypeOfAuditOpinionInIndependentAuditorsReport: auditReport.TypeOfAuditOpinionInIndependentAuditorsReport,
    AuditingStandardsUsedToConductTheAudit: auditReport.AuditingStandardsUsedToConductTheAudit,
    WhetherThereIsAnyMaterialUncertaintyRelatingToGoingConcern: auditReport.WhetherThereIsAnyMaterialUncertaintyRelatingToGoingConcern,
    WhetherInAuditorsOpinionAccountingAndOtherRecordsRequiredAreProperlyKept: auditReport.WhetherInAuditorsOpinionAccountingAndOtherRecordsRequiredAreProperlyKept,

    // Add metadata for audit assessment
    auditAssessment: {
      qualifiedOrUnqualified: auditReport.TypeOfAuditOpinionInIndependentAuditorsReport === 'Unqualified' ? 'Unqualified' : 'Qualified or Other',
      hasGoingConcernIssue: auditReport.WhetherThereIsAnyMaterialUncertaintyRelatingToGoingConcern,
      properRecordsKept: auditReport.WhetherInAuditorsOpinionAccountingAndOtherRecordsRequiredAreProperlyKept
    }
  };
};

/**
 * Extract compliance status
 */
const extractComplianceStatus = (data: any): any => {
  const filingInfo = data.filingInformation;
  const auditReport = data.auditReport;
  const directorsStatement = data.directorsStatement;

  return {
    filingCompliance: {
      filingType: filingInfo.TypeOfXBRLFiling,
      accountingStandards: filingInfo.TypeOfAccountingStandardUsedToPrepareFinancialStatements,
      goingConcern: filingInfo.WhetherTheFinancialStatementsArePreparedOnGoingConcernBasis,
      comparativeChanges: filingInfo.WhetherThereAreAnyChangesToComparativeAmounts,
      taxonomyVersion: filingInfo.TaxonomyVersion,
      preparationMethod: filingInfo.HowWasXBRLFilePrepared
    },
    auditCompliance: {
      auditOpinion: auditReport.TypeOfAuditOpinionInIndependentAuditorsReport,
      goingConcernIssue: auditReport.WhetherThereIsAnyMaterialUncertaintyRelatingToGoingConcern,
      properRecordsKept: auditReport.WhetherInAuditorsOpinionAccountingAndOtherRecordsRequiredAreProperlyKept
    },
    directorsCompliance: {
      trueFairView: directorsStatement.WhetherInDirectorsOpinionFinancialStatementsAreDrawnUpSoAsToExhibitATrueAndFairView,
      solvencyStatement: directorsStatement.WhetherThereAreReasonableGroundsToBelieveThatCompanyWillBeAbleToPayItsDebtsAsAndWhenTheyFallDueAtDateOfStatement
    }
  };
};

/**
 * Extract minimal company info
 */
const extractMinimalCompanyInfo = (data: any): any => {
  const filingInfo = data.filingInformation;

  return {
    NameOfCompany: filingInfo.NameOfCompany,
    UniqueEntityNumber: filingInfo.UniqueEntityNumber,
    ReportingPeriod: `${filingInfo.CurrentPeriodStartDate || ''} to ${filingInfo.CurrentPeriodEndDate || ''}`,
    PresentationCurrency: filingInfo.DescriptionOfPresentationCurrency,
    AccountingStandard: filingInfo.TypeOfAccountingStandardUsedToPrepareFinancialStatements,
    PrincipalActivities: filingInfo.DescriptionOfNatureOfEntitysOperationsAndPrincipalActivities
  };
};

/**
 * Extract financial summary
 */
const extractFinancialSummary = (data: any): any => {
  const incomeStatement = data.incomeStatement;
  const financialPosition = data.statementOfFinancialPosition;
  const cashFlows = data.statementOfCashFlows;

  return {
    revenue: incomeStatement.Revenue,
    profitBeforeTax: incomeStatement.ProfitLossBeforeTaxation,
    netProfit: incomeStatement.ProfitLoss,
    totalAssets: financialPosition.Assets,
    totalLiabilities: financialPosition.Liabilities,
    totalEquity: financialPosition.equity?.Equity,
    cashAtEndOfPeriod: cashFlows.CashAndCashEquivalentsAtEndOfPeriod,
    operatingCashFlow: cashFlows.NetCashFromOperatingActivities
  };
};

/**
 * Extract core financials for simplified view
 */
const extractCoreFinancials = (data: any): any => {
  const incomeStatement = data.incomeStatement;
  const balanceSheet = data.statementOfFinancialPosition;
  const cashFlows = data.statementOfCashFlows;

  return {
    revenue: incomeStatement.Revenue,
    netProfit: incomeStatement.ProfitLoss,
    totalAssets: balanceSheet.Assets,
    totalEquity: balanceSheet.equity?.Equity,
    cashAndEquivalents: balanceSheet.currentAssets?.CashAndBankBalances,
    operatingCashFlow: cashFlows.NetCashFromOperatingActivities
  };
};

/**
 * Extract key highlights for simplified view
 */
const extractKeyHighlights = (data: any): any => {
  const incomeStatement = data.incomeStatement;
  const balanceSheet = data.statementOfFinancialPosition;

  // Extract key values
  const revenue = incomeStatement?.Revenue || 0;
  const netIncome = incomeStatement?.ProfitLoss || 0;
  const totalAssets = balanceSheet?.Assets || 0;
  const totalEquity = balanceSheet?.equity?.Equity || 0;

  return {
    profitMargin: {
      value: calculateRatio(netIncome, revenue),
      description: 'Net profit margin shows the percentage of revenue that translates to net profit'
    },
    returnOnEquity: {
      value: calculateRatio(netIncome, totalEquity),
      description: 'Return on equity indicates how effectively the company uses shareholder funds'
    },
    returnOnAssets: {
      value: calculateRatio(netIncome, totalAssets),
      description: 'Return on assets shows how efficiently the company uses its assets to generate profit'
    },
    currentRatio: balanceSheet?.currentAssets && balanceSheet?.currentLiabilities ? {
      value: calculateRatio(
        balanceSheet.currentAssets.CurrentAssets || 0,
        balanceSheet.currentLiabilities.CurrentLiabilities || 0
      ),
      description: 'Current ratio measures the company\'s ability to pay short-term obligations'
    } : null
  };
};

/**
 * Calculate compliance metrics
 */
const calculateComplianceMetrics = (data: any): any => {
  const filingInfo = data.filingInformation;
  const auditReport = data.auditReport;
  const directorsStatement = data.directorsStatement;

  // Calculate a simple compliance score (this is a simplified example)
  let complianceScore = 0;
  let maxPoints = 0;

  // Audit opinion points
  if (auditReport.TypeOfAuditOpinionInIndependentAuditorsReport === 'Unqualified') {
    complianceScore += 3;
  }
  maxPoints += 3;

  // Going concern points
  if (filingInfo.WhetherTheFinancialStatementsArePreparedOnGoingConcernBasis) {
    complianceScore += 1;
  }
  maxPoints += 1;

  // Going concern uncertainty points (no issues is better)
  if (auditReport.WhetherThereIsAnyMaterialUncertaintyRelatingToGoingConcern === false) {
    complianceScore += 2;
  }
  maxPoints += 2;

  // Records properly kept points
  if (auditReport.WhetherInAuditorsOpinionAccountingAndOtherRecordsRequiredAreProperlyKept) {
    complianceScore += 1;
  }
  maxPoints += 1;

  // Directors opinion points
  if (directorsStatement.WhetherInDirectorsOpinionFinancialStatementsAreDrawnUpSoAsToExhibitATrueAndFairView) {
    complianceScore += 1;
  }
  maxPoints += 1;

  // Solvency statement points
  if (directorsStatement.WhetherThereAreReasonableGroundsToBelieveThatCompanyWillBeAbleToPayItsDebtsAsAndWhenTheyFallDueAtDateOfStatement) {
    complianceScore += 2;
  }
  maxPoints += 2;

  const compliancePercentage = maxPoints > 0 ? Math.round((complianceScore / maxPoints) * 100) : 0;

  return {
    complianceScore,
    maxPoints,
    compliancePercentage,
    complianceLevel: compliancePercentage >= 90 ? 'High' : compliancePercentage >= 70 ? 'Medium' : 'Low',
    keyIssues: calculateComplianceIssues(data)
  };
};

/**
 * Calculate key compliance issues
 */
const calculateComplianceIssues = (data: any): string[] => {
  const issues: string[] = [];
  const filingInfo = data.filingInformation;
  const auditReport = data.auditReport;
  const directorsStatement = data.directorsStatement;

  // Check for audit opinion issues
  if (!auditReport.TypeOfAuditOpinionInIndependentAuditorsReport ||
    auditReport.TypeOfAuditOpinionInIndependentAuditorsReport !== 'Unqualified') {
    issues.push('Audit opinion is not unqualified');
  }

  // Check for going concern issues
  if (auditReport.WhetherThereIsAnyMaterialUncertaintyRelatingToGoingConcern) {
    issues.push('Material uncertainty related to going concern');
  }

  // Check for record keeping issues
  if (auditReport.WhetherInAuditorsOpinionAccountingAndOtherRecordsRequiredAreProperlyKept === false) {
    issues.push('Accounting and other records not properly kept');
  }

  // Check for directors opinion issues
  if (directorsStatement.WhetherInDirectorsOpinionFinancialStatementsAreDrawnUpSoAsToExhibitATrueAndFairView === false) {
    issues.push('Directors opinion does not confirm true and fair view');
  }

  // Check for solvency issues
  if (directorsStatement.WhetherThereAreReasonableGroundsToBelieveThatCompanyWillBeAbleToPayItsDebtsAsAndWhenTheyFallDueAtDateOfStatement === false) {
    issues.push('Solvency concerns noted in directors statement');
  }

  return issues;
};

/**
 * Calculate financial ratios
 */
const calculateFinancialRatios = (data: any): any => {
  const incomeStatement = data.incomeStatement;
  const balanceSheet = data.statementOfFinancialPosition;
  const cashFlows = data.statementOfCashFlows;

  // Extract necessary values
  const revenue = incomeStatement.Revenue || 0;
  const netIncome = incomeStatement.ProfitLoss || 0;
  const totalAssets = balanceSheet.Assets || 0;
  const totalLiabilities = balanceSheet.Liabilities || 0;
  const totalEquity = balanceSheet.equity?.Equity || 0;
  const currentAssets = balanceSheet.currentAssets?.CurrentAssets || 0;
  const currentLiabilities = balanceSheet.currentLiabilities?.CurrentLiabilities || 0;
  const operatingCashFlow = cashFlows.NetCashFromOperatingActivities || 0;

  // Calculate profitability ratios
  const profitMargin = calculateRatio(netIncome, revenue);
  const returnOnAssets = calculateRatio(netIncome, totalAssets);
  const returnOnEquity = calculateRatio(netIncome, totalEquity);

  // Calculate liquidity ratios
  const currentRatio = calculateRatio(currentAssets, currentLiabilities);
  const cashRatio = calculateRatio(balanceSheet.currentAssets?.CashAndBankBalances || 0, currentLiabilities);

  // Calculate solvency ratios
  const debtToEquity = calculateRatio(totalLiabilities, totalEquity);
  const equityRatio = calculateRatio(totalEquity, totalAssets);

  // Calculate efficiency ratios
  const assetTurnover = calculateRatio(revenue, totalAssets);

  // Calculate cash flow ratios
  const operatingCashFlowToSales = calculateRatio(operatingCashFlow, revenue);
  const cashFlowToDebt = calculateRatio(operatingCashFlow, totalLiabilities);

  return {
    profitability: {
      profitMargin,
      returnOnAssets,
      returnOnEquity
    },
    liquidity: {
      currentRatio,
      cashRatio
    },
    solvency: {
      debtToEquity,
      equityRatio
    },
    efficiency: {
      assetTurnover
    },
    cashFlow: {
      operatingCashFlowToSales,
      cashFlowToDebt
    }
  };
};