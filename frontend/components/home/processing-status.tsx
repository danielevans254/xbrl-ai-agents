// components/home/processing-status.tsx (updated)
'use client';

import { Loader2, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { StepLoader } from '@/components/home/step-loader';

export const ProcessingStatusIndicator = ({
  currentStep,
  handleCancelRequest
}: {
  currentStep: string;
  handleCancelRequest: () => void;
}) => (
  <div className="flex flex-col space-y-3 p-5 rounded-lg bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800 shadow-sm">
    <div className="flex items-center gap-4 mb-4">
      <div className="flex h-10 w-10 rounded-full bg-blue-500 items-center justify-center">
        <Loader2 className="h-6 w-6 text-white animate-spin" />
      </div>
      <div className="flex flex-col flex-1">
        <div className="text-sm font-medium text-blue-700 dark:text-blue-300">
          Document Processing
        </div>
      </div>
    </div>

    <StepLoader currentStep={currentStep} />

    <div className="flex items-center justify-between mt-4 text-xs text-blue-600 dark:text-blue-400">
      <div className="flex items-center">
        <Clock className="h-3 w-3 mr-1" />
        {currentStep} in progress...
      </div>
      <Button
        variant="ghost"
        size="sm"
        className="h-7 px-3 text-xs text-blue-700 dark:text-blue-300 hover:text-blue-800 hover:bg-blue-100 dark:hover:bg-blue-800/30"
        onClick={handleCancelRequest}
      >
        Cancel Process
      </Button>
    </div>
  </div>
);