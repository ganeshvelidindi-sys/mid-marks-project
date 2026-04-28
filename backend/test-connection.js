/**
 * VEMU — MongoDB Connection Test Script
 * Run: node test-connection.js
 */
require('dotenv').config();
const mongoose = require('mongoose');

console.log('\n🔍 VEMU MongoDB Connection Tester');
console.log('===================================\n');

const uris = [
  { label: 'SRV (Primary)', uri: process.env.MONGO_URI },
  { label: 'Direct (Fallback)', uri: process.env.MONGO_URI_DIRECT },
];

async function test() {
  for (const { label, uri } of uris) {
    if (!uri) continue;
    console.log(`📡 Testing: ${label}`);
    console.log(`   URI: ${uri.substring(0, 50)}...`);
    try {
      await mongoose.connect(uri, { serverSelectionTimeoutMS: 8000 });
      console.log(`   ✅ SUCCESS! Connected.\n`);
      await mongoose.disconnect();
      console.log('🎉 MongoDB is working! Run: npm run dev\n');
      process.exit(0);
    } catch (err) {
      console.log(`   ❌ FAILED: ${err.message}\n`);
      try { await mongoose.disconnect(); } catch(_) {}
    }
  }

  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('❌ ALL CONNECTIONS FAILED\n');
  console.log('🔧 FIX — Follow these steps:\n');
  console.log('1. Open: https://cloud.mongodb.com');
  console.log('2. Login with your account');
  console.log('3. Click "Network Access" in left sidebar');
  console.log('4. Click "+ ADD IP ADDRESS" button');
  console.log('5. Click "ALLOW ACCESS FROM ANYWHERE"');
  console.log('6. Click "Confirm"\n');
  console.log('Then run: npm run dev\n');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  process.exit(1);
}

test();
