import { z } from "zod";

const CurrencyCode = z.string().length(3).regex(/^[A-Z]{3}$/)
  .describe("ISO 4217 currency code");

const DateISO8601 = z.string().regex(/^\d{4}-\d{2}-\d{2}$/)
  .describe("ISO 8601 formatted date (YYYY-MM-DD)");

const MonetaryAmount = z.number().positive()
  .describe("Monetary amount in SGD");

const Percentage = z.number().min(0).max(100)
  .describe("Percentage value (0-100)");

export const PartialXBRLSchema = z.object({
  filingInformation: z.object({
    NameOfCompany: z.string().min(1)
      .describe("Registered name of the entity in BizFile"),
    UniqueEntityNumber: z.string().regex(/^\d{8}[A-Z]$/)
      .describe("Unique Entity Number assigned by ACRA"),
    CurrentPeriodStartDate: DateISO8601
      .describe("Start date of the current reporting period"),
    CurrentPeriodEndDate: DateISO8601
      .describe("End date of the current reporting period"),
    PriorPeriodStartDate: DateISO8601.optional()
      .describe("Start date of the prior reporting period for comparatives"),
    TypeOfXBRLFiling: z.enum(["Full", "Partial"])
      .describe("Whether the filing contains full or partial XBRL information"),
    NatureOfFinancialStatementsCompanyLevelOrConsolidated: z.enum(["Company", "Consolidated"])
      .describe("Whether the statements are for the company alone or consolidated group"),
    TypeOfAccountingStandardUsedToPrepareFinancialStatements: z.enum(["SFRS", "SFRS for SE", "IFRS", "Other"])
      .describe("Accounting standards framework used"),
    DateOfAuthorisationForIssueOfFinancialStatements: DateISO8601
      .describe("Date when the financial statements were authorized for issue"),
    TypeOfStatementOfFinancialPosition: z.enum(["Classified", "Liquidity-based"])
      .describe("Whether the statement of financial position is presented in current/non-current format or order of liquidity"),
    WhetherTheFinancialStatementsArePreparedOnGoingConcernBasis: z.boolean()
      .describe("Whether the entity is a going concern"),
    WhetherThereAreAnyChangesToComparativeAmounts: z.boolean().optional()
      .describe("Whether comparative amounts have been restated or reclassified"),
    DescriptionOfPresentationCurrency: CurrencyCode
      .describe("Currency used for presentation of the financial statements"),
    DescriptionOfFunctionalCurrency: CurrencyCode
      .describe("Primary currency of the economic environment in which the entity operates"),
    LevelOfRoundingUsedInFinancialStatements: z.enum(["Thousands", "Millions", "Units"])
      .describe("Level of rounding applied to the financial data"),
    DescriptionOfNatureOfEntitysOperationsAndPrincipalActivities: z.string()
      .min(20, "Please provide a detailed description (at least 20 characters).")
      .max(100, "Description is too long; please limit to 100 characters.")
      .describe("Provide a detailed description of the nature of the entity's operations and its principal business activities, including key operational insights."),
    PrincipalPlaceOfBusinessIfDifferentFromRegisteredOffice: z.string()
      .describe("Main location where business is conducted"),
    WhetherCompanyOrGroupIfConsolidatedAccountsArePreparedHasMoreThan50Employees: z.boolean()
      .describe("Whether the company or group has more than 50 employees"),
    // Allow null (or absence) for parent names.
    NameOfParentEntity: z.string().nullable().optional()
      .describe("Immediate parent company name"),
    NameOfUltimateParentOfGroup: z.string().nullable().optional()
      .describe("Ultimate parent company name"),
    TaxonomyVersion: z.literal("2022.2")
      .describe("Version of the XBRL taxonomy used"),
    NameAndVersionOfSoftwareUsedToGenerateXBRLFile: z.string()
      .describe("Software used to prepare the XBRL filing"),
    HowWasXBRLFilePrepared: z.enum(["Automated", "Manual", "Hybrid"])
      .default("Automated")
      .describe("Indicate how the XBRL file was prepared: automated, manual, or hybrid (default is automated).")
  }).describe("Basic information about the entity and the filing"),

  directorsStatement: z.object({
    WhetherInDirectorsOpinionFinancialStatementsAreDrawnUpSoAsToExhibitATrueAndFairView: z.boolean()
      .describe("Directors' opinion on whether financial statements give a true and fair view"),
    WhetherThereAreReasonableGroundsToBelieveThatCompanyWillBeAbleToPayItsDebtsAsAndWhenTheyFallDueAtDateOfStatement: z.boolean()
      .describe("Directors' opinion on solvency of the company")
  }).describe("Statements made by the directors regarding the financial statements"),

  auditReport: z.object({
    TypeOfAuditOpinionInIndependentAuditorsReport: z.enum(["Unqualified", "Qualified", "Adverse", "Disclaimer"])
      .describe("Type of opinion expressed by the auditors"),
    // Allow null for optional string fields.
    AuditingStandardsUsedToConductTheAudit: z.string().nullable().optional()
      .describe("Auditing standards framework used for the audit"),
    // Allow null for optional booleans.
    WhetherThereIsAnyMaterialUncertaintyRelatingToGoingConcern: z.boolean().nullable().optional()
      .describe("Whether auditors reported material uncertainty about going concern"),
    WhetherInAuditorsOpinionAccountingAndOtherRecordsRequiredAreProperlyKept: z.boolean().nullable().optional()
      .describe("Auditors' opinion on whether proper accounting records have been kept")
  }).describe("Information about the independent auditors' report"),

  statementOfFinancialPosition: z.object({
    currentAssets: z.object({
      CashAndBankBalances: MonetaryAmount.optional()
        .describe("Cash and bank balances, current"),
      TradeAndOtherReceivablesCurrent: MonetaryAmount.optional()
        .describe("Trade and other receivables (including contract assets), current"),
      CurrentFinanceLeaseReceivables: MonetaryAmount.optional()
        .describe("Financial assets - lease receivables, current"),
      CurrentDerivativeFinancialAssets: MonetaryAmount.optional()
        .describe("Financial assets - derivatives, current"),
      CurrentFinancialAssetsMeasuredAtFairValueThroughProfitOrLoss: MonetaryAmount.optional()
        .describe("Financial assets - at fair value through profit or loss, current"),
      OtherCurrentFinancialAssets: MonetaryAmount.optional()
        .describe("Other financial assets, current"),
      DevelopmentProperties: MonetaryAmount.optional()
        .describe("Inventories - development properties, current"),
      Inventories: MonetaryAmount.optional()
        .describe("Inventories - others, current"),
      OtherCurrentNonfinancialAssets: MonetaryAmount.optional()
        .describe("Other non-financial assets, current"),
      NoncurrentAssetsOrDisposalGroupsClassifiedAsHeldForSaleOrAsHeldForDistributionToOwners: MonetaryAmount.optional()
        .describe("Non-current assets or disposal groups classified as held for sale/distribution"),
      CurrentAssets: MonetaryAmount
        .describe("Total current assets (sum of current asset components)")
    }).describe("Current assets section"),

    nonCurrentAssets: z.object({
      TradeAndOtherReceivablesNoncurrent: MonetaryAmount.optional()
        .describe("Trade and other receivables (including contract assets and restricted cash), non-current"),
      NoncurrentFinanceLeaseReceivables: MonetaryAmount.optional()
        .describe("Financial assets - lease receivables, non-current"),
      NoncurrentDerivativeFinancialAssets: MonetaryAmount.optional()
        .describe("Financial assets - derivatives, non-current"),
      NoncurrentFinancialAssetsMeasuredAtFairValueThroughProfitOrLoss: MonetaryAmount.optional()
        .describe("Financial assets - at fair value through profit or loss, non-current"),
      OtherNoncurrentFinancialAssets: MonetaryAmount.optional()
        .describe("Other financial assets, non-current"),
      PropertyPlantAndEquipment: MonetaryAmount.optional()
        .describe("Property, plant and equipment"),
      InvestmentProperties: MonetaryAmount.optional()
        .describe("Investment properties"),
      Goodwill: MonetaryAmount.optional()
        .describe("Goodwill"),
      IntangibleAssetsOtherThanGoodwill: MonetaryAmount.optional()
        .describe("Intangible assets (excluding goodwill)"),
      InvestmentsInSubsidiariesAssociatesOrJointVentures: MonetaryAmount.optional()
        .describe("Investments in subsidiaries, joint ventures and associates"),
      DeferredTaxAssets: MonetaryAmount.optional()
        .describe("Deferred tax assets"),
      OtherNoncurrentNonfinancialAssets: MonetaryAmount.optional()
        .describe("Other non-financial assets, non-current"),
      NoncurrentAssets: MonetaryAmount
        .describe("Total non-current assets (sum of non-current components)")
    }).describe("Non-current assets section"),

    Assets: MonetaryAmount
      .describe("Total assets (CurrentAssets + NoncurrentAssets)"),

    currentLiabilities: z.object({
      TradeAndOtherPayablesCurrent: MonetaryAmount.optional()
        .describe("Trade and other payables (including contract liabilities), current"),
      CurrentLoansAndBorrowings: MonetaryAmount.optional()
        .describe("Loans and borrowings, current"),
      CurrentFinancialLiabilitiesMeasuredAtFairValueThroughProfitOrLoss: MonetaryAmount.optional()
        .describe("Financial liabilities - derivatives and at fair value through P/L, current"),
      CurrentFinanceLeaseLiabilities: MonetaryAmount.optional()
        .describe("Financial liabilities - lease liabilities, current"),
      OtherCurrentFinancialLiabilities: MonetaryAmount.optional()
        .describe("Other financial liabilities, current"),
      CurrentIncomeTaxLiabilities: MonetaryAmount.optional()
        .describe("Income tax liabilities, current"),
      CurrentProvisions: MonetaryAmount.optional()
        .describe("Provisions (excluding income tax), current"),
      OtherCurrentNonfinancialLiabilities: MonetaryAmount.optional()
        .describe("Other non-financial liabilities, current"),
      LiabilitiesClassifiedAsHeldForSale: MonetaryAmount.optional()
        .describe("Liabilities included in disposal groups held for sale"),
      CurrentLiabilities: MonetaryAmount
        .describe("Total current liabilities (sum of components)")
    }).describe("Current liabilities section"),

    nonCurrentLiabilities: z.object({
      TradeAndOtherPayablesNoncurrent: MonetaryAmount.optional()
        .describe("Trade and other payables (including contract liabilities), non-current"),
      NoncurrentLoansAndBorrowings: MonetaryAmount.optional()
        .describe("Loans and borrowings, non-current"),
      NoncurrentFinancialLiabilitiesMeasuredAtFairValueThroughProfitOrLoss: MonetaryAmount.optional()
        .describe("Financial liabilities - derivatives and at fair value through P/L, non-current"),
      NoncurrentFinanceLeaseLiabilities: MonetaryAmount.optional()
        .describe("Financial liabilities - lease liabilities, non-current"),
      OtherNoncurrentFinancialLiabilities: MonetaryAmount.optional()
        .describe("Other financial liabilities, non-current"),
      DeferredTaxLiabilities: MonetaryAmount.optional()
        .describe("Deferred tax liabilities"),
      NoncurrentProvisions: MonetaryAmount.optional()
        .describe("Provisions (including non-current income tax)"),
      OtherNoncurrentNonfinancialLiabilities: MonetaryAmount.optional()
        .describe("Other non-financial liabilities, non-current"),
      NoncurrentLiabilities: MonetaryAmount
        .describe("Total non-current liabilities (sum of components)")
    }).describe("Non-current liabilities section"),

    Liabilities: MonetaryAmount
      .describe("Total liabilities (CurrentLiabilities + NoncurrentLiabilities)"),

    equity: z.object({
      ShareCapital: MonetaryAmount
        .describe("Share capital"),
      TreasuryShares: MonetaryAmount.optional()
        .describe("Treasury shares"),
      AccumulatedProfitsLosses: MonetaryAmount
        .describe("Accumulated profits (losses)"),
      ReservesOtherThanAccumulatedProfitsLosses: MonetaryAmount.optional()
        .describe("Other reserves attributable to owners"),
      NoncontrollingInterests: MonetaryAmount.optional()
        .describe("Non-controlling interests"),
      Equity: MonetaryAmount
        .describe("Total equity (ShareCapital + AccumulatedProfitsLosses + Reserves + NoncontrollingInterests - TreasuryShares)")
    }).describe("Equity section")
  }).strict(),

  incomeStatement: z.object({
    Revenue: MonetaryAmount
      .describe("Revenue from contracts with customers"),
    OtherIncome: MonetaryAmount.optional()
      .describe("Other income"),
    EmployeeBenefitsExpense: MonetaryAmount.optional()
      .describe("Employee benefits expense"),
    DepreciationExpense: MonetaryAmount.optional()
      .describe("Depreciation of property, plant and equipment"),
    AmortisationExpense: MonetaryAmount.optional()
      .describe("Amortisation of intangible assets"),
    RepairsAndMaintenanceExpense: MonetaryAmount.optional()
      .describe("Repairs and maintenance costs"),
    SalesAndMarketingExpense: MonetaryAmount.optional()
      .describe("Sales and marketing costs"),
    OtherExpensesByNature: MonetaryAmount.optional()
      .describe("Other operating expenses by nature"),
    OtherGainsLosses: MonetaryAmount.optional()
      .describe("Other gains/(losses)"),
    FinanceCosts: MonetaryAmount.optional()
      .describe("Net finance costs"),
    ShareOfProfitLossOfAssociatesAndJointVenturesAccountedForUsingEquityMethod: MonetaryAmount.optional()
      .describe("Share of profits/(losses) of associates/joint ventures"),
    ProfitLossBeforeTaxation: MonetaryAmount
      .describe("Profit/(loss) before tax from continuing operations"),
    TaxExpenseBenefitContinuingOperations: MonetaryAmount
      .describe("Income tax expense/(benefit)"),
    ProfitLossFromDiscontinuedOperations: MonetaryAmount.optional()
      .describe("Profit/(loss) from discontinued operations"),
    ProfitLoss: MonetaryAmount
      .describe("Total comprehensive income for the period"),
    ProfitLossAttributableToOwnersOfCompany: MonetaryAmount
      .describe("Portion attributable to parent owners"),
    ProfitLossAttributableToNoncontrollingInterests: MonetaryAmount.optional()
      .describe("Portion attributable to NCI")
  }).strict(),

  notes: z.object({
    tradeAndOtherReceivables: z.object({
      TradeAndOtherReceivablesDueFromThirdParties: MonetaryAmount.optional(),
      TradeAndOtherReceivablesDueFromRelatedParties: MonetaryAmount.optional(),
      UnbilledReceivables: MonetaryAmount.optional(),
      OtherReceivables: MonetaryAmount.optional(),
      TradeAndOtherReceivables: MonetaryAmount
    }).strict(),

    tradeAndOtherPayables: z.object({
      TradeAndOtherPayablesDueToThirdParties: MonetaryAmount.optional(),
      TradeAndOtherPayablesDueToRelatedParties: MonetaryAmount.optional(),
      DeferredIncome: MonetaryAmount.optional(),
      OtherPayables: MonetaryAmount.optional(),
      TradeAndOtherPayables: MonetaryAmount
    }).strict(),

    revenue: z.object({
      RevenueFromPropertyTransferredAtPointInTime: MonetaryAmount.optional(),
      RevenueFromGoodsTransferredAtPointInTime: MonetaryAmount.optional(),
      RevenueFromServicesTransferredAtPointInTime: MonetaryAmount.optional(),
      RevenueFromPropertyTransferredOverTime: MonetaryAmount.optional(),
      RevenueFromConstructionContractsOverTime: MonetaryAmount.optional(),
      RevenueFromServicesTransferredOverTime: MonetaryAmount.optional(),
      OtherRevenue: MonetaryAmount.optional(),
      Revenue: MonetaryAmount
    }).strict()
  }).describe("Comprehensive financial statement schema compliant with Singapore Simplified XBRL requirements")
});

export type PartialXBRL = z.infer<typeof PartialXBRLSchema>;