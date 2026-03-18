const express = require('express');
const { body, validationResult } = require('express-validator');
const db = require('../db');
const { authenticateToken } = require('./auth');

const router = express.Router();

// GET /api/loans - Get user loans
router.get('/', authenticateToken, async (req, res) => {
  try {
    const loans = await db.getDb().all(
      `SELECT l.*, c.full_name 
       FROM loans l 
       JOIN customers c ON l.customer_id = c.id 
       WHERE c.id = ?
       ORDER BY l.created_at DESC`,
      [req.user.id]
    );
    res.json(loans);
  } catch (error) {
    console.error('Loans fetch error:', error);
    res.status(500).json({ error: 'Failed to fetch loans' });
  }
});

// POST /api/loans/apply - Apply for loan
router.post('/apply', [
  body('principal_amount').isFloat({ min: 1000 }),
  body('interest_rate').isFloat({ min: 0, max: 25 }),
  body('term_months').isInt({ min: 1, max: 360 }),
  body('purpose').isLength({ min: 10 }).trim().escape()
], authenticateToken, async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { principal_amount, interest_rate, term_months, purpose } = req.body;

  try {
    const loanRef = `LN${Date.now()}`;
    const monthlyPayment = (principal_amount * (interest_rate/100/12) * Math.pow(1 + (interest_rate/100/12), term_months)) /
                          (Math.pow(1 + (interest_rate/100/12), term_months) - 1);

    const result = await db.getDb().run(
      `INSERT INTO loans (loan_ref, customer_id, principal_amount, interest_rate, term_months, monthly_payment, purpose) 
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [loanRef, req.user.id, principal_amount, interest_rate, term_months, monthlyPayment, purpose]
    );

    res.status(201).json({
      message: 'Loan application submitted',
      loan_ref: loanRef,
      estimated_monthly_payment: monthlyPayment.toFixed(2)
    });
  } catch (error) {
    console.error('Loan application error:', error);
    res.status(500).json({ error: 'Failed to apply for loan' });
  }
});

// PUT /api/loans/:id/approve - Approve loan (admin only)
router.put('/:id/approve', authenticateToken, async (req, res) => {
  // TODO: Admin role check
  try {
    const result = await db.getDb().run(
      'UPDATE loans SET status = "approved", approved_at = CURRENT_TIMESTAMP WHERE id = ? AND status = "pending"',
      [req.params.id]
    );

    if (result.changes === 0) {
      return res.status(400).json({ error: 'Loan not found or already processed' });
    }

    // Disburse loan to customer account (find first account)
    const customerAccount = await db.getDb().get(
      'SELECT id FROM accounts WHERE customer_id = (SELECT customer_id FROM loans WHERE id = ?) LIMIT 1',
      [req.params.id]
    );

    if (customerAccount) {
      const loan = await db.getDb().get('SELECT principal_amount FROM loans WHERE id = ?', [req.params.id]);
      await db.getDb().run(
        'INSERT INTO transactions (transaction_ref, receiver_account_id, amount, transaction_type, description, status) VALUES (?, ?, ?, ?, ?, ?)',
        [`LOAN${req.params.id}`, customerAccount.id, loan.principal_amount, 'loan_disbursement', 'Loan disbursement', 'completed']
      );
    }

    res.json({ message: 'Loan approved and disbursed' });
  } catch (error) {
    console.error('Loan approval error:', error);
    res.status(500).json({ error: 'Failed to approve loan' });
  }
});

module.exports = router;
