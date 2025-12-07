import React, { useState, useEffect, useRef } from 'react';
import { Download, Trash2, Settings, Tag, CreditCard, Edit2, Save, X, UploadCloud, AlertTriangle, Upload, Wand2, Key, PiggyBank, Plus, CalendarRange, Lock, Unlock, Hash, Calendar } from 'lucide-react';
import { SqlConsole } from './SqlConsole';
import { FileUpload } from './FileUpload';
import { getAccounts, getCategories, updateAccount, updateCategory, createCategory, deleteCategory, deleteAccount, getTransactionCount, generateDummyData, getApiKey, saveApiKey, createAccount, getFiscalConfig, saveFiscalConfig, isDatabaseEncrypted, setDatabasePassword, removeDatabasePassword, saveImportConfig } from '../services/db';
import { Account, Category, Transaction, FiscalConfig } from '../types';

interface AdminPageProps {
  onBackup: () => void;
  onReset: () => void;
  onRefresh: () => void;
  onUpload: (data: Transaction[]) => void;
  onRestore: (file: File) => void;
  isUploading: boolean;
  uploadError: string | null;
  decimalSeparator: '.' | ',';
  dateFormat: string;
}

export const AdminPage: React.FC<AdminPageProps> = ({ 
  onBackup, 
  onReset, 
  onRefresh, 
  onUpload,
  onRestore, 
  isUploading, 
  uploadError,
  decimalSeparator,
  dateFormat
}) => {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [showImport, setShowImport] = useState(false);
  const [dbCount, setDbCount] = useState(0);
  const [generating, setGenerating] = useState(false);
  const [isEncrypted, setIsEncrypted] = useState(false);
  const [securityPass, setSecurityPass] = useState('');
  
  // API Key State
  const [apiKey, setApiKey] = useState('');
  const [isKeySaved, setIsKeySaved] = useState(false);

  // Fiscal Config State
  const [fiscalConfig, setFiscalConfig] = useState<FiscalConfig>({ mode: 'calendar' });

  const restoreInputRef = useRef<HTMLInputElement>(null);

  const refreshData = async () => {
    setAccounts(getAccounts());
    setCategories(getCategories());
    setDbCount(getTransactionCount());
    setFiscalConfig(getFiscalConfig());
    setIsEncrypted(await isDatabaseEncrypted());
    
    const key = getApiKey();
    if (key) {
        setApiKey(key);
        setIsKeySaved(true);
    }

    onRefresh();
  };

  useEffect(() => {
    refreshData();
  }, []);

  const handleRestoreClick = () => {
    restoreInputRef.current?.click();
  };

  const handleRestoreFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      onRestore(e.target.files[0]);
      e.target.value = ''; // Reset input so same file can be selected again
    }
  };

  const handleGenerateData = async () => {
    setGenerating(true);
    try {
      await generateDummyData();
      refreshData();
      alert("Dummy data generated successfully!");
    } catch (e) {
      console.error(e);
      alert("Failed to generate data.");
    } finally {
      setGenerating(false);
    }
  };

  const handleSaveApiKey = async () => {
    if (!apiKey.trim()) return;
    try {
        await saveApiKey(apiKey);
        setIsKeySaved(true);
        alert("API Key saved successfully.");
    } catch (e) {
        console.error(e);
        alert("Failed to save API Key");
    }
  };

  const handleSaveFiscalConfig = async () => {
      try {
          await saveFiscalConfig(fiscalConfig);
          alert("Fiscal period configuration saved.");
      } catch (e) {
          alert("Failed to save config.");
      }
  };

  const handleUpdateDecimalSeparator = async (val: '.' | ',') => {
      try {
          await saveImportConfig({ decimalSeparator: val });
          refreshData(); // Triggers app refresh which updates global state
      } catch (e) {
          alert("Failed to save setting");
      }
  };

  const handleUpdateDateFormat = async (val: string) => {
      try {
          await saveImportConfig({ dateFormat: val });
          refreshData(); // Triggers app refresh which updates global state
      } catch (e) {
          alert("Failed to save setting");
      }
  };

  const handleCreateAccount = async (name: string, isSavings: boolean) => {
    if (!name.trim()) return;
    try {
        await createAccount(name.trim(), isSavings);
        refreshData();
    } catch (e: any) {
        alert("Failed to create account: " + e.message);
    }
  };

  const handleCreateCategory = async (name: string, type: string, group: string) => {
      if (!name.trim()) return;
      try {
          await createCategory(name.trim(), type, group);
          refreshData();
      } catch (e: any) {
          alert("Failed to create category: " + e.message);
      }
  };

  const handleToggleEncryption = async () => {
      if (isEncrypted) {
          if (confirm("Are you sure you want to remove password protection? The database will be stored unencrypted.")) {
              await removeDatabasePassword();
              setIsEncrypted(false);
              setSecurityPass('');
          }
      } else {
          if (!securityPass) {
              alert("Please enter a password to enable encryption.");
              return;
          }
          await setDatabasePassword(securityPass);
          setIsEncrypted(true);
          setSecurityPass('');
          alert("Encryption enabled. You will be asked for this password next time you load the app.");
      }
  };

  return (
    <div className="space-y-8 animate-fade-in">
      
      {/* Import Section */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="p-6 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center space-x-3">
             <div className="p-2 bg-blue-100 rounded-lg">
                <UploadCloud className="w-6 h-6 text-blue-600" />
             </div>
             <div>
                <h2 className="text-xl font-bold text-slate-800">Data Import</h2>
                <p className="text-slate-500 text-sm">Upload Excel or CSV files to add transactions</p>
             </div>
          </div>
          <button 
            onClick={() => setShowImport(!showImport)}
            className="text-sm font-medium text-blue-600 hover:text-blue-700"
          >
            {showImport ? 'Hide Import Tool' : 'Show Import Tool'}
          </button>
        </div>
        
        {showImport && (
           <div className="p-6 bg-slate-50">
              <FileUpload 
                onUpload={onUpload}
                isLoading={isUploading}
                error={uploadError}
                categories={categories}
                accounts={accounts}
                defaultDateFormat={dateFormat}
                defaultDecimalSeparator={decimalSeparator}
              />
           </div>
        )}
      </div>

      {/* Configuration Section */}
      <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100">
        <div className="flex items-center space-x-3 mb-6 border-b border-slate-100 pb-4">
          <div className="p-2 bg-slate-100 rounded-lg">
            <Settings className="w-6 h-6 text-slate-700" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-slate-800">System Administration</h2>
            <p className="text-slate-500 text-sm">Manage your local database and application settings</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          
           {/* Security Config */}
           <div className={`p-5 border rounded-xl transition-all col-span-1 md:col-span-2 lg:col-span-2 flex flex-col ${isEncrypted ? 'border-emerald-200 bg-emerald-50/50' : 'border-slate-200 bg-slate-50/50'}`}>
                <h3 className={`font-semibold flex items-center mb-2 ${isEncrypted ? 'text-emerald-800' : 'text-slate-800'}`}>
                    {isEncrypted ? <Lock className="w-4 h-4 mr-2 text-emerald-600" /> : <Unlock className="w-4 h-4 mr-2 text-slate-600" />}
                    Database Security
                </h3>
                <p className={`text-sm mb-4 flex-grow ${isEncrypted ? 'text-emerald-700' : 'text-slate-600'}`}>
                    {isEncrypted 
                        ? "Database is encrypted at rest. A password is required to load the app." 
                        : "Database is stored unencrypted in the browser. Anyone with access to this device can read it."}
                </p>
                
                {!isEncrypted && (
                    <input 
                        type="password"
                        placeholder="Set new password..."
                        className="mb-3 px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm w-full"
                        value={securityPass}
                        onChange={(e) => setSecurityPass(e.target.value)}
                    />
                )}

                <button 
                    onClick={handleToggleEncryption}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors w-full border shadow-sm ${
                        isEncrypted 
                        ? 'bg-white text-red-600 border-red-200 hover:bg-red-50' 
                        : 'bg-white text-blue-600 border-blue-200 hover:bg-blue-50'
                    }`}
                >
                    {isEncrypted ? 'Remove Encryption' : 'Enable Encryption'}
                </button>
           </div>

           {/* API Key Config */}
           <div className="p-5 border border-purple-200 rounded-xl bg-purple-50/50 hover:border-purple-300 transition-all col-span-1 md:col-span-2 lg:col-span-2 flex flex-col">
                <div className="max-w-3xl">
                  <h3 className="font-semibold text-purple-800 flex items-center mb-2">
                    <Key className="w-4 h-4 mr-2 text-purple-600" />
                    Google Gemini API
                  </h3>
                  <p className="text-sm text-purple-600/70 mb-4">
                    Enable AI Insights and Chat. Stored locally.
                  </p>
                  <div className="flex space-x-2">
                      <input 
                        type="password"
                        value={apiKey}
                        onChange={(e) => setApiKey(e.target.value)}
                        placeholder="Enter Google API Key..."
                        className="flex-1 px-3 py-2 border border-purple-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 bg-white text-slate-800 text-base sm:text-sm"
                      />
                      <button 
                        onClick={handleSaveApiKey}
                        className="px-4 py-2 bg-purple-600 text-white rounded-lg text-sm font-medium hover:bg-purple-700 transition-colors"
                      >
                        {isKeySaved ? 'Update' : 'Save'}
                      </button>
                  </div>
                  {isKeySaved && (
                      <p className="text-xs text-emerald-600 mt-2 flex items-center">
                          <span className="w-2 h-2 bg-emerald-500 rounded-full mr-1.5"></span>
                          Key is configured
                      </p>
                  )}
                </div>
           </div>
           
           {/* Fiscal Period Config */}
           <div className="p-5 border border-orange-200 rounded-xl bg-orange-50/50 hover:border-orange-300 transition-all col-span-1 md:col-span-2 lg:col-span-4 flex flex-col">
               <h3 className="font-semibold text-orange-800 flex items-center mb-3">
                   <CalendarRange className="w-4 h-4 mr-2 text-orange-600" />
                   Fiscal Period Settings
               </h3>
               <div className="flex flex-col md:flex-row gap-6">
                   <div className="flex-1 space-y-3">
                       <label className="flex items-center space-x-2 cursor-pointer">
                           <input 
                               type="radio" 
                               name="fiscalMode"
                               checked={fiscalConfig.mode === 'calendar'}
                               onChange={() => setFiscalConfig({ ...fiscalConfig, mode: 'calendar' })}
                               className="w-4 h-4 text-orange-600 focus:ring-orange-500 bg-white border-gray-300"
                               style={{ colorScheme: 'light' }}
                           />
                           <span className="text-sm text-slate-700">Calendar Month (Default, 1st - 31st)</span>
                       </label>
                       
                       <label className="flex items-center space-x-2 cursor-pointer">
                           <input 
                               type="radio" 
                               name="fiscalMode"
                               checked={fiscalConfig.mode === 'fixed_day'}
                               onChange={() => setFiscalConfig({ ...fiscalConfig, mode: 'fixed_day', startDay: fiscalConfig.startDay || 25 })}
                               className="w-4 h-4 text-orange-600 focus:ring-orange-500 bg-white border-gray-300"
                               style={{ colorScheme: 'light' }}
                           />
                           <span className="text-sm text-slate-700">Specific Start Day</span>
                       </label>
                       {fiscalConfig.mode === 'fixed_day' && (
                           <div className="ml-6">
                               <input 
                                   type="number" 
                                   min="1" max="31"
                                   value={fiscalConfig.startDay || ''}
                                   onChange={(e) => setFiscalConfig({ ...fiscalConfig, startDay: parseInt(e.target.value) })}
                                   className="w-20 px-2 py-1 text-sm border border-orange-200 rounded bg-white"
                                   placeholder="Day"
                               />
                               <span className="text-xs text-slate-500 ml-2">of every month</span>
                           </div>
                       )}

                       <label className="flex items-center space-x-2 cursor-pointer">
                           <input 
                               type="radio" 
                               name="fiscalMode"
                               checked={fiscalConfig.mode === 'income_trigger'}
                               onChange={() => setFiscalConfig({ ...fiscalConfig, mode: 'income_trigger' })}
                               className="w-4 h-4 text-orange-600 focus:ring-orange-500 bg-white border-gray-300"
                               style={{ colorScheme: 'light' }}
                           />
                           <span className="text-sm text-slate-700">Transaction Trigger (e.g. Salary)</span>
                       </label>
                       {fiscalConfig.mode === 'income_trigger' && (
                           <div className="ml-6">
                               <select
                                   value={fiscalConfig.triggerCategory || ''}
                                   onChange={(e) => setFiscalConfig({ ...fiscalConfig, triggerCategory: e.target.value })}
                                   className="w-full max-w-xs px-2 py-1 text-sm border border-orange-200 rounded bg-white"
                               >
                                   <option value="">Select Category...</option>
                                   {categories.filter(c => c.type === 'Income').map(c => (
                                       <option key={c.id} value={c.name}>{c.name}</option>
                                   ))}
                               </select>
                           </div>
                       )}
                   </div>
                   <div className="flex items-end">
                       <button 
                           onClick={handleSaveFiscalConfig}
                           className="px-4 py-2 bg-orange-600 text-white rounded-lg text-sm font-medium hover:bg-orange-700 transition-colors shadow-sm"
                       >
                           Save Configuration
                       </button>
                   </div>
               </div>
           </div>

           {/* Number Formatting Config */}
           <div className="p-5 border border-cyan-200 rounded-xl bg-cyan-50/50 hover:border-cyan-300 transition-all col-span-1 md:col-span-2 lg:col-span-2 flex flex-col">
               <h3 className="font-semibold text-cyan-800 flex items-center mb-3">
                   <Hash className="w-4 h-4 mr-2 text-cyan-600" />
                   Number Format
               </h3>
               <p className="text-sm text-cyan-700/80 mb-4">
                   Choose how currency amounts are displayed and entered.
               </p>
               <div className="flex gap-4 mb-4">
                   <label className="flex items-center space-x-2 cursor-pointer flex-1 p-3 bg-white border rounded-lg hover:border-cyan-400 transition-colors">
                       <input 
                           type="radio" 
                           name="decimalSep"
                           checked={decimalSeparator === '.'}
                           onChange={() => handleUpdateDecimalSeparator('.')}
                           className="w-4 h-4 text-cyan-600 focus:ring-cyan-500"
                           style={{ colorScheme: 'light' }}
                       />
                       <div>
                           <div className="font-bold text-slate-800">1,234.56</div>
                           <div className="text-xs text-slate-500">Dot Decimal</div>
                       </div>
                   </label>
                   <label className="flex items-center space-x-2 cursor-pointer flex-1 p-3 bg-white border rounded-lg hover:border-cyan-400 transition-colors">
                       <input 
                           type="radio" 
                           name="decimalSep"
                           checked={decimalSeparator === ','}
                           onChange={() => handleUpdateDecimalSeparator(',')}
                           className="w-4 h-4 text-cyan-600 focus:ring-cyan-500"
                           style={{ colorScheme: 'light' }}
                       />
                       <div>
                           <div className="font-bold text-slate-800">1.234,56</div>
                           <div className="text-xs text-slate-500">Comma Decimal</div>
                       </div>
                   </label>
               </div>
           </div>

           {/* Date Formatting Config */}
           <div className="p-5 border border-blue-200 rounded-xl bg-blue-50/50 hover:border-blue-300 transition-all col-span-1 md:col-span-2 lg:col-span-2 flex flex-col">
               <h3 className="font-semibold text-blue-800 flex items-center mb-3">
                   <Calendar className="w-4 h-4 mr-2 text-blue-600" />
                   Date Format
               </h3>
               <p className="text-sm text-blue-700/80 mb-4">
                   System-wide date display format.
               </p>
               <div className="space-y-2">
                   {['DD/MM/YYYY', 'MM/DD/YYYY', 'YYYY-MM-DD'].map(fmt => (
                       <label key={fmt} className="flex items-center space-x-2 cursor-pointer p-2 bg-white border rounded-lg hover:border-blue-400 transition-colors">
                           <input 
                               type="radio" 
                               name="dateFmt"
                               checked={dateFormat === fmt}
                               onChange={() => handleUpdateDateFormat(fmt)}
                               className="w-4 h-4 text-blue-600 focus:ring-blue-500"
                               style={{ colorScheme: 'light' }}
                           />
                           <span className="text-sm font-medium text-slate-700">{fmt}</span>
                       </label>
                   ))}
               </div>
           </div>

          {/* Generate Dummy Data */}
          {dbCount === 0 && (
             <div className="p-5 border border-indigo-200 rounded-xl bg-indigo-50/50 hover:border-indigo-300 transition-all flex flex-col h-full">
                <h3 className="font-semibold text-indigo-800 flex items-center mb-2">
                  <Wand2 className="w-4 h-4 mr-2 text-indigo-600" />
                  Demo Mode
                </h3>
                <p className="text-sm text-indigo-600/70 mb-4 flex-grow">
                  Database is empty. Generate sample data to test features.
                </p>
                <button 
                  onClick={handleGenerateData}
                  disabled={generating}
                  className="mt-auto px-4 py-2 bg-white border border-indigo-200 shadow-sm text-indigo-700 rounded-lg text-sm font-medium hover:bg-indigo-50 transition-colors w-full disabled:opacity-50"
                >
                  {generating ? 'Generating...' : 'Populate Dummy Data'}
                </button>
             </div>
          )}

          {/* Backup */}
          <div className="p-5 border border-slate-200 rounded-xl bg-slate-50/50 hover:border-blue-300 transition-all flex flex-col h-full">
            <h3 className="font-semibold text-slate-800 flex items-center mb-2">
              <Download className="w-4 h-4 mr-2 text-blue-600" />
              Backup Data
            </h3>
            <p className="text-sm text-slate-500 mb-4 flex-grow">
              Download your entire database as a SQLite file. Safe for external storage.
            </p>
            <button 
              onClick={onBackup}
              className="mt-auto px-4 py-2 bg-white border border-slate-300 shadow-sm text-slate-700 rounded-lg text-sm font-medium hover:bg-slate-50 hover:text-blue-600 transition-colors w-full"
            >
              Download Backup
            </button>
          </div>

          {/* Restore */}
          <div className="p-5 border border-slate-200 rounded-xl bg-slate-50/50 hover:border-emerald-300 transition-all flex flex-col h-full">
            <h3 className="font-semibold text-slate-800 flex items-center mb-2">
              <Upload className="w-4 h-4 mr-2 text-emerald-600" />
              Restore Database
            </h3>
            <p className="text-sm text-slate-500 mb-4 flex-grow">
              Load a previously saved .sqlite file. <span className="text-red-500 font-medium">Overwrites data.</span>
            </p>
            <input 
              type="file" 
              ref={restoreInputRef} 
              className="hidden" 
              accept=".sqlite,.db" 
              onChange={handleRestoreFileChange} 
            />
            <button 
              onClick={handleRestoreClick}
              disabled={isUploading}
              className="mt-auto px-4 py-2 bg-white border border-slate-300 shadow-sm text-slate-700 rounded-lg text-sm font-medium hover:bg-slate-50 hover:text-emerald-600 transition-colors w-full"
            >
              Select File to Restore
            </button>
          </div>

          {/* Reset */}
          <div className="p-5 border border-red-100 rounded-xl bg-red-50/30 hover:border-red-200 transition-all flex flex-col h-full">
            <h3 className="font-semibold text-red-700 flex items-center mb-2">
              <Trash2 className="w-4 h-4 mr-2" />
              Factory Reset
            </h3>
            <p className="text-sm text-red-600/70 mb-4 flex-grow">
              Permanently delete all transactions and reset the local database.
            </p>
            <button 
              onClick={() => { onReset(); setTimeout(refreshData, 500); }}
              className="mt-auto px-4 py-2 bg-white border border-red-200 shadow-sm text-red-600 rounded-lg text-sm font-medium hover:bg-red-50 transition-colors w-full"
            >
              Delete All Data
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Account Config */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100 flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-2">
              <CreditCard className="w-5 h-5 text-blue-500" />
              <h3 className="font-bold text-slate-800">Accounts</h3>
            </div>
          </div>
          
          <AccountList 
            accounts={accounts} 
            onCreate={handleCreateAccount}
            onUpdate={async (id, neo, isSavings) => { await updateAccount(id, neo, isSavings); refreshData(); }}
            onDelete={async (id) => { 
               try {
                   await deleteAccount(id); 
                   refreshData();
               } catch (e: any) {
                   alert(e.message);
               }
            }} 
          />
        </div>

        {/* Category Config */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100 flex flex-col">
          <div className="flex items-center space-x-2 mb-4">
            <Tag className="w-5 h-5 text-emerald-500" />
            <h3 className="font-bold text-slate-800">Categories</h3>
          </div>
          <CategoryList 
             categories={categories} 
             onCreate={handleCreateCategory}
             onUpdate={async (id, neo, type, group) => { await updateCategory(id, neo, type, group); refreshData(); }}
             onDelete={async (id) => { 
               try {
                   await deleteCategory(id); 
                   refreshData();
               } catch (e: any) {
                   alert(e.message);
               }
             }}
          />
        </div>
      </div>

      {/* SQL Console embedded */}
      <SqlConsole />
    </div>
  );
};

// --- Sub Components ---

const AccountList: React.FC<{ 
    accounts: Account[], 
    onCreate: (name: string, isSavings: boolean) => Promise<void>,
    onUpdate: (id: string, neo: string, isSavings: boolean) => Promise<void>,
    onDelete: (id: string) => Promise<void>
}> = ({ accounts, onCreate, onUpdate, onDelete }) => {
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');
  const [editIsSavings, setEditIsSavings] = useState(false);
  
  // New account state
  const [newAccName, setNewAccName] = useState('');
  const [newAccIsSavings, setNewAccIsSavings] = useState(false);

  const handleStartEdit = (acc: Account) => {
    setEditingItemId(acc.id);
    setEditValue(acc.name);
    setEditIsSavings(acc.isSavings);
  };

  const handleSave = async () => {
    if (editingItemId && editValue && editValue.trim() !== '') {
      await onUpdate(editingItemId, editValue, editIsSavings);
    }
    setEditingItemId(null);
  };

  const handleCreate = async () => {
    if (newAccName.trim() !== '') {
        await onCreate(newAccName, newAccIsSavings);
        setNewAccName('');
        setNewAccIsSavings(false);
    }
  };

  return (
     <div className="flex-1 flex flex-col min-h-0">
        {/* Create Form */}
        <div className="mb-4 bg-slate-50 p-3 rounded-lg border border-slate-100">
           <div className="flex items-center space-x-2">
             <input 
                className="flex-1 px-3 py-2 border rounded-lg text-sm bg-white text-slate-800 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                value={newAccName}
                onChange={e => setNewAccName(e.target.value)}
                placeholder="Create new account..."
             />
             <button
                onClick={() => setNewAccIsSavings(!newAccIsSavings)}
                className={`p-2 rounded-lg transition-colors border ${newAccIsSavings ? 'bg-indigo-100 border-indigo-200 text-indigo-700' : 'bg-white border-slate-200 text-slate-400 hover:text-slate-600'}`}
                title={newAccIsSavings ? "Is Savings Account" : "Not Savings Account"}
             >
                <PiggyBank className="w-5 h-5" />
             </button>
             <button 
                onClick={handleCreate}
                disabled={!newAccName.trim()}
                className="p-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
             >
                <Plus className="w-5 h-5" />
             </button>
           </div>
        </div>

        {/* List */}
        <div className="flex-1 border border-slate-100 rounded-lg overflow-hidden bg-slate-50 max-h-96 overflow-y-auto">
            <ul className="divide-y divide-slate-100">
            {accounts.map((acc) => (
                <li key={acc.id} className="bg-white px-4 py-3 flex items-center justify-between hover:bg-slate-50 group">
                {editingItemId === acc.id ? (
                    <div className="flex items-center w-full space-x-2">
                        <input 
                            className="flex-1 px-2 py-1 border rounded text-base sm:text-sm bg-white text-slate-800"
                            value={editValue}
                            onChange={e => setEditValue(e.target.value)}
                        />
                         <button
                            onClick={() => setEditIsSavings(!editIsSavings)}
                            className={`p-1 rounded transition-colors ${editIsSavings ? 'text-indigo-600 bg-indigo-50' : 'text-slate-400 bg-slate-100'}`}
                         >
                            <PiggyBank className="w-4 h-4" />
                         </button>
                        <button onClick={handleSave} className="text-emerald-600"><Save className="w-4 h-4" /></button>
                        <button onClick={() => setEditingItemId(null)} className="text-slate-400"><X className="w-4 h-4" /></button>
                    </div>
                ) : (
                    <>
                    <div className="flex items-center space-x-2">
                        {acc.isSavings ? (
                            <PiggyBank className="w-4 h-4 text-indigo-500" />
                        ) : (
                            <CreditCard className="w-4 h-4 text-slate-400" />
                        )}
                        <span className="text-sm font-medium text-slate-700">{acc.name}</span>
                    </div>
                    <div className="flex items-center space-x-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={() => handleStartEdit(acc)} className="text-slate-400 hover:text-blue-600" title="Rename">
                            <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button onClick={() => onDelete(acc.id)} className="text-slate-400 hover:text-red-600" title="Delete">
                            <Trash2 className="w-3.5 h-3.5" />
                        </button>
                    </div>
                    </>
                )}
                </li>
            ))}
            {accounts.length === 0 && <li className="p-4 text-center text-slate-400 text-sm">No accounts found</li>}
            </ul>
        </div>
     </div>
  )
}

const CategoryList: React.FC<{ 
  categories: Category[], 
  onCreate: (name: string, type: string, group: string) => Promise<void>,
  onUpdate: (id: string, neo: string, type: string, group: string) => Promise<void>,
  onDelete: (id: string) => Promise<void>
}> = ({ categories, onCreate, onUpdate, onDelete }) => {
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [formData, setFormData] = useState({ name: '', type: 'Expense', group: 'General' });
  
  // New Category State
  const [newName, setNewName] = useState('');
  const [newType, setNewType] = useState('Expense');
  const [newGroup, setNewGroup] = useState('General');

  const handleStartEdit = (cat: Category) => {
    setEditingItemId(cat.id);
    setFormData({ name: cat.name, type: cat.type, group: cat.group });
  };

  const handleSave = async () => {
    if (editingItemId && formData.name) {
      await onUpdate(editingItemId, formData.name, formData.type, formData.group);
    }
    setEditingItemId(null);
  };

  const handleCreate = async () => {
      if (newName.trim()) {
          await onCreate(newName, newType, newGroup);
          setNewName('');
          // Keep type/group selections for easy multi-add
      }
  };

  const renderCategoryItem = (cat: Category) => (
    <li key={cat.id} className="bg-white px-4 py-3 hover:bg-slate-50 group border-b border-slate-50 last:border-b-0">
        {editingItemId === cat.id ? (
            <div className="space-y-2">
            <div className="flex items-center space-x-2">
                <input 
                className="flex-1 px-2 py-1 border rounded text-base sm:text-sm bg-white text-slate-800"
                value={formData.name}
                onChange={e => setFormData({...formData, name: e.target.value})}
                />
                <button onClick={handleSave} className="text-emerald-600"><Save className="w-4 h-4" /></button>
                <button onClick={() => setEditingItemId(null)} className="text-slate-400"><X className="w-4 h-4" /></button>
            </div>
            <div className="flex space-x-2">
                <select 
                className="flex-1 text-xs border rounded p-1 bg-white text-slate-800"
                value={formData.type}
                onChange={e => setFormData({...formData, type: e.target.value})}
                >
                    <option value="Expense">Expense</option>
                    <option value="Income">Income</option>
                    <option value="Balance">Balance</option>
                </select>
                <select 
                className="flex-1 text-xs border rounded p-1 bg-white text-slate-800"
                value={formData.group}
                onChange={e => setFormData({...formData, group: e.target.value})}
                >
                    <option value="General">General</option>
                    <option value="Recurring">Recurring</option>
                </select>
            </div>
            </div>
        ) : (
            <div className="flex justify-between items-center">
            <div>
                <span className="text-sm font-medium text-slate-700 block">{cat.name}</span>
                <div className="flex items-center space-x-2 mt-0.5">
                <span className="text-[10px] bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded">
                    {cat.group}
                </span>
                </div>
            </div>
            <div className="flex items-center space-x-2 opacity-0 group-hover:opacity-100 transition-opacity">
                <button onClick={() => handleStartEdit(cat)} className="text-slate-400 hover:text-blue-600" title="Edit">
                    <Edit2 className="w-3.5 h-3.5" />
                </button>
                <button onClick={() => onDelete(cat.id)} className="text-slate-400 hover:text-red-600" title="Delete">
                    <Trash2 className="w-3.5 h-3.5" />
                </button>
            </div>
            </div>
        )}
    </li>
  );

  const incomeCategories = categories.filter(c => c.type === 'Income');
  const expenseCategories = categories.filter(c => c.type === 'Expense');
  const balanceCategories = categories.filter(c => c.type === 'Balance');

  return (
     <div className="flex-1 flex flex-col min-h-0">
        {/* Create Form */}
        <div className="mb-4 bg-slate-50 p-3 rounded-lg border border-slate-100">
           <div className="flex items-center space-x-2">
             <input 
                className="flex-1 px-3 py-2 border rounded-lg text-sm bg-white text-slate-800 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                value={newName}
                onChange={e => setNewName(e.target.value)}
                placeholder="New category..."
             />
             <select 
                className="w-24 text-xs border rounded-lg px-2 py-2 bg-white text-slate-800 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                value={newType}
                onChange={e => setNewType(e.target.value)}
             >
                <option value="Expense">Expense</option>
                <option value="Income">Income</option>
                <option value="Balance">Balance</option>
             </select>
             <select 
                className="w-24 text-xs border rounded-lg px-2 py-2 bg-white text-slate-800 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                value={newGroup}
                onChange={e => setNewGroup(e.target.value)}
             >
                <option value="General">General</option>
                <option value="Recurring">Recur.</option>
             </select>
             <button 
                onClick={handleCreate}
                disabled={!newName.trim()}
                className="p-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
             >
                <Plus className="w-5 h-5" />
             </button>
           </div>
        </div>

        <div className="flex-1 border border-slate-100 rounded-lg overflow-hidden bg-slate-50 max-h-96 overflow-y-auto">
            <div className="sticky top-0 z-10 bg-emerald-50 px-4 py-2 border-b border-emerald-100 font-semibold text-xs text-emerald-700 uppercase tracking-wider">
                Income Categories
            </div>
            <ul className="divide-y divide-slate-100 mb-2">
                {incomeCategories.map(renderCategoryItem)}
                {incomeCategories.length === 0 && <li className="p-4 text-center text-slate-400 text-xs">No income categories</li>}
            </ul>

            <div className="sticky top-0 z-10 bg-red-50 px-4 py-2 border-y border-red-100 font-semibold text-xs text-red-700 uppercase tracking-wider">
                Expense Categories
            </div>
            <ul className="divide-y divide-slate-100 mb-2">
                {expenseCategories.map(renderCategoryItem)}
                {expenseCategories.length === 0 && <li className="p-4 text-center text-slate-400 text-xs">No expense categories</li>}
            </ul>

            <div className="sticky top-0 z-10 bg-blue-50 px-4 py-2 border-y border-blue-100 font-semibold text-xs text-blue-700 uppercase tracking-wider">
                Balance / Adjustment Categories
            </div>
            <ul className="divide-y divide-slate-100">
                {balanceCategories.map(renderCategoryItem)}
                {balanceCategories.length === 0 && <li className="p-4 text-center text-slate-400 text-xs">No balance categories</li>}
            </ul>
        </div>
     </div>
  )
}