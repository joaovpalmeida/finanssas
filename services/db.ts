import { Transaction, TransactionType, SavingsGoal, Category, Account, CategoryGroup, SearchFilters, FiscalConfig } from '../types';
import { generateTransactionSignature } from '../utils/helpers';

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
    db.run("PRAGMA foreign_keys = ON;"); // Enable FK support
    migrateSchema(); 
  } else {
    db = new SQL.Database();
    db.run("PRAGMA foreign_keys = ON;"); // Enable FK support
    initSchema();
  }

  return true;
};

const initSchema = () => {
  if (!db) return;
  
  const sql = `
    CREATE TABLE IF NOT EXISTS accounts (
      id TEXT PRIMARY KEY,
      name TEXT UNIQUE,
      is_savings INTEGER DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS categories (
      id TEXT PRIMARY KEY,
      name TEXT,
      type TEXT,
      group_name TEXT,
      UNIQUE(name, type)
    );

    CREATE TABLE IF NOT EXISTS transactions (
      id TEXT PRIMARY KEY,
      date TEXT,
      description TEXT,
      amount REAL,
      category_id TEXT,
      account_id TEXT,
      type TEXT,
      FOREIGN KEY(category_id) REFERENCES categories(id) ON DELETE SET NULL,
      FOREIGN KEY(account_id) REFERENCES accounts(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS savings_goals (
      id TEXT PRIMARY KEY,
      name TEXT,
      targetAmount REAL,
      deadline TEXT,
      targetAccount TEXT -- Stores JSON array of Account IDs
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
  // Complex migration logic omitted for this prototype phase.
  // In a real app, we would check user_version pragma and migrate data from names to IDs.
  // For now, we ensure tables exist.
  initSchema();
};

export const saveDB = async () => {
  if (!db) return;
  const data = db.export();
  await saveToIndexedDB(data);
};

export const resetDB = async () => {
  if (!db) return;
  db.run("PRAGMA foreign_keys = OFF;"); // Disable to allow truncating parents
  db.run("DELETE FROM transactions;");
  db.run("DELETE FROM savings_goals;");
  db.run("DELETE FROM accounts;");
  db.run("DELETE FROM categories;");
  db.run("DELETE FROM configs;");
  db.run("PRAGMA foreign_keys = ON;");
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
        
        try {
            const testDb = new SQL.Database(u8);
            testDb.close();
        } catch (e) {
            reject(new Error("Invalid SQLite database file"));
            return;
        }

        if (db) {
            try { db.close(); } catch(e) {}
        }

        db = new SQL.Database(u8);
        db.run("PRAGMA foreign_keys = ON;");
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

export const getExistingSignatures = (): Set<string> => {
  if (!db) return new Set();
  try {
    const res = db.exec("SELECT date, amount, description FROM transactions");
    if (res.length === 0) return new Set();

    const values = res[0].values;
    const signatures = new Set<string>();

    values.forEach((row: any[]) => {
      const t = {
        date: row[0],
        amount: row[1],
        description: row[2]
      } as Transaction;
      signatures.add(generateTransactionSignature(t));
    });

    return signatures;
  } catch (e) {
    console.error("Error fetching existing signatures", e);
    return new Set();
  }
};

export const generateDummyData = async () => {
  if (!db) return;

  db.run("BEGIN TRANSACTION");

  try {
    // 1. Setup Accounts and Categories with Explicit IDs
    const accountsData = [
        { name: 'Main Checking', isSavings: 0 },
        { name: 'Savings', isSavings: 1 },
        { name: 'Credit Card', isSavings: 0 }
    ];

    const categoriesData = [
        { name: 'Salary', type: 'Income', group: 'Recurring' },
        { name: 'Freelance', type: 'Income', group: 'General' },
        { name: 'Rent', type: 'Expense', group: 'Recurring' },
        { name: 'Utilities', type: 'Expense', group: 'Recurring' },
        { name: 'Internet', type: 'Expense', group: 'Recurring' },
        { name: 'Groceries', type: 'Expense', group: 'General' },
        { name: 'Dining Out', type: 'Expense', group: 'General' },
        { name: 'Transport', type: 'Expense', group: 'General' },
        { name: 'Entertainment', type: 'Expense', group: 'General' },
        { name: 'Shopping', type: 'Expense', group: 'General' },
        { name: 'Health', type: 'Expense', group: 'General' },
        { name: 'Transfer', type: 'Transfer', group: 'General' }
    ];

    // Resolve Account IDs (Create if not exist)
    const accountIds: Record<string, string> = {};
    for (const acc of accountsData) {
        const res = db.exec("SELECT id FROM accounts WHERE name = ?", [acc.name]);
        if (res.length > 0) {
            accountIds[acc.name] = res[0].values[0][0] as string;
        } else {
            const newId = `acc-dummy-${Date.now()}-${Math.floor(Math.random()*100000)}`;
            db.run("INSERT INTO accounts (id, name, is_savings) VALUES (?, ?, ?)", [newId, acc.name, acc.isSavings]);
            accountIds[acc.name] = newId;
        }
    }

    // Resolve Category IDs (Create if not exist)
    const categoryIds: Record<string, string> = {}; // Key: "Name:Type"
    for (const cat of categoriesData) {
        const res = db.exec("SELECT id FROM categories WHERE name = ? AND type = ?", [cat.name, cat.type]);
        if (res.length > 0) {
            categoryIds[`${cat.name}:${cat.type}`] = res[0].values[0][0] as string;
        } else {
            const newId = `cat-dummy-${Date.now()}-${Math.floor(Math.random()*100000)}`;
            db.run("INSERT INTO categories (id, name, type, group_name) VALUES (?, ?, ?, ?)", [newId, cat.name, cat.type, cat.group]);
            categoryIds[`${cat.name}:${cat.type}`] = newId;
        }
    }

    // 2. Generate Transactions (12 Months)
    const transactions = [];
    const endDate = new Date();
    const startDate = new Date();
    startDate.setMonth(startDate.getMonth() - 12);
    
    // Helpers
    const randInt = (min: number, max: number) => Math.floor(Math.random() * (max - min + 1)) + min;
    
    let currentDate = new Date(startDate);
    
    while (currentDate <= endDate) {
        const dateStr = currentDate.toISOString();
        const day = currentDate.getDate();
        const weekDay = currentDate.getDay(); // 0 = Sun, 6 = Sat
        const isWeekend = weekDay === 0 || weekDay === 6;

        // --- Monthly Recurring ---
        if (day === 1) {
            transactions.push({
                date: dateStr,
                desc: 'Monthly Rent', amount: -1200, cat: 'Rent', type: 'Expense', acc: 'Main Checking'
            });
        }
        if (day === 5) {
            transactions.push({
                date: dateStr,
                desc: 'Internet Bill', amount: -60, cat: 'Internet', type: 'Expense', acc: 'Main Checking'
            });
        }
        if (day === 15) {
            transactions.push({
                date: dateStr,
                desc: 'Electric & Water', amount: -randInt(120, 180), cat: 'Utilities', type: 'Expense', acc: 'Main Checking'
            });
        }
        if (day === 28) {
            transactions.push({
                date: dateStr,
                desc: 'Salary', amount: 4500, cat: 'Salary', type: 'Income', acc: 'Main Checking'
            });
            // Auto Transfer to Savings
            transactions.push({
                date: dateStr,
                desc: 'Savings Contribution', amount: -1000, cat: 'Transfer', type: 'Transfer', acc: 'Main Checking'
            });
            transactions.push({
                date: dateStr,
                desc: 'Savings Contribution', amount: 1000, cat: 'Transfer', type: 'Transfer', acc: 'Savings'
            });
        }

        // --- Daily/Weekly Variable ---
        
        // Groceries (Every ~4 days)
        if (Math.random() > 0.75) {
             transactions.push({
                date: dateStr,
                desc: 'Supermarket', amount: -randInt(40, 150), cat: 'Groceries', type: 'Expense', acc: 'Main Checking'
            });
        }

        // Dining Out (More on weekends)
        if ((isWeekend && Math.random() > 0.3) || (!isWeekend && Math.random() > 0.8)) {
             transactions.push({
                date: dateStr,
                desc: 'Restaurant / Cafe', amount: -randInt(15, 60), cat: 'Dining Out', type: 'Expense', acc: 'Credit Card'
            });
        }

        // Transport
        if (!isWeekend && Math.random() > 0.6) {
             transactions.push({
                date: dateStr,
                desc: 'Uber / Public Transport', amount: -randInt(10, 30), cat: 'Transport', type: 'Expense', acc: 'Credit Card'
            });
        }

        // Random Shopping
        if (day % 10 === 0 && Math.random() > 0.5) {
             transactions.push({
                date: dateStr,
                desc: 'Amazon / Online Store', amount: -randInt(30, 150), cat: 'Shopping', type: 'Expense', acc: 'Credit Card'
            });
        }

        // Random Freelance Income
        if (day % 14 === 0 && Math.random() > 0.7) {
             transactions.push({
                date: dateStr,
                desc: 'Freelance Project', amount: randInt(200, 800), cat: 'Freelance', type: 'Income', acc: 'Main Checking'
            });
        }

        // Next Day
        currentDate.setDate(currentDate.getDate() + 1);
    }

    // 3. Batch Insert
    const stmt = db.prepare(`
        INSERT INTO transactions (id, date, description, amount, category_id, account_id, type)
        VALUES (?, ?, ?, ?, ?, ?, ?)
    `);

    for (const t of transactions) {
        const catKey = `${t.cat}:${t.type}`;
        const catId = categoryIds[catKey];
        const accId = accountIds[t.acc];

        if (catId && accId) {
            stmt.run([
                `txn-dummy-${Date.now()}-${Math.random().toString(36).substring(2, 10)}`,
                t.date || currentDate.toISOString(), 
                t.desc,
                t.amount,
                catId,
                accId,
                t.type
            ]);
        }
    }
    stmt.free();

    db.run("COMMIT");
    await saveDB();

  } catch (e) {
    console.error("Dummy generation failed", e);
    db.run("ROLLBACK");
    throw e;
  }
};

// --- Transactions ---

export const insertTransactions = async (transactions: Transaction[]) => {
  if (!db) return;
  
  db.run("BEGIN TRANSACTION");
  
  try {
    // 1. Resolve Accounts (Pre-processing to avoid loop lookups)
    const accountMap = new Map<string, string>(); // Name -> ID
    const uniqueAccounts = new Set<string>();
    
    transactions.forEach(t => {
        // Collect names if no ID is present
        if (t.account && !t.accountId) uniqueAccounts.add(t.account);
    });

    for (const name of uniqueAccounts) {
        const res = db.exec("SELECT id FROM accounts WHERE name = ?", [name]);
        if (res.length > 0) {
            accountMap.set(name, res[0].values[0][0] as string);
        } else {
            const newId = `acc-${Date.now()}-${Math.floor(Math.random() * 10000)}`;
            db.run("INSERT INTO accounts (id, name, is_savings) VALUES (?, ?, 0)", [newId, name]);
            accountMap.set(name, newId);
        }
    }
    
    // Ensure "Main Account" exists fallback
    if (!accountMap.has('Main Account')) {
         const res = db.exec("SELECT id FROM accounts WHERE name = 'Main Account'");
         if (res.length > 0) {
             accountMap.set('Main Account', res[0].values[0][0] as string);
         } else {
             const newId = `acc-default-${Date.now()}`;
             db.run("INSERT INTO accounts (id, name, is_savings) VALUES (?, ?, 0)", [newId, 'Main Account']);
             accountMap.set('Main Account', newId);
         }
    }

    // 2. Resolve Categories (Pre-processing)
    const categoryMap = new Map<string, string>(); // "Name:Type" -> ID
    const catKeys: {name: string, type: string}[] = [];
    
    transactions.forEach(t => {
        if (t.category && !t.categoryId) {
             const type = t.type || 'Expense';
             // Check if already processed in this batch to avoid dupes in catKeys
             if (!catKeys.some(k => k.name === t.category && k.type === type)) {
                 catKeys.push({ name: t.category, type });
             }
        }
    });

    for (const k of catKeys) {
        const res = db.exec("SELECT id FROM categories WHERE name = ? AND type = ?", [k.name, k.type]);
        let id;
        if (res.length > 0) {
            id = res[0].values[0][0] as string;
        } else {
            id = `cat-${Date.now()}-${Math.floor(Math.random() * 10000)}`;
            db.run("INSERT INTO categories (id, name, type, group_name) VALUES (?, ?, ?, 'General')", [id, k.name, k.type]);
        }
        categoryMap.set(`${k.name}:${k.type}`, id);
    }

    // 3. Insert Transactions
    const insertTxn = db.prepare(`
      INSERT OR REPLACE INTO transactions (id, date, description, amount, category_id, account_id, type) 
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);
    
    for (const t of transactions) {
        let accId = t.accountId;
        if (!accId) {
            if (t.account) accId = accountMap.get(t.account) || '';
            if (!accId) accId = accountMap.get('Main Account') || '';
        }

        let catId = t.categoryId;
        if (!catId && t.category) {
            const type = t.type || 'Expense';
            catId = categoryMap.get(`${t.category}:${type}`) || '';
        }
        
        // Handle case where catId might still be empty (Uncategorized fallback?)
        // Schema allows NULL category_id, so empty string might need conversion to null if strict,
        // but current schema checks are loose. We pass null if empty string to be safe for FK.
        const finalCatId = catId || null;

        insertTxn.run([t.id, t.date, t.description, t.amount, finalCatId, accId, t.type]);
    }
    
    insertTxn.free();
    db.run("COMMIT");
  } catch (e) {
    console.error("Insert failed", e);
    db.run("ROLLBACK");
    throw e;
  }

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
    // JOIN to get names for the UI
    const sql = `
      SELECT 
        t.id, t.date, t.description, t.amount, t.type,
        t.category_id, c.name as category_name,
        t.account_id, a.name as account_name
      FROM transactions t
      LEFT JOIN categories c ON t.category_id = c.id
      LEFT JOIN accounts a ON t.account_id = a.id
      ORDER BY t.date DESC
    `;
    const res = db.exec(sql);
    if (res.length === 0) return [];

    const values = res[0].values;
    return values.map((row: any[]) => ({
      id: row[0],
      date: row[1],
      description: row[2],
      amount: row[3],
      type: row[4],
      categoryId: row[5],
      category: row[6] || 'Unknown', // mapped to 'category' for UI compat
      accountId: row[7],
      account: row[8] || 'Unknown'   // mapped to 'account' for UI compat
    } as Transaction));
  } catch (e) {
    console.error("Error fetching transactions", e);
    return [];
  }
};

export const searchTransactions = (filters: SearchFilters): Transaction[] => {
  if (!db) return [];
  
  let sql = `
      SELECT 
        t.id, t.date, t.description, t.amount, t.type,
        t.category_id, c.name as category_name,
        t.account_id, a.name as account_name
      FROM transactions t
      LEFT JOIN categories c ON t.category_id = c.id
      LEFT JOIN accounts a ON t.account_id = a.id
      WHERE 1=1
  `;
  const params: any[] = [];

  if (filters.keyword) {
    sql += " AND t.description LIKE ?";
    params.push(`%${filters.keyword}%`);
  }

  if (filters.category) {
    // Search by name since the filter usually comes from a text dropdown/input in this app context
    // Ideally should be ID, but preserving existing behavior of filtering by Name string
    sql += " AND c.name = ?";
    params.push(filters.category);
  }

  if (filters.account) {
    sql += " AND a.name = ?";
    params.push(filters.account);
  }

  if (filters.type) {
    sql += " AND t.type = ?";
    params.push(filters.type);
  }

  if (filters.startDate) {
    sql += " AND t.date >= ?";
    params.push(filters.startDate);
  }

  if (filters.endDate) {
    sql += " AND t.date <= ?";
    params.push(filters.endDate + 'T23:59:59.999Z');
  }

  if (filters.minAmount) {
     sql += " AND ABS(t.amount) >= ?";
     params.push(parseFloat(filters.minAmount));
  }

  if (filters.maxAmount) {
    sql += " AND ABS(t.amount) <= ?";
    params.push(parseFloat(filters.maxAmount));
  }

  sql += " ORDER BY t.date DESC LIMIT 500";

  try {
    const stmt = db.prepare(sql);
    stmt.bind(params);
    const transactions: Transaction[] = [];
    while (stmt.step()) {
      const row = stmt.get();
      transactions.push({
        id: row[0],
        date: row[1],
        description: row[2],
        amount: row[3],
        type: row[4],
        categoryId: row[5],
        category: row[6] || 'Unknown',
        accountId: row[7],
        account: row[8] || 'Unknown'
      } as Transaction);
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
    return res[0].values.map((row: any[]) => ({ 
      id: row[0], 
      name: row[1],
      isSavings: row[2] === 1 
    }));
  } catch (e) { return []; }
};

export const createAccount = async (name: string, isSavings: boolean) => {
  if (!db) return;
  db.run("INSERT INTO accounts (id, name, is_savings) VALUES (?, ?, ?)", [
    `acc-${Date.now()}`,
    name,
    isSavings ? 1 : 0
  ]);
  await saveDB();
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

export const createCategory = async (name: string, type: string, group: string) => {
  if (!db) return;
  try {
    db.run("INSERT INTO categories (id, name, type, group_name) VALUES (?, ?, ?, ?)", [
      `cat-${Date.now()}-${Math.random()}`,
      name,
      type,
      group
    ]);
    await saveDB();
  } catch(e: any) {
    if(e.message && e.message.includes('UNIQUE')) {
       throw new Error(`Category "${name}" of type "${type}" already exists.`);
    }
    throw e;
  }
};

export const updateCategory = async (id: string, newName: string, newType: string, group: string) => {
  if (!db) return;
  // Simpler now: Just update the category definition. Foreign Keys handle the rest.
  db.run("UPDATE categories SET name = ?, type = ?, group_name = ? WHERE id = ?", [newName, newType, group, id]);
  await saveDB();
};

export const updateAccount = async (id: string, newName: string, isSavings: boolean) => {
  if (!db) return;
  // Simpler now: Just update definition.
  db.run("UPDATE accounts SET name = ?, is_savings = ? WHERE id = ?", [newName, isSavings ? 1 : 0, id]);
  await saveDB();
};

export const deleteCategory = async (id: string): Promise<boolean> => {
  if (!db) return false;
  
  // Check if used
  const countRes = db.exec("SELECT count(*) FROM transactions WHERE category_id = ?", [id]);
  const count = countRes[0].values[0][0];

  if (count > 0) {
    // Get name for error message
    const nameRes = db.exec("SELECT name FROM categories WHERE id = ?", [id]);
    const name = nameRes.length ? nameRes[0].values[0][0] : 'Unknown';
    throw new Error(`Cannot delete category "${name}" because it is used in ${count} transaction(s).`);
  }

  db.run("DELETE FROM categories WHERE id = ?", [id]);
  await saveDB();
  return true;
};

export const deleteAccount = async (id: string): Promise<boolean> => {
  if (!db) return false;

  const countRes = db.exec("SELECT count(*) FROM transactions WHERE account_id = ?", [id]);
  const count = countRes[0].values[0][0];

  if (count > 0) {
     const nameRes = db.exec("SELECT name FROM accounts WHERE id = ?", [id]);
     const name = nameRes.length ? nameRes[0].values[0][0] : 'Unknown';
    throw new Error(`Cannot delete account "${name}" because it contains ${count} transaction(s).`);
  }

  db.run("DELETE FROM accounts WHERE id = ?", [id]);
  await saveDB();
  return true;
};

// --- Configs ---

export const getApiKey = (): string | null => {
  if (!db) return null;
  try {
    const res = db.exec("SELECT value FROM configs WHERE key = 'google_api_key'");
    if (res.length > 0) return res[0].values[0][0];
    return null;
  } catch(e) { return null; }
}

export const saveApiKey = async (key: string) => {
  if (!db) return;
  db.run("INSERT OR REPLACE INTO configs (key, value) VALUES ('google_api_key', ?)", [key]);
  await saveDB();
}

export const getPrivacySetting = (): boolean => {
  if (!db) return true;
  try {
    const res = db.exec("SELECT value FROM configs WHERE key = 'privacy_mode'");
    if (res.length > 0) return res[0].values[0][0] === 'true';
    return true;
  } catch(e) { return true; }
}

export const savePrivacySetting = async (isEnabled: boolean) => {
  if (!db) return;
  db.run("INSERT OR REPLACE INTO configs (key, value) VALUES ('privacy_mode', ?)", [String(isEnabled)]);
  await saveDB();
}

export const saveImportConfig = async (config: { dateFormat?: string, decimalSeparator?: string }) => {
  if (!db) return;
  db.run("BEGIN TRANSACTION");
  if (config.dateFormat !== undefined) {
    db.run("INSERT OR REPLACE INTO configs (key, value) VALUES ('import_date_format', ?)", [config.dateFormat]);
  }
  if (config.decimalSeparator !== undefined) {
    db.run("INSERT OR REPLACE INTO configs (key, value) VALUES ('import_decimal_separator', ?)", [config.decimalSeparator]);
  }
  db.run("COMMIT");
  await saveDB();
}

export const getImportConfig = (): { dateFormat: string, decimalSeparator: string } => {
  if (!db) return { dateFormat: '', decimalSeparator: '.' };
  try {
    const result = { dateFormat: '', decimalSeparator: '.' };
    const dateRes = db.exec("SELECT value FROM configs WHERE key = 'import_date_format'");
    if (dateRes.length > 0) result.dateFormat = dateRes[0].values[0][0] as string;

    const sepRes = db.exec("SELECT value FROM configs WHERE key = 'import_decimal_separator'");
    if (sepRes.length > 0) result.decimalSeparator = sepRes[0].values[0][0] as string;

    return result;
  } catch(e) { return { dateFormat: '', decimalSeparator: '.' }; }
}

export const getFiscalConfig = (): FiscalConfig => {
  if (!db) return { mode: 'calendar' };
  try {
    const res = db.exec("SELECT value FROM configs WHERE key = 'fiscal_month_config'");
    if (res.length > 0) {
      return JSON.parse(res[0].values[0][0] as string);
    }
    return { mode: 'calendar' };
  } catch(e) { return { mode: 'calendar' }; }
}

export const saveFiscalConfig = async (config: FiscalConfig) => {
  if (!db) return;
  db.run("INSERT OR REPLACE INTO configs (key, value) VALUES ('fiscal_month_config', ?)", [JSON.stringify(config)]);
  await saveDB();
}

// --- Savings Goals ---

export const insertSavingsGoal = async (goal: SavingsGoal) => {
  if (!db) return;
  const accountsJson = JSON.stringify(goal.targetAccounts); // Storing IDs now
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
          // Backward compatibility for old DBs with simple string names, though ideally we wipe DB
          accounts = [String(rowObj.targetAccount)]; 
        }
      } catch (e) {
        if (rowObj.targetAccount) accounts = [String(rowObj.targetAccount)];
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