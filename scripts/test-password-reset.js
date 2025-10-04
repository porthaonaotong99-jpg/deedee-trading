/**
 * Test script for password reset functionality
 * Run with: node scripts/test-password-reset.js
 */

const API_BASE = 'http://localhost:3000';

async function testPasswordReset() {
  console.log('🧪 Testing Password Reset Functionality\n');

  // Test 1: Forgot password with OTP
  console.log('1. Testing forgot password with OTP...');
  try {
    const response = await fetch(`${API_BASE}/customers/forgot-password`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: 'test@example.com',
        method: 'email_otp'
      }),
    });

    const result = await response.json();
    console.log('✅ Forgot password OTP:', result);
  } catch (error) {
    console.log('❌ Forgot password OTP failed:', error.message);
  }

  // Test 2: Forgot password with link
  console.log('\n2. Testing forgot password with link...');
  try {
    const response = await fetch(`${API_BASE}/customers/forgot-password`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: 'test@example.com',
        method: 'email_link'
      }),
    });

    const result = await response.json();
    console.log('✅ Forgot password link:', result);
  } catch (error) {
    console.log('❌ Forgot password link failed:', error.message);
  }

  // Test 3: Profile endpoint
  console.log('\n3. Testing profile endpoint (requires customer token)...');
  console.log('ℹ️  This test requires a valid customer JWT token');

  // Test 4: Rate limiting
  console.log('\n4. Testing rate limiting...');
  console.log('ℹ️  Making multiple requests to test rate limiting');
  
  for (let i = 0; i < 4; i++) {
    try {
      const response = await fetch(`${API_BASE}/customers/forgot-password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: 'ratelimit@example.com',
          method: 'email_otp'
        }),
      });

      const result = await response.json();
      console.log(`   Request ${i + 1}:`, response.status, result.message || result.error);
    } catch (error) {
      console.log(`   Request ${i + 1} failed:`, error.message);
    }
  }

  console.log('\n🏁 Test completed!');
  console.log('\nNotes:');
  console.log('- Check server logs for mock email outputs');
  console.log('- Rate limiting should block after 3 requests per hour');
  console.log('- All responses should be consistent for security');
}

// Only run if this file is executed directly
if (require.main === module) {
  testPasswordReset().catch(console.error);
}

module.exports = { testPasswordReset };