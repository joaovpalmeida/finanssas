import React, { useMemo, useState, useEffect } from 'react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  PieChart, Pie, Cell, Legend
} from 'recharts';
import { 
  TrendingUp, TrendingDown, DollarSign, CreditCard, Wallet, Edit2, Trash2,
  ChevronDown, ChevronUp, BarChart3, Layers, ArrowRight, Calendar, Filter, ChevronLeft, ChevronRight,
  Eye, EyeOff, Info, PiggyBank, PieChart as PieIcon, Percent
} from 'lucide-react';
import { Transaction, FinancialSummary, Category, TransactionType, Account, FiscalConfig } from '../types';
import { formatCurrency, aggregateData, getMonthYearLabel, getFiscalDateRange } from '../utils/helpers';
import { getPrivacySetting, savePrivacySetting, getFiscalConfig } from '../services/db';

interface DashboardProps {
  transactions: Transaction[];
  categories: Category[];
  accounts?: Account[];
  onEdit: (t: Transaction) => void;
  onDelete: (id: string) => void;
  onNavigateToAdmin: () => void;
  decimalSeparator: '.' | ',';
}

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#6366f1', '#14b8a6'];

// Map specific groups to colors
const GROUP_COLOR_MAP: Record<string, string> = {
  'Recurring': '#6366f1', // Indigo
  'General': '#f43f5e',   // Rose
  'Savings': '#10b981',   // Emerald
};
const FALLBACK_COLOR = '#94a3b8'; // Slate

const StatCard: React.FC<{ 
  title: string; 
  amount: number; 
  icon: React.ReactNode; 
  colorClass: string;
  privacyMode: boolean;
  tooltip?: string;
  isPercentage?: boolean;
  decimalSeparator: '.' | ',';
}> = ({ title, amount, icon, colorClass, privacyMode, tooltip, isPercentage, decimalSeparator }) => (
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
        {privacyMode ? '••••••' : (isPercentage ? `${amount.toFixed(1)}%` : formatCurrency(amount, decimalSeparator))}
      </h3>
    </div>
    <div className={`p-3 rounded-full ${colorClass} bg-opacity-10`}>
      {icon}
    </div>
  </div>
);

export const Dashboard: React.FC<DashboardProps> = ({ transactions, categories, accounts = [], onEdit, onDelete, onNavigateToAdmin, decimalSeparator }) => {
  const [showCharts, setShowCharts] = useState(false);
  const [privacyMode, setPrivacyMode] = useState(true); // Default to true (hidden)
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [allocationView, setAllocationView] = useState<'group' | 'category'>('group');
  
  // Fiscal Config State
  const [fiscalConfig, setFiscalConfig] = useState<FiscalConfig>({ mode: 'calendar' });

  // 2. Extract unique months for the dropdown history
  const availableMonths = useMemo(() => {
    const dates = new Set(transactions.map(t => {
      const d = new Date(t.date);
      return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    }));
    const list = Array.from(dates).sort().reverse(); // Newest first
    
    // Ensure current month is always in the list
    const currentMonthKey = `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}`;
    if (!list.includes(currentMonthKey)) {
        list.unshift(currentMonthKey);
    }
    return list;
  }, [transactions]);

  // Default filter to current month
  const [dateFilter, setDateFilter] = useState<string>(
      `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}`
  );

  // Load privacy setting & fiscal config on mount
  useEffect(() => {
    const savedPrivacy = getPrivacySetting();
    setPrivacyMode(savedPrivacy);
    
    const config = getFiscalConfig();
    setFiscalConfig(config);
  }, []);

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
  // Added 'transactions' dependency to support 'income_trigger' mode which scans history
  const { start: dateStart, end: dateEnd, label: dateLabel } = useMemo(() => {
      return getFiscalDateRange(dateFilter, fiscalConfig, transactions);
  }, [dateFilter, fiscalConfig, transactions]);

  // Determine if the view is "Current"
  const isCurrentView = useMemo(() => {
    // It's current if filter is 'all' or the current month key
    const currentMonthKey = `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}`;
    if (dateFilter === 'all') return true;
    
    // Check if Today is inside the fiscal range of the selected filter
    const now = new Date();
    if (dateStart && dateEnd) {
       return now >= dateStart && now <= dateEnd;
    }
    return dateFilter === currentMonthKey;
  }, [dateFilter, dateStart, dateEnd]);

  // 3. Filter transactions based on selection (For Flow: Income/Expense charts)
  const filteredTransactions = useMemo(() => {
    return transactions.filter(t => {
      const d = new Date(t.date);
      // Start is inclusive (if set), End is inclusive
      return (!dateStart || d >= dateStart) && d <= dateEnd;
    });
  }, [transactions, dateStart, dateEnd]);

  // 4. Filter for Balances (Cumulative Stock)
  // Balances include everything UP TO the end date.
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
  const periodSummary: FinancialSummary = useMemo(() => aggregateData(filteredTransactions, categories), [filteredTransactions, categories]);

  // Identify savings accounts
  const savingsAccountNames = useMemo(() => {
    return new Set(accounts.filter(a => a.isSavings).map(a => a.name));
  }, [accounts]);

  const hasSavingsAccounts = savingsAccountNames.size > 0;

  // Calculate "Active Balance" (Total - Savings) using balanceSummary
  const activeBalance = useMemo(() => {
    return balanceSummary.accountBalances.reduce((sum, item) => {
      if (!savingsAccountNames.has(item.account)) {
        return sum + item.balance;
      }
      return sum;
    }, 0);
  }, [balanceSummary, savingsAccountNames]);

  // Total Net Worth (Includes Savings) using balanceSummary
  const totalNetWorth = useMemo(() => {
    return balanceSummary.accountBalances.reduce((acc, curr) => acc + curr.balance, 0);
  }, [balanceSummary]);

  // Calculate Savings Rate based on net flow into Savings Accounts
  const savingsRate = useMemo(() => {
    if (periodSummary.totalIncome === 0) return 0;
    
    // Sum of all transactions linked to savings accounts in the current period
    const savingsFlow = filteredTransactions.reduce((sum, t) => {
      if (savingsAccountNames.has(t.account)) {
        // We only care about positive flow into savings (e.g. transfers in or income)
        // If we want net flow (in minus out), just sum t.amount.
        // Usually savings rate is (Money Saved) / Income.
        // Money Saved = Net Increase in Savings Account Balance.
        return sum + t.amount;
      }
      return sum;
    }, 0);

    // If net flow is negative (withdrew from savings), rate is effectively 0 for this period context
    const netSavings = Math.max(0, savingsFlow);

    return (netSavings / periodSummary.totalIncome) * 100;
  }, [periodSummary, filteredTransactions, savingsAccountNames]);

  // Helper to get breakdown for the detailed view
  const detailedBreakdown = useMemo(() => {
    const groups: Record<string, { total: number, categories: Record<string, number> }> = {};
    
    filteredTransactions.filter(t => t.type === TransactionType.EXPENSE).forEach(t => {
       const catDef = categories.find(c => c.name === t.category);
       const groupName = catDef?.group || 'General';
       
       if (!groups[groupName]) groups[groupName] = { total: 0, categories: {} };
       
       const absAmount = Math.abs(t.amount);
       groups[groupName].total += absAmount;
       
       if (!groups[groupName].categories[t.category]) groups[groupName].categories[t.category] = 0;
       groups[groupName].categories[t.category] += absAmount;
    });

    return Object.entries(groups).sort((a, b) => b[1].total - a[1].total);
  }, [filteredTransactions, categories]);

  // Calculate Structure Data
  const structureData = useMemo(() => {
    const data = [...periodSummary.expenseByGroup];
    const savings = periodSummary.totalIncome - periodSummary.totalExpense;
    if (savings > 0) {
      data.push({ name: 'Savings', value: savings });
    }
    return data;
  }, [periodSummary]);

  // Calculate Category Allocation Data
  const categoryAllocationData = useMemo(() => {
    const data = periodSummary.topCategories.map(c => ({ name: c.name, value: c.value }));
    const topSum = data.reduce((sum, item) => sum + item.value, 0);
    const otherSum = periodSummary.totalExpense - topSum;
    
    if (otherSum > 0) {
      data.push({ name: 'Others', value: otherSum });
    }

    const savings = periodSummary.totalIncome - periodSummary.totalExpense;
    if (savings > 0) {
      data.push({ name: 'Savings', value: savings });
    }
    
    return data;
  }, [periodSummary]);

  const activeChartData = allocationView === 'group' ? structureData : categoryAllocationData;

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

      {/* Stats Row */}
      <div className={`grid grid-cols-1 sm:grid-cols-2 ${hasSavingsAccounts ? 'md:grid-cols-4' : 'md:grid-cols-3'} gap-6`}>
        <StatCard 
          title="Income" 
          amount={periodSummary.totalIncome} 
          icon={<TrendingUp className="w-6 h-6 text-emerald-600" />} 
          colorClass="bg-emerald-100"
          privacyMode={privacyMode}
          decimalSeparator={decimalSeparator}
        />
        <StatCard 
          title="Expenses" 
          amount={periodSummary.totalExpense} 
          icon={<TrendingDown className="w-6 h-6 text-red-600" />} 
          colorClass="bg-red-100"
          privacyMode={privacyMode}
          decimalSeparator={decimalSeparator}
        />
        {hasSavingsAccounts && (
          <StatCard 
            title="Savings Rate" 
            amount={savingsRate} 
            icon={<Percent className="w-6 h-6 text-purple-600" />} 
            colorClass="bg-purple-100"
            privacyMode={privacyMode}
            isPercentage
            tooltip="Percentage of income added to Savings Accounts this period"
            decimalSeparator={decimalSeparator}
          />
        )}
        <StatCard 
          title="Available Balance" 
          amount={activeBalance} 
          icon={<Wallet className="w-6 h-6 text-blue-600" />} 
          colorClass="bg-blue-100"
          privacyMode={privacyMode}
          tooltip={`Includes only checking and regular accounts (Savings excluded)${!isCurrentView ? ' at end of selected period' : ''}`}
          decimalSeparator={decimalSeparator}
        />
      </div>

      {/* Accounts Overview */}
      <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100">
        <h3 className="text-lg font-semibold text-slate-800 mb-4 flex items-center justify-between">
          <div className="flex items-center">
            <Wallet className="w-5 h-5 mr-2 text-slate-600" />
            {isCurrentView ? 'Current Account Balances' : 'Account Balances (End of Period)'}
          </div>
          <span className="text-xs font-normal text-slate-400 bg-slate-50 px-2 py-1 rounded">
             Total Net Worth: {privacyMode ? '••••••' : formatCurrency(totalNetWorth, decimalSeparator)}
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
                    {privacyMode ? '••••••' : formatCurrency(acc.balance, decimalSeparator)}
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
             <div className="grid grid-cols-1 gap-6">
                {/* Expense Structure / Cash Flow Allocation */}
                <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100">
                  <div className="flex items-center justify-between mb-6">
                    <h3 className="text-lg font-semibold text-slate-800 flex items-center">
                      <PieIcon className="w-5 h-5 mr-2 text-indigo-500" />
                      Cash Flow Allocation
                    </h3>
                    <div className="flex bg-slate-100 p-1 rounded-lg">
                       <button
                         onClick={() => setAllocationView('group')}
                         className={`px-3 py-1 text-xs font-medium rounded-md transition-all ${allocationView === 'group' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                       >
                         Group
                       </button>
                       <button
                         onClick={() => setAllocationView('category')}
                         className={`px-3 py-1 text-xs font-medium rounded-md transition-all ${allocationView === 'category' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                       >
                         Category
                       </button>
                    </div>
                  </div>
                  <div className="h-72">
                    {periodSummary.totalIncome > 0 || periodSummary.totalExpense > 0 ? (
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={activeChartData}
                            cx="50%"
                            cy="50%"
                            innerRadius={60}
                            outerRadius={90}
                            paddingAngle={5}
                            dataKey="value"
                          >
                            {activeChartData.map((entry, index) => (
                              <Cell 
                                key={`cell-${index}`} 
                                fill={allocationView === 'group' 
                                  ? (GROUP_COLOR_MAP[entry.name] || FALLBACK_COLOR)
                                  : (entry.name === 'Savings' ? '#10b981' : COLORS[index % COLORS.length])
                                } 
                              />
                            ))}
                          </Pie>
                          <Tooltip formatter={(value) => privacyMode ? '••••••' : formatCurrency(value as number, decimalSeparator)} />
                          <Legend verticalAlign="bottom" height={36}/>
                        </PieChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="flex items-center justify-center h-full text-slate-400 text-sm">
                        No financial data for this period
                      </div>
                    )}
                  </div>
                </div>
            </div>

            {/* Detailed Expense Breakdown */}
            <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100">
              <h3 className="text-lg font-semibold text-slate-800 mb-6">Expense Breakdown by Category</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                 {detailedBreakdown.map(([groupName, data], idx) => (
                   <div key={groupName} className="space-y-4">
                      <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                         <h4 className="font-bold text-slate-700">{groupName} Expenses</h4>
                         <span className="text-sm font-semibold text-slate-900">
                           {privacyMode ? '••••••' : formatCurrency(data.total, decimalSeparator)}
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
                                     {privacyMode ? '••••••' : formatCurrency(amount as number, decimalSeparator)}
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

       {/* Transaction List (Filtered & Paginated & Grouped by Date) */}
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
                {/* Removed separate Date column */}
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
                
                // Compare with previous item in the *paginated* list to determine if header is needed
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
                            {t.type === 'Income' || isPositiveBalance ? '+' : ''}{formatCurrency(t.amount, decimalSeparator)}
                          </span>
                          {t.balanceAfterTransaction !== undefined && (
                            <span className="text-xs text-slate-400 font-medium">
                              {privacyMode ? '••••••' : formatCurrency(t.balanceAfterTransaction, decimalSeparator)}
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