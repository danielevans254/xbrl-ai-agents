'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function TestFinancialPage() {
  const [file, setFile] = useState<File | null>(null);
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
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

    try {
      const formData = new FormData();
      formData.append('files', file);

      const response = await fetch('/api/ingest', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to process file');
      }

      setResult(data);

      // Now test with a financial query
      const threadId = data.threadId;
      if (threadId) {
        const queryResponse = await fetch('/api/chat', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            threadId,
            message: "Extract and analyze the financial statements from this annual report. Show me the balance sheet, income statement, and key financial ratios."
          }),
        });

        const queryResult = await queryResponse.json();
        setResult(prev => ({
          ...prev,
          queryResult
        }));
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto py-8">
      <Card className="max-w-2xl mx-auto">
        <CardHeader>
          <CardTitle>Financial Statement Extraction Test</CardTitle>
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

            <Button
              onClick={handleUpload}
              disabled={loading || !file}
              className="w-full"
            >
              {loading ? 'Processing...' : 'Extract Financial Data'}
            </Button>

            {error && (
              <div className="text-red-500 text-sm">{error}</div>
            )}

            {result && (
              <div className="mt-6">
                <h3 className="text-lg font-medium mb-2">Results:</h3>
                <pre className="bg-gray-100 p-4 rounded-md overflow-auto max-h-96">
                  {JSON.stringify(result, null, 2)}
                </pre>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}