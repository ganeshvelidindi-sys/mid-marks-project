#!/usr/bin/env node
/**
 * ═══════════════════════════════════════════════════════════════
 *   VEMU Institute of Technology - User Creation Script
 * ═══════════════════════════════════════════════════════════════
 * Usage:
 *   node scripts/createUser.js
 *
 * This script will interactively prompt you to create any role-based user.
 * Roles: admin, hod, faculty, student
 * ═══════════════════════════════════════════════════════════════
 */

const mongoose = require('mongoose');
const readline = require('readline');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '../.env') });

const User = require('../models/User');
const Department = require('../models/Department');

const rl = readline.createInterface({ input: process.stdin, output: process.stdout });

const ask = (question) => new Promise(resolve => rl.question(question, resolve));

const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  blue: '\x1b[34m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  cyan: '\x1b[36m'
};

const log = {
  info: (msg) => console.log(`${colors.blue}ℹ ${msg}${colors.reset}`),
  success: (msg) => console.log(`${colors.green}✅ ${msg}${colors.reset}`),
  error: (msg) => console.log(`${colors.red}❌ ${msg}${colors.reset}`),
  warn: (msg) => console.log(`${colors.yellow}⚠  ${msg}${colors.reset}`),
  header: (msg) => console.log(`\n${colors.cyan}${colors.bright}${msg}${colors.reset}\n`)
};

async function main() {
  log.header('═══════════════════════════════════════════════════');
  log.header('  VEMU Institute of Technology - Create User Tool  ');
  log.header('═══════════════════════════════════════════════════');

  try {
    await mongoose.connect(process.env.MONGO_URI);
    log.success('Connected to MongoDB');
  } catch (err) {
    log.error(`MongoDB connection failed: ${err.message}`);
    process.exit(1);
  }

  try {
    // ── Select Role ──────────────────────────────────────────────
    log.info('Available roles: admin, hod, faculty, student');
    const role = (await ask('Enter role: ')).trim().toLowerCase();

    if (!['admin', 'hod', 'faculty', 'student'].includes(role)) {
      log.error('Invalid role. Must be one of: admin, hod, faculty, student');
      process.exit(1);
    }

    // ── Common Fields ────────────────────────────────────────────
    const name = (await ask('Enter full name: ')).trim();
    const rollNumber = (await ask('Enter roll number (used as login ID): ')).trim().toUpperCase();

    if (!name || !rollNumber) {
      log.error('Name and roll number are required');
      process.exit(1);
    }

    // Check if roll number exists
    const existing = await User.findOne({ rollNumber });
    if (existing) {
      log.error(`Roll number ${rollNumber} already exists (Name: ${existing.name}, Role: ${existing.role})`);
      process.exit(1);
    }

    let customPassword = (await ask(`Enter password (leave blank to use roll number as default password): `)).trim();
    if (!customPassword) customPassword = rollNumber;

    const userData = { name, rollNumber, password: customPassword, role };

    // ── Department (for HOD, Faculty, Student) ──────────────────
    if (['hod', 'faculty', 'student'].includes(role)) {
      const departments = await Department.find({ isActive: true }).sort({ name: 1 });

      if (!departments.length) {
        log.warn('No departments found. Create a department first (via Admin dashboard or run this script after creating departments via Admin).');
        process.exit(1);
      }

      console.log('\nAvailable Departments:');
      departments.forEach((d, i) => console.log(`  ${i + 1}. ${d.name} (${d.code})`));

      const deptChoice = parseInt(await ask('\nSelect department number: '));
      if (isNaN(deptChoice) || deptChoice < 1 || deptChoice > departments.length) {
        log.error('Invalid department selection');
        process.exit(1);
      }

      userData.department = departments[deptChoice - 1]._id;
      log.info(`Department selected: ${departments[deptChoice - 1].name}`);
    }

    // ── Semester (for Student) ───────────────────────────────────
    if (role === 'student') {
      const semester = parseInt(await ask('Enter semester (1-8): '));
      if (isNaN(semester) || semester < 1 || semester > 8) {
        log.error('Invalid semester. Must be between 1 and 8');
        process.exit(1);
      }
      userData.semester = semester;

      const section = (await ask('Enter section (e.g., A, B, C — leave blank to skip): ')).trim().toUpperCase();
      if (section) userData.section = section;
    }

    // ── Confirm ──────────────────────────────────────────────────
    console.log('\n─────────────────────────────────────────────────');
    log.info('User Details:');
    Object.entries(userData).forEach(([k, v]) => {
      if (k !== 'password') console.log(`  ${k}: ${v}`);
    });
    console.log(`  password: [set]`);
    console.log('─────────────────────────────────────────────────\n');

    const confirm = (await ask('Create this user? (yes/no): ')).trim().toLowerCase();
    if (confirm !== 'yes' && confirm !== 'y') {
      log.warn('User creation cancelled');
      process.exit(0);
    }

    const user = await User.create(userData);
    const populated = await User.findById(user._id).populate('department', 'name code').select('-password');

    log.success('User created successfully!');
    console.log('\n─────────────────────────────────────────────────');
    console.log(`  Name       : ${populated.name}`);
    console.log(`  Roll Number: ${populated.rollNumber}`);
    console.log(`  Role       : ${populated.role}`);
    if (populated.department) console.log(`  Department : ${populated.department.name} (${populated.department.code})`);
    if (populated.semester) console.log(`  Semester   : ${populated.semester}`);
    if (populated.section) console.log(`  Section    : ${populated.section}`);
    console.log(`  Login with : Roll Number as username, password as set above`);
    console.log('─────────────────────────────────────────────────\n');

  } catch (err) {
    log.error(`Error: ${err.message}`);
  } finally {
    rl.close();
    await mongoose.disconnect();
    process.exit(0);
  }
}

main();
