import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { toast } from 'react-toastify';

const SEMESTERS = [1,2,3,4,5,6,7,8];

export default function HodPromote() {
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(false);
  const [semester, setSemester] = useState('');
  const [selected, setSelected] = useState([]);
  const [promoting, setPromoting] = useState(false);

  const load = async () => {
    if (!semester) return;
    setLoading(true);
    setSelected([]);
    try {
      const res = await axios.get('/api/hod/students', { params: { semester } });
      setStudents(res.data.students);
    } catch {
      toast.error('Failed to load students');
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => { load(); }, [semester]);

  const toggleSelect = (id) => {
    setSelected(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  const toggleAll = () => {
    setSelected(selected.length === students.length ? [] : students.map(s => s._id));
  };

  const handlePromote = async () => {
    if (!selected.length) return toast.error('Select at least one student');
    if (Number(semester) === 8) return toast.error('Semester 8 students cannot be promoted further');
    if (!window.confirm(`Promote ${selected.length} student(s) from Semester ${semester} to Semester ${Number(semester) + 1}?`)) return;

    setPromoting(true);
    try {
      const res = await axios.post('/api/hod/promote', { studentIds: selected, fromSemester: Number(semester) });
      toast.success(res.data.message);
      setSelected([]);
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Promotion failed');
    } finally {
      setPromoting(false);
    }
  };

  return (
    <div>
      <div className="page-header">
        <div>
          <div className="page-title">Promote Students</div>
          <div className="page-subtitle">Move students to the next semester</div>
        </div>
        {selected.length > 0 && (
          <button className="btn btn-success" onClick={handlePromote} disabled={promoting}>
            🎓 {promoting ? 'Promoting...' : `Promote ${selected.length} Student${selected.length > 1 ? 's' : ''} → Sem ${Number(semester) + 1}`}
          </button>
        )}
      </div>

      {Number(semester) === 8 && (
        <div className="warning-box">⚠️ Students in Semester 8 have completed their programme and cannot be promoted further.</div>
      )}

      <div className="filter-bar">
        <select className="form-select" style={{ width: 200 }} value={semester} onChange={e => setSemester(e.target.value)}>
          <option value="">Select Semester to Promote From</option>
          {SEMESTERS.slice(0, 7).map(s => <option key={s} value={s}>Semester {s} → Semester {s + 1}</option>)}
        </select>
        {semester && <span className="text-muted" style={{ fontSize: 13 }}>{students.length} students in Semester {semester}</span>}
      </div>

      {!semester ? (
        <div className="card"><div className="empty-state"><div className="empty-icon">🎓</div><div className="empty-text">Select a semester to view students</div></div></div>
      ) : loading ? (
        <div className="card"><div className="empty-state"><div className="spinner"></div></div></div>
      ) : students.length === 0 ? (
        <div className="card"><div className="empty-state"><div className="empty-icon">👥</div><div className="empty-text">No students in Semester {semester}</div></div></div>
      ) : (
        <div className="card">
          <div className="card-header">
            <span className="card-title">Semester {semester} Students</span>
            <div className="gap-8">
              <button className="btn btn-outline btn-sm" onClick={toggleAll}>
                {selected.length === students.length ? '☑ Deselect All' : '☐ Select All'}
              </button>
              {selected.length > 0 && <span className="badge badge-blue">{selected.length} selected</span>}
            </div>
          </div>
          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th style={{ width: 40 }}>
                    <input type="checkbox" checked={selected.length === students.length && students.length > 0} onChange={toggleAll} />
                  </th>
                  <th>#</th><th>Name</th><th>Roll Number</th><th>Section</th><th>Current Semester</th>
                </tr>
              </thead>
              <tbody>
                {students.map((s, i) => (
                  <tr key={s._id} onClick={() => toggleSelect(s._id)} style={{ cursor: 'pointer', background: selected.includes(s._id) ? '#eff6ff' : '' }}>
                    <td><input type="checkbox" checked={selected.includes(s._id)} onChange={() => toggleSelect(s._id)} onClick={e => e.stopPropagation()} /></td>
                    <td>{i + 1}</td>
                    <td className="fw-600">{s.name}</td>
                    <td style={{ fontFamily: 'monospace', fontSize: 13 }}>{s.rollNumber}</td>
                    <td>{s.section || '—'}</td>
                    <td><span className="badge badge-blue">Semester {s.semester}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
