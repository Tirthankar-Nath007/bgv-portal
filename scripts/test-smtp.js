/**
 * SMTP Test Script
 * Run this on your server to verify SMTP configuration
 * 
 * Usage: node scripts/test-smtp.js
 * Make sure .env.local is configured with SMTP credentials
 */

require('dotenv').config({ path: '../.env.local' });

const nodemailer = require('nodemailer');

const SMTP_HOST = process.env.SMTP_HOST;
const SMTP_PORT = parseInt(process.env.SMTP_PORT || '25');
const FROM_EMAIL = process.env.SMTP_FROM_EMAIL;
const ADMIN_EMAIL = process.env.ADMIN_EMAIL;

async function testSMTP() {
  console.log('📧 Testing SMTP Configuration...');
  console.log('Host:', SMTP_HOST);
  console.log('Port:', SMTP_PORT);
  console.log('From:', FROM_EMAIL);
  console.log('To:', ADMIN_EMAIL);
  console.log('');

  if (!SMTP_HOST || !FROM_EMAIL || !ADMIN_EMAIL) {
    console.error('❌ Missing required environment variables:');
    console.error('   SMTP_HOST, SMTP_FROM_EMAIL, ADMIN_EMAIL');
    console.error('   Please check your .env.local file');
    process.exit(1);
  }

  const transporter = nodemailer.createTransport({
    host: SMTP_HOST,
    port: SMTP_PORT,
    secure: false,
    tls: {
      rejectUnauthorized: false
    }
  });

  try {
    // Verify connection
    console.log('🔄 Verifying SMTP connection...');
    await transporter.verify();
    console.log('✅ SMTP connection successful\n');

    // Send test mail
    console.log('📤 Sending test email...');
    const info = await transporter.sendMail({
      from: FROM_EMAIL,
      to: ADMIN_EMAIL,
      subject: 'SMTP Test Email - BGV Portal',
      text: 'This is a test email to validate SMTP configuration for BGV Portal.',
      html: '<b>This is a test email to validate SMTP configuration for BGV Portal.</b>'
    });

    console.log('✅ Email sent successfully');
    console.log('Message ID:', info.messageId);
    console.log('Response:', info.response);
  } catch (error) {
    console.error('❌ SMTP test failed');
    console.error('Error:', error.message);
    process.exit(1);
  }
}

testSMTP();
