import React from 'react';

interface TableViewProps {
  data: any;
  title?: string;
}

const TableView: React.FC<TableViewProps> = ({ data, title = "Data Viewer" }) => {
  // Helper function to format numbers with thousands separators
  const formatNumber = (value: number): string => {
    return new Intl.NumberFormat('en-US', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    }).format(value);
  };

  // Helper function to format values for display
  const formatValue = (value: any): string => {
    if (value === null) return '—';
    if (value === undefined) return '—';
    if (typeof value === 'boolean') return value ? 'Yes' : 'No';
    if (typeof value === 'number') return formatNumber(value);
    if (Array.isArray(value)) return JSON.stringify(value);
    if (typeof value === 'object') return JSON.stringify(value);
    return String(value);
  };

  // Helper function to format titles and labels
  const formatLabel = (text: string): string => {
    // Handle camelCase
    const deCamel = text.replace(/([A-Z])/g, ' $1').trim();
    // Handle snake_case
    const deSnake = deCamel.replace(/_/g, ' ');
    // Capitalize first letter of each word
    return deSnake
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ');
  };

  // Check if a value is a "simple" value (not an object or is null)
  const isSimpleValue = (value: any): boolean => {
    return value === null || typeof value !== 'object' || Array.isArray(value);
  };

  // Helper function to check if an object has nested objects
  const hasNestedObjects = (obj: any): boolean => {
    return Object.values(obj).some(value =>
      value !== null && typeof value === 'object' && !Array.isArray(value)
    );
  };

  // Render a leaf section (no nested objects)
  const renderLeafSection = (data: Record<string, any>) => {
    return (
      <div className="grid grid-cols-1 gap-1">
        {Object.entries(data).map(([key, value]) => (
          <div
            key={key}
            className="grid grid-cols-2 gap-4 px-6 py-3 border-b last:border-0 border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
          >
            <div className="text-sm font-medium text-gray-700 dark:text-gray-300">
              {formatLabel(key)}
            </div>
            <div className={`text-sm font-mono ${typeof value === 'number'
                ? value < 0
                  ? 'text-red-600 dark:text-red-400'
                  : 'text-gray-600 dark:text-gray-400'
                : 'text-gray-600 dark:text-gray-400'
              }`}>
              {formatValue(value)}
            </div>
          </div>
        ))}
      </div>
    );
  };

  // Function to process and organize the data structure
  const processSection = (sectionData: any, sectionKey: string = ''): JSX.Element | null => {
    if (!sectionData || typeof sectionData !== 'object') return null;

    // If the section has no nested objects, render it as a leaf section
    if (!hasNestedObjects(sectionData)) {
      return (
        <div key={sectionKey} className="mb-6 last:mb-0">
          <div className="bg-gray-50 dark:bg-gray-800 px-6 py-4 rounded-t-lg border-b border-gray-200 dark:border-gray-700">
            <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200">
              {formatLabel(sectionKey)}
            </h3>
          </div>
          <div className="bg-white dark:bg-gray-900 rounded-b-lg">
            {renderLeafSection(sectionData)}
          </div>
        </div>
      );
    }

    // For sections with nested objects, process each subsection
    return (
      <div key={sectionKey} className="mb-8 last:mb-0">
        {sectionKey && (
          <div className="bg-gray-50 dark:bg-gray-800 px-6 py-4 rounded-t-lg border-b border-gray-200 dark:border-gray-700">
            <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200">
              {formatLabel(sectionKey)}
            </h3>
          </div>
        )}
        <div className={`${sectionKey ? 'bg-white dark:bg-gray-900 rounded-b-lg' : ''} p-4`}>
          {Object.entries(sectionData).map(([key, value]) => {
            if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
              return processSection(value, key);
            }
            if (Object.keys(sectionData).every(k => isSimpleValue(sectionData[k]))) {
              return renderLeafSection({ [key]: value });
            }
            return null;
          })}
        </div>
      </div>
    );
  };

  return (
    <div className="w-full rounded-lg overflow-hidden bg-white dark:bg-gray-900 shadow">
      <div className="p-6 space-y-6">
        {processSection(data)}
      </div>
    </div>
  );
};

export default TableView;