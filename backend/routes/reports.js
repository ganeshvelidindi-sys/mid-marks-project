const express = require('express');
const router = express.Router();
const Marks = require('../models/Marks');
const Student = require('../models/Student');
const { protect } = require('../middleware/auth');

// GET class-wise report
router.get('/class', protect, async (req, res) => {
  try {
    const { branch, semester, section, subjectCode, academicYear } = req.query;
    let filter = {};
    if (branch) filter.branch = branch;
    if (semester) filter.semester = semester;
    if (section) filter.section = section;
    if (subjectCode) filter.subjectCode = subjectCode;
    if (academicYear) filter.academicYear = academicYear;
    if (req.user.role === 'hod') filter.branch = req.user.department;

    const marks = await Marks.find(filter).sort({ studentRollNo: 1 });
    const stats = {
      total: marks.length,
      passed: marks.filter(m => m.internalMarks >= 12).length,
      failed: marks.filter(m => m.internalMarks < 12).length,
      avgInternal: marks.length ? (marks.reduce((a, b) => a + b.internalMarks, 0) / marks.length).toFixed(2) : 0,
      highest: marks.length ? Math.max(...marks.map(m => m.internalMarks)) : 0,
      lowest: marks.length ? Math.min(...marks.map(m => m.internalMarks)) : 0,
    };
    res.json({ marks, stats });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET subject-wise report
router.get('/subject', protect, async (req, res) => {
  try {
    const { branch, semester, section } = req.query;
    let filter = { status: 'approved' };
    if (branch) filter.branch = branch;
    if (semester) filter.semester = semester;
    if (section) filter.section = section;
    if (req.user.role === 'hod') filter.branch = req.user.department;

    const pipeline = [
      { $match: filter },
      {
        $group: {
          _id: { subjectCode: '$subjectCode', subjectName: '$subjectName' },
          count: { $sum: 1 },
          avgInternal: { $avg: '$internalMarks' },
          highest: { $max: '$internalMarks' },
          lowest: { $min: '$internalMarks' },
        }
      },
      { $sort: { '_id.subjectCode': 1 } }
    ];
    const report = await Marks.aggregate(pipeline);
    res.json(report);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET department-wise report (admin)
router.get('/department', protect, async (req, res) => {
  try {
    const pipeline = [
      { $match: { status: 'approved' } },
      {
        $group: {
          _id: '$branch',
          count: { $sum: 1 },
          avgInternal: { $avg: '$internalMarks' },
          passed: { $sum: { $cond: [{ $gte: ['$internalMarks', 12] }, 1, 0] } },
        }
      },
      { $sort: { _id: 1 } }
    ];
    const report = await Marks.aggregate(pipeline);
    res.json(report);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET toppers report — top students by avg internal marks
router.get('/toppers', protect, async (req, res) => {
  try {
    const { branch, semester, limit = 10 } = req.query;
    let filter = { status: 'approved' };
    if (branch) filter.branch = branch;
    if (semester) filter.semester = semester;
    if (req.user.role === 'hod') filter.branch = req.user.department;

    const pipeline = [
      { $match: filter },
      {
        $group: {
          _id: { rollNo: '$studentRollNo', name: '$studentName', branch: '$branch', semester: '$semester', section: '$section' },
          avgInternal: { $avg: '$internalMarks' },
          totalSubjects: { $sum: 1 },
          totalMarks: { $sum: '$internalMarks' },
          passed: { $sum: { $cond: [{ $gte: ['$internalMarks', 15] }, 1, 0] } },
        }
      },
      { $sort: { avgInternal: -1 } },
      { $limit: parseInt(limit) },
      {
        $project: {
          _id: 0,
          rollNo: '$_id.rollNo',
          name: '$_id.name',
          branch: '$_id.branch',
          semester: '$_id.semester',
          section: '$_id.section',
          avgInternal: { $round: ['$avgInternal', 1] },
          totalSubjects: 1,
          totalMarks: 1,
          passed: 1,
        }
      }
    ];
    const toppers = await Marks.aggregate(pipeline);
    res.json(toppers);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
