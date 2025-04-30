export const partialXBRLMessage = JSON.stringify({
  filingInformation: {
    NameOfCompany: "String (min length 1) - Registered name of the entity in BizFile",
    UniqueEntityNumber: "String matching pattern /^\\d{9}[A-Z]$/ - Unique Entity Number assigned by ACRA",
    CurrentPeriodStartDate: "String matching pattern /^\\d{4}-\\d{2}-\\d{2}$/ - Start date of the current reporting period",
    CurrentPeriodEndDate: "String matching pattern /^\\d{4}-\\d{2}-\\d{2}$/ - End date of the current reporting period",
    PriorPeriodStartDate: "String (default: N/A) matching pattern /^\\d{4}-\\d{2}-\\d{2}$/ (optional) - Start date of the prior reporting period for comparatives",
    TypeOfXBRLFiling: "Enum: 'Full' or 'Partial' - Whether the filing contains full or partial XBRL information",
    NatureOfFinancialStatementsCompanyLevelOrConsolidated: "Enum: 'Company' or 'Consolidated' - Whether the statements are for the company alone or consolidated group",
    TypeOfAccountingStandardUsedToPrepareFinancialStatements: "Enum: 'SFRS', 'SFRS for SE', 'IFRS', or 'Other' - Accounting standards framework used",
    DateOfAuthorisationForIssueOfFinancialStatements: "String matching pattern /^\\d{4}-\\d{2}-\\d{2}$/ - Date when the financial statements were authorized for issue (default: N/A)",
    TypeOfStatementOfFinancialPosition: "Enum: 'Classified' or 'Liquidity-based' - Whether the statement of financial position is presented in current/non-current format or order of liquidity",
    WhetherTheFinancialStatementsArePreparedOnGoingConcernBasis: "Boolean (default: false) - Whether the entity is a going concern",
    WhetherThereAreAnyChangesToComparativeAmounts: "Boolean (optional, default: false) - Whether comparative amounts have been restated or reclassified",
    DescriptionOfPresentationCurrency: "String (length 3) matching pattern /^[A-Z]{3}$/ - Currency used for presentation of the financial statements",
    DescriptionOfFunctionalCurrency: "String (length 3) matching pattern /^[A-Z]{3}$/ - Primary currency of the economic environment in which the entity operates",
    LevelOfRoundingUsedInFinancialStatements: "Enum: 'Thousands', 'Millions', or 'Units' - Level of rounding applied to the financial data",
    DescriptionOfNatureOfEntitysOperationsAndPrincipalActivities: "String (min length 20, max length 100) - Detailed description of the entity's operations and principal business activities",
    PrincipalPlaceOfBusinessIfDifferentFromRegisteredOffice: "String (default: N/A) - Main location where business is conducted",
    WhetherCompanyOrGroupIfConsolidatedAccountsArePreparedHasMoreThan50Employees: "Boolean (default: false) - Whether the company or group has more than 50 employees",
    NameOfParentEntity: "String (optional, default: N/A) - Immediate parent company name",
    NameOfUltimateParentOfGroup: "String (optional, default: N/A) - Ultimate parent company name",
    TaxonomyVersion: "Literal: '2022.2' - Version of the XBRL taxonomy used",
    NameAndVersionOfSoftwareUsedToGenerateXBRLFile: "String - (default: 'XBRL.AI)",
    HowWasXBRLFilePrepared: "Enum: 'Automated', 'Manual', or 'Hybrid' (default: 'Automated') - How the XBRL file was prepared"
  },

  directorsStatement: {
    WhetherInDirectorsOpinionFinancialStatementsAreDrawnUpSoAsToExhibitATrueAndFairView: "Boolean (default: false) - Directors' opinion on whether financial statements give a true and fair view",
    WhetherThereAreReasonableGroundsToBelieveThatCompanyWillBeAbleToPayItsDebtsAsAndWhenTheyFallDueAtDateOfStatement: "Boolean - Directors' opinion on solvency of the company"
  },

  auditReport: {
    TypeOfAuditOpinionInIndependentAuditorsReport: "Enum: 'Unqualified', 'Qualified', 'Adverse', or 'Disclaimer' - Type of opinion expressed by the auditors",
    AuditingStandardsUsedToConductTheAudit: "String (optionaL, default: N/A) - Auditing standards framework used for the audit",
    WhetherThereIsAnyMaterialUncertaintyRelatingToGoingConcern: "Boolean (optional, default: false) - Whether auditors reported material uncertainty about going concern",
    WhetherInAuditorsOpinionAccountingAndOtherRecordsRequiredAreProperlyKept: "Boolean (optional, default: false) - Auditors' opinion on whether proper accounting records have been kept"
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
  },

  statementOfCashFlows: {
    ProfitLossBeforeTaxation: "Number (optional) - Profit/(loss) before tax. Common terms: PBT, earnings before tax",
    AdjustmentsForDepreciation: "Number (optional) - Depreciation adjustments. Common terms: depreciation add-back, depreciation adjustment",
    AdjustmentsForAmortisation: "Number (optional) - Amortisation adjustments. Common terms: amortization add-back, amortization adjustment",
    AdjustmentsForImpairment: "Number (optional) - Impairment adjustments. Common terms: impairment add-back, impairment adjustment",
    AdjustmentsForProvisions: "Number (optional) - Provisions adjustments. Common terms: provisions add-back, provisions adjustment",
    AdjustmentsForOtherNonCashItems: "Number (optional) - Other non-cash adjustments. Common terms: other add-backs, non-cash items",
    ChangesInWorkingCapital: "Number (optional) - Changes in working capital. Common terms: working capital movement, working capital changes",
    CashGeneratedFromOperations: "Number (optional) - Cash generated from operations. Common terms: operating cash flow, cash from operations",
    InterestPaid: "Number (optional) - Interest paid. Common terms: interest payments, interest expense paid",
    IncomeTaxesPaid: "Number (optional) - Income taxes paid. Common terms: tax payments, income tax paid",
    NetCashFromOperatingActivities: "Number (optional) - Net cash from operating activities. Common terms: operating cash flow, cash flow from operations",
    PurchaseOfPropertyPlantEquipment: "Number (optional) - Purchase of property, plant and equipment. Common terms: capital expenditure, capex, fixed asset purchases",
    ProceedsFromSaleOfPropertyPlantEquipment: "Number (optional) - Proceeds from sale of property, plant and equipment. Common terms: fixed asset disposals, PPE sales",
    PurchaseOfIntangibleAssets: "Number (optional) - Purchase of intangible assets. Common terms: intangible asset acquisitions, intellectual property purchases",
    ProceedsFromSaleOfIntangibleAssets: "Number (optional) - Proceeds from sale of intangible assets. Common terms: intangible asset disposals, IP sales",
    PurchaseOfInvestments: "Number (optional) - Purchase of investments. Common terms: investment acquisitions, security purchases",
    ProceedsFromSaleOfInvestments: "Number (optional) - Proceeds from sale of investments. Common terms: investment disposals, security sales",
    NetCashFromInvestingActivities: "Number (optional) - Net cash from investing activities. Common terms: investing cash flow, cash flow from investing",
    ProceedsFromIssueOfShareCapital: "Number (optional) - Proceeds from issue of share capital. Common terms: share issue proceeds, equity issuance",
    PurchaseOfTreasuryShares: "Number (optional) - Purchase of treasury shares. Common terms: share buybacks, treasury stock purchases",
    ProceedsFromBorrowings: "Number (optional) - Proceeds from borrowings. Common terms: new borrowings, loan proceeds",
    RepaymentOfBorrowings: "Number (optional) - Repayment of borrowings. Common terms: loan repayments, debt repayments",
    PaymentOfLeaseLiabilities: "Number (optional) - Payment of lease liabilities. Common terms: lease payments, rental payments",
    DividendsPaid: "Number (optional) - Dividends paid. Common terms: dividend payments, shareholder distributions",
    NetCashFromFinancingActivities: "Number (optional) - Net cash from financing activities. Common terms: financing cash flow, cash flow from financing",
    NetIncreaseDecreaseInCashAndCashEquivalents: "Number (optional) - Net increase/(decrease) in cash and cash equivalents. Common terms: net cash flow, cash movement",
    CashAndCashEquivalentsAtBeginningOfPeriod: "Number (optional) - Cash and cash equivalents at beginning of period. Common terms: opening cash, beginning cash",
    CashAndCashEquivalentsAtEndOfPeriod: "Number (optional) - Cash and cash equivalents at end of period. Common terms: closing cash, ending cash"
  },

  statementOfChangesInEquity: {
    ShareCapitalAtBeginning: "Number (optional) - Share capital at beginning of period. Common terms: opening share capital, beginning share capital",
    TreasurySharesAtBeginning: "Number (optional) - Treasury shares at beginning of period. Common terms: opening treasury shares, beginning treasury stock",
    AccumulatedProfitsLossesAtBeginning: "Number (optional) - Accumulated profits/(losses) at beginning of period. Common terms: opening retained earnings, beginning retained earnings",
    OtherReservesAtBeginning: "Number (optional) - Other reserves at beginning of period. Common terms: opening reserves, beginning reserves",
    NoncontrollingInterestsAtBeginning: "Number (optional) - Non-controlling interests at beginning of period. Common terms: opening NCI, beginning minority interests",
    TotalEquityAtBeginning: "Number (optional) - Total equity at beginning of period. Common terms: opening equity, beginning equity",
    IssueOfShareCapital: "Number (optional) - Issue of share capital. Common terms: share issuance, new shares issued",
    PurchaseOfTreasuryShares: "Number (optional) - Purchase of treasury shares. Common terms: share buybacks, treasury stock purchases",
    ProfitLossForPeriod: "Number (optional) - Profit/(loss) for the period. Common terms: current year profit, period profit",
    OtherComprehensiveIncome: "Number (optional) - Other comprehensive income. Common terms: OCI, other comprehensive items",
    TotalComprehensiveIncome: "Number (optional) - Total comprehensive income. Common terms: total comprehensive earnings, total comprehensive profit",
    DividendsDeclared: "Number (optional) - Dividends declared. Common terms: dividend distributions, shareholder dividends",
    TransfersToFromReserves: "Number (optional) - Transfers to/from reserves. Common terms: reserve movements, reserve transfers",
    ChangesInNoncontrollingInterests: "Number (optional) - Changes in non-controlling interests. Common terms: NCI changes, minority interest changes",
    ShareCapitalAtEnd: "Number (optional) - Share capital at end of period. Common terms: closing share capital, ending share capital",
    TreasurySharesAtEnd: "Number (optional) - Treasury shares at end of period. Common terms: closing treasury shares, ending treasury stock",
    AccumulatedProfitsLossesAtEnd: "Number (optional) - Accumulated profits/(losses) at end of period. Common terms: closing retained earnings, ending retained earnings",
    OtherReservesAtEnd: "Number (optional) - Other reserves at end of period. Common terms: closing reserves, ending reserves",
    NoncontrollingInterestsAtEnd: "Number (optional) - Non-controlling interests at end of period. Common terms: closing NCI, ending minority interests",
    TotalEquityAtEnd: "Number (optional) - Total equity at end of period. Common terms: closing equity, ending equity"
  },
}, null, 2);