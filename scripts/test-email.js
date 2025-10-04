/**
 * Test Email Functionality
 * 
 * This script tests the Nodemailer email service functionality.
 * Make sure to set up your environment variables before running.
 * 
 * Usage: node scripts/test-email.js
 */

const nodemailer = require('nodemailer');
require('dotenv').config();

async function testEmailConnection() {
  console.log('🧪 Testing Email Configuration...\n');

  // Configuration from environment variables
  const config = {
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.SMTP_PORT) || 587,
    secure: process.env.SMTP_SECURE === 'true',
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASSWORD,
    },
  };

  console.log('📋 Configuration:');
  console.log(`  Host: ${config.host}`);
  console.log(`  Port: ${config.port}`);
  console.log(`  Secure: ${config.secure}`);
  console.log(`  User: ${config.auth.user ? config.auth.user : '❌ Not set'}`);
  console.log(`  Password: ${config.auth.pass ? '✅ Set' : '❌ Not set'}\n`);

  if (!config.auth.user || !config.auth.pass) {
    console.log('❌ SMTP credentials not configured. Please set SMTP_USER and SMTP_PASSWORD environment variables.');
    process.exit(1);
  }

  try {
    // Create transporter
    const transporter = nodemailer.createTransport(config);

    // Verify connection
    console.log('🔗 Verifying SMTP connection...');
    await transporter.verify();
    console.log('✅ SMTP connection verified successfully!\n');

    // Send test email
    console.log('📧 Sending test email...');
    const testEmail = {
      from: {
        name: process.env.SMTP_FROM_NAME || 'DeeDee Trading',
        address: process.env.SMTP_FROM_EMAIL || config.auth.user,
      },
      to: config.auth.user, // Send to self for testing
      subject: 'Test Email - DeeDee Trading Backend',
      html: `
        <h1>🎉 Email Test Successful!</h1>
        <p>This is a test email from the DeeDee Trading backend.</p>
        <p><strong>Configuration Details:</strong></p>
        <ul>
          <li>SMTP Host: ${config.host}</li>
          <li>SMTP Port: ${config.port}</li>
          <li>Secure: ${config.secure}</li>
          <li>Timestamp: ${new Date().toISOString()}</li>
        </ul>
        <p>If you received this email, your SMTP configuration is working correctly! 🚀</p>
      `,
      text: `
        Email Test Successful!
        
        This is a test email from the DeeDee Trading backend.
        
        Configuration Details:
        - SMTP Host: ${config.host}
        - SMTP Port: ${config.port}
        - Secure: ${config.secure}
        - Timestamp: ${new Date().toISOString()}
        
        If you received this email, your SMTP configuration is working correctly!
      `,
    };

    const info = await transporter.sendMail(testEmail);
    console.log(`✅ Test email sent successfully!`);
    console.log(`📬 Message ID: ${info.messageId}`);
    console.log(`📧 Email sent to: ${testEmail.to}\n`);

    console.log('🎉 Email service is ready for production use!');

  } catch (error) {
    console.error('❌ Email test failed:', error.message);
    console.log('\n🔧 Troubleshooting tips:');
    console.log('1. Check your SMTP credentials');
    console.log('2. Ensure "Less secure app access" is enabled (for Gmail)');
    console.log('3. Use App Passwords instead of your regular password (for Gmail)');
    console.log('4. Check firewall settings');
    console.log('5. Verify SMTP host and port settings');
    process.exit(1);
  }
}

// Run the test
testEmailConnection();