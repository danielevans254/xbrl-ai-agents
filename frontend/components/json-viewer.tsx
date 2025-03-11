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
    <div className="w-full rounded-lg border border-gray-200 bg-white shadow-sm overflow-hidden">
      <div className="flex items-center justify-between p-3 bg-gray-50 border-b border-gray-200">
        <h3 className="text-sm font-medium text-gray-700">JSON Data</h3>
        <button
          onClick={copyToClipboard}
          className="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-700 transition-colors"
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
      <div className="p-4 overflow-auto max-h-[70vh]">
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

  if (data === null) {
    return (
      <div className="flex items-start">
        {name && <span className="text-purple-600 mr-1">{name}:</span>}
        <span className="text-gray-500">null</span>
      </div>
    );
  }

  if (typeof data !== 'object') {
    return (
      <div className="flex items-start">
        {name && <span className="text-purple-600 mr-1">{name}:</span>}
        {typeof data === 'string' ? (
          <span className="text-green-600">"{data}"</span>
        ) : typeof data === 'number' ? (
          <span className="text-blue-600">{data}</span>
        ) : typeof data === 'boolean' ? (
          <span className="text-orange-600">{data.toString()}</span>
        ) : (
          <span>{String(data)}</span>
        )}
      </div>
    );
  }

  const isArray = Array.isArray(data);
  const isEmpty = Object.keys(data).length === 0;

  if (isEmpty) {
    return (
      <div className="flex items-start">
        {name && <span className="text-purple-600 mr-1">{name}:</span>}
        <span className="text-gray-500">{isArray ? '[]' : '{}'}</span>
      </div>
    );
  }

  return (
    <div className={`${isRoot ? '' : 'ml-4'}`}>
      <div
        className="flex items-center cursor-pointer select-none"
        onClick={() => setExpanded(!expanded)}
      >
        {expanded ? (
          <ChevronDown className="h-4 w-4 text-gray-500 mr-1 flex-shrink-0" />
        ) : (
          <ChevronRight className="h-4 w-4 text-gray-500 mr-1 flex-shrink-0" />
        )}

        {name && <span className="text-purple-600 mr-1">{name}:</span>}
        <span className="text-gray-500">
          {isArray ? '[' : '{'}
          {!expanded &&
            <span className="text-gray-400 italic text-xs ml-1">
              {Object.keys(data).length} {isArray ? 'items' : 'properties'}
            </span>
          }
          {!expanded && (isArray ? ']' : '}')}
        </span>
      </div>

      {expanded && (
        <div className="ml-4 border-l border-gray-200 pl-2">
          {Object.keys(data).map((key, index) => (
            <div key={key} className="mt-1">
              <JsonNode
                data={data[key]}
                name={key}
                currentDepth={currentDepth + 1}
                maxInitialDepth={maxInitialDepth}
              />
            </div>
          ))}
          <div className="text-gray-500 mt-1">{isArray ? ']' : '}'}</div>
        </div>
      )}
    </div>
  );
};

export default JsonViewer;