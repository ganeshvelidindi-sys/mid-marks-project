import React, { useState, useEffect } from 'react';
import axios from 'axios';

const SEMESTERS   = [1,2,3,4,5,6,7,8];
const STATUS_BADGE = { submitted:'badge-yellow', approved:'badge-green', rejected:'badge-red', draft:'badge-gray' };

export default function FacultyViewMarks() {
  const [marks,    setMarks]    = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [loading,  setLoading]  = useState(false);
  const [filter,   setFilter]   = useState({ semester:'', subjectId:'', midExam:'' });

  const clearFilters = () => setFilter({ semester:'', subjectId:'', midExam:'' });
  const hasFilters   = filter.semester || filter.subjectId || filter.midExam;

  useEffect(() => {
    if (!filter.semester) { setSubjects([]); return; }
    axios.get('/api/faculty/subjects', { params: { semester: filter.semester } })
      .then(res => setSubjects(res.data.subjects));
  }, [filter.semester]);

  useEffect(() => {
    setLoading(true);
    const params = {};
    if (filter.semester)  params.semester  = filter.semester;
    if (filter.subjectId) params.subjectId = filter.subjectId;
    if (filter.midExam)   params.midExam   = filter.midExam;
    axios.get('/api/faculty/marks', { params })
      .then(res => { setMarks(res.data.marks); setLoading(false); })
      .catch(() => setLoading(false));
  }, [filter]);

  // Group by subject + exam
  const grouped = {};
  marks.forEach(m => {
    const key = `${m.subject?._id}-${m.midExam}`;
    if (!grouped[key]) grouped[key] = { subject: m.subject, midExam: m.midExam, entries: [] };
    grouped[key].entries.push(m);
  });

  return (
    <div>
      <div className="page-header">
        <div><div className="page-title">View Marks</div><div className="page-subtitle">Review marks you have submitted</div></div>
      </div>

      <div className="filter-bar">
        <select className="form-select" style={{ width:160 }} value={filter.semester}
          onChange={e => setFilter({ ...filter, semester: e.target.value, subjectId:'' })}>
          <option value="">All Semesters</option>
          {SEMESTERS.map(s => <option key={s} value={s}>Semester {s}</option>)}
        </select>
        <select className="form-select" style={{ width:200 }} value={filter.subjectId}
          onChange={e => setFilter({ ...filter, subjectId: e.target.value })} disabled={!filter.semester}>
          <option value="">All Subjects</option>
          {subjects.map(s => <option key={s._id} value={s._id}>{s.name}</option>)}
        </select>
        <select className="form-select" style={{ width:130 }} value={filter.midExam}
          onChange={e => setFilter({ ...filter, midExam: e.target.value })}>
          <option value="">All Exams</option>
          <option value="Mid-1">Mid-1</option>
          <option value="Mid-2">Mid-2</option>
        </select>
        {hasFilters && (
          <button className="btn btn-outline btn-sm" onClick={clearFilters}>✕ Clear Filters</button>
        )}
        <span className="text-muted" style={{ fontSize:13 }}>{marks.length} records</span>
      </div>

      {loading ? (
        <div className="loading-screen" style={{ height:200 }}><div className="spinner"></div></div>
      ) : marks.length === 0 ? (
        <div className="card"><div className="empty-state"><div className="empty-icon">📝</div><div className="empty-text">No marks found</div><div className="empty-subtext">Try adjusting your filters</div></div></div>
      ) : (
        Object.values(grouped).map(({ subject, midExam, entries }) => (
          <div key={`${subject?._id}-${midExam}`} className="card mt-16">
            <div className="card-header">
              <div>
                <span className="card-title">{subject?.name}</span>
                <span style={{ marginLeft:8, fontSize:12, color:'var(--text-muted)' }}>{subject?.code}</span>
              </div>
              <div className="gap-8">
                <span className="badge badge-blue">{midExam}</span>
                <span className="badge badge-gray">{entries.length} students</span>
                <span className="badge badge-green">{entries.filter(e=>e.status==='approved').length} approved</span>
                <span className="badge badge-yellow">{entries.filter(e=>e.status==='submitted').length} pending</span>
              </div>
            </div>
            <div className="table-wrapper">
              <table>
                <thead>
                  <tr>
                    <th>#</th><th>Student</th><th>Roll Number</th><th>Section</th>
                    <th>Q1</th><th>Q2</th><th>Q3</th><th>Q4</th><th>Q5</th><th>Q6</th>
                    <th>Asgn/5</th><th>SHA/10</th><th>Total/30</th><th>Status</th><th>HOD Comment</th>
                  </tr>
                </thead>
                <tbody>
                  {entries.map((m, i) => (
                    <tr key={m._id}>
                      <td>{i+1}</td>
                      <td className="fw-600">{m.student?.name}</td>
                      <td style={{ fontFamily:'monospace', fontSize:12 }}>{m.student?.rollNumber}</td>
                      <td>{m.student?.section || '—'}</td>
                      <td>{m.q1}</td><td>{m.q2}</td><td>{m.q3}</td>
                      <td>{m.q4}</td><td>{m.q5}</td><td>{m.q6}</td>
                      <td>{m.assignmentMarks}</td>
                      <td>{m.shaMarks}</td>
                      <td className="fw-600" style={{ color:'#1a56db' }}>{m.totalMarks}/30</td>
                      <td>
                        <span className={`badge ${STATUS_BADGE[m.status]}`}>{m.status}</span>
                        {m.isLocked && <span className="badge badge-red" style={{ marginLeft:4 }}>🔒</span>}
                      </td>
                      <td className="text-muted" style={{ fontSize:12 }}>{m.hodComment || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ))
      )}
    </div>
  );
}
