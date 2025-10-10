#!/usr/bin/env node

/**
 * Email testing script for debugging VM deployment issues
 * Run this script on your VM to test email connectivity
 */

const nodemailer = require('nodemailer');

// Test configuration - matches your .env
const testConfig = {
  host: process.env.SMTP_HOST || 'smtp.gmail.com',
  port: parseInt(process.env.SMTP_PORT || '587'),
  secure: process.env.SMTP_SECURE === 'true',
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASSWORD?.replace(/^['"`](.*)['"`]$/u, '$1').replace(/\s+/g, ''),
  },
  debug: true,
  logger: true,
};

async function testEmailConnection() {
  console.log('🧪 Testing email configuration...');
  console.log('Configuration:', {
    ...testConfig,
    auth: {
      user: testConfig.auth.user,
      pass: testConfig.auth.pass ? '[REDACTED]' : 'NOT_SET',
    },
  });

  if (!testConfig.auth.user || !testConfig.auth.pass) {
    console.error('❌ SMTP credentials missing!');
    console.log('Make sure these environment variables are set:');
    console.log('- SMTP_USER');
    console.log('- SMTP_PASSWORD');
    process.exit(1);
  }

  try {
    console.log('\n📡 Creating transporter...');
    const transporter = nodemailer.createTransporter(testConfig);

    console.log('\n🔍 Verifying SMTP connection...');
    await transporter.verify();
    console.log('✅ SMTP connection verified successfully!');

    console.log('\n📧 Sending test email...');
    const testEmail = {
      from: testConfig.auth.user,
      to: testConfig.auth.user, // Send to yourself for testing
      subject: `Test Email from VM - ${new Date().toISOString()}`,
      text: `This is a test email sent from your VM deployment.
      
Environment: ${process.env.NODE_ENV || 'development'}
Timestamp: ${new Date().toISOString()}
Host: ${process.env.HOSTNAME || 'unknown'}

If you receive this email, your email configuration is working correctly!`,
    };

    const info = await transporter.sendMail(testEmail);
    console.log('✅ Test email sent successfully!');
    console.log('Message ID:', info.messageId);
    console.log('Response:', info.response);

  } catch (error) {
    console.error('❌ Email test failed:');
    console.error('Error:', error.message);
    
    // Provide specific troubleshooting hints
    if (error.message.includes('ENOTFOUND')) {
      console.log('\n💡 DNS Resolution Error:');
      console.log('- Check if your VM can resolve smtp.gmail.com');
      console.log('- Run: nslookup smtp.gmail.com');
    }
    
    if (error.message.includes('ECONNREFUSED')) {
      console.log('\n💡 Connection Refused:');
      console.log('- Check if port 587 is blocked by firewall');
      console.log('- Try: telnet smtp.gmail.com 587');
    }
    
    if (error.message.includes('Invalid login')) {
      console.log('\n💡 Authentication Error:');
      console.log('- Verify your Gmail app password is correct');
      console.log('- Check if 2FA is enabled and app password is generated');
      console.log('- Ensure no quotes or spaces in password');
    }
    
    if (error.message.includes('self signed certificate')) {
      console.log('\n💡 SSL Certificate Error:');
      console.log('- Add SMTP_TLS_REJECT_UNAUTHORIZED=false to .env (for testing only)');
    }
    
    process.exit(1);
  }
}

// Network connectivity tests
async function testNetworkConnectivity() {
  console.log('\n🌐 Testing network connectivity...');
  
  const { spawn } = require('child_process');
  
  // Test DNS resolution
  return new Promise((resolve) => {
    const nslookup = spawn('nslookup', ['smtp.gmail.com']);
    
    nslookup.stdout.on('data', (data) => {
      console.log('✅ DNS Resolution successful:');
      console.log(data.toString());
    });
    
    nslookup.stderr.on('data', (data) => {
      console.error('❌ DNS Resolution failed:');
      console.error(data.toString());
    });
    
    nslookup.on('close', (code) => {
      console.log(`DNS lookup exit code: ${code}`);
      resolve();
    });
  });
}

async function main() {
  console.log('🚀 Starting email connectivity test...\n');
  
  // Test network first
  await testNetworkConnectivity();
  
  // Test email configuration
  await testEmailConnection();
  
  console.log('\n🎉 All tests completed!');
}

if (require.main === module) {
  main().catch((error) => {
    console.error('💥 Test script failed:', error);
    process.exit(1);
  });
}