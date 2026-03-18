// Fake OTP Utility (Production: Integrate Twilio/Nexmo SMS)
const OTP_EXPIRY = process.env.OTP_EXPIRY_MINUTES || 2;

class OTPManager {
  constructor() {
    this.activeOTPs = new Map(); // phone -> {otp, expires}
  }

  generateOTP(phone) {
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expires = Date.now() + (OTP_EXPIRY * 60 * 1000);
    
    this.activeOTPs.set(phone, { otp, expires });
    
    // Fake SMS - In production, use Twilio:
    console.log(`📱 SMS Sent to ${phone}: Your OTP is ${otp} (expires in ${OTP_EXPIRY}min)`);
    
    return otp;
  }

  verifyOTP(phone, otp) {
    const record = this.activeOTPs.get(phone);
    if (!record) {
      return { valid: false, error: 'No OTP found' };
    }

    if (Date.now() > record.expires) {
      this.activeOTPs.delete(phone);
      return { valid: false, error: 'OTP expired' };
    }

    if (record.otp !== otp) {
      return { valid: false, error: 'Invalid OTP' };
    }

    // Clear used OTP
    this.activeOTPs.delete(phone);
    return { valid: true };
  }
}

module.exports = new OTPManager();
