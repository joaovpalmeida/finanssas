import * as XLSX from 'xlsx';
import { Transaction, TransactionType } from '../types';

export interface ColumnMapping {
  date: string; // stored as stringified index "0", "1"...
  
  // Common or default fields
  description: string;
  category: string;
  
  // Single Amount Mode
  amount?: string;

  // Split Amount Mode
  income?: string;
  expense?: string;
  
  // Split Mode Specific Overrides
  incomeDescription?: string;
  expenseDescription?: string;
  incomeCategory?: string;
  expenseCategory?: string;
  
  account?: string;

  // Row selection
  startRow?: number; // 1-based index from UI
  endRow?: number;   // 1-based index from UI
}

export interface ExcelColumn {
  index: number;
  letter: string;
  header: string;
}

// Helper to convert 0 -> A, 1 -> B, 26 -> AA etc.
const getColumnLetter = (colIndex: number): string => {
  let temp, letter = '';
  let c = colIndex;
  while (c >= 0) {
    temp = c % 26;
    letter = String.fromCharCode(temp + 65) + letter;
    c = Math.floor(c / 26) - 1;
  }
  return letter;
};

export const getExcelSheetNames = (file: File): Promise<string[]> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = e.target?.result;
        const workbook = XLSX.read(data, { type: 'binary' });
        resolve(workbook.SheetNames);
      } catch (error) {
        reject(error);
      }
    };
    reader.onerror = (error) => reject(error);
    reader.readAsBinaryString(file);
  });
};

export const getExcelColumns = (file: File, sheetName?: string): Promise<ExcelColumn[]> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = e.target?.result;
        const workbook = XLSX.read(data, { type: 'binary' });
        
        const targetSheetName = sheetName || workbook.SheetNames[0];
        const sheet = workbook.Sheets[targetSheetName];
        
        if (!sheet) {
           resolve([]);
           return;
        }

        // Determine the range to ensure we capture all columns, even empty ones
        const ref = sheet['!ref'];
        let colCount = 0;
        if (ref) {
            const range = XLSX.utils.decode_range(ref);
            colCount = range.e.c + 1;
        }

        const jsonData = XLSX.utils.sheet_to_json(sheet, { header: 1 }) as any[][];
        // Handle sparse arrays (empty header cells) by converting to dense array of strings
        const rawHeaders = jsonData[0] || [];
        
        const columns: ExcelColumn[] = [];
        // Use the maximum of physical headers found or the range extent
        const maxCols = Math.max(colCount, rawHeaders.length);

        for (let i = 0; i < maxCols; i++) {
            const val = rawHeaders[i];
            columns.push({
                index: i,
                letter: getColumnLetter(i),
                header: val ? String(val) : ''
            });
        }
        
        resolve(columns);
      } catch (error) {
        reject(error);
      }
    };
    reader.onerror = (error) => reject(error);
    reader.readAsBinaryString(file);
  });
};

export const parseExcelFile = (
  file: File, 
  defaultAccountName: string = 'Main Account', 
  mapping?: ColumnMapping,
  sheetName?: string,
  defaultDate?: string
): Promise<Transaction[]> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const data = e.target?.result;
        const workbook = XLSX.read(data, { type: 'binary' });
        
        const targetSheetName = sheetName || workbook.SheetNames[0];
        const sheet = workbook.Sheets[targetSheetName];
        
        if (!sheet) {
            reject(new Error(`Sheet "${targetSheetName}" not found`));
            return;
        }

        const jsonData = XLSX.utils.sheet_to_json(sheet, { header: 1 }) as any[][];

        if (jsonData.length < 2) {
            reject(new Error("File/Sheet is too short (no data found)"));
            return;
        }

        const rawHeaders = jsonData[0] || [];
        // Helper for heuristic search
        const lowerHeaders = Array.from(rawHeaders).map(h => h ? String(h).toLowerCase() : '');

        let dateIndex = -1;
        let descIndex = -1;
        let amountIndex = -1;
        let incomeIndex = -1;
        let expenseIndex = -1;
        let categoryIndex = -1;
        let accountIndex = -1;
        
        // Split mode overrides
        let incomeDescIndex = -1;
        let expenseDescIndex = -1;
        let incomeCatIndex = -1;
        let expenseCatIndex = -1;

        // If mapping is provided, prioritize it
        if (mapping) {
          // Attempt to parse mapping values as integer indices
          const getIdx = (val: string | undefined) => (val && val !== '' && !isNaN(parseInt(val))) ? parseInt(val) : -1;

          dateIndex = getIdx(mapping.date);
          descIndex = getIdx(mapping.description);
          categoryIndex = getIdx(mapping.category);
          accountIndex = getIdx(mapping.account);
          
          // Amount mapping
          amountIndex = getIdx(mapping.amount);
          incomeIndex = getIdx(mapping.income);
          expenseIndex = getIdx(mapping.expense);
          
          // Split Overrides
          incomeDescIndex = getIdx(mapping.incomeDescription);
          expenseDescIndex = getIdx(mapping.expenseDescription);
          incomeCatIndex = getIdx(mapping.incomeCategory);
          expenseCatIndex = getIdx(mapping.expenseCategory);
        } else {
          // Heuristics
          dateIndex = lowerHeaders.findIndex(h => h.includes('date'));
          descIndex = lowerHeaders.findIndex(h => h.includes('description') || h.includes('desc') || h.includes('name'));
          amountIndex = lowerHeaders.findIndex(h => h.includes('amount') || h.includes('value') || h.includes('cost'));
          categoryIndex = lowerHeaders.findIndex(h => h.includes('category') || h.includes('type'));
          accountIndex = lowerHeaders.findIndex(h => h.includes('account') || h.includes('bank') || h.includes('source'));
        }

        // Validation: We need at least an Amount OR (Income + Expense indices).
        const hasSingleAmount = amountIndex !== -1;
        const hasSplitAmount = incomeIndex !== -1 || expenseIndex !== -1;

        if (!hasSingleAmount && !hasSplitAmount) {
             reject(new Error("Could not identify Amount columns. Please check your column mapping."));
             return;
        }

        if (dateIndex === -1 && !defaultDate) {
            reject(new Error("Could not identify Date column, and no Default Date was provided."));
            return;
        }

        const transactions: Transaction[] = [];
        const fallbackDateStr = defaultDate ? new Date(defaultDate).toISOString() : new Date().toISOString();

        // Row Selection Logic
        // UI gives 1-based start row. JSON array is 0-based.
        // Usually row 0 is header. Data starts at row 1.
        // If user says Start Row 2, that maps to index 1.
        let startIndex = 1; 
        if (mapping?.startRow && mapping.startRow > 0) {
           startIndex = mapping.startRow - 1;
        }

        let endIndex = jsonData.length;
        if (mapping?.endRow && mapping.endRow > 0 && mapping.endRow <= jsonData.length) {
           endIndex = mapping.endRow;
        }

        for (let i = startIndex; i < endIndex; i++) {
          const row = jsonData[i];
          if (!row) continue;
          
          let amount = 0;
          let type = TransactionType.EXPENSE;
          let isValidRow = false;
          
          let currentRowDescIndex = descIndex;
          let currentRowCatIndex = categoryIndex;

          // LOGIC: Split Columns vs Single Column
          if (hasSplitAmount) {
             // Check Income Column
             let incVal = 0;
             if (incomeIndex !== -1 && row[incomeIndex] !== undefined) {
               incVal = parseFloat(String(row[incomeIndex]).replace(/[^0-9.-]/g, ''));
             }

             // Check Expense Column
             let expVal = 0;
             if (expenseIndex !== -1 && row[expenseIndex] !== undefined) {
               expVal = parseFloat(String(row[expenseIndex]).replace(/[^0-9.-]/g, ''));
             }

             // Determine Type based on presence (absolute values)
             if (!isNaN(incVal) && incVal !== 0) {
                amount = Math.abs(incVal);
                type = TransactionType.INCOME;
                isValidRow = true;
                // Use specific income mappings if available
                if (incomeDescIndex !== -1) currentRowDescIndex = incomeDescIndex;
                if (incomeCatIndex !== -1) currentRowCatIndex = incomeCatIndex;

             } else if (!isNaN(expVal) && expVal !== 0) {
                amount = -Math.abs(expVal); // Expenses are negative internally
                type = TransactionType.EXPENSE;
                isValidRow = true;
                // Use specific expense mappings if available
                if (expenseDescIndex !== -1) currentRowDescIndex = expenseDescIndex;
                if (expenseCatIndex !== -1) currentRowCatIndex = expenseCatIndex;
             }

          } else {
             // Single Amount Column
             if (row[amountIndex] !== undefined) {
                let val = parseFloat(String(row[amountIndex]).replace(/[^0-9.-]/g, ''));
                if (!isNaN(val) && val !== 0) {
                   amount = val;
                   type = amount >= 0 ? TransactionType.INCOME : TransactionType.EXPENSE;
                   isValidRow = true;
                }
             }
          }

          if (!isValidRow) continue;
          
          let dateStr = fallbackDateStr;
          
          if (dateIndex !== -1 && row[dateIndex] !== undefined) {
             // Handle Excel date serial numbers if strictly number
             if (typeof row[dateIndex] === 'number') {
                const dateObj = XLSX.SSF.parse_date_code(row[dateIndex]);
                if (dateObj) {
                    dateStr = new Date(dateObj.y, dateObj.m - 1, dateObj.d).toISOString();
                }
             } else {
                // Try parsing string
                const d = new Date(row[dateIndex]);
                if (!isNaN(d.getTime())) {
                    dateStr = d.toISOString();
                }
             }
          }

          transactions.push({
            id: `txn-${Date.now()}-${i}-${Math.random()}`,
            date: dateStr,
            description: (currentRowDescIndex !== -1 && row[currentRowDescIndex]) ? String(row[currentRowDescIndex]) : 'Unspecified',
            amount: amount,
            category: (currentRowCatIndex !== -1 && row[currentRowCatIndex]) ? String(row[currentRowCatIndex]) : 'Uncategorized',
            type: type,
            account: (accountIndex !== -1 && row[accountIndex]) ? String(row[accountIndex]) : defaultAccountName
          });
        }

        resolve(transactions);

      } catch (error) {
        reject(error);
      }
    };

    reader.onerror = (error) => reject(error);
    reader.readAsBinaryString(file);
  });
};