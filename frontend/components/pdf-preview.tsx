import React, { useState, useEffect } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import { ChevronLeft, ChevronRight, X, Maximize2, Minimize2, Loader2, Eye, EyeOff } from 'lucide-react';
import { Button } from './ui/button';

pdfjs.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/pdf.worker.min.js`;

interface PDFPreviewProps {
  file: File | null;
  isProcessing: boolean;
  extractedData: any;
}

const PDFPreview: React.FC<PDFPreviewProps> = ({ file, isProcessing, extractedData }) => {
  const [numPages, setNumPages] = useState<number | null>(null);
  const [pageNumber, setPageNumber] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [scale, setScale] = useState(1.0);
  const [showPdfPreview, setShowPdfPreview] = useState(true);
  const [fileUrl, setFileUrl] = useState<string | null>(null);

  useEffect(() => {
    if (file) {
      const newUrl = URL.createObjectURL(file);
      setFileUrl(newUrl);
      return () => URL.revokeObjectURL(newUrl);
    }
  }, [file]);

  useEffect(() => {
    return () => {
      if (fileUrl) URL.revokeObjectURL(fileUrl);
    };
  }, [fileUrl]);

  useEffect(() => {
    setPageNumber(1);
    setLoading(true);
    setError(null);
  }, [file]);

  const onDocumentLoadSuccess = ({ numPages }: { numPages: number }) => {
    setNumPages(numPages);
    setLoading(false);
    setError(null);
  };

  const onDocumentLoadError = (error: unknown) => {
    console.error("PDF load error:", error);
    setLoading(false);

    const errorMessage = (error as Error)?.message || '';
    let userMessage = 'Failed to load PDF. Please ensure it\'s a valid file.';

    if (errorMessage.includes('InvalidPDFException')) {
      userMessage = 'Invalid PDF file. The file may be corrupt or encrypted.';
    } else if (errorMessage.includes('password')) {
      userMessage = 'PDF is password protected. Please remove password protection.';
    }

    setError(userMessage);
  };

  const changePage = (offset: number) => {
    setPageNumber(prev => Math.max(1, Math.min(prev + offset, numPages || 1)));
  };

  const zoomIn = () => setScale(prev => Math.min(prev + 0.2, 2.5));
  const zoomOut = () => setScale(prev => Math.max(prev - 0.2, 0.5));
  const togglePdfPreview = () => setShowPdfPreview(!showPdfPreview);

  return (
    <div className="rounded-lg border border-gray-200 dark:border-gray-700">
      <div className="flex items-center justify-between mb-2 px-4 pt-3 pb-2">
        <h3 className="text-lg font-medium text-gray-800 dark:text-gray-200">Document Analysis</h3>
        <Button
          variant="outline"
          size="sm"
          onClick={togglePdfPreview}
          className="h-8 gap-2 text-xs"
        >
          {showPdfPreview ? (
            <>
              <EyeOff className="h-3.5 w-3.5" />
              Hide PDF
            </>
          ) : (
            <>
              <Eye className="h-3.5 w-3.5" />
              Show PDF
            </>
          )}
        </Button>
      </div>

      <div className={`grid ${showPdfPreview ? 'grid-cols-1 md:grid-cols-2 gap-4' : 'grid-cols-1'} p-4`}>
        {showPdfPreview && (
          <div className="relative flex flex-col border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
            <div className="p-2 bg-gray-50 dark:bg-gray-800 border-b flex items-center justify-between gap-2">
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">PDF Preview</span>
              <div className="flex items-center gap-1">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={zoomOut}
                  disabled={!file || scale <= 0.5}
                  className="h-7 w-7 p-0"
                >
                  <span className="text-xs">-</span>
                </Button>
                <span className="text-xs w-12 text-center">
                  {Math.round(scale * 100)}%
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={zoomIn}
                  disabled={!file || scale >= 2.5}
                  className="h-7 w-7 p-0"
                >
                  <span className="text-xs">+</span>
                </Button>

                <div className="w-px h-4 bg-gray-300 mx-1" />

                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => changePage(-1)}
                  disabled={pageNumber <= 1 || !file}
                  className="h-7 w-7 p-0"
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <span className="text-xs w-20 text-center">
                  {file ? (numPages ? `${pageNumber} / ${numPages}` : 'Loading...') : 'No PDF'}
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => changePage(1)}
                  disabled={pageNumber >= (numPages || 0) || !file}
                  className="h-7 w-7 p-0"
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>

            <div className="flex-1 bg-gray-50 dark:bg-gray-800 p-4 min-h-[400px] flex items-center justify-center">
              {!file ? (
                <div className="text-gray-500 text-center">Select a PDF document</div>
              ) : error ? (
                <div className="text-red-500 text-center p-4 max-w-[400px]">
                  {error}
                  <div className="mt-2 text-xs text-red-400">
                    Supported formats: PDF
                  </div>
                </div>) : (
                <Document
                  file={fileUrl}
                  onLoadSuccess={onDocumentLoadSuccess}
                  onLoadError={onDocumentLoadError}
                  loading={
                    <div className="flex flex-col items-center">
                      <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
                      <p className="mt-2 text-sm text-gray-500">Loading PDF...</p>
                      <p className="text-xs text-gray-400 mt-1">
                        {file && `Loading ${file.name} (${Math.round(file.size / 1024)}KB)`}
                      </p>
                    </div>
                  }
                >
                  <Page
                    pageNumber={pageNumber}
                    scale={scale}
                    loading={
                      <div className="flex items-center justify-center h-64">
                        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
                      </div>
                    }
                    className="border border-gray-200"
                    error={<div className="text-red-500">Error rendering page</div>}
                  />
                </Document>
              )}
            </div>
          </div>
        )}

        <div className="flex flex-col border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
          <div className="p-2 bg-gray-50 dark:bg-gray-800 border-b">
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Extracted Data</span>
          </div>

          <div className="flex-1 bg-white dark:bg-gray-800 p-4 min-h-[400px] overflow-auto">
            {isProcessing ? (
              <div className="flex flex-col items-center justify-center h-full">
                <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
                <p className="mt-2 text-sm text-gray-500">Processing document...</p>
              </div>
            ) : extractedData ? (
              <pre className="text-sm bg-gray-50 dark:bg-gray-900 p-4 rounded-lg overflow-auto max-h-[500px]">
                {JSON.stringify(extractedData, null, 2)}
              </pre>
            ) : (
              <div className="text-gray-500 text-center p-4">
                Upload a document and extract data to view results
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default PDFPreview;