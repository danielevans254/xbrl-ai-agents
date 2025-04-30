'use client';

import React, { useState, useEffect } from 'react';
import {
  AlertTriangle,
  ChevronDown,
  ChevronRight,
  XCircle,
  Info,
  X,
  CheckCircle2,
  Search,
  ArrowRight,
  BarChart3,
  HelpCircle
} from 'lucide-react';

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
 * Simplified Severity Badge component
 */
const SeverityBadge = ({ severity }: { severity: string }) => {
  const severityLabels = {
    'ERROR': 'Critical Issue',
    'WARNING': 'Attention Needed',
    'INFO': 'Information'
  };

  const getSeverityStyles = () => {
    switch (severity) {
      case 'ERROR':
        return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300 border-red-200 dark:border-red-800';
      case 'WARNING':
        return 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300 border-amber-200 dark:border-amber-800';
      default:
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300 border-blue-200 dark:border-blue-800';
    }
  };

  const getSeverityIcon = () => {
    switch (severity) {
      case 'ERROR':
        return <XCircle className="h-3.5 w-3.5" />;
      case 'WARNING':
        return <AlertTriangle className="h-3.5 w-3.5" />;
      default:
        return <Info className="h-3.5 w-3.5" />;
    }
  };

  return (
    <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium border ${getSeverityStyles()}`}>
      {getSeverityIcon()}
      {severityLabels[severity] || severity}
    </span>
  );
};

/**
 * Statistical summary component with user-friendly explanations
 */
const ValidationStatistics = ({ errorsObj }: { errorsObj: Record<string, ValidationErrorItem[]> }) => {
  const errorCategories = Object.keys(errorsObj);

  let totalErrors = 0;
  let errorsBySeverity = { ERROR: 0, WARNING: 0, INFO: 0 };
  let errorsByCategory: Record<string, number> = {};

  errorCategories.forEach(category => {
    errorsByCategory[category] = errorsObj[category].length;
    totalErrors += errorsObj[category].length;
    errorsObj[category].forEach(error => {
      errorsBySeverity[error.severity] = (errorsBySeverity[error.severity] || 0) + 1;
    });
  });

  const errorPercent = Math.round((errorsBySeverity.ERROR / totalErrors) * 100) || 0;
  const warningPercent = Math.round((errorsBySeverity.WARNING / totalErrors) * 100) || 0;
  const infoPercent = Math.round((errorsBySeverity.INFO / totalErrors) * 100) || 0;



  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4 mb-4">
      <div className="flex items-center mb-3">
        <BarChart3 className="h-5 w-5 mr-2 text-gray-700 dark:text-gray-300" />
        <h3 className="font-medium">Summary of Data Review</h3>
      </div>

      {errorsBySeverity.ERROR > 0 && (
        <div className="mb-4 p-3 bg-gray-50 dark:bg-gray-700 rounded border border-gray-200 dark:border-gray-600 text-sm">
          <p className="text-gray-700 dark:text-gray-300">
            {errorsBySeverity.ERROR === 1 ? 'There is 1 critical issue' : `There are ${errorsBySeverity.ERROR} critical issues`} that must be fixed before proceeding.
            {errorsBySeverity.WARNING > 0 ? ` Additionally, there ${errorsBySeverity.WARNING === 1 ? 'is 1 item' : `are ${errorsBySeverity.WARNING} items`} that may need your attention.` : ''}
          </p>
        </div>
      )}

      {errorsBySeverity.ERROR === 0 && errorsBySeverity.WARNING > 0 && (
        <div className="mb-4 p-3 bg-gray-50 dark:bg-gray-700 rounded border border-gray-200 dark:border-gray-600 text-sm">
          <p className="text-gray-700 dark:text-gray-300">
            No critical issues found, but there {errorsBySeverity.WARNING === 1 ? 'is 1 item' : `are ${errorsBySeverity.WARNING} items`} that may need your attention.
          </p>
        </div>
      )}

      {errorsBySeverity.ERROR === 0 && errorsBySeverity.WARNING === 0 && errorsBySeverity.INFO > 0 && (
        <div className="mb-4 p-3 bg-gray-50 dark:bg-gray-700 rounded border border-gray-200 dark:border-gray-600 text-sm">
          <p className="text-gray-700 dark:text-gray-300">
            No problems found. There {errorsBySeverity.INFO === 1 ? 'is 1 informational note' : `are ${errorsBySeverity.INFO} informational notes`} available.
          </p>
        </div>
      )}

      <div className="grid grid-cols-3 gap-3 mb-4">
        <div className="p-3 bg-red-50 dark:bg-red-900/10 rounded-lg border border-red-100 dark:border-red-900/20">
          <div className="text-2xl font-bold text-red-700 dark:text-red-400">{errorsBySeverity.ERROR}</div>
          <div className="text-sm text-red-600 dark:text-red-300">Critical Issues</div>
        </div>
        <div className="p-3 bg-amber-50 dark:bg-amber-900/10 rounded-lg border border-amber-100 dark:border-amber-900/20">
          <div className="text-2xl font-bold text-amber-700 dark:text-amber-400">{errorsBySeverity.WARNING}</div>
          <div className="text-sm text-amber-600 dark:text-amber-300">Attention Needed</div>
        </div>
        <div className="p-3 bg-blue-50 dark:bg-blue-900/10 rounded-lg border border-blue-100 dark:border-blue-900/20">
          <div className="text-2xl font-bold text-blue-700 dark:text-blue-400">{errorsBySeverity.INFO}</div>
          <div className="text-sm text-blue-600 dark:text-blue-300">Informational</div>
        </div>
      </div>

      <div className="mb-1 text-sm text-gray-500 dark:text-gray-400 flex items-center">
        <span>Breakdown of issues by importance</span>
        <HelpCircle className="h-3.5 w-3.5 ml-1 cursor-help" title="Shows the proportion of critical, attention-needed, and informational items" />
      </div>
      <div className="w-full h-6 rounded-md overflow-hidden flex">
        {errorPercent > 0 && (
          <div style={{ width: `${errorPercent}%` }} className="bg-red-500 dark:bg-red-700 flex items-center justify-center text-white text-xs">
            {errorPercent > 10 ? `${errorPercent}%` : ''}
          </div>
        )}
        {warningPercent > 0 && (
          <div style={{ width: `${warningPercent}%` }} className="bg-amber-500 dark:bg-amber-700 flex items-center justify-center text-white text-xs">
            {warningPercent > 10 ? `${warningPercent}%` : ''}
          </div>
        )}
        {infoPercent > 0 && (
          <div style={{ width: `${infoPercent}%` }} className="bg-blue-500 dark:bg-blue-700 flex items-center justify-center text-white text-xs">
            {infoPercent > 10 ? `${infoPercent}%` : ''}
          </div>
        )}
      </div>
      <div className="flex text-xs mt-1 text-gray-500 dark:text-gray-400 justify-between">
        <div>0%</div>
        <div>50%</div>
        <div>100%</div>
      </div>
    </div>
  );
};

/**
 * Error summary component with user-friendly labels
 */
const ErrorSummary = ({
  errorsObj,
  expandedCategories,
  setExpandedCategories
}: {
  errorsObj: Record<string, ValidationErrorItem[]>;
  expandedCategories: Record<string, boolean>;
  setExpandedCategories: React.Dispatch<React.SetStateAction<Record<string, boolean>>>;
}) => {
  const errorCategories = Object.keys(errorsObj);

  const humanizeCategory = (category: string) =>
    category
      .replace(/_/g, ' ')
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ');

  const summaryItems = errorCategories.map(category => {
    const errors = errorsObj[category];
    const errorsWithSeverity = errors.reduce((acc, err) => {
      acc[err.severity] = (acc[err.severity] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return {
      category,
      displayName: humanizeCategory(category),
      errorCount: errors.length,
      errorsWithSeverity,
      hasErrors: errorsWithSeverity.ERROR > 0
    };
  });

  summaryItems.sort((a, b) => {
    if (a.hasErrors && !b.hasErrors) return -1;
    if (!a.hasErrors && b.hasErrors) return 1;
    return b.errorCount - a.errorCount;
  });

  const expandAll = () => {
    const allExpanded: Record<string, boolean> = {};
    errorCategories.forEach(cat => (allExpanded[cat] = true));
    setExpandedCategories(allExpanded);
  };

  const collapseAll = () => {
    setExpandedCategories({});
  };

  return (
    <div className="mb-4 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
      <div className="px-4 py-3 bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
        <h4 className="font-medium text-gray-800 dark:text-gray-200">Issues by Section</h4>
        <div className="flex gap-2">
          <button onClick={expandAll} className="text-xs px-2 py-1 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-md text-gray-700 dark:text-gray-300 transition-colors">
            Show All
          </button>
          <button onClick={collapseAll} className="text-xs px-2 py-1 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-md text-gray-700 dark:text-gray-300 transition-colors">
            Hide All
          </button>
        </div>
      </div>
      <div className="divide-y divide-gray-200 dark:divide-gray-700">
        {summaryItems.map(item => {
          const isExpanded = expandedCategories[item.category];
          const borderColor = item.hasErrors ? 'border-l-4 border-l-red-500' : '';
          return (
            <div key={item.category} className={borderColor}>
              <div
                onClick={() => setExpandedCategories(prev => ({ ...prev, [item.category]: !prev[item.category] }))}
                className="flex items-center justify-between p-3 hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer transition-colors"
              >
                <div className="flex items-center">
                  {isExpanded ? (
                    <ChevronDown className="h-4 w-4 text-gray-500 dark:text-gray-400 mr-2" />
                  ) : (
                    <ChevronRight className="h-4 w-4 text-gray-500 dark:text-gray-400 mr-2" />
                  )}
                  <span className="font-medium text-gray-800 dark:text-gray-200">{item.displayName}</span>
                </div>
                <div className="flex gap-2">
                  {item.errorsWithSeverity['ERROR'] && (
                    <span className="px-2 py-0.5 bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300 rounded-full text-xs">
                      {item.errorsWithSeverity['ERROR']} Critical
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
            </div>
          );
        })}
      </div>
    </div>
  );
};

/**
 * Improved recommendation component with clearer language
 */
const RecommendationCard = ({ recommendation }: { recommendation?: string }) => {
  if (!recommendation) return null;
  return (
    <div className="mt-3 bg-green-50 dark:bg-green-900/10 border border-green-200 dark:border-green-800 rounded-md p-3">
      <div className="flex items-start">
        <CheckCircle2 className="h-5 w-5 text-green-600 dark:text-green-400 mt-0.5 mr-2 flex-shrink-0" />
        <div>
          <h4 className="text-sm font-medium text-green-800 dark:text-green-300 mb-1">Suggested Fix</h4>
          <p className="text-sm text-green-700 dark:text-green-400">{recommendation}</p>
        </div>
      </div>
    </div>
  );
};

/**
 * User-friendly error type translator
 */
const translateErrorType = (errorType: string) => {
  const errorTypeMap: Record<string, string> = {
    'VALIDATION_ERROR': 'Data Format Issue',
    'SCHEMA_ERROR': 'Structure Problem',
    'TYPE_ERROR': 'Incorrect Data Type',
    'REQUIRED_FIELD_MISSING': 'Missing Required Information',
    'REFERENCE_ERROR': 'Reference Problem',
    'CONSTRAINT_ERROR': 'Data Constraint Issue',
    'FORMAT_ERROR': 'Formatting Problem',
  };
  return (
    errorTypeMap[errorType] ||
    errorType
      .replace(/_/g, ' ')
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ')
  );
};

/**
 * Improved ValidationErrorDisplay component
 */
export const ValidationErrorDisplay: React.FC<ValidationErrorDisplayProps> = ({
  validationErrors,
  onDismiss
}) => {
  const [expandedCategories, setExpandedCategories] = useState<Record<string, boolean>>({});
  const [searchTerm, setSearchTerm] = useState('');
  const [filteredErrors, setFilteredErrors] = useState<Record<string, ValidationErrorItem[]> | null>(null);
  const [activeTab, setActiveTab] = useState<'issues' | 'stats'>('stats');
  const [showHelp, setShowHelp] = useState(false);

  if (!validationErrors || !validationErrors.validation_errors || Object.keys(validationErrors.validation_errors).length === 0) {
    return null;
  }

  const errorsObj = validationErrors.validation_errors;
  const errorCategories = Object.keys(errorsObj);

  const totalErrorCount = errorCategories.reduce((count, category) => {
    return count + errorsObj[category].length;
  }, 0);

  useEffect(() => {
    if (errorCategories.length > 0 && Object.keys(expandedCategories).length === 0) {
      const initialExpanded: Record<string, boolean> = {};
      const categoriesWithErrors = errorCategories.filter(category =>
        errorsObj[category].some(error => error.severity === 'ERROR')
      );
      if (categoriesWithErrors.length > 0) {
        categoriesWithErrors.forEach(category => {
          initialExpanded[category] = true;
        });
      } else {
        initialExpanded[errorCategories[0]] = true;
      }
      setExpandedCategories(initialExpanded);
    }
  }, [validationErrors]);

  useEffect(() => {
    if (!searchTerm.trim()) {
      setFilteredErrors(null);
      return;
    }
    const term = searchTerm.toLowerCase();
    const filtered: Record<string, ValidationErrorItem[]> = {};
    errorCategories.forEach(category => {
      const matching = errorsObj[category].filter(error =>
        error.message.toLowerCase().includes(term) ||
        error.error_type.toLowerCase().includes(term) ||
        (error.recommendation && error.recommendation.toLowerCase().includes(term)) ||
        category.toLowerCase().includes(term)
      );
      if (matching.length > 0) filtered[category] = matching;
    });
    setFilteredErrors(filtered);
  }, [searchTerm, validationErrors]);

  const toggleCategory = (category: string) => {
    setExpandedCategories(prev => ({
      ...prev,
      [category]: !prev[category]
    }));
  };

  const formatTimestamp = (timestamp: string) => {
    try {
      const date = new Date(timestamp);
      return date.toLocaleDateString() + ' at ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } catch {
      return timestamp;
    }
  };

  const displayErrors = filteredErrors || errorsObj;
  const displayCategories = Object.keys(displayErrors);

  const errorCount = { ERROR: 0, WARNING: 0, INFO: 0 };
  Object.values(errorsObj).flat().forEach(error => {
    if (errorCount[error.severity] !== undefined) {
      errorCount[error.severity]++;
    }
  });

  const getValidationTitle = () => {
    if (errorCount.ERROR > 0) return 'Data Issues Found - Action Required';
    if (errorCount.WARNING > 0) return 'Data Review - Some Items Need Attention';
    if (errorCount.INFO > 0) return 'Data Review - Information Available';
    return 'Data Review Results';
  };

  const ObjectValueTable = ({ data }) => {
    // Check if data is an object and not an array
    if (!data || typeof data !== 'object' || Array.isArray(data)) {
      return <pre className="text-xs text-gray-800 dark:text-gray-200 overflow-auto">
        {JSON.stringify(data, null, 2)}
      </pre>;
    }

    // Get keys from the object
    const keys = Object.keys(data);

    return (
      <table className="w-full text-sm text-left text-gray-700 dark:text-gray-300">
        <thead className="text-xs text-gray-600 dark:text-gray-400 bg-gray-100 dark:bg-gray-800">
          <tr>
            <th className="px-4 py-2 border-r border-gray-200 dark:border-gray-700 font-medium">Key</th>
            <th className="px-4 py-2 font-medium">Value</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
          {keys.map((key) => (
            <tr key={key} className="bg-white dark:bg-gray-900">
              <td className="px-4 py-2 border-r border-gray-200 dark:border-gray-700 font-medium">{key}</td>
              <td className="px-4 py-2">{typeof data[key] === 'object' ? JSON.stringify(data[key]) : String(data[key])}</td>
            </tr>
          ))}
        </tbody>
      </table>
    );
  };

  return (
    <div className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 shadow-md overflow-hidden">
      {/* Header */}
      <div className={`px-4 py-3 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between ${errorCount.ERROR > 0
        ? 'bg-red-50 dark:bg-red-900/10'
        : errorCount.WARNING > 0
          ? 'bg-amber-50 dark:bg-amber-900/10'
          : 'bg-blue-50 dark:bg-blue-900/10'
        }`}>
        <div className="flex items-center gap-2">
          {errorCount.ERROR > 0 ? (
            <XCircle className="h-5 w-5 text-red-500" />
          ) : errorCount.WARNING > 0 ? (
            <AlertTriangle className="h-5 w-5 text-amber-500" />
          ) : (
            <Info className="h-5 w-5 text-blue-500" />
          )}
          <h3 className="font-medium">{getValidationTitle()}</h3>
          <button
            onClick={() => setShowHelp(!showHelp)}
            className="ml-2 p-1 rounded-full hover:bg-gray-200/50 dark:hover:bg-gray-700/50"
            aria-label="Help"
          >
            <HelpCircle className="h-4 w-4 text-gray-500 dark:text-gray-400" />
          </button>
        </div>
        <div className="flex items-center gap-4 text-sm text-gray-500 dark:text-gray-400">
          {validationErrors.taxonomy_version && <span className="hidden sm:inline">Version: {validationErrors.taxonomy_version}</span>}
          {validationErrors.validation_timestamp && <span className="hidden sm:inline">{formatTimestamp(validationErrors.validation_timestamp)}</span>}
          {onDismiss && (
            <button onClick={onDismiss} className="p-1 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors" aria-label="Dismiss">
              <X className="h-5 w-5 text-gray-500 dark:text-gray-400" />
            </button>
          )}
        </div>
      </div>

      {/* Help Section */}
      {showHelp && (
        <div className="p-4 bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
          <h4 className="font-medium mb-2">Understanding Your Data Review Results</h4>
          <ul className="space-y-2 text-sm text-gray-700 dark:text-gray-300">
            <li className="flex items-start gap-2">
              <XCircle className="h-4 w-4 text-red-500 mt-0.5 flex-shrink-0" />
              <span><strong>Critical Issues</strong>: These problems must be fixed before you can proceed. They indicate data that doesn't meet requirements.</span>
            </li>
            <li className="flex items-start gap-2">
              <AlertTriangle className="h-4 w-4 text-amber-500 mt-0.5 flex-shrink-0" />
              <span><strong>Attention Needed</strong>: These are warnings that may require your attention but won't block you from proceeding.</span>
            </li>
            <li className="flex items-start gap-2">
              <Info className="h-4 w-4 text-blue-500 mt-0.5 flex-shrink-0" />
              <span><strong>Information</strong>: These are helpful notes about your data that don't require action.</span>
            </li>
          </ul>
          <p className="mt-3 text-sm text-gray-600 dark:text-gray-400">
            Use the "Summary" tab for an overview and the "Details" tab to see specifics and recommendations.
          </p>
        </div>
      )}

      {/* Tabs */}
      <div className="border-b border-gray-200 dark:border-gray-700">
        <nav className="flex">
          <button
            onClick={() => setActiveTab('stats')}
            className={`px-4 py-2 text-sm font-medium transition-colors ${activeTab === 'stats'
              ? 'border-b-2 border-blue-500 text-blue-600 dark:text-blue-400'
              : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
              }`}
          >
            Summary
          </button>
          <button
            onClick={() => setActiveTab('issues')}
            className={`px-4 py-2 text-sm font-medium transition-colors ${activeTab === 'issues'
              ? 'border-b-2 border-blue-500 text-blue-600 dark:text-blue-400'
              : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
              }`}
          >
            Details
          </button>
        </nav>
      </div>

      {/* Search Input */}
      {activeTab === 'issues' && (
        <div className="p-3 border-b border-gray-200 dark:border-gray-700">
          <div className="relative">
            <Search className="h-4 w-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search issues..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200 text-sm"
            />
          </div>
        </div>
      )}

      {/* Content Area */}
      <div className="max-h-96 overflow-y-auto">
        {activeTab === 'stats' ? (
          <div className="p-4">
            <ValidationStatistics errorsObj={errorsObj} />

            {errorCount.ERROR > 0 && (
              <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
                <h4 className="font-medium text-gray-800 dark:text-gray-200 mb-3">What to Do Next</h4>
                <ol className="list-decimal ml-5 space-y-2 text-sm text-gray-700 dark:text-gray-300">
                  <li>Click the "Details" tab above to see all issues</li>
                  <li>Focus on fixing "Critical Issues" first</li>
                  <li>Look for the "Suggested Fix" section in each issue for guidance</li>
                  <li>After making corrections, run the validation again</li>
                </ol>
              </div>
            )}
          </div>
        ) : (
          <div className="p-4">
            {!searchTerm && (
              <ErrorSummary
                errorsObj={errorsObj}
                expandedCategories={expandedCategories}
                setExpandedCategories={setExpandedCategories}
              />
            )}

            <div className="space-y-4">
              {displayCategories.length === 0 ? (
                <div className="text-center p-6 text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
                  <AlertTriangle className="h-8 w-8 mx-auto mb-2 text-gray-400" />
                  <p>No issues match your search criteria</p>
                </div>
              ) : (
                displayCategories.map(category => {
                  const displayCategory = category
                    .replace(/_/g, ' ')
                    .split(' ')
                    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
                    .join(' ');

                  return (
                    <div
                      key={category}
                      className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden bg-white dark:bg-gray-800"
                    >
                      <div
                        className={`px-4 py-3 flex items-center justify-between cursor-pointer transition-colors ${expandedCategories[category]
                          ? 'bg-blue-50 dark:bg-blue-900/10 hover:bg-blue-100 dark:hover:bg-blue-900/20'
                          : 'bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700'
                          }`}
                        onClick={() => toggleCategory(category)}
                      >
                        <div className="flex items-center gap-2">
                          {expandedCategories[category] ? (
                            <ChevronDown className="h-4 w-4 text-gray-600 dark:text-gray-400" />
                          ) : (
                            <ChevronRight className="h-4 w-4 text-gray-600 dark:text-gray-400" />
                          )}
                          <span className="font-medium text-gray-800 dark:text-gray-200">{displayCategory}</span>
                          <span className="text-sm text-gray-500 dark:text-gray-400">
                            {displayErrors[category].length} {displayErrors[category].length === 1 ? 'issue' : 'issues'}
                          </span>
                        </div>
                      </div>

                      {expandedCategories[category] && (
                        <div className="divide-y divide-gray-100 dark:divide-gray-700">
                          {displayErrors[category].map((error, index) => {
                            const cardBorder =
                              error.severity === 'ERROR'
                                ? 'border-l-4 border-l-red-500'
                                : error.severity === 'WARNING'
                                  ? 'border-l-4 border-l-amber-500'
                                  : '';

                            return (
                              <div key={index} className={`p-4 ${cardBorder}`}>
                                <div className="flex items-start gap-3">
                                  <div className="mt-0.5">
                                    {error.severity === 'ERROR' && <XCircle className="h-5 w-5 text-red-500" />}
                                    {error.severity === 'WARNING' && <AlertTriangle className="h-5 w-5 text-amber-500" />}
                                    {error.severity === 'INFO' && <Info className="h-5 w-5 text-blue-500" />}
                                  </div>
                                  <div className="flex-1">
                                    <div className="flex flex-wrap items-center gap-2 mb-2">
                                      <SeverityBadge severity={error.severity} />
                                      <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                                        {translateErrorType(error.error_type)}
                                      </span>
                                    </div>
                                    <p className="text-sm text-gray-800 dark:text-gray-200 mb-2">{error.message}</p>
                                    <RecommendationCard recommendation={error.recommendation} />
                                    {error.actual_value && (
                                      <div className="mt-3">
                                        <div className="flex items-center text-sm text-gray-500 dark:text-gray-400 mb-1">
                                          <span>Current Value</span>
                                          <ArrowRight className="h-3 w-3 mx-1" />
                                        </div>
                                        {(typeof error.actual_value === 'string' ||
                                          typeof error.actual_value === 'number' ||
                                          typeof error.actual_value === 'boolean') ? (
                                          <div className="bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 p-3 rounded-md">
                                            <p className="text-sm text-gray-800 dark:text-gray-200">
                                              {String(error.actual_value)}
                                            </p>
                                          </div>
                                        ) : (
                                          <div className="bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 p-3 rounded-md overflow-x-auto">
                                            <ObjectValueTable data={error.actual_value} />
                                          </div>
                                        )}
                                      </div>
                                    )}
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
