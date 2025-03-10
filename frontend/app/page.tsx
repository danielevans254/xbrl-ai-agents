'use client';

import type React from 'react';

import { useToast } from '@/hooks/use-toast';
import { useRef, useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Paperclip, ArrowUp, Loader2 } from 'lucide-react';
import { ExamplePrompts } from '@/components/example-prompts';
import { ChatMessage } from '@/components/chat-message';
import { FilePreview } from '@/components/file-preview';
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
    }>
  >([]);
  const [input, setInput] = useState('');
  const [files, setFiles] = useState<File[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [threadId, setThreadId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const lastRetrievedDocsRef = useRef<PDFDocument[]>([]);

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || !threadId || isLoading) return;

    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    const userMessage = input.trim();
    setMessages((prev) => [
      ...prev,
      { role: 'user', content: userMessage },
      { role: 'assistant', content: '' },
    ]);
    setInput('');
    setIsLoading(true);

    const abortController = new AbortController();
    abortControllerRef.current = abortController;

    lastRetrievedDocsRef.current = []; // Clear the last retrieved documents

    try {
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

          // Handle different SSE events
          if (event === 'messages/partial') {
            if (Array.isArray(data) && data.length > 0) {
              const lastObj = data[data.length - 1];
              if (lastObj?.type === 'ai') {
                let contentText = '';

                // Handle different content formats
                if (typeof lastObj.content === 'string') {
                  // Try to parse as JSON if it starts with {
                  if (lastObj.content.trim().startsWith('{')) {
                    try {
                      const jsonContent = JSON.parse(lastObj.content);
                      contentText = typeof jsonContent === 'string'
                        ? jsonContent
                        : JSON.stringify(jsonContent);
                    } catch (e) {
                      contentText = lastObj.content;
                    }
                  } else {
                    contentText = lastObj.content;
                  }
                } else if (Array.isArray(lastObj.content)) {
                  // Handle LangChain message array format
                  contentText = lastObj.content
                    .map((c: any) => (c && typeof c.text === 'string') ? c.text : '')
                    .filter(Boolean)
                    .join('');
                } else if (lastObj.content && typeof lastObj.content === 'object') {
                  // Handle object content
                  contentText = JSON.stringify(lastObj.content);
                }

                setMessages((prev) => {
                  const newArr = [...prev];
                  if (newArr.length > 0 && newArr[newArr.length - 1].role === 'assistant') {
                    newArr[newArr.length - 1] = {
                      ...newArr[newArr.length - 1],
                      content: contentText,
                      sources: lastRetrievedDocsRef.current.length > 0
                        ? [...lastRetrievedDocsRef.current]
                        : undefined
                    };
                  }
                  return newArr;
                });
              }
            }
          } else if (event === 'messages/complete') {
            // Handle the completed message, possibly do final updates
            if (Array.isArray(data) && data.length > 0) {
              // Process the complete message data if needed
              console.log('Message complete:', data);

              // Final update to messages if needed
              const lastObj = data[data.length - 1];
              if (lastObj?.type === 'ai' && lastObj.content) {
                let finalContent = '';

                // Similar content parsing as in messages/partial
                if (typeof lastObj.content === 'string') {
                  if (lastObj.content.trim().startsWith('{')) {
                    try {
                      const jsonContent = JSON.parse(lastObj.content);
                      finalContent = typeof jsonContent === 'string'
                        ? jsonContent
                        : JSON.stringify(jsonContent);
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
                  finalContent = JSON.stringify(lastObj.content);
                }

                // Update with final content if it's different
                if (finalContent) {
                  setMessages((prev) => {
                    const newArr = [...prev];
                    if (newArr.length > 0 && newArr[newArr.length - 1].role === 'assistant') {
                      newArr[newArr.length - 1] = {
                        ...newArr[newArr.length - 1],
                        content: finalContent,
                        sources: lastRetrievedDocsRef.current.length > 0
                          ? [...lastRetrievedDocsRef.current]
                          : undefined
                      };
                    }
                    return newArr;
                  });
                }
              }
            }
          } else if (event === 'updates' && data) {
            if (
              data &&
              typeof data === 'object' &&
              'retrieveDocuments' in data &&
              data.retrieveDocuments &&
              Array.isArray(data.retrieveDocuments.documents)
            ) {
              const retrievedDocs = (data as RetrieveDocumentsNodeUpdates)
                .retrieveDocuments.documents as PDFDocument[];

              lastRetrievedDocsRef.current = retrievedDocs;

              // Update the sources in the current assistant message
              setMessages((prev) => {
                const newArr = [...prev];
                if (newArr.length > 0 && newArr[newArr.length - 1].role === 'assistant') {
                  newArr[newArr.length - 1] = {
                    ...newArr[newArr.length - 1],
                    sources: retrievedDocs
                  };
                }
                return newArr;
              });

              console.log('Retrieved documents:', retrievedDocs);
            }
          } else {
            // Just log other events without showing error in UI
            console.log(`Received SSE event: ${event}`, data);
          }
        }
      }
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
            content: 'Sorry, there was an error processing your message.'
          };
        }
        return newArr;
      });
    } finally {
      setIsLoading(false);
      abortControllerRef.current = null;
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
            <ChatMessage key={i} message={message} />
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