'use client';

import { AlertCircle, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

export const ErrorDisplay = ({ error, clearError }: { error: string | null; clearError: () => void }) => (
  error && (
    <Alert variant="destructive" className="mb-6 animate-in fade-in slide-in-from-top duration-300 w-full shadow-md">
      <div className="flex items-start gap-3 w-full">
        <AlertCircle className="h-5 w-5 mt-0.5 shrink-0" />
        <div className="flex-1">
          <AlertTitle className="text-lg font-medium">Error</AlertTitle>
          <AlertDescription className="mt-1 break-words text-sm">{error}</AlertDescription>
        </div>
        <Button variant="ghost" size="sm" onClick={clearError} className="h-8 w-8 p-0 rounded-full">
          <X className="h-4 w-4" />
        </Button>
      </div>
    </Alert>
  )
);