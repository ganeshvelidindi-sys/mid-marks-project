const express = require('express');
const router  = express.Router();
const User    = require('../models/User');
const Subject = require('../models/Subject');
const Section = require('../models/Section');
const Marks   = require('../models/Marks');
const { protect, authorize } = require('../middleware/auth');

router.use(protect, authorize('hod', 'faculty'));

// Get effective HOD department ID
// Frontend sends x-hod-dept header with selected department ID when acting as HOD
function getHodDeptId(req) {
  const fromHeader = req.headers['x-hod-dept'];
  if (fromHeader) return fromHeader;
  if (req.user.hodDepartments && req.user.hodDepartments.length > 0) {
    const d = req.user.hodDepartments[0];
    return d._id ? d._id.toString() : d.toString();
  }
  if (req.user.department) {
    const d = req.user.department;
    return d._id ? d._id.toString() : d.toString();
  }
  return null;
}

// ── Dashboard stats ───────────────────────────────────────────
router.get('/stats', async (req, res) => {
  try {
    const deptId = getHodDeptId(req);
    if (!deptId) return res.status(400).json({ message: 'No department context found' });

    const mongoose = require('mongoose');
    const deptObjId = new mongoose.Types.ObjectId(deptId);

    const [totalStudents, totalSubjects, pendingMarks, approvedMarks, rejectedMarks, lockedMarks, totalSections] = await Promise.all([
      User.countDocuments({ role: 'student', department: deptObjId, isActive: true }),
      Subject.countDocuments({ department: deptObjId, isActive: true }),
      Marks.countDocuments({ department: deptObjId, status: 'submitted' }),
      Marks.countDocuments({ department: deptObjId, status: 'approved' }),
      Marks.countDocuments({ department: deptObjId, status: 'rejected' }),
      Marks.countDocuments({ department: deptObjId, isLocked: true }),
      Section.countDocuments({ department: deptObjId, isActive: true })
    ]);

    // All active faculty in this dept (including those not assigned to any subject)
    const totalFaculty = await User.countDocuments({ role: 'faculty', isHod: false, department: deptObjId, isActive: true });

    const studentsBySem = await User.aggregate([
      { $match: { role: 'student', department: deptObjId, isActive: true } },
      { $group: { _id: '$semester', count: { $sum: 1 } } },
      { $sort: { _id: 1 } }
    ]);
    const subjectsBySem = await Subject.aggregate([
      { $match: { department: deptObjId, isActive: true } },
      { $group: { _id: '$semester', count: { $sum: 1 } } },
      { $sort: { _id: 1 } }
    ]);
    res.json({ success: true, stats: { totalStudents, totalFaculty, totalSubjects, pendingMarks, approvedMarks, rejectedMarks, lockedMarks, totalSections }, studentsBySem, subjectsBySem });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// ── Sections in dept ──────────────────────────────────────────
router.get('/sections', async (req, res) => {
  try {
    const { semester } = req.query;
    const deptId = getHodDeptId(req);
    const mongoose = require('mongoose');
    const deptObjId = new mongoose.Types.ObjectId(deptId);
    const filter = { department: deptObjId, isActive: true };
    if (semester) filter.semester = Number(semester);
    const sections = await Section.find(filter).sort({ semester: 1, name: 1 });
    res.json({ success: true, sections });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// ── Faculty list — all active faculty in HOD's department ──────
router.get('/faculty', async (req, res) => {
  try {
    const deptId = getHodDeptId(req);
    const mongoose = require('mongoose');
    const deptObjId = new mongoose.Types.ObjectId(deptId);
    const faculty = await User.find({ role: 'faculty', isHod: false, department: deptObjId, isActive: true })
      .select('-password').populate('department', 'name').sort({ name: 1 });
    res.json({ success: true, faculty });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// ── Subject CRUD ──────────────────────────────────────────────
router.get('/subjects', async (req, res) => {
  try {
    const { semester } = req.query;
    const deptId = getHodDeptId(req);
    const mongoose = require('mongoose');
    const deptObjId = new mongoose.Types.ObjectId(deptId);
    const filter = { department: deptObjId, isActive: true };
    if (semester) filter.semester = Number(semester);
    const subjects = await Subject.find(filter)
      .populate('assignments.section', 'name semester')
      .populate('assignments.faculty', 'name rollNumber')
      .sort({ semester: 1, name: 1 });
    res.json({ success: true, subjects });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

router.post('/subjects', async (req, res) => {
  try {
    const { name, code, semester, credits, maxMidMarks } = req.body;
    const deptId = getHodDeptId(req);
    const subject = await Subject.create({
      name, code, semester, credits, maxMidMarks,
      department: deptId,
      assignments: []
    });
    res.status(201).json({ success: true, subject });
  } catch (err) {
    if (err.code === 11000) return res.status(400).json({ message: 'Subject code already exists in this department' });
    res.status(500).json({ message: err.message });
  }
});

router.put('/subjects/:id', async (req, res) => {
  try {
    const { name, code, semester, credits, maxMidMarks } = req.body;
    const deptId = getHodDeptId(req);
    const mongoose = require('mongoose');
    const deptObjId = new mongoose.Types.ObjectId(deptId);
    const subject = await Subject.findOneAndUpdate(
      { _id: req.params.id, department: deptObjId },
      { name, code, semester, credits, maxMidMarks }, { new: true }
    );
    if (!subject) return res.status(404).json({ message: 'Subject not found' });
    res.json({ success: true, subject });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

router.delete('/subjects/:id', async (req, res) => {
  try {
    const deptId = getHodDeptId(req);
    const mongoose = require('mongoose');
    const deptObjId = new mongoose.Types.ObjectId(deptId);
    await Subject.findOneAndUpdate(
      { _id: req.params.id, department: deptObjId },
      { isActive: false }
    );
    res.json({ success: true });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// ── Assign section+faculty to subject ─────────────────────────
router.post('/subjects/:id/assign', async (req, res) => {
  try {
    const { sectionId, facultyId } = req.body;
    if (!sectionId || !facultyId)
      return res.status(400).json({ message: 'Section and faculty are required' });

    const deptId = getHodDeptId(req);
    const mongoose = require('mongoose');
    const deptObjId = new mongoose.Types.ObjectId(deptId);

    const subject = await Subject.findOne({ _id: req.params.id, department: deptObjId });
    if (!subject) return res.status(404).json({ message: 'Subject not found' });

    subject.assignments = subject.assignments.filter(a => a.section.toString() !== sectionId);
    subject.assignments.push({ section: sectionId, faculty: facultyId });
    await subject.save();

    const populated = await Subject.findById(subject._id)
      .populate('assignments.section', 'name semester')
      .populate('assignments.faculty', 'name rollNumber');
    res.json({ success: true, subject: populated });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// ── Remove section assignment ─────────────────────────────────
router.delete('/subjects/:id/assign/:assignmentId', async (req, res) => {
  try {
    const deptId = getHodDeptId(req);
    const mongoose = require('mongoose');
    const deptObjId = new mongoose.Types.ObjectId(deptId);
    const subject = await Subject.findOne({ _id: req.params.id, department: deptObjId });
    if (!subject) return res.status(404).json({ message: 'Subject not found' });
    subject.assignments = subject.assignments.filter(a => a._id.toString() !== req.params.assignmentId);
    await subject.save();
    res.json({ success: true, message: 'Assignment removed' });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// ── Students ──────────────────────────────────────────────────
router.get('/students', async (req, res) => {
  try {
    const { semester, section } = req.query;
    const deptId = getHodDeptId(req);
    const mongoose = require('mongoose');
    const deptObjId = new mongoose.Types.ObjectId(deptId);
    const filter = { role: 'student', department: deptObjId, isActive: true };
    if (semester) filter.semester = Number(semester);
    if (section)  filter.section  = section.toUpperCase();
    const students = await User.find(filter).select('-password').sort({ semester: 1, name: 1 });
    res.json({ success: true, students });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// ── Promote students ──────────────────────────────────────────
router.post('/promote', async (req, res) => {
  try {
    const { studentIds, fromSemester } = req.body;
    if (!studentIds?.length) return res.status(400).json({ message: 'No students selected' });
    if (fromSemester >= 8)   return res.status(400).json({ message: 'Semester 8 cannot be promoted' });
    const deptId = getHodDeptId(req);
    const mongoose = require('mongoose');
    const deptObjId = new mongoose.Types.ObjectId(deptId);
    const result = await User.updateMany(
      { _id: { $in: studentIds }, department: deptObjId, semester: fromSemester, isActive: true },
      { $set: { semester: fromSemester + 1 } }
    );
    res.json({ success: true, message: `${result.modifiedCount} student(s) promoted to Semester ${fromSemester + 1}` });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// ── Marks review ──────────────────────────────────────────────
router.get('/marks', async (req, res) => {
  try {
    const { semester, subject, status, midExam, section } = req.query;
    const deptId = getHodDeptId(req);
    const mongoose = require('mongoose');
    const deptObjId = new mongoose.Types.ObjectId(deptId);
    const filter = { department: deptObjId };
    if (semester) filter.semester = Number(semester);
    if (subject)  filter.subject  = subject;
    if (status)   filter.status   = status;
    if (midExam)  filter.midExam  = midExam;

    let marks = await Marks.find(filter)
      .populate('student', 'name rollNumber semester section department')
      .populate('subject',  'name code')
      .populate('faculty',  'name rollNumber')
      .sort({ createdAt: -1 });

    if (section) marks = marks.filter(m => m.student?.section === section.toUpperCase());
    res.json({ success: true, marks });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

router.put('/marks/:id/approve', async (req, res) => {
  try {
    const deptId = getHodDeptId(req);
    const mongoose = require('mongoose');
    const deptObjId = new mongoose.Types.ObjectId(deptId);
    const marks = await Marks.findOneAndUpdate(
      { _id: req.params.id, department: deptObjId },
      { status: 'approved', hodComment: req.body.comment || '' }, { new: true }
    );
    res.json({ success: true, marks });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

router.put('/marks/:id/reject', async (req, res) => {
  try {
    const deptId = getHodDeptId(req);
    const mongoose = require('mongoose');
    const deptObjId = new mongoose.Types.ObjectId(deptId);
    const marks = await Marks.findOneAndUpdate(
      { _id: req.params.id, department: deptObjId },
      { status: 'rejected', hodComment: req.body.comment || '' }, { new: true }
    );
    res.json({ success: true, marks });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

router.put('/marks/:id/lock', async (req, res) => {
  try {
    const deptId = getHodDeptId(req);
    const mongoose = require('mongoose');
    const deptObjId = new mongoose.Types.ObjectId(deptId);
    const marks = await Marks.findOneAndUpdate(
      { _id: req.params.id, department: deptObjId, status: 'approved' },
      { isLocked: true }, { new: true }
    );
    res.json({ success: true, message: 'Marks locked' });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// ── Final Marks (both mids approved) ─────────────────────────
router.get('/final-marks', async (req, res) => {
  try {
    const { semester } = req.query;
    const deptId = getHodDeptId(req);
    const mongoose = require('mongoose');
    const deptObjId = new mongoose.Types.ObjectId(deptId);
    const filter = { department: deptObjId, status: 'approved' };
    if (semester) filter.semester = Number(semester);

    const allMarks = await Marks.find(filter)
      .populate('student', 'name rollNumber semester section isActive')
      .populate('subject', 'name code semester')
      .populate('faculty', 'name')
      .sort({ createdAt: -1 });

    const activeMarks = allMarks.filter(m => m.student?.isActive !== false);

    const grouped = {};
    activeMarks.forEach(m => {
      const key = `${m.student?._id}-${m.subject?._id}`;
      if (!grouped[key]) grouped[key] = { student: m.student, subject: m.subject, faculty: m.faculty, mid1: null, mid2: null };
      if (m.midExam === 'Mid-1') grouped[key].mid1 = m;
      if (m.midExam === 'Mid-2') grouped[key].mid2 = m;
    });

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
