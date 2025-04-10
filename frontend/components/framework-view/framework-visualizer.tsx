import React, { useState, useEffect } from 'react';
import { ChevronDown, AlertCircle, Layout, BarChart2, Download, FileText } from 'lucide-react';
import TableView from '../table-viewer';
import FrameworkSelector from './framework-selector';
import { processDataByFramework } from '@/lib/acra-data-processor';
import JsonViewer from '../json-viewer';

interface ACRADataVisualizerProps {
  data: any;
  title?: string;
  initialView?: 'json' | 'table';
  uuid: string;
  onDataUpdate?: (newData: any) => void;
}

const ACRADataVisualizer: React.FC<ACRADataVisualizerProps> = ({
  data,
  title = "ACRA XBRL Data Visualizer",
  initialView = 'table',
  uuid,
  onDataUpdate
}) => {
  const [activeView, setActiveView] = useState<'json' | 'table'>(initialView);
  const [selectedFramework, setSelectedFramework] = useState<string>('full-acra');
  const [processedData, setProcessedData] = useState<any>(data);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Process data when framework changes
  useEffect(() => {
    setIsLoading(true);
    setError(null);

    // Use setTimeout to make the loading state visible for better UX
    setTimeout(() => {
      try {
        const newProcessedData = processDataByFramework(data, selectedFramework);
        setProcessedData(newProcessedData);
      } catch (error) {
        console.error('Error processing data for framework:', error);
        setError('Failed to process data for the selected framework');
        // Fallback to original data in case of error
        setProcessedData(data);
      } finally {
        setIsLoading(false);
      }
    }, 300);
  }, [data, selectedFramework]);

  const handleFrameworkChange = (frameworkId: string) => {
    setSelectedFramework(frameworkId);
  };

  const handleDataExport = () => {
    try {
      const jsonString = JSON.stringify(processedData, null, 2);
      const dataBlob = new Blob([jsonString], { type: 'application/json' });
      const url = URL.createObjectURL(dataBlob);

      const link = document.createElement('a');
      link.href = url;
      link.download = `${title.replace(/\s+/g, '-').toLowerCase()}-${selectedFramework}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error exporting data:', error);
    }
  };

  const renderFrameworkBadge = () => {
    if (!processedData?._frameworkMetadata) return null;

    const metadata = processedData._frameworkMetadata;
    let bgColor = 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300';
    let icon = <Layout size={14} className="mr-1" />;

    // Customize badge based on framework
    switch (selectedFramework) {
      case 'financial-statements':
        bgColor = 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300';
        icon = <FileText size={14} className="mr-1" />;
        break;
      case 'analytical':
        bgColor = 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300';
        icon = <BarChart2 size={14} className="mr-1" />;
        break;
      case 'compliance':
        bgColor = 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300';
        icon = <AlertCircle size={14} className="mr-1" />;
        break;
    }

    return (
      <div className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${bgColor}`}>
        {icon}
        {metadata.name}
      </div>
    );
  };

  const views = [
    { id: 'table', label: 'Table View', icon: <Layout className="h-4 w-4" /> },
    { id: 'json', label: 'JSON View', icon: <FileText className="h-4 w-4" /> },
  ];

  const renderActiveView = () => {
    if (isLoading) {
      return (
        <div className="flex items-center justify-center p-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
        </div>
      );
    }

    if (error) {
      return (
        <div className="p-6 text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-red-100 text-red-500 mb-4">
            <AlertCircle size={32} />
          </div>
          <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">Processing Error</h3>
          <p className="text-gray-500 dark:text-gray-400">{error}</p>
        </div>
      );
    }

    if (activeView === 'json') {
      return <JsonViewer data={processedData} initialExpanded={true} maxInitialDepth={2} />;
    }

    return (
      <div className="rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
        <TableView data={processedData} title={getFrameworkTitle()} />
      </div>
    );
  };

  const getFrameworkTitle = (): string => {
    const frameworkMetadata = processedData?._frameworkMetadata;
    if (frameworkMetadata && frameworkMetadata.name) {
      return `${title} - ${frameworkMetadata.name}`;
    }
    return title;
  };

  return (
    <div className="w-full space-y-4">
      <div className="bg-white dark:bg-gray-850 shadow-sm rounded-lg border border-gray-200 dark:border-gray-700">
        <div className="p-6 border-b border-gray-200 dark:border-gray-700">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h2 className="text-xl font-semibold text-gray-800 dark:text-gray-200 mb-1">
                {title}
              </h2>
              <div className="flex items-center text-sm text-gray-500 dark:text-gray-400">
                {renderFrameworkBadge()}
                {processedData?.filingInformation && (
                  <span className="ml-2">
                    {processedData.filingInformation.CurrentPeriodEndDate}
                  </span>
                )}
              </div>
            </div>

            <button
              onClick={handleDataExport}
              className="inline-flex items-center gap-2 px-4 py-2 bg-blue-50 text-blue-700 hover:bg-blue-100 rounded-lg text-sm font-medium transition-colors dark:bg-blue-900/20 dark:text-blue-300 dark:hover:bg-blue-900/30"
            >
              <Download size={16} />
              Export Data
            </button>
          </div>
        </div>

        {processedData?._frameworkMetadata?.description && (
          <div className="px-6 py-3 bg-gray-50 dark:bg-gray-800/50 border-b border-gray-200 dark:border-gray-700">
            <div className="flex items-center space-x-2 text-sm text-gray-600 dark:text-gray-400">
              <AlertCircle size={14} />
              <span>{processedData._frameworkMetadata.description}</span>
            </div>
          </div>
        )}

        <div className="flex flex-col sm:flex-row items-start sm:items-center p-6 pt-4 pb-4 gap-4">
          <div className="w-full sm:w-80">
            <FrameworkSelector
              onFrameworkChange={handleFrameworkChange}
              initialFramework={selectedFramework}
            />
          </div>

          <div className="flex-1 flex justify-end">
            <div className="flex items-center space-x-2 overflow-x-auto pb-2">
              {views.map((view) => (
                <button
                  key={view.id}
                  onClick={() => setActiveView(view.id as any)}
                  className={`flex items-center space-x-2 px-3 py-2 rounded-md text-sm font-medium transition-colors ${activeView === view.id
                    ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300'
                    : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'
                    }`}
                >
                  {view.icon}
                  <span>{view.label}</span>
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="p-6 pt-0">
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

export default ACRADataVisualizer;