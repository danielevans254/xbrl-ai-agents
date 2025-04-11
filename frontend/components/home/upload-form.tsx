'use client';

import { Paperclip, ArrowUp, Loader2, FileText, CheckCircle, AlertCircle, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { useState, useEffect } from 'react';

export const UploadForm = ({
  files,
  isUploading,
  formErrors,
  submissionAttempted,
  handleFileUpload,
  handleFormSubmit,
  fileInputRef
}: {
  files: File[];
  isUploading: boolean;
  formErrors: { file?: string };
  submissionAttempted: boolean;
  handleFileUpload: (e: React.ChangeEvent) => void;
  handleFormSubmit: (e: React.FormEvent) => void;
  fileInputRef: React.RefObject<HTMLInputElement>;
}) => {
  const { toast } = useToast();
  const [animateHeader, setAnimateHeader] = useState(false);
  const [animateCard, setAnimateCard] = useState(false);

  useEffect(() => {
    // Trigger animations on mount
    setAnimateCard(true);
    setTimeout(() => setAnimateHeader(true), 300);
  }, []);

  return (
    <div className={`w-full max-w-md mx-auto bg-white rounded-xl shadow-lg overflow-hidden border border-gray-100 transition-all duration-500 ${animateCard ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
      <div className="relative">
        {/* Decorative header */}
        <div className="absolute top-0 left-0 w-full h-16 bg-gradient-to-r from-blue-500 to-indigo-600 opacity-90"></div>

        {/* Decorative elements */}
        <div className="absolute top-4 right-4 w-12 h-12 rounded-full bg-white/20 backdrop-blur-sm"></div>
        <div className="absolute top-8 right-16 w-6 h-6 rounded-full bg-white/30 backdrop-blur-sm"></div>
        <div className="absolute top-10 left-10 w-8 h-8 rounded-full bg-white/30 backdrop-blur-sm"></div>
      </div>

      <div className="px-8 py-6 pt-20">
        <h2 className={`text-2xl font-bold text-center mb-2 text-gray-800 transition-all duration-700 ${animateHeader ? 'opacity-100' : 'opacity-0'}`}>
          XBRL Data Extraction
        </h2>

        <p className="text-center text-gray-500 mb-6 text-lg">
          Upload your financial reports for instant analysis
        </p>

        <form onSubmit={handleFormSubmit} className="space-y-6">
          <div className="space-y-3">
            <div className="flex flex-col">
              <div className="flex items-center justify-between mb-2">
                <label className="text-lg font-semibold text-gray-700 flex items-center">
                  <FileText className="h-4 w-4 mr-2 text-blue-500" />
                  Upload Annual Report PDF
                </label>
                <span className="text-lg bg-blue-100 text-blue-700 px-2 py-1 rounded-full font-medium">Required</span>
              </div>

              <p className="text-lg text-gray-500 mb-4 flex items-center">
                <AlertCircle className="h-3 w-3 mr-1 text-gray-400" />
                Supported format: PDF (Max 10MB)
              </p>

              <input
                type="file"
                onChange={handleFileUpload}
                ref={fileInputRef}
                className="hidden"
                accept=".pdf"
              />

              <Button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploading}
                className="gap-2 py-4 px-6 w-full border border-dashed border-blue-300 bg-blue-50 text-blue-700 hover:bg-blue-100 rounded-lg transition-all duration-300 focus:shadow-md focus:outline-none focus:ring-2 focus:ring-blue-200 group"
                variant="outline"
              >
                {isUploading ? (
                  <>
                    <Loader2 className="h-5 w-5 animate-spin" />
                    Uploading…
                  </>
                ) : (
                  <>
                    <Paperclip className="h-5 w-5 text-blue-500 group-hover:rotate-12 transition-transform duration-300" />
                    {files.length > 0 ? 'Change PDF File' : 'Select PDF File'}
                  </>
                )}
              </Button>

              {files.length > 0 && (
                <div className="mt-3 p-4 bg-green-50 rounded-lg text-lg text-gray-700 border border-green-200 flex items-center justify-between animate-fadeIn">
                  <div className="flex items-center overflow-hidden">
                    <CheckCircle className="h-5 w-5 mr-2 text-green-500 animate-pulse" />
                    <span className="truncate">{files[0].name}</span>
                  </div>
                </div>
              )}

              {formErrors.file && submissionAttempted && (
                <div className="mt-2 text-lg font-medium text-red-500 flex items-center bg-red-50 p-2 rounded-md border border-red-200 animate-shake">
                  <AlertCircle className="h-4 w-4 mr-2 text-red-500" />
                  {formErrors.file}
                </div>
              )}
            </div>
          </div>

          {/* <Button
            type="submit"
            disabled={isUploading || files.length === 0}
            className={`w-full py-4 mt-8 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-lg transition-all duration-300 font-medium text-lg shadow-md hover:shadow-lg ${files.length > 0 && !isUploading ? 'animate-pulse-subtle' : ''}`}
          >
            {isUploading ? (
              <>
                <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                Processing Document...
              </>
            ) : (
              <>
                <ArrowUp className="h-5 w-5 mr-2 group-hover:translate-y-1 transition-transform" />
                Extract Data
              </>
            )}
          </Button> */}
        </form>
      </div>

      {/* Add custom styles for animations */}
      <style jsx global>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        
        @keyframes shake {
          0% { transform: translateX(0); }
          25% { transform: translateX(-5px); }
          50% { transform: translateX(5px); }
          75% { transform: translateX(-5px); }
          100% { transform: translateX(0); }
        }
        
        @keyframes pulseSoft {
          0% { box-shadow: 0 0 0 0 rgba(59, 130, 246, 0.5); }
          70% { box-shadow: 0 0 0 10px rgba(59, 130, 246, 0); }
          100% { box-shadow: 0 0 0 0 rgba(59, 130, 246, 0); }
        }
        
        .animate-fadeIn {
          animation: fadeIn 0.5s ease-out;
        }
        
        .animate-shake {
          animation: shake 0.5s ease-in-out;
        }
        
        .animate-pulse-subtle {
          animation: pulseSoft 2s infinite;
        }
      `}</style>
    </div>
  );
};