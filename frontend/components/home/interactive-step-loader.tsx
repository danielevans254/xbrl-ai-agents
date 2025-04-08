import React from 'react';
import { Check, FileText, Map, CheckCircle, Tag, Download } from 'lucide-react';

interface WorkflowProgressProps {
  processingState: {
    extracted: boolean;
    mapped: boolean;
    validated: boolean;
    tagged: boolean;
  };
  isLoading: boolean;
  mappingLoading: boolean;
  validationLoading: boolean;
  taggingLoading: boolean;
}

export const WorkflowProgress: React.FC<WorkflowProgressProps> = ({
  processingState,
  isLoading,
  mappingLoading,
  validationLoading,
  taggingLoading,
}) => {
  const steps = [
    {
      label: 'Extract',
      icon: FileText,
      complete: processingState.extracted,
      loading: isLoading,
      current: !processingState.extracted && !isLoading,
    },
    {
      label: 'Map',
      icon: Map,
      complete: processingState.mapped,
      loading: mappingLoading,
      current: processingState.extracted && !processingState.mapped && !mappingLoading,
    },
    {
      label: 'Validate',
      icon: CheckCircle,
      complete: processingState.validated,
      loading: validationLoading,
      current: processingState.mapped && !processingState.validated && !validationLoading,
    },
    {
      label: 'Tag',
      icon: Tag,
      complete: processingState.tagged,
      loading: taggingLoading,
      current: processingState.validated && !processingState.tagged && !taggingLoading,
    },
    {
      label: 'Output',
      icon: Download,
      complete: false,
      loading: false,
      current: processingState.tagged,
    },
  ];

  return (
    <div className="flex justify-center my-8 px-4">
      <div className="w-full max-w-4xl bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 transition-all duration-300">
        <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200 mb-6 text-center">Workflow Progress</h3>
        <div className="flex items-center justify-between relative">
          {/* Connection lines */}
          <div className="absolute top-1/2 left-0 w-full h-1 bg-gray-200 dark:bg-gray-700 transform -translate-y-1/2 z-0" />

          {steps.map((step, index) => {
            const isActive = step.current || step.complete || step.loading;
            const completedLine = index > 0 && steps[index - 1].complete;

            return (
              <div key={step.label} className="flex flex-col items-center relative z-10 flex-1">
                {/* Connection line highlight */}
                {index > 0 && (
                  <div
                    className={`absolute top-1/2 right-1/2 w-full h-1 transform -translate-y-1/2 transition-all duration-500 ${completedLine ? 'bg-blue-500' : 'bg-transparent'
                      }`}
                  />
                )}

                <div
                  className={`flex items-center justify-center w-12 h-12 rounded-full transition-all duration-300 transform ${step.loading ? 'animate-pulse' : ''
                    } ${step.current ? 'scale-110' : ''
                    } ${step.complete
                      ? 'bg-blue-500 text-white shadow-lg shadow-blue-200 dark:shadow-blue-900/30'
                      : step.loading
                        ? 'bg-blue-100 text-blue-500 dark:bg-blue-900/50 dark:text-blue-300'
                        : step.current
                          ? 'bg-white text-blue-500 border-2 border-blue-500 shadow-md dark:bg-gray-800 dark:border-blue-400 dark:text-blue-400'
                          : 'bg-gray-100 text-gray-400 dark:bg-gray-700 dark:text-gray-500'
                    }`}
                >
                  {step.complete ? (
                    <Check className="w-5 h-5" />
                  ) : (
                    <step.icon className="w-5 h-5" />
                  )}
                </div>

                <div className={`mt-3 text-sm font-medium transition-all duration-300 ${step.complete
                  ? 'text-blue-500 dark:text-blue-400'
                  : step.current || step.loading
                    ? 'text-blue-600 dark:text-blue-300'
                    : 'text-gray-500 dark:text-gray-400'
                  }`}>
                  {step.label}
                </div>

                <div className="mt-1 text-xs">
                  {step.loading && (
                    <span className="text-blue-500 dark:text-blue-400">Processing...</span>
                  )}
                  {step.complete && (
                    <span className="text-green-500 dark:text-green-400">Complete</span>
                  )}
                  {step.current && !step.loading && (
                    <span className="text-blue-500 dark:text-blue-400">Current</span>
                  )}
                  {!step.current && !step.complete && !step.loading && (
                    <span className="text-gray-400 dark:text-gray-500">Pending</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default WorkflowProgress;