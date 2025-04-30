'use client';

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import {
  Table,
  Save,
  Undo,
  Edit,
  Code,
  Filter,
  Download,
  ChevronDown,
  ChevronUp,
  FileText,
  BarChart2,
  Loader2,
  AlertTriangle,
  Check,
  RefreshCw
} from 'lucide-react';
import { processDataByFramework } from '@/lib/acra-data-processor';
import FrameworkSelector from './framework-view/framework-selector';
import TableView from './table-viewer';
import JsonViewer from './json-viewer';

import { FormJsonEditor } from './form-json-editor';

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

interface SaveStatus {
  type: 'success' | 'error' | 'info' | 'none';
  message: string;
}

/**
 * Extracts the actual data from different API response formats
 */
const extractDataFromResponse = (response: any): any => {
  // Handle case when response is null or undefined
  if (!response) return null;

  // For debugging
  console.log('Extracting data from response:', response);

  // Handle case where data is wrapped in a mapped_data property
  if (response.mapped_data) {
    console.log('Found data in mapped_data property');
    return response.mapped_data;
  }

  // Handle case where data is in the data property
  if (response.data) {
    // Check if data.mapped_data exists
    if (response.data.mapped_data) {
      console.log('Found data in data.mapped_data property');
      return response.data.mapped_data;
    }
    console.log('Found data in data property');
    return response.data;
  }

  // Handle case where data is in the result property
  if (response.result) {
    console.log('Found data in result property');
    return response.result;
  }

  // If data is not in any expected wrapper, return the whole response
  console.log('No standard data structure found, returning entire response');
  return response;
};

/**
 * Detects if data primarily uses snake_case naming convention
 */
const usesSnakeCase = (data: any): boolean => {
  if (!data || typeof data !== 'object') return false;

  let snakeCaseCount = 0;
  let camelCaseCount = 0;

  const countInObject = (obj: any) => {
    if (!obj || typeof obj !== 'object') return;

    Object.keys(obj).forEach(key => {
      if (key.includes('_')) snakeCaseCount++;
      else if (/[a-z][A-Z]/.test(key)) camelCaseCount++;

      // Recurse for nested objects
      if (obj[key] && typeof obj[key] === 'object') {
        countInObject(obj[key]);
      }
    });
  };

  countInObject(data);

  return snakeCaseCount > camelCaseCount;
};

const EditableDataVisualizer: React.FC<EditableDataVisualizerProps> = ({
  data,
  title = "",
  initialView = 'table',
  viewType,
  uuid,
  threadId,
  pdfId,
  baseUrl = "",
  onDataUpdate,
  activeStep
}) => {
  // Core state management
  const [activeView, setActiveView] = useState<'json' | 'table' | 'card'>(viewType || initialView);
  const [selectedFramework, setSelectedFramework] = useState<string>('sfrs-full');
  const [showFrameworkSelector, setShowFrameworkSelector] = useState<boolean>(false);

  // Data management
  const [originalData, setOriginalData] = useState<any>(null);
  const [processedData, setProcessedData] = useState<any>(null);
  const [editableData, setEditableData] = useState<any>(null);

  // UI states
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isFetching, setIsFetching] = useState(false);
  const [isFrameworkProcessing, setIsFrameworkProcessing] = useState<boolean>(false);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>({
    type: 'none',
    message: ''
  });

  // Refs for tracking data changes and avoiding unnecessary processing
  const isMounted = useRef(true);
  const processingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const dataRef = useRef<any>(null);
  const frameworkRef = useRef<string>('sfrs-full');

  // Track if data is primarily in snake_case format
  const [isSnakeCaseData, setIsSnakeCaseData] = useState<boolean>(false);

  // Initialize data on mount
  useEffect(() => {
    if (!data) return;

    let extractedData;
    if (data.mapped_data) {
      extractedData = data.mapped_data;
      console.log('Initial data has mapped_data structure');
    } else if (data.data && data.data.mapped_data) {
      extractedData = data.data.mapped_data;
      console.log('Initial data has data.mapped_data structure');
    } else if (data.data) {
      extractedData = data.data;
      console.log('Initial data has data structure');
    } else {
      extractedData = data;
      console.log('Using raw initial data');
    }

    // Set original data and processed data
    setOriginalData(extractedData);
    dataRef.current = extractedData;

    // Log the extracted data for debugging
    console.log('Data received:', data);
    console.log('Extracted data:', extractedData);

    // Update state with the extracted data
    setOriginalData(extractedData);
    setProcessedData(extractedData);
    dataRef.current = extractedData;

    // Detect if data is primarily in snake_case
    const usesSnakeCaseFormat = usesSnakeCase(extractedData);
    setIsSnakeCaseData(usesSnakeCaseFormat);
    console.log(`Data format detection: ${usesSnakeCaseFormat ? 'snake_case' : 'camelCase'}`);

    // Process data with the default framework
    processData(extractedData, selectedFramework);
  }, [data, selectedFramework]);

  // Lifecycle hooks
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

  // Deep equality check for objects
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

  // Process data through selected framework
  const processData = useCallback((dataToProcess, framework) => {
    if (!dataToProcess || !isMounted.current) return;

    // Extract data first
    let actualData = dataToProcess;
    if (dataToProcess.mapped_data) {
      actualData = dataToProcess.mapped_data;
      console.log('Processing mapped_data structure');
    } else if (dataToProcess.data && dataToProcess.data.mapped_data) {
      actualData = dataToProcess.data.mapped_data;
      console.log('Processing data.mapped_data structure');
    } else if (dataToProcess.data) {
      actualData = dataToProcess.data;
      console.log('Processing data structure');
    }

    setIsFrameworkProcessing(true);

    const currentFramework = framework;
    const currentData = dataToProcess;

    if (processingTimeoutRef.current) {
      clearTimeout(processingTimeoutRef.current);
    }

    processingTimeoutRef.current = setTimeout(() => {
      if (!isMounted.current) return;

      try {
        console.log('Processing data with framework:', framework);
        console.log('Data to process:', currentData);

        // Process the data through the framework
        const newProcessedData = processDataByFramework(currentData, framework);
        console.log('Processed data result:', newProcessedData);

        if (isMounted.current) {
          setProcessedData(newProcessedData);
          frameworkRef.current = framework;
        }
      } catch (error) {
        console.error('Error processing data for framework:', error);
        if (isMounted.current) {
          // If processing fails, use the original data
          setProcessedData(currentData);
          setSaveStatus({
            type: 'error',
            message: 'Error processing data for the selected framework'
          });
          // Auto-dismiss error after 5 seconds
          setTimeout(() => setSaveStatus({ type: 'none', message: '' }), 5000);
        }
      } finally {
        if (isMounted.current) {
          setIsFrameworkProcessing(false);
        }
        processingTimeoutRef.current = null;
      }
    }, 100);
  }, []);

  // Framework selection handler
  const handleFrameworkChange = useCallback((frameworkId: string) => {
    if (frameworkId === selectedFramework) return;

    setSelectedFramework(frameworkId);
    setShowFrameworkSelector(false);

    // Get the latest data for processing
    const dataToProcess = isEditing ? editableData : originalData;
    processData(dataToProcess, frameworkId);
  }, [selectedFramework, processData, isEditing, editableData, originalData]);

  const toggleFrameworkSelector = useCallback(() => {
    setShowFrameworkSelector(prev => !prev);
  }, []);

  const handleEdit = useCallback(async () => {
    if (!uuid) {
      setSaveStatus({
        type: 'error',
        message: 'Missing required UUID for editing'
      });
      return;
    }

    setIsFetching(true);
    setSaveStatus({
      type: 'info',
      message: 'Fetching latest data...'
    });

    try {
      const fetchUrl = `${baseUrl}/api/map/fetch/${uuid}/`;
      console.log('Fetching fresh data from:', fetchUrl);

      const response = await fetch(fetchUrl);

      if (!response.ok) {
        throw new Error(`Error fetching data: ${response.status}`);
      }

      const responseData = await response.json();
      console.log('Fetched data:', responseData); // Debug log to see the structure

      // Extract data from response
      let extractedData;
      if (responseData.mapped_data) {
        extractedData = responseData.mapped_data;
        console.log('Extracted mapped_data from response');
      } else if (responseData.data && responseData.data.mapped_data) {
        extractedData = responseData.data.mapped_data;
        console.log('Extracted data.mapped_data from response');
      } else if (responseData.data) {
        extractedData = responseData.data;
        console.log('Extracted data from response');
      } else {
        extractedData = responseData;
        console.log('Using raw response data');
      }

      // Update the editable data with the extracted data
      setEditableData(extractedData);
      setIsEditing(true);
      setSaveStatus({ type: 'none', message: '' });
    } catch (error) {
      console.error('Error fetching data for editing:', error);
      setSaveStatus({
        type: 'error',
        message: error instanceof Error ? error.message : 'Error fetching data'
      });
      // Auto-dismiss error after 5 seconds
      setTimeout(() => setSaveStatus({ type: 'none', message: '' }), 5000);
    } finally {
      setIsFetching(false);
    }
  }, [uuid, baseUrl]);

  const handleCancel = useCallback(() => {
    setEditableData(null);
    setIsEditing(false);
    setSaveStatus({ type: 'none', message: '' });
  }, []);

  // Handle data changes in the form editor
  const handleDataChange = useCallback((path: string[], value: any, event?: React.FormEvent) => {
    if (event) {
      event.preventDefault();
    }

    setEditableData(prevData => {
      if (!prevData) return prevData;

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

  const handleSave = async () => {
    if (!uuid || !editableData) {
      setSaveStatus({
        type: 'error',
        message: 'Missing required data for saving'
      });
      return;
    }

    setIsSaving(true);
    setSaveStatus({
      type: 'info',
      message: 'Saving changes...'
    });

    try {
      const updateApiUrl = `${baseUrl}/api/map/update/${uuid}/`;
      console.log('Saving data to:', updateApiUrl);

      // Prepare the payload
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
        throw new Error(`Error ${response.status}: ${errorText}`);
      }

      const responseData = await response.json();
      console.log('Save response:', responseData);

      // Extract the updated data from the response
      const updatedData = extractDataFromResponse(responseData);

      if (updatedData) {
        // Update all data references
        setOriginalData(updatedData);
        dataRef.current = updatedData;

        // Process the updated data with the current framework
        processData(updatedData, selectedFramework);

        setIsEditing(false);
        setEditableData(null);

        setSaveStatus({
          type: 'success',
          message: 'Data successfully saved!'
        });

        setTimeout(() => setSaveStatus({ type: 'none', message: '' }), 3000);

        // Notify parent component if callback exists
        if (onDataUpdate) {
          onDataUpdate(updatedData);
        }
      } else {
        throw new Error('Failed to extract data from response');
      }
    } catch (error) {
      console.error('Save failed:', error);
      setSaveStatus({
        type: 'error',
        message: `Failed to save: ${error instanceof Error ? error.message : 'Unknown error'}`
      });
      setTimeout(() => setSaveStatus({ type: 'none', message: '' }), 5000);
    } finally {
      setIsSaving(false);
    }
  };

  const handleExportData = useCallback(() => {
    try {
      const dataToExport = isEditing ? editableData : processedData;
      if (!dataToExport) {
        throw new Error('No data available to export');
      }

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
      setSaveStatus({
        type: 'error',
        message: `Export failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      });
      // Auto-dismiss error after 5 seconds
      setTimeout(() => setSaveStatus({ type: 'none', message: '' }), 5000);
    }
  }, [isEditing, editableData, processedData, title, selectedFramework, uuid]);

  // Get the framework title for display
  const getFrameworkTitle = useMemo(() => {
    const frameworkMetadata = processedData?._frameworkMetadata;
    if (frameworkMetadata && frameworkMetadata.name) {
      return frameworkMetadata.name;
    }

    const frameworkNames: Record<string, string> = {
      'sfrs-full': 'SFRS Full XBRL',
      'financial-statements': 'Financial Statements',
      'sfrs-simplified': 'SFRS Simplified',
      'compliance': 'Compliance Focus',
      'business-profile': 'Business Profile',
      'industry-specific': 'Industry View',
      'analytical': 'Analytical View',
      'simplified': 'Simplified View',
      'regulatory-reporting': 'Regulatory Reporting'
    };

    return frameworkNames[selectedFramework] || 'Default View';
  }, [processedData, selectedFramework]);

  // Get icon for the framework button
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

  // Render the JSON view
  const renderJsonView = useMemo(() => {
    const jsonData = isEditing ? editableData : processedData;
    if (!jsonData) return null;

    return (
      <JsonViewer
        data={jsonData}
        initialExpanded={false}
        maxInitialDepth={2}
      />
    );
  }, [editableData, processedData, isEditing]);

  // Render the JSON editor
  const renderJsonEditor = useMemo(() => {
    if (!editableData) return null;

    return (
      <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm">
        <div className="p-4">
          <FormJsonEditor
            data={editableData}
            onDataChange={handleDataChange}
            expandedByDefault={false}
            maxInitialDepth={2}
          />
        </div>
      </div>
    );
  }, [editableData, handleDataChange]);

  const renderControlButtons = useCallback(() => (
    <div className="flex flex-wrap gap-2">
      {!isEditing ? (
        <>
          {activeStep !== 'extracted' && (
            <button
              onClick={handleEdit}
              disabled={isFetching}
              className={`flex items-center gap-2 rounded-lg px-3 py-1.5 text-lg font-medium transition-all
                ${isFetching
                  ? 'bg-gray-100 text-gray-400 cursor-not-allowed dark:bg-gray-800 dark:text-gray-500'
                  : 'bg-blue-50 text-blue-700 hover:bg-blue-100 dark:bg-blue-900/20 dark:text-blue-300 dark:hover:bg-blue-900/30'
                }`}
            >
              {isFetching ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  <span>Loading...</span>
                </>
              ) : (
                <>
                  <Edit size={16} />
                  <span>Edit</span>
                </>
              )}
            </button>
          )}

          <div className="relative">
            <button
              onClick={toggleFrameworkSelector}
              className="flex items-center gap-2 rounded-lg bg-indigo-50 px-3 py-1.5 text-lg font-medium text-indigo-700 transition-all hover:bg-indigo-100 dark:bg-indigo-900/20 dark:text-indigo-300 dark:hover:bg-indigo-900/30"
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
            className="text-lg flex items-center gap-2 rounded-lg bg-emerald-50 px-3 py-1.5 font-medium text-emerald-700 transition-all hover:bg-emerald-100 dark:bg-emerald-900/20 dark:text-emerald-300 dark:hover:bg-emerald-900/30"
          >
            <Download size={16} />
            <span>Export</span>
          </button>
        </>
      ) : (
        <>
          <button
            onClick={handleCancel}
            className="flex items-center gap-2 rounded-lg bg-gray-100 px-3 py-1.5 text-lg font-medium text-gray-700 transition-all hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
            disabled={isSaving}
          >
            <Undo size={16} />
            <span>Cancel</span>
          </button>
          <button
            onClick={handleSave}
            className={`flex items-center gap-2 rounded-lg px-3 py-1.5 text-lg font-medium transition-all 
              ${isSaving
                ? 'bg-green-50/50 text-green-700/50 cursor-not-allowed dark:bg-green-900/10 dark:text-green-300/50'
                : 'bg-green-50 text-green-700 hover:bg-green-100 dark:bg-green-900/20 dark:text-green-300 dark:hover:bg-green-900/30'
              }`}
            disabled={isSaving}
          >
            {isSaving ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                <span>Saving...</span>
              </>
            ) : (
              <>
                <Save size={16} />
                <span>Save</span>
              </>
            )}
          </button>
        </>
      )}
    </div>
  ), [isEditing, isSaving, isFetching, showFrameworkSelector, getFrameworkIcon, getFrameworkTitle, handleEdit, toggleFrameworkSelector, handleExportData, handleCancel, handleSave]);

  // Render status message banner
  const renderStatusMessage = useCallback(() => {
    if (saveStatus.type === 'none') return null;

    const statusClasses = {
      success: 'bg-green-50 text-green-700 dark:bg-green-900/30 dark:text-green-300',
      error: 'bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-300',
      info: 'bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300'
    };

    const statusIcons = {
      success: <Check className="h-5 w-5 mr-2" />,
      error: <AlertTriangle className="h-5 w-5 mr-2" />,
      info: <Loader2 className="h-5 w-5 mr-2 animate-spin" />
    };

    return (
      <div className={`mx-5 mt-4 p-3 mb-0 rounded-md flex items-center ${statusClasses[saveStatus.type as keyof typeof statusClasses]}`}>
        {statusIcons[saveStatus.type as keyof typeof statusIcons]}
        {saveStatus.message}
      </div>
    );
  }, [saveStatus]);

  // Render content message when no data is available
  const renderNoDataMessage = () => (
    <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
      <AlertTriangle className="h-12 w-12 text-amber-500 mb-4" />
      <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">No Data Available</h3>
      <p className="text-lg text-gray-500 dark:text-gray-400 max-w-md">
        There is no data to display. Please make sure the data is properly loaded, or click the Edit button to fetch the latest data.
      </p>
    </div>
  );

  return (
    <div className="w-full space-y-4">
      <div className="bg-white dark:bg-gray-850 shadow-sm rounded-lg border border-gray-200 dark:border-gray-700">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between p-5 border-b border-gray-200 dark:border-gray-700">
          <div className="mb-4 sm:mb-0">
            <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-200 flex items-center">
              {title}
              {processedData?._frameworkMetadata && (
                <span className="ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-lg font-medium bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-300">
                  {getFrameworkTitle}
                </span>
              )}
            </h2>
            {processedData?._frameworkMetadata?.description && (
              <p className="mt-1 text-lg text-gray-500 dark:text-gray-400">
                {processedData._frameworkMetadata.description}
              </p>
            )}
          </div>
          {renderControlButtons()}
        </div>

        {renderStatusMessage()}

        {showFrameworkSelector && (
          <div className="mx-5 mt-4 p-4 bg-indigo-50/60 dark:bg-indigo-900/10 rounded-lg border border-indigo-100 dark:border-indigo-800/30">
            <div className="mb-3">
              <h3 className="text-lg font-medium text-indigo-800 dark:text-indigo-300">
                Select Framework View
              </h3>
              <p className="text-lg text-indigo-600 dark:text-indigo-400 mt-1">
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
                className={`flex items-center space-x-2 px-3 py-2 rounded-md text-lg font-medium transition-colors ${activeView === view
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
                <p className="text-lg text-gray-500 dark:text-gray-400">Processing {getFrameworkTitle} view...</p>
              </div>
            </div>
          ) : (
            <>
              {isEditing ? (
                renderJsonEditor
              ) : (
                activeView === 'json' ? (
                  <JsonViewer data={
                    processedData?.mapped_data ||
                    processedData?.data?.mapped_data ||
                    processedData?.data ||
                    processedData
                  } />
                ) : (
                  <TableView
                    data={
                      processedData?.mapped_data ||
                      processedData?.data?.mapped_data ||
                      processedData?.data ||
                      processedData
                    }
                    title={title}
                  />
                )
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