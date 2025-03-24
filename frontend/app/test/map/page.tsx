'use client';
import React, { useState, useEffect } from 'react';

const MappingTestPage = () => {
  // State for handling the response and loading state
  const [response, setResponse] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  const threadId = 'f2b418ef-c446-4029-bd18-ba5f8b9fada0';

  const [apiInfo, setApiInfo] = useState({
    baseUrl: '',
    fullUrl: '',
    available: null
  });

  useEffect(() => {
    const baseUrl = window.location.origin;
    const fullUrl = `${baseUrl}/api/map?threadId=${threadId}`;

    setApiInfo({
      baseUrl,
      fullUrl,
      available: null
    });
  }, []);

  const handleMap = async () => {
    setIsLoading(true);
    setError(null);
    setResponse(null);

    try {
      const result = await fetch(`/api/map?threadId=${threadId}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        }
      });

      const contentType = result.headers.get('content-type');

      if (contentType && contentType.includes('application/json')) {
        const data = await result.json();

        if (!result.ok) {
          throw new Error(data.message || `Error ${result.status}: ${result.statusText}`);
        }

        setResponse(data);
      } else {
        const textResponse = await result.text();
        const statusInfo = `Status: ${result.status} ${result.statusText}`;
        const shortText = textResponse.substring(0, 150) + '...';

        throw new Error(
          `Received non-JSON response (${contentType || 'unknown content type'}). ${statusInfo}\n\nResponse preview: ${shortText}`
        );
      }
    } catch (err) {
      console.error('Mapping error:', err);
      setError(err.message);

      if (err.message.includes('not valid JSON')) {
        console.error('JSON parsing error. This usually happens when receiving HTML instead of JSON.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const testEndpoint = async () => {
    try {
      setIsLoading(true);
      const result = await fetch('/api/map', { method: 'HEAD' });

      const available = result.status !== 404;
      setApiInfo(prev => ({
        ...prev,
        available
      }));

      setError(available ? null : `API endpoint returned status: ${result.status} ${result.statusText}`);
    } catch (err) {
      setApiInfo(prev => ({
        ...prev,
        available: false
      }));
      setError(`API endpoint error: ${err.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6">
      <h1 className="text-2xl font-bold mb-4">Mapping API Test Page</h1>

      <div className="mb-6">
        <p className="mb-2">Thread ID: <span className="font-mono">{threadId}</span> (hardcoded for testing)</p>
        <div className="flex space-x-2">
          <button
            onClick={handleMap}
            disabled={isLoading}
            className={`px-4 py-2 rounded text-white font-medium ${isLoading ? 'bg-gray-400 cursor-not-allowed' : 'bg-green-600 hover:bg-green-700'
              }`}
          >
            {isLoading ? 'Mapping...' : 'Map'}
          </button>
          <button
            onClick={testEndpoint}
            className="px-4 py-2 rounded bg-blue-500 hover:bg-blue-600 text-white font-medium"
          >
            Test API Endpoint
          </button>
        </div>
      </div>

      {isLoading && (
        <div className="bg-blue-100 border-l-4 border-blue-500 text-blue-700 p-4 mb-4">
          Mapping in progress...
        </div>
      )}

      {error && (
        <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 mb-4">
          Error: {error}
        </div>
      )}

      {response && !error && !isLoading && (
        <div className="bg-green-100 border-l-4 border-green-500 text-green-700 p-4 mb-4">
          Mapping completed successfully!
        </div>
      )}

      <div className="mb-6">
        <h2 className="text-xl font-semibold mb-2">API Information:</h2>
        <div className="bg-gray-100 p-4 rounded">
          <p><strong>Base URL:</strong> <span className="font-mono">{apiInfo.baseUrl}</span></p>
          <p><strong>API Endpoint:</strong> <span className="font-mono">{apiInfo.fullUrl}</span></p>
          {apiInfo.available !== null && (
            <p>
              <strong>Endpoint Status:</strong>
              <span className={apiInfo.available ? 'text-green-600' : 'text-red-600'}>
                {apiInfo.available ? ' Available' : ' Not Available'}
              </span>
            </p>
          )}
        </div>
      </div>

      <div>
        <h2 className="text-xl font-semibold mb-2">Response:</h2>
        <pre className="bg-gray-100 p-4 rounded overflow-auto max-h-96">
          {response
            ? JSON.stringify(response, null, 2)
            : error
              ? JSON.stringify({ error }, null, 2)
              : "No data yet. Click the Map button to start."}
        </pre>
      </div>
    </div>
  );
};

export default MappingTestPage;