const express = require('express');
const { body, validationResult } = require('express-validator');
const db = require('../db');
const { authenticateToken } = require('./auth');
const notifications = require('../utils/notifications');

const router = express.Router();

// POST /api/savings/deposit - Fixed savings deposit (interest-bearing)
router.post('/deposit', [
  body('account_id').isInt(),
  body('amount').isFloat({ min: 10000 }) // Min 10k for savings
], authenticateToken, async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

  const { account_id, amount } = req.body;

  try {
    // Verify savings account
    const account = await db.getDb().get(
      'SELECT * FROM accounts WHERE id = ? AND customer_id = ? AND account_type = "savings"',
      [account_id, req.user.id]
    );
    if (!account) return res.status(400).json({ error: 'Valid savings account required' });

    const txRef = `SAVDEP${Date.now()}`;
    await db.getDb().run(
      'INSERT INTO transactions (transaction_ref, receiver_account_id, amount, transaction_type, description, status) VALUES (?, ?, ?, ?, ?, ?)',
      [txRef, account_id, amount, 'deposit', 'Savings deposit + 2.5% interest', 'completed']
    );

    // Bonus interest for large deposits
    if (amount > 50000) {
      const interest = amount * 0.025;
      await db.getDb().run(
        'INSERT INTO transactions (transaction_ref, receiver_account_id, amount, transaction_type, description, status) VALUES (?, ?, ?, ?, ?, ?)',
        [`INT${Date.now()}`, account_id, interest, 'deposit', `Interest bonus 2.5% on ${amount}`, 'completed']
      );
      notifications.sendNotification(req.user.email || '', 'Savings Bonus!', `Earned ${interest.toFixed(0)} TZS interest on your ${amount} deposit!`);
    }

    res.json({ message: 'Savings deposit successful', bonus_interest: amount > 50000 ? (amount * 0.025).toFixed(2) : 0 });
  } catch (error) {
    console.error('Savings deposit error:', error);
    res.status(500).json({ error: 'Deposit failed' });
  }
});

// GET /api/savings/interest - Projected interest calculator
router.get('/interest', authenticateToken, async (req, res) => {
  const { principal, months, rate = 5 } = req.query; // Annual rate %
  const monthlyRate = (parseFloat(rate) / 100) / 12;
  const principalAmt = parseFloat(principal);
  const periods = parseInt(months);

  const futureValue = principalAmt * Math.pow(1 + monthlyRate, periods);
  const interestEarned = futureValue - principalAmt;

  res.json({
    principal,
    rate: `${rate}%`,
    months,
    projected_balance: futureValue.toFixed(2),
    interest_earned: interestEarned.toFixed(2),
    monthly_equiv: (interestEarned / periods).toFixed(2)
  });
});

// POST /api/savings/goal - Set savings goal (tracking)
router.post('/goal', authenticateToken, async (req, res) => {
  const { target_amount, description, target_date } = req.body;

  try {
    await db.getDb().run(
      'INSERT INTO savings_goals (customer_id, target_amount, current_amount, description, target_date, created_at) VALUES (?, ?, 0, ?, ?, CURRENT_TIMESTAMP)',
      [req.user.id, target_amount, description || 'Savings goal', target_date]
    );
    res.json({ message: 'Savings goal set successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to set goal' });
  }
});

module.exports = router;

