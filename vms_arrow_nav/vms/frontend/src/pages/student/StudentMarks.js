import React, { useEffect, useState, useCallback } from 'react';
import axios from 'axios';
import { useAuth } from '../../context/AuthContext';

const SEMESTERS = [1,2,3,4,5,6,7,8];

export default function StudentMarks() {
  const { user } = useAuth();

  const [subjects,  setSubjects]  = useState([]);
  const [loading,   setLoading]   = useState(true);
  const [semFilter, setSemFilter] = useState('');   // '' = all
  const [subFilter, setSubFilter] = useState('');   // '' = all
  const [midFilter, setMidFilter] = useState('');   // '' = all

  // Subjects for dropdown (changes with semFilter)
  const [subjectOptions, setSubjectOptions] = useState([]);
  const [availableSems,  setAvailableSems]  = useState([]);

  // Load marks with filters
  const loadMarks = useCallback(async () => {
    setLoading(true);
    try {
      const params = {};
      if (semFilter) params.semester  = semFilter;
      if (subFilter) params.subjectId = subFilter;
      if (midFilter) params.midExam   = midFilter;

      const res = await axios.get('/api/student/marks', { params });
      setSubjects(res.data.subjects);
      if (res.data.semestersWithMarks?.length) setAvailableSems(res.data.semestersWithMarks);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [semFilter, subFilter, midFilter]);

  useEffect(() => { loadMarks(); }, [loadMarks]);

  // Load subject options when semFilter changes
  useEffect(() => {
    setSubFilter('');
    const params = semFilter ? { semester: semFilter } : {};
    axios.get('/api/student/subjects', { params })
      .then(res => setSubjectOptions(res.data.subjects))
      .catch(() => {});
  }, [semFilter]);

  // ── Subject Card ────────────────────────────────────────────
  const SubjectCard = ({ group }) => {
    const { subject, mid1, mid2, finalMarks, finalVisible } = group;

    const StatusBadge = ({ m }) => {
      if (!m) return <span className="badge badge-gray">—</span>;
      if (m.isLocked)              return <span className="badge badge-red">🔒 Locked</span>;
      if (m.status === 'approved') return <span className="badge badge-green">✅ Approved</span>;
      if (m.status === 'submitted')return <span className="badge badge-yellow">⏳ Pending</span>;
      if (m.status === 'rejected') return <span className="badge badge-red">❌ Rejected</span>;
      return null;
    };

    const MidRow = ({ m, label, color }) => {
      if (midFilter && midFilter !== label) return null;
      return (
        <tr style={{ background: color }}>
          <td style={{ width: 70 }}>
            <span className={`badge ${label === 'Mid-1' ? 'badge-blue' : 'badge-purple'}`} style={{ fontWeight: 700 }}>
              {label}
            </span>
          </td>

          {/* Question breakdown */}
          <td>
            {m ? (
              <div style={{ fontSize: 12, lineHeight: 1.7 }}>
                <div>Q1:<b>{m.q1}</b> Q2:<b>{m.q2}</b> → <strong style={{ color:'#1a56db' }}>{m.bestQ1Q2}</strong></div>
                <div>Q3:<b>{m.q3}</b> Q4:<b>{m.q4}</b> → <strong style={{ color:'#059669' }}>{m.bestQ3Q4}</strong></div>
                <div>Q5:<b>{m.q5}</b> Q6:<b>{m.q6}</b> → <strong style={{ color:'#d97706' }}>{m.bestQ5Q6}</strong></div>
                <div style={{ color:'var(--text-muted)', marginTop: 2 }}>
                  Total: {m.questionTotal}÷2 = <strong>{m.questionHalf}</strong>
                </div>
              </div>
            ) : <span style={{ color:'var(--text-muted)', fontSize:12 }}>Not entered</span>}
          </td>

          {/* Assignment */}
          <td style={{ textAlign:'center' }}>
            {m ? <span>{m.assignmentMarks}<span style={{ color:'var(--text-muted)',fontSize:11 }}>/5</span></span> : '—'}
          </td>

          {/* SHA */}
          <td style={{ textAlign:'center' }}>
            {m ? <span>{m.shaMarks}<span style={{ color:'var(--text-muted)',fontSize:11 }}>/10</span></span> : '—'}
          </td>

          {/* Total */}
          <td style={{ textAlign:'center' }}>
            {m ? (
              <strong style={{
                fontSize: 15,
                color: m.totalMarks >= 24 ? 'var(--success)' : m.totalMarks < 15 ? 'var(--danger)' : 'var(--warning)'
              }}>
                {m.totalMarks}<span style={{ fontSize:11, color:'var(--text-muted)', fontWeight:400 }}>/30</span>
              </strong>
            ) : '—'}
          </td>

          {/* Status */}
          <td style={{ textAlign:'center' }}><StatusBadge m={m} /></td>
        </tr>
      );
    };

    return (
      <div className="card mt-16">
        {/* Subject header */}
        <div className="card-header" style={{ background: finalVisible ? '#f0fdf4' : 'white' }}>
          <div>
            <span className="card-title">{subject?.name}</span>
            <span className="badge badge-gray" style={{ marginLeft: 8, fontSize: 11 }}>{subject?.code}</span>
            <span className="badge badge-blue" style={{ marginLeft: 6, fontSize: 11 }}>Sem {subject?.semester}</span>
          </div>
          {finalVisible && (
            <span style={{
              background: '#d1fae5', color: '#065f46',
              padding: '4px 14px', borderRadius: 20,
              fontSize: 14, fontWeight: 700,
              display: 'flex', alignItems: 'center', gap: 6
            }}>
              🏆 Final: {finalMarks}/30
            </span>
          )}
        </div>

        <div className="table-wrapper">
          <table style={{ minWidth: 560 }}>
            <thead>
              <tr>
                <th style={{ width: 70 }}>Exam</th>
                <th>Question Breakdown</th>
                <th style={{ textAlign:'center', width: 80 }}>Asgn /5</th>
                <th style={{ textAlign:'center', width: 80 }}>SHA /10</th>
                <th style={{ textAlign:'center', width: 90 }}>Total /30</th>
                <th style={{ textAlign:'center', width: 110 }}>Status</th>
              </tr>
            </thead>
            <tbody>
              <MidRow m={mid1} label="Mid-1" color="#fafbff" />
              <MidRow m={mid2} label="Mid-2" color="#ffffff" />

              {/* Final row */}
              {finalVisible && (
                <tr style={{ background:'#f0fdf4', borderTop:'2px solid #bbf7d0' }}>
                  <td colSpan={4} style={{ textAlign:'right', paddingRight:16, fontWeight:600, fontSize:13 }}>
                    Final = 80% × {Math.max(mid1?.totalMarks||0, mid2?.totalMarks||0)} + 20% × {Math.min(mid1?.totalMarks||0, mid2?.totalMarks||0)} = (rounded)
                  </td>
                  <td style={{ textAlign:'center' }}>
                    <strong style={{ fontSize:17, color:'var(--success)' }}>{finalMarks}/30</strong>
                  </td>
                  <td style={{ textAlign:'center' }}>
                    <span className="badge badge-green">✅ Final</span>
                  </td>
                </tr>
              )}

              {/* Waiting notice */}
              {!finalVisible && (mid1?.isLocked || mid2?.isLocked) && !(mid1?.isLocked && mid2?.isLocked) && (
                <tr style={{ background:'#fffbeb' }}>
                  <td colSpan={6} style={{ textAlign:'center', color:'#92400e', fontSize:12, padding:'10px' }}>
                    ⏳ Final marks will show after HOD locks <strong>both</strong> Mid-1 and Mid-2
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  // Group subjects by semester for display
  const bySem = {};
  subjects.forEach(g => {
    const sem = g.subject?.semester || '?';
    if (!bySem[sem]) bySem[sem] = [];
    bySem[sem].push(g);
  });

  return (
    <div>
      {/* Header */}
      <div className="page-header">
        <div>
          <div className="page-title">My Marks</div>
          <div className="page-subtitle">
            {user?.department?.name} · Showing Semester {semFilter || '1–8'}
          </div>
        </div>
      </div>

      {/* Info */}
      <div className="info-box">
        📌 Final marks = <strong>80%</strong> of higher mid + <strong>20%</strong> of lower mid.
        &nbsp;Visible only after HOD locks both Mid-1 and Mid-2.
      </div>

      {/* ── Filter Bar ── */}
      <div className="filter-bar">
        {/* Semester filter */}
        <select
          className="form-select" style={{ width: 160 }}
          value={semFilter}
          onChange={e => { setSemFilter(e.target.value); setSubFilter(''); }}
        >
          <option value="">All Semesters</option>
          {SEMESTERS.map(s => (
            <option key={s} value={s}>
              Semester {s} {availableSems.includes(s) ? '●' : ''}
            </option>
          ))}
        </select>

        {/* Subject filter */}
        <select
          className="form-select" style={{ width: 220 }}
          value={subFilter}
          onChange={e => setSubFilter(e.target.value)}
        >
          <option value="">All Subjects</option>
          {subjectOptions.map(s => (
            <option key={s._id} value={s._id}>{s.name} (Sem {s.semester})</option>
          ))}
        </select>

        {/* Mid exam filter */}
        <select
          className="form-select" style={{ width: 140 }}
          value={midFilter}
          onChange={e => setMidFilter(e.target.value)}
        >
          <option value="">All Exams</option>
          <option value="Mid-1">Mid-1 Only</option>
          <option value="Mid-2">Mid-2 Only</option>
        </select>

        {/* Clear filters */}
        {(semFilter || subFilter || midFilter) && (
          <button className="btn btn-outline btn-sm"
            onClick={() => { setSemFilter(''); setSubFilter(''); setMidFilter(''); }}>
            ✕ Clear Filters
          </button>
        )}

        <span className="text-muted" style={{ fontSize: 13 }}>
          {subjects.length} subject{subjects.length !== 1 ? 's' : ''}
        </span>
      </div>

      {/* Content */}
      {loading ? (
        <div className="loading-screen" style={{ height: 200 }}>
          <div className="spinner"></div>
        </div>
      ) : subjects.length === 0 ? (
        <div className="card">
          <div className="empty-state">
            <div className="empty-icon">📊</div>
            <div className="empty-text">No marks found</div>
            <div className="empty-subtext">
              {semFilter || subFilter || midFilter
                ? 'Try changing or clearing your filters'
                : 'Marks appear here after faculty submits and HOD approves them'}
            </div>
          </div>
        </div>
      ) : (
        // Show grouped by semester
        Object.keys(bySem).sort((a,b)=>Number(a)-Number(b)).map(sem => (
          <div key={sem}>
            <div style={{
              marginTop: 24, marginBottom: 8,
              display: 'flex', alignItems: 'center', gap: 10
            }}>
              <span style={{
                background: '#1a56db', color: 'white',
                padding: '4px 14px', borderRadius: 20,
                fontSize: 13, fontWeight: 700
              }}>
                Semester {sem}
              </span>
              <span className="text-muted" style={{ fontSize: 12 }}>
                {bySem[sem].length} subject{bySem[sem].length !== 1 ? 's' : ''}
              </span>
            </div>
            {bySem[sem].map(group => (
              <SubjectCard key={group.subject?._id} group={group} />
            ))}
          </div>
        ))
      )}
    </div>
  );
}
