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

const MAX_FILE_SIZE = 50 * 1024 * 1024;

export default function Home() {
  const { toast } = useToast();
  const [viewType, setViewType] = useState<'json' | 'table' | 'card'>('json');
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
  const [mappedData, setMappedData] = useState([])

  const removeFile = (fileToRemove: FileData) => {
    setFiles(prev => prev.filter(file => file.name !== fileToRemove.name));
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
    return descriptions[nodeName as keyof typeof descriptions] || `Processing ${nodeName}...`;
  };

  useEffect(() => {
    const initThread = async () => {
      if (threadId) return;
      setIsThreadInitializing(true);
      try {
        const thread = await client.createThread();
        setThreadId(thread.thread_id);
        setError(null);
      } catch (err: any) {
        console.error('Error creating thread:', err);
        setError('Failed to initialize chat thread. Please refresh the page or check your connection.');
        toast({
          title: 'Error Initializing',
          description:
            'Error creating thread. Please ensure the LANGGRAPH_API_URL environment variable is set correctly. ' +
            err,
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
        setElapsedTime(Math.floor((Date.now() - startTime) / 1000));
      }, 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
      setElapsedTime(0);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isLoading, startTime]);

  useEffect(() => {
    return () => {
      if (extractionPollTimer) clearInterval(extractionPollTimer);
    };
  }, [extractionPollTimer]);

  const handleCancelRequest = () => {
    if (extractionPollTimer) {
      clearInterval(extractionPollTimer);
      setExtractionPollTimer(null);
    }
    setMessages(prev => prev.filter(msg => !msg.processingStatus));
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
      setMappingLoading(true);

      setMessages(prev => prev.map(msg =>
        msg.role === 'assistant' && msg.isJson
          ? { ...msg, processingStatus: 'Mapping financial data...' }
          : msg
      ));

      const response = await fetch(`/api/map?threadId=${threadId}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'X-Request-ID': crypto.randomUUID(),
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to start mapping process');
      }

      const data = await response.json();

      if (data.data?.status === 'processing') {
        toast({
          title: 'Mapping Started',
          description: 'Data mapping is in progress...',
          variant: 'default',
        });
        return;
      }

      if (data.success && data.data) {
        setMappedData(data.data);

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
      await response.json();
      setFiles([{
        name: file.name,
        size: file.size,
        lastModified: file.lastModified,
        webkitRelativePath: file.webkitRelativePath,
        type: file.type,
        bytes: new Uint8Array(await file.arrayBuffer()),
      }]);
      toast({
        title: 'Success',
        description: 'File uploaded successfully',
        variant: 'default',
      });
    } catch (err: any) {
      console.error('Error uploading file:', err);
      setError(`File upload failed: ${err instanceof Error ? err.message : 'Unknown error'}`);
      toast({
        title: 'Upload failed',
        description: 'Failed to upload file. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleFormSubmit = async (e: FormEvent) => {
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
      hideFromChat: false,
    }]);

    const abortController = new AbortController();
    abortControllerRef.current = abortController;

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: "Extract all data and map it to this zod schema " + partialXBRLMessage,
          threadId: threadId,
        }),
        signal: abortController.signal,
      });
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);

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
        hideFromChat: false,
      }]);

      let parsedData;
      try {
        parsedData = JSON.parse(finalContent);
      } catch (err) {
        console.error('Invalid JSON received:', err);
        toast({
          title: 'Data Format Error',
          description: 'Received invalid JSON format from server',
          variant: 'destructive',
        });
        return;
      }

      // Save extracted data
      const saveResponse = await fetch('/api/extract', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          threadId,
          data: parsedData,
        }),
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
    } catch (err: any) {
      if (err instanceof DOMException && err.name === 'AbortError') {
        console.log('Request aborted');
        return;
      }
      console.error('Error:', err);
      toast({
        title: 'Processing Failed',
        description: err instanceof Error ? err.message : 'Unknown error occurred',
        variant: 'destructive',
      });
    } finally {
      setIsUploading(false);
      setStartTime(null);
      abortControllerRef.current = null;
    }
  };

  const handleRemoveFile = async (fileToRemove: FileData) => {
    try {
      setFiles(prev => prev.filter(file => file.name !== fileToRemove.name));
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
    <>
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
      <div className="flex flex-col md:flex-row h-screen overflow-hidden">
        <LeftSidebar
          sidebarCollapsed={sidebarCollapsed}
          setSidebarCollapsed={setSidebarCollapsed}
          files={files}
          removeFile={removeFile}
        />

        <div className="flex-1 flex flex-col h-full overflow-hidden">
          <ViewSelector viewType={viewType} setViewType={setViewType} />

          {/* Header */}
          <header className="p-4 border-b border-gray-200 dark:border-gray-700 flex flex-col md:flex-row items-center justify-between">
            <InteractiveStepLoader />
          </header>

          {extractionComplete && (
            <div className="mt-6 flex justify-center">
              <MappingButton onClick={handleMapping} isLoading={mappingLoading} />
            </div>
          )}

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
                          : 'bg-blue-600 text-white'}`}>
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
                    <ChatMessage
                      key={i}
                      message={message}
                      viewType={viewType}
                    />
                  )
                ))}
                <div ref={messagesEndRef} className="h-1" />
              </div>
            )}
          </main>

          {/* Footer: Fixed File Preview Bar */}
          <footer className="fixed bottom-0 left-0 right-0 bg-white dark:bg-gray-800/90 backdrop-blur-md border-t border-gray-200 dark:border-gray-700 shadow-lg py-4">
            <div className="max-w-5xl mx-auto px-4">
              {files.length > 0 && (
                <div className="bg-gray-50 dark:bg-gray-900/50 rounded-lg p-3 mb-4 border border-gray-200 dark:border-gray-700">
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
    </>
  );
}
