-- Banking System Database Schema (SQLite)
-- Run with: sqlite3 db/bank.db < schema.sql

-- Customers Table (KYC)
CREATE TABLE IF NOT EXISTS customers (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  full_name TEXT NOT NULL,
  national_id TEXT UNIQUE NOT NULL,
  phone TEXT UNIQUE NOT NULL,
  email TEXT UNIQUE,
  address TEXT,
  date_of_birth DATE,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Accounts Table
CREATE TABLE IF NOT EXISTS accounts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  customer_id INTEGER NOT NULL,
  account_type TEXT NOT NULL CHECK(account_type IN ('savings', 'current', 'fixed_deposit', 'business', 'loan')),
  balance REAL DEFAULT 0.0,
  currency TEXT DEFAULT 'TZS',
  status TEXT DEFAULT 'active' CHECK(status IN ('active', 'inactive', 'frozen')),
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (customer_id) REFERENCES customers (id) ON DELETE CASCADE
);

-- Transactions Table (Audit Trail)
CREATE TABLE IF NOT EXISTS transactions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  transaction_ref TEXT UNIQUE NOT NULL,
  sender_account_id INTEGER,
  receiver_account_id INTEGER,
  amount REAL NOT NULL,
  transaction_type TEXT NOT NULL CHECK(transaction_type IN ('deposit', 'withdraw', 'transfer', 'loan_disbursement', 'loan_repayment')),
  description TEXT,
  status TEXT DEFAULT 'completed' CHECK(status IN ('pending', 'completed', 'failed', 'cancelled')),
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (sender_account_id) REFERENCES accounts (id),
  FOREIGN KEY (receiver_account_id) REFERENCES accounts (id)
);

-- Loans Table
CREATE TABLE IF NOT EXISTS loans (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  customer_id INTEGER NOT NULL,
  loan_ref TEXT UNIQUE NOT NULL,
  principal_amount REAL NOT NULL,
  interest_rate REAL NOT NULL,
  term_months INTEGER NOT NULL,
  monthly_payment REAL,
  status TEXT DEFAULT 'pending' CHECK(status IN ('pending', 'approved', 'active', 'repaid', 'defaulted')),
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  approved_at DATETIME,
  FOREIGN KEY (customer_id) REFERENCES customers (id)
);

-- Indexes for Performance
CREATE INDEX IF NOT EXISTS idx_accounts_customer ON accounts(customer_id);
CREATE INDEX IF NOT EXISTS idx_accounts_type ON accounts(account_type);
CREATE INDEX IF NOT EXISTS idx_transactions_date ON transactions(created_at);
CREATE INDEX IF NOT EXISTS idx_transactions_type ON transactions(transaction_type);
CREATE INDEX IF NOT EXISTS idx_loans_status ON loans(status);

-- View: Account Balance Summary
CREATE VIEW IF NOT EXISTS account_summary AS
SELECT 
  a.id,
  a.account_type,
  c.full_name,
  a.balance,
  COUNT(t.id) as transaction_count
FROM accounts a
LEFT JOIN customers c ON a.customer_id = c.id
LEFT JOIN transactions t ON t.sender_account_id = a.id OR t.receiver_account_id = a.id
GROUP BY a.id;

-- Trigger: Update balance on transactions (simplified)
CREATE TRIGGER IF NOT EXISTS update_balance_deposit
AFTER INSERT ON transactions
WHEN NEW.transaction_type = 'deposit' AND NEW.status = 'completed'
BEGIN
  UPDATE accounts SET balance = balance + NEW.amount WHERE id = NEW.receiver_account_id;
END;

CREATE TRIGGER IF NOT EXISTS update_balance_withdraw
AFTER INSERT ON transactions
WHEN NEW.transaction_type = 'withdraw' AND NEW.status = 'completed'
BEGIN
  UPDATE accounts SET balance = balance - NEW.amount WHERE id = NEW.sender_account_id;
END;

-- Trigger: Transfer (double entry)
CREATE TRIGGER IF NOT EXISTS update_balance_transfer
AFTER INSERT ON transactions
WHEN NEW.transaction_type = 'transfer' AND NEW.status = 'completed'
BEGIN
  UPDATE accounts SET balance = balance - NEW.amount WHERE id = NEW.sender_account_id;
  UPDATE accounts SET balance = balance + NEW.amount WHERE id = NEW.receiver_account_id;
END;

.print '✅ Schema created successfully. Tables: customers, accounts, transactions, loans'
.print '✅ Views: account_summary'
.print '✅ Triggers: Auto balance updates for deposit/withdraw/transfer'
