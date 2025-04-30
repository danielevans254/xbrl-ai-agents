'use client';

import { useState, useCallback } from 'react';
import { Button } from "@/components/ui/button";
import { Loader2, MapIcon, AlertTriangle, RefreshCw } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface MappingButtonProps {
  onClick: () => Promise<void>;
  isLoading: boolean;
  maxRetries?: number;
}

export const MappingButton = ({
  onClick,
  isLoading,
  maxRetries = 3
}: MappingButtonProps) => {
  const { toast } = useToast();
  const [retryCount, setRetryCount] = useState(0);
  const [hasError, setHasError] = useState(false);
  const [isRetrying, setIsRetrying] = useState(false);

  const handleClick = useCallback(async () => {
    if (isLoading || isRetrying) return;

    // If we're not in retry mode, reset states
    if (!hasError) {
      setRetryCount(0);
      setHasError(false);
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
        toast({
          title: "Success",
          description: "Mapping recovered successfully after error",
          variant: "default",
        });
      }
    } catch (error) {
      console.error("Mapping error:", error);

      const newRetryCount = hasError ? retryCount + 1 : 1;
      setRetryCount(newRetryCount);
      setHasError(true);

      // Show toast with retry count
      if (newRetryCount < maxRetries) {
        toast({
          title: "Mapping Error",
          description: `Error during mapping. ${maxRetries - newRetryCount} retries remaining.`,
          variant: "destructive",
        });
      } else {
        toast({
          title: "Mapping Failed",
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

  if (hasError) {
    if (retryCount >= maxRetries) {
      return (
        <Button
          onClick={handleRetry}
          className="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-md font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <AlertTriangle className="h-4 w-4" />
          Mapping Failed - Retry
        </Button>
      );
    }

    return (
      <Button
        onClick={handleRetry}
        disabled={isRetrying}
        className="flex items-center gap-2 px-4 py-2 bg-yellow-600 hover:bg-yellow-700 text-white rounded-md font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isRetrying ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            Retrying ({retryCount}/{maxRetries})...
          </>
        ) : (
          <>
            <RefreshCw className="h-4 w-4" />
            Retry Mapping ({retryCount}/{maxRetries})
          </>
        )}
      </Button>
    );
  }

  return (
    <Button
      onClick={handleClick}
      disabled={isLoading}
      className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-md font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
    >
      {isLoading ? (
        <>
          <Loader2 className="h-4 w-4 animate-spin" />
          Mapping...
        </>
      ) : (
        <>
          <MapIcon className="h-4 w-4" />
          Map Data
        </>
      )}
    </Button>
  );
};