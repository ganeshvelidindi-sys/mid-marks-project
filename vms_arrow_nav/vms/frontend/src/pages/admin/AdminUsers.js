import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { toast } from 'react-toastify';

const ROLES     = ['admin','faculty','student'];
const SEMESTERS = [1,2,3,4,5,6,7,8];
const emptyForm = { name:'', rollNumber:'', role:'student', department:'', semester:'', sectionId:'' };
const roleBadge = { admin:'badge-red', faculty:'badge-purple', student:'badge-blue' };

export default function AdminUsers() {
  const [users,       setUsers]       = useState([]);
  const [departments, setDepartments] = useState([]);
  const [sections,    setSections]    = useState([]);
  const [loading,     setLoading]     = useState(true);
  const [modal,       setModal]       = useState(false);
  const [editing,     setEditing]     = useState(null);
  const [form,        setForm]        = useState(emptyForm);
  const [saving,      setSaving]      = useState(false);
  const [filter,      setFilter]      = useState({ role:'', department:'' });
  const [search,      setSearch]      = useState('');

  // HOD promote/demote
  const [hodModal,    setHodModal]    = useState(false);
  const [hodUser,     setHodUser]     = useState(null);
  const [hodAction,   setHodAction]   = useState('promote');
  const [hodDeptId,   setHodDeptId]   = useState('');

  // Change section modal
  const [secModal,    setSecModal]    = useState(false);
  const [secUser,     setSecUser]     = useState(null);
  const [secSections, setSecSections] = useState([]);
  const [newSecId,    setNewSecId]    = useState('');
  const [newSem,      setNewSem]      = useState('');
  const [secSaving,   setSecSaving]   = useState(false);

  const load = () => {
    const params = {};
    if (filter.role)       params.role       = filter.role;
    if (filter.department) params.department = filter.department;
    Promise.all([
      axios.get('/api/admin/users', { params }),
      axios.get('/api/admin/departments')
    ]).then(([uRes, dRes]) => {
      setUsers(uRes.data.users);
      setDepartments(dRes.data.departments);
      setLoading(false);
    });
  };
  useEffect(load, [filter]);

  // Load sections for create/edit form (students)
  useEffect(() => {
    if (form.department && form.semester && form.role === 'student') {
      axios.get('/api/admin/sections', { params: { department: form.department, semester: form.semester } })
        .then(res => setSections(res.data.sections.filter(s => s.isActive)))
        .catch(() => setSections([]));
    } else { setSections([]); }
  }, [form.department, form.semester, form.role]);

  // Load sections for change-section modal
  useEffect(() => {
    if (secUser && newSem) {
      axios.get('/api/admin/sections', { params: { department: secUser.department?._id, semester: newSem } })
        .then(res => { setSecSections(res.data.sections.filter(s => s.isActive)); setNewSecId(''); })
        .catch(() => setSecSections([]));
    }
  }, [secUser, newSem]);

  const openCreate = () => { setEditing(null); setForm(emptyForm); setModal(true); };
  const openEdit   = (u) => {
    setEditing(u);
    setForm({ name: u.name, rollNumber: u.rollNumber, role: u.role, department: u.department?._id||'', semester: u.semester||'', sectionId: u.sectionId?._id||'' });
    setModal(true);
  };
  const openHodModal = (u, action) => { setHodUser(u); setHodAction(action); setHodDeptId(''); setHodModal(true); };

  // Open change-section modal for a student
  const openSecModal = (u) => {
    setSecUser(u);
    setNewSem(u.semester?.toString() || '');
    setNewSecId('');
    setSecSections([]);
    setSecModal(true);
  };

  const clearFilters = () => { setFilter({ role:'', department:'' }); setSearch(''); };
  const hasFilters   = filter.role || filter.department || search;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name.trim() || !form.rollNumber.trim()) return toast.error('Name and roll number required');
    if (form.role === 'student' && !form.department) return toast.error('Department required for students');
    if (form.role === 'student' && !form.semester)   return toast.error('Semester is required for students');
    if (form.role === 'student' && !form.sectionId)  return toast.error('Section is required for students');
    setSaving(true);
    try {
      const selectedSection = sections.find(s => s._id === form.sectionId);
      const payload = { ...form, section: selectedSection?.name || '' };
      if (editing) {
        await axios.put(`/api/admin/users/${editing._id}`, payload);
        toast.success('User updated');
      } else {
        await axios.post('/api/admin/users', payload);
        toast.success(`User created! Default password: ${form.rollNumber.toUpperCase()}`);
      }
      setModal(false); load();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Error saving user');
    } finally { setSaving(false); }
  };

  const handleToggle = async (u) => {
    const action = u.isActive ? 'Deactivate' : 'Activate';
    if (!window.confirm(`${action} "${u.name}"?`)) return;
    try {
      await axios.put(`/api/admin/users/${u._id}/toggle`);
      toast.success(`User ${u.isActive ? 'deactivated' : 'activated'}`);
      load();
    } catch { toast.error('Failed'); }
  };

  const handleReset = async (u) => {
    if (!window.confirm(`Reset password for "${u.name}" to roll number?`)) return;
    try { await axios.put(`/api/admin/users/${u._id}/reset-password`); toast.success('Password reset'); }
    catch { toast.error('Failed'); }
  };

  const handleHodAction = async () => {
    if (!hodDeptId) return toast.error('Select a department');
    try {
      const ep = hodAction === 'promote'
        ? `/api/admin/users/${hodUser._id}/promote-hod`
        : `/api/admin/users/${hodUser._id}/demote-hod`;
      const res = await axios.put(ep, { departmentId: hodDeptId });
      toast.success(res.data.message);
      setHodModal(false); load();
    } catch (err) { toast.error(err.response?.data?.message || 'Failed'); }
  };

  // Save section change
  const handleSecChange = async () => {
    if (!newSecId) return toast.error('Select a section');
    if (!newSem)   return toast.error('Select a semester');
    setSecSaving(true);
    try {
      const sec = secSections.find(s => s._id === newSecId);
      await axios.put(`/api/admin/users/${secUser._id}`, {
        semester:  Number(newSem),
        sectionId: newSecId,
        section:   sec?.name || ''
      });
      toast.success(`✅ ${secUser.name} moved to Semester ${newSem} Section ${sec?.name}`);
      setSecModal(false); load();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to change section');
    } finally { setSecSaving(false); }
  };

  const filtered = users.filter(u => {
    if (!search) return true;
    const q = search.toLowerCase();
    return u.name.toLowerCase().includes(q) || u.rollNumber.toLowerCase().includes(q);
  });

  if (loading) return <div className="loading-screen"><div className="spinner"></div></div>;

  const hodDemoteDepts  = hodUser?.hodDepartments || [];
  const hodPromoteDepts = departments.filter(d =>
    d.isActive && !(hodUser?.hodDepartments||[]).map(hd => hd._id || hd).includes(d._id)
  );

  return (
    <div>
      <div className="page-header">
        <div><div className="page-title">User Management</div><div className="page-subtitle">Create and manage users • Promote/Demote HOD • Change Student Section</div></div>
        <button className="btn btn-primary" onClick={openCreate}>＋ Add User</button>
      </div>

      <div className="filter-bar">
        <input className="form-input-sm" style={{ width:220 }} placeholder="🔍 Search name or roll no..." value={search} onChange={e => setSearch(e.target.value)} />
        <select className="form-select" style={{ width:150 }} value={filter.role} onChange={e => setFilter({...filter, role: e.target.value})}>
          <option value="">All Roles</option>
          {ROLES.map(r => <option key={r} value={r}>{r.charAt(0).toUpperCase()+r.slice(1)}</option>)}
        </select>
        <select className="form-select" style={{ width:200 }} value={filter.department} onChange={e => setFilter({...filter, department: e.target.value})}>
          <option value="">All Departments</option>
          {departments.map(d => <option key={d._id} value={d._id}>{d.name}</option>)}
        </select>
        {hasFilters && <button className="btn btn-outline btn-sm" onClick={clearFilters}>✕ Clear Filters</button>}
        <span className="text-muted" style={{ fontSize:13 }}>{filtered.length} users</span>
      </div>

      <div className="card">
        <div className="table-wrapper">
          {filtered.length === 0
            ? <div className="empty-state"><div className="empty-icon">👥</div><div className="empty-text">No users found</div></div>
            : (
              <table>
                <thead>
                  <tr><th>#</th><th>Name</th><th>Roll Number</th><th>Role</th><th>Department</th><th>Sem</th><th>Section</th><th>Status</th><th>Actions</th></tr>
                </thead>
                <tbody>
                  {filtered.map((u, i) => (
                    <tr key={u._id}>
                      <td>{i+1}</td>
                      <td className="fw-600">{u.name}</td>
                      <td style={{ fontFamily:'monospace', fontSize:13 }}>{u.rollNumber}</td>
                      <td>
                        <span className={`badge ${roleBadge[u.role] || 'badge-gray'}`}>{u.role}</span>
                        {u.isHod && <span className="badge badge-yellow" style={{ marginLeft:4 }}>HOD</span>}
                      </td>
                      <td>
                        {u.role === 'faculty' && u.isHod
                          ? <span style={{ fontSize:12, color:'#7c3aed' }}>HOD: {(u.hodDepartments||[]).map(d=>d.code||d).join(', ')}</span>
                          : u.department?.name || '—'}
                      </td>
                      <td>{u.semester || '—'}</td>
                      <td>
                        {u.sectionId
                          ? <span className="badge badge-blue">Sec {u.sectionId.name}</span>
                          : u.section
                          ? <span className="badge badge-gray">{u.section}</span>
                          : '—'}
                      </td>
                      <td><span className={`badge ${u.isActive?'badge-green':'badge-red'}`}>{u.isActive?'Active':'Inactive'}</span></td>
                      <td>
                        <div className="gap-8" style={{ flexWrap:'wrap' }}>
                          <button className="btn btn-outline btn-sm" onClick={() => openEdit(u)}>✏️</button>
                          <button className="btn btn-outline btn-sm" title="Reset Password" onClick={() => handleReset(u)}>🔑</button>
                          {/* Change Section — only for students */}
                          {u.role === 'student' && (
                            <button className="btn btn-outline btn-sm" title="Change Section/Semester"
                              onClick={() => openSecModal(u)}
                              style={{ color:'#0891b2', borderColor:'#0891b2', fontSize:11 }}>
                              🔄 Section
                            </button>
                          )}
                          {u.role === 'faculty' && (
                            <button className="btn btn-outline btn-sm" title="Promote to HOD"
                              onClick={() => openHodModal(u, 'promote')}
                              style={{ color:'#7c3aed', borderColor:'#7c3aed', fontSize:11 }}>⬆ HOD</button>
                          )}
                          {u.isHod && (
                            <button className="btn btn-outline btn-sm" title="Demote from HOD"
                              onClick={() => openHodModal(u, 'demote')}
                              style={{ color:'#dc2626', borderColor:'#dc2626', fontSize:11 }}>⬇ HOD</button>
                          )}
                          <button
                            className={`btn btn-sm ${u.isActive ? 'btn-danger' : 'btn-outline'}`}
                            onClick={() => handleToggle(u)} style={{ fontSize:11 }}
                          >{u.isActive ? '🔴 Deactivate' : '🟢 Activate'}</button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
        </div>
      </div>

      {/* ── Create/Edit Modal ── */}
      {modal && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setModal(false)}>
          <div className="modal">
            <div className="modal-header">
              <span className="modal-title">{editing ? '✏️ Edit User' : '👤 Create User'}</span>
              <button className="modal-close" onClick={() => setModal(false)}>×</button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="modal-body">
                {!editing && <div className="info-box">Default password = Roll Number (uppercase)</div>}
                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Full Name *</label>
                    <input className="form-input" value={form.name} onChange={e => setForm({...form, name: e.target.value})} required />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Roll / Employee Number *</label>
                    <input className="form-input" value={form.rollNumber} onChange={e => setForm({...form, rollNumber: e.target.value})} required disabled={!!editing} />
                  </div>
                </div>
                <div className="form-group">
                  <label className="form-label">Role *</label>
                  <select className="form-select" value={form.role} onChange={e => setForm({...form, role: e.target.value, department:'', semester:'', sectionId:''})}>
                    {ROLES.map(r => <option key={r} value={r}>{r.charAt(0).toUpperCase()+r.slice(1)}</option>)}
                  </select>
                </div>
                {(form.role === 'student' || form.role === 'faculty') && (
                  <div className="form-group">
                    <label className="form-label">Department {form.role === 'student' ? '*' : '(informational)'}</label>
                    <select className="form-select" value={form.department}
                      onChange={e => setForm({...form, department: e.target.value, sectionId:''})}
                      required={form.role === 'student'}>
                      <option value="">Select Department</option>
                      {departments.filter(d => d.isActive).map(d => <option key={d._id} value={d._id}>{d.name} ({d.code})</option>)}
                    </select>
                    {form.role === 'faculty' && (
                      <div style={{ marginTop:5, fontSize:12, color:'#64748b' }}>
                        ℹ️ Faculty is global — can be assigned to subjects in any department
                      </div>
                    )}
                  </div>
                )}
                {form.role === 'student' && (
                  <>
                    <div className="form-group">
                      <label className="form-label">Semester *</label>
                      <select className="form-select" value={form.semester} onChange={e => setForm({...form, semester: e.target.value, sectionId:''})} required>
                        <option value="">Select Semester</option>
                        {SEMESTERS.map(s => <option key={s} value={s}>Semester {s}</option>)}
                      </select>
                    </div>
                    <div className="form-group">
                      <label className="form-label">Section *</label>
                      <select className="form-select" value={form.sectionId} onChange={e => setForm({...form, sectionId: e.target.value})} required>
                        <option value="">Select Section</option>
                        {sections.map(s => <option key={s._id} value={s._id}>Section {s.name}</option>)}
                      </select>
                      {form.department && form.semester && sections.length === 0 && (
                        <div className="form-error">No sections found. Create sections first.</div>
                      )}
                    </div>
                  </>
                )}
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-outline" onClick={() => setModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={saving}>{saving?'Saving...':editing?'Update':'Create'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Change Section Modal ── */}
      {secModal && secUser && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setSecModal(false)}>
          <div className="modal" style={{ maxWidth:460 }}>
            <div className="modal-header">
              <span className="modal-title">🔄 Change Section / Semester</span>
              <button className="modal-close" onClick={() => setSecModal(false)}>×</button>
            </div>
            <div className="modal-body">
              {/* Current info */}
              <div style={{ background:'#f8fafc', border:'1px solid #e2e8f0', borderRadius:8, padding:'12px 14px', marginBottom:16 }}>
                <div style={{ fontSize:13, fontWeight:700, marginBottom:4 }}>👤 {secUser.name} ({secUser.rollNumber})</div>
                <div style={{ fontSize:12, color:'#64748b' }}>
                  Dept: <strong>{secUser.department?.name || '—'}</strong> &nbsp;|&nbsp;
                  Current: <strong>Sem {secUser.semester} · Sec {secUser.sectionId?.name || secUser.section || '—'}</strong>
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">New Semester *</label>
                <select className="form-select" value={newSem} onChange={e => setNewSem(e.target.value)}>
                  <option value="">Select Semester</option>
                  {SEMESTERS.map(s => <option key={s} value={s}>Semester {s}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">New Section *</label>
                <select className="form-select" value={newSecId} onChange={e => setNewSecId(e.target.value)} disabled={!newSem}>
                  <option value="">{newSem ? 'Select Section' : 'Select semester first'}</option>
                  {secSections.map(s => <option key={s._id} value={s._id}>Section {s.name}</option>)}
                </select>
                {newSem && secSections.length === 0 && (
                  <div className="form-error">No sections found for Sem {newSem}. Create sections first.</div>
                )}
              </div>
              {newSecId && newSem && (
                <div style={{ background:'#f0fdf4', border:'1px solid #86efac', borderRadius:8, padding:'10px 14px', fontSize:13 }}>
                  ✅ Will move <strong>{secUser.name}</strong> to <strong>Semester {newSem} · Section {secSections.find(s=>s._id===newSecId)?.name}</strong>
                </div>
              )}
            </div>
            <div className="modal-footer">
              <button type="button" className="btn btn-outline" onClick={() => setSecModal(false)}>Cancel</button>
              <button type="button" className="btn btn-primary" onClick={handleSecChange}
                disabled={secSaving || !newSecId || !newSem}>
                {secSaving ? '⏳ Saving...' : '🔄 Change Section'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── HOD Promote/Demote Modal ── */}
      {hodModal && hodUser && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setHodModal(false)}>
          <div className="modal" style={{ maxWidth:460 }}>
            <div className="modal-header">
              <span className="modal-title">{hodAction === 'promote' ? '⬆️ Promote to HOD' : '⬇️ Demote from HOD'}</span>
              <button className="modal-close" onClick={() => setHodModal(false)}>×</button>
            </div>
            <div className="modal-body">
              <div style={{ marginBottom:16, padding:'10px 14px', background:'#f8fafc', borderRadius:8, fontSize:14 }}>
                <strong>{hodUser.name}</strong> ({hodUser.rollNumber})
                {hodUser.isHod && (
                  <div style={{ fontSize:12, color:'#7c3aed', marginTop:4 }}>
                    Current HOD of: {(hodUser.hodDepartments||[]).map(d=>d.name||d).join(', ')||'—'}
                  </div>
                )}
              </div>
              <div className="form-group">
                <label className="form-label">{hodAction === 'promote' ? 'Promote as HOD of:' : 'Remove HOD from:'}</label>
                <select className="form-select" value={hodDeptId} onChange={e => setHodDeptId(e.target.value)}>
                  <option value="">Select Department</option>
                  {(hodAction === 'promote' ? hodPromoteDepts : hodDemoteDepts).map(d => (
                    <option key={d._id} value={d._id}>{d.name} ({d.code})</option>
                  ))}
                </select>
                {hodAction === 'promote' && hodPromoteDepts.length === 0 && <div className="form-error">Already HOD of all departments.</div>}
                {hodAction === 'demote'  && hodDemoteDepts.length === 0  && <div className="form-error">Not HOD of any department.</div>}
              </div>
            </div>
            <div className="modal-footer">
              <button type="button" className="btn btn-outline" onClick={() => setHodModal(false)}>Cancel</button>
              <button type="button" className={`btn ${hodAction==='promote'?'btn-primary':'btn-danger'}`}
                onClick={handleHodAction} disabled={!hodDeptId}>
                {hodAction === 'promote' ? '⬆ Promote' : '⬇ Demote'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
