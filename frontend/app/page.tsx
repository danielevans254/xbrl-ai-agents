'use client';

import { useToast } from '@/hooks/use-toast';
import { useRef, useState, useEffect, FormEvent, ChangeEvent } from 'react';
import { client } from '@/lib/langgraph-client';
import { PDFDocument } from '@/types/graphTypes';
import { partialXBRLMessage } from '@/constants/prompts/partial-xbrl';
import { Loader2 } from 'lucide-react';
import { ErrorDisplay } from '@/components/home/error-display';
import { ViewSelector } from '@/components/home/view-selector';
import { UploadForm } from '@/components/home/upload-form';
import { ChatMessage } from '@/components/chat-message';
import { FilePreview } from '@/components/file-preview';
import { ProcessingStatusIndicator } from '@/components/home/processing-status';
import { InteractiveStepLoader } from '@/components/home/interactive-step-loader';
import JsonViewer from '@/components/json-viewer';
import { LeftSidebar } from '@/components/home/left-sidebar';
import { MappingButton } from '@/components/home/mapping/button';
import { ValidationButton } from '@/components/home/validation/button';
import { OutputButton } from '@/components/home/output/button';
import { TaggingButton } from '@/components/home/tagging/button';

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

const MAX_FILE_SIZE = 50 * 1024 * 1024;
const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || '';

export default function Home() {
  const { toast } = useToast();
  const [viewType, setViewType] = useState<'json' | 'table' | 'card'>('table');
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
  const [mappedData, setMappedData] = useState<any[]>([]);
  const [processingState, setProcessingState] = useState<ProcessingState>({
    extracted: false,
    mapped: false,
    validated: false,
    tagged: false
  });
  const [validatedData, setValidatedData] = useState<any>(null);
  const [validationLoading, setValidationLoading] = useState(false);
  const [taggingData, setTaggingData] = useState<any>(null);
  const [taggingLoading, setTaggingLoading] = useState(false);
  const [outputData, setOutputData] = useState<any>(null);
  const [currentDocumentId, setCurrentDocumentId] = useState<string | null>(null);

  useEffect(() => {
    if (extractionComplete) {
      setProcessingState(prev => ({ ...prev, extracted: true }));
    }
  }, [extractionComplete]);

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

  const handleValidation = async () => {
    if (!currentDocumentId) {
      toast({
        title: 'Error',
        description: 'No document ID found for validation',
        variant: 'destructive',
      });
      return;
    }

    try {
      setValidationLoading(true);
      setMessages(prev =>
        prev.map(msg =>
          msg.role === 'assistant' && msg.isJson
            ? { ...msg, processingStatus: 'Validating mapped data...' }
            : msg
        )
      );

      const requestId = crypto.randomUUID();
      const response = await fetch(`${API_BASE_URL}/api/validate?documentId=${encodeURIComponent(currentDocumentId)}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'X-Request-ID': requestId,
        },
      });

      const responseData = await response.json();
      console.log(responseData, "Validation Response Data");

      if (!response.ok) {
        if (responseData && responseData.validation_errors) {
          const errorMessages = formatValidationErrors(responseData.validation_errors);
          throw new Error(errorMessages);
        } else {
          await handleApiError(response, 'Failed to validate data');
          return;
        }
      }

      if (!responseData || !responseData.data) {
        throw new Error('Invalid response data received from validation endpoint');
      }

      if (responseData.validation_status === 'error' && responseData.is_valid === false) {
        const errorMessages = formatValidationErrors(responseData.validation_errors);
        throw new Error(`Validation failed: ${errorMessages}`);
      }

      setValidatedData(responseData.data);
      setProcessingState(prev => ({ ...prev, validated: true }));

      setMessages(prevMessages => [
        ...prevMessages,
        {
          role: 'assistant',
          content: JSON.stringify(responseData.data, null, 2),
          isJson: true,
          processingStatus: undefined,
          hideFromChat: false,
        }
      ]);

      toast({
        title: 'Validation Complete',
        description: 'Data validation finished successfully',
        variant: 'default',
      });
    } catch (err: any) {
      console.error('Validation error:', err);

      toast({
        title: 'Validation Failed',
        description: err instanceof Error ? err.message : 'Failed to complete validation',
        variant: 'destructive',
        duration: 8000,
      });

      // Clear processing status if validation fails
      setMessages(prev => prev.map(msg =>
        msg.role === 'assistant' && msg.isJson && msg.processingStatus
          ? { ...msg, processingStatus: undefined }
          : msg
      ));
    } finally {
      setValidationLoading(false);
    }
  };

  /**
   * Format validation errors into a readable string
   */
  const formatValidationErrors = (validationErrors: Record<string, string[]>): string => {
    if (!validationErrors || Object.keys(validationErrors).length === 0) {
      return 'Unknown validation error';
    }

    return Object.entries(validationErrors)
      .map(([section, errors]) => {
        const errorsList = errors.join('\n• ');
        return `${section} errors:\n• ${errorsList}`;
      })
      .join('\n\n');
  };

  const handleTagging = async () => {
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

      const tagUrl = new URL('/api/tag', window.location.origin);
      tagUrl.searchParams.append('documentId', currentDocumentId);

      const response = await fetch(tagUrl.toString(), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Request-ID': crypto.randomUUID(),
        },
        body: JSON.stringify({ data: validatedData }),
      });

      if (!response.ok) {
        await handleApiError(response, 'Tagging failed');
      }

      const result = await response.json();

      if (!result || !result.data) {
        throw new Error('Invalid response data received from tagging endpoint');
      }

      setTaggingData(result.data);
      setProcessingState(prev => ({ ...prev, tagged: true }));

      setMessages(prevMessages => [
        ...prevMessages,
        {
          role: 'assistant',
          content: JSON.stringify(result.data, null, 2),
          isJson: true,
          processingStatus: undefined,
          hideFromChat: false,
        }
      ]);

      toast({
        title: 'Tagging Complete',
        description: 'Data tagging finished successfully',
        variant: 'default',
      });
    } catch (err: any) {
      console.error('Tagging error:', err);
      toast({
        title: 'Tagging Failed',
        description:
          err instanceof Error ? err.message : 'Failed to complete tagging',
        variant: 'destructive',
      });

      setMessages(prev => prev.map(msg =>
        msg.role === 'assistant' && msg.isJson && msg.processingStatus
          ? { ...msg, processingStatus: undefined }
          : msg
      ));
    } finally {
      setTaggingLoading(false);
    }
  };

  const handleOutput = () => {
    if (!validatedData) {
      toast({
        title: 'No Tagged Data',
        description: 'Please complete tagging first',
        variant: 'destructive',
      });
      return;
    }

    setOutputData(taggingData);
    setMessages(prevMessages => [
      ...prevMessages,
      {
        role: 'assistant',
        content: JSON.stringify(taggingData, null, 2),
        isJson: true,
        processingStatus: undefined,
        hideFromChat: false,
      }
    ]);

    toast({
      title: 'Output Generated',
      description: 'Final output is ready',
      variant: 'default',
    });
  };

  const removeFile = (fileToRemove: FileData) => {
    setFiles(prev => prev.filter(file => file.name !== fileToRemove.name));

    // Reset related states when removing a file
    if (files.length <= 1) {
      setExtractionComplete(false);
      setProcessingState({
        extracted: false,
        mapped: false,
        validated: false,
        tagged: false
      });
      setMappedData([]);
      setValidatedData(null);
      setTaggingData(null);
      setOutputData(null);
      setCurrentDocumentId(null);
    }
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
  }, [threadId, toast]);

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
    if (!threadId) {
      toast({
        title: 'Error',
        description: 'No active thread found. Please try again.',
        variant: 'destructive',
      });
      return;
    }

    try {
      setMappingLoading(true);

      setMessages(prev => prev.map(msg =>
        msg.role === 'assistant' && msg.isJson
          ? { ...msg, processingStatus: 'Mapping financial data...' }
          : msg
      ));

      const requestId = crypto.randomUUID();
      const response = await fetch(`${API_BASE_URL}/api/map?threadId=${encodeURIComponent(threadId)}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'X-Request-ID': requestId,
        },
        // signal: AbortSignal.timeout(60000),
      });

      if (!response.ok) {
        await handleApiError(response, 'Failed to start mapping process');
        return;
      }

      const data = await response.json();

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
        setMappedData(Array.isArray(data.data) ? data.data : [data.data]);

        if (data.data?.id) {
          setCurrentDocumentId(data.data.id);
        }

        setProcessingState(prev => ({ ...prev, mapped: true }));

        toast({
          title: 'Mapping Completed',
          description: 'Data mapping finished successfully',
          variant: 'default',
        });

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

      await response.json();

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
        title: 'Thread not ready',
        description: 'Please wait for the chat thread to initialize',
        variant: 'destructive',
      });
      return;
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

    const abortController = new AbortController();
    abortControllerRef.current = abortController;

    try {
      const response = await fetch(`${API_BASE_URL}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: "Extract all data and map it to this zod schema " + partialXBRLMessage,
          threadId: threadId,
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
        }
      }

      // Parse JSON safely before setting messages
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

        const responseData = await saveResponse.json();

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

      {/* Main layout with Sidebar and Content */}
      <div className="flex flex-1 overflow-hidden">
        <LeftSidebar
          sidebarCollapsed={sidebarCollapsed}
          setSidebarCollapsed={setSidebarCollapsed}
          files={files}
          removeFile={removeFile}
        />

        <div className="flex flex-col flex-1 overflow-hidden">
          {/* Header */}
          <header className="p-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
            <ViewSelector viewType={viewType} setViewType={setViewType} className="flex-shrink-0" />
            {/* <InteractiveStepLoader /> */}

            <div className="flex gap-2">
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

          {/* Content */}
          <main className="flex-1 overflow-y-auto pb-24 px-4 md:px-8">
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
              <div className="space-y-6">
                {messages.filter(msg => !msg.hideFromChat).map((message, i) => (
                  <div key={i}>
                    {message.role === 'assistant' && !message.content && message.processingStatus ? (
                      <ProcessingStatusIndicator
                        currentStep={currentStep}
                        handleCancelRequest={handleCancelRequest}
                      />
                    ) : message.isJson ? (
                      <div className="chat-message group transition-all">
                        <div className={`flex items-start gap-4 ${message.role === 'assistant' ? 'justify-start' : 'justify-end'}`}>
                          {message.role === 'assistant' && (
                            <div className="flex h-10 w-10 shrink-0 select-none items-center justify-center rounded-full bg-blue-600 text-white">
                              <span className="text-sm font-medium">AI</span>
                            </div>
                          )}
                          <div className={`rounded-lg p-5 max-w-prose w-full shadow-sm ${message.role === 'assistant'
                            ? 'bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700'
                            : 'bg-blue-600 text-white'}`}>
                            <div className="overflow-x-auto">
                              {message.processingStatus ? (
                                <div className="flex items-center gap-2 text-gray-500">
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                  <span>{message.processingStatus}</span>
                                </div>
                              ) : (
                                <JsonViewer
                                  data={JSON.parse(message.content)}
                                  initialExpanded={true}
                                  maxInitialDepth={2}
                                />
                              )}
                            </div>
                          </div>
                          {message.role === 'user' && (
                            <div className="flex h-10 w-10 shrink-0 select-none items-center justify-center rounded-full bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300">
                              <span className="text-sm font-medium">You</span>
                            </div>
                          )}
                        </div>
                      </div>
                    ) : (
                      <ChatMessage
                        message={message}
                        viewType={viewType}
                      />
                    )}
                  </div>
                ))}
                <div ref={messagesEndRef} className="h-1" />
              </div>
            )}
          </main>

          {/* Footer: Fixed File Preview Bar */}
          <footer className="border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800/90 backdrop-blur-md py-4">
            <div className="max-w-5xl mx-auto px-4">
              {files.length > 0 && (
                <div className="bg-gray-50 dark:bg-gray-900/50 rounded-lg p-3 border border-gray-200 dark:border-gray-700">
                  <div className="flex justify-between items-center mb-2 px-1">
                    <p className="text-xs font-medium text-gray-600 dark:text-gray-400">Uploaded Documents</p>
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