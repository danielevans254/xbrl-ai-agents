'use client';

import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, FileJson, Table, LayoutGrid } from 'lucide-react';

type ViewType = 'json' | 'table' | 'card';

interface ViewSelectorProps {
  viewType: ViewType;
  setViewType: (type: ViewType) => void;
  className?: string;
}

export const ViewSelector: React.FC<ViewSelectorProps> = ({ viewType, setViewType, className = '' }) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const options = [
    {
      value: 'json',
      label: 'JSON View',
      icon: <FileJson className="w-4 h-4" />,
      description: 'View data in raw JSON format'
    },
    {
      value: 'table',
      label: 'Table View',
      icon: <Table className="w-4 h-4" />,
      description: 'Display data in a structured table'
    },
    {
      value: 'card',
      label: 'Card View',
      icon: <LayoutGrid className="w-4 h-4" />,
      description: 'Show data as visual cards'
    },
  ];

  const selectedOption = options.find(option => option.value === viewType);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  return (
    <div className={`relative ${className}`} ref={dropdownRef}>
      <div className="flex sm:flex-row sm:items-center gap-2 mb-2 p-8">


        <div className="relative flex-1 max-w-xs">
          <button
            type="button"
            className="flex items-center justify-between w-full px-3 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg shadow-sm text-sm font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200"
            onClick={() => setIsOpen(!isOpen)}
            aria-haspopup="listbox"
            aria-expanded={isOpen}
            id="view-selector"
          >
            <div className="flex items-center">
              <span className="flex items-center justify-center w-6 h-6 rounded-md bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-300">
                {selectedOption?.icon}
              </span>
              <span className="ml-2 truncate">{selectedOption?.label}</span>
            </div>
            <ChevronDown className={`w-4 h-4 ml-2 transition-transform duration-200 ${isOpen ? 'transform rotate-180' : ''}`} />
          </button>

          {isOpen && (
            <div className="absolute z-30 w-full mt-1 bg-white dark:bg-gray-800 shadow-lg rounded-lg ring-1 ring-black ring-opacity-5 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
              <ul
                className="py-1 max-h-60 overflow-auto text-base"
                role="listbox"
                tabIndex={-1}
              >
                {options.map((option) => (
                  <li
                    key={option.value}
                    className={`relative cursor-pointer select-none p-2 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors duration-150 ${option.value === viewType
                      ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-300'
                      : 'text-gray-900 dark:text-gray-200'
                      }`}
                    role="option"
                    aria-selected={option.value === viewType}
                    onClick={() => {
                      setViewType(option.value as ViewType);
                      setIsOpen(false);
                    }}
                  >
                    <div className="flex items-center">
                      <span className="flex items-center justify-center w-6 h-6 rounded-md bg-gray-100 dark:bg-gray-700">
                        {option.icon}
                      </span>
                      <div className="ml-2">
                        <p className="font-medium">{option.label}</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">{option.description}</p>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>

      {/* View type indicator - mobile friendly */}
      {/* <div className="hidden sm:flex mt-1 -ml-1">
        <div className="flex space-x-1">
          {options.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => setViewType(option.value as ViewType)}
              className={`flex items-center px-2 py-1 rounded-md text-xs font-medium transition-colors duration-200 ${option.value === viewType
                  ? 'bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300'
                  : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'
                }`}
            >
              {option.icon}
              <span className="ml-1">{option.label.replace(' View', '')}</span>
            </button>
          ))}
        </div>
      </div> */}
    </div>
  );
};

export default ViewSelector;