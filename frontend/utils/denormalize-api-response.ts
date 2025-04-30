/**
 * Converts a camelCase string to snake_case
 * @param {string} str - The camelCase string to convert
 * @returns {string} The string in snake_case
 */
function camelToSnake(str) {
  return str.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
}

/**
 * Denormalizes the data from the application format (camelCase) back to the API format (snake_case)
 * This is the reverse of the normalizeAcraData function
 * @param {Object} appData - The application data in camelCase format
 * @returns {Object} - The denormalized data in snake_case format ready for the API
 */
export function denormalizeAcraData(appData) {
  if (!appData) {
    console.error('Invalid application data for denormalization:', appData);
    return { mapped_data: {} };
  }

  // Create the base structure for the denormalized data
  const denormalizedData = {
    mapped_data: {
      id: "",
      filing_information: {},
      directors_statement: {},
      audit_report: {},
      statement_of_financial_position: {
        current_assets: {},
        noncurrent_assets: {},
        current_liabilities: {},
        noncurrent_liabilities: {},
        equity: {}
      },
      income_statement: {},
      statement_of_cash_flows: {},
      statement_of_changes_in_equity: {},
      notes: {
        trade_and_other_receivables: {},
        trade_and_other_payables: {},
        revenue: {}
      }
    }
  };

  // Transform filing information
  if (appData.filingInformation) {
    denormalizedData.mapped_data.filing_information = {
      company_name: appData.filingInformation.NameOfCompany,
      unique_entity_number: appData.filingInformation.UniqueEntityNumber,
      current_period_start: appData.filingInformation.CurrentPeriodStartDate,
      current_period_end: appData.filingInformation.CurrentPeriodEndDate,
      prior_period_start: appData.filingInformation.PriorPeriodStartDate,
      xbrl_filing_type: appData.filingInformation.TypeOfXBRLFiling,
      financial_statement_type: appData.filingInformation.NatureOfFinancialStatementsCompanyLevelOrConsolidated,
      accounting_standard: appData.filingInformation.TypeOfAccountingStandardUsedToPrepareFinancialStatements,
      authorisation_date: appData.filingInformation.DateOfAuthorisationForIssueOfFinancialStatements,
      financial_position_type: appData.filingInformation.TypeOfStatementOfFinancialPosition,
      is_going_concern: appData.filingInformation.WhetherTheFinancialStatementsArePreparedOnGoingConcernBasis,
      has_comparative_changes: appData.filingInformation.WhetherThereAreAnyChangesToComparativeAmounts,
      presentation_currency: appData.filingInformation.DescriptionOfPresentationCurrency,
      functional_currency: appData.filingInformation.DescriptionOfFunctionalCurrency,
      rounding_level: appData.filingInformation.LevelOfRoundingUsedInFinancialStatements,
      entity_operations_description: appData.filingInformation.DescriptionOfNatureOfEntitysOperationsAndPrincipalActivities,
      principal_place_of_business: appData.filingInformation.PrincipalPlaceOfBusinessIfDifferentFromRegisteredOffice,
      has_more_than_50_employees: appData.filingInformation.WhetherCompanyOrGroupIfConsolidatedAccountsArePreparedHasMoreThan50Employees,
      parent_entity_name: appData.filingInformation.NameOfParentEntity === "N/A" ? null : appData.filingInformation.NameOfParentEntity,
      ultimate_parent_name: appData.filingInformation.NameOfUltimateParentOfGroup === "N/A" ? null : appData.filingInformation.NameOfUltimateParentOfGroup,
      taxonomy_version: appData.filingInformation.TaxonomyVersion,
      xbrl_software: appData.filingInformation.NameAndVersionOfSoftwareUsedToGenerateXBRLFile,
      xbrl_preparation_method: appData.filingInformation.HowWasXBRLFilePrepared
    };
  }

  // Transform directors statement
  if (appData.directorsStatement) {
    denormalizedData.mapped_data.directors_statement = {
      directors_opinion_true_fair_view: appData.directorsStatement.WhetherInDirectorsOpinionFinancialStatementsAreDrawnUpSoAsToExhibitATrueAndFairView,
      reasonable_grounds_company_debts: appData.directorsStatement.WhetherThereAreReasonableGroundsToBelieveThatCompanyWillBeAbleToPayItsDebtsAsAndWhenTheyFallDueAtDateOfStatement
    };
  }

  // Transform audit report
  if (appData.auditReport) {
    denormalizedData.mapped_data.audit_report = {
      audit_opinion: appData.auditReport.TypeOfAuditOpinionInIndependentAuditorsReport,
      auditing_standards: appData.auditReport.AuditingStandardsUsedToConductTheAudit === "N/A" ? null : appData.auditReport.AuditingStandardsUsedToConductTheAudit,
      material_uncertainty_going_concern: appData.auditReport.WhetherThereIsAnyMaterialUncertaintyRelatingToGoingConcern === false ? null : appData.auditReport.WhetherThereIsAnyMaterialUncertaintyRelatingToGoingConcern,
      proper_accounting_records: appData.auditReport.WhetherInAuditorsOpinionAccountingAndOtherRecordsRequiredAreProperlyKept === false ? null : appData.auditReport.WhetherInAuditorsOpinionAccountingAndOtherRecordsRequiredAreProperlyKept
    };
  }

  // Transform statement of financial position - current assets
  if (appData.statementOfFinancialPosition?.currentAssets) {
    denormalizedData.mapped_data.statement_of_financial_position.current_assets = {
      cash_and_bank_balances: appData.statementOfFinancialPosition.currentAssets.CashAndBankBalances,
      trade_and_other_receivables: appData.statementOfFinancialPosition.currentAssets.TradeAndOtherReceivablesCurrent,
      current_finance_lease_receivables: appData.statementOfFinancialPosition.currentAssets.CurrentFinanceLeaseReceivables,
      current_derivative_financial_assets: appData.statementOfFinancialPosition.currentAssets.CurrentDerivativeFinancialAssets,
      current_financial_assets_at_fair_value: appData.statementOfFinancialPosition.currentAssets.CurrentFinancialAssetsMeasuredAtFairValueThroughProfitOrLoss,
      other_current_financial_assets: appData.statementOfFinancialPosition.currentAssets.OtherCurrentFinancialAssets,
      development_properties: appData.statementOfFinancialPosition.currentAssets.DevelopmentProperties,
      inventories: appData.statementOfFinancialPosition.currentAssets.Inventories,
      other_current_nonfinancial_assets: appData.statementOfFinancialPosition.currentAssets.OtherCurrentNonfinancialAssets,
      held_for_sale_assets: appData.statementOfFinancialPosition.currentAssets.NoncurrentAssetsOrDisposalGroupsClassifiedAsHeldForSaleOrAsHeldForDistributionToOwners,
      total_current_assets: appData.statementOfFinancialPosition.currentAssets.CurrentAssets
    };
  }

  // Transform statement of financial position - noncurrent assets
  if (appData.statementOfFinancialPosition?.nonCurrentAssets) {
    denormalizedData.mapped_data.statement_of_financial_position.noncurrent_assets = {
      trade_and_other_receivables: appData.statementOfFinancialPosition.nonCurrentAssets.TradeAndOtherReceivablesNoncurrent,
      noncurrent_finance_lease_receivables: appData.statementOfFinancialPosition.nonCurrentAssets.NoncurrentFinanceLeaseReceivables,
      noncurrent_derivative_financial_assets: appData.statementOfFinancialPosition.nonCurrentAssets.NoncurrentDerivativeFinancialAssets,
      noncurrent_financial_assets_at_fair_value: appData.statementOfFinancialPosition.nonCurrentAssets.NoncurrentFinancialAssetsMeasuredAtFairValueThroughProfitOrLoss,
      other_noncurrent_financial_assets: appData.statementOfFinancialPosition.nonCurrentAssets.OtherNoncurrentFinancialAssets,
      property_plant_equipment: appData.statementOfFinancialPosition.nonCurrentAssets.PropertyPlantAndEquipment,
      investment_properties: appData.statementOfFinancialPosition.nonCurrentAssets.InvestmentProperties,
      goodwill: appData.statementOfFinancialPosition.nonCurrentAssets.Goodwill,
      intangible_assets: appData.statementOfFinancialPosition.nonCurrentAssets.IntangibleAssetsOtherThanGoodwill,
      investments_in_entities: appData.statementOfFinancialPosition.nonCurrentAssets.InvestmentsInSubsidiariesAssociatesOrJointVentures,
      deferred_tax_assets: appData.statementOfFinancialPosition.nonCurrentAssets.DeferredTaxAssets,
      other_noncurrent_nonfinancial_assets: appData.statementOfFinancialPosition.nonCurrentAssets.OtherNoncurrentNonfinancialAssets,
      total_noncurrent_assets: appData.statementOfFinancialPosition.nonCurrentAssets.NoncurrentAssets
    };
  }

  // Transform statement of financial position - current liabilities
  if (appData.statementOfFinancialPosition?.currentLiabilities) {
    denormalizedData.mapped_data.statement_of_financial_position.current_liabilities = {
      trade_and_other_payables: appData.statementOfFinancialPosition.currentLiabilities.TradeAndOtherPayablesCurrent,
      current_loans_and_borrowings: appData.statementOfFinancialPosition.currentLiabilities.CurrentLoansAndBorrowings,
      current_financial_liabilities_at_fair_value: appData.statementOfFinancialPosition.currentLiabilities.CurrentFinancialLiabilitiesMeasuredAtFairValueThroughProfitOrLoss,
      current_finance_lease_liabilities: appData.statementOfFinancialPosition.currentLiabilities.CurrentFinanceLeaseLiabilities,
      other_current_financial_liabilities: appData.statementOfFinancialPosition.currentLiabilities.OtherCurrentFinancialLiabilities,
      current_income_tax_liabilities: appData.statementOfFinancialPosition.currentLiabilities.CurrentIncomeTaxLiabilities,
      current_provisions: appData.statementOfFinancialPosition.currentLiabilities.CurrentProvisions,
      other_current_nonfinancial_liabilities: appData.statementOfFinancialPosition.currentLiabilities.OtherCurrentNonfinancialLiabilities,
      liabilities_held_for_sale: appData.statementOfFinancialPosition.currentLiabilities.LiabilitiesClassifiedAsHeldForSale,
      total_current_liabilities: appData.statementOfFinancialPosition.currentLiabilities.CurrentLiabilities
    };
  }

  // Transform statement of financial position - noncurrent liabilities
  if (appData.statementOfFinancialPosition?.nonCurrentLiabilities) {
    denormalizedData.mapped_data.statement_of_financial_position.noncurrent_liabilities = {
      trade_and_other_payables: appData.statementOfFinancialPosition.nonCurrentLiabilities.TradeAndOtherPayablesNoncurrent,
      noncurrent_loans_and_borrowings: appData.statementOfFinancialPosition.nonCurrentLiabilities.NoncurrentLoansAndBorrowings,
      noncurrent_financial_liabilities_at_fair_value: appData.statementOfFinancialPosition.nonCurrentLiabilities.NoncurrentFinancialLiabilitiesMeasuredAtFairValueThroughProfitOrLoss,
      noncurrent_finance_lease_liabilities: appData.statementOfFinancialPosition.nonCurrentLiabilities.NoncurrentFinanceLeaseLiabilities,
      other_noncurrent_financial_liabilities: appData.statementOfFinancialPosition.nonCurrentLiabilities.OtherNoncurrentFinancialLiabilities,
      deferred_tax_liabilities: appData.statementOfFinancialPosition.nonCurrentLiabilities.DeferredTaxLiabilities,
      noncurrent_provisions: appData.statementOfFinancialPosition.nonCurrentLiabilities.NoncurrentProvisions,
      other_noncurrent_nonfinancial_liabilities: appData.statementOfFinancialPosition.nonCurrentLiabilities.OtherNoncurrentNonfinancialLiabilities,
      total_noncurrent_liabilities: appData.statementOfFinancialPosition.nonCurrentLiabilities.NoncurrentLiabilities
    };
  }

  // Transform statement of financial position - equity
  if (appData.statementOfFinancialPosition?.equity) {
    denormalizedData.mapped_data.statement_of_financial_position.equity = {
      share_capital: appData.statementOfFinancialPosition.equity.ShareCapital,
      treasury_shares: appData.statementOfFinancialPosition.equity.TreasuryShares,
      accumulated_profits_losses: appData.statementOfFinancialPosition.equity.AccumulatedProfitsLosses,
      other_reserves: appData.statementOfFinancialPosition.equity.ReservesOtherThanAccumulatedProfitsLosses,
      noncontrolling_interests: appData.statementOfFinancialPosition.equity.NoncontrollingInterests,
      total_equity: appData.statementOfFinancialPosition.equity.Equity
    };
  }

  // Set total assets and liabilities
  if (appData.statementOfFinancialPosition) {
    denormalizedData.mapped_data.statement_of_financial_position.total_assets = appData.statementOfFinancialPosition.Assets;
    denormalizedData.mapped_data.statement_of_financial_position.total_liabilities = appData.statementOfFinancialPosition.Liabilities;
  }

  // Transform income statement
  if (appData.incomeStatement) {
    denormalizedData.mapped_data.income_statement = {
      revenue: appData.incomeStatement.Revenue,
      other_income: appData.incomeStatement.OtherIncome,
      employee_expenses: appData.incomeStatement.EmployeeBenefitsExpense,
      depreciation_expense: appData.incomeStatement.DepreciationExpense,
      amortisation_expense: appData.incomeStatement.AmortisationExpense,
      repairs_and_maintenance_expense: appData.incomeStatement.RepairsAndMaintenanceExpense,
      sales_and_marketing_expense: appData.incomeStatement.SalesAndMarketingExpense,
      other_expenses_by_nature: appData.incomeStatement.OtherExpensesByNature,
      other_gains_losses: appData.incomeStatement.OtherGainsLosses,
      finance_costs: appData.incomeStatement.FinanceCosts,
      share_of_profit_loss_of_associates_and_joint_ventures_accounted_for_using_equity_method: appData.incomeStatement.ShareOfProfitLossOfAssociatesAndJointVenturesAccountedForUsingEquityMethod,
      profit_loss_before_taxation: appData.incomeStatement.ProfitLossBeforeTaxation,
      tax_expense_benefit_continuing_operations: appData.incomeStatement.TaxExpenseBenefitContinuingOperations,
      profit_loss_from_discontinued_operations: appData.incomeStatement.ProfitLossFromDiscontinuedOperations,
      profit_loss: appData.incomeStatement.ProfitLoss,
      profit_loss_attributable_to_owners_of_company: appData.incomeStatement.ProfitLossAttributableToOwnersOfCompany,
      profit_loss_attributable_to_noncontrolling_interests: appData.incomeStatement.ProfitLossAttributableToNoncontrollingInterests
    };
  }

  // Transform statement of cash flows
  if (appData.statementOfCashFlows) {
    denormalizedData.mapped_data.statement_of_cash_flows = {
      cash_flows_from_used_in_operating_activities: appData.statementOfCashFlows.NetCashFromOperatingActivities,
      cash_flows_from_used_in_investing_activities: appData.statementOfCashFlows.NetCashFromInvestingActivities,
      cash_flows_from_used_in_financing_activities: appData.statementOfCashFlows.NetCashFromFinancingActivities
    };
  }

  // Transform statement of changes in equity
  if (appData.statementOfChangesInEquity) {
    denormalizedData.mapped_data.statement_of_changes_in_equity = {
      share_capital_at_beginning: appData.statementOfChangesInEquity.ShareCapitalAtBeginning,
      treasury_shares_at_beginning: appData.statementOfChangesInEquity.TreasurySharesAtBeginning,
      accumulated_profits_losses_at_beginning: appData.statementOfChangesInEquity.AccumulatedProfitsLossesAtBeginning,
      other_reserves_at_beginning: appData.statementOfChangesInEquity.OtherReservesAtBeginning,
      noncontrolling_interests_at_beginning: appData.statementOfChangesInEquity.NoncontrollingInterestsAtBeginning,
      total_equity_at_beginning: appData.statementOfChangesInEquity.TotalEquityAtBeginning,
      issue_of_share_capital: appData.statementOfChangesInEquity.IssueOfShareCapital,
      purchase_of_treasury_shares: appData.statementOfChangesInEquity.PurchaseOfTreasuryShares,
      profit_loss_for_period: appData.statementOfChangesInEquity.ProfitLossForPeriod,
      other_comprehensive_income: appData.statementOfChangesInEquity.OtherComprehensiveIncome,
      total_comprehensive_income: appData.statementOfChangesInEquity.TotalComprehensiveIncome,
      dividends_declared: appData.statementOfChangesInEquity.DividendsDeclared,
      transfers_to_from_reserves: appData.statementOfChangesInEquity.TransfersToFromReserves,
      changes_in_noncontrolling_interests: appData.statementOfChangesInEquity.ChangesInNoncontrollingInterests,
      share_capital_at_end: appData.statementOfChangesInEquity.ShareCapitalAtEnd,
      treasury_shares_at_end: appData.statementOfChangesInEquity.TreasurySharesAtEnd,
      accumulated_profits_losses_at_end: appData.statementOfChangesInEquity.AccumulatedProfitsLossesAtEnd,
      other_reserves_at_end: appData.statementOfChangesInEquity.OtherReservesAtEnd,
      noncontrolling_interests_at_end: appData.statementOfChangesInEquity.NoncontrollingInterestsAtEnd,
      total_equity_at_end: appData.statementOfChangesInEquity.TotalEquityAtEnd
    };
  }

  // Transform notes
  if (appData.notes) {
    // Trade and other receivables
    if (appData.notes.tradeAndOtherReceivables) {
      denormalizedData.mapped_data.notes.trade_and_other_receivables = {
        receivables_from_third_parties: appData.notes.tradeAndOtherReceivables.TradeAndOtherReceivablesDueFromThirdParties,
        receivables_from_related_parties: appData.notes.tradeAndOtherReceivables.TradeAndOtherReceivablesDueFromRelatedParties,
        unbilled_receivables: appData.notes.tradeAndOtherReceivables.UnbilledReceivables,
        other_receivables: appData.notes.tradeAndOtherReceivables.OtherReceivables,
        total_trade_and_other_receivables: appData.notes.tradeAndOtherReceivables.TradeAndOtherReceivables
      };
    }

    // Trade and other payables
    if (appData.notes.tradeAndOtherPayables) {
      denormalizedData.mapped_data.notes.trade_and_other_payables = {
        payables_to_third_parties: appData.notes.tradeAndOtherPayables.TradeAndOtherPayablesDueToThirdParties,
        payables_to_related_parties: appData.notes.tradeAndOtherPayables.TradeAndOtherPayablesDueToRelatedParties,
        deferred_income: appData.notes.tradeAndOtherPayables.DeferredIncome,
        other_payables: appData.notes.tradeAndOtherPayables.OtherPayables,
        total_trade_and_other_payables: appData.notes.tradeAndOtherPayables.TradeAndOtherPayables
      };
    }

    // Revenue
    if (appData.notes.revenue) {
      denormalizedData.mapped_data.notes.revenue = {
        revenue_from_property_point_in_time: appData.notes.revenue.RevenueFromPropertyTransferredAtPointInTime,
        revenue_from_goods_point_in_time: appData.notes.revenue.RevenueFromGoodsTransferredAtPointInTime,
        revenue_from_services_point_in_time: appData.notes.revenue.RevenueFromServicesTransferredAtPointInTime,
        revenue_from_property_over_time: appData.notes.revenue.RevenueFromPropertyTransferredOverTime,
        revenue_from_construction_over_time: appData.notes.revenue.RevenueFromConstructionContractsOverTime,
        revenue_from_services_over_time: appData.notes.revenue.RevenueFromServicesTransferredOverTime,
        other_revenue: appData.notes.revenue.OtherRevenue,
        total_revenue: appData.notes.revenue.Revenue
      };
    }
  }

  return denormalizedData;
}

/**
 * Alternative approach: Generic recursive function to convert object keys from camelCase to snake_case
 * This can be used for simpler cases or if the structure changes frequently
 * 
 * @param {Object} obj - The object with camelCase keys
 * @returns {Object} - The same object with snake_case keys
 */
export function convertToSnakeCase(obj) {
  if (obj === null || typeof obj !== 'object') {
    return obj;
  }

  if (Array.isArray(obj)) {
    return obj.map(item => convertToSnakeCase(item));
  }

  return Object.keys(obj).reduce((acc, key) => {
    const snakeKey = camelToSnake(key);
    acc[snakeKey] = convertToSnakeCase(obj[key]);
    return acc;
  }, {});
}