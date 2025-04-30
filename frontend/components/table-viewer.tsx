// Enhanced TableView component with improved array rendering

import React, { useMemo, memo, useCallback } from 'react';

const TableView = memo(({ data, title = "Data Viewer" }) => {
  // Debug log to help diagnose rendering issues
  console.log("TableView data:", typeof data, Array.isArray(data) ? 'Array' : typeof data === 'object' ? 'Object' : 'Other');
  // First, check what data format we're dealing with
  const detectDataFormat = useMemo(() => {
    if (!data) return { data: null, format: 'unknown' };

    // Handle functions or non-serializable data
    if (typeof data === 'function') {
      return { data: { value: 'Function' }, format: 'primitive' };
    }

    // Handle primitive types directly
    if (typeof data !== 'object' || data === null) {
      return { data: { value: data }, format: 'primitive' };
    }

    // Handle array data type as top priority
    if (Array.isArray(data)) {
      return { data, format: 'array' };
    }

    for (const key in data) {
      if (Array.isArray(data[key])) {
        return { data, format: 'object' };
      }
    }

    // Check for nested data structures (mapped_data)
    if (data.mapped_data) {
      return { data: data.mapped_data, format: 'object' };
    }

    // Check for other nested structures
    if (data.data && typeof data.data === 'object') {
      if (Array.isArray(data.data)) {
        return { data: data.data, format: 'array' };
      }

      if (data.data.mapped_data) {
        return { data: data.data.mapped_data, format: 'object' };
      }
      return { data: data.data, format: 'object' };
    }

    // Check if data uses snake_case (e.g., filing_information) format
    if (data.filing_information || data.audit_report || data.directors_statement) {
      return { data, format: 'snake_case' };
    }

    // Check if data uses camelCase (e.g., filingInformation) format
    if (data.filingInformation || data.auditReport || data.directorsStatement) {
      return { data, format: 'camelCase' };
    }

    // Default to treating as a regular object
    return { data, format: 'object' };
  }, [data]);

  // Use the detected data format
  const { data: extractedData, format } = detectDataFormat;

  // Filter out any metadata properties
  const filteredData = useMemo(() => {
    if (!extractedData) return null;

    // If it's a primitive or array, return as is
    if (format === 'primitive' || format === 'array') {
      return extractedData;
    }

    const result = { ...extractedData };

    Object.keys(result).forEach(key => {
      if (key.startsWith('_')) {
        delete result[key];
      }
    });

    return result;
  }, [extractedData, format]);

  const formatLabel = useCallback((text) => {
    if (!text || typeof text !== 'string') return String(text);

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

  // Format value for display with improved type handling
  const formatValue = useCallback((value) => {
    // Handle null and undefined
    if (value === null || value === undefined) return '—';
    if (value === '') return '—';

    // Handle boolean values
    if (typeof value === 'boolean') return value ? 'Yes' : 'No';

    // Handle numeric values
    if (typeof value === 'number') {
      // Return '0' for zero values
      if (value === 0) return '0';

      // Format numbers with commas
      return new Intl.NumberFormat('en-US', {
        minimumFractionDigits: 0,
        maximumFractionDigits: 2
      }).format(value);
    }

    // Handle Date objects
    if (value instanceof Date) {
      return value.toLocaleString();
    }

    // Handle string representation of tags/items that match "[n items]" pattern
    if (typeof value === 'string' && /^\[\d+ items?\]$/.test(value.trim())) {
      return value; // Return as is, already formatted correctly
    }

    // Handle arrays with improved details
    if (Array.isArray(value)) {
      if (value.length === 0) return '[]';

      // Special case for tags arrays - don't collape them, always show the clickable tag indicator
      if (value.length > 0 && value.some(item =>
        typeof item === 'object' && item !== null && (
          (item.prefix && item.element_name) ||
          (item.element_id) ||
          (item.tag_name)
        ))) {
        // This appears to be a tags array, return special format
        return `[${value.length} ${value.length === 1 ? 'tag' : 'tags'}]`;
      }

      // For small arrays of primitives, show the contents
      if (value.length <= 3 && value.every(item =>
        typeof item !== 'object' || item === null
      )) {
        return `[${value.map(item => formatValue(item)).join(', ')}]`;
      }

      // For tags or item collections, display as "[n items]" format
      return `[${value.length} ${value.length === 1 ? 'item' : 'items'}]`;
    }

    // Handle objects
    if (typeof value === 'object' && value !== null) {
      const keys = Object.keys(value);

      // For small objects with primitive values, show the content
      if (keys.length <= 3 && keys.every(key =>
        typeof value[key] !== 'object' || value[key] === null
      )) {
        const entries = keys.map(key => `${key}: ${formatValue(value[key])}`);
        return `{${entries.join(', ')}}`;
      }

      return keys.length === 0 ? '{}' : `{${keys.length} properties}`;
    }

    // Handle functions
    if (typeof value === 'function') {
      return 'ƒ()';  // Function symbol
    }

    // Handle symbols
    if (typeof value === 'symbol') {
      return value.toString();
    }

    // Default: convert to string
    return String(value);
  }, []);

  // Determine text color based on value type and value
  const getValueClass = useCallback((value) => {
    // Handle null and undefined
    if (value === null || value === undefined || value === '') {
      return 'text-gray-400 dark:text-gray-500';
    }

    // Handle "[n items]" tag format specifically with a purple color and hover effect
    if (typeof value === 'string' && /^\[\d+ items?\]$/.test(value.trim())) {
      return 'text-purple-500 dark:text-purple-400 hover:underline cursor-pointer';
    }

    // Handle numeric values
    if (typeof value === 'number') {
      if (value < 0) return 'text-red-600 font-bold dark:text-red-400';
      if (value > 0) return 'text-blue-600 dark:text-blue-400';
      return 'text-gray-600 dark:text-gray-400';
    }

    // Handle boolean values
    if (typeof value === 'boolean') {
      return value ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400';
    }

    // Handle arrays and objects
    if (typeof value === 'object' && value !== null) {
      if (Array.isArray(value)) {
        return value.length > 0
          ? 'text-purple-600 dark:text-purple-400'
          : 'text-gray-500 dark:text-gray-500';
      }

      return Object.keys(value).length > 0
        ? 'text-indigo-600 dark:text-indigo-400'
        : 'text-gray-500 dark:text-gray-500';
    }

    // Handle function
    if (typeof value === 'function') {
      return 'text-yellow-600 dark:text-yellow-400';
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

  // Check if value is a tags array
  const isTagsArray = useCallback((value) => {
    if (!Array.isArray(value) || value.length === 0) return false;

    // Check if this is a tags array by looking for tag-like properties
    return value.some(item =>
      typeof item === 'object' &&
      item !== null &&
      ((item.prefix && item.element_name) ||
        item.element_id ||
        item.tag_name)
    );
  }, []);

  // Rendering for array data - improved to handle more array types
  const renderArrayData = useCallback((arrayData) => {
    if (!Array.isArray(arrayData) || arrayData.length === 0) {
      return (
        <div className="px-8 py-6 text-center text-gray-500 dark:text-gray-400">
          Empty array
        </div>
      );
    }

    // Special handling for tag arrays
    if (isTagsArray(arrayData)) {
      return (
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-800">
              <tr>
                <th className="px-4 py-3 text-left text-lg font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  #
                </th>
                <th className="px-4 py-3 text-left text-lg font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Prefix
                </th>
                <th className="px-4 py-3 text-left text-lg font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Element Name
                </th>
                <th className="px-4 py-3 text-left text-lg font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Element ID
                </th>
                <th className="px-4 py-3 text-left text-lg font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Data Type
                </th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-800">
              {arrayData.map((tag, index) => (
                <tr key={index} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                  <td className="px-4 py-3 whitespace-nowrap text-lg text-gray-700 dark:text-gray-300">
                    {index}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-lg font-mono text-purple-600 dark:text-purple-400">
                    {tag.prefix || '—'}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-lg font-mono text-blue-600 dark:text-blue-400">
                    {tag.element_name || '—'}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-lg font-mono text-gray-600 dark:text-gray-400">
                    {tag.element_id || '—'}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-lg font-mono text-green-600 dark:text-green-400">
                    {tag.data_type || '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
    }

    // For arrays of primitive values, render in a table
    const allPrimitives = arrayData.every(item =>
      typeof item !== 'object' || item === null
    );

    if (allPrimitives) {
      return (
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-800">
              <tr>
                <th className="px-6 py-3 text-left text-xl font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Index
                </th>
                <th className="px-6 py-3 text-left text-xl font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Value
                </th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-800">
              {arrayData.map((item, index) => (
                <tr key={index} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                  <td className="px-6 py-4 whitespace-nowrap text-xl text-gray-700 dark:text-gray-300">
                    {index}
                  </td>
                  <td
                    className={`px-6 py-4 whitespace-nowrap text-xl font-mono ${typeof item === 'number' && item < 0
                      ? 'text-red-600 font-bold dark:text-red-400'
                      : getValueClass(item)
                      }`}
                  >
                    {formatValue(item)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
    }

    // Check if we have an array of objects with consistent structure
    const isArrayOfObjects = arrayData.every(item =>
      item !== null && typeof item === 'object' && !Array.isArray(item)
    );

    if (isArrayOfObjects && arrayData.length > 0) {
      // Get all unique keys from all objects
      const allKeys = [...new Set(
        arrayData.flatMap(obj => Object.keys(obj))
      )];

      // Skip if there are too many keys or if objects appear to be complex
      const hasComplexValues = arrayData.some(obj =>
        Object.values(obj).some(val =>
          val !== null && typeof val === 'object' && Object.keys(val).length > 0
        )
      );

      if (allKeys.length <= 10 && !hasComplexValues) {
        return (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-gray-50 dark:bg-gray-800">
                <tr>
                  <th className="px-6 py-3 text-left text-xl font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Index
                  </th>
                  {allKeys.map(key => (
                    <th key={key} className="px-6 py-3 text-left text-xl font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      {formatLabel(key)}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-800">
                {arrayData.map((item, index) => (
                  <tr key={index} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                    <td className="px-6 py-4 whitespace-nowrap text-xl text-gray-700 dark:text-gray-300">
                      {index}
                    </td>
                    {allKeys.map(key => (
                      <td
                        key={`${index}-${key}`}
                        className={`px-6 py-4 text-xl font-mono ${typeof item[key] === 'number' && item[key] < 0
                          ? 'text-red-600 font-bold dark:text-red-400'
                          : getValueClass(item[key])
                          }`}
                      >
                        {formatValue(item[key])}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        );
      }
    }

    // For complex arrays (mixed types or objects with nested structures)
    // Fall back to vertical display
    return (
      <div className="space-y-8">
        {arrayData.map((item, index) => (
          <div key={index} className="bg-white dark:bg-gray-900 rounded-lg shadow-sm overflow-hidden border border-gray-200 dark:border-gray-700">
            <div className="bg-gray-50 dark:bg-gray-800 px-6 py-4 border-b border-gray-200 dark:border-gray-700">
              <h4 className="text-2xl font-bold text-gray-800 dark:text-gray-200">
                Item {index}
              </h4>
            </div>
            <div className="p-4">
              {typeof item === 'object' && item !== null ? (
                <ProcessSection sectionData={item} />
              ) : (
                <div className={`text-xl font-mono ${getValueClass(item)}`}>
                  {formatValue(item)}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    );
  }, [formatLabel, formatValue, getValueClass]);

  const ProcessSection = useCallback(({ sectionData, sectionKey = '' }) => {
    if (sectionData === null || sectionData === undefined) {
      return (
        <div className="grid grid-cols-2 gap-6 px-6 py-4 border-b last:border-0 border-gray-100 dark:border-gray-800">
          <div className="text-xl font-medium text-gray-700 dark:text-gray-300">
            {formatLabel(sectionKey)}
          </div>
          <div className="text-xl font-mono text-gray-400 dark:text-gray-500">
            {sectionData === null ? 'null' : 'undefined'}
          </div>
        </div>
      );
    }

    if (typeof sectionData !== 'object' || sectionData === null) {
      return (
        <div className="grid grid-cols-2 gap-6 px-6 py-4 border-b last:border-0 border-gray-100 dark:border-gray-800">
          <div className="text-xl font-medium text-gray-700 dark:text-gray-300">
            {formatLabel(sectionKey) || 'Value'}
          </div>
          <div className={`text-xl font-mono ${getValueClass(sectionData)}`}>
            {formatValue(sectionData)}
          </div>
        </div>
      );
    }

    if (Array.isArray(sectionData)) {
      return (
        <div className="mb-8 last:mb-0">
          {sectionKey && (
            <div className="bg-gray-50 dark:bg-gray-800 px-6 py-4 rounded-t-lg border-b border-gray-200 dark:border-gray-700">
              <h3 className="text-2xl font-bold text-gray-800 dark:text-gray-200">
                {formatLabel(sectionKey)}
                <span className="ml-4 text-lg font-normal text-gray-500 dark:text-gray-400">
                  ({sectionData.length} items)
                </span>
              </h3>
            </div>
          )}
          <div className="bg-white dark:bg-gray-900 rounded-b-lg">
            {renderArrayData(sectionData)}
          </div>
        </div>
      );
    }

    const hasNested = hasNestedObjects(sectionData);

    if (!hasNested) {
      return (
        <div className="mb-8 last:mb-0">
          {sectionKey && (
            <div className="bg-gray-50 dark:bg-gray-800 px-6 py-4 rounded-t-lg border-b border-gray-200 dark:border-gray-700">
              <h3 className="text-2xl font-bold text-gray-800 dark:text-gray-200">
                {formatLabel(sectionKey)}
              </h3>
            </div>
          )}
          <div className="bg-white dark:bg-gray-900 rounded-b-lg">
            {Object.entries(sectionData).map(([key, value]) => (
              <div
                key={key}
                className="grid grid-cols-2 gap-6 px-6 py-4 border-b last:border-0 border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/50"
              >
                <div className="text-xl font-medium text-gray-700 dark:text-gray-300">
                  {formatLabel(key)}
                </div>
                <div
                  className={`text-xl font-mono ${typeof value === 'number' && value < 0
                    ? 'text-red-600 font-bold dark:text-red-400'
                    : getValueClass(value)
                    }`}
                >
                  {formatValue(value)}
                </div>
              </div>
            ))}
          </div>
        </div>
      );
    }

    return (
      <div className="mb-8 last:mb-0">
        {sectionKey && (
          <div className="bg-gray-50 dark:bg-gray-800 px-6 py-4 rounded-t-lg border-b border-gray-200 dark:border-gray-700">
            <h3 className="text-2xl font-bold text-gray-800 dark:text-gray-200">
              {formatLabel(sectionKey)}
            </h3>
          </div>
        )}
        <div className={`${sectionKey ? 'bg-white dark:bg-gray-900 rounded-b-lg' : ''} p-4`}>
          {Object.entries(sectionData).map(([key, value]) => {
            if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
              return <ProcessSection key={key} sectionData={value} sectionKey={key} />;
            }

            // Handle arrays specially
            if (Array.isArray(value)) {
              return <ProcessSection key={key} sectionData={value} sectionKey={key} />;
            }

            return (
              <div
                key={key}
                className="grid grid-cols-2 gap-6 px-6 py-4 border-b last:border-0 border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/50"
              >
                <div className="text-xl font-medium text-gray-700 dark:text-gray-300">
                  {formatLabel(key)}
                </div>
                <div
                  className={`text-xl font-mono ${typeof value === 'number' && value < 0
                    ? 'text-red-600 font-bold dark:text-red-400'
                    : getValueClass(value)
                    }`}
                >
                  {formatValue(value)}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  }, [formatLabel, formatValue, getValueClass, renderArrayData, hasNestedObjects]);

  const renderDataContent = useCallback(() => {
    if (!filteredData) {
      return (
        <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
          <div className="text-amber-500 mb-6 text-6xl">⚠️</div>
          <h3 className="text-2xl font-medium text-gray-900 dark:text-gray-100 mb-4">No Data to Display</h3>
          <p className="text-lg text-gray-500 dark:text-gray-400 max-w-lg">
            There is no data available to show in this view. Try switching to a different framework or view type.
          </p>
        </div>
      );
    }

    // Render primitive values
    if (format === 'primitive') {
      return (
        <div className="grid grid-cols-1 gap-6 px-6 py-4">
          <div className={`text-2xl font-mono text-center ${getValueClass(filteredData.value)}`}>
            {formatValue(filteredData.value)}
          </div>
        </div>
      );
    }

    // Added explicit check for array format
    if (format === 'array') {
      return renderArrayData(filteredData);
    }

    return <ProcessSection sectionData={filteredData} />;
  }, [filteredData, format, formatValue, getValueClass, renderArrayData, ProcessSection]);

  return (
    <div className="w-full rounded-xl overflow-hidden bg-white dark:bg-gray-900 shadow-xl">
      <div className="px-6 py-4 bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
        <h2 className="text-3xl font-bold text-gray-900 dark:text-white">
          {title}
        </h2>
      </div>
      <div className="p-6">
        {renderDataContent()}
      </div>
    </div>
  );
});

TableView.displayName = 'TableView';

export default TableView;