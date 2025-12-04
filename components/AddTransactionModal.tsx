import React, { useState, useEffect, useMemo } from 'react';
import { X, Save, Calendar, Tag, CreditCard, DollarSign, Type } from 'lucide-react';
import { Transaction, TransactionType, Category, Account, CategoryGroup } from '../types';

interface AddTransactionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (transaction: Transaction) => void;
  categories: Category[];
  accounts: Account[];
  initialData?: Transaction | null;
}

export const AddTransactionModal: React.FC<AddTransactionModalProps> = ({
  isOpen,
  onClose,
  onSave,
  categories,
  accounts,
  initialData
}) => {
  const [formData, setFormData] = useState({
    date: new Date().toISOString().split('T')[0],
    description: '',
    amount: '',
    category: '',
    type: TransactionType.EXPENSE,
    account: ''
  });

  useEffect(() => {
    if (isOpen) {
      if (initialData) {
        setFormData({
          date: new Date(initialData.date).toISOString().split('T')[0],
          description: initialData.description,
          amount: Math.abs(initialData.amount).toString(),
          category: initialData.category,
          type: initialData.type,
          account: initialData.account
        });
      } else {
        setFormData({
          date: new Date().toISOString().split('T')[0],
          description: '',
          amount: '',
          category: '',
          type: TransactionType.EXPENSE,
          account: accounts.length > 0 ? accounts[0].name : ''
        });
      }
    }
  }, [isOpen, initialData, accounts]);

  // Filter categories based on selected Transaction Type
  const filteredCategories = useMemo(() => {
    return categories.filter(c => c.type === formData.type);
  }, [categories, formData.type]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.amount || !formData.description) return;

    let finalAmount = parseFloat(formData.amount);
    if (formData.type === TransactionType.EXPENSE) {
      finalAmount = -Math.abs(finalAmount);
    } else {
      finalAmount = Math.abs(finalAmount);
    }

    const newTransaction: Transaction = {
      id: initialData ? initialData.id : `manual-${Date.now()}`,
      date: new Date(formData.date).toISOString(),
      description: formData.description,
      amount: finalAmount,
      category: formData.category || 'Uncategorized',
      type: formData.type,
      account: formData.account || 'Cash'
    };

    onSave(newTransaction);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden animate-fade-in">
        <div className="bg-slate-50 px-6 py-4 border-b border-slate-100 flex justify-between items-center">
          <h3 className="text-lg font-bold text-slate-800">
            {initialData ? 'Edit Transaction' : 'Add Transaction'}
          </h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>
        
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          
          {/* Type Selection */}
          <div className="flex bg-slate-100 p-1 rounded-lg">
            {[TransactionType.EXPENSE, TransactionType.INCOME].map((type) => (
              <button
                key={type}
                type="button"
                onClick={() => setFormData({ ...formData, type, category: '' })} // Reset category on type change
                className={`flex-1 py-2 text-sm font-medium rounded-md transition-all ${
                  formData.type === type 
                    ? 'bg-white text-blue-600 shadow-sm' 
                    : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                {type}
              </button>
            ))}
          </div>

          {/* Amount & Date Row */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1">Amount (€)</label>
              <div className="relative">
                <DollarSign className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
                <input
                  type="number"
                  step="0.01"
                  required
                  value={formData.amount}
                  onChange={e => setFormData({ ...formData, amount: e.target.value })}
                  className="w-full pl-9 pr-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  placeholder="0.00"
                />
              </div>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1">Date</label>
              <div className="relative">
                <Calendar className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
                <input
                  type="date"
                  required
                  value={formData.date}
                  onChange={e => setFormData({ ...formData, date: e.target.value })}
                  className="w-full pl-9 pr-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs font-semibold text-slate-500 mb-1">Description</label>
            <div className="relative">
              <Type className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
              <input
                type="text"
                required
                value={formData.description}
                onChange={e => setFormData({ ...formData, description: e.target.value })}
                className="w-full pl-9 pr-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
                placeholder="e.g. Grocery Shopping"
              />
            </div>
          </div>

          {/* Account (Selection) */}
          <div>
            <label className="block text-xs font-semibold text-slate-500 mb-1">Account</label>
            <div className="relative">
              <CreditCard className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
              <input
                type="text"
                list="accounts-list"
                required
                value={formData.account}
                onChange={e => setFormData({ ...formData, account: e.target.value })}
                className="w-full pl-9 pr-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
                placeholder="Select or type new account..."
              />
              <datalist id="accounts-list">
                {accounts.map((acc, i) => (
                  <option key={i} value={acc.name} />
                ))}
              </datalist>
            </div>
          </div>

          {/* Category (Filtered Selection or New) */}
          <div>
            <label className="block text-xs font-semibold text-slate-500 mb-1">Category</label>
            <div className="relative">
              <Tag className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
              <input
                type="text"
                required
                list="category-list"
                value={formData.category}
                onChange={e => setFormData({ ...formData, category: e.target.value })}
                className="w-full pl-9 pr-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none bg-white"
                placeholder="Select or type new category..."
              />
              <datalist id="category-list">
                {filteredCategories.map(c => (
                  <option key={c.id} value={c.name} />
                ))}
              </datalist>
            </div>
             <p className="text-[10px] text-slate-400 mt-1">
               Showing {formData.type.toLowerCase()} categories. Typing a new one will create it automatically.
             </p>
          </div>

          <div className="pt-2">
            <button
              type="submit"
              className="w-full flex items-center justify-center py-2.5 px-4 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
            >
              <Save className="w-4 h-4 mr-2" />
              {initialData ? 'Update Transaction' : 'Save Transaction'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};