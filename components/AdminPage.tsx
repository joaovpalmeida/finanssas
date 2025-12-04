import React, { useState, useEffect, useRef } from 'react';
import { Download, Trash2, Settings, Tag, CreditCard, Edit2, Save, X, UploadCloud, AlertTriangle, Upload, Wand2 } from 'lucide-react';
import { SqlConsole } from './SqlConsole';
import { FileUpload } from './FileUpload';
import { getAccounts, getCategories, updateAccount, updateCategory, deleteCategory, deleteAccount, getTransactionCount, generateDummyData } from '../services/db';
import { Account, Category, Transaction } from '../types';

interface AdminPageProps {
  onBackup: () => void;
  onReset: () => void;
  onRefresh: () => void;
  onUpload: (data: Transaction[]) => void;
  onRestore: (file: File) => void;
  isUploading: boolean;
  uploadError: string | null;
}

export const AdminPage: React.FC<AdminPageProps> = ({ 
  onBackup, 
  onReset, 
  onRefresh, 
  onUpload,
  onRestore, 
  isUploading, 
  uploadError 
}) => {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [showImport, setShowImport] = useState(false);
  const [dbCount, setDbCount] = useState(0);
  const [generating, setGenerating] = useState(false);
  const restoreInputRef = useRef<HTMLInputElement>(null);

  const refreshData = () => {
    setAccounts(getAccounts());
    setCategories(getCategories());
    setDbCount(getTransactionCount());
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
              />
           </div>
        )}
      </div>

      {/* Management Section */}
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

        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {/* Generate Dummy Data - Only if DB is empty or nearly empty */}
          {dbCount === 0 && (
             <div className="p-5 border border-purple-200 rounded-xl bg-purple-50/50 hover:border-purple-300 transition-all">
                <h3 className="font-semibold text-purple-800 flex items-center mb-2">
                  <Wand2 className="w-4 h-4 mr-2 text-purple-600" />
                  Demo Mode
                </h3>
                <p className="text-sm text-purple-600/70 mb-4 min-h-[40px]">
                  Database is empty. Generate realistic sample data to test features.
                </p>
                <button 
                  onClick={handleGenerateData}
                  disabled={generating}
                  className="px-4 py-2 bg-white border border-purple-200 shadow-sm text-purple-700 rounded-lg text-sm font-medium hover:bg-purple-50 transition-colors w-full disabled:opacity-50"
                >
                  {generating ? 'Generating...' : 'Populate Dummy Data'}
                </button>
             </div>
          )}

          {/* Backup */}
          <div className="p-5 border border-slate-200 rounded-xl bg-slate-50/50 hover:border-blue-300 transition-all">
            <h3 className="font-semibold text-slate-800 flex items-center mb-2">
              <Download className="w-4 h-4 mr-2 text-blue-600" />
              Backup Data
            </h3>
            <p className="text-sm text-slate-500 mb-4 min-h-[40px]">
              Download your entire database as a SQLite file. Safe for external storage.
            </p>
            <button 
              onClick={onBackup}
              className="px-4 py-2 bg-white border border-slate-300 shadow-sm text-slate-700 rounded-lg text-sm font-medium hover:bg-slate-50 hover:text-blue-600 transition-colors w-full"
            >
              Download Backup
            </button>
          </div>

          {/* Restore */}
          <div className="p-5 border border-slate-200 rounded-xl bg-slate-50/50 hover:border-emerald-300 transition-all">
            <h3 className="font-semibold text-slate-800 flex items-center mb-2">
              <Upload className="w-4 h-4 mr-2 text-emerald-600" />
              Restore Database
            </h3>
            <p className="text-sm text-slate-500 mb-4 min-h-[40px]">
              Load a previously saved .sqlite file. <span className="text-red-500 font-medium">Overwrites current data.</span>
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
              className="px-4 py-2 bg-white border border-slate-300 shadow-sm text-slate-700 rounded-lg text-sm font-medium hover:bg-slate-50 hover:text-emerald-600 transition-colors w-full"
            >
              Select File to Restore
            </button>
          </div>

          {/* Reset */}
          <div className="p-5 border border-red-100 rounded-xl bg-red-50/30 hover:border-red-200 transition-all">
            <h3 className="font-semibold text-red-700 flex items-center mb-2">
              <Trash2 className="w-4 h-4 mr-2" />
              Factory Reset
            </h3>
            <p className="text-sm text-red-600/70 mb-4 min-h-[40px]">
              Permanently delete all transactions and reset the local database.
            </p>
            <button 
              onClick={() => { onReset(); setTimeout(refreshData, 500); }}
              className="px-4 py-2 bg-white border border-red-200 shadow-sm text-red-600 rounded-lg text-sm font-medium hover:bg-red-50 transition-colors w-full"
            >
              Delete All Data
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Account Config */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100 flex flex-col">
          <div className="flex items-center space-x-2 mb-4">
            <CreditCard className="w-5 h-5 text-blue-500" />
            <h3 className="font-bold text-slate-800">Accounts</h3>
          </div>
          <AccountList 
            accounts={accounts} 
            onUpdate={async (old, neo) => { await updateAccount(old, neo); refreshData(); }}
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
             onUpdate={async (old, neo, type, group) => { await updateCategory(old, neo, type, group); refreshData(); }}
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
    onUpdate: (old: string, neo: string) => Promise<void>,
    onDelete: (id: string) => Promise<void>
}> = ({ accounts, onUpdate, onDelete }) => {
  const [editingItem, setEditingItem] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');

  const handleStartEdit = (name: string) => {
    setEditingItem(name);
    setEditValue(name);
  };

  const handleSave = async () => {
    if (editingItem && editValue && editValue !== editingItem) {
      await onUpdate(editingItem, editValue);
    }
    setEditingItem(null);
  };

  return (
     <div className="flex-1 border border-slate-100 rounded-lg overflow-hidden bg-slate-50 max-h-96 overflow-y-auto">
        <ul className="divide-y divide-slate-100">
          {accounts.map((acc) => (
            <li key={acc.id} className="bg-white px-4 py-3 flex items-center justify-between hover:bg-slate-50 group">
               {editingItem === acc.name ? (
                  <div className="flex items-center w-full space-x-2">
                    <input 
                      className="flex-1 px-2 py-1 border rounded text-sm"
                      value={editValue}
                      onChange={e => setEditValue(e.target.value)}
                    />
                    <button onClick={handleSave} className="text-emerald-600"><Save className="w-4 h-4" /></button>
                    <button onClick={() => setEditingItem(null)} className="text-slate-400"><X className="w-4 h-4" /></button>
                  </div>
               ) : (
                 <>
                   <span className="text-sm font-medium text-slate-700">{acc.name}</span>
                   <div className="flex items-center space-x-2 opacity-0 group-hover:opacity-100 transition-opacity">
                       <button onClick={() => handleStartEdit(acc.name)} className="text-slate-400 hover:text-blue-600" title="Rename">
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
  )
}

const CategoryList: React.FC<{ 
  categories: Category[], 
  onUpdate: (old: string, neo: string, type: string, group: string) => Promise<void>,
  onDelete: (id: string) => Promise<void>
}> = ({ categories, onUpdate, onDelete }) => {
  const [editingItem, setEditingItem] = useState<string | null>(null);
  const [formData, setFormData] = useState({ name: '', type: 'Expense', group: 'General' });

  const handleStartEdit = (cat: Category) => {
    setEditingItem(cat.name);
    setFormData({ name: cat.name, type: cat.type, group: cat.group });
  };

  const handleSave = async () => {
    if (editingItem && formData.name) {
      await onUpdate(editingItem, formData.name, formData.type, formData.group);
    }
    setEditingItem(null);
  };

  return (
     <div className="flex-1 border border-slate-100 rounded-lg overflow-hidden bg-slate-50 max-h-96 overflow-y-auto">
        <ul className="divide-y divide-slate-100">
          {categories.map((cat) => (
            <li key={cat.id} className="bg-white px-4 py-3 hover:bg-slate-50 group">
               {editingItem === cat.name ? (
                  <div className="space-y-2">
                    <div className="flex items-center space-x-2">
                      <input 
                        className="flex-1 px-2 py-1 border rounded text-sm"
                        value={formData.name}
                        onChange={e => setFormData({...formData, name: e.target.value})}
                      />
                      <button onClick={handleSave} className="text-emerald-600"><Save className="w-4 h-4" /></button>
                      <button onClick={() => setEditingItem(null)} className="text-slate-400"><X className="w-4 h-4" /></button>
                    </div>
                    <div className="flex space-x-2">
                       <select 
                        className="flex-1 text-xs border rounded p-1"
                        value={formData.type}
                        onChange={e => setFormData({...formData, type: e.target.value})}
                       >
                         <option value="Expense">Expense</option>
                         <option value="Income">Income</option>
                       </select>
                       <select 
                        className="flex-1 text-xs border rounded p-1"
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
                       <span className={`text-[10px] px-1.5 py-0.5 rounded ${cat.type === 'Income' ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>
                         {cat.type}
                       </span>
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
          ))}
          {categories.length === 0 && <li className="p-4 text-center text-slate-400 text-sm">No categories found</li>}
        </ul>
     </div>
  )
}