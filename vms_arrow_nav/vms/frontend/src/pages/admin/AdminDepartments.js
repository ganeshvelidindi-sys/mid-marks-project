import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { toast } from 'react-toastify';

const emptyForm = { name:'', code:'', description:'' };

export default function AdminDepartments() {
  const [departments, setDepartments] = useState([]);
  const [loading,     setLoading]     = useState(true);
  const [modal,       setModal]       = useState(false);
  const [editing,     setEditing]     = useState(null);
  const [form,        setForm]        = useState(emptyForm);
  const [saving,      setSaving]      = useState(false);

  const load = () => {
    axios.get('/api/admin/departments').then(res => {
      setDepartments(res.data.departments);
      setLoading(false);
    });
  };
  useEffect(load, []);

  const openCreate = () => { setEditing(null); setForm(emptyForm); setModal(true); };
  const openEdit   = (d)  => { setEditing(d); setForm({ name: d.name, code: d.code, description: d.description||'' }); setModal(true); };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name.trim() || !form.code.trim()) return toast.error('Name and code are required');
    setSaving(true);
    try {
      if (editing) {
        await axios.put(`/api/admin/departments/${editing._id}`, form);
        toast.success('Department updated');
      } else {
        await axios.post('/api/admin/departments', form);
        toast.success('Department created');
      }
      setModal(false); load();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Error saving department');
    } finally { setSaving(false); }
  };

  const handleToggle = async (d) => {
    const action = d.isActive ? 'Deactivate' : 'Activate';
    if (!window.confirm(`${action} department "${d.name}"?`)) return;
    try {
      const res = await axios.put(`/api/admin/departments/${d._id}/toggle`);
      toast.success(res.data.message);
      load();
    } catch { toast.error('Failed'); }
  };

  if (loading) return <div className="loading-screen"><div className="spinner"></div></div>;

  return (
    <div>
      <div className="page-header">
        <div><div className="page-title">Departments</div><div className="page-subtitle">Manage departments • Activate or deactivate as needed</div></div>
        <button className="btn btn-primary" onClick={openCreate}>＋ Add Department</button>
      </div>

      <div className="card">
        <div className="table-wrapper">
          {departments.length === 0
            ? <div className="empty-state"><div className="empty-icon">🏢</div><div className="empty-text">No departments yet</div></div>
            : (
              <table>
                <thead>
                  <tr><th>#</th><th>Department Name</th><th>Code</th><th>Description</th><th>Status</th><th>Actions</th></tr>
                </thead>
                <tbody>
                  {departments.map((d, i) => (
                    <tr key={d._id} style={{ opacity: d.isActive ? 1 : 0.6 }}>
                      <td>{i+1}</td>
                      <td className="fw-600">{d.name}</td>
                      <td><span className="badge badge-blue">{d.code}</span></td>
                      <td className="text-muted">{d.description || '—'}</td>
                      <td><span className={`badge ${d.isActive?'badge-green':'badge-red'}`}>{d.isActive?'Active':'Inactive'}</span></td>
                      <td>
                        <div className="gap-8">
                          <button className="btn btn-outline btn-sm" onClick={() => openEdit(d)}>✏️ Edit</button>
                          <button
                            className={`btn btn-sm ${d.isActive ? 'btn-danger' : 'btn-outline'}`}
                            onClick={() => handleToggle(d)}
                          >{d.isActive ? '🔴 Deactivate' : '🟢 Activate'}</button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
        </div>
      </div>

      {modal && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setModal(false)}>
          <div className="modal" style={{ maxWidth:480 }}>
            <div className="modal-header">
              <span className="modal-title">{editing ? '✏️ Edit Department' : '🏢 Create Department'}</span>
              <button className="modal-close" onClick={() => setModal(false)}>×</button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="modal-body">
                <div className="form-group">
                  <label className="form-label">Department Name *</label>
                  <input className="form-input" value={form.name} onChange={e => setForm({...form, name: e.target.value})} placeholder="e.g. Computer Science Engineering" required />
                </div>
                <div className="form-group">
                  <label className="form-label">Department Code *</label>
                  <input className="form-input" value={form.code} onChange={e => setForm({...form, code: e.target.value.toUpperCase()})} placeholder="e.g. CSE" required />
                </div>
                <div className="form-group">
                  <label className="form-label">Description</label>
                  <input className="form-input" value={form.description} onChange={e => setForm({...form, description: e.target.value})} placeholder="Optional description" />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-outline" onClick={() => setModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={saving}>{saving?'Saving...':editing?'Update':'Create'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
