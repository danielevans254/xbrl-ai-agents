import { validateFinancialStatement, debugBalanceSheet } from '../../backend/src/retrieval_graph/schema';

/**
 * Comprehensive Jest test suite for financial statement validation
 * Focused on ACRA taxonomy compliance for PDF extraction
 */
describe('Financial Statement Validation for ACRA Compliance', () => {
  // Example balance sheet in current/non-current format with all required fields
  const validBalanceSheet = {
    statementType: "currentNonCurrent",
    consolidatedAndSeparate: "Consolidated",
    assets: {
      currentAssets: {
        cashAndBankBalances: 123456,
        tradeAndOtherReceivables: 78900,
        leaseReceivables: 12500,
        financialAssetsDerivatives: 5200,
        financialAssetsFairValueThroughProfitOrLoss: 15000,
        otherFinancialAssets: 8700,
        inventoriesDevelopmentProperties: 35000,
        inventoriesOthers: 45600,
        otherNonFinancialAssets: 7800,
        nonCurrentAssetsHeldForSale: 0,
        totalCurrentAssets: 332156
      },
      nonCurrentAssets: {
        tradeAndOtherReceivables: 42000,
        leaseReceivables: 15000,
        financialAssetsDerivatives: 0,
        financialAssetsFairValueThroughProfitOrLoss: 28000,
        otherFinancialAssets: 12000,
        propertyPlantAndEquipment: 890000,
        investmentProperties: 320000,
        goodwill: 45000,
        intangibleAssets: 56000,
        investmentsInSubsidiariesJointVenturesAndAssociates: 78000,
        deferredTaxAssets: 12000,
        otherNonFinancialAssets: 5000,
        totalNonCurrentAssets: 1503000
      },
      totalAssets: 1835156
    },
    liabilities: {
      currentLiabilities: {
        tradeAndOtherPayables: 67800,
        loansAndBorrowings: 23400,
        financialLiabilitiesDerivativesAndFairValue: 5600,
        leaseliabilities: 15000,
        otherFinancialLiabilities: 8200,
        incomeTaxLiabilities: 18500,
        provisions: 12000,
        otherNonFinancialLiabilities: 7500,
        liabilitiesInDisposalGroups: 0,
        totalCurrentLiabilities: 158000
      },
      nonCurrentLiabilities: {
        tradeAndOtherPayables: 15000,
        loansAndBorrowings: 245000,
        financialLiabilitiesDerivativesAndFairValue: 8000,
        leaseliabilities: 45000,
        otherFinancialLiabilities: 12000,
        deferredTaxLiabilities: 35000,
        provisions: 25000,
        otherNonFinancialLiabilities: 10000,
        totalNonCurrentLiabilities: 395000
      },
      totalLiabilities: 553000
    },
    equity: {
      shareCapital: 500000,
      treasuryShares: -15000,
      accumulatedProfitsLosses: 672156,
      otherReservesAttributableToOwnersOfCompany: 85000,
      nonControllingInterests: 40000,
      totalEquity: 1282156
    }
  };

  // Example income statement with comprehensive fields
  const validIncomeStatement = {
    statementType: "incomeStatement",
    consolidatedAndSeparate: "Consolidated",
    revenue: 750000,
    otherIncome: 15000,
    employeeBenefitsExpense: 250000,
    depreciationExpense: 45000,
    amortisationExpense: 12000,
    repairsAndMaintenanceExpense: 35000,
    salesAndMarketingExpense: 68000,
    otherExpenses: 120000,
    otherGainsLosses: 25000,
    financeNetCosts: 18000,
    shareOfProfitLossOfAssociatesAndJointVentures: 8000,
    profitLossBeforeTaxation: 250000,
    incomeTaxExpenseBenefit: 50000,
    profitLossFromDiscontinuedOperations: 0,
    totalProfitLoss: 200000,
    profitLossAttributableTo: {
      ownersOfCompany: 180000,
      nonControllingInterests: 20000
    }
  };

  // Example revenue note with comprehensive breakdown
  const validRevenueNote = {
    statementType: "revenueNote",
    consolidatedAndSeparate: "Consolidated",
    revenueRecognisedAtPointInTimeProperties: 150000,
    revenueRecognisedAtPointInTimeGoods: 250000,
    revenueRecognisedAtPointInTimeServices: 50000,
    revenueRecognisedOverTimeProperties: 100000,
    revenueRecognisedOverTimeConstructionContracts: 80000,
    revenueRecognisedOverTimeServices: 95000,
    revenueOthers: 25000,
    totalRevenue: 750000
  };

  // Example trade and other receivables note
  const validReceivablesNote = {
    statementType: "tradeAndOtherReceivablesNote",
    consolidatedAndSeparate: "Consolidated",
    tradeReceivablesDueFromThirdParties: 85000,
    tradeReceivablesDueFromRelatedParties: 12000,
    contractAssets: 15000,
    nonTradeReceivables: 8900,
    totalTradeAndOtherReceivables: 120900
  };

  // Example trade and other payables note
  const validPayablesNote = {
    statementType: "tradeAndOtherPayablesNote",
    consolidatedAndSeparate: "Consolidated",
    tradePayablesDueToThirdParties: 52000,
    tradePayablesDueToRelatedParties: 8800,
    contractLiabilities: 12000,
    nonTradePayables: 10000,
    totalTradeAndOtherPayables: 82800
  };

  // Example balance sheet in order of liquidity format
  const validLiquidityBalanceSheet = {
    statementType: "orderOfLiquidity",
    consolidatedAndSeparate: "Consolidated",
    assets: {
      totalAssets: 1835156
    },
    liabilities: {
      totalLiabilities: 553000
    },
    equity: {
      shareCapital: 500000,
      treasuryShares: -15000,
      accumulatedProfitsLosses: 672156,
      otherReservesAttributableToOwnersOfCompany: 85000,
      nonControllingInterests: 40000,
      totalEquity: 1282156
    }
  };

  // Create invalid examples for testing
  const invalidBalanceSheet = JSON.parse(JSON.stringify(validBalanceSheet));
  delete invalidBalanceSheet.assets.totalAssets;

  const invalidIncomeStatement = JSON.parse(JSON.stringify(validIncomeStatement));
  delete invalidIncomeStatement.profitLossBeforeTaxation;

  const invalidRevenueNote = JSON.parse(JSON.stringify(validRevenueNote));
  delete invalidRevenueNote.totalRevenue;

  const invalidEquityBalanceSheet = JSON.parse(JSON.stringify(validBalanceSheet));
  delete invalidEquityBalanceSheet.equity.shareCapital;

  // Variable to store validation results for debugging
  let validationResult;

  beforeEach(() => {
    // Reset validation result before each test
    validationResult = undefined;
  });

  // BASIC VALIDATION TESTS

  test('validates a valid current/non-current balance sheet', () => {
    validationResult = validateFinancialStatement(validBalanceSheet);

    if (!validationResult.success) {
      console.log('Validation errors:', JSON.stringify(validationResult.errors, null, 2));
    }

    expect(validationResult.success).toBeTruthy();
    if (validationResult.success) {
      expect(validationResult.data).toMatchObject(validBalanceSheet);
    }
  });

  test('validates a valid order of liquidity balance sheet', () => {
    validationResult = validateFinancialStatement(validLiquidityBalanceSheet);

    if (!validationResult.success) {
      console.log('Validation errors:', JSON.stringify(validationResult.errors, null, 2));
    }

    expect(validationResult.success).toBeTruthy();
    if (validationResult.success) {
      expect(validationResult.data).toMatchObject(validLiquidityBalanceSheet);
    }
  });

  test('validates a valid income statement', () => {
    validationResult = validateFinancialStatement(validIncomeStatement);

    if (!validationResult.success) {
      console.log('Validation errors:', JSON.stringify(validationResult.errors, null, 2));
    }

    expect(validationResult.success).toBeTruthy();
    if (validationResult.success) {
      expect(validationResult.data).toMatchObject(validIncomeStatement);
    }
  });

  test('validates a valid revenue note', () => {
    validationResult = validateFinancialStatement(validRevenueNote);

    if (!validationResult.success) {
      console.log('Validation errors:', JSON.stringify(validationResult.errors, null, 2));
    }

    expect(validationResult.success).toBeTruthy();
    if (validationResult.success) {
      expect(validationResult.data).toMatchObject(validRevenueNote);
    }
  });

  test('validates a valid trade receivables note', () => {
    validationResult = validateFinancialStatement(validReceivablesNote);

    if (!validationResult.success) {
      console.log('Validation errors:', JSON.stringify(validationResult.errors, null, 2));
    }

    expect(validationResult.success).toBeTruthy();
    if (validationResult.success) {
      expect(validationResult.data).toMatchObject(validReceivablesNote);
    }
  });

  test('validates a valid trade payables note', () => {
    validationResult = validateFinancialStatement(validPayablesNote);

    if (!validationResult.success) {
      console.log('Validation errors:', JSON.stringify(validationResult.errors, null, 2));
    }

    expect(validationResult.success).toBeTruthy();
    if (validationResult.success) {
      expect(validationResult.data).toMatchObject(validPayablesNote);
    }
  });

  // REJECTION TESTS

  test('rejects a balance sheet without totalAssets', () => {
    const result = validateFinancialStatement(invalidBalanceSheet);
    expect(result.success).toBeFalsy();

    if (!result.success) {
      expect(result.errors).toBeDefined();
      const hasExpectedError = result.errors.some(
        error => error.path === 'assets.totalAssets' && error.message === 'Required'
      );
      expect(hasExpectedError).toBeTruthy();
    }
  });

  test('rejects an income statement without profitLossBeforeTaxation', () => {
    const result = validateFinancialStatement(invalidIncomeStatement);
    expect(result.success).toBeFalsy();

    if (!result.success) {
      expect(result.errors).toBeDefined();
      const hasExpectedError = result.errors.some(
        error => error.path === 'profitLossBeforeTaxation' && error.message === 'Required'
      );
      expect(hasExpectedError).toBeTruthy();
    }
  });

  test('rejects a revenue note without totalRevenue', () => {
    const result = validateFinancialStatement(invalidRevenueNote);
    expect(result.success).toBeFalsy();

    if (!result.success) {
      expect(result.errors).toBeDefined();
      const hasExpectedError = result.errors.some(
        error => error.path === 'totalRevenue' && error.message === 'Required'
      );
      expect(hasExpectedError).toBeTruthy();
    }
  });

  test('rejects a balance sheet without shareCapital', () => {
    const result = validateFinancialStatement(invalidEquityBalanceSheet);
    expect(result.success).toBeFalsy();

    if (!result.success) {
      expect(result.errors).toBeDefined();
      const hasExpectedError = result.errors.some(
        error => error.path === 'equity.shareCapital' && error.message === 'Required'
      );
      expect(hasExpectedError).toBeTruthy();
    }
  });

  // STATEMENT TYPE IDENTIFICATION TESTS

  test('correctly identifies all statement types', () => {
    const types = [
      { data: validBalanceSheet, expectedType: "currentNonCurrent" },
      { data: validLiquidityBalanceSheet, expectedType: "orderOfLiquidity" },
      { data: validIncomeStatement, expectedType: "incomeStatement" },
      { data: validRevenueNote, expectedType: "revenueNote" },
      { data: validReceivablesNote, expectedType: "tradeAndOtherReceivablesNote" },
      { data: validPayablesNote, expectedType: "tradeAndOtherPayablesNote" }
    ];

    for (const { data, expectedType } of types) {
      const result = validateFinancialStatement(data);

      if (!result.success) {
        console.log(`Validation failed for expected type ${expectedType}:`, result.errors);
        continue;
      }

      expect(result.data.statementType).toBe(expectedType);
    }
  });

  // FINANCIAL CALCULATIONS TESTS

  test('validates balance sheet equation (Assets = Liabilities + Equity)', () => {
    validationResult = validateFinancialStatement(validBalanceSheet);

    if (!validationResult.success) {
      console.log('Skipping balance sheet equation test due to validation failure');
      return;
    }

    const data = validationResult.data;
    expect(data.assets.totalAssets).toBe(data.liabilities.totalLiabilities + data.equity.totalEquity);
  });

  test('validates current assets totals', () => {
    validationResult = validateFinancialStatement(validBalanceSheet);

    if (!validationResult.success) {
      console.log('Skipping current assets test due to validation failure');
      return;
    }

    const data = validationResult.data;
    const currentAssets = data.assets.currentAssets;

    // Sum all non-total current asset values
    const currentAssetsSum =
      (currentAssets.cashAndBankBalances || 0) +
      (currentAssets.tradeAndOtherReceivables || 0) +
      (currentAssets.leaseReceivables || 0) +
      (currentAssets.financialAssetsDerivatives || 0) +
      (currentAssets.financialAssetsFairValueThroughProfitOrLoss || 0) +
      (currentAssets.otherFinancialAssets || 0) +
      (currentAssets.inventoriesDevelopmentProperties || 0) +
      (currentAssets.inventoriesOthers || 0) +
      (currentAssets.otherNonFinancialAssets || 0) +
      (currentAssets.nonCurrentAssetsHeldForSale || 0);

    expect(currentAssets.totalCurrentAssets).toBe(currentAssetsSum);
  });

  test('validates non-current assets totals', () => {
    validationResult = validateFinancialStatement(validBalanceSheet);

    if (!validationResult.success) {
      console.log('Skipping non-current assets test due to validation failure');
      return;
    }

    const data = validationResult.data;
    const nonCurrentAssets = data.assets.nonCurrentAssets;

    // Sum all non-total non-current asset values
    const nonCurrentAssetsSum =
      (nonCurrentAssets.tradeAndOtherReceivables || 0) +
      (nonCurrentAssets.leaseReceivables || 0) +
      (nonCurrentAssets.financialAssetsDerivatives || 0) +
      (nonCurrentAssets.financialAssetsFairValueThroughProfitOrLoss || 0) +
      (nonCurrentAssets.otherFinancialAssets || 0) +
      (nonCurrentAssets.propertyPlantAndEquipment || 0) +
      (nonCurrentAssets.investmentProperties || 0) +
      (nonCurrentAssets.goodwill || 0) +
      (nonCurrentAssets.intangibleAssets || 0) +
      (nonCurrentAssets.investmentsInSubsidiariesJointVenturesAndAssociates || 0) +
      (nonCurrentAssets.deferredTaxAssets || 0) +
      (nonCurrentAssets.otherNonFinancialAssets || 0);

    expect(nonCurrentAssets.totalNonCurrentAssets).toBe(nonCurrentAssetsSum);
  });

  test('validates total assets equals sum of current and non-current assets', () => {
    validationResult = validateFinancialStatement(validBalanceSheet);

    if (!validationResult.success) {
      console.log('Skipping total assets test due to validation failure');
      return;
    }

    const data = validationResult.data;
    expect(data.assets.totalAssets).toBe(
      data.assets.currentAssets.totalCurrentAssets +
      data.assets.nonCurrentAssets.totalNonCurrentAssets
    );
  });

  test('validates current liabilities totals', () => {
    validationResult = validateFinancialStatement(validBalanceSheet);

    if (!validationResult.success) {
      console.log('Skipping current liabilities test due to validation failure');
      return;
    }

    const data = validationResult.data;
    const currentLiabilities = data.liabilities.currentLiabilities;

    // Sum all non-total current liability values
    const currentLiabilitiesSum =
      (currentLiabilities.tradeAndOtherPayables || 0) +
      (currentLiabilities.loansAndBorrowings || 0) +
      (currentLiabilities.financialLiabilitiesDerivativesAndFairValue || 0) +
      (currentLiabilities.leaseliabilities || 0) +
      (currentLiabilities.otherFinancialLiabilities || 0) +
      (currentLiabilities.incomeTaxLiabilities || 0) +
      (currentLiabilities.provisions || 0) +
      (currentLiabilities.otherNonFinancialLiabilities || 0) +
      (currentLiabilities.liabilitiesInDisposalGroups || 0);

    expect(currentLiabilities.totalCurrentLiabilities).toBe(currentLiabilitiesSum);
  });

  test('validates non-current liabilities totals', () => {
    validationResult = validateFinancialStatement(validBalanceSheet);

    if (!validationResult.success) {
      console.log('Skipping non-current liabilities test due to validation failure');
      return;
    }

    const data = validationResult.data;
    const nonCurrentLiabilities = data.liabilities.nonCurrentLiabilities;

    // Sum all non-total non-current liability values
    const nonCurrentLiabilitiesSum =
      (nonCurrentLiabilities.tradeAndOtherPayables || 0) +
      (nonCurrentLiabilities.loansAndBorrowings || 0) +
      (nonCurrentLiabilities.financialLiabilitiesDerivativesAndFairValue || 0) +
      (nonCurrentLiabilities.leaseliabilities || 0) +
      (nonCurrentLiabilities.otherFinancialLiabilities || 0) +
      (nonCurrentLiabilities.deferredTaxLiabilities || 0) +
      (nonCurrentLiabilities.provisions || 0) +
      (nonCurrentLiabilities.otherNonFinancialLiabilities || 0);

    expect(nonCurrentLiabilities.totalNonCurrentLiabilities).toBe(nonCurrentLiabilitiesSum);
  });

  test('validates total liabilities equals sum of current and non-current liabilities', () => {
    validationResult = validateFinancialStatement(validBalanceSheet);

    if (!validationResult.success) {
      console.log('Skipping total liabilities test due to validation failure');
      return;
    }

    const data = validationResult.data;
    expect(data.liabilities.totalLiabilities).toBe(
      data.liabilities.currentLiabilities.totalCurrentLiabilities +
      data.liabilities.nonCurrentLiabilities.totalNonCurrentLiabilities
    );
  });

  test('validates total equity calculation', () => {
    validationResult = validateFinancialStatement(validBalanceSheet);

    if (!validationResult.success) {
      console.log('Skipping total equity test due to validation failure');
      return;
    }

    const data = validationResult.data;
    const equity = data.equity;

    // Sum all equity components
    const equitySum =
      (equity.shareCapital || 0) +
      (equity.treasuryShares || 0) +
      (equity.accumulatedProfitsLosses || 0) +
      (equity.otherReservesAttributableToOwnersOfCompany || 0) +
      (equity.nonControllingInterests || 0);

    expect(equity.totalEquity).toBe(equitySum);
  });

  test('validates revenue note total matches income statement revenue', () => {
    const incomeStatementResult = validateFinancialStatement(validIncomeStatement);
    const revenueNoteResult = validateFinancialStatement(validRevenueNote);

    if (!incomeStatementResult.success || !revenueNoteResult.success) {
      console.log('Skipping revenue matching test due to validation failure');
      return;
    }

    expect(incomeStatementResult.data.revenue).toBe(revenueNoteResult.data.totalRevenue);
  });

  test('validates income statement total profit calculation', () => {
    validationResult = validateFinancialStatement(validIncomeStatement);

    if (!validationResult.success) {
      console.log('Skipping profit calculation test due to validation failure');
      return;
    }

    const data = validationResult.data;
    expect(data.totalProfitLoss).toBe(data.profitLossBeforeTaxation - data.incomeTaxExpenseBenefit + (data.profitLossFromDiscontinuedOperations || 0));
  });

  test('validates receivables note total calculation', () => {
    validationResult = validateFinancialStatement(validReceivablesNote);

    if (!validationResult.success) {
      console.log('Skipping receivables total test due to validation failure');
      return;
    }

    const data = validationResult.data;
    const receivablesSum =
      (data.tradeReceivablesDueFromThirdParties || 0) +
      (data.tradeReceivablesDueFromRelatedParties || 0) +
      (data.contractAssets || 0) +
      (data.nonTradeReceivables || 0);

    expect(data.totalTradeAndOtherReceivables).toBe(receivablesSum);
  });

  test('validates payables note total calculation', () => {
    validationResult = validateFinancialStatement(validPayablesNote);

    if (!validationResult.success) {
      console.log('Skipping payables total test due to validation failure');
      return;
    }

    const data = validationResult.data;
    const payablesSum =
      (data.tradePayablesDueToThirdParties || 0) +
      (data.tradePayablesDueToRelatedParties || 0) +
      (data.contractLiabilities || 0) +
      (data.nonTradePayables || 0);

    expect(data.totalTradeAndOtherPayables).toBe(payablesSum);
  });

  // ACRA TAXONOMY-SPECIFIC TESTS

  test('validates consolidated vs separate statement distinction', () => {
    // Test both consolidated and separate statements
    const consolidatedStatement = JSON.parse(JSON.stringify(validBalanceSheet));
    const separateStatement = JSON.parse(JSON.stringify(validBalanceSheet));
    separateStatement.consolidatedAndSeparate = "Separate";

    const consolidatedResult = validateFinancialStatement(consolidatedStatement);
    const separateResult = validateFinancialStatement(separateStatement);

    expect(consolidatedResult.success).toBeTruthy();
    expect(separateResult.success).toBeTruthy();

    if (consolidatedResult.success && separateResult.success) {
      expect(consolidatedResult.data.consolidatedAndSeparate).toBe("Consolidated");
      expect(separateResult.data.consolidatedAndSeparate).toBe("Separate");
    }
  });

  test('validates attribution of profit/loss in income statement', () => {
    validationResult = validateFinancialStatement(validIncomeStatement);

    if (!validationResult.success) {
      console.log('Skipping profit attribution test due to validation failure');
      return;
    }

    const data = validationResult.data;
    if (data.profitLossAttributableTo) {
      const attributionSum =
        (data.profitLossAttributableTo.ownersOfCompany || 0) +
        (data.profitLossAttributableTo.nonControllingInterests || 0);

      expect(attributionSum).toBe(data.totalProfitLoss);
    }
  });

  // EDGE CASES AND ROBUSTNESS TESTS

  test('handles zero values correctly', () => {
    // Create a statement with zero values
    const zeroValueStatement = JSON.parse(JSON.stringify(validBalanceSheet));
    zeroValueStatement.assets.currentAssets.cashAndBankBalances = 0;
    zeroValueStatement.assets.currentAssets.tradeAndOtherReceivables = 0;
    zeroValueStatement.assets.currentAssets.totalCurrentAssets = 0;
    zeroValueStatement.assets.nonCurrentAssets.totalNonCurrentAssets = 0;
    zeroValueStatement.assets.totalAssets = 0;
    zeroValueStatement.liabilities.totalLiabilities = 0;
    zeroValueStatement.equity.totalEquity = 0;

    const result = validateFinancialStatement(zeroValueStatement);
    expect(result.success).toBeTruthy();
  });

  test('handles negative values correctly', () => {
    // Create a statement with negative values (like losses)
    const negativeValueStatement = JSON.parse(JSON.stringify(validIncomeStatement));
    negativeValueStatement.profitLossBeforeTaxation = -50000;
    negativeValueStatement.totalProfitLoss = -40000;
    negativeValueStatement.profitLossAttributableTo.ownersOfCompany = -40000;

    const result = validateFinancialStatement(negativeValueStatement);
    expect(result.success).toBeTruthy();
  });

  test('validates with missing non-required fields', () => {
    // Create a valid statement with some non-required fields missing
    const minimalStatement = {
      statementType: "currentNonCurrent",
      consolidatedAndSeparate: "Consolidated",
      assets: {
        currentAssets: {},
        nonCurrentAssets: {},
        totalAssets: 1000000
      },
      liabilities: {
        currentLiabilities: {},
        nonCurrentLiabilities: {},
        totalLiabilities: 400000
      },
      equity: {
        shareCapital: 500000,
        accumulatedProfitsLosses: 100000,
        totalEquity: 600000
      }
    };

    const result = validateFinancialStatement(minimalStatement);
    expect(result.success).toBeTruthy();
  });
});

