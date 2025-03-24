import React, { useState, ChangeEvent } from 'react';
import { Avatar, AvatarFallback } from '../ui/avatar';
import { FileText, ChevronLeft, Search, Upload, Trash } from 'lucide-react';
import { Button } from '../ui/button';

interface FileData {
  name: string;
  size: number;
  removeFile: (file: FileData) => void; // Add this line
}

interface LeftSidebarProps {
  sidebarCollapsed: boolean;
  setSidebarCollapsed: React.Dispatch<React.SetStateAction<boolean>>;
  files: FileData[];
  removeFile: (file: FileData) => void;
}

export const LeftSidebar = ({ sidebarCollapsed, setSidebarCollapsed, files, removeFile }: LeftSidebarProps) => {
  const [selectedDocument, setSelectedDocument] = useState<FileData | null>(null);

  return (
    <div className={`${sidebarCollapsed ? 'w-16' : 'w-72'} border-r transition-all duration-300 flex flex-col h-full bg-white dark:bg-gray-800`}>
      <div className="p-4 border-b flex items-center justify-between">
        <div className={`flex items-center space-x-3 ${sidebarCollapsed ? 'hidden' : ''}`}>
          <FileText className="w-6 h-6 text-blue-500" />
          <span className="font-semibold text-lg">XBRL.AI</span>
        </div>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
          className="hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full"
        >
          <ChevronLeft className={`w-5 h-5 transition-transform ${sidebarCollapsed ? 'rotate-180' : ''}`} />
        </Button>
      </div>

      <div className="p-4 overflow-y-auto flex-1">
        {!sidebarCollapsed && (
          <div className="space-y-4">
            <div className="flex items-center space-x-2">
              <Search className="w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search documents..."
                className="w-full bg-gray-50 dark:bg-gray-700 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <Button
              variant="default"
              className="w-full justify-start bg-blue-500 text-white hover:bg-blue-600"
              onClick={() => document.getElementById('fileInput')?.click()}
            >
              <Upload className="w-4 h-4 mr-2" />
              Upload Annual Report
            </Button>

            {/* Hidden file input */}
            <input
              id="fileInput"
              type="file"
              multiple
              style={{ display: 'none' }}
            />

            {files.length > 0 && ( // Use files prop instead of local state
              <div className="mt-6">
                <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">Uploaded Documents</h3>
                <div className="space-y-2">
                  {files.map((file, index) => (
                    <div
                      key={index}
                      className={`group flex items-center space-x-2 p-2 rounded-md cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 ${selectedDocument?.name === file.name ? 'bg-blue-50 dark:bg-blue-900/20' : ''}`}
                      onClick={() => setSelectedDocument(file)}
                    >
                      <FileText className="w-4 h-4 text-blue-500" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm truncate">{file.name}</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          {(file.size / (1024 * 1024)).toFixed(2)} MB
                        </p>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 opacity-0 group-hover:opacity-100 text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20"
                        onClick={(e) => {
                          e.stopPropagation();
                          removeFile(file); // Call removeFile function
                          if (selectedDocument?.name === file.name) {
                            setSelectedDocument(null);
                          }
                        }}
                      >
                        <Trash className="h-3 w-3" />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {sidebarCollapsed && (
          <div className="flex flex-col items-center space-y-4">
            <Button
              variant="ghost"
              size="icon"
              className="h-10 w-10 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700"
              onClick={() => document.getElementById('fileInput')?.click()}
            >
              <Upload className="h-5 w-5" />
            </Button>
          </div>
        )}
      </div>

      <div className="mt-auto p-4 border-t mb-9">
        {!sidebarCollapsed ? (
          <div className="flex items-center space-x-6">
            <Avatar>
              <AvatarFallback>Daniel</AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <p className="text-sm font-medium">User Account</p>
              <p className="text-xs text-gray-500">Pro Plan</p>
            </div>
          </div>
        ) : (
          <div className="flex justify-center">
            <Avatar>
              <AvatarFallback>U</AvatarFallback>
            </Avatar>
          </div>
        )}
      </div>
    </div>
  );
};
