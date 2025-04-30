import React, { useState, useEffect } from 'react';
import {
  Layout,
  FileText,
  AlertCircle,
  Building,
  BarChart2,
  PieChart,
  BookOpen,
  Landmark,
  Shield
} from 'lucide-react';

const frameworkOptions = [
  {
    id: 'sfrs-full',
    label: 'SFRS Full XBRL',
    description: 'Complete representation with all disclosures',
    icon: Layout,
    color: 'blue'
  },
  {
    id: 'sfrs-simplified',
    label: 'SFRS Simplified',
    description: 'Simplified XBRL for Small Entities',
    icon: PieChart,
    color: 'emerald'
  },
  {
    id: 'regulatory-reporting',
    label: 'Regulatory Reporting',
    description: 'XBRL format optimized for ACRA submission',
    icon: BookOpen,
    color: 'cyan'
  },
  {
    id: 'financial-statements',
    label: 'Financial Statements',
    description: 'Balance Sheet, Income Statement, Cash Flow, Equity',
    icon: FileText,
    color: 'green'
  },
  {
    id: 'analytical',
    label: 'Analytical View',
    description: 'Financial Ratios, Trend Analysis, Metrics',
    icon: BarChart2,
    color: 'purple'
  },
  {
    id: 'industry-banking',
    label: 'Banking Industry',
    description: 'Specialized view for financial institutions',
    icon: Landmark,
    color: 'indigo'
  },
  {
    id: 'industry-insurance',
    label: 'Insurance Industry',
    description: 'Specialized view for insurance companies',
    icon: Shield,
    color: 'amber'
  },
  {
    id: 'compliance-focused',
    label: 'Compliance Focus',
    description: 'Directors\' Statement, Auditor\'s Report, Disclosures',
    icon: AlertCircle,
    color: 'red'
  },
];

const FrameworkSelector = ({ onFrameworkChange, initialFramework = 'sfrs-full', className = '' }) => {
  const [selectedFramework, setSelectedFramework] = useState(
    frameworkOptions.find(f => f.id === initialFramework) || frameworkOptions[0]
  );

  // Apply initial framework on mount
  useEffect(() => {
    const framework = frameworkOptions.find(f => f.id === initialFramework) || frameworkOptions[0];
    setSelectedFramework(framework);
  }, [initialFramework]);

  const handleFrameworkSelect = (framework) => {
    setSelectedFramework(framework);
    onFrameworkChange(framework.id);
  };

  // Get color classes for a framework
  const getColorClasses = (framework, isSelected) => {
    const colorMap = {
      blue: {
        bg: isSelected ? 'bg-blue-100 dark:bg-blue-900/30' : 'bg-blue-50 dark:bg-blue-900/10',
        bgHover: 'hover:bg-blue-100 dark:hover:bg-blue-900/20',
        text: 'text-blue-700 dark:text-blue-400',
        border: 'border-blue-200 dark:border-blue-800/30'
      },
      green: {
        bg: isSelected ? 'bg-green-100 dark:bg-green-900/30' : 'bg-green-50 dark:bg-green-900/10',
        bgHover: 'hover:bg-green-100 dark:hover:bg-green-900/20',
        text: 'text-green-700 dark:text-green-400',
        border: 'border-green-200 dark:border-green-800/30'
      },
      emerald: {
        bg: isSelected ? 'bg-emerald-100 dark:bg-emerald-900/30' : 'bg-emerald-50 dark:bg-emerald-900/10',
        bgHover: 'hover:bg-emerald-100 dark:hover:bg-emerald-900/20',
        text: 'text-emerald-700 dark:text-emerald-400',
        border: 'border-emerald-200 dark:border-emerald-800/30'
      },
      red: {
        bg: isSelected ? 'bg-red-100 dark:bg-red-900/30' : 'bg-red-50 dark:bg-red-900/10',
        bgHover: 'hover:bg-red-100 dark:hover:bg-red-900/20',
        text: 'text-red-700 dark:text-red-400',
        border: 'border-red-200 dark:border-red-800/30'
      },
      purple: {
        bg: isSelected ? 'bg-purple-100 dark:bg-purple-900/30' : 'bg-purple-50 dark:bg-purple-900/10',
        bgHover: 'hover:bg-purple-100 dark:hover:bg-purple-900/20',
        text: 'text-purple-700 dark:text-purple-400',
        border: 'border-purple-200 dark:border-purple-800/30'
      },
      indigo: {
        bg: isSelected ? 'bg-indigo-100 dark:bg-indigo-900/30' : 'bg-indigo-50 dark:bg-indigo-900/10',
        bgHover: 'hover:bg-indigo-100 dark:hover:bg-indigo-900/20',
        text: 'text-indigo-700 dark:text-indigo-400',
        border: 'border-indigo-200 dark:border-indigo-800/30'
      },
      amber: {
        bg: isSelected ? 'bg-amber-100 dark:bg-amber-900/30' : 'bg-amber-50 dark:bg-amber-900/10',
        bgHover: 'hover:bg-amber-100 dark:hover:bg-amber-900/20',
        text: 'text-amber-700 dark:text-amber-400',
        border: 'border-amber-200 dark:border-amber-800/30'
      },
      cyan: {
        bg: isSelected ? 'bg-cyan-100 dark:bg-cyan-900/30' : 'bg-cyan-50 dark:bg-cyan-900/10',
        bgHover: 'hover:bg-cyan-100 dark:hover:bg-cyan-900/20',
        text: 'text-cyan-700 dark:text-cyan-400',
        border: 'border-cyan-200 dark:border-cyan-800/30'
      }
    };

    const colors = colorMap[framework.color] || colorMap.blue;
    return colors;
  };

  return (
    <div className={`framework-selector ${className}`}>
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
        {frameworkOptions.map((framework) => {
          const isSelected = selectedFramework.id === framework.id;
          const colors = getColorClasses(framework, isSelected);

          return (
            <div
              key={framework.id}
              className={`
                flex items-center space-x-3 p-3 rounded-lg cursor-pointer 
                transition-colors duration-150 border
                ${colors.bg} ${colors.bgHover} ${colors.border}
                ${isSelected ? 'ring-2 ring-offset-1 dark:ring-offset-gray-800 ring-offset-white' : ''}
              `}
              onClick={() => handleFrameworkSelect(framework)}
            >
              <div className={`flex items-center justify-center w-10 h-10 rounded-full bg-white dark:bg-gray-800 ${colors.text}`}>
                <framework.icon size={20} />
              </div>
              <div className="flex-1 min-w-0">
                <div className={`font-medium truncate ${colors.text}`}>
                  {framework.label}
                </div>
                <div className="text-lg text-gray-500 dark:text-gray-400 mt-0.5 truncate">
                  {framework.description}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default FrameworkSelector;