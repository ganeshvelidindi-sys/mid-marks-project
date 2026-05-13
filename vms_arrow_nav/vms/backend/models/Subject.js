const mongoose = require('mongoose');

/**
 * A subject can be assigned to multiple section-faculty pairs.
 * subjectAssignments: [{ section, faculty }]
 * This allows HOD to say: "CSE301 Sec-A → Faculty X, CSE301 Sec-B → Faculty Y"
 */
const subjectAssignmentSchema = new mongoose.Schema({
  section: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Section',
    required: true
  },
  faculty: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  }
}, { _id: true });

const subjectSchema = new mongoose.Schema({
  name:       { type: String, required: true, trim: true },
  code:       { type: String, required: true, trim: true, uppercase: true },
  department: { type: mongoose.Schema.Types.ObjectId, ref: 'Department', required: true },
  semester:   { type: Number, required: true, min: 1, max: 8 },
  credits:    { type: Number, default: 3 },
  maxMidMarks:{ type: Number, default: 30 },

  // Section-Faculty assignments for this subject
  assignments: [subjectAssignmentSchema],

  isActive: { type: Boolean, default: true }
}, { timestamps: true });

subjectSchema.index({ code: 1, department: 1 }, { unique: true });

module.exports = mongoose.model('Subject', subjectSchema);
