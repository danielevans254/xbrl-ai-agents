/**
 * Enhanced validation handling with improved error display
 * Integrates with the ValidationErrorDisplay component
 */
import { useState } from 'react';
import { ValidationErrorsResponse } from './validation-error-component';

export const useValidationHandler = ({
  sessionId,
  createSession,
  updateSessionStatus,
  currentDocumentId,
  API_BASE_URL,
  setMessages,
  setValidatedData,
  setProcessingState,
  setActiveStep,
  SESSION_THREAD_STATUS,
  toast,
  mappedData // Add mapped data to the parameters
}) => {
  const [validationLoading, setValidationLoading] = useState(false);
  const [validationErrors, setValidationErrors] = useState<ValidationErrorsResponse | null>(null);

  // Helper function to format the first error message for toast notification
  const formatFirstErrorForToast = (validationErrors) => {
    if (!validationErrors) return 'Unknown validation error';

    // Find the first category with errors
    const firstCategory = Object.keys(validationErrors)[0];
    if (!firstCategory) return 'Unknown validation error';

    const categoryErrors = validationErrors[firstCategory];
    if (!Array.isArray(categoryErrors) || !categoryErrors.length) {
      return `Validation failed in ${firstCategory}`;
    }

    // Get the first error
    const firstError = categoryErrors[0];

    // If it's a structured error with message
    if (firstError && typeof firstError === 'object' && firstError.message) {
      return `${firstCategory}: ${firstError.message}` +
        (firstError.recommendation ? ` (${firstError.recommendation})` : '');
    }

    // Fallback for string errors
    return `${firstCategory}: ${String(firstError)}`;
  };

  // Main validation handler
  const handleValidation = async () => {
    // Reset any previous validation errors
    setValidationErrors(null);

    // Create or validate session first
    if (!sessionId) {
      try {
        const newSessionId = await createSession();
        if (!newSessionId) {
          toast({
            title: 'Error',
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

    // Create an abort controller for this request
    const abortController = new AbortController();

    try {
      // Update session status
      await updateSessionStatus(SESSION_THREAD_STATUS.VALIDATING);

      // Validate document ID
      if (!currentDocumentId) {
        toast({
          title: 'Error',
          description: 'No document ID found for validation',
          variant: 'destructive',
        });
        return;
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

      // Make the API request with abort signal
      const response = await fetch(
        `${API_BASE_URL}/api/validate?documentId=${encodeURIComponent(currentDocumentId)}`,
        {
          method: 'GET',
          headers: {
            'X-Request-ID': requestId,
            'Content-Type': 'application/json'
          },
          signal: abortController.signal
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

          const errorMessage = formatFirstErrorForToast(responseData.validation_errors);
          throw new Error(errorMessage);
        } else {
          // Handle other API errors
          throw new Error(responseData.message || 'Error validating data');
        }
      }

      // Check for valid response data - simplified check
      if (!responseData) {
        throw new Error('Invalid response data received from validation endpoint');
      }

      if (
        responseData.validation_status === 'error' ||
        responseData.is_valid === false
      ) {
        setValidationErrors(responseData as ValidationErrorsResponse);

        const errorMessage = formatFirstErrorForToast(responseData.validation_errors);
        throw new Error(errorMessage);
      }

      await updateSessionStatus(SESSION_THREAD_STATUS.VALIDATION_COMPLETE);

      setValidatedData(mappedData);
      setProcessingState(prev => ({ ...prev, validated: true }));
      setActiveStep('validated');

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

      toast({
        title: 'Validation Complete',
        description: 'Data validation finished successfully',
        variant: 'default',
      });

    } catch (err) {
      if (err.name === 'AbortError') {
        console.log('Validation request was cancelled');
        return;
      }

      await updateSessionStatus(SESSION_THREAD_STATUS.VALIDATION_FAILED);
      console.error('Validation error:', err);

      toast({
        title: 'Validation Failed',
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
      abortController.abort();
    }
  };

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