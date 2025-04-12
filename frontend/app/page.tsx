'use client';

import { useToast } from '@/hooks/use-toast';
import { useRef, useState, useEffect, FormEvent, ChangeEvent } from 'react';
import { client } from '@/lib/langgraph-client';
import { PDFDocument } from '@/types/graphTypes';
import { partialXBRLMessage } from '@/constants/prompts/partial-xbrl';
import { SESSION_THREAD_STATUS } from '@/constants/session-thread/state';
import { FileText, Loader2, CheckCircle2, ArrowLeft, ArrowRight } from 'lucide-react';
import { ErrorDisplay } from '@/components/home/error-display';
import { UploadForm } from '@/components/home/upload-form';
import { ChatMessage } from '@/components/chat-message';
import { FilePreview } from '@/components/file-preview';
import { ProcessingStatusIndicator } from '@/components/home/processing-status';
import WorkflowProgress from '@/components/home/interactive-step-loader';
import { LeftSidebar } from '@/components/home/left-sidebar';
import { MappingButton } from '@/components/home/mapping/button';
import { ValidationButton } from '@/components/home/validation/button';
import { TaggingButton } from '@/components/home/tagging/button';
import EditableDataVisualizer from '@/components/data-visualizer-switch';
import { OutputButton } from '@/components/home/output/button';
import ValidationErrorDisplay from '@/components/home/validation/validation-error-component';

interface FileData {
  name: string;
  size: number;
  lastModified: number;
  webkitRelativePath: string;
  type: string;
  bytes: Uint8Array;
}

interface FormErrors {
  file?: string;
}

interface Message {
  role: 'user' | 'assistant';
  content: string;
  sources?: PDFDocument[];
  processingStatus?: string;
  isJson?: boolean;
  hideFromChat?: boolean;
}

interface ProcessingState {
  extracted: boolean;
  mapped: boolean;
  validated: boolean;
  tagged: boolean;
}

type ActiveStep = 'extracted' | 'mapped' | 'validated' | 'tagged' | 'output' | null;

const MAX_FILE_SIZE = 50 * 1024 * 1024;
const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || '';

export default function Home() {
  const { toast } = useToast();
  const [viewType, setViewType] = useState<'json' | 'table' | 'card'>('table');
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [files, setFiles] = useState<FileData[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [threadId, setThreadId] = useState<string | null>(null);
  const [startTime, setStartTime] = useState<number | null>(null);
  const [elapsedTime, setElapsedTime] = useState<number>(0);
  const [error, setError] = useState<string | null>(null);
  const [isThreadInitializing, setIsThreadInitializing] = useState(true);
  const [graphProgress, setGraphProgress] = useState(0);
  const [currentStep, setCurrentStep] = useState('');
  const [totalSteps, setTotalSteps] = useState(0);
  const [completedSteps, setCompletedSteps] = useState(0);
  const [extractionComplete, setExtractionComplete] = useState(false);
  const [mappingLoading, setMappingLoading] = useState(false);
  const [formErrors, setFormErrors] = useState<FormErrors>({});
  const [submissionAttempted, setSubmissionAttempted] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const [extractionPollTimer, setExtractionPollTimer] = useState<NodeJS.Timeout | null>(null);

  const [extractedData, setExtractedData] = useState<any>(null);
  const [mappedData, setMappedData] = useState<any[]>([]);
  const [validatedData, setValidatedData] = useState<any>(null);
  const [taggingData, setTaggingData] = useState<any>(null);
  const [outputData, setOutputData] = useState<any>(null);
  const [activeStep, setActiveStep] = useState<ActiveStep>(null);
  const [currentDocumentId, setCurrentDocumentId] = useState<string | null>(null);

  const [processingState, setProcessingState] = useState<ProcessingState>({
    extracted: false,
    mapped: false,
    validated: false,
    tagged: false
  });

  const [validationLoading, setValidationLoading] = useState(false);
  const [validationErrors, setValidationErrors] = useState<any>(null);
  const [taggingLoading, setTaggingLoading] = useState(false);

  const getActiveStepData = () => {
    switch (activeStep) {
      case 'extracted':
        return extractedData;
      case 'mapped':
        return mappedData;
      case 'validated':
        return validatedData;
      case 'tagged':
        return taggingData;
      case 'output':
        return outputData;
      default:
        if (processingState.tagged) return taggingData;
        if (processingState.validated) return validatedData;
        if (processingState.mapped) return mappedData;
        if (processingState.extracted) return extractedData;
        return null;
    }
  };

  useEffect(() => {
    if (activeStep && getActiveStepData()) {
      setMessages(prevMessages => {
        const jsonMessageIndex = prevMessages.findIndex(msg => msg.role === 'assistant' && msg.isJson);

        if (jsonMessageIndex >= 0) {
          const updatedMessages = [...prevMessages];
          updatedMessages[jsonMessageIndex] = {
            ...updatedMessages[jsonMessageIndex],
            content: JSON.stringify(getActiveStepData(), null, 2),
          };
          return updatedMessages;
        }

        return [...prevMessages, {
          role: 'assistant',
          content: JSON.stringify(getActiveStepData(), null, 2),
          isJson: true,
        }];
      });
    }
  }, [activeStep]);

  useEffect(() => {
    if (extractionComplete) {
      setProcessingState(prev => ({ ...prev, extracted: true }));
    }
  }, [extractionComplete]);

  const createSession = async () => {
    if (sessionId) return sessionId;

    try {
      const response = await fetch(`${API_BASE_URL}/api/session/create`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to create session: ${response.status}`);
      }

      const data = await response.json();
      const newSessionId = data.session_id;
      setSessionId(newSessionId);
      return newSessionId;
    } catch (error) {
      console.error('Error creating session:', error);
      toast({
        title: 'Session Error',
        description: 'Failed to create session. Please try again.',
        variant: 'destructive',
      });
      return null;
    }
  };

  useEffect(() => {
    const initThread = async () => {
      if (threadId) return;
      setIsThreadInitializing(true);
      try {
        const thread = await client.createThread();
        if (!thread || !thread.thread_id) {
          throw new Error('Thread creation failed: No thread ID returned');
        }
        setThreadId(thread.thread_id);
        setError(null);

        await createSession();
      } catch (err: any) {
        console.error('Error creating thread:', err);
        setError('Failed to initialize chat thread. Please refresh the page or check your connection.');
        toast({
          title: 'Error Initializing',
          description:
            'Error creating thread. Please ensure the LANGGRAPH_API_URL environment variable is set correctly. ' +
            (err instanceof Error ? err.message : String(err)),
          variant: 'destructive',
        });
      } finally {
        setIsThreadInitializing(false);
      }
    };
    initThread();
  }, []);

  const handleApiError = async (response: Response, errorMessage: string) => {
    let errorDetails = errorMessage;
    try {
      const errorData = await response.json();
      errorDetails = errorData.message || errorData.error || errorMessage;
    } catch (err) {
      console.error('Error parsing error response:', err);
    }
    throw new Error(errorDetails);
  };

  const updateSessionStatus = async (status: string) => {
    if (!sessionId) {
      console.warn('No sessionId available for status update:', status);
      return null;
    }

    try {
      const response = await fetch(`${API_BASE_URL}/api/session/update`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          sessionId: sessionId,
          status
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
        throw new Error(errorData.error || errorData.details || 'Failed to update session status');
      }

      return await response.json();
    } catch (error) {
      console.error(`Error updating session status to "${status}":`, error);
      return null;
    }
  };

  const formatFirstErrorForToast = (validationErrors) => {
    if (!validationErrors) return 'Unknown validation error';

    const firstCategory = Object.keys(validationErrors)[0];
    if (!firstCategory) return 'Unknown validation error';

    const categoryErrors = validationErrors[firstCategory];
    if (!Array.isArray(categoryErrors) || !categoryErrors.length) {
      return `Validation failed in ${firstCategory}`;
    }

    const firstError = categoryErrors[0];

    if (firstError && typeof firstError === 'object' && firstError.message) {
      return `${firstCategory}: ${firstError.message}` +
        (firstError.recommendation ? ` (${firstError.recommendation})` : '');
    }

    return `${firstCategory}: ${String(firstError)}`;
  };

  const handleValidation = async () => {
    setValidationErrors(null);

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

    const abortController = new AbortController();

    try {
      await updateSessionStatus(SESSION_THREAD_STATUS.VALIDATING);

      if (!currentDocumentId) {
        if (mappedData && Array.isArray(mappedData) && mappedData.length > 0 && mappedData[0].id) {
          setCurrentDocumentId(mappedData[0].id);
          console.log("Found document ID in mapped data:", mappedData[0].id);
        } else if (mappedData && !Array.isArray(mappedData) && mappedData.id) {
          setCurrentDocumentId(mappedData.id);
          console.log("Found document ID in mapped data:", mappedData.id);
        } else {
          toast({
            title: 'Error',
            description: 'No document ID found for validation. Please complete the mapping step first.',
            variant: 'destructive',
          });
          return;
        }
      }

      setValidationLoading(true);
      setMessages(prev =>
        prev.map(msg =>
          msg.role === 'assistant' && msg.isJson
            ? { ...msg, processingStatus: 'Validating mapped data...' }
            : msg
        )
      );

      const requestId = crypto.randomUUID();
      const docId = currentDocumentId;

      console.log(`Starting validation for document ID: ${docId}`);

      const response = await fetch(
        `${API_BASE_URL}/api/validate?documentId=${encodeURIComponent(docId)}`,
        {
          method: 'GET',
          headers: {
            'X-Request-ID': requestId,
            'Content-Type': 'application/json'
          },
          signal: abortController.signal
        }
      );

      const responseData = await response.json();
      console.log("Validation Response Data:", responseData);

      if (!response.ok) {
        if (responseData?.validation_errors) {
          setValidationErrors(responseData);

          const errorMessage = formatFirstErrorForToast(responseData.validation_errors);
          throw new Error(errorMessage);
        } else {
          throw new Error(responseData.message || 'Error validating data');
        }
      }

      if (!responseData || (!responseData.data && responseData.is_valid === undefined)) {
        throw new Error('Invalid response data received from validation endpoint');
      }

      if (
        responseData.validation_status === 'error' ||
        responseData.is_valid === false
      ) {
        setValidationErrors(responseData);

        const errorMessage = formatFirstErrorForToast(responseData.validation_errors);
        throw new Error(errorMessage);
      }

      await updateSessionStatus(SESSION_THREAD_STATUS.VALIDATION_COMPLETE);

      // Store the validated data but don't display it
      const validatedDataPayload = responseData.data || responseData;

      // Ensure document ID is preserved in validated data
      if (validatedDataPayload && !validatedDataPayload.id && docId) {
        validatedDataPayload.id = docId;
      }


      setValidatedData(validatedDataPayload);
      setProcessingState(prev => ({ ...prev, validated: true }));

      setMessages(prevMessages =>
        prevMessages.map(msg => {
          if (msg.role === 'assistant' && msg.isJson) {
            return {
              ...msg,
              processingStatus: undefined,
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

  const fetchTaggingResults = async (taggedDocumentId) => {
    console.log(`Tagging completed successfully, fetching results for document ID: ${taggedDocumentId}`);

    const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || '';
    const resultUrl = new URL(`${API_BASE_URL}/api/tag/result`, window.location.origin);
    resultUrl.searchParams.append('documentId', taggedDocumentId);
    console.log(`Fetching tagging result from: ${resultUrl.toString()}`);

    try {
      const resultResponse = await fetch(resultUrl.toString());

      if (!resultResponse.ok) {
        const errorText = await resultResponse.text().catch(() => 'Unknown error');
        console.error('Result fetch failed:', errorText);
        throw new Error(`Failed to retrieve tagging result: ${errorText}`);
      }

      let result;
      try {
        result = await resultResponse.json();
        console.log('Tagging result:', result);
      } catch (jsonError) {
        console.error('Error parsing result JSON:', jsonError);
        throw new Error('Failed to parse tagging result as JSON');
      }

      if (!result?.data) {
        throw new Error('Invalid response data received from tagging endpoint');
      }

      if (result.data && !result.data.id && taggedDocumentId) {
        result.data.id = taggedDocumentId;
      }

      return result.data;
    } catch (resultError) {
      console.error('Error fetching tagging result:', resultError);
      throw resultError;
    }
  };

  const handleTagging = async () => {
    if (!sessionId) {
      const newSessionId = await createSession();
      if (!newSessionId) {
        toast({
          title: 'Error',
          description: 'No active session found. Please try again.',
          variant: 'destructive',
        });
        return;
      }
    }

    await updateSessionStatus(SESSION_THREAD_STATUS.TAGGING);

    if (!currentDocumentId || !validatedData) {
      toast({
        title: 'Error',
        description: 'No validated data found for tagging',
        variant: 'destructive',
      });
      return;
    }

    try {
      setTaggingLoading(true);

      setMessages(prev => prev.map(msg =>
        msg.role === 'assistant' && msg.isJson
          ? { ...msg, processingStatus: 'Tagging data...' }
          : msg
      ));

      console.log(`Starting tagging process for document ID: ${currentDocumentId}`);

      const tagUrl = new URL('/api/tag', window.location.origin);

      const response = await fetch(tagUrl.toString(), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ uuid: currentDocumentId }),
      });

      if (!response.ok) {
        let errorMessage;
        try {
          const errorData = await response.json();
          errorMessage = errorData.message || errorData.error || 'Tagging request failed';
        } catch (e) {
          errorMessage = 'Tagging request failed';
        }
        throw new Error(errorMessage);
      }

      const responseData = await response.json();
      console.log('Complete tagging API response:', responseData);

      const task_id = responseData?.data?.task_id;

      if (!task_id) {
        console.error('Task ID not found in response:', responseData);
        throw new Error('No task ID returned from tagging request');
      }

      console.log(`Successfully retrieved task_id: ${task_id}`);

      let status = null;
      let taggedDocumentId = null;
      let attempts = 0;
      const MAX_ATTEMPTS = 300;
      const POLL_INTERVAL = 5000;

      const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || '';

      while ((status === null || status === 'PROCESSING') && attempts < MAX_ATTEMPTS) {
        attempts++;

        await new Promise(resolve => setTimeout(resolve, POLL_INTERVAL));

        const statusUrl = `${API_BASE_URL}/api/tag/status/${task_id}`;
        console.log(`[Attempt ${attempts}/${MAX_ATTEMPTS}] Polling status for task: ${task_id}`);

        let statusResponse;
        try {
          statusResponse = await fetch(statusUrl);
        } catch (fetchError) {
          console.error('Status check network error:', fetchError);
          await new Promise(resolve => setTimeout(resolve, POLL_INTERVAL));
          continue;
        }

        if (!statusResponse.ok) {
          const errorText = await statusResponse.text().catch(() => 'Unknown error');
          console.error('Status check failed:', errorText);

          if (attempts >= MAX_ATTEMPTS) {
            throw new Error(`Failed to retrieve tagging status after ${MAX_ATTEMPTS} attempts`);
          }

          await new Promise(resolve => setTimeout(resolve, POLL_INTERVAL * 2));
          continue;
        }

        let statusData;
        try {
          statusData = await statusResponse.json();
          console.log('Status response:', statusData);
        } catch (jsonError) {
          console.error('Failed to parse status response as JSON:', jsonError);
          continue;
        }

        status = statusData?.data?.status;
        taggedDocumentId = statusData?.data?.document_id;

        console.log(`Current status: ${status}, Document ID: ${taggedDocumentId}`);

        // Break out of the loop immediately if we have a definitive status
        if (status === 'COMPLETED' || status === 'FAILED') {
          console.log(`Breaking out of polling loop - status is: ${status}`);
          break;
        }
      }

      if (status === 'COMPLETED' && taggedDocumentId) {
        try {
          const resultData = await fetchTaggingResults(taggedDocumentId);

          await updateSessionStatus(SESSION_THREAD_STATUS.TAGGING_COMPLETE);
          setTaggingData(resultData);
          setProcessingState(prev => ({ ...prev, tagged: true }));
          setActiveStep('tagged');

          setMessages(prevMessages =>
            prevMessages.map(msg => {
              if (msg.role === 'assistant' && msg.isJson) {
                return {
                  ...msg,
                  content: JSON.stringify(resultData, null, 2),
                  processingStatus: undefined,
                };
              }
              return msg;
            })
          );

          toast({
            title: 'Tagging Complete',
            description: 'Data tagging finished successfully',
            variant: 'default',
          });
        } catch (resultError) {
          console.error('Error fetching result data:', resultError);
          throw resultError;
        }
      } else if (status === 'FAILED') {
        throw new Error('Tagging process failed on server');
      } else if (attempts >= MAX_ATTEMPTS) {
        throw new Error(`Tagging process timed out after ${MAX_ATTEMPTS} attempts`);
      }

    } catch (err) {
      await updateSessionStatus(SESSION_THREAD_STATUS.TAGGING_FAILED);
      console.error('Tagging error:', err);

      toast({
        title: 'Tagging Failed',
        description: err instanceof Error ? err.message : 'Failed to complete tagging',
        variant: 'destructive',
        duration: 6000,
      });

      setMessages(prev => prev.map(msg =>
        msg.role === 'assistant' && msg.isJson && msg.processingStatus
          ? { ...msg, processingStatus: undefined }
          : msg
      )
      );
    } finally {
      setTaggingLoading(false);
    }
  };

  const handleOutput = () => {
    if (!taggingData) {
      toast({
        title: 'No Tagged Data',
        description: 'Please complete tagging first',
        variant: 'destructive',
      });
      return;
    }

    setOutputData(taggingData);
    setActiveStep('output');

    setMessages(prevMessages =>
      prevMessages.map(msg => {
        if (msg.role === 'assistant' && msg.isJson) {
          return {
            ...msg,
            content: JSON.stringify(taggingData, null, 2),
          };
        }
        return msg;
      })
    );

    toast({
      title: 'Output Generated',
      description: 'Final output is ready for download',
      variant: 'default',
    });

    const jsonString = JSON.stringify(taggingData, null, 2);
    const blob = new Blob([jsonString], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `xbrl-output-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const removeFile = (fileToRemove: FileData) => {
    setFiles(prev => prev.filter(file => file.name !== fileToRemove.name));

    if (files.length <= 1) {
      setExtractionComplete(false);
      setProcessingState({
        extracted: false,
        mapped: false,
        validated: false,
        tagged: false
      });
      setExtractedData(null);
      setMappedData([]);
      setValidatedData(null);
      setTaggingData(null);
      setOutputData(null);
      setCurrentDocumentId(null);
      setMessages([]);
      setActiveStep(null);
    }
  };

  const handleDataUpdate = (index: number, newData: any) => {
    if (activeStep === 'extracted') setExtractedData(newData);
    else if (activeStep === 'mapped') setMappedData(Array.isArray(newData) ? newData : [newData]);
    else if (activeStep === 'validated') setValidatedData(newData);
    else if (activeStep === 'tagged') setTaggingData(newData);
    else if (activeStep === 'output') setOutputData(newData);

    setMessages(prev => prev.map((msg, i) =>
      i === index ? {
        ...msg,
        content: JSON.stringify(newData, null, 2),
        jsonData: newData
      } : msg
    ));
  };

  const clearError = () => {
    setError(null);
  };

  const validateForm = () => {
    const errors: FormErrors = {};
    if (files.length === 0) {
      errors.file = 'Please upload a PDF file';
    }
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const getNodeDescription = (nodeName: string | number) => {
    const descriptions: Record<string, string> = {
      start: 'Initializing process...',
      parse_input: 'Understanding your question...',
      retrieveDocuments: 'Searching through documents...',
      generate_answer: 'Generating response...',
      format_response: 'Formatting final answer...',
    };
    return descriptions[String(nodeName)] || `Processing ${nodeName}...`;
  };

  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  useEffect(() => {
    if (isLoading && startTime) {
      timerRef.current = setInterval(() => {
        setElapsedTime(Math.floor((Date.now() - startTime) / 1000));
      }, 1000);
    } else {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
      setElapsedTime(0);
    }
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [isLoading, startTime]);

  useEffect(() => {
    return () => {
      if (extractionPollTimer) {
        clearInterval(extractionPollTimer);
      }
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [extractionPollTimer]);

  const handleCancelRequest = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }

    if (extractionPollTimer) {
      clearInterval(extractionPollTimer);
      setExtractionPollTimer(null);
    }

    setIsLoading(false);
    setMessages(prev => prev.filter(msg => !msg.processingStatus));
    setGraphProgress(0);
    setCurrentStep('');
    setCompletedSteps(0);
    setTotalSteps(0);
    setElapsedTime(0);
    setStartTime(null);

    toast({
      title: 'Extraction canceled',
      description: 'Document extraction has been canceled',
      variant: 'default',
    });
  };

  const handleMapping = async () => {
    if (!sessionId) {
      const newSessionId = await createSession();
      if (!newSessionId) {
        toast({
          title: 'Error',
          description: 'No active session found. Please try again.',
          variant: 'destructive',
        });
        return;
      }
    }

    await updateSessionStatus(SESSION_THREAD_STATUS.MAPPING);

    try {
      setMappingLoading(true);

      setMessages(prev => prev.map(msg =>
        msg.role === 'assistant' && msg.isJson
          ? { ...msg, processingStatus: 'Mapping financial data according to the ACRA Taxonomy...' }
          : msg
      ));

      const requestId = crypto.randomUUID();
      const url = new URL(`${API_BASE_URL}/api/map`, window.location.origin);

      if (threadId) url.searchParams.append('threadId', threadId);

      const response = await fetch(url.toString(), {
        method: 'GET',
      });

      console.log("Mapped Data", response)

      // Handle non-200 status codes
      if (!response.ok) {
        let errorData;
        try {
          // Try to parse error response as JSON
          errorData = await response.json();

          // Check if the error response contains toast notification data
          if (errorData.showToast) {
            // Use the toast data from the API response
            toast({
              title: errorData.toastTitle || 'Error',
              description: errorData.toastMessage || errorData.message || 'Failed to start mapping process',
              variant: errorData.toastType === 'error' ? 'destructive' : 'default',
            });

            // Update session status
            await updateSessionStatus(SESSION_THREAD_STATUS.MAPPING_FAILED);

            // Update messages to remove the processing status
            setMessages(prev => prev.map(msg =>
              msg.role === 'assistant' && msg.isJson
                ? { ...msg, processingStatus: undefined }
                : msg
            ));

            return;
          }
        } catch (parseError) {
          // If response is not valid JSON, use standard error handling
          await handleApiError(response, 'Failed to start mapping process');
          return;
        }

        // If no toast data but we have an error, use standard error handling
        await handleApiError(response, errorData?.message || 'Failed to start mapping process');
        return;
      }

      // Parse successful response
      const data = await response.json();

      // Handle API response with toast notification data
      if (data.showToast) {
        toast({
          title: data.toastTitle || 'Notification',
          description: data.toastMessage || data.message || '',
          variant: data.toastType === 'error' ? 'destructive' : 'default',
        });

        // If it's an error with toast, handle it and return
        if (!data.success) {
          await updateSessionStatus(SESSION_THREAD_STATUS.MAPPING_FAILED);

          setMessages(prev => prev.map(msg =>
            msg.role === 'assistant' && msg.isJson
              ? { ...msg, processingStatus: undefined }
              : msg
          ));

          return;
        }
      }

      if (!data) {
        throw new Error('Invalid response from mapping endpoint');
      }

      if (data.data?.status === 'processing') {
        toast({
          title: 'Mapping Started',
          description: 'Data mapping is in progress...',
          variant: 'default',
        });
        return;
      }

      if (data.success && data.data) {
        await updateSessionStatus(SESSION_THREAD_STATUS.MAPPING_COMPLETE);

        setMappedData(data.data);

        if (!extractedData && processingState.extracted) {
          const extractedFromMessages = messages.find(m => m.role === 'assistant' && m.isJson);
          if (extractedFromMessages) {
            try {
              const parsed = JSON.parse(extractedFromMessages.content);
              setExtractedData(parsed);
            } catch (e) {
              console.error("Failed to parse extracted data", e);
            }
          }
        }

        if (data.data?.id) {
          setCurrentDocumentId(data.data.id);
        }
        setProcessingState(prev => ({ ...prev, mapped: true }));
        setActiveStep('mapped');

        if (!data.showToast) {
          toast({
            title: 'Mapping Completed',
            description: 'Data mapping finished successfully',
            variant: 'default',
          });
        }

        setMessages(prevMessages =>
          prevMessages.map(msg => {
            if (msg.role === 'assistant' && msg.isJson) {
              return {
                ...msg,
                content: JSON.stringify(data.data, null, 2),
                processingStatus: undefined,
                isJson: true,
              };
            }
            return msg;
          })
        );
      }
    } catch (err: any) {
      await updateSessionStatus(SESSION_THREAD_STATUS.MAPPING_FAILED);
      console.error('Mapping error:', err);

      setMessages(prev => prev.map(msg =>
        msg.role === 'assistant' && msg.isJson
          ? { ...msg, processingStatus: undefined }
          : msg
      ));

      toast({
        title: 'Mapping Failed',
        description: err instanceof Error ? err.message : 'Failed to complete mapping',
        variant: 'destructive',
      });
    } finally {
      setMappingLoading(false);
    }
  };

  const handleFileUpload = async (e: ChangeEvent<HTMLInputElement>) => {
    const newSessionId = await createSession();
    if (!newSessionId) {
      toast({
        title: 'Session Error',
        description: 'Failed to create session. Please try again.',
        variant: 'destructive',
      });
      return;
    }

    const selectedFiles = Array.from(e.target.files || []);
    if (!selectedFiles.length) return;

    if (selectedFiles.length > 1) {
      toast({
        title: 'Only one PDF allowed',
        description: 'Please select only one PDF file. Only one document can be processed at a time.',
        variant: 'destructive',
      });
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    const file = selectedFiles[0];
    if (file.size > MAX_FILE_SIZE) {
      toast({
        title: 'File too large',
        description: 'Maximum file size is 50MB',
        variant: 'destructive',
      });
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }
    if (file.type !== 'application/pdf') {
      toast({
        title: 'Invalid file type',
        description: 'Please upload a PDF file only',
        variant: 'destructive',
      });
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    setIsUploading(true);
    setError(null);
    const formData = new FormData();
    formData.append('files', file);

    if (threadId) {
      formData.append('threadId', threadId);
    }

    if (sessionId) {
      formData.append('sessionId', sessionId);
    }

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000);

      const response = await fetch(`${API_BASE_URL}/api/ingest`, {
        method: 'POST',
        body: formData,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        await handleApiError(response, 'Failed to upload file');
      }

      const responseData = await response.json();

      const responseSessionId = responseData.session_id || sessionId;
      const newThreadId = responseData.thread_id || threadId;

      if (responseSessionId) setSessionId(responseSessionId);
      if (newThreadId) setThreadId(newThreadId);
      setCurrentDocumentId(responseData.document_id);

      if (responseSessionId) {
        await updateSessionStatus(SESSION_THREAD_STATUS.UPLOAD_COMPLETE);
      }

      try {
        const bytes = new Uint8Array(await file.arrayBuffer());
        setFiles([{
          name: file.name,
          size: file.size,
          lastModified: file.lastModified,
          webkitRelativePath: file.webkitRelativePath,
          type: file.type,
          bytes,
        }]);
      } catch (fileError) {
        console.error('Error processing file buffer:', fileError);
        setFiles([{
          name: file.name,
          size: file.size,
          lastModified: file.lastModified,
          webkitRelativePath: file.webkitRelativePath,
          type: file.type,
          bytes: new Uint8Array(),
        }]);
      }

      toast({
        title: 'Success',
        description: 'File uploaded successfully',
        variant: 'default',
      });
    } catch (err: any) {
      console.error('Error uploading file:', err);

      if (err.name === 'AbortError') {
        setError('File upload timed out. Please try again with a smaller file or check your connection.');
        toast({
          title: 'Upload timed out',
          description: 'The upload took too long. Please try again.',
          variant: 'destructive',
        });
      } else {
        setError(`File upload failed: ${err instanceof Error ? err.message : 'Unknown error'}`);
        toast({
          title: 'Upload failed',
          description: 'Failed to upload file. Please try again.',
          variant: 'destructive',
        });
      }
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleFormSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setSubmissionAttempted(true);

    if (!validateForm()) {
      return;
    }

    if (!files.length) {
      toast({
        title: 'Missing File',
        description: 'Please upload a PDF file first',
        variant: 'destructive',
      });
      return;
    }

    if (!threadId) {
      toast({
        title: 'Session not ready',
        description: 'Please wait for the session to initialize',
        variant: 'destructive',
      });
      return;
    }

    if (!sessionId) {
      const newSessionId = await createSession();
      if (!newSessionId) {
        return;
      }
    }

    setIsLoading(true);
    setError(null);
    setStartTime(Date.now());
    setGraphProgress(0);
    setCurrentStep('');
    setTotalSteps(0);
    setCompletedSteps(0);
    setMessages([{
      role: 'assistant',
      content: '',
      processingStatus: 'Processing XBRL filing...',
      hideFromChat: false,
    }]);

    await updateSessionStatus(SESSION_THREAD_STATUS.EXTRACTING);

    const abortController = new AbortController();
    abortControllerRef.current = abortController;

    try {
      const response = await fetch(`${API_BASE_URL}/api/chat`, {
        method: 'POST',
        body: JSON.stringify({
          message: "Extract all data and map it to this zod schema " + partialXBRLMessage,
          threadId: threadId,
          sessionId: sessionId,
        }),
        signal: abortController.signal,
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      if (!response.body) {
        throw new Error('No response body available');
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let finalContent = '';
      let retrievedDocs: PDFDocument[] = [];
      let isJsonResponse = false;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        try {
          const chunkStr = decoder.decode(value);
          const lines = chunkStr.split('\n').filter(Boolean);

          for (const line of lines) {
            if (!line.startsWith('data: ')) continue;
            const sseString = line.slice('data: '.length);
            let sseEvent: any;

            try {
              sseEvent = JSON.parse(sseString);
            } catch (err) {
              console.error('Error parsing SSE line:', err, line);
              continue;
            }

            const { event, data } = sseEvent;

            if (event === 'messages/complete') {
              if (Array.isArray(data) && data.length > 0) {
                const lastObj = data[data.length - 1];
                if (lastObj?.content) {
                  finalContent = typeof lastObj.content === 'string'
                    ? lastObj.content
                    : JSON.stringify(lastObj.content);
                  isJsonResponse = typeof lastObj.content !== 'string';
                }
              }
              await updateSessionStatus(SESSION_THREAD_STATUS.EXTRACTING_COMPLETE);
            } else if (event === 'updates' && data) {
              if (data.retrieveDocuments?.documents) {
                retrievedDocs = data.retrieveDocuments.documents;
              }
              if (data.graph_status) {
                setCurrentStep(getNodeDescription(data.graph_status.current_node));
                setTotalSteps(data.graph_status.total_steps || 0);
                setCompletedSteps(
                  (data.graph_status.total_steps || 0) - (data.graph_status.steps_remaining || 0)
                );
                const progress = data.graph_status.total_steps
                  ? Math.floor(((data.graph_status.total_steps - data.graph_status.steps_remaining) / data.graph_status.total_steps) * 100)
                  : 0;
                setGraphProgress(progress);
              }
            }
          }
        } catch (chunkError) {
          console.error('Error processing chunk:', chunkError);
          await updateSessionStatus(SESSION_THREAD_STATUS.EXTRACTING_FAILED);
        }
      }

      let parsedData;
      try {
        parsedData = finalContent ? JSON.parse(finalContent) : null;
        isJsonResponse = true;
      } catch (err) {
        parsedData = null;
        isJsonResponse = false;
        console.log('Content is not valid JSON, treating as text:', err);
      }

      setMessages([{
        role: 'assistant',
        content: finalContent,
        sources: retrievedDocs,
        isJson: isJsonResponse,
        hideFromChat: false,
      }]);

      if (parsedData) {
        const saveResponse = await fetch(`${API_BASE_URL}/api/extract`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            threadId,
            data: parsedData,
          }),
        });

        if (!saveResponse.ok) {
          const responseData = await saveResponse.json().catch(() => ({ error: 'Unknown error' }));
          console.error('Save error details:', responseData);
          throw new Error(responseData.error || responseData.details || 'Data persistence failed');
        }

        if (!sessionId) {
          toast({
            title: 'Error',
            description: 'No active session found. Please try again.',
            variant: 'destructive',
          });
          return;
        }
        await updateSessionStatus(SESSION_THREAD_STATUS.EXTRACTING_COMPLETE);

        toast({
          title: 'Success!',
          description: 'Data extracted and saved successfully',
        });

        setExtractionComplete(true);
      } else {
        throw new Error('Failed to parse response data as JSON');
      }
    } catch (err: any) {
      if (err instanceof DOMException && err.name === 'AbortError') {
        console.log('Request aborted');
        return;
      }
      console.error('Error:', err);

      setMessages([{
        role: 'assistant',
        content: 'An error occurred during processing. Please try again.',
        hideFromChat: false,
      }]);

      toast({
        title: 'Processing Failed',
        description: err instanceof Error ? err.message : 'Unknown error occurred',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
      setStartTime(null);
      abortControllerRef.current = null;
    }
  };

  const handleRemoveFile = async (fileToRemove: FileData) => {
    try {
      removeFile(fileToRemove);
      toast({
        title: 'File removed',
        description: `${fileToRemove.name} has been removed`,
        variant: 'default',
      });
    } catch (err) {
      console.error('Error removing file:', err);
      toast({
        title: 'Error',
        description: 'Failed to remove file. The file will still be used for chat context.',
        variant: 'destructive',
      });
    }
  };

  const getVisualizerTitle = (step: ActiveStep): string => {
    switch (step) {
      case 'extracted':
        return 'Extracted Data';
      case 'mapped':
        return 'Mapped Financial Data';
      case 'validated':
        return 'Validated Data';
      case 'tagged':
        return 'Tagged XBRL Data';
      case 'output':
        return 'Final Output';
      default:
        return 'Document Data';
    }
  };

  return (
    <div className="flex flex-col h-screen">
      <ErrorDisplay error={error} clearError={clearError} />

      {isThreadInitializing && (
        <div className="w-full flex justify-center py-6 mb-4">
          <div className="flex items-center gap-3 px-6 py-3 bg-blue-50 dark:bg-blue-900/20 rounded-full shadow-sm border border-blue-100 dark:border-blue-800">
            <Loader2 className="h-5 w-5 animate-spin text-blue-600 dark:text-blue-400" />
            <span className="text-blue-700 dark:text-blue-300 font-medium">
              Initializing chat thread...
            </span>
          </div>
        </div>
      )}

      <div className="flex flex-1 overflow-hidden">
        <LeftSidebar
          sidebarCollapsed={sidebarCollapsed}
          setSidebarCollapsed={setSidebarCollapsed}
          files={files}
          removeFile={removeFile}
        />

        <div className="flex flex-col flex-1 overflow-hidden">
          {/* Header */}
          <header className="border-b border-gray-200 dark:border-gray-700 py-4 px-6 flex justify-between items-center bg-white dark:bg-gray-800 shadow-sm">
            <h1 className="text-xl font-semibold text-gray-800 dark:text-gray-200">XBRL Document Processor</h1>

            <div className="flex gap-2">
              {files.length > 0 && !processingState.extracted && !isLoading && (
                <button
                  onClick={handleFormSubmit}
                  disabled={isThreadInitializing}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <FileText className="h-4 w-4" /> Extract Data
                </button>
              )}

              {isLoading && (
                <button
                  disabled
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-md font-medium opacity-70 cursor-not-allowed"
                >
                  <Loader2 className="h-4 w-4 animate-spin" /> Extracting...
                </button>
              )}

              {processingState.extracted && !processingState.mapped && (
                <MappingButton onClick={handleMapping} isLoading={mappingLoading} />
              )}

              {processingState.mapped && !processingState.validated && (
                <ValidationButton onClick={handleValidation} isLoading={validationLoading} />
              )}

              {processingState.validated && !processingState.tagged && (
                <TaggingButton onClick={handleTagging} isLoading={taggingLoading} />
              )}

              {processingState.tagged && (
                <OutputButton
                  onClick={handleOutput}
                  isLoading={false}
                  disabled={!taggingData}
                />
              )}
            </div>
          </header>

          {files.length > 0 && (
            <WorkflowProgress
              processingState={processingState}
              isLoading={isLoading}
              mappingLoading={mappingLoading}
              validationLoading={validationLoading}
              taggingLoading={taggingLoading}
            />
          )}

          <main className="flex-1 overflow-y-auto px-4 md:px-6 lg:px-8 py-6">
            {validationErrors && (
              <ValidationErrorDisplay
                validationErrors={validationErrors}
                onDismiss={clearValidationErrors}
              />
            )}

            {messages.length === 0 ? (
              <UploadForm
                files={files}
                isUploading={isUploading}
                formErrors={formErrors}
                submissionAttempted={submissionAttempted}
                handleFileUpload={handleFileUpload}
                handleFormSubmit={handleFormSubmit}
                fileInputRef={fileInputRef}
              />
            ) : (
              <div className="w-full mx-auto space-y-8">
                {messages.filter(msg => !msg.hideFromChat).map((message, i) => (
                  <div key={i}>
                    {message.role === 'assistant' && !message.content && message.processingStatus ? (
                      <ProcessingStatusIndicator
                        currentStep={currentStep}
                        handleCancelRequest={handleCancelRequest}
                      />
                    ) : message.isJson ? (
                      <div className="chat-message group transition-all">
                        <div className={`${message.role === 'assistant' ? 'justify-start' : 'justify-end'}`}>
                          <div className={`rounded-lg w-full p-12 shadow-sm ${message.role === 'assistant'
                            ? 'bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700'
                            : 'bg-blue-600 text-white'}`}>
                            <div className="overflow-x-auto">
                              {message.processingStatus ? (
                                <div className="flex items-center gap-2 text-gray-500">
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                  <span>{message.processingStatus}</span>
                                </div>
                              ) : (
                                <EditableDataVisualizer
                                  data={JSON.parse(message.content)}
                                  // title={getVisualizerTitle(activeStep)}
                                  uuid={currentDocumentId || ''}
                                  threadId={threadId || ''}
                                  pdfId={files[0]?.name || ''}
                                  onDataUpdate={(newData) => handleDataUpdate(i, newData)}
                                  viewType={viewType}
                                  initialView={viewType}
                                  activeStep={activeStep}
                                />
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <ChatMessage
                        message={message}
                      />
                    )}
                  </div>
                ))}
                <div ref={messagesEndRef} className="h-1" />
              </div>
            )}
          </main>

          <footer className="sticky bottom-0 z-10 border-t border-gray-200 dark:border-gray-700 bg-white/90 dark:bg-gray-800/90 backdrop-blur-md py-3">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              {files.length > 0 && (
                <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-300 dark:border-gray-600 shadow-md">
                  <div className="flex justify-between items-center mb-2 px-1">
                    <p className="text-lg font-medium text-gray-600 dark:text-gray-400">Uploaded Documents</p>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                    {files.map((file, index) => (
                      <FilePreview
                        key={`${file.name}-${index}`}
                        file={file}
                        onRemove={() => handleRemoveFile(file)}
                      />
                    ))}
                  </div>
                </div>
              )}
            </div>
          </footer>
        </div>
      </div>
    </div>
  );
}