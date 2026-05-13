const mongoose = require('mongoose');

/**
 * MARKS PATTERN (per Mid Exam):
 *  Assignment(5) + SHA(10) + [Best(Q1/Q2)+Best(Q3/Q4)+Best(Q5/Q6)] / 2 (15) = 30
 *
 *  FINAL = 80% × higher_mid + 20% × lower_mid  (shown after HOD locks BOTH mids)
 */

const marksSchema = new mongoose.Schema({
  student:    { type: mongoose.Schema.Types.ObjectId, ref: 'User',       required: true },
  subject:    { type: mongoose.Schema.Types.ObjectId, ref: 'Subject',    required: true },
  faculty:    { type: mongoose.Schema.Types.ObjectId, ref: 'User',       required: true },
  department: { type: mongoose.Schema.Types.ObjectId, ref: 'Department', required: true },

  semester: { type: Number, required: true, min: 1, max: 8 },
  midExam:  { type: String, enum: ['Mid-1', 'Mid-2'], required: true },

  // 6 questions (each max 10)
  q1: { type: Number, default: 0, min: 0, max: 10 },
  q2: { type: Number, default: 0, min: 0, max: 10 },
  q3: { type: Number, default: 0, min: 0, max: 10 },
  q4: { type: Number, default: 0, min: 0, max: 10 },
  q5: { type: Number, default: 0, min: 0, max: 10 },
  q6: { type: Number, default: 0, min: 0, max: 10 },

  // Best of each pair (auto-computed)
  bestQ1Q2: { type: Number, default: 0 },
  bestQ3Q4: { type: Number, default: 0 },
  bestQ5Q6: { type: Number, default: 0 },

  questionTotal: { type: Number, default: 0 }, // max 30
  questionHalf:  { type: Number, default: 0 }, // max 15

  assignmentMarks: { type: Number, default: 0, min: 0, max: 5  },
  shaMarks:        { type: Number, default: 0, min: 0, max: 10 },

  totalMarks: { type: Number, default: 0 }, // max 30

  status:     { type: String, enum: ['submitted', 'approved', 'rejected'], default: 'submitted' },
  hodComment: { type: String, default: '' },
  isLocked:   { type: Boolean, default: false }
}, { timestamps: true });

marksSchema.index({ student: 1, subject: 1, midExam: 1 }, { unique: true });

marksSchema.pre('save', function (next) {
  this.bestQ1Q2      = Math.max(this.q1 || 0, this.q2 || 0);
  this.bestQ3Q4      = Math.max(this.q3 || 0, this.q4 || 0);
  this.bestQ5Q6      = Math.max(this.q5 || 0, this.q6 || 0);
  this.questionTotal = this.bestQ1Q2 + this.bestQ3Q4 + this.bestQ5Q6;
  this.questionHalf  = Math.round(this.questionTotal / 2);   // rounded to nearest whole number
  this.totalMarks    = Math.round(this.questionHalf + (this.assignmentMarks || 0) + (this.shaMarks || 0));
  next();
});

module.exports = mongoose.model('Marks', marksSchema);
