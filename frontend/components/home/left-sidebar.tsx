import React, { useState } from 'react';
import { Avatar, AvatarFallback } from '../ui/avatar';
import { FileText, ChevronLeft, Search, Upload, Trash, Plus } from 'lucide-react';
import { Button } from '../ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '../ui/tooltip';

interface FileData {
  name: string;
  size: number;
}

interface LeftSidebarProps {
  sidebarCollapsed: boolean;
  setSidebarCollapsed: React.Dispatch<React.SetStateAction<boolean>>;
  files: FileData[];
  removeFile: (file: FileData) => void;
  onFileSelect?: (file: FileData) => void;
}

export const LeftSidebar = ({
  sidebarCollapsed,
  setSidebarCollapsed,
  files,
  removeFile,
  onFileSelect
}: LeftSidebarProps) => {
  const [selectedDocument, setSelectedDocument] = useState<FileData | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  const handleFileSelect = (file: FileData) => {
    setSelectedDocument(file);
    if (onFileSelect) {
      onFileSelect(file);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    // File upload logic would be implemented here
    // This is just a placeholder for the actual implementation
    console.log("Files selected:", e.target.files);
  };

  const filteredFiles = files.filter(file =>
    file.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div
      className={`${sidebarCollapsed ? 'w-16' : 'w-72'} border-r transition-all duration-300 flex flex-col h-full bg-white dark:bg-gray-800 shadow-sm`}
    >
      {/* Header */}
      <div className="p-4 border-b flex items-center justify-between bg-gradient-to-r from-blue-50 to-white dark:from-gray-800 dark:to-gray-750">
        <div className={`flex items-center space-x-3 ${sidebarCollapsed ? 'hidden' : ''}`}>
          <FileText className="w-6 h-6 text-blue-600" />
          <span className="font-semibold text-lg text-blue-600">XBRL.AI</span>
        </div>
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
                className="hover:bg-blue-100 dark:hover:bg-gray-700 rounded-full"
              >
                <ChevronLeft className={`w-5 h-5 transition-transform ${sidebarCollapsed ? 'rotate-180' : ''}`} />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="right">
              {sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>

      {/* Content Area */}
      <div className="p-4 overflow-y-auto flex-1">
        {!sidebarCollapsed && (
          <div className="space-y-4">
            {/* Search */}
            <div className="relative">
              <Search className="absolute w-4 h-4 text-gray-400 left-3 top-1/2 transform -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search documents..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-gray-50 dark:bg-gray-700 rounded-md pl-9 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 border border-gray-200 dark:border-gray-600"
              />
            </div>

            {/* Upload Button */}
            <Button
              variant="default"
              className="w-full justify-start bg-blue-600 text-white hover:bg-blue-700 shadow-sm transition-all duration-200 group"
              onClick={() => document.getElementById('fileInput')?.click()}
            >
              <Upload className="w-4 h-4 mr-2" />
              Upload Annual Report
            </Button>

            {/* Hidden file input */}
            <input
              id="fileInput"
              type="file"
              accept=".pdf,.xbrl,.xml,.html,.txt"
              multiple
              style={{ display: 'none' }}
              onChange={handleFileUpload}
            />

            {/* File List */}
            {filteredFiles.length > 0 && (
              <div className="mt-6">
                <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2 flex items-center">
                  Uploaded Documents
                  <span className="ml-2 bg-blue-100 text-blue-800 text-xs font-medium px-2 py-0.5 rounded-full dark:bg-blue-900 dark:text-blue-300">
                    {filteredFiles.length}
                  </span>
                </h3>
                <div className="space-y-2">
                  {filteredFiles.map((file, index) => (
                    <div
                      key={index}
                      className={`group flex items-center space-x-2 p-2 rounded-md cursor-pointer transition-all duration-200 hover:bg-gray-100 dark:hover:bg-gray-700 ${selectedDocument?.name === file.name
                        ? 'bg-blue-50 dark:bg-blue-900/20 border-l-4 border-blue-500 pl-1'
                        : ''
                        }`}
                      onClick={() => handleFileSelect(file)}
                    >
                      <FileText className={`w-4 h-4 ${selectedDocument?.name === file.name
                        ? 'text-blue-600'
                        : 'text-gray-400'
                        }`} />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{file.name}</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          {(file.size / (1024 * 1024)).toFixed(2)} MB
                        </p>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 opacity-0 group-hover:opacity-100 text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 transition-opacity duration-200"
                        onClick={(e) => {
                          e.stopPropagation();
                          removeFile(file);
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

            {/* {files.length === 0 && (
              <div className="mt-8 text-center p-6 border border-dashed border-gray-300 dark:border-gray-600 rounded-lg">
                <FileText className="w-10 h-10 text-gray-400 mx-auto mb-3" />
                <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300">No documents yet</h3>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  Upload your first document to get started
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-4 text-blue-600 border-blue-300 hover:bg-blue-50 dark:hover:bg-blue-900/20"
                  onClick={() => document.getElementById('fileInput')?.click()}
                >
                  <Plus className="w-4 h-4 mr-1" />
                  Add Files
                </Button>
              </div>
            )} */}

            {/* No Search Results */}
            {files.length > 0 && filteredFiles.length === 0 && (
              <div className="mt-4 text-center p-4">
                <Search className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  No documents matching "{searchQuery}"
                </p>
                <Button
                  variant="link"
                  size="sm"
                  className="mt-2 text-blue-600"
                  onClick={() => setSearchQuery("")}
                >
                  Clear search
                </Button>
              </div>
            )}
          </div>
        )}

        {/* Collapsed Sidebar Content */}
        {sidebarCollapsed && (
          <div className="flex flex-col items-center space-y-4">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-10 w-10 rounded-full hover:bg-blue-100 dark:hover:bg-gray-700"
                    onClick={() => document.getElementById('fileInput')?.click()}
                  >
                    <Upload className="h-5 w-5 text-gray-600" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="right">
                  Upload Annual Report
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>

            {files.length > 0 && (
              <div className="flex flex-col items-center">
                <div className="h-px w-6 bg-gray-200 dark:bg-gray-700 my-2"></div>
                {files.slice(0, 3).map((file, index) => (
                  <TooltipProvider key={index}>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className={`h-8 w-8 rounded-full my-1 ${selectedDocument?.name === file.name
                            ? 'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400'
                            : 'hover:bg-gray-100 dark:hover:bg-gray-700'
                            }`}
                          onClick={() => handleFileSelect(file)}
                        >
                          <FileText className="h-4 w-4" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent side="right">
                        {file.name}
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                ))}
                {files.length > 3 && (
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <div className="text-xs font-medium text-gray-500 dark:text-gray-400 mt-1">
                          +{files.length - 3}
                        </div>
                      </TooltipTrigger>
                      <TooltipContent side="right">
                        {files.length - 3} more documents
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="mt-auto p-4 border-t">
        {!sidebarCollapsed ? (
          <div className="flex items-center space-x-3">
            <Avatar className="h-9 w-9 ring-2 ring-blue-100 dark:ring-blue-900/30">
              <AvatarFallback className="bg-blue-600 text-white">U</AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <p className="text-sm font-medium">User Account</p>
              <p className="text-xs text-blue-600 font-medium">Pro Plan</p>
            </div>
          </div>
        ) : (
          <div className="flex justify-center">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Avatar className="h-8 w-8 ring-2 ring-blue-100 dark:ring-blue-900/30">
                    <AvatarFallback className="bg-blue-600 text-white text-xs">U</AvatarFallback>
                  </Avatar>
                </TooltipTrigger>
                <TooltipContent side="right">
                  User Account (Pro Plan)
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        )}
      </div>
    </div>
  );
};