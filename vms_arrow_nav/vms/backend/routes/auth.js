const express = require('express');
const router  = express.Router();
const jwt     = require('jsonwebtoken');
const User    = require('../models/User');
const { protect } = require('../middleware/auth');

const generateToken = (id) =>
  jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRE });

// ── Login ────────────────────────────────────────────────────
router.post('/login', async (req, res) => {
  try {
    const { rollNumber, password, tabType, loginAs, hodDeptId } = req.body;

    if (!rollNumber || !password)
      return res.status(400).json({ message: 'Please provide roll number and password' });

    const user = await User.findOne({ rollNumber: rollNumber.toUpperCase() })
      .populate('department')
      .populate('hodDepartments');

    if (!user)
      return res.status(401).json({ message: 'Invalid credentials' });

    if (!user.isActive)
      return res.status(401).json({ message: 'Account deactivated. Contact admin.' });

    const isMatch = await user.matchPassword(password);
    if (!isMatch)
      return res.status(401).json({ message: 'Invalid credentials' });

    // Student tab enforcement
    if (tabType === 'student' && user.role !== 'student') {
      return res.status(403).json({
        message: '❌ Only students can login from the Student tab. Please use the Faculty tab.'
      });
    }
    if (tabType === 'faculty' && user.role === 'student') {
      return res.status(403).json({
        message: '❌ Students must login from the Student tab, not the Faculty tab.'
      });
    }

    // If faculty with HOD roles — need to decide how to log in
    // Step 1: credentials verified. If they haven't chosen yet, ask.
    if (user.role === 'faculty' && user.isHod && !loginAs) {
      return res.status(200).json({
        success: true,
        requiresRoleSelection: true,
        isHod: true,
        hodDepartments: user.hodDepartments,
        message: 'Please select how you want to login'
      });
    }

    // If they chose HOD and have multiple hod departments, ask which dept
    if (loginAs === 'hod' && user.isHod) {
      if (user.hodDepartments.length > 1 && !hodDeptId) {
        return res.status(200).json({
          success: true,
          requiresDeptSelection: true,
          hodDepartments: user.hodDepartments,
          message: 'Please select which department to login as HOD'
        });
      }

      // Login as HOD for specific dept
      const selectedDeptId = hodDeptId || user.hodDepartments[0]._id;
      const selectedDept = user.hodDepartments.find(d => d._id.toString() === selectedDeptId.toString())
        || user.hodDepartments[0];

      const token = generateToken(user._id);
      return res.json({
        success: true,
        token,
        mustChangePassword: user.mustChangePassword,
        user: {
          id:                 user._id,
          name:               user.name,
          rollNumber:         user.rollNumber,
          role:               'hod',        // Override role for session
          actualRole:         'faculty',
          department:         selectedDept,
          hodDepartments:     user.hodDepartments,
          isHod:              user.isHod,
          mustChangePassword: user.mustChangePassword
        }
      });
    }

    // Normal faculty login (or chose 'faculty')
    const token = generateToken(user._id);
    res.json({
      success: true,
      token,
      mustChangePassword: user.mustChangePassword,
      user: {
        id:                 user._id,
        name:               user.name,
        rollNumber:         user.rollNumber,
        role:               user.role,
        actualRole:         user.role,
        department:         user.department,
        hodDepartments:     user.hodDepartments || [],
        isHod:              user.isHod || false,
        semester:           user.semester,
        section:            user.section,
        mustChangePassword: user.mustChangePassword
      }
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// ── Get current user ─────────────────────────────────────────
router.get('/me', protect, async (req, res) => {
  res.json({ success: true, user: req.user });
});

// ── Change password ───────────────────────────────────────────
router.put('/change-password', protect, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword)
      return res.status(400).json({ message: 'Both current and new password are required' });
    if (newPassword.length < 6)
      return res.status(400).json({ message: 'New password must be at least 6 characters' });

    const user    = await User.findById(req.user._id);
    const isMatch = await user.matchPassword(currentPassword);
    if (!isMatch)
      return res.status(400).json({ message: 'Current password is incorrect' });

    user.password           = newPassword;
    user.mustChangePassword = false;
    await user.save();

    res.json({ success: true, message: 'Password changed successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
