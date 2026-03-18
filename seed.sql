-- Sample Data for Banking System Demo
-- Run with: sqlite3 db/bank.db < seed.sql

-- Insert Customers (KYC Data)
INSERT OR IGNORE INTO customers (full_name, national_id, phone, email, address, date_of_birth) VALUES
('John Doe', 'NIDA123456789012', '+255712345678', 'john.doe@email.com', '123 Mtaa wa Benki, Dar es Salaam', '1985-03-15'),
('Jane Smith', 'NIDA987654321098', '+255723456789', 'jane.smith@email.com', '456 Arusha Road, Arusha', '1990-07-22'),
('ABC Corporation Ltd', 'BNK123456789', '+255734567890', 'info@abccorp.co.tz', '789 Kariakoo, Dar es Salaam', NULL),
('Michael Johnson', 'NIDA456789123456', '+255745678901', 'mike.johnson@email.com', '321 Mwanza City, Mwanza', '1992-11-08'),
('Sarah Williams', 'NIDA789123456789', '+255756789012', 'sarah.w@email.com', '654 Dodoma Ave, Dodoma', '1988-04-30');

-- Insert Accounts
INSERT OR IGNORE INTO accounts (customer_id, account_type, balance, currency) VALUES
((SELECT id FROM customers WHERE national_id='NIDA123456789012'), 'savings', 15000.00, 'TZS'),
((SELECT id FROM customers WHERE national_id='NIDA123456789012'), 'current', 2500.50, 'TZS'),
((SELECT id FROM customers WHERE national_id='NIDA987654321098'), 'current', 5200.75, 'TZS'),
((SELECT id FROM customers WHERE national_id='BNK123456789'), 'business', 45000.00, 'TZS'),
((SELECT id FROM customers WHERE national_id='NIDA456789123456'), 'savings', 3200.25, 'TZS'),
((SELECT id FROM customers WHERE national_id='NIDA789123456789'), 'fixed_deposit', 10000.00, 'TZS');

-- Insert Sample Transactions
INSERT OR IGNORE INTO transactions (transaction_ref, sender_account_id, receiver_account_id, amount, transaction_type, description, status) VALUES
('TX202403181001', NULL, 1, 5000.00, 'deposit', 'Salary deposit March 2024', 'completed'),
('TX202403181002', 1, NULL, 2000.00, 'withdraw', 'ATM withdrawal - Kariakoo Branch', 'completed'),
('TX202403172001', 2, 3, 1000.00, 'transfer', 'Family transfer', 'completed'),
('TX202403162001', NULL, 4, 25000.00, 'deposit', 'Business deposit', 'completed'),
('TX202403152001', 3, NULL, 300.00, 'withdraw', 'Cash withdrawal', 'pending');

-- Insert Sample Loans
INSERT OR IGNORE INTO loans (loan_ref, customer_id, principal_amount, interest_rate, term_months, status, monthly_payment) VALUES
('LN20240318001', (SELECT id FROM customers WHERE national_id='NIDA123456789012'), 50000.00, 8.5, 24, 'active', 2350.50),
('LN20240317001', (SELECT id FROM customers WHERE national_id='NIDA987654321098'), 25000.00, 9.2, 12, 'approved', 2250.75),
('LN20240316001', (SELECT id FROM customers WHERE national_id='BNK123456789'), 200000.00, 7.8, 60, 'pending', NULL);

.print '✅ Seed data inserted:'
.print '   Customers: 6'
.print '   Accounts: 6'
.print '   Transactions: 5'
.print '   Loans: 3'
.print ''
.print '💡 Demo Accounts:'
.print '   Savings (ID1): TZS 15,000'
.print '   Current (ID2): TZS 2,500.50'
.print '   Current (ID3): TZS 5,200.75'
.print '   Business (ID4): TZS 45,000'
