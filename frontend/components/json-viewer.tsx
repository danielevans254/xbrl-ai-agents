// Update your JsonViewer component with this fix:

import React, { useState, useMemo } from 'react';
import { ChevronRight, ChevronDown, Copy, Check } from 'lucide-react';

const JsonViewer = ({ data, initialExpanded = false, maxInitialDepth = 2 }) => {
  const [copied, setCopied] = useState(false);

  // First, check what data format we're dealing with
  const extractedData = useMemo(() => {
    console.log("JsonViewer received data:", data);

    if (!data) return null;

    // Check for nested data structures (mapped_data)
    if (data.mapped_data) {
      console.log("JsonViewer found mapped_data structure");
      return data.mapped_data;
    }

    // Check for other nested structures
    if (data.data) {
      if (data.data.mapped_data) {
        console.log("JsonViewer found data.mapped_data structure");
        return data.data.mapped_data;
      }
      console.log("JsonViewer found data structure");
      return data.data;
    }

    // No nested structure, use the data as is
    return data;
  }, [data]);

  if (!extractedData) {
    return (
      <div className="bg-white dark:bg-gray-900 p-6 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm">
        <div className="text-center text-gray-500 dark:text-gray-400 py-8">
          No data available to display
        </div>
      </div>
    );
  }

  const copyToClipboard = () => {
    navigator.clipboard.writeText(JSON.stringify(extractedData, null, 2));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // The rest of your JsonViewer component rendering using extractedData
  return (
    <div className="bg-white dark:bg-gray-900 p-6 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-sm font-medium text-gray-700 dark:text-gray-200 flex items-center">
          <span className="bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-300 w-5 h-5 rounded flex items-center justify-center mr-2 text-xs">{`{}`}</span>
          JSON Data
        </h3>
        <button
          onClick={copyToClipboard}
          className="flex items-center gap-1.5 text-xs px-2 py-1 rounded-md bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
        >
          {copied ? (
            <>
              <Check className="h-3.5 w-3.5" />
              <span>Copied</span>
            </>
          ) : (
            <>
              <Copy className="h-3.5 w-3.5" />
              <span>Copy</span>
            </>
          )}
        </button>
      </div>
      <div className="overflow-auto max-h-[70vh] pr-2 custom-scrollbar">
        <pre className="text-sm overflow-auto whitespace-pre-wrap break-words">
          <code className="text-gray-800 dark:text-gray-200">
            {JSON.stringify(extractedData, null, 2)}
          </code>
        </pre>
      </div>
    </div>
  );
};

export default JsonViewer;