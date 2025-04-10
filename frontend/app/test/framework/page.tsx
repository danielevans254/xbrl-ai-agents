'use client';

import React, { useState } from 'react';
import ACRADataVisualizer from '@/components/framework-view/framework-visualizer';

// Sample ACRA XBRL data for demonstration
const sampleACRAData = {
  filingInformation: {
    NameOfCompany: "Singapore Company Pte Ltd",
    UniqueEntityNumber: "202312345A",
    CurrentPeriodStartDate: "2022-01-01",
    CurrentPeriodEndDate: "2022-12-31",
    PriorPeriodStartDate: "2021-01-01",
    TypeOfXBRLFiling: "Full",
    NatureOfFinancialStatementsCompanyLevelOrConsolidated: "Company",
    TypeOfAccountingStandardUsedToPrepareFinancialStatements: "SFRS",
    DateOfAuthorisationForIssueOfFinancialStatements: "2023-03-15",
    TypeOfStatementOfFinancialPosition: "Classified",
    WhetherTheFinancialStatementsArePreparedOnGoingConcernBasis: true,
    WhetherThereAreAnyChangesToComparativeAmounts: false,
    DescriptionOfPresentationCurrency: "SGD",
    DescriptionOfFunctionalCurrency: "SGD",
    LevelOfRoundingUsedInFinancialStatements: "Thousands",
    DescriptionOfNatureOfEntitysOperationsAndPrincipalActivities: "Manufacturing and distribution of consumer electronics products",
    PrincipalPlaceOfBusinessIfDifferentFromRegisteredOffice: "21 Business Park Road, Singapore 123456",
    WhetherCompanyOrGroupIfConsolidatedAccountsArePreparedHasMoreThan50Employees: true,
    NameOfParentEntity: "Global Electronics Holdings Ltd",
    NameOfUltimateParentOfGroup: "Global Industries Incorporated",
    TaxonomyVersion: "2022.2",
    NameAndVersionOfSoftwareUsedToGenerateXBRLFile: "XBRL.AI",
    HowWasXBRLFilePrepared: "Automated"
  },

  directorsStatement: {
    WhetherInDirectorsOpinionFinancialStatementsAreDrawnUpSoAsToExhibitATrueAndFairView: true,
    WhetherThereAreReasonableGroundsToBelieveThatCompanyWillBeAbleToPayItsDebtsAsAndWhenTheyFallDueAtDateOfStatement: true
  },

  auditReport: {
    TypeOfAuditOpinionInIndependentAuditorsReport: "Unqualified",
    AuditingStandardsUsedToConductTheAudit: "Singapore Standards on Auditing",
    WhetherThereIsAnyMaterialUncertaintyRelatingToGoingConcern: false,
    WhetherInAuditorsOpinionAccountingAndOtherRecordsRequiredAreProperlyKept: true
  },

  statementOfFinancialPosition: {
    currentAssets: {
      CashAndBankBalances: 7500,
      TradeAndOtherReceivablesCurrent: 12800,
      CurrentFinanceLeaseReceivables: 0,
      CurrentDerivativeFinancialAssets: 0,
      CurrentFinancialAssetsMeasuredAtFairValueThroughProfitOrLoss: 0,
      OtherCurrentFinancialAssets: 1500,
      DevelopmentProperties: 0,
      Inventories: 18600,
      OtherCurrentNonfinancialAssets: 2200,
      NoncurrentAssetsOrDisposalGroupsClassifiedAsHeldForSaleOrAsHeldForDistributionToOwners: 0,
      CurrentAssets: 42600
    },

    nonCurrentAssets: {
      TradeAndOtherReceivablesNoncurrent: 0,
      NoncurrentFinanceLeaseReceivables: 0,
      NoncurrentDerivativeFinancialAssets: 0,
      NoncurrentFinancialAssetsMeasuredAtFairValueThroughProfitOrLoss: 0,
      OtherNoncurrentFinancialAssets: 2500,
      PropertyPlantAndEquipment: 35800,
      InvestmentProperties: 0,
      Goodwill: 0,
      IntangibleAssetsOtherThanGoodwill: 4200,
      InvestmentsInSubsidiariesAssociatesOrJointVentures: 8500,
      DeferredTaxAssets: 950,
      OtherNoncurrentNonfinancialAssets: 0,
      NoncurrentAssets: 51950
    },

    Assets: 94550,

    currentLiabilities: {
      TradeAndOtherPayablesCurrent: 11600,
      CurrentLoansAndBorrowings: 5800,
      CurrentFinancialLiabilitiesMeasuredAtFairValueThroughProfitOrLoss: 0,
      CurrentFinanceLeaseLiabilities: 1200,
      OtherCurrentFinancialLiabilities: 800,
      CurrentIncomeTaxLiabilities: 2350,
      CurrentProvisions: 1100,
      OtherCurrentNonfinancialLiabilities: 750,
      LiabilitiesClassifiedAsHeldForSale: 0,
      CurrentLiabilities: 23600
    },

    nonCurrentLiabilities: {
      TradeAndOtherPayablesNoncurrent: 0,
      NoncurrentLoansAndBorrowings: 12500,
      NoncurrentFinancialLiabilitiesMeasuredAtFairValueThroughProfitOrLoss: 0,
      NoncurrentFinanceLeaseLiabilities: 2800,
      OtherNoncurrentFinancialLiabilities: 0,
      DeferredTaxLiabilities: 1850,
      NoncurrentProvisions: 3200,
      OtherNoncurrentNonfinancialLiabilities: 0,
      NoncurrentLiabilities: 20350
    },

    Liabilities: 43950,

    equity: {
      ShareCapital: 25000,
      TreasuryShares: 0,
      AccumulatedProfitsLosses: 22600,
      ReservesOtherThanAccumulatedProfitsLosses: 3000,
      NoncontrollingInterests: 0,
      Equity: 50600
    }
  },

  incomeStatement: {
    Revenue: 125800,
    OtherIncome: 2350,
    EmployeeBenefitsExpense: 34500,
    DepreciationExpense: 5800,
    AmortisationExpense: 1200,
    RepairsAndMaintenanceExpense: 2850,
    SalesAndMarketingExpense: 12600,
    OtherExpensesByNature: 47800,
    OtherGainsLosses: -850,
    FinanceCosts: 1850,
    ShareOfProfitLossOfAssociatesAndJointVenturesAccountedForUsingEquityMethod: 1200,
    ProfitLossBeforeTaxation: 21900,
    TaxExpenseBenefitContinuingOperations: 3700,
    ProfitLossFromDiscontinuedOperations: 0,
    ProfitLoss: 18200,
    ProfitLossAttributableToOwnersOfCompany: 18200,
    ProfitLossAttributableToNoncontrollingInterests: 0
  }
};

export default function ACRAXBRLPage() {
  const [acraData, setAcraData] = useState(sampleACRAData);

  const handleDataUpdate = (newData: any) => {
    setAcraData(newData);
    console.log('Data updated:', newData);
  };

  return (
    <div className="container mx-auto py-8 px-4">
      <h1 className="text-2xl font-bold mb-6">ACRA XBRL Data Visualization</h1>

      <ACRADataVisualizer
        data={acraData}
        title="Singapore Company Pte Ltd"
        uuid="sample-uuid"
        onDataUpdate={handleDataUpdate}
      />
    </div>
  );
}