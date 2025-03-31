'use client';

import React, { useState } from 'react';
import { ChevronDown, FileJson, Table, LayoutGrid } from 'lucide-react';

type ViewType = 'json' | 'table' | 'card';

interface ViewSelectorProps {
  viewType: ViewType;
  setViewType: (type: ViewType) => void;
}

export const ViewSelector: React.FC<ViewSelectorProps> = ({ viewType, setViewType }) => {
  const [isOpen, setIsOpen] = useState(false);

  const options = [
    { value: 'json', label: 'JSON View', icon: <FileJson className="w-4 h-4" /> },
    { value: 'table', label: 'Table View', icon: <Table className="w-4 h-4" /> },
    { value: 'card', label: 'Card View', icon: <LayoutGrid className="w-4 h-4" /> },
  ];

  const selectedOption = options.find(option => option.value === viewType);

  return (
    <div className="mb-6 p-5 border-2 m-2">
      <label htmlFor="view-selector" className="block text-xl font-medium text-gray-700 dark:text-gray-300 mb-2 border-b-2 p-2">
        Select Visualization Type
      </label>

      <div className="relative">
        <button
          type="button"
          className="flex items-center justify-between w-full px-4 py-2.5 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm text-sm font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          onClick={() => setIsOpen(!isOpen)}
          aria-haspopup="listbox"
          aria-expanded={isOpen}
        >
          <div className="flex items-center">
            {selectedOption?.icon}
            <span className="ml-2">{selectedOption?.label}</span>
          </div>
          <ChevronDown className="w-4 h-4 ml-2" />
        </button>

        {isOpen && (
          <div className="absolute z-10 w-full mt-1 bg-white dark:bg-gray-800 shadow-lg rounded-md ring-1 ring-black ring-opacity-5 overflow-hidden">
            <ul
              className="py-1 max-h-60 overflow-auto text-base"
              role="listbox"
              tabIndex={-1}
            >
              {options.map((option) => (
                <li
                  key={option.value}
                  className={`relative cursor-pointer select-none py-2 pl-3 pr-9 hover:bg-gray-100 dark:hover:bg-gray-700 ${option.value === viewType ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-300' : 'text-gray-900 dark:text-gray-200'
                    }`}
                  role="option"
                  aria-selected={option.value === viewType}
                  onClick={() => {
                    setViewType(option.value as ViewType);
                    setIsOpen(false);
                  }}
                >
                  <div className="flex items-center">
                    {option.icon}
                    <span className="ml-2 font-medium">{option.label}</span>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
};