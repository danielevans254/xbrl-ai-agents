'use client';

import { useState, useEffect } from 'react';
import { AlertCircle, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

export const ErrorDisplay = ({ error, clearError }: { error: string | null; clearError: () => void }) => {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (error) {
      setIsVisible(true);
    }
  }, [error]);

  const handleDismiss = () => {
    setIsVisible(false);
    setTimeout(() => {
      clearError();
    }, 300);
  };

  if (!error) return null;

  return (
    <div className="fixed top-4 inset-x-4 sm:inset-x-auto sm:left-1/2 sm:transform sm:-translate-x-1/2 sm:max-w-md md:max-w-lg z-50">
      <Alert
        variant="destructive"
        className={`
          mb-2 shadow-lg border border-red-200 dark:border-red-900
          rounded-lg overflow-hidden
          transition-all duration-300 ease-in-out
          ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-4'}
        `}
      >
        <div className="flex items-start gap-3 w-full">
          <AlertCircle className="h-5 w-5 mt-0.5 shrink-0 text-red-600 dark:text-red-400 animate-pulse" />
          <div className="flex-1">
            <AlertTitle className="text-base font-semibold text-red-700 dark:text-red-300">Error</AlertTitle>
            <AlertDescription className="mt-1 break-words text-lg text-red-600 dark:text-red-200">
              {error}
            </AlertDescription>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleDismiss}
            className="h-8 w-8 p-0 rounded-full hover:bg-red-100 dark:hover:bg-red-900/50 text-red-700 dark:text-red-300"
            aria-label="Dismiss error"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
        <div className="h-1 w-full bg-red-100 dark:bg-red-900/50 mt-3 -mx-4 -mb-4">
          <div className="h-full bg-red-500 dark:bg-red-400 animate-progress origin-left" style={{
            animation: 'progress 5s linear forwards'
          }}></div>
        </div>
      </Alert>
      <style jsx global>{`
        @keyframes progress {
          0% { width: 100%; }
          100% { width: 0%; }
        }
      `}</style>
    </div>
  );
};

export default ErrorDisplay;