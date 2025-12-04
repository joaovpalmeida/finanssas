import React, { useState, useEffect, useMemo } from 'react';
import { Wallet, Loader2, Plus, Settings, Target, Search, Home } from 'lucide-react';
import { Dashboard } from './components/Dashboard';
import { Insights } from './components/Insights';
import { AdminPage } from './components/AdminPage';
import { SavingsGoals } from './components/SavingsGoals';
import { LandingPage } from './components/LandingPage';
import { AddTransactionModal } from './components/AddTransactionModal';
import { TransactionSearch } from './components/TransactionSearch';
import { parseExcelFile, ColumnMapping } from './utils/excelParser';
import { Transaction, Account, Category } from './types';
import { initDB, insertTransactions, getAllTransactions, resetDB, exportDatabaseBlob, deleteTransaction, getAccounts, getCategories, importDatabase } from './services/db';
import { calculateRunningBalances, formatCurrency, aggregateData } from './utils/helpers';

function App() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  
  const [isLoading, setIsLoading] = useState(false);
  const [isDbReady, setIsDbReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // 'landing' is now the default
  const [activeTab, setActiveTab] = useState<'landing' | 'dashboard' | 'search' | 'insights' | 'savings' | 'admin'>('landing');
  
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

  const handleFileUpload = async (data: Transaction[]) => {
    setIsLoading(true);
    setError(null);
    try {
      await insertTransactions(data); // Save to SQLite and auto-create categories/accounts
      refreshTransactions();
      alert(`Successfully imported ${data.length} transactions.`);
      setActiveTab('dashboard'); // Redirect to dashboard after upload
    } catch (err) {
      console.error(err);
      setError("Failed to save transactions to database.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveTransaction = async (transaction: Transaction) => {
    await insertTransactions([transaction]);
    refreshTransactions();
    setEditingTransaction(null);
    if (activeTab === 'landing') setActiveTab('dashboard');
  };

  const handleDeleteTransaction = async (id: string) => {
    await deleteTransaction(id);
    refreshTransactions();
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

  const handleRestore = async (file: File) => {
    if (confirm("This will overwrite your current data with the backup. Continue?")) {
        setIsLoading(true);
        try {
            await importDatabase(file);
            refreshTransactions();
            alert("Database restored successfully.");
            setActiveTab('dashboard');
        } catch (e: any) {
            console.error(e);
            alert("Failed to restore database: " + e.message);
        } finally {
            setIsLoading(false);
        }
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
      <header className="bg-white border-b border-slate-200 sticky top-0 z-30 shadow-sm/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div 
            className="flex items-center space-x-2 cursor-pointer group"
            onClick={() => setActiveTab('landing')}
          >
            <div className="bg-blue-600 p-2 rounded-lg group-hover:bg-blue-700 transition-colors">
              <Wallet className="w-5 h-5 text-white" />
            </div>
            <h1 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-700 to-blue-500">
              Finan$$as
            </h1>
          </div>
          
          <div className="flex items-center space-x-1 lg:space-x-2 overflow-x-auto no-scrollbar ml-4">
              {/* Home Icon for small screens or quick access */}
              <button 
                onClick={() => setActiveTab('landing')}
                className={`lg:hidden px-3 py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap ${activeTab === 'landing' ? 'bg-slate-100 text-blue-700' : 'text-slate-600 hover:bg-slate-50'}`}
              >
                <Home className="w-4 h-4" />
              </button>

              <button 
              onClick={() => setActiveTab('dashboard')}
              className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap ${activeTab === 'dashboard' ? 'bg-slate-100 text-blue-700' : 'text-slate-600 hover:bg-slate-50'}`}
            >
              Dashboard
            </button>
            <button 
              onClick={() => setActiveTab('search')}
              className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors flex items-center whitespace-nowrap ${activeTab === 'search' ? 'bg-slate-100 text-blue-700' : 'text-slate-600 hover:bg-slate-50'}`}
            >
              <Search className="w-3 h-3 mr-1.5 hidden md:block" />
              Search
            </button>
            <button 
              onClick={() => setActiveTab('insights')}
              className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap ${activeTab === 'insights' ? 'bg-slate-100 text-blue-700' : 'text-slate-600 hover:bg-slate-50'}`}
            >
              AI Insights
            </button>
              <button 
              onClick={() => setActiveTab('savings')}
              className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors flex items-center whitespace-nowrap ${activeTab === 'savings' ? 'bg-slate-100 text-blue-700' : 'text-slate-600 hover:bg-slate-50'}`}
            >
              <Target className="w-3 h-3 mr-1.5 hidden md:block" />
              Goals
            </button>
            <button 
              onClick={() => setActiveTab('admin')}
              className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors flex items-center whitespace-nowrap ${activeTab === 'admin' ? 'bg-slate-100 text-blue-700' : 'text-slate-600 hover:bg-slate-50'}`}
            >
              <Settings className="w-3 h-3 mr-1.5 hidden md:block" />
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
              <Plus className="w-4 h-4 md:mr-1.5" />
              <span className="hidden md:inline">Add</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="space-y-8">
          {activeTab === 'landing' && (
            <LandingPage onGetStarted={() => setActiveTab('dashboard')} />
          )}
          {activeTab === 'dashboard' && (
            <Dashboard 
              transactions={transactions} 
              categories={categories}
              onEdit={handleEditClick}
              onDelete={(id) => { 
                  if(confirm("Are you sure?")) handleDeleteTransaction(id); 
              }}
              onNavigateToAdmin={() => setActiveTab('admin')}
            />
          )}
          {activeTab === 'search' && (
            <TransactionSearch 
              categories={categories} 
              accounts={accounts} 
              onEdit={handleEditClick}
              onDelete={handleDeleteTransaction}
            />
          )}
          {activeTab === 'insights' && <Insights transactions={transactions} />}
          {activeTab === 'savings' && <SavingsGoals accountBalances={accountBalances} />}
          {activeTab === 'admin' && (
            <AdminPage 
              onBackup={handleBackup} 
              onRestore={handleRestore}
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