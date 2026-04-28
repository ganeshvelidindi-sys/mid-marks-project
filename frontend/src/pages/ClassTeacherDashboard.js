import React, { useState, useEffect } from 'react';
import Layout from '../components/Layout';
import { getStudents, getMarks } from '../api';
import { useAuth } from '../context/AuthContext';

const NAV = [
  {
    label: 'MAIN', items: [
      { key: 'overview', icon: '📊', label: 'Class Overview' },
      { key: 'students', icon: '🎓', label: 'My Students' },
      { key: 'marks', icon: '📋', label: 'Class Marks' },
    ]
  },
  {
    label: 'FACULTY ROLE', items: [
      { key: 'faculty-portal', icon: '📚', label: 'Subject Marks Entry', path: '/faculty' },
    ]
  },
];

const BRANCHES = ['CSE', 'ECE', 'EEE', 'MECH', 'CIVIL', 'AI&ML', 'IT'];
const SEMS = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII'];
const YEARS = ['I', 'II', 'III', 'IV'];
const SECTIONS = ['A', 'B', 'C', 'D', 'E'];

export default function ClassTeacherDashboard() {
  const { user } = useAuth();
  const [page, setPage] = useState('overview');
  const [branch, setBranch] = useState(user?.department || 'CSE');
  const [semester, setSemester] = useState('');
  const [section, setSection] = useState('');
  const [students, setStudents] = useState([]);
  const [marks, setMarks] = useState([]);
  const [loading, setLoading] = useState(false);

  const loadStudents = async () => {
    if (!semester || !section) return;
    setLoading(true);
    try {
      const r = await getStudents({ branch, semester, section });
      setStudents(r.data);
    } catch (e) { }
    setLoading(false);
  };

  const loadMarks = async () => {
    if (!semester || !section) return;
    setLoading(true);
    try {
      const r = await getMarks({ branch, semester, section });
      setMarks(r.data);
    } catch (e) { }
    setLoading(false);
  };

  useEffect(() => { if (semester && section) { loadStudents(); loadMarks(); } }, [semester, section, branch]);

  // Group marks by student
  const studentMarksMap = {};
  marks.forEach(m => {
    if (!studentMarksMap[m.studentRollNo]) studentMarksMap[m.studentRollNo] = [];
    studentMarksMap[m.studentRollNo].push(m);
  });

  // Unique subjects
  const subjects = [...new Set(marks.map(m => m.subjectCode))];

  return (
    <Layout navItems={NAV} activePage={page} onNavClick={setPage}>
      <div className="page-header">
        <div className="breadcrumb">Class Teacher / <span>{page}</span></div>
        <h2>📋 Class Teacher Dashboard</h2>
        <p>Monitor your class students and their marks</p>
      </div>

      {/* Filters */}
      <div className="card">
        <div className="card-head"><h3>🔍 Select Class</h3></div>
        <div className="card-body">
          <div className="form-grid form-grid-4">
            <div className="form-group"><label>Branch</label><div className="sel-wrap"><select value={branch} onChange={e => setBranch(e.target.value)}>{BRANCHES.map(b => <option key={b} value={b}>{b}</option>)}</select></div></div>
            <div className="form-group"><label>Semester</label><div className="sel-wrap"><select value={semester} onChange={e => setSemester(e.target.value)}><option value="">Select</option>{SEMS.map(s => <option key={s} value={s}>{s}</option>)}</select></div></div>
            <div className="form-group"><label>Section</label><div className="sel-wrap"><select value={section} onChange={e => setSection(e.target.value)}><option value="">Select</option>{SECTIONS.map(s => <option key={s} value={s}>{s}</option>)}</select></div></div>
          </div>
        </div>
      </div>

      {semester && section && (
        <>
          {/* Stats */}
          <div className="stats-grid">
            {[
              { icon: '👥', val: students.length, label: 'Total Students', color: '#001852' },
              { icon: '📚', val: subjects.length, label: 'Subjects', color: '#7c3aed' },
              { icon: '✅', val: marks.filter(m => m.status === 'approved').length, label: 'Approved Records', color: '#16a34a' },
              { icon: '⏳', val: marks.filter(m => m.status === 'submitted').length, label: 'Pending Approval', color: '#d97706' },
            ].map((s, i) => (
              <div key={i} className="stat-card" style={{ borderTopColor: s.color }}>
                <div className="stat-icon">{s.icon}</div>
                <div className="stat-val" style={{ color: s.color }}>{s.val}</div>
                <div className="stat-lbl">{s.label}</div>
              </div>
            ))}
          </div>

          {/* Students List */}
          {page === 'students' || page === 'overview' ? (
            <div className="card">
              <div className="card-head"><h3>🎓 Students — {branch} Sem {semester} Sec {section}</h3></div>
              <div className="card-body">
                <div className="table-wrap">
                  <table>
                    <thead><tr><th>#</th><th>Roll No</th><th>Name</th><th>Subjects with Marks</th><th>Avg Internal</th></tr></thead>
                    <tbody>
                      {students.map((s, i) => {
                        const sMarks = studentMarksMap[s.rollNo] || [];
                        const avg = sMarks.length ? (sMarks.reduce((a, m) => a + m.internalMarks, 0) / sMarks.length).toFixed(1) : '—';
                        return (
                          <tr key={s._id}>
                            <td>{i + 1}</td>
                            <td style={{ fontFamily: 'monospace', fontWeight: 600 }}>{s.rollNo}</td>
                            <td style={{ fontWeight: 500 }}>{s.name}</td>
                            <td>{sMarks.length} / {subjects.length}</td>
                            <td><span style={{ fontWeight: 700, color: avg >= 15 ? '#16a34a' : avg === '—' ? '#6b7280' : '#dc2626' }}>{avg}</span></td>
                          </tr>
                        );
                      })}
                      {students.length === 0 && <tr><td colSpan={5} style={{ textAlign: 'center', padding: 30, color: '#6b7280' }}>No students found for this class</td></tr>}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          ) : null}

          {/* Marks Overview */}
          {page === 'marks' || page === 'overview' ? (
            <div className="card">
              <div className="card-head"><h3>📋 Marks Summary</h3></div>
              <div className="card-body">
                <div className="table-wrap">
                  <table>
                    <thead><tr><th>Roll No</th><th>Name</th><th>Subject</th><th>Mid 1</th><th>Mid 2</th><th>Internal</th><th>Status</th></tr></thead>
                    <tbody>
                      {marks.map((m, i) => (
                        <tr key={i}>
                          <td style={{ fontFamily: 'monospace', fontSize: 11 }}>{m.studentRollNo}</td>
                          <td style={{ fontWeight: 500 }}>{m.studentName}</td>
                          <td><span style={{ fontSize: 11, background: '#dbeafe', color: '#1d4ed8', padding: '2px 8px', borderRadius: 12, fontWeight: 600 }}>{m.subjectCode}</span></td>
                          <td>{m.mid1?.grandTotal || 0}</td>
                          <td>{m.mid2?.grandTotal || 0}</td>
                          <td><span style={{ fontWeight: 700, color: m.internalMarks >= 15 ? '#16a34a' : '#dc2626', fontSize: 14 }}>{m.internalMarks}</span></td>
                          <td><span className={`badge badge-${m.status}`}>{m.status}</span></td>
                        </tr>
                      ))}
                      {marks.length === 0 && <tr><td colSpan={7} style={{ textAlign: 'center', padding: 30, color: '#6b7280' }}>No marks entered for this class yet</td></tr>}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          ) : null}
        </>
      )}

      {(!semester || !section) && (
        <div className="alert alert-info">ℹ️ Please select Branch, Semester and Section to view class information.</div>
      )}
    </Layout>
  );
}
