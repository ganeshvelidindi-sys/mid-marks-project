const mongoose = require('mongoose');
const bcrypt   = require('bcryptjs');

const userSchema = new mongoose.Schema({
  name:           { type: String, required: true, trim: true },
  rollNumber:     { type: String, required: true, unique: true, trim: true, uppercase: true },
  password:       { type: String, required: true, minlength: 6 },
  role:           { type: String, enum: ['admin','faculty','student'], required: true },
  // Primary department (for students)
  department:     { type: mongoose.Schema.Types.ObjectId, ref: 'Department', default: null },
  // Faculty can be HOD of multiple departments
  hodDepartments: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Department' }],
  isHod:          { type: Boolean, default: false },
  semester:       { type: Number, min: 1, max: 8, default: null },
  section:        { type: String, default: null },
  sectionId:      { type: mongoose.Schema.Types.ObjectId, ref: 'Section', default: null },
  isActive:       { type: Boolean, default: true },
  mustChangePassword: { type: Boolean, default: true }
}, { timestamps: true });

userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  const salt    = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

userSchema.methods.matchPassword = async function (entered) {
  return await bcrypt.compare(entered, this.password);
};

module.exports = mongoose.model('User', userSchema);
