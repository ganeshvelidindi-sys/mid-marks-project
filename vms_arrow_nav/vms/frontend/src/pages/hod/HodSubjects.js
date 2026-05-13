import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { toast } from 'react-toastify';

const SEMESTERS = [1,2,3,4,5,6,7,8];
const emptyForm = { name:'', code:'', semester:'', credits:4, maxMidMarks:30 };

export default function HodSubjects() {
  const [subjects,   setSubjects]   = useState([]);
  const [faculty,    setFaculty]    = useState([]);
  const [sections,   setSections]   = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [modal,      setModal]      = useState(false);
  const [assignModal,setAssignModal]= useState(null); // subject being assigned
  const [editing,    setEditing]    = useState(null);
  const [form,       setForm]       = useState(emptyForm);
  const [assignForm, setAssignForm] = useState({ sectionId:'', facultyId:'' });
  const [saving,     setSaving]     = useState(false);
  const [semFilter,  setSemFilter]  = useState('');
  const clearFilter = () => setSemFilter('');

  const load = () => {
    const params = semFilter ? { semester: semFilter } : {};
    Promise.all([
      axios.get('/api/hod/subjects', { params }),
      axios.get('/api/hod/faculty'),
    ]).then(([sRes, fRes]) => {
      setSubjects(sRes.data.subjects);
      setFaculty(fRes.data.faculty);
      setLoading(false);
    });
  };
  useEffect(load, [semFilter]);

  // Load sections when assign modal opens for a subject
  useEffect(() => {
    if (assignModal) {
      axios.get('/api/hod/sections', { params: { semester: assignModal.semester } })
        .then(r => setSections(r.data.sections));
    }
  }, [assignModal]);

  const openCreate = () => { setEditing(null); setForm(emptyForm); setModal(true); };
  const openEdit   = (s)  => { setEditing(s); setForm({ name:s.name, code:s.code, semester:s.semester, credits:s.credits, maxMidMarks:s.maxMidMarks }); setModal(true); };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name || !form.code || !form.semester) return toast.error('Name, code and semester required');
    setSaving(true);
    try {
      if (editing) { await axios.put(`/api/hod/subjects/${editing._id}`, form); toast.success('Subject updated'); }
      else         { await axios.post('/api/hod/subjects', form);               toast.success('Subject created'); }
      setModal(false); load();
    } catch (err) { toast.error(err.response?.data?.message || 'Error'); }
    finally { setSaving(false); }
  };

  const handleAssign = async (e) => {
    e.preventDefault();
    if (!assignForm.sectionId || !assignForm.facultyId) return toast.error('Select both section and faculty');
    setSaving(true);
    try {
      await axios.post(`/api/hod/subjects/${assignModal._id}/assign`, {
        sectionId: assignForm.sectionId, facultyId: assignForm.facultyId
      });
      toast.success('Assignment saved');
      setAssignForm({ sectionId:'', facultyId:'' });
      load();
    } catch (err) { toast.error(err.response?.data?.message || 'Error'); }
    finally { setSaving(false); }
  };

  const handleRemoveAssign = async (subjectId, assignmentId) => {
    if (!window.confirm('Remove this section-faculty assignment?')) return;
    try {
      await axios.delete(`/api/hod/subjects/${subjectId}/assign/${assignmentId}`);
      toast.success('Assignment removed'); load();
    } catch { toast.error('Failed'); }
  };

  const handleDelete = async (s) => {
    if (!window.confirm(`Deactivate "${s.name}"?`)) return;
    try { await axios.delete(`/api/hod/subjects/${s._id}`); toast.success('Deactivated'); load(); }
    catch { toast.error('Failed'); }
  };

  if (loading) return <div className="loading-screen"><div className="spinner"></div></div>;

  const grouped = {};
  subjects.forEach(s => { if (!grouped[s.semester]) grouped[s.semester]=[]; grouped[s.semester].push(s); });

  return (
    <div>
      <div className="page-header">
        <div><div className="page-title">Subject Management</div><div className="page-subtitle">Create subjects and assign sections with faculty</div></div>
        <button className="btn btn-primary" onClick={openCreate}>＋ Add Subject</button>
      </div>

      <div className="filter-bar">
        <select className="form-select" style={{ width:180 }} value={semFilter} onChange={e => setSemFilter(e.target.value)}>
          <option value="">All Semesters</option>
          {SEMESTERS.map(s => <option key={s} value={s}>Semester {s}</option>)}
        </select>
        {semFilter && <button className="btn btn-outline btn-sm" onClick={clearFilter}>✕ Clear</button>}
        <span className="text-muted" style={{ fontSize:13 }}>{subjects.length} subjects</span>
      </div>

      {subjects.length === 0
        ? <div className="card"><div className="empty-state"><div className="empty-icon">📚</div><div className="empty-text">No subjects found</div></div></div>
        : Object.keys(grouped).sort((a,b)=>Number(a)-Number(b)).map(sem => (
          <div key={sem} className="card mt-16">
            <div className="card-header">
              <span className="card-title">📚 Semester {sem}</span>
              <span className="badge badge-blue">{grouped[sem].length} subjects</span>
            </div>
            {grouped[sem].map(s => (
              <div key={s._id} style={{ borderBottom:'1px solid var(--border)', padding:'16px 20px' }}>
                {/* Subject header row */}
                <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', flexWrap:'wrap', gap:10 }}>
                  <div>
                    <span style={{ fontWeight:700, fontSize:15 }}>{s.name}</span>
                    <span className="badge badge-purple" style={{ marginLeft:8 }}>{s.code}</span>
                    <span className="text-muted" style={{ fontSize:12, marginLeft:8 }}>{s.credits} credits · Max {s.maxMidMarks} marks</span>
                  </div>
                  <div className="gap-8">
                    <button className="btn btn-primary btn-sm" onClick={() => { setAssignModal(s); setAssignForm({ sectionId:'', facultyId:'' }); }}>
                      ＋ Assign Section
                    </button>
                    <button className="btn btn-outline btn-sm" onClick={() => openEdit(s)}>✏️</button>
                    {s.isActive && <button className="btn btn-danger btn-sm" onClick={() => handleDelete(s)}>🗑</button>}
                  </div>
                </div>

                {/* Assignments */}
                {s.assignments?.length > 0 && (
                  <div style={{ marginTop:12, display:'flex', flexWrap:'wrap', gap:8 }}>
                    {s.assignments.map(a => (
                      <div key={a._id} style={{
                        display:'flex', alignItems:'center', gap:8,
                        background:'#f0fdf4', border:'1px solid #bbf7d0',
                        borderRadius:8, padding:'6px 12px', fontSize:13
                      }}>
                        <span>🏫 <strong>Sec {a.section?.name}</strong></span>
                        <span style={{ color:'var(--text-muted)' }}>→</span>
                        <span>👩‍🏫 {a.faculty?.name}</span>
                        <button onClick={() => handleRemoveAssign(s._id, a._id)}
                          style={{ background:'none', border:'none', cursor:'pointer', color:'var(--danger)', fontSize:16, lineHeight:1, padding:'0 2px' }}>×</button>
                      </div>
                    ))}
                  </div>
                )}
                {(!s.assignments || s.assignments.length === 0) && (
                  <div style={{ marginTop:8, fontSize:12, color:'var(--danger)' }}>⚠ No sections assigned yet</div>
                )}
              </div>
            ))}
          </div>
        ))}

      {/* Add/Edit Subject Modal */}
      {modal && (
        <div className="modal-overlay" onClick={e => e.target===e.currentTarget && setModal(false)}>
          <div className="modal">
            <div className="modal-header">
              <span className="modal-title">{editing?'✏️ Edit Subject':'📚 Add Subject'}</span>
              <button className="modal-close" onClick={() => setModal(false)}>×</button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="modal-body">
                <div className="form-group">
                  <label className="form-label">Subject Name *</label>
                  <input className="form-input" value={form.name} onChange={e => setForm({...form,name:e.target.value})} placeholder="e.g. Data Structures" required />
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Code *</label>
                    <input className="form-input" value={form.code} onChange={e => setForm({...form,code:e.target.value.toUpperCase()})} placeholder="e.g. CS301" required />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Semester *</label>
                    <select className="form-select" value={form.semester} onChange={e => setForm({...form,semester:Number(e.target.value)})} required>
                      <option value="">Select</option>
                      {SEMESTERS.map(s => <option key={s} value={s}>Semester {s}</option>)}
                    </select>
                  </div>
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Credits</label>
                    <input className="form-input" type="number" min={1} max={6} value={form.credits} onChange={e => setForm({...form,credits:Number(e.target.value)})} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Max Mid Marks</label>
                    <input className="form-input" type="number" min={10} max={100} value={form.maxMidMarks} onChange={e => setForm({...form,maxMidMarks:Number(e.target.value)})} />
                  </div>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-outline" onClick={() => setModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={saving}>{saving?'Saving...':editing?'Update':'Add Subject'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Assign Section+Faculty Modal */}
      {assignModal && (
        <div className="modal-overlay" onClick={e => e.target===e.currentTarget && setAssignModal(null)}>
          <div className="modal" style={{ maxWidth:460 }}>
            <div className="modal-header">
              <span className="modal-title">🏫 Assign Section — {assignModal.name}</span>
              <button className="modal-close" onClick={() => setAssignModal(null)}>×</button>
            </div>
            <div className="modal-body">
              {/* Existing assignments */}
              {assignModal.assignments?.length > 0 && (
                <div style={{ marginBottom:16 }}>
                  <div style={{ fontSize:13, fontWeight:600, marginBottom:8 }}>Current Assignments:</div>
                  {assignModal.assignments.map(a => (
                    <div key={a._id} style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'6px 10px', background:'#f0fdf4', borderRadius:6, marginBottom:6, fontSize:13 }}>
                      <span>Sec <strong>{a.section?.name}</strong> → {a.faculty?.name}</span>
                      <button onClick={() => handleRemoveAssign(assignModal._id, a._id)}
                        style={{ background:'none', border:'none', cursor:'pointer', color:'var(--danger)', fontWeight:700 }}>Remove</button>
                    </div>
                  ))}
                  <hr className="divider" />
                </div>
              )}

              <div style={{ fontSize:13, fontWeight:600, marginBottom:12 }}>Add New Assignment:</div>
              <form onSubmit={handleAssign}>
                <div className="form-group">
                  <label className="form-label">Section *</label>
                  <select className="form-select" value={assignForm.sectionId} onChange={e => setAssignForm({...assignForm,sectionId:e.target.value})} required>
                    <option value="">Select Section</option>
                    {sections.map(s => <option key={s._id} value={s._id}>Section {s.name} (Sem {s.semester})</option>)}
                  </select>
                  {sections.length===0 && <div className="form-error">No sections for Semester {assignModal.semester}. Ask Admin to create sections.</div>}
                </div>
                <div className="form-group">
                  <label className="form-label">Faculty *</label>
                  <select className="form-select" value={assignForm.facultyId} onChange={e => setAssignForm({...assignForm,facultyId:e.target.value})} required>
                    <option value="">Select Faculty</option>
                    {faculty.map(f => <option key={f._id} value={f._id}>{f.name} ({f.rollNumber})</option>)}
                  </select>
                </div>
                <div className="modal-footer" style={{ padding:0, marginTop:4 }}>
                  <button type="button" className="btn btn-outline" onClick={() => setAssignModal(null)}>Close</button>
                  <button type="submit" className="btn btn-primary" disabled={saving}>{saving?'Saving...':'Assign'}</button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
