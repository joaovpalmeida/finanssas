import React, { useCallback, useState } from 'react';
import { Upload, FileSpreadsheet, Loader2, AlertCircle, ArrowRight, Settings, Layers, ChevronRight, ArrowLeft, Table, Calendar, Columns, ListFilter, ArrowDownToLine, ArrowUpFromLine } from 'lucide-react';
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
  
  const [amountMode, setAmountMode] = useState<'single' | 'split'>('single');
  
  const [mapping, setMapping] = useState<ColumnMapping>({
    date: '',
    description: '',
    amount: '',
    income: '',
    expense: '',
    category: '',
    incomeDescription: '',
    expenseDescription: '',
    incomeCategory: '',
    expenseCategory: '',
    startRow: 2,
    endRow: undefined,
    incomeStartRow: 2,
    incomeEndRow: undefined,
    expenseStartRow: 2,
    expenseEndRow: undefined
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
      if (!cols) return '';
      const match = cols.find(c => c.header && regex.test(c.header));
      return match ? String(match.index) : '';
    };

    const mapping = {
      date: findIndex(/date/i),
      description: findIndex(/description|desc|name/i),
      amount: findIndex(/amount|value|cost/i),
      income: findIndex(/income|credit|deposit/i),
      expense: findIndex(/expense|debit|withdrawal/i),
      category: findIndex(/category|type/i),
      account: findIndex(/account|bank|source/i),
      startRow: 2,
      incomeStartRow: 2,
      expenseStartRow: 2
    };
    return mapping;
  };

  const loadSheetColumns = async (fileToLoad: File, sheetName: string) => {
    try {
      const cols = await getExcelColumns(fileToLoad, sheetName);
      setColumns(cols);
      const guessed = guessMapping(cols);
      setMapping(prev => ({...prev, ...guessed}));
      
      // Auto-detect mode if income/expense columns seem to exist
      if (!guessed.amount && (guessed.income || guessed.expense)) {
        setAmountMode('split');
      } else {
        setAmountMode('single');
      }

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
    const isValid = amountMode === 'single' 
      ? !!mapping.amount 
      : (!!mapping.income || !!mapping.expense);

    if (file && isValid && (mapping.date || defaultDate)) {
      onUpload(file, accountName, mapping, selectedSheet, defaultDate);
    }
  };

  const cancelUpload = () => {
    setStep('upload');
    setFile(null);
    setColumns([]);
    setSheets([]);
    setMapping({ date: '', description: '', amount: '', income: '', expense: '', category: '', startRow: 2, incomeStartRow: 2, expenseStartRow: 2 });
  };

  // Render Helpers
  const renderColumnSelect = (
    label: string, 
    value: string | undefined, 
    onChange: (val: string) => void,
    required = false,
    helperText?: string
  ) => (
    <div>
      <label className="block text-xs font-semibold text-slate-500 mb-1">
        {label} {required && '*'}
      </label>
      <select 
        value={value || ''}
        onChange={(e) => onChange(e.target.value)}
        className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white text-sm"
      >
        <option value="">{required ? 'Select Column...' : '(None / Use Default)'}</option>
        {columns.map(col => (
          <option key={col.index} value={col.index}>
            Column {col.letter} {col.header ? `— ${col.header}` : ''}
          </option>
        ))}
      </select>
      {helperText && <p className="text-[10px] text-slate-400 mt-1">{helperText}</p>}
    </div>
  );

  // Row Range Input Helper
  const renderRowInput = (label: string, value: number | undefined, onChange: (val: number) => void, placeholder?: string) => (
    <div>
       <label className="block text-xs font-semibold text-slate-500 mb-1">{label}</label>
       <input 
         type="number"
         min="1"
         placeholder={placeholder}
         value={value || ''}
         onChange={(e) => onChange(parseInt(e.target.value))}
         className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white text-sm"
       />
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
        
        {/* Column Mode Toggle */}
        <div className="mb-6 bg-white p-1 rounded-lg border border-slate-200 inline-flex">
           <button
             onClick={() => setAmountMode('single')}
             className={`px-3 py-1.5 text-xs font-medium rounded-md flex items-center transition-colors ${amountMode === 'single' ? 'bg-blue-50 text-blue-700 border border-blue-100' : 'text-slate-500 hover:text-slate-700'}`}
           >
             <Columns className="w-3 h-3 mr-1.5" /> Single Amount Column
           </button>
           <button
             onClick={() => setAmountMode('split')}
             className={`px-3 py-1.5 text-xs font-medium rounded-md flex items-center transition-colors ${amountMode === 'split' ? 'bg-blue-50 text-blue-700 border border-blue-100' : 'text-slate-500 hover:text-slate-700'}`}
           >
             <ArrowUpFromLine className="w-3 h-3 mr-1.5" /> Separate Income/Expense
           </button>
        </div>

        <div className="space-y-6 mb-8 h-96 overflow-y-auto pr-2 custom-scrollbar">
          
          {/* Section: Common Fields */}
          <div className="space-y-4">
              <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider border-b border-slate-100 pb-2">Common Fields</h4>
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
                </div>
                {amountMode === 'single' && (
                  <>
                    {renderColumnSelect("Description", mapping.description, v => setMapping({...mapping, description: v}))}
                    {renderColumnSelect("Category", mapping.category, v => setMapping({...mapping, category: v}))}
                  </>
                )}
              </div>
          </div>

          {/* Section: Amounts & Specifics */}
          <div className="space-y-4">
             <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider border-b border-slate-100 pb-2">Transaction Values & Row Ranges</h4>
             
             {amountMode === 'single' ? (
                <>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                     {renderColumnSelect("Amount Column", mapping.amount, v => setMapping({...mapping, amount: v}), true)}
                  </div>
                  
                  {/* Global Row Selection for Single Mode */}
                  <div className="grid grid-cols-2 gap-4 bg-slate-50 p-3 rounded-lg border border-slate-100 mt-2">
                     {renderRowInput("Start Row", mapping.startRow, v => setMapping({...mapping, startRow: v}))}
                     {renderRowInput("End Row (Optional)", mapping.endRow, v => setMapping({...mapping, endRow: v}), "End of file")}
                  </div>
                </>
             ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                   {/* Income Group */}
                   <div className="space-y-3 bg-emerald-50/50 p-4 rounded-lg border border-emerald-100">
                      <div className="flex items-center text-emerald-600 font-semibold text-sm mb-2">
                         <ArrowDownToLine className="w-4 h-4 mr-2" />
                         Income Settings
                      </div>
                      {renderColumnSelect("Income Amount Column", mapping.income, v => setMapping({...mapping, income: v}), !mapping.expense)}
                      {renderColumnSelect("Description (Optional)", mapping.incomeDescription, v => setMapping({...mapping, incomeDescription: v}), false, "Overrides default")}
                      {renderColumnSelect("Category (Optional)", mapping.incomeCategory, v => setMapping({...mapping, incomeCategory: v}), false, "Overrides default")}
                      
                      <div className="pt-2 border-t border-emerald-100/50">
                        <label className="text-[10px] font-bold text-emerald-500 uppercase">Income Rows</label>
                        <div className="grid grid-cols-2 gap-2 mt-1">
                          {renderRowInput("Start", mapping.incomeStartRow, v => setMapping({...mapping, incomeStartRow: v}))}
                          {renderRowInput("End", mapping.incomeEndRow, v => setMapping({...mapping, incomeEndRow: v}), "End")}
                        </div>
                      </div>
                   </div>
                   
                   {/* Expense Group */}
                   <div className="space-y-3 bg-red-50/50 p-4 rounded-lg border border-red-100">
                      <div className="flex items-center text-red-600 font-semibold text-sm mb-2">
                         <ArrowUpFromLine className="w-4 h-4 mr-2" />
                         Expense Settings
                      </div>
                      {renderColumnSelect("Expense Amount Column", mapping.expense, v => setMapping({...mapping, expense: v}), !mapping.income)}
                      {renderColumnSelect("Description (Optional)", mapping.expenseDescription, v => setMapping({...mapping, expenseDescription: v}), false, "Overrides default")}
                      {renderColumnSelect("Category (Optional)", mapping.expenseCategory, v => setMapping({...mapping, expenseCategory: v}), false, "Overrides default")}
                      
                      <div className="pt-2 border-t border-red-100/50">
                        <label className="text-[10px] font-bold text-red-500 uppercase">Expense Rows</label>
                        <div className="grid grid-cols-2 gap-2 mt-1">
                          {renderRowInput("Start", mapping.expenseStartRow, v => setMapping({...mapping, expenseStartRow: v}))}
                          {renderRowInput("End", mapping.expenseEndRow, v => setMapping({...mapping, expenseEndRow: v}), "End")}
                        </div>
                      </div>
                   </div>
                   
                   <p className="text-[10px] text-slate-400 md:col-span-2 text-center">
                     All valid expense amounts will be converted to negative values automatically.
                   </p>
                </div>
             )}

             {amountMode === 'split' && (
               <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-2 border-t border-slate-100 pt-3">
                  {renderColumnSelect("Default Description (Fallback)", mapping.description, v => setMapping({...mapping, description: v}), false)}
                  {renderColumnSelect("Default Category (Fallback)", mapping.category, v => setMapping({...mapping, category: v}), false)}
               </div>
             )}
          </div>

          {/* Section: Account */}
          <div className="space-y-4">
             <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider border-b border-slate-100 pb-2">Account Assignment</h4>
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
            disabled={
              (amountMode === 'single' && !mapping.amount) ||
              (amountMode === 'split' && !mapping.income && !mapping.expense) || 
              (!mapping.date && !defaultDate) || 
              isLoading
            }
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

  // Step 1: File Upload (Unchanged logic, just keeping structure)
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
