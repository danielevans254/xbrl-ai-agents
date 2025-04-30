/**
 * Normalizes the mapped data from the API to match the expected format for ACRA data processor
 * @param apiResponse The full response from the mapping API
 * @returns Normalized data matching the expected ACRA format
 */
export function normalizeAcraData(apiResponse) {
  // Check if we have a valid response object
  if (!apiResponse || !apiResponse.data) {
    console.error('Invalid API response for normalization:', apiResponse);
    return {
      filingInformation: {},
      directorsStatement: {},
      auditReport: {},
      statementOfFinancialPosition: {
        currentAssets: {},
        nonCurrentAssets: {},
        currentLiabilities: {},
        nonCurrentLiabilities: {},
        equity: {}
      },
      incomeStatement: {},
      statementOfCashFlows: {},
      statementOfChangesInEquity: {},
      notes: {
        tradeAndOtherReceivables: {},
        tradeAndOtherPayables: {},
        revenue: {}
      }
    };
  }

  // Extract the actual data object from the API response
  const sourceData = apiResponse.data;

  // Create the normalized data structure
  const normalizedData = {
    filingInformation: {},
    directorsStatement: {},
    auditReport: {},
    statementOfFinancialPosition: {
      currentAssets: {},
      nonCurrentAssets: {},
      currentLiabilities: {},
      nonCurrentLiabilities: {},
      equity: {}
    },
    incomeStatement: {},
    statementOfCashFlows: {},
    statementOfChangesInEquity: {},
    notes: {
      tradeAndOtherReceivables: {},
      tradeAndOtherPayables: {},
      revenue: {}
    }
  };

  // Transform filing information
  if (sourceData.filing_information) {
    normalizedData.filingInformation = {
      NameOfCompany: sourceData.filing_information.company_name,
      UniqueEntityNumber: sourceData.filing_information.unique_entity_number,
      CurrentPeriodStartDate: sourceData.filing_information.current_period_start,
      CurrentPeriodEndDate: sourceData.filing_information.current_period_end,
      PriorPeriodStartDate: sourceData.filing_information.prior_period_start,
      TypeOfXBRLFiling: sourceData.filing_information.xbrl_filing_type,
      NatureOfFinancialStatementsCompanyLevelOrConsolidated: sourceData.filing_information.financial_statement_type,
      TypeOfAccountingStandardUsedToPrepareFinancialStatements: sourceData.filing_information.accounting_standard,
      DateOfAuthorisationForIssueOfFinancialStatements: sourceData.filing_information.authorisation_date,
      TypeOfStatementOfFinancialPosition: sourceData.filing_information.financial_position_type,
      WhetherTheFinancialStatementsArePreparedOnGoingConcernBasis: sourceData.filing_information.is_going_concern,
      WhetherThereAreAnyChangesToComparativeAmounts: sourceData.filing_information.has_comparative_changes,
      DescriptionOfPresentationCurrency: sourceData.filing_information.presentation_currency,
      DescriptionOfFunctionalCurrency: sourceData.filing_information.functional_currency,
      LevelOfRoundingUsedInFinancialStatements: sourceData.filing_information.rounding_level,
      DescriptionOfNatureOfEntitysOperationsAndPrincipalActivities: sourceData.filing_information.entity_operations_description,
      PrincipalPlaceOfBusinessIfDifferentFromRegisteredOffice: sourceData.filing_information.principal_place_of_business,
      WhetherCompanyOrGroupIfConsolidatedAccountsArePreparedHasMoreThan50Employees: sourceData.filing_information.has_more_than_50_employees,
      NameOfParentEntity: sourceData.filing_information.parent_entity_name,
      NameOfUltimateParentOfGroup: sourceData.filing_information.ultimate_parent_name,
      TaxonomyVersion: sourceData.filing_information.taxonomy_version,
      NameAndVersionOfSoftwareUsedToGenerateXBRLFile: sourceData.filing_information.xbrl_software,
      HowWasXBRLFilePrepared: sourceData.filing_information.xbrl_preparation_method
    };
  }

  // Transform directors statement
  if (sourceData.directors_statement) {
    normalizedData.directorsStatement = {
      WhetherInDirectorsOpinionFinancialStatementsAreDrawnUpSoAsToExhibitATrueAndFairView: sourceData.directors_statement.directors_opinion_true_fair_view,
      WhetherThereAreReasonableGroundsToBelieveThatCompanyWillBeAbleToPayItsDebtsAsAndWhenTheyFallDueAtDateOfStatement: sourceData.directors_statement.reasonable_grounds_company_debts
    };
  }

  // Transform audit report
  if (sourceData.audit_report) {
    normalizedData.auditReport = {
      TypeOfAuditOpinionInIndependentAuditorsReport: sourceData.audit_report.audit_opinion,
      AuditingStandardsUsedToConductTheAudit: sourceData.audit_report.auditing_standards,
      WhetherThereIsAnyMaterialUncertaintyRelatingToGoingConcern: sourceData.audit_report.material_uncertainty_going_concern,
      WhetherInAuditorsOpinionAccountingAndOtherRecordsRequiredAreProperlyKept: sourceData.audit_report.proper_accounting_records
    };
  }

  // Transform statement of financial position - current assets
  if (sourceData.statement_of_financial_position?.current_assets) {
    normalizedData.statementOfFinancialPosition.currentAssets = {
      CashAndBankBalances: sourceData.statement_of_financial_position.current_assets.cash_and_bank_balances,
      TradeAndOtherReceivablesCurrent: sourceData.statement_of_financial_position.current_assets.trade_and_other_receivables,
      CurrentFinanceLeaseReceivables: sourceData.statement_of_financial_position.current_assets.current_finance_lease_receivables,
      CurrentDerivativeFinancialAssets: sourceData.statement_of_financial_position.current_assets.current_derivative_financial_assets,
      CurrentFinancialAssetsMeasuredAtFairValueThroughProfitOrLoss: sourceData.statement_of_financial_position.current_assets.current_financial_assets_at_fair_value,
      OtherCurrentFinancialAssets: sourceData.statement_of_financial_position.current_assets.other_current_financial_assets,
      DevelopmentProperties: sourceData.statement_of_financial_position.current_assets.development_properties,
      Inventories: sourceData.statement_of_financial_position.current_assets.inventories,
      OtherCurrentNonfinancialAssets: sourceData.statement_of_financial_position.current_assets.other_current_nonfinancial_assets,
      NoncurrentAssetsOrDisposalGroupsClassifiedAsHeldForSaleOrAsHeldForDistributionToOwners: sourceData.statement_of_financial_position.current_assets.held_for_sale_assets,
      CurrentAssets: sourceData.statement_of_financial_position.current_assets.total_current_assets
    };
  }

  // Transform statement of financial position - noncurrent assets
  if (sourceData.statement_of_financial_position?.noncurrent_assets) {
    normalizedData.statementOfFinancialPosition.nonCurrentAssets = {
      TradeAndOtherReceivablesNoncurrent: sourceData.statement_of_financial_position.noncurrent_assets.trade_and_other_receivables,
      NoncurrentFinanceLeaseReceivables: sourceData.statement_of_financial_position.noncurrent_assets.noncurrent_finance_lease_receivables,
      NoncurrentDerivativeFinancialAssets: sourceData.statement_of_financial_position.noncurrent_assets.noncurrent_derivative_financial_assets,
      NoncurrentFinancialAssetsMeasuredAtFairValueThroughProfitOrLoss: sourceData.statement_of_financial_position.noncurrent_assets.noncurrent_financial_assets_at_fair_value,
      OtherNoncurrentFinancialAssets: sourceData.statement_of_financial_position.noncurrent_assets.other_noncurrent_financial_assets,
      PropertyPlantAndEquipment: sourceData.statement_of_financial_position.noncurrent_assets.property_plant_equipment,
      InvestmentProperties: sourceData.statement_of_financial_position.noncurrent_assets.investment_properties,
      Goodwill: sourceData.statement_of_financial_position.noncurrent_assets.goodwill,
      IntangibleAssetsOtherThanGoodwill: sourceData.statement_of_financial_position.noncurrent_assets.intangible_assets,
      InvestmentsInSubsidiariesAssociatesOrJointVentures: sourceData.statement_of_financial_position.noncurrent_assets.investments_in_entities,
      DeferredTaxAssets: sourceData.statement_of_financial_position.noncurrent_assets.deferred_tax_assets,
      OtherNoncurrentNonfinancialAssets: sourceData.statement_of_financial_position.noncurrent_assets.other_noncurrent_nonfinancial_assets,
      NoncurrentAssets: sourceData.statement_of_financial_position.noncurrent_assets.total_noncurrent_assets
    };
  }

  // Transform statement of financial position - current liabilities
  if (sourceData.statement_of_financial_position?.current_liabilities) {
    normalizedData.statementOfFinancialPosition.currentLiabilities = {
      TradeAndOtherPayablesCurrent: sourceData.statement_of_financial_position.current_liabilities.trade_and_other_payables,
      CurrentLoansAndBorrowings: sourceData.statement_of_financial_position.current_liabilities.current_loans_and_borrowings,
      CurrentFinancialLiabilitiesMeasuredAtFairValueThroughProfitOrLoss: sourceData.statement_of_financial_position.current_liabilities.current_financial_liabilities_at_fair_value,
      CurrentFinanceLeaseLiabilities: sourceData.statement_of_financial_position.current_liabilities.current_finance_lease_liabilities,
      OtherCurrentFinancialLiabilities: sourceData.statement_of_financial_position.current_liabilities.other_current_financial_liabilities,
      CurrentIncomeTaxLiabilities: sourceData.statement_of_financial_position.current_liabilities.current_income_tax_liabilities,
      CurrentProvisions: sourceData.statement_of_financial_position.current_liabilities.current_provisions,
      OtherCurrentNonfinancialLiabilities: sourceData.statement_of_financial_position.current_liabilities.other_current_nonfinancial_liabilities,
      LiabilitiesClassifiedAsHeldForSale: sourceData.statement_of_financial_position.current_liabilities.liabilities_held_for_sale,
      CurrentLiabilities: sourceData.statement_of_financial_position.current_liabilities.total_current_liabilities
    };
  }

  // Transform statement of financial position - noncurrent liabilities
  if (sourceData.statement_of_financial_position?.noncurrent_liabilities) {
    normalizedData.statementOfFinancialPosition.nonCurrentLiabilities = {
      TradeAndOtherPayablesNoncurrent: sourceData.statement_of_financial_position.noncurrent_liabilities.trade_and_other_payables,
      NoncurrentLoansAndBorrowings: sourceData.statement_of_financial_position.noncurrent_liabilities.noncurrent_loans_and_borrowings,
      NoncurrentFinancialLiabilitiesMeasuredAtFairValueThroughProfitOrLoss: sourceData.statement_of_financial_position.noncurrent_liabilities.noncurrent_financial_liabilities_at_fair_value,
      NoncurrentFinanceLeaseLiabilities: sourceData.statement_of_financial_position.noncurrent_liabilities.noncurrent_finance_lease_liabilities,
      OtherNoncurrentFinancialLiabilities: sourceData.statement_of_financial_position.noncurrent_liabilities.other_noncurrent_financial_liabilities,
      DeferredTaxLiabilities: sourceData.statement_of_financial_position.noncurrent_liabilities.deferred_tax_liabilities,
      NoncurrentProvisions: sourceData.statement_of_financial_position.noncurrent_liabilities.noncurrent_provisions,
      OtherNoncurrentNonfinancialLiabilities: sourceData.statement_of_financial_position.noncurrent_liabilities.other_noncurrent_nonfinancial_liabilities,
      NoncurrentLiabilities: sourceData.statement_of_financial_position.noncurrent_liabilities.total_noncurrent_liabilities
    };
  }

  // Transform statement of financial position - equity
  if (sourceData.statement_of_financial_position?.equity) {
    normalizedData.statementOfFinancialPosition.equity = {
      ShareCapital: sourceData.statement_of_financial_position.equity.share_capital,
      TreasuryShares: sourceData.statement_of_financial_position.equity.treasury_shares,
      AccumulatedProfitsLosses: sourceData.statement_of_financial_position.equity.accumulated_profits_losses,
      ReservesOtherThanAccumulatedProfitsLosses: sourceData.statement_of_financial_position.equity.other_reserves,
      NoncontrollingInterests: sourceData.statement_of_financial_position.equity.noncontrolling_interests,
      Equity: sourceData.statement_of_financial_position.equity.total_equity
    };
  }

  // Set Assets and Liabilities
  if (sourceData.statement_of_financial_position) {
    normalizedData.statementOfFinancialPosition.Assets = sourceData.statement_of_financial_position.total_assets;
    normalizedData.statementOfFinancialPosition.Liabilities = sourceData.statement_of_financial_position.total_liabilities;
  }

  // Transform income statement
  if (sourceData.income_statement) {
    normalizedData.incomeStatement = {
      Revenue: sourceData.income_statement.revenue,
      OtherIncome: sourceData.income_statement.other_income,
      EmployeeBenefitsExpense: sourceData.income_statement.employee_expenses,
      DepreciationExpense: sourceData.income_statement.depreciation_expense,
      AmortisationExpense: sourceData.income_statement.amortisation_expense,
      RepairsAndMaintenanceExpense: sourceData.income_statement.repairs_and_maintenance_expense,
      SalesAndMarketingExpense: sourceData.income_statement.sales_and_marketing_expense,
      OtherExpensesByNature: sourceData.income_statement.other_expenses_by_nature,
      OtherGainsLosses: sourceData.income_statement.other_gains_losses,
      FinanceCosts: sourceData.income_statement.finance_costs,
      ShareOfProfitLossOfAssociatesAndJointVenturesAccountedForUsingEquityMethod: sourceData.income_statement.share_of_profit_loss_of_associates_and_joint_ventures_accounted_for_using_equity_method,
      ProfitLossBeforeTaxation: sourceData.income_statement.profit_loss_before_taxation,
      TaxExpenseBenefitContinuingOperations: sourceData.income_statement.tax_expense_benefit_continuing_operations,
      ProfitLossFromDiscontinuedOperations: sourceData.income_statement.profit_loss_from_discontinued_operations,
      ProfitLoss: sourceData.income_statement.profit_loss,
      ProfitLossAttributableToOwnersOfCompany: sourceData.income_statement.profit_loss_attributable_to_owners_of_company,
      ProfitLossAttributableToNoncontrollingInterests: sourceData.income_statement.profit_loss_attributable_to_noncontrolling_interests
    };
  }

  // Transform statement of cash flows
  if (sourceData.statement_of_cash_flows) {
    // Map what we have in the response
    normalizedData.statementOfCashFlows = {
      NetCashFromOperatingActivities: sourceData.statement_of_cash_flows.cash_flows_from_used_in_operating_activities,
      NetCashFromInvestingActivities: sourceData.statement_of_cash_flows.cash_flows_from_used_in_investing_activities,
      NetCashFromFinancingActivities: sourceData.statement_of_cash_flows.cash_flows_from_used_in_financing_activities
    };
  }

  // Transform statement of changes in equity
  if (sourceData.statement_of_changes_in_equity) {
    normalizedData.statementOfChangesInEquity = {
      ShareCapitalAtBeginning: sourceData.statement_of_changes_in_equity.share_capital_at_beginning,
      TreasurySharesAtBeginning: sourceData.statement_of_changes_in_equity.treasury_shares_at_beginning,
      AccumulatedProfitsLossesAtBeginning: sourceData.statement_of_changes_in_equity.accumulated_profits_losses_at_beginning,
      OtherReservesAtBeginning: sourceData.statement_of_changes_in_equity.other_reserves_at_beginning,
      NoncontrollingInterestsAtBeginning: sourceData.statement_of_changes_in_equity.noncontrolling_interests_at_beginning,
      TotalEquityAtBeginning: sourceData.statement_of_changes_in_equity.total_equity_at_beginning,
      IssueOfShareCapital: sourceData.statement_of_changes_in_equity.issue_of_share_capital,
      PurchaseOfTreasuryShares: sourceData.statement_of_changes_in_equity.purchase_of_treasury_shares,
      ProfitLossForPeriod: sourceData.statement_of_changes_in_equity.profit_loss_for_period,
      OtherComprehensiveIncome: sourceData.statement_of_changes_in_equity.other_comprehensive_income,
      TotalComprehensiveIncome: sourceData.statement_of_changes_in_equity.total_comprehensive_income,
      DividendsDeclared: sourceData.statement_of_changes_in_equity.dividends_declared,
      TransfersToFromReserves: sourceData.statement_of_changes_in_equity.transfers_to_from_reserves,
      ChangesInNoncontrollingInterests: sourceData.statement_of_changes_in_equity.changes_in_noncontrolling_interests,
      ShareCapitalAtEnd: sourceData.statement_of_changes_in_equity.share_capital_at_end,
      TreasurySharesAtEnd: sourceData.statement_of_changes_in_equity.treasury_shares_at_end,
      AccumulatedProfitsLossesAtEnd: sourceData.statement_of_changes_in_equity.accumulated_profits_losses_at_end,
      OtherReservesAtEnd: sourceData.statement_of_changes_in_equity.other_reserves_at_end,
      NoncontrollingInterestsAtEnd: sourceData.statement_of_changes_in_equity.noncontrolling_interests_at_end,
      TotalEquityAtEnd: sourceData.statement_of_changes_in_equity.total_equity_at_end
    };
  }

  // Transform notes
  if (sourceData.notes) {
    // Trade and other receivables
    if (sourceData.notes.trade_and_other_receivables) {
      normalizedData.notes.tradeAndOtherReceivables = {
        TradeAndOtherReceivablesDueFromThirdParties: sourceData.notes.trade_and_other_receivables.receivables_from_third_parties,
        TradeAndOtherReceivablesDueFromRelatedParties: sourceData.notes.trade_and_other_receivables.receivables_from_related_parties,
        UnbilledReceivables: sourceData.notes.trade_and_other_receivables.unbilled_receivables,
        OtherReceivables: sourceData.notes.trade_and_other_receivables.other_receivables,
        TradeAndOtherReceivables: sourceData.notes.trade_and_other_receivables.total_trade_and_other_receivables
      };
    }

    // Trade and other payables
    if (sourceData.notes.trade_and_other_payables) {
      normalizedData.notes.tradeAndOtherPayables = {
        TradeAndOtherPayablesDueToThirdParties: sourceData.notes.trade_and_other_payables.payables_to_third_parties,
        TradeAndOtherPayablesDueToRelatedParties: sourceData.notes.trade_and_other_payables.payables_to_related_parties,
        DeferredIncome: sourceData.notes.trade_and_other_payables.deferred_income,
        OtherPayables: sourceData.notes.trade_and_other_payables.other_payables,
        TradeAndOtherPayables: sourceData.notes.trade_and_other_payables.total_trade_and_other_payables
      };
    }

    // Revenue
    if (sourceData.notes.revenue) {
      normalizedData.notes.revenue = {
        RevenueFromPropertyTransferredAtPointInTime: sourceData.notes.revenue.revenue_from_property_point_in_time,
        RevenueFromGoodsTransferredAtPointInTime: sourceData.notes.revenue.revenue_from_goods_point_in_time,
        RevenueFromServicesTransferredAtPointInTime: sourceData.notes.revenue.revenue_from_services_point_in_time,
        RevenueFromPropertyTransferredOverTime: sourceData.notes.revenue.revenue_from_property_over_time,
        RevenueFromConstructionContractsOverTime: sourceData.notes.revenue.revenue_from_construction_over_time,
        RevenueFromServicesTransferredOverTime: sourceData.notes.revenue.revenue_from_services_over_time,
        OtherRevenue: sourceData.notes.revenue.other_revenue,
        Revenue: sourceData.notes.revenue.total_revenue
      };
    }
  }

  return normalizedData;
}