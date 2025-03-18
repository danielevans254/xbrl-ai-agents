'use client';

import React, { useState, useEffect } from 'react';




import { Layers, Table, CreditCard } from 'lucide-react';
import JsonViewer from './json-viewer';
import TableView from './table-viewer';
import CardView from './card-viewer';

interface DataVisualizerProps {
  data: any;
  title?: string;
  initialView?: 'json' | 'table' | 'card';
  viewType?: 'json' | 'table' | 'card';
}

const DataVisualizer: React.FC<DataVisualizerProps> = ({
  data,
  title = "Data Visualizer",
  initialView = 'json',
  viewType
}) => {
  const [activeView, setActiveView] = useState<'json' | 'table' | 'card'>(initialView);

  useEffect(() => {
    setActiveView(viewType || initialView);
  }, [viewType, initialView]);

  const views = [
    { id: 'json', label: 'JSON', icon: <Layers className="h-4 w-4" /> },
    { id: 'table', label: 'Table', icon: <Table className="h-4 w-4" /> },
    { id: 'card', label: 'Card', icon: <CreditCard className="h-4 w-4" /> },
  ];

  // Render the active view component
  const renderActiveView = () => {
    switch (activeView) {
      case 'json':
        return <JsonViewer data={data} initialExpanded={true} maxInitialDepth={2} />;
      case 'table':
        return <TableView data={data} title="Table View" />;
      case 'card':
        return <CardView data={data} title="Card View" />;
      default:
        return <JsonViewer data={data} initialExpanded={true} maxInitialDepth={2} />;
    }
  };

  return (
    <div className="w-full space-y-4">
      <div className="bg-white dark:bg-gray-850 shadow-sm rounded-lg border border-gray-200 dark:border-gray-700 p-4">
        <h2 className="text-lg font-medium text-gray-800 dark:text-gray-200 mb-4">{title}</h2>

        <div className="flex items-center space-x-2 mb-6 overflow-x-auto pb-2">
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

        <div>
          {renderActiveView()}
        </div>
      </div>
    </div>
  );
};

export default DataVisualizer;
