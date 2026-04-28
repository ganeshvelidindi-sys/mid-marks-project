const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const dotenv = require('dotenv');

dotenv.config();

const app = express();

// Middleware
const cors = require("cors");
import cors from "cors";

app.use(cors({
  origin: "https://vemumidmarks.vercel.app",
  credentials: true
}));
app.use(express.json());

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/users', require('./routes/users'));
app.use('/api/students', require('./routes/students'));
app.use('/api/marks', require('./routes/marks'));
app.use('/api/settings', require('./routes/settings'));
app.use('/api/reports', require('./routes/reports'));
app.use('/api/activity', require('./routes/activity'));

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', message: 'VEMU Backend Running', timestamp: new Date() });
});

// MongoDB Connection — tries SRV first, falls back to direct connection string
async function connectDB() {
  const uris = [
    process.env.MONGO_URI,
    process.env.MONGO_URI_DIRECT,
  ].filter(Boolean);

  for (const uri of uris) {
    try {
      const label = uri.startsWith('mongodb+srv') ? 'SRV' : 'Direct';
      console.log(`🔄 Trying MongoDB ${label} connection...`);
      await mongoose.connect(uri, {
        serverSelectionTimeoutMS: 8000,
        connectTimeoutMS: 10000,
      });
      console.log(`✅ MongoDB Connected Successfully (${label})`);
      return true;
    } catch (err) {
      console.warn(`⚠️  ${err.message}`);
    }
  }
  console.error('❌ All MongoDB connection attempts failed.');
  console.error('👉 FIX: Go to MongoDB Atlas → Network Access → Add IP Address → Allow Access from Anywhere (0.0.0.0/0)');
  process.exit(1);
}

connectDB().then(async () => {
  await seedData();
  app.listen(process.env.PORT || 5000, () => {
    console.log(`🚀 VEMU Server running on port ${process.env.PORT || 5000}`);
    console.log(`📡 API available at http://localhost:${process.env.PORT || 5000}/api`);
  });
});

// Seed initial admin and settings
async function seedData() {
  const User = require('./models/User');
  const Settings = require('./models/Settings');
  const Student = require('./models/Student');
  const bcrypt = require('bcryptjs');

  try {
    const students = await Student.find();
    let backfilled = 0;
    for (const student of students) {
      const userExists = await User.findOne({ username: student.rollNo.toUpperCase() });
      if (!userExists) {
        const hash = await bcrypt.hash(student.rollNo, 10);
        await User.create({
          username: student.rollNo.toUpperCase(),
          password: hash,
          name: student.name,
          role: 'student',
          rollNo: student.rollNo.toUpperCase(),
          course: student.course,
          email: student.email,
          phone: student.phone,
          active: true
        });
        backfilled++;
      }
    }
    if (backfilled > 0) console.log(`✅ Provisioned ${backfilled} missing Student User accounts.`);
  } catch (err) {
    console.error('Error backfilling students:', err);
  }


  const adminExists = await User.findOne({ role: 'admin' });
  if (!adminExists) {
    const bcrypt = require('bcryptjs');
    const hash = await bcrypt.hash('admin123', 10);
    await User.create({
      username: 'admin',
      password: hash,
      name: 'System Administrator',
      role: 'admin',
      department: '',
      active: true
    });
    console.log('✅ Admin user seeded: admin / admin123');
  }

  const settingsExist = await Settings.findOne();
  if (!settingsExist) {
    await Settings.create({
      mid_exam_max: 25,
      assignment_max: 5,
      total_max: 30,
      branches: ['CSE', 'ECE', 'EEE', 'MECH', 'CIVIL', 'AI&ML', 'IT'],
      semesters: ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII'],
      sections: ['A', 'B', 'C'],
      academic_year: '2025-26'
    });
    console.log('✅ Default settings seeded');
  }
}
