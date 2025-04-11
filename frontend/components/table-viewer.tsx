// Complete TableView component with snake_case field name preservation

import React, { useMemo, memo, useCallback } from 'react';

const TableView = memo(({ data, title = "Data Viewer" }) => {
  // First, check what data format we're dealing with
  const detectDataFormat = useMemo(() => {
    console.log("TableView received data:", data);

    if (!data) return { data: null, format: 'unknown' };

    // Check for nested data structures (mapped_data)
    if (data.mapped_data) {
      console.log("TableView found mapped_data structure");
      return detectDataFormat(data.mapped_data);
    }

    // Check for other nested structures
    if (data.data) {
      if (data.data.mapped_data) {
        console.log("TableView found data.mapped_data structure");
        return detectDataFormat(data.data.mapped_data);
      }
      console.log("TableView found data structure");
      return detectDataFormat(data.data);
    }

    // Check if data uses snake_case (e.g., filing_information) format
    if (data.filing_information || data.audit_report || data.directors_statement) {
      console.log("TableView detected snake_case format");
      return { data, format: 'snake_case' };
    }

    // Check if data uses camelCase (e.g., filingInformation) format
    if (data.filingInformation || data.auditReport || data.directorsStatement) {
      console.log("TableView detected camelCase format");
      return { data, format: 'camelCase' };
    }

    return { data, format: 'unknown' };
  }, [data]);

  // Use the detected data format
  const { data: extractedData, format } = detectDataFormat;

  // Filter out any metadata properties
  const filteredData = useMemo(() => {
    if (!extractedData) return null;

    const result = { ...extractedData };

    Object.keys(result).forEach(key => {
      if (key.startsWith('_')) {
        delete result[key];
      }
    });

    console.log("TableView filtered data:", result);
    return result;
  }, [extractedData]);

  const formatLabel = useCallback((text) => {
    if (!text) return '';

    // Special case: Don't transform revenue_from_x fields and similar patterns
    // if (text.includes('_from_') ||
    //   text.includes('_to_') ||
    //   text.includes('_in_') ||
    //   text.includes('_over_') ||
    //   text.includes('_due_') ||
    //   text.startsWith('total_') ||
    //   text.startsWith('other_')) {
    //   return text; // Keep original format
    // }

    // Handle camelCase
    const deCamel = text.replace(/([A-Z])/g, ' $1').trim();

    // Handle snake_case
    const deSnake = deCamel.replace(/_/g, ' ');

    // Capitalize first letter of each word
    return deSnake
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ');
  }, []);

  // Format value for display
  const formatValue = useCallback((value) => {
    if (value === null || value === undefined) return '—';
    if (value === '') return '—';

    if (typeof value === 'boolean') return value ? 'Yes' : 'No';
    if (typeof value === 'number') {
      // Return '0' for zero values instead of treating them as empty
      if (value === 0) return '0';

      // Format numbers with commas
      return new Intl.NumberFormat('en-US', {
        minimumFractionDigits: 0,
        maximumFractionDigits: 2
      }).format(value);
    }

    if (Array.isArray(value)) {
      return value.length === 0 ? '[]' : `[${value.length} items]`;
    }

    if (typeof value === 'object' && value !== null) {
      const keys = Object.keys(value);
      return keys.length === 0 ? '{}' : `{${keys.length} properties}`;
    }

    return String(value);
  }, []);

  // Determine text color based on value type and value
  const getValueClass = useCallback((value) => {
    if (typeof value === 'number') {
      if (value < 0) return 'text-red-600 dark:text-red-400';
      if (value > 0) return 'text-blue-600 dark:text-blue-400';
      return 'text-gray-600 dark:text-gray-400';
    }

    if (typeof value === 'boolean') {
      return value ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400';
    }

    return 'text-gray-600 dark:text-gray-400';
  }, []);

  // Check if an object has nested objects
  const hasNestedObjects = useCallback((obj) => {
    if (!obj || typeof obj !== 'object') return false;
    return Object.values(obj).some(value =>
      value !== null && typeof value === 'object' && !Array.isArray(value)
    );
  }, []);

  // Process section component for rendering
  const ProcessSection = ({ sectionData, sectionKey = '' }) => {
    // Handle non-object data
    if (!sectionData || typeof sectionData !== 'object') {
      return (
        <div className="grid grid-cols-2 gap-4 px-6 py-3 border-b last:border-0 border-gray-100 dark:border-gray-800">
          <div className="text-sm font-medium text-gray-700 dark:text-gray-300">
            {formatLabel(sectionKey)}
          </div>
          <div className={`text-sm font-mono ${getValueClass(sectionData)}`}>
            {formatValue(sectionData)}
          </div>
        </div>
      );
    }

    // Check if this section contains nested objects
    const hasNested = hasNestedObjects(sectionData);

    // If this is a leaf section (no nested objects)
    if (!hasNested) {
      return (
        <div className="mb-6 last:mb-0">
          {sectionKey && (
            <div className="bg-gray-50 dark:bg-gray-800 px-6 py-4 rounded-t-lg border-b border-gray-200 dark:border-gray-700">
              <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200">
                {formatLabel(sectionKey)}
              </h3>
            </div>
          )}
          <div className="bg-white dark:bg-gray-900 rounded-b-lg">
            {Object.entries(sectionData).map(([key, value]) => (
              <div
                key={key}
                className="grid grid-cols-2 gap-4 px-6 py-3 border-b last:border-0 border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/50"
              >
                <div className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  {formatLabel(key)}
                </div>
                <div className={`text-sm font-mono ${getValueClass(value)}`}>
                  {formatValue(value)}
                </div>
              </div>
            ))}
          </div>
        </div>
      );
    }

    // For sections with nested objects, recursively process them
    return (
      <div className="mb-8 last:mb-0">
        {sectionKey && (
          <div className="bg-gray-50 dark:bg-gray-800 px-6 py-4 rounded-t-lg border-b border-gray-200 dark:border-gray-700">
            <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200">
              {formatLabel(sectionKey)}
            </h3>
          </div>
        )}
        <div className={`${sectionKey ? 'bg-white dark:bg-gray-900 rounded-b-lg' : ''} p-4`}>
          {Object.entries(sectionData).map(([key, value]) => {
            // Recursively render nested objects
            if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
              return <ProcessSection key={key} sectionData={value} sectionKey={key} />;
            }

            // Render simple values directly
            return (
              <div
                key={key}
                className="grid grid-cols-2 gap-4 px-6 py-3 border-b last:border-0 border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/50"
              >
                <div className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  {formatLabel(key)}
                </div>
                <div className={`text-sm font-mono ${getValueClass(value)}`}>
                  {formatValue(value)}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  // No data message
  const renderNoDataMessage = () => (
    <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
      <div className="text-amber-500 mb-4 text-5xl">⚠️</div>
      <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">No Data to Display</h3>
      <p className="text-sm text-gray-500 dark:text-gray-400 max-w-md">
        There is no data available to show in this view. Try switching to a different framework or view type.
      </p>
    </div>
  );

  return (
    <div className="w-full rounded-lg overflow-hidden bg-white dark:bg-gray-900 shadow">
      <div className="p-6 space-y-6">
        {!filteredData ? renderNoDataMessage() : <ProcessSection sectionData={filteredData} />}
      </div>
    </div>
  );
});

TableView.displayName = 'TableView';

export default TableView;