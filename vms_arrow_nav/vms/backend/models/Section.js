const mongoose = require('mongoose');

const sectionSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Section name is required'],
    trim: true,
    uppercase: true
  },
  department: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Department',
    required: true
  },
  semester: {
    type: Number,
    required: true,
    min: 1,
    max: 8
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, { timestamps: true });

// Unique section per dept per semester
sectionSchema.index({ name: 1, department: 1, semester: 1 }, { unique: true });

module.exports = mongoose.model('Section', sectionSchema);
