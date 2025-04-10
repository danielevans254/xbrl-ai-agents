'use client';

import { useState, useEffect } from 'react';
import { Loader2, Clock, ChevronRight, Check, XCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';

export const ProcessingStatusIndicator = ({
  currentStep,
  handleCancelRequest
}: {
  currentStep: string;
  handleCancelRequest: () => void;
}) => {
  const [elapsedTime, setElapsedTime] = useState(0);

  const steps = [
    'Extracting data',
  ];

  // Get current step index
  const currentStepIndex = steps.findIndex(step =>
    step.toLowerCase().includes(currentStep.toLowerCase())
  ) !== -1
    ? steps.findIndex(step => step.toLowerCase().includes(currentStep.toLowerCase()))
    : 0;

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs < 10 ? '0' + secs : secs}`;
  };

  useEffect(() => {
    const timer = setInterval(() => {
      setElapsedTime(prev => prev + 1);
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  return (
    <div className="flex flex-col space-y-3 p-6 rounded-lg bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/30 dark:to-indigo-900/20 border border-blue-100 dark:border-blue-800 shadow-lg transition-all duration-300 hover:shadow-md">

      {/* Step indicators */}
      <div className="mt-4 space-y-3">
        {steps.map((step, index) => {
          const isCompleted = index < currentStepIndex;
          const isCurrent = index === currentStepIndex;

          return (
            <div
              key={step}
              className={`flex items-center p-2 rounded-md transition-all duration-300 ${isCurrent ? 'bg-blue-100 dark:bg-blue-800/30'
                : isCompleted ? 'opacity-70' : 'opacity-40'
                }`}
            >
              <div className={`flex h-6 w-6 rounded-full items-center justify-center mr-3 ${isCompleted ? 'bg-green-500'
                : isCurrent ? 'bg-blue-500 animate-pulse'
                  : 'bg-gray-300 dark:bg-gray-600'
                }`}>
                {isCompleted ? (
                  <Check className="h-4 w-4 text-white" />
                ) : isCurrent ? (
                  <Loader2 className="h-4 w-4 text-white animate-spin" />
                ) : (
                  <ChevronRight className="h-4 w-4 text-gray-500 dark:text-gray-400" />
                )}
              </div>
              <span className={`text-sm ${isCurrent ? 'font-medium text-blue-700 dark:text-blue-300'
                : isCompleted ? 'font-normal text-green-700 dark:text-green-400'
                  : 'font-normal text-gray-500'
                }`}>
                {step}
                {isCurrent && (
                  <span className="inline-flex ml-2">
                    <span className="animate-pulse">.</span>
                    <span className="animate-pulse delay-100">.</span>
                    <span className="animate-pulse delay-200">.</span>
                  </span>
                )}
              </span>
            </div>
          );
        })}
      </div>

      <div className="flex items-center justify-between mt-4 pt-3 border-t border-blue-100 dark:border-blue-800/50">
        <div className="flex items-center text-xs text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/30 px-3 py-1 rounded-full">
          <Clock className="h-3 w-3 mr-1" />
          Elapsed time: {formatTime(elapsedTime)}
        </div>

        {/* <div className="flex space-x-2">
          <Button
            variant="outline"
            size="sm"
            className="h-8 px-3 text-xs text-blue-700 dark:text-blue-300 hover:text-blue-800 hover:bg-blue-100 dark:hover:bg-blue-800/30 border-blue-200 dark:border-blue-800"
            onClick={handleCancelRequest}
          >
            <XCircle className="h-3 w-3 mr-1" />
            Cancel
          </Button>
        </div> */}
      </div>

      {/* Custom styles for animations */}
      <style jsx global>{`
        @keyframes delay-pulse {
          0%, 100% { opacity: 0.5; }
          50% { opacity: 1; }
        }
        
        .delay-100 {
          animation-delay: 0.3s;
        }
        
        .delay-200 {
          animation-delay: 0.6s;
        }
      `}</style>
    </div>
  );
};
