import React, { useCallback, useState } from 'react';
import { Upload, FileSpreadsheet, Loader2, AlertCircle, ArrowRight, Settings, Layers, ChevronRight, ArrowLeft, Table, Calendar } from 'lucide-react';
import { getExcelColumns, getExcelSheetNames, ColumnMapping, ExcelColumn } from '../utils/excelParser';

interface FileUploadProps {
  onUpload: (file: File, accountName: string, mapping: ColumnMapping, sheetName: string, defaultDate: string) => void;
  isLoading: boolean;
  error?: string | null;
}

export const FileUpload: React.FC<FileUploadProps> = ({ onUpload, isLoading, error }) => {
  const [isDragging, setIsDragging] = useState(false);
  const [accountName, setAccountName] = useState('Main Account');
  const [defaultDate, setDefaultDate] = useState(new Date().toISOString().split('T')[0]);
  
  const [step, setStep] = useState<'upload' | 'sheet-selection' | 'mapping'>('upload');
  
  const [file, setFile] = useState<File | null>(null);
  const [columns, setColumns] = useState<ExcelColumn[]>([]);
  const [sheets, setSheets] = useState<string[]>([]);
  const [selectedSheet, setSelectedSheet] = useState<string>('');
  
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

  const guessMapping = (cols: ExcelColumn[]): ColumnMapping => {
    const findIndex = (regex: RegExp) => {
      // Defensive check for undefined cols or headers
      if (!cols) return '';
      const match = cols.find(c => c.header && regex.test(c.header));
      return match ? String(match.index) : '';
    };

    return {
      date: findIndex(/date/i),
      description: findIndex(/description|desc|name/i),
      amount: findIndex(/amount|value|cost/i),
      category: findIndex(/category|type/i),
      account: findIndex(/account|bank|source/i)
    };
  };

  const loadSheetColumns = async (fileToLoad: File, sheetName: string) => {
    try {
      const cols = await getExcelColumns(fileToLoad, sheetName);
      setColumns(cols);
      setMapping(guessMapping(cols));
      setStep('mapping');
    } catch (e) {
      console.error("Failed to read sheet columns", e);
    }
  };

  const processFileSelection = async (selectedFile: File) => {
    try {
      const sheetNames = await getExcelSheetNames(selectedFile);
      setSheets(sheetNames);
      setFile(selectedFile);

      if (sheetNames.length > 1) {
        setSelectedSheet(sheetNames[0]);
        setStep('sheet-selection');
      } else {
        const singleSheet = sheetNames[0] || '';
        setSelectedSheet(singleSheet);
        await loadSheetColumns(selectedFile, singleSheet);
      }
    } catch (e) {
      console.error("Failed to read file", e);
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

  const handleSheetConfirm = async () => {
    if (file && selectedSheet) {
      await loadSheetColumns(file, selectedSheet);
    }
  };

  const handleConfirmImport = () => {
    if (file && mapping.amount && (mapping.date || defaultDate)) {
      onUpload(file, accountName, mapping, selectedSheet, defaultDate);
    }
  };

  const cancelUpload = () => {
    setStep('upload');
    setFile(null);
    setColumns([]);
    setSheets([]);
    setMapping({ date: '', description: '', amount: '', category: '' });
  };

  // Render Helpers
  const renderColumnSelect = (
    label: string, 
    value: string, 
    onChange: (val: string) => void,
    required = false
  ) => (
    <div>
      <label className="block text-xs font-semibold text-slate-500 mb-1">
        {label} {required && '*'}
      </label>
      <select 
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white text-sm"
      >
        <option value="">{required ? 'Select Column...' : '(None)'}</option>
        {columns.map(col => (
          <option key={col.index} value={col.index}>
            Column {col.letter} {col.header ? `— ${col.header}` : ''}
          </option>
        ))}
      </select>
    </div>
  );

  // Step 2: Sheet Selection
  if (step === 'sheet-selection') {
    return (
      <div className="w-full max-w-2xl mx-auto p-6 bg-slate-50 rounded-xl border border-slate-200 animate-fade-in">
        <h3 className="text-lg font-bold text-slate-800 mb-2 flex items-center">
          <Layers className="w-5 h-5 mr-2 text-blue-600" />
          Select Worksheet
        </h3>
        <p className="text-sm text-slate-500 mb-6">
          File: <strong>{file?.name}</strong> contains multiple sheets. Which one has the transaction data?
        </p>

        <div className="space-y-3 mb-8 max-h-60 overflow-y-auto">
          {sheets.map((sheet) => (
            <div 
              key={sheet}
              onClick={() => setSelectedSheet(sheet)}
              className={`
                flex items-center justify-between p-4 rounded-lg border cursor-pointer transition-all
                ${selectedSheet === sheet 
                  ? 'bg-white border-blue-500 shadow-md ring-1 ring-blue-500' 
                  : 'bg-white border-slate-200 hover:border-blue-300 hover:bg-slate-50'
                }
              `}
            >
              <div className="flex items-center space-x-3">
                <div className={`p-2 rounded-full ${selectedSheet === sheet ? 'bg-blue-100 text-blue-600' : 'bg-slate-100 text-slate-500'}`}>
                  <Table className="w-4 h-4" />
                </div>
                <span className={`font-medium ${selectedSheet === sheet ? 'text-slate-800' : 'text-slate-600'}`}>
                  {sheet}
                </span>
              </div>
              {selectedSheet === sheet && <div className="w-3 h-3 bg-blue-500 rounded-full" />}
            </div>
          ))}
        </div>

        <div className="flex justify-between pt-4 border-t border-slate-200">
           <button 
            onClick={cancelUpload}
            className="text-slate-500 hover:text-slate-700 font-medium text-sm px-4 py-2"
          >
            Cancel
          </button>
          <button 
            onClick={handleSheetConfirm}
            className="flex items-center px-6 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors shadow-sm"
          >
            Next: Map Columns <ChevronRight className="w-4 h-4 ml-1" />
          </button>
        </div>
      </div>
    );
  }

  // Step 3: Column Mapping
  if (step === 'mapping') {
    return (
      <div className="w-full max-w-2xl mx-auto p-6 bg-slate-50 rounded-xl border border-slate-200 animate-fade-in">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold text-slate-800 flex items-center">
            <Settings className="w-5 h-5 mr-2 text-blue-600" />
            Map Columns
          </h3>
          <span className="text-xs bg-slate-200 text-slate-600 px-2 py-1 rounded">
            Sheet: {selectedSheet}
          </span>
        </div>
        
        <p className="text-sm text-slate-500 mb-6">
          Match the Excel columns to the correct fields. 
        </p>

        <div className="space-y-4 mb-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
             {renderColumnSelect("Amount Column", mapping.amount, v => setMapping({...mapping, amount: v}), true)}
             {renderColumnSelect("Description Column", mapping.description, v => setMapping({...mapping, description: v}))}
             {renderColumnSelect("Category Column", mapping.category, v => setMapping({...mapping, category: v}))}
             
             {/* Date Logic - Mapped OR Default */}
             <div className="md:col-span-2 border-t border-slate-200 pt-4 mt-2">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {renderColumnSelect("Date Column", mapping.date, v => setMapping({...mapping, date: v}))}
                  
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 mb-1">
                      Default Date (Fallback)
                    </label>
                    <div className="relative">
                       <Calendar className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
                       <input 
                         type="date"
                         value={defaultDate}
                         onChange={(e) => setDefaultDate(e.target.value)}
                         className="w-full pl-9 pr-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white text-sm"
                       />
                    </div>
                    <p className="text-[10px] text-slate-400 mt-1">
                      Used if the Date Column is unmapped or a row has a missing date.
                    </p>
                  </div>
                </div>
             </div>

             <div className="md:col-span-2 border-t border-slate-200 pt-4 mt-2">
               <label className="block text-xs font-semibold text-slate-500 mb-1">Account Column (Optional)</label>
               <div className="flex gap-4">
                 <div className="flex-1">
                   <select 
                     value={mapping.account || ''}
                     onChange={(e) => setMapping({...mapping, account: e.target.value})}
                     className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white text-sm"
                   >
                     <option value="">(Use Default Name)</option>
                     {columns.map(col => (
                       <option key={col.index} value={col.index}>
                         Column {col.letter} {col.header ? `— ${col.header}` : ''}
                       </option>
                     ))}
                   </select>
                 </div>
                 <input 
                    type="text"
                    value={accountName}
                    onChange={(e) => setAccountName(e.target.value)}
                    placeholder="Default Name (e.g. Chase)"
                    className="flex-1 px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white text-sm"
                    disabled={!!mapping.account}
                 />
               </div>
             </div>
          </div>
        </div>

        <div className="flex justify-between pt-4 border-t border-slate-200">
           <button 
            onClick={() => {
              if (sheets.length > 1) setStep('sheet-selection');
              else cancelUpload();
            }}
            className="flex items-center text-slate-500 hover:text-slate-700 font-medium text-sm px-4 py-2"
          >
            <ArrowLeft className="w-4 h-4 mr-1" /> Back
          </button>
          <button 
            onClick={handleConfirmImport}
            disabled={!mapping.amount || (!mapping.date && !defaultDate) || isLoading}
            className="flex items-center px-6 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Upload className="w-4 h-4 mr-2" />}
            Import Data
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

  // Step 1: File Upload
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
              Drag and drop your .xlsx or .csv file here.
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
    </div>
  );
};