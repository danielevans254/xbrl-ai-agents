'use client';

import React, { useState } from 'react';
import { ChevronRight, ChevronDown } from 'lucide-react';

interface CardViewProps {
  data: any;
  title?: string;
  expandedByDefault?: boolean;
}

const CardView: React.FC<CardViewProps> = ({
  data,
  title = "Card View",
  expandedByDefault = true
}) => {
  return (
    <div className="w-full rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-850 shadow-md overflow-hidden">
      <div className="flex items-center p-3 bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-850 border-b border-gray-200 dark:border-gray-700">
        <h3 className="text-sm font-medium text-gray-700 dark:text-gray-200">
          {title}
        </h3>
      </div>
      <div className="p-4 overflow-auto max-h-[70vh] bg-white dark:bg-gray-900">
        <CardNode data={data} expanded={expandedByDefault} />
      </div>
    </div>
  );
};

interface CardNodeProps {
  data: any;
  label?: string;
  expanded?: boolean;
}

const CardNode: React.FC<CardNodeProps> = ({ data, label, expanded = true }) => {
  const [isExpanded, setIsExpanded] = useState(expanded);

  // Helper function to get appropriate badge color
  const getTypeColor = (value: any): string => {
    if (value === null) return "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300";
    if (Array.isArray(value)) return "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300";
    if (typeof value === 'object') return "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300";

    switch (typeof value) {
      case 'string':
        return "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300";
      case 'number':
        return "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300";
      case 'boolean':
        return "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300";
      default:
        return "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300";
    }
  };

  // Helper function to render badges
  const renderBadge = (value: any): JSX.Element => {
    let type = "unknown";
    if (value === null) type = "null";
    else if (Array.isArray(value)) type = "array";
    else type = typeof value;

    return (
      <span className={`px-2 py-1 text-xs rounded-full ${getTypeColor(value)}`}>
        {type}
      </span>
    );
  };

  // Helper function to render primitive values
  const renderPrimitiveValue = (value: any): JSX.Element => {
    if (value === null) return <span className="text-gray-500 dark:text-gray-400 italic">null</span>;

    if (typeof value === 'string') return <span className="text-emerald-600 dark:text-emerald-400">"{value}"</span>;
    if (typeof value === 'number') return <span className="text-blue-600 dark:text-blue-400">{value}</span>;
    if (typeof value === 'boolean') return <span className="text-amber-600 dark:text-amber-400">{value.toString()}</span>;

    return <span>{String(value)}</span>;
  };

  if (data === null || typeof data !== 'object') {
    return (
      <div className="flex items-center justify-between p-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg">
        <div className="flex-1">
          {label && <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{label}</span>}
          <div className="mt-1">
            {renderPrimitiveValue(data)}
          </div>
        </div>
        <div>
          {renderBadge(data)}
        </div>
      </div>
    );
  }

  if (Array.isArray(data)) {
    return (
      <div className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
        <div
          className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 cursor-pointer"
          onClick={() => setIsExpanded(!isExpanded)}
        >
          <div className="flex items-center">
            {isExpanded ?
              <ChevronDown className="h-4 w-4 text-gray-500 dark:text-gray-400 mr-2" /> :
              <ChevronRight className="h-4 w-4 text-gray-500 dark:text-gray-400 mr-2" />
            }
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
              {label || 'Array'} ({data.length} items)
            </span>
          </div>
          <div>
            {renderBadge(data)}
          </div>
        </div>

        {isExpanded && (
          <div className="p-3 bg-white dark:bg-gray-900 space-y-2">
            {data.map((item, index) => (
              <CardNode key={index} data={item} label={`Item ${index}`} />
            ))}
          </div>
        )}
      </div>
    );
  }

  // Object
  return (
    <div className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
      <div
        className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 cursor-pointer"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center">
          {isExpanded ?
            <ChevronDown className="h-4 w-4 text-gray-500 dark:text-gray-400 mr-2" /> :
            <ChevronRight className="h-4 w-4 text-gray-500 dark:text-gray-400 mr-2" />
          }
          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
            {label || 'Object'} ({Object.keys(data).length} properties)
          </span>
        </div>
        <div>
          {renderBadge(data)}
        </div>
      </div>

      {isExpanded && (
        <div className="p-3 bg-white dark:bg-gray-900 space-y-2">
          {Object.entries(data).map(([key, value]) => (
            <CardNode key={key} data={value} label={key} />
          ))}
        </div>
      )}
    </div>
  );
};

export default CardView;