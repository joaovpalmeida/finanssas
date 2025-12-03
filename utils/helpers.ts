import { Transaction, TransactionType, Category } from '../types';

export const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat('de-DE', { // Using de-DE for Euro formatting (1.234,56 €)
    style: 'currency',
    currency: 'EUR',
  }).format(amount);
};

export const formatDate = (dateString: string): string => {
  const options: Intl.DateTimeFormatOptions = { year: 'numeric', month: 'short', day: 'numeric' };
  return new Date(dateString).toLocaleDateString('en-GB', options);
};

export const calculateMonthsBetween = (d1: Date, d2: Date): number => {
  let months;
  months = (d2.getFullYear() - d1.getFullYear()) * 12;
  months -= d1.getMonth();
  months += d2.getMonth();
  return months <= 0 ? 0 : months;
};

export const calculateRunningBalances = (transactions: Transaction[]): Transaction[] => {
  // 1. Group by Account
  const grouped: Record<string, Transaction[]> = {};
  transactions.forEach(t => {
    const acc = t.account || 'Unspecified';
    if (!grouped[acc]) grouped[acc] = [];
    grouped[acc].push({ ...t }); // Create a shallow copy to avoid mutating the original sorting order immediately
  });

  const result: Transaction[] = [];

  // 2. Process each account
  Object.values(grouped).forEach(group => {
    // Sort Ascending (Oldest first) to calculate running total
    group.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    let runningBalance = 0;
    group.forEach(t => {
      // Assuming 'amount' is signed (+ for income, - for expense)
      runningBalance += t.amount;
      t.balanceAfterTransaction = runningBalance;
    });

    // Add back to result
    result.push(...group);
  });

  // 3. Final Sort Descending (Newest first) for UI Display
  return result.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
};

export const aggregateData = (transactions: Transaction[], categories: Category[]) => {
  let totalIncome = 0;
  let totalExpense = 0;
  const categoryMap: Record<string, number> = {};
  const groupMap: Record<string, number> = {};
  const monthlyMap: Record<string, { income: number; expense: number }> = {};
  const accountMap: Record<string, number> = {};

  // Create a quick lookup for category groups
  const categoryGroupLookup: Record<string, string> = {};
  categories.forEach(c => {
    categoryGroupLookup[c.name] = c.group;
  });

  transactions.forEach((t) => {
    const absAmount = Math.abs(t.amount);
    const date = new Date(t.date);
    const monthKey = date.toLocaleString('default', { month: 'short' }); // e.g., "Jan"

    // Account Balance Aggregation (using raw signed amount)
    const accName = t.account || 'Unspecified';
    if (!accountMap[accName]) {
      accountMap[accName] = 0;
    }
    accountMap[accName] += t.amount;

    // Monthly & Category Aggregation
    if (!monthlyMap[monthKey]) {
      monthlyMap[monthKey] = { income: 0, expense: 0 };
    }

    if (t.type === TransactionType.INCOME) {
      totalIncome += absAmount;
      monthlyMap[monthKey].income += absAmount;
    } else if (t.type === TransactionType.EXPENSE) {
      totalExpense += absAmount;
      monthlyMap[monthKey].expense += absAmount;
      
      // Category aggregation for expenses
      if (!categoryMap[t.category]) {
        categoryMap[t.category] = 0;
      }
      categoryMap[t.category] += absAmount;

      // Group aggregation (Recurring vs General)
      const group = categoryGroupLookup[t.category] || 'General';
      if (!groupMap[group]) {
        groupMap[group] = 0;
      }
      groupMap[group] += absAmount;
    }
  });

  const topCategories = Object.entries(categoryMap)
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 5);
  
  const expenseByGroup = Object.entries(groupMap)
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value);

  const monthlyData = Object.entries(monthlyMap).map(([month, data]) => ({
    month,
    income: data.income,
    expense: data.expense,
  }));

  const accountBalances = Object.entries(accountMap)
    .map(([account, balance]) => ({ account, balance }))
    .sort((a, b) => b.balance - a.balance);

  // Sort monthly data roughly (simplified for demo, normally would sort by date object)
  const monthOrder = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  monthlyData.sort((a, b) => monthOrder.indexOf(a.month) - monthOrder.indexOf(b.month));

  return {
    totalIncome,
    totalExpense,
    netSavings: totalIncome - totalExpense,
    topCategories,
    expenseByGroup,
    monthlyData,
    accountBalances,
  };
};