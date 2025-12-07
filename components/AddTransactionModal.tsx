import React, { useState, useEffect, useMemo, useId } from 'react';
import { X, Save, Calendar, Tag, CreditCard, DollarSign, Type, ArrowRightLeft, ArrowUpCircle, ArrowDownCircle, ArrowRight, ChevronDown, List, Plus, Scale } from 'lucide-react';
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
  value: string, // now expects ID if existing, or Name if creating new
  onChange: (val: string) => void,
  accounts: Account[],
  placeholder: string,
  icon?: React.ElementType,
  allowCreation?: boolean
}) => {
  const [mode, setMode] = useState<'select' | 'input'>('select');
  
  // Logic to determine if 'value' is an ID or a custom name.
  // If the value exists in accounts list, it's an ID (usually).
  const isExistingId = accounts.some(a => a.id === value);
  
  useEffect(() => {
    if (!allowCreation) {
      setMode('select');
    } else if (value && !isExistingId && mode === 'select') {
        // If we have a value but it's not an ID, switch to input mode (mostly for edit case where data might be missing or custom)
        setMode('input');
    }
  }, [allowCreation, value, isExistingId]);

  const savings = accounts.filter(a => a.isSavings);
  const regular = accounts.filter(a => !a.isSavings);

  return (
    <div>
      <div className="flex justify-between items-end mb-1">
        <label className="block text-xs font-semibold text-slate-500">{label}</label>
        {allowCreation && (
          <button
            type="button"
            onClick={() => {
                const newMode = mode === 'select' ? 'input' : 'select';
                setMode(newMode);
                onChange(''); // Clear value on mode switch
            }}
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
                value={isExistingId ? value : ''}
                onChange={(e) => onChange(e.target.value)}
                className={`w-full ${Icon ? 'pl-9' : 'px-3'} pr-8 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none bg-white text-slate-800 text-sm appearance-none cursor-pointer`}
                required
             >
                <option value="" disabled>Select account...</option>
                {savings.length > 0 && (
                  <optgroup label="Savings Accounts">
                    {savings.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                  </optgroup>
                )}
                {regular.length > 0 && (
                  <optgroup label="Regular Accounts">
                    {regular.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
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
              value={value} // In input mode, this is the Name
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
  const [transferDir, setTransferDir] = useState<'in' | 'out'>('out');
  const [toAccountId, setToAccountId] = useState('');

  const [formData, setFormData] = useState({
    date: new Date().toISOString().split('T')[0],
    description: '',
    amount: '',
    categoryId: '',
    type: TransactionType.EXPENSE,
    accountId: ''
  });

  const isEditing = !!(initialData && initialData.id);

  useEffect(() => {
    if (isOpen) {
      if (isEditing) {
        const amt = initialData.amount || 0;
        setFormData({
          date: initialData.date ? new Date(initialData.date).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
          description: initialData.description || '',
          amount: Math.abs(amt).toString(),
          categoryId: initialData.categoryId || '', // Use ID
          type: initialData.type || TransactionType.EXPENSE,
          accountId: initialData.accountId || ''    // Use ID
        });
        if (initialData.type === TransactionType.TRANSFER) {
            setTransferDir(amt >= 0 ? 'in' : 'out');
        }
        setToAccountId(''); 
      } else {
        const defaultAccountId = accounts.length > 0 ? accounts[0].id : '';
        setFormData({
          date: new Date().toISOString().split('T')[0],
          description: '',
          amount: '',
          categoryId: '',
          type: initialData?.type || TransactionType.EXPENSE,
          accountId: initialData?.accountId || defaultAccountId
        });
        setTransferDir('out');
        
        const defaultSource = initialData?.accountId || defaultAccountId;
        const availableDest = accounts.find(a => a.id !== defaultSource);
        setToAccountId(availableDest ? availableDest.id : '');
      }
    }
  }, [isOpen, initialData, accounts]);

  useEffect(() => {
    if (!isEditing && formData.type === TransactionType.TRANSFER && formData.accountId === toAccountId) {
        const other = accounts.find(a => a.id !== formData.accountId);
        if (other) setToAccountId(other.id);
    }
  }, [formData.accountId, formData.type, isEditing, accounts]);

  const filteredCategories = useMemo(() => {
    return categories.filter(c => c.type === formData.type);
  }, [categories, formData.type]);

  const destinationAccounts = useMemo(() => {
    return accounts.filter(a => a.id !== formData.accountId);
  }, [accounts, formData.accountId]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.amount) return;

    // Helper: Determine if we have an ID or Name for Account
    // If it's a UUID-like ID, it's an ID. If it's just text, it's a Name to be created.
    // However, DB `insertTransactions` logic handles:
    // "If `accountId` matches an existing ID -> Use it."
    // "If not, treat `account` (name) field."
    // BUT we are using the new schema.
    // The Modal now primarily works with IDs. If user typed a NEW name, `formData.accountId` holds the NAME.
    // We need to pass that as `account` (name) to `insertTransactions` so it creates it, 
    // and clear `accountId` so it doesn't try to use it as a FK.
    
    const resolveAccountPayload = (val: string) => {
        const exists = accounts.some(a => a.id === val);
        if (exists) return { accountId: val, account: '' }; // It's an ID
        return { accountId: '', account: val }; // It's a new Name
    };

    const resolveCategoryPayload = (val: string) => {
        // Since category input is a datalist of Names (not IDs), we always receive a Name here currently?
        // Wait, the input below uses `list="category-list"`. It outputs the value string (Name).
        // We need to map Name -> ID if possible.
        const catObj = categories.find(c => c.name === val && c.type === formData.type);
        if (catObj) return { categoryId: catObj.id, category: '' };
        return { categoryId: '', category: val };
    };

    let finalDate: string;
    if (!isEditing) {
        const now = new Date();
        const [year, month, day] = formData.date.split('-').map(Number);
        const dateObj = new Date(year, month - 1, day, now.getHours(), now.getMinutes(), now.getSeconds());
        finalDate = dateObj.toISOString();
    } else {
        finalDate = new Date(formData.date).toISOString();
    }

    let finalAmount = parseFloat(formData.amount);
    
    // Resolve Category
    const { categoryId, category } = resolveCategoryPayload(formData.categoryId);

    if (!isEditing && formData.type === TransactionType.TRANSFER) {
        const amount = Math.abs(finalAmount);
        
        const srcInfo = resolveAccountPayload(formData.accountId);
        const destInfo = resolveAccountPayload(toAccountId);

        if (srcInfo.accountId && destInfo.accountId && srcInfo.accountId === destInfo.accountId) {
             alert("Source and Destination accounts cannot be the same.");
             return;
        }

        const txnOut: Transaction = {
            id: `manual-tr-out-${Date.now()}`,
            date: finalDate,
            description: formData.description || 'Transfer Out',
            amount: -amount,
            type: TransactionType.TRANSFER,
            categoryId, category,
            accountId: srcInfo.accountId, account: srcInfo.account
        };

        const txnIn: Transaction = {
            id: `manual-tr-in-${Date.now()}`,
            date: finalDate,
            description: formData.description || 'Transfer In',
            amount: amount,
            type: TransactionType.TRANSFER,
            categoryId, category,
            accountId: destInfo.accountId, account: destInfo.account
        };

        onSave([txnOut, txnIn]);
    } else {
        if (formData.type === TransactionType.EXPENSE) finalAmount = -Math.abs(finalAmount);
        else if (formData.type === TransactionType.INCOME) finalAmount = Math.abs(finalAmount);
        else if (formData.type === TransactionType.TRANSFER) finalAmount = transferDir === 'out' ? -Math.abs(finalAmount) : Math.abs(finalAmount);
        else if (formData.type === TransactionType.BALANCE) finalAmount = Math.abs(finalAmount); // Default positive for adjustment, unless user explicitly types negative (which input might restrict depending on UX, but here we assume add balance)

        const accInfo = resolveAccountPayload(formData.accountId);

        const newTransaction: Transaction = {
            id: (initialData && initialData.id) ? initialData.id : `manual-${Date.now()}`,
            date: finalDate,
            description: formData.description || '',
            amount: finalAmount,
            type: formData.type,
            categoryId, category,
            accountId: accInfo.accountId, account: accInfo.account
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
            {[TransactionType.EXPENSE, TransactionType.INCOME, TransactionType.TRANSFER, TransactionType.BALANCE].map((type) => (
              <button
                key={type}
                type="button"
                onClick={() => {
                    setFormData({ ...formData, type, categoryId: '' });
                    if(type === TransactionType.TRANSFER) setTransferDir('out');
                }} 
                className={`flex-1 py-2 text-xs sm:text-sm font-medium rounded-md transition-all flex items-center justify-center ${
                  formData.type === type 
                    ? 'bg-white text-blue-600 shadow-sm' 
                    : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                {type === TransactionType.TRANSFER && <ArrowRightLeft className="w-3 h-3 mr-1 hidden sm:block" />}
                {type === TransactionType.BALANCE && <Scale className="w-3 h-3 mr-1 hidden sm:block" />}
                {type}
              </button>
            ))}
          </div>

          {/* Transfer Direction */}
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

          {/* Account Selection */}
          {(!isEditing && formData.type === TransactionType.TRANSFER) ? (
             <div className="grid grid-cols-[1fr_auto_1fr] gap-2 items-end">
                <AccountField 
                  label="From Account"
                  value={formData.accountId}
                  onChange={(val: string) => setFormData({ ...formData, accountId: val })}
                  accounts={accounts}
                  placeholder="Source"
                  allowCreation={false}
                />
                
                <div className="pb-2 text-slate-400 flex justify-center">
                    <ArrowRight className="w-5 h-5 mb-1" />
                </div>

                <AccountField 
                  label="To Account"
                  value={toAccountId}
                  onChange={(val: string) => setToAccountId(val)}
                  accounts={destinationAccounts}
                  placeholder="Destination"
                  allowCreation={false}
                />
             </div>
          ) : (
             <AccountField 
               label="Account"
               value={formData.accountId}
               onChange={(val: string) => setFormData({ ...formData, accountId: val })}
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

          {/* Category */}
          <div>
            <label className="block text-xs font-semibold text-slate-500 mb-1">Category (Optional)</label>
            <div className="relative">
              <Tag className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
              <input
                type="text"
                list="category-list"
                value={formData.categoryId}
                onChange={e => setFormData({ ...formData, categoryId: e.target.value })}
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