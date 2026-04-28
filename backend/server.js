const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const dotenv = require('dotenv');

dotenv.config();

const app = express();

// ✅ CORS (THIS IS ENOUGH)
app.use(cors({
  origin: "https://vemumidmarks.vercel.app",
  credentials: true
}));

// ❌ REMOVE THIS LINE (CAUSES CRASH)
// app.options('*', cors());

// ✅ Middleware
app.use(express.json());

// ✅ Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/users', require('./routes/users'));
app.use('/api/students', require('./routes/students'));
app.use('/api/marks', require('./routes/marks'));
app.use('/api/settings', require('./routes/settings'));
app.use('/api/reports', require('./routes/reports'));
app.use('/api/activity', require('./routes/activity'));

// ✅ Health check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'OK',
    message: 'VEMU Backend Running',
    timestamp: new Date()
  });
});

// ✅ MongoDB
async function connectDB() {
  try {
    console.log("🔄 Connecting to MongoDB...");
    await mongoose.connect(process.env.MONGO_URI, {
      serverSelectionTimeoutMS: 8000,
      connectTimeoutMS: 10000,
    });
    console.log("✅ MongoDB Connected");
  } catch (err) {
    console.error("❌ MongoDB connection failed:", err.message);
    process.exit(1);
  }
}

// ✅ Start server
connectDB().then(async () => {
  await seedData();

  const PORT = process.env.PORT || 5000;
  app.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
  });
});

// ✅ Seed data (same as yours)
async function seedData() {
  const User = require('./models/User');
  const Settings = require('./models/Settings');
  const Student = require('./models/Student');
  const bcrypt = require('bcryptjs');

  try {
    const students = await Student.find();
    let created = 0;

    for (const student of students) {
      const exists = await User.findOne({
        username: student.rollNo.toUpperCase()
      });

      if (!exists) {
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

        created++;
      }
    }

    if (created > 0) {
      console.log(`✅ Created ${created} student accounts`);
    }

    const adminExists = await User.findOne({ role: 'admin' });

    if (!adminExists) {
      const hash = await bcrypt.hash('admin123', 10);

      await User.create({
        username: 'admin',
        password: hash,
        name: 'System Administrator',
        role: 'admin',
        active: true
      });

      console.log('✅ Admin created: admin / admin123');
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

      console.log('✅ Default settings created');
    }

  } catch (err) {
    console.error("Seed error:", err.message);
  }
}