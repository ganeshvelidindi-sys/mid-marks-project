import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import logo from '../assets/vemu1.png';
import '../index.css';

const roleMeta = {
  admin: { label: 'Administrator', emoji: '⚙️', color: '#d97706' },
  hod: { label: 'Head of Department', emoji: '🎓', color: '#7c3aed' },
  faculty: { label: 'Subject Faculty', emoji: '📚', color: '#16a34a' },
  classteacher: { label: 'Class Teacher', emoji: '📋', color: '#1d4ed8' },
  student: { label: 'Student', emoji: '🎒', color: '#db2777' },
};

const THEMES = [
  { key: 'light', icon: '☀️', label: 'Light' },
  { key: 'dim', icon: '🌙', label: 'Dim' },
  { key: 'dark', icon: '🌑', label: 'Dark' },
];

export default function Layout({ navItems, children, activePage, onNavClick }) {
  const { user, logout, login } = useAuth();
  const navigate = useNavigate();
  const [collapsed, setCollapsed] = useState(false);
  const [avatarHover, setAvatarHover] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [theme, setTheme] = useState(() => localStorage.getItem('vemu-theme') || 'light');
  
  // Security Modal State
  const [pwdPrompt, setPwdPrompt] = useState(null);
  const [password, setPassword] = useState('');
  const [pwdError, setPwdError] = useState('');
  const [pwdLoading, setPwdLoading] = useState(false);

  const meta = roleMeta[user?.role] || {};

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (theme === 'light') {
      document.documentElement.removeAttribute('data-theme');
    } else {
      document.documentElement.setAttribute('data-theme', theme);
    }
    localStorage.setItem('vemu-theme', theme);
  }, [theme]);

  const formatTime = (d) => d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true });
  const formatDate = (d) => d.toLocaleDateString('en-IN', { weekday: 'short', day: '2-digit', month: 'short', year: 'numeric' });

  const handleLogout = () => { logout(); navigate('/login'); };

  const handlePwdSubmit = async () => {
    if (!password) {
      setPwdError('Password is required');
      return;
    }
    setPwdLoading(true);
    try {
      await login(user.username, password, user.role);
      const path = pwdPrompt.path;
      setPwdPrompt(null);
      setPassword('');
      setPwdError('');
      toast.success(`Access granted! Switching role...`);
      navigate(path);
    } catch (err) {
      setPwdError(err.response?.data?.message || 'Incorrect password');
    }
    setPwdLoading(false);
  };

  return (
    <div className="app-layout" style={{ background: 'var(--bg)' }}>
      {/* TOPBAR */}
      <div className="topbar">
        <div className="topbar-left">
          <button className="hamburger" onClick={() => setCollapsed(!collapsed)}>
            <span /><span /><span />
          </button>
          <div className="topbar-brand">
            <img src={logo} alt="VEMU" className="t-logo" />
            <div>
              <div className="t-name">VEMU Institute of Technology</div>
              <div className="t-sub">Mid Marks Management System</div>
            </div>
          </div>
        </div>
        <div style={{ flex: 1 }}></div>
        <div className="topbar-right">
          {/* Live Clock */}
          <div className="tb-clock" style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', marginRight: 16, lineHeight: 1.3 }}>
            <span style={{ fontSize: 15, fontWeight: 700, color: '#ffffff', fontFamily: "'Outfit', sans-serif", letterSpacing: 1.5, fontVariantNumeric: 'tabular-nums' }}>{formatTime(currentTime)}</span>
            <span style={{ fontSize: 9.5, fontWeight: 600, color: '#e8b85a', letterSpacing: 2, textTransform: 'uppercase', fontFamily: "'Outfit', sans-serif" }}>{formatDate(currentTime)}</span>
          </div>



          <span className="tb-badge" style={{ background: `rgba(${meta.color?.replace('#','').match(/../g)?.map(h=>parseInt(h,16)).join(',')},0.2)` }}>
            {meta.emoji} <span className="tb-badge-text">{meta.label}</span>
          </span>
          <span className="tb-uname">{user?.name}</span>

          {/* Profile Avatar Circle */}
          {user?.role === 'student' && (
            <div
              title="View Profile"
              onClick={() => onNavClick && onNavClick('profile')}
              onMouseEnter={() => setAvatarHover(true)}
              onMouseLeave={() => setAvatarHover(false)}
              style={{
                width: 38,
                height: 38,
                borderRadius: '50%',
                background: avatarHover
                  ? 'linear-gradient(135deg, #e8b85a, #a17320)'
                  : 'linear-gradient(135deg, #c9922a, #7a5510)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 14,
                fontWeight: 800,
                color: '#fff',
                cursor: 'pointer',
                border: avatarHover ? '2.5px solid #e8b85a' : '2.5px solid rgba(255,255,255,0.25)',
                boxShadow: avatarHover
                  ? '0 0 0 4px rgba(232,184,90,0.35), 0 4px 16px rgba(0,0,0,0.3)'
                  : '0 2px 8px rgba(0,0,0,0.25)',
                transition: 'all 0.25s ease',
                transform: avatarHover ? 'scale(1.08)' : 'scale(1)',
                flexShrink: 0,
                userSelect: 'none',
                fontFamily: "'Outfit', sans-serif",
                letterSpacing: 0.5,
                position: 'relative',
              }}
            >
              {user?.name ? user.name.split(' ').slice(0,2).map(w => w[0]?.toUpperCase()).join('') : '👤'}
              {/* Active page indicator dot */}
              {activePage === 'profile' && (
                <span style={{
                  position: 'absolute',
                  bottom: 1,
                  right: 1,
                  width: 9,
                  height: 9,
                  borderRadius: '50%',
                  background: '#4ade80',
                  border: '2px solid var(--navy, #1e3a5f)',
                }}/>
              )}
            </div>
          )}

          <button className="btn-logout" onClick={handleLogout}>Logout</button>
        </div>
      </div>

      {/* SIDEBAR OVERLAY */}
      <div className={`sidebar-overlay ${collapsed ? '' : 'show'}`} onClick={() => setCollapsed(true)} style={{ display: 'none' }} />

      {/* SIDEBAR */}
      <div className={`sidebar ${collapsed ? 'collapsed' : ''}`}>
        <div className="sidebar-user">
          <div className="s-avatar">{meta.emoji}</div>
          <div>
            <div className="s-uname">{user?.name}</div>
            <div className="s-urole">{meta.label}</div>
          </div>
        </div>

        <div style={{ padding: '8px 0', flex: 1 }}>
          {navItems.map((section, si) => (
            <div key={si}>
              {section.label && <div className="nav-section">{section.label}</div>}
              {section.items.map((item, ii) => (
                <div
                  key={ii}
                  className={`nav-item ${activePage === item.key ? 'active' : ''}`}
                  onClick={() => {
                    if (item.path) {
                      setPwdPrompt(item);
                    } else {
                      onNavClick(item.key);
                    }
                  }}
                >
                  <span className="nav-ico">{item.icon}</span>
                  <span>{item.label}</span>
                </div>
              ))}
            </div>
          ))}
        </div>

        <div className="sidebar-footer">
          <p>VEMU Institute of Technology<br /><span>P. Kotha Kota, Chittor</span><br />Academic Year 2025–26</p>
        </div>
      </div>

      {/* PASSWORD PROMPT MODAL */}
      {pwdPrompt && (
        <div className="modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) { setPwdPrompt(null); setPassword(''); setPwdError(''); } }}>
          <div className="modal" style={{ maxWidth: 400 }}>
            <div className="modal-head">
              <h3>🔒 Security Verification</h3>
              <button className="modal-close" onClick={() => { setPwdPrompt(null); setPassword(''); setPwdError(''); }}>✕</button>
            </div>
            <div className="modal-body">
              <div style={{ marginBottom: 16, fontSize: 13, color: 'var(--muted)', lineHeight: 1.5 }}>
                To switch your role to <b>{pwdPrompt.label}</b>, please enter your password to verify your identity.
              </div>
              <div className="form-group">
                <label>Password</label>
                <input 
                  type="password" 
                  value={password} 
                  onChange={e => { setPassword(e.target.value); setPwdError(''); }} 
                  placeholder="Enter your password" 
                  autoFocus 
                  onKeyDown={e => { if (e.key === 'Enter') handlePwdSubmit(); }}
                />
                {pwdError && <div style={{ color: '#dc2626', fontSize: 12, marginTop: 6, fontWeight: 500 }}>⚠️ {pwdError}</div>}
              </div>
            </div>
            <div className="modal-foot" style={{ display: 'flex', gap: 10 }}>
              <button className="btn btn-danger" style={{ flex: 1 }} onClick={() => { setPwdPrompt(null); setPassword(''); setPwdError(''); }}>Cancel</button>
              <button className="btn btn-primary" style={{ flex: 2, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }} onClick={handlePwdSubmit} disabled={pwdLoading}>
                {pwdLoading ? <><span>⏳</span> Verifying...</> : <><span>✅</span> Verify & Switch</>}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MAIN CONTENT */}
      <div className={`main-content ${collapsed ? 'expanded' : ''}`} style={{ position: 'relative' }}>
        {/* Floating Theme Toggle */}
        <div style={{ position: 'absolute', top: 20, right: 24, zIndex: 50 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 2, background: 'var(--white)', border: '1px solid var(--border)', borderRadius: 20, padding: 3, boxShadow: '0 4px 15px rgba(0,0,0,0.05)' }}>
            {THEMES.map(t => (
              <button
                key={t.key}
                onClick={() => setTheme(t.key)}
                title={t.label}
                style={{
                  width: 24, height: 24, borderRadius: '50%', border: 'none', cursor: 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13,
                  transition: 'all 0.2s',
                  background: theme === t.key ? 'var(--bg)' : 'transparent',
                  color: theme === t.key ? 'var(--navy)' : 'var(--muted)',
                  boxShadow: theme === t.key ? '0 1px 4px rgba(0,0,0,0.1)' : 'none'
                }}
              >
                {t.icon}
              </button>
            ))}
          </div>
        </div>

        <div className="page-container">
          {children}
        </div>
      </div>
    </div>
  );
}
