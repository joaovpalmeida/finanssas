import React, { useState, useEffect } from 'react';
import { Target, Calendar, Plus, Trash2, TrendingUp, AlertCircle, CheckCircle, Edit2, X } from 'lucide-react';
import { SavingsGoal } from '../types';
import { getSavingsGoals, insertSavingsGoal, deleteSavingsGoal } from '../services/db';
import { formatCurrency, calculateMonthsBetween, formatDate } from '../utils/helpers';

interface SavingsGoalsProps {
  accountBalances: { account: string; balance: number }[];
}

export const SavingsGoals: React.FC<SavingsGoalsProps> = ({ accountBalances }) => {
  const [goals, setGoals] = useState<SavingsGoal[]>([]);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  
  // Form State
  const [formData, setFormData] = useState<{
    name: string;
    targetAmount: string;
    deadline: string;
    targetAccounts: string[];
  }>({
    name: '',
    targetAmount: '',
    deadline: '',
    targetAccounts: []
  });

  useEffect(() => {
    loadGoals();
  }, []);

  useEffect(() => {
    // If we have accounts but none selected and not editing, select the first one by default
    if (accountBalances.length > 0 && formData.targetAccounts.length === 0 && !editingId && !isFormOpen) {
      setFormData(prev => ({ ...prev, targetAccounts: [accountBalances[0].account] }));
    }
  }, [accountBalances, isFormOpen, editingId]);

  const loadGoals = () => {
    const loadedGoals = getSavingsGoals();
    setGoals(loadedGoals);
  };

  const resetForm = () => {
    setFormData({
      name: '',
      targetAmount: '',
      deadline: '',
      targetAccounts: accountBalances.length > 0 ? [accountBalances[0].account] : []
    });
    setEditingId(null);
    setIsFormOpen(false);
  };

  const handleEdit = (goal: SavingsGoal) => {
    setFormData({
      name: goal.name,
      targetAmount: goal.targetAmount.toString(),
      deadline: goal.deadline,
      targetAccounts: goal.targetAccounts
    });
    setEditingId(goal.id);
    setIsFormOpen(true);
    // Scroll to top to see form
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.targetAmount || !formData.deadline || formData.targetAccounts.length === 0) return;

    const goal: SavingsGoal = {
      id: editingId || `goal-${Date.now()}`,
      name: formData.name,
      targetAmount: parseFloat(formData.targetAmount),
      deadline: formData.deadline,
      targetAccounts: formData.targetAccounts
    };

    await insertSavingsGoal(goal);
    resetForm();
    loadGoals();
  };

  const handleDelete = async (id: string) => {
    if (confirm('Delete this goal?')) {
      await deleteSavingsGoal(id);
      loadGoals();
    }
  };

  const toggleAccount = (accountName: string) => {
    setFormData(prev => {
      const exists = prev.targetAccounts.includes(accountName);
      let newAccounts;
      if (exists) {
        newAccounts = prev.targetAccounts.filter(a => a !== accountName);
      } else {
        newAccounts = [...prev.targetAccounts, accountName];
      }
      return { ...prev, targetAccounts: newAccounts };
    });
  };

  const getGoalStatus = (goal: SavingsGoal) => {
    // Sum balances from all linked accounts
    const currentBalance = goal.targetAccounts.reduce((sum, accName) => {
      const account = accountBalances.find(a => a.account === accName);
      return sum + (account ? account.balance : 0);
    }, 0);

    const progress = Math.min(100, Math.max(0, (currentBalance / goal.targetAmount) * 100));
    const remainingAmount = Math.max(0, goal.targetAmount - currentBalance);
    
    const today = new Date();
    const deadlineDate = new Date(goal.deadline);
    const monthsRemaining = calculateMonthsBetween(today, deadlineDate);
    
    const effectiveMonths = monthsRemaining <= 0 ? 0 : monthsRemaining;
    const monthlyContribution = effectiveMonths > 0 ? remainingAmount / effectiveMonths : remainingAmount;

    return { currentBalance, progress, remainingAmount, monthsRemaining, monthlyContribution, isAchieved: currentBalance >= goal.targetAmount };
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex justify-between items-center bg-white p-6 rounded-xl shadow-sm border border-slate-100">
        <div>
          <h2 className="text-xl font-bold text-slate-800 flex items-center">
            <Target className="w-6 h-6 mr-2 text-blue-600" />
            Savings Goals
          </h2>
          <p className="text-slate-500 text-sm">Track your progress and plan for the future</p>
        </div>
        <button
          onClick={() => {
            if (isFormOpen) resetForm();
            else setIsFormOpen(true);
          }}
          className={`flex items-center px-4 py-2 rounded-lg text-sm font-medium transition-colors shadow-sm ${
            isFormOpen 
              ? 'bg-slate-100 text-slate-700 hover:bg-slate-200' 
              : 'bg-blue-600 text-white hover:bg-blue-700'
          }`}
        >
          {isFormOpen ? <X className="w-4 h-4 mr-2" /> : <Plus className="w-4 h-4 mr-2" />}
          {isFormOpen ? 'Cancel' : 'New Goal'}
        </button>
      </div>

      {isFormOpen && (
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100 animate-slide-in-down ring-2 ring-blue-50">
          <div className="flex justify-between items-center mb-4">
             <h3 className="font-bold text-slate-700">{editingId ? 'Edit Goal' : 'Create New Goal'}</h3>
          </div>
          <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 items-start">
            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1">Goal Name</label>
              <input
                type="text"
                required
                value={formData.name}
                onChange={e => setFormData({...formData, name: e.target.value})}
                placeholder="e.g. New Car"
                className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none bg-white text-slate-800"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1">Target Amount (€)</label>
              <input
                type="number"
                required
                value={formData.targetAmount}
                onChange={e => setFormData({...formData, targetAmount: e.target.value})}
                placeholder="5000"
                className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none bg-white text-slate-800"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1">Deadline</label>
              <input
                type="date"
                required
                value={formData.deadline}
                onChange={e => setFormData({...formData, deadline: e.target.value})}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none bg-white text-slate-800"
              />
            </div>
            
            {/* Multi-select Accounts */}
            <div className="lg:col-span-4 bg-slate-50 p-4 rounded-lg border border-slate-100">
               <label className="block text-xs font-semibold text-slate-500 mb-2">Linked Accounts (Select at least one)</label>
               <div className="flex flex-wrap gap-2">
                 {accountBalances.length === 0 && <p className="text-sm text-slate-400">No accounts available. Upload a file first.</p>}
                 {accountBalances.map(acc => {
                    const isSelected = formData.targetAccounts.includes(acc.account);
                    return (
                      <button
                        key={acc.account}
                        type="button"
                        onClick={() => toggleAccount(acc.account)}
                        className={`
                          px-3 py-1.5 rounded-full text-sm font-medium border transition-all
                          ${isSelected 
                            ? 'bg-blue-600 text-white border-blue-600 shadow-sm' 
                            : 'bg-white text-slate-600 border-slate-200 hover:border-blue-300'
                          }
                        `}
                      >
                        {acc.account} <span className="opacity-75 text-xs">({formatCurrency(acc.balance)})</span>
                      </button>
                    )
                 })}
               </div>
               {formData.targetAccounts.length === 0 && (
                 <p className="text-xs text-red-500 mt-2 flex items-center">
                   <AlertCircle className="w-3 h-3 mr-1" />
                   Please select at least one account to track.
                 </p>
               )}
            </div>

            <div className="md:col-span-2 lg:col-span-4 mt-2 flex justify-end space-x-3">
               <button
                type="button"
                onClick={resetForm}
                className="px-4 py-2 bg-white border border-slate-200 text-slate-600 rounded-lg hover:bg-slate-50 transition-colors font-medium"
              >
                Cancel
              </button>
               <button
                type="submit"
                className="px-6 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors font-medium shadow-sm flex items-center"
              >
                {editingId ? 'Update Goal' : 'Create Goal'}
              </button>
            </div>
          </form>
        </div>
      )}

      {goals.length === 0 && !isFormOpen ? (
         <div className="text-center py-12 bg-slate-50 rounded-xl border border-dashed border-slate-300">
           <Target className="w-12 h-12 text-slate-300 mx-auto mb-3" />
           <p className="text-slate-500">No savings goals set yet. Create one to get started!</p>
         </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {goals.map(goal => {
            const status = getGoalStatus(goal);
            return (
              <div key={goal.id} className="bg-white p-6 rounded-xl shadow-sm border border-slate-100 flex flex-col justify-between group">
                <div>
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h3 className="text-lg font-bold text-slate-800">{goal.name}</h3>
                      <p className="text-xs text-slate-500 flex items-center mt-1">
                        <Calendar className="w-3 h-3 mr-1" />
                        Target: {formatDate(goal.deadline)}
                      </p>
                    </div>
                    <div className="flex space-x-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button 
                        onClick={() => handleEdit(goal)}
                        className="p-1.5 text-slate-400 hover:text-blue-500 hover:bg-blue-50 rounded-md transition-colors"
                        title="Edit Goal"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button 
                        onClick={() => handleDelete(goal.id)}
                        className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-md transition-colors"
                        title="Delete Goal"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  <div className="mb-4">
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-slate-600">Progress</span>
                      <span className="font-semibold text-slate-800">
                        {status.progress.toFixed(1)}%
                      </span>
                    </div>
                    <div className="w-full bg-slate-100 rounded-full h-2.5">
                      <div 
                        className={`h-2.5 rounded-full ${status.isAchieved ? 'bg-emerald-500' : 'bg-blue-600'}`} 
                        style={{ width: `${status.progress}%` }}
                      ></div>
                    </div>
                    <div className="flex justify-between text-xs text-slate-400 mt-1">
                      <span>{formatCurrency(status.currentBalance)}</span>
                      <span>{formatCurrency(goal.targetAmount)}</span>
                    </div>
                  </div>
                </div>

                <div className="bg-slate-50 rounded-lg p-4 border border-slate-100">
                  {status.isAchieved ? (
                    <div className="flex items-center text-emerald-600 font-medium">
                      <CheckCircle className="w-5 h-5 mr-2" />
                      Goal Achieved! Great job.
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <div className="flex items-start">
                         <div className="p-1.5 bg-blue-100 rounded-full mr-3 text-blue-600 mt-0.5">
                            <TrendingUp className="w-4 h-4" />
                         </div>
                         <div>
                            <p className="text-xs text-slate-500 uppercase font-semibold">Monthly Savings Needed</p>
                            <p className="text-lg font-bold text-slate-800">
                              {status.monthsRemaining <= 0 
                                ? 'Overdue' 
                                : formatCurrency(status.monthlyContribution)
                              }
                            </p>
                            {status.monthsRemaining > 0 && (
                                <p className="text-xs text-slate-400">
                                  for the next {status.monthsRemaining} month{status.monthsRemaining !== 1 ? 's' : ''}
                                </p>
                            )}
                         </div>
                      </div>
                      
                      <div className="text-xs text-slate-500 pt-2 border-t border-slate-200">
                         <span className="font-medium mr-1">Linked Accounts:</span> 
                         <span title={goal.targetAccounts.join(', ')}>
                           {goal.targetAccounts.length > 2 
                             ? `${goal.targetAccounts.slice(0, 2).join(', ')} +${goal.targetAccounts.length - 2}`
                             : goal.targetAccounts.join(', ')}
                         </span>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};