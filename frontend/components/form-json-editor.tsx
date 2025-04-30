import React, { useMemo, memo, useState, useCallback, useEffect, useRef } from 'react';
import {
  ChevronDown,
  ChevronRight,
  Edit,
  Save,
  X,
  Plus,
  Trash2,
  AlertCircle,
  Search,
  Check,
  Copy,
  Type,
  Hash,
  Calendar,
  ToggleLeft,
  List,
  Info,
  ChevronUp,
  ArrowLeft,
  HelpCircle,
  Eye,
  EyeOff,
  ExternalLink,
  Clipboard
} from 'lucide-react';

interface FormJsonEditorProps {
  data: any;
  onDataChange: (path: string[], value: any, event?: React.FormEvent) => void;
  path?: string[];
  level?: number;
  expandedByDefault?: boolean;
  maxInitialDepth?: number;
  readOnly?: boolean;
}

interface SearchOptions {
  query: string;
  isActive: boolean;
  matches: string[];
  currentMatchIndex: number;
}

interface TableRow {
  key: string;
  path: string[];
  value: any;
  isNested: boolean;
  childCount: number;
}

// Utility function to determine if a value is an object (not array, not null)
const isObject = (value: any): boolean => {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
};

// Utility function to determine if a value is a container (object or array)
const isContainer = (value: any): boolean => {
  return value !== null && typeof value === 'object';
};

// Get appropriate class for different value types
const getValueClassName = (value: any): string => {
  if (value === null || value === undefined) return 'text-gray-400 dark:text-gray-500';
  if (typeof value === 'boolean') return value ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400';
  if (typeof value === 'number') return 'text-blue-600 dark:text-blue-400';
  if (typeof value === 'string') return 'text-purple-600 dark:text-purple-400';
  return 'text-gray-800 dark:text-gray-200';
};

// Format primitive values for display
const formatPrimitiveValue = (value: any): string => {
  if (value === null) return 'null';
  if (value === undefined) return 'undefined';
  if (typeof value === 'boolean') return value ? 'true' : 'false';
  if (typeof value === 'string') return `"${value}"`;
  if (typeof value === 'number') {
    // Format large numbers with commas
    if (Math.abs(value) >= 1000) {
      return value.toLocaleString('en-US');
    }
    return String(value);
  }
  return String(value);
};

// Format key name for display
const formatKeyName = (key: string): string => {
  return key
    .replace(/([A-Z])/g, ' $1') // Convert camelCase to spaced words
    .replace(/_/g, ' ') // Convert snake_case to spaces
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
};

// Get appropriate icon based on value type
const getValueTypeIcon = (value: any) => {
  if (value === null || value === undefined) {
    return <Info size={14} className="text-gray-400" />;
  }
  if (typeof value === 'string') {
    return <Type size={14} className="text-purple-500" />;
  }
  if (typeof value === 'number') {
    return <Hash size={14} className="text-blue-500" />;
  }
  if (typeof value === 'boolean') {
    return <ToggleLeft size={14} className="text-green-500" />;
  }
  if (Array.isArray(value)) {
    return <List size={14} className="text-amber-500" />;
  }
  return <Info size={14} className="text-gray-400" />;
};

// Get color based on data type for improved visual hierarchy
const getTypeColor = (value: any): string => {
  if (Array.isArray(value)) return 'border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-900/20';
  if (isObject(value)) return 'border-blue-200 bg-blue-50 dark:border-blue-800 dark:bg-blue-900/20';
  return '';
};

// Component to display tooltips
const Tooltip = memo(({
  children,
  content,
  position = 'top'
}: {
  children: React.ReactNode,
  content: string,
  position?: 'top' | 'right' | 'bottom' | 'left'
}) => {
  const [isVisible, setIsVisible] = useState(false);

  const positionClasses = {
    top: 'bottom-full left-1/2 transform -translate-x-1/2 mb-1',
    right: 'left-full top-1/2 transform -translate-y-1/2 ml-1',
    bottom: 'top-full left-1/2 transform -translate-x-1/2 mt-1',
    left: 'right-full top-1/2 transform -translate-y-1/2 mr-1'
  };

  return (
    <div className="relative inline-block" onMouseEnter={() => setIsVisible(true)} onMouseLeave={() => setIsVisible(false)}>
      {children}
      {isVisible && (
        <div className={`absolute z-50 ${positionClasses[position]} bg-gray-800 text-white text-xs rounded py-1 px-2 whitespace-nowrap`}>
          {content}
        </div>
      )}
    </div>
  );
});

Tooltip.displayName = 'Tooltip';

// Component to display and edit primitive values
const PrimitiveEditor = memo(({
  value,
  isEditing,
  onChange,
  onCancel,
  onSave,
  propertyType
}: {
  value: any,
  isEditing: boolean,
  onChange: (value: any) => void,
  onCancel: () => void,
  onSave: () => void,
  propertyType?: string
}) => {
  const [localValue, setLocalValue] = useState<any>(value);
  const inputRef = useRef<HTMLInputElement>(null);

  // Update local value when the prop changes
  useEffect(() => {
    setLocalValue(value);
  }, [value]);

  // Focus input on edit mode
  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();

      // If it's a text input, select all text for easy replacement
      if (inputRef.current.type === 'text' || inputRef.current.type === 'number') {
        inputRef.current.select();
      }
    }
  }, [isEditing]);

  // Determine input type and validation based on the value type
  const inputType = useMemo(() => {
    if (propertyType) return propertyType;
    if (typeof value === 'number') return 'number';
    if (typeof value === 'boolean') return 'checkbox';
    if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}/.test(value)) return 'date';
    return 'text';
  }, [value, propertyType]);

  // Handle keydown events for form inputs
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      onSave();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      onCancel();
    }
  };

  // Render edit mode or display mode
  if (isEditing) {
    return (
      <div className="flex items-center gap-2 w-full">
        {inputType === 'checkbox' ? (
          <input
            type="checkbox"
            checked={Boolean(localValue)}
            onChange={(e) => setLocalValue(e.target.checked)}
            className="h-4 w-4 rounded text-blue-600 focus:ring-blue-500 border-gray-300 dark:border-gray-600"
            onKeyDown={handleKeyDown}
          />
        ) : inputType === 'date' ? (
          <input
            ref={inputRef}
            type="date"
            value={localValue || ''}
            onChange={(e) => setLocalValue(e.target.value)}
            className="w-full px-2 py-1 text-sm border rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-800 dark:border-gray-700 dark:text-gray-200"
            onKeyDown={handleKeyDown}
          />
        ) : (
          <input
            ref={inputRef}
            type={inputType}
            value={inputType === 'text' && localValue === null ? '' : localValue}
            onChange={(e) => {
              const newValue = inputType === 'number'
                ? (e.target.value === '' ? '' : Number(e.target.value))
                : e.target.value;
              setLocalValue(newValue);
            }}
            className="w-full px-2 py-1 text-sm border rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-800 dark:border-gray-700 dark:text-gray-200"
            onKeyDown={handleKeyDown}
            placeholder={inputType === 'number' ? "Enter a number..." : "Enter value..."}
          />
        )}
        <Tooltip content="Save (Enter)">
          <button
            onClick={() => onSave()}
            className="p-1 text-green-600 hover:text-green-800 dark:text-green-400 dark:hover:text-green-200 focus:outline-none focus:ring-2 focus:ring-green-500 rounded-full hover:bg-green-100 dark:hover:bg-green-900"
            aria-label="Save"
          >
            <Save size={16} />
          </button>
        </Tooltip>
        <Tooltip content="Cancel (Esc)">
          <button
            onClick={onCancel}
            className="p-1 text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-200 focus:outline-none focus:ring-2 focus:ring-red-500 rounded-full hover:bg-red-100 dark:hover:bg-red-900"
            aria-label="Cancel"
          >
            <X size={16} />
          </button>
        </Tooltip>
      </div>
    );
  }

  return (
    <div className={`${getValueClassName(value)} font-mono transition-all duration-200`}>
      {formatPrimitiveValue(value)}
    </div>
  );
});

PrimitiveEditor.displayName = 'PrimitiveEditor';

// Table row component - displays a single property
const TableRow = memo(({
  row,
  onEdit,
  onNavigateInto,
  isMatch,
  isCurrentMatch,
  readOnly = false
}: {
  row: TableRow,
  onEdit: () => void,
  onNavigateInto: () => void,
  isMatch: boolean,
  isCurrentMatch: boolean,
  readOnly?: boolean
}) => {
  const handleDoubleClick = (e: React.MouseEvent) => {
    if (!row.isNested && !readOnly) {
      e.preventDefault();
      onEdit();
    }
  };

  // Copy to clipboard functionality
  const handleCopyValue = () => {
    let valueToCopy = '';

    if (row.isNested) {
      // For objects and arrays, stringify with formatting
      valueToCopy = JSON.stringify(row.value, null, 2);
    } else {
      // For primitive values, just convert to string
      valueToCopy = typeof row.value === 'string' ? row.value : String(row.value);
    }

    navigator.clipboard.writeText(valueToCopy)
      .then(() => {
        // Could add a toast notification here
        console.log('Copied to clipboard');
      })
      .catch(err => {
        console.error('Failed to copy: ', err);
      });
  };

  return (
    <tr
      className={`border-b border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors
        ${isCurrentMatch ? 'bg-yellow-100 dark:bg-yellow-900/30' : isMatch ? 'bg-yellow-50 dark:bg-yellow-900/10' : ''}
        ${row.isNested ? getTypeColor(row.value) : ''}`}
      onDoubleClick={handleDoubleClick}
    >
      {/* Key column */}
      <td className="py-2 px-4 font-medium">
        <div className="flex items-center">
          <div className="w-6 flex justify-center mr-2">
            {row.isNested ? (
              <button
                onClick={onNavigateInto}
                className="p-1 text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300 rounded focus:outline-none hover:bg-gray-200 dark:hover:bg-gray-700"
                title="Navigate into"
              >
                <ChevronRight size={16} />
              </button>
            ) : (
              getValueTypeIcon(row.value)
            )}
          </div>
          <span className="font-medium text-gray-700 dark:text-gray-300">{formatKeyName(row.key)}</span>
          {row.key.includes('id') && row.key.length < 5 && (
            <span className="ml-2 px-1.5 py-0.5 text-xs bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-full">
              ID
            </span>
          )}
        </div>
      </td>

      {/* Value column */}
      <td className="py-2 px-4">
        {row.isNested ? (
          <div className="flex items-center text-gray-500 dark:text-gray-400">
            <div className="flex items-center p-1 px-2 rounded bg-gray-100 dark:bg-gray-800 text-sm">
              {Array.isArray(row.value) ? '[' : '{'}
              <span className="mx-1">{row.childCount} {row.childCount === 1 ? 'item' : 'items'}</span>
              {Array.isArray(row.value) ? ']' : '}'}
            </div>
          </div>
        ) : (
          <div className={`${getValueClassName(row.value)} font-mono`}>
            {formatPrimitiveValue(row.value)}
          </div>
        )}
      </td>

      {/* Actions column */}
      <td className="py-2 px-4 text-right">
        <div className="flex items-center justify-end space-x-1">
          <Tooltip content="Copy value">
            <button
              onClick={handleCopyValue}
              className="p-1 text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-400"
              title="Copy value"
            >
              <Clipboard size={14} />
            </button>
          </Tooltip>

          {row.isNested ? (
            <Tooltip content="View details">
              <button
                onClick={onNavigateInto}
                className="p-1 text-blue-500 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 rounded-full hover:bg-blue-100 dark:hover:bg-blue-900/30 focus:outline-none focus:ring-2 focus:ring-blue-500"
                title="View details"
              >
                <ExternalLink size={14} />
              </button>
            </Tooltip>
          ) : !readOnly ? (
            <Tooltip content="Edit value (Double-click row)">
              <button
                onClick={onEdit}
                className="p-1 text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-400"
                title="Edit value"
              >
                <Edit size={14} />
              </button>
            </Tooltip>
          ) : null}
        </div>
      </td>
    </tr>
  );
});

TableRow.displayName = 'TableRow';

// EditableRow component - shows editing UI for a row
const EditableRow = memo(({
  row,
  onCancel,
  onSave
}: {
  row: TableRow,
  onCancel: () => void,
  onSave: (newValue: any) => void
}) => {
  const [editValue, setEditValue] = useState<any>(row.value);

  // Determine if a value is a date string
  const isDateString = useCallback((val: any): boolean => {
    if (typeof val !== 'string') return false;
    return /^\d{4}-\d{2}-\d{2}/.test(val);
  }, []);

  // Get property type for specialized inputs
  const getPropertyType = useCallback((key: string, val: any): string | undefined => {
    // Detect type by key name patterns
    if (/date|time|day|month|year/i.test(key) && typeof val === 'string') {
      return 'date';
    }

    // Detect by value format
    if (isDateString(val)) {
      return 'date';
    }

    return undefined;
  }, [isDateString]);

  return (
    <tr className="border-b border-gray-200 dark:border-gray-700 bg-blue-50/80 dark:bg-blue-900/30">
      {/* Key column */}
      <td className="py-2 px-4 font-medium">
        <div className="flex items-center">
          <div className="w-6 flex justify-center mr-2">
            {getValueTypeIcon(row.value)}
          </div>
          <span className="font-medium text-gray-700 dark:text-gray-300">{formatKeyName(row.key)}</span>
        </div>
      </td>

      {/* Value column (with editor) */}
      <td className="py-2 px-4">
        <PrimitiveEditor
          value={row.value}
          isEditing={true}
          onChange={setEditValue}
          onCancel={onCancel}
          onSave={() => onSave(editValue)}
          propertyType={getPropertyType(row.key, row.value)}
        />
      </td>

      {/* Actions column */}
      <td className="py-2 px-4 text-right">
        {/* Buttons are already in PrimitiveEditor */}
      </td>
    </tr>
  );
});

EditableRow.displayName = 'EditableRow';

// Breadcrumb navigation component
const BreadcrumbNavigation = memo(({
  path,
  onNavigateTo
}: {
  path: string[],
  onNavigateTo: (index: number) => void
}) => {
  if (path.length === 0) return null;

  return (
    <div className="flex items-center my-3 text-sm overflow-x-auto pb-1 scrollbar-thin">
      <button
        onClick={() => onNavigateTo(-1)}
        className="flex items-center p-1 mr-1 text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 rounded hover:bg-blue-100 dark:hover:bg-blue-900/30 focus:outline-none focus:ring-2 focus:ring-blue-500"
        title="Go back to root"
      >
        <ArrowLeft size={16} className="mr-1" />
        <span className="font-medium">Root</span>
      </button>

      {path.map((segment, index) => (
        <React.Fragment key={index}>
          <span className="mx-1 text-gray-500 dark:text-gray-400">/</span>
          {index === path.length - 1 ? (
            <span className="font-medium text-gray-700 dark:text-gray-300 px-1.5 py-0.5 bg-gray-100 dark:bg-gray-800 rounded">
              {formatKeyName(segment)}
            </span>
          ) : (
            <button
              onClick={() => onNavigateTo(index)}
              className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 hover:underline font-medium px-1 py-0.5 hover:bg-blue-100 dark:hover:bg-blue-900/30 rounded"
            >
              {formatKeyName(segment)}
            </button>
          )}
        </React.Fragment>
      ))}
    </div>
  );
});

BreadcrumbNavigation.displayName = 'BreadcrumbNavigation';

// Search component for filtering properties
const SearchBar = memo(({
  searchOptions,
  setSearchOptions,
  totalMatches
}: {
  searchOptions: SearchOptions;
  setSearchOptions: React.Dispatch<React.SetStateAction<SearchOptions>>;
  totalMatches: number;
}) => {
  const inputRef = useRef<HTMLInputElement>(null);

  // Focus input when search is activated
  useEffect(() => {
    if (searchOptions.isActive && inputRef.current) {
      inputRef.current.focus();
    }
  }, [searchOptions.isActive]);

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchOptions(prev => ({
      ...prev,
      query: e.target.value,
      currentMatchIndex: 0
    }));
  };

  const navigateMatches = (direction: 'next' | 'prev') => {
    if (totalMatches === 0) return;

    setSearchOptions(prev => {
      let newIndex = direction === 'next'
        ? (prev.currentMatchIndex + 1) % totalMatches
        : (prev.currentMatchIndex - 1 + totalMatches) % totalMatches;

      return {
        ...prev,
        currentMatchIndex: newIndex
      };
    });
  };

  return (
    <div className="flex items-center bg-white dark:bg-gray-800 shadow-sm rounded-lg border border-gray-200 dark:border-gray-700 p-2 mb-3">
      <Search className="text-gray-400 dark:text-gray-500 mr-2" size={18} />
      <input
        ref={inputRef}
        type="text"
        value={searchOptions.query}
        onChange={handleSearchChange}
        placeholder="Search properties and values... (Ctrl+F)"
        className="flex-1 text-sm border-none focus:ring-0 dark:bg-gray-800 dark:text-gray-200"
      />

      {searchOptions.query && (
        <div className="flex items-center">
          <span className="text-sm text-gray-500 dark:text-gray-400 mr-2">
            {totalMatches > 0 ? `${searchOptions.currentMatchIndex + 1}/${totalMatches}` : 'No matches'}
          </span>

          <Tooltip content="Previous match (Shift+Enter)">
            <button
              className="p-1 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300 disabled:opacity-50 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
              onClick={() => navigateMatches('prev')}
              disabled={totalMatches === 0}
              aria-label="Previous match"
            >
              <ChevronUp size={18} />
            </button>
          </Tooltip>

          <Tooltip content="Next match (Enter)">
            <button
              className="p-1 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300 disabled:opacity-50 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
              onClick={() => navigateMatches('next')}
              disabled={totalMatches === 0}
              aria-label="Next match"
            >
              <ChevronDown size={18} />
            </button>
          </Tooltip>

          <Tooltip content="Clear search (Esc)">
            <button
              className="ml-1 p-1 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
              onClick={() => setSearchOptions(prev => ({ ...prev, query: '', matches: [], currentMatchIndex: 0 }))}
              aria-label="Clear search"
            >
              <X size={18} />
            </button>
          </Tooltip>
        </div>
      )}
    </div>
  );
});

SearchBar.displayName = 'SearchBar';

// Header component with toolbar
const EditorHeader = memo(({
  searchOptions,
  setSearchOptions,
  totalMatches,
  showHelp,
  setShowHelp,
  readOnly,
  toggleReadOnly
}: {
  searchOptions: SearchOptions;
  setSearchOptions: React.Dispatch<React.SetStateAction<SearchOptions>>;
  totalMatches: number;
  showHelp: boolean;
  setShowHelp: React.Dispatch<React.SetStateAction<boolean>>;
  readOnly: boolean;
  toggleReadOnly: () => void;
}) => {
  return (
    <div className="mb-4 space-y-2">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">JSON Editor</h2>
        <div className="flex items-center space-x-2">
          <Tooltip content={showHelp ? "Hide help" : "Show help"}>
            <button
              onClick={() => setShowHelp(!showHelp)}
              className={`p-1.5 rounded-full focus:outline-none focus:ring-2 focus:ring-blue-500
                ${showHelp
                  ? 'bg-blue-100 text-blue-600 dark:bg-blue-900/40 dark:text-blue-400'
                  : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'}`}
              aria-label={showHelp ? "Hide help" : "Show help"}
            >
              <HelpCircle size={18} />
            </button>
          </Tooltip>

          <Tooltip content={readOnly ? "Enable editing" : "Read-only mode"}>
            <button
              onClick={toggleReadOnly}
              className={`p-1.5 rounded-full focus:outline-none focus:ring-2 focus:ring-blue-500
                ${readOnly
                  ? 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400'
                  : 'text-blue-500 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 hover:bg-blue-100 dark:hover:bg-blue-900/30'}`}
              aria-label={readOnly ? "Enable editing" : "Read-only mode"}
            >
              {readOnly ? <Eye size={18} /> : <Edit size={18} />}
            </button>
          </Tooltip>
        </div>
      </div>

      {showHelp && (
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3 text-sm text-blue-800 dark:text-blue-300">
          <h3 className="font-semibold mb-1 flex items-center">
            <HelpCircle size={14} className="mr-1" /> Quick Tips
          </h3>
          <ul className="list-disc list-inside space-y-1 mt-1">
            <li><span className="font-semibold">Double-click</span> on any row to edit its value</li>
            <li>Press <span className="font-mono bg-gray-200 dark:bg-gray-700 px-1 rounded">Ctrl+F</span> to search</li>
            <li>Use <span className="font-mono bg-gray-200 dark:bg-gray-700 px-1 rounded">Enter</span> to save changes or navigate to next search match</li>
            <li>Use <span className="font-mono bg-gray-200 dark:bg-gray-700 px-1 rounded">Esc</span> to cancel editing or clear search</li>
          </ul>
        </div>
      )}

      <SearchBar
        searchOptions={searchOptions}
        setSearchOptions={setSearchOptions}
        totalMatches={totalMatches}
      />
    </div>
  );
});

EditorHeader.displayName = 'EditorHeader';

// Empty state component
const EmptyState = () => (
  <div className="flex flex-col items-center justify-center p-8 text-center border border-dashed border-gray-300 dark:border-gray-700 rounded-lg">
    <AlertCircle className="w-12 h-12 text-gray-400 dark:text-gray-600 mb-3" />
    <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-1">No Data Available</h3>
    <p className="text-gray-500 dark:text-gray-400 max-w-md">
      There's no data to display in the editor. Please check your data source or configuration.
    </p>
  </div>
);

// Main component: Form Table Editor
export const FormJsonEditor: React.FC<FormJsonEditorProps> = memo(({
  data,
  onDataChange,
  path = [],
  level = 0,
  expandedByDefault = false,
  maxInitialDepth = 2,
  readOnly = false
}) => {
  const [navigatedPath, setNavigatedPath] = useState<string[]>([]);
  const [editingKey, setEditingKey] = useState<string | null>(null);
  const [isReadOnly, setIsReadOnly] = useState<boolean>(readOnly);
  const [showHelp, setShowHelp] = useState<boolean>(false);
  const [searchOptions, setSearchOptions] = useState<SearchOptions>({
    query: '',
    isActive: false,
    matches: [],
    currentMatchIndex: 0
  });

  // Toggle read-only mode
  const toggleReadOnly = useCallback(() => {
    setIsReadOnly(prev => !prev);
    // If turning on read-only mode, exit any editing state
    setEditingKey(null);
  }, []);

  // Get the current object based on the navigated path
  const currentObject = useMemo(() => {
    let current = data;
    for (const key of navigatedPath) {
      if (current && current[key] !== undefined) {
        current = current[key];
      } else {
        return null;
      }
    }
    return current;
  }, [data, navigatedPath]);

  // Convert current object to table rows
  const tableRows = useMemo(() => {
    if (!currentObject || typeof currentObject !== 'object') return [];

    return Object.keys(currentObject).map(key => {
      const value = currentObject[key];
      const isNested = isContainer(value);
      const childCount = isNested ? Object.keys(value).length : 0;
      const keyPath = [...navigatedPath, key];

      return {
        key,
        path: keyPath,
        value,
        isNested,
        childCount
      };
    }).sort((a, b) => {
      // Special handling for keys that should appear first
      if (a.key === 'id' || a.key === 'name' || a.key === 'title') return -1;
      if (b.key === 'id' || b.key === 'name' || b.key === 'title') return 1;

      // Put metadata or internal fields at the end
      if (a.key.startsWith('_') && !b.key.startsWith('_')) return 1;
      if (b.key.startsWith('_') && !a.key.startsWith('_')) return -1;

      // Alphabetical order
      return a.key.localeCompare(b.key);
    });
  }, [currentObject, navigatedPath]);

  // Function to collect all search matches
  const collectSearchMatches = useCallback((obj: any, currentPath: string[] = []): string[] => {
    if (!obj || typeof obj !== 'object') return [];

    const matches: string[] = [];
    const query = searchOptions.query.toLowerCase();

    for (const key of Object.keys(obj)) {
      const value = obj[key];
      const keyPath = [...currentPath, key];
      const stringPath = keyPath.join('.');

      // Check if key matches
      if (key.toLowerCase().includes(query)) {
        matches.push(stringPath);
      }

      // Check if value matches (for primitive types)
      if (
        (typeof value === 'string' && value.toLowerCase().includes(query)) ||
        (typeof value === 'number' && value.toString().includes(query))
      ) {
        matches.push(stringPath);
      }

      // Recursively search in nested objects and arrays
      if (value !== null && typeof value === 'object') {
        matches.push(...collectSearchMatches(value, keyPath));
      }
    }

    return matches;
  }, [searchOptions.query]);

  // Update search matches when query changes
  useEffect(() => {
    if (searchOptions.query) {
      const matches = collectSearchMatches(data);
      setSearchOptions(prev => ({
        ...prev,
        isActive: true,
        matches,
        currentMatchIndex: Math.min(prev.currentMatchIndex, matches.length - 1)
      }));
    }
  }, [searchOptions.query, data, collectSearchMatches]);

  // Navigate to the path of the current search match
  useEffect(() => {
    if (searchOptions.isActive && searchOptions.matches.length > 0) {
      const currentMatch = searchOptions.matches[searchOptions.currentMatchIndex];
      if (currentMatch) {
        const matchPath = currentMatch.split('.');
        // Navigate to the parent path of the current match
        const parentPath = matchPath.slice(0, -1);
        setNavigatedPath(parentPath);
      }
    }
  }, [searchOptions.isActive, searchOptions.matches, searchOptions.currentMatchIndex]);

  // Handle save for a primitive value
  const handleSave = useCallback((row: TableRow, newValue: any) => {
    onDataChange(row.path, newValue);
    setEditingKey(null);
  }, [onDataChange]);

  // Handle navigation into a nested object
  const handleNavigateInto = useCallback((key: string) => {
    setNavigatedPath(prev => [...prev, key]);
    setEditingKey(null);
  }, []);

  // Handle navigating to a specific level in the breadcrumb
  const handleNavigateTo = useCallback((index: number) => {
    if (index < 0) {
      // Navigate to root
      setNavigatedPath([]);
    } else {
      // Navigate to specific path
      setNavigatedPath(prev => prev.slice(0, index + 1));
    }
    setEditingKey(null);
  }, []);

  // Keyboard shortcuts for search and editing
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ctrl+F to focus search
      if (e.ctrlKey && e.key === 'f') {
        e.preventDefault();
        setSearchOptions(prev => ({
          ...prev,
          isActive: true
        }));
      }

      // Navigate matches with Enter (next) and Shift+Enter (previous)
      if (searchOptions.isActive && searchOptions.matches.length > 0 && e.key === 'Enter') {
        e.preventDefault();
        const direction = e.shiftKey ? 'prev' : 'next';
        const totalMatches = searchOptions.matches.length;

        setSearchOptions(prev => {
          let newIndex = direction === 'next'
            ? (prev.currentMatchIndex + 1) % totalMatches
            : (prev.currentMatchIndex - 1 + totalMatches) % totalMatches;

          return {
            ...prev,
            currentMatchIndex: newIndex
          };
        });
      }

      // Escape to close search
      if (searchOptions.isActive && e.key === 'Escape') {
        setSearchOptions(prev => ({
          ...prev,
          isActive: false
        }));
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [searchOptions.isActive, searchOptions.matches.length, searchOptions.currentMatchIndex]);

  if (!data || typeof data !== 'object') {
    return <EmptyState />;
  }

  return (
    <div className="w-full bg-white dark:bg-gray-900 p-4 rounded-lg shadow-sm border border-gray-200 dark:border-gray-800">
      <EditorHeader
        searchOptions={searchOptions}
        setSearchOptions={setSearchOptions}
        totalMatches={searchOptions.matches.length}
        showHelp={showHelp}
        setShowHelp={setShowHelp}
        readOnly={isReadOnly}
        toggleReadOnly={toggleReadOnly}
      />

      <BreadcrumbNavigation
        path={navigatedPath}
        onNavigateTo={handleNavigateTo}
      />

      <div className="overflow-hidden rounded-lg border border-gray-200 dark:border-gray-700">
        <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
          <thead className="bg-gray-50 dark:bg-gray-800 sticky top-0">
            <tr>
              <th className="py-2 px-4 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 w-1/3 uppercase tracking-wider">
                Property
              </th>
              <th className="py-2 px-4 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                Value
              </th>
              <th className="py-2 px-4 text-right text-xs font-semibold text-gray-700 dark:text-gray-300 w-24 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white dark:bg-gray-850 divide-y divide-gray-200 dark:divide-gray-700">
            {tableRows.map(row => {
              // Check if this row matches search
              const stringPath = row.path.join('.');
              const isMatch = searchOptions.isActive && searchOptions.matches.includes(stringPath);
              const isCurrentMatch = isMatch && searchOptions.matches[searchOptions.currentMatchIndex] === stringPath;

              if (editingKey === row.key) {
                return (
                  <EditableRow
                    key={row.key}
                    row={row}
                    onCancel={() => setEditingKey(null)}
                    onSave={(newValue) => handleSave(row, newValue)}
                  />
                );
              }

              return (
                <TableRow
                  key={row.key}
                  row={row}
                  onEdit={() => !isReadOnly && setEditingKey(row.key)}
                  onNavigateInto={() => handleNavigateInto(row.key)}
                  isMatch={isMatch}
                  isCurrentMatch={isCurrentMatch}
                  readOnly={isReadOnly}
                />
              );
            })}

            {tableRows.length === 0 && (
              <tr>
                <td colSpan={3} className="py-6 px-4 text-center text-gray-500 dark:text-gray-400 italic">
                  <div className="flex flex-col items-center py-6">
                    <AlertCircle className="w-8 h-8 text-gray-400 dark:text-gray-600 mb-2" />
                    <p>No data available in this object</p>
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Quick help at the bottom */}
      <div className="mt-3 text-xs text-gray-500 dark:text-gray-400 flex items-center justify-between">
        <div>
          <span className="inline-block mr-3">
            <span className="font-semibold">Double-click</span> a row to edit
          </span>
          <span className="inline-block mr-3">
            <span className="font-mono bg-gray-100 dark:bg-gray-800 px-1 rounded text-xs">Ctrl+F</span> to search
          </span>
        </div>
        <div>
          <button
            onClick={() => setShowHelp(!showHelp)}
            className="text-blue-500 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 flex items-center"
          >
            <HelpCircle size={12} className="mr-1" />
            <span>{showHelp ? 'Hide help' : 'Show more tips'}</span>
          </button>
        </div>
      </div>
    </div>
  );
});