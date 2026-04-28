const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const LoginLog = require('../models/LoginLog');

// Helper: get client IP
const getIP = (req) => {
  return (
    req.headers['x-forwarded-for']?.split(',')[0]?.trim() ||
    req.socket?.remoteAddress ||
    'unknown'
  );
};

// POST /api/auth/login
router.post('/login', async (req, res) => {
  const ip = getIP(req);
  try {
    const { username, password, role } = req.body;
    if (!username || !password || !role) {
      await LoginLog.create({ username: username || '?', status: 'failed', message: 'Missing fields', ip });
      return res.status(400).json({ message: 'Username, password and role are required' });
    }

    const user = await User.findOne({ username, active: true });
    if (!user) {
      await LoginLog.create({ username, status: 'failed', message: 'User not found or inactive', ip });
      return res.status(401).json({ message: 'Invalid credentials or role' });
    }

    // Allow Class Teacher and HOD to also login as Subject Faculty
    if (user.role !== role && !( (user.role === 'classteacher' || user.role === 'hod') && role === 'faculty')) {
      await LoginLog.create({ username, name: user.name, role: user.role, status: 'failed', message: 'Role mismatch', ip });
      return res.status(401).json({ message: 'Invalid credentials or role' });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      await LoginLog.create({ username, name: user.name, role: user.role, status: 'failed', message: 'Wrong password', ip });
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    // ✅ Successful login — update activity fields
    await User.findByIdAndUpdate(user._id, {
      lastLoginAt: new Date(),
      lastLoginIP: ip,
      $inc: { loginCount: 1 }
    });

    await LoginLog.create({ username, name: user.name, role: role, status: 'success', message: 'Login successful', ip });

    const token = jwt.sign(
      { id: user._id, username: user.username, role: role, name: user.name, department: user.department },
      process.env.JWT_SECRET,
      { expiresIn: '8h' }
    );

    res.json({
      token,
      user: {
        id: user._id,
        username: user.username,
        name: user.name,
        role: role,
        department: user.department,
        email: user.email,
        rollNo: user.rollNo,
        semester: user.semester,
        section: user.section,
      }
    });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// POST /api/auth/change-password
router.post('/change-password', require('../middleware/auth').protect, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const user = await User.findById(req.user.id);
    const isMatch = await bcrypt.compare(currentPassword, user.password);
    if (!isMatch) return res.status(400).json({ message: 'Current password is incorrect' });
    user.password = await bcrypt.hash(newPassword, 10);
    await user.save();
    res.json({ message: 'Password changed successfully' });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
