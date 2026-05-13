const express    = require('express');
const router     = express.Router();
const mongoose   = require('mongoose');
const User       = require('../models/User');
const Department = require('../models/Department');
const Subject    = require('../models/Subject');
const Section    = require('../models/Section');
const Marks      = require('../models/Marks');
const { protect, authorize } = require('../middleware/auth');

router.use(protect, authorize('admin'));

// ── Dashboard stats ───────────────────────────────────────────
router.get('/stats', async (req, res) => {
  try {
    const [totalStudents, totalFaculty, totalDepartments, totalSubjects, totalMarksEntries] = await Promise.all([
      User.countDocuments({ role: 'student', isActive: true }),
      User.countDocuments({ role: 'faculty', isHod: false, isActive: true }),
      Department.countDocuments({ isActive: true }),
      Subject.countDocuments({ isActive: true }),
      Marks.countDocuments()
    ]);
    // HODs = faculty with isHod true
    const totalHods = await User.countDocuments({ role: 'faculty', isHod: true, isActive: true });

    const studentsByDept = await User.aggregate([
      { $match: { role: 'student', isActive: true } },
      { $group: { _id: '$department', count: { $sum: 1 } } },
      { $lookup: { from: 'departments', localField: '_id', foreignField: '_id', as: 'dept' } },
      { $unwind: { path: '$dept', preserveNullAndEmptyArrays: true } },
      { $project: { deptName: '$dept.name', count: 1 } }
    ]);
    const studentsBySem = await User.aggregate([
      { $match: { role: 'student', isActive: true } },
      { $group: { _id: '$semester', count: { $sum: 1 } } },
      { $sort: { _id: 1 } }
    ]);
    res.json({ success: true, stats: { totalStudents, totalFaculty, totalHods, totalDepartments, totalSubjects, totalMarksEntries }, studentsByDept, studentsBySem });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// ── Department CRUD ───────────────────────────────────────────
router.get('/departments', async (req, res) => {
  try {
    const departments = await Department.find().sort({ name: 1 });
    res.json({ success: true, departments });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

router.post('/departments', async (req, res) => {
  try {
    const dept = await Department.create(req.body);
    res.status(201).json({ success: true, department: dept });
  } catch (err) {
    if (err.code === 11000) return res.status(400).json({ message: 'Department already exists' });
    res.status(500).json({ message: err.message });
  }
});

router.put('/departments/:id', async (req, res) => {
  try {
    const dept = await Department.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.json({ success: true, department: dept });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

router.put('/departments/:id/toggle', async (req, res) => {
  try {
    const dept = await Department.findById(req.params.id);
    if (!dept) return res.status(404).json({ message: 'Department not found' });
    dept.isActive = !dept.isActive;
    await dept.save();
    res.json({ success: true, department: dept, message: `Department ${dept.isActive ? 'activated' : 'deactivated'}` });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

router.delete('/departments/:id', async (req, res) => {
  try {
    await Department.findByIdAndUpdate(req.params.id, { isActive: false });
    res.json({ success: true, message: 'Department deactivated' });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// ── Section CRUD ─────────────────────────────────────────────
router.get('/sections', async (req, res) => {
  try {
    const { department, semester } = req.query;
    const filter = {};
    if (department) filter.department = department;
    if (semester)   filter.semester   = Number(semester);
    const sections = await Section.find(filter)
      .populate('department', 'name code')
      .sort({ semester: 1, name: 1 });
    res.json({ success: true, sections });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

router.post('/sections', async (req, res) => {
  try {
    const { name, department, semester } = req.body;
    if (!name || !department || !semester)
      return res.status(400).json({ message: 'Name, department and semester are required' });
    const section = await Section.create({ name: name.toUpperCase(), department, semester });
    const populated = await Section.findById(section._id).populate('department', 'name code');
    res.status(201).json({ success: true, section: populated });
  } catch (err) {
    if (err.code === 11000) return res.status(400).json({ message: 'Section already exists for this department & semester' });
    res.status(500).json({ message: err.message });
  }
});


router.put('/sections/:id', async (req, res) => {
  try {
    const section = await Section.findByIdAndUpdate(req.params.id, req.body, { new: true })
      .populate('department', 'name code');
    if (!section) return res.status(404).json({ message: 'Section not found' });
    res.json({ success: true, section });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

router.delete('/sections/:id', async (req, res) => {
  try {
    await Section.findByIdAndUpdate(req.params.id, { isActive: false });
    res.json({ success: true, message: 'Section deactivated' });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// ── User CRUD ─────────────────────────────────────────────────
router.get('/users', async (req, res) => {
  try {
    const { role, department } = req.query;
    const filter = {};
    if (role)       filter.role       = role;
    if (department) filter.department = department;
    const users = await User.find(filter)
      .populate('department', 'name code')
      .populate('hodDepartments', 'name code')
      .populate('sectionId',  'name semester')
      .select('-password')
      .sort({ createdAt: -1 });
    res.json({ success: true, users });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

router.post('/users', async (req, res) => {
  try {
    const { name, rollNumber, role, department, semester, section, sectionId } = req.body;
    const password = rollNumber.toUpperCase();

    if (role === 'student' && !department)
      return res.status(400).json({ message: 'Department is required for students' });
    if (role === 'student' && !semester)
      return res.status(400).json({ message: 'Semester is required for students' });

    const user = await User.create({
      name, rollNumber: rollNumber.toUpperCase(), password, role,
      // Faculty: department is informational (stored but not required)
      department: department || null,
      semester:   semester   || null,
      section:    section    || null,
      sectionId:  sectionId  || null
    });
    const populated = await User.findById(user._id)
      .populate('department', 'name code')
      .populate('hodDepartments', 'name code')
      .populate('sectionId',  'name semester')
      .select('-password');
    res.status(201).json({ success: true, user: populated });
  } catch (err) {
    if (err.code === 11000) return res.status(400).json({ message: 'Roll number already exists' });
    res.status(500).json({ message: err.message });
  }
});

router.put('/users/:id', async (req, res) => {
  try {
    const { password, ...updateData } = req.body;
    const user = await User.findByIdAndUpdate(req.params.id, updateData, { new: true })
      .populate('department', 'name code')
      .populate('hodDepartments', 'name code')
      .populate('sectionId',  'name semester')
      .select('-password');
    res.json({ success: true, user });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

router.put('/users/:id/toggle', async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ message: 'User not found' });
    user.isActive = !user.isActive;
    await user.save();
    res.json({ success: true, message: `User ${user.isActive ? 'activated' : 'deactivated'}` });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

router.delete('/users/:id', async (req, res) => {
  try {
    await User.findByIdAndUpdate(req.params.id, { isActive: false });
    res.json({ success: true, message: 'User deactivated' });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

router.put('/users/:id/reset-password', async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ message: 'User not found' });
    user.password = user.rollNumber;
    user.mustChangePassword = true;
    await user.save();
    res.json({ success: true, message: 'Password reset to roll number' });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// ── Promote faculty to HOD ────────────────────────────────────
router.put('/users/:id/promote-hod', async (req, res) => {
  try {
    const { departmentId } = req.body;
    if (!departmentId) return res.status(400).json({ message: 'Department ID is required' });
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ message: 'User not found' });
    if (user.role !== 'faculty') return res.status(400).json({ message: 'Only faculty can be promoted to HOD' });
    const dept = await Department.findById(departmentId);
    if (!dept) return res.status(404).json({ message: 'Department not found' });
    if (!user.hodDepartments.map(d => d.toString()).includes(departmentId)) {
      user.hodDepartments.push(departmentId);
    }
    user.isHod = true;
    await user.save();
    const populated = await User.findById(user._id)
      .populate('department', 'name code')
      .populate('hodDepartments', 'name code')
      .select('-password');
    res.json({ success: true, user: populated, message: `${user.name} promoted to HOD of ${dept.name}` });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// ── Demote HOD ────────────────────────────────────────────────
router.put('/users/:id/demote-hod', async (req, res) => {
  try {
    const { departmentId } = req.body;
    if (!departmentId) return res.status(400).json({ message: 'Department ID is required' });
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ message: 'User not found' });
    user.hodDepartments = user.hodDepartments.filter(d => d.toString() !== departmentId);
    if (user.hodDepartments.length === 0) user.isHod = false;
    await user.save();
    const dept = await Department.findById(departmentId);
    const populated = await User.findById(user._id)
      .populate('department', 'name code')
      .populate('hodDepartments', 'name code')
      .select('-password');
    res.json({ success: true, user: populated, message: `${user.name} demoted from HOD of ${dept?.name}` });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// ── HOD detail list (for dashboard stat card) ─────────────────
router.get('/hods', async (req, res) => {
  try {
    const hods = await User.find({ role: 'faculty', isHod: true, isActive: true })
      .populate('hodDepartments', 'name code')
      .select('-password')
      .sort({ name: 1 });
    res.json({ success: true, hods });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// ── All subjects ──────────────────────────────────────────────
router.get('/subjects', async (req, res) => {
  try {
    const subjects = await Subject.find({ isActive: true })
      .populate('department', 'name code')
      .sort({ semester: 1, name: 1 });
    res.json({ success: true, subjects });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// ── All marks ─────────────────────────────────────────────────
router.get('/marks', async (req, res) => {
  try {
    const marks = await Marks.find()
      .populate('student', 'name rollNumber semester section department')
      .populate('subject', 'name code semester')
      .populate('faculty', 'name')
      .sort({ createdAt: -1 })
      .limit(2000);
    res.json({ success: true, marks });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// ── Final Marks (admin view — all depts) ──────────────────────
router.get('/final-marks', async (req, res) => {
  try {
    const { semester, department } = req.query;
    const filter = { status: 'approved' };
    if (semester)   filter.semester   = Number(semester);
    if (department) filter.department = department;

    const allMarks = await Marks.find(filter)
      .populate('student', 'name rollNumber semester section department isActive')
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
