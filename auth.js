const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { body, validationResult } = require('express-validator');
const db = require('../db');

const router = express.Router();

// Middleware to verify JWT
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Access token required' });
  }

  jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
    if (err) return res.status(403).json({ error: 'Invalid token' });
    req.user = user;
    next();
  });
};

// POST /api/auth/register - Customer registration with KYC
router.post('/register', [
  body('full_name').notEmpty().trim().escape(),
  body('national_id').isLength({ min: 10 }).trim(),
  body('phone').isMobilePhone(),
  body('email').optional().isEmail(),
  body('password').isLength({ min: 8 })
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  try {
    const { full_name, national_id, phone, email, password, address, date_of_birth } = req.body;

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 12);

    // Insert customer
    const result = await db.getDb().run(
      `INSERT INTO customers (full_name, national_id, phone, email, address, date_of_birth, password_hash) 
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [full_name, national_id, phone, email, address, date_of_birth, hashedPassword]
    );

    if (result.changes === 0) {
      return res.status(400).json({ error: 'Customer already exists (check NIDA/Phone)' });
    }

    // Generate fake OTP
    const otp = Math.floor(100000 + Math.random() * 900000);
    console.log(`📱 Fake OTP for ${phone}: ${otp}`); // In prod, send SMS

    res.json({ 
      message: 'Registration successful. OTP sent to phone.',
      customer_id: result.lastID,
      otp_demo: process.env.NODE_ENV === 'development' ? otp : undefined 
    });

  } catch (error) {
    console.error('Register error:', error);
    res.status(500).json({ error: 'Registration failed' });
  }
});

// POST /api/auth/login
router.post('/login', [
  body('phone').notEmpty(),
  body('password').exists()
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  try {
    const { phone, password } = req.body;

    // Find customer
    const customer = await db.getDb().get(
      'SELECT * FROM customers WHERE phone = ?',
      [phone]
    );

    if (!customer || !await bcrypt.compare(password, customer.password_hash)) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Generate JWT
    const token = jwt.sign(
      { id: customer.id, role: 'customer' }, // Default role
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.json({
      message: 'Login successful',
      token,
      user: { id: customer.id, full_name: customer.full_name, phone: customer.phone }
    });

  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Login failed' });
  }
});

// GET /api/auth/profile - Get current user profile
router.get('/profile', authenticateToken, async (req, res) => {
  try {
    const customer = await db.getDb().get(
      'SELECT id, full_name, phone, email, address FROM customers WHERE id = ?',
      [req.user.id]
    );
    res.json(customer);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch profile' });
  }
});

module.exports = router;
