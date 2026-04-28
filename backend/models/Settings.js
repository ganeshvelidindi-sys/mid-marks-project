const mongoose = require('mongoose');

const settingsSchema = new mongoose.Schema({
  mid_exam_max: { type: Number, default: 25 },
  assignment_max: { type: Number, default: 5 },
  total_max: { type: Number, default: 30 },
  mid1_deadline: { type: String, default: '' },
  mid2_deadline: { type: String, default: '' },
  assignment_deadline: { type: String, default: '' },
  branches: { type: [String], default: ['CSE', 'ECE', 'EEE', 'MECH', 'CIVIL', 'AI&ML', 'IT'] },
  semesters: { type: [String], default: ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII'] },
  sections: { type: [String], default: ['A', 'B', 'C'] },
  academic_year: { type: String, default: '2025-26' },
  subjects: [{
    code: String,
    name: String,
    branch: String,
    semester: String,
  }]
}, { timestamps: true });

module.exports = mongoose.model('Settings', settingsSchema);
