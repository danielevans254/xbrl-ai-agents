'use client';

import React, { useState, useEffect } from 'react';
import { ACRADataVisualizer } from '@/components/framework-view/framework-visualizer';

const ACRAFrameworkDemo = () => {
  const [sampleData, setSampleData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    // Simulate fetching data
    setIsLoading(true);

    // This would normally be a fetch from an API
    setTimeout(() => {
      try {
        // For demonstration purposes, we're using a hardcoded sample
        const data = {

          "id": "1903cc77-e47e-46f5-9d11-c1653c7d959c",
          "filing_information": {
            "company_name": "Automa8e Technologies Pte. Ltd.",
            "unique_entity_number": "20211234A",
            "current_period_start": "2023-01-01",
            "current_period_end": "2023-12-31",
            "prior_period_start": "2022-01-01",
            "xbrl_filing_type": "Full",
            "financial_statement_type": "Company",
            "accounting_standard": "IFRS",
            "authorisation_date": "2023-11-11",
            "financial_position_type": "Classified",
            "is_going_concern": true,
            "has_comparative_changes": false,
            "presentation_currency": "SGD",
            "functional_currency": "SGD",
            "rounding_level": "Thousands",
            "entity_operations_description": "Automa8e Technologies Pte. Ltd. as an individual entity. Presented in SGD.",
            "principal_place_of_business": "N/A",
            "has_more_than_50_employees": false,
            "parent_entity_name": null,
            "ultimate_parent_name": null,
            "taxonomy_version": "2022.2",
            "xbrl_software": "XBRL.AI",
            "xbrl_preparation_method": "Automated"
          },
          "directors_statement": {
            "directors_opinion_true_fair_view": true,
            "reasonable_grounds_company_debts": true
          },
          "audit_report": {
            "audit_opinion": "Unqualified",
            "auditing_standards": null,
            "material_uncertainty_going_concern": false,
            "proper_accounting_records": true
          },
          "statement_of_financial_position": {
            "current_assets": {
              "cash_and_bank_balances": 151819470.0,
              "trade_and_other_receivables": 168920988.0,
              "current_finance_lease_receivables": 0.0,
              "current_derivative_financial_assets": 0.0,
              "current_financial_assets_at_fair_value": 0.0,
              "other_current_financial_assets": 1711486.0,
              "development_properties": 0.0,
              "inventories": 0.0,
              "other_current_nonfinancial_assets": 0.0,
              "held_for_sale_assets": 0.0,
              "total_current_assets": 10751943.0
            },
            "noncurrent_assets": {
              "trade_and_other_receivables": 0.0,
              "noncurrent_finance_lease_receivables": 0.0,
              "noncurrent_derivative_financial_assets": 0.0,
              "noncurrent_financial_assets_at_fair_value": 0.0,
              "other_noncurrent_financial_assets": 0.0,
              "property_plant_equipment": 19202077.0,
              "investment_properties": 18462236.0,
              "goodwill": 0.0,
              "intangible_assets": 20763169.0,
              "investments_in_entities": 0.0,
              "deferred_tax_assets": 0.0,
              "other_noncurrent_nonfinancial_assets": 0.0,
              "total_noncurrent_assets": 1427482.0
            },
            "current_liabilities": {
              "trade_and_other_payables": 213991532.0,
              "current_loans_and_borrowings": 221866171.0,
              "current_financial_liabilities_at_fair_value": 0.0,
              "current_finance_lease_liabilities": 231861290.0,
              "other_current_financial_liabilities": 0.0,
              "current_income_tax_liabilities": 241497071.0,
              "current_provisions": 25232448.0,
              "other_current_nonfinancial_liabilities": 2620889.0,
              "liabilities_held_for_sale": 0.0,
              "total_current_liabilities": 9469401.0
            },
            "noncurrent_liabilities": {
              "trade_and_other_payables": 0.0,
              "noncurrent_loans_and_borrowings": 223266237.0,
              "noncurrent_financial_liabilities_at_fair_value": 0.0,
              "noncurrent_finance_lease_liabilities": 23408005.0,
              "other_noncurrent_financial_liabilities": 0.0,
              "deferred_tax_liabilities": 0.0,
              "noncurrent_provisions": 0.0,
              "other_noncurrent_nonfinancial_liabilities": 0.0,
              "total_noncurrent_liabilities": 3674242.0
            },
            "equity": {
              "share_capital": 272000.0,
              "treasury_shares": 0.0,
              "accumulated_profits_losses": -959165.0,
              "other_reserves": 0.0,
              "noncontrolling_interests": 0.0,
              "total_equity": -957165.0
            },
            "total_assets": 12179425.0,
            "total_liabilities": 13143642.0
          },
          "income_statement": {
            "revenue": 3249989.0,
            "other_income": 52778718.0,
            "employee_expenses": 4000.0,
            "depreciation_expense": 73584.0,
            "amortisation_expense": 185123.0,
            "repairs_and_maintenance_expense": 0.0,
            "sales_and_marketing_expense": 0.0,
            "other_expenses_by_nature": 28078.0,
            "other_gains_losses": 0.0,
            "finance_costs": 296616.0,
            "share_of_profit_loss_of_associates_and_joint_ventures_accounted_for_using_equity_method": 0.0,
            "profit_loss_before_taxation": 1798276.0,
            "tax_expense_benefit_continuing_operations": -1016255.0,
            "profit_loss_from_discontinued_operations": 0.0,
            "profit_loss": 782022.0,
            "profit_loss_attributable_to_owners_of_company": 782022.0,
            "profit_loss_attributable_to_noncontrolling_interests": 0.0
          },
          "statement_of_cash_flows": {
            "cash_flows_from_used_in_operating_activities": 38799.0,
            "cash_flows_from_used_in_investing_activities": 0.0,
            "cash_flows_from_used_in_financing_activities": 1169141.0
          },
          "statement_of_changes_in_equity": {
            "share_capital_at_beginning": 0.0,
            "treasury_shares_at_beginning": 0.0,
            "accumulated_profits_losses_at_beginning": -1740826.0,
            "other_reserves_at_beginning": 0.0,
            "noncontrolling_interests_at_beginning": 0.0,
            "total_equity_at_beginning": -1740826.0,
            "issue_of_share_capital": 2000.0,
            "purchase_of_treasury_shares": 0.0,
            "profit_loss_for_period": 782022.0,
            "other_comprehensive_income": 0.0,
            "total_comprehensive_income": 782022.0,
            "dividends_declared": 0.0,
            "transfers_to_from_reserves": 0.0,
            "changes_in_noncontrolling_interests": 0.0,
            "share_capital_at_end": 2000.0,
            "treasury_shares_at_end": 0.0,
            "accumulated_profits_losses_at_end": -959165.0,
            "other_reserves_at_end": 0.0,
            "noncontrolling_interests_at_end": 0.0,
            "total_equity_at_end": -957165.0
          },
          "notes": {
            "trade_and_other_receivables": {
              "receivables_from_third_parties": 280181.0,
              "receivables_from_related_parties": 4450724.0,
              "unbilled_receivables": 0.0,
              "other_receivables": 0.0,
              "total_trade_and_other_receivables": 8920988.0
            },
            "trade_and_other_payables": {
              "payables_to_third_parties": 55707.0,
              "payables_to_related_parties": 98000.0,
              "deferred_income": 0.0,
              "other_payables": 3837825.0,
              "total_trade_and_other_payables": 3991532.0
            },
            "revenue": {
              "revenue_from_property_point_in_time": 0.0,
              "revenue_from_goods_point_in_time": 190755.0,
              "revenue_from_services_point_in_time": 4620.0,
              "revenue_from_property_over_time": 0.0,
              "revenue_from_construction_over_time": 0.0,
              "revenue_from_services_over_time": 0.0,
              "other_revenue": 0.0,
              "total_revenue": 249010.0
            }
          }
        };

        setSampleData(data);
        setIsLoading(false);
      } catch (error) {
        console.error('Error processing sample data:', error);
        setError('Failed to load sample data');
        setIsLoading(false);
      }
    }, 1000);
  }, []);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
        <span className="ml-2 text-gray-600 dark:text-gray-400">Loading sample data...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 text-center">
        <div className="text-red-500 mb-4">Error: {error}</div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto p-4">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">ACRA XBRL Framework Demo</h1>
        <p className="text-gray-600 dark:text-gray-400">
          This demo showcases different ways to view and analyze ACRA XBRL financial data using various frameworks
          based on Singapore Financial Reporting Standards.
        </p>
      </div>

      <div className="space-y-6">
        <ACRADataVisualizer
          data={sampleData}
          title="Automa8e Technologies Financial Data"
          initialFramework="sfrs-full"
        />
      </div>
    </div>
  );
};

export default ACRAFrameworkDemo;