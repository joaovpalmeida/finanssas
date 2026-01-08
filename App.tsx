
import React, { useState, useEffect, useMemo, Suspense, useCallback } from 'react';
import { Wallet, Loader2, Plus, Settings, Target, Search, Home, Menu, X, BarChart3, Sparkles, HelpCircle, CheckCircle, AlertCircle, Info } from 'lucide-react';
import { Transaction, Account, Category } from './types';
import { initDB, insertTransactions, getAllTransactions, resetDB, exportDatabaseBlob, deleteTransaction, getAccounts, getCategories, importDatabase, unlockDB, DBStatus, getImportConfig } from './services/db';
import { calculateRunningBalances, aggregateData } from './utils/helpers';
import { PasswordPrompt } from './components/PasswordPrompt';

// Lazy Load Components
const Dashboard = React.lazy(() => import('./components/Dashboard').then(module => ({ default: module.Dashboard })));
const Insights = React.lazy(() => import('./components/Insights').then(module => ({ default: module.Insights })));
const AdminPage = React.lazy(() => import('./components/AdminPage').then(module => ({ default: module.AdminPage })));
const SavingsGoals = React.lazy(() => import('./components/SavingsGoals').then(module => ({ default: module.SavingsGoals })));
const LandingPage = React.lazy(() => import('./components/LandingPage').then(module => ({ default: module.LandingPage })));
const TransactionSearch = React.lazy(() => import('./components/TransactionSearch').then(module => ({ default: module.TransactionSearch })));
const AddTransactionModal = React.lazy(() => import('./components/AddTransactionModal').then(module => ({ default: module.AddTransactionModal })));
const HelpPage = React.lazy(() => import('./components/HelpPage').then(module => ({ default: module.HelpPage })));

// Toast Notification Type
interface Toast {
  id: number;
  message: string;
  type: 'success' | 'error' | 'info';
}

// Loading Fallback Component
const PageLoader = () => (
  <div className="flex flex-col items-center justify-center min-h-[50vh] w-full animate-fade-in">
    <Loader2 className="w-10 h-10 text-blue-600 animate-spin mb-3" />
    <p className="text-slate-500 text-sm font-medium">Loading...</p>
  </div>
);

function App() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  
  const [isLoading, setIsLoading] = useState(false);
  const [dbStatus, setDbStatus] = useState<DBStatus>('LOADING');
  const [error, setError] = useState<string | null>(null);
  const [toasts, setToasts] = useState<Toast[]>([]);
  
  const [activeTab, setActiveTab] = useState<'landing' | 'dashboard' | 'search' | 'insights' | 'savings' | 'admin' | 'help'>('landing');
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<Partial<Transaction> | null>(null);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // App Settings
  const [decimalSeparator, setDecimalSeparator] = useState<'.' | ','>('.');
  const [dateFormat, setDateFormat] = useState<string>('YYYY-MM-DD');

  const notify = useCallback((message: string, type: 'success' | 'error' | 'info' = 'info') => {
    const id = Date.now();
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 4000);
  }, []);

  useEffect(() => {
    const setupDB = async () => {
      const status = await initDB();
      setDbStatus(status);
      if (status === 'READY') {
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
    
    // Load config
    const config = getImportConfig();
    if (config.decimalSeparator === ',' || config.decimalSeparator === '.') {
        setDecimalSeparator(config.decimalSeparator);
    }
    if (config.dateFormat) {
        setDateFormat(config.dateFormat);
    }
  };

  const handleUnlock = async (password: string) => {
      const success = await unlockDB(password);
      if (success) {
          setDbStatus('READY');
          refreshTransactions();
          notify("Database unlocked", "success");
          return true;
      }
      return false;
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
      await insertTransactions(data); 
      refreshTransactions();
      notify(`Successfully imported ${data.length} transactions.`, "success");
      // REMOVED: Redirect to Dashboard. 
      // We stay on the current tab so the FileUpload component can show its Success/Template screen.
    } catch (err) {
      console.error(err);
      setError("Failed to save transactions to database.");
      notify("Import failed", "error");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveTransaction = async (newTransactions: Transaction[]) => {
    await insertTransactions(newTransactions);
    refreshTransactions();
    setEditingTransaction(null);
    notify("Transaction saved", "success");
    if (activeTab === 'landing') setActiveTab('dashboard');
  };

  const handleDeleteTransaction = async (id: string) => {
    await deleteTransaction(id);
    refreshTransactions();
    notify("Transaction deleted", "info");
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
      notify("System reset complete", "info");
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
      notify("Backup downloaded", "success");
    }
  };

  const handleRestore = async (file: File) => {
    if (confirm("This will overwrite your current data with the backup. Continue?")) {
        setIsLoading(true);
        try {
            await importDatabase(file);
            refreshTransactions();
            notify("Database restored successfully", "success");
            setActiveTab('dashboard');
        } catch (e: any) {
            console.error(e);
            notify("Failed to restore: " + e.message, "error");
        } finally {
            setIsLoading(false);
        }
    }
  };

  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: BarChart3 },
    { id: 'search', label: 'Search', icon: Search },
    { id: 'insights', label: 'AI Insights', icon: Sparkles },
    { id: 'savings', label: 'Goals', icon: Target },
    { id: 'admin', label: 'Admin', icon: Settings },
    { id: 'help', label: 'Help', icon: HelpCircle },
  ] as const;

  if (dbStatus === 'LOADING') {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center flex-col">
        <Loader2 className="w-10 h-10 text-blue-600 animate-spin mb-4" />
        <h2 className="text-slate-600 font-medium">Initializing Secure Database...</h2>
      </div>
    );
  }

  if (dbStatus === 'LOCKED') {
      return <PasswordPrompt onUnlock={handleUnlock} />;
  }

  if (dbStatus === 'ERROR') {
      return (
        <div className="min-h-screen bg-slate-50 flex items-center justify-center flex-col p-4 text-center">
            <h2 className="text-red-600 font-bold text-xl mb-2">Database Error</h2>
            <p className="text-slate-600">Failed to load the database engine. Please refresh the page.</p>
        </div>
      );
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      {/* Toast Notification Container */}
      <div className="fixed bottom-6 right-6 z-[100] flex flex-col gap-2 w-full max-w-xs pointer-events-none">
        {toasts.map(toast => (
          <div 
            key={toast.id}
            className={`pointer-events-auto flex items-center p-4 rounded-xl shadow-2xl border animate-slide-in-right ${
              toast.type === 'success' ? 'bg-emerald-600 border-emerald-500 text-white' :
              toast.type === 'error' ? 'bg-red-600 border-red-500 text-white' :
              'bg-slate-800 border-slate-700 text-white'
            }`}
          >
            {toast.type === 'success' && <CheckCircle className="w-5 h-5 mr-3 flex-shrink-0" />}
            {toast.type === 'error' && <AlertCircle className="w-5 h-5 mr-3 flex-shrink-0" />}
            {toast.type === 'info' && <Info className="w-5 h-5 mr-3 flex-shrink-0" />}
            <span className="text-sm font-medium">{toast.message}</span>
            <button 
              onClick={() => setToasts(prev => prev.filter(t => t.id !== toast.id))}
              className="ml-auto pl-3 opacity-70 hover:opacity-100 transition-opacity"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        ))}
      </div>

      {/* Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-30 shadow-sm/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          
          {/* Logo */}
          <div 
            className="flex items-center space-x-2 cursor-pointer group"
            onClick={() => {
              setActiveTab('landing');
              setIsMobileMenuOpen(false);
            }}
          >
            <div className="bg-blue-600 p-2 rounded-lg group-hover:bg-blue-700 transition-colors">
              <Wallet className="w-5 h-5 text-white" />
            </div>
            <h1 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-700 to-blue-500">
              Finan$$as
            </h1>
          </div>
          
          {/* Desktop Navigation */}
          <div className="hidden lg:flex items-center space-x-2 ml-8">
            <button 
                onClick={() => setActiveTab('landing')}
                className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors flex items-center ${activeTab === 'landing' ? 'bg-slate-100 text-blue-700' : 'text-slate-600 hover:bg-slate-50'}`}
              >
                <Home className="w-4 h-4 mr-1.5" />
                Home
            </button>
            
            {navItems.map(item => (
              <button 
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors flex items-center ${activeTab === item.id ? 'bg-slate-100 text-blue-700' : 'text-slate-600 hover:bg-slate-50'}`}
              >
                <item.icon className="w-4 h-4 mr-1.5" />
                {item.label}
              </button>
            ))}

            <div className="h-6 w-px bg-slate-200 mx-2"></div>
            
            <button
              onClick={() => {
                setEditingTransaction(null);
                setIsModalOpen(true);
              }}
              className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors shadow-sm text-sm font-medium"
            >
              <Plus className="w-4 h-4 mr-1.5" />
              Add Transaction
            </button>
          </div>

          {/* Mobile Controls */}
          <div className="flex lg:hidden items-center space-x-3">
             <button
              onClick={() => {
                setEditingTransaction(null);
                setIsModalOpen(true);
                setIsMobileMenuOpen(false);
              }}
              className="flex items-center px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors shadow-sm text-sm font-medium"
            >
              <Plus className="w-4 h-4 mr-1.5" />
              Add
            </button>
            
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="p-2 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
            >
               {isMobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>

        {/* Mobile Menu Dropdown */}
        {isMobileMenuOpen && (
          <div className="lg:hidden absolute top-16 left-0 w-full bg-white border-b border-slate-200 shadow-lg animate-fade-in z-40">
            <div className="p-4 space-y-2">
               <button 
                  onClick={() => { setActiveTab('landing'); setIsMobileMenuOpen(false); }}
                  className={`w-full px-4 py-3 rounded-xl text-base font-medium transition-colors flex items-center ${activeTab === 'landing' ? 'bg-blue-50 text-blue-700' : 'text-slate-700 hover:bg-slate-50'}`}
                >
                  <Home className="w-5 h-5 mr-3" />
                  Home
              </button>
              {navItems.map(item => (
                <button 
                  key={item.id}
                  onClick={() => { setActiveTab(item.id); setIsMobileMenuOpen(false); }}
                  className={`w-full px-4 py-3 rounded-xl text-base font-medium transition-colors flex items-center ${activeTab === item.id ? 'bg-blue-50 text-blue-700' : 'text-slate-700 hover:bg-slate-50'}`}
                >
                  <item.icon className="w-5 h-5 mr-3" />
                  {item.label}
                </button>
              ))}
            </div>
          </div>
        )}
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Suspense fallback={<PageLoader />}>
          <div className="space-y-8">
            {activeTab === 'landing' && (
              <LandingPage onGetStarted={() => setActiveTab('dashboard')} />
            )}
            {activeTab === 'dashboard' && (
              <Dashboard 
                transactions={transactions} 
                categories={categories}
                accounts={accounts}
                onEdit={handleEditClick}
                onDelete={(id) => { 
                    if(confirm("Are you sure?")) handleDeleteTransaction(id); 
                }}
                onNavigateToAdmin={() => setActiveTab('admin')}
                decimalSeparator={decimalSeparator}
                dateFormat={dateFormat}
              />
            )}
            {activeTab === 'search' && (
              <TransactionSearch 
                categories={categories} 
                accounts={accounts} 
                onEdit={handleEditClick}
                onDelete={handleDeleteTransaction}
                decimalSeparator={decimalSeparator}
                dateFormat={dateFormat}
              />
            )}
            {activeTab === 'insights' && <Insights transactions={transactions} />}
            {activeTab === 'savings' && (
              <SavingsGoals 
                accountBalances={accountBalances} 
                decimalSeparator={decimalSeparator}
                dateFormat={dateFormat}
                notify={notify}
              />
            )}
            {activeTab === 'admin' && (
              <AdminPage 
                onBackup={handleBackup} 
                onRestore={handleRestore}
                onReset={handleReset} 
                onRefresh={refreshTransactions}
                onUpload={handleFileUpload}
                isUploading={isLoading}
                uploadError={error}
                decimalSeparator={decimalSeparator}
                dateFormat={dateFormat}
                notify={notify}
              />
            )}
            {activeTab === 'help' && <HelpPage />}
          </div>
        </Suspense>
      </main>

      <Suspense fallback={null}>
        {isModalOpen && (
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
            decimalSeparator={decimalSeparator}
            notify={notify}
          />
        )}
      </Suspense>
    </div>
  );
}

export default App;
