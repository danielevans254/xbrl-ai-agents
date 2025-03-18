'use client';

import type React from 'react';

import { useToast } from '@/hooks/use-toast';
import JsonViewer from '@/components/json-viewer';
import TableView from '@/components/table-viewer';
import CardView from '@/components/card-viewer';
import { useRef, useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Paperclip, ArrowUp, Loader2, Clock, AlertCircle, X } from 'lucide-react';
import { ExamplePrompts } from '@/components/example-prompts';
import { ChatMessage } from '@/components/chat-message';
import { FilePreview } from '@/components/file-preview';
import DataVisualizer from '@/components/data-visualizer-switch';
import { client } from '@/lib/langgraph-client';
import {
  AgentState,
  documentType,
  PDFDocument,
  RetrieveDocumentsNodeUpdates,
} from '@/types/graphTypes';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { partialXBRLMessage } from '@/constants/prompts/partial-xbrl';

export default function Home() {
  const { toast } = useToast();
  const [viewType, setViewType] = useState<string>('all');
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
  const [input, setInput] = useState('');
  const [files, setFiles] = useState<File[]>([]);
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
  const lastRetrievedDocsRef = useRef<PDFDocument[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const [graphProgress, setGraphProgress] = useState(0);
  const [currentStep, setCurrentStep] = useState('');
  const [totalSteps, setTotalSteps] = useState(0);
  const [completedSteps, setCompletedSteps] = useState(0);
  const [extractionPollTimer, setExtractionPollTimer] = useState<NodeJS.Timeout | null>(null);
  const [formErrors, setFormErrors] = useState<FormErrors>({});
  const [submissionAttempted, setSubmissionAttempted] = useState(false)

  const MAX_FILE_SIZE = 50 * 1024 * 1024;


  interface XBRLFormData {
    entityName: string;
    uen: string;
    currentPeriodStart: string;
    currentPeriodEnd: string;
    priorPeriodStart: string;
    typeOfXBRLFiling: string;
    natureOfFinancialStatements: string;
    accountingStandard: string;
    presentationCurrency: string;
    functionalCurrency: string;
    roundingLevel: string;
  }

  interface FormErrors {
    file?: string;
  }


  useEffect(() => {
    // Create a thread when the component mounts
    const initThread = async () => {
      // Skip if we already have a thread
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

  // Update the timer when processing a message
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

  const updateProcessingStatus = (status: string) => {
    setMessages((prev) => {
      const newArr = [...prev];
      if (newArr.length > 0 && newArr[newArr.length - 1].role === 'assistant') {
        newArr[newArr.length - 1] = {
          ...newArr[newArr.length - 1],
          processingStatus: status,
        };
      }
      return newArr;
    });
  };

  const validateForm = () => {
    const errors: FormErrors = {};


    if (files.length === 0) {
      errors.file = 'Please upload a PDF file';
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const isJsonString = (str: string): boolean => {
    try {
      const result = JSON.parse(str);
      return typeof result === 'object' && result !== null;
    } catch (e) {
      return false;
    }
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || !threadId || isLoading) {
      return;
    }

    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    const userMessage = input.trim();

    // Reset any previous errors
    setError(null);

    // Add user message but don't add a placeholder for assistant yet
    setMessages((prev) => [
      ...prev,
      { role: 'user', content: userMessage },
    ]);

    setInput('');
    setIsLoading(true);
    setStartTime(Date.now());
    setGraphProgress(0);
    setCurrentStep('');
    setTotalSteps(0);
    setCompletedSteps(0);

    const abortController = new AbortController();
    abortControllerRef.current = abortController;

    lastRetrievedDocsRef.current = [];
    let finalContent = '';
    let retrievedDocs: PDFDocument[] = [];
    let currentStatus = 'Initializing request...';
    let isJsonResponse = false;

    // Variable to hold updated threadId if returned by the server
    let newThreadId = threadId;

    // Add assistant message with loader
    setMessages((prev) => [
      ...prev,
      {
        role: 'assistant',
        content: '',
        processingStatus: currentStatus
      },
    ]);

    try {
      currentStatus = 'Sending request...';
      updateProcessingStatus(currentStatus);

      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: userMessage,
          threadId,
        }),
        signal: abortController.signal,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        throw new Error(errorData?.error || `HTTP error! status: ${response.status}`);
      }

      currentStatus = 'Processing response...';
      updateProcessingStatus(currentStatus);

      const reader = response.body?.getReader();
      if (!reader) throw new Error('No reader available');

      const decoder = new TextDecoder();

      // eslint-disable-next-line no-constant-condition
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
            currentStatus = 'Finalizing response...';
            updateProcessingStatus(currentStatus);

            // If the SSE data contains a threadId, update newThreadId
            if (data && !Array.isArray(data) && data.threadId) {
              newThreadId = data.threadId;
            }

            if (Array.isArray(data) && data.length > 0) {
              const lastObj = data[data.length - 1];
              if (lastObj?.type === 'ai' && lastObj.content) {
                // Parse content if it appears to be JSON
                if (typeof lastObj.content === 'string') {
                  if (lastObj.content.trim().startsWith('{')) {
                    try {
                      const jsonContent = JSON.parse(lastObj.content);
                      isJsonResponse = true;
                      finalContent = lastObj.content;
                    } catch (e) {
                      finalContent = lastObj.content;
                    }
                  } else {
                    finalContent = lastObj.content;
                  }
                } else if (Array.isArray(lastObj.content)) {
                  finalContent = lastObj.content
                    .map((c: any) =>
                      c && typeof c.text === 'string' ? c.text : ''
                    )
                    .filter(Boolean)
                    .join('');
                } else if (lastObj.content && typeof lastObj.content === 'object') {
                  isJsonResponse = true;
                  finalContent = JSON.stringify(lastObj.content);
                }
              }
            }
          } else if (event === 'updates' && data) {
            // Handle document retrieval
            if (
              data &&
              typeof data === 'object' &&
              'retrieveDocuments' in data &&
              data.retrieveDocuments &&
              Array.isArray(data.retrieveDocuments.documents)
            ) {
              retrievedDocs = (data as RetrieveDocumentsNodeUpdates)
                .retrieveDocuments.documents as PDFDocument[];

              lastRetrievedDocsRef.current = retrievedDocs;
              console.log('Retrieved documents:', retrievedDocs);

              currentStatus = `Analyzing ${retrievedDocs.length} document${retrievedDocs.length !== 1 ? 's' : ''}...`;
              updateProcessingStatus(currentStatus);
            }

            // Add LangGraph progress tracking
            if (data && typeof data === 'object' && 'graph_status' in data) {
              const { graph_status } = data;
              if (graph_status) {
                if (graph_status.current_node) {
                  const nodeDescription = getNodeDescription(graph_status.current_node);
                  setCurrentStep(nodeDescription);
                  currentStatus = nodeDescription;
                  updateProcessingStatus(currentStatus);
                }

                if (graph_status.steps_remaining !== undefined && graph_status.total_steps !== undefined) {
                  const total = graph_status.total_steps;
                  const completed = total - graph_status.steps_remaining;

                  setTotalSteps(total);
                  setCompletedSteps(completed);

                  const percentage = total > 0 ? Math.min(95, (completed / total) * 100) : 0;
                  setGraphProgress(percentage);
                }
              }
            }
          }
        }
      }

      // Check if the response is JSON
      if (!isJsonResponse) {
        isJsonResponse = isJsonString(finalContent);
      }

      if (finalContent.trim() === "Extract") {
        setMessages((prev) => prev.slice(0, -1));
      } else {
        // Otherwise, update the last assistant message normally.
        setMessages((prev) => {
          const newArr = [...prev];
          if (newArr.length > 0 && newArr[newArr.length - 1].role === 'assistant') {
            newArr[newArr.length - 1] = {
              ...newArr[newArr.length - 1],
              content: finalContent || "I couldn't generate a response.",
              sources: retrievedDocs.length > 0 ? retrievedDocs : undefined,
              processingStatus: undefined,
              isJson: isJsonResponse
            };
          }
          return newArr;
        });
      }

    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') {
        console.log('Request was aborted');
        return;
      }

      console.error('Error sending message:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      setError(errorMessage);

      toast({
        title: 'Error',
        description: 'Failed to send message. Please try again.',
        variant: 'destructive',
      });

      setMessages((prev) => {
        const newArr = [...prev];
        if (newArr.length > 0 && newArr[newArr.length - 1].role === 'assistant') {
          newArr[newArr.length - 1] = {
            ...newArr[newArr.length - 1],
            content: 'Sorry, there was an error processing your message.',
            processingStatus: undefined
          };
        }
        return newArr;
      });
    } finally {
      setIsLoading(false);
      setStartTime(null);
      abortControllerRef.current = null;
    }
  };


  const calculateProgress = (elapsed: number) => {
    // Assuming a typical extraction takes about 30 seconds
    const estimatedProgress = Math.min(Math.floor((elapsed / 30) * 100), 95);
    return estimatedProgress;
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

    // if (!validateForm()) {
    //   toast({
    //     title: 'Form Errors',
    //     description: 'Please fix the errors before submitting',
    //     variant: 'destructive',
    //   });
    //   return;
    // }

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

      // Upload file first
      // const formData = new FormData();
      // formData.append('files', files[0]);
      // const uploadResponse = await fetch('/api/ingest', {
      //   method: 'POST',
      //   body: formData,
      // });

      // if (!uploadResponse.ok) {
      //   throw new Error('Failed to upload file');
      // }

      // const uploadData = await uploadResponse.json();
      // const newThreadId = uploadData.threadId;
      // setThreadId(newThreadId);

      // Add processing message
      setMessages([{
        role: 'assistant',
        content: '',
        processingStatus: 'Processing XBRL filing...',
        hideFromChat: false
      }]);

      const abortController = new AbortController();
      abortControllerRef.current = abortController;

      // Start SSE connection
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: partialXBRLMessage,
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
      // toast({
      //   title: 'Form has errors',
      //   description: 'Your form has errors that should be fixed before final submission',
      //   variant: 'destructive',
      // });
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
      setFiles([file]);

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

        pollForExtractionResults(data.threadId);
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

  const pollForExtractionResults = async (threadId: string) => {
    const pollingInterval = 3000;
    let attempts = 0;
    const maxAttempts = 200;

    const pollTimer = setInterval(async () => {
      attempts++;
      if (attempts > maxAttempts) {
        clearInterval(pollTimer);

        setMessages(prevMessages => [
          ...prevMessages.filter(msg => !msg.processingStatus),
          {
            role: 'assistant',
            content: 'Extraction is taking longer than expected. You can try asking about the document to see if any data has been extracted.',
            hideFromChat: false
          }
        ]);

        return;
      }

      try {
        const response = await fetch(`/api/extraction-status?threadId=${threadId}`);

        if (!response.ok) {
          throw new Error('Failed to fetch extraction status');
        }

        const data = await response.json();

        if (data.status === 'complete' && data.structuredData) {
          clearInterval(pollTimer);

          setMessages(prevMessages => [
            ...prevMessages.filter(msg => !msg.processingStatus),
            {
              role: 'assistant',
              content: JSON.stringify(data.structuredData, null, 2),
              isJson: true,
              hideFromChat: false
            }
          ]);

          setGraphProgress(100);
          setCurrentStep('Data extraction complete');

          setTimeout(() => {
            setGraphProgress(0);
            setCurrentStep('');
          }, 2000);
        } else if (data.status === 'processing') {
          setGraphProgress(data.progress || calculateProgress(attempts * pollingInterval / 1000));
          setCurrentStep(data.currentStep || 'Processing document');
          setCompletedSteps(data.completedSteps || 0);
          setTotalSteps(data.totalSteps || 0);
        }
      } catch (error) {
        console.error('Error polling for extraction results:', error);
      }
    }, pollingInterval);

    setExtractionPollTimer(pollTimer);
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
      // You might want to implement an API endpoint to remove files from your backend storage
      // const response = await fetch(`/api/ingest?filename=${encodeURIComponent(fileToRemove.name)}`, {
      //   method: 'DELETE',
      // });

      // if (!response.ok) {
      //   throw new Error('Failed to remove file from storage');
      // }

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

  const renderView = () => {
    switch (viewType) {
      case 'json':
        return <JsonViewer data={messages} initialExpanded={true} maxInitialDepth={2} />;
      case 'table':
        return <TableView data={messages} />;
      case 'card':
        return <CardView data={messages} />;
      case 'all':
      default:
        return <DataVisualizer data={messages} title="Data Visualization" />;
    }
  };

  return (
    <main className="flex min-h-screen flex-col bg-gray-50 dark:bg-gray-900">
      {/* Container with responsive padding and max width */}
      <div className="flex-1 w-full max-w-5xl mx-auto px-4 md:px-6 pt-6 pb-24">
        {/* Error display with improved animation and styling */}
        {error && (
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
        )}

        {isThreadInitializing && (
          <div className="w-full flex justify-center py-6 mb-4">
            <div className="flex items-center gap-3 px-6 py-3 bg-blue-50 dark:bg-blue-900/20 rounded-full shadow-sm border border-blue-100 dark:border-blue-800">
              <Loader2 className="h-5 w-5 animate-spin text-blue-600 dark:text-blue-400" />
              <span className="text-blue-700 dark:text-blue-300 font-medium">Initializing chat thread...</span>
            </div>
          </div>
        )}

        {/* View Selector */}
        <div className="mb-6">
          <label htmlFor="view-selector" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Select Visualization Type:
          </label>
          <select
            id="view-selector"
            value={viewType}
            onChange={(e) => setViewType(e.target.value)}
            className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 dark:border-gray-700 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-800 dark:text-gray-200 sm:text-sm"
          >
            <option value="all">All Views (with switcher)</option>
            <option value="json">JSON View</option>
            <option value="table">Table View</option>
            <option value="card">Card View</option>
          </select>
        </div>

        {messages.length === 0 ? (
          <form className="flex flex-col items-center justify-center py-16 w-full h-[70vh]" onSubmit={handleFormSubmit}>
            <div className="text-center bg-white dark:bg-gray-800 p-8 rounded-xl shadow-md border border-gray-200 dark:border-gray-700 max-w-2xl w-full transition-all relative">
              <h2 className="text-2xl font-bold mb-6 text-gray-800 dark:text-gray-100">XBRL Filing Information</h2>

              {/* File Upload Section */}
              <div className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-6 mb-6">
                <div className="flex flex-col items-center">
                  <Paperclip className="h-8 w-8 text-gray-400 dark:text-gray-500 mb-3" />
                  <p className="text-gray-700 dark:text-gray-300 font-medium mb-2">Upload Annual Report PDF</p>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">Supported format: PDF (Max 50MB)</p>

                  <Button
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isUploading || isLoading}
                    className="gap-2 py-3 px-6"
                  >
                    <Paperclip className="h-5 w-5" />
                    {files.length > 0 ? 'Change PDF File' : 'Select PDF File'}
                  </Button>

                  {files.length > 0 && (
                    <div className="mt-4 text-sm text-gray-600 dark:text-gray-400">
                      Selected: {files[0].name}
                    </div>
                  )}
                  {formErrors.file && (
                    <p className="text-red-500 text-sm mt-2">{formErrors.file}</p>
                  )}
                </div>
              </div>

              <Button
                type="submit"
                className="w-full py-6 text-base font-medium"
                disabled={isUploading || isLoading}
              >
                {isUploading ? (
                  <Loader2 className="h-5 w-5 animate-spin mr-2" />
                ) : (
                  <ArrowUp className="h-5 w-5 mr-2" />
                )}
                {isUploading ? 'Processing...' : 'Extract Data'}
              </Button>
            </div>
          </form>
        ) : (
          <div className="w-full space-y-6 mb-24">
            {messages
              .filter(message => !message.hideFromChat)
              .map((message, i) => (
                message.role === 'assistant' && !message.content && message.processingStatus ? (
                  <div key={i} className="flex flex-col space-y-3 p-5 rounded-lg bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800 shadow-sm">
                    <div className="flex items-center gap-4">
                      <div className="flex h-10 w-10 rounded-full bg-blue-500 items-center justify-center">
                        <Loader2 className="h-6 w-6 text-white animate-spin" />
                      </div>
                      <div className="flex flex-col flex-1">
                        <div className="text-sm font-medium text-blue-700 dark:text-blue-300">Processing Document</div>
                        <div className="text-xs text-blue-600 dark:text-blue-400 mt-1 flex items-center justify-between">
                          <div className="flex items-center">
                            <Clock className="h-3 w-3 mr-1" />
                            {currentStep ? (
                              totalSteps > 0 ?
                                `${currentStep} (${completedSteps}/${totalSteps} steps)` :
                                currentStep
                            ) : (
                              elapsedTime > 0 ? `Processing for ${elapsedTime}s...` : 'Starting...'
                            )}
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 px-3 text-xs text-blue-700 dark:text-blue-300 hover:text-blue-800 hover:bg-blue-100 dark:hover:bg-blue-800/30"
                            onClick={handleCancelRequest}
                          >
                            Cancel
                          </Button>
                        </div>
                      </div>
                    </div>
                    <div className="w-full bg-blue-100 dark:bg-blue-800/50 rounded-full h-2 mt-2">
                      <div
                        className="bg-blue-600 dark:bg-blue-400 h-2 rounded-full transition-all duration-300 ease-in-out"
                        style={{
                          width: `${graphProgress > 0 ? graphProgress : calculateProgress(elapsedTime)}%`
                        }}
                      ></div>
                    </div>
                  </div>
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
                  <ChatMessage key={i} message={message} />
                )
              ))}
            <div ref={messagesEndRef} className="h-1" />
          </div>
        )}
      </div>

      {/* Fixed bottom chat input with improved styling */}
      <div className="fixed bottom-0 left-0 right-0 bg-white dark:bg-gray-800/90 backdrop-blur-md border-t border-gray-200 dark:border-gray-700 shadow-lg py-4">
        <div className="max-w-5xl mx-auto px-4">
          {/* File previews with better grid layout */}
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

          {/* Chat form with enhanced design */}
          <form onSubmit={handleSubmit} className="relative">
            <div className="flex gap-2 border border-gray-300 dark:border-gray-600 rounded-lg overflow-hidden bg-white dark:bg-gray-800 shadow-sm focus-within:ring-2 focus-within:ring-blue-500 focus-within:border-blue-500">
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileUpload}
                accept=".pdf"
                multiple={false}
                className="hidden"
              />
              <Button
                type="button"
                variant="ghost"
                className="rounded-none h-14 w-12 flex items-center justify-center hover:bg-gray-100 dark:hover:bg-gray-700"
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploading || isLoading || files.length > 0}
                title="Upload PDF"
              >
                {isUploading ? (
                  <Loader2 className="h-5 w-5 animate-spin text-blue-600 dark:text-blue-400" />
                ) : (
                  <>
                    <Paperclip className="h-5 w-5" />
                    {files.length > 0 ? "" : ""}
                  </>
                )}
              </Button>

              <Input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder={
                  isUploading
                    ? 'Uploading PDF...'
                    : isThreadInitializing
                      ? 'Initializing...'
                      : !threadId
                        ? 'Error initializing chat'
                        : 'Ask a question about your documents...'
                }
                className="border-0 focus-visible:ring-0 focus-visible:ring-offset-0 h-14 bg-transparent flex-1 text-base px-4"
                disabled={isUploading || isLoading || !threadId || isThreadInitializing}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSubmit(e);
                  }
                }}
              />
              <Button
                type="submit"
                className="rounded-none h-14 w-14 flex items-center justify-center bg-blue-600 hover:bg-blue-700 transition-colors"
                disabled={
                  !input.trim() || isUploading || isLoading || !threadId || isThreadInitializing
                }
              >
                {isLoading ? (
                  <Loader2 className="h-5 w-5 animate-spin text-white" />
                ) : (
                  <ArrowUp className="h-5 w-5 text-white" />
                )}
              </Button>
            </div>
            {/* Input helper text with better positioning */}
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-2 px-2">
              {isThreadInitializing ? "Setting up the chat..." :
                !threadId ? "Failed to initialize chat" :
                  isUploading ? "" :
                    files.length === 0 ? "" :
                      ""}
            </p>
          </form>
        </div>
      </div>
    </main>
  );
}