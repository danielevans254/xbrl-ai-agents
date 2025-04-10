'use client';

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { Table, Save, Undo, Edit, Code, Filter, Download, ChevronDown, ChevronUp, FileText, BarChart2 } from 'lucide-react';
import { processDataByFramework } from '@/lib/acra-data-processor';
import FrameworkSelector from './framework-view/framework-selector';
import TableView from './table-viewer';

interface EditableDataVisualizerProps {
  data: any;
  title?: string;
  initialView?: 'json' | 'table' | 'card';
  viewType?: 'json' | 'table' | 'card';
  uuid: string;
  threadId?: string;
  pdfId?: string;
  baseUrl?: string;
  onDataUpdate?: (newData: any) => void;
  activeStep?: string | null;
}

const EditableDataVisualizer: React.FC<EditableDataVisualizerProps> = ({
  data,
  title = "Data Visualizer",
  initialView = 'table',
  viewType,
  uuid,
  threadId,
  pdfId,
  baseUrl = "",
  onDataUpdate,
  activeStep
}) => {

  const isMounted = useRef(true);
  const processingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const dataRef = useRef<any>(null);
  const frameworkRef = useRef<string>('sfrs-full');

  const [activeView, setActiveView] = useState<'json' | 'table' | 'card'>(viewType || initialView);
  const [editableData, setEditableData] = useState<any>(data);
  const [originalData, setOriginalData] = useState<any>(data);
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<{
    type: 'success' | 'error' | 'none';
    message: string;
  }>({ type: 'none', message: '' });

  const [selectedFramework, setSelectedFramework] = useState<string>('sfrs-full');
  const [showFrameworkSelector, setShowFrameworkSelector] = useState<boolean>(false);
  const [isFrameworkProcessing, setIsFrameworkProcessing] = useState<boolean>(false);
  const [processedData, setProcessedData] = useState<any>(data);

  useEffect(() => {
    isMounted.current = true;

    return () => {
      isMounted.current = false;
      if (processingTimeoutRef.current) {
        clearTimeout(processingTimeoutRef.current);
        processingTimeoutRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    if (viewType) {
      setActiveView(viewType);
    }
  }, [viewType]);

  const isEqual = useCallback((a: any, b: any): boolean => {
    if (a === b) return true;

    if (
      typeof a !== 'object' ||
      typeof b !== 'object' ||
      a === null ||
      b === null
    ) {
      return a === b;
    }

    if (Array.isArray(a) && Array.isArray(b)) {
      if (a.length !== b.length) return false;
      for (let i = 0; i < a.length; i++) {
        if (!isEqual(a[i], b[i])) return false;
      }
      return true;
    }

    const keysA = Object.keys(a);
    const keysB = Object.keys(b);

    if (keysA.length !== keysB.length) return false;

    for (const key of keysA) {
      if (!b.hasOwnProperty(key)) return false;
      if (!isEqual(a[key], b[key])) return false;
    }

    return true;
  }, []);

  useEffect(() => {
    if (!data) return;

    if (!isEditing && dataRef.current && isEqual(data, dataRef.current) && selectedFramework === frameworkRef.current) {
      return;
    }

    dataRef.current = data;
    frameworkRef.current = selectedFramework;

    processData(data, selectedFramework);
  }, [data, selectedFramework, isEqual, isEditing]);

  const processData = useCallback((dataToProcess: any, framework: string) => {
    if (!dataToProcess || !isMounted.current) return;

    setIsFrameworkProcessing(true);

    const currentFramework = framework;
    const currentData = dataToProcess;

    if (processingTimeoutRef.current) {
      clearTimeout(processingTimeoutRef.current);
    }

    processingTimeoutRef.current = setTimeout(() => {
      if (!isMounted.current) return;

      try {
        if (framework === currentFramework && isEqual(dataToProcess, currentData)) {
          const newProcessedData = processDataByFramework(dataToProcess, framework);

          if (isMounted.current) {
            setProcessedData(newProcessedData);
            if (isEditing) {
              setEditableData(newProcessedData);
            }
          }
        }
      } catch (error) {
        console.error('Error processing data for framework:', error);
        if (isMounted.current) {
          setProcessedData(dataToProcess);
        }
      } finally {
        if (isMounted.current) {
          setIsFrameworkProcessing(false);
        }
        processingTimeoutRef.current = null;
      }
    }, 100);
  }, [isEqual, isEditing]);

  useEffect(() => {
    if (!isEditing && data !== editableData) {
      setEditableData(data);
      setOriginalData(data);
    }
  }, [data, editableData, isEditing]);

  const handleFrameworkChange = useCallback((frameworkId: string) => {
    if (frameworkId === selectedFramework) return;

    setSelectedFramework(frameworkId);
    setShowFrameworkSelector(false);

    frameworkRef.current = frameworkId;

    processData(isEditing ? editableData : dataRef.current, frameworkId);
  }, [selectedFramework, processData, isEditing, editableData]);

  const toggleFrameworkSelector = useCallback(() => {
    setShowFrameworkSelector(prev => !prev);
  }, []);

  const handleEdit = useCallback(() => {
    setIsEditing(true);
    setSaveStatus({ type: 'none', message: '' });
  }, []);

  const handleCancel = useCallback(() => {
    setEditableData(originalData);
    setIsEditing(false);
    setSaveStatus({ type: 'none', message: '' });
  }, [originalData]);

  const handleSave = async () => {
    if (!uuid) {
      setSaveStatus({
        type: 'error',
        message: 'Missing required data (UUID)'
      });
      return;
    }

    setIsSaving(true);
    setSaveStatus({ type: 'none', message: '' });

    try {
      console.log('Updating data for UUID:', uuid);

      const updateApiUrl = `${baseUrl}/api/v1/mapping/update/${uuid}/`;
      console.log('Sending update to:', updateApiUrl);

      const payload = {
        mapped_data: editableData
      };

      const response = await fetch(updateApiUrl, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Update failed:', response.status, errorText);
        throw new Error(`Error ${response.status}: ${errorText}`);
      }

      const responseData = await response.json();
      console.log('Update successful, response:', responseData);

      if (responseData && responseData.data) {
        setOriginalData(responseData.data);
        setEditableData(responseData.data);

        dataRef.current = responseData.data;

        processData(responseData.data, selectedFramework);
      } else {
        const fetchUrl = `${baseUrl}/api/v1/mapping/partial-xbrl/${uuid}/`;
        const fetchResponse = await fetch(fetchUrl);

        if (!fetchResponse.ok) {
          throw new Error(`Error fetching updated data: ${fetchResponse.status}`);
        }

        const fetchedData = await fetchResponse.json();
        if (fetchedData && fetchedData.data) {
          setOriginalData(fetchedData.data);
          setEditableData(fetchedData.data);

          dataRef.current = fetchedData.data;

          processData(fetchedData.data, selectedFramework);
        }
      }

      setIsEditing(false);
      setSaveStatus({
        type: 'success',
        message: 'Data successfully updated!'
      });

      if (onDataUpdate) {
        onDataUpdate(editableData);
      }
    } catch (error) {
      console.error('Save failed:', error);
      setSaveStatus({
        type: 'error',
        message: `Failed to save: ${error instanceof Error ? error.message : 'Unknown error'}`
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleDataChange = useCallback((path: string[], value: any, event?: React.FormEvent) => {
    if (event) {
      event.preventDefault();
    }

    setEditableData(prevData => {
      const newData = JSON.parse(JSON.stringify(prevData));
      let current = newData;

      for (let i = 0; i < path.length - 1; i++) {
        if (current[path[i]] === undefined || current[path[i]] === null) {
          current[path[i]] = {};
        }
        current = current[path[i]];
      }

      if (path.length > 0) {
        current[path[path.length - 1]] = value;
        return newData;
      } else {
        return value;
      }
    });
  }, []);

  // Handle data export
  const handleExportData = useCallback(() => {
    try {
      const dataToExport = isEditing ? editableData : processedData;
      const jsonString = JSON.stringify(dataToExport, null, 2);
      const dataBlob = new Blob([jsonString], { type: 'application/json' });
      const url = URL.createObjectURL(dataBlob);

      const link = document.createElement('a');
      link.href = url;
      link.download = `${title.replace(/\s+/g, '-').toLowerCase()}-${selectedFramework}-${uuid}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Export failed:', error);
    }
  }, [isEditing, editableData, processedData, title, selectedFramework, uuid]);

  const getFrameworkTitle = useMemo(() => {
    const frameworkMetadata = processedData?._frameworkMetadata;
    if (frameworkMetadata && frameworkMetadata.name) {
      return frameworkMetadata.name;
    }

    const frameworkNames: Record<string, string> = {
      'sfrs-full': 'SFRS Full XBRL',
      'financial-statements': 'Financial Statements',
      'sfrs-simplified': 'SFRS Simplified',
      'compliance-focused': 'Compliance Focus',
      'analytical': 'Analytical View',
      'industry-banking': 'Banking Industry',
      'industry-insurance': 'Insurance Industry',
      'regulatory-reporting': 'Regulatory Reporting'
    };

    return frameworkNames[selectedFramework] || 'Default View';
  }, [processedData, selectedFramework]);

  const getFrameworkIcon = useCallback(() => {
    switch (selectedFramework) {
      case 'financial-statements':
        return <FileText className="h-4 w-4 mr-1.5" />;
      case 'analytical':
        return <BarChart2 className="h-4 w-4 mr-1.5" />;
      default:
        return <Filter className="h-4 w-4 mr-1.5" />;
    }
  }, [selectedFramework]);

  const renderJsonView = useMemo(() => {
    const jsonData = isEditing ? editableData : processedData;
    if (!jsonData) return null;

    return (
      <div className="bg-white dark:bg-gray-900 p-6 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm">
        <div
          className="overflow-auto max-h-[70vh] pr-2 custom-scrollbar"
        >
          <pre className="text-sm overflow-auto whitespace-pre-wrap break-words">
            <code className="text-gray-800 dark:text-gray-200">
              {JSON.stringify(jsonData, null, 2)}
            </code>
          </pre>
        </div>
      </div>
    );
  }, [editableData, processedData, isEditing]);

  const renderControlButtons = useCallback(() => (
    <div className="flex flex-wrap gap-2">
      {!isEditing ? (
        <>
          <button
            onClick={handleEdit}
            className="flex items-center gap-2 rounded-lg bg-blue-50 px-3 py-1.5 text-sm font-medium text-blue-700 transition-all hover:bg-blue-100 dark:bg-blue-900/20 dark:text-blue-300 dark:hover:bg-blue-900/30"
          >
            <Edit size={16} />
            <span>Edit</span>
          </button>

          <div className="relative">
            <button
              onClick={toggleFrameworkSelector}
              className="flex items-center gap-2 rounded-lg bg-indigo-50 px-3 py-1.5 text-sm font-medium text-indigo-700 transition-all hover:bg-indigo-100 dark:bg-indigo-900/20 dark:text-indigo-300 dark:hover:bg-indigo-900/30"
            >
              {getFrameworkIcon()}
              <span>Framework: {getFrameworkTitle}</span>
              {showFrameworkSelector ?
                <ChevronUp className="h-4 w-4 ml-1" /> :
                <ChevronDown className="h-4 w-4 ml-1" />
              }
            </button>
          </div>

          <button
            onClick={handleExportData}
            className="flex items-center gap-2 rounded-lg bg-emerald-50 px-3 py-1.5 text-sm font-medium text-emerald-700 transition-all hover:bg-emerald-100 dark:bg-emerald-900/20 dark:text-emerald-300 dark:hover:bg-emerald-900/30"
          >
            <Download size={16} />
            <span>Export</span>
          </button>
        </>
      ) : (
        <>
          <button
            onClick={handleCancel}
            className="flex items-center gap-2 rounded-lg bg-gray-100 px-3 py-1.5 text-sm font-medium text-gray-700 transition-all hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
            disabled={isSaving}
          >
            <Undo size={16} />
            <span>Cancel</span>
          </button>
          <button
            onClick={handleSave}
            className="flex items-center gap-2 rounded-lg bg-green-50 px-3 py-1.5 text-sm font-medium text-green-700 transition-all hover:bg-green-100 dark:bg-green-900/20 dark:text-green-300 dark:hover:bg-green-900/30"
            disabled={isSaving}
          >
            <Save size={16} />
            <span>{isSaving ? 'Saving...' : 'Save'}</span>
          </button>
        </>
      )}
    </div>
  ), [isEditing, isSaving, showFrameworkSelector, getFrameworkIcon, getFrameworkTitle, handleEdit, toggleFrameworkSelector, handleExportData, handleCancel, handleSave]);

  return (
    <div className="w-full space-y-4">
      <div className="bg-white dark:bg-gray-850 shadow-sm rounded-lg border border-gray-200 dark:border-gray-700">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between p-5 border-b border-gray-200 dark:border-gray-700">
          <div className="mb-4 sm:mb-0">
            <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-200 flex items-center">
              {title}
              {processedData?._frameworkMetadata && (
                <span className="ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-300">
                  {getFrameworkTitle}
                </span>
              )}
            </h2>
            {processedData?._frameworkMetadata?.description && (
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                {processedData._frameworkMetadata.description}
              </p>
            )}
          </div>
          {renderControlButtons()}
        </div>

        {saveStatus.type !== 'none' && (
          <div className={`mx-5 mt-4 p-3 mb-0 rounded-md ${saveStatus.type === 'success'
            ? 'bg-green-50 text-green-700 dark:bg-green-900/30 dark:text-green-300'
            : 'bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-300'
            }`}>
            {saveStatus.message}
          </div>
        )}

        {showFrameworkSelector && (
          <div className="mx-5 mt-4 p-4 bg-indigo-50/60 dark:bg-indigo-900/10 rounded-lg border border-indigo-100 dark:border-indigo-800/30">
            <div className="mb-3">
              <h3 className="text-sm font-medium text-indigo-800 dark:text-indigo-300">
                Select Framework View
              </h3>
              <p className="text-xs text-indigo-600 dark:text-indigo-400 mt-1">
                Choose how to visualize your XBRL data based on different frameworks
              </p>
            </div>
            <FrameworkSelector
              onFrameworkChange={handleFrameworkChange}
              initialFramework={selectedFramework}
            />
          </div>
        )}

        {!isEditing && (
          <div className="flex items-center space-x-1 px-5 mt-4 overflow-x-auto">
            {['table', 'json'].map((view) => (
              <button
                key={view}
                onClick={() => setActiveView(view as 'table' | 'json')}
                className={`flex items-center space-x-2 px-3 py-2 rounded-md text-sm font-medium transition-colors ${activeView === view
                  ? 'bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-300'
                  : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800/50'
                  }`}
              >
                {view === 'table' ? (
                  <><Table className="h-4 w-4" /><span>Table</span></>
                ) : (
                  <><Code className="h-4 w-4" /><span>JSON</span></>
                )}
              </button>
            ))}
          </div>
        )}

        <div className="p-5">
          {isFrameworkProcessing ? (
            <div className="flex items-center justify-center py-16">
              <div className="flex flex-col items-center">
                <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-t-2 border-blue-500 mb-4"></div>
                <p className="text-sm text-gray-500 dark:text-gray-400">Processing {getFrameworkTitle} view...</p>
              </div>
            </div>
          ) : (
            <>
              {activeView === 'json' ? (
                renderJsonView
              ) : (
                <TableView
                  data={isEditing ? editableData : processedData}
                  title={title}
                />
              )}
            </>
          )}
        </div>
      </div>

      <style jsx global>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 8px;
          height: 8px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: #f1f1f1;
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #c1c1c1;
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: #a8a8a8;
        }
        .dark .custom-scrollbar::-webkit-scrollbar-track {
          background: #2d2d2d;
        }
        .dark .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #4a4a4a;
        }
        .dark .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: #5a5a5a;
        }
      `}</style>
    </div>
  );
};

export default React.memo(EditableDataVisualizer);

function useMemo(arg0: () => any, arg1: any[]) {
  throw new Error('Function not implemented.');
}
