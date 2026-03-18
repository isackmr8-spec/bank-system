const express = require('express');
const { body, validationResult } = require('express-validator');
const db = require('../db');
const { authenticateToken } = require('./auth');

const router = express.Router();

// GET /api/accounts - Get user accounts
router.get('/', authenticateToken, async (req, res) => {
  try {
    const accounts = await db.getDb().all(
      `SELECT a.*, c.full_name 
       FROM accounts a 
       JOIN customers c ON a.customer_id = c.id 
       WHERE c.id = ? 
       ORDER BY a.created_at DESC`,
      [req.user.id]
    );
    res.json(accounts);
  } catch (error) {
    console.error('Accounts fetch error:', error);
    res.status(500).json({ error: 'Failed to fetch accounts' });
  }
});

// POST /api/accounts - Create new account
router.post('/', [
  body('account_type').isIn(['savings', 'current', 'fixed_deposit', 'business']),
  body('initial_balance').optional().isFloat({ min: 0 })
], authenticateToken, async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  try {
    const { account_type, initial_balance = 0 } = req.body;

    const result = await db.getDb().run(
      'INSERT INTO accounts (customer_id, account_type, balance) VALUES (?, ?, ?)',
      [req.user.id, account_type, parseFloat(initial_balance)]
    );

    const newAccount = await db.getDb().get(
      'SELECT * FROM accounts WHERE id = ?',
      [result.lastID]
    );

    res.status(201).json({
      message: 'Account created successfully',
      account: newAccount
    });
  } catch (error) {
    console.error('Account creation error:', error);
    res.status(500).json({ error: 'Failed to create account' });
  }
});

// GET /api/accounts/:id/balance - Get specific account balance
router.get('/:id/balance', authenticateToken, async (req, res) => {
  try {
    const account = await db.getDb().get(
      'SELECT balance FROM accounts WHERE id = ? AND customer_id = ?',
      [req.params.id, req.user.id]
    );

    if (!account) {
      return res.status(404).json({ error: 'Account not found' });
    }

    res.json({ balance: account.balance });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch balance' });
  }
});

// PUT /api/accounts/:id/deposit - Deposit money (admin/teller only)
router.put('/:id/deposit', authenticateToken, async (req, res) => {
  // TODO: Add role check for teller/admin
  const { amount } = req.body;

  if (!amount || amount <= 0) {
    return res.status(400).json({ error: 'Invalid amount' });
  }

  try {
    // Create deposit transaction (triggers balance update)
    const txResult = await db.getDb().run(
      'INSERT INTO transactions (transaction_ref, receiver_account_id, amount, transaction_type, description, status) VALUES (?, ?, ?, ?, ?, ?)',
      [`DEP${Date.now()}`, req.params.id, amount, 'deposit', 'Cash deposit', 'completed']
    );

    // Notify on large deposits
    if (amount > 10000) {
      const account = await db.getDb().get('SELECT customer_id FROM accounts WHERE id = ?', [req.params.id]);
      if (account) {
        const customer = await db.getDb().get('SELECT email FROM customers WHERE id = ?', [account.customer_id]);
        if (customer && customer.email) {
          require('../utils/notifications').sendNotification(customer.email, 'Large Deposit Alert', `Received ${amount} TZS deposit.`);
        }
      }
    }

    res.json({
      message: 'Deposit successful',
      transaction_id: txResult.lastID,
      amount
    });
  } catch (error) {
    console.error('Deposit error:', error);
    res.status(500).json({ error: 'Deposit failed' });
  }
});

// GET /api/accounts/:id/statement - Account statement (new feature)
router.get('/:id/statement', authenticateToken, async (req, res) => {
  try {
    const { from, to, limit = 100 } = req.query;
    const whereClause = 'WHERE (t.sender_account = ? OR t.receiver_account = ?) AND customer_id = ?';
    const params = [req.params.id, req.params.id, req.user.id];

    let query = `
      SELECT t.*, 
             CASE 
               WHEN t.sender_account = ? THEN 'Debit' 
               WHEN t.receiver_account = ? THEN 'Credit'
             END as type
      FROM transactions t
      JOIN accounts a ON t.sender_account = a.id OR t.receiver_account = a.id
    `;

    if (from && to) {
      whereClause += ' AND t.timestamp BETWEEN ? AND ?';
      params.push(from, to);
      query += ` ${whereClause} ORDER BY t.timestamp DESC LIMIT ?`;
      params.push(parseInt(limit));
    } else {
      query += ` ${whereClause} ORDER BY t.timestamp DESC LIMIT ?`;
      params.push(parseInt(limit));
    }

    const statement = await db.getDb().all(query, params);

    const account = await db.getDb().get('SELECT balance FROM accounts WHERE id = ? AND customer_id = ?', [req.params.id, req.user.id]);
    if (!account) {
      return res.status(404).json({ error: 'Account not found' });
    }

    res.json({
      account_id: req.params.id,
      period: from && to ? `${from} to ${to}` : 'Recent',
      balance: account.balance,
      transactions: statement
    });
  } catch (error) {
    console.error('Statement error:', error);
    res.status(500).json({ error: 'Failed to generate statement' });
  }
});

module.exports = router;

