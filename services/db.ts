import { Transaction, TransactionType, SavingsGoal, Category, Account, CategoryGroup } from '../types';

let db: any = null;
let SQL: any = null;

const DB_NAME = 'finance_db';
const STORE_NAME = 'sqlite_store';
const KEY_NAME = 'db_binary';

// Initialize sql.js and load DB from IndexedDB if available
export const initDB = async (): Promise<boolean> => {
  if (db) return true;

  // @ts-ignore
  if (!window.initSqlJs) {
    console.error("sql.js not loaded");
    return false;
  }

  // @ts-ignore
  SQL = await window.initSqlJs({
    locateFile: (file: string) => `https://cdnjs.cloudflare.com/ajax/libs/sql.js/1.8.0/${file}`
  });

  const savedData = await loadFromIndexedDB();
  
  if (savedData) {
    db = new SQL.Database(new Uint8Array(savedData));
    migrateSchema(); // Check if we need to update table structure for existing data
  } else {
    db = new SQL.Database();
    initSchema();
  }

  return true;
};

const initSchema = () => {
  if (!db) return;
  
  const sql = `
    CREATE TABLE IF NOT EXISTS transactions (
      id TEXT PRIMARY KEY,
      date TEXT,
      description TEXT,
      amount REAL,
      category TEXT,
      type TEXT,
      account TEXT
    );

    CREATE TABLE IF NOT EXISTS savings_goals (
      id TEXT PRIMARY KEY,
      name TEXT,
      targetAmount REAL,
      deadline TEXT,
      targetAccount TEXT
    );

    CREATE TABLE IF NOT EXISTS accounts (
      id TEXT PRIMARY KEY,
      name TEXT UNIQUE
    );

    CREATE TABLE IF NOT EXISTS categories (
      id TEXT PRIMARY KEY,
      name TEXT UNIQUE,
      type TEXT,
      group_name TEXT
    );
  `;
  db.run(sql);
  saveDB();
};

const migrateSchema = () => {
  if (!db) return;
  try {
    // 1. Check for 'account' column in transactions
    const txnRes = db.exec("PRAGMA table_info(transactions);");
    if (txnRes.length > 0) {
      const columns = txnRes[0].values.map((row: any[]) => row[1]);
      if (!columns.includes('account')) {
        console.log("Migrating database: Adding 'account' column");
        db.run("ALTER TABLE transactions ADD COLUMN account TEXT DEFAULT 'Main Account'");
      }
    }

    // 2. Check if savings_goals table exists
    const tableRes = db.exec("SELECT name FROM sqlite_master WHERE type='table' AND name='savings_goals';");
    if (tableRes.length === 0) {
      console.log("Migrating database: Creating savings_goals table");
      db.run(`
        CREATE TABLE IF NOT EXISTS savings_goals (
          id TEXT PRIMARY KEY,
          name TEXT,
          targetAmount REAL,
          deadline TEXT,
          targetAccount TEXT
        );
      `);
    }

    // 3. Create accounts and categories tables if they don't exist
    db.run(`
      CREATE TABLE IF NOT EXISTS accounts (
        id TEXT PRIMARY KEY,
        name TEXT UNIQUE
      );
      CREATE TABLE IF NOT EXISTS categories (
        id TEXT PRIMARY KEY,
        name TEXT UNIQUE,
        type TEXT,
        group_name TEXT
      );
    `);

    // 4. Populate accounts from transactions if empty
    const accountsCount = db.exec("SELECT count(*) FROM accounts")[0].values[0][0];
    if (accountsCount === 0) {
      const distinctAccounts = db.exec("SELECT DISTINCT account FROM transactions");
      if (distinctAccounts.length > 0) {
        const stmt = db.prepare("INSERT INTO accounts (id, name) VALUES (?, ?)");
        distinctAccounts[0].values.forEach((row: any[]) => {
          if (row[0]) stmt.run([`acc-${Date.now()}-${Math.random()}`, row[0]]);
        });
        stmt.free();
      }
    }

    // 5. Populate categories from transactions if empty
    const categoriesCount = db.exec("SELECT count(*) FROM categories")[0].values[0][0];
    if (categoriesCount === 0) {
      const distinctCats = db.exec("SELECT DISTINCT category, type FROM transactions");
      if (distinctCats.length > 0) {
        const stmt = db.prepare("INSERT INTO categories (id, name, type, group_name) VALUES (?, ?, ?, ?)");
        distinctCats[0].values.forEach((row: any[]) => {
          if (row[0]) {
            // Default to 'General' group, infer type from transaction type or default to Expense
            const type = row[1] || 'Expense'; 
            stmt.run([`cat-${Date.now()}-${Math.random()}`, row[0], type, 'General']);
          }
        });
        stmt.free();
      }
    }

    saveDB();
  } catch (e) {
    console.error("Migration failed", e);
  }
};

export const saveDB = async () => {
  if (!db) return;
  const data = db.export();
  await saveToIndexedDB(data);
};

export const resetDB = async () => {
  if (!db) return;
  db.run("DELETE FROM transactions;");
  db.run("DELETE FROM savings_goals;");
  db.run("DELETE FROM accounts;");
  db.run("DELETE FROM categories;");
  await saveDB();
};

// --- Transactions ---

export const insertTransactions = async (transactions: Transaction[]) => {
  if (!db) return;
  
  db.run("BEGIN TRANSACTION");
  
  const stmtTxn = db.prepare("INSERT OR REPLACE INTO transactions VALUES (?, ?, ?, ?, ?, ?, ?)");
  const stmtCat = db.prepare("INSERT OR IGNORE INTO categories (id, name, type, group_name) VALUES (?, ?, ?, ?)");
  const stmtAcc = db.prepare("INSERT OR IGNORE INTO accounts (id, name) VALUES (?, ?)");

  for (const t of transactions) {
    // 1. Insert Transaction
    stmtTxn.run([t.id, t.date, t.description, t.amount, t.category, t.type, t.account || 'Main Account']);
    
    // 2. Ensure Category Exists
    if (t.category) {
       stmtCat.run([`cat-${Date.now()}-${Math.random()}`, t.category, t.type || 'Expense', 'General']);
    }

    // 3. Ensure Account Exists
    if (t.account) {
      stmtAcc.run([`acc-${Date.now()}-${Math.random()}`, t.account]);
    }
  }
  
  stmtTxn.free();
  stmtCat.free();
  stmtAcc.free();
  
  db.run("COMMIT");
  await saveDB();
};

export const deleteTransaction = async (id: string) => {
  if (!db) return;
  db.run("DELETE FROM transactions WHERE id = ?", [id]);
  await saveDB();
};

export const getAllTransactions = (): Transaction[] => {
  if (!db) return [];
  try {
    const res = db.exec("SELECT * FROM transactions ORDER BY date DESC");
    if (res.length === 0) return [];

    const columns = res[0].columns;
    const values = res[0].values;

    return values.map((row: any[]) => {
      const t: any = {};
      columns.forEach((col: string, i: number) => {
        t[col] = row[i];
      });
      return t as Transaction;
    });
  } catch (e) {
    console.error("Error fetching transactions", e);
    return [];
  }
};

// --- Metadata (Accounts & Categories) ---

export const getAccounts = (): Account[] => {
  if (!db) return [];
  try {
    const res = db.exec("SELECT * FROM accounts ORDER BY name");
    if (res.length === 0) return [];
    return res[0].values.map((row: any[]) => ({ id: row[0], name: row[1] }));
  } catch (e) { return []; }
};

export const getCategories = (): Category[] => {
  if (!db) return [];
  try {
    const res = db.exec("SELECT * FROM categories ORDER BY name");
    if (res.length === 0) return [];
    return res[0].values.map((row: any[]) => ({ 
      id: row[0], 
      name: row[1], 
      type: row[2] as TransactionType, 
      group: row[3] as CategoryGroup 
    }));
  } catch (e) { return []; }
};

export const updateCategory = async (oldName: string, newName: string, type: string, group: string) => {
  if (!db) return;
  db.run("BEGIN TRANSACTION");
  // Update definition
  db.run("UPDATE categories SET name = ?, type = ?, group_name = ? WHERE name = ?", [newName, type, group, oldName]);
  // Update usage in transactions
  if (oldName !== newName) {
    db.run("UPDATE transactions SET category = ? WHERE category = ?", [newName, oldName]);
  }
  db.run("COMMIT");
  await saveDB();
};

export const updateAccount = async (oldName: string, newName: string) => {
  if (!db) return;
  db.run("BEGIN TRANSACTION");
  // Update definition
  db.run("UPDATE accounts SET name = ? WHERE name = ?", [newName, oldName]);
  // Update usage in transactions
  if (oldName !== newName) {
    db.run("UPDATE transactions SET account = ? WHERE account = ?", [newName, oldName]);
  }
  db.run("COMMIT");
  await saveDB();
};

export const renameCategory = async (oldName: string, newName: string) => {
  // Legacy support wrapper, assumes General/Expense if unknown, but usually updateCategory is called
  const cats = getCategories();
  const cat = cats.find(c => c.name === oldName);
  await updateCategory(oldName, newName, cat?.type || 'Expense', cat?.group || 'General');
}

export const renameAccount = async (oldName: string, newName: string) => {
  await updateAccount(oldName, newName);
}

// --- Savings Goals ---

export const insertSavingsGoal = async (goal: SavingsGoal) => {
  if (!db) return;
  const accountsJson = JSON.stringify(goal.targetAccounts);
  db.run("INSERT OR REPLACE INTO savings_goals VALUES (?, ?, ?, ?, ?)", [
    goal.id, goal.name, goal.targetAmount, goal.deadline, accountsJson
  ]);
  await saveDB();
};

export const deleteSavingsGoal = async (id: string) => {
  if (!db) return;
  db.run("DELETE FROM savings_goals WHERE id = ?", [id]);
  await saveDB();
};

export const getSavingsGoals = (): SavingsGoal[] => {
  if (!db) return [];
  try {
    const res = db.exec("SELECT * FROM savings_goals ORDER BY deadline ASC");
    if (res.length === 0) return [];
    
    const columns = res[0].columns;
    const values = res[0].values;

    return values.map((row: any[]) => {
      const rowObj: any = {};
      columns.forEach((col: string, i: number) => {
        rowObj[col] = row[i];
      });

      let accounts: string[] = [];
      try {
        const parsed = JSON.parse(rowObj.targetAccount);
        if (Array.isArray(parsed)) {
          accounts = parsed;
        } else {
          accounts = [String(rowObj.targetAccount)]; 
        }
      } catch (e) {
        if (rowObj.targetAccount) {
          accounts = [String(rowObj.targetAccount)];
        }
      }

      return {
        id: rowObj.id,
        name: rowObj.name,
        targetAmount: rowObj.targetAmount,
        deadline: rowObj.deadline,
        targetAccounts: accounts
      } as SavingsGoal;
    });
  } catch (e) {
    console.error("Error fetching goals", e);
    return [];
  }
};

// --- Utilities ---

export const exportDatabaseBlob = (): Blob | null => {
  if (!db) return null;
  const data = db.export();
  return new Blob([data], { type: 'application/x-sqlite3' });
};

export const runQuery = (sql: string): { columns: string[], values: any[][] } | null => {
  if (!db) return null;
  try {
    const res = db.exec(sql);
    if (res.length > 0) {
      return {
        columns: res[0].columns,
        values: res[0].values
      };
    }
    return { columns: [], values: [] };
  } catch (e: any) {
    throw new Error(e.message);
  }
};

export const getDistinctValues = (column: 'category' | 'account'): string[] => {
  if (!db) return [];
  try {
    // Basic sanitization, though column is strictly typed
    const safeCol = column === 'category' ? 'category' : 'account';
    const res = db.exec(`SELECT DISTINCT ${safeCol} FROM transactions ORDER BY ${safeCol}`);
    if (res.length === 0) return [];
    
    return res[0].values.flat().filter((v: any) => v);
  } catch (e) {
    console.error(`Error fetching distinct ${column}`, e);
    return [];
  }
}

// IndexedDB Helpers
const loadFromIndexedDB = (): Promise<ArrayBuffer | null> => {
  return new Promise((resolve) => {
    const request = indexedDB.open(DB_NAME, 1);
    
    request.onupgradeneeded = (e: any) => {
      const db = e.target.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };

    request.onsuccess = (e: any) => {
      const db = e.target.result;
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const getReq = store.get(KEY_NAME);

      getReq.onsuccess = () => {
        resolve(getReq.result || null);
      };
      getReq.onerror = () => resolve(null);
    };

    request.onerror = () => resolve(null);
  });
};

const saveToIndexedDB = (data: Uint8Array): Promise<void> => {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);
    
    request.onsuccess = (e: any) => {
      const db = e.target.result;
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const putReq = store.put(data, KEY_NAME);
      
      putReq.onsuccess = () => resolve();
      putReq.onerror = () => reject(putReq.error);
    };
    
    request.onerror = () => reject(request.error);
  });
};