import * as XLSX from 'xlsx';
import { Transaction, TransactionType } from '../types';

export interface ColumnMapping {
  date: string; // stored as stringified index "0", "1"...
  description: string;
  amount: string;
  category: string;
  account?: string;
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

// Deprecated alias for backward compatibility if needed, but we use getExcelColumns now
export const getExcelHeaders = async (file: File, sheetName?: string): Promise<string[]> => {
    const cols = await getExcelColumns(file, sheetName);
    return cols.map(c => c.header);
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
        let categoryIndex = -1;
        let accountIndex = -1;

        // If mapping is provided, prioritize it
        if (mapping) {
          // Attempt to parse mapping values as integer indices
          if (mapping.date !== '' && !isNaN(parseInt(mapping.date))) dateIndex = parseInt(mapping.date);
          if (mapping.description !== '' && !isNaN(parseInt(mapping.description))) descIndex = parseInt(mapping.description);
          if (mapping.amount !== '' && !isNaN(parseInt(mapping.amount))) amountIndex = parseInt(mapping.amount);
          if (mapping.category !== '' && !isNaN(parseInt(mapping.category))) categoryIndex = parseInt(mapping.category);
          if (mapping.account && mapping.account !== '' && !isNaN(parseInt(mapping.account))) accountIndex = parseInt(mapping.account);
          
          // Fallback: If for some reason legacy mapping (names) is passed, try to find index by name
          if (dateIndex === -1 && mapping.date) dateIndex = rawHeaders.indexOf(mapping.date);
          if (descIndex === -1 && mapping.description) descIndex = rawHeaders.indexOf(mapping.description);
          if (amountIndex === -1 && mapping.amount) amountIndex = rawHeaders.indexOf(mapping.amount);
        } else {
          // Heuristics
          dateIndex = lowerHeaders.findIndex(h => h.includes('date'));
          descIndex = lowerHeaders.findIndex(h => h.includes('description') || h.includes('desc') || h.includes('name'));
          amountIndex = lowerHeaders.findIndex(h => h.includes('amount') || h.includes('value') || h.includes('cost'));
          categoryIndex = lowerHeaders.findIndex(h => h.includes('category') || h.includes('type'));
          accountIndex = lowerHeaders.findIndex(h => h.includes('account') || h.includes('bank') || h.includes('source'));
        }

        // Validation: We need at least an Amount. 
        // We need EITHER a Date Column OR a Default Date.
        if (amountIndex === -1) {
             reject(new Error("Could not identify Amount column. Please check your column mapping."));
             return;
        }

        if (dateIndex === -1 && !defaultDate) {
            reject(new Error("Could not identify Date column, and no Default Date was provided."));
            return;
        }

        const transactions: Transaction[] = [];
        const fallbackDateStr = defaultDate ? new Date(defaultDate).toISOString() : new Date().toISOString();

        // Skip header row
        for (let i = 1; i < jsonData.length; i++) {
          const row = jsonData[i];
          if (!row) continue;
          
          // Robust check: ensure row has enough columns or at least the critical ones aren't undefined
          if (row[amountIndex] === undefined) continue;

          let amount = parseFloat(String(row[amountIndex]).replace(/[^0-9.-]/g, ''));
          if (isNaN(amount)) amount = 0;

          const type = amount >= 0 ? TransactionType.INCOME : TransactionType.EXPENSE;
          
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
            description: (descIndex !== -1 && row[descIndex]) ? String(row[descIndex]) : 'Unspecified',
            amount: amount,
            category: (categoryIndex !== -1 && row[categoryIndex]) ? String(row[categoryIndex]) : 'Uncategorized',
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