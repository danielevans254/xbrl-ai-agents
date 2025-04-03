'use client';

import React from 'react';

interface TableViewProps {
  data: any;
  title?: string;
}

const TableView: React.FC<TableViewProps> = ({ data, title = "Data Table" }) => {
  // Helper function to determine if an object is a simple object 
  // (not an array, and all values are primitives)
  const isSimpleObject = (obj: any): boolean => {
    if (obj === null || typeof obj !== 'object' || Array.isArray(obj)) return false;
    return Object.values(obj).every(val =>
      val === null || typeof val !== 'object');
  };

  // Helper function to flatten nested objects with dot notation
  const flattenObject = (obj: any, prefix = ''): Record<string, any> => {
    return Object.keys(obj).reduce((acc: Record<string, any>, key: string) => {
      const pre = prefix.length ? `${prefix}.` : '';

      if (obj[key] === null) {
        acc[`${pre}${key}`] = 'null';
      } else if (typeof obj[key] === 'object' && !Array.isArray(obj[key])) {
        Object.assign(acc, flattenObject(obj[key], `${pre}${key}`));
      } else if (Array.isArray(obj[key])) {
        acc[`${pre}${key}`] = JSON.stringify(obj[key]);
      } else {
        acc[`${pre}${key}`] = obj[key];
      }

      return acc;
    }, {});
  };

  // Render a table for each entry in the array
  const renderArrayOfObjects = (data: any[]) => {
    // Check if all items are simple objects with similar structure
    const allSimpleObjects = data.every(item => isSimpleObject(item));

    if (allSimpleObjects) {
      // Get all unique keys from all objects
      const allKeys = new Set<string>();
      data.forEach(item => {
        Object.keys(item).forEach(key => allKeys.add(key));
      });
      const keys = Array.from(allKeys);

      return (
        <div className="overflow-auto">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="bg-gray-100 dark:bg-gray-800">
                {keys.map(key => (
                  <th key={key} className="border border-gray-200 dark:border-gray-700 px-4 py-2 text-left">{key}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data.map((item, index) => (
                <tr key={index} className="hover:bg-gray-50 dark:hover:bg-gray-800">
                  {keys.map(key => (
                    <td key={key} className="border border-gray-200 dark:border-gray-700 px-4 py-2">
                      {item[key] === undefined ? '' :
                        item[key] === null ? 'null' :
                          typeof item[key] === 'object' ? JSON.stringify(item[key]) :
                            String(item[key])}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
    } else {
      // If not all simple objects, render each as a separate table
      return (
        <div className="space-y-4">
          {data.map((item, index) => (
            <div key={index} className="border rounded p-4 bg-white dark:bg-gray-900">
              <h3 className="text-lg font-medium mb-2">Item {index + 1}</h3>
              <TableView data={item} />
            </div>
          ))}
        </div>
      );
    }
  };

  // Render a table for a single object
  const renderSingleObject = (data: Record<string, any>) => {
    const flatData = flattenObject(data);

    return (
      <div className="overflow-auto">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="bg-gray-100 dark:bg-gray-800">
              <th className="border border-gray-200 dark:border-gray-700 px-4 py-2 text-left">Property</th>
              <th className="border border-gray-200 dark:border-gray-700 px-4 py-2 text-left">Value</th>
            </tr>
          </thead>
          <tbody>
            {Object.entries(flatData).map(([key, value]) => (
              <tr key={key} className="hover:bg-gray-50 dark:hover:bg-gray-800">
                <td className="border border-gray-200 dark:border-gray-700 px-4 py-2 font-medium">{key}</td>
                <td className="border border-gray-200 dark:border-gray-700 px-4 py-2">
                  {value === null ? 'null' : String(value)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  };

  return (
    <div className="w-full rounded-lg border dark:bg-gray-850 shadow-md overflow-hidden">
      <div className="flex items-center p-3 bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-850 border-b border-gray-200 dark:border-gray-700">
        <h3 className="text-sm font-medium text-gray-700 dark:text-gray-200">
          {title}
        </h3>
      </div>
      <div className="p-4 overflow-auto max-h-[70vh] bg-white dark:bg-gray-900">
        {Array.isArray(data) ? renderArrayOfObjects(data) : renderSingleObject(data)}
      </div>
    </div>
  );
};

export default TableView;