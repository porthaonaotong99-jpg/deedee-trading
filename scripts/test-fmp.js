#!/usr/bin/env node

/**
 * FMP Integration Test Script
 * 
 * This script tests the Financial Modeling Prep integration
 * independently of the full NestJS application.
 * 
 * Usage:
 *   node scripts/test-fmp.js AAPL
 *   node scripts/test-fmp.js MSFT GOOGL TSLA
 */

require('dotenv').config();

// Test symbols
const testSymbols = process.argv.slice(2).length > 0 
  ? process.argv.slice(2) 
  : ['AAPL', 'MSFT', 'GOOGL', 'TSLA', 'NVDA'];

// FMP API base URL
const FMP_BASE_URL = 'https://financialmodelingprep.com/api/v3';

/**
 * Test FMP API directly
 */
async function testFMPAPI(symbol) {
  if (!process.env.FMP_API_KEY) {
    console.error('❌ FMP_API_KEY not found in environment variables');
    console.log('Please set your FMP API key in .env file:');
    console.log('FMP_API_KEY=your_fmp_api_key_here');
    process.exit(1);
  }

  const url = `${FMP_BASE_URL}/quote/${encodeURIComponent(symbol)}?apikey=${process.env.FMP_API_KEY}`;
  
  console.log(`\n🔍 Testing FMP API for ${symbol}...`);
  
  try {
    const startTime = Date.now();
    const response = await fetch(url);
    const endTime = Date.now();
    const latency = endTime - startTime;
    
    if (!response.ok) {
      console.error(`❌ HTTP ${response.status}: ${response.statusText}`);
      
      if (response.status === 401) {
        console.log('💡 Check your FMP API key is correct and active');
      } else if (response.status === 429) {
        console.log('💡 You may have exceeded your daily quota');
      }
      return null;
    }
    
    const data = await response.json();
    
    if (!Array.isArray(data) || data.length === 0) {
      console.error(`❌ No data returned for ${symbol}`);
      console.log('💡 Check if the symbol exists and is actively traded');
      return null;
    }
    
    const quote = data[0];
    
    console.log(`✅ ${symbol} - Response time: ${latency}ms`);
    console.log(`   Price: $${quote.price?.toFixed(2) || 'N/A'}`);
    console.log(`   Change: ${quote.change?.toFixed(2) || 'N/A'} (${quote.changesPercentage?.toFixed(2) || 'N/A'}%)`);
    console.log(`   Volume: ${quote.volume?.toLocaleString() || 'N/A'}`);
    console.log(`   Market Cap: $${quote.marketCap ? (quote.marketCap / 1e9).toFixed(2) + 'B' : 'N/A'}`);
    console.log(`   Exchange: ${quote.exchange || 'N/A'}`);
    console.log(`   P/E Ratio: ${quote.pe?.toFixed(2) || 'N/A'}`);
    
    return quote;
    
  } catch (error) {
    console.error(`❌ Error fetching data for ${symbol}:`, error.message);
    return null;
  }
}

/**
 * Test the unified ExternalPriceFetcher service
 */
async function testUnifiedService(symbol) {
  // This would require importing the actual service
  // For now, we'll just show the expected structure
  console.log(`\n🔧 Unified service would return for ${symbol}:`);
  console.log(`   {`);
  console.log(`     symbol: "${symbol}",`);
  console.log(`     price: 175.43,`);
  console.log(`     open: 174.26,`);
  console.log(`     high: 176.89,`);
  console.log(`     low: 173.50,`);
  console.log(`     previousClose: 173.26,`);
  console.log(`     volume: 67543210,`);
  console.log(`     provider: "fmp",`);
  console.log(`     timestamp: "2024-01-05T21:00:00.000Z"`);
  console.log(`   }`);
}

/**
 * Test FMP account info and limits
 */
async function testAccountInfo() {
  if (!process.env.FMP_API_KEY) return;
  
  console.log('\n📊 Testing FMP Account Info...');
  
  try {
    const url = `${FMP_BASE_URL}/profile/AAPL?apikey=${process.env.FMP_API_KEY}`;
    const response = await fetch(url);
    
    if (response.ok) {
      console.log('✅ FMP API key is valid and working');
      
      // Get rate limit headers if available
      const remaining = response.headers.get('x-ratelimit-remaining');
      const limit = response.headers.get('x-ratelimit-limit');
      
      if (remaining && limit) {
        console.log(`📈 Rate limits: ${remaining}/${limit} requests remaining`);
      }
    } else {
      console.log(`❌ API validation failed: ${response.status}`);
    }
  } catch (error) {
    console.log('⚠️ Could not validate API key:', error.message);
  }
}

/**
 * Main test runner
 */
async function main() {
  console.log('🚀 FMP Integration Test Script');
  console.log('================================');
  
  // Test account first
  await testAccountInfo();
  
  // Test each symbol
  const results = [];
  for (const symbol of testSymbols) {
    const result = await testFMPAPI(symbol);
    if (result) {
      results.push({ symbol, price: result.price, provider: 'fmp' });
    }
  }
  
  // Summary
  console.log('\n📈 Test Summary:');
  console.log('================');
  console.log(`✅ Successful: ${results.length}/${testSymbols.length} symbols`);
  
  if (results.length > 0) {
    console.log('\n💰 Prices retrieved:');
    results.forEach(({ symbol, price }) => {
      console.log(`   ${symbol}: $${price?.toFixed(2) || 'N/A'}`);
    });
  }
  
  if (results.length === testSymbols.length) {
    console.log('\n🎉 All tests passed! FMP integration is working correctly.');
    console.log('\n🔗 Next steps:');
    console.log('   1. Add FMP_API_KEY to your .env file');
    console.log('   2. Set MARKET_DATA_PRIMARY=fmp (optional)');
    console.log('   3. Restart your NestJS application');
    console.log('   4. Test via your API endpoints');
  } else {
    console.log('\n⚠️ Some tests failed. Check your API key and network connection.');
  }
}

// Run the tests
main().catch(console.error);