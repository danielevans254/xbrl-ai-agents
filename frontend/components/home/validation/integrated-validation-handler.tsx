import { useState, useCallback, useRef } from 'react';
import { ValidationErrorsResponse } from './validation-error-component';

export const useValidationHandler = ({
  sessionId,
  createSession,
  updateSessionStatus,
  currentDocumentId,
  setCurrentDocumentId,
  API_BASE_URL,
  setMessages,
  setValidatedData,
  setProcessingState,
  setActiveStep,
  SESSION_THREAD_STATUS,
  toast,
  mappedData
}) => {
  const [validationLoading, setValidationLoading] = useState(false);
  const [validationErrors, setValidationErrors] = useState<ValidationErrorsResponse | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  // Helper function to count errors by severity
  const countErrorsBySeverity = (validationErrors) => {
    if (!validationErrors || !validationErrors.validation_errors) {
      return { ERROR: 0, WARNING: 0, INFO: 0 };
    }

    const counts = { ERROR: 0, WARNING: 0, INFO: 0 };

    Object.keys(validationErrors.validation_errors).forEach(category => {
      validationErrors.validation_errors[category].forEach(error => {
        if (error.severity && counts[error.severity] !== undefined) {
          counts[error.severity]++;
        }
      });
    });

    return counts;
  };

  // Format total errors for toast notification
  const formatErrorSummaryForToast = (validationErrors) => {
    if (!validationErrors || !validationErrors.validation_errors) {
      return 'Unknown validation error';
    }

    const counts = countErrorsBySeverity(validationErrors);
    const total = counts.ERROR + counts.WARNING + counts.INFO;

    // Create an informative summary
    let summary = `Validation found ${total} issue${total !== 1 ? 's' : ''}`;

    const details = [];
    if (counts.ERROR > 0) details.push(`${counts.ERROR} error${counts.ERROR !== 1 ? 's' : ''}`);
    if (counts.WARNING > 0) details.push(`${counts.WARNING} warning${counts.WARNING !== 1 ? 's' : ''}`);
    if (counts.INFO > 0) details.push(`${counts.INFO} info message${counts.INFO !== 1 ? 's' : ''}`);

    if (details.length > 0) {
      summary += `: ${details.join(', ')}`;
    }

    // Add the first error for context
    const firstCategory = Object.keys(validationErrors.validation_errors)[0];
    if (firstCategory) {
      const firstErrorArray = validationErrors.validation_errors[firstCategory];
      if (firstErrorArray && firstErrorArray.length > 0) {
        const firstError = firstErrorArray[0];
        if (firstError && firstError.message) {
          if (counts.ERROR > 1 || counts.WARNING > 0 || counts.INFO > 0) {
            summary += `. Example: ${firstError.message}`;
          } else {
            summary += `: ${firstError.message}`;
          }
        }
      }
    }

    return summary;
  };

  // Helper function to get the most critical error message
  const getMostCriticalErrorMessage = (validationErrors) => {
    if (!validationErrors || !validationErrors.validation_errors) {
      return 'Unknown validation error';
    }

    // Try to find the first ERROR
    for (const category of Object.keys(validationErrors.validation_errors)) {
      const errors = validationErrors.validation_errors[category];
      for (const error of errors) {
        if (error.severity === 'ERROR' && error.message) {
          return `${category}: ${error.message}`;
        }
      }
    }

    // If no ERROR, try to find the first WARNING
    for (const category of Object.keys(validationErrors.validation_errors)) {
      const errors = validationErrors.validation_errors[category];
      for (const error of errors) {
        if (error.severity === 'WARNING' && error.message) {
          return `${category}: ${error.message}`;
        }
      }
    }

    // If no WARNING either, just take the first error of any type
    const firstCategory = Object.keys(validationErrors.validation_errors)[0];
    if (firstCategory) {
      const firstErrorArray = validationErrors.validation_errors[firstCategory];
      if (firstErrorArray && firstErrorArray.length > 0 && firstErrorArray[0].message) {
        return `${firstCategory}: ${firstErrorArray[0].message}`;
      }
      return `Validation failed in ${firstCategory}`;
    }

    return 'Unknown validation error';
  };

  // Cancel any previous validation request
  const cancelPreviousRequest = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
  }, []);

  // Main validation handler
  const handleValidation = async () => {
    // Cancel any existing request
    cancelPreviousRequest();

    // Reset any previous validation errors
    setValidationErrors(null);

    // Create or validate session first
    if (!sessionId) {
      try {
        const newSessionId = await createSession();
        if (!newSessionId) {
          toast({
            title: 'Session Error',
            description: 'No active session found. Please try again.',
            variant: 'destructive',
          });
          return;
        }
      } catch (err) {
        toast({
          title: 'Session Error',
          description: 'Unable to create a new session. Please refresh and try again.',
          variant: 'destructive',
        });
        return;
      }
    }

    // Create a new abort controller for this request
    abortControllerRef.current = new AbortController();

    try {
      // Update session status
      await updateSessionStatus(SESSION_THREAD_STATUS.VALIDATING);

      // Get the document ID from either the current state or mapped data
      let docId = currentDocumentId;

      if (!docId) {
        if (mappedData && Array.isArray(mappedData) && mappedData.length > 0 && mappedData[0].id) {
          docId = mappedData[0].id;
          if (setCurrentDocumentId) setCurrentDocumentId(docId);
          console.log("Found document ID in mapped data:", docId);
        } else if (mappedData && !Array.isArray(mappedData) && mappedData.id) {
          docId = mappedData.id;
          if (setCurrentDocumentId) setCurrentDocumentId(docId);
          console.log("Found document ID in mapped data:", docId);
        } else {
          toast({
            title: 'Error',
            description: 'No document ID found for validation. Please complete the mapping step first.',
            variant: 'destructive',
          });
          return;
        }
      }

      // Update UI state
      setValidationLoading(true);
      setMessages(prev =>
        prev.map(msg =>
          msg.role === 'assistant' && msg.isJson
            ? { ...msg, processingStatus: 'Validating mapped data...' }
            : msg
        )
      );

      // Generate a unique request ID for tracking
      const requestId = crypto.randomUUID();
      console.log(`Starting validation for document ID: ${docId}`);

      // Make the API request with abort signal
      const response = await fetch(
        `${API_BASE_URL}/api/validate?documentId=${encodeURIComponent(docId)}`,
        {
          method: 'GET',
          headers: {
            'X-Request-ID': requestId,
            'Content-Type': 'application/json'
          },
          signal: abortControllerRef.current.signal
        }
      );

      // Parse the response data
      const responseData = await response.json();
      console.log("Validation Response Data:", responseData);

      // Handle non-OK responses
      if (!response.ok) {
        // Try to extract structured validation errors
        if (responseData?.validation_errors) {
          // Store the validation errors for display
          setValidationErrors(responseData as ValidationErrorsResponse);

          const errorMessage = formatErrorSummaryForToast(responseData);
          throw new Error(errorMessage);
        } else {
          // Handle other API errors
          throw new Error(responseData.message || 'Error validating data');
        }
      }

      // Check for valid response data
      if (!responseData || (!responseData.data && responseData.is_valid === undefined)) {
        throw new Error('Invalid response data received from validation endpoint');
      }

      // Check if validation failed
      if (
        responseData.validation_status === 'error' ||
        responseData.is_valid === false
      ) {
        setValidationErrors(responseData as ValidationErrorsResponse);

        const errorMessage = formatErrorSummaryForToast(responseData);
        throw new Error(errorMessage);
      }

      // Update session status on success
      await updateSessionStatus(SESSION_THREAD_STATUS.VALIDATION_COMPLETE);

      // Store the validated data
      const validatedDataPayload = responseData.data || responseData;

      // Ensure document ID is preserved in validated data
      if (validatedDataPayload && !validatedDataPayload.id && docId) {
        validatedDataPayload.id = docId;
      }

      setValidatedData(validatedDataPayload);
      setProcessingState(prev => ({ ...prev, validated: true }));

      if (setActiveStep) {
        setActiveStep('validated');
      }

      // Update message status
      setMessages(prevMessages =>
        prevMessages.map(msg => {
          if (msg.role === 'assistant' && msg.isJson) {
            return {
              ...msg,
              processingStatus: undefined,
              validated: true
            };
          }
          return msg;
        })
      );

      // Show success notification
      toast({
        title: '✅ Validation Complete',
        description: 'All data passed validation successfully',
        variant: 'default',
      });

    } catch (err) {
      if (err.name === 'AbortError') {
        console.log('Validation request was cancelled');
        return;
      }

      // Update session status on failure
      await updateSessionStatus(SESSION_THREAD_STATUS.VALIDATION_FAILED);
      console.error('Validation error:', err);

      // Create a more descriptive error toast
      const counts = countErrorsBySeverity(validationErrors);
      const hasErrors = counts.ERROR > 0;

      toast({
        title: hasErrors ? '❌ Validation Failed' : '⚠️ Validation Issues Found',
        description: err instanceof Error ? err.message : 'Failed to complete validation',
        variant: 'destructive',
        duration: 10000,
      });

      // Reset message processing status
      setMessages(prev => prev.map(msg =>
        msg.role === 'assistant' && msg.isJson && msg.processingStatus
          ? { ...msg, processingStatus: undefined }
          : msg
      ));

    } finally {
      setValidationLoading(false);
      cancelPreviousRequest();
    }
  };

  // Clear validation errors
  const clearValidationErrors = () => {
    setValidationErrors(null);
  };

  return {
    validationLoading,
    validationErrors,
    handleValidation,
    clearValidationErrors
  };
};

export default useValidationHandler;