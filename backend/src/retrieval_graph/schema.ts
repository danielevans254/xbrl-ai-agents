import { z } from "zod";

const FinancialStatementSchema = z.object({
  // [10000000] Filing Information
  filingInformation: z.object({
    DisclosureOfFilingInformationAbstract: z.string().optional(),
    NameOfCompany: z.string().min(1),
    UniqueEntityNumber: z.string().regex(/^\d{8}[A-Z]$/),
    CurrentPeriodStartDate: z.string().datetime(),
    CurrentPeriodEndDate: z.string().datetime(),
    PriorPeriodStartDate: z.string().datetime().optional(),
    TypeOfXBRLFiling: z.enum(["Full", "Partial"]),
    NatureOfFinancialStatementsCompanyLevelOrConsolidated: z.enum(["Company", "Consolidated"]),
    TypeOfAccountingStandardUsedToPrepareFinancialStatements: z.enum(["SFRS", "SFRS for SE", "Other"]),
    DateOfAuthorisationForIssueOfFinancialStatements: z.string().datetime(),
    TypeOfStatementOfFinancialPosition: z.enum(["Classified", "Liquidity-based"]),
    WhetherFinancialStatementsArePreparedOnGoingConcernBasis: z.boolean(),
    WhetherThereAreChangesToComparativeAmountsDueToRestatementsReclassificationOrOtherReasons: z.boolean().optional(),
    DescriptionOfPresentationCurrency: z.string().length(3),
    DescriptionOfFunctionalCurrency: z.string().length(3),
    LevelOfRoundingUsedInFinancialStatements: z.enum(["Thousands", "Millions", "Units"]),
    DescriptionOfNatureOfEntitysOperationsAndPrincipalActivities: z.string(),
    PrincipalPlaceOfBusinessIfDifferentFromRegisteredOffice: z.string(),
    WhetherCompanyOrGroupIfConsolidatedAccountsArePreparedHasMoreThan50Employees: z.boolean(),
    NameOfParentEntity: z.string().optional(),
    NameOfUltimateParentOfGroup: z.string().optional(),
    DetailsOfInstanceDocumentAbstract: z.string().optional(),
    TaxonomyVersion: z.string(),
    NameAndVersionOfSoftwareUsedToGenerateInstanceDocument: z.string(),
    HowWasXBRLInstanceDocumentPrepared: z.enum(["Manual", "Automated", "Hybrid"])
  }),
  // [11000000] Statement by Directors
  directorsStatement: z.object({
    DisclosureInStatementByDirectorsAbstract: z.string().optional(),
    WhetherInDirectorsOpinionFinancialStatementsAreDrawnUpSoAsToExhibitATrueAndFairView: z.boolean(),
    WhetherThereAreReasonableGroundsToBelieveThatCompanyWillBeAbleToPayItsDebtsAsAndWhenTheyFallDueAtDateOfStatement: z.boolean()
  }),
  // [12000000] Independent Auditors' Report
  auditReport: z.object({
    DisclosuresInIndependentAuditorsReportAbstract: z.string().optional(),
    TypeOfAuditOpinionInIndependentAuditorsReport: z.enum(["Unqualified", "Qualified", "Adverse", "Disclaimer"]),
    AuditingStandardsUsedToConductAudit: z.string().optional(),
    WhetherThereIsAnyMaterialUncertaintyRelatingToGoingConcern: z.boolean().optional(),
    WhetherInAuditorsOpinionAccountingAndOtherRecordsRequiredAreProperlyKeptInAccordanceWithCompaniesAct: z.boolean().optional()
  }),
  // [21100000] Statement of Financial Position, Current and Non-current
  statementOfFinancialPosition: z.object({
    StatementOfFinancialPositionAbstract: z.string().optional(),
    StatementOfFinancialPositionTable: z.string().optional(),
    ConsolidatedAndSeparateFinancialStatementsAxis: z.string().optional(),
    ConsolidatedMember: z.string().optional(),
    SeparateMember: z.string().optional(),
    StatementOfFinancialPositionLineItems: z.string().optional(),
    AssetsAbstract: z.string().optional(),
    CurrentAssetsAbstract: z.string().optional(),
    CashAndBankBalances: z.number().optional(),
    TradeAndOtherReceivablesCurrent: z.number().optional(),
    CurrentFinanceLeaseReceivables: z.number().optional(),
    CurrentDerivativeFinancialAssets: z.number().optional(),
    CurrentFinancialAssetsMeasuredAtFairValueThroughProfitOrLoss: z.number().optional(),
    OtherCurrentFinancialAssets: z.number().optional(),
    DevelopmentProperties: z.number().optional(),
    Inventories: z.number().optional(),
    OtherCurrentNonfinancialAssets: z.number().optional(),
    NoncurrentAssetsOrDisposalGroupsClassifiedAsHeldForSaleOrAsHeldForDistributionToOwners: z.number().optional(),
    CurrentAssets: z.number(), // Total current assets (mandatory)
    NoncurrentAssetsAbstract: z.string().optional(),
    TradeAndOtherReceivablesNoncurrent: z.number().optional(),
    NoncurrentFinanceLeaseReceivables: z.number().optional(),
    NoncurrentDerivativeFinancialAssets: z.number().optional(),
    NoncurrentFinancialAssetsMeasuredAtFairValueThroughProfitOrLoss: z.number().optional(),
    OtherNoncurrentFinancialAssets: z.number().optional(),
    PropertyPlantAndEquipment: z.number().optional(),
    InvestmentProperties: z.number().optional(),
    Goodwill: z.number().optional(),
    IntangibleAssetsOtherThanGoodwill: z.number().optional(),
    InvestmentsInSubsidiariesAssociatesOrJointVentures: z.number().optional(),
    DeferredTaxAssets: z.number().optional(),
    OtherNoncurrentNonfinancialAssets: z.number().optional(),
    NoncurrentAssets: z.number().optional(),
    Assets: z.number(), // Total assets (mandatory)
    LiabilitiesAbstract: z.string().optional(),
    CurrentLiabilitiesAbstract: z.string().optional(),
    TradeAndOtherPayablesCurrent: z.number().optional(),
    CurrentLoansAndBorrowings: z.number().optional(),
    CurrentFinancialLiabilitiesMeasuredAtFairValueThroughProfitOrLoss: z.number().optional(),
    CurrentFinanceLeaseLiabilities: z.number().optional(),
    OtherCurrentFinancialLiabilities: z.number().optional(),
    CurrentIncomeTaxLiabilities: z.number().optional(),
    CurrentProvisions: z.number().optional(),
    OtherCurrentNonfinancialLiabilities: z.number().optional(),
    LiabilitiesClassifiedAsHeldForSale: z.number().optional(),
    CurrentLiabilities: z.number(), // Total current liabilities (mandatory)
    NoncurrentLiabilitiesAbstract: z.string().optional(),
    TradeAndOtherPayablesNoncurrent: z.number().optional(),
    NoncurrentLoansAndBorrowings: z.number().optional(),
    NoncurrentFinancialLiabilitiesMeasuredAtFairValueThroughProfitOrLoss: z.number().optional(),
    NoncurrentFinanceLeaseLiabilities: z.number().optional(),
    OtherNoncurrentFinancialLiabilities: z.number().optional(),
    DeferredTaxLiabilities: z.number().optional(),
    NoncurrentProvisions: z.number().optional(),
    OtherNoncurrentNonfinancialLiabilities: z.number().optional(),
    NoncurrentLiabilities: z.number().optional(),
    Liabilities: z.number(), // Total liabilities (mandatory)
    EquityAbstract: z.string().optional(),
    ShareCapital: z.number(), // Mandatory
    TreasuryShares: z.number().optional(),
    AccumulatedProfitsLosses: z.number(), // Mandatory
    ReservesOtherThanAccumulatedProfitsLosses: z.number().optional(),
    NoncontrollingInterests: z.number().optional(),
    Equity: z.number() // Total equity (mandatory)
  }),
  // [22000000] Income Statement, by Nature of Expense
  incomeStatement: z.object({
    StatementOfProfitOrLossAbstract: z.string().optional(),
    StatementOfProfitOrLossTable: z.string().optional(),
    ConsolidatedAndSeparateFinancialStatementsAxis: z.string().optional(),
    ConsolidatedMember: z.string().optional(),
    SeparateMember: z.string().optional(),
    StatementOfProfitOrLossLineItems: z.string().optional(),
    ProfitLossAbstract: z.string().optional(),
    Revenue: z.number(), // Mandatory
    OtherIncome: z.number().optional(),
    EmployeeBenefitsExpense: z.number().optional(),
    DepreciationExpense: z.number().optional(),
    AmortisationExpense: z.number().optional(),
    RepairsAndMaintenanceExpense: z.number().optional(),
    SalesAndMarketingExpense: z.number().optional(),
    OtherExpensesByNature: z.number().optional(),
    OtherGainsLosses: z.number().optional(),
    FinanceCosts: z.number().optional(),
    ShareOfProfitLossOfAssociatesAndJointVenturesAccountedForUsingEquityMethod: z.number().optional(),
    ProfitLossBeforeTaxation: z.number(), // Mandatory
    TaxExpenseBenefitContinuingOperations: z.number(), // Mandatory
    ProfitLossFromDiscontinuedOperations: z.number().optional(),
    ProfitLoss: z.number(), // Mandatory
    ProfitLossAttributableToAbstract: z.number().optional(),
    ProfitLossAttributableToOwnersOfCompany: z.number().optional(),
    ProfitLossAttributableToNoncontrollingInterests: z.number().optional()
  }),
  // [31000000] Note – Trade and Other Receivables
  noteTradeAndOtherReceivables: z.object({
    TradeAndOtherReceivablesAbstract: z.string().optional(),
    DisclosureOfDetailedInformationAboutTradeAndOtherReceivablesTable: z.string().optional(),
    ConsolidatedAndSeparateFinancialStatementsAxis: z.string().optional(),
    ConsolidatedMember: z.string().optional(),
    SeparateMember: z.string().optional(),
    DisclosureOfDetailedInformationAboutTradeAndOtherReceivablesLineItems: z.string().optional(),
    TradeAndOtherReceivablesDueFromThirdParties: z.number().optional(),
    TradeAndOtherReceivablesDueFromRelatedParties: z.number().optional(),
    UnbilledReceivables: z.number().optional(),
    OtherReceivables: z.number().optional(),
    TradeAndOtherReceivables: z.number().optional()
  }),
  // [32000000] Note – Trade and Other Payables
  noteTradeAndOtherPayables: z.object({
    TradeAndOtherPayablesAbstract: z.string().optional(),
    DisclosureOfDetailedInformationAboutTradeAndOtherPayablesTable: z.string().optional(),
    ConsolidatedAndSeparateFinancialStatementsAxis: z.string().optional(),
    ConsolidatedMember: z.string().optional(),
    SeparateMember: z.string().optional(),
    DisclosureOfDetailedInformationAboutTradeAndOtherPayablesLineItems: z.string().optional(),
    TradeAndOtherPayablesDueToThirdParties: z.number().optional(),
    TradeAndOtherPayablesDueToRelatedParties: z.number().optional(),
    DeferredIncome: z.number().optional(),
    OtherPayables: z.number().optional(),
    TradeAndOtherPayables: z.number().optional()
  }),
  // [33000000] Note – Revenue
  noteRevenue: z.object({
    DisclosureOfRevenueAbstract: z.string().optional(),
    DisclosureOfRevenueTable: z.string().optional(),
    ConsolidatedAndSeparateFinancialStatementsAxis: z.string().optional(),
    ConsolidatedMember: z.string().optional(),
    SeparateMember: z.string().optional(),
    DisclosureOfRevenueLineItems: z.string().optional(),
    RevenueAbstract: z.string().optional(),
    RevenueFromPropertyTransferredAtPointInTime: z.number().optional(),
    RevenueFromGoodsTransferredAtPointInTime: z.number().optional(),
    RevenueFromServicesTransferredAtPointInTime: z.number().optional(),
    RevenueFromPropertyTransferredOverTime: z.number().optional(),
    RevenueFromConstructionContractsOverTime: z.number().optional(),
    RevenueFromServicesTransferredOverTime: z.number().optional(),
    OtherRevenue: z.number().optional(),
    Revenue: z.number() // Mandatory
  })
}).describe("Complete financial reporting package compliant with SG Simplfied XBRL requirements");

export type FinancialStatement = z.infer<typeof FinancialStatementSchema>;
