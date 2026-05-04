import React, { useMemo, useState, useEffect } from 'react';
import { 
  TrendingUp, TrendingDown, CreditCard, Wallet, Edit2, Trash2, Plus, X,
  ChevronDown, ChevronUp, BarChart3, Calendar, Filter, ChevronLeft, ChevronRight,
  Eye, EyeOff, Info, PiggyBank, Percent, ArrowRight
} from 'lucide-react';
import { Transaction, FinancialSummary, Category, TransactionType, Account, FiscalConfig, BudgetType, MonthlyBudget } from '../types';
import { formatCurrency, aggregateData, getMonthYearLabel, getFiscalDateRange } from '../utils/helpers';
import { getPrivacySetting, savePrivacySetting, getFiscalConfig, getBudgetTypes, getMonthlyBudgets, saveMonthlyBudget, deleteMonthlyBudget } from '../services/db';

interface DashboardProps {
  transactions: Transaction[];
  categories: Category[];
  accounts?: Account[];
  budgetTypes: BudgetType[];
  onEdit: (t: Transaction) => void;
  onDelete: (id: string) => void;
  onNavigateToAdmin: () => void;
  decimalSeparator: '.' | ',';
  dateFormat: string;
  currency: string;
}

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#6366f1', '#14b8a6'];

const StatCard: React.FC<{ 
  title: string; 
  amount: number; 
  icon: React.ReactNode; 
  colorClass: string;
  privacyMode: boolean;
  tooltip?: string;
  isPercentage?: boolean;
  decimalSeparator: '.' | ',';
  currency: string;
}> = ({ title, amount, icon, colorClass, privacyMode, tooltip, isPercentage, decimalSeparator, currency }) => (
  <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100 flex items-center justify-between group relative">
    <div>
      <div className="flex items-center space-x-1 mb-1">
        <p className="text-sm font-medium text-slate-500">{title}</p>
        {tooltip && (
          <div className="group/tooltip relative">
            <Info className="w-3.5 h-3.5 text-slate-400 cursor-help" />
            <div className="absolute left-0 bottom-full mb-2 hidden group-hover/tooltip:block w-48 p-2 bg-slate-800 text-white text-xs rounded shadow-lg z-10">
              {tooltip}
            </div>
          </div>
        )}
      </div>
      <h3 className="text-2xl font-bold text-slate-800">
        {privacyMode ? '••••••' : (isPercentage ? `${amount.toFixed(1)}%` : formatCurrency(amount, decimalSeparator, currency))}
      </h3>
    </div>
    <div className={`p-3 rounded-full ${colorClass} bg-opacity-10`}>
      {icon}
    </div>
  </div>
);

export const Dashboard: React.FC<DashboardProps> = ({ 
  transactions, 
  categories, 
  accounts = [], 
  budgetTypes,
  onEdit, 
  onDelete, 
  onNavigateToAdmin, 
  decimalSeparator,
  dateFormat,
  currency
}) => {
  const [showCharts, setShowCharts] = useState(false);
  const [showBudgetPlanner, setShowBudgetPlanner] = useState(false);
  const [privacyMode, setPrivacyMode] = useState(true); // Default to true (hidden)
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  
  // Fiscal Config State
  const [fiscalConfig, setFiscalConfig] = useState<FiscalConfig>({ mode: 'calendar' });
  const [monthlyBudgets, setMonthlyBudgets] = useState<MonthlyBudget[]>([]);
  const [newBudamt, setNewBudamt] = useState<string>('');
  const [newBudTypeId, setNewBudTypeId] = useState<string>('');

  const refreshBudgets = (month: string) => {
    if (month && month !== 'all') {
      setMonthlyBudgets(getMonthlyBudgets(month));
    } else {
      setMonthlyBudgets([]);
    }
  };

  // Load configuration on mount
  useEffect(() => {
    const config = getFiscalConfig();
    setFiscalConfig(config);
    const savedPrivacy = getPrivacySetting();
    setPrivacyMode(savedPrivacy);
  }, []);

  // 2. Extract unique periods for the dropdown
  const availableMonths = useMemo(() => {
    const dates = new Set<string>();
    
    transactions.forEach(t => {
      const d = new Date(t.date);
      const y = d.getFullYear();
      const m = d.getMonth() + 1;
      
      // Add current calendar month
      const currentKey = `${y}-${String(m).padStart(2, '0')}`;
      dates.add(currentKey);

      // Logical shift: if this transaction triggers the NEXT fiscal period, add that period too.
      // For Fixed Day: if day >= startDay, it contributes to the next anchor month.
      if (fiscalConfig.mode === 'fixed_day' && fiscalConfig.startDay && d.getDate() >= fiscalConfig.startDay) {
        const nextDate = new Date(y, m, 1);
        dates.add(`${nextDate.getFullYear()}-${String(nextDate.getMonth() + 1).padStart(2, '0')}`);
      } 
      // For Income Trigger: if this is the trigger category, it starts the next anchor month.
      else if (fiscalConfig.mode === 'income_trigger' && fiscalConfig.triggerCategory && t.category === fiscalConfig.triggerCategory) {
        const nextDate = new Date(y, m, 1);
        dates.add(`${nextDate.getFullYear()}-${String(nextDate.getMonth() + 1).padStart(2, '0')}`);
      }
    });
    
    // If no transactions, fallback to current month only
    if (dates.size === 0) {
      const now = new Date();
      dates.add(`${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`);
    }

    return Array.from(dates).sort().reverse(); // Newest first
  }, [transactions, fiscalConfig]);

  // Default filter to the first available period (usually current or latest with data)
  const [dateFilter, setDateFilter] = useState<string>('all');

  // Load budgets when filter changes
  useEffect(() => {
    refreshBudgets(dateFilter);
  }, [dateFilter]);

  // Initialize date filter once availableMonths is ready
  useEffect(() => {
    const now = new Date();
    const currentMonthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    
    // Default to current month if it exists in data, otherwise the first item (latest)
    if (availableMonths.includes(currentMonthKey)) {
        setDateFilter(currentMonthKey);
    } else if (availableMonths.length > 0) {
        setDateFilter(availableMonths[0]);
    }
  }, [availableMonths.length === 1 && availableMonths[0].split('-').length === 2]); // Initial load trigger

  // Handle privacy toggle and save
  const togglePrivacy = async () => {
    const newMode = !privacyMode;
    setPrivacyMode(newMode);
    await savePrivacySetting(newMode);
  };

  // Reset to page 1 when filter or data changes
  useEffect(() => {
    setCurrentPage(1);
  }, [dateFilter, transactions, itemsPerPage]);

  // 1. Calculate Date Range based on filter and Fiscal Config
  const { start: dateStart, end: dateEnd, label: dateLabel } = useMemo(() => {
      return getFiscalDateRange(dateFilter, fiscalConfig, transactions);
  }, [dateFilter, fiscalConfig, transactions]);

  // Determine if the view is "Current"
  const isCurrentView = useMemo(() => {
    if (dateFilter === 'all') return true;
    const now = new Date();
    if (dateStart && dateEnd) {
       return now >= dateStart && now <= dateEnd;
    }
    return false;
  }, [dateFilter, dateStart, dateEnd]);

  // 3. Filter transactions based on selection
  const filteredTransactions = useMemo(() => {
    return transactions.filter(t => {
      const d = new Date(t.date);
      return (!dateStart || d >= dateStart) && d <= dateEnd;
    });
  }, [transactions, dateStart, dateEnd]);

  // Exclude Balance transactions for stats/charts to avoid skewing income/expense/savings rate
  const statsTransactions = useMemo(() => {
      return filteredTransactions.filter(t => t.type !== TransactionType.BALANCE);
  }, [filteredTransactions]);

  // 4. Filter for Balances (Cumulative Stock)
  const cumulativeTransactions = useMemo(() => {
    return transactions.filter(t => {
      const d = new Date(t.date);
      return d <= dateEnd;
    });
  }, [transactions, dateEnd]);

  // Pagination Logic
  const totalPages = Math.ceil(filteredTransactions.length / itemsPerPage);
  const paginatedTransactions = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredTransactions.slice(start, start + itemsPerPage);
  }, [filteredTransactions, currentPage, itemsPerPage]);

  // 5. Compute Aggregates
  const balanceSummary: FinancialSummary = useMemo(() => aggregateData(cumulativeTransactions, categories), [cumulativeTransactions, categories]);
  const periodSummary: FinancialSummary = useMemo(() => aggregateData(statsTransactions, categories), [statsTransactions, categories]);

  const savingsAccountNames = useMemo(() => {
    return new Set(accounts.filter(a => a.isSavings).map(a => a.name));
  }, [accounts]);

  const hasSavingsAccounts = savingsAccountNames.size > 0;

  const activeBalance = useMemo(() => {
    return balanceSummary.accountBalances.reduce((sum, item) => {
      if (!savingsAccountNames.has(item.account)) {
        return sum + item.balance;
      }
      return sum;
    }, 0);
  }, [balanceSummary, savingsAccountNames]);

  const totalNetWorth = useMemo(() => {
    return balanceSummary.accountBalances.reduce((acc, curr) => acc + curr.balance, 0);
  }, [balanceSummary]);

  const savingsRate = useMemo(() => {
    if (periodSummary.totalIncome === 0) return 0;
    const savingsFlow = statsTransactions.reduce((sum, t) => {
      if (savingsAccountNames.has(t.account)) {
        return sum + t.amount;
      }
      return sum;
    }, 0);
    const netSavings = Math.max(0, savingsFlow);
    return (netSavings / periodSummary.totalIncome) * 100;
  }, [periodSummary, statsTransactions, savingsAccountNames]);

  const budgetPerformance = useMemo(() => {
    if (dateFilter === 'all') return [];

    return monthlyBudgets.map(mb => {
      const actual = statsTransactions
        .filter(t => {
           const cat = categories.find(c => c.name === t.category);
           return cat && (cat as any).budgetTypeId === mb.budgetTypeId;
        })
        .reduce((sum, t) => sum + Math.abs(t.amount), 0);
      
      const remaining = mb.amount - actual;
      const percent = mb.amount > 0 ? (actual / mb.amount) * 100 : 0;
      
      return {
        ...mb,
        actual,
        remaining,
        percent
      };
    });
  }, [monthlyBudgets, statsTransactions, categories, dateFilter]);

  const totalBudgetsValue = useMemo(() => {
    return monthlyBudgets.reduce((sum, b) => sum + b.amount, 0);
  }, [monthlyBudgets]);

  const projectedBalance = useMemo(() => {
    return periodSummary.totalIncome - totalBudgetsValue;
  }, [periodSummary.totalIncome, totalBudgetsValue]);

  const detailedBreakdown = useMemo(() => {
    const groups: Record<string, { total: number, categories: Record<string, number> }> = {};
    statsTransactions.filter(t => t.type === TransactionType.EXPENSE).forEach(t => {
       const catDef = categories.find(c => c.name === t.category);
       const groupName = catDef?.group || 'General';
       if (!groups[groupName]) groups[groupName] = { total: 0, categories: {} };
       const absAmount = Math.abs(t.amount);
       groups[groupName].total += absAmount;
       if (!groups[groupName].categories[t.category]) groups[groupName].categories[t.category] = 0;
       groups[groupName].categories[t.category] += absAmount;
    });
    return Object.entries(groups).sort((a, b) => b[1].total - a[1].total);
  }, [statsTransactions, categories]);

  const handleAddBudget = async () => {
    if (!newBudTypeId || !newBudamt || dateFilter === 'all') return;
    try {
      await saveMonthlyBudget({
        id: `mb-${Date.now()}`,
        month: dateFilter,
        budgetTypeId: newBudTypeId,
        amount: parseFloat(newBudamt)
      });
      refreshBudgets(dateFilter);
      setNewBudamt('');
      setNewBudTypeId('');
    } catch (e) {
      console.error(e);
    }
  };

  const handleDeleteBudget = async (id: string) => {
    if (confirm("Delete this budget target?")) {
      await deleteMonthlyBudget(id);
      refreshBudgets(dateFilter);
    }
  };

  if (transactions.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] p-8 text-center bg-white rounded-2xl shadow-sm border border-slate-100">
        <div className="bg-blue-100 p-4 rounded-full mb-6">
          <Wallet className="w-12 h-12 text-blue-600" />
        </div>
        <h2 className="text-2xl font-bold text-slate-800 mb-2">Welcome to Finan$$as</h2>
        <p className="text-slate-500 max-w-md mb-8">
          You don't have any transactions yet. Import your Excel/CSV files in the Admin section or add a transaction manually to get started.
        </p>
        <button 
          onClick={onNavigateToAdmin}
          className="flex items-center px-6 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors"
        >
          Go to Import Tool <ArrowRight className="w-4 h-4 ml-2" />
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-6 animate-fade-in">
      
      {/* Filters Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
         <div>
            <h2 className="text-2xl font-bold text-slate-800">Dashboard</h2>
            <p className="text-sm text-slate-500">
              Overview for <span className="font-semibold text-slate-700">{dateLabel}</span>
            </p>
         </div>
         
         <div className="flex items-center space-x-3">
            {dateFilter !== 'all' && (
              <button 
                onClick={() => setShowBudgetPlanner(!showBudgetPlanner)}
                className={`flex items-center px-4 py-2 text-sm font-bold rounded-lg border transition-all shadow-sm ${showBudgetPlanner ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-slate-700 border-slate-200 hover:text-indigo-600 hover:border-indigo-100'}`}
                title="Add Monthly Budget"
              >
                <Plus className="w-4 h-4 mr-2" />
                Add Budget
              </button>
            )}
            <button 
              onClick={togglePrivacy}
              className="p-2 text-slate-600 hover:text-blue-600 transition-colors bg-white border border-slate-200 rounded-lg shadow-sm"
              title={privacyMode ? "Show Values" : "Hide Values"}
            >
              {privacyMode ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
            </button>

            <button 
              onClick={() => setShowCharts(!showCharts)}
              className="p-2 text-slate-600 hover:text-blue-600 transition-colors bg-white border border-slate-200 rounded-lg shadow-sm"
              title={showCharts ? "Hide Charts" : "Show Charts"}
            >
              {showCharts ? <ChevronUp className="w-5 h-5" /> : <BarChart3 className="w-5 h-5" />}
            </button>

            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Calendar className="h-4 w-4 text-slate-400" />
              </div>
              <select
                value={dateFilter}
                onChange={(e) => setDateFilter(e.target.value)}
                className="pl-9 pr-8 py-2 border border-slate-200 rounded-lg text-base sm:text-sm font-medium bg-white focus:ring-2 focus:ring-blue-500 appearance-none shadow-sm text-slate-700 max-w-[200px]"
              >
                <option value="all">All Time</option>
                {availableMonths.map(month => (
                  <option key={month} value={month}>{getMonthYearLabel(month)}</option>
                ))}
              </select>
              <div className="absolute inset-y-0 right-0 pr-2 flex items-center pointer-events-none">
                <ChevronDown className="h-4 w-4 text-slate-400" />
              </div>
            </div>
         </div>
      </div>

      {/* Budget Planner Area (Top Dropdown) */}
      {dateFilter !== 'all' && showBudgetPlanner && (
         <div className="bg-white p-6 rounded-xl shadow-sm border-2 border-indigo-100 animate-in slide-in-from-top-2 duration-300">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-slate-800 flex items-center">
                <PiggyBank className="w-5 h-5 mr-2 text-indigo-500" />
                Add Monthly Budget Group for {getMonthYearLabel(dateFilter)}
              </h3>
              <button 
                onClick={() => setShowBudgetPlanner(false)}
                className="p-1 hover:bg-slate-100 rounded-full transition-colors"
              >
                <X className="w-5 h-5 text-slate-400" />
              </button>
            </div>
            
            <div className="flex flex-col md:flex-row gap-4 p-4 bg-indigo-50/50 rounded-xl border border-indigo-100">
              <div className="flex-1">
                <label className="block text-[10px] font-bold text-indigo-600 uppercase mb-1 tracking-wider">Select Budget Group</label>
                <select 
                  className="w-full bg-white border border-indigo-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none text-slate-700"
                  value={newBudTypeId}
                  onChange={e => setNewBudTypeId(e.target.value)}
                >
                  <option value="">Choose a group...</option>
                  {budgetTypes
                    .filter(bt => !monthlyBudgets.some(mb => mb.budgetTypeId === bt.id))
                    .map(bt => (
                      <option key={bt.id} value={bt.id}>{bt.name}</option>
                    ))
                  }
                </select>
              </div>
              <div className="flex-1">
                <label className="block text-[10px] font-bold text-indigo-600 uppercase mb-1 tracking-wider">Target Amount ({currency})</label>
                <div className="relative">
                  <input 
                    type="number"
                    placeholder="0.00"
                    className="w-full bg-white border border-indigo-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none text-slate-700 font-medium"
                    value={newBudamt}
                    onChange={e => setNewBudamt(e.target.value)}
                  />
                </div>
              </div>
              <div className="flex items-end">
                <button 
                  onClick={() => {
                    handleAddBudget();
                    setShowBudgetPlanner(false);
                  }}
                  disabled={!newBudTypeId || !newBudamt}
                  className="w-full md:w-auto px-8 py-2 bg-indigo-600 text-white rounded-lg text-sm font-bold hover:bg-indigo-700 disabled:opacity-50 transition-all shadow-md shadow-indigo-200"
                >
                  Save Budget Target
                </button>
              </div>
            </div>
         </div>
      )}

      {/* Stats Row */}
      <div className={`grid grid-cols-1 sm:grid-cols-2 ${hasSavingsAccounts ? 'md:grid-cols-4' : 'md:grid-cols-3'} gap-6`}>
        <StatCard 
          title="Income" 
          amount={periodSummary.totalIncome} 
          icon={<TrendingUp className="w-6 h-6 text-emerald-600" />} 
          colorClass="bg-emerald-100" 
          privacyMode={privacyMode}
          decimalSeparator={decimalSeparator}
          currency={currency}
        />
        <StatCard 
          title="Expenses" 
          amount={periodSummary.totalExpense} 
          icon={<TrendingDown className="w-6 h-6 text-rose-600" />} 
          colorClass="bg-rose-100" 
          privacyMode={privacyMode}
          decimalSeparator={decimalSeparator}
          currency={currency}
        />
        {hasSavingsAccounts ? (
          <StatCard 
            title="Savings Rate" 
            amount={savingsRate} 
            isPercentage 
            icon={<Percent className="w-6 h-6 text-blue-600" />} 
            colorClass="bg-blue-100" 
            privacyMode={false} 
            tooltip="Percentage of income saved into dedicated savings accounts"
            decimalSeparator={decimalSeparator}
            currency={currency}
          />
        ) : (
          dateFilter !== 'all' && (
            <StatCard 
              title="Projected Balance" 
              amount={projectedBalance} 
              icon={<BarChart3 className="w-6 h-6 text-blue-600" />} 
              colorClass="bg-blue-100"
              privacyMode={privacyMode}
              tooltip="Projected balance after all monthly budgets are accounted for (Income - Total Budgets)"
              decimalSeparator={decimalSeparator}
              currency={currency}
            />
          )
        )}
        <StatCard 
          title="Available Balance" 
          amount={activeBalance} 
          icon={<Wallet className="w-6 h-6 text-blue-600" />} 
          colorClass="bg-blue-100" 
          privacyMode={privacyMode}
          tooltip={`Includes only checking and regular accounts (Savings excluded)${!isCurrentView ? ' at end of selected period' : ''}`}
          decimalSeparator={decimalSeparator}
          currency={currency}
        />
      </div>

      {hasSavingsAccounts && dateFilter !== 'all' && (
          <div className="grid grid-cols-1 gap-6">
              <StatCard 
                title="Projected Balance after Budgets" 
                amount={projectedBalance} 
                icon={<BarChart3 className="w-6 h-6 text-indigo-600" />} 
                colorClass="bg-indigo-100"
                privacyMode={privacyMode}
                tooltip="Projected balance after all monthly budgets are accounted for (Income - Total Budgets)"
                decimalSeparator={decimalSeparator}
                currency={currency}
              />
          </div>
      )}

      {/* Accounts Overview */}
      <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100">
        <h3 className="text-lg font-semibold text-slate-800 mb-4 flex items-center justify-between">
          <div className="flex items-center">
            <Wallet className="w-5 h-5 mr-2 text-slate-600" />
            {isCurrentView ? 'Current Account Balances' : 'Account Balances (End of Period)'}
          </div>
          <span className="text-xs font-normal text-slate-400 bg-slate-50 px-2 py-1 rounded">
             Total Net Worth: {privacyMode ? '••••••' : formatCurrency(totalNetWorth, decimalSeparator, currency)}
          </span>
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {balanceSummary.accountBalances.map((acc, idx) => (
            <div key={idx} className="p-4 rounded-lg border border-slate-100 bg-slate-50 flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className={`p-2 bg-white rounded-md shadow-sm ${savingsAccountNames.has(acc.account) ? 'text-indigo-500' : 'text-blue-500'}`}>
                  {savingsAccountNames.has(acc.account) ? (
                    <PiggyBank className="w-5 h-5" />
                  ) : (
                    <CreditCard className="w-5 h-5" />
                  )}
                </div>
                <div>
                  <p className="text-xs font-medium text-slate-500 uppercase tracking-wide truncate max-w-[120px]" title={acc.account}>
                    {acc.account}
                  </p>
                  <p className={`font-bold ${acc.balance >= 0 ? 'text-slate-800' : 'text-red-600'}`}>
                    {privacyMode ? '••••••' : formatCurrency(acc.balance, decimalSeparator, currency)}
                  </p>
                </div>
              </div>
            </div>
          ))}
          {balanceSummary.accountBalances.length === 0 && (
             <div className="col-span-full text-center text-slate-400 text-sm py-4">
               No active accounts found for this period.
             </div>
          )}
        </div>
      </div>

      {/* Charts Section */}
      <div>
        {showCharts && (
          <div className="space-y-6 animate-fade-in">
            {/* Monthly Budget Performance */}
            {dateFilter !== 'all' && monthlyBudgets.length > 0 && (
              <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100">
                <h3 className="text-lg font-semibold text-slate-800 mb-6 flex items-center">
                  <PiggyBank className="w-5 h-5 mr-2 text-indigo-500" />
                  Monthly Budget Performance
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {budgetPerformance.map(bp => (
                    <div key={bp.id} className="p-5 border border-slate-100 rounded-xl bg-slate-50 relative overflow-hidden group">
                      <div className="flex justify-between items-start mb-3">
                        <div>
                          <h4 className="font-bold text-slate-800">{bp.budgetTypeName}</h4>
                          <p className="text-xs text-slate-500 uppercase font-bold tracking-wider">
                            {formatCurrency(bp.amount, decimalSeparator, currency)} target
                          </p>
                        </div>
                        <button 
                          onClick={() => handleDeleteBudget(bp.id)}
                          className="p-1.5 text-slate-400 hover:text-red-600 transition-colors opacity-0 group-hover:opacity-100"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>

                      <div className="flex justify-between items-baseline mb-2">
                        <span className={`text-xl font-bold ${bp.remaining >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                          {privacyMode ? '••••••' : formatCurrency(bp.remaining, decimalSeparator, currency)}
                        </span>
                        <span className="text-xs font-semibold text-slate-500">
                           {bp.percent.toFixed(0)}% spent
                        </span>
                      </div>

                      <div className="w-full bg-slate-200 rounded-full h-2.5 overflow-hidden">
                        <div 
                          className={`h-full rounded-full transition-all duration-500 ${bp.percent > 100 ? 'bg-red-500' : bp.percent > 85 ? 'bg-amber-500' : 'bg-emerald-500'}`}
                          style={{ width: `${Math.min(100, bp.percent)}%` }}
                        />
                      </div>
                      
                      <div className="mt-4 pt-4 border-t border-slate-200">
                         <p className="text-xs font-bold text-slate-400 mb-2 uppercase">Expenses by mapping</p>
                         <div className="space-y-1.5">
                            {categories
                              .filter(c => (c as any).budgetTypeId === bp.budgetTypeId)
                              .map(c => {
                                const catActual = statsTransactions
                                  .filter(t => t.category === c.name)
                                  .reduce((sum, t) => sum + Math.abs(t.amount), 0);
                                if (catActual === 0) return null;
                                return (
                                  <div key={c.id} className="flex justify-between text-xs">
                                     <span className="text-slate-600">{c.name}</span>
                                     <span className="font-medium text-slate-800">{formatCurrency(catActual, decimalSeparator, currency)}</span>
                                  </div>
                                );
                              })
                            }
                         </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
            
            <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100">
              <h3 className="text-lg font-semibold text-slate-800 mb-6">Expense Breakdown by Category</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                 {detailedBreakdown.map(([groupName, data], idx) => (
                   <div key={groupName} className="space-y-4">
                      <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                         <h4 className="font-bold text-slate-700">{groupName} Expenses</h4>
                         <span className="text-sm font-semibold text-slate-900">
                           {privacyMode ? '••••••' : formatCurrency(data.total, decimalSeparator, currency)}
                         </span>
                      </div>
                      <div className="space-y-3">
                         {Object.entries(data.categories)
                            .sort((a, b) => (b[1] as number) - (a[1] as number))
                            .map(([catName, amount], catIdx) => (
                              <div key={catName} className="relative">
                                <div className="flex justify-between text-sm z-10 relative mb-1">
                                   <span className="text-slate-600">{catName}</span>
                                   <span className="font-medium text-slate-700">
                                     {privacyMode ? '••••••' : formatCurrency(amount as number, decimalSeparator, currency)}
                                   </span>
                                </div>
                                <div className="w-full bg-slate-50 rounded-full h-1.5 overflow-hidden">
                                   <div 
                                    className="h-full rounded-full"
                                    style={{ 
                                      width: `${((amount as number) / data.total) * 100}%`,
                                      backgroundColor: COLORS[catIdx % COLORS.length]
                                    }}
                                   />
                                </div>
                              </div>
                         ))}
                      </div>
                   </div>
                 ))}
                 {detailedBreakdown.length === 0 && (
                   <div className="text-center text-slate-400 py-8 col-span-2 flex flex-col items-center">
                     <Filter className="w-8 h-8 mb-2 opacity-50" />
                     <p>No expense data available for this period.</p>
                   </div>
                 )}
              </div>
            </div>
          </div>
        )}
      </div>

       {/* Transaction List */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center">
          <h3 className="font-semibold text-slate-800">Transactions</h3>
          <span className="text-xs text-slate-500">
            {filteredTransactions.length} records 
            {dateFilter !== 'all' && ' in selected period'}
          </span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-slate-50 text-slate-500 font-medium">
              <tr>
                <th className="px-6 py-3 hidden md:table-cell">Account</th>
                <th className="px-4 sm:px-6 py-3">Description</th>
                <th className="px-6 py-3 hidden sm:table-cell">Category</th>
                <th className="px-4 sm:px-6 py-3 text-right">Amount</th>
                <th className="px-4 sm:px-6 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {paginatedTransactions.map((t, index) => {
                const dateObj = new Date(t.date);
                const dateStr = dateObj.toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
                const prevDateStr = index > 0 
                    ? new Date(paginatedTransactions[index - 1].date).toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })
                    : null;
                const showHeader = dateStr !== prevDateStr;
                const isPositiveBalance = t.type === 'Balance' && t.amount >= 0;

                return (
                  <React.Fragment key={t.id}>
                    {showHeader && (
                      <tr className="bg-slate-50/80 border-b border-slate-100">
                        <td colSpan={5} className="px-4 sm:px-6 py-2 text-xs font-bold text-slate-600 uppercase tracking-wider">
                          {dateStr}
                        </td>
                      </tr>
                    )}
                    <tr className="hover:bg-slate-50 transition-colors group">
                      <td className="px-6 py-3 text-slate-800 font-medium whitespace-nowrap hidden md:table-cell">{t.account}</td>
                      <td className="px-4 sm:px-6 py-3 text-slate-800 max-w-[120px] sm:max-w-xs truncate" title={t.description}>
                        {t.description}
                      </td>
                      <td className="px-6 py-3 whitespace-nowrap hidden sm:table-cell">
                        <span className="px-2 py-1 bg-slate-100 text-slate-600 rounded text-xs">
                          {t.category}
                        </span>
                      </td>
                      <td className="px-4 sm:px-6 py-3 text-right whitespace-nowrap">
                        <div className="flex flex-col items-end gap-0.5">
                          <span className={`font-semibold ${t.type === 'Income' || isPositiveBalance ? 'text-emerald-600' : 'text-slate-800'}`}>
                            {t.type === 'Income' || isPositiveBalance ? '+' : ''}{formatCurrency(t.amount, decimalSeparator, currency)}
                          </span>
                          {t.balanceAfterTransaction !== undefined && (
                            <span className="text-xs text-slate-400 font-medium">
                              {privacyMode ? '••••••' : formatCurrency(t.balanceAfterTransaction, decimalSeparator, currency)}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 sm:px-6 py-3 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end space-x-2">
                          <button 
                            onClick={() => onEdit(t)}
                            className="p-1 text-slate-400 hover:text-blue-600 transition-colors"
                            title="Edit"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button 
                            onClick={() => onDelete(t.id)}
                            className="p-1 text-slate-400 hover:text-red-600 transition-colors"
                            title="Delete"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  </React.Fragment>
                );
              })}
              {filteredTransactions.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-slate-400">
                    No transactions found for this period.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        
        {/* Pagination Controls */}
        {totalPages > 0 && (
            <div className="px-6 py-4 flex flex-col sm:flex-row items-center justify-between border-t border-slate-100 bg-slate-50 gap-4">
                <div className="flex items-center space-x-2">
                   <span className="text-xs text-slate-500">Show:</span>
                   <select 
                      value={itemsPerPage} 
                      onChange={(e) => setItemsPerPage(Number(e.target.value))}
                      className="text-xs border border-slate-200 rounded px-2 py-1 bg-white text-slate-700 focus:ring-1 focus:ring-blue-500 outline-none"
                   >
                      <option value={10}>10</option>
                      <option value={25}>25</option>
                      <option value={50}>50</option>
                   </select>
                </div>

                <div className="flex items-center space-x-4">
                  <button
                      onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                      disabled={currentPage === 1}
                      className="p-2 rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                      <ChevronLeft className="w-4 h-4" />
                  </button>
                  <span className="text-sm text-slate-500 font-medium">
                      Page {currentPage} of {totalPages}
                  </span>
                  <button
                      onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                      disabled={currentPage === totalPages}
                      className="p-2 rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                      <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
            </div>
        )}
      </div>
    </div>
  );
};
