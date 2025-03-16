'use client';

import type React from 'react';

import { useToast } from '@/hooks/use-toast';
import { useRef, useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Paperclip, ArrowUp, Loader2, Clock, AlertCircle, X } from 'lucide-react';
import { ExamplePrompts } from '@/components/example-prompts';
import { ChatMessage } from '@/components/chat-message';
import { FilePreview } from '@/components/file-preview';
import JsonViewer from '@/components/json-viewer';
import { client } from '@/lib/langgraph-client';
import {
  AgentState,
  documentType,
  PDFDocument,
  RetrieveDocumentsNodeUpdates,
} from '@/types/graphTypes';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

export default function Home() {
  const { toast } = useToast();
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

  // Function to check if a string is JSON
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
      // Add more node mappings based on your LangGraph implementation
    };

    return nodeDescriptions[nodeName] || `Processing ${nodeName}...`;
  };

  const handleCancelRequest = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
      setIsLoading(false);
      setStartTime(null);

      // Remove the loading assistant message
      setMessages((prev) => {
        const newArr = [...prev];
        // Remove the last message if it's a loading assistant message
        if (newArr.length > 0 && newArr[newArr.length - 1].role === 'assistant' && !newArr[newArr.length - 1].content) {
          return newArr.slice(0, -1);
        }
        return newArr;
      });

      toast({
        title: 'Request cancelled',
        description: 'Your request has been cancelled.',
        variant: 'default',
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || !threadId || isLoading) return;

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

    // Add assistant message with loader
    setMessages((prev) => [
      ...prev,
      {
        role: 'assistant',
        content: '', // Empty content, will be shown as loader
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

            if (Array.isArray(data) && data.length > 0) {
              const lastObj = data[data.length - 1];
              if (lastObj?.type === 'ai' && lastObj.content) {
                // Similar content parsing as before
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
                    .map((c: any) => (c && typeof c.text === 'string') ? c.text : '')
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
              // Extract graph progress information
              const { graph_status } = data;
              if (graph_status) {
                // Get current node being processed
                if (graph_status.current_node) {
                  // Convert technical node names to user-friendly descriptions
                  const nodeDescription = getNodeDescription(graph_status.current_node);
                  setCurrentStep(nodeDescription);
                  currentStatus = nodeDescription;
                  updateProcessingStatus(currentStatus);
                }

                // Calculate progress percentage
                if (graph_status.steps_remaining !== undefined && graph_status.total_steps !== undefined) {
                  const total = graph_status.total_steps;
                  const completed = total - graph_status.steps_remaining;

                  setTotalSteps(total);
                  setCompletedSteps(completed);

                  // Calculate percentage (guard against division by zero)
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
              processingStatus: undefined, // Remove processing status once complete
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

  const calculateProgress = (elapsedTime: number) => {
    if (elapsedTime < 5) {
      return Math.min(20, (elapsedTime / 5) * 20);
    } else if (elapsedTime < 20) {
      return 20 + Math.min(60, ((elapsedTime - 5) / 15) * 60);
    } else {
      return Math.min(95, 80 + ((elapsedTime - 20) / 20) * 15);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(e.target.files || []);
    if (selectedFiles.length === 0) return;

    // Limit to only one file
    if (selectedFiles.length > 1) {
      toast({
        title: 'Only one PDF allowed',
        description: 'Please select only one PDF file. Only one document can be processed at a time.',
        variant: 'destructive',
      });
      return;
    }

    const file = selectedFiles[0];

    // Check for PDF file type
    if (file.type !== 'application/pdf') {
      toast({
        title: 'Invalid file type',
        description: 'Please upload a PDF file only',
        variant: 'destructive',
      });
      return;
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

      setFiles([file]);
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

        {/* Thread initialization status with better styling */}
        {isThreadInitializing && (
          <div className="w-full flex justify-center py-6 mb-4">
            <div className="flex items-center gap-3 px-6 py-3 bg-blue-50 dark:bg-blue-900/20 rounded-full shadow-sm border border-blue-100 dark:border-blue-800">
              <Loader2 className="h-5 w-5 animate-spin text-blue-600 dark:text-blue-400" />
              <span className="text-blue-700 dark:text-blue-300 font-medium">Initializing chat thread...</span>
            </div>
          </div>
        )}

        {/* Empty state with cleaner design */}
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 w-full h-[70vh]">
            <div className="text-center bg-white dark:bg-gray-800 p-8 rounded-xl shadow-md border border-gray-200 dark:border-gray-700 max-w-lg w-full transition-all relative">
              {isUploading ? (
                <div className="absolute inset-0 bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm flex flex-col items-center justify-center rounded-xl z-10">
                  <div className="relative">
                    <svg className="w-16 h-16 text-blue-600 animate-spin" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                  </div>
                  <p className="mt-4 text-blue-700 dark:text-blue-400 font-medium">Uploading PDF...</p>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">This may take a moment</p>
                </div>
              ) : null}

              <div className="flex items-center justify-center mb-6">
                <svg className="w-16 h-16 text-blue-600 dark:text-blue-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>

              <h2 className="text-2xl font-bold mb-4 text-gray-800 dark:text-gray-100">Data Extraction</h2>
              <p className="text-gray-600 dark:text-gray-300 mb-8">Upload your PDF document to extract key information</p>

              <div className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-8 mb-6 hover:border-blue-500 dark:hover:border-blue-400 transition-colors cursor-pointer" onClick={() => fileInputRef.current?.click()}>
                <div className="flex flex-col items-center">
                  <Paperclip className="h-8 w-8 text-gray-400 dark:text-gray-500 mb-3" />
                  <p className="text-gray-700 dark:text-gray-300 font-medium">Click to browse</p>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">PDF files only (Max 1 file)</p>
                </div>
              </div>

              <Button
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploading || isLoading}
                className="gap-2 py-6 px-8 text-base font-medium shadow-sm bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 transition-colors"
              >
                <Paperclip className="h-5 w-5" />
                Select PDF File
              </Button>
            </div>
          </div>
        ) : (
          // Chat messages display with better spacing and styling
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