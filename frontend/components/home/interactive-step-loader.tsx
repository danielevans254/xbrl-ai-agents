import { Check, CheckCircle, Download, FileText, Loader2, Map, MapIcon, Tag } from "lucide-react";

interface WorkflowProgressProps {
  processingState: {
    extracted: boolean;
    mapped: boolean;
    validated: boolean;
    tagged: boolean;
    taggingComplete: boolean;
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
      icon: MapIcon,
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
      complete: processingState.taggingComplete,
      loading: taggingLoading,
      current: processingState.validated && !processingState.taggingComplete && !taggingLoading,
    },
    {
      label: 'Output',
      icon: Download,
      complete: false,
      loading: false,
      current: processingState.taggingComplete,
    },
  ];

  return (
    <div className="w-full py-6 px-4 bg-gray-50/50 dark:bg-gray-900/50 border-b border-gray-200 dark:border-gray-700">
      <div className="max-w-7xl mx-auto">
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200/50 dark:border-gray-700/50 backdrop-blur-sm">

          <div className="p-8">
            <div className="flex items-center justify-between relative">
              {/* Progress Line */}
              <div className="absolute left-0 top-[2.75rem] w-full h-0.5 bg-gray-200 dark:bg-gray-700" />
              <div
                className="absolute left-0 top-[2.75rem] h-0.5 bg-blue-500 transition-all duration-500 ease-in-out"
                style={{
                  width: `${steps.filter(step => step.complete).length * (100 / (steps.length - 1))}%`
                }}
              />

              {steps.map((step, index) => {
                const isLastItem = index === steps.length - 1;
                const isActive = step.current || step.complete || step.loading;

                return (
                  <div key={step.label} className="relative flex flex-col items-center group z-10">
                    {/* Step Circle */}
                    <div
                      className={`
                        flex items-center justify-center w-16 h-16 rounded-full 
                        transition-all duration-300 ease-in-out transform
                        ${step.complete
                          ? 'bg-blue-500 text-white scale-100 shadow-lg shadow-blue-100 dark:shadow-blue-900/20'
                          : step.loading
                            ? 'bg-white text-blue-500 ring-2 ring-blue-200 dark:bg-gray-800 dark:ring-blue-500/30'
                            : step.current
                              ? 'bg-white text-blue-500 ring-2 ring-blue-500 dark:bg-gray-800 scale-100'
                              : 'bg-white text-gray-400 ring-1 ring-gray-200 dark:bg-gray-800 dark:ring-gray-700 scale-95'
                        }
                        hover:scale-105 group-hover:shadow-lg
                      `}
                    >
                      {step.loading ? (
                        <Loader2 className="w-6 h-6 animate-spin" />
                      ) : step.complete ? (
                        <Check className="w-7 h-7" />
                      ) : (
                        <step.icon className="w-6 h-6" />
                      )}
                    </div>

                    {/* Label */}
                    <div className={`
                      mt-4 text-lg font-medium text-center
                      transition-all duration-300
                      ${step.complete
                        ? 'text-blue-600 dark:text-blue-400'
                        : step.current || step.loading
                          ? 'text-gray-900 dark:text-gray-100'
                          : 'text-gray-500 dark:text-gray-400'
                      }
                    `}>
                      {step.label}
                    </div>

                    {/* Status Indicator */}
                    <div className={`
                      mt-3 inline-flex items-center px-2.5 py-0.5 rounded-full text-lg font-medium
                      transition-all duration-300
                      ${step.loading
                        ? 'bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400'
                        : step.complete
                          ? 'bg-green-50 text-green-600 dark:bg-green-900/30 dark:text-green-400'
                          : step.current
                            ? 'bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400'
                            : 'bg-gray-50 text-gray-600 dark:bg-gray-800 dark:text-gray-400'
                      }
                    `}>
                      <span className="relative flex h-2 w-2 mr-1.5">
                        <span className={`
                          relative inline-flex rounded-full h-2 w-2
                          ${step.loading
                            ? 'bg-blue-500 animate-pulse'
                            : step.complete
                              ? 'bg-green-500'
                              : step.current
                                ? 'bg-blue-500'
                                : 'bg-gray-400 dark:bg-gray-600'
                          }
                        `} />
                      </span>
                      {step.loading ? "Processing" :
                        step.complete ? "Complete" :
                          step.current ? "Current" : "Pending"}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="px-8 py-4 bg-gray-50 dark:bg-gray-800/50 border-t border-gray-100 dark:border-gray-700/50 rounded-b-xl">
            <div className="flex justify-between items-center">
              <div className="text-lg text-gray-500 dark:text-gray-400">
                Status: {isLoading || mappingLoading || validationLoading || taggingLoading
                  ? "Processing..."
                  : processingState.tagged
                    ? "Ready for output"
                    : "In progress"}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default WorkflowProgress;