import React, { useState, useEffect } from 'react';
import { ChevronDown, AlertCircle, Download, FileText, PieChart, Landmark, Shield, Layout, BarChart2 } from 'lucide-react';
import FrameworkSelector from './framework-selector';
import { processDataByFramework } from '@/lib/acra-data-processor';

export const ACRADataVisualizer = ({ data, title = "ACRA XBRL Data Visualizer", initialFramework = 'sfrs-full' }) => {
  const [viewType, setViewType] = useState('hierarchical');
  const [selectedFramework, setSelectedFramework] = useState(initialFramework);
  const [processedData, setProcessedData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showFrameworkSelector, setShowFrameworkSelector] = useState(false);

  // Create a ref to track if component is mounted
  const isMounted = React.useRef(true);

  // Process data only when framework or data changes
  useEffect(() => {
    // Set mounted status on initial render
    isMounted.current = true;

    // Cleanup function to set mounted status to false when unmounting
    return () => {
      isMounted.current = false;
    };
  }, []);

  // Process data only when framework or data changes
  useEffect(() => {
    if (data) {
      processDataWithFramework();
    }

    // Only run when data or selectedFramework changes
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data, selectedFramework]);

  const processDataWithFramework = () => {
    // Only proceed if the component is still mounted
    if (!isMounted.current) return;

    setIsLoading(true);
    setError(null);

    // Store current framework to prevent race conditions
    const currentFramework = selectedFramework;

    // Add a small delay to show loading state
    const timeoutId = setTimeout(() => {
      // Check again if component is still mounted and framework hasn't changed
      if (!isMounted.current || currentFramework !== selectedFramework) return;

      try {
        const newProcessedData = processDataByFramework(data, selectedFramework);
        setProcessedData(newProcessedData);
      } catch (error) {
        console.error('Error processing data:', error);
        setError('Failed to process data with the selected framework');
      } finally {
        setIsLoading(false);
      }
    }, 300);

    // Clear timeout on cleanup
    return () => clearTimeout(timeoutId);
  };

  const handleFrameworkChange = (frameworkId) => {
    setSelectedFramework(frameworkId);
    setShowFrameworkSelector(false);
  };

  const toggleFrameworkSelector = () => {
    setShowFrameworkSelector(prev => !prev);
  };

  const handleExportData = () => {
    if (!processedData) return;

    try {
      const jsonString = JSON.stringify(processedData, null, 2);
      const dataBlob = new Blob([jsonString], { type: 'application/json' });
      const url = URL.createObjectURL(dataBlob);

      const link = document.createElement('a');
      link.href = url;
      link.download = `${title.replace(/\s+/g, '-').toLowerCase()}-${selectedFramework}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Export failed:', error);
    }
  };

  const getFrameworkIcon = () => {
    switch (selectedFramework) {
      case 'sfrs-full':
        return <Layout className="h-5 w-5" />;
      case 'financial-statements':
        return <FileText className="h-5 w-5" />;
      case 'sfrs-simplified':
        return <PieChart className="h-5 w-5" />;
      case 'compliance-focused':
        return <AlertCircle className="h-5 w-5" />;
      case 'analytical':
        return <BarChart2 className="h-5 w-5" />;
      case 'industry-banking':
        return <Landmark className="h-5 w-5" />;
      case 'industry-insurance':
        return <Shield className="h-5 w-5" />;
      default:
        return <Layout className="h-5 w-5" />;
    }
  };

  const getFrameworkName = () => {
    switch (selectedFramework) {
      case 'sfrs-full':
        return 'SFRS Full XBRL';
      case 'financial-statements':
        return 'Financial Statements';
      case 'sfrs-simplified':
        return 'SFRS Simplified';
      case 'compliance-focused':
        return 'Compliance Focus';
      case 'analytical':
        return 'Analytical View';
      case 'industry-banking':
        return 'Banking Industry';
      case 'industry-insurance':
        return 'Insurance Industry';
      case 'regulatory-reporting':
        return 'Regulatory Reporting';
      default:
        return 'Default View';
    }
  };

  const renderTableRows = (data, depth = 0, path = []) => {
    if (!data || typeof data !== 'object') return null;

    return Object.entries(data).map(([key, value]) => {
      const currentPath = [...path, key];
      const isObject = value !== null && typeof value === 'object' && !Array.isArray(value);
      const isArray = Array.isArray(value);

      if (key === '_frameworkMetadata') return null;

      if (isObject && Object.keys(value).length === 0) {
        return (
          <tr key={currentPath.join('.')}>
            <td className="pl-4 py-2 border-b border-gray-200 dark:border-gray-700" style={{ paddingLeft: `${depth * 16 + 16}px` }}>
              <span className="font-medium text-gray-700 dark:text-gray-300">{key}</span>
            </td>
            <td className="px-4 py-2 border-b border-gray-200 dark:border-gray-700">
              <span className="text-gray-500 dark:text-gray-400 italic">Empty object</span>
            </td>
          </tr>
        );
      }

      if (isObject) {
        return [
          <tr key={currentPath.join('.')}>
            <td className="pl-4 py-2 border-b border-gray-200 dark:border-gray-700" style={{ paddingLeft: `${depth * 16 + 16}px` }}>
              <span className="font-medium text-gray-800 dark:text-gray-200">{key}</span>
            </td>
            <td className="px-4 py-2 border-b border-gray-200 dark:border-gray-700"></td>
          </tr>,
          renderTableRows(value, depth + 1, currentPath)
        ];
      }

      if (isArray) {
        return [
          <tr key={currentPath.join('.')}>
            <td className="pl-4 py-2 border-b border-gray-200 dark:border-gray-700" style={{ paddingLeft: `${depth * 16 + 16}px` }}>
              <span className="font-medium text-gray-800 dark:text-gray-200">{key} (Array)</span>
            </td>
            <td className="px-4 py-2 border-b border-gray-200 dark:border-gray-700">
              <span className="text-gray-500 dark:text-gray-400">[{value.length} items]</span>
            </td>
          </tr>
        ];
      }

      return (
        <tr key={currentPath.join('.')}>
          <td className="pl-4 py-2 border-b border-gray-200 dark:border-gray-700" style={{ paddingLeft: `${depth * 16 + 16}px` }}>
            <span className="font-medium text-gray-700 dark:text-gray-300">{key}</span>
          </td>
          <td className="px-4 py-2 border-b border-gray-200 dark:border-gray-700">
            {value === null || value === undefined ? (
              <span className="text-gray-500 dark:text-gray-400 italic">null</span>
            ) : value === '' ? (
              <span className="text-gray-500 dark:text-gray-400 italic">empty string</span>
            ) : typeof value === 'boolean' ? (
              <span className={value ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}>
                {value.toString()}
              </span>
            ) : typeof value === 'number' ? (
              <span className="text-blue-600 dark:text-blue-400">{value.toLocaleString()}</span>
            ) : (
              <span className="text-gray-800 dark:text-gray-200">{value.toString()}</span>
            )}
          </td>
        </tr>
      );
    });
  };

  const renderHierarchicalView = () => {
    if (!processedData) return null;

    return (
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
          <thead className="bg-gray-50 dark:bg-gray-800">
            <tr>
              <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Field
              </th>
              <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Value
              </th>
            </tr>
          </thead>
          <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-800">
            {renderTableRows(processedData)}
          </tbody>
        </table>
      </div>
    );
  };

  const renderJsonView = () => {
    if (!processedData) return null;

    return (
      <div className="overflow-x-auto">
        <pre className="bg-gray-50 dark:bg-gray-850 p-4 rounded-md text-sm font-mono overflow-auto max-h-[70vh]">
          <code className="text-gray-800 dark:text-gray-200">
            {JSON.stringify(processedData, null, 2)}
          </code>
        </pre>
      </div>
    );
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
        <span className="ml-2 text-gray-600 dark:text-gray-400">Processing {getFrameworkName()} view...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 text-center">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-red-100 text-red-500 mb-4">
          <AlertCircle size={32} />
        </div>
        <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">Processing Error</h3>
        <p className="text-gray-500 dark:text-gray-400">{error}</p>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow border border-gray-200 dark:border-gray-700">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
        <div className="mb-4 sm:mb-0">
          <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-200">{title}</h2>
          {processedData?._frameworkMetadata?.description && (
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              {processedData._frameworkMetadata.description}
            </p>
          )}
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            onClick={toggleFrameworkSelector}
            className="flex items-center gap-2 rounded-lg bg-indigo-50 px-3 py-1.5 text-sm font-medium text-indigo-700 transition-all hover:bg-indigo-100 dark:bg-indigo-900/20 dark:text-indigo-300 dark:hover:bg-indigo-900/30"
          >
            {getFrameworkIcon()}
            <span>Framework: {getFrameworkName()}</span>
            <ChevronDown className="h-4 w-4 ml-1" />
          </button>

          <button
            onClick={handleExportData}
            className="flex items-center gap-2 rounded-lg bg-emerald-50 px-3 py-1.5 text-sm font-medium text-emerald-700 transition-all hover:bg-emerald-100 dark:bg-emerald-900/20 dark:text-emerald-300 dark:hover:bg-emerald-900/30"
          >
            <Download size={16} />
            <span>Export</span>
          </button>
        </div>
      </div>

      {showFrameworkSelector && (
        <div className="p-4 bg-indigo-50/60 dark:bg-indigo-900/10 border-b border-indigo-100 dark:border-indigo-800/30">
          <div className="mb-3">
            <h3 className="text-sm font-medium text-indigo-800 dark:text-indigo-300">
              Select Framework View
            </h3>
            <p className="text-xs text-indigo-600 dark:text-indigo-400 mt-1">
              Choose how to visualize your XBRL data based on different frameworks
            </p>
          </div>
          <FrameworkSelector
            onFrameworkChange={handleFrameworkChange}
            initialFramework={selectedFramework}
          />
        </div>
      )}

      <div className="p-4">
        <div className="flex space-x-2 mb-4 border-b border-gray-200 dark:border-gray-700">
          <button
            onClick={() => setViewType('hierarchical')}
            className={`px-4 py-2 text-sm font-medium ${viewType === 'hierarchical'
                ? 'border-b-2 border-blue-500 text-blue-600 dark:text-blue-400'
                : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
              }`}
          >
            Table View
          </button>
          <button
            onClick={() => setViewType('json')}
            className={`px-4 py-2 text-sm font-medium ${viewType === 'json'
                ? 'border-b-2 border-blue-500 text-blue-600 dark:text-blue-400'
                : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
              }`}
          >
            JSON View
          </button>
        </div>

        {viewType === 'hierarchical' ? renderHierarchicalView() : renderJsonView()}
      </div>
    </div>
  );
}