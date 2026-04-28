const mongoose = require('mongoose');

const marksSchema = new mongoose.Schema({
  studentRollNo: { type: String, required: true },
  studentName: { type: String, required: true },
  branch: { type: String, required: true },
  semester: { type: String, required: true },
  section: { type: String, required: true },
  subjectCode: { type: String, required: true },
  subjectName: { type: String, required: true },
  academicYear: { type: String, default: '2025-26' },
  facultyId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  facultyName: { type: String },

  // Mid 1
  mid1: {
    q1: { type: Number, default: 0, min: 0 },
    q2: { type: Number, default: 0, min: 0 },
    q3: { type: Number, default: 0, min: 0 },
    q4: { type: Number, default: 0, min: 0 },
    total: { type: Number, default: 0 },
    assignment: { type: Number, default: 0, min: 0, max: 5 },
    grandTotal: { type: Number, default: 0 },
  },
  // Mid 2
  mid2: {
    q1: { type: Number, default: 0, min: 0 },
    q2: { type: Number, default: 0, min: 0 },
    q3: { type: Number, default: 0, min: 0 },
    q4: { type: Number, default: 0, min: 0 },
    total: { type: Number, default: 0 },
    assignment: { type: Number, default: 0, min: 0, max: 5 },
    grandTotal: { type: Number, default: 0 },
  },

  // Calculated internal marks
  bestMidTotal: { type: Number, default: 0 },      // Best of two mid totals (25 marks)
  secondMidTotal: { type: Number, default: 0 },    // Second mid total
  internalMarks: { type: Number, default: 0 },     // Final: 80% best + 20% second

  // Workflow
  status: {
    type: String,
    enum: ['draft', 'submitted', 'approved', 'rejected'],
    default: 'draft'
  },
  submittedAt: { type: Date },
  approvedAt: { type: Date },
  hodId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  hodName: { type: String },
  hodRemarks: { type: String, default: '' },

  // Audit
  editHistory: [{
    editedBy: String,
    editedAt: { type: Date, default: Date.now },
    changes: String,
  }],
}, { timestamps: true });

// Index for efficient queries
marksSchema.index({ branch: 1, semester: 1, section: 1, subjectCode: 1, studentRollNo: 1 }, { unique: true });

module.exports = mongoose.model('Marks', marksSchema);
