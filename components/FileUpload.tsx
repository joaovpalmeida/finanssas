import React, { useCallback, useState } from 'react';
import { Upload, FileSpreadsheet, Loader2, AlertCircle } from 'lucide-react';

interface FileUploadProps {
  onUpload: (file: File, accountName: string) => void;
  isLoading: boolean;
  error?: string | null;
}

export const FileUpload: React.FC<FileUploadProps> = ({ onUpload, isLoading, error }) => {
  const [isDragging, setIsDragging] = useState(false);
  const [accountName, setAccountName] = useState('Main Account');

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      onUpload(e.dataTransfer.files[0], accountName);
    }
  }, [onUpload, accountName]);

  const handleFileInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      onUpload(e.target.files[0], accountName);
    }
  }, [onUpload, accountName]);

  return (
    <div className="w-full max-w-2xl mx-auto p-6">
      <div className="mb-6">
        <label className="block text-sm font-medium text-slate-700 mb-2">
          Account Name
        </label>
        <input 
          type="text"
          value={accountName}
          onChange={(e) => setAccountName(e.target.value)}
          placeholder="e.g. Chase Sapphire, Checking, etc."
          className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
        />
        <p className="text-xs text-slate-500 mt-1">
          This name will be applied to all transactions in the uploaded file unless an "Account" column is found.
        </p>
      </div>

      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`
          relative border-2 border-dashed rounded-xl p-12 text-center transition-all duration-300
          ${isDragging 
            ? 'border-blue-500 bg-blue-50 scale-[1.02]' 
            : 'border-slate-300 hover:border-blue-400 hover:bg-slate-50'
          }
        `}
      >
        <div className="flex flex-col items-center justify-center space-y-4">
          <div className={`p-4 rounded-full ${isDragging ? 'bg-blue-100' : 'bg-slate-100'}`}>
            {isLoading ? (
              <Loader2 className="w-10 h-10 text-blue-600 animate-spin" />
            ) : (
              <FileSpreadsheet className={`w-10 h-10 ${isDragging ? 'text-blue-600' : 'text-slate-500'}`} />
            )}
          </div>
          
          <div className="space-y-2">
            <h3 className="text-xl font-semibold text-slate-800">
              {isLoading ? 'Processing your file...' : 'Upload your Excel File'}
            </h3>
            <p className="text-slate-500 max-w-sm mx-auto">
              Drag and drop your .xlsx or .csv file here, or click to browse.
              Ensure headers like Date, Description, Amount exist.
            </p>
          </div>

          {!isLoading && (
            <label className="cursor-pointer">
              <input 
                type="file" 
                className="hidden" 
                accept=".xlsx, .xls, .csv" 
                onChange={handleFileInput}
              />
              <span className="inline-flex items-center px-6 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors shadow-sm">
                <Upload className="w-4 h-4 mr-2" />
                Select File
              </span>
            </label>
          )}

          {error && (
            <div className="mt-4 p-3 bg-red-50 text-red-600 rounded-lg flex items-center text-sm">
              <AlertCircle className="w-4 h-4 mr-2 flex-shrink-0" />
              {error}
            </div>
          )}
        </div>
      </div>
      
      <div className="mt-8 text-center">
        <p className="text-sm text-slate-400">
          Privacy Note: Your file is processed locally in your browser. 
          Only summarized data snippets are sent to AI for insights.
        </p>
      </div>
    </div>
  );
};