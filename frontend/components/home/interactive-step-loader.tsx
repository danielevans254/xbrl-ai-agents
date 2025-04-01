'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { ChevronLeft, ChevronRight, FileInput, Map, Tags, ClipboardCheck, Rocket, Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

const steps = [
  { name: 'Extraction', icon: FileInput, description: 'Extract data from source files' },
  { name: 'Mapping', icon: Map, description: 'Map extracted data to schema' },
  { name: 'Validation', icon: ClipboardCheck, description: 'Validate transformed data' },
  { name: 'Tagging', icon: Tags, description: 'Apply metadata tags' },
  { name: 'Generation', icon: Rocket, description: 'Generate final output' },
];

const StepIndicator = ({
  step,
  index,
  isActive,
  isCompleted,
  onClick,
}: {
  step: typeof steps[number];
  index: number;
  isActive: boolean;
  isCompleted: boolean;
  onClick: () => void;
}) => {
  const Icon = step.icon;

  return (
    <div className="flex flex-col items-center gap-2">
      <motion.button
        onClick={onClick}
        className={cn(
          'flex items-center justify-center w-14 h-14 rounded-full border-2 transition-all',
          'focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:focus:ring-offset-gray-900',
          isCompleted
            ? 'bg-blue-600 border-blue-600 dark:bg-blue-400 dark:border-blue-400'
            : isActive
              ? 'border-blue-600 dark:border-blue-400 bg-white dark:bg-gray-900'
              : 'border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900',
        )}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        aria-current={isActive ? 'step' : undefined}
        aria-label={`${step.name} - ${isCompleted ? 'Completed' : isActive ? 'Current' : 'Pending'}`}
      >
        {isCompleted ? (
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: 'spring', stiffness: 300 }}
          >
            <Check className="w-7 h-7 text-white dark:text-gray-900" />
          </motion.div>
        ) : (
          <Icon
            className={cn(
              'w-7 h-7 transition-colors',
              isActive ? 'text-blue-600 dark:text-blue-400' : 'text-gray-400 dark:text-gray-500'
            )}
          />
        )}
      </motion.button>
      <span
        className={cn(
          'text-sm font-medium text-center transition-colors',
          isCompleted || isActive
            ? 'text-blue-600 dark:text-blue-400'
            : 'text-gray-500 dark:text-gray-400'
        )}
      >
        {step.name}
      </span>
    </div>
  );
};

export const InteractiveStepLoader = () => {
  const [currentStep, setCurrentStep] = useState(0);
  const [completedSteps, setCompletedSteps] = useState<number[]>([]);
  const progress = (currentStep / (steps.length - 1)) * 100;

  return (
    <div className="w-full max-w-4xl mx-auto p-8 bg-white dark:bg-gray-900 rounded-xl shadow-lg dark:shadow-gray-800/20">
      <div className="relative px-6 mb-2">
        {/* Progress track */}
        <div className="absolute top-1/2 left-0 w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-full -translate-y-1/2">
          <motion.div
            className="absolute h-full bg-blue-600 dark:bg-blue-400 rounded-full"
            initial={{ width: 0 }}
            animate={{
              width: `${progress}%`,
              transition: { type: 'spring', stiffness: 50, damping: 15 }
            }}
          />
        </div>

        <div className="relative flex justify-between">
          {steps.map((step, index) => (
            <StepIndicator
              key={step.name}
              step={step}
              index={index}
              isActive={index === currentStep}
              isCompleted={completedSteps.includes(index)}
              onClick={() => setCurrentStep(index)}
            />
          ))}
        </div>
      </div>
    </div>
  );
};