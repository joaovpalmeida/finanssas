import React, { useMemo, useState } from 'react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  PieChart, Pie, Cell, Legend
} from 'recharts';
import { 
  TrendingUp, TrendingDown, DollarSign, Activity, CreditCard, Wallet, Edit2, Trash2,
  ChevronDown, ChevronUp, BarChart3, Layers, ArrowRight
} from 'lucide-react';
import { Transaction, FinancialSummary, Category, TransactionType } from '../types';
import { formatCurrency, aggregateData } from '../utils/helpers';

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
  const summary: FinancialSummary = useMemo(() => aggregateData(transactions, categories), [transactions, categories]);
  const [showCharts, setShowCharts] = useState(false);

  // Helper to get breakdown for the detailed view
  const detailedBreakdown = useMemo(() => {
    const groups: Record<string, { total: number, categories: Record<string, number> }> = {};
    
    // Re-aggregate locally for the detailed list view (similar to helper but structured differently)
    transactions.filter(t => t.type === TransactionType.EXPENSE).forEach(t => {
       const catDef = categories.find(c => c.name === t.category);
       const groupName = catDef?.group || 'General';
       
       if (!groups[groupName]) groups[groupName] = { total: 0, categories: {} };
       
       const absAmount = Math.abs(t.amount);
       groups[groupName].total += absAmount;
       
       if (!groups[groupName].categories[t.category]) groups[groupName].categories[t.category] = 0;
       groups[groupName].categories[t.category] += absAmount;
    });

    return Object.entries(groups).sort((a, b) => b[1].total - a[1].total);
  }, [transactions, categories]);

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
      {/* Stats Row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <StatCard 
          title="Total Income" 
          amount={summary.totalIncome} 
          icon={<TrendingUp className="w-6 h-6 text-emerald-600" />} 
          colorClass="bg-emerald-100" 
        />
        <StatCard 
          title="Total Expenses" 
          amount={summary.totalExpense} 
          icon={<TrendingDown className="w-6 h-6 text-red-600" />} 
          colorClass="bg-red-100" 
        />
        <StatCard 
          title="Net Balance" 
          amount={summary.netSavings} 
          icon={<DollarSign className="w-6 h-6 text-blue-600" />} 
          colorClass="bg-blue-100" 
        />
      </div>

      {/* Accounts Overview */}
      <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100">
        <h3 className="text-lg font-semibold text-slate-800 mb-4 flex items-center">
          <Wallet className="w-5 h-5 mr-2 text-slate-600" />
          Account Balances
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {summary.accountBalances.map((acc, idx) => (
            <div key={idx} className="p-4 rounded-lg border border-slate-100 bg-slate-50 flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-white rounded-md shadow-sm text-blue-500">
                  <CreditCard className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">
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

      {/* Charts Section */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-slate-800 flex items-center">
            <BarChart3 className="w-5 h-5 mr-2 text-slate-600" />
            Analytics Overview
          </h3>
          <button 
            onClick={() => setShowCharts(!showCharts)}
            className="flex items-center text-sm text-slate-500 hover:text-blue-600 font-medium transition-colors bg-white border border-slate-200 px-3 py-1.5 rounded-lg shadow-sm"
          >
            {showCharts ? 'Hide Charts' : 'Show Charts'}
            {showCharts ? <ChevronUp className="w-4 h-4 ml-2" /> : <ChevronDown className="w-4 h-4 ml-2" />}
          </button>
        </div>

        {showCharts && (
          <div className="space-y-6 animate-fade-in">
             <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Monthly Trend */}
                <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100">
                  <div className="flex items-center justify-between mb-6">
                    <h3 className="text-lg font-semibold text-slate-800 flex items-center">
                      <Activity className="w-5 h-5 mr-2 text-blue-500" />
                      Monthly Cash Flow
                    </h3>
                  </div>
                  <div className="h-72">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={summary.monthlyData}>
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
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={summary.expenseByGroup}
                          cx="50%"
                          cy="50%"
                          innerRadius={60}
                          outerRadius={90}
                          paddingAngle={5}
                          dataKey="value"
                        >
                          {summary.expenseByGroup.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={GROUP_COLORS[index % GROUP_COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip formatter={(value) => formatCurrency(value as number)} />
                        <Legend verticalAlign="bottom" height={36}/>
                      </PieChart>
                    </ResponsiveContainer>
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
                   <div className="text-center text-slate-400 py-8 col-span-2">
                     No expense data available to categorize.
                   </div>
                 )}
              </div>
            </div>
          </div>
        )}
      </div>

       {/* Transaction List (Simple Table) */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center">
          <h3 className="font-semibold text-slate-800">Recent Transactions</h3>
          <span className="text-xs text-slate-500">{transactions.length} records loaded</span>
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
              {transactions.slice(0, 10).map((t) => (
                <tr key={t.id} className="hover:bg-slate-50 transition-colors group">
                  <td className="px-6 py-3 text-slate-600">{new Date(t.date).toLocaleDateString()}</td>
                  <td className="px-6 py-3 text-slate-800 font-medium">{t.account}</td>
                  <td className="px-6 py-3 text-slate-800">{t.description}</td>
                  <td className="px-6 py-3">
                    <span className="px-2 py-1 bg-slate-100 text-slate-600 rounded text-xs">
                      {t.category}
                    </span>
                  </td>
                  <td className={`px-6 py-3 text-right font-semibold ${t.type === 'Income' ? 'text-emerald-600' : 'text-slate-800'}`}>
                    {t.type === 'Income' ? '+' : ''}{formatCurrency(t.amount)}
                  </td>
                  <td className="px-6 py-3 text-right text-slate-500 font-medium">
                    {t.balanceAfterTransaction !== undefined ? formatCurrency(t.balanceAfterTransaction) : '-'}
                  </td>
                  <td className="px-6 py-3 text-right">
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
            </tbody>
          </table>
          {transactions.length > 10 && (
            <div className="px-6 py-3 bg-slate-50 text-center text-xs text-slate-500">
              Showing recent 10 transactions
            </div>
          )}
        </div>
      </div>
    </div>
  );
};