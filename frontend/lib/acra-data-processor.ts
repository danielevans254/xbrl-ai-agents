/**
 * Enhanced ACRA Taxonomy Data Processor
 * 
 * A specialized module for processing XBRL data according to the ACRA taxonomy standards.
 * This processor is fully compliant with the ACRA taxonomy schema and provides
 * comprehensive framework-specific transformations.
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
      case 'full-acra':
        return processFullAcraTaxonomy(dataCopy);
      case 'financial-statements':
        return processFinancialStatements(dataCopy);
      case 'compliance':
        return processComplianceFocus(dataCopy);
      case 'business-profile':
        return processBusinessProfile(dataCopy);
      case 'industry-specific':
        return processIndustrySpecific(dataCopy);
      case 'analytical':
        return processAnalyticalFramework(dataCopy);
      case 'simplified':
        return processSimplifiedView(dataCopy);
      case 'regulatory-reporting':
        return processRegulatoryReportingFramework(dataCopy);
      default:
        return addMetadata(dataCopy, 'Default View', 'Standard view of the XBRL data');
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
 * Process data for Full ACRA Taxonomy View
 * Contains all available data with full structure
 */
const processFullAcraTaxonomy = (data: any): any => {
  // The full taxonomy view keeps all data intact
  return addMetadata(
    data,
    'Full ACRA Taxonomy',
    'Complete representation with all disclosures according to ACRA taxonomy'
  );
};

/**
 * Process data for Financial Statements Framework
 * Focuses on the main financial statements
 */
const processFinancialStatements = (data: any): any => {
  // Extract financial statement sections
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
 * Process data for Compliance Focus
 * Emphasizes regulatory and compliance information
 */
const processComplianceFocus = (data: any): any => {
  // Extract compliance-related sections
  const result: any = {};

  // Include filing information
  if (data.filingInformation) {
    result.filingInformation = data.filingInformation;
  }

  // Include directors' statement
  if (data.directorsStatement) {
    result.directorsStatement = data.directorsStatement;
  }

  // Include audit report
  if (data.auditReport) {
    result.auditReport = data.auditReport;
  }

  // Extract and add compliance-related notes
  const complianceNotes = extractComplianceNotes(data);
  if (Object.keys(complianceNotes).length > 0) {
    result.complianceNotes = complianceNotes;
  }

  // Add key compliance metrics
  result.complianceMetrics = calculateComplianceMetrics(data);

  return addMetadata(
    result,
    'Compliance Focus',
    'Directors\' Statement, Auditor\'s Report, Regulatory Disclosures'
  );
};

/**
 * Process data for Business Profile View
 * Focuses on company information and structure
 */
const processBusinessProfile = (data: any): any => {
  const result: any = {};

  // Company information
  if (data.filingInformation) {
    result.companyInformation = {
      NameOfCompany: data.filingInformation.NameOfCompany,
      UniqueEntityNumber: data.filingInformation.UniqueEntityNumber,
      PrincipalActivities: data.filingInformation.DescriptionOfNatureOfEntitysOperationsAndPrincipalActivities,
      PrincipalPlaceOfBusiness: data.filingInformation.PrincipalPlaceOfBusinessIfDifferentFromRegisteredOffice,
      IsLargeCompany: data.filingInformation.WhetherCompanyOrGroupIfConsolidatedAccountsArePreparedHasMoreThan50Employees,
      ParentEntity: data.filingInformation.NameOfParentEntity,
      UltimateParentOfGroup: data.filingInformation.NameOfUltimateParentOfGroup
    };

    // Business summary
    result.businessSummary = {
      PrincipalActivities: data.filingInformation.DescriptionOfNatureOfEntitysOperationsAndPrincipalActivities,
      AccountingStandard: data.filingInformation.TypeOfAccountingStandardUsedToPrepareFinancialStatements,
      PresentationCurrency: data.filingInformation.DescriptionOfPresentationCurrency,
      FunctionalCurrency: data.filingInformation.DescriptionOfFunctionalCurrency,
      GoingConcern: data.filingInformation.WhetherTheFinancialStatementsArePreparedOnGoingConcernBasis,
      ReportingPeriod: `${data.filingInformation.CurrentPeriodStartDate} to ${data.filingInformation.CurrentPeriodEndDate}`
    };
  }

  // Financial summary
  result.financialSummary = extractFinancialSummary(data);

  return addMetadata(
    result,
    'Business Profile',
    'Company Information, Business Activities, and Key Financial Metrics'
  );
};

/**
 * Process data for Industry-Specific ACRA Views
 * Tailors data presentation based on industry
 */
const processIndustrySpecific = (data: any): any => {
  // Detect industry and apply specific transformations
  const industry = detectIndustry(data);
  let result: any = {};

  switch (industry) {
    case 'financial-services':
      result = processFinancialServicesView(data);
      break;
    case 'real-estate':
      result = processRealEstateView(data);
      break;
    case 'manufacturing':
      result = processManufacturingView(data);
      break;
    case 'retail':
      result = processRetailView(data);
      break;
    default:
      // Generic industry view
      result = processGenericIndustryView(data);
  }

  return addMetadata(
    result,
    `Industry-Specific: ${formatIndustryName(industry)}`,
    'Industry-tailored view of ACRA data',
    { industry }
  );
};

/**
 * Process data for Analytical Frameworks
 * Focuses on ratios, trends and metrics
 */
const processAnalyticalFramework = (data: any): any => {
  const result: any = {};

  // Minimal company information
  if (data.filingInformation) {
    result.filingInformation = {
      NameOfCompany: data.filingInformation.NameOfCompany,
      UniqueEntityNumber: data.filingInformation.UniqueEntityNumber,
      CurrentPeriodEndDate: data.filingInformation.CurrentPeriodEndDate,
      DescriptionOfPresentationCurrency: data.filingInformation.DescriptionOfPresentationCurrency
    };
  }

  // Financial summary for context
  result.financialSummary = extractFinancialSummary(data);

  // Calculate financial ratios and add to result
  result.keyRatios = calculateFinancialRatios(data);

  // Calculate trend analysis
  result.trendAnalysis = calculateTrendAnalysis(data);

  // Calculate compliance metrics
  result.complianceMetrics = calculateComplianceMetrics(data);

  return addMetadata(
    result,
    'Analytical Framework',
    'Financial Ratios, Trend Analysis, Performance Metrics'
  );
};

/**
 * Process data for Simplified Views
 * Provides a condensed, executive summary of data
 */
const processSimplifiedView = (data: any): any => {
  const result: any = {};

  // Executive summary
  if (data.filingInformation) {
    result.executiveSummary = {
      companyName: data.filingInformation.NameOfCompany,
      reportingPeriod: `${data.filingInformation.CurrentPeriodStartDate} to ${data.filingInformation.CurrentPeriodEndDate}`,
      currency: data.filingInformation.DescriptionOfPresentationCurrency,
      auditOpinion: data.auditReport?.TypeOfAuditOpinionInIndependentAuditorsReport,
      goingConcern: data.filingInformation.WhetherTheFinancialStatementsArePreparedOnGoingConcernBasis
    };
  }

  // Core financials
  result.keyFinancials = extractCoreFinancials(data);

  // Key highlights and metrics
  result.keyHighlights = extractKeyHighlights(data);

  return addMetadata(
    result,
    'Simplified View',
    'Executive Summary, Core Metrics, Condensed Presentation'
  );
};

/**
 * Extract compliance-related notes from the data
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
 * Extract financial summary from the data
 */
const extractFinancialSummary = (data: any): any => {
  const result: any = {};

  // Income statement highlights
  if (data.incomeStatement) {
    result.revenue = data.incomeStatement.Revenue;
    result.profitBeforeTax = data.incomeStatement.ProfitLossBeforeTaxation;
    result.netProfit = data.incomeStatement.ProfitLoss;
  }

  // Balance sheet highlights
  if (data.statementOfFinancialPosition) {
    result.totalAssets = data.statementOfFinancialPosition.Assets;
    result.totalLiabilities = data.statementOfFinancialPosition.Liabilities;

    if (data.statementOfFinancialPosition.equity) {
      result.totalEquity = data.statementOfFinancialPosition.equity.Equity;
    }
  }

  // Cash flow highlights
  if (data.statementOfCashFlows) {
    result.operatingCashFlow = data.statementOfCashFlows.NetCashFromOperatingActivities;
    result.investingCashFlow = data.statementOfCashFlows.NetCashFromInvestingActivities;
    result.financingCashFlow = data.statementOfCashFlows.NetCashFromFinancingActivities;
    result.cashAtEndOfPeriod = data.statementOfCashFlows.CashAndCashEquivalentsAtEndOfPeriod;
  }

  return result;
};

/**
 * Extract core financials for simplified view
 */
const extractCoreFinancials = (data: any): any => {
  const result: any = {};

  // Income statement core metrics
  if (data.incomeStatement) {
    result.revenue = data.incomeStatement.Revenue;
    result.operatingProfit = calculateOperatingProfit(data.incomeStatement);
    result.netProfit = data.incomeStatement.ProfitLoss;
  }

  // Balance sheet core metrics
  if (data.statementOfFinancialPosition) {
    result.totalAssets = data.statementOfFinancialPosition.Assets;
    result.totalLiabilities = data.statementOfFinancialPosition.Liabilities;

    if (data.statementOfFinancialPosition.equity) {
      result.totalEquity = data.statementOfFinancialPosition.equity.Equity;
    }

    if (data.statementOfFinancialPosition.currentAssets) {
      result.cashAndEquivalents = data.statementOfFinancialPosition.currentAssets.CashAndBankBalances;
    }
  }

  // Cash flow core metrics
  if (data.statementOfCashFlows) {
    result.operatingCashFlow = data.statementOfCashFlows.NetCashFromOperatingActivities;
  }

  return result;
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
  const result: any = {};

  // Audit status
  if (data.auditReport) {
    result.auditStatus = {
      opinion: data.auditReport.TypeOfAuditOpinionInIndependentAuditorsReport || 'Unknown',
      goingConcernIssue: data.auditReport.WhetherThereIsAnyMaterialUncertaintyRelatingToGoingConcern || false,
      properRecordsKept: data.auditReport.WhetherInAuditorsOpinionAccountingAndOtherRecordsRequiredAreProperlyKept || true
    };
  }

  // Directors' opinion
  if (data.directorsStatement) {
    result.directorsOpinion = {
      trueFairView: data.directorsStatement.WhetherInDirectorsOpinionFinancialStatementsAreDrawnUpSoAsToExhibitATrueAndFairView || false,
      solvency: data.directorsStatement.WhetherThereAreReasonableGroundsToBelieveThatCompanyWillBeAbleToPayItsDebtsAsAndWhenTheyFallDueAtDateOfStatement || false
    };
  }

  // Filing status
  if (data.filingInformation) {
    result.filingStatus = {
      filingType: data.filingInformation.TypeOfXBRLFiling || 'Unknown',
      accountingStandard: data.filingInformation.TypeOfAccountingStandardUsedToPrepareFinancialStatements || 'Unknown',
      taxonomyVersion: data.filingInformation.TaxonomyVersion || 'Unknown',
      preparationMethod: data.filingInformation.HowWasXBRLFilePrepared || 'Unknown'
    };
  }

  return result;
};

/**
 * Calculate trend analysis
 * In a real implementation with historical data, this would be more comprehensive
 */
const calculateTrendAnalysis = (data: any): any => {
  const result: any = {};

  // Current period values - in a real implementation, this would include historical data
  if (data.incomeStatement) {
    result.revenue = {
      current: data.incomeStatement.Revenue || 0,
      previousYear: null, // Would need historical data
      yoyChange: null // Would need historical data
    };

    result.netIncome = {
      current: data.incomeStatement.ProfitLoss || 0,
      previousYear: null,
      yoyChange: null
    };
  }

  if (data.statementOfFinancialPosition) {
    result.totalAssets = {
      current: data.statementOfFinancialPosition.Assets || 0,
      previousYear: null,
      yoyChange: null
    };

    result.totalLiabilities = {
      current: data.statementOfFinancialPosition.Liabilities || 0,
      previousYear: null,
      yoyChange: null
    };

    if (data.statementOfFinancialPosition.equity) {
      result.totalEquity = {
        current: data.statementOfFinancialPosition.equity.Equity || 0,
        previousYear: null,
        yoyChange: null
      };
    }
  }

  return result;
};

/**
 * Calculate financial ratios based on ACRA data
 */
const calculateFinancialRatios = (data: any): any => {
  const result: any = {};
  const incomeStatement = data.incomeStatement;
  const balanceSheet = data.statementOfFinancialPosition;

  if (!incomeStatement || !balanceSheet) {
    return result;
  }

  // Extract key values
  const revenue = incomeStatement.Revenue || 0;
  const netIncome = incomeStatement.ProfitLoss || 0;
  const totalAssets = balanceSheet.Assets || 0;
  const totalEquity = balanceSheet.equity?.Equity || 0;
  const totalLiabilities = balanceSheet.Liabilities || 0;

  // Only calculate if we have balance sheet breakdown
  if (balanceSheet.currentAssets && balanceSheet.currentLiabilities) {
    const currentAssets = balanceSheet.currentAssets.CurrentAssets || 0;
    const inventories = balanceSheet.currentAssets.Inventories || 0;
    const currentLiabilities = balanceSheet.currentLiabilities.CurrentLiabilities || 0;

    // Profitability ratios
    result.profitability = {
      returnOnEquity: calculateRatio(netIncome, totalEquity),
      returnOnAssets: calculateRatio(netIncome, totalAssets),
      netProfitMargin: calculateRatio(netIncome, revenue),
      operatingProfitMargin: calculateRatio(calculateOperatingProfit(incomeStatement), revenue)
    };

    // Liquidity ratios
    result.liquidity = {
      currentRatio: calculateRatio(currentAssets, currentLiabilities),
      quickRatio: calculateRatio(currentAssets - inventories, currentLiabilities),
      cashRatio: calculateRatio(balanceSheet.currentAssets.CashAndBankBalances || 0, currentLiabilities)
    };

    // Solvency ratios
    result.solvency = {
      debtToEquity: calculateRatio(totalLiabilities, totalEquity),
      debtToAssets: calculateRatio(totalLiabilities, totalAssets),
      equityRatio: calculateRatio(totalEquity, totalAssets),
      interestCoverage: calculateRatio(
        calculateOperatingProfit(incomeStatement),
        incomeStatement.FinanceCosts || 0
      )
    };

    // Efficiency ratios
    result.efficiency = {
      assetTurnover: calculateRatio(revenue, totalAssets),
      inventoryTurnover: calculateInventoryTurnover(data),
      receivablesDays: calculateReceivablesDays(data),
      payablesDays: calculatePayablesDays(data)
    };
  }

  return result;
};

/**
 * Process data specifically for financial services industry
 */
const processFinancialServicesView = (data: any): any => {
  const result: any = {};

  // Company information
  if (data.filingInformation) {
    result.companyInformation = {
      NameOfCompany: data.filingInformation.NameOfCompany,
      UniqueEntityNumber: data.filingInformation.UniqueEntityNumber,
      ReportingPeriod: `${data.filingInformation.CurrentPeriodStartDate} to ${data.filingInformation.CurrentPeriodEndDate}`
    };
  }

  // Financial highlights
  if (data.incomeStatement && data.statementOfFinancialPosition) {
    result.financialHighlights = {
      revenue: data.incomeStatement.Revenue,
      netProfit: data.incomeStatement.ProfitLoss,
      totalAssets: data.statementOfFinancialPosition.Assets,
      totalLiabilities: data.statementOfFinancialPosition.Liabilities,
      totalEquity: data.statementOfFinancialPosition.equity?.Equity
    };
  }

  // Financial assets
  if (data.statementOfFinancialPosition) {
    const balanceSheet = data.statementOfFinancialPosition;
    result.financialAssets = {
      currentFinancialAssets: balanceSheet.currentAssets?.CurrentFinancialAssetsMeasuredAtFairValueThroughProfitOrLoss,
      nonCurrentFinancialAssets: balanceSheet.nonCurrentAssets?.NoncurrentFinancialAssetsMeasuredAtFairValueThroughProfitOrLoss,
      tradeReceivables: balanceSheet.currentAssets?.TradeAndOtherReceivablesCurrent,
      cashAndCashEquivalents: balanceSheet.currentAssets?.CashAndBankBalances
    };

    // Financial liabilities
    result.financialLiabilities = {
      currentLoans: balanceSheet.currentLiabilities?.CurrentLoansAndBorrowings,
      nonCurrentLoans: balanceSheet.nonCurrentLiabilities?.NoncurrentLoansAndBorrowings,
      tradePayables: balanceSheet.currentLiabilities?.TradeAndOtherPayablesCurrent
    };
  }

  // Financial service specific ratios
  result.keyRatios = calculateFinancialServiceRatios(data);

  return result;
};

/**
 * Calculate financial service specific ratios
 */
const calculateFinancialServiceRatios = (data: any): any => {
  const result: any = {};
  const incomeStatement = data.incomeStatement;
  const balanceSheet = data.statementOfFinancialPosition;

  if (!incomeStatement || !balanceSheet) {
    return result;
  }

  // Financial services specific metrics
  if (balanceSheet.currentAssets && balanceSheet.nonCurrentAssets) {
    const totalFinancialAssets =
      (balanceSheet.currentAssets.CurrentFinancialAssetsMeasuredAtFairValueThroughProfitOrLoss || 0) +
      (balanceSheet.nonCurrentAssets.NoncurrentFinancialAssetsMeasuredAtFairValueThroughProfitOrLoss || 0);

    const totalFinancialLiabilities =
      (balanceSheet.currentLiabilities?.CurrentFinancialLiabilitiesMeasuredAtFairValueThroughProfitOrLoss || 0) +
      (balanceSheet.nonCurrentLiabilities?.NoncurrentFinancialLiabilitiesMeasuredAtFairValueThroughProfitOrLoss || 0);

    result.assetQuality = {
      financialAssetsToTotalAssets: calculateRatio(totalFinancialAssets, balanceSheet.Assets || 0)
    };

    result.profitability = {
      returnOnFinancialAssets: calculateRatio(incomeStatement.ProfitLoss || 0, totalFinancialAssets)
    };

    result.leverage = {
      financialLiabilitiesToEquity: calculateRatio(totalFinancialLiabilities, balanceSheet.equity?.Equity || 0)
    };
  }

  return result;
};

/**
 * Process data specifically for real estate industry
 */
const processRealEstateView = (data: any): any => {
  const result: any = {};

  // Company information
  if (data.filingInformation) {
    result.companyInformation = {
      NameOfCompany: data.filingInformation.NameOfCompany,
      UniqueEntityNumber: data.filingInformation.UniqueEntityNumber,
      ReportingPeriod: `${data.filingInformation.CurrentPeriodStartDate} to ${data.filingInformation.CurrentPeriodEndDate}`
    };
  }

  // Property assets
  if (data.statementOfFinancialPosition) {
    const balanceSheet = data.statementOfFinancialPosition;
    result.propertyAssets = {
      investmentProperties: balanceSheet.nonCurrentAssets?.InvestmentProperties,
      developmentProperties: balanceSheet.currentAssets?.DevelopmentProperties,
      propertyPlantEquipment: balanceSheet.nonCurrentAssets?.PropertyPlantAndEquipment
    };
  }

  // Financial performance
  if (data.incomeStatement) {
    result.financialPerformance = {
      revenue: data.incomeStatement.Revenue,
      profitBeforeTax: data.incomeStatement.ProfitLossBeforeTaxation,
      netProfit: data.incomeStatement.ProfitLoss
    };
  }

  // Financial position
  if (data.statementOfFinancialPosition) {
    const balanceSheet = data.statementOfFinancialPosition;
    result.financialPosition = {
      totalAssets: balanceSheet.Assets,
      totalLiabilities: balanceSheet.Liabilities,
      totalEquity: balanceSheet.equity?.Equity,
      currentRatio: calculateRatio(
        balanceSheet.currentAssets?.CurrentAssets || 0,
        balanceSheet.currentLiabilities?.CurrentLiabilities || 0
      )
    };

    // Debt position
    const currentLoans = balanceSheet.currentLiabilities?.CurrentLoansAndBorrowings || 0;
    const nonCurrentLoans = balanceSheet.nonCurrentLiabilities?.NoncurrentLoansAndBorrowings || 0;
    result.debtPosition = {
      currentLoans,
      nonCurrentLoans,
      totalLoans: currentLoans + nonCurrentLoans,
      debtToEquityRatio: calculateRatio(
        currentLoans + nonCurrentLoans,
        balanceSheet.equity?.Equity || 0
      )
    };
  }

  return result;
};

/**
 * Process data specifically for manufacturing industry
 */
const processManufacturingView = (data: any): any => {
  const result: any = {};

  // Company information
  if (data.filingInformation) {
    result.companyInformation = {
      NameOfCompany: data.filingInformation.NameOfCompany,
      UniqueEntityNumber: data.filingInformation.UniqueEntityNumber,
      ReportingPeriod: `${data.filingInformation.CurrentPeriodStartDate} to ${data.filingInformation.CurrentPeriodEndDate}`
    };
  }

  // Operational assets
  if (data.statementOfFinancialPosition) {
    const balanceSheet = data.statementOfFinancialPosition;
    result.operationalAssets = {
      propertyPlantEquipment: balanceSheet.nonCurrentAssets?.PropertyPlantAndEquipment,
      inventories: balanceSheet.currentAssets?.Inventories,
      tradeReceivables: balanceSheet.currentAssets?.TradeAndOtherReceivablesCurrent
    };
  }

  // Operational performance
  if (data.incomeStatement) {
    result.operationalPerformance = {
      revenue: data.incomeStatement.Revenue,
      employeeBenefitsExpense: data.incomeStatement.EmployeeBenefitsExpense,
      depreciation: data.incomeStatement.DepreciationExpense,
      repairsAndMaintenance: data.incomeStatement.RepairsAndMaintenanceExpense
    };
  }

  // Financial performance
  if (data.incomeStatement) {
    const incomeStatement = data.incomeStatement;
    const operatingProfit = calculateOperatingProfit(incomeStatement);

    result.financialPerformance = {
      grossProfit: calculateGrossProfit(incomeStatement),
      grossMargin: calculateRatio(calculateGrossProfit(incomeStatement), incomeStatement.Revenue),
      operatingProfit,
      operatingMargin: calculateRatio(operatingProfit, incomeStatement.Revenue),
      netProfit: incomeStatement.ProfitLoss,
      netMargin: calculateRatio(incomeStatement.ProfitLoss, incomeStatement.Revenue)
    };
  }

  // Operational efficiency
  result.operationalEfficiency = {
    inventoryTurnover: calculateInventoryTurnover(data),
    assetTurnover: data.statementOfFinancialPosition?.Assets ?
      calculateRatio(data.incomeStatement?.Revenue || 0, data.statementOfFinancialPosition.Assets) : null,
    receivablesDays: calculateReceivablesDays(data)
  };

  return result;
};

/**
 * Process data specifically for retail industry
 */
const processRetailView = (data: any): any => {
  const result: any = {};

  // Company information
  if (data.filingInformation) {
    result.companyInformation = {
      NameOfCompany: data.filingInformation.NameOfCompany,
      UniqueEntityNumber: data.filingInformation.UniqueEntityNumber,
      ReportingPeriod: `${data.filingInformation.CurrentPeriodStartDate} to ${data.filingInformation.CurrentPeriodEndDate}`
    };
  }

  // Inventory management
  if (data.statementOfFinancialPosition) {
    const balanceSheet = data.statementOfFinancialPosition;
    const inventories = balanceSheet.currentAssets?.Inventories || 0;

    result.inventoryManagement = {
      inventories,
      inventoryTurnover: calculateInventoryTurnover(data),
      inventoryToTotalAssets: calculateRatio(
        inventories,
        balanceSheet.Assets || 0
      )
    };
  }

  // Sales performance
  if (data.incomeStatement) {
    const incomeStatement = data.incomeStatement;
    const revenue = incomeStatement.Revenue || 0;
    const salesAndMarketingExpense = incomeStatement.SalesAndMarketingExpense || 0;

    result.salesPerformance = {
      revenue,
      salesAndMarketingExpense,
      salesAndMarketingRatio: calculateRatio(salesAndMarketingExpense, revenue)
    };
  }

  // Profitability metrics
  if (data.incomeStatement) {
    const incomeStatement = data.incomeStatement;
    const grossProfit = calculateGrossProfit(incomeStatement);
    const operatingProfit = calculateOperatingProfit(incomeStatement);

    result.profitabilityMetrics = {
      grossProfit,
      grossMargin: calculateRatio(grossProfit, incomeStatement.Revenue),
      operatingProfit,
      operatingMargin: calculateRatio(operatingProfit, incomeStatement.Revenue),
      netProfit: incomeStatement.ProfitLoss,
      netMargin: calculateRatio(incomeStatement.ProfitLoss, incomeStatement.Revenue)
    };
  }

  // Operational efficiency
  if (data.statementOfFinancialPosition) {
    const balanceSheet = data.statementOfFinancialPosition;

    result.operationalEfficiency = {
      currentRatio: calculateRatio(
        balanceSheet.currentAssets?.CurrentAssets || 0,
        balanceSheet.currentLiabilities?.CurrentLiabilities || 0
      ),
      quickRatio: calculateQuickRatio(balanceSheet),
      receivablesDays: calculateReceivablesDays(data),
      payablesDays: calculatePayablesDays(data)
    };
  }

  return result;
};

/**
 * Process data for a generic industry view
 */
const processGenericIndustryView = (data: any): any => {
  const result: any = {};

  // Company information
  if (data.filingInformation) {
    result.companyInformation = {
      NameOfCompany: data.filingInformation.NameOfCompany,
      UniqueEntityNumber: data.filingInformation.UniqueEntityNumber,
      ReportingPeriod: `${data.filingInformation.CurrentPeriodStartDate} to ${data.filingInformation.CurrentPeriodEndDate}`,
      PrincipalActivities: data.filingInformation.DescriptionOfNatureOfEntitysOperationsAndPrincipalActivities
    };
  }

  // Financial performance
  if (data.incomeStatement) {
    result.financialPerformance = {
      revenue: data.incomeStatement.Revenue,
      grossProfit: calculateGrossProfit(data.incomeStatement),
      operatingProfit: calculateOperatingProfit(data.incomeStatement),
      profitBeforeTax: data.incomeStatement.ProfitLossBeforeTaxation,
      netProfit: data.incomeStatement.ProfitLoss
    };
  }

  // Financial position
  if (data.statementOfFinancialPosition) {
    const balanceSheet = data.statementOfFinancialPosition;

    result.financialPosition = {
      currentAssets: balanceSheet.currentAssets?.CurrentAssets,
      nonCurrentAssets: balanceSheet.nonCurrentAssets?.NoncurrentAssets,
      totalAssets: balanceSheet.Assets,
      currentLiabilities: balanceSheet.currentLiabilities?.CurrentLiabilities,
      nonCurrentLiabilities: balanceSheet.nonCurrentLiabilities?.NoncurrentLiabilities,
      totalLiabilities: balanceSheet.Liabilities,
      totalEquity: balanceSheet.equity?.Equity
    };
  }

  // Cash flow summary
  if (data.statementOfCashFlows) {
    const cashFlows = data.statementOfCashFlows;

    result.cashFlowSummary = {
      operatingCashFlow: cashFlows.NetCashFromOperatingActivities,
      investingCashFlow: cashFlows.NetCashFromInvestingActivities,
      financingCashFlow: cashFlows.NetCashFromFinancingActivities,
      netCashFlow: cashFlows.NetIncreaseDecreaseInCashAndCashEquivalents,
      cashAtEndOfPeriod: cashFlows.CashAndCashEquivalentsAtEndOfPeriod
    };
  }

  // Key ratios
  if (data.incomeStatement && data.statementOfFinancialPosition) {
    const incomeStatement = data.incomeStatement;
    const balanceSheet = data.statementOfFinancialPosition;

    result.keyRatios = {
      currentRatio: balanceSheet.currentAssets && balanceSheet.currentLiabilities ?
        calculateRatio(
          balanceSheet.currentAssets.CurrentAssets || 0,
          balanceSheet.currentLiabilities.CurrentLiabilities || 0
        ) : null,
      debtToEquity: calculateRatio(
        balanceSheet.Liabilities || 0,
        balanceSheet.equity?.Equity || 0
      ),
      returnOnEquity: calculateRatio(
        incomeStatement.ProfitLoss || 0,
        balanceSheet.equity?.Equity || 0
      ),
      netProfitMargin: calculateRatio(
        incomeStatement.ProfitLoss || 0,
        incomeStatement.Revenue || 0
      )
    };
  }

  return result;
};

/**
 * Helper utility functions
 */

/**
 * Detect the industry based on company description and balance sheet structure
 */
const detectIndustry = (data: any): string => {
  const filingInfo = data.filingInformation;
  const description = filingInfo?.DescriptionOfNatureOfEntitysOperationsAndPrincipalActivities || '';
  const descriptionLower = description.toLowerCase();

  // Financial services indicators
  if (containsAny(descriptionLower, [
    'bank', 'insurance', 'finance', 'investment', 'asset management',
    'capital market', 'securities', 'trading', 'treasury', 'loan'
  ])) {
    return 'financial-services';
  }

  // Real estate indicators
  if (containsAny(descriptionLower, [
    'property', 'real estate', 'reits', 'leasing', 'rental',
    'development', 'construction', 'building', 'land'
  ])) {
    return 'real-estate';
  }

  // Manufacturing indicators
  if (containsAny(descriptionLower, [
    'manufactur', 'production', 'factory', 'assembly', 'industrial',
    'product', 'material', 'component', 'processing'
  ])) {
    return 'manufacturing';
  }

  // Retail indicators
  if (containsAny(descriptionLower, [
    'retail', 'wholesale', 'store', 'shop', 'consumer',
    'merchandise', 'inventory', 'e-commerce', 'distribution'
  ])) {
    return 'retail';
  }

  // If we can't determine from description, check balance sheet components
  const balanceSheet = data.statementOfFinancialPosition;
  if (balanceSheet) {
    // Financial services often have high financial assets
    if ((balanceSheet.currentAssets?.CurrentFinancialAssetsMeasuredAtFairValueThroughProfitOrLoss || 0) > 0 ||
      (balanceSheet.nonCurrentAssets?.NoncurrentFinancialAssetsMeasuredAtFairValueThroughProfitOrLoss || 0) > 0) {
      return 'financial-services';
    }

    // Real estate companies have investment properties
    if ((balanceSheet.nonCurrentAssets?.InvestmentProperties || 0) > 0) {
      return 'real-estate';
    }

    // Manufacturing has significant inventories and PPE
    if ((balanceSheet.currentAssets?.Inventories || 0) > 0 &&
      (balanceSheet.nonCurrentAssets?.PropertyPlantAndEquipment || 0) > 0) {
      return 'manufacturing';
    }

    // Retail has significant inventories
    if ((balanceSheet.currentAssets?.Inventories || 0) > 0) {
      return 'retail';
    }
  }

  return 'generic';
};

/**
 * Format industry name for display
 */
const formatIndustryName = (industry: string): string => {
  switch (industry) {
    case 'financial-services':
      return 'Financial Services';
    case 'real-estate':
      return 'Real Estate';
    case 'manufacturing':
      return 'Manufacturing';
    case 'retail':
      return 'Retail & Consumer Services';
    default:
      return 'General Business';
  }
};

/**
 * Check if a string contains any of the given keywords
 */
const containsAny = (text: string, keywords: string[]): boolean => {
  if (!text) return false;
  return keywords.some(keyword => text.includes(keyword.toLowerCase()));
};

/**
 * Calculate operating profit from income statement
 */
const calculateOperatingProfit = (incomeStatement: any): number => {
  if (!incomeStatement) return 0;

  // In ACRA taxonomy, ProfitLossBeforeTaxation includes finance costs
  // So we need to add back finance costs to get operating profit
  const profitBeforeTax = incomeStatement.ProfitLossBeforeTaxation || 0;
  const financeCosts = incomeStatement.FinanceCosts || 0;

  return profitBeforeTax + financeCosts;
};

/**
 * Calculate gross profit from income statement
 * In ACRA, this might need to be estimated if not directly provided
 */
const calculateGrossProfit = (incomeStatement: any): number => {
  if (!incomeStatement) return 0;

  // If available, use Revenue - Cost of Sales
  const revenue = incomeStatement.Revenue || 0;

  // ACRA might not have Cost of Sales directly, so this is an approximation
  // In a real implementation, you would adapt this to actual ACRA data structure
  return revenue * 0.3; // Assuming 30% gross margin as a simplification
};

/**
 * Calculate inventory turnover ratio
 */
const calculateInventoryTurnover = (data: any): number | null => {
  const incomeStatement = data.incomeStatement;
  const balanceSheet = data.statementOfFinancialPosition;

  if (!incomeStatement || !balanceSheet?.currentAssets) return null;

  // Estimate COGS as a percentage of revenue since it might not be directly available
  const revenue = incomeStatement.Revenue || 0;
  const estimatedCOGS = revenue * 0.7; // Assuming 70% COGS as a simplification

  const inventories = balanceSheet.currentAssets.Inventories || 0;

  if (inventories === 0) return null; // Avoid division by zero

  return estimatedCOGS / inventories;
};

/**
 * Calculate receivables turnover ratio
 */
const calculateReceivablesTurnover = (data: any): number | null => {
  const incomeStatement = data.incomeStatement;
  const balanceSheet = data.statementOfFinancialPosition;

  if (!incomeStatement || !balanceSheet?.currentAssets) return null;

  const revenue = incomeStatement.Revenue || 0;
  const receivables = balanceSheet.currentAssets.TradeAndOtherReceivablesCurrent || 0;

  if (receivables === 0) return null; // Avoid division by zero

  return revenue / receivables;
};

/**
 * Calculate payables turnover ratio
 */
const calculatePayablesTurnover = (data: any): number | null => {
  const incomeStatement = data.incomeStatement;
  const balanceSheet = data.statementOfFinancialPosition;

  if (!incomeStatement || !balanceSheet?.currentLiabilities) return null;

  // Estimate COGS
  const revenue = incomeStatement.Revenue || 0;
  const estimatedCOGS = revenue * 0.7; // Simplification

  const payables = balanceSheet.currentLiabilities.TradeAndOtherPayablesCurrent || 0;

  if (payables === 0) return null; // Avoid division by zero

  return estimatedCOGS / payables;
};

/**
 * Calculate receivables days
 */
const calculateReceivablesDays = (data: any): number | null => {
  const receivablesTurnover = calculateReceivablesTurnover(data);

  if (!receivablesTurnover) return null;

  return 365 / receivablesTurnover;
};

/**
 * Calculate payables days
 */
const calculatePayablesDays = (data: any): number | null => {
  const payablesTurnover = calculatePayablesTurnover(data);

  if (!payablesTurnover) return null;

  return 365 / payablesTurnover;
};

/**
 * Calculate quick ratio
 */
const calculateQuickRatio = (balanceSheet: any): number | null => {
  if (!balanceSheet?.currentAssets || !balanceSheet?.currentLiabilities) return null;

  const currentAssets = balanceSheet.currentAssets.CurrentAssets || 0;
  const inventories = balanceSheet.currentAssets.Inventories || 0;
  const currentLiabilities = balanceSheet.currentLiabilities.CurrentLiabilities || 0;

  if (currentLiabilities === 0) return null; // Avoid division by zero

  return (currentAssets - inventories) / currentLiabilities;
};

/**
 * Helper function to calculate a ratio and handle division by zero
 */
const calculateRatio = (numerator: number, denominator: number): number | null => {
  if (numerator === null || numerator === undefined) return null;
  if (denominator === null || denominator === undefined || denominator === 0) return null;

  return numerator / denominator;
};