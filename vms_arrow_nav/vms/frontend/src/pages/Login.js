import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';

const VEMU_LOGO = "data:image/png;base64,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";

const loginStyles = `
  @import url('https://fonts.googleapis.com/css2?family=Montserrat:wght@400;500;600;700;800;900&display=swap');

  @keyframes fadeDown  { from{opacity:0;transform:translateY(-30px)} to{opacity:1;transform:translateY(0)} }
  @keyframes fadeUp    { from{opacity:0;transform:translateY(30px)}  to{opacity:1;transform:translateY(0)} }
  @keyframes spin      { to{transform:rotate(360deg)} }
  @keyframes logoSpin  { 0%{transform:rotate(0deg)} 100%{transform:rotate(360deg)} }
  @keyframes slideIn   { from{opacity:0;transform:scale(0.92) translateY(20px)} to{opacity:1;transform:scale(1) translateY(0)} }
  @keyframes logoPop   { 0%{opacity:0;transform:scale(0.5) rotate(-180deg)} 60%{transform:scale(1.08) rotate(5deg)} 100%{opacity:1;transform:scale(1) rotate(0deg)} }
  @keyframes btnPulse  { 0%,100%{box-shadow:0 6px 28px rgba(255,255,255,0.25)} 50%{box-shadow:0 8px 40px rgba(255,255,255,0.45), 0 0 0 6px rgba(255,255,255,0.1)} }
  @keyframes shimmer   { from{left:-100%} to{left:100%} }

  /* Logo gentle bob — up/down float combined with spin ring */
  @keyframes logoFloat {
    0%   { transform: translateY(0px); }
    50%  { transform: translateY(-10px); }
    100% { transform: translateY(0px); }
  }

  /* Ripple rings expanding outward from center */
  @keyframes rippleExpand {
    0%   { transform: scale(0.4); opacity: 0.5; }
    100% { transform: scale(2.8); opacity: 0; }
  }

  /* Slow drifting wave blobs */
  @keyframes waveDrift1 {
    0%   { transform: translate(0, 0) scale(1); }
    33%  { transform: translate(40px, -30px) scale(1.08); }
    66%  { transform: translate(-25px, 20px) scale(0.95); }
    100% { transform: translate(0, 0) scale(1); }
  }
  @keyframes waveDrift2 {
    0%   { transform: translate(0, 0) scale(1); }
    40%  { transform: translate(-35px, 30px) scale(1.06); }
    70%  { transform: translate(20px, -20px) scale(0.97); }
    100% { transform: translate(0, 0) scale(1); }
  }
  @keyframes waveDrift3 {
    0%   { transform: translate(0, 0) scale(1); }
    50%  { transform: translate(25px, 35px) scale(1.1); }
    100% { transform: translate(0, 0) scale(1); }
  }

  * { box-sizing: border-box; }

  .lp-page {
    min-height: 100vh;
    display: flex; align-items: center; justify-content: center;
    font-family: 'Montserrat', 'Segoe UI', sans-serif;
    position: relative; overflow: hidden;
    background: #1a56c4;
  }

  /* Subtle radial glow in center */
  .lp-page::before {
    content: '';
    position: absolute; inset: 0;
    background: radial-gradient(ellipse 80% 60% at 50% 40%, rgba(255,255,255,0.08) 0%, transparent 70%);
    pointer-events: none;
  }





  .lp-noise {
    position: absolute; inset: 0; pointer-events: none; opacity: 0.04;
    background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E");
    background-size: 200px 200px;
  }

  .lp-content {
    position: relative; z-index: 2;
    width: 420px; max-width: 92vw;
    text-align: center;
  }

  /* Logo container */
  .lp-logo-wrap {
    margin: 0 auto 10px;
    width: 110px; height: 110px;
    border-radius: 50%;
    padding: 5px;
    background: rgba(255,255,255,0.15);
    box-shadow: 0 0 0 3px rgba(255,255,255,0.25), 0 8px 32px rgba(0,0,0,0.25);
    animation: logoPop 0.8s cubic-bezier(0.34,1.3,0.64,1) both, logoFloat 3.5s ease-in-out 1s infinite;
    position: relative;
    cursor: pointer;
    transition: transform 0.35s cubic-bezier(0.34,1.5,0.64,1), box-shadow 0.35s ease;
  }
  .lp-logo-wrap:hover {
    transform: scale(1.13) rotate(6deg);
    box-shadow: 0 0 0 4px rgba(255,255,255,0.5), 0 16px 48px rgba(0,0,0,0.4), 0 0 32px rgba(255,255,255,0.2);
  }
  .lp-logo-wrap::after {
    content: '';
    position: absolute; inset: -4px;
    border-radius: 50%;
    border: 3px dashed rgba(0,0,0,0.85);
    animation: logoSpin 12s linear infinite;
    transition: border-color 0.3s ease, inset 0.3s ease;
  }
  .lp-logo-wrap:hover::after {
    inset: -7px;
    border-color: rgba(0,0,0,1);
    animation: logoSpin 2s linear infinite;
  }
  .lp-logo-img {
    width: 100%; height: 100%;
    border-radius: 50%;
    object-fit: cover;
    display: block;
    transition: filter 0.35s ease, transform 0.35s cubic-bezier(0.34,1.5,0.64,1);
  }
  .lp-logo-wrap:hover .lp-logo-img {
    filter: brightness(1.12) drop-shadow(0 0 10px rgba(255,255,255,0.5));
    transform: scale(1.05);
  }

  .lp-system-name {
    font-size: 13px;
    font-weight: 700;
    color: rgba(255,255,255,0.85);
    letter-spacing: 1.8px;
    text-transform: uppercase;
    margin: 0 0 28px;
    animation: fadeDown 0.7s cubic-bezier(0.34,1.2,0.64,1) 0.15s both;
  }

  .lp-fields {
    display: flex; flex-direction: column; gap: 16px;
    margin-bottom: 24px;
    animation: fadeUp 0.7s cubic-bezier(0.34,1.2,0.64,1) 0.1s both;
  }

  .lp-input-wrap { position: relative; }

  .lp-input-icon {
    position: absolute; left: 16px; top: 50%; transform: translateY(-50%);
    font-size: 17px; line-height: 1; pointer-events: none;
    z-index: 1;
  }

  .lp-input {
    width: 100%; padding: 17px 20px 17px 46px;
    border-radius: 14px; outline: none;
    background: rgba(255,255,255,0.95);
    color: #1a2030; font-size: 15px; font-family: inherit; font-weight: 600;
    transition: background 0.25s, box-shadow 0.25s, border-color 0.25s, transform 0.2s;
    box-shadow: 0 4px 16px rgba(0,0,0,0.15);
    border: 2px solid rgba(0,0,0,0.75);
  }
  .lp-input::placeholder { color: #9ca3af; font-weight: 400; font-size: 14px; }
  .lp-input:focus {
    background: #fff;
    border-color: #1a55b5;
    box-shadow: 0 0 0 4px rgba(255,255,255,0.25), 0 4px 20px rgba(0,0,0,0.2);
    transform: translateY(-1px);
  }

  .lp-pass-toggle {
    position: absolute; right: 16px; top: 50%; transform: translateY(-50%);
    background: none; border: none; cursor: pointer; font-size: 17px;
    color: #6b7280; padding: 4px; line-height: 1; transition: color 0.2s, transform 0.2s;
    z-index: 1;
  }
  .lp-pass-toggle:hover { color: #1a2030; transform: translateY(-50%) scale(1.15); }

  .lp-default-pass-hint {
    font-size: 12px;
    color: rgba(255,255,255,0.75);
    font-weight: 600;
    margin-top: 10px;
    text-align: center;
    animation: fadeUp 0.5s ease both;
    background: rgba(0,0,0,0.15);
    border-radius: 8px;
    padding: 8px 12px;
    border: 1px solid rgba(255,255,255,0.15);
  }

  /* Tab row for Faculty/Student */
  .lp-tabs {
    display: flex; background: rgba(0,0,0,0.2);
    border-radius: 50px; padding: 4px; margin-bottom: 24px;
    border: 1px solid rgba(255,255,255,0.15);
    animation: fadeDown 0.7s cubic-bezier(0.34,1.2,0.64,1) 0.08s both;
  }
  .lp-tab {
    flex: 1; padding: 10px 0; border: none; border-radius: 50px;
    cursor: pointer; font-family: inherit; font-size: 13px; font-weight: 700;
    transition: all 0.25s; background: transparent; color: rgba(255,255,255,0.5);
    letter-spacing: 0.3px;
  }
  .lp-tab.active {
    background: rgba(255,255,255,0.22);
    color: #fff;
    box-shadow: 0 2px 10px rgba(0,0,0,0.2);
    border: 1px solid rgba(255,255,255,0.3);
  }
  .lp-tab:hover:not(.active) { color: rgba(255,255,255,0.8); }

  .lp-login-btn {
    width: 44%; padding: 13px;
    border-radius: 50px; outline: none;
    background: #fff;
    color: #1a56c4; font-size: 15px; font-family: inherit; font-weight: 900;
    letter-spacing: 3px; cursor: pointer;
    box-shadow: 0 6px 28px rgba(0,0,0,0.2);
    transition: transform 0.22s cubic-bezier(0.34,1.5,0.64,1), box-shadow 0.22s, background 0.22s, color 0.22s;
    animation: fadeUp 0.7s cubic-bezier(0.34,1.2,0.64,1) 0.2s both;
    position: relative; overflow: hidden;
    border: 2.5px solid rgba(255,255,255,0.9);
  }
  .lp-login-btn::before {
    content:''; position:absolute; top:0; left:-100%; width:60%; height:100%;
    background: linear-gradient(90deg, transparent, rgba(26,86,196,0.12), transparent);
    transition: left 0.45s ease;
  }
  .lp-login-btn:hover:not(:disabled)::before { left:160%; }
  .lp-login-btn:hover:not(:disabled) {
    transform: translateY(-3px) scale(1.04);
    box-shadow: 0 14px 40px rgba(0,0,0,0.28), 0 0 0 4px rgba(255,255,255,0.2);
    background: #f0f6ff;
  }
  .lp-login-btn:active:not(:disabled) { transform: translateY(0) scale(0.97); box-shadow: 0 4px 16px rgba(0,0,0,0.18); }
  .lp-login-btn:disabled { opacity: 0.6; cursor: not-allowed; }

  .lp-footer {
    margin-top: 24px; font-size: 10.5px; color: rgba(255,255,255,0.35);
    font-weight: 600; letter-spacing: 0.3px;
    animation: fadeUp 0.7s cubic-bezier(0.34,1.2,0.64,1) 0.4s both;
  }

  /* Popups */
  .lp-popup-overlay {
    position: fixed; inset: 0; background: rgba(0,20,80,0.75);
    display: flex; align-items: center; justify-content: center;
    z-index: 9999; backdrop-filter: blur(10px);
  }
  .lp-popup-box {
    animation: slideIn 0.3s cubic-bezier(0.34,1.3,0.64,1) both;
    background: #fff; border-radius: 24px; padding: 38px 30px;
    max-width: 360px; width: 90%;
    box-shadow: 0 30px 80px rgba(0,0,0,0.4); text-align: center;
  }
  .lp-popup-icon {
    width: 62px; height: 62px; border-radius: 50%;
    background: linear-gradient(135deg, #4a90d9, #1a55b5);
    display: flex; align-items: center; justify-content: center;
    font-size: 26px; margin: 0 auto 16px;
    box-shadow: 0 6px 20px rgba(30,80,180,0.35);
  }
  .lp-popup-h { margin:0 0 6px; font-size:19px; font-weight:800; color:#1a2030; font-family:inherit; }
  .lp-popup-p { margin:0 0 22px; font-size:13px; color:#6b7280; font-family:inherit; }
  .lp-popup-btn {
    width:100%; padding:13px; border-radius:12px;
    font-size:14px; font-weight:700; font-family:inherit;
    cursor:pointer; transition:all 0.2s; margin-bottom:10px;
    border: 2px solid transparent;
  }
  .lp-popup-btn:last-child { margin-bottom:0; }
  .lp-popup-btn.primary {
    background: linear-gradient(135deg, #4a90d9, #1a55b5);
    color:#fff; box-shadow: 0 4px 16px rgba(30,80,180,0.35);
  }
  .lp-popup-btn.secondary { background:#fff; color:#1a55b5; border-color:#bfdbfe; }
  .lp-popup-btn:hover { transform:translateY(-1px); }

  .spin-ring {
    width:16px; height:16px; display:inline-block;
    border:2.5px solid rgba(26,86,196,0.3);
    border-top-color:#1a56c4; border-radius:50%;
    animation:spin 0.8s linear infinite;
  }

  /* ── DARK MODE overrides for login page ── */
  body.dark .lp-page {
    background: #0d0f14 !important;
  }
  body.dark .lp-page::before {
    background: radial-gradient(ellipse 80% 60% at 50% 40%, rgba(255,255,255,0.03) 0%, transparent 70%) !important;
  }
  body.dark .lp-wave-blob-1 {
    background: radial-gradient(circle, rgba(50,55,70,0.7) 0%, transparent 70%) !important;
  }
  body.dark .lp-wave-blob-2 {
    background: radial-gradient(circle, rgba(35,40,55,0.6) 0%, transparent 70%) !important;
  }
  body.dark .lp-wave-blob-3 {
    background: radial-gradient(circle, rgba(45,50,65,0.5) 0%, transparent 70%) !important;
  }
  body.dark .lp-ripple {
    border-color: rgba(100,110,130,0.25) !important;
  }
  body.dark .lp-system-name {
    color: rgba(200,210,230,0.85) !important;
  }
  body.dark .lp-logo-wrap {
    background: rgba(255,255,255,0.06) !important;
  }
  body.dark .lp-logo-wrap::after {
    border-color: rgba(150,160,180,0.5) !important;
  }
  body.dark .lp-tabs {
    background: rgba(255,255,255,0.05) !important;
    border-color: rgba(255,255,255,0.08) !important;
  }
  body.dark .lp-tab {
    color: rgba(180,190,210,0.5) !important;
  }
  body.dark .lp-tab.active {
    background: rgba(255,255,255,0.12) !important;
    color: #e2e8f0 !important;
    border-color: rgba(255,255,255,0.18) !important;
  }
  body.dark .lp-tab:hover:not(.active) {
    color: rgba(200,210,230,0.8) !important;
  }
  body.dark .lp-input {
    background: #1a1d27 !important;
    color: #e2e8f0 !important;
    border-color: #3d4460 !important;
  }
  body.dark .lp-input::placeholder {
    color: #64748b !important;
  }
  body.dark .lp-input:focus {
    background: #20243a !important;
    border-color: #4d8ef5 !important;
    box-shadow: 0 0 0 3px rgba(77,142,245,0.18) !important;
  }
  body.dark .lp-pass-toggle {
    color: #94a3b8 !important;
  }
  body.dark .lp-pass-toggle:hover {
    color: #e2e8f0 !important;
  }
  body.dark .lp-default-pass-hint {
    color: rgba(180,190,210,0.75) !important;
    background: rgba(255,255,255,0.05) !important;
    border-color: rgba(255,255,255,0.08) !important;
  }
  body.dark .lp-login-btn {
    background: #252a3d !important;
    color: #93c5fd !important;
    border-color: rgba(77,142,245,0.5) !important;
    box-shadow: 0 4px 24px rgba(0,0,0,0.5) !important;
  }
  body.dark .lp-login-btn:hover:not(:disabled) {
    background: #2e3450 !important;
    color: #bfdbfe !important;
    border-color: #4d8ef5 !important;
  }
  body.dark .lp-login-btn::before {
    background: linear-gradient(90deg, transparent, rgba(77,142,245,0.1), transparent) !important;
  }
  body.dark .lp-footer {
    color: rgba(150,160,180,0.4) !important;
  }
  body.dark .lp-popup-overlay {
    background: rgba(0,0,0,0.85) !important;
  }
  body.dark .lp-popup-box {
    background: #1a1d27 !important;
    border: 1px solid #2e3347 !important;
  }
  body.dark .lp-popup-h {
    color: #e2e8f0 !important;
  }
  body.dark .lp-popup-p {
    color: #94a3b8 !important;
  }
  body.dark .lp-popup-btn.primary {
    background: linear-gradient(135deg, #2e4a7a, #1e3a6a) !important;
    box-shadow: 0 4px 16px rgba(0,0,0,0.4) !important;
  }
  body.dark .lp-popup-btn.secondary {
    background: #252a3d !important;
    color: #93c5fd !important;
    border-color: #3d4460 !important;
  }
  body.dark .spin-ring {
    border-color: rgba(77,142,245,0.25) !important;
    border-top-color: #4d8ef5 !important;
  }
  body.dark .login-theme-btn {
    background: rgba(20,23,32,0.85) !important;
    border-color: #3d4460 !important;
    color: #c8d0e7 !important;
  }
  body.dark .login-theme-btn:hover {
    background: rgba(37,42,61,0.95) !important;
    border-color: #4d8ef5 !important;
  }
`;

export default function Login() {
  const [activeTab,     setActiveTab]     = useState('Faculty');
  const [rollNumber,    setRollNumber]    = useState('');
  const [password,      setPassword]      = useState('');
  const [showPass,      setShowPass]      = useState(false);
  const [loading,       setLoading]       = useState(false);
  const [showRolePopup, setShowRolePopup] = useState(false);
  const [showDeptPopup, setShowDeptPopup] = useState(false);
  const [hodDepts,      setHodDepts]      = useState([]);
  const [pendingCreds,  setPendingCreds]  = useState(null);

  const { login } = useAuth();
  const { dark, toggleTheme } = useTheme();
  const navigate  = useNavigate();
  const roleRoutes = { admin:'/admin', hod:'/hod', faculty:'/faculty', student:'/student' };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!rollNumber.trim() || !password.trim()) { toast.error('Please enter credentials'); return; }
    setLoading(true);
    try {
      const tabType = activeTab === 'Student' ? 'student' : 'faculty';
      const result  = await login(rollNumber.trim(), password, tabType);
      if (result.requiresRoleSelection) {
        setHodDepts(result.hodDepartments || []);
        setPendingCreds({ rollNumber: rollNumber.trim(), password, tabType });
        setShowRolePopup(true);
        return;
      }
      toast.success(`Welcome, ${result.name}!`);
      navigate(roleRoutes[result.role] || '/');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Login failed. Check your credentials.');
    } finally { setLoading(false); }
  };

  const handleRoleChoice = async (choice) => {
    setShowRolePopup(false);
    if (choice === 'faculty') {
      setLoading(true);
      try { const user = await login(pendingCreds.rollNumber, pendingCreds.password, pendingCreds.tabType, 'faculty'); toast.success(`Welcome, ${user.name}!`); navigate('/faculty'); }
      catch { toast.error('Login failed'); } finally { setLoading(false); }
    } else {
      if (hodDepts.length > 1) setShowDeptPopup(true);
      else await loginAsHod(hodDepts[0]?._id);
    }
  };

  const loginAsHod = async (deptId) => {
    setShowDeptPopup(false); setLoading(true);
    try { const user = await login(pendingCreds.rollNumber, pendingCreds.password, pendingCreds.tabType, 'hod', deptId); toast.success(`Welcome, ${user.name}! (HOD)`); navigate('/hod'); }
    catch { toast.error('Login failed'); } finally { setLoading(false); }
  };

  const handleTabChange = (tab) => { setActiveTab(tab); setRollNumber(''); setPassword(''); };

  return (
    <div className="lp-page">
      <style>{loginStyles}</style>
      <div className="lp-noise" />

      {/* Dark mode toggle */}
      <label className="login-theme-btn">
        <span>{dark ? '☀️' : '🌙'}</span>
        <div className="theme-switch">
          <input type="checkbox" checked={dark} onChange={toggleTheme} />
          <span className="theme-slider"></span>
        </div>
        <span>{dark ? 'Light Mode' : 'Dark Mode'}</span>
      </label>



      {/* Role popup */}
      {showRolePopup && (
        <div className="lp-popup-overlay">
          <div className="lp-popup-box">
            <div className="lp-popup-icon">👤</div>
            <h2 className="lp-popup-h">Choose Login Type</h2>
            <p className="lp-popup-p">You have both Faculty and HOD access.</p>
            <button className="lp-popup-btn primary" onClick={() => handleRoleChoice('hod')}>🧑‍💼 Login as HOD</button>
            <button className="lp-popup-btn secondary" onClick={() => handleRoleChoice('faculty')}>👩‍🏫 Login as Faculty</button>
          </div>
        </div>
      )}

      {/* Dept popup */}
      {showDeptPopup && (
        <div className="lp-popup-overlay">
          <div className="lp-popup-box">
            <div className="lp-popup-icon">🏢</div>
            <h2 className="lp-popup-h">Select Department</h2>
            <p className="lp-popup-p">Which department do you want to manage?</p>
            {hodDepts.map(dept => (
              <button key={dept._id} className="lp-popup-btn secondary"
                onClick={() => loginAsHod(dept._id)}
                style={{ display:'flex', alignItems:'center', gap:12, textAlign:'left' }}>
                <span style={{ fontSize:22 }}>🏛</span>
                <div>
                  <div style={{ fontWeight:800, color: dark ? '#e2e8f0' : '#1a2030' }}>{dept.name}</div>
                  <div style={{ fontSize:11, color: dark ? '#93c5fd' : '#1a55b5', fontWeight:600 }}>{dept.code}</div>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="lp-content">

        {/* VEMU Logo - circular with spinning dashed ring */}
        <div className="lp-logo-wrap">
          <img src={VEMU_LOGO} alt="VEMU Logo" className="lp-logo-img" />
        </div>

        {/* System name */}
        <p className="lp-system-name">VEMU Mid Marks System</p>

        {/* Faculty / Student tab switcher */}
        <div className="lp-tabs">
          {['Faculty', 'Student'].map(tab => (
            <button
              key={tab}
              className={`lp-tab${activeTab === tab ? ' active' : ''}`}
              onClick={() => handleTabChange(tab)}
            >
              {tab === 'Faculty' ? '👩‍🏫 ' : '👨‍🎓 '}{tab}
            </button>
          ))}
        </div>

        {/* Input fields */}
        <form onSubmit={handleSubmit}>
          <div className="lp-fields">
            <div className="lp-input-wrap">
              <span className="lp-input-icon">
                {activeTab === 'Student' ? '🎓' : '🪪'}
              </span>
              <input
                className="lp-input"
                type="text"
                placeholder={activeTab === 'Student' ? 'Roll Number / Username' : 'Employee ID / Username'}
                value={rollNumber}
                onChange={e => setRollNumber(e.target.value)}
                autoFocus
                autoComplete="username"
              />
            </div>

            <div className="lp-input-wrap">
              <span className="lp-input-icon">🔒</span>
              <input
                className="lp-input"
                type={showPass ? 'text' : 'password'}
                placeholder="Password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                autoComplete="current-password"
                style={{ paddingRight: 50 }}
              />
              <button type="button" className="lp-pass-toggle" onClick={() => setShowPass(v => !v)}>
                {showPass ? '🙈' : '👁️'}
              </button>
            </div>
          </div>

          <button type="submit" className="lp-login-btn" disabled={loading}>
            {loading
              ? <span style={{ display:'flex', alignItems:'center', justifyContent:'center', gap:10 }}>
                  <span className="spin-ring" /> Signing In...
                </span>
              : '🚀 LOGIN'}
          </button>

          {/* Default password hint - centered */}
          <div className="lp-default-pass-hint">
            {activeTab === 'Student'
              ? '🔑 Default password: your Roll Number'
              : '🔑 Default password: your Employee ID'}
          </div>
        </form>

        <div className="lp-footer">
          © 2024 VEMU Institute of Technology, P.Kothakota
        </div>
      </div>
    </div>
  );
}
