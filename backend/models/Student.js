const mongoose = require('mongoose');

const studentSchema = new mongoose.Schema({
  rollNo: { type: String, required: true, unique: true, trim: true },
  name: { type: String, required: true },
  course: { type: String, default: 'B.Tech' },
  branch: { type: String, required: true },
  year: { type: String, required: true, default: 'I' },
  semester: { type: String, required: true },
  section: { type: String, required: true },
  academicYear: { type: String, default: '2025-26' },
  email: { type: String, default: '' },
  phone: { type: String, default: '' },
  active: { type: Boolean, default: true },
}, { timestamps: true });

module.exports = mongoose.model('Student', studentSchema);
