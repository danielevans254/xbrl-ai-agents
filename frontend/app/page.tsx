'use client';

import { useToast } from '@/hooks/use-toast';
import JsonViewer from '@/components/json-viewer';
import { useRef, useState, useEffect } from 'react';
import { ChatMessage } from '@/components/chat-message';
import { FilePreview } from '@/components/file-preview';
import { client } from '@/lib/langgraph-client';
import {
  PDFDocument,
} from '@/types/graphTypes';
import { partialXBRLMessage } from '@/constants/prompts/partial-xbrl';

import { ErrorDisplay } from '@/components/home/error-display';
import { ViewSelector } from '@/components/home/view-selector';
import { UploadForm } from '@/components/home/upload-form';
import { ProcessingStatusIndicator } from '@/components/home/processing-status';
import { Loader2 } from 'lucide-react';
import { InteractiveStepLoader } from '@/components/home/interactive-step-loader';
import { LeftSidebar } from '@/components/home/left-sidebar';
import { MappingButton } from '@/components/home/mapping/button';

interface FileData {
  name: string;
  size: number;
  lastModified: number;
  webkitRelativePath: string;
  type: string;
  bytes: Uint8Array;
}

export default function Home() {
  const { toast } = useToast();
  const [viewType, setViewType] = useState<'json' | 'table' | 'card'>('json');
  const [messages, setMessages] = useState<
    Array<{
      role: 'user' | 'assistant';
      content: string;
      sources?: PDFDocument[];
      processingStatus?: string;
      isJson?: boolean;
      hideFromChat?: boolean;
    }>
  >([]);
  const [files, setFiles] = useState<FileData[]>([]);

  const removeFile = (fileToRemove: FileData) => {
    setFiles(prevFiles => prevFiles.filter(file => file.name !== fileToRemove.name));
  };
  const [isUploading, setIsUploading] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [threadId, setThreadId] = useState<string | null>(null);
  const [startTime, setStartTime] = useState<number | null>(null);
  const [elapsedTime, setElapsedTime] = useState<number>(0);
  const [error, setError] = useState<string | null>(null);
  const [isThreadInitializing, setIsThreadInitializing] = useState(true);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const [graphProgress, setGraphProgress] = useState(0);
  const [currentStep, setCurrentStep] = useState('');
  const [totalSteps, setTotalSteps] = useState(0);
  const [completedSteps, setCompletedSteps] = useState(0);
  const [extractionPollTimer, setExtractionPollTimer] = useState<NodeJS.Timeout | null>(null);
  const [formErrors, setFormErrors] = useState<FormErrors>({});
  const [submissionAttempted, setSubmissionAttempted] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [extractionComplete, setExtractionComplete] = useState(false);
  const [mappingLoading, setMappingLoading] = useState(false);


  const MAX_FILE_SIZE = 50 * 1024 * 1024;

  interface FormErrors {
    file?: string;
  }

  useEffect(() => {
    const initThread = async () => {
      if (threadId) return;

      try {
        setIsThreadInitializing(true);
        const thread = await client.createThread();
        setThreadId(thread.thread_id);
        setError(null);
      } catch (error) {
        console.error('Error creating thread:', error);
        setError('Failed to initialize chat thread. Please refresh the page or check your connection.');
        toast({
          title: 'Error Initializing',
          description:
            'Error creating thread. Please make sure you have set the LANGGRAPH_API_URL environment variable correctly. ' +
            error,
          variant: 'destructive',
        });
      } finally {
        setIsThreadInitializing(false);
      }
    };
    initThread();
  }, [threadId, toast]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    if (isLoading && startTime) {
      timerRef.current = setInterval(() => {
        const now = Date.now();
        setElapsedTime(Math.floor((now - startTime) / 1000));
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

  const validateForm = () => {
    const errors: FormErrors = {};

    if (files.length === 0) {
      errors.file = 'Please upload a PDF file';
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const getNodeDescription = (nodeName: string | number) => {
    const nodeDescriptions = {
      'start': 'Initializing process...',
      'parse_input': 'Understanding your question...',
      'retrieveDocuments': 'Searching through documents...',
      'generate_answer': 'Generating response...',
      'format_response': 'Formatting final answer...'
    };

    return nodeDescriptions[nodeName as keyof typeof nodeDescriptions] || `Processing ${nodeName}...`;
  };

  const handleCancelRequest = () => {
    // Clear the polling timer
    if (extractionPollTimer) {
      clearInterval(extractionPollTimer);
      setExtractionPollTimer(null);
    }

    setMessages(prevMessages => prevMessages.filter(msg => !msg.processingStatus));

    setGraphProgress(0);
    setCurrentStep('');
    setCompletedSteps(0);
    setTotalSteps(0);
    setElapsedTime(0);

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
      setIsLoading(true);

      const response = await fetch(`/api/map?threadId=${threadId}`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
      });

      if (!response.ok) {
        throw new Error(`Failed to start mapping process: ${response.statusText}`);
      }

      const data = await response.json();

      toast({
        title: 'Mapping Started',
        description: 'The mapping process has been initiated successfully.',
        variant: 'default',
      });

      // Here you can add code to handle the response data if needed
      console.log('Mapping response:', data);

    } catch (error) {
      console.error('Mapping error:', error);
      toast({
        title: 'Mapping Failed',
        description: error instanceof Error ? error.message : 'Failed to initiate mapping process',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Add this effect to track elapsed time
  useEffect(() => {
    let timer: NodeJS.Timeout | null = null;

    // Start the timer when processing begins
    if (messages.some(msg => msg.processingStatus)) {
      timer = setInterval(() => {
        setElapsedTime(prev => prev + 1);
      }, 1000);
    } else {
      setElapsedTime(0);
    }

    return () => {
      if (timer) clearInterval(timer);
    };
  }, [messages]);

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmissionAttempted(true);

    if (!files.length) {
      toast({
        title: 'Missing File',
        description: 'Please upload a PDF file first',
        variant: 'destructive',
      });
      return;
    }

    try {
      setIsUploading(true);
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
        hideFromChat: false
      }]);

      const abortController = new AbortController();
      abortControllerRef.current = abortController;

      // TODO: This is given partial xbrl as initial data
      // Start SSE connection
      const response = await fetch('/api/chat', {
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

      const reader = response.body?.getReader();
      if (!reader) throw new Error('No reader available');

      const decoder = new TextDecoder();
      let finalContent = '';
      let retrievedDocs: PDFDocument[] = [];
      let isJsonResponse = false;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

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

          // Handle events the same way as chat form
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
          }
          else if (event === 'updates' && data) {
            // Handle document retrieval and progress updates
            if (data.retrieveDocuments?.documents) {
              retrievedDocs = data.retrieveDocuments.documents;
            }

            // Update progress
            if (data.graph_status) {
              setCurrentStep(getNodeDescription(data.graph_status.current_node));
              setTotalSteps(data.graph_status.total_steps);
              setCompletedSteps(data.graph_status.total_steps - data.graph_status.steps_remaining);
            }
          }
        }
      }

      setMessages([{
        role: 'assistant',
        content: finalContent,
        sources: retrievedDocs,
        isJson: isJsonResponse,
        hideFromChat: false
      }]);

      let parsedData;
      try {
        parsedData = JSON.parse(finalContent);
      } catch (error) {
        console.error('Invalid JSON received:', error);
        toast({
          title: 'Data Format Error',
          description: 'Received invalid JSON format from server',
          variant: 'destructive'
        });
        return;
      }

      try {
        const saveResponse = await fetch('/api/extract', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            threadId: threadId,
            data: parsedData
          })
        });

        const responseData = await saveResponse.json();

        if (!saveResponse.ok) {
          console.error('Save error details:', responseData);
          throw new Error(responseData.error || responseData.details || 'Data persistence failed');
        }

        toast({
          title: 'Success!',
          description: 'Data extracted and saved successfully',
        });
        setExtractionComplete(true);
      } catch (error) {
        console.error('Full save error:', error);
        toast({
          title: 'Save Failed',
          description: error instanceof Error ? error.message : 'Data persistence error',
          variant: 'destructive',
        });
      }

    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') {
        console.log('Request aborted');
        return;
      }

      console.error('Error:', error);
      toast({
        title: 'Processing Failed',
        description: error instanceof Error ? error.message : 'Unknown error occurred',
        variant: 'destructive',
      });
    } finally {
      setIsUploading(false);
      setStartTime(null);
      abortControllerRef.current = null;
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(e.target.files || []);
    if (selectedFiles.length === 0) return;

    if (selectedFiles.length > 1) {
      toast({
        title: 'Only one PDF allowed',
        description: 'Please select only one PDF file. Only one document can be processed at a time.',
        variant: 'destructive',
      });
      return;
    }

    const file = selectedFiles[0];

    if (file.size > MAX_FILE_SIZE) {
      toast({
        title: 'File too large',
        description: 'Maximum file size is 50MB',
        variant: 'destructive',
      });
      return;
    }

    if (file.type !== 'application/pdf') {
      toast({
        title: 'Invalid file type',
        description: 'Please upload a PDF file only',
        variant: 'destructive',
      });
      return;
    }

    if (!validateForm()) {
      setSubmissionAttempted(true);
    }

    setIsUploading(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append('files', file);

      const response = await fetch('/api/ingest', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
        throw new Error(errorData.error || 'Failed to upload file');
      }

      const data = await response.json();
      setFiles([{
        name: file.name,
        size: file.size,
        lastModified: file.lastModified,
        webkitRelativePath: file.webkitRelativePath,
        type: file.type,
        bytes: new Uint8Array(await file.arrayBuffer()),
      }]);

      if (data.threadId) {
        setThreadId(data.threadId);

        if (!validateForm()) {
          setSubmissionAttempted(true);
          return;
        }

        setMessages([
          {
            role: 'assistant',
            content: '',
            processingStatus: 'Extracting data from PDF...',
            hideFromChat: false
          }
        ]);

        if (!response.ok) {
          throw new Error('Failed to start extraction');
        }
      }

      toast({
        title: 'Success',
        description: 'File uploaded successfully',
        variant: 'default',
      });
    } catch (error) {
      console.error('Error uploading file:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      setError(`File upload failed: ${errorMessage}`);
      toast({
        title: 'Upload failed',
        description: 'Failed to upload file. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };


  useEffect(() => {
    return () => {
      if (extractionPollTimer) {
        clearInterval(extractionPollTimer);
      }
    };
  }, [extractionPollTimer]);

  const handleRemoveFile = async (fileToRemove: File) => {
    try {
      setFiles(files.filter((file) => file !== fileToRemove));
      toast({
        title: 'File removed',
        description: `${fileToRemove.name} has been removed`,
        variant: 'default',
      });
    } catch (error) {
      console.error('Error removing file:', error);
      toast({
        title: 'Error',
        description: 'Failed to remove file. The file will still be used for chat context.',
        variant: 'destructive',
      });
    }
  };

  const clearError = () => {
    setError(null);
  };

  return (
    <>
      <ErrorDisplay error={error} clearError={clearError} />

      {isThreadInitializing && (
        <div className="w-full flex justify-center py-6 mb-4">
          <div className="flex items-center gap-3 px-6 py-3 bg-blue-50 dark:bg-blue-900/20 rounded-full shadow-sm border border-blue-100 dark:border-blue-800">
            <Loader2 className="h-5 w-5 animate-spin text-blue-600 dark:text-blue-400" />
            <span className="text-blue-700 dark:text-blue-300 font-medium">Initializing chat thread...</span>
          </div>
        </div>
      )}

      <div className="flex h-screen overflow-hidden">
        <LeftSidebar
          sidebarCollapsed={sidebarCollapsed}
          setSidebarCollapsed={setSidebarCollapsed}
          files={files} // Pass files state as a prop
          removeFile={removeFile} // Pass removeFile function as a prop
        />

        <div className="flex-1 flex flex-col h-full overflow-hidden">
          <div className="p-4">
            <ViewSelector viewType={viewType} setViewType={setViewType} />
            <InteractiveStepLoader />
          </div>


          {extractionComplete && (
            <div className="mt-6 flex justify-center">
              <MappingButton onClick={handleMapping} isLoading={mappingLoading} />
            </div>
          )}

          <div className="flex-1 overflow-y-auto pb-24">
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
              <div className="w-full space-y-6 px-4">
                {messages
                  .filter(message => !message.hideFromChat)
                  .map((message, i) => (
                    message.role === 'assistant' && !message.content && message.processingStatus ? (
                      <ProcessingStatusIndicator
                        key={i}
                        currentStep={currentStep}
                        handleCancelRequest={handleCancelRequest}
                      />
                    ) : message.isJson ? (
                      <div key={i} className="chat-message group transition-all">
                        <div className={`flex items-start gap-4 ${message.role === 'assistant' ? 'justify-start' : 'justify-end'}`}>
                          {message.role === 'assistant' && (
                            <div className="flex h-10 w-10 shrink-0 select-none items-center justify-center rounded-full bg-blue-600 text-white">
                              <span className="text-sm font-medium">AI</span>
                            </div>
                          )}
                          <div className={`rounded-lg p-5 max-w-prose w-full shadow-sm ${message.role === 'assistant'
                            ? 'bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700'
                            : 'bg-blue-600 text-white'
                            }`}>
                            <div className="overflow-x-auto">
                              <JsonViewer
                                data={JSON.parse(message.content)}
                                initialExpanded={true}
                                maxInitialDepth={2}
                              />
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
                      <ChatMessage key={i} message={message} viewType={viewType} />
                    )
                  ))}
                <div ref={messagesEndRef} className="h-1" />
              </div>
            )}
          </div>

          {/* Fixed File Preview Bar */}
          <div className="fixed bottom-0 left-0 right-0 bg-white dark:bg-gray-800/90 backdrop-blur-md border-t border-gray-200 dark:border-gray-700 shadow-lg py-4">
            <div className="max-w-5xl mx-auto px-4">
              {files.length > 0 && (
                <div className="bg-gray-50 dark:bg-gray-900/50 rounded-lg p-3 mb-4 border border-gray-200 dark:border-gray-700">
                  <div className="flex justify-between items-center mb-2 px-1">
                    <p className="text-xs font-medium text-gray-600 dark:text-gray-400">Uploaded Documents</p>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
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
          </div>
        </div>
      </div>
    </>
  );
}
