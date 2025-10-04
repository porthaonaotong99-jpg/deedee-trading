/**
 * Test Customer Registration with Auto Premium Stock Picks
 * 
 * This script tests the fixed customer registration flow to ensure
 * premium_stock_picks service is automatically applied without KYC errors.
 */

const API_BASE = 'http://localhost:3000/api/v1';

async function testCustomerRegistration() {
  console.log('🧪 Testing Customer Registration with Auto Premium Stock Picks...\n');

  const testCustomer = {
    username: `testuser_${Date.now()}`,
    email: `test_${Date.now()}@example.com`,
    password: 'SecurePass123!',
    first_name: 'John',
    last_name: 'Doe',
  };

  try {
    console.log('📝 Registering new customer...');
    console.log(`Username: ${testCustomer.username}`);
    console.log(`Email: ${testCustomer.email}\n`);

    const response = await fetch(`${API_BASE}/auth/customer/register`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(testCustomer),
    });

    const responseData = await response.json();

    if (!response.ok) {
      console.error('❌ Registration failed:');
      console.error(JSON.stringify(responseData, null, 2));
      return;
    }

    console.log('✅ Customer registered successfully!');
    console.log(`Customer ID: ${responseData.data.id}`);
    console.log(`Wallet ID: ${responseData.data.wallet_id}\n`);

    // Test login to get token for service check
    console.log('🔐 Testing customer login...');
    const loginResponse = await fetch(`${API_BASE}/auth/customer/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: testCustomer.email,
        password: testCustomer.password,
      }),
    });

    const loginData = await loginResponse.json();

    if (!loginResponse.ok) {
      console.error('❌ Login failed:');
      console.error(JSON.stringify(loginData, null, 2));
      return;
    }

    console.log('✅ Login successful!');
    console.log(`Access Token: ${loginData.data.access_token.substring(0, 20)}...\n`);

    // Check if premium_stock_picks service was auto-applied
    console.log('🔍 Checking customer services...');
    const servicesResponse = await fetch(`${API_BASE}/customers/services/list`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${loginData.data.access_token}`,
        'Content-Type': 'application/json',
      },
    });

    const servicesData = await servicesResponse.json();

    if (!servicesResponse.ok) {
      console.error('❌ Failed to fetch services:');
      console.error(JSON.stringify(servicesData, null, 2));
      return;
    }

    console.log('✅ Customer services retrieved successfully!');
    console.log('Services:');
    servicesData.data.forEach((service, index) => {
      console.log(`  ${index + 1}. Service: ${service.service_type}`);
      console.log(`     Active: ${service.active}`);
      console.log(`     Applied: ${service.applied_at}`);
      console.log(`     Payment Required: ${service.requires_payment || false}`);
      console.log('');
    });

    // Check if premium_stock_picks exists and is active
    const premiumStockPicks = servicesData.data.find(
      service => service.service_type === 'premium_stock_picks'
    );

    if (premiumStockPicks) {
      if (premiumStockPicks.active) {
        console.log('🎉 SUCCESS: premium_stock_picks service was auto-applied and activated!');
      } else {
        console.log('⚠️  WARNING: premium_stock_picks service exists but is not active');
      }
    } else {
      console.log('❌ ERROR: premium_stock_picks service was not auto-applied');
    }

    console.log('\n🎯 Test completed successfully!');

  } catch (error) {
    console.error('💥 Test failed with error:');
    console.error(error.message);
  }
}

// Helper function to delay execution
function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Run the test
testCustomerRegistration();