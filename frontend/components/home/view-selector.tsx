'use client';

export const ViewSelector = ({ viewType, setViewType }: {
  viewType: 'json' | 'table' | 'card';
  setViewType: (type: 'json' | 'table' | 'card') => void;
}) => (
  <div className="mb-6">
    <label htmlFor="view-selector" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
      Select Visualization Type:
    </label>
    <select
      id="view-selector"
      value={viewType}
      onChange={(e) => setViewType(e.target.value as 'json' | 'table' | 'card')}
      className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 dark:border-gray-700 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-800 dark:text-gray-200 sm:text-sm"
    >
      <option value="json">JSON View</option>
      <option value="table">Table View</option>
      <option value="card">Card View</option>
    </select>
  </div>
);