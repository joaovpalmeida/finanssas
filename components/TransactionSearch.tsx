import React, { useState, useEffect, useMemo } from 'react';
import { Search, Filter, X, Calendar, Tag, CreditCard, ArrowDown, ArrowUp, Loader2, Edit2, Trash2, ChevronLeft, ChevronRight } from 'lucide-react';
import { Transaction, Category, Account, SearchFilters, TransactionType } from '../types';
import { searchTransactions } from '../services/db';
import { formatCurrency, formatDate } from '../utils/helpers';

interface TransactionSearchProps {
  categories: Category[];
  accounts: Account[];
  onEdit: (t: Transaction) => void;
  onDelete: (id: string) => void;
  decimalSeparator: '.' | ',';
  dateFormat: string;
}

export const TransactionSearch: React.FC<TransactionSearchProps> = ({ 
  categories, 
  accounts, 
  onEdit, 
  onDelete, 
  decimalSeparator,
  dateFormat 
}) => {
  const [results, setResults] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(false);
  
  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  
  const [filters, setFilters] = useState<SearchFilters>({
    keyword: '',
    category: '',
    account: '',
    type: '',
    startDate: '',
    endDate: '',
    minAmount: '',
    maxAmount: ''
  });

  // Load initial results
  useEffect(() => {
    handleSearch();
  }, []);

  const handleSearch = () => {
    setLoading(true);
    setCurrentPage(1); // Reset to first page on new search
    // Small timeout to allow UI to render loader
    setTimeout(() => {
        const data = searchTransactions(filters);
        setResults(data);
        setLoading(false);
    }, 100);
  };

  const handleClear = () => {
    setFilters({
        keyword: '',
        category: '',
        account: '',
        type: '',
        startDate: '',
        endDate: '',
        minAmount: '',
        maxAmount: ''
    });
    setCurrentPage(1);
    // Trigger search after state update would normally require useEffect, 
    // but here we can just pass empty filters directly to search
    const emptyFilters = { keyword: '', category: '', account: '', type: '', startDate: '', endDate: '', minAmount: '', maxAmount: '' };
    setResults(searchTransactions(emptyFilters));
  };

  const handleDeleteClick = (id: string) => {
    if (confirm("Are you sure you want to delete this transaction?")) {
        onDelete(id);
        // Refresh local results
        setResults(prev => prev.filter(t => t.id !== id));
    }
  }

  // Calculate pagination
  const totalPages = Math.ceil(results.length / itemsPerPage);
  const paginatedResults = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return results.slice(start, start + itemsPerPage);
  }, [results, currentPage, itemsPerPage]);

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-slate-800 flex items-center">
            <Search className="w-6 h-6 mr-2 text-blue-600" />
            Search Transactions
          </h2>
          <span className="text-xs font-medium text-slate-500 bg-slate-100 px-3 py-1 rounded-full">
            {results.length} results found
          </span>
        </div>

        {/* Filters Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
           {/* Keyword */}
           <div className="lg:col-span-2">
             <label className="block text-xs font-semibold text-slate-500 mb-1">Keywords</label>
             <div className="relative">
                <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
                <input 
                  type="text" 
                  value={filters.keyword}
                  onChange={e => setFilters({...filters, keyword: e.target.value})}
                  placeholder="Search description..."
                  className="w-full pl-9 pr-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none text-base sm:text-sm bg-white text-slate-800"
                  onKeyDown={e => e.key === 'Enter' && handleSearch()}
                />
             </div>
           </div>

           {/* Category */}
           <div>
             <label className="block text-xs font-semibold text-slate-500 mb-1">Category</label>
             <div className="relative">
                <Tag className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
                <select 
                  value={filters.category}
                  onChange={e => setFilters({...filters, category: e.target.value})}
                  className="w-full pl-9 pr-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none text-base sm:text-sm appearance-none bg-white text-slate-800"
                >
                  <option value="">All Categories</option>
                  {categories.map(c => (
                    <option key={c.id} value={c.name}>{c.name}</option>
                  ))}
                </select>
             </div>
           </div>

           {/* Account */}
           <div>
             <label className="block text-xs font-semibold text-slate-500 mb-1">Account</label>
             <div className="relative">
                <CreditCard className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
                <select 
                  value={filters.account}
                  onChange={e => setFilters({...filters, account: e.target.value})}
                  className="w-full pl-9 pr-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none text-base sm:text-sm appearance-none bg-white text-slate-800"
                >
                  <option value="">All Accounts</option>
                  {accounts.map(a => (
                    <option key={a.id} value={a.name}>{a.name}</option>
                  ))}
                </select>
             </div>
           </div>

           {/* Date Range */}
           <div>
             <label className="block text-xs font-semibold text-slate-500 mb-1">Start Date</label>
             <input 
               type="date"
               value={filters.startDate}
               onChange={e => setFilters({...filters, startDate: e.target.value})}
               className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none text-base sm:text-sm bg-white text-slate-800"
             />
           </div>
           <div>
             <label className="block text-xs font-semibold text-slate-500 mb-1">End Date</label>
             <input 
               type="date"
               value={filters.endDate}
               onChange={e => setFilters({...filters, endDate: e.target.value})}
               className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none text-base sm:text-sm bg-white text-slate-800"
             />
           </div>

           {/* Type */}
           <div>
             <label className="block text-xs font-semibold text-slate-500 mb-1">Type</label>
             <select 
                value={filters.type}
                onChange={e => setFilters({...filters, type: e.target.value})}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none text-base sm:text-sm bg-white text-slate-800"
             >
                <option value="">All Types</option>
                <option value="Income">Income</option>
                <option value="Expense">Expense</option>
                <option value="Transfer">Transfer</option>
                <option value="Balance">Balance</option>
             </select>
           </div>
           
           {/* Actions */}
           <div className="flex items-end space-x-2">
             <button 
               onClick={handleSearch}
               disabled={loading}
               className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors flex items-center justify-center"
             >
               {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4 mr-2" />}
               Search
             </button>
             <button 
               onClick={handleClear}
               className="bg-slate-100 text-slate-600 px-3 py-2 rounded-lg hover:bg-slate-200 transition-colors"
               title="Clear Filters"
             >
               <X className="w-5 h-5" />
             </button>
           </div>
        </div>
      </div>

      {/* Results Table */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-slate-50 text-slate-500 font-medium border-b border-slate-100">
              <tr>
                <th className="px-4 sm:px-6 py-3">Date</th>
                <th className="px-6 py-3 hidden md:table-cell">Account</th>
                <th className="px-4 sm:px-6 py-3">Description</th>
                <th className="px-6 py-3 hidden sm:table-cell">Category</th>
                <th className="px-4 sm:px-6 py-3 text-right">Amount</th>
                <th className="px-4 sm:px-6 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {paginatedResults.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-slate-400">
                    <Filter className="w-12 h-12 mx-auto mb-3 text-slate-200" />
                    <p>No transactions found matching your criteria.</p>
                  </td>
                </tr>
              ) : (
                paginatedResults.map((t) => (
                  <tr key={t.id} className="hover:bg-slate-50 transition-colors group">
                    <td className="px-4 sm:px-6 py-3 text-slate-600 whitespace-nowrap">
                        {formatDate(t.date, dateFormat)}
                    </td>
                    <td className="px-6 py-3 text-slate-800 font-medium whitespace-nowrap hidden md:table-cell">{t.account}</td>
                    <td className="px-4 sm:px-6 py-3 text-slate-800 max-w-[120px] sm:max-w-xs truncate" title={t.description}>{t.description}</td>
                    <td className="px-6 py-3 whitespace-nowrap hidden sm:table-cell">
                      <span className="px-2 py-1 bg-slate-100 text-slate-600 rounded text-xs">
                        {t.category}
                      </span>
                    </td>
                    <td className={`px-4 sm:px-6 py-3 text-right font-semibold whitespace-nowrap ${t.type === 'Income' ? 'text-emerald-600' : 'text-slate-800'}`}>
                      {t.type === 'Income' ? '+' : ''}{formatCurrency(t.amount, decimalSeparator)}
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
                                onClick={() => handleDeleteClick(t.id)}
                                className="p-1 text-slate-400 hover:text-red-600 transition-colors"
                                title="Delete"
                            >
                                <Trash2 className="w-4 h-4" />
                            </button>
                        </div>
                    </td>
                  </tr>
                ))
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
                      onChange={(e) => {
                          setItemsPerPage(Number(e.target.value));
                          setCurrentPage(1); // Reset to page 1 on size change
                      }}
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
        
        {results.length >= 500 && (
            <div className="p-3 bg-yellow-50 text-yellow-700 text-xs text-center border-t border-yellow-100">
                Display limited to 500 most recent results. Refine your search for more specific data.
            </div>
        )}
      </div>
    </div>
  );
};