const mongoose = require('mongoose');

const loginLogSchema = new mongoose.Schema({
  username:   { type: String, required: true },
  name:       { type: String, default: '' },
  role:       { type: String, default: '' },
  ip:         { type: String, default: 'unknown' },
  status:     { type: String, enum: ['success', 'failed'], required: true },
  message:    { type: String, default: '' },
  attemptedAt:{ type: Date, default: Date.now },
});

// Auto-delete logs older than 90 days
loginLogSchema.index({ attemptedAt: 1 }, { expireAfterSeconds: 60 * 60 * 24 * 90 });

module.exports = mongoose.model('LoginLog', loginLogSchema);
