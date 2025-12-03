import React, { useState, useEffect, useMemo } from 'react';
import { Wallet, Loader2, Plus, Settings, Target } from 'lucide-react';
import { Dashboard } from './components/Dashboard';
import { Insights } from './components/Insights';
import { AdminPage } from './components/AdminPage';
import { SavingsGoals } from './components/SavingsGoals';
import { AddTransactionModal } from './components/AddTransactionModal';
import { parseExcelFile, ColumnMapping } from './utils/excelParser';
import { Transaction, Account, Category } from './types';
import { initDB, insertTransactions, getAllTransactions, resetDB, exportDatabaseBlob, deleteTransaction, getAccounts, getCategories } from './services/db';
import { calculateRunningBalances, formatCurrency, aggregateData } from './utils/helpers';

function App() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  
  const [isLoading, setIsLoading] = useState(false);
  const [isDbReady, setIsDbReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'dashboard' | 'insights' | 'savings' | 'admin'>('dashboard');
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);

  useEffect(() => {
    const setupDB = async () => {
      const ready = await initDB();
      setIsDbReady(ready);
      if (ready) {
        refreshTransactions();
      }
    };
    setupDB();
  }, []);

  const refreshTransactions = () => {
    const existingData = getAllTransactions();
    if (existingData.length > 0) {
      setTransactions(calculateRunningBalances(existingData));
    } else {
      setTransactions([]);
    }
    // Also refresh metadata
    setAccounts(getAccounts());
    setCategories(getCategories());
  };

  // Calculate current account balances for the Savings tab
  const accountBalances = useMemo(() => {
    if (transactions.length === 0) return [];
    return aggregateData(transactions, categories).accountBalances;
  }, [transactions, categories]);

  const handleFileUpload = async (file: File, accountName: string, mapping: ColumnMapping) => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await parseExcelFile(file, accountName, mapping);
      await insertTransactions(data); // Save to SQLite and auto-create categories/accounts
      refreshTransactions();
      alert(`Successfully imported ${data.length} transactions.`);
    } catch (err) {
      console.error(err);
      setError("Failed to parse the file. Please ensure it's a valid Excel file and columns are mapped correctly.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveTransaction = async (transaction: Transaction) => {
    await insertTransactions([transaction]);
    refreshTransactions();
    setEditingTransaction(null);
  };

  const handleDeleteTransaction = async (id: string) => {
    if (confirm("Are you sure you want to delete this transaction?")) {
      await deleteTransaction(id);
      refreshTransactions();
    }
  };

  const handleEditClick = (t: Transaction) => {
    setEditingTransaction(t);
    setIsModalOpen(true);
  };

  const handleReset = async () => {
    if (confirm("Are you sure you want to delete all data? This cannot be undone.")) {
      await resetDB();
      setTransactions([]);
      setAccounts([]);
      setCategories([]);
      setError(null);
    }
  };

  const handleBackup = () => {
    const blob = exportDatabaseBlob();
    if (blob) {
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `finance_backup_${new Date().toISOString().split('T')[0]}.sqlite`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }
  };

  if (!isDbReady) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center flex-col">
        <Loader2 className="w-10 h-10 text-blue-600 animate-spin mb-4" />
        <h2 className="text-slate-600 font-medium">Initializing Secure Database...</h2>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div className="bg-blue-600 p-2 rounded-lg">
              <Wallet className="w-5 h-5 text-white" />
            </div>
            <h1 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-700 to-blue-500">
              FinanceAI
            </h1>
          </div>
          
          <div className="flex items-center space-x-2">
              <button 
              onClick={() => setActiveTab('dashboard')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${activeTab === 'dashboard' ? 'bg-slate-100 text-blue-700' : 'text-slate-600 hover:bg-slate-50'}`}
            >
              Dashboard
            </button>
            <button 
              onClick={() => setActiveTab('insights')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${activeTab === 'insights' ? 'bg-slate-100 text-blue-700' : 'text-slate-600 hover:bg-slate-50'}`}
            >
              AI Insights
            </button>
              <button 
              onClick={() => setActiveTab('savings')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center ${activeTab === 'savings' ? 'bg-slate-100 text-blue-700' : 'text-slate-600 hover:bg-slate-50'}`}
            >
              <Target className="w-3 h-3 mr-1.5" />
              Goals
            </button>
            <button 
              onClick={() => setActiveTab('admin')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center ${activeTab === 'admin' ? 'bg-slate-100 text-blue-700' : 'text-slate-600 hover:bg-slate-50'}`}
            >
              <Settings className="w-3 h-3 mr-1.5" />
              Admin
            </button>
            
            <div className="h-6 w-px bg-slate-200 mx-2"></div>
            
            <button
              onClick={() => {
                setEditingTransaction(null);
                setIsModalOpen(true);
              }}
              className="flex items-center px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors shadow-sm text-sm font-medium"
            >
              <Plus className="w-4 h-4 mr-1.5" />
              Add
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="space-y-8">
          {activeTab === 'dashboard' && (
            <Dashboard 
              transactions={transactions} 
              categories={categories}
              onEdit={handleEditClick}
              onDelete={handleDeleteTransaction}
              onNavigateToAdmin={() => setActiveTab('admin')}
            />
          )}
          {activeTab === 'insights' && <Insights transactions={transactions} />}
          {activeTab === 'savings' && <SavingsGoals accountBalances={accountBalances} />}
          {activeTab === 'admin' && (
            <AdminPage 
              onBackup={handleBackup} 
              onReset={handleReset} 
              onRefresh={refreshTransactions}
              onUpload={handleFileUpload}
              isUploading={isLoading}
              uploadError={error}
            />
          )}
        </div>
      </main>

      <AddTransactionModal 
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setEditingTransaction(null);
        }}
        onSave={handleSaveTransaction}
        categories={categories}
        accounts={accounts}
        initialData={editingTransaction}
      />
    </div>
  );
}

export default App;