const express = require('express');
const router = express.Router();
const Marks = require('../models/Marks');
const { protect, authorize } = require('../middleware/auth');
const { sendMarksApprovedEmail, sendMarksSubmittedEmail, sendMarksRejectedEmail } = require('../utils/emailService');

// Helper: calculate internal marks
function calcInternalMarks(m1Total, m2Total) {
  const best = Math.max(m1Total, m2Total);
  const second = Math.min(m1Total, m2Total);
  const internal = (best * 0.8) + (second * 0.2);
  return { bestMidTotal: best, secondMidTotal: second, internalMarks: Math.round(internal * 2) / 2 };
}

// GET marks with filters
router.get('/', protect, async (req, res) => {
  try {
    const { branch, semester, section, subjectCode, studentRollNo, status, academicYear } = req.query;
    let filter = {};
    if (branch) filter.branch = branch;
    if (semester) filter.semester = semester;
    if (section) filter.section = section;
    if (subjectCode) filter.subjectCode = subjectCode;
    if (studentRollNo) filter.studentRollNo = studentRollNo;
    if (status) filter.status = status;
    if (academicYear) filter.academicYear = academicYear;
    // Restrict faculty to own submissions
    if (req.user.role === 'faculty') filter.facultyId = req.user.id;
    // Restrict HOD to own department
    if (req.user.role === 'hod') filter.branch = req.user.department;
    const marks = await Marks.find(filter).sort({ studentRollNo: 1 });
    res.json(marks);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET marks for student (self)
router.get('/student/me', protect, authorize('student'), async (req, res) => {
  try {
    const User = require('../models/User');
    const user = await User.findById(req.user.id);
    const marks = await Marks.find({ studentRollNo: user.rollNo }).sort({ subjectCode: 1 });
    res.json(marks);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST save/update marks (faculty/classteacher/hod)
router.post('/save', protect, authorize('faculty', 'classteacher', 'hod'), async (req, res) => {
  try {
    const { branch, semester, section, subjectCode, subjectName, marksData } = req.body;
    const results = [];
    
    // Helper to calculate Exam Marks: Part A (Q1 max 5) + Best 2 from Part B (Q2, Q3, Q4 max 10 each)
    const calcExamTotal = (q1, q2, q3, q4) => {
      const clampedQ1 = Math.min(q1 || 0, 5);
      const partB = [q2||0, q3||0, q4||0].sort((a,b) => b - a); // sort descending
      return Math.min(clampedQ1 + partB[0] + partB[1], 25);
    };

    for (const entry of marksData) {
      // Calculate mid totals securely
      const m1Total = calcExamTotal(entry.mid1?.q1, entry.mid1?.q2, entry.mid1?.q3, entry.mid1?.q4);
      const m2Total = calcExamTotal(entry.mid2?.q1, entry.mid2?.q2, entry.mid2?.q3, entry.mid2?.q4);
      const m1Grand = Math.min(m1Total + Math.min(entry.mid1?.assignment||0, 5), 30);
      const m2Grand = Math.min(m2Total + Math.min(entry.mid2?.assignment||0, 5), 30);
      const calc = calcInternalMarks(m1Grand, m2Grand);

      const doc = await Marks.findOneAndUpdate(
        { branch, semester, section, subjectCode, studentRollNo: entry.studentRollNo },
        {
          studentName: entry.studentName,
          branch, semester, section, subjectCode, subjectName,
          facultyId: req.user.id,
          facultyName: req.user.name,
          mid1: { ...entry.mid1, total: m1Total, grandTotal: m1Grand },
          mid2: { ...entry.mid2, total: m2Total, grandTotal: m2Grand },
          ...calc,
          status: 'draft',
          $push: { editHistory: { editedBy: req.user.name, changes: 'Marks updated', editedAt: new Date() } }
        },
        { upsert: true, new: true }
      );
      results.push(doc);
    }
    res.json({ message: `${results.length} records saved successfully`, results });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST submit marks for HOD approval (faculty/classteacher/hod)
router.post('/submit', protect, authorize('faculty', 'classteacher', 'hod'), async (req, res) => {
  try {
    const { branch, semester, section, subjectCode } = req.body;
    const result = await Marks.updateMany(
      { branch, semester, section, subjectCode, facultyId: req.user.id, status: 'draft' },
      { status: 'submitted', submittedAt: new Date() }
    );

    // 📧 Email HOD of this department
    try {
      const User = require('../models/User');
      const hod = await User.findOne({ role: 'hod', department: branch, active: true });
      const oneRecord = await Marks.findOne({ branch, semester, section, subjectCode });
      if (hod?.email) {
        sendMarksSubmittedEmail(
          hod.email, hod.name,
          req.user.name,
          oneRecord?.subjectName || subjectCode, subjectCode,
          section, semester
        );
      }
    } catch (emailErr) { console.warn('Submit email error:', emailErr.message); }

    res.json({ message: `${result.modifiedCount} records submitted for approval` });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST approve marks (HOD)
router.post('/approve', protect, authorize('hod'), async (req, res) => {
  try {
    const { branch, semester, section, subjectCode, remarks } = req.body;
    const result = await Marks.updateMany(
      { branch, semester, section, subjectCode, status: 'submitted' },
      {
        status: 'approved',
        approvedAt: new Date(),
        hodId: req.user.id,
        hodName: req.user.name,
        hodRemarks: remarks || ''
      }
    );

    // 📧 Email each affected student
    try {
      const User = require('../models/User');
      const approvedDocs = await Marks.find({ branch, semester, section, subjectCode, status: 'approved' });
      const subjectName = approvedDocs[0]?.subjectName || subjectCode;
      for (const doc of approvedDocs) {
        const student = await User.findOne({ rollNo: doc.studentRollNo, role: 'student' });
        if (student?.email) {
          sendMarksApprovedEmail(
            student.email, student.name,
            subjectName, subjectCode, section, semester
          );
        }
      }
    } catch (emailErr) { console.warn('Approve email error:', emailErr.message); }

    res.json({ message: `${result.modifiedCount} records approved and locked` });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST reject marks (HOD)
router.post('/reject', protect, authorize('hod'), async (req, res) => {
  try {
    const { branch, semester, section, subjectCode, remarks } = req.body;

    // Fetch faculty info BEFORE update (need facultyId from existing doc)
    const sampleDoc = await Marks.findOne({ branch, semester, section, subjectCode, status: 'submitted' });

    const result = await Marks.updateMany(
      { branch, semester, section, subjectCode, status: 'submitted' },
      { status: 'rejected', hodRemarks: remarks || '', hodId: req.user.id, hodName: req.user.name }
    );

    // 📧 Email the faculty who submitted
    try {
      if (sampleDoc?.facultyId) {
        const User = require('../models/User');
        const faculty = await User.findById(sampleDoc.facultyId);
        if (faculty?.email) {
          sendMarksRejectedEmail(
            faculty.email, faculty.name,
            sampleDoc.subjectName || subjectCode, subjectCode,
            section, semester, remarks
          );
        }
      }
    } catch (emailErr) { console.warn('Reject email error:', emailErr.message); }

    res.json({ message: `${result.modifiedCount} records rejected`, modifiedCount: result.modifiedCount });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET summary stats
router.get('/stats/summary', protect, authorize('admin', 'hod'), async (req, res) => {
  try {
    const filter = req.user.role === 'hod' ? { branch: req.user.department } : {};
    const [total, submitted, approved, rejected, draft] = await Promise.all([
      Marks.countDocuments(filter),
      Marks.countDocuments({ ...filter, status: 'submitted' }),
      Marks.countDocuments({ ...filter, status: 'approved' }),
      Marks.countDocuments({ ...filter, status: 'rejected' }),
      Marks.countDocuments({ ...filter, status: 'draft' }),
    ]);
    res.json({ total, submitted, approved, rejected, draft });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET analytics data
router.get('/analytics', protect, authorize('admin', 'hod'), async (req, res) => {
  try {
    const { branch, semester, section, academicYear } = req.query;
    
    // Base filter
    const match = { status: 'approved' }; // Analytics typically only on approved data
    if (branch) match.branch = branch;
    if (semester) match.semester = semester;
    if (section) match.section = section;
    if (academicYear) match.academicYear = academicYear;
    if (req.user.role === 'hod') match.branch = req.user.department;

    // 1. Pass/Fail Stats (Internal Marks >= 15 is pass)
    const totalDocs = await Marks.countDocuments(match);
    const passCount = await Marks.countDocuments({ ...match, internalMarks: { $gte: 15 } });
    const failCount = totalDocs - passCount;
    const passFailStats = [
      { name: 'Passed', value: passCount, fill: '#16a34a' },
      { name: 'Failed', value: failCount, fill: '#dc2626' }
    ];

    // 2. Subject Performance (Avg Internal Marks per Subject)
    const subjectAgg = await Marks.aggregate([
      { $match: match },
      { $group: {
          _id: "$subjectCode",
          subjectName: { $first: "$subjectName" },
          avgMarks: { $avg: "$internalMarks" }
      }},
      { $sort: { _id: 1 } }
    ]);
    const subjectPerformance = subjectAgg.map(s => ({
      subject: s._id,
      name: s.subjectName,
      average: Math.round(s.avgMarks * 10) / 10
    }));

    // 3. Trend Comparison (Mid 1 vs Mid 2 Grand Totals)
    const trendAgg = await Marks.aggregate([
      { $match: match },
      { $group: {
          _id: "$subjectCode",
          avgMid1: { $avg: "$mid1.grandTotal" },
          avgMid2: { $avg: "$mid2.grandTotal" }
      }},
      { $sort: { _id: 1 } }
    ]);
    const trendStats = trendAgg.map(t => ({
      subject: t._id,
      Mid1: Math.round(t.avgMid1 * 10) / 10,
      Mid2: Math.round(t.avgMid2 * 10) / 10
    }));

    // 4. Top Performers (Top 10 highest internal marks across all subjects matching filter)
    // For a real student ranking, we should average internal marks per student,
    // but a simple sum or highest internal marks also works. Let's aggregate total marks per student.
    const topPerformersAgg = await Marks.aggregate([
      { $match: match },
      { $group: {
          _id: "$studentRollNo",
          studentName: { $first: "$studentName" },
          totalInternal: { $sum: "$internalMarks" },
          totalMid1: { $sum: "$mid1.grandTotal" },
          totalMid2: { $sum: "$mid2.grandTotal" }
      }},
      { $sort: { totalInternal: -1 } },
      { $limit: 10 }
    ]);
    const topPerformers = topPerformersAgg.map((p, i) => ({
      rank: i + 1,
      rollNo: p._id,
      name: p.studentName,
      totalMarks: Math.round(p.totalInternal * 10) / 10,
      mid1Total: p.totalMid1,
      mid2Total: p.totalMid2
    }));

    res.json({
      passFailStats,
      subjectPerformance,
      trendStats,
      topPerformers
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
