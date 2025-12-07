import * as XLSX from 'xlsx';
import { Transaction, TransactionType } from '../types';

export interface ColumnMapping {
  date: string; // stored as stringified index "0", "1"...
  dateFormat?: string; // "DD/MM/YYYY", "MM/DD/YYYY", "YYYY-MM-DD"
  decimalSeparator?: '.' | ','; // '.' for 1,234.56, ',' for 1.234,56
  
  // Common or default fields
  description: string;
  category: string;
  
  // Manual Fallbacks
  manualDescription?: string;
  manualCategory?: string;
  
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
  
  // Manual Specific Overrides
  manualIncomeCategory?: string;
  manualExpenseCategory?: string;
  
  account?: string;

  // Row selection (Global / Single Mode)
  startRow?: number; // 1-based index from UI
  endRow?: number;   // 1-based index from UI

  // Row selection (Split Mode Specific)
  incomeStartRow?: number;
  incomeEndRow?: number;
  expenseStartRow?: number;
  expenseEndRow?: number;
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
        // For CSVs, we use raw: true to prevent auto-parsing of numbers/dates in headers if possible,
        // though typically headers are strings anyway.
        const isCSV = file.name.toLowerCase().endsWith('.csv');
        const workbook = XLSX.read(data, { type: 'binary', raw: isCSV });
        
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
        
        const isCSV = file.name.toLowerCase().endsWith('.csv');
        const workbook = XLSX.read(data, { type: 'binary', raw: isCSV });
        
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

        const getIdx = (val: string | undefined) => (val && val !== '' && !isNaN(parseInt(val))) ? parseInt(val) : -1;

        // Common indices
        let dateIndex = -1;
        let descIndex = -1;
        let categoryIndex = -1;
        let accountIndex = -1;

        // Modes
        let hasSplitAmount = false;
        let amountIndex = -1; // Single mode
        
        // Split mode indices
        let incomeIndex = -1;
        let expenseIndex = -1;
        let incomeDescIndex = -1;
        let expenseDescIndex = -1;
        let incomeCatIndex = -1;
        let expenseCatIndex = -1;

        if (mapping) {
          dateIndex = getIdx(mapping.date);
          descIndex = getIdx(mapping.description);
          categoryIndex = getIdx(mapping.category);
          accountIndex = getIdx(mapping.account);
          
          amountIndex = getIdx(mapping.amount);
          
          incomeIndex = getIdx(mapping.income);
          expenseIndex = getIdx(mapping.expense);
          
          incomeDescIndex = getIdx(mapping.incomeDescription);
          expenseDescIndex = getIdx(mapping.expenseDescription);
          incomeCatIndex = getIdx(mapping.incomeCategory);
          expenseCatIndex = getIdx(mapping.expenseCategory);

          if (incomeIndex !== -1 || expenseIndex !== -1) {
            hasSplitAmount = true;
          }
        }

        const fallbackDateStr = defaultDate ? new Date(defaultDate).toISOString() : new Date().toISOString();
        const transactions: Transaction[] = [];

        // Helper function to extract date
        const extractDate = (row: any[]) => {
            if (dateIndex !== -1 && row[dateIndex] !== undefined) {
                if (typeof row[dateIndex] === 'number') {
                   const dateObj = XLSX.SSF.parse_date_code(row[dateIndex]);
                   if (dateObj) return new Date(dateObj.y, dateObj.m - 1, dateObj.d).toISOString();
                } else {
                   const val = String(row[dateIndex]).trim();
                   
                   // Try specific format parsing if defined
                   if (mapping?.dateFormat && mapping.dateFormat !== '') {
                       const parts = val.match(/(\d+)/g);
                       if (parts && parts.length >= 3) {
                           const nums = parts.map(Number);
                           let y, m, d;
                           
                           if (mapping.dateFormat === 'DD/MM/YYYY') {
                               [d, m, y] = nums;
                           } else if (mapping.dateFormat === 'MM/DD/YYYY') {
                               [m, d, y] = nums;
                           } else if (mapping.dateFormat === 'YYYY-MM-DD') {
                               [y, m, d] = nums;
                           }
                           
                           if (y !== undefined && m !== undefined && d !== undefined) {
                               if (y < 100) y += 2000; 
                               const date = new Date(y, m - 1, d);
                               if (!isNaN(date.getTime())) return date.toISOString();
                           }
                       }
                   }

                   const d = new Date(val);
                   if (!isNaN(d.getTime())) return d.toISOString();
                }
            }
            return fallbackDateStr;
        };

        const parseNumber = (val: any): number => {
            if (val === undefined || val === null) return NaN;
            if (typeof val === 'number') return val;
            
            let str = String(val).trim();
            if (str === '') return NaN;

            let isNegative = false;
            if (str.startsWith('(') && str.endsWith(')')) {
                isNegative = true;
                str = str.slice(1, -1);
            }

            const separator = mapping?.decimalSeparator || '.';
            str = str.replace(/[\s\u00A0]/g, '');

            if (separator === ',') {
                str = str.replace(/\./g, '');
                str = str.replace(/[^0-9,-]/g, '');
                str = str.replace(/,/g, '.');
            } else {
                const simpleCommaDecimalMatch = str.match(/^-?\d+,(\d{1,2})$/);
                if (simpleCommaDecimalMatch) {
                    str = str.replace(/,/g, '.');
                } else {
                    str = str.replace(/,/g, '');
                    str = str.replace(/[^0-9.-]/g, '');
                }
            }

            let result = parseFloat(str);
            if (isNegative && !isNaN(result)) {
                result = -Math.abs(result);
            }
            return result;
        };

        const createTxn = (
          row: any[], 
          amount: number, 
          type: TransactionType, 
          specificDescIdx: number, 
          specificCatIdx: number, 
          rowIndex: number,
          specificManualCategory?: string
        ) => {
            let description = 'Unspecified';
            if (specificDescIdx !== -1 && row[specificDescIdx]) {
                description = String(row[specificDescIdx]);
            } else if (descIndex !== -1 && row[descIndex]) {
                description = String(row[descIndex]);
            } else if (mapping?.manualDescription) {
                description = mapping.manualDescription;
            }

            let category = 'Uncategorized';
            if (specificCatIdx !== -1 && row[specificCatIdx]) {
                category = String(row[specificCatIdx]);
            } else if (specificManualCategory) {
                category = specificManualCategory;
            } else if (categoryIndex !== -1 && row[categoryIndex]) {
                category = String(row[categoryIndex]);
            } else if (mapping?.manualCategory) {
                category = mapping.manualCategory;
            }
            
            return {
                id: `txn-${Date.now()}-${rowIndex}-${Math.random()}`,
                date: extractDate(row),
                description: description,
                amount: amount,
                category: category,
                categoryId: '', // Placeholder, will be resolved by DB Insert
                type: type,
                account: (accountIndex !== -1 && row[accountIndex]) ? String(row[accountIndex]) : defaultAccountName,
                accountId: '' // Placeholder, will be resolved by DB Insert
            };
        };

        if (hasSplitAmount) {
            if (incomeIndex !== -1) {
                const start = (mapping?.incomeStartRow || mapping?.startRow || 2) - 1;
                const end = (mapping?.incomeEndRow || mapping?.endRow || jsonData.length);
                
                for (let i = start; i < end; i++) {
                    const row = jsonData[i];
                    if (!row) continue;
                    
                    const rawVal = row[incomeIndex];
                    if (rawVal !== undefined) {
                         const val = parseNumber(rawVal);
                         if (!isNaN(val) && val !== 0) {
                             transactions.push(createTxn(
                               row, 
                               Math.abs(val), 
                               TransactionType.INCOME, 
                               incomeDescIndex, 
                               incomeCatIndex, 
                               i, 
                               mapping?.manualIncomeCategory
                             ));
                         }
                    }
                }
            }

            if (expenseIndex !== -1) {
                const start = (mapping?.expenseStartRow || mapping?.startRow || 2) - 1;
                const end = (mapping?.expenseEndRow || mapping?.endRow || jsonData.length);
                
                for (let i = start; i < end; i++) {
                    const row = jsonData[i];
                    if (!row) continue;
                    
                    const rawVal = row[expenseIndex];
                    if (rawVal !== undefined) {
                         const val = parseNumber(rawVal);
                         if (!isNaN(val) && val !== 0) {
                             transactions.push(createTxn(
                               row, 
                               -Math.abs(val), 
                               TransactionType.EXPENSE, 
                               expenseDescIndex, 
                               expenseCatIndex, 
                               i,
                               mapping?.manualExpenseCategory
                             ));
                         }
                    }
                }
            }

        } else {
            if (amountIndex === -1) {
                 reject(new Error("No Amount column mapped."));
                 return;
            }

            const start = (mapping?.startRow || 2) - 1;
            const end = (mapping?.endRow || jsonData.length);

            for (let i = start; i < end; i++) {
                const row = jsonData[i];
                if (!row) continue;

                if (row[amountIndex] !== undefined) {
                    const val = parseNumber(row[amountIndex]);
                    if (!isNaN(val) && val !== 0) {
                        const type = val >= 0 ? TransactionType.INCOME : TransactionType.EXPENSE;
                        transactions.push(createTxn(row, val, type, -1, -1, i));
                    }
                }
            }
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