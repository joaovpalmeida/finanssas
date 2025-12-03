import * as XLSX from 'xlsx';
import { Transaction, TransactionType } from '../types';

export const parseExcelFile = (file: File, defaultAccountName: string = 'Main Account'): Promise<Transaction[]> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const data = e.target?.result;
        const workbook = XLSX.read(data, { type: 'binary' });
        const sheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json(sheet, { header: 1 }) as any[][];

        // Basic heuristic to find headers
        if (jsonData.length < 2) {
            reject(new Error("File is too short"));
            return;
        }

        const headers = jsonData[0].map((h: any) => String(h).toLowerCase());
        
        const dateIndex = headers.findIndex(h => h.includes('date'));
        const descIndex = headers.findIndex(h => h.includes('description') || h.includes('desc') || h.includes('name'));
        const amountIndex = headers.findIndex(h => h.includes('amount') || h.includes('value') || h.includes('cost'));
        const categoryIndex = headers.findIndex(h => h.includes('category') || h.includes('type'));
        const accountIndex = headers.findIndex(h => h.includes('account') || h.includes('bank') || h.includes('source'));

        if (dateIndex === -1 || amountIndex === -1) {
             reject(new Error("Could not identify Date or Amount columns. Please ensure your Excel file has headers."));
             return;
        }

        const transactions: Transaction[] = [];

        // Skip header row
        for (let i = 1; i < jsonData.length; i++) {
          const row = jsonData[i];
          if (!row[dateIndex] && !row[amountIndex]) continue; // Skip empty rows

          let amount = parseFloat(String(row[amountIndex]).replace(/[^0-9.-]/g, ''));
          if (isNaN(amount)) amount = 0;

          const type = amount >= 0 ? TransactionType.INCOME : TransactionType.EXPENSE;
          
          transactions.push({
            id: `txn-${Date.now()}-${i}`,
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