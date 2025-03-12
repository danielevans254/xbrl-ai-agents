import { z } from "zod";

const CurrencyCode = z.string().length(3).regex(/^[A-Z]{3}$/)
  .describe("ISO 4217 currency code");

const DateISO8601 = z.string().regex(/^\d{4}-\d{2}-\d{2}$/)
  .describe("ISO 8601 formatted date (YYYY-MM-DD)");

const MonetaryAmount = z.number()
  .describe("Monetary amount in SGD");

const OptionalMonetaryAmount = z.number().optional().default(0)
  .describe("Optional monetary amount in SGD (defaults to 0)");

export const PartialXBRLSchema = z.object({
  filingInformation: z.object({
    NameOfCompany: z.string().min(1)
      .describe("Registered name of the entity in BizFile"),
    UniqueEntityNumber: z.string().regex(/^\d{9}[A-Z]$/)
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
      CashAndBankBalances: OptionalMonetaryAmount
        .describe("Cash and bank balances, current"),
      TradeAndOtherReceivablesCurrent: OptionalMonetaryAmount
        .describe("Trade and other receivables (including contract assets), current"),
      CurrentFinanceLeaseReceivables: OptionalMonetaryAmount
        .describe("Financial assets - lease receivables, current"),
      CurrentDerivativeFinancialAssets: OptionalMonetaryAmount
        .describe("Financial assets - derivatives, current"),
      CurrentFinancialAssetsMeasuredAtFairValueThroughProfitOrLoss: OptionalMonetaryAmount
        .describe("Financial assets - at fair value through profit or loss, current"),
      OtherCurrentFinancialAssets: OptionalMonetaryAmount
        .describe("Other financial assets, current"),
      DevelopmentProperties: OptionalMonetaryAmount
        .describe("Inventories - development properties, current"),
      Inventories: OptionalMonetaryAmount
        .describe("Inventories - others, current"),
      OtherCurrentNonfinancialAssets: OptionalMonetaryAmount
        .describe("Other non-financial assets, current"),
      NoncurrentAssetsOrDisposalGroupsClassifiedAsHeldForSaleOrAsHeldForDistributionToOwners: OptionalMonetaryAmount
        .describe("Non-current assets or disposal groups classified as held for sale/distribution"),
      CurrentAssets: MonetaryAmount
        .describe("Total current assets (sum of current asset components)")
    }).describe("Current assets section"),

    nonCurrentAssets: z.object({
      TradeAndOtherReceivablesNoncurrent: OptionalMonetaryAmount
        .describe("Trade and other receivables (including contract assets and restricted cash), non-current"),
      NoncurrentFinanceLeaseReceivables: OptionalMonetaryAmount
        .describe("Financial assets - lease receivables, non-current"),
      NoncurrentDerivativeFinancialAssets: OptionalMonetaryAmount
        .describe("Financial assets - derivatives, non-current"),
      NoncurrentFinancialAssetsMeasuredAtFairValueThroughProfitOrLoss: OptionalMonetaryAmount
        .describe("Financial assets - at fair value through profit or loss, non-current"),
      OtherNoncurrentFinancialAssets: OptionalMonetaryAmount
        .describe("Other financial assets, non-current"),
      PropertyPlantAndEquipment: OptionalMonetaryAmount
        .describe("Property, plant and equipment"),
      InvestmentProperties: OptionalMonetaryAmount
        .describe("Investment properties"),
      Goodwill: OptionalMonetaryAmount
        .describe("Goodwill"),
      IntangibleAssetsOtherThanGoodwill: OptionalMonetaryAmount
        .describe("Intangible assets (excluding goodwill)"),
      InvestmentsInSubsidiariesAssociatesOrJointVentures: OptionalMonetaryAmount
        .describe("Investments in subsidiaries, joint ventures and associates"),
      DeferredTaxAssets: OptionalMonetaryAmount
        .describe("Deferred tax assets"),
      OtherNoncurrentNonfinancialAssets: OptionalMonetaryAmount
        .describe("Other non-financial assets, non-current"),
      NoncurrentAssets: MonetaryAmount
        .describe("Total non-current assets (sum of non-current components)")
    }).describe("Non-current assets section"),

    Assets: MonetaryAmount
      .describe("Total assets (CurrentAssets + NoncurrentAssets)"),

    currentLiabilities: z.object({
      TradeAndOtherPayablesCurrent: OptionalMonetaryAmount
        .describe("Trade and other payables (including contract liabilities), current"),
      CurrentLoansAndBorrowings: OptionalMonetaryAmount
        .describe("Loans and borrowings, current"),
      CurrentFinancialLiabilitiesMeasuredAtFairValueThroughProfitOrLoss: OptionalMonetaryAmount
        .describe("Financial liabilities - derivatives and at fair value through P/L, current"),
      CurrentFinanceLeaseLiabilities: OptionalMonetaryAmount
        .describe("Financial liabilities - lease liabilities, current"),
      OtherCurrentFinancialLiabilities: OptionalMonetaryAmount
        .describe("Other financial liabilities, current"),
      CurrentIncomeTaxLiabilities: OptionalMonetaryAmount
        .describe("Income tax liabilities, current"),
      CurrentProvisions: OptionalMonetaryAmount
        .describe("Provisions (excluding income tax), current"),
      OtherCurrentNonfinancialLiabilities: OptionalMonetaryAmount
        .describe("Other non-financial liabilities, current"),
      LiabilitiesClassifiedAsHeldForSale: OptionalMonetaryAmount
        .describe("Liabilities included in disposal groups held for sale"),
      CurrentLiabilities: MonetaryAmount
        .describe("Total current liabilities (sum of components)")
    }).describe("Current liabilities section"),

    nonCurrentLiabilities: z.object({
      TradeAndOtherPayablesNoncurrent: OptionalMonetaryAmount
        .describe("Trade and other payables (including contract liabilities), non-current"),
      NoncurrentLoansAndBorrowings: OptionalMonetaryAmount
        .describe("Loans and borrowings, non-current"),
      NoncurrentFinancialLiabilitiesMeasuredAtFairValueThroughProfitOrLoss: OptionalMonetaryAmount
        .describe("Financial liabilities - derivatives and at fair value through P/L, non-current"),
      NoncurrentFinanceLeaseLiabilities: OptionalMonetaryAmount
        .describe("Financial liabilities - lease liabilities, non-current"),
      OtherNoncurrentFinancialLiabilities: OptionalMonetaryAmount
        .describe("Other financial liabilities, non-current"),
      DeferredTaxLiabilities: OptionalMonetaryAmount
        .describe("Deferred tax liabilities"),
      NoncurrentProvisions: OptionalMonetaryAmount
        .describe("Provisions (including non-current income tax)"),
      OtherNoncurrentNonfinancialLiabilities: OptionalMonetaryAmount
        .describe("Other non-financial liabilities, non-current"),
      NoncurrentLiabilities: MonetaryAmount
        .describe("Total non-current liabilities (sum of components)")
    }).describe("Non-current liabilities section"),

    Liabilities: MonetaryAmount
      .describe("Total liabilities (CurrentLiabilities + NoncurrentLiabilities)"),

    equity: z.object({
      ShareCapital: MonetaryAmount
        .describe("Share capital"),
      TreasuryShares: OptionalMonetaryAmount
        .describe("Treasury shares"),
      AccumulatedProfitsLosses: MonetaryAmount
        .describe("Accumulated profits (losses)"),
      ReservesOtherThanAccumulatedProfitsLosses: OptionalMonetaryAmount
        .describe("Other reserves attributable to owners"),
      NoncontrollingInterests: OptionalMonetaryAmount
        .describe("Non-controlling interests"),
      Equity: MonetaryAmount
        .describe("Total equity (ShareCapital + AccumulatedProfitsLosses + Reserves + NoncontrollingInterests - TreasuryShares)")
    }).describe("Equity section")
  }).strict(),

  incomeStatement: z.object({
    Revenue: MonetaryAmount
      .describe("Revenue from contracts with customers"),
    OtherIncome: OptionalMonetaryAmount
      .describe("Other income"),
    EmployeeBenefitsExpense: OptionalMonetaryAmount
      .describe("Employee benefits expense"),
    DepreciationExpense: OptionalMonetaryAmount
      .describe("Depreciation of property, plant and equipment"),
    AmortisationExpense: OptionalMonetaryAmount
      .describe("Amortisation of intangible assets"),
    RepairsAndMaintenanceExpense: OptionalMonetaryAmount
      .describe("Repairs and maintenance costs"),
    SalesAndMarketingExpense: OptionalMonetaryAmount
      .describe("Sales and marketing costs"),
    OtherExpensesByNature: OptionalMonetaryAmount
      .describe("Other operating expenses by nature"),
    OtherGainsLosses: OptionalMonetaryAmount
      .describe("Other gains/(losses)"),
    FinanceCosts: OptionalMonetaryAmount
      .describe("Net finance costs"),
    ShareOfProfitLossOfAssociatesAndJointVenturesAccountedForUsingEquityMethod: OptionalMonetaryAmount
      .describe("Share of profits/(losses) of associates/joint ventures"),
    ProfitLossBeforeTaxation: MonetaryAmount
      .describe("Profit/(loss) before tax from continuing operations"),
    TaxExpenseBenefitContinuingOperations: MonetaryAmount
      .describe("Income tax expense/(benefit)"),
    ProfitLossFromDiscontinuedOperations: OptionalMonetaryAmount
      .describe("Profit/(loss) from discontinued operations"),
    ProfitLoss: MonetaryAmount
      .describe("Total comprehensive income for the period"),
    ProfitLossAttributableToOwnersOfCompany: MonetaryAmount
      .describe("Portion attributable to parent owners"),
    ProfitLossAttributableToNoncontrollingInterests: OptionalMonetaryAmount
      .describe("Portion attributable to NCI")
  }).strict(),

  notes: z.object({
    tradeAndOtherReceivables: z.object({
      TradeAndOtherReceivablesDueFromThirdParties: OptionalMonetaryAmount,
      TradeAndOtherReceivablesDueFromRelatedParties: OptionalMonetaryAmount,
      UnbilledReceivables: OptionalMonetaryAmount,
      OtherReceivables: OptionalMonetaryAmount,
      TradeAndOtherReceivables: MonetaryAmount
    }).strict(),

    tradeAndOtherPayables: z.object({
      TradeAndOtherPayablesDueToThirdParties: OptionalMonetaryAmount,
      TradeAndOtherPayablesDueToRelatedParties: OptionalMonetaryAmount,
      DeferredIncome: OptionalMonetaryAmount,
      OtherPayables: OptionalMonetaryAmount,
      TradeAndOtherPayables: MonetaryAmount
    }).strict(),

    revenue: z.object({
      RevenueFromPropertyTransferredAtPointInTime: OptionalMonetaryAmount,
      RevenueFromGoodsTransferredAtPointInTime: OptionalMonetaryAmount,
      RevenueFromServicesTransferredAtPointInTime: OptionalMonetaryAmount,
      RevenueFromPropertyTransferredOverTime: OptionalMonetaryAmount,
      RevenueFromConstructionContractsOverTime: OptionalMonetaryAmount,
      RevenueFromServicesTransferredOverTime: OptionalMonetaryAmount,
      OtherRevenue: OptionalMonetaryAmount,
      Revenue: MonetaryAmount
    }).strict()
  }).describe("Comprehensive financial statement schema compliant with Singapore Simplified XBRL requirements")
});

export type PartialXBRL = z.infer<typeof PartialXBRLSchema>;