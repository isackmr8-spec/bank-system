const express = require('express');
const { body, validationResult } = require('express-validator');
const db = require('../db');
const { authenticateToken } = require('./auth');

const router = express.Router();

// GET /api/transactions - Get recent transactions for user
router.get('/', authenticateToken, async (req, res) => {
  try {
    const { limit = 10, type, status } = req.query;
    
    let query = `
      SELECT t.*, 
             sa.account_type as sender_type, 
             ra.account_type as receiver_type
      FROM transactions t
      LEFT JOIN accounts sa ON t.sender_account_id = sa.id
      LEFT JOIN accounts ra ON t.receiver_account_id = ra.id
      WHERE sa.customer_id = ? OR ra.customer_id = ?
      ORDER BY t.created_at DESC
      LIMIT ?
    `;
    let params = [req.user.id, req.user.id, parseInt(limit)];

    // Filter by type/status if provided
    if (type) {
      query += ' AND t.transaction_type = ?';
      params.push(type);
    }
    if (status) {
      query += ' AND t.status = ?';
      params.push(status);
    }

    const transactions = await db.getDb().all(query, params);
    res.json(transactions);
  } catch (error) {
    console.error('Transactions fetch error:', error);
    res.status(500).json({ error: 'Failed to fetch transactions' });
  }
});

// POST /api/transactions/transfer - Transfer between accounts
router.post('/transfer', [
  body('to_account_id').isInt(),
  body('amount').isFloat({ min: 0.01 }),
  body('description').optional().trim().escape()
], authenticateToken, async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { to_account_id, amount, description } = req.body;

  try {
    // Verify sender account belongs to user
    const senderAccount = await db.getDb().get(
      'SELECT * FROM accounts WHERE customer_id = ?',
      [req.user.id]
    );
    if (!senderAccount || parseFloat(senderAccount.balance) < parseFloat(amount)) {
      return res.status(400).json({ error: 'Insufficient balance' });
    }

    // Generate transaction ref
    const txRef = `TXF${Date.now()}`;

    // Create transfer transaction (triggers balance updates via triggers)
    await db.getDb().run(
      'INSERT INTO transactions (transaction_ref, sender_account_id, receiver_account_id, amount, transaction_type, description, status) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [txRef, senderAccount.id, to_account_id, amount, 'transfer', description || 'Account transfer', 'completed']
    );

    res.json({ 
      message: 'Transfer successful', 
      transaction_ref: txRef, 
      amount: parseFloat(amount) 
    });

  } catch (error) {
    console.error('Transfer error:', error);
    res.status(500).json({ error: 'Transfer failed' });
  }
});

// POST /api/transactions/deposit - Deposit (teller/admin)
router.post('/deposit', authenticateToken, async (req, res) => {
  const { account_id, amount, description } = req.body;

  if (!account_id || !amount || amount <= 0) {
    return res.status(400).json({ error: 'Invalid deposit data' });
  }

  try {
    const txRef = `DEPT${Date.now()}`;
    await db.getDb().run(
      'INSERT INTO transactions (transaction_ref, receiver_account_id, amount, transaction_type, description, status) VALUES (?, ?, ?, ?, ?, ?)',
      [txRef, account_id, amount, 'deposit', description || 'Cash deposit', 'completed']
    );

    res.json({ message: 'Deposit successful', transaction_ref: txRef });
  } catch (error) {
    console.error('Deposit error:', error);
    res.status(500).json({ error: 'Deposit failed' });
  }
});

module.exports = router;
