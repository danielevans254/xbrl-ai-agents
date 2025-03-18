'use client';

import React, { useState } from 'react';
import { ChevronRight, ChevronDown, Copy, Check } from 'lucide-react';

interface JsonViewerProps {
  data: any;
  initialExpanded?: boolean;
  maxInitialDepth?: number;
}

const JsonViewer: React.FC<JsonViewerProps> = ({
  data,
  initialExpanded = true,
  maxInitialDepth = 1,
}) => {
  const [copied, setCopied] = useState(false);

  const copyToClipboard = () => {
    navigator.clipboard.writeText(JSON.stringify(data, null, 2));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="w-full rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-850 shadow-md overflow-hidden transition-all duration-200 hover:shadow-lg">
      <div className="flex items-center justify-between p-3 bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-850 border-b border-gray-200 dark:border-gray-700">
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
      <div className="p-4 overflow-auto max-h-[70vh] bg-white dark:bg-gray-900 font-mono text-sm scrollbar-thin scrollbar-thumb-gray-300 dark:scrollbar-thumb-gray-600 scrollbar-track-transparent">
        <JsonNode
          data={data}
          isRoot={true}
          initialExpanded={initialExpanded}
          currentDepth={0}
          maxInitialDepth={maxInitialDepth}
        />
      </div>
    </div>
  );
};

interface JsonNodeProps {
  data: any;
  name?: string;
  isRoot?: boolean;
  initialExpanded?: boolean;
  currentDepth: number;
  maxInitialDepth: number;
}

const JsonNode: React.FC<JsonNodeProps> = ({
  data,
  name,
  isRoot = false,
  initialExpanded = true,
  currentDepth,
  maxInitialDepth,
}) => {
  // Calculate whether this level should start expanded based on depth
  const shouldStartExpanded = currentDepth < maxInitialDepth;
  const [expanded, setExpanded] = useState(isRoot ? initialExpanded : shouldStartExpanded);
  const [highlight, setHighlight] = useState(false);

  const getTypeLabel = (value: any) => {
    if (value === null) return 'null';
    if (Array.isArray(value)) return 'array';
    return typeof value;
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'string':
        return 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300';
      case 'number':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300';
      case 'boolean':
        return 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300';
      case 'null':
        return 'bg-gray-100 text-gray-800 dark:bg-gray-800/50 dark:text-gray-300';
      case 'object':
        return 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300';
      case 'array':
        return 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-800/50 dark:text-gray-300';
    }
  };

  if (data === null) {
    return (
      <div className={`flex items-start py-1 ${highlight ? 'bg-gray-100 dark:bg-gray-800/50 rounded' : ''}`}
        onMouseEnter={() => setHighlight(true)}
        onMouseLeave={() => setHighlight(false)}>
        {name && (
          <span className="text-indigo-600 dark:text-indigo-400 font-semibold mr-1.5 flex-shrink-0">{name}:</span>
        )}
        <span className="text-gray-500 dark:text-gray-400 italic flex items-center">
          <span className="text-gray-500 dark:text-gray-400">null</span>
          <span className={`ml-2 text-xs px-1.5 py-0.5 rounded-full ${getTypeColor('null')}`}>null</span>
        </span>
      </div>
    );
  }

  if (typeof data !== 'object') {
    const type = typeof data;
    return (
      <div className={`flex items-start py-1 ${highlight ? 'bg-gray-100 dark:bg-gray-800/50 rounded' : ''}`}
        onMouseEnter={() => setHighlight(true)}
        onMouseLeave={() => setHighlight(false)}>
        {name && (
          <span className="text-indigo-600 dark:text-indigo-400 font-semibold mr-1.5 flex-shrink-0">{name}:</span>
        )}
        <span className="flex items-center">
          {type === 'string' ? (
            <span className="text-emerald-600 dark:text-emerald-400">"{data}"</span>
          ) : type === 'number' ? (
            <span className="text-blue-600 dark:text-blue-400">{data}</span>
          ) : type === 'boolean' ? (
            <span className="text-amber-600 dark:text-amber-400">{data.toString()}</span>
          ) : (
            <span className="text-gray-700 dark:text-gray-300">{String(data)}</span>
          )}
          <span className={`ml-2 text-xs px-1.5 py-0.5 rounded-full ${getTypeColor(type)}`}>{type}</span>
        </span>
      </div>
    );
  }

  const isArray = Array.isArray(data);
  const isEmpty = Object.keys(data).length === 0;
  const type = isArray ? 'array' : 'object';

  if (isEmpty) {
    return (
      <div className={`flex items-start py-1 ${highlight ? 'bg-gray-100 dark:bg-gray-800/50 rounded' : ''}`}
        onMouseEnter={() => setHighlight(true)}
        onMouseLeave={() => setHighlight(false)}>
        {name && (
          <span className="text-indigo-600 dark:text-indigo-400 font-semibold mr-1.5 flex-shrink-0">{name}:</span>
        )}
        <span className="flex items-center">
          <span className={`${isArray ? 'text-orange-500 dark:text-orange-400' : 'text-purple-500 dark:text-purple-400'} font-medium`}>
            {isArray ? '[]' : '{}'}
          </span>
          <span className={`ml-2 text-xs px-1.5 py-0.5 rounded-full ${getTypeColor(type)}`}>
            {isArray ? 'array' : 'object'}
          </span>
        </span>
      </div>
    );
  }

  return (
    <div className={`${isRoot ? '' : 'ml-4'}`}>
      <div
        className={`flex items-center cursor-pointer select-none hover:bg-gray-100 dark:hover:bg-gray-800/70 rounded px-1.5 py-1 -ml-1.5 transition-colors ${expanded ? 'bg-gray-50 dark:bg-gray-800/30' : ''}`}
        onClick={() => setExpanded(!expanded)}
        onMouseEnter={() => setHighlight(true)}
        onMouseLeave={() => setHighlight(false)}
      >
        {expanded ? (
          <ChevronDown className="h-4 w-4 text-gray-500 dark:text-gray-400 mr-1.5 flex-shrink-0 transition-transform" />
        ) : (
          <ChevronRight className="h-4 w-4 text-gray-500 dark:text-gray-400 mr-1.5 flex-shrink-0 transition-transform" />
        )}

        {name && (
          <span className="text-indigo-600 dark:text-indigo-400 font-semibold mr-1.5 flex-shrink-0">{name}:</span>
        )}

        <span className="text-gray-600 dark:text-gray-400 flex items-center">
          <span className={`${isArray ? 'text-orange-500 dark:text-orange-400' : 'text-purple-500 dark:text-purple-400'} mr-0.5 font-medium`}>
            {isArray ? '[' : '{'}
          </span>
          {!expanded && (
            <span className="text-gray-500 dark:text-gray-500 italic text-xs mx-1">
              {Object.keys(data).length} {isArray ? 'items' : 'properties'}
            </span>
          )}
          {!expanded && (
            <span className={`${isArray ? 'text-orange-500 dark:text-orange-400' : 'text-purple-500 dark:text-purple-400'} font-medium`}>
              {isArray ? ']' : '}'}
            </span>
          )}
          <span className={`ml-2 text-xs px-1.5 py-0.5 rounded-full ${getTypeColor(type)}`}>
            {isArray ? 'array' : 'object'}
          </span>
        </span>
      </div>

      {expanded && (
        <div className="ml-4 border-l-2 border-gray-200 dark:border-gray-700 pl-3 my-1 transition-all duration-200">
          {Object.keys(data).map((key) => (
            <div key={key} className="mt-0.5">
              <JsonNode
                data={data[key]}
                name={key}
                currentDepth={currentDepth + 1}
                maxInitialDepth={maxInitialDepth}
              />
            </div>
          ))}
          <div className="text-gray-600 dark:text-gray-400 mt-1 py-0.5">
            <span className={`${isArray ? 'text-orange-500 dark:text-orange-400' : 'text-purple-500 dark:text-purple-400'} font-medium`}>
              {isArray ? ']' : '}'}
            </span>
          </div>
        </div>
      )}
    </div>
  );
};

export default JsonViewer;