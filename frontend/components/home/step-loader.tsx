// components/home/step-loader.tsx
'use client';

import { Loader2, CheckCircle, Circle, Map, Tags, ClipboardCheck, FileJson } from 'lucide-react';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';

const steps = [
  { name: 'Extraction', icon: FileJson },
  { name: 'Mapping', icon: Map },
  { name: 'Tagging', icon: Tags },
  { name: 'Validation', icon: ClipboardCheck },
  { name: 'Generation', icon: CheckCircle },
];

export const StepLoader = ({ currentStep }: { currentStep: string }) => {
  const currentStepIndex = steps.findIndex(step => step.name === currentStep);
  const progress = (currentStepIndex / (steps.length - 1)) * 100;

  return (
    <div className="w-full max-w-3xl mx-auto py-6">
      <div className="relative">
        {/* Progress bar */}
        <div className="absolute top-1/2 left-0 w-full h-1 bg-gray-200 dark:bg-gray-700 -translate-y-1/2">
          <motion.div
            className="absolute h-full bg-blue-600 dark:bg-blue-400"
            initial={{ width: 0 }}
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.5 }}
          />
        </div>

        {/* Steps */}
        <div className="relative flex justify-between">
          {steps.map((step, index) => {
            const isCompleted = index < currentStepIndex;
            const isCurrent = index === currentStepIndex;
            const StepIcon = step.icon;

            return (
              <div
                key={step.name}
                className="flex flex-col items-center gap-2"
              >
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className={cn(
                    'flex items-center justify-center w-10 h-10 rounded-full border-2',
                    isCompleted
                      ? 'bg-blue-600 border-blue-600 dark:bg-blue-400 dark:border-blue-400'
                      : isCurrent
                        ? 'border-blue-600 dark:border-blue-400 bg-white dark:bg-gray-900'
                        : 'border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900'
                  )}
                >
                  {isCompleted ? (
                    <CheckCircle className="w-5 h-5 text-white dark:text-gray-900" />
                  ) : isCurrent ? (
                    <Loader2 className="w-5 h-5 text-blue-600 dark:text-blue-400 animate-spin" />
                  ) : (
                    <StepIcon className="w-5 h-5 text-gray-400 dark:text-gray-500" />
                  )}
                </motion.div>

                <span className={cn(
                  'text-sm font-medium',
                  isCompleted || isCurrent
                    ? 'text-blue-600 dark:text-blue-400'
                    : 'text-gray-400 dark:text-gray-500'
                )}>
                  {step.name}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Current status text */}
      <motion.div
        key={currentStep}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center mt-6 text-gray-600 dark:text-gray-400"
      >
        {currentStep === 'Extraction' && 'Extracting raw data from document...'}
        {currentStep === 'Mapping' && 'Mapping data to XBRL taxonomy...'}
        {currentStep === 'Tagging' && 'Applying contextual tags...'}
        {currentStep === 'Validation' && 'Validating data integrity...'}
        {currentStep === 'Generation' && 'Generating final output...'}
      </motion.div>
    </div>
  );
};