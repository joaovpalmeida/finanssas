import React, { useState, useEffect, useMemo, useId } from 'react';
import { X, Save, Calendar, Tag, CreditCard, DollarSign, Type, ArrowRightLeft, ArrowUpCircle, ArrowDownCircle, ArrowRight, ChevronDown, List, Plus } from 'lucide-react';
import { Transaction, TransactionType, Category, Account } from '../types';

interface AddTransactionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (transactions: Transaction[]) => void;
  categories: Category[];
  accounts: Account[];
  initialData?: Partial<Transaction> | null;
}

const AccountField = ({ 
  label, 
  value, 
  onChange, 
  accounts, 
  placeholder,
  icon: Icon,
  allowCreation = true
}: {
  label: string,
  value: string,
  onChange: (val: string) => void,
  accounts: Account[],
  placeholder: string,
  icon?: React.ElementType,
  allowCreation?: boolean
}) => {
  // Default to 'select' if we have accounts, otherwise 'input' (though usually we have accounts)
  // If allowCreation is false, we force 'select' mode.
  const [mode, setMode] = useState<'select' | 'input'>('select');

  useEffect(() => {
    if (!allowCreation) {
      setMode('select');
    }
  }, [allowCreation]);

  const savings = accounts.filter(a => a.isSavings);
  const regular = accounts.filter(a => !a.isSavings);

  return (
    <div>
      <div className="flex justify-between items-end mb-1">
        <label className="block text-xs font-semibold text-slate-500">{label}</label>
        {allowCreation && (
          <button
            type="button"
            onClick={() => setMode(mode === 'select' ? 'input' : 'select')}
            className="text-[10px] text-blue-600 hover:text-blue-700 flex items-center bg-blue-50 px-2 py-0.5 rounded transition-colors"
          >
            {mode === 'select' ? (
              <>
                <Plus className="w-3 h-3 mr-1" /> Type New
              </>
            ) : (
              <>
                <List className="w-3 h-3 mr-1" /> Select Existing
              </>
            )}
          </button>
        )}
      </div>
      
      <div className="relative">
        {Icon && <Icon className="absolute left-3 top-2.5 w-4 h-4 text-slate-400 z-10 pointer-events-none" />}
        
        {mode === 'select' ? (
          <div className="relative">
             <select
                value={value}
                onChange={(e) => onChange(e.target.value)}
                className={`w-full ${Icon ? 'pl-9' : 'px-3'} pr-8 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none bg-white text-slate-800 text-sm appearance-none cursor-pointer`}
                required
             >
                <option value="" disabled>Select account...</option>
                {savings.length > 0 && (
                  <optgroup label="Savings Accounts">
                    {savings.map(a => <option key={a.id} value={a.name}>{a.name}</option>)}
                  </optgroup>
                )}
                {regular.length > 0 && (
                  <optgroup label="Regular Accounts">
                    {regular.map(a => <option key={a.id} value={a.name}>{a.name}</option>)}
                  </optgroup>
                )}
             </select>
             <div className="absolute inset-y-0 right-0 flex items-center pr-2 pointer-events-none text-slate-500">
               <ChevronDown className="w-4 h-4" />
             </div>
          </div>
        ) : (
          <input
              type="text"
              value={value}
              onChange={(e) => onChange(e.target.value)}
              className={`w-full ${Icon ? 'pl-9' : 'px-3'} pr-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none bg-white text-slate-800 text-sm`}
              placeholder={placeholder}
              required
              autoFocus
          />
        )}
      </div>
    </div>
  );
};

export const AddTransactionModal: React.FC<AddTransactionModalProps> = ({
  isOpen,
  onClose,
  onSave,
  categories,
  accounts,
  initialData
}) => {
  // Transfer direction state: 'out' (default) or 'in' (only used for editing)
  const [transferDir, setTransferDir] = useState<'in' | 'out'>('out');
  
  // Destination account for new transfers
  const [toAccount, setToAccount] = useState('');

  const [formData, setFormData] = useState({
    date: new Date().toISOString().split('T')[0],
    description: '',
    amount: '',
    category: '',
    type: TransactionType.EXPENSE,
    account: ''
  });

  const isEditing = !!(initialData && initialData.id);

  useEffect(() => {
    if (isOpen) {
      if (isEditing) {
        // Editing existing transaction
        const amt = initialData.amount || 0;
        setFormData({
          date: initialData.date ? new Date(initialData.date).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
          description: initialData.description || '',
          amount: Math.abs(amt).toString(),
          category: initialData.category || '',
          type: initialData.type || TransactionType.EXPENSE,
          account: initialData.account || ''
        });
        // Set transfer direction based on amount sign if it's a transfer
        if (initialData.type === TransactionType.TRANSFER) {
            setTransferDir(amt >= 0 ? 'in' : 'out');
        }
        setToAccount(''); // Not used in edit mode for single record
      } else {
        // Brand new transaction
        // Default to first account if available
        const defaultAccount = accounts.length > 0 ? accounts[0].name : '';
        setFormData({
          date: new Date().toISOString().split('T')[0],
          description: '',
          amount: '',
          category: '',
          type: initialData?.type || TransactionType.EXPENSE,
          account: initialData?.account || defaultAccount
        });
        setTransferDir('out');
        
        // Default destination account (different from source if possible)
        const defaultSource = initialData?.account || defaultAccount;
        const availableDest = accounts.find(a => a.name !== defaultSource);
        setToAccount(availableDest ? availableDest.name : '');
      }
    }
  }, [isOpen, initialData, accounts]);

  // Ensure To Account is not the same as From Account when changing From Account
  useEffect(() => {
    if (!isEditing && formData.type === TransactionType.TRANSFER && formData.account === toAccount) {
        const other = accounts.find(a => a.name !== formData.account);
        if (other) setToAccount(other.name);
    }
  }, [formData.account, formData.type, isEditing, accounts]);

  // Filter categories based on selected Transaction Type
  const filteredCategories = useMemo(() => {
    return categories.filter(c => c.type === formData.type);
  }, [categories, formData.type]);

  // Filter accounts for destination to exclude source
  const destinationAccounts = useMemo(() => {
    return accounts.filter(a => a.name !== formData.account);
  }, [accounts, formData.account]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.amount) return;

    // Validation: Strict Account Existence for Transfers
    if (formData.type === TransactionType.TRANSFER) {
        const sourceExists = accounts.some(a => a.name === formData.account);
        if (!sourceExists) {
            alert("For transfers, you must select an existing account.");
            return;
        }
        
        if (!isEditing) {
            const destExists = accounts.some(a => a.name === toAccount);
            if (!destExists) {
                alert("Destination account must exist.");
                return;
            }
        }
    }

    // Calculate final date with time
    let finalDate: string;
    if (!isEditing) {
        // When adding, append current time to the selected date
        const now = new Date();
        const [year, month, day] = formData.date.split('-').map(Number);
        const dateObj = new Date(year, month - 1, day, now.getHours(), now.getMinutes(), now.getSeconds());
        finalDate = dateObj.toISOString();
    } else {
        // When editing, strictly use the date picker value (defaults to midnight UTC for that date)
        finalDate = new Date(formData.date).toISOString();
    }

    let finalAmount = parseFloat(formData.amount);
    
    // If adding a new Transfer, we create two transactions: one out, one in
    if (!isEditing && formData.type === TransactionType.TRANSFER) {
        const amount = Math.abs(finalAmount);
        const sourceAcc = formData.account || 'Cash';
        const destAcc = toAccount || 'Cash';

        if (sourceAcc === destAcc) {
            alert("Source and Destination accounts cannot be the same.");
            return;
        }
        
        // 1. Outflow from "Account" (Source)
        const txnOut: Transaction = {
            id: `manual-tr-out-${Date.now()}`,
            date: finalDate,
            description: formData.description || 'Transfer Out',
            amount: -amount,
            category: formData.category || 'Transfer',
            type: TransactionType.TRANSFER,
            account: sourceAcc
        };

        // 2. Inflow to "To Account" (Destination)
        const txnIn: Transaction = {
            id: `manual-tr-in-${Date.now()}`,
            date: finalDate,
            description: formData.description || 'Transfer In',
            amount: amount,
            category: formData.category || 'Transfer',
            type: TransactionType.TRANSFER,
            account: destAcc
        };

        onSave([txnOut, txnIn]);
    } else {
        // Standard single transaction logic (Expense, Income, or Editing a Transfer leg)
        if (formData.type === TransactionType.EXPENSE) {
            finalAmount = -Math.abs(finalAmount);
        } else if (formData.type === TransactionType.INCOME) {
            finalAmount = Math.abs(finalAmount);
        } else if (formData.type === TransactionType.TRANSFER) {
            // Edit mode for transfer: adhere to direction toggle
            finalAmount = transferDir === 'out' ? -Math.abs(finalAmount) : Math.abs(finalAmount);
        }

        const newTransaction: Transaction = {
            id: (initialData && initialData.id) ? initialData.id : `manual-${Date.now()}`,
            date: finalDate,
            description: formData.description || '',
            amount: finalAmount,
            category: formData.category || 'Uncategorized',
            type: formData.type,
            account: formData.account || 'Cash'
        };

        onSave([newTransaction]);
    }
    
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden animate-fade-in">
        <div className="bg-slate-50 px-6 py-4 border-b border-slate-100 flex justify-between items-center">
          <h3 className="text-lg font-bold text-slate-800">
            {isEditing ? 'Edit Transaction' : 'Add Transaction'}
          </h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>
        
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          
          {/* Type Selection */}
          <div className="flex bg-slate-100 p-1 rounded-lg">
            {[TransactionType.EXPENSE, TransactionType.INCOME, TransactionType.TRANSFER].map((type) => (
              <button
                key={type}
                type="button"
                onClick={() => {
                    setFormData({ ...formData, type, category: '' });
                    if(type === TransactionType.TRANSFER) setTransferDir('out');
                }} 
                className={`flex-1 py-2 text-sm font-medium rounded-md transition-all flex items-center justify-center ${
                  formData.type === type 
                    ? 'bg-white text-blue-600 shadow-sm' 
                    : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                {type === TransactionType.TRANSFER && <ArrowRightLeft className="w-3 h-3 mr-1.5" />}
                {type}
              </button>
            ))}
          </div>

          {/* Transfer Direction (Only visible for Editing Transfers) */}
          {isEditing && formData.type === TransactionType.TRANSFER && (
             <div className="flex items-center justify-center space-x-4 bg-slate-50 p-3 rounded-lg border border-slate-100">
                <span className="text-xs font-semibold text-slate-500 uppercase">Direction:</span>
                <button
                  type="button"
                  onClick={() => setTransferDir('out')}
                  className={`flex items-center px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${transferDir === 'out' ? 'bg-red-100 text-red-700 border border-red-200' : 'bg-white border border-slate-200 text-slate-500 hover:bg-slate-50'}`}
                >
                   <ArrowUpCircle className="w-3 h-3 mr-1" /> Outflow (-)
                </button>
                <button
                  type="button"
                  onClick={() => setTransferDir('in')}
                  className={`flex items-center px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${transferDir === 'in' ? 'bg-emerald-100 text-emerald-700 border border-emerald-200' : 'bg-white border border-slate-200 text-slate-500 hover:bg-slate-50'}`}
                >
                   <ArrowDownCircle className="w-3 h-3 mr-1" /> Inflow (+)
                </button>
             </div>
          )}

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
                  className="w-full pl-9 pr-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none bg-white text-slate-800 text-base sm:text-sm"
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
                  className="w-full pl-9 pr-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none bg-white text-slate-800 text-base sm:text-sm"
                />
              </div>
            </div>
          </div>

          {/* Account Selection Logic */}
          {(!isEditing && formData.type === TransactionType.TRANSFER) ? (
             <div className="grid grid-cols-[1fr_auto_1fr] gap-2 items-end">
                {/* From Account */}
                <AccountField 
                  label="From Account"
                  value={formData.account}
                  onChange={(val: string) => setFormData({ ...formData, account: val })}
                  accounts={accounts}
                  placeholder="Source"
                  allowCreation={false}
                />
                
                <div className="pb-2 text-slate-400 flex justify-center">
                    <ArrowRight className="w-5 h-5 mb-1" />
                </div>

                {/* To Account (Filtered to exclude source) */}
                <AccountField 
                  label="To Account"
                  value={toAccount}
                  onChange={(val: string) => setToAccount(val)}
                  accounts={destinationAccounts}
                  placeholder="Destination"
                  allowCreation={false}
                />
             </div>
          ) : (
             /* Standard Account Field */
             <AccountField 
               label="Account"
               value={formData.account}
               onChange={(val: string) => setFormData({ ...formData, account: val })}
               accounts={accounts}
               placeholder="Select or type new account..."
               icon={CreditCard}
               allowCreation={true}
             />
          )}

          {/* Description */}
          <div>
            <label className="block text-xs font-semibold text-slate-500 mb-1">Description (Optional)</label>
            <div className="relative">
              <Type className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
              <input
                type="text"
                value={formData.description}
                onChange={e => setFormData({ ...formData, description: e.target.value })}
                className="w-full pl-9 pr-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none bg-white text-slate-800 text-base sm:text-sm"
                placeholder={(!isEditing && formData.type === TransactionType.TRANSFER) ? "e.g. Monthly Savings" : "e.g. Grocery Shopping"}
              />
            </div>
          </div>

          {/* Category (Filtered Selection or New) */}
          <div>
            <label className="block text-xs font-semibold text-slate-500 mb-1">Category (Optional)</label>
            <div className="relative">
              <Tag className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
              <input
                type="text"
                list="category-list"
                value={formData.category}
                onChange={e => setFormData({ ...formData, category: e.target.value })}
                className="w-full pl-9 pr-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none bg-white text-slate-800 text-base sm:text-sm"
                placeholder="Select or type new category..."
              />
              <datalist id="category-list">
                {filteredCategories.map(c => (
                  <option key={c.id} value={c.name} />
                ))}
              </datalist>
            </div>
             <p className="text-[10px] text-slate-400 mt-1">
               Showing {formData.type.toLowerCase()} categories. Defaults to "Uncategorized".
             </p>
          </div>

          <div className="pt-2">
            <button
              type="submit"
              className="w-full flex items-center justify-center py-2.5 px-4 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
            >
              <Save className="w-4 h-4 mr-2" />
              {isEditing ? 'Update Transaction' : 'Save Transaction'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
