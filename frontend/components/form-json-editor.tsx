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
  ChevronUp
} from 'lucide-react';

interface FormJsonEditorProps {
  data: any;
  onDataChange: (path: string[], value: any, event?: React.FormEvent) => void;
  path?: string[];
  level?: number;
  expandedByDefault?: boolean;
  maxInitialDepth?: number;
}

interface SearchOptions {
  query: string;
  isActive: boolean;
  matches: string[];
  currentMatchIndex: number;
}

// Utility function to determine if a value is an object (not array, not null)
const isObject = (value: any): boolean => {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
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
    return <Info size={14} />;
  }
  if (typeof value === 'string') {
    return <Type size={14} />;
  }
  if (typeof value === 'number') {
    return <Hash size={14} />;
  }
  if (typeof value === 'boolean') {
    return <ToggleLeft size={14} />;
  }
  if (Array.isArray(value)) {
    return <List size={14} />;
  }
  return <Info size={14} />;
};

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
        <button
          onClick={() => onSave()}
          className="p-1 text-green-600 hover:text-green-800 dark:text-green-400 dark:hover:text-green-200 focus:outline-none focus:ring-2 focus:ring-green-500 rounded-full"
          aria-label="Save"
          title="Save (Enter)"
        >
          <Save size={16} />
        </button>
        <button
          onClick={onCancel}
          className="p-1 text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-200 focus:outline-none focus:ring-2 focus:ring-red-500 rounded-full"
          aria-label="Cancel"
          title="Cancel (Esc)"
        >
          <X size={16} />
        </button>
      </div>
    );
  }

  return (
    <div className={`${getValueClassName(value)} flex-1 font-mono transition-all duration-200`}>
      {formatPrimitiveValue(value)}
    </div>
  );
});

PrimitiveEditor.displayName = 'PrimitiveEditor';

// JsonProperty component to render each key-value pair
const JsonProperty = memo(({
  propertyKey,
  value,
  path,
  level,
  onDataChange,
  expandedByDefault,
  maxInitialDepth,
  searchOptions
}: {
  propertyKey: string,
  value: any,
  path: string[],
  level: number,
  onDataChange: (path: string[], value: any, event?: React.FormEvent) => void,
  expandedByDefault: boolean,
  maxInitialDepth: number,
  searchOptions?: SearchOptions
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState<any>(value);
  const currentPath = [...path, propertyKey];
  const stringPath = currentPath.join('.');

  // Determine if this property matches the search query
  const isMatch = useMemo(() => {
    if (!searchOptions?.isActive || !searchOptions.query) return false;
    const query = searchOptions.query.toLowerCase();
    return (
      propertyKey.toLowerCase().includes(query) ||
      (typeof value === 'string' && value.toLowerCase().includes(query)) ||
      (typeof value === 'number' && value.toString().includes(query))
    );
  }, [searchOptions, propertyKey, value]);

  // Determine if this is the current search match
  const isCurrentMatch = useMemo(() => {
    if (!searchOptions?.isActive || !isMatch) return false;
    return searchOptions.matches[searchOptions.currentMatchIndex] === stringPath;
  }, [searchOptions, isMatch, stringPath]);

  // Determine if this node should be expanded by default
  const shouldExpandByDefault = useMemo(() => {
    // Always expand if this is the current search match or one of its parents
    if (isCurrentMatch || (searchOptions?.isActive && searchOptions.matches.some(match => match.startsWith(stringPath)))) {
      return true;
    }

    return expandedByDefault || level < maxInitialDepth;
  }, [expandedByDefault, level, maxInitialDepth, isCurrentMatch, searchOptions, stringPath]);

  const [isExpanded, setIsExpanded] = useState(shouldExpandByDefault);

  // Update expanded state when search options change
  useEffect(() => {
    if (shouldExpandByDefault) {
      setIsExpanded(true);
    }
  }, [shouldExpandByDefault]);

  // Value is an object or array - needs nesting
  const isNested = isObject(value) || Array.isArray(value);

  // Count children for objects and arrays
  const childCount = useMemo(() => {
    if (!isNested) return 0;
    return Object.keys(value).length;
  }, [isNested, value]);

  const handleEditClick = useCallback(() => {
    setEditValue(value);
    setIsEditing(true);
  }, [value]);

  const handleSave = useCallback(() => {
    onDataChange(currentPath, editValue);
    setIsEditing(false);
  }, [currentPath, editValue, onDataChange]);

  const handleCancel = useCallback(() => {
    setEditValue(value);
    setIsEditing(false);
  }, [value]);

  const toggleExpand = useCallback(() => {
    setIsExpanded(prev => !prev);
  }, []);

  // Determine if a value is a date string (YYYY-MM-DD format)
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
    <div className={`mb-1 transition-all duration-200 ${isCurrentMatch ? 'bg-yellow-100 dark:bg-yellow-900/30 rounded' : isMatch ? 'bg-yellow-50 dark:bg-yellow-900/10 rounded' : ''}`}>
      <div
        className={`flex items-start px-2 py-1 rounded hover:bg-gray-50 dark:hover:bg-gray-800/50 ${isEditing ? 'bg-blue-50/80 dark:bg-blue-900/30' : ''}`}
      >
        {/* Indentation and expand/collapse for nested values */}
        <div className="flex items-center min-w-[180px]">
          {isNested ? (
            <button
              onClick={toggleExpand}
              className="p-1 text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-400 rounded"
              aria-label={isExpanded ? "Collapse" : "Expand"}
              title={isExpanded ? "Collapse" : "Expand"}
            >
              {isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
            </button>
          ) : (
            <div className="w-6 flex justify-center">
              {getValueTypeIcon(value)}
            </div>
          )}

          {/* Property key */}
          <div className="font-medium text-gray-700 dark:text-gray-300 ml-1 overflow-hidden text-ellipsis">
            {formatKeyName(propertyKey)}:
          </div>
        </div>

        {/* Property value or nested container */}
        <div className="flex-1 overflow-hidden">
          {isNested ? (
            <div className="flex items-center text-gray-500 dark:text-gray-400">
              {Array.isArray(value) ? '[' : '{'}
              <span className="ml-2 text-xs">{childCount} {childCount === 1 ? 'item' : 'items'}</span>
              {Array.isArray(value) ? ']' : '}'}
            </div>
          ) : (
            <PrimitiveEditor
              value={value}
              isEditing={isEditing}
              onChange={setEditValue}
              onCancel={handleCancel}
              onSave={handleSave}
              propertyType={getPropertyType(propertyKey, value)}
            />
          )}
        </div>

        {/* Edit button for primitive values */}
        {!isNested && !isEditing && (
          <button
            onClick={handleEditClick}
            className="p-1 text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-400 rounded"
            aria-label="Edit"
            title="Edit this value"
          >
            <Edit size={16} />
          </button>
        )}
      </div>

      {/* Render children if expanded */}
      {isNested && isExpanded && (
        <div className="pl-4 border-l border-gray-200 dark:border-gray-700 ml-3">
          <FormJsonEditor
            data={value}
            onDataChange={onDataChange}
            path={currentPath}
            level={level + 1}
            expandedByDefault={expandedByDefault}
            maxInitialDepth={maxInitialDepth}
            searchOptions={searchOptions}
          />
        </div>
      )}
    </div>
  );
});

JsonProperty.displayName = 'JsonProperty';

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
        placeholder="Search properties and values..."
        className="flex-1 text-sm border-none focus:ring-0 dark:bg-gray-800 dark:text-gray-200"
      />

      {searchOptions.query && (
        <div className="flex items-center">
          <span className="text-xs text-gray-500 dark:text-gray-400 mr-2">
            {totalMatches > 0 ? `${searchOptions.currentMatchIndex + 1}/${totalMatches}` : 'No matches'}
          </span>

          <button
            className="p-1 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300 disabled:opacity-50"
            onClick={() => navigateMatches('prev')}
            disabled={totalMatches === 0}
            aria-label="Previous match"
            title="Previous match"
          >
            <ChevronUp size={18} />
          </button>

          <button
            className="p-1 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300 disabled:opacity-50"
            onClick={() => navigateMatches('next')}
            disabled={totalMatches === 0}
            aria-label="Next match"
            title="Next match"
          >
            <ChevronDown size={18} />
          </button>

          <button
            className="ml-1 p-1 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
            onClick={() => setSearchOptions(prev => ({ ...prev, query: '', matches: [], currentMatchIndex: 0 }))}
            aria-label="Clear search"
            title="Clear search"
          >
            <X size={18} />
          </button>
        </div>
      )}
    </div>
  );
});

SearchBar.displayName = 'SearchBar';

// Core Component: Enhanced Form JSON Editor
const FormJsonEditor: React.FC<FormJsonEditorProps> = memo(({
  data,
  onDataChange,
  path = [],
  level = 0,
  expandedByDefault = false,
  maxInitialDepth = 2,
  searchOptions
}) => {
  const [localSearchOptions, setLocalSearchOptions] = useState<SearchOptions>({
    query: '',
    isActive: false,
    matches: [],
    currentMatchIndex: 0
  });

  // We only want to manage search at the top level
  const isRootLevel = level === 0;
  const effectiveSearchOptions = isRootLevel ? localSearchOptions : searchOptions;

  // Function to collect all search matches recursively
  const collectSearchMatches = useCallback((obj: any, currentPath: string[] = []): string[] => {
    if (!obj || typeof obj !== 'object') return [];

    const matches: string[] = [];
    const query = localSearchOptions.query.toLowerCase();

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
  }, [localSearchOptions.query]);

  // Update search matches when query changes
  useEffect(() => {
    if (isRootLevel && localSearchOptions.query) {
      const matches = collectSearchMatches(data);
      setLocalSearchOptions(prev => ({
        ...prev,
        isActive: true,
        matches,
        currentMatchIndex: Math.min(prev.currentMatchIndex, matches.length - 1)
      }));
    }
  }, [isRootLevel, localSearchOptions.query, data, collectSearchMatches]);

  // Keyboard shortcuts for search (Ctrl+F) and navigating matches
  useEffect(() => {
    if (!isRootLevel) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // Ctrl+F to focus search
      if (e.ctrlKey && e.key === 'f') {
        e.preventDefault();
        setLocalSearchOptions(prev => ({
          ...prev,
          isActive: true
        }));
      }

      // Navigate matches with Enter (next) and Shift+Enter (previous)
      if (localSearchOptions.isActive && localSearchOptions.matches.length > 0 && e.key === 'Enter') {
        e.preventDefault();
        const direction = e.shiftKey ? 'prev' : 'next';
        const totalMatches = localSearchOptions.matches.length;

        setLocalSearchOptions(prev => {
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
      if (localSearchOptions.isActive && e.key === 'Escape') {
        setLocalSearchOptions(prev => ({
          ...prev,
          isActive: false
        }));
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isRootLevel, localSearchOptions.isActive, localSearchOptions.matches.length, localSearchOptions.currentMatchIndex]);

  // Sort keys for better organization
  const keys = useMemo(() => {
    if (!data || typeof data !== 'object') return [];

    return Object.keys(data).sort((a, b) => {
      // Special handling for keys that should appear first
      if (a === 'id' || a === 'name' || a === 'title') return -1;
      if (b === 'id' || b === 'name' || b === 'title') return 1;

      // Put metadata or internal fields at the end
      if (a.startsWith('_') && !b.startsWith('_')) return 1;
      if (b.startsWith('_') && !a.startsWith('_')) return -1;

      // Alphabetical order
      return a.localeCompare(b);
    });
  }, [data]);

  if (!data || typeof data !== 'object') {
    return <div className="text-gray-500 dark:text-gray-400 p-2">No data available</div>;
  }

  return (
    <div className="space-y-1">
      {isRootLevel && (
        <SearchBar
          searchOptions={localSearchOptions}
          setSearchOptions={setLocalSearchOptions}
          totalMatches={localSearchOptions.matches.length}
        />
      )}

      {keys.map(key => (
        <JsonProperty
          key={key}
          propertyKey={key}
          value={data[key]}
          path={path}
          level={level}
          onDataChange={onDataChange}
          expandedByDefault={expandedByDefault}
          maxInitialDepth={maxInitialDepth}
          searchOptions={effectiveSearchOptions}
        />
      ))}

      {keys.length === 0 && (
        <div className="text-gray-500 dark:text-gray-400 italic p-2 text-sm">
          Empty object
        </div>
      )}
    </div>
  );
});

FormJsonEditor.displayName = 'FormJsonEditor';

export default FormJsonEditor;