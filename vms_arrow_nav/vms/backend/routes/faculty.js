const express  = require('express');
const router   = express.Router();
const mongoose = require('mongoose');
const User     = require('../models/User');
const Subject  = require('../models/Subject');
const Marks    = require('../models/Marks');
const { protect, authorize } = require('../middleware/auth');

router.use(protect, authorize('faculty', 'admin'));

// ── Dashboard stats ───────────────────────────────────────────
router.get('/stats', async (req, res) => {
  try {
    const assignedSubjects = await Subject.countDocuments({
      isActive: true,
      'assignments.faculty': req.user._id
    });
    const [submittedMarks, pendingMarks, approvedMarks, rejectedMarks] = await Promise.all([
      Marks.countDocuments({ faculty: req.user._id }),
      Marks.countDocuments({ faculty: req.user._id, status: 'submitted' }),
      Marks.countDocuments({ faculty: req.user._id, status: 'approved' }),
      Marks.countDocuments({ faculty: req.user._id, status: 'rejected' })
    ]);
    res.json({ success: true, stats: { submittedMarks, pendingMarks, approvedMarks, rejectedMarks, assignedSubjects } });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// ── Get subjects assigned to THIS faculty (global — no dept filter) ─
router.get('/subjects', async (req, res) => {
  try {
    const { semester } = req.query;
    if (!semester) return res.status(400).json({ message: 'Semester is required' });

    const allSubjects = await Subject.find({
      semester: Number(semester), isActive: true,
      'assignments.faculty': req.user._id
    })
      .populate('assignments.section', 'name semester')
      .populate('assignments.faculty', 'name');

    const result = allSubjects.map(subj => {
      const myAssignments = subj.assignments.filter(
        a => a.faculty && a.faculty._id.toString() === req.user._id.toString()
      );
      return {
        _id:         subj._id,
        name:        subj.name,
        code:        subj.code,
        semester:    subj.semester,
        department:  subj.department,
        maxMidMarks: subj.maxMidMarks,
        mySections:  myAssignments.map(a => ({
          sectionId:    a.section?._id,
          sectionName:  a.section?.name,
          assignmentId: a._id
        })).filter(a => a.sectionId)
      };
    });

    res.json({ success: true, subjects: result });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// ── Load mark sheet for a subject+section+midExam ─────────────
router.get('/marks/sheet', async (req, res) => {
  try {
    const { semester, subjectId, midExam, sectionId } = req.query;
    if (!semester || !subjectId || !midExam || !sectionId)
      return res.status(400).json({ message: 'semester, subjectId, midExam and sectionId are required' });

    const sectionObjId = new mongoose.Types.ObjectId(sectionId);
    const subjectObjId = new mongoose.Types.ObjectId(subjectId);

    // Verify this faculty is assigned to this subject+section (no dept filter)
    const subject = await Subject.findOne({
      _id: subjectObjId, isActive: true,
      assignments: { $elemMatch: { faculty: req.user._id, section: sectionObjId } }
    });
    if (!subject) return res.status(403).json({ message: '❌ You are not assigned to this subject for this section.' });

    // Get students in this section (section-based, not department-based)
    const students = await User.find({
      role: 'student',
      semester: Number(semester),
      sectionId: sectionObjId,
      isActive: true
    }).select('name rollNumber section department').sort({ name: 1 });

    // Get existing marks
    const existing = await Marks.find({
      subject: subjectObjId,
      semester: Number(semester),
      midExam,
      student: { $in: students.map(s => s._id) }
    });

    const map = {};
    existing.forEach(m => { map[m.student.toString()] = m; });

    const sheet = students.map(s => ({ student: s, marks: map[s._id.toString()] || null }));
    res.json({ success: true, sheet });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// ── Save marks ────────────────────────────────────────────────
router.post('/marks', async (req, res) => {
  try {
    const { subjectId, semester, midExam, sectionId, marksData } = req.body;
    if (!subjectId || !semester || !midExam || !sectionId || !marksData?.length)
      return res.status(400).json({ message: 'All fields required' });

    const sectionObjId = new mongoose.Types.ObjectId(sectionId);
    const subjectObjId = new mongoose.Types.ObjectId(subjectId);

    // Verify assignment (no dept filter)
    const subject = await Subject.findOne({
      _id: subjectObjId, isActive: true,
      assignments: { $elemMatch: { faculty: req.user._id, section: sectionObjId } }
    });
    if (!subject) return res.status(403).json({ message: '❌ You are not assigned to this subject for this section.' });

    const results = [];
    for (const entry of marksData) {
      const { studentId, q1, q2, q3, q4, q5, q6, assignmentMarks, shaMarks } = entry;
      const existing = await Marks.findOne({ student: studentId, subject: subjectObjId, midExam });
      if (existing?.isLocked) { results.push({ studentId, status: 'skipped' }); continue; }

      // Get student's department for the marks record
      const student = await User.findById(studentId).select('department');

      const doc = existing || new Marks({
        student:    studentId,
        subject:    subjectObjId,
        faculty:    req.user._id,
        department: student?.department || null,
        semester:   Number(semester),
        midExam
      });
      doc.faculty         = req.user._id;
      doc.q1              = Number(q1) || 0;
      doc.q2              = Number(q2) || 0;
      doc.q3              = Number(q3) || 0;
      doc.q4              = Number(q4) || 0;
      doc.q5              = Number(q5) || 0;
      doc.q6              = Number(q6) || 0;
      doc.assignmentMarks = Number(assignmentMarks) || 0;
      doc.shaMarks        = Number(shaMarks) || 0;
      doc.status          = 'submitted';
      await doc.save();
      results.push({ studentId, status: 'saved' });
    }
    res.json({ success: true, message: 'Marks saved', results });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// ── View marks ────────────────────────────────────────────────
router.get('/marks', async (req, res) => {
  try {
    const { semester, subjectId, midExam } = req.query;
    const filter = { faculty: req.user._id };
    if (semester)  filter.semester = Number(semester);
    if (subjectId) filter.subject  = subjectId;
    if (midExam)   filter.midExam  = midExam;
    const marks = await Marks.find(filter)
      .populate('student', 'name rollNumber semester section department')
      .populate('subject',  'name code semester')
      .sort({ createdAt: -1 });
    res.json({ success: true, marks });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// ── Final Marks (both mids approved for a student+subject) ────
router.get('/final-marks', async (req, res) => {
  try {
    const { semester } = req.query;
    const filter = { faculty: req.user._id, status: 'approved' };
    if (semester) filter.semester = Number(semester);

    const allMarks = await Marks.find(filter)
      .populate('student', 'name rollNumber semester section isActive')
      .populate('subject', 'name code semester')
      .sort({ createdAt: -1 });

    // Only active students
    const activeMarks = allMarks.filter(m => m.student?.isActive !== false);

    // Group by student+subject
    const grouped = {};
    activeMarks.forEach(m => {
      const key = `${m.student?._id}-${m.subject?._id}`;
      if (!grouped[key]) grouped[key] = { student: m.student, subject: m.subject, mid1: null, mid2: null };
      if (m.midExam === 'Mid-1') grouped[key].mid1 = m;
      if (m.midExam === 'Mid-2') grouped[key].mid2 = m;
    });

    // Only pairs where BOTH mids are approved
    const finalMarks = Object.values(grouped)
      .filter(g => g.mid1 && g.mid2)
      .map(g => {
        const m1 = g.mid1.totalMarks, m2 = g.mid2.totalMarks;
        const higher = Math.max(m1, m2), lower = Math.min(m1, m2);
        const final  = Math.round(0.8 * higher + 0.2 * lower);
        return {
          student:    g.student,
          subject:    g.subject,
          faculty:    g.faculty || g.mid1.faculty,
          mid1: {
            q1: g.mid1.q1, q2: g.mid1.q2, q3: g.mid1.q3,
            q4: g.mid1.q4, q5: g.mid1.q5, q6: g.mid1.q6,
            questionTotal: g.mid1.questionTotal,
            questionHalf:  g.mid1.questionHalf,
            shaMarks:      g.mid1.shaMarks,
            assignmentMarks: g.mid1.assignmentMarks,
            totalMarks:    m1,
          },
          mid2: {
            q1: g.mid2.q1, q2: g.mid2.q2, q3: g.mid2.q3,
            q4: g.mid2.q4, q5: g.mid2.q5, q6: g.mid2.q6,
            questionTotal: g.mid2.questionTotal,
            questionHalf:  g.mid2.questionHalf,
            shaMarks:      g.mid2.shaMarks,
            assignmentMarks: g.mid2.assignmentMarks,
            totalMarks:    m2,
          },
          mid1Marks:  m1,
          mid2Marks:  m2,
          finalMarks: final,
          semester:   g.mid1.semester,
        };
      });

    res.json({ success: true, finalMarks });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

module.exports = router;
