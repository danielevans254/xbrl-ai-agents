'use client';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';

export default function XBRLConverter() {
  const [currentStep, setCurrentStep] = useState(0);
  const [mappedData, setMappedData] = useState(sampleMappingData);
  const [validationResults, setValidationResults] = useState(sampleValidationData);
  const [xbrlData, setXbrlData] = useState(sampleTaggingData);

  const steps = [
    { title: 'Data Extraction', description: 'Upload and extract PDF data' },
    { title: 'Taxonomy Mapping', description: 'Map extracted data to ACRA taxonomy' },
    { title: 'Validation', description: 'Validate mapped data' },
    { title: 'XBRL Generation', description: 'Generate final XBRL file' },
  ];

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-8">
      <div className="max-w-7xl mx-auto">
        <Stepper currentStep={currentStep} className="mb-8">
          {steps.map((step, index) => (
            <Step key={index} index={index} title={step.title} description={step.description} />
          ))}
        </Stepper>

        {currentStep === 0 && (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>Extracted Financial Data</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold">Filing Information</h3>
                  <pre className="bg-gray-100 dark:bg-gray-800 p-4 rounded-md text-sm overflow-x-auto">
                    {JSON.stringify(mappedData.data.FilingInformation, null, 2)}
                  </pre>
                </div>
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold">Financial Position</h3>
                  <pre className="bg-gray-100 dark:bg-gray-800 p-4 rounded-md text-sm">
                    {JSON.stringify(mappedData.data.StatementOfFinancialPosition, null, 2)}
                  </pre>
                </div>
              </div>
              <Button className="mt-6" onClick={() => setCurrentStep(1)}>
                Continue to Mapping
              </Button>
            </CardContent>
          </Card>
        )}

        {currentStep === 1 && (
          <MappingInterface
            extractedData={mappedData.data}
            onComplete={() => setCurrentStep(2)}
          />
        )}

        {currentStep === 2 && (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>Validation Results</CardTitle>
            </CardHeader>
            <CardContent>
              <ValidationResults results={validationResults} />
              <div className="mt-6 flex gap-4">
                <Button variant="outline" onClick={() => setCurrentStep(1)}>
                  Back to Mapping
                </Button>
                <Button onClick={() => setCurrentStep(3)}>
                  Generate XBRL
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {currentStep === 3 && (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>XBRL File Generated</CardTitle>
            </CardHeader>
            <CardContent>
              <XBRLPreview data={xbrlData} />
              <div className="mt-6 flex gap-4">
                <Button variant="outline" onClick={() => setCurrentStep(0)}>
                  Start Over
                </Button>
                <Button onClick={() => alert('Download functionality')}>
                  Download XBRL File
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}

// Stepper components
const Stepper = ({ children, currentStep, className }) => (
  <div className={`flex items-center ${className}`}>
    {children}
  </div>
);

const Step = ({ index, title, description }) => (
  <div className="flex-1">
    <div className="relative flex items-center">
      <div className={`w-8 h-8 rounded-full flex items-center justify-center ${index === 0 ? 'bg-blue-600 text-white' : 'bg-gray-300 dark:bg-gray-700'
        }`}>
        {index + 1}
      </div>
      <div className="ml-4">
        <h3 className="text-sm font-medium">{title}</h3>
        <p className="text-xs text-gray-500 dark:text-gray-400">{description}</p>
      </div>
      {index < 3 && (
        <div className="flex-1 h-px bg-gray-300 dark:bg-gray-700 mx-4"></div>
      )}
    </div>
  </div>
);

// Sample components (simplified versions)
const MappingInterface = ({ extractedData, onComplete }) => (
  <Card className="mb-6">
    <CardHeader>
      <CardTitle>Taxonomy Mapping</CardTitle>
    </CardHeader>
    <CardContent>
      <div className="grid grid-cols-2 gap-6 h-96">
        <div className="border-r pr-6">
          <h3 className="text-lg font-semibold mb-4">Extracted Fields</h3>
          <div className="space-y-2 overflow-y-auto h-80">
            {Object.entries(sampleMappingData.data.FilingInformation).map(([key]) => (
              <div key={key} className="p-3 bg-gray-100 dark:bg-gray-800 rounded-md">
                <div className="flex justify-between items-center">
                  <span>{key}</span>
                  <span className="text-blue-600 cursor-pointer">Map</span>
                </div>
              </div>
            ))}
            {Object.entries(sampleMappingData.data.StatementOfFinancialPosition).map(([key]) => (
              <div key={key} className="p-3 bg-gray-100 dark:bg-gray-800 rounded-md">
                <div className="flex justify-between items-center">
                  <span>{key}</span>
                  <span className="text-blue-600 cursor-pointer">Map</span>
                </div>
              </div>
            ))}
          </div>
        </div>
        <div>
          <h3 className="text-lg font-semibold mb-4">ACRA Taxonomy</h3>
          <div className="space-y-2 overflow-y-auto h-80">
            <div className="p-2 bg-green-100 dark:bg-green-900 rounded-md">FilingInformation</div>
            <div className="ml-4 space-y-2">
              <div className="p-2 bg-green-50 dark:bg-green-800 rounded-md">NameOfCompany</div>
              <div className="p-2 bg-green-50 dark:bg-green-800 rounded-md">UniqueEntityNumber</div>
              <div className="p-2 bg-green-50 dark:bg-green-800 rounded-md">FinancialYearEnd</div>
              <div className="p-2 bg-green-50 dark:bg-green-800 rounded-md">CurrentPeriodStartDate</div>
              <div className="p-2 bg-green-50 dark:bg-green-800 rounded-md">CurrentPeriodEndDate</div>
            </div>
            <div className="p-2 bg-green-100 dark:bg-green-900 rounded-md">StatementOfFinancialPosition</div>
            <div className="ml-4 space-y-2">
              <div className="p-2 bg-green-50 dark:bg-green-800 rounded-md">Assets</div>
              <div className="ml-4 space-y-2">
                <div className="p-2 bg-green-50 dark:bg-green-800 rounded-md">CurrentAssets</div>
                <div className="ml-4 space-y-2">
                  <div className="p-2 bg-green-50 dark:bg-green-800 rounded-md">CashAndCashEquivalents</div>
                  <div className="p-2 bg-green-50 dark:bg-green-800 rounded-md">TradeAndOtherReceivables</div>
                  <div className="p-2 bg-green-50 dark:bg-green-800 rounded-md">Inventories</div>
                </div>
                <div className="p-2 bg-green-50 dark:bg-green-800 rounded-md">NonCurrentAssets</div>
                <div className="ml-4 space-y-2">
                  <div className="p-2 bg-green-50 dark:bg-green-800 rounded-md">PropertyPlantAndEquipment</div>
                  <div className="p-2 bg-green-50 dark:bg-green-800 rounded-md">IntangibleAssets</div>
                </div>
              </div>
              <div className="p-2 bg-green-50 dark:bg-green-800 rounded-md">Liabilities</div>
              <div className="ml-4 space-y-2">
                <div className="p-2 bg-green-50 dark:bg-green-800 rounded-md">CurrentLiabilities</div>
                <div className="p-2 bg-green-50 dark:bg-green-800 rounded-md">NonCurrentLiabilities</div>
              </div>
              <div className="p-2 bg-green-50 dark:bg-green-800 rounded-md">Equity</div>
            </div>
          </div>
        </div>
      </div>
      <Button className="mt-6" onClick={onComplete}>
        Complete Mapping
      </Button>
    </CardContent>
  </Card>
);

const ValidationResults = ({ results }) => (
  <div className="space-y-4">
    {results.errors.map((error, index) => (
      <div key={index} className="p-4 bg-red-100 dark:bg-red-900 rounded-md flex items-start gap-3">
        <div className="flex-1">
          <h4 className="font-medium">{error.type}: {error.field}</h4>
          <p className="text-sm text-gray-600 dark:text-gray-300">
            {error.message}
          </p>
        </div>
      </div>
    ))}
    {results.warnings.map((warning, index) => (
      <div key={index} className="p-4 bg-yellow-100 dark:bg-yellow-900 rounded-md flex items-start gap-3">
        <div className="flex-1">
          <h4 className="font-medium">{warning.type}: {warning.field}</h4>
          <p className="text-sm text-gray-600 dark:text-gray-300">
            {warning.message}
          </p>
        </div>
      </div>
    ))}
  </div>
);

const XBRLPreview = ({ data }) => (
  <div className="bg-gray-100 dark:bg-gray-800 p-4 rounded-md">
    <pre className="text-sm overflow-x-auto h-96">
      {`<?xml version="1.0" encoding="UTF-8"?>
<xbrl 
  xmlns="http://www.xbrl.org/2003/instance" 
  xmlns:link="http://www.xbrl.org/2003/linkbase" 
  xmlns:xlink="http://www.w3.org/1999/xlink" 
  xmlns:iso4217="http://www.xbrl.org/2003/iso4217" 
  xmlns:acra-sg="http://www.acra.gov.sg/taxonomy/2022-02-15">

  <!-- Document Information -->
  <link:schemaRef xlink:type="simple" xlink:href="http://www.acra.gov.sg/taxonomy/2022-02-15/sg-cia-2014-full-fas.xsd"/>
  
  <!-- Context Definitions -->
  <context id="CurrentYearInstant">
    <entity>
      <identifier scheme="http://www.acra.gov.sg">${data.FilingInformation.UniqueEntityNumber}</identifier>
    </entity>
    <period>
      <instant>${data.FilingInformation.CurrentPeriodEndDate}</instant>
    </period>
  </context>
  
  <context id="PreviousYearInstant">
    <entity>
      <identifier scheme="http://www.acra.gov.sg">${data.FilingInformation.UniqueEntityNumber}</identifier>
    </entity>
    <period>
      <instant>${data.FilingInformation.PreviousPeriodEndDate}</instant>
    </period>
  </context>
  
  <context id="CurrentYearDuration">
    <entity>
      <identifier scheme="http://www.acra.gov.sg">${data.FilingInformation.UniqueEntityNumber}</identifier>
    </entity>
    <period>
      <startDate>${data.FilingInformation.CurrentPeriodStartDate}</startDate>
      <endDate>${data.FilingInformation.CurrentPeriodEndDate}</endDate>
    </period>
  </context>
  
  <!-- Unit Definitions -->
  <unit id="SGD">
    <measure>iso4217:SGD</measure>
  </unit>
  
  <!-- Filing Information -->
  <acra-sg:NameOfCompany contextRef="CurrentYearInstant">${data.FilingInformation.NameOfCompany}</acra-sg:NameOfCompany>
  <acra-sg:UniqueEntityNumber contextRef="CurrentYearInstant">${data.FilingInformation.UniqueEntityNumber}</acra-sg:UniqueEntityNumber>
  <acra-sg:FinancialYearEnd contextRef="CurrentYearInstant">${data.FilingInformation.FinancialYearEnd}</acra-sg:FinancialYearEnd>
  
  <!-- Statement of Financial Position -->
  <acra-sg:CashAndCashEquivalents contextRef="CurrentYearInstant" unitRef="SGD" decimals="0">${data.StatementOfFinancialPosition.CashAndCashEquivalents.Current}</acra-sg:CashAndCashEquivalents>
  <acra-sg:CashAndCashEquivalents contextRef="PreviousYearInstant" unitRef="SGD" decimals="0">${data.StatementOfFinancialPosition.CashAndCashEquivalents.Previous}</acra-sg:CashAndCashEquivalents>
  
  <acra-sg:TradeAndOtherReceivablesCurrent contextRef="CurrentYearInstant" unitRef="SGD" decimals="0">${data.StatementOfFinancialPosition.TradeAndOtherReceivables.Current}</acra-sg:TradeAndOtherReceivablesCurrent>
  <acra-sg:TradeAndOtherReceivablesCurrent contextRef="PreviousYearInstant" unitRef="SGD" decimals="0">${data.StatementOfFinancialPosition.TradeAndOtherReceivables.Previous}</acra-sg:TradeAndOtherReceivablesCurrent>
  
  <acra-sg:Inventories contextRef="CurrentYearInstant" unitRef="SGD" decimals="0">${data.StatementOfFinancialPosition.Inventories.Current}</acra-sg:Inventories>
  <acra-sg:Inventories contextRef="PreviousYearInstant" unitRef="SGD" decimals="0">${data.StatementOfFinancialPosition.Inventories.Previous}</acra-sg:Inventories>
  
  <acra-sg:PropertyPlantAndEquipment contextRef="CurrentYearInstant" unitRef="SGD" decimals="0">${data.StatementOfFinancialPosition.PropertyPlantAndEquipment.Current}</acra-sg:PropertyPlantAndEquipment>
  <acra-sg:PropertyPlantAndEquipment contextRef="PreviousYearInstant" unitRef="SGD" decimals="0">${data.StatementOfFinancialPosition.PropertyPlantAndEquipment.Previous}</acra-sg:PropertyPlantAndEquipment>
  
  <acra-sg:TotalAssets contextRef="CurrentYearInstant" unitRef="SGD" decimals="0">${data.StatementOfFinancialPosition.TotalAssets.Current}</acra-sg:TotalAssets>
  <acra-sg:TotalAssets contextRef="PreviousYearInstant" unitRef="SGD" decimals="0">${data.StatementOfFinancialPosition.TotalAssets.Previous}</acra-sg:TotalAssets>
  
  <acra-sg:TotalLiabilities contextRef="CurrentYearInstant" unitRef="SGD" decimals="0">${data.StatementOfFinancialPosition.TotalLiabilities.Current}</acra-sg:TotalLiabilities>
  <acra-sg:TotalLiabilities contextRef="PreviousYearInstant" unitRef="SGD" decimals="0">${data.StatementOfFinancialPosition.TotalLiabilities.Previous}</acra-sg:TotalLiabilities>
  
  <acra-sg:TotalEquity contextRef="CurrentYearInstant" unitRef="SGD" decimals="0">${data.StatementOfFinancialPosition.TotalEquity.Current}</acra-sg:TotalEquity>
  <acra-sg:TotalEquity contextRef="PreviousYearInstant" unitRef="SGD" decimals="0">${data.StatementOfFinancialPosition.TotalEquity.Previous}</acra-sg:TotalEquity>
</xbrl>`}
    </pre>
  </div>
);

const sampleMappingData = {
  data: {
    FilingInformation: {
      NameOfCompany: "Sample Singapore Pte Ltd",
      UniqueEntityNumber: "202212345K",
      FinancialYearEnd: "2023-12-31",
      CurrentPeriodStartDate: "2023-01-01",
      CurrentPeriodEndDate: "2023-12-31",
      PreviousPeriodStartDate: "2022-01-01",
      PreviousPeriodEndDate: "2022-12-31"
    },
    StatementOfFinancialPosition: {
      CashAndCashEquivalents: {
        Current: 1250000,
        Previous: 980000
      },
      TradeAndOtherReceivables: {
        Current: 875000,
        Previous: 730000
      },
      Inventories: {
        Current: 625000,
        Previous: 580000
      },
      PropertyPlantAndEquipment: {
        Current: 3750000,
        Previous: 3900000
      },
      IntangibleAssets: {
        Current: 450000,
        Previous: 500000
      },
      TotalAssets: {
        Current: 6950000,
        Previous: 6690000
      },
      TotalLiabilities: {
        Current: 2750000,
        Previous: 3050000
      },
      TotalEquity: {
        Current: 4200000,
        Previous: 3640000
      }
    }
  }
};

const sampleValidationData = {
  errors: [
    {
      type: "Missing required field",
      field: "IntangibleAssetsAmortizationMethod",
      message: "This field is required by ACRA taxonomy 2022.2 when IntangibleAssets are reported"
    }
  ],
  warnings: [
    {
      type: "Format warning",
      field: "CurrentPeriodStartDate",
      message: "Date format should be YYYY-MM-DD"
    },
    {
      type: "Value warning",
      field: "TotalEquity",
      message: "Total Assets - Total Liabilities should equal Total Equity"
    }
  ]
};

const sampleTaggingData = {
  FilingInformation: {
    NameOfCompany: "Sample Singapore Pte Ltd",
    UniqueEntityNumber: "202212345K",
    FinancialYearEnd: "2023-12-31",
    CurrentPeriodStartDate: "2023-01-01",
    CurrentPeriodEndDate: "2023-12-31",
    PreviousPeriodStartDate: "2022-01-01",
    PreviousPeriodEndDate: "2022-12-31"
  },
  StatementOfFinancialPosition: {
    CashAndCashEquivalents: {
      Current: 1250000,
      Previous: 980000
    },
    TradeAndOtherReceivables: {
      Current: 875000,
      Previous: 730000
    },
    Inventories: {
      Current: 625000,
      Previous: 580000
    },
    PropertyPlantAndEquipment: {
      Current: 3750000,
      Previous: 3900000
    },
    IntangibleAssets: {
      Current: 450000,
      Previous: 500000
    },
    TotalAssets: {
      Current: 6950000,
      Previous: 6690000
    },
    TotalLiabilities: {
      Current: 2750000,
      Previous: 3050000
    },
    TotalEquity: {
      Current: 4200000,
      Previous: 3640000
    }
  }
};