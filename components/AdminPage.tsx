import React, { useState, useEffect } from 'react';
import { Download, Trash2, Settings, Tag, CreditCard, Edit2, Save, X, UploadCloud } from 'lucide-react';
import { SqlConsole } from './SqlConsole';
import { FileUpload } from './FileUpload';
import { getAccounts, getCategories, updateAccount, updateCategory } from '../services/db';
import { Account, Category } from '../types';
import { ColumnMapping } from '../utils/excelParser';

interface AdminPageProps {
  onBackup: () => void;
  onReset: () => void;
  onRefresh: () => void;
  onUpload: (file: File, accountName: string, mapping: ColumnMapping, sheetName: string, defaultDate: string) => void;
  isUploading: boolean;
  uploadError: string | null;
}

export const AdminPage: React.FC<AdminPageProps> = ({ 
  onBackup, 
  onReset, 
  onRefresh, 
  onUpload, 
  isUploading, 
  uploadError 
}) => {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [showImport, setShowImport] = useState(false);

  const refreshData = () => {
    setAccounts(getAccounts());
    setCategories(getCategories());
    onRefresh();
  };

  useEffect(() => {
    refreshData();
  }, []);

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

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Backup */}
          <div className="p-5 border border-slate-200 rounded-xl bg-slate-50/50 hover:border-blue-300 transition-all">
            <h3 className="font-semibold text-slate-800 flex items-center mb-2">
              <Download className="w-4 h-4 mr-2 text-blue-600" />
              Backup Data
            </h3>
            <p className="text-sm text-slate-500 mb-4">
              Download your entire database as a SQLite file. You can restore this later or use generic SQL tools to analyze it.
            </p>
            <button 
              onClick={onBackup}
              className="px-4 py-2 bg-white border border-slate-300 shadow-sm text-slate-700 rounded-lg text-sm font-medium hover:bg-slate-50 hover:text-blue-600 transition-colors w-full sm:w-auto"
            >
              Download Backup
            </button>
          </div>

          {/* Reset */}
          <div className="p-5 border border-red-100 rounded-xl bg-red-50/30 hover:border-red-200 transition-all">
            <h3 className="font-semibold text-red-700 flex items-center mb-2">
              <Trash2 className="w-4 h-4 mr-2" />
              Factory Reset
            </h3>
            <p className="text-sm text-red-600/70 mb-4">
              Permanently delete all transactions and reset the local database. This action cannot be undone.
            </p>
            <button 
              onClick={() => { onReset(); setTimeout(refreshData, 500); }}
              className="px-4 py-2 bg-white border border-red-200 shadow-sm text-red-600 rounded-lg text-sm font-medium hover:bg-red-50 transition-colors w-full sm:w-auto"
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
          <AccountList accounts={accounts} onUpdate={async (old, neo) => { await updateAccount(old, neo); refreshData(); }} />
        </div>

        {/* Category Config */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100 flex flex-col">
          <div className="flex items-center space-x-2 mb-4">
            <Tag className="w-5 h-5 text-emerald-500" />
            <h3 className="font-bold text-slate-800">Categories</h3>
          </div>
          <CategoryList categories={categories} onUpdate={async (old, neo, type, group) => { await updateCategory(old, neo, type, group); refreshData(); }} />
        </div>
      </div>

      {/* SQL Console embedded */}
      <SqlConsole />
    </div>
  );
};

// --- Sub Components ---

const AccountList: React.FC<{ accounts: Account[], onUpdate: (old: string, neo: string) => Promise<void> }> = ({ accounts, onUpdate }) => {
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
            <li key={acc.id} className="bg-white px-4 py-3 flex items-center justify-between hover:bg-slate-50">
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
                   <button onClick={() => handleStartEdit(acc.name)} className="text-slate-400 hover:text-blue-600"><Edit2 className="w-3.5 h-3.5" /></button>
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
  onUpdate: (old: string, neo: string, type: string, group: string) => Promise<void> 
}> = ({ categories, onUpdate }) => {
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
            <li key={cat.id} className="bg-white px-4 py-3 hover:bg-slate-50">
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
                   <button onClick={() => handleStartEdit(cat)} className="text-slate-400 hover:text-blue-600"><Edit2 className="w-3.5 h-3.5" /></button>
                 </div>
               )}
            </li>
          ))}
          {categories.length === 0 && <li className="p-4 text-center text-slate-400 text-sm">No categories found</li>}
        </ul>
     </div>
  )
}