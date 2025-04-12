'use client';

import React, { useState, useEffect } from 'react';
import { AlertTriangle, ChevronDown, ChevronRight, XCircle, AlertCircle, Info, X } from 'lucide-react';

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
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-sm font-medium ${getSeverityStyles()}`}>
      {getSeverityIcon()}
      {severity}
    </span>
  );
};

/**
 * Error summary component for quick overview of all errors
 */
const ErrorSummary = ({ errorsObj, expandedCategories, setExpandedCategories }) => {
  const errorCategories = Object.keys(errorsObj);
  const summaryItems = errorCategories.map(category => {
    const errorCount = errorsObj[category].length;
    const errorsWithSeverity = errorsObj[category].reduce((acc, err) => {
      acc[err.severity] = (acc[err.severity] || 0) + 1;
      return acc;
    }, {});

    return {
      category,
      errorCount,
      errorsWithSeverity
    };
  });

  const expandAll = () => {
    const allExpanded = {};
    errorCategories.forEach(cat => {
      allExpanded[cat] = true;
    });
    setExpandedCategories(allExpanded);
  };

  const collapseAll = () => {
    setExpandedCategories({});
  };

  return (
    <div className="mb-3 bg-white dark:bg-gray-800 p-3 border border-gray-200 dark:border-gray-700 rounded-md">
      <div className="flex justify-between items-center mb-2">
        <h4 className="font-medium">Validation Issues Summary</h4>
        <div className="flex gap-2">
          <button
            onClick={expandAll}
            className="text-sm text-blue-600 dark:text-blue-400 hover:underline"
          >
            Expand All
          </button>
          <button
            onClick={collapseAll}
            className="text-sm text-blue-600 dark:text-blue-400 hover:underline"
          >
            Collapse All
          </button>
        </div>
      </div>
      <div className="space-y-2">
        {summaryItems.map(item => (
          <div
            key={item.category}
            onClick={() => setExpandedCategories(prev => ({ ...prev, [item.category]: !prev[item.category] }))}
            className="flex items-center justify-between p-2 border border-gray-200 dark:border-gray-700 rounded hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer"
          >
            <span className="font-medium">{item.category}</span>
            <div className="flex gap-2">
              {item.errorsWithSeverity['ERROR'] && (
                <span className="px-2 py-0.5 bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300 rounded-full text-xs">
                  {item.errorsWithSeverity['ERROR']} Errors
                </span>
              )}
              {item.errorsWithSeverity['WARNING'] && (
                <span className="px-2 py-0.5 bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300 rounded-full text-xs">
                  {item.errorsWithSeverity['WARNING']} Warnings
                </span>
              )}
              {item.errorsWithSeverity['INFO'] && (
                <span className="px-2 py-0.5 bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300 rounded-full text-xs">
                  {item.errorsWithSeverity['INFO']} Info
                </span>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
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
  const [searchTerm, setSearchTerm] = useState('');
  const [filteredErrors, setFilteredErrors] = useState<Record<string, ValidationErrorItem[]> | null>(null);

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

  // Auto-expand first category or categories with critical errors
  useEffect(() => {
    if (errorCategories.length > 0 && Object.keys(expandedCategories).length === 0) {
      const initialExpanded = {};

      // Find categories with ERROR severity
      const categoriesWithErrors = errorCategories.filter(category =>
        errorsObj[category].some(error => error.severity === 'ERROR')
      );

      if (categoriesWithErrors.length > 0) {
        // Expand categories with errors
        categoriesWithErrors.forEach(category => {
          initialExpanded[category] = true;
        });
      } else {
        // If no critical errors, just expand the first category
        initialExpanded[errorCategories[0]] = true;
      }

      setExpandedCategories(initialExpanded);
    }
  }, [validationErrors]);

  // Filter errors based on search term
  useEffect(() => {
    if (!searchTerm.trim()) {
      setFilteredErrors(null);
      return;
    }

    const term = searchTerm.toLowerCase();
    const filtered = {};

    errorCategories.forEach(category => {
      const matchingErrors = errorsObj[category].filter(error =>
        error.message.toLowerCase().includes(term) ||
        error.error_type.toLowerCase().includes(term) ||
        (error.recommendation && error.recommendation.toLowerCase().includes(term))
      );

      if (matchingErrors.length > 0) {
        filtered[category] = matchingErrors;
      }
    });

    setFilteredErrors(filtered);
  }, [searchTerm, validationErrors]);

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

  // Determine which errors to display based on filter
  const displayErrors = filteredErrors || errorsObj;
  const displayCategories = Object.keys(displayErrors);

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
          {validationErrors.taxonomy_version && (
            <span className="text-sm text-red-700 dark:text-red-300">
              Taxonomy version: {validationErrors.taxonomy_version}
            </span>
          )}
          {validationErrors.validation_timestamp && (
            <span className="text-sm text-red-700 dark:text-red-300">
              Validated: {formatTimestamp(validationErrors.validation_timestamp)}
            </span>
          )}
          {onDismiss && (
            <button
              onClick={onDismiss}
              className="p-1 rounded-full hover:bg-red-200 dark:hover:bg-red-800"
            >
              <X className="h-5 w-5 text-red-600 dark:text-red-400" />
            </button>
          )}
        </div>
      </div>

      <div className="p-3 border-b border-red-200 dark:border-red-800">
        <input
          type="text"
          placeholder="Search errors..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full p-2 border border-gray-300 dark:border-gray-700 rounded-md bg-white dark:bg-gray-900 text-gray-800 dark:text-gray-200"
        />
      </div>

      {!searchTerm && <ErrorSummary
        errorsObj={errorsObj}
        expandedCategories={expandedCategories}
        setExpandedCategories={setExpandedCategories}
      />}

      <div className="p-4 space-y-3 max-h-96 overflow-y-auto">
        {displayCategories.length === 0 ? (
          <div className="text-center p-4 text-gray-500 dark:text-gray-400">
            No errors match your search criteria
          </div>
        ) : (
          displayCategories.map((category) => (
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
                  <span className="text-sm text-red-600 dark:text-red-400">
                    {displayErrors[category].length} {displayErrors[category].length === 1 ? 'issue' : 'issues'}
                  </span>
                </div>
              </div>

              {expandedCategories[category] && (
                <div className="p-3 space-y-3 bg-white dark:bg-gray-900">
                  {displayErrors[category].map((error, index) => (
                    <div key={index} className="p-3 border-l-2 border-red-300 dark:border-red-700 bg-red-50 dark:bg-red-900/10 rounded-r-md">
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <SeverityBadge severity={error.severity} />
                          <span className="text-sm text-gray-500 dark:text-gray-400">{error.error_type}</span>
                        </div>
                      </div>

                      <p className="text-sm text-red-800 dark:text-red-300 mb-2">{error.message}</p>

                      {error.recommendation && (
                        <div className="mt-2 text-sm text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-gray-800 p-2 rounded">
                          <strong>Recommendation:</strong> {error.recommendation}
                        </div>
                      )}

                      {error.actual_value && (
                        <div className="mt-2">
                          <div className="text-sm text-gray-500 dark:text-gray-400 mb-1">Current Values:</div>
                          <div className="bg-gray-50 dark:bg-gray-800 p-2 rounded overflow-x-auto">
                            <pre className="text-sm text-gray-800 dark:text-gray-200">
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
          ))
        )}
      </div>
    </div>
  );
};

export default ValidationErrorDisplay;