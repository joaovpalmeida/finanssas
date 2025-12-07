import React, { useState, useEffect, useMemo, Suspense } from 'react';
import { Wallet, Loader2, Plus, Settings, Target, Search, Home, Menu, X, BarChart3, Sparkles, HelpCircle } from 'lucide-react';
import { Transaction, Account, Category } from './types';
import { initDB, insertTransactions, getAllTransactions, resetDB, exportDatabaseBlob, deleteTransaction, getAccounts, getCategories, importDatabase } from './services/db';
import { calculateRunningBalances, aggregateData } from './utils/helpers';

// Lazy Load Components
// We use the .then() pattern to handle named exports (export const ...)
const Dashboard = React.lazy(() => import('./components/Dashboard').then(module => ({ default: module.Dashboard })));
const Insights = React.lazy(() => import('./components/Insights').then(module => ({ default: module.Insights })));
const AdminPage = React.lazy(() => import('./components/AdminPage').then(module => ({ default: module.AdminPage })));
const SavingsGoals = React.lazy(() => import('./components/SavingsGoals').then(module => ({ default: module.SavingsGoals })));
const LandingPage = React.lazy(() => import('./components/LandingPage').then(module => ({ default: module.LandingPage })));
const TransactionSearch = React.lazy(() => import('./components/TransactionSearch').then(module => ({ default: module.TransactionSearch })));
const AddTransactionModal = React.lazy(() => import('./components/AddTransactionModal').then(module => ({ default: module.AddTransactionModal })));
const HelpPage = React.lazy(() => import('./components/HelpPage').then(module => ({ default: module.HelpPage })));

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
  const [isDbReady, setIsDbReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // 'landing' is now the default
  const [activeTab, setActiveTab] = useState<'landing' | 'dashboard' | 'search' | 'insights' | 'savings' | 'admin' | 'help'>('landing');
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<Partial<Transaction> | null>(null);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

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

  const handleSaveTransaction = async (newTransactions: Transaction[]) => {
    await insertTransactions(newTransactions);
    refreshTransactions();
    setEditingTransaction(null);
    // If adding a transaction via the modal from another tab, stay there, otherwise go to dashboard
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

  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: BarChart3 },
    { id: 'search', label: 'Search', icon: Search },
    { id: 'insights', label: 'AI Insights', icon: Sparkles },
    { id: 'savings', label: 'Goals', icon: Target },
    { id: 'admin', label: 'Admin', icon: Settings },
    { id: 'help', label: 'Help', icon: HelpCircle },
  ] as const;

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
            {activeTab === 'savings' && (
              <SavingsGoals 
                accountBalances={accountBalances} 
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
          />
        )}
      </Suspense>
    </div>
  );
}

export default App;