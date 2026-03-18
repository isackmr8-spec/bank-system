const express = require('express');
const db = require('../db');
const { authenticateToken } = require('./auth');

const router = express.Router();

// Admin middleware (simplified - in prod, proper role check)
const isAdmin = (req, res, next) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Admin access required' });
  }
  next();
};

// GET /api/admin/reports - Admin dashboard reports
router.get('/reports', [authenticateToken, isAdmin], async (req, res) => {
  try {
    const reports = {
      total_customers: await db.getDb().get('SELECT COUNT(*) as count FROM customers'),
      total_accounts: await db.getDb().get('SELECT COUNT(*) as count FROM accounts'),
      total_balance: await db.getDb().get('SELECT SUM(balance) as total FROM accounts'),
      recent_transactions: await db.getDb().all(
        'SELECT * FROM transactions ORDER BY created_at DESC LIMIT 10'
      ),
      active_loans: await db.getDb().get('SELECT COUNT(*) as count FROM loans WHERE status IN ("active", "pending")'),
      daily_transactions: await db.getDb().all(`
        SELECT DATE(created_at) as date, 
               COUNT(*) as count,
               SUM(CASE WHEN transaction_type = "deposit" THEN amount ELSE 0 END) as deposits,
               SUM(CASE WHEN transaction_type = "withdraw" THEN amount ELSE 0 END) as withdrawals
        FROM transactions 
        GROUP BY DATE(created_at) 
        ORDER BY date DESC 
        LIMIT 7
      `)
    };

    res.json(reports);
  } catch (error) {
    console.error('Admin reports error:', error);
    res.status(500).json({ error: 'Failed to generate reports' });
  }
});

// GET /api/admin/customers - All customers (admin)
router.get('/customers', [authenticateToken, isAdmin], async (req, res) => {
  try {
    const { search, status } = req.query;
    let query = 'SELECT * FROM customers';
    let params = [];

    if (search) {
      query += ' WHERE full_name LIKE ? OR phone LIKE ? OR national_id LIKE ?';
      params = [`%${search}%`, `%${search}%`, `%${search}%`];
    }

    const customers = await db.getDb().all(query, params);
    res.json(customers);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch customers' });
  }
});

// GET /api/admin/stats - Quick stats
router.get('/stats', [authenticateToken, isAdmin], async (req, res) => {
  try {
    const stats = await db.getDb().all(`
      SELECT 
        COUNT(DISTINCT c.id) as total_customers,
        COUNT(a.id) as total_accounts,
        SUM(a.balance) as total_balance,
        COUNT(CASE WHEN a.status = 'active' THEN 1 END) as active_accounts,
        COUNT(t.id) as total_transactions,
        COUNT(CASE WHEN l.status = 'active' THEN 1 END) as active_loans
      FROM customers c
      LEFT JOIN accounts a ON c.id = a.customer_id
      LEFT JOIN transactions t ON 1=1
      LEFT JOIN loans l ON c.id = l.customer_id
    `);

    res.json(stats[0] || {});
  } catch (error) {
    console.error('Admin stats error:', error);
    res.status(500).json({ error: 'Failed to fetch stats' });
  }
});

module.exports = router;
