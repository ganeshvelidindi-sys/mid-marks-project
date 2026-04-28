const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const User = require('../models/User');
const { protect, authorize } = require('../middleware/auth');

// GET all users (admin only)
router.get('/', protect, authorize('admin'), async (req, res) => {
  try {
    const { role, department } = req.query;
    let filter = {};
    if (role) filter.role = role;
    if (department) filter.department = department;
    const users = await User.find(filter).select('-password').sort({ createdAt: -1 });
    res.json(users);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET single user
router.get('/:id', protect, async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select('-password');
    if (!user) return res.status(404).json({ message: 'User not found' });
    res.json(user);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST create user (admin only)
router.post('/', protect, authorize('admin'), async (req, res) => {
  try {
    const { username, password, name, role, department, email, phone, rollNo, course, semester, section, subjects } = req.body;
    const exists = await User.findOne({ username });
    if (exists) return res.status(400).json({ message: 'Username already exists' });
    const hash = await bcrypt.hash(password || 'password123', 10);
    const user = await User.create({
      username, password: hash, name, role, department, email, phone,
      rollNo, course, semester, section, subjects: subjects || [], active: true
    });
    res.status(201).json({ message: 'User created successfully', user: { ...user.toObject(), password: undefined } });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// PUT update user (admin only)
router.put('/:id', protect, authorize('admin'), async (req, res) => {
  try {
    const { password, ...updateData } = req.body;
    if (password) {
      updateData.password = await bcrypt.hash(password, 10);
    }
    const user = await User.findByIdAndUpdate(req.params.id, updateData, { new: true }).select('-password');
    if (!user) return res.status(404).json({ message: 'User not found' });
    res.json({ message: 'User updated successfully', user });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// DELETE user (admin only)
router.delete('/:id', protect, authorize('admin'), async (req, res) => {
  try {
    await User.findByIdAndDelete(req.params.id);
    res.json({ message: 'User deleted successfully' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET faculty list (for HOD)
router.get('/by-role/faculty', protect, authorize('admin', 'hod'), async (req, res) => {
  try {
    const filter = { role: { $in: ['faculty', 'classteacher'] }, active: true };
    if (req.user.role === 'hod') filter.department = req.user.department;
    const users = await User.find(filter).select('-password');
    res.json(users);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET class teacher list (for HOD)
router.get('/by-role/classteacher', protect, authorize('admin', 'hod'), async (req, res) => {
  try {
    const filter = { role: 'classteacher', active: true };
    if (req.user.role === 'hod') filter.department = req.user.department;
    const users = await User.find(filter).select('-password');
    res.json(users);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST assign class teacher (HOD/Admin)
router.post('/assign-classteacher', protect, authorize('admin', 'hod'), async (req, res) => {
  try {
    const { facultyId, semester, section } = req.body;
    const department = req.user.role === 'hod' ? req.user.department : req.body.department;
    
    if (!facultyId || !semester || !section || !department) {
      return res.status(400).json({ message: 'Missing required fields' });
    }

    // Step 1: Check if there's an existing class teacher for this sem/sec/dept
    const existingTeacher = await User.findOne({ 
      role: 'classteacher', 
      department, 
      semester, 
      section 
    });

    if (existingTeacher) {
      // Demote existing to faculty
      existingTeacher.role = 'faculty';
      existingTeacher.semester = '';
      existingTeacher.section = '';
      await existingTeacher.save();
    }

    // Step 2: Promote the selected faculty
    const newTeacher = await User.findById(facultyId);
    if (!newTeacher) return res.status(404).json({ message: 'Faculty not found' });
    
    newTeacher.role = 'classteacher';
    newTeacher.semester = semester;
    newTeacher.section = section;
    await newTeacher.save();

    res.json({ message: 'Class teacher assigned successfully' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST remove class teacher (HOD/Admin)
router.post('/remove-classteacher', protect, authorize('admin', 'hod'), async (req, res) => {
  try {
    const { facultyId } = req.body;
    const teacher = await User.findById(facultyId);
    if (!teacher) return res.status(404).json({ message: 'Teacher not found' });
    
    if (req.user.role === 'hod' && teacher.department !== req.user.department) {
      return res.status(403).json({ message: 'Not authorized' });
    }

    teacher.role = 'faculty';
    teacher.semester = '';
    teacher.section = '';
    await teacher.save();

    res.json({ message: 'Class teacher removed successfully' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
