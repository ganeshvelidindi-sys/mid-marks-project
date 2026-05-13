const express = require('express');
const router  = express.Router();
const Section = require('../models/Section');
const { protect, authorize } = require('../middleware/auth');

// GET all sections (used by HOD and Faculty)
router.get('/', protect, async (req, res) => {
  try {
    const { department, semester } = req.query;
    const filter = { isActive: true };
    if (department) filter.department = department;
    if (semester)   filter.semester   = Number(semester);

    const sections = await Section.find(filter)
      .populate('department', 'name code')
      .sort({ semester: 1, name: 1 });
    res.json({ success: true, sections });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

module.exports = router;
