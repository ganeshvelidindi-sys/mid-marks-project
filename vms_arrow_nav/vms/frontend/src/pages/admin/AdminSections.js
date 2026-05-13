import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { toast } from 'react-toastify';

const SEMESTERS = [1,2,3,4,5,6,7,8];

export default function AdminSections() {
  const [sections,    setSections]    = useState([]);
  const [departments, setDepartments] = useState([]);
  const [loading,     setLoading]     = useState(true);
  const [modal,       setModal]       = useState(false);
  const [saving,      setSaving]      = useState(false);
  const [form,        setForm]        = useState({ name:'', department:'', semester:'' });
  const [filter,      setFilter]      = useState({ department:'', semester:'' });

  // Fix-dept modal for "Unknown" sections
  const [fixModal,    setFixModal]    = useState(false);
  const [fixSection,  setFixSection]  = useState(null);
  const [fixDeptId,   setFixDeptId]   = useState('');
  const [fixSaving,   setFixSaving]   = useState(false);

  const clearFilters = () => setFilter({ department:'', semester:'' });
  const hasFilters   = filter.department || filter.semester;

  const load = () => {
    const params = {};
    if (filter.department) params.department = filter.department;
    if (filter.semester)   params.semester   = filter.semester;
    Promise.all([
      axios.get('/api/admin/sections', { params }),
      axios.get('/api/admin/departments')
    ]).then(([sRes, dRes]) => {
      setSections(sRes.data.sections);
      setDepartments(dRes.data.departments.filter(d => d.isActive));
      setLoading(false);
    });
  };
  useEffect(load, [filter]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name || !form.department || !form.semester) return toast.error('All fields are required');
    setSaving(true);
    try {
      await axios.post('/api/admin/sections', form);
      toast.success(`Section ${form.name.toUpperCase()} created`);
      setModal(false);
      setForm({ name:'', department:'', semester:'' });
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Error creating section');
    } finally { setSaving(false); }
  };

  const handleDelete = async (sec) => {
    if (!window.confirm(`Deactivate Section ${sec.name}?`)) return;
    try { await axios.delete(`/api/admin/sections/${sec._id}`); toast.success('Deactivated'); load(); }
    catch { toast.error('Failed'); }
  };

  // Fix unknown section — assign correct department
  const openFix = (sec) => { setFixSection(sec); setFixDeptId(''); setFixModal(true); };
  const handleFix = async () => {
    if (!fixDeptId) return toast.error('Select a department');
    setFixSaving(true);
    try {
      await axios.put(`/api/admin/sections/${fixSection._id}`, { department: fixDeptId });
      toast.success('Section department fixed!');
      setFixModal(false);
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to fix section');
    } finally { setFixSaving(false); }
  };

  if (loading) return <div className="loading-screen"><div className="spinner"></div></div>;

  // Group by department → semester
  const grouped = {};
  sections.forEach(s => {
    const dname = s.department?.name || '⚠️ Unknown Department';
    if (!grouped[dname]) grouped[dname] = { isUnknown: !s.department?.name, sections: {} };
    if (!grouped[dname].sections[s.semester]) grouped[dname].sections[s.semester] = [];
    grouped[dname].sections[s.semester].push(s);
  });

  return (
    <div>
      <div className="page-header">
        <div><div className="page-title">Section Management</div><div className="page-subtitle">Create sections per department and semester</div></div>
        <button className="btn btn-primary" onClick={() => setModal(true)}>＋ Create Section</button>
      </div>

      <div className="filter-bar">
        <select className="form-select" style={{ width:200 }} value={filter.department} onChange={e => setFilter({...filter, department: e.target.value})}>
          <option value="">All Departments</option>
          {departments.map(d => <option key={d._id} value={d._id}>{d.name}</option>)}
        </select>
        <select className="form-select" style={{ width:160 }} value={filter.semester} onChange={e => setFilter({...filter, semester: e.target.value})}>
          <option value="">All Semesters</option>
          {SEMESTERS.map(s => <option key={s} value={s}>Semester {s}</option>)}
        </select>
        <span className="text-muted" style={{ fontSize:13 }}>{sections.length} sections</span>
        {hasFilters && <button className="btn btn-outline btn-sm" onClick={clearFilters}>✕ Clear Filters</button>}
      </div>

      {/* Warning banner for unknown sections */}
      {Object.keys(grouped).some(k => k.startsWith('⚠️')) && (
        <div style={{
          background:'#fef3c7', border:'1.5px solid #f59e0b', borderRadius:10,
          padding:'12px 18px', marginBottom:16, fontSize:13, color:'#92400e', fontWeight:600
        }}>
          ⚠️ Some sections have no department assigned (shown below). Click <strong>"Fix Department"</strong> on each to assign them to the correct department.
        </div>
      )}

      {sections.length === 0 ? (
        <div className="card"><div className="empty-state"><div className="empty-icon">🏫</div><div className="empty-text">No sections yet</div></div></div>
      ) : (
        Object.keys(grouped).map(dept => {
          const grp = grouped[dept];
          const isUnknown = grp.isUnknown;
          return (
            <div key={dept} className="card mt-16" style={{ border: isUnknown ? '2px solid #f59e0b' : undefined }}>
              <div className="card-header" style={{ background: isUnknown ? '#fef9c3' : undefined }}>
                <span className="card-title">{isUnknown ? '⚠️' : '🏢'} {dept}</span>
                {isUnknown && (
                  <span style={{ fontSize:12, color:'#92400e', fontWeight:600 }}>
                    — Click "Fix Department" on each section below
                  </span>
                )}
              </div>
              <div className="card-body" style={{ padding:0 }}>
                {Object.keys(grp.sections).sort((a,b)=>Number(a)-Number(b)).map(sem => (
                  <div key={sem} style={{ borderBottom:'1px solid var(--border)', padding:'12px 20px' }}>
                    <div style={{ fontSize:13, fontWeight:600, color:'var(--text-muted)', marginBottom:10 }}>Semester {sem}</div>
                    <div style={{ display:'flex', gap:10, flexWrap:'wrap' }}>
                      {grp.sections[sem].map(sec => (
                        <div key={sec._id} style={{
                          display:'flex', alignItems:'center', gap:8,
                          background: isUnknown ? '#fef3c7' : sec.isActive ? '#eff6ff' : '#f1f5f9',
                          border:`1.5px solid ${isUnknown?'#f59e0b':sec.isActive?'#bfdbfe':'#e2e8f0'}`,
                          borderRadius:8, padding:'8px 14px'
                        }}>
                          <span style={{ fontWeight:700, fontSize:15, color: isUnknown?'#b45309':sec.isActive?'#1a56db':'#94a3b8' }}>
                            Section {sec.name}
                          </span>
                          {!sec.isActive && <span className="badge badge-red" style={{ fontSize:10 }}>Inactive</span>}
                          {isUnknown && (
                            <button className="btn btn-sm" onClick={() => openFix(sec)}
                              style={{ background:'#f59e0b', color:'white', border:'none', fontSize:11, padding:'3px 8px', borderRadius:5, cursor:'pointer' }}>
                              🔧 Fix Department
                            </button>
                          )}
                          {sec.isActive && !isUnknown && (
                            <button className="btn btn-danger btn-sm btn-icon" onClick={() => handleDelete(sec)} style={{ padding:'2px 6px', fontSize:12 }}>🗑</button>
                          )}
                          {isUnknown && (
                            <button className="btn btn-danger btn-sm" onClick={() => handleDelete(sec)} style={{ padding:'2px 6px', fontSize:11 }}>🗑 Delete</button>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })
      )}

      {/* Create Section Modal */}
      {modal && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setModal(false)}>
          <div className="modal" style={{ maxWidth:420 }}>
            <div className="modal-header">
              <span className="modal-title">🏫 Create Section</span>
              <button className="modal-close" onClick={() => setModal(false)}>×</button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="modal-body">
                <div className="info-box">Sections are unique per department + semester (e.g. CSE Sem-1 Section A)</div>
                <div className="form-group">
                  <label className="form-label">Department *</label>
                  <select className="form-select" value={form.department} onChange={e => setForm({...form, department: e.target.value})} required>
                    <option value="">Select Department</option>
                    {departments.map(d => <option key={d._id} value={d._id}>{d.name} ({d.code})</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Semester *</label>
                  <select className="form-select" value={form.semester} onChange={e => setForm({...form, semester: e.target.value})} required>
                    <option value="">Select Semester</option>
                    {SEMESTERS.map(s => <option key={s} value={s}>Semester {s}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Section Name *</label>
                  <input className="form-input" value={form.name}
                    onChange={e => setForm({...form, name: e.target.value.toUpperCase()})}
                    placeholder="e.g. A, B, C" maxLength={5} required />
                  <div style={{ fontSize:12, color:'var(--text-muted)', marginTop:4 }}>Usually a single letter: A, B, C...</div>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-outline" onClick={() => setModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={saving}>{saving?'Creating...':'Create Section'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Fix Department Modal for Unknown sections */}
      {fixModal && fixSection && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setFixModal(false)}>
          <div className="modal" style={{ maxWidth:420 }}>
            <div className="modal-header">
              <span className="modal-title">🔧 Fix Section Department</span>
              <button className="modal-close" onClick={() => setFixModal(false)}>×</button>
            </div>
            <div className="modal-body">
              <div style={{ background:'#fef3c7', border:'1px solid #f59e0b', borderRadius:8, padding:'10px 14px', marginBottom:16, fontSize:13 }}>
                <strong>Section {fixSection.name}</strong> — Semester {fixSection.semester}<br/>
                <span style={{ color:'#92400e' }}>This section has no department. Please assign it to the correct department.</span>
              </div>
              <div className="form-group">
                <label className="form-label">Assign to Department *</label>
                <select className="form-select" value={fixDeptId} onChange={e => setFixDeptId(e.target.value)}>
                  <option value="">Select Department</option>
                  {departments.map(d => <option key={d._id} value={d._id}>{d.name} ({d.code})</option>)}
                </select>
              </div>
            </div>
            <div className="modal-footer">
              <button type="button" className="btn btn-outline" onClick={() => setFixModal(false)}>Cancel</button>
              <button type="button" className="btn btn-primary" onClick={handleFix} disabled={fixSaving || !fixDeptId}>
                {fixSaving ? 'Fixing...' : '🔧 Fix Department'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
