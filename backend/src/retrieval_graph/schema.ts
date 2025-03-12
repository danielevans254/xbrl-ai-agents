import { z } from "zod";
import { zodToJsonSchema } from "zod-to-json-schema";

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
    AuditingStandardsUsedToConductTheAudit: z.string().nullable().optional()
      .describe("Auditing standards framework used for the audit"),
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
})

const jsonSchema = zodToJsonSchema(PartialXBRLSchema, "PartialXBRL");
// export const schemaString = JSON.stringify(jsonSchema, null, 2);
export const schemaString = {
  "$ref": "#/definitions/PartialXBRL",
  "definitions": {
    "PartialXBRL": {
      "type": "object",
      "properties": {
        "filingInformation": {
          "type": "object",
          "properties": {
            "NameOfCompany": {
              "type": "string",
              "minLength": 1,
              "description": "Registered name of the entity in BizFile"
            },
            "UniqueEntityNumber": {
              "type": "string",
              "pattern": "^\\d{9}[A-Z]$",
              "description": "Unique Entity Number assigned by ACRA"
            },
            "CurrentPeriodStartDate": {
              "type": "string",
              "pattern": "^\\d{4}-\\d{2}-\\d{2}$",
              "description": "Start date of the current reporting period"
            },
            "CurrentPeriodEndDate": {
              "type": "string",
              "pattern": "^\\d{4}-\\d{2}-\\d{2}$",
              "description": "End date of the current reporting period"
            },
            "PriorPeriodStartDate": {
              "type": "string",
              "pattern": "^\\d{4}-\\d{2}-\\d{2}$",
              "description": "Start date of the prior reporting period for comparatives"
            },
            "TypeOfXBRLFiling": {
              "type": "string",
              "enum": [
                "Full",
                "Partial"
              ],
              "description": "Whether the filing contains full or partial XBRL information"
            },
            "NatureOfFinancialStatementsCompanyLevelOrConsolidated": {
              "type": "string",
              "enum": [
                "Company",
                "Consolidated"
              ],
              "description": "Whether the statements are for the company alone or consolidated group"
            },
            "TypeOfAccountingStandardUsedToPrepareFinancialStatements": {
              "type": "string",
              "enum": [
                "SFRS",
                "SFRS for SE",
                "IFRS",
                "Other"
              ],
              "description": "Accounting standards framework used"
            },
            "DateOfAuthorisationForIssueOfFinancialStatements": {
              "type": "string",
              "pattern": "^\\d{4}-\\d{2}-\\d{2}$",
              "description": "Date when the financial statements were authorized for issue"
            },
            "TypeOfStatementOfFinancialPosition": {
              "type": "string",
              "enum": [
                "Classified",
                "Liquidity-based"
              ],
              "description": "Whether the statement of financial position is presented in current/non-current format or order of liquidity"
            },
            "WhetherTheFinancialStatementsArePreparedOnGoingConcernBasis": {
              "type": "boolean",
              "description": "Whether the entity is a going concern"
            },
            "WhetherThereAreAnyChangesToComparativeAmounts": {
              "type": "boolean",
              "description": "Whether comparative amounts have been restated or reclassified"
            },
            "DescriptionOfPresentationCurrency": {
              "type": "string",
              "minLength": 3,
              "maxLength": 3,
              "pattern": "^[A-Z]{3}$",
              "description": "Currency used for presentation of the financial statements"
            },
            "DescriptionOfFunctionalCurrency": {
              "type": "string",
              "minLength": 3,
              "maxLength": 3,
              "pattern": "^[A-Z]{3}$",
              "description": "Primary currency of the economic environment in which the entity operates"
            },
            "LevelOfRoundingUsedInFinancialStatements": {
              "type": "string",
              "enum": [
                "Thousands",
                "Millions",
                "Units"
              ],
              "description": "Level of rounding applied to the financial data"
            },
            "DescriptionOfNatureOfEntitysOperationsAndPrincipalActivities": {
              "type": "string",
              "minLength": 20,
              "maxLength": 100,
              "description": "Provide a detailed description of the nature of the entity's operations and its principal business activities, including key operational insights."
            },
            "PrincipalPlaceOfBusinessIfDifferentFromRegisteredOffice": {
              "type": "string",
              "description": "Main location where business is conducted"
            },
            "WhetherCompanyOrGroupIfConsolidatedAccountsArePreparedHasMoreThan50Employees": {
              "type": "boolean",
              "description": "Whether the company or group has more than 50 employees"
            },
            "NameOfParentEntity": {
              "type": [
                "string",
                "null"
              ],
              "description": "Immediate parent company name"
            },
            "NameOfUltimateParentOfGroup": {
              "type": [
                "string",
                "null"
              ],
              "description": "Ultimate parent company name"
            },
            "TaxonomyVersion": {
              "type": "string",
              "const": "2022.2",
              "description": "Version of the XBRL taxonomy used"
            },
            "NameAndVersionOfSoftwareUsedToGenerateXBRLFile": {
              "type": "string",
              "description": "Software used to prepare the XBRL filing"
            },
            "HowWasXBRLFilePrepared": {
              "type": "string",
              "enum": [
                "Automated",
                "Manual",
                "Hybrid"
              ],
              "default": "Automated",
              "description": "Indicate how the XBRL file was prepared: automated, manual, or hybrid (default is automated)."
            }
          },
          "required": [
            "NameOfCompany",
            "UniqueEntityNumber",
            "CurrentPeriodStartDate",
            "CurrentPeriodEndDate",
            "TypeOfXBRLFiling",
            "NatureOfFinancialStatementsCompanyLevelOrConsolidated",
            "TypeOfAccountingStandardUsedToPrepareFinancialStatements",
            "DateOfAuthorisationForIssueOfFinancialStatements",
            "TypeOfStatementOfFinancialPosition",
            "WhetherTheFinancialStatementsArePreparedOnGoingConcernBasis",
            "DescriptionOfPresentationCurrency",
            "DescriptionOfFunctionalCurrency",
            "LevelOfRoundingUsedInFinancialStatements",
            "DescriptionOfNatureOfEntitysOperationsAndPrincipalActivities",
            "PrincipalPlaceOfBusinessIfDifferentFromRegisteredOffice",
            "WhetherCompanyOrGroupIfConsolidatedAccountsArePreparedHasMoreThan50Employees",
            "TaxonomyVersion",
            "NameAndVersionOfSoftwareUsedToGenerateXBRLFile"
          ],
          "additionalProperties": false,
          "description": "Basic information about the entity and the filing"
        },
        "directorsStatement": {
          "type": "object",
          "properties": {
            "WhetherInDirectorsOpinionFinancialStatementsAreDrawnUpSoAsToExhibitATrueAndFairView": {
              "type": "boolean",
              "description": "Directors' opinion on whether financial statements give a true and fair view"
            },
            "WhetherThereAreReasonableGroundsToBelieveThatCompanyWillBeAbleToPayItsDebtsAsAndWhenTheyFallDueAtDateOfStatement": {
              "type": "boolean",
              "description": "Directors' opinion on solvency of the company"
            }
          },
          "required": [
            "WhetherInDirectorsOpinionFinancialStatementsAreDrawnUpSoAsToExhibitATrueAndFairView",
            "WhetherThereAreReasonableGroundsToBelieveThatCompanyWillBeAbleToPayItsDebtsAsAndWhenTheyFallDueAtDateOfStatement"
          ],
          "additionalProperties": false,
          "description": "Statements made by the directors regarding the financial statements"
        },
        "auditReport": {
          "type": "object",
          "properties": {
            "TypeOfAuditOpinionInIndependentAuditorsReport": {
              "type": "string",
              "enum": [
                "Unqualified",
                "Qualified",
                "Adverse",
                "Disclaimer"
              ],
              "description": "Type of opinion expressed by the auditors"
            },
            "AuditingStandardsUsedToConductTheAudit": {
              "type": [
                "string",
                "null"
              ],
              "description": "Auditing standards framework used for the audit"
            },
            "WhetherThereIsAnyMaterialUncertaintyRelatingToGoingConcern": {
              "type": [
                "boolean",
                "null"
              ],
              "description": "Whether auditors reported material uncertainty about going concern"
            },
            "WhetherInAuditorsOpinionAccountingAndOtherRecordsRequiredAreProperlyKept": {
              "type": [
                "boolean",
                "null"
              ],
              "description": "Auditors' opinion on whether proper accounting records have been kept"
            }
          },
          "required": [
            "TypeOfAuditOpinionInIndependentAuditorsReport"
          ],
          "additionalProperties": false,
          "description": "Information about the independent auditors' report"
        },
        "statementOfFinancialPosition": {
          "type": "object",
          "properties": {
            "currentAssets": {
              "type": "object",
              "properties": {
                "CashAndBankBalances": {
                  "type": "number",
                  "default": 0,
                  "description": "Cash and bank balances, current"
                },
                "TradeAndOtherReceivablesCurrent": {
                  "$ref": "#/definitions/PartialXBRL/properties/statementOfFinancialPosition/properties/currentAssets/properties/CashAndBankBalances",
                  "default": 0,
                  "description": "Trade and other receivables (including contract assets), current"
                },
                "CurrentFinanceLeaseReceivables": {
                  "$ref": "#/definitions/PartialXBRL/properties/statementOfFinancialPosition/properties/currentAssets/properties/CashAndBankBalances",
                  "default": 0,
                  "description": "Financial assets - lease receivables, current"
                },
                "CurrentDerivativeFinancialAssets": {
                  "$ref": "#/definitions/PartialXBRL/properties/statementOfFinancialPosition/properties/currentAssets/properties/CashAndBankBalances",
                  "default": 0,
                  "description": "Financial assets - derivatives, current"
                },
                "CurrentFinancialAssetsMeasuredAtFairValueThroughProfitOrLoss": {
                  "$ref": "#/definitions/PartialXBRL/properties/statementOfFinancialPosition/properties/currentAssets/properties/CashAndBankBalances",
                  "default": 0,
                  "description": "Financial assets - at fair value through profit or loss, current"
                },
                "OtherCurrentFinancialAssets": {
                  "$ref": "#/definitions/PartialXBRL/properties/statementOfFinancialPosition/properties/currentAssets/properties/CashAndBankBalances",
                  "default": 0,
                  "description": "Other financial assets, current"
                },
                "DevelopmentProperties": {
                  "$ref": "#/definitions/PartialXBRL/properties/statementOfFinancialPosition/properties/currentAssets/properties/CashAndBankBalances",
                  "default": 0,
                  "description": "Inventories - development properties, current"
                },
                "Inventories": {
                  "$ref": "#/definitions/PartialXBRL/properties/statementOfFinancialPosition/properties/currentAssets/properties/CashAndBankBalances",
                  "default": 0,
                  "description": "Inventories - others, current"
                },
                "OtherCurrentNonfinancialAssets": {
                  "$ref": "#/definitions/PartialXBRL/properties/statementOfFinancialPosition/properties/currentAssets/properties/CashAndBankBalances",
                  "default": 0,
                  "description": "Other non-financial assets, current"
                },
                "NoncurrentAssetsOrDisposalGroupsClassifiedAsHeldForSaleOrAsHeldForDistributionToOwners": {
                  "$ref": "#/definitions/PartialXBRL/properties/statementOfFinancialPosition/properties/currentAssets/properties/CashAndBankBalances",
                  "default": 0,
                  "description": "Non-current assets or disposal groups classified as held for sale/distribution"
                },
                "CurrentAssets": {
                  "type": "number",
                  "description": "Total current assets (sum of current asset components)"
                }
              },
              "required": [
                "CurrentAssets"
              ],
              "additionalProperties": false,
              "description": "Current assets section"
            },
            "nonCurrentAssets": {
              "type": "object",
              "properties": {
                "TradeAndOtherReceivablesNoncurrent": {
                  "$ref": "#/definitions/PartialXBRL/properties/statementOfFinancialPosition/properties/currentAssets/properties/CashAndBankBalances",
                  "default": 0,
                  "description": "Trade and other receivables (including contract assets and restricted cash), non-current"
                },
                "NoncurrentFinanceLeaseReceivables": {
                  "$ref": "#/definitions/PartialXBRL/properties/statementOfFinancialPosition/properties/currentAssets/properties/CashAndBankBalances",
                  "default": 0,
                  "description": "Financial assets - lease receivables, non-current"
                },
                "NoncurrentDerivativeFinancialAssets": {
                  "$ref": "#/definitions/PartialXBRL/properties/statementOfFinancialPosition/properties/currentAssets/properties/CashAndBankBalances",
                  "default": 0,
                  "description": "Financial assets - derivatives, non-current"
                },
                "NoncurrentFinancialAssetsMeasuredAtFairValueThroughProfitOrLoss": {
                  "$ref": "#/definitions/PartialXBRL/properties/statementOfFinancialPosition/properties/currentAssets/properties/CashAndBankBalances",
                  "default": 0,
                  "description": "Financial assets - at fair value through profit or loss, non-current"
                },
                "OtherNoncurrentFinancialAssets": {
                  "$ref": "#/definitions/PartialXBRL/properties/statementOfFinancialPosition/properties/currentAssets/properties/CashAndBankBalances",
                  "default": 0,
                  "description": "Other financial assets, non-current"
                },
                "PropertyPlantAndEquipment": {
                  "$ref": "#/definitions/PartialXBRL/properties/statementOfFinancialPosition/properties/currentAssets/properties/CashAndBankBalances",
                  "default": 0,
                  "description": "Property, plant and equipment"
                },
                "InvestmentProperties": {
                  "$ref": "#/definitions/PartialXBRL/properties/statementOfFinancialPosition/properties/currentAssets/properties/CashAndBankBalances",
                  "default": 0,
                  "description": "Investment properties"
                },
                "Goodwill": {
                  "$ref": "#/definitions/PartialXBRL/properties/statementOfFinancialPosition/properties/currentAssets/properties/CashAndBankBalances",
                  "default": 0,
                  "description": "Goodwill"
                },
                "IntangibleAssetsOtherThanGoodwill": {
                  "$ref": "#/definitions/PartialXBRL/properties/statementOfFinancialPosition/properties/currentAssets/properties/CashAndBankBalances",
                  "default": 0,
                  "description": "Intangible assets (excluding goodwill)"
                },
                "InvestmentsInSubsidiariesAssociatesOrJointVentures": {
                  "$ref": "#/definitions/PartialXBRL/properties/statementOfFinancialPosition/properties/currentAssets/properties/CashAndBankBalances",
                  "default": 0,
                  "description": "Investments in subsidiaries, joint ventures and associates"
                },
                "DeferredTaxAssets": {
                  "$ref": "#/definitions/PartialXBRL/properties/statementOfFinancialPosition/properties/currentAssets/properties/CashAndBankBalances",
                  "default": 0,
                  "description": "Deferred tax assets"
                },
                "OtherNoncurrentNonfinancialAssets": {
                  "$ref": "#/definitions/PartialXBRL/properties/statementOfFinancialPosition/properties/currentAssets/properties/CashAndBankBalances",
                  "default": 0,
                  "description": "Other non-financial assets, non-current"
                },
                "NoncurrentAssets": {
                  "type": "number",
                  "description": "Total non-current assets (sum of non-current components)"
                }
              },
              "required": [
                "NoncurrentAssets"
              ],
              "additionalProperties": false,
              "description": "Non-current assets section"
            },
            "Assets": {
              "type": "number",
              "description": "Total assets (CurrentAssets + NoncurrentAssets)"
            },
            "currentLiabilities": {
              "type": "object",
              "properties": {
                "TradeAndOtherPayablesCurrent": {
                  "$ref": "#/definitions/PartialXBRL/properties/statementOfFinancialPosition/properties/currentAssets/properties/CashAndBankBalances",
                  "default": 0,
                  "description": "Trade and other payables (including contract liabilities), current"
                },
                "CurrentLoansAndBorrowings": {
                  "$ref": "#/definitions/PartialXBRL/properties/statementOfFinancialPosition/properties/currentAssets/properties/CashAndBankBalances",
                  "default": 0,
                  "description": "Loans and borrowings, current"
                },
                "CurrentFinancialLiabilitiesMeasuredAtFairValueThroughProfitOrLoss": {
                  "$ref": "#/definitions/PartialXBRL/properties/statementOfFinancialPosition/properties/currentAssets/properties/CashAndBankBalances",
                  "default": 0,
                  "description": "Financial liabilities - derivatives and at fair value through P/L, current"
                },
                "CurrentFinanceLeaseLiabilities": {
                  "$ref": "#/definitions/PartialXBRL/properties/statementOfFinancialPosition/properties/currentAssets/properties/CashAndBankBalances",
                  "default": 0,
                  "description": "Financial liabilities - lease liabilities, current"
                },
                "OtherCurrentFinancialLiabilities": {
                  "$ref": "#/definitions/PartialXBRL/properties/statementOfFinancialPosition/properties/currentAssets/properties/CashAndBankBalances",
                  "default": 0,
                  "description": "Other financial liabilities, current"
                },
                "CurrentIncomeTaxLiabilities": {
                  "$ref": "#/definitions/PartialXBRL/properties/statementOfFinancialPosition/properties/currentAssets/properties/CashAndBankBalances",
                  "default": 0,
                  "description": "Income tax liabilities, current"
                },
                "CurrentProvisions": {
                  "$ref": "#/definitions/PartialXBRL/properties/statementOfFinancialPosition/properties/currentAssets/properties/CashAndBankBalances",
                  "default": 0,
                  "description": "Provisions (excluding income tax), current"
                },
                "OtherCurrentNonfinancialLiabilities": {
                  "$ref": "#/definitions/PartialXBRL/properties/statementOfFinancialPosition/properties/currentAssets/properties/CashAndBankBalances",
                  "default": 0,
                  "description": "Other non-financial liabilities, current"
                },
                "LiabilitiesClassifiedAsHeldForSale": {
                  "$ref": "#/definitions/PartialXBRL/properties/statementOfFinancialPosition/properties/currentAssets/properties/CashAndBankBalances",
                  "default": 0,
                  "description": "Liabilities included in disposal groups held for sale"
                },
                "CurrentLiabilities": {
                  "type": "number",
                  "description": "Total current liabilities (sum of components)"
                }
              },
              "required": [
                "CurrentLiabilities"
              ],
              "additionalProperties": false,
              "description": "Current liabilities section"
            },
            "nonCurrentLiabilities": {
              "type": "object",
              "properties": {
                "TradeAndOtherPayablesNoncurrent": {
                  "$ref": "#/definitions/PartialXBRL/properties/statementOfFinancialPosition/properties/currentAssets/properties/CashAndBankBalances",
                  "default": 0,
                  "description": "Trade and other payables (including contract liabilities), non-current"
                },
                "NoncurrentLoansAndBorrowings": {
                  "$ref": "#/definitions/PartialXBRL/properties/statementOfFinancialPosition/properties/currentAssets/properties/CashAndBankBalances",
                  "default": 0,
                  "description": "Loans and borrowings, non-current"
                },
                "NoncurrentFinancialLiabilitiesMeasuredAtFairValueThroughProfitOrLoss": {
                  "$ref": "#/definitions/PartialXBRL/properties/statementOfFinancialPosition/properties/currentAssets/properties/CashAndBankBalances",
                  "default": 0,
                  "description": "Financial liabilities - derivatives and at fair value through P/L, non-current"
                },
                "NoncurrentFinanceLeaseLiabilities": {
                  "$ref": "#/definitions/PartialXBRL/properties/statementOfFinancialPosition/properties/currentAssets/properties/CashAndBankBalances",
                  "default": 0,
                  "description": "Financial liabilities - lease liabilities, non-current"
                },
                "OtherNoncurrentFinancialLiabilities": {
                  "$ref": "#/definitions/PartialXBRL/properties/statementOfFinancialPosition/properties/currentAssets/properties/CashAndBankBalances",
                  "default": 0,
                  "description": "Other financial liabilities, non-current"
                },
                "DeferredTaxLiabilities": {
                  "$ref": "#/definitions/PartialXBRL/properties/statementOfFinancialPosition/properties/currentAssets/properties/CashAndBankBalances",
                  "default": 0,
                  "description": "Deferred tax liabilities"
                },
                "NoncurrentProvisions": {
                  "$ref": "#/definitions/PartialXBRL/properties/statementOfFinancialPosition/properties/currentAssets/properties/CashAndBankBalances",
                  "default": 0,
                  "description": "Provisions (including non-current income tax)"
                },
                "OtherNoncurrentNonfinancialLiabilities": {
                  "$ref": "#/definitions/PartialXBRL/properties/statementOfFinancialPosition/properties/currentAssets/properties/CashAndBankBalances",
                  "default": 0,
                  "description": "Other non-financial liabilities, non-current"
                },
                "NoncurrentLiabilities": {
                  "type": "number",
                  "description": "Total non-current liabilities (sum of components)"
                }
              },
              "required": [
                "NoncurrentLiabilities"
              ],
              "additionalProperties": false,
              "description": "Non-current liabilities section"
            },
            "Liabilities": {
              "type": "number",
              "description": "Total liabilities (CurrentLiabilities + NoncurrentLiabilities)"
            },
            "equity": {
              "type": "object",
              "properties": {
                "ShareCapital": {
                  "type": "number",
                  "description": "Share capital"
                },
                "TreasuryShares": {
                  "$ref": "#/definitions/PartialXBRL/properties/statementOfFinancialPosition/properties/currentAssets/properties/CashAndBankBalances",
                  "default": 0,
                  "description": "Treasury shares"
                },
                "AccumulatedProfitsLosses": {
                  "type": "number",
                  "description": "Accumulated profits (losses)"
                },
                "ReservesOtherThanAccumulatedProfitsLosses": {
                  "$ref": "#/definitions/PartialXBRL/properties/statementOfFinancialPosition/properties/currentAssets/properties/CashAndBankBalances",
                  "default": 0,
                  "description": "Other reserves attributable to owners"
                },
                "NoncontrollingInterests": {
                  "$ref": "#/definitions/PartialXBRL/properties/statementOfFinancialPosition/properties/currentAssets/properties/CashAndBankBalances",
                  "default": 0,
                  "description": "Non-controlling interests"
                },
                "Equity": {
                  "type": "number",
                  "description": "Total equity (ShareCapital + AccumulatedProfitsLosses + Reserves + NoncontrollingInterests - TreasuryShares)"
                }
              },
              "required": [
                "ShareCapital",
                "AccumulatedProfitsLosses",
                "Equity"
              ],
              "additionalProperties": false,
              "description": "Equity section"
            }
          },
          "required": [
            "currentAssets",
            "nonCurrentAssets",
            "Assets",
            "currentLiabilities",
            "nonCurrentLiabilities",
            "Liabilities",
            "equity"
          ],
          "additionalProperties": false
        },
        "incomeStatement": {
          "type": "object",
          "properties": {
            "Revenue": {
              "type": "number",
              "description": "Revenue from contracts with customers"
            },
            "OtherIncome": {
              "$ref": "#/definitions/PartialXBRL/properties/statementOfFinancialPosition/properties/currentAssets/properties/CashAndBankBalances",
              "default": 0,
              "description": "Other income"
            },
            "EmployeeBenefitsExpense": {
              "$ref": "#/definitions/PartialXBRL/properties/statementOfFinancialPosition/properties/currentAssets/properties/CashAndBankBalances",
              "default": 0,
              "description": "Employee benefits expense"
            },
            "DepreciationExpense": {
              "$ref": "#/definitions/PartialXBRL/properties/statementOfFinancialPosition/properties/currentAssets/properties/CashAndBankBalances",
              "default": 0,
              "description": "Depreciation of property, plant and equipment"
            },
            "AmortisationExpense": {
              "$ref": "#/definitions/PartialXBRL/properties/statementOfFinancialPosition/properties/currentAssets/properties/CashAndBankBalances",
              "default": 0,
              "description": "Amortisation of intangible assets"
            },
            "RepairsAndMaintenanceExpense": {
              "$ref": "#/definitions/PartialXBRL/properties/statementOfFinancialPosition/properties/currentAssets/properties/CashAndBankBalances",
              "default": 0,
              "description": "Repairs and maintenance costs"
            },
            "SalesAndMarketingExpense": {
              "$ref": "#/definitions/PartialXBRL/properties/statementOfFinancialPosition/properties/currentAssets/properties/CashAndBankBalances",
              "default": 0,
              "description": "Sales and marketing costs"
            },
            "OtherExpensesByNature": {
              "$ref": "#/definitions/PartialXBRL/properties/statementOfFinancialPosition/properties/currentAssets/properties/CashAndBankBalances",
              "default": 0,
              "description": "Other operating expenses by nature"
            },
            "OtherGainsLosses": {
              "$ref": "#/definitions/PartialXBRL/properties/statementOfFinancialPosition/properties/currentAssets/properties/CashAndBankBalances",
              "default": 0,
              "description": "Other gains/(losses)"
            },
            "FinanceCosts": {
              "$ref": "#/definitions/PartialXBRL/properties/statementOfFinancialPosition/properties/currentAssets/properties/CashAndBankBalances",
              "default": 0,
              "description": "Net finance costs"
            },
            "ShareOfProfitLossOfAssociatesAndJointVenturesAccountedForUsingEquityMethod": {
              "$ref": "#/definitions/PartialXBRL/properties/statementOfFinancialPosition/properties/currentAssets/properties/CashAndBankBalances",
              "default": 0,
              "description": "Share of profits/(losses) of associates/joint ventures"
            },
            "ProfitLossBeforeTaxation": {
              "type": "number",
              "description": "Profit/(loss) before tax from continuing operations"
            },
            "TaxExpenseBenefitContinuingOperations": {
              "type": "number",
              "description": "Income tax expense/(benefit)"
            },
            "ProfitLossFromDiscontinuedOperations": {
              "$ref": "#/definitions/PartialXBRL/properties/statementOfFinancialPosition/properties/currentAssets/properties/CashAndBankBalances",
              "default": 0,
              "description": "Profit/(loss) from discontinued operations"
            },
            "ProfitLoss": {
              "type": "number",
              "description": "Total comprehensive income for the period"
            },
            "ProfitLossAttributableToNoncontrollingInterests": {
              "$ref": "#/definitions/PartialXBRL/properties/statementOfFinancialPosition/properties/currentAssets/properties/CashAndBankBalances",
              "default": 0,
              "description": "Portion attributable to NCI"
            }
          },
          "required": [
            "Revenue",
            "ProfitLossBeforeTaxation",
            "TaxExpenseBenefitContinuingOperations",
            "ProfitLoss"
          ],
          "additionalProperties": false
        },
        "notes": {
          "type": "object",
          "properties": {
            "tradeAndOtherReceivables": {
              "type": "object",
              "properties": {
                "TradeAndOtherReceivablesDueFromThirdParties": {
                  "$ref": "#/definitions/PartialXBRL/properties/statementOfFinancialPosition/properties/currentAssets/properties/CashAndBankBalances",
                  "default": 0,
                  "description": "Optional monetary amount in SGD (defaults to 0)"
                },
                "TradeAndOtherReceivablesDueFromRelatedParties": {
                  "$ref": "#/definitions/PartialXBRL/properties/notes/properties/tradeAndOtherReceivables/properties/TradeAndOtherReceivablesDueFromThirdParties"
                },
                "UnbilledReceivables": {
                  "$ref": "#/definitions/PartialXBRL/properties/notes/properties/tradeAndOtherReceivables/properties/TradeAndOtherReceivablesDueFromThirdParties"
                },
                "OtherReceivables": {
                  "$ref": "#/definitions/PartialXBRL/properties/notes/properties/tradeAndOtherReceivables/properties/TradeAndOtherReceivablesDueFromThirdParties"
                },
                "TradeAndOtherReceivables": {
                  "type": "number",
                  "description": "Monetary amount in SGD"
                }
              },
              "required": [
                "TradeAndOtherReceivables"
              ],
              "additionalProperties": false
            },
            "tradeAndOtherPayables": {
              "type": "object",
              "properties": {
                "TradeAndOtherPayablesDueToThirdParties": {
                  "$ref": "#/definitions/PartialXBRL/properties/notes/properties/tradeAndOtherReceivables/properties/TradeAndOtherReceivablesDueFromThirdParties"
                },
                "TradeAndOtherPayablesDueToRelatedParties": {
                  "$ref": "#/definitions/PartialXBRL/properties/notes/properties/tradeAndOtherReceivables/properties/TradeAndOtherReceivablesDueFromThirdParties"
                },
                "DeferredIncome": {
                  "$ref": "#/definitions/PartialXBRL/properties/notes/properties/tradeAndOtherReceivables/properties/TradeAndOtherReceivablesDueFromThirdParties"
                },
                "OtherPayables": {
                  "$ref": "#/definitions/PartialXBRL/properties/notes/properties/tradeAndOtherReceivables/properties/TradeAndOtherReceivablesDueFromThirdParties"
                },
                "TradeAndOtherPayables": {
                  "$ref": "#/definitions/PartialXBRL/properties/notes/properties/tradeAndOtherReceivables/properties/TradeAndOtherReceivables"
                }
              },
              "required": [
                "TradeAndOtherPayables"
              ],
              "additionalProperties": false
            },
            "revenue": {
              "type": "object",
              "properties": {
                "RevenueFromPropertyTransferredAtPointInTime": {
                  "$ref": "#/definitions/PartialXBRL/properties/notes/properties/tradeAndOtherReceivables/properties/TradeAndOtherReceivablesDueFromThirdParties"
                },
                "RevenueFromGoodsTransferredAtPointInTime": {
                  "$ref": "#/definitions/PartialXBRL/properties/notes/properties/tradeAndOtherReceivables/properties/TradeAndOtherReceivablesDueFromThirdParties"
                },
                "RevenueFromServicesTransferredAtPointInTime": {
                  "$ref": "#/definitions/PartialXBRL/properties/notes/properties/tradeAndOtherReceivables/properties/TradeAndOtherReceivablesDueFromThirdParties"
                },
                "RevenueFromPropertyTransferredOverTime": {
                  "$ref": "#/definitions/PartialXBRL/properties/notes/properties/tradeAndOtherReceivables/properties/TradeAndOtherReceivablesDueFromThirdParties"
                },
                "RevenueFromConstructionContractsOverTime": {
                  "$ref": "#/definitions/PartialXBRL/properties/notes/properties/tradeAndOtherReceivables/properties/TradeAndOtherReceivablesDueFromThirdParties"
                },
                "RevenueFromServicesTransferredOverTime": {
                  "$ref": "#/definitions/PartialXBRL/properties/notes/properties/tradeAndOtherReceivables/properties/TradeAndOtherReceivablesDueFromThirdParties"
                },
                "OtherRevenue": {
                  "$ref": "#/definitions/PartialXBRL/properties/notes/properties/tradeAndOtherReceivables/properties/TradeAndOtherReceivablesDueFromThirdParties"
                },
                "Revenue": {
                  "$ref": "#/definitions/PartialXBRL/properties/notes/properties/tradeAndOtherReceivables/properties/TradeAndOtherReceivables"
                }
              },
              "required": [
                "Revenue"
              ],
              "additionalProperties": false
            }
          },
          "required": [
            "tradeAndOtherReceivables",
            "tradeAndOtherPayables",
            "revenue"
          ],
          "additionalProperties": false,
          "description": "Comprehensive financial statement schema compliant with Singapore Simplified XBRL requirements"
        }
      },
      "required": [
        "filingInformation",
        "directorsStatement",
        "auditReport",
        "statementOfFinancialPosition",
        "incomeStatement",
        "notes"
      ],
      "additionalProperties": false
    }
  },
  "$schema": "http://json-schema.org/draft-07/schema#"
}

export type PartialXBRL = z.infer<typeof PartialXBRLSchema>;