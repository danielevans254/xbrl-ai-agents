'use client';

import { Paperclip, ArrowUp, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';

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
  handleFileUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  handleFormSubmit: (e: React.FormEvent) => void;
  fileInputRef: React.RefObject<HTMLInputElement>;
}) => {
  const { toast } = useToast();

  return (
    <form className="flex flex-col items-center justify-center py-16 w-full h-[70vh]" onSubmit={handleFormSubmit}>
      <div className="text-center bg-white dark:bg-gray-800 p-8 rounded-xl shadow-md border border-gray-200 dark:border-gray-700 max-w-2xl w-full transition-all relative">
        <h2 className="text-2xl font-bold mb-6 text-gray-800 dark:text-gray-100">XBRL Data Extraction</h2>

        <div className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-6 mb-6">
          <div className="flex flex-col items-center">
            <Paperclip className="h-8 w-8 text-gray-400 dark:text-gray-500 mb-3" />
            <p className="text-gray-700 dark:text-gray-300 font-medium mb-2">Upload Annual Report PDF</p>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">Supported format: PDF (Max 50MB)</p>

            <Button
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploading}
              className="gap-2 py-3 px-6"
            >
              <Paperclip className="h-5 w-5" />
              {files.length > 0 ? 'Change PDF File' : 'Select PDF File'}
            </Button>
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileUpload}
              accept=".pdf"
              multiple={false}
              className="hidden"
            />

            {files.length > 0 && (
              <div className="mt-4 text-sm text-gray-600 dark:text-gray-400">
                Selected: {files[0].name}
              </div>
            )}
            {formErrors.file && submissionAttempted && (
              <p className="text-red-500 text-sm mt-2">{formErrors.file}</p>
            )}
          </div>
        </div>

        <Button
          type="submit"
          className="w-full py-6 text-base font-medium"
          disabled={isUploading}
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
  );
};