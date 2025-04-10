import React, { useMemo, memo, useCallback } from 'react';

interface TableViewProps {
  data: any;
  title?: string;
}

const TableRow = memo(({ label, value }: { label: string; value: any }) => {
  // Determine text color based on value type
  const valueClass = typeof value === 'number'
    ? value < 0
      ? 'text-red-600 dark:text-red-400'
      : 'text-gray-600 dark:text-gray-400'
    : 'text-gray-600 dark:text-gray-400';

  return (
    <div className="grid grid-cols-2 gap-4 px-6 py-3 border-b last:border-0 border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
      <div className="text-sm font-medium text-gray-700 dark:text-gray-300">
        {label}
      </div>
      <div className={`text-sm font-mono ${valueClass}`}>
        {value}
      </div>
    </div>
  );
});

const SectionHeader = memo(({ title }: { title: string }) => (
  <div className="bg-gray-50 dark:bg-gray-800 px-6 py-4 rounded-t-lg border-b border-gray-200 dark:border-gray-700">
    <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200">
      {title}
    </h3>
  </div>
));


const TableView: React.FC<TableViewProps> = memo(({ data, title = "Data Viewer" }) => {
  // Memoized helper function to format numbers with thousands separators
  const formatNumber = useCallback((value: number): string => {
    return new Intl.NumberFormat('en-US', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    }).format(value);
  }, []);

  const formatValue = useCallback((value: any): string => {
    if (value === null || value === undefined) return '—';
    if (typeof value === 'boolean') return value ? 'Yes' : 'No';
    if (typeof value === 'number') return formatNumber(value);
    if (Array.isArray(value)) return JSON.stringify(value);
    if (typeof value === 'object') return JSON.stringify(value);
    return String(value);
  }, [formatNumber]);

  const formatLabel = useCallback((text: string): string => {
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

  // Check if a value is a "simple" value (not an object or is null)
  const isSimpleValue = useCallback((value: any): boolean => {
    return value === null || typeof value !== 'object' || Array.isArray(value);
  }, []);

  const hasNestedObjects = useCallback((obj: any): boolean => {
    if (!obj || typeof obj !== 'object') return false;
    return Object.values(obj).some(value =>
      value !== null && typeof value === 'object' && !Array.isArray(value)
    );
  }, []);

  const renderLeafSection = useCallback((sectionData: Record<string, any>) => {
    if (!sectionData || typeof sectionData !== 'object') return null;

    return (
      <div className="grid grid-cols-1 gap-1">
        {Object.entries(sectionData).map(([key, value]) => (
          <TableRow
            key={key}
            label={formatLabel(key)}
            value={formatValue(value)}
          />
        ))}
      </div>
    );
  }, [formatLabel, formatValue]);

  const ProcessSection = memo(({ sectionData, sectionKey = '' }: { sectionData: any, sectionKey?: string }) => {
    if (!sectionData || typeof sectionData !== 'object') return null;

    if (!hasNestedObjects(sectionData)) {
      return (
        <div className="mb-6 last:mb-0">
          {sectionKey && <SectionHeader title={formatLabel(sectionKey)} />}
          <div className="bg-white dark:bg-gray-900 rounded-b-lg">
            {renderLeafSection(sectionData)}
          </div>
        </div>
      );
    }

    return (
      <div className="mb-8 last:mb-0">
        {sectionKey && <SectionHeader title={formatLabel(sectionKey)} />}
        <div className={`${sectionKey ? 'bg-white dark:bg-gray-900 rounded-b-lg' : ''} p-4`}>
          {Object.entries(sectionData).map(([key, value]) => {
            if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
              return <ProcessSection key={key} sectionData={value} sectionKey={key} />;
            }
            if (isSimpleValue(sectionData[key])) {
              return (
                <TableRow
                  key={key}
                  label={formatLabel(key)}
                  value={formatValue(sectionData[key])}
                />
              );
            }
            return null;
          })}
        </div>
      </div>
    );
  });

  const processedSections = useMemo(() => {
    if (!data) return null;
    return <ProcessSection sectionData={data} />;
  }, [data]);

  return (
    <div className="w-full rounded-lg overflow-hidden bg-white dark:bg-gray-900 shadow">
      <div className="p-6 space-y-6">
        {processedSections}
      </div>
    </div>
  );
});

TableView.displayName = 'TableView';

export default TableView;