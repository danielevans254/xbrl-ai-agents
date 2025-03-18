export const partialXBRLMessage = JSON.stringify({
  filingInformation: {
    NameOfCompany: "String (min length 1) - Registered name of the entity in BizFile",
    UniqueEntityNumber: "String matching pattern /^\\d{9}[A-Z]$/ - Unique Entity Number assigned by ACRA",
    CurrentPeriodStartDate: "String matching pattern /^\\d{4}-\\d{2}-\\d{2}$/ - Start date of the current reporting period",
    CurrentPeriodEndDate: "String matching pattern /^\\d{4}-\\d{2}-\\d{2}$/ - End date of the current reporting period",
    PriorPeriodStartDate: "String matching pattern /^\\d{4}-\\d{2}-\\d{2}$/ (optional) - Start date of the prior reporting period for comparatives",
    TypeOfXBRLFiling: "Enum: 'Full' or 'Partial' - Whether the filing contains full or partial XBRL information",
    NatureOfFinancialStatementsCompanyLevelOrConsolidated: "Enum: 'Company' or 'Consolidated' - Whether the statements are for the company alone or consolidated group",
    TypeOfAccountingStandardUsedToPrepareFinancialStatements: "Enum: 'SFRS', 'SFRS for SE', 'IFRS', or 'Other' - Accounting standards framework used",
    DateOfAuthorisationForIssueOfFinancialStatements: "String matching pattern /^\\d{4}-\\d{2}-\\d{2}$/ - Date when the financial statements were authorized for issue",
    TypeOfStatementOfFinancialPosition: "Enum: 'Classified' or 'Liquidity-based' - Whether the statement of financial position is presented in current/non-current format or order of liquidity",
    WhetherTheFinancialStatementsArePreparedOnGoingConcernBasis: "Boolean - Whether the entity is a going concern",
    WhetherThereAreAnyChangesToComparativeAmounts: "Boolean (optional) - Whether comparative amounts have been restated or reclassified",
    DescriptionOfPresentationCurrency: "String (length 3) matching pattern /^[A-Z]{3}$/ - Currency used for presentation of the financial statements",
    DescriptionOfFunctionalCurrency: "String (length 3) matching pattern /^[A-Z]{3}$/ - Primary currency of the economic environment in which the entity operates",
    LevelOfRoundingUsedInFinancialStatements: "Enum: 'Thousands', 'Millions', or 'Units' - Level of rounding applied to the financial data",
    DescriptionOfNatureOfEntitysOperationsAndPrincipalActivities: "String (min length 20, max length 100) - Detailed description of the entity's operations and principal business activities",
    PrincipalPlaceOfBusinessIfDifferentFromRegisteredOffice: "String - Main location where business is conducted",
    WhetherCompanyOrGroupIfConsolidatedAccountsArePreparedHasMoreThan50Employees: "Boolean - Whether the company or group has more than 50 employees",
    NameOfParentEntity: "String (nullable, optional) - Immediate parent company name",
    NameOfUltimateParentOfGroup: "String (nullable, optional) - Ultimate parent company name",
    TaxonomyVersion: "Literal: '2022.2' - Version of the XBRL taxonomy used",
    NameAndVersionOfSoftwareUsedToGenerateXBRLFile: "String - Software used to prepare the XBRL filing",
    HowWasXBRLFilePrepared: "Enum: 'Automated', 'Manual', or 'Hybrid' (default: 'Automated') - How the XBRL file was prepared"
  },

  directorsStatement: {
    WhetherInDirectorsOpinionFinancialStatementsAreDrawnUpSoAsToExhibitATrueAndFairView: "Boolean - Directors' opinion on whether financial statements give a true and fair view",
    WhetherThereAreReasonableGroundsToBelieveThatCompanyWillBeAbleToPayItsDebtsAsAndWhenTheyFallDueAtDateOfStatement: "Boolean - Directors' opinion on solvency of the company"
  },

  auditReport: {
    TypeOfAuditOpinionInIndependentAuditorsReport: "Enum: 'Unqualified', 'Qualified', 'Adverse', or 'Disclaimer' - Type of opinion expressed by the auditors",
    AuditingStandardsUsedToConductTheAudit: "String (nullable, optional) - Auditing standards framework used for the audit",
    WhetherThereIsAnyMaterialUncertaintyRelatingToGoingConcern: "Boolean (nullable, optional) - Whether auditors reported material uncertainty about going concern",
    WhetherInAuditorsOpinionAccountingAndOtherRecordsRequiredAreProperlyKept: "Boolean (nullable, optional) - Auditors' opinion on whether proper accounting records have been kept"
  },

  statementOfFinancialPosition: {
    currentAssets: {
      CashAndBankBalances: "Number (optional, default: 0) - Cash and bank balances, current",
      TradeAndOtherReceivablesCurrent: "Number (optional, default: 0) - Trade and other receivables (including contract assets), current",
      CurrentFinanceLeaseReceivables: "Number (optional, default: 0) - Financial assets - lease receivables, current",
      CurrentDerivativeFinancialAssets: "Number (optional, default: 0) - Financial assets - derivatives, current",
      CurrentFinancialAssetsMeasuredAtFairValueThroughProfitOrLoss: "Number (optional, default: 0) - Financial assets - at fair value through profit or loss, current",
      OtherCurrentFinancialAssets: "Number (optional, default: 0) - Other financial assets, current",
      DevelopmentProperties: "Number (optional, default: 0) - Inventories - development properties, current",
      Inventories: "Number (optional, default: 0) - Inventories - others, current",
      OtherCurrentNonfinancialAssets: "Number (optional, default: 0) - Other non-financial assets, current",
      NoncurrentAssetsOrDisposalGroupsClassifiedAsHeldForSaleOrAsHeldForDistributionToOwners: "Number (optional, default: 0) - Non-current assets or disposal groups classified as held for sale/distribution",
      CurrentAssets: "Number - Total current assets (sum of current asset components)"
    },

    nonCurrentAssets: {
      TradeAndOtherReceivablesNoncurrent: "Number (optional, default: 0) - Trade and other receivables (including contract assets and restricted cash), non-current",
      NoncurrentFinanceLeaseReceivables: "Number (optional, default: 0) - Financial assets - lease receivables, non-current",
      NoncurrentDerivativeFinancialAssets: "Number (optional, default: 0) - Financial assets - derivatives, non-current",
      NoncurrentFinancialAssetsMeasuredAtFairValueThroughProfitOrLoss: "Number (optional, default: 0) - Financial assets - at fair value through profit or loss, non-current",
      OtherNoncurrentFinancialAssets: "Number (optional, default: 0) - Other financial assets, non-current",
      PropertyPlantAndEquipment: "Number (optional, default: 0) - Property, plant and equipment",
      InvestmentProperties: "Number (optional, default: 0) - Investment properties",
      Goodwill: "Number (optional, default: 0) - Goodwill",
      IntangibleAssetsOtherThanGoodwill: "Number (optional, default: 0) - Intangible assets (excluding goodwill)",
      InvestmentsInSubsidiariesAssociatesOrJointVentures: "Number (optional, default: 0) - Investments in subsidiaries, joint ventures and associates",
      DeferredTaxAssets: "Number (optional, default: 0) - Deferred tax assets",
      OtherNoncurrentNonfinancialAssets: "Number (optional, default: 0) - Other non-financial assets, non-current",
      NoncurrentAssets: "Number - Total non-current assets (sum of non-current components)"
    },

    Assets: "Number - Total assets (CurrentAssets + NoncurrentAssets)",

    currentLiabilities: {
      TradeAndOtherPayablesCurrent: "Number (optional, default: 0) - Trade and other payables (including contract liabilities), current",
      CurrentLoansAndBorrowings: "Number (optional, default: 0) - Loans and borrowings, current",
      CurrentFinancialLiabilitiesMeasuredAtFairValueThroughProfitOrLoss: "Number (optional, default: 0) - Financial liabilities - derivatives and at fair value through P/L, current",
      CurrentFinanceLeaseLiabilities: "Number (optional, default: 0) - Financial liabilities - lease liabilities, current",
      OtherCurrentFinancialLiabilities: "Number (optional, default: 0) - Other financial liabilities, current",
      CurrentIncomeTaxLiabilities: "Number (optional, default: 0) - Income tax liabilities, current",
      CurrentProvisions: "Number (optional, default: 0) - Provisions (excluding income tax), current",
      OtherCurrentNonfinancialLiabilities: "Number (optional, default: 0) - Other non-financial liabilities, current",
      LiabilitiesClassifiedAsHeldForSale: "Number (optional, default: 0) - Liabilities included in disposal groups held for sale",
      CurrentLiabilities: "Number - Total current liabilities (sum of components)"
    },

    nonCurrentLiabilities: {
      TradeAndOtherPayablesNoncurrent: "Number (optional, default: 0) - Trade and other payables (including contract liabilities), non-current",
      NoncurrentLoansAndBorrowings: "Number (optional, default: 0) - Loans and borrowings, non-current",
      NoncurrentFinancialLiabilitiesMeasuredAtFairValueThroughProfitOrLoss: "Number (optional, default: 0) - Financial liabilities - derivatives and at fair value through P/L, non-current",
      NoncurrentFinanceLeaseLiabilities: "Number (optional, default: 0) - Financial liabilities - lease liabilities, non-current",
      OtherNoncurrentFinancialLiabilities: "Number (optional, default: 0) - Other financial liabilities, non-current",
      DeferredTaxLiabilities: "Number (optional, default: 0) - Deferred tax liabilities",
      NoncurrentProvisions: "Number (optional, default: 0) - Provisions (including non-current income tax)",
      OtherNoncurrentNonfinancialLiabilities: "Number (optional, default: 0) - Other non-financial liabilities, non-current",
      NoncurrentLiabilities: "Number - Total non-current liabilities (sum of components)"
    },

    Liabilities: "Number - Total liabilities (CurrentLiabilities + NoncurrentLiabilities)",

    equity: {
      ShareCapital: "Number - Share capital",
      TreasuryShares: "Number (optional, default: 0) - Treasury shares",
      AccumulatedProfitsLosses: "Number - Accumulated profits (losses)",
      ReservesOtherThanAccumulatedProfitsLosses: "Number (optional, default: 0) - Other reserves attributable to owners",
      NoncontrollingInterests: "Number (optional, default: 0) - Non-controlling interests",
      Equity: "Number - Total equity (ShareCapital + AccumulatedProfitsLosses + Reserves + NoncontrollingInterests - TreasuryShares)"
    }
  },

  incomeStatement: {
    Revenue: "Number - Revenue from contracts with customers",
    OtherIncome: "Number (optional, default: 0) - Other income",
    EmployeeBenefitsExpense: "Number (optional, default: 0) - Employee benefits expense",
    DepreciationExpense: "Number (optional, default: 0) - Depreciation of property, plant and equipment",
    AmortisationExpense: "Number (optional, default: 0) - Amortisation of intangible assets",
    RepairsAndMaintenanceExpense: "Number (optional, default: 0) - Repairs and maintenance costs",
    SalesAndMarketingExpense: "Number (optional, default: 0) - Sales and marketing costs",
    OtherExpensesByNature: "Number (optional, default: 0) - Other operating expenses by nature",
    OtherGainsLosses: "Number (optional, default: 0) - Other gains/(losses)",
    FinanceCosts: "Number (optional, default: 0) - Net finance costs",
    ShareOfProfitLossOfAssociatesAndJointVenturesAccountedForUsingEquityMethod: "Number (optional, default: 0) - Share of profits/(losses) of associates/joint ventures",
    ProfitLossBeforeTaxation: "Number - Profit/(loss) before tax from continuing operations",
    TaxExpenseBenefitContinuingOperations: "Number - Income tax expense/(benefit)",
    ProfitLossFromDiscontinuedOperations: "Number (optional, default: 0) - Profit/(loss) from discontinued operations",
    ProfitLoss: "Number - Total comprehensive income for the period",
    ProfitLossAttributableToOwnersOfCompany: "Number - Portion attributable to parent owners",
    ProfitLossAttributableToNoncontrollingInterests: "Number (optional, default: 0) - Portion attributable to NCI"
  },

  notes: {
    tradeAndOtherReceivables: {
      TradeAndOtherReceivablesDueFromThirdParties: "Number (optional, default: 0)",
      TradeAndOtherReceivablesDueFromRelatedParties: "Number (optional, default: 0)",
      UnbilledReceivables: "Number (optional, default: 0)",
      OtherReceivables: "Number (optional, default: 0)",
      TradeAndOtherReceivables: "Number"
    },

    tradeAndOtherPayables: {
      TradeAndOtherPayablesDueToThirdParties: "Number (optional, default: 0)",
      TradeAndOtherPayablesDueToRelatedParties: "Number (optional, default: 0)",
      DeferredIncome: "Number (optional, default: 0)",
      OtherPayables: "Number (optional, default: 0)",
      TradeAndOtherPayables: "Number"
    },

    revenue: {
      RevenueFromPropertyTransferredAtPointInTime: "Number (optional, default: 0)",
      RevenueFromGoodsTransferredAtPointInTime: "Number (optional, default: 0)",
      RevenueFromServicesTransferredAtPointInTime: "Number (optional, default: 0)",
      RevenueFromPropertyTransferredOverTime: "Number (optional, default: 0)",
      RevenueFromConstructionContractsOverTime: "Number (optional, default: 0)",
      RevenueFromServicesTransferredOverTime: "Number (optional, default: 0)",
      OtherRevenue: "Number (optional, default: 0)",
      Revenue: "Number"
    }
  }
}, null, 2);
