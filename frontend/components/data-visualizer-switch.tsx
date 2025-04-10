'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Table, Save, Undo, Edit, Code, Filter, Download, ChevronDown, ChevronUp, FileText, BarChart2 } from 'lucide-react';
import TableView from './table-viewer';
import FormJsonEditor from './form-json-editor';
import { useToast } from '@/hooks/use-toast';
import FrameworkSelector from './framework-view/framework-selector';
import { processDataByFramework as processDataByFrameworkFn } from '@/lib/acra-data-processor';

interface DataVisualizerProps {
  data: any;
  title?: string;
  initialView?: 'json' | 'table' | 'card';
  viewType?: 'json' | 'table' | 'card';
  uuid: string;
  threadId?: string;
  pdfId?: string;
  baseUrl?: string;
  onDataUpdate?: (newData: any) => void;
}

const EditableDataVisualizer: React.FC<DataVisualizerProps> = ({
  data,
  title = "Data Visualizer",
  initialView = 'table',
  viewType,
  uuid,
  threadId,
  pdfId,
  baseUrl = "",
  onDataUpdate
}) => {
  const { toast } = useToast();
  const [activeView, setActiveView] = useState<'json' | 'table' | 'card'>(initialView);
  const [editableData, setEditableData] = useState<any>(data);
  const [originalData, setOriginalData] = useState<any>(data);
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<{
    type: 'success' | 'error' | 'none';
    message: string;
  }>({ type: 'none', message: '' });

  // ACRA Framework integration
  const [selectedFramework, setSelectedFramework] = useState<string>('full-acra');
  const [showFrameworkSelector, setShowFrameworkSelector] = useState<boolean>(false);
  const [isFrameworkProcessing, setIsFrameworkProcessing] = useState<boolean>(false);
  const [processedData, setProcessedData] = useState<any>(data);

  const editorContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setActiveView(viewType || initialView);
  }, [viewType, initialView]);

  useEffect(() => {
    setEditableData(data);
    setOriginalData(data);
    setProcessedData(data);
  }, [data]);

  // Process data when framework changes
  useEffect(() => {
    if (data && selectedFramework) {
      processData();
    }
  }, [data, selectedFramework]);

  const processData = () => {
    setIsFrameworkProcessing(true);

    // Use setTimeout for better UX when processing
    setTimeout(() => {
      try {
        // Direct function call instead of dynamic import
        const newProcessedData = processDataByFrameworkFn(data, selectedFramework);
        setProcessedData(newProcessedData);

        if (isEditing) {
          setEditableData(newProcessedData);
        }
      } catch (error) {
        console.error('Error processing data for framework:', error);
        setProcessedData(data);

        toast({
          title: 'Processing Error',
          description: 'Failed to process data with the selected framework',
          variant: 'destructive',
        });
      } finally {
        setIsFrameworkProcessing(false);
      }
    }, 300);
  };

  const views = [
    { id: 'table', label: 'Table', icon: <Table className="h-4 w-4" /> },
    { id: 'json', label: 'JSON', icon: <Code className="h-4 w-4" /> },
  ];

  const handleEdit = () => {
    setIsEditing(true);
    setSaveStatus({ type: 'none', message: '' });
  };

  const handleCancel = () => {
    setEditableData(originalData);
    setIsEditing(false);
    setSaveStatus({ type: 'none', message: '' });
  };

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

      // Log data being sent to help debug
      console.log('Data being sent:', editableData);

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
        setProcessedData(responseData.data);

        // Reprocess the data with the current framework after update
        setTimeout(() => {
          try {
            const newProcessedData = processDataByFrameworkFn(responseData.data, selectedFramework);
            setProcessedData(newProcessedData);
          } catch (error) {
            console.error('Error processing updated data:', error);
          }
        }, 0);
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

          // Process the fetched data with the current framework
          const newProcessedData = processDataByFrameworkFn(fetchedData.data, selectedFramework);
          setProcessedData(newProcessedData);
        }
      }

      setIsEditing(false);
      setSaveStatus({
        type: 'success',
        message: 'Data successfully updated!'
      });

      // Notify parent component about the update
      if (onDataUpdate) {
        onDataUpdate(editableData);
      }

      toast({
        title: 'Success',
        description: 'Data updated successfully',
      });
    } catch (error) {
      console.error('Save failed:', error);
      setSaveStatus({
        type: 'error',
        message: `Failed to save: ${error instanceof Error ? error.message : 'Unknown error'}`
      });

      toast({
        title: 'Update Failed',
        description: error instanceof Error ? error.message : 'Failed to update data',
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleDataChange = (path: string[], value: any, event?: React.FormEvent) => {
    if (event) {
      event.preventDefault();
    }

    const newData = JSON.parse(JSON.stringify(editableData));

    let current = newData;
    for (let i = 0; i < path.length - 1; i++) {
      if (current[path[i]] === undefined || current[path[i]] === null) {
        current[path[i]] = {};
      }
      current = current[path[i]];
    }

    if (path.length > 0) {
      current[path[path.length - 1]] = value;
    } else {
      return setEditableData(value);
    }

    setEditableData(newData);
  };

  const handleFrameworkChange = (frameworkId: string) => {
    setSelectedFramework(frameworkId);
    setShowFrameworkSelector(false); // Auto-hide selector after selection for cleaner UI

    toast({
      title: 'Framework Changed',
      description: `Viewing data with the ${formatFrameworkName(frameworkId)} framework`,
    });
  };

  const formatFrameworkName = (frameworkId: string): string => {
    return frameworkId
      .split('-')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  const toggleFrameworkSelector = () => {
    setShowFrameworkSelector(prev => !prev);
  };

  const handleExportData = () => {
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

      toast({
        title: 'Export Successful',
        description: 'Data exported successfully',
      });
    } catch (error) {
      console.error('Export failed:', error);
      toast({
        title: 'Export Failed',
        description: 'Failed to export data',
        variant: 'destructive',
      });
    }
  };

  const getFrameworkTitle = () => {
    const frameworkMetadata = processedData?._frameworkMetadata;
    if (frameworkMetadata && frameworkMetadata.name) {
      return frameworkMetadata.name;
    }
    return formatFrameworkName(selectedFramework);
  };

  const getFrameworkIcon = () => {
    switch (selectedFramework) {
      case 'financial-statements':
        return <FileText className="h-4 w-4 mr-1.5" />;
      case 'analytical':
        return <BarChart2 className="h-4 w-4 mr-1.5" />;
      default:
        return <Filter className="h-4 w-4 mr-1.5" />;
    }
  };

  const renderActiveView = () => {
    if (isFrameworkProcessing) {
      return (
        <div className="flex items-center justify-center py-16">
          <div className="flex flex-col items-center">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-t-2 border-blue-500 mb-4"></div>
            <p className="text-sm text-gray-500 dark:text-gray-400">Processing {getFrameworkTitle()} view...</p>
          </div>
        </div>
      );
    }

    if (isEditing || activeView === 'json') {
      return (
        <div className="bg-white dark:bg-gray-900 p-6 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm">
          {isEditing && (
            <h3 className="text-lg font-semibold mb-6 text-gray-800 dark:text-gray-200">
              ✍️ Edit Data Structure
            </h3>
          )}
          <div
            ref={editorContainerRef}
            className="overflow-auto max-h-[70vh] pr-2 custom-scrollbar"
          >
            <FormJsonEditor
              data={isEditing ? editableData : processedData}
              onDataChange={handleDataChange}
            />
          </div>
        </div>
      );
    }

    return (
      <div className="rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
        <TableView data={processedData} title={title} />
      </div>
    );
  };

  const renderControlButtons = () => (
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
              <span>Framework: {getFrameworkTitle()}</span>
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
  );

  return (
    <div className="w-full space-y-4">
      <div className="bg-white dark:bg-gray-850 shadow-sm rounded-lg border border-gray-200 dark:border-gray-700">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between p-5 border-b border-gray-200 dark:border-gray-700">
          <div className="mb-4 sm:mb-0">
            <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-200 flex items-center">
              {title}
              {processedData?._frameworkMetadata && (
                <span className="ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-300">
                  {getFrameworkTitle()}
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
            {views.map((view) => (
              <button
                key={view.id}
                onClick={() => setActiveView(view.id as any)}
                className={`flex items-center space-x-2 px-3 py-2 rounded-md text-sm font-medium transition-colors ${activeView === view.id
                  ? 'bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-300'
                  : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800/50'
                  }`}
              >
                {view.icon}
                <span>{view.label}</span>
              </button>
            ))}
          </div>
        )}

        <div className="p-5">
          {renderActiveView()}
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

export default EditableDataVisualizer;