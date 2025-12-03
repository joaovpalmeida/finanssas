import React, { useCallback, useState } from 'react';
import { Upload, FileSpreadsheet, Loader2, AlertCircle, ArrowRight, Settings } from 'lucide-react';
import { getExcelHeaders, ColumnMapping } from '../utils/excelParser';

interface FileUploadProps {
  onUpload: (file: File, accountName: string, mapping: ColumnMapping) => void;
  isLoading: boolean;
  error?: string | null;
}

export const FileUpload: React.FC<FileUploadProps> = ({ onUpload, isLoading, error }) => {
  const [isDragging, setIsDragging] = useState(false);
  const [accountName, setAccountName] = useState('Main Account');
  const [step, setStep] = useState<'upload' | 'mapping'>('upload');
  const [file, setFile] = useState<File | null>(null);
  const [headers, setHeaders] = useState<string[]>([]);
  
  const [mapping, setMapping] = useState<ColumnMapping>({
    date: '',
    description: '',
    amount: '',
    category: ''
  });

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const processFileSelection = async (selectedFile: File) => {
    try {
      const fileHeaders = await getExcelHeaders(selectedFile);
      setHeaders(fileHeaders);
      setFile(selectedFile);
      
      // Auto-guess mapping
      const lowerHeaders = fileHeaders.map(h => h.toLowerCase());
      const guess = {
        date: fileHeaders.find(h => h.toLowerCase().includes('date')) || '',
        description: fileHeaders.find(h => /description|desc|name/i.test(h)) || '',
        amount: fileHeaders.find(h => /amount|value|cost/i.test(h)) || '',
        category: fileHeaders.find(h => /category|type/i.test(h)) || '',
        account: fileHeaders.find(h => /account|bank|source/i.test(h)) || ''
      };
      setMapping(guess);
      setStep('mapping');
    } catch (e) {
      console.error("Failed to read headers", e);
    }
  };

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      processFileSelection(e.dataTransfer.files[0]);
    }
  }, []);

  const handleFileInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      processFileSelection(e.target.files[0]);
    }
  }, []);

  const handleConfirmImport = () => {
    if (file && mapping.amount && mapping.date) {
      onUpload(file, accountName, mapping);
      // Reset after upload trigger (loading state handled by parent)
    }
  };

  const cancelUpload = () => {
    setStep('upload');
    setFile(null);
    setHeaders([]);
  };

  if (step === 'mapping') {
    return (
      <div className="w-full max-w-2xl mx-auto p-6 bg-slate-50 rounded-xl border border-slate-200">
        <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center">
          <Settings className="w-5 h-5 mr-2 text-blue-600" />
          Map Excel Columns
        </h3>
        <p className="text-sm text-slate-500 mb-6">
          Match the columns from your file <strong>{file?.name}</strong> to the required fields.
        </p>

        <div className="space-y-4 mb-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
             <div>
               <label className="block text-xs font-semibold text-slate-500 mb-1">Date Column *</label>
               <select 
                 value={mapping.date}
                 onChange={(e) => setMapping({...mapping, date: e.target.value})}
                 className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white"
               >
                 <option value="">Select Column...</option>
                 {headers.map(h => <option key={h} value={h}>{h}</option>)}
               </select>
             </div>
             <div>
               <label className="block text-xs font-semibold text-slate-500 mb-1">Amount Column *</label>
               <select 
                 value={mapping.amount}
                 onChange={(e) => setMapping({...mapping, amount: e.target.value})}
                 className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white"
               >
                 <option value="">Select Column...</option>
                 {headers.map(h => <option key={h} value={h}>{h}</option>)}
               </select>
             </div>
             <div>
               <label className="block text-xs font-semibold text-slate-500 mb-1">Description Column</label>
               <select 
                 value={mapping.description}
                 onChange={(e) => setMapping({...mapping, description: e.target.value})}
                 className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white"
               >
                 <option value="">(None)</option>
                 {headers.map(h => <option key={h} value={h}>{h}</option>)}
               </select>
             </div>
             <div>
               <label className="block text-xs font-semibold text-slate-500 mb-1">Category Column</label>
               <select 
                 value={mapping.category}
                 onChange={(e) => setMapping({...mapping, category: e.target.value})}
                 className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white"
               >
                 <option value="">(None)</option>
                 {headers.map(h => <option key={h} value={h}>{h}</option>)}
               </select>
             </div>
             <div className="md:col-span-2 border-t border-slate-200 pt-4 mt-2">
               <label className="block text-xs font-semibold text-slate-500 mb-1">Account Column (Optional)</label>
               <div className="flex gap-4">
                 <select 
                   value={mapping.account || ''}
                   onChange={(e) => setMapping({...mapping, account: e.target.value})}
                   className="flex-1 px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white"
                 >
                   <option value="">(Use Default Name)</option>
                   {headers.map(h => <option key={h} value={h}>{h}</option>)}
                 </select>
                 <input 
                    type="text"
                    value={accountName}
                    onChange={(e) => setAccountName(e.target.value)}
                    placeholder="Default Name"
                    className="flex-1 px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white"
                    disabled={!!mapping.account}
                 />
               </div>
               <p className="text-[10px] text-slate-400 mt-1">
                 If "Account Column" is selected, the Default Name will be ignored.
               </p>
             </div>
          </div>
        </div>

        <div className="flex justify-end space-x-3">
          <button 
            onClick={cancelUpload}
            className="px-4 py-2 text-slate-600 font-medium hover:bg-slate-200 rounded-lg transition-colors"
          >
            Cancel
          </button>
          <button 
            onClick={handleConfirmImport}
            disabled={!mapping.date || !mapping.amount || isLoading}
            className="flex items-center px-6 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Upload className="w-4 h-4 mr-2" />}
            Import Transactions
          </button>
        </div>
        {error && (
            <div className="mt-4 p-3 bg-red-50 text-red-600 rounded-lg flex items-center text-sm">
              <AlertCircle className="w-4 h-4 mr-2 flex-shrink-0" />
              {error}
            </div>
        )}
      </div>
    );
  }

  return (
    <div className="w-full max-w-2xl mx-auto p-6">
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
              {isLoading ? 'Processing...' : 'Upload your Excel File'}
            </h3>
            <p className="text-slate-500 max-w-sm mx-auto">
              Drag and drop your .xlsx or .csv file here. You will be able to map columns in the next step.
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
                <ArrowRight className="w-4 h-4 mr-2" />
                Select File to Begin
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