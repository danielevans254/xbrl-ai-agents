import { z } from "zod";

// Define a currency code as before.
const CurrencyCode = z.string().length(3).regex(/^[A-Z]{3}$/)
  .describe("ISO 4217 currency code");

// Accept dates in the format YYYY-MM-DD.
const DateISO8601 = z.string().regex(/^\d{4}-\d{2}-\d{2}$/)
  .describe("ISO 8601 formatted date (YYYY-MM-DD)");

// Monetary amounts and percentages remain the same.
const MonetaryAmount = z.number()
  .describe("Monetary amount in the presentation currency");

const Percentage = z.number().min(0).max(100)
  .describe("Percentage value (0-100)");

export const FinancialStatementSchema = z.object({
  filingInformation: z.object({
    EntityName: z.string().min(1)
      .describe("Registered name of the entity in BizFile"),
    UEN: z.string().regex(/^\d{8}[A-Z]$/)
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
    PrincipalPlaceOfBusiness: z.string()
      .describe("Main location where business is conducted"),
    WhetherCompanyOrGroupIfConsolidatedAccountsArePreparedHasMoreThan50Employees: z.boolean()
      .describe("Whether the company or group has more than 50 employees"),
    // Allow null (or absence) for parent names.
    NameOfParentEntity: z.string().nullable().optional()
      .describe("Immediate parent company name"),
    NameOfUltimateParentOfGroup: z.string().nullable().optional()
      .describe("Ultimate parent company name"),
    TaxonomyVersion: z.literal("2022.2")
      .describe("Constant taxonomy version set to 2022.2")
      .describe("Version of the XBRL taxonomy used"),
    NameAndVersionOfSoftwareUsedToGenerateXBRLFile: z.string()
      .describe("Software used to prepare the XBRL filing"),
    HowWasXBRLFilePrepared: z.enum(["Automated", "Manual", "Hybrid"])
      .default("Automated")
      .describe("Indicate how the XBRL file was prepared: automated, manual, or hybrid (default is automated).")
  }).describe("Basic information about the entity and the filing"),

  directorsStatement: z.object({
    WhetherInDirectorsOpinionFinancialStatementsAreDrawnUpSoAsToExhibitTrueAndFairView: z.boolean()
      .describe("Directors' opinion on whether financial statements give a true and fair view"),
    WhetherThereAreReasonableGroundsToBelieveThatCompanyWillBeAbleToPayItsDebtsAsAndWhenTheyFallDue: z.boolean()
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
        .describe("Cash and bank balances"),
      TradeAndOtherReceivablesCurrent: MonetaryAmount.optional()
        .describe("Current trade and other receivables including contract assets"),
      FinancialAssetsLeaseReceivablesCurrent: MonetaryAmount.optional()
        .describe("Current lease receivables"),
      FinancialAssetsDerivativesCurrent: MonetaryAmount.optional()
        .describe("Current derivative financial assets"),
      FinancialAssetsAtFairValueThroughProfitOrLossCurrent: MonetaryAmount.optional()
        .describe("Current financial assets at fair value through profit or loss"),
      OtherFinancialAssetsCurrent: MonetaryAmount.optional()
        .describe("Other current financial assets"),
      InventoriesDevelopmentProperties: MonetaryAmount.optional()
        .describe("Development properties held as inventory"),
      InventoriesOthers: MonetaryAmount.optional()
        .describe("Other inventories"),
      OtherNonFinancialAssetsCurrent: MonetaryAmount.optional()
        .describe("Other current non-financial assets"),
      NonCurrentAssetsOrDisposalGroupsClassifiedAsHeldForSale: MonetaryAmount.optional()
        .describe("Non-current assets held for sale"),
      TotalCurrentAssets: MonetaryAmount.optional()
        .describe("Total of all current assets")
    }).describe("Current assets section of the statement of financial position"),
    nonCurrentAssets: z.object({
      TradeAndOtherReceivablesNonCurrent: MonetaryAmount.optional()
        .describe("Non-current trade and other receivables"),
      FinancialAssetsLeaseReceivablesNonCurrent: MonetaryAmount.optional()
        .describe("Non-current lease receivables"),
      FinancialAssetsDerivativesNonCurrent: MonetaryAmount.optional()
        .describe("Non-current derivative financial assets"),
      FinancialAssetsAtFairValueThroughProfitOrLossNonCurrent: MonetaryAmount.optional()
        .describe("Non-current financial assets at fair value through profit or loss"),
      OtherFinancialAssetsNonCurrent: MonetaryAmount.optional()
        .describe("Other non-current financial assets"),
      PropertyPlantAndEquipment: MonetaryAmount.optional()
        .describe("Property, plant and equipment"),
      InvestmentProperties: MonetaryAmount.optional()
        .describe("Investment properties"),
      Goodwill: MonetaryAmount.optional()
        .describe("Goodwill"),
      IntangibleAssetsExcludingGoodwill: MonetaryAmount.optional()
        .describe("Intangible assets excluding goodwill"),
      InvestmentsInSubsidiariesJointVenturesAndAssociates: MonetaryAmount.optional()
        .describe("Investments in subsidiaries, joint ventures and associates"),
      DeferredTaxAssets: MonetaryAmount.optional()
        .describe("Deferred tax assets"),
      OtherNonFinancialAssetsNonCurrent: MonetaryAmount.optional()
        .describe("Other non-current non-financial assets"),
      TotalNonCurrentAssets: MonetaryAmount.optional()
        .describe("Total of all non-current assets")
    }).describe("Non-current assets section of the statement of financial position"),
    Assets: MonetaryAmount.describe("Total assets (must equal sum of current and non-current assets)"),
    currentLiabilities: z.object({
      TradeAndOtherPayablesCurrent: MonetaryAmount.optional()
        .describe("Current trade and other payables including contract liabilities"),
      LoansAndBorrowingsCurrent: MonetaryAmount.optional()
        .describe("Current loans and borrowings"),
      FinancialLiabilitiesDerivativesAndAtFairValueThroughProfitOrLossCurrent: MonetaryAmount.optional()
        .describe("Current financial liabilities at fair value through profit or loss"),
      FinancialLiabilitiesLeaseLiabilitiesCurrent: MonetaryAmount.optional()
        .describe("Current lease liabilities"),
      OtherFinancialLiabilitiesCurrent: MonetaryAmount.optional()
        .describe("Other current financial liabilities"),
      IncomeTaxLiabilitiesCurrent: MonetaryAmount.optional()
        .describe("Current income tax liabilities"),
      ProvisionsExcludingIncomeTaxLiabilitiesCurrent: MonetaryAmount.optional()
        .describe("Current provisions excluding income tax"),
      OtherNonFinancialLiabilitiesCurrent: MonetaryAmount.optional()
        .describe("Other current non-financial liabilities"),
      LiabilitiesIncludedInDisposalGroupsClassifiedAsHeldForSale: MonetaryAmount.optional()
        .describe("Liabilities included in disposal groups held for sale"),
      TotalCurrentLiabilities: MonetaryAmount.optional()
        .describe("Total of all current liabilities")
    }).describe("Current liabilities section of the statement of financial position"),
    nonCurrentLiabilities: z.object({
      TradeAndOtherPayablesNonCurrent: MonetaryAmount.optional()
        .describe("Non-current trade and other payables"),
      LoansAndBorrowingsNonCurrent: MonetaryAmount.optional()
        .describe("Non-current loans and borrowings"),
      FinancialLiabilitiesDerivativesAndAtFairValueThroughProfitOrLossNonCurrent: MonetaryAmount.optional()
        .describe("Non-current financial liabilities at fair value through profit or loss"),
      FinancialLiabilitiesLeaseLiabilitiesNonCurrent: MonetaryAmount.optional()
        .describe("Non-current lease liabilities"),
      OtherFinancialLiabilitiesNonCurrent: MonetaryAmount.optional()
        .describe("Other non-current financial liabilities"),
      DeferredTaxLiabilities: MonetaryAmount.optional()
        .describe("Deferred tax liabilities"),
      ProvisionsIncludingNonCurrentIncomeTaxLiabilities: MonetaryAmount.optional()
        .describe("Non-current provisions including income tax"),
      OtherNonFinancialLiabilitiesNonCurrent: MonetaryAmount.optional()
        .describe("Other non-current non-financial liabilities"),
      TotalNonCurrentLiabilities: MonetaryAmount.optional()
        .describe("Total of all non-current liabilities")
    }).describe("Non-current liabilities section of the statement of financial position"),
    Liabilities: MonetaryAmount.describe("Total liabilities (must equal sum of current and non-current liabilities)"),
    ShareCapital: MonetaryAmount.describe("Issued share capital"),
    TreasuryShares: MonetaryAmount.optional().nullable()
      .describe("Treasury shares at cost"),
    AccumulatedProfitsLosses: MonetaryAmount.describe("Accumulated profits or losses"),
    OtherReservesAttributableToOwnersOfCompany: MonetaryAmount.optional().nullable()
      .describe("Other reserves attributable to owners of company"),
    NonControllingInterests: MonetaryAmount.optional().nullable()
      .describe("Non-controlling interests"),
    TotalEquity: MonetaryAmount.describe("Total equity (must equal share capital + accumulated profits/losses + other reserves + non-controlling interests - treasury shares)")
  }).describe("Statement of financial position showing assets, liabilities, and equity"),

  incomeStatement: z.object({
    Revenue: MonetaryAmount.describe("Total revenue from ordinary activities"),
    OtherIncome: MonetaryAmount.optional()
      .describe("Other income"),
    EmployeeBenefitsExpense: MonetaryAmount.optional()
      .describe("Employee benefits expense"),
    DepreciationExpense: MonetaryAmount.optional()
      .describe("Depreciation expense"),
    AmortisationExpense: MonetaryAmount.optional()
      .describe("Amortisation expense"),
    RepairsAndMaintenanceExpense: MonetaryAmount.optional().nullable()
      .describe("Repairs and maintenance expense"),
    SalesAndMarketingExpense: MonetaryAmount.optional().nullable()
      .describe("Sales and marketing expense"),
    OtherExpenses: MonetaryAmount.optional()
      .describe("Other expenses"),
    OtherGainsLosses: MonetaryAmount.optional().nullable()
      .describe("Other gains or losses"),
    FinanceCostsNet: MonetaryAmount.optional()
      .describe("Net finance costs"),
    ShareOfProfitLossOfAssociatesAndJointVentures: MonetaryAmount.optional().nullable()
      .describe("Share of profit or loss of associates and joint ventures accounted for using equity method"),
    ProfitLossBeforeTaxationFromContinuingOperations: MonetaryAmount.describe("Profit or loss before taxation from continuing operations"),
    IncomeTaxExpenseBenefitFromContinuingOperations: MonetaryAmount.describe("Income tax expense or benefit from continuing operations"),
    ProfitLossFromDiscontinuedOperations: MonetaryAmount.optional().nullable()
      .describe("Profit or loss from discontinued operations, net of taxation"),
    TotalProfitLossNetOfTaxation: MonetaryAmount.optional()
      .describe("Total profit or loss, net of taxation for the period"),
    ProfitLossAttributableToOwnersOfCompany: MonetaryAmount.optional()
      .describe("Profit or loss attributable to owners of the company"),
    ProfitLossAttributableToNonControllingInterests: MonetaryAmount.optional().nullable()
      .describe("Profit or loss attributable to non-controlling interests")
  }).describe("Statement of profit or loss, presented by nature of expense"),

  noteTradeAndOtherReceivables: z.object({
    TradeReceivablesExcludingContractAssetsDueFromThirdParties: MonetaryAmount.optional()
      .describe("Trade receivables (excluding contract assets) due from third parties"),
    TradeReceivablesExcludingContractAssetsDueFromRelatedParties: MonetaryAmount.optional().nullable()
      .describe("Trade receivables (excluding contract assets) due from related parties"),
    ContractAssets: MonetaryAmount.optional().nullable()
      .describe("Contract assets (unbilled receivables)"),
    NonTradeReceivables: MonetaryAmount.optional()
      .describe("Non-trade receivables"),
    TotalTradeAndOtherReceivables: MonetaryAmount.optional()
      .describe("Total trade and other receivables"),
    receivablesAnalysis: z.object({
      agingSchedule: z.array(z.object({
        ageBucket: z.string().describe("Age bucket (e.g., 'Current', '1-30 days', etc.)"),
        amount: MonetaryAmount.describe("Amount of receivables in this age bucket"),
        percentageOfTotal: Percentage.describe("Percentage of total receivables")
      })).optional().describe("Aging analysis of receivables"),
      impairmentAllowance: MonetaryAmount.optional()
        .describe("Allowance for impairment of receivables"),
      securedReceivables: MonetaryAmount.optional().nullable()
        .describe("Receivables secured by collateral")
    }).optional().nullable()
      .describe("Additional analysis of receivables")
  }).describe("Note on trade and other receivables"),

  noteTradeAndOtherPayables: z.object({
    TradePayablesExcludingContractLiabilitiesDueToThirdParties: MonetaryAmount.optional()
      .describe("Trade payables (excluding contract liabilities) due to third parties"),
    TradePayablesExcludingContractLiabilitiesDueToRelatedParties: MonetaryAmount.optional()
      .describe("Trade payables (excluding contract liabilities) due to related parties"),
    ContractLiabilities: MonetaryAmount.optional().nullable()
      .describe("Contract liabilities (including deferred income)"),
    NonTradePayables: MonetaryAmount.optional()
      .describe("Non-trade payables"),
    TotalTradeAndOtherPayables: MonetaryAmount.optional()
      .describe("Total trade and other payables"),
    payablesAnalysis: z.object({
      maturitySchedule: z.array(z.object({
        timeBucket: z.string().describe("Time bucket (e.g., 'On demand', 'Within 3 months', etc.)"),
        amount: MonetaryAmount.describe("Amount of payables in this time bucket"),
        percentageOfTotal: Percentage.describe("Percentage of total payables")
      })).optional().describe("Maturity analysis of payables")
    }).optional().nullable()
      .describe("Additional analysis of payables")
  }).describe("Note on trade and other payables"),

  noteRevenue: z.object({
    RevenueRecognisedAtPointInTimeProperties: MonetaryAmount.optional().nullable()
      .describe("Revenue from properties transferred at a point in time"),
    RevenueRecognisedAtPointInTimeGoods: MonetaryAmount.optional()
      .describe("Revenue from goods transferred at a point in time (excluding properties)"),
    RevenueRecognisedAtPointInTimeServices: MonetaryAmount.optional().nullable()
      .describe("Revenue from services transferred at a point in time"),
    RevenueRecognisedOverTimeProperties: MonetaryAmount.optional().nullable()
      .describe("Revenue from properties transferred over time"),
    RevenueRecognisedOverTimeConstructionContracts: MonetaryAmount.optional().nullable()
      .describe("Revenue from construction contracts (excluding properties) transferred over time"),
    RevenueRecognisedOverTimeServices: MonetaryAmount.optional()
      .describe("Revenue from services transferred over time"),
    RevenueOthers: MonetaryAmount.optional()
      .describe("Other revenue"),
    TotalRevenue: MonetaryAmount.describe("Total revenue"),
    revenueAnalysis: z.object({
      geographicBreakdown: z.record(z.string(), MonetaryAmount).optional()
        .describe("Revenue breakdown by geographic region"),
      productServiceBreakdown: z.record(z.string(), MonetaryAmount).optional()
        .describe("Revenue breakdown by product or service type"),
      customerConcentration: z.array(z.object({
        customerType: z.string().describe("Type of customer"),
        revenueAmount: MonetaryAmount.describe("Revenue from this customer type"),
        percentageOfTotal: Percentage.describe("Percentage of total revenue")
      })).optional()
        .describe("Analysis of customer concentration")
    }).optional().nullable()
      .describe("Additional analysis of revenue")
  }).describe("Note on revenue")
}).describe("Comprehensive financial statement schema compliant with Singapore Simplified XBRL requirements");

export type FinancialStatement = z.infer<typeof FinancialStatementSchema>;
