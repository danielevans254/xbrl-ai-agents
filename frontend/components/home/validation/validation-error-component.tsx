'use client';

import React, { useState } from 'react';
import { AlertTriangle, ChevronDown, ChevronRight, XCircle, AlertCircle, Info } from 'lucide-react';

export interface ValidationErrorItem {
  message: string;
  error_type: string;
  severity: 'ERROR' | 'WARNING' | 'INFO';
  actual_value?: any;
  recommendation?: string;
}

export interface ValidationErrorsResponse {
  validation_status: 'error' | 'success';
  is_valid: boolean;
  validation_timestamp: string;
  taxonomy_version: string;
  validation_errors: Record<string, ValidationErrorItem[]>;
}

interface ValidationErrorDisplayProps {
  validationErrors: ValidationErrorsResponse | null;
  onDismiss?: () => void;
}

/**
 * Severity badge component
 */
const SeverityBadge = ({ severity }: { severity: string }) => {
  const getSeverityStyles = () => {
    switch (severity) {
      case 'ERROR':
        return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300';
      case 'WARNING':
        return 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300';
      default:
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300';
    }
  };

  const getSeverityIcon = () => {
    switch (severity) {
      case 'ERROR':
        return <XCircle className="h-3 w-3" />;
      case 'WARNING':
        return <AlertTriangle className="h-3 w-3" />;
      default:
        return <Info className="h-3 w-3" />;
    }
  };

  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-lg font-medium ${getSeverityStyles()}`}>
      {getSeverityIcon()}
      {severity}
    </span>
  );
};

/**
 * ValidationErrorDisplay component
 */
export const ValidationErrorDisplay: React.FC<ValidationErrorDisplayProps> = ({
  validationErrors,
  onDismiss
}) => {
  const [expandedCategories, setExpandedCategories] = useState<Record<string, boolean>>({});

  // If no errors, don't render
  if (!validationErrors || !validationErrors.validation_errors || Object.keys(validationErrors.validation_errors).length === 0) {
    return null;
  }

  const errorsObj = validationErrors.validation_errors;
  const errorCategories = Object.keys(errorsObj);

  // Calculate total error count
  const totalErrorCount = errorCategories.reduce((count, category) => {
    return count + errorsObj[category].length;
  }, 0);

  const toggleCategory = (category: string) => {
    setExpandedCategories(prev => ({
      ...prev,
      [category]: !prev[category]
    }));
  };

  // Format timestamp
  const formatTimestamp = (timestamp: string) => {
    try {
      const date = new Date(timestamp);
      return date.toLocaleString();
    } catch (e) {
      return timestamp;
    }
  };

  return (
    <div className="rounded-lg border border-red-200 bg-red-50 dark:border-red-900 dark:bg-red-900/10 overflow-hidden mb-4">
      <div className="px-4 py-3 bg-red-100 dark:bg-red-900/20 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <AlertTriangle className="h-5 w-5 text-red-600 dark:text-red-400" />
          <h3 className="font-medium text-red-800 dark:text-red-300">
            Validation Errors ({totalErrorCount})
          </h3>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-lg text-red-700 dark:text-red-300">
            {validationErrors.taxonomy_version &&
              `Taxonomy version: ${validationErrors.taxonomy_version}`}
          </span>
          <span className="text-lg text-red-700 dark:text-red-300">
            {validationErrors.validation_timestamp &&
              `Validated: ${formatTimestamp(validationErrors.validation_timestamp)}`}
          </span>
        </div>
      </div>

      <div className="p-4 space-y-3 max-h-96 overflow-y-auto">
        {errorCategories.map((category) => (
          <div key={category} className="border border-red-200 dark:border-red-800 rounded-md overflow-hidden">
            <div
              className="px-3 py-2 bg-red-100 dark:bg-red-900/20 flex items-center justify-between cursor-pointer"
              onClick={() => toggleCategory(category)}
            >
              <div className="flex items-center gap-2">
                {expandedCategories[category] ?
                  <ChevronDown className="h-4 w-4 text-red-600 dark:text-red-400" /> :
                  <ChevronRight className="h-4 w-4 text-red-600 dark:text-red-400" />
                }
                <span className="font-medium text-red-800 dark:text-red-300">{category}</span>
                <span className="text-lg text-red-600 dark:text-red-400">
                  {errorsObj[category].length} {errorsObj[category].length === 1 ? 'issue' : 'issues'}
                </span>
              </div>
            </div>

            {expandedCategories[category] && (
              <div className="p-3 space-y-3 bg-white dark:bg-gray-900">
                {errorsObj[category].map((error, index) => (
                  <div key={index} className="p-3 border-l-2 border-red-300 dark:border-red-700 bg-red-50 dark:bg-red-900/10 rounded-r-md">
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <SeverityBadge severity={error.severity} />
                        <span className="text-lg text-gray-500 dark:text-gray-400">{error.error_type}</span>
                      </div>
                    </div>

                    <p className="text-lg text-red-800 dark:text-red-300 mb-2">{error.message}</p>

                    {error.recommendation && (
                      <div className="mt-2 text-lg text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-gray-800 p-2 rounded">
                        <strong>Recommendation:</strong> {error.recommendation}
                      </div>
                    )}

                    {error.actual_value && (
                      <div className="mt-2">
                        <div className="text-lg text-gray-500 dark:text-gray-400 mb-1">Current Values:</div>
                        <div className="bg-gray-50 dark:bg-gray-800 p-2 rounded overflow-x-auto">
                          <pre className="text-lg text-gray-800 dark:text-gray-200">
                            {JSON.stringify(error.actual_value, null, 2)}
                          </pre>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default ValidationErrorDisplay;