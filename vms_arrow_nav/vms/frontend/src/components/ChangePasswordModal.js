import React, { useState } from 'react';
import axios from 'axios';
import { toast } from 'react-toastify';
import { useAuth } from '../context/AuthContext';

export default function ChangePasswordModal({ forced = false, onClose }) {
  const { refreshUser, logout } = useAuth();
  const [form, setForm]     = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
  const [saving, setSaving] = useState(false);
  const [show, setShow]     = useState({ cur: false, new: false, conf: false });

  const handle = async (e) => {
    e.preventDefault();
    if (form.newPassword !== form.confirmPassword)
      return toast.error('New passwords do not match');
    if (form.newPassword.length < 6)
      return toast.error('Password must be at least 6 characters');
    if (form.newPassword === form.currentPassword)
      return toast.error('New password must be different from current password');

    setSaving(true);
    try {
      await axios.put('/api/auth/change-password', {
        currentPassword: form.currentPassword,
        newPassword:     form.newPassword
      });
      toast.success('✅ Password changed successfully!');
      await refreshUser();
      if (forced) {
        // After forced change, reload so mustChangePassword=false takes effect
        window.location.reload();
      } else {
        onClose && onClose();
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to change password');
    } finally {
      setSaving(false);
    }
  };

  const Eye = ({ field }) => (
    <button type="button" onClick={() => setShow(s => ({ ...s, [field]: !s[field] }))}
      style={{ position:'absolute', right:10, top:'50%', transform:'translateY(-50%)', background:'none', border:'none', cursor:'pointer', fontSize:16, color:'var(--text-muted)' }}>
      {show[field] ? '🙈' : '👁️'}
    </button>
  );

  return (
    <div className="modal-overlay" onClick={e => !forced && e.target === e.currentTarget && onClose && onClose()}>
      <div className="modal" style={{ maxWidth: 440 }}>
        <div className="modal-header">
          <span className="modal-title">
            {forced ? '🔐 Set Your Password' : '🔑 Change Password'}
          </span>
          {!forced && <button className="modal-close" onClick={onClose}>×</button>}
        </div>

        {forced && (
          <div className="warning-box" style={{ margin: '16px 22px 0' }}>
            ⚠️ You must set a new password before continuing. Your default password is your roll number.
          </div>
        )}

        <form onSubmit={handle}>
          <div className="modal-body">
            {[
              { label: 'Current Password',     key: 'currentPassword', field: 'cur'  },
              { label: 'New Password',          key: 'newPassword',     field: 'new'  },
              { label: 'Confirm New Password',  key: 'confirmPassword', field: 'conf' }
            ].map(({ label, key, field }) => (
              <div className="form-group" key={key}>
                <label className="form-label">{label} *</label>
                <div style={{ position: 'relative' }}>
                  <input
                    className="form-input"
                    type={show[field] ? 'text' : 'password'}
                    value={form[key]}
                    onChange={e => setForm({ ...form, [key]: e.target.value })}
                    placeholder={label}
                    required
                    style={{ paddingRight: 36 }}
                  />
                  <Eye field={field} />
                </div>
              </div>
            ))}

            <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>
              Password must be at least 6 characters.
            </div>
          </div>

          <div className="modal-footer">
            {!forced && <button type="button" className="btn btn-outline" onClick={onClose}>Cancel</button>}
            {forced && (
              <button type="button" className="btn btn-outline" onClick={() => { logout(); window.location.href='/login'; }}>
                Logout
              </button>
            )}
            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving ? '⏳ Saving...' : forced ? 'Set Password & Continue' : 'Change Password'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
