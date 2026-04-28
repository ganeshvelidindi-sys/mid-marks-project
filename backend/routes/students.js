const express = require('express');
const router = express.Router();
const Student = require('../models/Student');
const User = require('../models/User');
const bcrypt = require('bcryptjs');
const { protect, authorize } = require('../middleware/auth');

// GET students with filters
router.get('/', protect, async (req, res) => {
  try {
    const { branch, semester, section, academicYear } = req.query;
    let filter = {};
    if (branch) filter.branch = branch;
    if (semester) filter.semester = semester;
    if (section) filter.section = section;
    if (academicYear) filter.academicYear = academicYear;
    const students = await Student.find(filter).sort({ rollNo: 1 });
    res.json(students);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET single student by rollNo
router.get('/roll/:rollNo', protect, async (req, res) => {
  try {
    const student = await Student.findOne({ rollNo: req.params.rollNo });
    if (!student) return res.status(404).json({ message: 'Student not found' });
    res.json(student);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST create student (admin only)
router.post('/', protect, authorize('admin'), async (req, res) => {
  try {
    const exists = await Student.findOne({ rollNo: req.body.rollNo });
    if (exists) return res.status(400).json({ message: 'Roll number already exists' });
    
    const student = await Student.create(req.body);

    const hash = await bcrypt.hash(req.body.rollNo, 10);
    await User.create({
      username: req.body.rollNo.toUpperCase(),
      password: hash,
      name: req.body.name,
      role: 'student',
      rollNo: req.body.rollNo.toUpperCase(),
      course: req.body.course,
      email: req.body.email,
      phone: req.body.phone,
      active: true
    });

    res.status(201).json({ message: 'Student created', student });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST bulk create students (admin only)
router.post('/bulk', protect, authorize('admin'), async (req, res) => {
  try {
    const { students } = req.body;
    const results = { created: 0, skipped: 0, errors: [] };
    for (const s of students) {
      try {
        const exists = await Student.findOne({ rollNo: s.rollNo });
        if (exists) { results.skipped++; continue; }
        await Student.create(s);

        const hash = await bcrypt.hash(s.rollNo, 10);
        await User.create({
          username: s.rollNo.toUpperCase(),
          password: hash,
          name: s.name,
          role: 'student',
          rollNo: s.rollNo.toUpperCase(),
          course: s.course,
          email: s.email,
          phone: s.phone,
          active: true
        });

        results.created++;
      } catch (e) {
        results.errors.push({ rollNo: s.rollNo, error: e.message });
      }
    }
    res.json({ message: 'Bulk import complete', results });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// PUT update student (admin only)
router.put('/:id', protect, authorize('admin'), async (req, res) => {
  try {
    const student = await Student.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!student) return res.status(404).json({ message: 'Student not found' });
    res.json({ message: 'Student updated', student });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// DELETE student (admin only)
router.delete('/:id', protect, authorize('admin'), async (req, res) => {
  try {
    const student = await Student.findById(req.params.id);
    if (!student) return res.status(404).json({ message: 'Student not found' });
    
    await User.findOneAndDelete({ rollNo: student.rollNo.toUpperCase() });
    await Student.findByIdAndDelete(req.params.id);
    
    res.json({ message: 'Student deleted' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
