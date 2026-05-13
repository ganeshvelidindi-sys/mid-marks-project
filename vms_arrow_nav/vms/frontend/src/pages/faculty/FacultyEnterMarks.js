import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { toast } from 'react-toastify';

const SEMESTERS = [1,2,3,4,5,6,7,8];
const MID_EXAMS = ['Mid-1','Mid-2'];
const initEntry = () => ({ q1:'',q2:'',q3:'',q4:'',q5:'',q6:'',assignmentMarks:'',shaMarks:'' });

function computePreview(e) {
  const q  = v => Math.min(Number(v)||0, 10);
  const b1 = Math.max(q(e.q1), q(e.q2));
  const b2 = Math.max(q(e.q3), q(e.q4));
  const b3 = Math.max(q(e.q5), q(e.q6));
  const qt = b1+b2+b3, qh = Math.round(qt/2);
  const asgn = Math.min(Number(e.assignmentMarks)||0, 5);
  const sha  = Math.min(Number(e.shaMarks)||0, 10);
  return { b1, b2, b3, qt, qh, total: Math.round(qh+asgn+sha) };
}

export default function FacultyEnterMarks() {
  const [step,       setStep]       = useState(1);
  const [semester,   setSemester]   = useState('');
  const [subjects,   setSubjects]   = useState([]);
  const [subjectId,  setSubjectId]  = useState('');
  const [sectionId,  setSectionId]  = useState('');
  const [midExam,    setMidExam]    = useState('');
  const [sheet,      setSheet]      = useState([]);
  const [marksData,  setMarksData]  = useState({});
  const [selSubject, setSelSubject] = useState(null);
  const [selSection, setSelSection] = useState(null);
  const [loading,    setLoading]    = useState(false);
  const [saving,     setSaving]     = useState(false);
  const [savingRow,  setSavingRow]  = useState(null); // studentId being saved individually

  const mySections = subjects.find(s => s._id === subjectId)?.mySections || [];

  // Clear filters
  const clearSetup = () => { setSemester(''); setSubjectId(''); setSectionId(''); setMidExam(''); setSubjects([]); };
  const hasSetup = semester || subjectId || sectionId || midExam;

  useEffect(() => {
    if (!semester) { setSubjects([]); setSubjectId(''); setSectionId(''); return; }
    axios.get('/api/faculty/subjects', { params: { semester } })
      .then(r => { setSubjects(r.data.subjects); setSubjectId(''); setSectionId(''); });
  }, [semester]);

  useEffect(() => { setSectionId(''); }, [subjectId]);

  const handleLoadSheet = async () => {
    if (!semester || !subjectId || !midExam || !sectionId) return toast.error('Select all fields');
    setLoading(true);
    try {
      const res = await axios.get('/api/faculty/marks/sheet', { params: { semester, subjectId, midExam, sectionId } });
      const subj = subjects.find(s => s._id === subjectId);
      const sec  = mySections.find(s => s.sectionId === sectionId);
      setSelSubject(subj);
      setSelSection(sec);
      setSheet(res.data.sheet);
      const prefill = {};
      res.data.sheet.forEach(({ student, marks }) => {
        prefill[student._id] = marks
          ? { q1:marks.q1, q2:marks.q2, q3:marks.q3, q4:marks.q4, q5:marks.q5, q6:marks.q6, assignmentMarks:marks.assignmentMarks, shaMarks:marks.shaMarks }
          : initEntry();
      });
      setMarksData(prefill);
      setStep(2);
    } catch (err) { toast.error(err.response?.data?.message || 'Failed to load sheet'); }
    finally { setLoading(false); }
  };

  const set = (sid, field, val) =>
    setMarksData(prev => ({ ...prev, [sid]: { ...prev[sid], [field]: val } }));

  // Arrow-key navigation across input cells
  const COL_FIELDS = ['q1','q2','q3','q4','q5','q6','assignmentMarks','shaMarks'];
  const handleKeyNav = (e, rowIndex, colField) => {
    const colIndex = COL_FIELDS.indexOf(colField);
    let nextRow = rowIndex, nextCol = colIndex;
    if (e.key === 'ArrowRight')      { nextCol = colIndex + 1; }
    else if (e.key === 'ArrowLeft')  { nextCol = colIndex - 1; }
    else if (e.key === 'ArrowDown')  { nextRow = rowIndex + 1; }
    else if (e.key === 'ArrowUp')    { nextRow = rowIndex - 1; }
    else return;
    if (nextCol < 0 || nextCol >= COL_FIELDS.length) return;
    if (nextRow < 0 || nextRow >= sheet.length) return;
    e.preventDefault();
    const target = document.querySelector(
      `input[data-row="${nextRow}"][data-col="${COL_FIELDS[nextCol]}"]`
    );
    if (target && !target.disabled) target.focus();
  };

  // Save single student marks
  const handleSaveRow = async (student) => {
    const entry = marksData[student._id];
    if (!entry) return;
    if ([entry.q1,entry.q2,entry.q3,entry.q4,entry.q5,entry.q6].some(v=>Number(v)>10))
      return toast.error('Each question max is 10');
    if (Number(entry.assignmentMarks) > 5) return toast.error('Assignment max is 5');
    if (Number(entry.shaMarks) > 10)        return toast.error('SHA max is 10');
    setSavingRow(student._id);
    try {
      await axios.post('/api/faculty/marks', {
        subjectId, semester: Number(semester), midExam, sectionId,
        marksData: [{ studentId: student._id, ...entry }]
      });
      toast.success(`✅ Saved marks for ${student.name}`);
      // Refresh sheet to get updated status
      const res = await axios.get('/api/faculty/marks/sheet', { params: { semester, subjectId, midExam, sectionId } });
      setSheet(res.data.sheet);
    } catch (err) { toast.error(err.response?.data?.message || 'Failed'); }
    finally { setSavingRow(null); }
  };

  // Save all students
  const handleSaveAll = async () => {
    for (const entry of Object.values(marksData)) {
      if ([entry.q1,entry.q2,entry.q3,entry.q4,entry.q5,entry.q6].some(v=>Number(v)>10))
        return toast.error('Each question max is 10');
      if (Number(entry.assignmentMarks) > 5) return toast.error('Assignment max is 5');
      if (Number(entry.shaMarks) > 10)        return toast.error('SHA max is 10');
    }
    setSaving(true);
    try {
      const payload = sheet.map(({ student }) => ({ studentId: student._id, ...marksData[student._id] }));
      await axios.post('/api/faculty/marks', { subjectId, semester: Number(semester), midExam, sectionId, marksData: payload });
      toast.success(`✅ All marks saved for ${payload.length} students`);
      setStep(1); setSemester(''); setSubjectId(''); setMidExam(''); setSectionId(''); setSheet([]);
    } catch (err) { toast.error(err.response?.data?.message || 'Failed'); }
    finally { setSaving(false); }
  };

  /* ── Step 2: Mark Sheet ── */
  if (step === 2) return (
    <div>
      <div className="page-header">
        <div>
          <div className="page-title">Enter Marks</div>
          <div className="page-subtitle">{selSubject?.name} ({selSubject?.code}) | Sem {semester} | Section {selSection?.sectionName} | {midExam}</div>
        </div>
        <div className="gap-8">
          <button className="btn btn-outline" onClick={() => setStep(1)}>← Back</button>
          <button className="btn btn-primary" onClick={handleSaveAll} disabled={saving}>
            {saving ? '⏳ Saving All...' : `💾 Save All (${sheet.length} students)`}
          </button>
        </div>
      </div>

      <div className="info-box">
        <strong>Pattern:</strong> Assignment(/5) + SHA(/10) + [Best(Q1/Q2)+Best(Q3/Q4)+Best(Q5/Q6)]÷2(/15) = <strong>30</strong>
        &nbsp;&nbsp;|&nbsp;&nbsp; Use <strong>💾 Save</strong> button on each row to save individually, or <strong>Save All</strong> to save everyone at once.
      </div>

      {sheet.length === 0 ? (
        <div className="card"><div className="empty-state"><div className="empty-icon">👥</div><div className="empty-text">No students in this section</div></div></div>
      ) : (
        <div className="card">
          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th rowSpan={2}>#</th>
                  <th rowSpan={2}>Student</th>
                  <th rowSpan={2}>Roll No</th>
                  <th colSpan={2} style={{ textAlign:'center', background:'#eff6ff' }}>Q1/Q2 /10</th>
                  <th colSpan={2} style={{ textAlign:'center', background:'#f0fdf4' }}>Q3/Q4 /10</th>
                  <th colSpan={2} style={{ textAlign:'center', background:'#fef3c7' }}>Q5/Q6 /10</th>
                  <th rowSpan={2}>Asgn/5</th>
                  <th rowSpan={2}>SHA/10</th>
                  <th rowSpan={2} style={{ background:'#f1f5f9' }}>Total/30</th>
                  <th rowSpan={2}>Status</th>
                  <th rowSpan={2}>Save</th>
                </tr>
                <tr>
                  <th style={{ background:'#eff6ff' }}>Q1</th><th style={{ background:'#eff6ff' }}>Q2</th>
                  <th style={{ background:'#f0fdf4' }}>Q3</th><th style={{ background:'#f0fdf4' }}>Q4</th>
                  <th style={{ background:'#fef3c7' }}>Q5</th><th style={{ background:'#fef3c7' }}>Q6</th>
                </tr>
              </thead>
              <tbody>
                {sheet.map(({ student, marks }, i) => {
                  const entry  = marksData[student._id] || initEntry();
                  const p      = computePreview(entry);
                  const locked = marks?.isLocked;
                  const isSavingThis = savingRow === student._id;
                  return (
                    <tr key={student._id} style={{ background: locked ? '#f8fafc' : undefined }}>
                      <td>{i+1}</td>
                      <td className="fw-600" style={{ whiteSpace:'nowrap' }}>{student.name}</td>
                      <td style={{ fontFamily:'monospace', fontSize:12 }}>{student.rollNumber}</td>
                      {['q1','q2','q3','q4','q5','q6'].map((q, qi) => (
                        <td key={q} style={{ background: qi<2?'#eff6ff':qi<4?'#f0fdf4':'#fef3c7' }}>
                          <input className={`marks-input ${Number(entry[q])>10?'over-limit':''}`}
                            type="number" min={0} max={10} value={entry[q]}
                            onChange={e => set(student._id, q, e.target.value)}
                            onKeyDown={e => handleKeyNav(e, i, q)}
                            data-row={i} data-col={q}
                            disabled={locked} style={{ width:48 }} />
                        </td>
                      ))}
                      <td>
                        <input className={`marks-input ${Number(entry.assignmentMarks)>5?'over-limit':''}`}
                          type="number" min={0} max={5} value={entry.assignmentMarks}
                          onChange={e => set(student._id,'assignmentMarks',e.target.value)}
                          onKeyDown={e => handleKeyNav(e, i, 'assignmentMarks')}
                          data-row={i} data-col="assignmentMarks"
                          disabled={locked} style={{ width:48 }} />
                      </td>
                      <td>
                        <input className={`marks-input ${Number(entry.shaMarks)>10?'over-limit':''}`}
                          type="number" min={0} max={10} value={entry.shaMarks}
                          onChange={e => set(student._id,'shaMarks',e.target.value)}
                          onKeyDown={e => handleKeyNav(e, i, 'shaMarks')}
                          data-row={i} data-col="shaMarks"
                          disabled={locked} style={{ width:48 }} />
                      </td>
                      <td style={{ background:'#f8fafc', textAlign:'center' }}>
                        <div style={{ fontSize:10, color:'var(--text-muted)' }}>{p.b1}+{p.b2}+{p.b3}={p.qt}÷2={p.qh}</div>
                        <strong className={p.total>30?'text-danger':'text-success'}>{p.total}/30</strong>
                      </td>
                      <td>
                        {locked
                          ? <span className="badge badge-red">🔒</span>
                          : marks?.status==='approved' ? <span className="badge badge-green">✅</span>
                          : marks?.status==='submitted' ? <span className="badge badge-yellow">⏳</span>
                          : marks?.status==='rejected'  ? <span className="badge badge-red">❌</span>
                          : <span className="badge badge-gray">New</span>}
                      </td>
                      <td>
                        {!locked && (
                          <button
                            className="btn btn-sm"
                            onClick={() => handleSaveRow(student)}
                            disabled={isSavingThis || saving}
                            style={{ background:'#10b981', color:'white', border:'none', borderRadius:6, padding:'4px 10px', cursor:'pointer', fontSize:12, whiteSpace:'nowrap' }}
                          >
                            {isSavingThis ? '⏳' : '💾 Save'}
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <div style={{ marginTop:16, display:'flex', justifyContent:'flex-end' }}>
        <button className="btn btn-primary" onClick={handleSaveAll} disabled={saving}>
          {saving ? '⏳ Saving...' : '💾 Save All'}
        </button>
      </div>
    </div>
  );

  /* ── Step 1: Setup ── */
  return (
    <div>
      <div className="page-header">
        <div><div className="page-title">Enter Marks</div><div className="page-subtitle">Select options to load mark sheet</div></div>
      </div>

      <div className="card" style={{ maxWidth:560 }}>
        <div className="card-header">
          <span className="card-title">📋 Mark Sheet Setup</span>
          {hasSetup && (
            <button className="btn btn-outline btn-sm" onClick={clearSetup} style={{ fontSize:11 }}>✕ Clear</button>
          )}
        </div>
        <div className="card-body">
          <div className="info-box">Only subjects and sections assigned to you by your HOD appear below.</div>

          <div className="form-group">
            <label className="form-label">Step 1 — Semester *</label>
            <select className="form-select" value={semester} onChange={e => setSemester(e.target.value)}>
              <option value="">Choose Semester</option>
              {SEMESTERS.map(s => <option key={s} value={s}>Semester {s}</option>)}
            </select>
          </div>

          <div className="form-group">
            <label className="form-label">Step 2 — Subject *</label>
            <select className="form-select" value={subjectId} onChange={e => setSubjectId(e.target.value)} disabled={!semester}>
              <option value="">{semester ? 'Choose Subject' : 'Select semester first'}</option>
              {subjects.map(s => <option key={s._id} value={s._id}>{s.name} ({s.code})</option>)}
            </select>
            {semester && subjects.length === 0 && (
              <div className="form-error">No subjects assigned for Semester {semester}.</div>
            )}
          </div>

          <div className="form-group">
            <label className="form-label">Step 3 — Section *</label>
            <select className="form-select" value={sectionId} onChange={e => setSectionId(e.target.value)} disabled={!subjectId}>
              <option value="">{subjectId ? 'Choose Section' : 'Select subject first'}</option>
              {mySections.map(s => <option key={s.sectionId} value={s.sectionId}>Section {s.sectionName}</option>)}
            </select>
          </div>

          <div className="form-group">
            <label className="form-label">Step 4 — Mid Exam *</label>
            <select className="form-select" value={midExam} onChange={e => setMidExam(e.target.value)}>
              <option value="">Choose Mid Exam</option>
              {MID_EXAMS.map(m => <option key={m} value={m}>{m}</option>)}
            </select>
          </div>

          <button className="btn btn-primary" style={{ width:'100%', marginTop:8 }}
            onClick={handleLoadSheet}
            disabled={loading || !semester || !subjectId || !sectionId || !midExam}>
            {loading ? '⏳ Loading...' : '📋 Load Mark Sheet →'}
          </button>
        </div>
      </div>
    </div>
  );
}
