'use client';

import type React from 'react';

import { useToast } from '@/hooks/use-toast';
import { useRef, useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Paperclip, ArrowUp, Loader2, Clock } from 'lucide-react';
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

export default function Home() {
  const { toast } = useToast();
  const [messages, setMessages] = useState<
    Array<{
      role: 'user' | 'assistant';
      content: string;
      sources?: PDFDocument[];
      processingStatus?: string;
      isJson?: boolean; // New flag to identify JSON content
    }>
  >([]);
  const [input, setInput] = useState('');
  const [files, setFiles] = useState<File[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [threadId, setThreadId] = useState<string | null>(null);
  const [startTime, setStartTime] = useState<number | null>(null);
  const [elapsedTime, setElapsedTime] = useState<number>(0);
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
        const thread = await client.createThread();
        setThreadId(thread.thread_id);
      } catch (error) {
        console.error('Error creating thread:', error);
        toast({
          title: 'Error',
          description:
            'Error creating thread. Please make sure you have set the LANGGRAPH_API_URL environment variable correctly. ' +
            error,
          variant: 'destructive',
        });
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || !threadId || isLoading) return;

    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    const userMessage = input.trim();

    // Add user message but don't add a placeholder for assistant yet
    setMessages((prev) => [
      ...prev,
      { role: 'user', content: userMessage },
    ]);

    setInput('');
    setIsLoading(true);
    setStartTime(Date.now());

    const abortController = new AbortController();
    abortControllerRef.current = abortController;

    lastRetrievedDocsRef.current = []; // Clear the last retrieved documents
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
        throw new Error(`HTTP error! status: ${response.status}`);
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
            // Handle document retrieval (keep your existing code)
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

      // Update the messages array only after receiving the complete message
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

    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') {
        console.log('Request was aborted');
        return;
      }

      console.error('Error sending message:', error);
      toast({
        title: 'Error',
        description:
          'Failed to send message. Please try again.\n' +
          (error instanceof Error ? error.message : 'Unknown error'),
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

    const nonPdfFiles = selectedFiles.filter(
      (file) => file.type !== 'application/pdf',
    );
    if (nonPdfFiles.length > 0) {
      toast({
        title: 'Invalid file type',
        description: 'Please upload PDF files only',
        variant: 'destructive',
      });
      return;
    }

    setIsUploading(true);
    try {
      const formData = new FormData();
      selectedFiles.forEach((file) => {
        formData.append('files', file);
      });

      const response = await fetch('/api/ingest', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
        throw new Error(errorData.error || 'Failed to upload files');
      }

      setFiles((prev) => [...prev, ...selectedFiles]);
      toast({
        title: 'Success',
        description: `${selectedFiles.length} file${selectedFiles.length > 1 ? 's' : ''} uploaded successfully`,
        variant: 'default',
      });
    } catch (error) {
      console.error('Error uploading files:', error);
      toast({
        title: 'Upload failed',
        description:
          'Failed to upload files. Please try again.\n' +
          (error instanceof Error ? error.message : 'Unknown error'),
        variant: 'destructive',
      });
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleRemoveFile = (fileToRemove: File) => {
    setFiles(files.filter((file) => file !== fileToRemove));
    toast({
      title: 'File removed',
      description: `${fileToRemove.name} has been removed`,
      variant: 'default',
    });
  };

  return (
    <main className="flex min-h-screen flex-col items-center p-4 md:p-24 max-w-5xl mx-auto w-full">
      {messages.length === 0 ? (
        <>
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <p className="font-medium text-muted-foreground max-w-md mx-auto">
                Upload a PDF to create embeddings and vector
              </p>
            </div>
          </div>
          <ExamplePrompts onPromptSelect={setInput} />
        </>
      ) : (
        <div className="w-full space-y-4 mb-20">
          {messages.map((message, i) => (
            message.role === 'assistant' && !message.content && message.processingStatus ? (
              <div key={i} className="flex flex-col space-y-2 p-4 rounded-lg bg-blue-50 border border-blue-100">
                <div className="flex items-center gap-3">
                  <div className="flex h-8 w-8 rounded-full bg-blue-500 items-center justify-center">
                    <Loader2 className="h-5 w-5 text-white animate-spin" />
                  </div>
                  <div className="flex flex-col">
                    <span className="text-sm font-medium text-blue-800">
                      {message.processingStatus}
                    </span>
                    <div className="text-xs text-blue-600 mt-1 flex items-center">
                      <Clock className="h-3 w-3 mr-1" />
                      {currentStep ? (
                        totalSteps > 0 ?
                          `${currentStep} (${completedSteps}/${totalSteps} steps)` :
                          currentStep
                      ) : (
                        elapsedTime > 0 ? `Processing for ${elapsedTime}s...` : 'Starting...'
                      )}
                    </div>
                  </div>
                </div>
                <div className="w-full bg-blue-100 rounded-full h-1.5 mt-2">
                  <div
                    className="bg-blue-600 h-1.5 rounded-full transition-all duration-300 ease-in-out"
                    style={{
                      width: `${graphProgress > 0 ? graphProgress : calculateProgress(elapsedTime)}%`
                    }}
                  ></div>
                </div>
              </div>
            ) : message.isJson ? (
              <div key={i} className="chat-message">
                <div className={`flex items-start gap-4 ${message.role === 'assistant' ? 'justify-start' : 'justify-end'}`}>
                  {message.role === 'assistant' && (
                    <div className="flex h-8 w-8 shrink-0 select-none items-center justify-center rounded-full bg-primary text-primary-foreground">
                      AI
                    </div>
                  )}
                  <div className={`rounded-lg p-4 max-w-prose ${message.role === 'assistant'
                    ? 'bg-gray-50 border border-gray-100'
                    : 'bg-primary text-primary-foreground'
                    }`}>
                    <JsonViewer
                      data={JSON.parse(message.content)}
                      initialExpanded={true}
                      maxInitialDepth={2}
                    />

                    {/* {message.sources && message.sources.length > 0 && (
                      <div className="mt-2 pt-2 border-t border-gray-200">
                        <p className="text-xs text-gray-500 font-medium">Sources:</p>
                        <div className="flex flex-wrap gap-1 mt-1">
                          {message.sources.map((source, idx) => (
                            <span key={idx} className="text-xs bg-gray-100 px-2 py-1 rounded">
                              {source.id || `Document ${idx + 1}`}
                            </span>
                          ))}
                        </div>
                      </div>
                    )} */}
                  </div>
                  {message.role === 'user' && (
                    <div className="flex h-8 w-8 shrink-0 select-none items-center justify-center rounded-full bg-muted text-muted-foreground">
                      You
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <ChatMessage key={i} message={message} />
            )
          ))}
          <div ref={messagesEndRef} />
        </div>
      )}

      <div className="fixed bottom-0 left-0 right-0 p-4 bg-background">
        <div className="max-w-5xl mx-auto space-y-4">
          {files.length > 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
              {files.map((file, index) => (
                <FilePreview
                  key={`${file.name}-${index}`}
                  file={file}
                  onRemove={() => handleRemoveFile(file)}
                />
              ))}
            </div>
          )}

          <form onSubmit={handleSubmit} className="relative">
            <div className="flex gap-2 border rounded-md overflow-hidden bg-gray-50">
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileUpload}
                accept=".pdf"
                multiple
                className="hidden"
              />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="rounded-none h-12"
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploading}
              >
                {isUploading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Paperclip className="h-4 w-4" />
                )}
              </Button>
              <Input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder={
                  isUploading
                    ? 'Uploading PDF...'
                    : !threadId
                      ? 'Initializing...'
                      : 'Send a message...'
                }
                className="border-0 focus-visible:ring-0 focus-visible:ring-offset-0 h-12 bg-transparent"
                disabled={isUploading || isLoading || !threadId}
              />
              <Button
                type="submit"
                size="icon"
                className="rounded-none h-12"
                disabled={
                  !input.trim() || isUploading || isLoading || !threadId
                }
              >
                {isLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <ArrowUp className="h-4 w-4" />
                )}
              </Button>
            </div>
          </form>
        </div>
      </div>
    </main>
  );
}