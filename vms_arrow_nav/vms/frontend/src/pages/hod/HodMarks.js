import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { toast } from 'react-toastify';

const SEMESTERS   = [1,2,3,4,5,6,7,8];
const STATUS_BADGE = { submitted: 'badge-yellow', approved: 'badge-green', rejected: 'badge-red', draft: 'badge-gray' };

export default function HodMarks() {
  const [marks,        setMarks]        = useState([]);
  const [subjects,     setSubjects]     = useState([]);
  const [sections,     setSections]     = useState([]);
  const [loading,      setLoading]      = useState(true);
  const [filter,       setFilter]       = useState({ semester:'', subject:'', status:'', midExam:'', section:'' });
  const [commentModal, setCommentModal] = useState(null);
  const [comment,      setComment]      = useState('');
  const [actionType,   setActionType]   = useState('');

  const load = () => {
    const params = {};
    Object.entries(filter).forEach(([k,v]) => { if (v) params[k] = v; });
    axios.get('/api/hod/marks', { params })
      .then(res => { setMarks(res.data.marks); setLoading(false); });
  };

  useEffect(() => {
    const params = filter.semester ? { semester: filter.semester } : {};
    axios.get('/api/hod/subjects', { params }).then(res => setSubjects(res.data.subjects));
    axios.get('/api/hod/sections', { params })
      .then(res => setSections(res.data.sections || []))
      .catch(() => setSections([]));
  }, [filter.semester]);

  useEffect(load, [filter]);

  const clearFilters = () => setFilter({ semester:'', subject:'', status:'', midExam:'', section:'' });
  const hasFilters   = Object.values(filter).some(v => v);

  const openAction = (mark, type) => { setCommentModal(mark); setActionType(type); setComment(''); };

  const handleAction = async () => {
    if (!commentModal) return;
    try {
      const ep = actionType === 'lock' ? 'lock' : actionType === 'approve' ? 'approve' : 'reject';
      await axios.put(`/api/hod/marks/${commentModal._id}/${ep}`, { comment });
      toast.success(`Marks ${actionType}d`);
      setCommentModal(null);
      load();
    } catch (err) { toast.error(err.response?.data?.message || 'Action failed'); }
  };

  const handleBulkApprove = async () => {
    const submitted = marks.filter(m => m.status === 'submitted');
    if (!submitted.length) return toast.info('No pending marks to approve');
    if (!window.confirm(`Approve all ${submitted.length} pending marks?`)) return;
    try {
      await Promise.all(submitted.map(m => axios.put(`/api/hod/marks/${m._id}/approve`, { comment: 'Bulk approved' })));
      toast.success(`✅ ${submitted.length} marks approved`);
      load();
    } catch { toast.error('Bulk approve failed'); }
  };

  const handleBulkLock = async () => {
    const approved = marks.filter(m => m.status === 'approved' && !m.isLocked);
    if (!approved.length) return toast.info('No approved marks to lock');
    if (!window.confirm(`Lock all ${approved.length} approved marks? This cannot be undone.`)) return;
    try {
      await Promise.all(approved.map(m => axios.put(`/api/hod/marks/${m._id}/lock`)));
      toast.success(`🔒 ${approved.length} marks locked`);
      load();
    } catch { toast.error('Bulk lock failed'); }
  };

  if (loading) return <div className="loading-screen"><div className="spinner"></div></div>;

  const pendingCount  = marks.filter(m => m.status === 'submitted').length;
  const approvedUnlocked = marks.filter(m => m.status === 'approved' && !m.isLocked).length;

  return (
    <div>
      <div className="page-header">
        <div><div className="page-title">Review Marks</div><div className="page-subtitle">Approve, reject or lock faculty-submitted marks</div></div>
        <div className="gap-8">
          {pendingCount > 0 && (
            <button className="btn btn-success" onClick={handleBulkApprove}>
              ✅ Approve All ({pendingCount})
            </button>
          )}
          {approvedUnlocked > 0 && (
            <button className="btn btn-warning" onClick={handleBulkLock}
              style={{ background:'#f59e0b', color:'white', border:'none' }}>
              🔒 Lock All Approved ({approvedUnlocked})
            </button>
          )}
        </div>
      </div>

      {pendingCount > 0 && (
        <div className="warning-box">⏳ <strong>{pendingCount}</strong> marks entr{pendingCount>1?'ies are':'y is'} pending approval.</div>
      )}

      {/* Filters */}
      <div className="filter-bar">
        <select className="form-select" style={{ width:155 }} value={filter.semester} onChange={e => setFilter({...filter, semester:e.target.value, subject:'', section:''})}>
          <option value="">All Semesters</option>
          {SEMESTERS.map(s => <option key={s} value={s}>Semester {s}</option>)}
        </select>
        <select className="form-select" style={{ width:190 }} value={filter.subject} onChange={e => setFilter({...filter, subject:e.target.value})}>
          <option value="">All Subjects</option>
          {subjects.map(s => <option key={s._id} value={s._id}>{s.name} ({s.code})</option>)}
        </select>
        <select className="form-select" style={{ width:130 }} value={filter.section} onChange={e => setFilter({...filter, section:e.target.value})}>
          <option value="">All Sections</option>
          {sections.map(sec => <option key={sec._id} value={sec.name}>Section {sec.name}</option>)}
        </select>
        <select className="form-select" style={{ width:130 }} value={filter.midExam} onChange={e => setFilter({...filter, midExam:e.target.value})}>
          <option value="">All Exams</option>
          <option value="Mid-1">Mid-1</option>
          <option value="Mid-2">Mid-2</option>
        </select>
        <select className="form-select" style={{ width:140 }} value={filter.status} onChange={e => setFilter({...filter, status:e.target.value})}>
          <option value="">All Status</option>
          <option value="submitted">Pending</option>
          <option value="approved">Approved</option>
          <option value="rejected">Rejected</option>
        </select>
        {hasFilters && (
          <button className="btn btn-outline btn-sm" onClick={clearFilters}>✕ Clear Filters</button>
        )}
        <span className="text-muted" style={{ fontSize:13 }}>{marks.length} records</span>
      </div>

      <div className="card">
        <div className="table-wrapper">
          {marks.length === 0
            ? <div className="empty-state"><div className="empty-icon">📝</div><div className="empty-text">No marks found</div></div>
            : (
              <table>
                <thead>
                  <tr><th>Student</th><th>Roll No</th><th>Sec</th><th>Sem</th><th>Subject</th><th>Exam</th><th>Marks</th><th>Faculty</th><th>Status</th><th>Actions</th></tr>
                </thead>
                <tbody>
                  {marks.map(m => (
                    <tr key={m._id}>
                      <td className="fw-600">{m.student?.name}</td>
                      <td style={{ fontFamily:'monospace', fontSize:12 }}>{m.student?.rollNumber}</td>
                      <td>{m.student?.section || '—'}</td>
                      <td>{m.semester}</td>
                      <td>{m.subject?.name} <span style={{ fontSize:11, color:'var(--text-muted)' }}>({m.subject?.code})</span></td>
                      <td><span className="badge badge-blue">{m.midExam}</span></td>
                      <td className="fw-600">{m.totalMarks}/30</td>
                      <td className="text-muted">{m.faculty?.name}</td>
                      <td>
                        <span className={`badge ${STATUS_BADGE[m.status]}`}>{m.status}</span>
                        {m.isLocked && <span className="badge badge-red" style={{ marginLeft:4 }}>🔒</span>}
                      </td>
                      <td>
                        <div className="gap-8">
                          {m.status === 'submitted' && <>
                            <button className="btn btn-success btn-sm" onClick={() => openAction(m, 'approve')}>✅</button>
                            <button className="btn btn-danger btn-sm"  onClick={() => openAction(m, 'reject')}>❌</button>
                          </>}
                          {m.status === 'approved' && !m.isLocked && (
                            <button className="btn btn-sm" onClick={() => openAction(m, 'lock')}
                              style={{ background:'#f59e0b', color:'white', border:'none', borderRadius:6, padding:'4px 10px', cursor:'pointer', fontSize:12 }}>
                              🔒 Lock
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
        </div>
      </div>

      {commentModal && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setCommentModal(null)}>
          <div className="modal">
            <div className="modal-header">
              <span className="modal-title">
                {actionType==='approve'?'✅ Approve':actionType==='reject'?'❌ Reject':'🔒 Lock'} Marks
              </span>
              <button className="modal-close" onClick={() => setCommentModal(null)}>×</button>
            </div>
            <div className="modal-body">
              <p style={{ marginBottom:14, fontSize:14 }}>
                <strong>{commentModal.student?.name}</strong> — {commentModal.subject?.name} ({commentModal.midExam}) — <strong>{commentModal.totalMarks}/30</strong>
              </p>
              {actionType !== 'lock' && (
                <div className="form-group">
                  <label className="form-label">Comment (optional)</label>
                  <textarea className="form-input" rows={3} value={comment} onChange={e => setComment(e.target.value)} placeholder="Add a comment..." style={{ resize:'vertical' }} />
                </div>
              )}
            </div>
            <div className="modal-footer">
              <button className="btn btn-outline" onClick={() => setCommentModal(null)}>Cancel</button>
              <button className={`btn ${actionType==='approve'?'btn-success':actionType==='reject'?'btn-danger':'btn-warning'}`} onClick={handleAction}
                style={actionType==='lock'?{background:'#f59e0b',color:'white',border:'none'}:{}}>
                Confirm {actionType.charAt(0).toUpperCase()+actionType.slice(1)}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
