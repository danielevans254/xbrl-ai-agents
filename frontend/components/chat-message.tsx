'use client';

import dynamic from 'next/dynamic';
import { Copy } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { useState } from 'react';
import { PDFDocument } from '@/types/graphTypes';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import JsonViewer from './json-viewer';
import CardView from './card-viewer';
import TableView from './table-viewer';
import EditableDataVisualizer from './data-visualizer-switch';

// Dynamically import react-json-view so it only loads on the client.
const ReactJson = dynamic(() => import('react-json-view'), { ssr: false });

interface ChatMessageProps {
  message: {
    role: 'user' | 'assistant';
    content: string;
    jsonData?: any;
    sources?: PDFDocument[];
  };
  onDataUpdate?: (newData: any) => void;
}

// Function to detect if a string is valid JSON
const isJsonString = (str: string): boolean => {
  try {
    const json = JSON.parse(str);
    return typeof json === 'object' && json !== null;
  } catch (e) {
    return false;
  }
};

const JsonDisplay = ({ data }: { data: any }) => {
  return (
    <div className="mt-4 p-4 border rounded-lg bg-gray-50 dark:bg-gray-800 overflow-hidden">
      <div className="overflow-x-auto">
        <JsonViewer
          data={data}
          initialExpanded={true}
          maxInitialDepth={2}
        />
      </div>
    </div>
  );
};

export function ChatMessage({ message, viewType }: ChatMessageProps) {
  const isUser = message.role === 'user';
  const [copied, setCopied] = useState(false);
  const isLoading = message.role === 'assistant' && message.content === '';

  // Extract text and JSON content from the message
  const jsonContent = (() => {
    // If parsed jsonData is already provided, use that
    if (message.jsonData) {
      return message.jsonData;
    }

    // For assistant messages, if the entire content is valid JSON, use it.
    if (!isUser && isJsonString(message.content)) {
      try {
        return JSON.parse(message.content);
      } catch (e) {
        return null;
      }
    }

    // Check if there's JSON embedded within markdown-style code blocks
    try {
      const jsonRegex = /```json\n([\s\S]*?)\n```/g;
      const matches = [...message.content.matchAll(jsonRegex)];

      if (matches.length > 0) {
        const jsonParts = matches.map(match => JSON.parse(match[1]));
        return jsonParts.length === 1 ? jsonParts[0] : jsonParts;
      }
    } catch (e) {
      // Fallback to null if JSON parsing fails
    }

    return null;
  })();

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(message.content);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy text:', err);
    }
  };

  const showSources =
    message.role === 'assistant' &&
    message.sources &&
    message.sources.length > 0;

  return (
    <div className={`flex w-full ${isUser ? 'justify-end' : 'justify-start'} mb-4`}>
      <div
        className={`
        w-full sm:max-w-[85%] lg:max-w-[75%]
        ${isUser ? 'bg-black text-white' : 'bg-muted dark:bg-gray-800'} 
        rounded-2xl px-3 py-3 sm:px-4 sm:py-3
        shadow-sm
      `}
      >
        {isLoading ? (
          <div className="flex space-x-2 h-8 items-center justify-center">
            <div className="w-2 h-2 bg-current rounded-full animate-[loading_1s_ease-in-out_infinite]" />
            <div className="w-2 h-2 bg-current rounded-full animate-[loading_1s_ease-in-out_0.2s_infinite]" />
            <div className="w-2 h-2 bg-current rounded-full animate-[loading_1s_ease-in-out_0.4s_infinite]" />
          </div>
        ) : (
          <>
            <div className="mb-2 break-words">
              {message.content && !isJsonString(message.content) && (
                <div className="prose dark:prose-invert max-w-none">
                  {message.content}
                </div>
              )}
            </div>

            {jsonContent && !isUser && (
              <div className="mt-4">
                <EditableDataVisualizer
                  data={jsonContent}
                  initialView="table"
                  onDataUpdate={onDataUpdate}
                  title="Data Preview"
                  viewType="table"

                />
              </div>
            )}

            {!isUser && (
              <div className="flex justify-end mt-3">
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 flex items-center gap-1 text-xs transition-all"
                  onClick={handleCopy}
                  title={copied ? 'Copied!' : 'Copy to clipboard'}
                >
                  <Copy className={`h-3 w-3 ${copied ? 'text-green-500' : ''}`} />
                  <span>{copied ? 'Copied!' : 'Copy'}</span>
                </Button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
