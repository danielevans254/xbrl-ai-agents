import { useState, useCallback, useRef, useEffect } from 'react';
import { ValidationErrorsResponse } from './validation-error-component';

/**
 * Enhanced validation handler hook with improved user experience
 */
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
  const [validationProgress, setValidationProgress] = useState(0);
  const [isUserNotified, setIsUserNotified] = useState(false);
  const abortControllerRef = useRef<AbortController | null>(null);
  const progressIntervalRef = useRef<number | null>(null);
  const toastIdRef = useRef<string | number | null>(null);

  // Format validation summary for toast notification
  // Get the most critical error message
  const getMostCriticalError = (validationErrors) => {
    if (!validationErrors?.validation_errors) return null;

    // Try to find first ERROR
    for (const category of Object.keys(validationErrors.validation_errors)) {
      const errors = validationErrors.validation_errors[category];
      const criticalError = errors.find(e => e.severity === 'ERROR');
      if (criticalError) return { category, error: criticalError };
    }

    // Try to find first WARNING
    for (const category of Object.keys(validationErrors.validation_errors)) {
      const errors = validationErrors.validation_errors[category];
      const warningError = errors.find(e => e.severity === 'WARNING');
      if (warningError) return { category, error: warningError };
    }

    // Return first INFO if no others found
    const firstCategory = Object.keys(validationErrors.validation_errors)[0];
    if (firstCategory && validationErrors.validation_errors[firstCategory].length > 0) {
      return {
        category: firstCategory,
        error: validationErrors.validation_errors[firstCategory][0]
      };
    }

    return null;
  };

  // Simulate validation progress with smoother animation
  const startProgressSimulation = () => {
    if (progressIntervalRef.current) {
      clearInterval(progressIntervalRef.current);
    }

    setValidationProgress(0);

    // Initial fast progress to 30% to indicate activity
    setTimeout(() => {
      setValidationProgress(30);
    }, 300);

    // Then simulate progress from 30% to 85% (the last 15% will be set when complete)
    progressIntervalRef.current = setInterval(() => {
      setValidationProgress(prev => {
        // Slow down as we get closer to 85%
        if (prev < 70) {
          const increment = Math.random() * 5 + 2; // 2-7% increment
          return Math.min(70, prev + increment);
        } else {
          const increment = Math.random() * 1 + 0.5; // 0.5-1.5% increment
          return Math.min(85, prev + increment);
        }
      });
    }, 800) as unknown as number;
  };

  // Stop progress simulation
  const stopProgressSimulation = (complete = false) => {
    if (progressIntervalRef.current) {
      clearInterval(progressIntervalRef.current);
      progressIntervalRef.current = null;
    }

    // If complete, set to 100%, otherwise reset to 0
    if (complete) {
      setValidationProgress(95);
      // Add a small delay before 100% to give user feedback
      setTimeout(() => {
        setValidationProgress(100);
      }, 500);
    } else {
      setValidationProgress(0);
    }
  };

  // Cleanup interval on unmount
  useEffect(() => {
    return () => {
      if (progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current);
      }
    };
  }, []);

  // Update toast with progress
  useEffect(() => {
    if (validationLoading && toastIdRef.current && validationProgress > 0) {
      // Update the existing toast with progress
      toast({
        id: toastIdRef.current,
        title: '🔄 Validating Data',
        description: `Processing your data structure... ${Math.round(validationProgress)}%`,
        variant: 'default',
      });
    }
  }, [validationProgress, validationLoading, toast]);

  // Format validation summary for toast notification with improved language
  const formatValidationSummary = (validationErrors) => {
    if (!validationErrors || !validationErrors.validation_errors) {
      return {
        title: 'Something Went Wrong',
        description: 'We couldn\'t properly analyze your data. Please try again.',
        variant: 'destructive'
      };
    }

    // Count errors by severity
    const counts = { ERROR: 0, WARNING: 0, INFO: 0 };
    Object.values(validationErrors.validation_errors).flat().forEach(error => {
      if (error.severity && counts[error.severity] !== undefined) {
        counts[error.severity]++;
      }
    });

    // Get total issues
    const totalIssues = counts.ERROR + counts.WARNING + counts.INFO;

    // Get most critical error for example
    const criticalError = getMostCriticalError(validationErrors);

    // More user-friendly error example
    let errorExample = '';
    if (criticalError) {
      // Shorten if message is too long
      const message = criticalError.error.message;
      errorExample = message.length > 60
        ? ` For example: "${message.substring(0, 57)}..."`
        : ` For example: "${message}"`;
    }

    // Create an informative summary with more user-friendly language
    if (counts.ERROR > 0) {
      return {
        title: '❌ Data Issues Detected',
        description: `Found ${counts.ERROR} critical issue${counts.ERROR !== 1 ? 's' : ''}${counts.WARNING > 0 ? ` and ${counts.WARNING} warning${counts.WARNING !== 1 ? 's' : ''}` : ''} that need your attention.${errorExample}`,
        variant: 'destructive',
        duration: 8000
      };
    } else if (counts.WARNING > 0) {
      return {
        title: '⚠️ Review Recommended',
        description: `Found ${counts.WARNING} item${counts.WARNING !== 1 ? 's' : ''} that may need your attention.${errorExample}`,
        variant: 'warning',
        duration: 6000
      };
    } else if (counts.INFO > 0) {
      return {
        title: 'ℹ️ Information Available',
        description: `We have ${counts.INFO} helpful note${counts.INFO !== 1 ? 's' : ''} about your data.${errorExample}`,
        variant: 'info',
        duration: 4000
      };
    }

    return {
      title: '✅ All Good!',
      description: 'Your data passed all validation checks successfully.',
      variant: 'default'
    };
  };

  // Cancel any previous validation request
  const cancelPreviousRequest = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    stopProgressSimulation();
  }, []);

  // Main validation handler with improved user feedback
  const handleValidation = async () => {
    // Cancel any existing request
    cancelPreviousRequest();

    // Reset any previous validation errors
    setValidationErrors(null);

    // Reset user notification state
    setIsUserNotified(false);

    // Start progress simulation
    startProgressSimulation();

    // Create or validate session first
    if (!sessionId) {
      try {
        // Display toast for session creation
        toastIdRef.current = toast({
          title: '🔄 Setting Up',
          description: 'Preparing to check your data...',
          variant: 'default',
        });

        const newSessionId = await createSession();
        if (!newSessionId) {
          stopProgressSimulation();
          toast({
            title: 'Session Error',
            description: 'We couldn\'t create a session for your data check. Please try again.',
            variant: 'destructive',
          });
          return;
        }
      } catch (err) {
        stopProgressSimulation();
        toast({
          title: 'Connection Issue',
          description: 'We had trouble connecting to the server. Please refresh and try again.',
          variant: 'destructive',
        });
        return;
      }
    }

    // Create a new abort controller for this request
    abortControllerRef.current = new AbortController();

    try {
      // Show toast for validation start with progress indicator
      toastIdRef.current = toast({
        title: '🔄 Checking Your Data',
        description: 'Analyzing your data structure...',
        variant: 'default',
      });

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
          stopProgressSimulation();
          toast({
            title: 'Missing Information',
            description: 'We couldn\'t find the necessary document information. Please complete the previous step first.',
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
            ? { ...msg, processingStatus: 'Checking data format and structure...' }
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

          const toastOptions = formatValidationSummary(responseData);
          toast(toastOptions);
          setIsUserNotified(true);

          // Update session status but don't throw - we want to display the errors
          await updateSessionStatus(SESSION_THREAD_STATUS.VALIDATION_FAILED);
        } else {
          // Handle other API errors
          throw new Error(responseData.message || 'Error validating data');
        }
      }
      // Check for valid response data
      else if (!responseData || (!responseData.data && responseData.is_valid === undefined)) {
        throw new Error('We received an unexpected response when checking your data. Please try again.');
      }
      // Check if validation failed but response was 200 OK
      else if (
        responseData.validation_status === 'error' ||
        responseData.is_valid === false
      ) {
        setValidationErrors(responseData as ValidationErrorsResponse);
        const toastOptions = formatValidationSummary(responseData);
        toast(toastOptions);
        setIsUserNotified(true);

        // Update session status
        await updateSessionStatus(SESSION_THREAD_STATUS.VALIDATION_FAILED);
      }
      // Validation successful
      else {
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
          title: '✅ All Good!',
          description: 'Your data has passed all validation checks successfully.',
          variant: 'default',
        });
        setIsUserNotified(true);
      }

    } catch (err) {
      if (err.name === 'AbortError') {
        console.log('Validation request was cancelled');
        return;
      }

      // Update session status on failure
      await updateSessionStatus(SESSION_THREAD_STATUS.VALIDATION_FAILED);
      console.error('Validation error:', err);

      // Show error toast with user-friendly message
      toast({
        title: '❌ Data Check Failed',
        description: err instanceof Error
          ? err.message
          : 'We had a problem checking your data. Please try again or contact support if the issue persists.',
        variant: 'destructive',
        duration: 10000,
      });
      setIsUserNotified(true);

      // Reset message processing status
      setMessages(prev => prev.map(msg =>
        msg.role === 'assistant' && msg.isJson && msg.processingStatus
          ? { ...msg, processingStatus: undefined }
          : msg
      ));

    } finally {
      setValidationLoading(false);
      stopProgressSimulation(true);

      // Clear the toast reference
      toastIdRef.current = null;

      // Show a notification if one hasn't been shown yet
      if (!isUserNotified) {
        toast({
          title: '✓ Process Complete',
          description: 'Data check process has finished.',
          variant: 'default',
        });
      }

      cancelPreviousRequest();
    }
  };

  // Clear validation errors
  const clearValidationErrors = () => {
    setValidationErrors(null);
  };

  // Return the interface
  return {
    validationLoading,
    validationErrors,
    validationProgress,
    handleValidation,
    clearValidationErrors
  };
};

export default useValidationHandler;