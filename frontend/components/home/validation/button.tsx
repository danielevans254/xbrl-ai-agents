import React from 'react';
import { AlertTriangle, CheckCircle, Loader2 } from 'lucide-react';

interface ValidationButtonProps {
  onClick: () => void;
  isLoading: boolean;
  hasErrors?: boolean;
  errorCount?: number;
}

export const ValidationButton = ({
  onClick,
  isLoading,
  hasErrors = false,
  errorCount = 0
}: ValidationButtonProps) => {
  // Determine button style based on validation state
  const getButtonStyles = () => {
    if (isLoading) {
      return "bg-amber-500 hover:bg-amber-600";
    }
    if (hasErrors) {
      return "bg-red-600 hover:bg-red-700";
    }
    return "bg-amber-600 hover:bg-amber-700";
  };

  return (
    <button
      onClick={onClick}
      disabled={isLoading}
      className={`flex items-center gap-2 px-4 py-2 ${getButtonStyles()} text-white rounded-md font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed`}
    >
      {isLoading ? (
        <>
          <Loader2 className="h-4 w-4 animate-spin" />
          Validating...
        </>
      ) : hasErrors ? (
        <>
          <AlertTriangle className="h-4 w-4" />
          {errorCount > 0 ? `Fix ${errorCount} Issue${errorCount !== 1 ? 's' : ''}` : 'Fix Issues'}
        </>
      ) : (
        <>
          <CheckCircle className="h-4 w-4" />
          Validate Data
        </>
      )}
    </button>
  );
};

export default ValidationButton;