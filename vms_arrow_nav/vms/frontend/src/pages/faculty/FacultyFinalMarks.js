import React, { useState, useEffect } from 'react';
import axios from 'axios';

const SEMESTERS = [1, 2, 3, 4, 5, 6, 7, 8];

export default function FacultyFinalMarks() {
  const [finalMarks, setFinalMarks] = useState([]);
  const [subjects,   setSubjects]   = useState([]);
  const [loading,    setLoading]    = useState(false);
  const [filter,     setFilter]     = useState({ semester: '', subjectId: '', search: '', section: '' });

  const clearFilters = () => setFilter({ semester: '', subjectId: '', search: '', section: '' });
  const hasFilters   = filter.semester || filter.subjectId || filter.search || filter.section;
  // Marks should only be fetched/shown when at least semester is selected
  const hasMeaningfulFilter = !!filter.semester;

  useEffect(() => {
    if (!filter.semester) { setSubjects([]); return; }
    axios.get('/api/faculty/subjects', { params: { semester: filter.semester } })
      .then(res => setSubjects(res.data.subjects || []))
      .catch(() => setSubjects([]));
  }, [filter.semester]);

  useEffect(() => {
    if (!filter.semester) { setFinalMarks([]); return; }
    setLoading(true);
    const params = {};
    if (filter.semester) params.semester = filter.semester;
    axios.get('/api/faculty/final-marks', { params })
      .then(res => { setFinalMarks(res.data.finalMarks || []); setLoading(false); })
      .catch(() => setLoading(false));
  }, [filter.semester]);

  const displayed = finalMarks.filter(f => {
    if (filter.subjectId && f.subject?._id !== filter.subjectId) return false;
    if (filter.section   && f.student?.section !== filter.section) return false;
    if (filter.search) {
      const q = filter.search.toLowerCase();
      if (!f.student?.name?.toLowerCase().includes(q) && !f.student?.rollNumber?.toLowerCase().includes(q)) return false;
    }
    return true;
  });

  const grouped = {};
  displayed.forEach(f => {
    const key = f.subject?._id || 'unknown';
    if (!grouped[key]) grouped[key] = { subject: f.subject, semester: f.semester, entries: [] };
    grouped[key].entries.push(f);
  });

  const uniqueSections = [...new Set(finalMarks.map(f => f.student?.section).filter(Boolean))].sort();

  return (
    <div>
      <div className="page-header">
        <div>
          <div className="page-title">🏆 Final View Marks</div>
          <div className="page-subtitle">
            Students where both Mid-1 and Mid-2 are approved by HOD — final marks auto-calculated
          </div>
        </div>
      </div>

      <div className="info-box" style={{ marginBottom: 16 }}>
        📌 Final marks = <strong>80% of higher mid</strong> + <strong>20% of lower mid</strong>.
        Only shown when <strong>both</strong> Mid-1 &amp; Mid-2 are <strong>HOD-approved</strong>.
      </div>

      <div className="filter-bar">
        <select className="form-select" style={{ width: 160 }} value={filter.semester}
          onChange={e => setFilter({ ...filter, semester: e.target.value, subjectId: '' })}>
          <option value="">All Semesters</option>
          {SEMESTERS.map(s => <option key={s} value={s}>Semester {s}</option>)}
        </select>

        <select className="form-select" style={{ width: 200 }} value={filter.subjectId}
          onChange={e => setFilter({ ...filter, subjectId: e.target.value })}
          disabled={!filter.semester}>
          <option value="">All Subjects</option>
          {subjects.map(s => <option key={s._id} value={s._id}>{s.name}</option>)}
        </select>

        <select className="form-select" style={{ width: 130 }} value={filter.section}
          onChange={e => setFilter({ ...filter, section: e.target.value })}
          disabled={!filter.semester}>
          <option value="">All Sections</option>
          {uniqueSections.map(sec => <option key={sec} value={sec}>Section {sec}</option>)}
        </select>

        <input className="form-input-sm" style={{ width: 180 }}
          placeholder="🔍 Search name / roll no"
          value={filter.search}
          onChange={e => setFilter({ ...filter, search: e.target.value })}
          disabled={!filter.semester} />

        {hasFilters && (
          <button className="btn btn-outline btn-sm" onClick={clearFilters}>✕ Clear Filters</button>
        )}

        {hasMeaningfulFilter && (
          <span className="text-muted" style={{ fontSize: 13 }}>
            {displayed.length} student{displayed.length !== 1 ? 's' : ''}
          </span>
        )}
      </div>

      {/* Prompt to select a filter first */}
      {!hasMeaningfulFilter ? (
        <div className="card">
          <div className="empty-state">
            <div className="empty-icon">🔍</div>
            <div className="empty-text">Select a Semester to View Marks</div>
            <div className="empty-subtext">Please choose a semester from the filter above to load final marks</div>
          </div>
        </div>
      ) : loading ? (
        <div className="loading-screen" style={{ height: 200 }}><div className="spinner"></div></div>
      ) : displayed.length === 0 ? (
        <div className="card">
          <div className="empty-state">
            <div className="empty-icon">🏆</div>
            <div className="empty-text">No final marks available</div>
            <div className="empty-subtext">Final marks appear here once both Mid-1 and Mid-2 are approved by the HOD</div>
          </div>
        </div>
      ) : (
        Object.values(grouped).map(({ subject, semester, entries }) => (
          <div key={subject?._id} className="card mt-16">
            <div className="card-header">
              <div>
                <span className="card-title">{subject?.name}</span>
                <span style={{ marginLeft: 8, fontSize: 12, color: 'var(--text-muted)' }}>{subject?.code}</span>
              </div>
              <div className="gap-8">
                <span className="badge badge-purple">Sem {semester}</span>
                <span className="badge badge-gray">{entries.length} students</span>
              </div>
            </div>

            <div className="table-wrapper">
              <table>
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Student</th>
                    <th>Roll Number</th>
                    <th>Section</th>
                    <th>Mid-1 /30</th>
                    <th>Mid-2 /30</th>
                    <th>Final /30</th>
                  </tr>
                </thead>
                <tbody>
                  {entries
                    .slice()
                    .sort((a, b) => (a.student?.rollNumber || '').localeCompare(b.student?.rollNumber || ''))
                    .map((f, i) => {
                      const isHigherMid1 = f.mid1Marks >= f.mid2Marks;
                      return (
                        <tr key={i}>
                          <td>{i + 1}</td>
                          <td className="fw-600">{f.student?.name}</td>
                          <td style={{ fontFamily: 'monospace', fontSize: 12 }}>{f.student?.rollNumber}</td>
                          <td>{f.student?.section || '—'}</td>
                          <td style={{ color: isHigherMid1 ? '#7c3aed' : undefined }}>
                            {f.mid1Marks}
                            {isHigherMid1 && <span title="Higher mid (80% weight)" style={{ marginLeft: 4, fontSize: 10 }}>★</span>}
                          </td>
                          <td style={{ color: !isHigherMid1 ? '#7c3aed' : undefined }}>
                            {f.mid2Marks}
                            {!isHigherMid1 && <span title="Higher mid (80% weight)" style={{ marginLeft: 4, fontSize: 10 }}>★</span>}
                          </td>
                          <td className="fw-600" style={{ color: '#7c3aed', fontSize: 15 }}>
                            {f.finalMarks}/30
                          </td>
                        </tr>
                      );
                    })}
                </tbody>
              </table>
            </div>

            <div style={{
              padding: '10px 20px', borderTop: '1px solid var(--border)',
              fontSize: 12, color: 'var(--text-muted)', background: '#f8fafc'
            }}>
              ★ = Higher mid (80% weight applied) &nbsp;|&nbsp; Formula: 0.8 × higher + 0.2 × lower
              <div style={{ marginTop: 5, color: 'var(--warning)', fontStyle: 'italic', display: 'flex', alignItems: 'center', gap: 5 }}>
                <span>⚠️</span>
                <span>Note: Final marks are <strong>rounded to the nearest whole number</strong> (e.g. 18.6 → 19, 18.4 → 18).</span>
              </div>
            </div>
          </div>
        ))
      )}
    </div>
  );
}
