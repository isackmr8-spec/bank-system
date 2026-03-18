const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const { open } = require('sqlite');

class Database {
  constructor() {
    this.db = null;
    this.init();
  }

  async init() {
    const dbPath = path.join(__dirname, '../db/bank.db');
    this.db = await open({
      filename: dbPath,
      driver: sqlite3.Database
    });

    // Create tables matching spec
    await this.createTables();
    await this.seedData();
  }

  async createTables() {
    const queries = [
      `CREATE TABLE IF NOT EXISTS customers (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        full_name TEXT NOT NULL,
        national_id TEXT UNIQUE NOT NULL,
        phone TEXT UNIQUE NOT NULL,
        email TEXT UNIQUE,
        address TEXT,
        date_of_birth DATE,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )`,
      `CREATE TABLE IF NOT EXISTS accounts (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        customer_id INTEGER NOT NULL,
        account_type TEXT NOT NULL CHECK(account_type IN ('savings', 'current', 'fixed_deposit', 'business')),
        balance REAL DEFAULT 0,
        currency TEXT DEFAULT 'TZS',
        status TEXT DEFAULT 'active',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (customer_id) REFERENCES customers (id)
      )`,
      `CREATE TABLE IF NOT EXISTS transactions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        sender_account INTEGER,
        receiver_account INTEGER,
        amount REAL NOT NULL,
        transaction_type TEXT NOT NULL CHECK(transaction_type IN ('deposit', 'withdraw', 'transfer')),
        description TEXT,
        status TEXT DEFAULT 'completed',
        timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (sender_account) REFERENCES accounts (id),
        FOREIGN KEY (receiver_account) REFERENCES accounts (id)
      )`,
      `CREATE TABLE IF NOT EXISTS loans (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        customer_id INTEGER NOT NULL,
        amount REAL NOT NULL,
        interest_rate REAL NOT NULL,
        term_months INTEGER NOT NULL,
        status TEXT DEFAULT 'pending' CHECK(status IN ('pending', 'approved', 'active', 'repaid', 'defaulted')),
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (customer_id) REFERENCES customers (id)
      )`,
      `CREATE TABLE IF NOT EXISTS bills (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        customer_id INTEGER NOT NULL,
        account_id INTEGER NOT NULL,
        bill_type TEXT NOT NULL,
        provider_ref TEXT NOT NULL,
        amount REAL NOT NULL,
        bill_ref TEXT UNIQUE NOT NULL,
        status TEXT DEFAULT 'completed',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (customer_id) REFERENCES customers (id),
        FOREIGN KEY (account_id) REFERENCES accounts (id)
      )`,
      `CREATE TABLE IF NOT EXISTS savings_goals (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        customer_id INTEGER NOT NULL,
        target_amount REAL NOT NULL,
        current_amount REAL DEFAULT 0,
        description TEXT,
        target_date DATE,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (customer_id) REFERENCES customers (id)
      )`
    ];

    for (const query of queries) {
      await this.db.exec(query);
    }
    console.log('✅ Database tables created/verified (incl. bills, savings_goals)');
  }

  async seedData() {
    // ... existing seed code ...
    console.log('✅ Sample data seeded');
  }

  getDb() {
    return this.db;
  }

  async close() {
    if (this.db) {
      await this.db.close();
    }
  }
}

module.exports = new Database();

