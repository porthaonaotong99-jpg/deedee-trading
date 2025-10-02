#!/usr/bin/env node

/**
 * WebSocket Test Script for Stock Data
 * 
 * This script tests the WebSocket connection and logs all events
 * to help debug the data fetching issues.
 */

const io = require('socket.io-client');

const WS_BASE = 'http://localhost:3000';
const testSymbols = ['AAPL', 'MSFT'];

console.log('🚀 Starting WebSocket Test...\n');

const socket = io(WS_BASE, {
  forceNew: true,
  timeout: 5000,
  transports: ['websocket', 'polling']
});

socket.on('connect', () => {
  console.log('✅ Connected to WebSocket server');
  console.log(`📡 Socket ID: ${socket.id}\n`);
  
  // Subscribe to test symbols
  console.log(`📡 Subscribing to symbols: ${testSymbols.join(', ')}`);
  socket.emit('subscribe', { symbols: testSymbols });
});

socket.on('disconnect', (reason) => {
  console.log(`❌ Disconnected: ${reason}`);
});

socket.on('connect_error', (error) => {
  console.log(`❌ Connection error: ${error.message || error}`);
});

socket.on('subscribed', (data) => {
  console.log(`✅ Subscription confirmed for: ${data.symbols.join(', ')}\n`);
});

socket.on('priceUpdate', (data) => {
  console.log('📈 Price Update Received:');
  console.log(`   Symbol: ${data.symbol}`);
  console.log(`   Price: $${data.price}`);
  console.log(`   Change: ${data.change} (${data.changePercent}%)`);
  console.log(`   Provider: ${data.provider || 'N/A'}`);
  console.log(`   Source: ${data.source || 'N/A'}`);
  console.log(`   Timestamp: ${new Date(data.timestamp).toLocaleTimeString()}\n`);
});

socket.on('error', (error) => {
  console.log(`❌ Socket error: ${error.message || error}`);
});

// Keep the script running for 60 seconds
setTimeout(() => {
  console.log('⏰ Test completed. Disconnecting...');
  socket.disconnect();
  process.exit(0);
}, 60000);

console.log('⏳ Listening for WebSocket events (60 seconds)...\n');