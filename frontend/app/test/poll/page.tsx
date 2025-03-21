'use client';

import React, { useState, useEffect } from 'react';
import { SessionManager, ExtractedDataManager } from '@/lib/sessionManager';
import { CheckCircle, Circle, Clock, Database, Loader, RefreshCcw } from 'lucide-react';

interface ExtractedData {
  id: number;
  thread_id: string;
  data: {
    notes: {
      revenue: Record<string, number>;
      tradeAndOtherPayables: Record<string, number>;
      tradeAndOtherReceivables: Record<string, number>;
    };
    auditReport: Record<string, any>;
    incomeStatement: Record<string, any>;
    filingInformation: Record<string, any>;
    directorsStatement: Record<string, any>;
    statementOfFinancialPosition: Record<string, any>;
  };
  created_at: string;
  updated_at: string;
}

const DataExtractionTestPage = () => {
  // State variables
  const [threadId, setThreadId] = useState<string>('');
  const [data, setData] = useState<ExtractedData[] | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<Error | null>(null);
  const [pollingActive, setPollingActive] = useState<boolean>(false);
  const [pollingAttempts, setPollingAttempts] = useState<number>(0);
  const [sessionData, setSessionData] = useState<any>(null);
  const [statusMessage, setStatusMessage] = useState<string>('');
  const [showJsonView, setShowJsonView] = useState<boolean>(false);

  useEffect(() => {
    const storedSession = SessionManager.loadSession();
    if (storedSession) {
      setSessionData(storedSession);
      setThreadId(storedSession.threadId || '');
    }
  }, []);

  const handleCreateSession = () => {
    if (!threadId || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(threadId)) {
      setError(new Error('Please enter a valid UUID format for the thread ID'));
      return;
    }

    const mockData = { status: 'processing', timestamp: new Date().toISOString() };
    SessionManager.saveSession(threadId, mockData);
    setSessionData(SessionManager.loadSession());
    setStatusMessage('Session created successfully');
    setError(null);
  };

  // Function to clear the session
  const handleClearSession = () => {
    SessionManager.clearSession();
    setSessionData(null);
    setThreadId('');
    setData(null);
    setError(null);
    setStatusMessage('Session cleared');
    setPollingActive(false);
    setPollingAttempts(0);
  };

  const handleFetchData = async () => {
    if (!threadId) {
      setError(new Error('Please enter a valid thread ID'));
      return;
    }

    setLoading(true);
    setError(null);
    setData(null);

    try {
      const response = await ExtractedDataManager.getExtractedData(threadId);
      setLoading(false);

      if (response.success && response.data && response.data.length > 0) {
        setData(response.data);
        setStatusMessage('Data fetched successfully');
      } else {
        setStatusMessage(`No data found (Count: ${response.meta.count})`);
      }
    } catch (err) {
      setLoading(false);
      setError(err instanceof Error ? err : new Error('Failed to fetch data'));
      setStatusMessage('Error fetching data');
    }
  };

  const handleStartPolling = () => {
    if (!threadId) {
      setError(new Error('Please enter a valid thread ID'));
      return;
    }

    if (!sessionData || sessionData.threadId !== threadId) {
      handleCreateSession();
    }

    setLoading(true);
    setError(null);
    setPollingActive(true);
    setPollingAttempts(0);
    setStatusMessage('Polling started...');

    let attempts = 0;
    const maxAttempts = 20;

    const pollingInterval = setInterval(() => {
      if (attempts >= maxAttempts) {
        clearInterval(pollingInterval);
        setPollingActive(false);
        setLoading(false);
        setStatusMessage('Polling completed: No data found after maximum attempts');
        return;
      }

      attempts++;
      setPollingAttempts(attempts);

      ExtractedDataManager.getExtractedData(threadId)
        .then((response) => {
          if (response.success && response.data && response.data.length > 0) {
            clearInterval(pollingInterval);
            setData(response.data);
            setPollingActive(false);
            setLoading(false);
            setStatusMessage('Data found through polling');
          } else {
            setStatusMessage(`Polling... (Attempt ${attempts}/${maxAttempts})`);
          }
        })
        .catch((err) => {
          setError(err instanceof Error ? err : new Error('Polling error'));
          setStatusMessage(`Error during polling: ${err.message}`);
        });
    }, 3000);

    // Cleanup function
    return () => {
      clearInterval(pollingInterval);
    };
  };

  const handleStopPolling = () => {
    setPollingActive(false);
    setStatusMessage('Polling stopped manually');
  };

  const formatJson = (obj: any) => {
    return JSON.stringify(obj, null, 2);
  };

  return (
    <div className="max-w-4xl mx-auto p-6 bg-white rounded-lg shadow-lg">
      <h1 className="text-2xl font-bold mb-6">Data Extraction Testing</h1>

      {/* Thread ID Input */}
      <div className="mb-6">
        <label className="block text-sm font-medium mb-2">Thread ID:</label>
        <div className="flex">
          <input
            type="text"
            value={threadId}
            onChange={(e) => setThreadId(e.target.value)}
            placeholder="e.g. 9cbe787b-a57c-4e31-aac8-75db6331498a"
            className="flex-1 px-3 py-2 border border-gray-300 rounded-l-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button
            onClick={handleCreateSession}
            className="px-4 py-2 bg-green-600 text-white rounded-r-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500"
          >
            Save Session
          </button>
        </div>
      </div>

      {/* Status and Controls */}
      <div className="mb-6 p-4 bg-gray-50 rounded-md">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">Status</h2>
          <div className="flex space-x-2">
            <button
              onClick={handleFetchData}
              disabled={loading}
              className="px-3 py-1.5 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 flex items-center"
            >
              <Database className="mr-1" /> Fetch Once
            </button>
            {!pollingActive ? (
              <button
                onClick={handleStartPolling}
                disabled={loading}
                className="px-3 py-1.5 bg-purple-600 text-white rounded-md hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-purple-500 disabled:opacity-50 flex items-center"
              >
                <RefreshCcw className="mr-1" /> Start Polling
              </button>
            ) : (
              <button
                onClick={handleStopPolling}
                className="px-3 py-1.5 bg-red-600 text-white rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 flex items-center"
              >
                <Circle className="mr-1" /> Stop Polling
              </button>
            )}
            <button
              onClick={handleClearSession}
              className="px-3 py-1.5 bg-gray-600 text-white rounded-md hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-500 flex items-center"
            >
              Clear Session
            </button>
          </div>
        </div>

        {/* Status Indicators */}
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-white p-3 rounded-md border border-gray-200">
            <div className="text-sm text-gray-500 mb-1">Session Status:</div>
            <div className="flex items-center">
              {sessionData ? (
                <><CheckCircle className="text-green-500 mr-2" /> Active</>
              ) : (
                <><Circle className="text-red-500 mr-2" /> Not Active</>
              )}
            </div>
          </div>

          <div className="bg-white p-3 rounded-md border border-gray-200">
            <div className="text-sm text-gray-500 mb-1">Polling Status:</div>
            <div className="flex items-center">
              {pollingActive ? (
                <><Loader className="text-blue-500 mr-2 animate-spin" /> Active (Attempt: {pollingAttempts}/20)</>
              ) : (
                <><Circle className="text-gray-500 mr-2" /> Inactive</>
              )}
            </div>
          </div>

          <div className="bg-white p-3 rounded-md border border-gray-200 col-span-2">
            <div className="text-sm text-gray-500 mb-1">Message:</div>
            <div className={`${error ? 'text-red-600' : 'text-gray-800'}`}>
              {statusMessage || 'Ready'}
            </div>
            {error && <div className="text-red-600 text-sm mt-1">{error.message}</div>}
          </div>
        </div>
      </div>

      {/* Session Data Display */}
      {sessionData && (
        <div className="mb-6">
          <div className="flex justify-between items-center mb-2">
            <h2 className="text-lg font-semibold">Current Session</h2>
          </div>
          <div className="bg-gray-50 p-4 rounded-md overflow-auto max-h-40">
            <pre className="text-xs text-gray-800">{formatJson(sessionData)}</pre>
          </div>
        </div>
      )}

      {/* Results */}
      <div className="mb-6">
        <div className="flex justify-between items-center mb-2">
          <h2 className="text-lg font-semibold">Extracted Data</h2>
          {data && (
            <button
              onClick={() => setShowJsonView(!showJsonView)}
              className="text-sm px-2 py-1 bg-gray-200 rounded hover:bg-gray-300"
            >
              {showJsonView ? "Show Summary" : "Show JSON"}
            </button>
          )}
        </div>

        {loading ? (
          <div className="bg-white p-8 rounded-md border border-gray-200 flex items-center justify-center">
            <RefreshCcw className="animate-spin text-blue-500 mr-2" />
            <span>Loading data...</span>
          </div>
        ) : data ? (
          showJsonView ? (
            <div className="bg-gray-50 p-4 rounded-md overflow-auto max-h-96">
              <pre className="text-xs text-gray-800">{formatJson(data)}</pre>
            </div>
          ) : (
            <div className="bg-white p-4 rounded-md border border-gray-200">
              <div className="grid grid-cols-2 gap-4">
                <DataSummaryCard
                  title="Company Information"
                  data={data[0]?.data?.filingInformation}
                />
                <DataSummaryCard
                  title="Financial Position"
                  data={{
                    Assets: data[0]?.data?.statementOfFinancialPosition?.Assets,
                    Liabilities: data[0]?.data?.statementOfFinancialPosition?.Liabilities,
                    Equity: data[0]?.data?.statementOfFinancialPosition?.equity?.Equity,
                  }}
                />
                <DataSummaryCard
                  title="Revenue Breakdown"
                  data={data[0]?.data?.notes?.revenue}
                />
                <DataSummaryCard
                  title="Income Statement"
                  data={{
                    Revenue: data[0]?.data?.incomeStatement?.Revenue,
                    ProfitLoss: data[0]?.data?.incomeStatement?.ProfitLoss,
                    FinanceCosts: data[0]?.data?.incomeStatement?.FinanceCosts,
                  }}
                />
              </div>
            </div>
          )
        ) : (
          <div className="bg-white p-8 rounded-md border border-gray-200 text-center text-gray-500">
            No data available. Use the controls above to fetch or poll for data.
          </div>
        )}
      </div>
    </div>
  );
};

const DataSummaryCard = ({ title, data }: { title: string; data: any }) => {
  if (!data) return null;

  return (
    <div className="bg-gray-50 p-3 rounded-md">
      <h3 className="font-medium text-sm mb-2 text-gray-700">{title}</h3>
      <div className="space-y-1">
        {Object.entries(data).map(([key, value]) => (
          <div key={key} className="text-xs flex justify-between">
            <span className="text-gray-600">{key}:</span>
            <span className="font-medium">
              {typeof value === 'number'
                ? value.toLocaleString()
                : String(value)}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};

export default DataExtractionTestPage;