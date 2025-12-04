import { Transaction, TransactionType, SavingsGoal, Category, Account, CategoryGroup, SearchFilters } from '../types';

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

    CREATE TABLE IF NOT EXISTS configs (
      key TEXT PRIMARY KEY,
      value TEXT
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

    // 4. Create configs table if it doesn't exist
    db.run(`
      CREATE TABLE IF NOT EXISTS configs (
        key TEXT PRIMARY KEY,
        value TEXT
      );
    `);

    // 5. Populate accounts from transactions if empty
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

    // 6. Populate categories from transactions if empty
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
  db.run("DELETE FROM configs;");
  await saveDB();
};

export const importDatabase = async (file: File): Promise<void> => {
  if (!SQL) throw new Error("SQL.js not initialized");

  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const buffer = e.target?.result as ArrayBuffer;
        if (!buffer) {
            reject(new Error("Failed to read file"));
            return;
        }
        
        const u8 = new Uint8Array(buffer);
        
        // Validate it's a valid SQLite database
        try {
            const testDb = new SQL.Database(u8);
            testDb.close();
        } catch (e) {
            reject(new Error("Invalid SQLite database file"));
            return;
        }

        // Close existing if open
        if (db) {
            try { db.close(); } catch(e) {}
        }

        db = new SQL.Database(u8);
        
        // Ensure schema is compatible with current version of app
        migrateSchema();
        
        await saveDB();
        resolve();
      } catch (err) {
        reject(err);
      }
    };
    reader.onerror = () => reject(new Error("Failed to read file"));
    reader.readAsArrayBuffer(file);
  });
};

export const getTransactionCount = (): number => {
  if (!db) return 0;
  try {
    const res = db.exec("SELECT count(*) FROM transactions");
    if (res.length > 0) {
        return res[0].values[0][0];
    }
    return 0;
  } catch(e) {
    return 0;
  }
};

export const generateDummyData = async () => {
  if (!db) return;

  const accounts = ['Main Checking', 'Savings', 'Visa Card'];
  const categories = [
    { name: 'Salary', type: TransactionType.INCOME, group: 'Recurring' },
    { name: 'Rent', type: TransactionType.EXPENSE, group: 'Recurring' },
    { name: 'Utilities', type: TransactionType.EXPENSE, group: 'Recurring' },
    { name: 'Internet', type: TransactionType.EXPENSE, group: 'Recurring' },
    { name: 'Groceries', type: TransactionType.EXPENSE, group: 'General' },
    { name: 'Dining Out', type: TransactionType.EXPENSE, group: 'General' },
    { name: 'Transport', type: TransactionType.EXPENSE, group: 'General' },
    { name: 'Entertainment', type: TransactionType.EXPENSE, group: 'General' },
    { name: 'Shopping', type: TransactionType.EXPENSE, group: 'General' },
    { name: 'Freelance', type: TransactionType.INCOME, group: 'General' },
  ];

  const transactions: Transaction[] = [];
  const today = new Date();
  
  // Generate data for past 90 days
  for (let i = 0; i < 90; i++) {
    const date = new Date(today);
    date.setDate(date.getDate() - i);
    const dateStr = date.toISOString();
    const day = date.getDate();

    // 1. Monthly Recurring Items
    if (day === 1) {
        transactions.push({
            id: `dummy-rent-${i}`,
            date: dateStr,
            description: 'Monthly Rent',
            amount: -1200,
            category: 'Rent',
            type: TransactionType.EXPENSE,
            account: 'Main Checking'
        });
    }
    if (day === 28) {
        transactions.push({
            id: `dummy-salary-${i}`,
            date: dateStr,
            description: 'Monthly Salary',
            amount: 3500,
            category: 'Salary',
            type: TransactionType.INCOME,
            account: 'Main Checking'
        });
    }
    if (day === 15) {
        transactions.push({
            id: `dummy-utils-${i}`,
            date: dateStr,
            description: 'Electric & Internet',
            amount: -150,
            category: 'Utilities',
            type: TransactionType.EXPENSE,
            account: 'Main Checking'
        });
    }

    // 2. Random Daily Expenses
    // 40% chance of grocery shopping
    if (Math.random() > 0.6) {
        transactions.push({
            id: `dummy-groc-${i}`,
            date: dateStr,
            description: 'Supermarket Purchase',
            amount: -(Math.floor(Math.random() * 80) + 20),
            category: 'Groceries',
            type: TransactionType.EXPENSE,
            account: Math.random() > 0.5 ? 'Main Checking' : 'Visa Card'
        });
    }

    // 30% chance of dining out
    if (Math.random() > 0.7) {
        transactions.push({
            id: `dummy-dine-${i}`,
            date: dateStr,
            description: 'Restaurant / Cafe',
            amount: -(Math.floor(Math.random() * 60) + 10),
            category: 'Dining Out',
            type: TransactionType.EXPENSE,
            account: 'Visa Card'
        });
    }

    // 20% chance of transport
    if (Math.random() > 0.8) {
        transactions.push({
            id: `dummy-trans-${i}`,
            date: dateStr,
            description: 'Uber / Public Transport',
            amount: -(Math.floor(Math.random() * 30) + 5),
            category: 'Transport',
            type: TransactionType.EXPENSE,
            account: 'Visa Card'
        });
    }
  }

  // Insert using the standard function to populate metadata tables automatically
  await insertTransactions(transactions);

  // Manually update groups for the dummy categories since insertTransactions defaults to 'General'
  db.run("BEGIN TRANSACTION");
  categories.forEach(c => {
    db.run("UPDATE categories SET group_name = ?, type = ? WHERE name = ?", [c.group, c.type, c.name]);
  });
  db.run("COMMIT");
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

export const searchTransactions = (filters: SearchFilters): Transaction[] => {
  if (!db) return [];
  
  let sql = "SELECT * FROM transactions WHERE 1=1";
  const params: any[] = [];

  if (filters.keyword) {
    sql += " AND description LIKE ?";
    params.push(`%${filters.keyword}%`);
  }

  if (filters.category) {
    sql += " AND category = ?";
    params.push(filters.category);
  }

  if (filters.account) {
    sql += " AND account = ?";
    params.push(filters.account);
  }

  if (filters.type) {
    sql += " AND type = ?";
    params.push(filters.type);
  }

  if (filters.startDate) {
    sql += " AND date >= ?";
    params.push(filters.startDate);
  }

  if (filters.endDate) {
    sql += " AND date <= ?";
    // Add time component to end date to ensure inclusive day
    params.push(filters.endDate + 'T23:59:59.999Z');
  }

  if (filters.minAmount) {
     sql += " AND ABS(amount) >= ?";
     params.push(parseFloat(filters.minAmount));
  }

  if (filters.maxAmount) {
    sql += " AND ABS(amount) <= ?";
    params.push(parseFloat(filters.maxAmount));
  }

  sql += " ORDER BY date DESC LIMIT 500";

  try {
    const stmt = db.prepare(sql);
    stmt.bind(params);
    const transactions: Transaction[] = [];
    while (stmt.step()) {
      const row = stmt.getAsObject();
      transactions.push(row as Transaction);
    }
    stmt.free();
    return transactions;
  } catch (e) {
    console.error("Search error", e);
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

export const deleteCategory = async (id: string): Promise<boolean> => {
  if (!db) return false;
  
  // 1. Get the category name first
  const res = db.exec("SELECT name FROM categories WHERE id = ?", [id]);
  if (res.length === 0) return false;
  const name = res[0].values[0][0];

  // 2. Check usage in transactions
  const countRes = db.exec("SELECT count(*) FROM transactions WHERE category = ?", [name]);
  const count = countRes[0].values[0][0];

  if (count > 0) {
    throw new Error(`Cannot delete category "${name}" because it is used in ${count} transaction(s). Please reassign them first.`);
  }

  // 3. Delete
  db.run("DELETE FROM categories WHERE id = ?", [id]);
  await saveDB();
  return true;
};

export const deleteAccount = async (id: string): Promise<boolean> => {
  if (!db) return false;

  // 1. Get name
  const res = db.exec("SELECT name FROM accounts WHERE id = ?", [id]);
  if (res.length === 0) return false;
  const name = res[0].values[0][0];

  // 2. Check usage
  const countRes = db.exec("SELECT count(*) FROM transactions WHERE account = ?", [name]);
  const count = countRes[0].values[0][0];

  if (count > 0) {
    throw new Error(`Cannot delete account "${name}" because it contains ${count} transaction(s).`);
  }

  db.run("DELETE FROM accounts WHERE id = ?", [id]);
  await saveDB();
  return true;
};

// Legacy support wrapper
export const renameCategory = async (oldName: string, newName: string) => {
  const cats = getCategories();
  const cat = cats.find(c => c.name === oldName);
  await updateCategory(oldName, newName, cat?.type || 'Expense', cat?.group || 'General');
}

export const renameAccount = async (oldName: string, newName: string) => {
  await updateAccount(oldName, newName);
}

// --- Configs (API Keys) ---

export const getApiKey = (): string | null => {
  if (!db) return null;
  try {
    const res = db.exec("SELECT value FROM configs WHERE key = 'google_api_key'");
    if (res.length > 0) {
        return res[0].values[0][0];
    }
    return null;
  } catch(e) {
    return null;
  }
}

export const saveApiKey = async (key: string) => {
  if (!db) return;
  db.run("INSERT OR REPLACE INTO configs (key, value) VALUES ('google_api_key', ?)", [key]);
  await saveDB();
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