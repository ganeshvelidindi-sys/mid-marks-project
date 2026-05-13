const express = require('express');
const router  = express.Router();
const Marks   = require('../models/Marks');
const Subject = require('../models/Subject');
const { protect, authorize } = require('../middleware/auth');

router.use(protect, authorize('student'));

// Helper: compute final marks — rounded to nearest whole number
function computeFinal(m1, m2) {
  const higher = Math.max(m1, m2);
  const lower  = Math.min(m1, m2);
  return Math.round(0.8 * higher + 0.2 * lower);
}

// ── Dashboard stats ──────────────────────────────────────────
router.get('/stats', async (req, res) => {
  try {
    const totalSubjects = await Subject.countDocuments({
      department: req.user.department, semester: req.user.semester, isActive: true
    });
    const allMarks = await Marks.find({ student: req.user._id, status: 'approved' });
    const mid1 = allMarks.filter(m => m.midExam === 'Mid-1');
    const mid2 = allMarks.filter(m => m.midExam === 'Mid-2');
    const avg  = arr => arr.length ? parseFloat((arr.reduce((s,m)=>s+m.totalMarks,0)/arr.length).toFixed(1)) : 0;

    const lockedMid1 = await Marks.find({ student: req.user._id, midExam: 'Mid-1', isLocked: true });
    const lockedMid2 = await Marks.find({ student: req.user._id, midExam: 'Mid-2', isLocked: true });
    const s1 = new Set(lockedMid1.map(m => m.subject.toString()));
    const s2 = new Set(lockedMid2.map(m => m.subject.toString()));
    const finalReadyCount = [...s1].filter(id => s2.has(id)).length;

    res.json({ success: true, stats: {
      currentSemester: req.user.semester, totalSubjects,
      mid1Count: mid1.length, mid2Count: mid2.length,
      avgMid1: avg(mid1), avgMid2: avg(mid2), finalReadyCount
    }});
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// ── Get all marks across ALL semesters ───────────────────────
// Optional filters: ?semester=2&subjectId=xxx&midExam=Mid-1
router.get('/marks', async (req, res) => {
  try {
    const { semester, subjectId, midExam } = req.query;

    // Build marks filter
    const filter = { student: req.user._id };
    if (semester)  filter.semester = Number(semester);
    if (subjectId) filter.subject  = subjectId;
    if (midExam)   filter.midExam  = midExam;

    const allMarks = await Marks.find(filter)
      .populate('subject', 'name code semester')
      .populate('faculty', 'name')
      .sort({ semester: 1, 'subject.name': 1, midExam: 1 });

    // Group by subject
    const grouped = {};
    allMarks.forEach(m => {
      const sid = m.subject?._id?.toString();
      if (!sid) return;
      if (!grouped[sid]) grouped[sid] = { subject: m.subject, mid1: null, mid2: null };
      if (m.midExam === 'Mid-1') grouped[sid].mid1 = m;
      if (m.midExam === 'Mid-2') grouped[sid].mid2 = m;
    });

    // Compute final where both mids locked & approved
    const subjects = Object.values(grouped).map(g => {
      let finalMarks = null, finalVisible = false;
      if (g.mid1?.isLocked && g.mid2?.isLocked &&
          g.mid1?.status === 'approved' && g.mid2?.status === 'approved') {
        finalMarks   = computeFinal(g.mid1.totalMarks, g.mid2.totalMarks);
        finalVisible = true;
      }
      return { ...g, finalMarks, finalVisible };
    });

    // Get all unique semesters the student has marks in
    const semestersWithMarks = [...new Set(allMarks.map(m => m.semester))].sort((a,b)=>a-b);

    res.json({ success: true, subjects, semestersWithMarks });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// ── Get subjects for filter dropdown ────────────────────────
router.get('/subjects', async (req, res) => {
  try {
    const { semester } = req.query;
    const filter = { department: req.user.department, isActive: true };
    if (semester) filter.semester = Number(semester);

    const subjects = await Subject.find(filter).sort({ semester: 1, name: 1 });
    res.json({ success: true, subjects });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

module.exports = router;
