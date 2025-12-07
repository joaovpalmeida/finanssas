import { Transaction, TransactionType, Category, FiscalConfig } from '../types';

export const formatCurrency = (amount: number, decimalSeparator: '.' | ',' = '.'): string => {
  const locale = decimalSeparator === ',' ? 'de-DE' : 'en-US';
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency: 'EUR',
  }).format(amount);
};

export const parseAmountInput = (value: string, decimalSeparator: '.' | ','): number => {
  if (!value) return 0;
  // Remove spaces
  let str = value.replace(/\s/g, '');
  
  if (decimalSeparator === ',') {
     // Expecting 1.234,56
     // Remove dots (thousands)
     str = str.replace(/\./g, '');
     // Replace comma with dot (decimal)
     str = str.replace(/,/g, '.');
  } else {
     // Expecting 1,234.56
     // Remove commas (thousands)
     str = str.replace(/,/g, '');
  }
  return parseFloat(str);
};

export const formatDate = (dateString: string): string => {
  const options: Intl.DateTimeFormatOptions = { year: 'numeric', month: 'short', day: 'numeric' };
  return new Date(dateString).toLocaleDateString('en-GB', options);
};

export const getMonthYearLabel = (dateKey: string): string => {
  if (!dateKey || dateKey === 'all') return 'All Time';
  const [year, month] = dateKey.split('-');
  const date = new Date(parseInt(year), parseInt(month) - 1, 1);
  return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
};

export const getFiscalDateRange = (
  filterKey: string, 
  config: FiscalConfig, 
  transactions: Transaction[] = []
): { start: Date | null, end: Date, label: string } => {
  const now = new Date();

  if (filterKey === 'all') {
    return { start: null, end: now, label: 'All Time' };
  }

  // filterKey format: YYYY-MM
  const [yearStr, monthStr] = filterKey.split('-');
  const year = parseInt(yearStr);
  const month = parseInt(monthStr); // 1-12

  if (isNaN(year) || isNaN(month)) {
     return { start: null, end: now, label: 'All Time' };
  }

  // Default Calendar Range (Fallback)
  const calendarStart = new Date(year, month - 1, 1);
  const calendarEnd = new Date(year, month, 0, 23, 59, 59, 999);
  const baseLabel = calendarStart.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

  // 1. Income Trigger Mode
  if (config.mode === 'income_trigger' && config.triggerCategory) {
      // Find the start trigger in the PREVIOUS month
      const prevMonthIdx = month - 2; // JS Date month index (0-11). For Jan (1), prev is Dec (-1, handles year wrap)
      const prevMonthStart = new Date(year, prevMonthIdx, 1);
      const prevMonthEnd = new Date(year, prevMonthIdx + 1, 0, 23, 59, 59, 999);

      // Find the end trigger in the CURRENT month
      const currMonthStart = new Date(year, month - 1, 1);
      const currMonthEnd = new Date(year, month, 0, 23, 59, 59, 999);

      const getTriggersInWindow = (start: Date, end: Date) => {
          return transactions
            .filter(t => 
                t.category === config.triggerCategory && 
                new Date(t.date) >= start && 
                new Date(t.date) <= end
            )
            .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
      };

      const startTriggers = getTriggersInWindow(prevMonthStart, prevMonthEnd);
      const endTriggers = getTriggersInWindow(currMonthStart, currMonthEnd);

      // If we found a start trigger in the previous month
      if (startTriggers.length > 0) {
          const startTxn = startTriggers[0]; // Assume first occurrence starts the cycle
          const startDate = new Date(startTxn.date);

          let endDate: Date;
          // If we find a trigger in the current month, the period ends right before it
          if (endTriggers.length > 0) {
              const endTxn = endTriggers[0];
              // End date is exclusive of the next transaction
              endDate = new Date(new Date(endTxn.date).getTime() - 1);
          } else {
              // If no trigger found in current month yet (e.g. hasn't happened), extend to end of calendar month
              endDate = calendarEnd;
          }

          const startFmt = startDate.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
          const endFmt = endDate.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
          
          return { start: startDate, end: endDate, label: `${startFmt} - ${endFmt}` };
      }
      
      // Fallback to calendar if no previous trigger found
      return { start: calendarStart, end: calendarEnd, label: baseLabel };
  }

  // 2. Fixed Day Mode
  if (config.mode === 'fixed_day' && config.startDay) {
      const sDay = config.startDay;
      
      const prevMonthIdx = month - 2;
      const currMonthIdx = month - 1;

      // Start Date: Min(sDay, DaysInPrevMonth) of Previous Month
      const maxDaysPrev = new Date(year, prevMonthIdx + 1, 0).getDate();
      const startDayActual = Math.min(sDay, maxDaysPrev);
      
      const startDate = new Date(year, prevMonthIdx, startDayActual);
      startDate.setHours(0, 0, 0, 0);

      // End Date: Min(sDay, DaysInCurrMonth) of Current Month MINUS 1 day
      const maxDaysCurr = new Date(year, currMonthIdx + 1, 0).getDate();
      const tentativeEndDay = Math.min(sDay, maxDaysCurr);
      
      const endDate = new Date(year, currMonthIdx, tentativeEndDay);
      endDate.setDate(endDate.getDate() - 1); 
      endDate.setHours(23, 59, 59, 999);

      const startFmt = startDate.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
      const endFmt = endDate.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });

      return { start: startDate, end: endDate, label: `${startFmt} - ${endFmt}` };
  }

  // 3. Default / Calendar Mode
  return { start: calendarStart, end: calendarEnd, label: baseLabel };
};

export const calculateMonthsBetween = (d1: Date, d2: Date): number => {
  let months;
  months = (d2.getFullYear() - d1.getFullYear()) * 12;
  months -= d1.getMonth();
  months += d2.getMonth();
  return months <= 0 ? 0 : months;
};

// Generates a unique signature for duplicate detection
// Format: YYYY-MM-DD_AMOUNT_DESCRIPTION(lowercase/trimmed)
export const generateTransactionSignature = (t: Transaction): string => {
  const dateStr = new Date(t.date).toISOString().split('T')[0];
  const amtStr = Math.abs(t.amount).toFixed(2); // Use absolute to handle sign inconsistencies
  const descStr = t.description.trim().toLowerCase();
  return `${dateStr}_${amtStr}_${descStr}`;
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
    // Primary Sort: Date (Time included)
    // Secondary Sort: ID (to guarantee deterministic order when times are identical)
    group.sort((a, b) => {
        const timeA = new Date(a.date).getTime();
        const timeB = new Date(b.date).getTime();
        if (timeA !== timeB) return timeA - timeB;
        return a.id.localeCompare(b.id);
    });

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
  // Must mirror the logic above but reversed
  return result.sort((a, b) => {
      const timeA = new Date(a.date).getTime();
      const timeB = new Date(b.date).getTime();
      if (timeA !== timeB) return timeB - timeA;
      return b.id.localeCompare(a.id);
  });
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