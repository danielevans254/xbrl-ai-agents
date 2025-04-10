'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Save, Edit, ChevronDown, ChevronRight, Trash, Plus } from 'lucide-react';

interface FormJsonEditorProps {
  data: any;
  path?: string[];
  onDataChange: (path: string[], value: any, event?: React.FormEvent) => void;
}

/**
 * FormJsonEditor - An enhanced form-based JSON editor component
 *
 * This component presents JSON data in a structured form layout with collapsible sections,
 * making it easier to view and edit complex nested data structures.
 */
const FormJsonEditor: React.FC<FormJsonEditorProps> = ({
  data,
  path = [],
  onDataChange
}) => {
  const [expanded, setExpanded] = useState<boolean>(path.length < 2);
  const [isEditing, setIsEditing] = useState<boolean>(false);
  const [currentValue, setCurrentValue] = useState<any>(data === null ? '' : data);
  const [valueType, setValueType] = useState<string>(getValueType(data));
  const [validationError, setValidationError] = useState<string | null>(null);

  useEffect(() => {
    setCurrentValue(data === null ? '' : data);
    setValueType(getValueType(data));
  }, [data]);

  function getValueType(value: any): string {
    if (value === null) return 'null';
    if (Array.isArray(value)) return 'array';
    return typeof value;
  }

  const getPathDisplay = () => {
    if (path.length === 0) return 'Root';
    return path[path.length - 1];
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    try {
      let parsedValue: any;

      switch (valueType) {
        case 'number':
          parsedValue = currentValue === '' ? 0 : Number(currentValue);
          if (isNaN(parsedValue)) throw new Error('Invalid number');
          break;
        case 'boolean':
          parsedValue = currentValue === 'true';
          break;
        case 'null':
          parsedValue = null;
          break;
        default:
          parsedValue = currentValue;
      }

      onDataChange(path, parsedValue, e);
      setIsEditing(false);
      setValidationError(null);
    } catch (err) {
      setValidationError(err instanceof Error ? err.message : 'Invalid input');
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    setCurrentValue(e.target.value);
  };

  if (data === null || typeof data !== 'object') {
    return (
      <div className="border-b border-gray-100 dark:border-gray-800 py-3 last:border-0">
        <div className="flex items-center justify-between">
          <label className="text-indigo-600 dark:text-indigo-400 font-semibold min-w-32 mr-3">
            {getPathDisplay()}:
          </label>

          {isEditing ? (
            <form onSubmit={handleSubmit} className="flex-1">
              <div className="space-y-2">
                <div className="flex gap-2 items-center">
                  <select
                    value={valueType}
                    onChange={(e) => setValueType(e.target.value)}
                    className="text-xs rounded border bg-gray-50 px-2 py-1 dark:bg-gray-800 dark:border-gray-700 dark:text-gray-300"
                  >
                    <option value="string">String</option>
                    <option value="number">Number</option>
                    <option value="boolean">Boolean</option>
                    <option value="null">Null</option>
                  </select>

                  <button
                    type="submit"
                    className="rounded p-1.5 text-green-600 hover:bg-green-50 dark:text-green-400 dark:hover:bg-green-900/20"
                    title="Save"
                  >
                    <Save size={16} />
                  </button>

                  <button
                    type="button"
                    onClick={() => setIsEditing(false)}
                    className="rounded p-1.5 text-gray-600 hover:bg-gray-50 dark:text-gray-400 dark:hover:bg-gray-800"
                    title="Cancel"
                  >
                    <ChevronDown size={16} />
                  </button>
                </div>

                {valueType === 'string' && (
                  <textarea
                    value={String(currentValue)}
                    onChange={handleInputChange}
                    rows={Math.min(5, String(currentValue).split('\n').length || 1)}
                    className="w-full rounded border bg-white px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100"
                  />
                )}

                {valueType === 'number' && (
                  <input
                    type="text"
                    value={String(currentValue)}
                    onChange={handleInputChange}
                    className="w-full rounded border bg-white px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100"
                  />
                )}

                {valueType === 'boolean' && (
                  <select
                    value={String(currentValue)}
                    onChange={handleInputChange}
                    className="w-full rounded border bg-white px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100"
                  >
                    <option value="true">true</option>
                    <option value="false">false</option>
                  </select>
                )}

                {valueType === 'null' && (
                  <div className="text-sm py-2 px-3 bg-gray-100 rounded dark:bg-gray-800 dark:text-gray-300">
                    null
                  </div>
                )}

                {validationError && (
                  <p className="text-xs text-red-500 mt-1">{validationError}</p>
                )}
              </div>
            </form>
          ) : (
            <div className="flex flex-1 items-center justify-between">
              <span className={`font-mono text-sm px-3 py-2 rounded ${typeof data === 'string' ? 'text-green-700 bg-green-50 dark:text-green-300 dark:bg-green-900/20' :
                typeof data === 'number' ? 'text-blue-700 bg-blue-50 dark:text-blue-300 dark:bg-blue-900/20' :
                  typeof data === 'boolean' ? 'text-orange-700 bg-orange-50 dark:text-orange-300 dark:bg-orange-900/20' :
                    'text-gray-500 bg-gray-50 dark:text-gray-400 dark:bg-gray-800'
                }`}>
                {data === null ? 'null' : String(data)}
              </span>
              <button
                onClick={() => setIsEditing(true)}
                className="rounded p-1.5 text-gray-400 hover:text-gray-700 hover:bg-gray-100 dark:text-gray-500 dark:hover:text-gray-300 dark:hover:bg-gray-800"
                title="Edit"
              >
                <Edit size={16} />
              </button>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="border rounded-md overflow-hidden mb-3 bg-white dark:bg-gray-900 shadow-sm">
      <div
        className={`px-3 py-2 bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between cursor-pointer ${!expanded ? 'rounded-b-md' : ''}`}
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-center gap-2">
          {expanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
          <span className="font-medium text-gray-800 dark:text-gray-200">
            {getPathDisplay()}
          </span>
          <span className="text-xs text-gray-500 dark:text-gray-400 ml-2">
            {Array.isArray(data)
              ? `Array (${data.length} items)`
              : `Object (${Object.keys(data).length} properties)`}
          </span>
        </div>
      </div>

      {expanded && (
        <div className="p-3">
          {Array.isArray(data) && (
            <div className="space-y-2">
              {data.map((item, index) => (
                <div key={index} className="pl-3 border-l-2 border-gray-200 dark:border-gray-700">
                  <div className="flex items-center mb-1">
                    <span className="text-xs text-gray-500 dark:text-gray-400 mr-2">[{index}]</span>
                  </div>
                  <FormJsonEditor
                    data={item}
                    path={[...path, String(index)]}
                    onDataChange={onDataChange}
                  />
                </div>
              ))}
            </div>
          )}

          {!Array.isArray(data) && (
            <div className="space-y-2">
              {Object.entries(data).map(([key, value]) => (
                <div key={key} className="pl-3 border-l-2 border-gray-200 dark:border-gray-700">
                  <div className="flex items-center mb-1">
                    <span className="text-xs font-medium text-indigo-600 dark:text-indigo-400 mr-2">{key}</span>
                  </div>
                  <FormJsonEditor
                    data={value}
                    path={[...path, key]}
                    onDataChange={onDataChange}
                  />
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default FormJsonEditor;