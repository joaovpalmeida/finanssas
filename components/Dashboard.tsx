import React, { useMemo, useState } from 'react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  PieChart, Pie, Cell, Legend
} from 'recharts';
import { 
  TrendingUp, TrendingDown, DollarSign, Activity, CreditCard, Wallet, Edit2, Trash2,
  ChevronDown, ChevronUp, BarChart3, Layers, ArrowRight, Calendar, Filter
} from 'lucide-react';
import { Transaction, FinancialSummary, Category, TransactionType } from '../types';
import { formatCurrency, aggregateData, getMonthYearLabel } from '../utils/helpers';

interface DashboardProps {
  transactions: Transaction[];
  categories: Category[];
  onEdit: (t: Transaction) => void;
  onDelete: (id: string) => void;
  onNavigateToAdmin: () => void;
}

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];
const GROUP_COLORS = ['#6366f1', '#f43f5e']; // Indigo for Recurring, Rose for General

const StatCard: React.FC<{ 
  title: string; 
  amount: number; 
  icon: React.ReactNode; 
  colorClass: string 
}> = ({ title, amount, icon, colorClass }) => (
  <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100 flex items-center justify-between">
    <div>
      <p className="text-sm font-medium text-slate-500 mb-1">{title}</p>
      <h3 className="text-2xl font-bold text-slate-800">{formatCurrency(amount)}</h3>
    </div>
    <div className={`p-3 rounded-full ${colorClass} bg-opacity-10`}>
      {icon}
    </div>
  </div>
);

export const Dashboard: React.FC<DashboardProps> = ({ transactions, categories, onEdit, onDelete, onNavigateToAdmin }) => {
  const [showCharts, setShowCharts] = useState(false);
  
  // Initialize filter with current month (YYYY-MM)
  const [dateFilter, setDateFilter] = useState<string>(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });

  // 1. Extract unique months for the filter dropdown
  const availableMonths = useMemo(() => {
    const dates = new Set(transactions.map(t => {
      const d = new Date(t.date);
      // Format as YYYY-MM
      return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    }));
    
    // Always include current month option so it's selectable even if empty
    const now = new Date();
    const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    dates.add(currentMonth);

    // Include currently selected month if it's not 'all' (handles viewing empty past months if selected)
    if (dateFilter !== 'all') {
      dates.add(dateFilter);
    }

    return Array.from(dates).sort().reverse(); // Newest first
  }, [transactions, dateFilter]);

  // 2. Filter transactions based on selection
  const filteredTransactions = useMemo(() => {
    if (dateFilter === 'all') return transactions;
    return transactions.filter(t => t.date.startsWith(dateFilter));
  }, [transactions, dateFilter]);

  // 3. Compute Aggregates
  // 'overallSummary' is used for Account Balances (current state)
  const overallSummary: FinancialSummary = useMemo(() => aggregateData(transactions, categories), [transactions, categories]);
  
  // 'periodSummary' is used for Stats, Charts and Transaction List (filtered view)
  const periodSummary: FinancialSummary = useMemo(() => aggregateData(filteredTransactions, categories), [filteredTransactions, categories]);

  // Helper to get breakdown for the detailed view
  const detailedBreakdown = useMemo(() => {
    const groups: Record<string, { total: number, categories: Record<string, number> }> = {};
    
    // Use filtered transactions for the breakdown
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

  if (transactions.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] p-8 text-center bg-white rounded-2xl shadow-sm border border-slate-100">
        <div className="bg-blue-100 p-4 rounded-full mb-6">
          <Wallet className="w-12 h-12 text-blue-600" />
        </div>
        <h2 className="text-2xl font-bold text-slate-800 mb-2">Welcome to FinanceAI</h2>
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
              Overview for <span className="font-semibold text-slate-700">{getMonthYearLabel(dateFilter)}</span>
            </p>
         </div>
         
         <div className="flex items-center space-x-3">
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Calendar className="h-4 w-4 text-slate-400" />
              </div>
              <select
                value={dateFilter}
                onChange={(e) => setDateFilter(e.target.value)}
                className="pl-9 pr-8 py-2 border border-slate-200 rounded-lg text-sm font-medium bg-white focus:ring-2 focus:ring-blue-500 appearance-none shadow-sm text-slate-700"
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

            <button 
              onClick={() => setShowCharts(!showCharts)}
              className="flex items-center text-sm text-slate-600 hover:text-blue-600 font-medium transition-colors bg-white border border-slate-200 px-3 py-2 rounded-lg shadow-sm"
            >
              {showCharts ? 'Hide Charts' : 'Show Charts'}
              {showCharts ? <ChevronUp className="w-4 h-4 ml-2" /> : <BarChart3 className="w-4 h-4 ml-2" />}
            </button>
         </div>
      </div>

      {/* Stats Row (Filtered Data) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <StatCard 
          title="Income" 
          amount={periodSummary.totalIncome} 
          icon={<TrendingUp className="w-6 h-6 text-emerald-600" />} 
          colorClass="bg-emerald-100" 
        />
        <StatCard 
          title="Expenses" 
          amount={periodSummary.totalExpense} 
          icon={<TrendingDown className="w-6 h-6 text-red-600" />} 
          colorClass="bg-red-100" 
        />
        <StatCard 
          title="Net Savings" 
          amount={periodSummary.netSavings} 
          icon={<DollarSign className="w-6 h-6 text-blue-600" />} 
          colorClass="bg-blue-100" 
        />
      </div>

      {/* Accounts Overview (All Time Data - Always shows current balance) */}
      <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100">
        <h3 className="text-lg font-semibold text-slate-800 mb-4 flex items-center justify-between">
          <div className="flex items-center">
            <Wallet className="w-5 h-5 mr-2 text-slate-600" />
            Current Account Balances
          </div>
          <span className="text-xs font-normal text-slate-400 bg-slate-50 px-2 py-1 rounded">
             Total Net Worth: {formatCurrency(overallSummary.accountBalances.reduce((acc, curr) => acc + curr.balance, 0))}
          </span>
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {overallSummary.accountBalances.map((acc, idx) => (
            <div key={idx} className="p-4 rounded-lg border border-slate-100 bg-slate-50 flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-white rounded-md shadow-sm text-blue-500">
                  <CreditCard className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-xs font-medium text-slate-500 uppercase tracking-wide truncate max-w-[120px]" title={acc.account}>
                    {acc.account}
                  </p>
                  <p className={`font-bold ${acc.balance >= 0 ? 'text-slate-800' : 'text-red-600'}`}>
                    {formatCurrency(acc.balance)}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Charts Section (Filtered Data) */}
      <div>
        {showCharts && (
          <div className="space-y-6 animate-fade-in">
             <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Monthly Trend */}
                <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100">
                  <div className="flex items-center justify-between mb-6">
                    <h3 className="text-lg font-semibold text-slate-800 flex items-center">
                      <Activity className="w-5 h-5 mr-2 text-blue-500" />
                      Cash Flow Trend
                    </h3>
                  </div>
                  <div className="h-72">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={periodSummary.monthlyData}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                        <XAxis dataKey="month" axisLine={false} tickLine={false} />
                        <YAxis axisLine={false} tickLine={false} tickFormatter={(val) => `€${val}`} />
                        <Tooltip 
                          formatter={(value) => formatCurrency(value as number)}
                          contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                        />
                        <Bar dataKey="income" fill="#10b981" radius={[4, 4, 0, 0]} name="Income" />
                        <Bar dataKey="expense" fill="#ef4444" radius={[4, 4, 0, 0]} name="Expense" />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* Expense Structure (Group) */}
                <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100">
                  <h3 className="text-lg font-semibold text-slate-800 mb-6 flex items-center">
                    <Layers className="w-5 h-5 mr-2 text-indigo-500" />
                    Expense Structure
                  </h3>
                  <div className="h-72">
                    {periodSummary.totalExpense > 0 ? (
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={periodSummary.expenseByGroup}
                            cx="50%"
                            cy="50%"
                            innerRadius={60}
                            outerRadius={90}
                            paddingAngle={5}
                            dataKey="value"
                          >
                            {periodSummary.expenseByGroup.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={GROUP_COLORS[index % GROUP_COLORS.length]} />
                            ))}
                          </Pie>
                          <Tooltip formatter={(value) => formatCurrency(value as number)} />
                          <Legend verticalAlign="bottom" height={36}/>
                        </PieChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="flex items-center justify-center h-full text-slate-400 text-sm">
                        No expense data for this period
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
                         <span className="text-sm font-semibold text-slate-900">{formatCurrency(data.total)}</span>
                      </div>
                      <div className="space-y-3">
                         {Object.entries(data.categories)
                            .sort((a, b) => (b[1] as number) - (a[1] as number))
                            .map(([catName, amount], catIdx) => (
                              <div key={catName} className="relative">
                                <div className="flex justify-between text-sm z-10 relative mb-1">
                                   <span className="text-slate-600">{catName}</span>
                                   <span className="font-medium text-slate-700">{formatCurrency(amount as number)}</span>
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

       {/* Transaction List (Filtered) */}
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
                <th className="px-6 py-3">Date</th>
                <th className="px-6 py-3">Account</th>
                <th className="px-6 py-3">Description</th>
                <th className="px-6 py-3">Category</th>
                <th className="px-6 py-3 text-right">Amount</th>
                <th className="px-6 py-3 text-right">Balance</th>
                <th className="px-6 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredTransactions.slice(0, 50).map((t) => (
                <tr key={t.id} className="hover:bg-slate-50 transition-colors group">
                  <td className="px-6 py-3 text-slate-600 whitespace-nowrap">{new Date(t.date).toLocaleDateString()}</td>
                  <td className="px-6 py-3 text-slate-800 font-medium whitespace-nowrap">{t.account}</td>
                  <td className="px-6 py-3 text-slate-800 max-w-xs truncate">{t.description}</td>
                  <td className="px-6 py-3 whitespace-nowrap">
                    <span className="px-2 py-1 bg-slate-100 text-slate-600 rounded text-xs">
                      {t.category}
                    </span>
                  </td>
                  <td className={`px-6 py-3 text-right font-semibold whitespace-nowrap ${t.type === 'Income' ? 'text-emerald-600' : 'text-slate-800'}`}>
                    {t.type === 'Income' ? '+' : ''}{formatCurrency(t.amount)}
                  </td>
                  <td className="px-6 py-3 text-right text-slate-500 font-medium whitespace-nowrap">
                    {t.balanceAfterTransaction !== undefined ? formatCurrency(t.balanceAfterTransaction) : '-'}
                  </td>
                  <td className="px-6 py-3 text-right whitespace-nowrap">
                    <div className="flex items-center justify-end space-x-2 opacity-0 group-hover:opacity-100 transition-opacity">
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
              ))}
              {filteredTransactions.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-slate-400">
                    No transactions found for this period.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
          {filteredTransactions.length > 50 && (
            <div className="px-6 py-3 bg-slate-50 text-center text-xs text-slate-500 border-t border-slate-100">
              Showing first 50 transactions of {filteredTransactions.length}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};