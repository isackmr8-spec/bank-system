const express = require('express');
const { body, validationResult } = require('express-validator');
const db = require('../db');
const { authenticateToken } = require('./auth');
const { sendNotification } = require('../utils/notifications'); // Will create this next

const router = express.Router();

// GET /api/bills/types - Available bill types
router.get('/types', authenticateToken, (req, res) => {
  const billTypes = [
    { code: 'TANESCO', name: 'Electricity', description: 'TANESCO Power Bill' },
    { code: 'DAWASCO', name: 'Water', description: 'DAWASCO Water Bill' },
    { code: 'VODACOM', name: 'Airtime', description: 'Vodacom Airtime Topup' },
    { code: 'TIGOPESA', name: 'Mobile Money', description: 'Tigo Pesa Services' }
  ];
  res.json(billTypes);
});

// POST /api/bills/pay - Pay bill from account
router.post('/pay', [
  body('account_id').isInt(),
  body('bill_type').isString(),
  body('provider_ref').isString(),
  body('amount').isFloat({ min: 100 })
], authenticateToken, async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { account_id, bill_type, provider_ref, amount } = req.body;

  try {
    // Verify account belongs to user and has sufficient balance
    const account = await db.getDb().get(
      'SELECT * FROM accounts WHERE id = ? AND customer_id = ? AND status = "active"',
      [account_id, req.user.id]
    );
    if (!account || account.balance < amount) {
      return res.status(400).json({ error: 'Insufficient balance or account not found' });
    }

    // Generate bill reference
    const bill_ref = `BILL${Date.now()}${Math.floor(Math.random() * 1000)}`;

    // Insert bill payment record
    const billResult = await db.getDb().run(
      `INSERT INTO bills (customer_id, account_id, bill_type, provider_ref, amount, bill_ref, status) 
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [req.user.id, account_id, bill_type, provider_ref, amount, bill_ref, 'completed']
    );

    // Create transaction record (triggers balance deduction via trigger)
    await db.getDb().run(
      `INSERT INTO transactions (transaction_ref, sender_account_id, amount, transaction_type, description, status) 
       VALUES (?, ?, ?, ?, ?, ?)`,
      [`BILL${bill_ref}`, account_id, amount, 'withdraw', `Bill payment: ${bill_type} (${provider_ref})`, 'completed']
    );

    // Send notification
    await sendNotification(req.user.email, `Bill Payment Successful`, `Paid ${amount} TZS for ${bill_type} (${provider_ref}). New balance: ${account.balance - amount} TZS`);

    res.json({
      message: 'Bill paid successfully',
      bill_id: billResult.lastID,
      bill_ref,
      new_balance: account.balance - amount
    });
  } catch (error) {
    console.error('Bill payment error:', error);
    res.status(500).json({ error: 'Failed to process bill payment' });
  }
});

// GET /api/bills/history - User bill payment history
router.get('/history', authenticateToken, async (req, res) => {
  try {
    const history = await db.getDb().all(
      `SELECT * FROM bills 
       WHERE customer_id = ? 
       ORDER BY created_at DESC 
       LIMIT 50`,
      [req.user.id]
    );
    res.json(history);
  } catch (error) {
    console.error('Bill history error:', error);
    res.status(500).json({ error: 'Failed to fetch bill history' });
  }
});

module.exports = router;

