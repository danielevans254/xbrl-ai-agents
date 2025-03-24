'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight, FileInput, Map, Tags, ClipboardCheck, Rocket, Check } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';

const steps = [
  { name: 'Extraction', icon: FileInput, description: 'Extract data from source files' },
  { name: 'Mapping', icon: Map, description: 'Map extracted data to schema' },
  { name: 'Validation', icon: ClipboardCheck, description: 'Validate transformed data' },
  { name: 'Tagging', icon: Tags, description: 'Apply metadata tags' },
  { name: 'Generation', icon: Rocket, description: 'Generate final output' },
];

export const InteractiveStepLoader = () => {
  const [currentStep, setCurrentStep] = useState(0);
  const [completedSteps, setCompletedSteps] = useState<number[]>([]);

  const progress = (currentStep / (steps.length - 1)) * 100;

  return (
    <div className="w-full max-w-4xl mx-auto py-8 px-4 space-y-12 bg-white dark:bg-gray-900 rounded-xl shadow-lg dark:shadow-gray-800/20">
      {/* Progress track */}
      <div className="relative px-6">
        <div className="absolute top-1/2 left-0 w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-full -translate-y-1/2">
          <motion.div
            className="absolute h-full bg-blue-600 dark:bg-blue-400 rounded-full"
            initial={{ width: 0 }}
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.3 }}
          />
        </div>

        <div className="relative flex justify-between">
          {steps.map((step, index) => {
            const isCompleted = completedSteps.includes(index);
            const isActive = index === currentStep;
            const StepIcon = step.icon;

            return (
              <div key={step.name} className="flex flex-col items-center gap-2">
                <motion.button
                  onClick={() => setCurrentStep(index)}
                  className={cn(
                    'flex items-center justify-center w-14 h-14 rounded-full border-2 transition-all relative',
                    isCompleted && 'bg-blue-600 border-blue-600 dark:bg-blue-400 dark:border-blue-400',
                    isActive && !isCompleted && 'border-blue-600 dark:border-blue-400 bg-white dark:bg-gray-900',
                    !isCompleted && !isActive && 'border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900',
                    'hover:scale-105 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:focus:ring-offset-gray-900'
                  )}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  {isCompleted ? (
                    <Check className="w-7 h-7 text-white dark:text-gray-900" />
                  ) : (
                    <StepIcon className={cn(
                      'w-7 h-7',
                      isActive ? 'text-blue-600 dark:text-blue-400' : 'text-gray-400 dark:text-gray-500'
                    )} />
                  )}
                </motion.button>
                <span className={cn(
                  'text-sm font-medium text-center',
                  isCompleted || isActive ? 'text-blue-600 dark:text-blue-400' : 'text-gray-500 dark:text-gray-400'
                )}>
                  {step.name}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
