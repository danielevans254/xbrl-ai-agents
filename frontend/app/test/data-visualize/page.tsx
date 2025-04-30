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
          "xbrl_source": "aa0f5f5e-17bb-49c7-9a28-1ac14f1ed606",
          "created_at": "2025-04-16T08:07:30.809219Z",
          "updated_at": "2025-04-16T08:07:30.809219Z",
          "filing_information": {
            "company_name": {
              "numeric_value": null,
              "string_value": "Automa8e Technologies Pte. Ltd.",
              "boolean_value": null,
              "date_value": null,
              "value": "Automa8e Technologies Pte. Ltd.",
              "tags": [
                {
                  "prefix": "sg-dei",
                  "element_name": "NameOfCompany",
                  "element_id": "sg-dei_NameOfCompany",
                  "abstract": false,
                  "data_type": "xbrli:stringItemType",
                  "balance_type": null,
                  "period_type": "duration",
                  "substitution_group": "xbrli:item",
                  "description": null
                }
              ]
            },
            "unique_entity_number": {
              "numeric_value": null,
              "string_value": "20211234A",
              "boolean_value": null,
              "date_value": null,
              "value": "20211234A",
              "tags": [
                {
                  "prefix": "sg-dei",
                  "element_name": "UniqueEntityNumber",
                  "element_id": "sg-dei_UniqueEntityNumber",
                  "abstract": false,
                  "data_type": "sg-types:UENItemType",
                  "balance_type": null,
                  "period_type": "duration",
                  "substitution_group": "xbrli:item",
                  "description": null
                }
              ]
            },
            "current_period_start": {
              "numeric_value": null,
              "string_value": "2023-01-01",
              "boolean_value": null,
              "date_value": null,
              "value": "2023-01-01",
              "tags": [
                {
                  "prefix": "sg-dei",
                  "element_name": "CurrentPeriodStartDate",
                  "element_id": "sg-dei_CurrentPeriodStartDate",
                  "abstract": false,
                  "data_type": "xbrli:dateItemType",
                  "balance_type": null,
                  "period_type": "instant",
                  "substitution_group": "xbrli:item",
                  "description": null
                }
              ]
            },
            "current_period_end": {
              "numeric_value": null,
              "string_value": "2023-12-31",
              "boolean_value": null,
              "date_value": null,
              "value": "2023-12-31",
              "tags": [
                {
                  "prefix": "sg-dei",
                  "element_name": "CurrentPeriodEndDate",
                  "element_id": "sg-dei_CurrentPeriodEndDate",
                  "abstract": false,
                  "data_type": "xbrli:dateItemType",
                  "balance_type": null,
                  "period_type": "instant",
                  "substitution_group": "xbrli:item",
                  "description": null
                }
              ]
            },
            "prior_period_start": null,
            "xbrl_filing_type": {
              "numeric_value": null,
              "string_value": "Full",
              "boolean_value": null,
              "date_value": null,
              "value": "Full",
              "tags": [
                {
                  "prefix": "sg-dei",
                  "element_name": "TypeOfXBRLFiling",
                  "element_id": "sg-dei_TypeOfXBRLFiling",
                  "abstract": false,
                  "data_type": "sg-types:XBRLFilingItemType",
                  "balance_type": null,
                  "period_type": "duration",
                  "substitution_group": "xbrli:item",
                  "description": null
                }
              ]
            },
            "financial_statement_type": {
              "numeric_value": null,
              "string_value": "Company",
              "boolean_value": null,
              "date_value": null,
              "value": "Company",
              "tags": [
                {
                  "prefix": "sg-dei",
                  "element_name": "NatureOfFinancialStatementsCompanyLevelOrConsolidated",
                  "element_id": "sg-dei_NatureOfFinancialStatementsCompanyLevelOrConsolidated",
                  "abstract": false,
                  "data_type": "sg-types:NatureOfFinancialStatementsItemType",
                  "balance_type": null,
                  "period_type": "duration",
                  "substitution_group": "xbrli:item",
                  "description": null
                }
              ]
            },
            "accounting_standard": {
              "numeric_value": null,
              "string_value": "IFRS",
              "boolean_value": null,
              "date_value": null,
              "value": "IFRS",
              "tags": [
                {
                  "prefix": "sg-dei",
                  "element_name": "TypeOfAccountingStandardUsedToPrepareFinancialStatements",
                  "element_id": "sg-dei_TypeOfAccountingStandardUsedToPrepareFinancialStatements",
                  "abstract": false,
                  "data_type": "sg-types:AccountingStandardsItemType",
                  "balance_type": null,
                  "period_type": "duration",
                  "substitution_group": "xbrli:item",
                  "description": null
                }
              ]
            },
            "authorisation_date": {
              "numeric_value": null,
              "string_value": "2023-11-11",
              "boolean_value": null,
              "date_value": null,
              "value": "2023-11-11",
              "tags": [
                {
                  "prefix": "sg-as",
                  "element_name": "DateOfAuthorisationForIssueOfFinancialStatements",
                  "element_id": "sg-as_DateOfAuthorisationForIssueOfFinancialStatements",
                  "abstract": false,
                  "data_type": "xbrli:dateItemType",
                  "balance_type": null,
                  "period_type": "instant",
                  "substitution_group": "xbrli:item",
                  "description": null
                }
              ]
            },
            "financial_position_type": {
              "numeric_value": null,
              "string_value": "Classified",
              "boolean_value": null,
              "date_value": null,
              "value": "Classified",
              "tags": [
                {
                  "prefix": "sg-dei",
                  "element_name": "TypeOfStatementOfFinancialPosition",
                  "element_id": "sg-dei_TypeOfStatementOfFinancialPosition",
                  "abstract": false,
                  "data_type": "sg-types:StatementOfFinancialPositionItemType",
                  "balance_type": null,
                  "period_type": "duration",
                  "substitution_group": "xbrli:item",
                  "description": null
                }
              ]
            },
            "is_going_concern": {
              "numeric_value": null,
              "string_value": "True",
              "boolean_value": null,
              "date_value": null,
              "value": "True",
              "tags": [
                {
                  "prefix": "sg-dei",
                  "element_name": "WhetherFinancialStatementsArePreparedOnGoingConcernBasis",
                  "element_id": "sg-dei_WhetherFinancialStatementsArePreparedOnGoingConcernBasis",
                  "abstract": false,
                  "data_type": "sg-types:YesNoItemType",
                  "balance_type": null,
                  "period_type": "duration",
                  "substitution_group": "xbrli:item",
                  "description": null
                }
              ]
            },
            "has_comparative_changes": {
              "numeric_value": null,
              "string_value": "False",
              "boolean_value": null,
              "date_value": null,
              "value": "False",
              "tags": [
                {
                  "prefix": "sg-dei",
                  "element_name": "WhetherThereAreChangesToComparativeAmountsDueToRestatementsReclassificationOrOtherReasons",
                  "element_id": "sg-dei_WhetherThereAreChangesToComparativeAmountsDueToRestatementsReclassificationOrOtherReasons",
                  "abstract": false,
                  "data_type": "sg-types:YesNoItemType",
                  "balance_type": null,
                  "period_type": "duration",
                  "substitution_group": "xbrli:item",
                  "description": null
                }
              ]
            },
            "presentation_currency": {
              "numeric_value": null,
              "string_value": "SGD",
              "boolean_value": null,
              "date_value": null,
              "value": "SGD",
              "tags": [
                {
                  "prefix": "sg-dei",
                  "element_name": "DescriptionOfPresentationCurrency",
                  "element_id": "sg-dei_DescriptionOfPresentationCurrency",
                  "abstract": false,
                  "data_type": "sg-types:CurrencyCodeItemType",
                  "balance_type": null,
                  "period_type": "duration",
                  "substitution_group": "xbrli:item",
                  "description": null
                }
              ]
            },
            "functional_currency": {
              "numeric_value": null,
              "string_value": "SGD",
              "boolean_value": null,
              "date_value": null,
              "value": "SGD",
              "tags": [
                {
                  "prefix": "sg-as",
                  "element_name": "DescriptionOfFunctionalCurrency",
                  "element_id": "sg-as_DescriptionOfFunctionalCurrency",
                  "abstract": false,
                  "data_type": "sg-types:CurrencyCodeItemType",
                  "balance_type": null,
                  "period_type": "duration",
                  "substitution_group": "xbrli:item",
                  "description": null
                }
              ]
            },
            "rounding_level": {
              "numeric_value": null,
              "string_value": "Thousands",
              "boolean_value": null,
              "date_value": null,
              "value": "Thousands",
              "tags": [
                {
                  "prefix": "sg-dei",
                  "element_name": "LevelOfRoundingUsedInFinancialStatements",
                  "element_id": "sg-dei_LevelOfRoundingUsedInFinancialStatements",
                  "abstract": false,
                  "data_type": "sg-types:LevelOfRoundingItemType",
                  "balance_type": null,
                  "period_type": "duration",
                  "substitution_group": "xbrli:item",
                  "description": null
                }
              ]
            },
            "entity_operations_description": {
              "numeric_value": null,
              "string_value": "01421 Poultry breeding/hatcheries",
              "boolean_value": null,
              "date_value": null,
              "value": "01421 Poultry breeding/hatcheries",
              "tags": [
                {
                  "prefix": "sg-as",
                  "element_name": "DescriptionOfNatureOfEntitysOperationsAndPrincipalActivities",
                  "element_id": "sg-as_DescriptionOfNatureOfEntitysOperationsAndPrincipalActivities",
                  "abstract": false,
                  "data_type": "xbrli:stringItemType",
                  "balance_type": null,
                  "period_type": "duration",
                  "substitution_group": "xbrli:item",
                  "description": null
                }
              ]
            },
            "principal_place_of_business": {
              "numeric_value": null,
              "string_value": "N/A",
              "boolean_value": null,
              "date_value": null,
              "value": "N/A",
              "tags": [
                {
                  "prefix": "sg-as",
                  "element_name": "PrincipalPlaceOfBusinessIfDifferentFromRegisteredOffice",
                  "element_id": "sg-as_PrincipalPlaceOfBusinessIfDifferentFromRegisteredOffice",
                  "abstract": false,
                  "data_type": "xbrli:stringItemType",
                  "balance_type": null,
                  "period_type": "duration",
                  "substitution_group": "xbrli:item",
                  "description": null
                }
              ]
            },
            "has_more_than_50_employees": {
              "numeric_value": null,
              "string_value": "False",
              "boolean_value": null,
              "date_value": null,
              "value": "False",
              "tags": [
                {
                  "prefix": "sg-dei",
                  "element_name": "WhetherCompanyOrGroupIfConsolidatedAccountsArePreparedHasMoreThan50Employees",
                  "element_id": "sg-dei_WhetherCompanyOrGroupIfConsolidatedAccountsArePreparedHasMoreThan50Employees",
                  "abstract": false,
                  "data_type": "sg-types:YesNoItemType",
                  "balance_type": null,
                  "period_type": "duration",
                  "substitution_group": "xbrli:item",
                  "description": null
                }
              ]
            },
            "parent_entity_name": null,
            "ultimate_parent_name": null,
            "taxonomy_version": {
              "numeric_value": null,
              "string_value": "2022.2",
              "boolean_value": null,
              "date_value": null,
              "value": "2022.2",
              "tags": [
                {
                  "prefix": "sg-dei",
                  "element_name": "TaxonomyVersion",
                  "element_id": "sg-dei_TaxonomyVersion",
                  "abstract": false,
                  "data_type": "sg-types:TaxonomyVersionItemType",
                  "balance_type": null,
                  "period_type": "duration",
                  "substitution_group": "xbrli:item",
                  "description": null
                }
              ]
            },
            "xbrl_software": {
              "numeric_value": null,
              "string_value": "N/A",
              "boolean_value": null,
              "date_value": null,
              "value": "N/A",
              "tags": [
                {
                  "prefix": "sg-dei",
                  "element_name": "NameAndVersionOfSoftwareUsedToGenerateInstanceDocument",
                  "element_id": "sg-dei_NameAndVersionOfSoftwareUsedToGenerateInstanceDocument",
                  "abstract": false,
                  "data_type": "xbrli:stringItemType",
                  "balance_type": null,
                  "period_type": "duration",
                  "substitution_group": "xbrli:item",
                  "description": null
                }
              ]
            },
            "xbrl_preparation_method": {
              "numeric_value": null,
              "string_value": "Automated",
              "boolean_value": null,
              "date_value": null,
              "value": "Automated",
              "tags": [
                {
                  "prefix": "sg-dei",
                  "element_name": "HowWasXBRLInstanceDocumentPrepared",
                  "element_id": "sg-dei_HowWasXBRLInstanceDocumentPrepared",
                  "abstract": false,
                  "data_type": "sg-types:PreparationOfXBRLFileItemType",
                  "balance_type": null,
                  "period_type": "duration",
                  "substitution_group": "xbrli:item",
                  "description": null
                }
              ]
            },
            "document": "9a44c2e7-28be-4dc9-85ec-4b59b5d010bf",
            "mapped_filing": "9800d10c-0547-4b5c-be15-89e5e15acbfe",
            "meta_tags": [
              "e8d67e3e-2d9b-4eb7-93a1-45357f27ebe1"
            ]
          },
          "directors_statement": {
            "directors_opinion_true_fair_view": {
              "numeric_value": null,
              "string_value": "True",
              "boolean_value": null,
              "date_value": null,
              "value": "True",
              "tags": [
                {
                  "prefix": "sg-dei",
                  "element_name": "WhetherInDirectorsOpinionFinancialStatementsAreDrawnUpSoAsToExhibitATrueAndFairView",
                  "element_id": "sg-dei_WhetherInDirectorsOpinionFinancialStatementsAreDrawnUpSoAsToExhibitATrueAndFairView",
                  "abstract": false,
                  "data_type": "sg-types:YesNoItemType",
                  "balance_type": null,
                  "period_type": "duration",
                  "substitution_group": "xbrli:item",
                  "description": null
                }
              ]
            },
            "reasonable_grounds_company_debts": {
              "numeric_value": null,
              "string_value": "True",
              "boolean_value": null,
              "date_value": null,
              "value": "True",
              "tags": [
                {
                  "prefix": "sg-dei",
                  "element_name": "WhetherThereAreReasonableGroundsToBelieveThatCompanyWillBeAbleToPayItsDebtsAsAndWhenTheyFallDueAtDateOfStatement",
                  "element_id": "sg-dei_WhetherThereAreReasonableGroundsToBelieveThatCompanyWillBeAbleToPayItsDebtsAsAndWhenTheyFallDueAtDateOfStatement",
                  "abstract": false,
                  "data_type": "sg-types:YesNoItemType",
                  "balance_type": null,
                  "period_type": "duration",
                  "substitution_group": "xbrli:item",
                  "description": null
                }
              ]
            },
            "document": "9a44c2e7-28be-4dc9-85ec-4b59b5d010bf",
            "mapped_statement": "9800d10c-0547-4b5c-be15-89e5e15acbfe",
            "meta_tags": []
          },
          "audit_report": {
            "audit_opinion": {
              "numeric_value": null,
              "string_value": "Unqualified",
              "boolean_value": null,
              "date_value": null,
              "value": "Unqualified",
              "tags": [
                {
                  "prefix": "sg-ssa",
                  "element_name": "TypeOfAuditOpinionInIndependentAuditorsReport",
                  "element_id": "sg-ssa_TypeOfAuditOpinionInIndependentAuditorsReport",
                  "abstract": false,
                  "data_type": "xbrli:stringItemType",
                  "balance_type": null,
                  "period_type": "duration",
                  "substitution_group": "xbrli:item",
                  "description": null
                }
              ]
            },
            "auditing_standards": null,
            "material_uncertainty_going_concern": null,
            "proper_accounting_records": null,
            "document": "9a44c2e7-28be-4dc9-85ec-4b59b5d010bf",
            "mapped_report": "9800d10c-0547-4b5c-be15-89e5e15acbfe",
            "meta_tags": []
          },
          "financial_position": {
            "current_assets": {
              "cash_and_bank_balances": {
                "numeric_value": "151819470.00",
                "string_value": null,
                "boolean_value": null,
                "date_value": null,
                "value": 151819470,
                "tags": []
              },
              "current_trade_receivables": {
                "numeric_value": "168920988.00",
                "string_value": null,
                "boolean_value": null,
                "date_value": null,
                "value": 168920988,
                "tags": []
              },
              "inventories": {
                "numeric_value": "0.00",
                "string_value": null,
                "boolean_value": null,
                "date_value": null,
                "value": 0,
                "tags": []
              },
              "current_financial_assets": {
                "numeric_value": "0.00",
                "string_value": null,
                "boolean_value": null,
                "date_value": null,
                "value": 0,
                "tags": []
              },
              "current_derivative_financial_assets": {
                "numeric_value": "0.00",
                "string_value": null,
                "boolean_value": null,
                "date_value": null,
                "value": 0,
                "tags": []
              },
              "development_properties": {
                "numeric_value": "0.00",
                "string_value": null,
                "boolean_value": null,
                "date_value": null,
                "value": 0,
                "tags": []
              },
              "current_tax_assets": null,
              "other_current_assets": {
                "numeric_value": "0.00",
                "string_value": null,
                "boolean_value": null,
                "date_value": null,
                "value": 0,
                "tags": []
              },
              "assets_held_for_sale": {
                "numeric_value": "0.00",
                "string_value": null,
                "boolean_value": null,
                "date_value": null,
                "value": 0,
                "tags": []
              },
              "total_current_assets": {
                "numeric_value": "10751943.00",
                "string_value": null,
                "boolean_value": null,
                "date_value": null,
                "value": 10751943,
                "tags": []
              },
              "document": "9a44c2e7-28be-4dc9-85ec-4b59b5d010bf",
              "meta_tags": []
            },
            "noncurrent_assets": {
              "property_plant_equipment": {
                "numeric_value": "202077.00",
                "string_value": null,
                "boolean_value": null,
                "date_value": null,
                "value": 202077,
                "tags": []
              },
              "intangible_assets": {
                "numeric_value": "763169.00",
                "string_value": null,
                "boolean_value": null,
                "date_value": null,
                "value": 763169,
                "tags": []
              },
              "investment_properties": {
                "numeric_value": "18462236.00",
                "string_value": null,
                "boolean_value": null,
                "date_value": null,
                "value": 18462236,
                "tags": []
              },
              "goodwill": {
                "numeric_value": "0.00",
                "string_value": null,
                "boolean_value": null,
                "date_value": null,
                "value": 0,
                "tags": []
              },
              "noncurrent_financial_assets": {
                "numeric_value": "0.00",
                "string_value": null,
                "boolean_value": null,
                "date_value": null,
                "value": 0,
                "tags": []
              },
              "investments_in_associates_joint_ventures": {
                "numeric_value": "0.00",
                "string_value": null,
                "boolean_value": null,
                "date_value": null,
                "value": 0,
                "tags": []
              },
              "noncurrent_tax_assets": {
                "numeric_value": "0.00",
                "string_value": null,
                "boolean_value": null,
                "date_value": null,
                "value": 0,
                "tags": []
              },
              "noncurrent_derivative_financial_assets": {
                "numeric_value": "0.00",
                "string_value": null,
                "boolean_value": null,
                "date_value": null,
                "value": 0,
                "tags": []
              },
              "other_noncurrent_assets": {
                "numeric_value": "0.00",
                "string_value": null,
                "boolean_value": null,
                "date_value": null,
                "value": 0,
                "tags": []
              },
              "total_noncurrent_assets": {
                "numeric_value": "1434534.00",
                "string_value": null,
                "boolean_value": null,
                "date_value": null,
                "value": 1434534,
                "tags": []
              },
              "document": "9a44c2e7-28be-4dc9-85ec-4b59b5d010bf",
              "meta_tags": []
            },
            "current_liabilities": {
              "current_trade_payables": {
                "numeric_value": "13991532.00",
                "string_value": null,
                "boolean_value": null,
                "date_value": null,
                "value": 13991532,
                "tags": []
              },
              "current_tax_liabilities": {
                "numeric_value": "1497071.00",
                "string_value": null,
                "boolean_value": null,
                "date_value": null,
                "value": 1497071,
                "tags": []
              },
              "current_borrowings": {
                "numeric_value": "1866171.00",
                "string_value": null,
                "boolean_value": null,
                "date_value": null,
                "value": 1866171,
                "tags": []
              },
              "current_provisions": {
                "numeric_value": "232448.00",
                "string_value": null,
                "boolean_value": null,
                "date_value": null,
                "value": 232448,
                "tags": []
              },
              "current_lease_liabilities": {
                "numeric_value": "1861290.00",
                "string_value": null,
                "boolean_value": null,
                "date_value": null,
                "value": 1861290,
                "tags": []
              },
              "current_derivative_financial_liabilities": {
                "numeric_value": "0.00",
                "string_value": null,
                "boolean_value": null,
                "date_value": null,
                "value": 0,
                "tags": []
              },
              "other_current_liabilities": {
                "numeric_value": "20889.00",
                "string_value": null,
                "boolean_value": null,
                "date_value": null,
                "value": 20889,
                "tags": []
              },
              "liabilities_held_for_sale": {
                "numeric_value": "0.00",
                "string_value": null,
                "boolean_value": null,
                "date_value": null,
                "value": 0,
                "tags": []
              },
              "total_current_liabilities": {
                "numeric_value": "9469401.00",
                "string_value": null,
                "boolean_value": null,
                "date_value": null,
                "value": 9469401,
                "tags": []
              },
              "document": "9a44c2e7-28be-4dc9-85ec-4b59b5d010bf",
              "meta_tags": []
            },
            "noncurrent_liabilities": {
              "noncurrent_loans": {
                "numeric_value": "3266237.00",
                "string_value": null,
                "boolean_value": null,
                "date_value": null,
                "value": 3266237,
                "tags": []
              },
              "noncurrent_trade_payables": {
                "numeric_value": "0.00",
                "string_value": null,
                "boolean_value": null,
                "date_value": null,
                "value": 0,
                "tags": []
              },
              "deferred_tax_liabilities": {
                "numeric_value": "0.00",
                "string_value": null,
                "boolean_value": null,
                "date_value": null,
                "value": 0,
                "tags": []
              },
              "noncurrent_provisions": {
                "numeric_value": "0.00",
                "string_value": null,
                "boolean_value": null,
                "date_value": null,
                "value": 0,
                "tags": []
              },
              "noncurrent_lease_liabilities": {
                "numeric_value": "408005.00",
                "string_value": null,
                "boolean_value": null,
                "date_value": null,
                "value": 408005,
                "tags": []
              },
              "noncurrent_derivative_financial_liabilities": {
                "numeric_value": "0.00",
                "string_value": null,
                "boolean_value": null,
                "date_value": null,
                "value": 0,
                "tags": []
              },
              "pension_liabilities": {
                "numeric_value": "0.00",
                "string_value": null,
                "boolean_value": null,
                "date_value": null,
                "value": 0,
                "tags": []
              },
              "other_noncurrent_liabilities": {
                "numeric_value": "0.00",
                "string_value": null,
                "boolean_value": null,
                "date_value": null,
                "value": 0,
                "tags": []
              },
              "total_noncurrent_liabilities": {
                "numeric_value": "3674242.00",
                "string_value": null,
                "boolean_value": null,
                "date_value": null,
                "value": 3674242,
                "tags": []
              },
              "document": "9a44c2e7-28be-4dc9-85ec-4b59b5d010bf",
              "meta_tags": []
            },
            "equity": {
              "share_capital": {
                "numeric_value": "2000.00",
                "string_value": null,
                "boolean_value": null,
                "date_value": null,
                "value": 2000,
                "tags": []
              },
              "treasury_shares": {
                "numeric_value": "0.00",
                "string_value": null,
                "boolean_value": null,
                "date_value": null,
                "value": 0,
                "tags": []
              },
              "accumulated_profits_losses": {
                "numeric_value": "-959165.00",
                "string_value": null,
                "boolean_value": null,
                "date_value": null,
                "value": -959165,
                "tags": []
              },
              "other_reserves": {
                "numeric_value": "0.00",
                "string_value": null,
                "boolean_value": null,
                "date_value": null,
                "value": 0,
                "tags": []
              },
              "noncontrolling_interests": {
                "numeric_value": "0.00",
                "string_value": null,
                "boolean_value": null,
                "date_value": null,
                "value": 0,
                "tags": []
              },
              "total_equity": {
                "numeric_value": "-957165.00",
                "string_value": null,
                "boolean_value": null,
                "date_value": null,
                "value": -957165,
                "tags": []
              },
              "document": "9a44c2e7-28be-4dc9-85ec-4b59b5d010bf",
              "meta_tags": []
            },
            "total_assets": {
              "numeric_value": "12186477.00",
              "string_value": null,
              "boolean_value": null,
              "date_value": null,
              "value": 12186477,
              "tags": [
                {
                  "prefix": "sg-as",
                  "element_name": "Assets",
                  "element_id": "sg-as_Assets",
                  "abstract": false,
                  "data_type": "xbrli:monetaryItemType",
                  "balance_type": "debit",
                  "period_type": "instant",
                  "substitution_group": "xbrli:item",
                  "description": null
                }
              ]
            },
            "total_liabilities": {
              "numeric_value": "13143642.00",
              "string_value": null,
              "boolean_value": null,
              "date_value": null,
              "value": 13143642,
              "tags": [
                {
                  "prefix": "sg-as",
                  "element_name": "Liabilities",
                  "element_id": "sg-as_Liabilities",
                  "abstract": false,
                  "data_type": "xbrli:monetaryItemType",
                  "balance_type": "credit",
                  "period_type": "instant",
                  "substitution_group": "xbrli:item",
                  "description": null
                }
              ]
            },
            "document": "9a44c2e7-28be-4dc9-85ec-4b59b5d010bf",
            "mapped_position": "9800d10c-0547-4b5c-be15-89e5e15acbfe",
            "meta_tags": [
              "a33a591a-bbba-4448-9654-a085a11deddd"
            ]
          },
          "income_statement": {
            "revenue": {
              "numeric_value": "3249989.00",
              "string_value": null,
              "boolean_value": null,
              "date_value": null,
              "value": 3249989,
              "tags": [
                {
                  "prefix": "sg-as",
                  "element_name": "Revenue",
                  "element_id": "sg-as_Revenue",
                  "abstract": false,
                  "data_type": "xbrli:monetaryItemType",
                  "balance_type": "credit",
                  "period_type": "duration",
                  "substitution_group": "xbrli:item",
                  "description": null
                }
              ]
            },
            "other_income": {
              "numeric_value": "52778718.00",
              "string_value": null,
              "boolean_value": null,
              "date_value": null,
              "value": 52778718,
              "tags": [
                {
                  "prefix": "sg-as",
                  "element_name": "OtherIncome",
                  "element_id": "sg-as_OtherIncome",
                  "abstract": false,
                  "data_type": "xbrli:monetaryItemType",
                  "balance_type": "credit",
                  "period_type": "duration",
                  "substitution_group": "xbrli:item",
                  "description": null
                }
              ]
            },
            "employee_expenses": {
              "numeric_value": "4000.00",
              "string_value": null,
              "boolean_value": null,
              "date_value": null,
              "value": 4000,
              "tags": [
                {
                  "prefix": "sg-as",
                  "element_name": "EmployeeBenefitsExpense",
                  "element_id": "sg-as_EmployeeBenefitsExpense",
                  "abstract": false,
                  "data_type": "xbrli:monetaryItemType",
                  "balance_type": "debit",
                  "period_type": "duration",
                  "substitution_group": "xbrli:item",
                  "description": null
                }
              ]
            },
            "depreciation_expense": {
              "numeric_value": "73584.00",
              "string_value": null,
              "boolean_value": null,
              "date_value": null,
              "value": 73584,
              "tags": [
                {
                  "prefix": "sg-as",
                  "element_name": "DepreciationExpense",
                  "element_id": "sg-as_DepreciationExpense",
                  "abstract": false,
                  "data_type": "xbrli:monetaryItemType",
                  "balance_type": "debit",
                  "period_type": "duration",
                  "substitution_group": "xbrli:item",
                  "description": null
                }
              ]
            },
            "amortisation_expense": {
              "numeric_value": "185123.00",
              "string_value": null,
              "boolean_value": null,
              "date_value": null,
              "value": 185123,
              "tags": [
                {
                  "prefix": "sg-as",
                  "element_name": "AmortisationExpense",
                  "element_id": "sg-as_AmortisationExpense",
                  "abstract": false,
                  "data_type": "xbrli:monetaryItemType",
                  "balance_type": "debit",
                  "period_type": "duration",
                  "substitution_group": "xbrli:item",
                  "description": null
                }
              ]
            },
            "repairs_and_maintenance_expense": {
              "numeric_value": "0.00",
              "string_value": null,
              "boolean_value": null,
              "date_value": null,
              "value": 0,
              "tags": [
                {
                  "prefix": "sg-as",
                  "element_name": "RepairsAndMaintenanceExpense",
                  "element_id": "sg-as_RepairsAndMaintenanceExpense",
                  "abstract": false,
                  "data_type": "xbrli:monetaryItemType",
                  "balance_type": "debit",
                  "period_type": "duration",
                  "substitution_group": "xbrli:item",
                  "description": null
                }
              ]
            },
            "sales_and_marketing_expense": {
              "numeric_value": "0.00",
              "string_value": null,
              "boolean_value": null,
              "date_value": null,
              "value": 0,
              "tags": [
                {
                  "prefix": "sg-as",
                  "element_name": "SalesAndMarketingExpense",
                  "element_id": "sg-as_SalesAndMarketingExpense",
                  "abstract": false,
                  "data_type": "xbrli:monetaryItemType",
                  "balance_type": "debit",
                  "period_type": "duration",
                  "substitution_group": "xbrli:item",
                  "description": null
                }
              ]
            },
            "other_expenses_by_nature": {
              "numeric_value": "632646.00",
              "string_value": null,
              "boolean_value": null,
              "date_value": null,
              "value": 632646,
              "tags": [
                {
                  "prefix": "sg-as",
                  "element_name": "OtherExpensesByNature",
                  "element_id": "sg-as_OtherExpensesByNature",
                  "abstract": false,
                  "data_type": "xbrli:monetaryItemType",
                  "balance_type": "debit",
                  "period_type": "duration",
                  "substitution_group": "xbrli:item",
                  "description": null
                }
              ]
            },
            "other_gains_losses": {
              "numeric_value": "0.00",
              "string_value": null,
              "boolean_value": null,
              "date_value": null,
              "value": 0,
              "tags": [
                {
                  "prefix": "sg-as",
                  "element_name": "OtherGainsLosses",
                  "element_id": "sg-as_OtherGainsLosses",
                  "abstract": false,
                  "data_type": "xbrli:monetaryItemType",
                  "balance_type": "credit",
                  "period_type": "duration",
                  "substitution_group": "xbrli:item",
                  "description": null
                }
              ]
            },
            "finance_costs": {
              "numeric_value": "296616.00",
              "string_value": null,
              "boolean_value": null,
              "date_value": null,
              "value": 296616,
              "tags": [
                {
                  "prefix": "sg-as",
                  "element_name": "FinanceCosts",
                  "element_id": "sg-as_FinanceCosts",
                  "abstract": false,
                  "data_type": "xbrli:monetaryItemType",
                  "balance_type": "debit",
                  "period_type": "duration",
                  "substitution_group": "xbrli:item",
                  "description": null
                }
              ]
            },
            "share_of_profit_associates": {
              "numeric_value": "0.00",
              "string_value": null,
              "boolean_value": null,
              "date_value": null,
              "value": 0,
              "tags": [
                {
                  "prefix": "sg-as",
                  "element_name": "ShareOfProfitLossOfAssociatesAndJointVenturesAccountedForUsingEquityMethod",
                  "element_id": "sg-as_ShareOfProfitLossOfAssociatesAndJointVenturesAccountedForUsingEquityMethod",
                  "abstract": false,
                  "data_type": "xbrli:monetaryItemType",
                  "balance_type": "credit",
                  "period_type": "duration",
                  "substitution_group": "xbrli:item",
                  "description": null
                }
              ]
            },
            "profit_before_tax": {
              "numeric_value": "1798276.00",
              "string_value": null,
              "boolean_value": null,
              "date_value": null,
              "value": 1798276,
              "tags": [
                {
                  "prefix": "sg-as",
                  "element_name": "ProfitLossBeforeTaxation",
                  "element_id": "sg-as_ProfitLossBeforeTaxation",
                  "abstract": false,
                  "data_type": "xbrli:monetaryItemType",
                  "balance_type": "credit",
                  "period_type": "duration",
                  "substitution_group": "xbrli:item",
                  "description": null
                }
              ]
            },
            "income_tax": {
              "numeric_value": "1016255.00",
              "string_value": null,
              "boolean_value": null,
              "date_value": null,
              "value": 1016255,
              "tags": [
                {
                  "prefix": "sg-as",
                  "element_name": "TaxExpenseBenefitContinuingOperations",
                  "element_id": "sg-as_TaxExpenseBenefitContinuingOperations",
                  "abstract": false,
                  "data_type": "xbrli:monetaryItemType",
                  "balance_type": "debit",
                  "period_type": "duration",
                  "substitution_group": "xbrli:item",
                  "description": null
                }
              ]
            },
            "profit_discontinued_operations": {
              "numeric_value": "0.00",
              "string_value": null,
              "boolean_value": null,
              "date_value": null,
              "value": 0,
              "tags": [
                {
                  "prefix": "sg-as",
                  "element_name": "ProfitLossFromDiscontinuedOperations",
                  "element_id": "sg-as_ProfitLossFromDiscontinuedOperations",
                  "abstract": false,
                  "data_type": "xbrli:monetaryItemType",
                  "balance_type": "credit",
                  "period_type": "duration",
                  "substitution_group": "xbrli:item",
                  "description": null
                }
              ]
            },
            "profit_after_tax": {
              "numeric_value": "782022.00",
              "string_value": null,
              "boolean_value": null,
              "date_value": null,
              "value": 782022,
              "tags": [
                {
                  "prefix": "sg-as",
                  "element_name": "ProfitLoss",
                  "element_id": "sg-as_ProfitLoss",
                  "abstract": false,
                  "data_type": "xbrli:monetaryItemType",
                  "balance_type": "credit",
                  "period_type": "duration",
                  "substitution_group": "xbrli:item",
                  "description": null
                }
              ]
            },
            "profit_attributable_to_owners": {
              "numeric_value": "782022.00",
              "string_value": null,
              "boolean_value": null,
              "date_value": null,
              "value": 782022,
              "tags": [
                {
                  "prefix": "sg-as",
                  "element_name": "ProfitLossAttributableToOwnersOfCompany",
                  "element_id": "sg-as_ProfitLossAttributableToOwnersOfCompany",
                  "abstract": false,
                  "data_type": "xbrli:monetaryItemType",
                  "balance_type": "credit",
                  "period_type": "duration",
                  "substitution_group": "xbrli:item",
                  "description": null
                }
              ]
            },
            "profit_attributable_to_noncontrolling": {
              "numeric_value": "0.00",
              "string_value": null,
              "boolean_value": null,
              "date_value": null,
              "value": 0,
              "tags": [
                {
                  "prefix": "sg-as",
                  "element_name": "ProfitLossAttributableToNoncontrollingInterests",
                  "element_id": "sg-as_ProfitLossAttributableToNoncontrollingInterests",
                  "abstract": false,
                  "data_type": "xbrli:monetaryItemType",
                  "balance_type": "credit",
                  "period_type": "duration",
                  "substitution_group": "xbrli:item",
                  "description": null
                }
              ]
            },
            "document": "9a44c2e7-28be-4dc9-85ec-4b59b5d010bf",
            "mapped_statement": "9800d10c-0547-4b5c-be15-89e5e15acbfe",
            "meta_tags": []
          },
          "cash_flows": {
            "cash_flows_from_used_in_operating_activities": {
              "numeric_value": "38799.00",
              "string_value": null,
              "boolean_value": null,
              "date_value": null,
              "value": 38799,
              "tags": []
            },
            "cash_flows_from_used_in_investing_activities": {
              "numeric_value": "0.00",
              "string_value": null,
              "boolean_value": null,
              "date_value": null,
              "value": 0,
              "tags": []
            },
            "cash_flows_from_used_in_financing_activities": {
              "numeric_value": "1169141.00",
              "string_value": null,
              "boolean_value": null,
              "date_value": null,
              "value": 1169141,
              "tags": []
            },
            "document": "9a44c2e7-28be-4dc9-85ec-4b59b5d010bf",
            "mapped_cash_flows": "9800d10c-0547-4b5c-be15-89e5e15acbfe",
            "meta_tags": []
          },
          "changes_in_equity": {
            "share_capital_at_beginning": {
              "numeric_value": "0.00",
              "string_value": null,
              "boolean_value": null,
              "date_value": null,
              "value": 0,
              "tags": [
                {
                  "prefix": "sg-as",
                  "element_name": "ShareCapital",
                  "element_id": "sg-as_ShareCapital",
                  "abstract": false,
                  "data_type": "xbrli:monetaryItemType",
                  "balance_type": "credit",
                  "period_type": "instant",
                  "substitution_group": "xbrli:item",
                  "description": null
                }
              ]
            },
            "treasury_shares_at_beginning": {
              "numeric_value": "0.00",
              "string_value": null,
              "boolean_value": null,
              "date_value": null,
              "value": 0,
              "tags": [
                {
                  "prefix": "sg-as",
                  "element_name": "TreasuryShares",
                  "element_id": "sg-as_TreasuryShares",
                  "abstract": false,
                  "data_type": "xbrli:monetaryItemType",
                  "balance_type": "debit",
                  "period_type": "instant",
                  "substitution_group": "xbrli:item",
                  "description": null
                }
              ]
            },
            "accumulated_profits_losses_at_beginning": {
              "numeric_value": "-1740826.00",
              "string_value": null,
              "boolean_value": null,
              "date_value": null,
              "value": -1740826,
              "tags": [
                {
                  "prefix": "sg-as",
                  "element_name": "AccumulatedProfitsLosses",
                  "element_id": "sg-as_AccumulatedProfitsLosses",
                  "abstract": false,
                  "data_type": "xbrli:monetaryItemType",
                  "balance_type": "credit",
                  "period_type": "instant",
                  "substitution_group": "xbrli:item",
                  "description": null
                }
              ]
            },
            "other_reserves_at_beginning": {
              "numeric_value": "0.00",
              "string_value": null,
              "boolean_value": null,
              "date_value": null,
              "value": 0,
              "tags": []
            },
            "noncontrolling_interests_at_beginning": {
              "numeric_value": "0.00",
              "string_value": null,
              "boolean_value": null,
              "date_value": null,
              "value": 0,
              "tags": [
                {
                  "prefix": "sg-as",
                  "element_name": "NoncontrollingInterests",
                  "element_id": "sg-as_NoncontrollingInterests",
                  "abstract": false,
                  "data_type": "xbrli:monetaryItemType",
                  "balance_type": "credit",
                  "period_type": "instant",
                  "substitution_group": "xbrli:item",
                  "description": null
                }
              ]
            },
            "total_equity_at_beginning": {
              "numeric_value": "-1740826.00",
              "string_value": null,
              "boolean_value": null,
              "date_value": null,
              "value": -1740826,
              "tags": [
                {
                  "prefix": "sg-as",
                  "element_name": "Equity",
                  "element_id": "sg-as_Equity",
                  "abstract": false,
                  "data_type": "xbrli:monetaryItemType",
                  "balance_type": "credit",
                  "period_type": "instant",
                  "substitution_group": "xbrli:item",
                  "description": null
                }
              ]
            },
            "issue_of_share_capital": {
              "numeric_value": "2000.00",
              "string_value": null,
              "boolean_value": null,
              "date_value": null,
              "value": 2000,
              "tags": [
                {
                  "prefix": "sg-as",
                  "element_name": "ShareCapital",
                  "element_id": "sg-as_ShareCapital",
                  "abstract": false,
                  "data_type": "xbrli:monetaryItemType",
                  "balance_type": "credit",
                  "period_type": "instant",
                  "substitution_group": "xbrli:item",
                  "description": null
                }
              ]
            },
            "purchase_of_treasury_shares": {
              "numeric_value": "0.00",
              "string_value": null,
              "boolean_value": null,
              "date_value": null,
              "value": 0,
              "tags": [
                {
                  "prefix": "sg-as",
                  "element_name": "TreasuryShares",
                  "element_id": "sg-as_TreasuryShares",
                  "abstract": false,
                  "data_type": "xbrli:monetaryItemType",
                  "balance_type": "debit",
                  "period_type": "instant",
                  "substitution_group": "xbrli:item",
                  "description": null
                }
              ]
            },
            "profit_loss_for_period": {
              "numeric_value": "782022.00",
              "string_value": null,
              "boolean_value": null,
              "date_value": null,
              "value": 782022,
              "tags": [
                {
                  "prefix": "sg-as",
                  "element_name": "ProfitLoss",
                  "element_id": "sg-as_ProfitLoss",
                  "abstract": false,
                  "data_type": "xbrli:monetaryItemType",
                  "balance_type": "credit",
                  "period_type": "duration",
                  "substitution_group": "xbrli:item",
                  "description": null
                }
              ]
            },
            "other_comprehensive_income": {
              "numeric_value": "0.00",
              "string_value": null,
              "boolean_value": null,
              "date_value": null,
              "value": 0,
              "tags": []
            },
            "total_comprehensive_income": {
              "numeric_value": "782022.00",
              "string_value": null,
              "boolean_value": null,
              "date_value": null,
              "value": 782022,
              "tags": []
            },
            "dividends_declared": {
              "numeric_value": "0.00",
              "string_value": null,
              "boolean_value": null,
              "date_value": null,
              "value": 0,
              "tags": []
            },
            "transfers_to_from_reserves": {
              "numeric_value": "0.00",
              "string_value": null,
              "boolean_value": null,
              "date_value": null,
              "value": 0,
              "tags": []
            },
            "changes_in_noncontrolling_interests": {
              "numeric_value": "0.00",
              "string_value": null,
              "boolean_value": null,
              "date_value": null,
              "value": 0,
              "tags": [
                {
                  "prefix": "sg-as",
                  "element_name": "NoncontrollingInterests",
                  "element_id": "sg-as_NoncontrollingInterests",
                  "abstract": false,
                  "data_type": "xbrli:monetaryItemType",
                  "balance_type": "credit",
                  "period_type": "instant",
                  "substitution_group": "xbrli:item",
                  "description": null
                }
              ]
            },
            "share_capital_at_end": {
              "numeric_value": "2000.00",
              "string_value": null,
              "boolean_value": null,
              "date_value": null,
              "value": 2000,
              "tags": [
                {
                  "prefix": "sg-as",
                  "element_name": "ShareCapital",
                  "element_id": "sg-as_ShareCapital",
                  "abstract": false,
                  "data_type": "xbrli:monetaryItemType",
                  "balance_type": "credit",
                  "period_type": "instant",
                  "substitution_group": "xbrli:item",
                  "description": null
                }
              ]
            },
            "treasury_shares_at_end": {
              "numeric_value": "0.00",
              "string_value": null,
              "boolean_value": null,
              "date_value": null,
              "value": 0,
              "tags": [
                {
                  "prefix": "sg-as",
                  "element_name": "TreasuryShares",
                  "element_id": "sg-as_TreasuryShares",
                  "abstract": false,
                  "data_type": "xbrli:monetaryItemType",
                  "balance_type": "debit",
                  "period_type": "instant",
                  "substitution_group": "xbrli:item",
                  "description": null
                }
              ]
            },
            "accumulated_profits_losses_at_end": {
              "numeric_value": "-959165.00",
              "string_value": null,
              "boolean_value": null,
              "date_value": null,
              "value": -959165,
              "tags": [
                {
                  "prefix": "sg-as",
                  "element_name": "AccumulatedProfitsLosses",
                  "element_id": "sg-as_AccumulatedProfitsLosses",
                  "abstract": false,
                  "data_type": "xbrli:monetaryItemType",
                  "balance_type": "credit",
                  "period_type": "instant",
                  "substitution_group": "xbrli:item",
                  "description": null
                }
              ]
            },
            "other_reserves_at_end": {
              "numeric_value": "0.00",
              "string_value": null,
              "boolean_value": null,
              "date_value": null,
              "value": 0,
              "tags": []
            },
            "noncontrolling_interests_at_end": {
              "numeric_value": "0.00",
              "string_value": null,
              "boolean_value": null,
              "date_value": null,
              "value": 0,
              "tags": [
                {
                  "prefix": "sg-as",
                  "element_name": "NoncontrollingInterests",
                  "element_id": "sg-as_NoncontrollingInterests",
                  "abstract": false,
                  "data_type": "xbrli:monetaryItemType",
                  "balance_type": "credit",
                  "period_type": "instant",
                  "substitution_group": "xbrli:item",
                  "description": null
                }
              ]
            },
            "total_equity_at_end": {
              "numeric_value": "-957165.00",
              "string_value": null,
              "boolean_value": null,
              "date_value": null,
              "value": -957165,
              "tags": [
                {
                  "prefix": "sg-as",
                  "element_name": "Equity",
                  "element_id": "sg-as_Equity",
                  "abstract": false,
                  "data_type": "xbrli:monetaryItemType",
                  "balance_type": "credit",
                  "period_type": "instant",
                  "substitution_group": "xbrli:item",
                  "description": null
                }
              ]
            },
            "document": "9a44c2e7-28be-4dc9-85ec-4b59b5d010bf",
            "mapped_equity_changes": "9800d10c-0547-4b5c-be15-89e5e15acbfe",
            "meta_tags": []
          },
          "trade_receivables": null,
          "trade_payables": null,
          "revenue": {
            "revenue_from_property_point_in_time": null,
            "revenue_from_goods_point_in_time": null,
            "revenue_from_services_point_in_time": null,
            "revenue_from_property_over_time": null,
            "revenue_from_construction_over_time": null,
            "revenue_from_services_over_time": null,
            "other_revenue": null,
            "total_revenue": {
              "numeric_value": "3249989.00",
              "string_value": null,
              "boolean_value": null,
              "date_value": null,
              "value": 3249989,
              "tags": []
            },
            "document": "9a44c2e7-28be-4dc9-85ec-4b59b5d010bf",
            "mapped_revenue": "9800d10c-0547-4b5c-be15-89e5e15acbfe",
            "meta_tags": []
          },
          "notes": {
            "document": "9a44c2e7-28be-4dc9-85ec-4b59b5d010bf",
            "mapped_notes": "9800d10c-0547-4b5c-be15-89e5e15acbfe"
          },
          "id": "9a44c2e7-28be-4dc9-85ec-4b59b5d010bf",
          "_frameworkMetadata": {
            "name": "Error Processing Framework",
            "description": "An error occurred while processing the sfrs-full framework. Showing original data.",
            "error": "Cannot read properties of undefined (reading 'currentAssets')"
          }
        }

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