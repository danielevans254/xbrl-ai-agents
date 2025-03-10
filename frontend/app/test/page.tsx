'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

type FinancialData = {
  [key: string]: any;
};

type StreamedMessage = {
  messages?: { role: string; content: string }[];
};

export default function TestFinancialPage() {
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [streamedMessages, setStreamedMessages] = useState<StreamedMessage[]>([]);
  const [financialData, setFinancialData] = useState<FinancialData | null>(null);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);

  const requiredSections = [
    'directorsReport',
    'profitAndLoss',
    'financialPosition',
    'changesInEquity',
    'cashFlows',
    'notesToFinancials',
  ];

  const validateFinancialData = (data: FinancialData): string[] => {
    return requiredSections.filter(section => !data.hasOwnProperty(section));
  };

  useEffect(() => {
    if (streamedMessages.length === 0) return;

    try {
      let extractedData: FinancialData | null = null;

      for (const message of streamedMessages.reverse()) {
        const content = message.messages?.[0]?.content;
        if (message.messages?.[0]?.role === 'assistant' && content) {
          const jsonMatch = content.match(/```json\s*([\s\S]*?)\s*```/);
          if (jsonMatch) {
            try {
              extractedData = JSON.parse(jsonMatch[1].trim());
              break;
            } catch (e) {
              console.error('JSON parsing error:', e);
            }
          }
        }
      }

      if (extractedData) {
        const missingSections = validateFinancialData(extractedData);
        setValidationErrors(missingSections);
        setFinancialData(extractedData);
      }
    } catch (err) {
      console.error('Data extraction error:', err);
    }
  }, [streamedMessages]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.length) {
      setFile(e.target.files[0]);
      setError('');
    }
  };

  const handleUpload = async () => {
    if (!file) {
      setError('Please select a file');
      return;
    }

    setLoading(true);
    setError('');
    setFinancialData(null);
    setValidationErrors([]);
    setStreamedMessages([]);

    try {
      const formData = new FormData();
      formData.append('files', file);

      const ingestResponse = await fetch('/api/ingest', {
        method: 'POST',
        body: formData,
      });

      if (!ingestResponse.ok) throw new Error('Failed to process the file');
      const ingestData = await ingestResponse.json();

      if (ingestData.structuredData) {
        const missingSections = validateFinancialData(ingestData.structuredData);
        setValidationErrors(missingSections);
        setFinancialData(ingestData.structuredData);
        return;
      }

      const extractionResponse = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          threadId: ingestData.threadId,
          message: JSON.stringify({
            query:
              "Extract these financial sections: Director's Report, Profit and Loss, Financial Position, Changes in Equity, Cash Flows, Notes to Financials.",
          }),
        }),
      });

      if (!extractionResponse.ok) throw new Error('Failed to extract financial data');

      const reader = extractionResponse.body?.getReader();
      if (!reader) throw new Error('Failed to read stream');

      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });

        const lines = buffer.split('\n\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const eventData = JSON.parse(line.slice(6));
              setStreamedMessages(prev => [...prev, eventData]);
            } catch (e) {
              console.error('Stream parsing error:', e);
            }
          }
        }
      }
    } catch (err: any) {
      setError(err.message || 'An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto py-8">
      <Card className="max-w-3xl mx-auto">
        <CardHeader>
          <CardTitle>Financial Report Extraction</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium mb-2">
                Upload Annual Report (PDF)
              </label>
              <input
                type="file"
                accept=".pdf"
                onChange={handleFileChange}
                className="block w-full text-sm text-gray-500
                  file:mr-4 file:py-2 file:px-4
                  file:rounded-md file:border-0
                  file:text-sm file:font-semibold
                  file:bg-primary file:text-white
                  hover:file:bg-primary/90"
              />
            </div>

            <Button onClick={handleUpload} disabled={loading || !file} className="w-full">
              {loading ? 'Processing...' : 'Extract Financial Data'}
            </Button>

            {error && <div className="text-red-500 text-sm">{error}</div>}

            {financialData && (
              <div className="mt-6 space-y-4">
                <h3 className="text-lg font-medium">Extracted Financial Data</h3>

                {validationErrors.length === 0 ? (
                  <div className="grid grid-cols-1 gap-4">
                    {requiredSections.map(section => (
                      <div key={section} className="bg-gray-50 p-4 rounded-md">
                        <h4 className="font-medium mb-2 capitalize">
                          {section.replace(/([A-Z])/g, ' $1').trim()}
                        </h4>
                        <pre className="whitespace-pre-wrap text-sm overflow-auto max-h-64">
                          {JSON.stringify(financialData[section], null, 2)}
                        </pre>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-red-500">
                    <h4 className="font-semibold mb-2">Missing Required Sections:</h4>
                    <ul className="list-disc ml-5">
                      {validationErrors.map((section, idx) => (
                        <li key={idx}>{section.replace(/([A-Z])/g, ' $1').trim()}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}