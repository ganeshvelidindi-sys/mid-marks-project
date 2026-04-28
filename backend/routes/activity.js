const express = require('express');
const router = express.Router();
const User = require('../models/User');
const LoginLog = require('../models/LoginLog');
const { protect, authorize } = require('../middleware/auth');

// Threshold: if logged in within last 8 hours, considered "active session"
const SESSION_MS = 8 * 60 * 60 * 1000;

// GET /api/activity/online — users with an active session (logged in within 8h)
router.get('/online', protect, authorize('admin'), async (req, res) => {
  try {
    const cutoff = new Date(Date.now() - SESSION_MS);
    const users = await User.find(
      { lastLoginAt: { $gte: cutoff }, active: true },
      'name username role department email lastLoginAt lastLoginIP loginCount'
    ).sort({ lastLoginAt: -1 });
    res.json(users);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET /api/activity/users — all users with their last login info
router.get('/users', protect, authorize('admin'), async (req, res) => {
  try {
    const { role } = req.query;
    const filter = { role: { $ne: 'student' } }; // exclude students from staff list by default
    if (role) filter.role = role;
    const users = await User.find(
      filter,
      'name username role department email active lastLoginAt lastLoginIP loginCount createdAt'
    ).sort({ lastLoginAt: -1 });
    res.json(users);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET /api/activity/logs — paginated login attempt logs
router.get('/logs', protect, authorize('admin'), async (req, res) => {
  try {
    const { status, username, limit = 100, skip = 0 } = req.query;
    const filter = {};
    if (status) filter.status = status;
    if (username) filter.username = { $regex: username, $options: 'i' };

    const [logs, total] = await Promise.all([
      LoginLog.find(filter)
        .sort({ attemptedAt: -1 })
        .skip(Number(skip))
        .limit(Number(limit)),
      LoginLog.countDocuments(filter)
    ]);

    const successCount = await LoginLog.countDocuments({ status: 'success' });
    const failedCount  = await LoginLog.countDocuments({ status: 'failed' });

    res.json({ logs, total, successCount, failedCount });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET /api/activity/stats — summary counts for the dashboard card
router.get('/stats', protect, authorize('admin'), async (req, res) => {
  try {
    const cutoff = new Date(Date.now() - SESSION_MS);
    const [onlineCount, totalLogins, failedToday] = await Promise.all([
      User.countDocuments({ lastLoginAt: { $gte: cutoff }, active: true }),
      LoginLog.countDocuments({ status: 'success' }),
      LoginLog.countDocuments({
        status: 'failed',
        attemptedAt: { $gte: new Date(new Date().setHours(0, 0, 0, 0)) }
      })
    ]);
    res.json({ onlineCount, totalLogins, failedToday });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
