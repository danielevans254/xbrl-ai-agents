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
          "filingInformation": {
            "NameOfCompany": "Automa8e Technologies Pte. Ltd.",
            "UniqueEntityNumber": "20211234A",
            "CurrentPeriodStartDate": "2023-01-01",
            "CurrentPeriodEndDate": "2023-12-31",
            "PriorPeriodStartDate": null,
            "TypeOfXBRLFiling": "Full",
            "NatureOfFinancialStatementsCompanyLevelOrConsolidated": "Company",
            "TypeOfAccountingStandardUsedToPrepareFinancialStatements": "IFRS",
            "DateOfAuthorisationForIssueOfFinancialStatements": "2023-11-11",
            "TypeOfStatementOfFinancialPosition": "Classified",
            "WhetherTheFinancialStatementsArePreparedOnGoingConcernBasis": true,
            "WhetherThereAreAnyChangesToComparativeAmounts": false,
            "DescriptionOfPresentationCurrency": "SGD",
            "DescriptionOfFunctionalCurrency": "SGD",
            "LevelOfRoundingUsedInFinancialStatements": "Thousands",
            "DescriptionOfNatureOfEntitysOperationsAndPrincipalActivities": "Poultry breeding/hatcheries",
            "PrincipalPlaceOfBusinessIfDifferentFromRegisteredOffice": "Test",
            "WhetherCompanyOrGroupIfConsolidatedAccountsArePreparedHasMoreThan50Employees": false,
            "NameOfParentEntity": null,
            "NameOfUltimateParentOfGroup": null,
            "TaxonomyVersion": "2022.2",
            "NameAndVersionOfSoftwareUsedToGenerateXBRLFile": "XBRL.AI",
            "HowWasXBRLFilePrepared": "Automated"
          },
          "directorsStatement": {
            "WhetherInDirectorsOpinionFinancialStatementsAreDrawnUpSoAsToExhibitATrueAndFairView": true,
            "WhetherThereAreReasonableGroundsToBelieveThatCompanyWillBeAbleToPayItsDebtsAsAndWhenTheyFallDueAtDateOfStatement": true
          },
          "auditReport": {
            "TypeOfAuditOpinionInIndependentAuditorsReport": "Unqualified",
            "AuditingStandardsUsedToConductTheAudit": null,
            "WhetherThereIsAnyMaterialUncertaintyRelatingToGoingConcern": null,
            "WhetherInAuditorsOpinionAccountingAndOtherRecordsRequiredAreProperlyKept": null
          },
          "statementOfFinancialPosition": {
            "currentAssets": {
              "CashAndBankBalances": 151819470,
              "TradeAndOtherReceivablesCurrent": 168920988,
              "CurrentFinanceLeaseReceivables": 0,
              "CurrentDerivativeFinancialAssets": 0,
              "CurrentFinancialAssetsMeasuredAtFairValueThroughProfitOrLoss": 0,
              "OtherCurrentFinancialAssets": 1711486,
              "DevelopmentProperties": 0,
              "Inventories": 0,
              "OtherCurrentNonfinancialAssets": 0,
              "NoncurrentAssetsOrDisposalGroupsClassifiedAsHeldForSaleOrAsHeldForDistributionToOwners": 0,
              "CurrentAssets": 10751943
            },
            "nonCurrentAssets": {
              "TradeAndOtherReceivablesNoncurrent": 0,
              "NoncurrentFinanceLeaseReceivables": 0,
              "NoncurrentDerivativeFinancialAssets": 0,
              "NoncurrentFinancialAssetsMeasuredAtFairValueThroughProfitOrLoss": 0,
              "OtherNoncurrentFinancialAssets": 0,
              "PropertyPlantAndEquipment": 19202077,
              "InvestmentProperties": 18462236,
              "Goodwill": 0,
              "IntangibleAssetsOtherThanGoodwill": 20763169,
              "InvestmentsInSubsidiariesAssociatesOrJointVentures": 0,
              "DeferredTaxAssets": 0,
              "OtherNoncurrentNonfinancialAssets": 0,
              "NoncurrentAssets": 1427482
            },
            "currentLiabilities": {
              "TradeAndOtherPayablesCurrent": 13991532,
              "CurrentLoansAndBorrowings": 21866171,
              "CurrentFinancialLiabilitiesMeasuredAtFairValueThroughProfitOrLoss": 0,
              "CurrentFinanceLeaseLiabilities": 31861290,
              "OtherCurrentFinancialLiabilities": 0,
              "CurrentIncomeTaxLiabilities": 1497071,
              "CurrentProvisions": 232448,
              "OtherCurrentNonfinancialLiabilities": 20889,
              "LiabilitiesClassifiedAsHeldForSale": 0,
              "CurrentLiabilities": 9469401
            },
            "nonCurrentLiabilities": {
              "TradeAndOtherPayablesNoncurrent": 0,
              "NoncurrentLoansAndBorrowings": 3266237,
              "NoncurrentFinancialLiabilitiesMeasuredAtFairValueThroughProfitOrLoss": 0,
              "NoncurrentFinanceLeaseLiabilities": 408005,
              "OtherNoncurrentFinancialLiabilities": 0,
              "DeferredTaxLiabilities": 0,
              "NoncurrentProvisions": 0,
              "OtherNoncurrentNonfinancialLiabilities": 0,
              "NoncurrentLiabilities": 3674242
            },
            "equity": {
              "ShareCapital": 2000,
              "TreasuryShares": 0,
              "AccumulatedProfitsLosses": -959165,
              "ReservesOtherThanAccumulatedProfitsLosses": 0,
              "NoncontrollingInterests": 0,
              "Equity": -957165
            },
            "Assets": 12179425,
            "Liabilities": 13143642
          },
          "incomeStatement": {
            "Revenue": 3249989,
            "OtherIncome": 52778718,
            "EmployeeBenefitsExpense": 4000,
            "DepreciationExpense": 73584,
            "AmortisationExpense": 185123,
            "RepairsAndMaintenanceExpense": 0,
            "SalesAndMarketingExpense": 0,
            "OtherExpensesByNature": 632646,
            "OtherGainsLosses": 0,
            "FinanceCosts": 296616,
            "ShareOfProfitLossOfAssociatesAndJointVenturesAccountedForUsingEquityMethod": 0,
            "ProfitLossBeforeTaxation": 1798276,
            "TaxExpenseBenefitContinuingOperations": -1016255,
            "ProfitLossFromDiscontinuedOperations": 0,
            "ProfitLoss": 782022,
            "ProfitLossAttributableToOwnersOfCompany": 782022,
            "ProfitLossAttributableToNoncontrollingInterests": 0
          },
          "statementOfCashFlows": {
            "NetCashFromOperatingActivities": 38799,
            "NetCashFromInvestingActivities": 0,
            "NetCashFromFinancingActivities": 1169141
          },
          "statementOfChangesInEquity": {
            "ShareCapitalAtBeginning": 0,
            "TreasurySharesAtBeginning": 0,
            "AccumulatedProfitsLossesAtBeginning": -1740826,
            "OtherReservesAtBeginning": 0,
            "NoncontrollingInterestsAtBeginning": 0,
            "TotalEquityAtBeginning": 0,
            "IssueOfShareCapital": 2000,
            "PurchaseOfTreasuryShares": 0,
            "ProfitLossForPeriod": 782022,
            "OtherComprehensiveIncome": 0,
            "TotalComprehensiveIncome": 782022,
            "DividendsDeclared": 0,
            "TransfersToFromReserves": 0,
            "ChangesInNoncontrollingInterests": 0,
            "ShareCapitalAtEnd": 2000,
            "TreasurySharesAtEnd": 0,
            "AccumulatedProfitsLossesAtEnd": -959165,
            "OtherReservesAtEnd": 0,
            "NoncontrollingInterestsAtEnd": 0,
            "TotalEquityAtEnd": -957165
          },
          "notes": {
            "tradeAndOtherReceivables": {
              "TradeAndOtherReceivablesDueFromThirdParties": 0,
              "TradeAndOtherReceivablesDueFromRelatedParties": 0,
              "UnbilledReceivables": 0,
              "OtherReceivables": 0,
              "TradeAndOtherReceivables": 168920988
            },
            "tradeAndOtherPayables": {
              "TradeAndOtherPayablesDueToThirdParties": 0,
              "TradeAndOtherPayablesDueToRelatedParties": 0,
              "DeferredIncome": 0,
              "OtherPayables": 0,
              "TradeAndOtherPayables": 13991532
            },
            "revenue": {
              "RevenueFromPropertyTransferredAtPointInTime": 0,
              "RevenueFromGoodsTransferredAtPointInTime": 0,
              "RevenueFromServicesTransferredAtPointInTime": 0,
              "RevenueFromPropertyTransferredOverTime": 0,
              "RevenueFromConstructionContractsOverTime": 0,
              "RevenueFromServicesTransferredOverTime": 0,
              "OtherRevenue": 0,
              "Revenue": 3249989
            }
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