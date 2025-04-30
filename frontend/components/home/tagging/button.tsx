'use client';

import { useState, useCallback } from 'react';
import { Button } from "@/components/ui/button";
import { Loader2, TagIcon, AlertTriangle, RefreshCw } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface TaggingError {
  message: string;
  taskId?: string;
  documentId?: string;
  retryable?: boolean;
}

interface TaggingButtonProps {
  onClick: () => Promise<void>;
  isLoading: boolean;
  maxRetries?: number;
}

export const TaggingButton = ({
  onClick,
  isLoading,
  maxRetries = 3
}: TaggingButtonProps) => {
  const { toast } = useToast();
  const [retryCount, setRetryCount] = useState(0);
  const [hasError, setHasError] = useState(false);
  const [isRetrying, setIsRetrying] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleClick = useCallback(async () => {
    if (isLoading || isRetrying) return;

    // If we're not in retry mode, reset states
    if (!hasError) {
      setRetryCount(0);
      setHasError(false);
      setErrorMessage(null);
    }

    try {
      if (hasError) {
        setIsRetrying(true);
      }

      await onClick();

      // If successful, reset error state
      if (hasError) {
        setHasError(false);
        setRetryCount(0);
        setErrorMessage(null);
        toast({
          title: "Success",
          description: "Tagging recovered successfully after error",
          variant: "default",
        });
      }
    } catch (error) {
      console.error("Tagging error:", error);

      const newRetryCount = hasError ? retryCount + 1 : 1;
      setRetryCount(newRetryCount);
      setHasError(true);
      setErrorMessage(error instanceof Error ? error.message : 'An unknown error occurred');

      // Show toast with retry count
      if (newRetryCount < maxRetries) {
        toast({
          title: "Tagging Error",
          description: `Error during tagging. ${maxRetries - newRetryCount} retries remaining.`,
          variant: "destructive",
        });
      } else {
        toast({
          title: "Tagging Failed",
          description: "Maximum retry attempts reached. Please try again later.",
          variant: "destructive",
        });
      }
    } finally {
      setIsRetrying(false);
    }
  }, [onClick, isLoading, isRetrying, hasError, retryCount, maxRetries, toast]);

  const handleRetry = useCallback(async () => {
    if (retryCount >= maxRetries) {
      // Reset retry counter if max retries reached to allow another attempt
      setRetryCount(0);
    }
    await handleClick();
  }, [handleClick, retryCount, maxRetries]);

  // Different styles based on state
  const baseClasses = "flex items-center gap-2 px-4 py-2 rounded-md font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed";

  let buttonClasses;
  if (hasError) {
    if (retryCount >= maxRetries) {
      buttonClasses = `${baseClasses} bg-red-600 hover:bg-red-700 text-white`;
    } else {
      buttonClasses = `${baseClasses} bg-amber-600 hover:bg-amber-700 text-white`;
    }
  } else {
    buttonClasses = `${baseClasses} bg-purple-600 hover:bg-purple-700 text-white`;
  }

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            onClick={hasError ? handleRetry : handleClick}
            disabled={isLoading || isRetrying}
            className={buttonClasses}
            aria-label={hasError ? "Retry tagging" : "Tag data"}
          >
            {isLoading || isRetrying ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                {hasError ? `Retrying (${retryCount}/${maxRetries})...` : "Tagging..."}
              </>
            ) : hasError ? (
              <>
                <RefreshCw className="h-4 w-4" />
                {retryCount >= maxRetries ? "Tagging Failed - Retry" : `Retry Tagging (${retryCount}/${maxRetries})`}
              </>
            ) : (
              <>
                <TagIcon className="h-4 w-4" />
                Tag Data
              </>
            )}
          </button>
        </TooltipTrigger>
        <TooltipContent side="top">
          {isLoading || isRetrying ? (
            "Processing, please wait..."
          ) : hasError ? (
            <div className="flex items-center gap-2 max-w-xs">
              <AlertTriangle className="h-4 w-4 text-amber-500" />
              <span>Previous attempt failed: {errorMessage || 'Unknown error'}</span>
            </div>
          ) : (
            "Tag document with XBRL standards"
          )}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};