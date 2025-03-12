import { indexConfig, retrievalAssistantStreamConfig } from '@/constants/graphConfigs';
import { createServerClient, langGraphServerClient } from '@/lib/langgraph-server';
import { processPDF } from '@/lib/pdf';
import { Document } from '@langchain/core/documents';
import { NextRequest, NextResponse } from 'next/server';
import { PartialXBRLSchema } from '../../../../backend/src/retrieval_graph/schema';
import { z } from 'zod';

// Configuration constants
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const ALLOWED_FILE_TYPES = ['application/pdf'];

interface IngestionRunResult {
  output?: {
    financialStatement?: z.infer<typeof PartialXBRLSchema>;
  };
  state?: Record<string, any>;
}

export async function POST(request: NextRequest) {
  try {
    if (!process.env.LANGGRAPH_INGESTION_ASSISTANT_ID || !process.env.LANGGRAPH_RETRIEVAL_ASSISTANT_ID) {
      return NextResponse.json(
        {
          error:
            'LANGGRAPH_INGESTION_ASSISTANT_ID or LANGGRAPH_RETRIEVAL_ASSISTANT_ID is not set in your environment variables',
        },
        { status: 500 },
      );
    }

    const formData = await request.formData();
    const files: File[] = [];

    for (const [key, value] of formData.entries()) {
      if (key === 'files' && value instanceof File) {
        files.push(value);
      }
    }

    if (!files || files.length === 0) {
      return NextResponse.json({ error: 'No files provided' }, { status: 400 });
    }

    // Validate file count
    if (files.length > 5) {
      return NextResponse.json(
        { error: 'Too many files. Maximum 5 files allowed.' },
        { status: 400 },
      );
    }

    // Validate file types and sizes
    const invalidFiles = files.filter((file) => {
      return (
        !ALLOWED_FILE_TYPES.includes(file.type) || file.size > MAX_FILE_SIZE
      );
    });

    if (invalidFiles.length > 0) {
      return NextResponse.json(
        {
          error:
            'Only PDF files are allowed and file size must be less than 10MB',
        },
        { status: 400 },
      );
    }

    // Process all PDFs into Documents
    const allDocs: Document[] = [];
    for (const file of files) {
      try {
        const docs = await processPDF(file);
        allDocs.push(...docs);
      } catch (error: any) {
        console.error(`Error processing file ${file.name}:`, error);
        // Continue processing other files; errors are logged
      }
    }

    if (!allDocs.length) {
      return NextResponse.json(
        { error: 'No valid documents extracted from uploaded files' },
        { status: 500 },
      );
    }

    // Run the ingestion graph
    const thread = await langGraphServerClient.createThread();
    const ingestionRun = await langGraphServerClient.client.runs.wait(
      thread.thread_id,
      'ingestion_graph',
      {
        input: { docs: allDocs },
        config: {
          configurable: {
            ...indexConfig,
            queryModel: 'openai/gpt-4o',
          },
        },
      },
    ) as unknown as IngestionRunResult;
    const structuredData = ingestionRun.state?.financialStatement ??
      ingestionRun.output?.financialStatement;

    try {
      const origin = request.nextUrl.origin;
      const response = await fetch(`${origin}/api/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: "Extract all the financial data here map it to this zod schema constCurrencyCode=z.string().length(3).regex(/^[A-Z]{3}$/).describe(\"ISO4217currencycode\");constDateISO8601=z.string().regex(/^\\d{4}-\\d{2}-\\d{2}$/).describe(\"ISO8601formatteddate(YYYY-MM-DD)\");constMonetaryAmount=z.number().positive().describe(\"MonetaryamountinSGD\");constPercentage=z.number().min(0).max(100).describe(\"Percentagevalue(0-100)\");exportconstPartialXBRLSchema=z.object({filingInformation:z.object({NameOfCompany:z.string().min(1).describe(\"RegisterednameoftheentityinBizFile\"),UniqueEntityNumber:z.string().regex(/^\\d{8}[A-Z]$/).describe(\"UniqueEntityNumberassignedbyACRA\"),CurrentPeriodStartDate:DateISO8601.describe(\"Startdateofthecurrentreportingperiod\"),CurrentPeriodEndDate:DateISO8601.describe(\"Enddateofthecurrentreportingperiod\"),PriorPeriodStartDate:DateISO8601.optional().describe(\"Startdateofthepriorreportingperiodforcomparatives\"),TypeOfXBRLFiling:z.enum([\"Full\",\"Partial\"]).describe(\"WhetherthefilingcontainsfullorpartialXBRLinformation\"),NatureOfFinancialStatementsCompanyLevelOrConsolidated:z.enum([\"Company\",\"Consolidated\"]).describe(\"Whetherthestatementsareforthecompanyaloneorconsolidatedgroup\"),TypeOfAccountingStandardUsedToPrepareFinancialStatements:z.enum([\"SFRS\",\"SFRSforSE\",\"IFRS\",\"Other\"]).describe(\"Accountingstandardsframeworkused\"),DateOfAuthorisationForIssueOfFinancialStatements:DateISO8601.describe(\"Datewhenthefinancialstatementswereauthorizedforissue\"),TypeOfStatementOfFinancialPosition:z.enum([\"Classified\",\"Liquidity-based\"]).describe(\"Whetherthestatementoffinancialpositionispresentedincurrent/non-currentformatororderofliquidity\"),WhetherTheFinancialStatementsArePreparedOnGoingConcernBasis:z.boolean().describe(\"Whethertheentityisagoingconcern\"),WhetherThereAreAnyChangesToComparativeAmounts:z.boolean().optional().describe(\"Whethercomparativeamountshavebeenrestatedorreclassified\"),DescriptionOfPresentationCurrency:CurrencyCode.describe(\"Currencyusedforpresentationofthefinancialstatements\"),DescriptionOfFunctionalCurrency:CurrencyCode.describe(\"Primarycurrencyoftheeconomicenvironmentinwhichtheentityoperates\"),LevelOfRoundingUsedInFinancialStatements:z.enum([\"Thousands\",\"Millions\",\"Units\"]).describe(\"Levelofroundingappliedtothefinancialdata\"),DescriptionOfNatureOfEntitysOperationsAndPrincipalActivities:z.string().min(20,\"Pleaseprovideadetaileddescription(atleast20characters).\").max(100,\"Descriptionistoolong;pleaselimitto100characters.\").describe(\"Provideadetaileddescriptionofthenatureoftheentity'soperationsanditsprincipalbusinessactivities,includingkeyoperationalinsights.\"),PrincipalPlaceOfBusinessIfDifferentFromRegisteredOffice:z.string().describe(\"Mainlocationwherebusinessisconducted\"),WhetherCompanyOrGroupIfConsolidatedAccountsArePreparedHasMoreThan50Employees:z.boolean().describe(\"Whetherthecompanyorgrouphasmorethan50employees\"),//Allownull(orabsence)forparentnames.NameOfParentEntity:z.string().nullable().optional().describe(\"Immediateparentcompanyname\"),NameOfUltimateParentOfGroup:z.string().nullable().optional().describe(\"Ultimateparentcompanyname\"),TaxonomyVersion:z.literal(\"2022.2\").describe(\"VersionoftheXBRLtaxonomyused\"),NameAndVersionOfSoftwareUsedToGenerateXBRLFile:z.string().describe(\"SoftwareusedtopreparetheXBRLfiling\"),HowWasXBRLFilePrepared:z.enum([\"Automated\",\"Manual\",\"Hybrid\"]).default(\"Automated\").describe(\"IndicatehowtheXBRLfilewasprepared:automated,manual,orhybrid(defaultisautomated).\")}).describe(\"Basicinformationabouttheentityandthefiling\"),directorsStatement:z.object({WhetherInDirectorsOpinionFinancialStatementsAreDrawnUpSoAsToExhibitATrueAndFairView:z.boolean().describe(\"Directors'opiniononwhetherfinancialstatementsgiveatrueandfairview\"),WhetherThereAreReasonableGroundsToBelieveThatCompanyWillBeAbleToPayItsDebtsAsAndWhenTheyFallDueAtDateOfStatement:z.boolean().describe(\"Directors'opiniononsolvencyofthecompany\")}).describe(\"Statementsmadebythedirectorsregardingthefinancialstatements\"),auditReport:z.object({TypeOfAuditOpinionInIndependentAuditorsReport:z.enum([\"Unqualified\",\"Qualified\",\"Adverse\",\"Disclaimer\"]).describe(\"Typeofopinionexpressedbytheauditors\"),//Allownullforoptionalstringfields.AuditingStandardsUsedToConductTheAudit:z.string().nullable().optional().describe(\"Auditingstandardsframeworkusedfortheaudit\"),//Allownullforoptionalbooleans.WhetherThereIsAnyMaterialUncertaintyRelatingToGoingConcern:z.boolean().nullable().optional().describe(\"Whetherauditorsreportedmaterialuncertaintyaboutgoingconcern\"),WhetherInAuditorsOpinionAccountingAndOtherRecordsRequiredAreProperlyKept:z.boolean().nullable().optional().describe(\"Auditors'opiniononwhetherproperaccountingrecordshavebeenkept\")}).describe(\"Informationabouttheindependentauditors'report\"),statementOfFinancialPosition:z.object({currentAssets:z.object({CashAndBankBalances:MonetaryAmount.optional().describe(\"Cashandbankbalances,current\"),TradeAndOtherReceivablesCurrent:MonetaryAmount.optional().describe(\"Tradeandotherreceivables(includingcontractassets),current\"),CurrentFinanceLeaseReceivables:MonetaryAmount.optional().describe(\"Financialassets-leasereceivables,current\"),CurrentDerivativeFinancialAssets:MonetaryAmount.optional().describe(\"Financialassets-derivatives,current\"),CurrentFinancialAssetsMeasuredAtFairValueThroughProfitOrLoss:MonetaryAmount.optional().describe(\"Financialassets-atfairvaluethroughprofitorloss,current\"),OtherCurrentFinancialAssets:MonetaryAmount.optional().describe(\"Otherfinancialassets,current\"),DevelopmentProperties:MonetaryAmount.optional().describe(\"Inventories-developmentproperties,current\"),Inventories:MonetaryAmount.optional().describe(\"Inventories-others,current\"),OtherCurrentNonfinancialAssets:MonetaryAmount.optional().describe(\"Othernon-financialassets,current\"),NoncurrentAssetsOrDisposalGroupsClassifiedAsHeldForSaleOrAsHeldForDistributionToOwners:MonetaryAmount.optional().describe(\"Non-currentassetsordisposalgroupsclassifiedasheldforsale/distribution\"),CurrentAssets:MonetaryAmount.describe(\"Totalcurrentassets(sumofcurrentassetcomponents)\")}).describe(\"Currentassetssection\"),nonCurrentAssets:z.object({TradeAndOtherReceivablesNoncurrent:MonetaryAmount.optional().describe(\"Tradeandotherreceivables(includingcontractassetsandrestrictedcash),non-current\"),NoncurrentFinanceLeaseReceivables:MonetaryAmount.optional().describe(\"Financialassets-leasereceivables,non-current\"),NoncurrentDerivativeFinancialAssets:MonetaryAmount.optional().describe(\"Financialassets-derivatives,non-current\"),NoncurrentFinancialAssetsMeasuredAtFairValueThroughProfitOrLoss:MonetaryAmount.optional().describe(\"Financialassets-atfairvaluethroughprofitorloss,non-current\"),OtherNoncurrentFinancialAssets:MonetaryAmount.optional().describe(\"Otherfinancialassets,non-current\"),PropertyPlantAndEquipment:MonetaryAmount.optional().describe(\"Property,plantandequipment\"),InvestmentProperties:MonetaryAmount.optional().describe(\"Investmentproperties\"),Goodwill:MonetaryAmount.optional().describe(\"Goodwill\"),IntangibleAssetsOtherThanGoodwill:MonetaryAmount.optional().describe(\"Intangibleassets(excludinggoodwill)\"),InvestmentsInSubsidiariesAssociatesOrJointVentures:MonetaryAmount.optional().describe(\"Investmentsinsubsidiaries,jointventuresandassociates\"),DeferredTaxAssets:MonetaryAmount.optional().describe(\"Deferredtaxassets\"),OtherNoncurrentNonfinancialAssets:MonetaryAmount.optional().describe(\"Othernon-financialassets,non-current\"),NoncurrentAssets:MonetaryAmount.describe(\"Totalnon-currentassets(sumofnon-currentcomponents)\")}).describe(\"Non-currentassetssection\"),Assets:MonetaryAmount.describe(\"Totalassets(CurrentAssets+NoncurrentAssets)\"),currentLiabilities:z.object({TradeAndOtherPayablesCurrent:MonetaryAmount.optional().describe(\"Tradeandotherpayables(includingcontractliabilities),current\"),CurrentLoansAndBorrowings:MonetaryAmount.optional().describe(\"Loansandborrowings,current\"),CurrentFinancialLiabilitiesMeasuredAtFairValueThroughProfitOrLoss:MonetaryAmount.optional().describe(\"Financialliabilities-derivativesandatfairvaluethroughP/L,current\"),CurrentFinanceLeaseLiabilities:MonetaryAmount.optional().describe(\"Financialliabilities-leaseliabilities,current\"),OtherCurrentFinancialLiabilities:MonetaryAmount.optional().describe(\"Otherfinancialliabilities,current\"),CurrentIncomeTaxLiabilities:MonetaryAmount.optional().describe(\"Incometaxliabilities,current\"),CurrentProvisions:MonetaryAmount.optional().describe(\"Provisions(excludingincometax),current\"),OtherCurrentNonfinancialLiabilities:MonetaryAmount.optional().describe(\"Othernon-financialliabilities,current\"),LiabilitiesClassifiedAsHeldForSale:MonetaryAmount.optional().describe(\"Liabilitiesincludedindisposalgroupsheldforsale\"),CurrentLiabilities:MonetaryAmount.describe(\"Totalcurrentliabilities(sumofcomponents)\")}).describe(\"Currentliabilitiessection\"),nonCurrentLiabilities:z.object({TradeAndOtherPayablesNoncurrent:MonetaryAmount.optional().describe(\"Tradeandotherpayables(includingcontractliabilities),non-current\"),NoncurrentLoansAndBorrowings:MonetaryAmount.optional().describe(\"Loansandborrowings,non-current\"),NoncurrentFinancialLiabilitiesMeasuredAtFairValueThroughProfitOrLoss:MonetaryAmount.optional().describe(\"Financialliabilities-derivativesandatfairvaluethroughP/L,non-current\"),NoncurrentFinanceLeaseLiabilities:MonetaryAmount.optional().describe(\"Financialliabilities-leaseliabilities,non-current\"),OtherNoncurrentFinancialLiabilities:MonetaryAmount.optional().describe(\"Otherfinancialliabilities,non-current\"),DeferredTaxLiabilities:MonetaryAmount.optional().describe(\"Deferredtaxliabilities\"),NoncurrentProvisions:MonetaryAmount.optional().describe(\"Provisions(includingnon-currentincometax)\"),OtherNoncurrentNonfinancialLiabilities:MonetaryAmount.optional().describe(\"Othernon-financialliabilities,non-current\"),NoncurrentLiabilities:MonetaryAmount.describe(\"Totalnon-currentliabilities(sumofcomponents)\")}).describe(\"Non-currentliabilitiessection\"),Liabilities:MonetaryAmount.describe(\"Totalliabilities(CurrentLiabilities+NoncurrentLiabilities)\"),equity:z.object({ShareCapital:MonetaryAmount.describe(\"Sharecapital\"),TreasuryShares:MonetaryAmount.optional().describe(\"Treasuryshares\"),AccumulatedProfitsLosses:MonetaryAmount.describe(\"Accumulatedprofits(losses)\"),ReservesOtherThanAccumulatedProfitsLosses:MonetaryAmount.optional().describe(\"Otherreservesattributabletoowners\"),NoncontrollingInterests:MonetaryAmount.optional().describe(\"Non-controllinginterests\"),Equity:MonetaryAmount.describe(\"Totalequity(ShareCapital+AccumulatedProfitsLosses+Reserves+NoncontrollingInterests-TreasuryShares)\")}).describe(\"Equitysection\")}).strict(),incomeStatement:z.object({Revenue:MonetaryAmount.describe(\"Revenuefromcontractswithcustomers\"),OtherIncome:MonetaryAmount.optional().describe(\"Otherincome\"),EmployeeBenefitsExpense:MonetaryAmount.optional().describe(\"Employeebenefitsexpense\"),DepreciationExpense:MonetaryAmount.optional().describe(\"Depreciationofproperty,plantandequipment\"),AmortisationExpense:MonetaryAmount.optional().describe(\"Amortisationofintangibleassets\"),RepairsAndMaintenanceExpense:MonetaryAmount.optional().describe(\"Repairsandmaintenancecosts\"),SalesAndMarketingExpense:MonetaryAmount.optional().describe(\"Salesandmarketingcosts\"),OtherExpensesByNature:MonetaryAmount.optional().describe(\"Otheroperatingexpensesbynature\"),OtherGainsLosses:MonetaryAmount.optional().describe(\"Othergains/(losses)\"),FinanceCosts:MonetaryAmount.optional().describe(\"Netfinancecosts\"),ShareOfProfitLossOfAssociatesAndJointVenturesAccountedForUsingEquityMethod:MonetaryAmount.optional().describe(\"Shareofprofits/(losses)ofassociates/jointventures\"),ProfitLossBeforeTaxation:MonetaryAmount.describe(\"Profit/(loss)beforetaxfromcontinuingoperations\"),TaxExpenseBenefitContinuingOperations:MonetaryAmount.describe(\"Incometaxexpense/(benefit)\"),ProfitLossFromDiscontinuedOperations:MonetaryAmount.optional().describe(\"Profit/(loss)fromdiscontinuedoperations\"),ProfitLoss:MonetaryAmount.describe(\"Totalcomprehensiveincomefortheperiod\"),ProfitLossAttributableToOwnersOfCompany:MonetaryAmount.describe(\"Portionattributabletoparentowners\"),ProfitLossAttributableToNoncontrollingInterests:MonetaryAmount.optional().describe(\"PortionattributabletoNCI\")}).strict(),notes:z.object({tradeAndOtherReceivables:z.object({TradeAndOtherReceivablesDueFromThirdParties:MonetaryAmount.optional(),TradeAndOtherReceivablesDueFromRelatedParties:MonetaryAmount.optional(),UnbilledReceivables:MonetaryAmount.optional(),OtherReceivables:MonetaryAmount.optional(),TradeAndOtherReceivables:MonetaryAmount}).strict(),tradeAndOtherPayables:z.object({TradeAndOtherPayablesDueToThirdParties:MonetaryAmount.optional(),TradeAndOtherPayablesDueToRelatedParties:MonetaryAmount.optional(),DeferredIncome:MonetaryAmount.optional(),OtherPayables:MonetaryAmount.optional(),TradeAndOtherPayables:MonetaryAmount}).strict(),revenue:z.object({RevenueFromPropertyTransferredAtPointInTime:MonetaryAmount.optional(),RevenueFromGoodsTransferredAtPointInTime:MonetaryAmount.optional(),RevenueFromServicesTransferredAtPointInTime:MonetaryAmount.optional(),RevenueFromPropertyTransferredOverTime:MonetaryAmount.optional(),RevenueFromConstructionContractsOverTime:MonetaryAmount.optional(),RevenueFromServicesTransferredOverTime:MonetaryAmount.optional(),OtherRevenue:MonetaryAmount.optional(),Revenue:MonetaryAmount}).strict()}).describe(\"ComprehensivefinancialstatementschemacompliantwithSingaporeSimplifiedXBRLrequirements\")});exporttypePartialXBRL=z.infer<typeofPartialXBRLSchema>;",
          threadId: thread.thread_id
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
    } catch (extractError) {
      console.error('Error triggering automatic extraction:', extractError);
      // We still return success for the ingestion even if the extract message fails
    }

    return NextResponse.json({
      message: 'Documents ingested successfully',
      threadId: thread.thread_id,
      ...(structuredData && { structuredData }),
    });
  } catch (error: any) {
    console.error('Error processing files:', error);
    return NextResponse.json(
      {
        error: 'Failed to process files',
        details: error.message,
        stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
      },
      { status: 500 },
    );
  }
}