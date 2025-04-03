'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Layers, Table, CreditCard, Save, Undo, Edit } from 'lucide-react';
import JsonViewer from './json-viewer';
import TableView from './table-viewer';
import CardView from './card-viewer';

interface DataVisualizerProps {
  data: any;
  title?: string;
  initialView?: 'json' | 'table' | 'card';
  viewType?: 'json' | 'table' | 'card';
  uuid: string;
  baseUrl?: string;
  onDataUpdate?: (newData: any) => void;
}

const EditableDataVisualizer: React.FC<DataVisualizerProps> = ({
  data,
  title = "Data Visualizer",
  initialView = 'table',
  viewType,
  // TODO:
  uuid,
  baseUrl = "",
  onDataUpdate
}) => {
  const [activeView, setActiveView] = useState<'json' | 'table' | 'card'>(initialView);
  const [editableData, setEditableData] = useState<any>(data);
  const [originalData, setOriginalData] = useState<any>(data);
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<{
    type: 'success' | 'error' | 'none';
    message: string;
  }>({ type: 'none', message: '' });

  // Ref for the editor container to prevent scroll jumps
  const editorContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setActiveView(viewType || initialView);
  }, [viewType, initialView]);

  useEffect(() => {
    setEditableData(data);
    setOriginalData(data);
  }, [data]);

  const views = [
    { id: 'json', label: 'JSON', icon: <Layers className="h-4 w-4" /> },
    { id: 'table', label: 'Table', icon: <Table className="h-4 w-4" /> },
    // { id: 'card', label: 'Card', icon: <CreditCard className="h-4 w-4" /> },
  ];

  const handleEdit = () => {
    setIsEditing(true);
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
        message: 'UUID is required to update data'
      });
      return;
    }

    setIsSaving(true);
    setSaveStatus({ type: 'none', message: '' });

    try {
      const apiUrl = `${baseUrl}/api/map/${uuid}/`;

      const response = await fetch(apiUrl, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          credentials: 'include',
        },
        body: JSON.stringify(editableData),
      });

      if (!response.ok) {
        throw new Error(`Error: ${response.status}`);
      }

      const xbrlApiUrl = `http://127.0.0.1:8000/api/v1/mapping/partial-xbrl/${uuid}/`;

      const xbrlResponse = await fetch(xbrlApiUrl, {
        headers: {
          credentials: 'include',
        },
      });

      if (!xbrlResponse.ok) {
        throw new Error(`Error fetching XBRL data: ${xbrlResponse.status}`);
      }

      const updatedData = await xbrlResponse.json();
      setOriginalData(updatedData);
      setEditableData(updatedData);
      setIsEditing(false);
      setSaveStatus({
        type: 'success',
        message: 'Data successfully updated!'
      });

      if (onDataUpdate) {
        onDataUpdate(updatedData);
      }
    } catch (error) {
      setSaveStatus({
        type: 'error',
        message: `Failed to save: ${error instanceof Error ? error.message : 'Unknown error'}`
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleDataChange = (path: string[], value: any, event?: React.FormEvent) => {
    // Prevent default form behavior to avoid page scroll
    if (event) {
      event.preventDefault();
    }

    // Create a deep copy of editableData
    const newData = JSON.parse(JSON.stringify(editableData));

    // Navigate to the correct location in the data structure
    let current = newData;
    for (let i = 0; i < path.length - 1; i++) {
      current = current[path[i]];
    }

    // Update the value
    current[path[path.length - 1]] = value;
    setEditableData(newData);
  };

  // Enhanced editable JSON viewer with improved UI and scroll handling
  const EditableJsonViewer = ({ data, path = [] }: { data: any; path?: string[] }) => {
    const [isEditing, setIsEditing] = useState(false);
    const [currentValue, setCurrentValue] = useState<string | number | boolean>(
      data === null ? '' : data
    );

    // Handle input changes for primitive values
    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const { value, type } = e.target;
      let parsedValue: any = value;

      if (typeof data === 'number') {
        parsedValue = value === '' ? 0 : parseFloat(value);
      } else if (typeof data === 'boolean') {
        parsedValue = value === 'true';
      }

      setCurrentValue(parsedValue);
    };

    // Handle form submission and update data
    const handleSubmit = (e: React.FormEvent) => {
      e.preventDefault();
      handleDataChange(path, currentValue, e);
      setIsEditing(false);
    };

    // For primitive values (string, number, boolean, null)
    if (data === null || typeof data !== 'object') {
      return (
        <div className="py-1 flex items-center group">
          <span className="text-indigo-600 dark:text-indigo-400 font-semibold mr-1.5 min-w-24 text-right">
            {path.length > 0 ? path[path.length - 1] : 'value'}:
          </span>

          {isEditing ? (
            <form onSubmit={handleSubmit} className="flex flex-1 items-center gap-2">
              <input
                type={typeof data === 'number' ? 'number' : 'text'}
                value={String(currentValue)}
                onChange={handleInputChange}
                autoFocus
                onBlur={handleSubmit}
                className="flex-1 rounded border bg-white px-2 py-1 text-sm focus:ring-2 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100"
              />
              <button
                type="submit"
                className="rounded p-1 text-green-600 hover:bg-green-50 dark:text-green-400 dark:hover:bg-green-900/20"
              >
                <Save size={14} />
              </button>
            </form>
          ) : (
            <div
              className="flex flex-1 cursor-pointer items-center gap-2"
              onClick={() => setIsEditing(true)}
            >
              <span className={`font-mono text-sm ${typeof data === 'string' ? 'text-green-700 dark:text-green-300' :
                typeof data === 'number' ? 'text-blue-700 dark:text-blue-300' :
                  typeof data === 'boolean' ? 'text-orange-700 dark:text-orange-300' :
                    'text-gray-500 dark:text-gray-400'
                }`}>
                {data === null ? 'null' : String(data)}
              </span>
              <Edit className="invisible h-3 w-3 text-gray-400 group-hover:visible dark:text-gray-500" />
            </div>
          )}
        </div>
      );
    }

    // For arrays
    if (Array.isArray(data)) {
      return (
        <div className="ml-4 border-l-2 border-gray-200 dark:border-gray-700 pl-3 my-1">
          <div className="text-gray-600 dark:text-gray-400 flex items-center">
            {path.length > 0 && (
              <span className="text-indigo-600 dark:text-indigo-400 font-semibold mr-1.5">
                {path[path.length - 1]}:
              </span>
            )}
            <span className="text-orange-500 dark:text-orange-400">[</span>
            <span className="ml-2 text-gray-400 text-sm">{data.length} items</span>
          </div>
          {data.map((item, index) => (
            <EditableJsonViewer
              key={index}
              data={item}
              path={[...path, String(index)]}
            />
          ))}
          <div className="text-gray-600 dark:text-gray-400">
            <span className="text-orange-500 dark:text-orange-400">]</span>
          </div>
        </div>
      );
    }

    // For objects
    return (
      <div className="ml-4 border-l-2 border-gray-200 dark:border-gray-700 pl-3 my-1">
        <div className="text-gray-600 dark:text-gray-400 flex items-center">
          {path.length > 0 && (
            <span className="text-indigo-600 dark:text-indigo-400 font-semibold mr-1.5">
              {path[path.length - 1]}:
            </span>
          )}
          <span className="text-purple-500 dark:text-purple-400">{'{'}</span>
          <span className="ml-2 text-gray-400 text-sm">{Object.keys(data).length} properties</span>
        </div>
        {Object.entries(data).map(([key, value]) => (
          <EditableJsonViewer
            key={key}
            data={value}
            path={[...path, key]}
          />
        ))}
        <div className="text-gray-600 dark:text-gray-400">
          <span className="text-purple-500 dark:text-purple-400">{'}'}</span>
        </div>
      </div>
    );
  };

  const renderActiveView = () => {
    if (isEditing) {
      return (
        <div className="bg-white dark:bg-gray-900 p-6 rounded-xl border border-gray-200 dark:border-gray-700 shadow-xs">
          <h3 className="text-lg font-semibold mb-6 text-gray-800 dark:text-gray-200">
            ✍️ Edit Data Structure
          </h3>
          <div
            ref={editorContainerRef}
            className="overflow-auto max-h-[70vh] pr-2 custom-scrollbar"
          >
            <EditableJsonViewer data={editableData} />
          </div>
        </div>
      );
    }

    return (
      <div className="rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
        <TableView data={editableData} title={title} />
      </div>
    );
  };


  const renderControlButtons = () => (
    <div className="flex gap-2">
      {!isEditing ? (
        <button
          onClick={handleEdit}
          className="flex items-center gap-2 rounded-lg bg-blue-100 px-4 py-2 text-sm font-medium text-blue-700 transition-all hover:bg-blue-200 dark:bg-blue-900/30 dark:text-blue-300 dark:hover:bg-blue-900/50"
        >
          <Edit size={16} />
          Edit
        </button>
      ) : (
        <>
          <button
            onClick={handleCancel}
            className="flex items-center gap-2 rounded-lg bg-gray-100 px-4 py-2 text-sm font-medium text-gray-700 transition-all hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
            disabled={isSaving}
          >
            <Undo size={16} />
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="flex items-center gap-2 rounded-lg bg-green-100 px-4 py-2 text-sm font-medium text-green-700 transition-all hover:bg-green-200 dark:bg-green-900/30 dark:text-green-300 dark:hover:bg-green-900/50"
            disabled={isSaving}
          >
            <Save size={16} />
            {isSaving ? 'Saving...' : 'Save'}
          </button>
        </>
      )}
    </div>
  );

  return (
    <div className="w-full space-y-4">
      <div className="bg-white dark:bg-gray-850 shadow-sm rounded-lg border border-gray-200 dark:border-gray-700 p-4">
        <div className="flex items-center justify-between p-6 pb-4">
          <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-200">
            {title}
          </h2>
          {renderControlButtons()}
        </div>

        {saveStatus.type !== 'none' && (
          <div className={`p-3 mb-4 rounded-md ${saveStatus.type === 'success'
            ? 'bg-green-50 text-green-700 dark:bg-green-900/30 dark:text-green-300'
            : 'bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-300'
            }`}>
            {saveStatus.message}
          </div>
        )}

        {!isEditing && (
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
        )}

        <div className="relative">
          {renderActiveView()}
        </div>
      </div>

      {/* Custom scrollbar styles */}
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