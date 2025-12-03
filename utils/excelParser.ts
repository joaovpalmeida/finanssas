import * as XLSX from 'xlsx';
import { Transaction, TransactionType } from '../types';

export interface ColumnMapping {
  date: string;
  description: string;
  amount: string;
  category: string;
  account?: string;
}

export const getExcelHeaders = (file: File): Promise<string[]> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = e.target?.result;
        const workbook = XLSX.read(data, { type: 'binary' });
        const sheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json(sheet, { header: 1 }) as any[][];
        
        if (jsonData.length > 0) {
          resolve(jsonData[0].map(h => String(h)));
        } else {
          resolve([]);
        }
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
  mapping?: ColumnMapping
): Promise<Transaction[]> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const data = e.target?.result;
        const workbook = XLSX.read(data, { type: 'binary' });
        const sheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json(sheet, { header: 1 }) as any[][];

        if (jsonData.length < 2) {
            reject(new Error("File is too short"));
            return;
        }

        // Headers line
        const headers = jsonData[0].map((h: any) => String(h));
        const lowerHeaders = headers.map(h => h.toLowerCase());

        let dateIndex = -1;
        let descIndex = -1;
        let amountIndex = -1;
        let categoryIndex = -1;
        let accountIndex = -1;

        // If mapping is provided, use it to find exact indices
        if (mapping) {
          dateIndex = headers.indexOf(mapping.date);
          descIndex = headers.indexOf(mapping.description);
          amountIndex = headers.indexOf(mapping.amount);
          categoryIndex = headers.indexOf(mapping.category);
          if (mapping.account) {
            accountIndex = headers.indexOf(mapping.account);
          }
        } else {
          // Fallback to heuristics
          dateIndex = lowerHeaders.findIndex(h => h.includes('date'));
          descIndex = lowerHeaders.findIndex(h => h.includes('description') || h.includes('desc') || h.includes('name'));
          amountIndex = lowerHeaders.findIndex(h => h.includes('amount') || h.includes('value') || h.includes('cost'));
          categoryIndex = lowerHeaders.findIndex(h => h.includes('category') || h.includes('type'));
          accountIndex = lowerHeaders.findIndex(h => h.includes('account') || h.includes('bank') || h.includes('source'));
        }

        if (dateIndex === -1 || amountIndex === -1) {
             reject(new Error("Could not identify Date or Amount columns. Please check your column mapping."));
             return;
        }

        const transactions: Transaction[] = [];

        // Skip header row
        for (let i = 1; i < jsonData.length; i++) {
          const row = jsonData[i];
          if (!row[dateIndex] && !row[amountIndex]) continue; // Skip empty rows

          let amount = parseFloat(String(row[amountIndex]).replace(/[^0-9.-]/g, ''));
          if (isNaN(amount)) amount = 0;

          // Infer type based on sign if not explicitly categorized later (UI handles category types)
          const type = amount >= 0 ? TransactionType.INCOME : TransactionType.EXPENSE;
          
          transactions.push({
            id: `txn-${Date.now()}-${i}-${Math.random()}`,
            date: row[dateIndex] ? new Date(row[dateIndex]).toISOString() : new Date().toISOString(),
            description: descIndex !== -1 ? String(row[descIndex]) : 'Unspecified',
            amount: amount,
            category: categoryIndex !== -1 ? String(row[categoryIndex]) : 'Uncategorized',
            type: type,
            account: accountIndex !== -1 ? String(row[accountIndex]) : defaultAccountName
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