#!/usr/bin/env node
/**
 * ═══════════════════════════════════════════════════════════════
 *   VEMU Institute of Technology - Clear Database Script
 * ═══════════════════════════════════════════════════════════════
 * Usage:
 *   node scripts/clearDatabase.js
 *
 * ⚠  WARNING: This will permanently delete ALL data in the database!
 * ═══════════════════════════════════════════════════════════════
 */

const mongoose = require('mongoose');
const readline = require('readline');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '../.env') });

const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
const ask = (q) => new Promise(resolve => rl.question(q, resolve));

const colors = {
  red: '\x1b[31m', yellow: '\x1b[33m', green: '\x1b[32m',
  bright: '\x1b[1m', reset: '\x1b[0m', cyan: '\x1b[36m'
};

async function main() {
  console.log(`\n${colors.red}${colors.bright}`);
  console.log('╔══════════════════════════════════════════════════╗');
  console.log('║         ⚠  DATABASE CLEAR UTILITY ⚠              ║');
  console.log('║  VEMU Institute of Technology - Marks System      ║');
  console.log('╚══════════════════════════════════════════════════╝');
  console.log(`${colors.reset}`);

  console.log(`${colors.yellow}WARNING: This will permanently erase ALL data including:${colors.reset}`);
  console.log('  • All Users (Admin, HOD, Faculty, Students)');
  console.log('  • All Departments');
  console.log('  • All Subjects');
  console.log('  • All Marks Records\n');

  const confirm1 = await ask(`${colors.red}Type "CONFIRM DELETE" to proceed: ${colors.reset}`);
  if (confirm1.trim() !== 'CONFIRM DELETE') {
    console.log(`${colors.green}✅ Operation cancelled. No data was deleted.${colors.reset}`);
    rl.close();
    process.exit(0);
  }

  const confirm2 = await ask(`${colors.red}Are you absolutely sure? Type "YES" to proceed: ${colors.reset}`);
  if (confirm2.trim() !== 'YES') {
    console.log(`${colors.green}✅ Operation cancelled. No data was deleted.${colors.reset}`);
    rl.close();
    process.exit(0);
  }

  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log(`\n${colors.cyan}Connected to MongoDB...${colors.reset}`);

    const User = require('../models/User');
    const Department = require('../models/Department');
    const Subject = require('../models/Subject');
    const Marks = require('../models/Marks');

    console.log('Clearing collections...\n');

    const marksResult = await Marks.deleteMany({});
    console.log(`  🗑  Marks deleted: ${marksResult.deletedCount}`);

    const subjectResult = await Subject.deleteMany({});
    console.log(`  🗑  Subjects deleted: ${subjectResult.deletedCount}`);

    const userResult = await User.deleteMany({});
    console.log(`  🗑  Users deleted: ${userResult.deletedCount}`);

    const deptResult = await Department.deleteMany({});
    console.log(`  🗑  Departments deleted: ${deptResult.deletedCount}`);

    console.log(`\n${colors.green}${colors.bright}✅ Database cleared successfully!${colors.reset}`);
    console.log(`${colors.yellow}Note: Create an admin user first by running: npm run createUser${colors.reset}\n`);

  } catch (err) {
    console.error(`${colors.red}❌ Error: ${err.message}${colors.reset}`);
  } finally {
    rl.close();
    await mongoose.disconnect();
    process.exit(0);
  }
}

main();
