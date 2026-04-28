const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true, trim: true },
  password: { type: String, required: true },
  name: { type: String, required: true },
  role: { type: String, enum: ['admin', 'hod', 'classteacher', 'faculty', 'student'], required: true },
  department: { type: String, default: '' },
  email: { type: String, default: '' },
  phone: { type: String, default: '' },
  active: { type: Boolean, default: true },
  // Faculty/HOD specific
  subjects: [{ type: String }],
  semester: { type: String, default: '' },
  year: { type: String, default: '' },
  section: { type: String, default: '' },
  // Student specific
  rollNo: { type: String, default: '' },
  course: { type: String, default: '' },
  // Activity tracking
  lastLoginAt: { type: Date, default: null },
  lastLoginIP: { type: String, default: '' },
  loginCount: { type: Number, default: 0 },
}, { timestamps: true });

module.exports = mongoose.model('User', userSchema);
