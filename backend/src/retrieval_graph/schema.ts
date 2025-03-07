import { z } from "zod";

const numericValue = z.number({
  description: "Optional numeric financial value",
  invalid_type_error: "This field must be a number when provided"
}).optional()
  .describe("A financial value in SGD");

const requiredNumericValue = z.number({
  description: "Required numeric financial value",
  required_error: "This field is required by ACRA taxonomy",
  invalid_type_error: "This field must be a number"
}).describe("A required financial value in SGD");


/**
 * Creates a schema with all fields as optional to allow for partial data entry
 * @param fields An object containing field definitions using zod validators
 * @returns A zod schema with all fields marked as partial/optional
 */
const createPartialSchema = <T extends Record<string, z.ZodType>>(fields: T) => {
  return z.object(fields).partial().describe("Financial data section with optional fields");
};

const currentAssetsSchema = createPartialSchema({
  cashAndBankBalances: numericValue.describe("Cash and cash equivalents including bank deposits"),
  tradeAndOtherReceivables: numericValue.describe("Receivables from trade customers and other parties"),
  leaseReceivables: numericValue.describe("Receivables related to lease agreements"),
  financialAssetsDerivatives: numericValue.describe("Derivative financial instruments held as assets"),
  financialAssetsFairValueThroughProfitOrLoss: numericValue.describe("Financial assets measured at fair value through profit or loss"),
  otherFinancialAssets: numericValue.describe("Other financial assets not categorized elsewhere"),
  inventoriesDevelopmentProperties: numericValue.describe("Properties being developed for future sale"),
  inventoriesOthers: numericValue.describe("Other inventory items"),
  otherNonFinancialAssets: numericValue.describe("Non-financial assets not categorized elsewhere"),
  nonCurrentAssetsHeldForSale: numericValue.describe("Non-current assets intended for sale"),
  totalCurrentAssets: numericValue.describe("Sum of all current assets")
});

const nonCurrentAssetsSchema = createPartialSchema({
  tradeAndOtherReceivables: numericValue.describe("Long-term receivables from trade customers and other parties"),
  leaseReceivables: numericValue.describe("Long-term receivables related to lease agreements"),
  financialAssetsDerivatives: numericValue.describe("Long-term derivative financial instruments held as assets"),
  financialAssetsFairValueThroughProfitOrLoss: numericValue.describe("Long-term financial assets measured at fair value through profit or loss"),
  otherFinancialAssets: numericValue.describe("Other long-term financial assets"),
  propertyPlantAndEquipment: numericValue.describe("Tangible fixed assets used in operations"),
  investmentProperties: numericValue.describe("Properties held to earn rental income or for capital appreciation"),
  goodwill: numericValue.describe("Excess of the cost of an acquisition over the fair value of net assets acquired"),
  intangibleAssets: numericValue.describe("Non-physical assets such as patents, trademarks, and software"),
  investmentsInSubsidiariesJointVenturesAndAssociates: numericValue.describe("Investments in other entities"),
  deferredTaxAssets: numericValue.describe("Tax assets resulting from deductible temporary differences"),
  otherNonFinancialAssets: numericValue.describe("Other non-financial assets not classified elsewhere"),
  totalNonCurrentAssets: numericValue.describe("Sum of all non-current assets")
});

const currentLiabilitiesSchema = createPartialSchema({
  tradeAndOtherPayables: numericValue.describe("Short-term payables to suppliers and other creditors"),
  loansAndBorrowings: numericValue.describe("Short-term debt obligations"),
  financialLiabilitiesDerivativesAndFairValue: numericValue.describe("Short-term derivative financial instruments held as liabilities"),
  leaseliabilities: numericValue.describe("Short-term lease obligations"),
  otherFinancialLiabilities: numericValue.describe("Other short-term financial obligations"),
  incomeTaxLiabilities: numericValue.describe("Current tax obligations"),
  provisions: numericValue.describe("Short-term provisions for probable future obligations"),
  otherNonFinancialLiabilities: numericValue.describe("Other short-term non-financial obligations"),
  liabilitiesInDisposalGroups: numericValue.describe("Liabilities associated with assets held for sale"),
  totalCurrentLiabilities: numericValue.describe("Sum of all current liabilities")
});

const nonCurrentLiabilitiesSchema = createPartialSchema({
  tradeAndOtherPayables: numericValue.describe("Long-term payables to suppliers and other creditors"),
  loansAndBorrowings: numericValue.describe("Long-term debt obligations"),
  financialLiabilitiesDerivativesAndFairValue: numericValue.describe("Long-term derivative financial instruments held as liabilities"),
  leaseliabilities: numericValue.describe("Long-term lease obligations"),
  otherFinancialLiabilities: numericValue.describe("Other long-term financial obligations"),
  deferredTaxLiabilities: numericValue.describe("Tax liabilities resulting from taxable temporary differences"),
  provisions: numericValue.describe("Long-term provisions for probable future obligations"),
  otherNonFinancialLiabilities: numericValue.describe("Other long-term non-financial obligations"),
  totalNonCurrentLiabilities: numericValue.describe("Sum of all non-current liabilities")
});

const equitySchema = z.object({
  shareCapital: requiredNumericValue.describe("Par value of issued share capital"),
  treasuryShares: numericValue.describe("Company's own shares that have been repurchased"),
  accumulatedProfitsLosses: requiredNumericValue.describe("Cumulative retained earnings or losses"),
  otherReservesAttributableToOwnersOfCompany: numericValue.describe("Other components of equity attributable to owners"),
  nonControllingInterests: numericValue.describe("Equity in a subsidiary not attributable to the parent"),
  totalEquity: requiredNumericValue.describe("Total shareholders' equity")
});

const statementOfFinancialPositionCurrentNonCurrent = z.object({
  statementType: z.literal("currentNonCurrent").describe("Balance sheet using current/non-current classification"),
  consolidatedAndSeparate: z.enum(["Consolidated", "Separate"]).describe("Whether these are consolidated or separate financial statements"),
  periodEndDate: z.string().optional().describe("Date of the reporting period end (YYYY-MM-DD)"),
  assets: z.object({
    currentAssets: currentAssetsSchema,
    nonCurrentAssets: nonCurrentAssetsSchema,
    totalAssets: requiredNumericValue.describe("Total of all assets")
  }).describe("All assets of the entity"),
  liabilities: z.object({
    currentLiabilities: currentLiabilitiesSchema,
    nonCurrentLiabilities: nonCurrentLiabilitiesSchema,
    totalLiabilities: requiredNumericValue.describe("Total of all liabilities")
  }).describe("All liabilities of the entity"),
  equity: equitySchema.describe("All components of shareholders' equity")
}).describe("Financial position statement using current/non-current format");

const statementOfFinancialPositionLiquidity = z.object({
  statementType: z.literal("orderOfLiquidity").describe("Balance sheet using liquidity-based classification"),
  consolidatedAndSeparate: z.enum(["Consolidated", "Separate"]).describe("Whether these are consolidated or separate financial statements"),
  periodEndDate: z.string().optional().describe("Date of the reporting period end (YYYY-MM-DD)"),
  assets: z.object({
    // Allow additional asset fields for liquidity order, but totalAssets is required
    totalAssets: requiredNumericValue.describe("Total of all assets")
  }).passthrough().describe("All assets of the entity"),
  liabilities: z.object({
    // Allow additional liability fields for liquidity order, but totalLiabilities is required
    totalLiabilities: requiredNumericValue.describe("Total of all liabilities")
  }).passthrough().describe("All liabilities of the entity"),
  equity: equitySchema.describe("All components of shareholders' equity")
}).describe("Financial position statement using order of liquidity format");

const incomeStatement = z.object({
  statementType: z.literal("incomeStatement").describe("Income statement (profit and loss)"),
  consolidatedAndSeparate: z.enum(["Consolidated", "Separate"]).describe("Whether these are consolidated or separate financial statements"),
  periodStartDate: z.string().optional().describe("Start date of the reporting period (YYYY-MM-DD)"),
  periodEndDate: z.string().optional().describe("End date of the reporting period (YYYY-MM-DD)"),
  revenue: requiredNumericValue.describe("Revenue from primary business activities"),
  otherIncome: numericValue.describe("Income from sources other than primary business activities"),
  employeeBenefitsExpense: numericValue.describe("Costs related to employee salaries, benefits and other compensation"),
  depreciationExpense: numericValue.describe("Systematic allocation of the cost of tangible assets"),
  amortisationExpense: numericValue.describe("Systematic allocation of the cost of intangible assets"),
  repairsAndMaintenanceExpense: numericValue.describe("Costs for repairs and maintenance of assets"),
  salesAndMarketingExpense: numericValue.describe("Costs related to sales and marketing activities"),
  otherExpenses: numericValue.describe("Expenses not classified elsewhere"),
  otherGainsLosses: numericValue.describe("Gains or losses from non-primary activities"),
  financeNetCosts: numericValue.describe("Net finance costs or income"),
  shareOfProfitLossOfAssociatesAndJointVentures: numericValue.describe("Entity's share of profit or loss from associates and joint ventures"),
  profitLossBeforeTaxation: requiredNumericValue.describe("Profit or loss before tax deductions"),
  incomeTaxExpenseBenefit: requiredNumericValue.describe("Tax expenses or benefits for the period"),
  profitLossFromDiscontinuedOperations: numericValue.describe("Profit or loss from discontinued business operations"),
  totalProfitLoss: numericValue.describe("Total profit or loss for the period"),
  profitLossAttributableTo: z.object({
    ownersOfCompany: numericValue.describe("Profit or loss attributable to owners of the parent"),
    nonControllingInterests: numericValue.describe("Profit or loss attributable to non-controlling interests")
  }).partial().optional().describe("Attribution of profit or loss")
}).describe("Statement of comprehensive income");

const tradeAndOtherReceivablesNote = z.object({
  statementType: z.literal("tradeAndOtherReceivablesNote").describe("Note disclosure for trade and other receivables"),
  consolidatedAndSeparate: z.enum(["Consolidated", "Separate"]).describe("Whether these are consolidated or separate financial statements"),
  periodEndDate: z.string().optional().describe("Date of the reporting period end (YYYY-MM-DD)"),
  tradeReceivablesDueFromThirdParties: numericValue.describe("Receivables from unrelated customers"),
  tradeReceivablesDueFromRelatedParties: numericValue.describe("Receivables from related entities"),
  contractAssets: numericValue.describe("Rights to consideration for transferred goods or services"),
  nonTradeReceivables: numericValue.describe("Receivables from sources other than customers"),
  totalTradeAndOtherReceivables: numericValue.describe("Total receivables")
}).describe("Note disclosure for trade and other receivables");

const tradeAndOtherPayablesNote = z.object({
  statementType: z.literal("tradeAndOtherPayablesNote").describe("Note disclosure for trade and other payables"),
  consolidatedAndSeparate: z.enum(["Consolidated", "Separate"]).describe("Whether these are consolidated or separate financial statements"),
  periodEndDate: z.string().optional().describe("Date of the reporting period end (YYYY-MM-DD)"),
  tradePayablesDueToThirdParties: numericValue.describe("Payables to unrelated suppliers"),
  tradePayablesDueToRelatedParties: numericValue.describe("Payables to related entities"),
  contractLiabilities: numericValue.describe("Obligations to transfer goods or services for which consideration has been received"),
  nonTradePayables: numericValue.describe("Payables for purposes other than trade"),
  totalTradeAndOtherPayables: numericValue.describe("Total payables")
}).describe("Note disclosure for trade and other payables");

const revenueNote = z.object({
  statementType: z.literal("revenueNote").describe("Note disclosure for revenue"),
  consolidatedAndSeparate: z.enum(["Consolidated", "Separate"]).describe("Whether these are consolidated or separate financial statements"),
  periodStartDate: z.string().optional().describe("Start date of the reporting period (YYYY-MM-DD)"),
  periodEndDate: z.string().optional().describe("End date of the reporting period (YYYY-MM-DD)"),
  revenueRecognisedAtPointInTimeProperties: numericValue.describe("Revenue from property sales recognized at a point in time"),
  revenueRecognisedAtPointInTimeGoods: numericValue.describe("Revenue from goods recognized at a point in time"),
  revenueRecognisedAtPointInTimeServices: numericValue.describe("Revenue from services recognized at a point in time"),
  revenueRecognisedOverTimeProperties: numericValue.describe("Revenue from property sales recognized over time"),
  revenueRecognisedOverTimeConstructionContracts: numericValue.describe("Revenue from construction contracts recognized over time"),
  revenueRecognisedOverTimeServices: numericValue.describe("Revenue from services recognized over time"),
  revenueOthers: numericValue.describe("Other revenue not classified elsewhere"),
  totalRevenue: requiredNumericValue.describe("Total revenue for the period")
}).describe("Note disclosure for revenue");

const FinancialStatement = z.discriminatedUnion("statementType", [
  statementOfFinancialPositionCurrentNonCurrent,
  statementOfFinancialPositionLiquidity,
  incomeStatement,
  tradeAndOtherReceivablesNote,
  tradeAndOtherPayablesNote,
  revenueNote,
]);

export const FinancialStatementSchema = FinancialStatement;

export const validateFinancialStatement = (data: unknown) => {
  if (!data || typeof data !== 'object') {
    return {
      success: false,
      errors: [{ message: "Input must be an object containing financial statement data" }],
      guidance: "The extracted data should be structured as a JavaScript object with appropriate fields"
    };
  }

  try {
    const obj = data as Record<string, any>;

    // Check for missing statement type
    if (!obj.statementType) {
      return {
        success: false,
        errors: [{ message: "Missing statementType field" }],
        guidance: "The financial statement must specify its type (e.g., 'currentNonCurrent', 'incomeStatement', etc.)"
      };
    }

    // Pre-validation structural checks with helpful guidance
    if (obj.statementType === "currentNonCurrent" || obj.statementType === "orderOfLiquidity") {
      // Check for critical balance sheet components
      if (!obj.assets || typeof obj.assets !== 'object') {
        return {
          success: false,
          errors: [{ message: "Missing assets object in balance sheet" }],
          guidance: "Balance sheet must include an assets section with appropriate fields"
        };
      }

      if (!obj.liabilities || typeof obj.liabilities !== 'object') {
        return {
          success: false,
          errors: [{ message: "Missing liabilities object in balance sheet" }],
          guidance: "Balance sheet must include a liabilities section with appropriate fields"
        };
      }

      if (!obj.equity || typeof obj.equity !== 'object') {
        return {
          success: false,
          errors: [{ message: "Missing equity object in balance sheet" }],
          guidance: "Balance sheet must include an equity section with appropriate fields"
        };
      }

      // Check for required totals
      if (obj.assets && typeof obj.assets.totalAssets !== 'number') {
        return {
          success: false,
          errors: [{ message: "Missing or invalid totalAssets value" }],
          guidance: "The total assets value must be present and must be a number"
        };
      }

      if (
        typeof obj.assets?.totalAssets === 'number' &&
        typeof obj.liabilities?.totalLiabilities === 'number' &&
        typeof obj.equity?.totalEquity === 'number'
      ) {
        const totalAssets = obj.assets.totalAssets;
        const totalLiabilitiesAndEquity = obj.liabilities.totalLiabilities + obj.equity.totalEquity;
        const difference = Math.abs(totalAssets - totalLiabilitiesAndEquity);

        const tolerance = totalAssets * 0.001;

        if (difference > tolerance) {
          return {
            success: false,
            errors: [{
              message: "Accounting equation not balanced",
              details: `Assets (${totalAssets}) should equal Liabilities + Equity (${totalLiabilitiesAndEquity})`
            }],
            guidance: "The accounting equation (Assets = Liabilities + Equity) must be balanced"
          };
        }
      }
    }

    // Perform full Zod validation
    const result = FinancialStatementSchema.parse(data);
    return {
      success: true,
      data: result,
      message: "Financial statement data successfully validated"
    };
  } catch (error) {
    if (error instanceof z.ZodError) {
      // Provide more context-aware errors
      const processedErrors = error.errors.map(e => {
        // Extract field name from path for more readable errors
        const fieldName = e.path.length > 0 ? e.path[e.path.length - 1] : 'unknown';
        let message = e.message;
        let guidance = "";

        // Customize error messages for common issues
        if (e.code === "invalid_type" && e.expected === "number" && e.received === "string") {
          message = `Field '${fieldName}' must be a number, found text`;
          guidance = "This field should contain a numeric value without currency symbols or commas";
        }
        else if (e.code === "invalid_enum_value") {
          guidance = `Valid options are: ${e.options?.join(", ")}`;
        }

        return {
          path: e.path.join('.'),
          message,
          guidance
        };
      });

      return {
        success: false,
        errors: processedErrors,
        guidance: "Review and correct the identified fields"
      };
    }

    return {
      success: false,
      errors: [{ message: "Unknown validation error", error: String(error) }],
      guidance: "An unexpected error occurred during validation"
    };
  }
};

// Extract function to help AI agents identify financial data from unstructured text
export const extractFinancialData = () => {
  return {
    message: "This function should be implemented with specific extraction patterns for the given document type",
    guidance: "Implement pattern-matching logic to extract financial values based on field names and context"
  };
};

export const validateBalanceSheet = (data: unknown) => {
  if (!data || typeof data !== 'object') {
    return {
      success: false,
      message: "Input is not an object",
      guidance: "Balance sheet data must be structured as an object"
    };
  }

  const obj = data as Record<string, any>;
  if (obj.statementType !== "currentNonCurrent" && obj.statementType !== "orderOfLiquidity") {
    return {
      success: false,
      message: "Not a balance sheet statement type",
      guidance: "For balance sheets, use 'currentNonCurrent' or 'orderOfLiquidity' as the statementType"
    };
  }

  return validateFinancialStatement(data);
};

type FinancialStatementType = z.infer<typeof FinancialStatementSchema>;

// TODO:

