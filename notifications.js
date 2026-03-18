const nodemailer = require('nodemailer');
require('dotenv').config();

class Notifications {
  constructor() {
    this.transporter = nodemailer.createTransporter({
      host: process.env.SMTP_HOST || 'smtp.ethereal.email', // Use Ethereal for testing
      port: 587,
      secure: false,
      auth: {
        user: process.env.SMTP_USER || 'testuser@example.com',
        pass: process.env.SMTP_PASS || 'testpass'
      }
    });
  }

  async sendEmail(to, subject, html) {
    try {
      const mailOptions = {
        from: '"CRDB Bank" <noreply@crdb.bank>',
        to,
        subject,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #1e40af;">CRDB Bank Notification</h2>
            <p>${html}</p>
            <hr>
            <p style="color: #666; font-size: 12px;">This is an automated message from CRDB Bank. Do not reply.</p>
          </div>
        `
      };

      await this.transporter.sendMail(mailOptions);
      console.log(`✅ Email sent to ${to}: ${subject}`);
      return true;
    } catch (error) {
      console.error('Email send failed:', error);
      return false;
    }
  }

  async sendNotification(email, subject, message) {
    if (!email) return false;
    return await this.sendEmail(email, subject, message);
  }

  // Hook example: Low balance alert
  async checkLowBalance(customerId, accountBalance, threshold = 500) {
    if (accountBalance < threshold) {
      const customer = await require('../db').getDb().get('SELECT email, full_name FROM customers WHERE id = ?', [customerId]);
      if (customer && customer.email) {
        await this.sendNotification(
          customer.email,
          'Low Balance Alert',
          `Dear ${customer.full_name}, your account balance is ${accountBalance} TZS (below ${threshold} TZS threshold). Please top up.`
        );
      }
    }
  }
}

module.exports = new Notifications();

