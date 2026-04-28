import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';
import logo from '../assets/vemu1.png';


const ROLES = [
  { key: 'admin', label: 'Administrator', icon: '⚙️', desc: 'System Management', bg: '#fef3c7', border: '#f59e0b' },
  { key: 'hod', label: 'Head of Department', icon: '🎓', desc: 'Department Overview', bg: '#ede9fe', border: '#7c3aed' },
  { key: 'classteacher', label: 'Class Teacher', icon: '📋', desc: 'Class Monitoring', bg: '#dbeafe', border: '#1d4ed8' },
  { key: 'faculty', label: 'Subject Faculty', icon: '📚', desc: 'Marks Entry & Submit', bg: '#dcfce7', border: '#16a34a' },
  { key: 'student', label: 'Student', icon: '🎒', desc: 'View My Marks', bg: '#fce7f3', border: '#db2777' },
];

const t = {
  page: '#0a0e27',
  bgGrad: 'linear-gradient(135deg, #0a0e27 0%, #1a1145 25%, #0d1b3e 50%, #141035 75%, #0a0e27 100%)',
  cardShadow: '0 40px 100px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,255,255,0.06)',
  leftBg: 'linear-gradient(170deg, #001852 0%, #000d30 100%)',
  leftBorder: 'rgba(255,255,255,0.06)',
  logoBg: '#fff',
  logoBorder: 'rgba(201,151,58,0.5)',
  previewText: 'rgba(201,151,58,0.6)',
  colName: '#fff',
  colLoc: 'rgba(201,151,58,0.85)',
  badgeBg: 'rgba(255,255,255,0.04)',
  badgeBorder: 'rgba(255,255,255,0.08)',
  badgeText: 'rgba(255,255,255,0.6)',
  rightBg: 'rgba(255,255,255,0.97)',
  rightTitle: '#001852',
  rightSubtitle: '#b8860b',
  stepLabel: '#001852',
  stepLabelInactive: '#9ca3af',
  stepCircleActive: '#001852',
  stepCircleInactiveBg: '#f1f5f9',
  stepConnector: '#e2e8f0',
  pageTitle: '#001852',
  pageSub: '#64748b',
  roleCardBg: '#ffffff',
  roleCardBorder: 'rgba(0,24,82,0.06)',
  roleCardShadow: '0 2px 10px rgba(0,24,82,0.06)',
  roleLabel: '#0f172a',
  roleDesc: '#64748b',
  roleBadgeBg: '#ffffff',
  fieldLabel: '#0f172a',
  inputBg: '#f8fafc',
  inputBorder: '#cbd5e1',
  inputColor: '#0f172a',
  inputFocusBorder: '#001852',
  inputFocusShadow: '0 0 0 3px rgba(0,24,82,0.1)',
  inputShadow: '0 1px 3px rgba(0,24,82,0.06)',
  loginBtnBg: 'linear-gradient(135deg, #001852 0%, #1e3a8a 50%, #001852 100%)',
  loginBtnShadow: '0 6px 20px rgba(0,24,82,0.4)',
  loginBtnHoverShadow: '0 10px 30px rgba(0,24,82,0.55)',
  securityText: '#94a3b8',
  changeBtnBg: 'rgba(0,24,82,0.06)',
  changeBtnHover: 'rgba(0,24,82,0.12)',
  changeBtnColor: '#001852',
  eyeBtnBg: 'rgba(0,0,0,0.05)',
  eyeBtnHover: 'rgba(0,0,0,0.1)',
  eyeBtnColor: '#64748b',
  previewModalBg: '#fff',
  previewCloseBg: 'rgba(0,0,0,0.08)',
  previewCloseColor: '#333',
};

/* CSS keyframes injected once */
const styleSheet = document.createElement('style');
styleSheet.textContent = `
  @keyframes floatOrb1 { 0%,100% { transform: translate(0,0) scale(1); } 50% { transform: translate(30px,-40px) scale(1.1); } }
  @keyframes floatOrb2 { 0%,100% { transform: translate(0,0) scale(1); } 50% { transform: translate(-25px,35px) scale(0.9); } }
  @keyframes floatOrb3 { 0%,100% { transform: translate(0,0) scale(1); } 50% { transform: translate(40px,20px) scale(1.05); } }
  @keyframes shimmer { 0% { background-position: -200% 0; } 100% { background-position: 200% 0; } }
  @keyframes btnShine { 0% { left: -100%; } 100% { left: 200%; } }
  @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
  @keyframes fadeIn { 0% { opacity: 0; transform: translateY(-8px); } 100% { opacity: 1; transform: translateY(0); } }
  @keyframes slideUpFade { 0% { opacity: 0; transform: translateY(15px); } 100% { opacity: 1; transform: translateY(0); } }
  @keyframes pulseGlow { 0%, 100% { box-shadow: 0 0 15px rgba(255,255,255,0.2); } 50% { box-shadow: 0 0 30px rgba(255,255,255,0.4); } }
`;
if (!document.querySelector('#vemu-login-animations')) {
  styleSheet.id = 'vemu-login-animations';
  document.head.appendChild(styleSheet);
}

export default function LoginPage() {
  const [step, setStep] = useState(1);
  const [role, setRole] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPwd, setShowPwd] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loginSuccessUser, setLoginSuccessUser] = useState('');
  const { login, user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (user && !loginSuccessUser) {
      navigate(`/${user.role}`);
    }
  }, [user, loginSuccessUser, navigate]);

  const handleRoleSelect = (r) => { setRole(r); setStep(2); };

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    if (!username || !password) { setError('Please enter username and password'); return; }
    setLoading(true);
    try {
      const user = await login(username, password, role);
      setSuccess(`Welcome, ${user.name}! Redirecting...`);
      setLoginSuccessUser(user.name);
      setTimeout(() => navigate(`/${user.role}`), 1500);
    } catch (err) {
      const msg = err.response?.data?.message || 'Invalid credentials. Please check your username and password.';
      setError(msg);
    } finally { setLoading(false); }
  };

  const selectedRole = ROLES.find(r => r.key === role);

  const getRoleBg = (r) => r.bg;

  const getBtnDynamicStyle = () => {
    if (success) return { bg: 'linear-gradient(135deg, #16a34a 0%, #22c55e 100%)', shadow: '0 8px 24px rgba(34,197,94,0.4)', hover: '0 12px 32px rgba(34,197,94,0.6)' };
    if (error) return { bg: 'linear-gradient(135deg, #dc2626 0%, #ef4444 100%)', shadow: '0 8px 24px rgba(239,68,68,0.4)', hover: '0 12px 32px rgba(239,68,68,0.6)' };
    if (selectedRole) {
      return { 
        bg: `linear-gradient(135deg, ${selectedRole.border} 0%, ${selectedRole.border}dd 100%)`, 
        shadow: `0 8px 24px ${selectedRole.border}40`, 
        hover: `0 12px 32px ${selectedRole.border}60` 
      };
    }
    return { bg: t.loginBtnBg, shadow: t.loginBtnShadow, hover: t.loginBtnHoverShadow };
  };

  const btnStyle = getBtnDynamicStyle();

  return (
    <div style={{ ...styles.page, background: t.page }}>

      {/* Logo Preview Modal */}
      {showPreview && (
        <div onClick={() => setShowPreview(false)} style={styles.previewOverlay}>
          <div style={{ ...styles.previewModal, background: t.previewModalBg }} onClick={e => e.stopPropagation()}>
            <button onClick={() => setShowPreview(false)} style={{ ...styles.previewClose, background: t.previewCloseBg, color: t.previewCloseColor }}>✕</button>
            <img src={logo} alt="VEMU Logo Preview" style={{ width: '100%', height: '100%', objectFit: 'contain', padding: 20 }} />
          </div>
        </div>
      )}

      {/* Premium Background */}
      <div style={{ ...styles.bgGrad, background: t.bgGrad }} />
      {/* Mesh gradient overlay */}
      <div style={styles.meshOverlay} />
      {/* Geometric grid pattern */}
      <div style={styles.gridPattern} />
      {/* Floating orbs */}
      <div style={{ ...styles.orb, width: 500, height: 500, background: 'radial-gradient(circle, rgba(99,102,241,0.2) 0%, transparent 70%)', top: -120, left: -100, animation: 'floatOrb1 8s ease-in-out infinite' }} />
      <div style={{ ...styles.orb, width: 400, height: 400, background: 'radial-gradient(circle, rgba(201,151,58,0.12) 0%, transparent 70%)', bottom: -100, right: -80, animation: 'floatOrb2 10s ease-in-out infinite' }} />
      <div style={{ ...styles.orb, width: 300, height: 300, background: 'radial-gradient(circle, rgba(139,92,246,0.15) 0%, transparent 70%)', top: '50%', left: '60%', animation: 'floatOrb3 12s ease-in-out infinite' }} />
      {/* Shimmer line */}
      <div style={styles.shimmerLine} />

      <div style={{ ...styles.card, boxShadow: t.cardShadow }}>
        {/* LEFT PANEL */}
        <div style={{ ...styles.left, background: t.leftBg, borderRight: `1px solid ${t.leftBorder}` }}>
          <div style={{ position: 'relative', zIndex: 2, textAlign: 'center' }}>
            <div style={{ ...styles.logoBox, background: t.logoBg, border: `2.5px solid ${t.logoBorder}` }} onClick={() => setShowPreview(true)}>
              <img src={logo} alt="VEMU Logo" style={{ width: '100%', height: '100%', objectFit: 'contain', padding: 8 }} />
            </div>
            <div style={{ fontSize: 10, color: t.previewText, letterSpacing: 1, marginTop: 8, cursor: 'pointer' }} onClick={() => setShowPreview(true)}>CLICK TO PREVIEW</div>
          </div>

          <div style={{ position: 'relative', zIndex: 2, width: '100%' }}>
            <div style={{ ...styles.colName, color: t.colName }}>VEMU Institute of Technology</div>
            <div style={{ ...styles.colLoc, color: t.colLoc }}>P. KOTHA KOTA, CHITTOR</div>
            <div style={styles.goldRule} />
            <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
              {['Affiliated to JNTUA', 'Approved by AICTE', 'Accredited by NAAC with A+', 'NBA Accredited: CSE, ECE & EEE'].map((b, i) => (
                <div key={i} style={{ ...styles.badge, background: t.badgeBg, border: `1px solid ${t.badgeBorder}` }}>
                  <div style={{ width: 5, height: 5, borderRadius: '50%', background: '#c9973a', flexShrink: 0 }} />
                  <span style={{ fontSize: 11.5, color: t.badgeText, textAlign: 'left' }}>{b}</span>
                </div>
              ))}
            </div>
          </div>

          <div style={styles.portalPill}>🎓 ACADEMIC PORTAL</div>
        </div>

        {/* RIGHT PANEL */}
        <div style={{ ...styles.right, background: t.rightBg }}>
          <div style={{ textAlign: 'center', marginBottom: 24 }}>
            <div style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: 22, fontWeight: 700, color: t.rightTitle, lineHeight: 1.3 }}>VEMU Institute of Technology</div>
            <div style={{ fontSize: 11, color: t.rightSubtitle, letterSpacing: 2, textTransform: 'uppercase', marginTop: 4, fontWeight: 600 }}>Mid Marks Management System</div>
            <div style={{ width: 60, height: 2, background: 'linear-gradient(90deg, transparent, #c9973a, transparent)', margin: '10px auto 0' }} />
          </div>

          <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: 3, textTransform: 'uppercase', color: '#c9973a', marginBottom: 8 }}>
            {step === 1 ? 'STEP 1 OF 2' : 'STEP 2 OF 2'}
          </div>
          <div style={{ ...styles.pageTitle, color: t.pageTitle }}>{step === 1 ? 'Select Your Role' : 'Sign In'}</div>
          <div style={{ ...styles.pageSub, color: t.pageSub }}>
            {step === 1 ? 'Choose your role to access the mid marks portal.' : `Signing in as ${selectedRole?.label}`}
          </div>

          {/* Step Indicator */}
          <div style={{ display: 'flex', alignItems: 'center', marginBottom: 24 }}>
            {[{ n: 1, l: 'Select Role' }, { n: 2, l: 'Login' }].map((s, i) => (
              <React.Fragment key={i}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <div style={{ width: 30, height: 30, borderRadius: '50%', background: step > s.n ? '#c9973a' : step === s.n ? t.stepCircleActive : t.stepCircleInactiveBg, color: step >= s.n ? '#fff' : t.stepLabelInactive, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700 }}>{step > s.n ? '✓' : s.n}</div>
                  <span style={{ fontSize: 12.5, color: step === s.n ? t.stepLabel : step > s.n ? '#c9973a' : t.stepLabelInactive, fontWeight: 500 }}>{s.l}</span>
                </div>
                {i === 0 && <div style={{ flex: 1, height: 2, margin: '0 14px', background: step > 1 ? '#c9973a' : t.stepConnector, borderRadius: 4, minWidth: 40 }} />}
              </React.Fragment>
            ))}
          </div>

          {/* STEP 1 - Role Grid */}
          {step === 1 && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              {ROLES.map((r) => (
                <div
                  key={r.key}
                  onClick={() => handleRoleSelect(r.key)}
                  style={{ ...styles.roleCard, background: t.roleCardBg, border: `1.5px solid ${t.roleCardBorder}`, borderLeft: `4px solid ${r.border}`, boxShadow: t.roleCardShadow, ...(r.key === 'student' ? { gridColumn: 'span 2' } : {}) }}
                  onMouseEnter={e => {
                    e.currentTarget.style.transform = 'translateY(-3px)';
                    e.currentTarget.style.boxShadow = `0 8px 24px ${r.border}25`;
                    e.currentTarget.style.background = getRoleBg(r);
                  }}
                  onMouseLeave={e => {
                    e.currentTarget.style.transform = '';
                    e.currentTarget.style.boxShadow = t.roleCardShadow;
                    e.currentTarget.style.background = t.roleCardBg;
                  }}
                >
                  <div style={{ width: 44, height: 44, borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, flexShrink: 0, background: getRoleBg(r), border: `1.5px solid ${r.border}30` }}>
                    {r.icon}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 14, fontWeight: 700, color: t.roleLabel }}>{r.label}</div>
                    <div style={{ fontSize: 11.5, color: t.roleDesc, marginTop: 2 }}>{r.desc}</div>
                  </div>
                  <div style={{ fontSize: 18, color: '#c9973a', fontWeight: 300 }}>→</div>
                </div>
              ))}
            </div>
          )}

          {/* STEP 2 - Login Form */}
          {step === 2 && (
            <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              {/* Selected Role Badge */}
              <div style={{ background: `linear-gradient(135deg, ${selectedRole?.bg} 0%, #ffffff 100%)`, border: `1.5px solid ${selectedRole?.border}40`, borderRadius: 16, padding: '16px 20px', display: 'flex', alignItems: 'center', gap: 16, boxShadow: `0 8px 24px ${selectedRole?.border}15`, opacity: 0, animation: 'slideUpFade 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards' }}>
                <div style={{ width: 50, height: 50, borderRadius: 14, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 26, background: '#fff', border: `1.5px solid ${selectedRole?.border}30`, flexShrink: 0, boxShadow: `0 4px 12px ${selectedRole?.border}20` }}>
                  {selectedRole?.icon}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: 1.5, color: selectedRole?.border, textTransform: 'uppercase', marginBottom: 2 }}>SELECTED ROLE</div>
                  <div style={{ fontSize: 16, fontWeight: 800, color: '#0f172a' }}>{selectedRole?.label}</div>
                </div>
                <button type="button" onClick={() => { setStep(1); setRole(''); }} style={{ background: '#fff', border: `1.5px solid ${t.changeBtnHover}`, color: '#0f172a', cursor: 'pointer', fontSize: 12, fontWeight: 700, padding: '8px 16px', borderRadius: 24, transition: 'all 0.2s', display: 'flex', alignItems: 'center', gap: 6, boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }}
                  onMouseEnter={e => { e.currentTarget.style.background = '#f8fafc'; e.currentTarget.style.transform = 'translateY(-1px)'; e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.08)'; }}
                  onMouseLeave={e => { e.currentTarget.style.background = '#fff'; e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.05)'; }}
                ><span style={{fontSize: 14, lineHeight: 1}}>←</span> Change</button>
              </div>

              {/* Input Fields */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
                <div style={{ opacity: 0, animation: 'slideUpFade 0.4s cubic-bezier(0.16, 1, 0.3, 1) 0.1s forwards' }}>
                  <label style={{ ...styles.fieldLabel, color: t.fieldLabel, fontSize: 11, fontWeight: 700, letterSpacing: 1 }}>
                    USERNAME <span style={{ color: selectedRole?.border }}>*</span>
                  </label>
                  <div style={{ position: 'relative' }}>
                    <span style={{ position: 'absolute', left: 16, top: '50%', transform: 'translateY(-50%)', fontSize: 16, opacity: 0.6 }}>👤</span>
                    <input
                      value={username}
                      onChange={e => { setUsername(e.target.value); setError(''); }}
                      placeholder="Enter your username"
                      style={{ ...styles.input, paddingLeft: 44, height: 50, background: '#f8fafc', border: `1.5px solid #cbd5e1`, color: '#0f172a', fontSize: 15 }}
                      autoFocus
                      onFocus={e => { e.target.style.background = '#fff'; e.target.style.borderColor = selectedRole?.border; e.target.style.boxShadow = `0 0 0 4px ${selectedRole?.border}25`; }}
                      onBlur={e => { e.target.style.background = '#f8fafc'; e.target.style.borderColor = '#cbd5e1'; e.target.style.boxShadow = 'none'; }}
                    />
                  </div>
                </div>
                
                <div style={{ position: 'relative', opacity: 0, animation: 'slideUpFade 0.4s cubic-bezier(0.16, 1, 0.3, 1) 0.15s forwards' }}>
                  <label style={{ ...styles.fieldLabel, color: t.fieldLabel, fontSize: 11, fontWeight: 700, letterSpacing: 1 }}>
                    PASSWORD <span style={{ color: selectedRole?.border }}>*</span>
                  </label>
                  <div style={{ position: 'relative' }}>
                    <span style={{ position: 'absolute', left: 16, top: '50%', transform: 'translateY(-50%)', fontSize: 16, opacity: 0.6 }}>🔑</span>
                    <input
                      type={showPwd ? 'text' : 'password'}
                      value={password}
                      onChange={e => { setPassword(e.target.value); setError(''); }}
                      placeholder="Enter your password"
                      style={{ ...styles.input, paddingLeft: 44, height: 50, background: '#f8fafc', border: `1.5px solid #cbd5e1`, color: '#0f172a', fontSize: 15 }}
                      onFocus={e => { e.target.style.background = '#fff'; e.target.style.borderColor = selectedRole?.border; e.target.style.boxShadow = `0 0 0 4px ${selectedRole?.border}25`; }}
                      onBlur={e => { e.target.style.background = '#f8fafc'; e.target.style.borderColor = '#cbd5e1'; e.target.style.boxShadow = 'none'; }}
                    />
                    <button type="button" onClick={() => setShowPwd(!showPwd)} style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', background: 'transparent', border: 'none', cursor: 'pointer', color: '#64748b', fontSize: 16, width: 34, height: 34, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.2s' }}
                      onMouseEnter={e => e.currentTarget.style.background = 'rgba(0,0,0,0.05)'}
                      onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                    >
                      {showPwd ? '🙈' : '👁️'}
                    </button>
                  </div>
                </div>
              </div>

              {/* Sign In Button */}
              <button type="submit" disabled={loading || !!loginSuccessUser} style={{ ...styles.loginBtn, height: 56, background: loginSuccessUser ? 'linear-gradient(135deg, #16a34a 0%, #22c55e 100%)' : (loading ? '#cbd5e1' : btnStyle.bg), boxShadow: (loading || loginSuccessUser) ? 'none' : btnStyle.shadow, cursor: (loading || loginSuccessUser) ? 'not-allowed' : 'pointer', opacity: 0, animation: 'slideUpFade 0.4s cubic-bezier(0.16, 1, 0.3, 1) 0.25s forwards, pulseGlow 3s infinite alternate ease-in-out' }}
                onMouseEnter={e => { if (!loading && !loginSuccessUser) { e.currentTarget.style.transform = 'translateY(-3px)'; e.currentTarget.style.boxShadow = btnStyle.hover; } }}
                onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = (loading || loginSuccessUser) ? 'none' : btnStyle.shadow; }}
              >
                <span style={styles.btnShine} />
                <span style={{ position: 'relative', zIndex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10 }}>
                  {loginSuccessUser ? (
                    <>
                      <div style={{width: 22, height: 22, borderRadius: '50%', background: '#fff', color: '#16a34a', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13}}>✓</div>
                      <span style={{ fontSize: 15, fontWeight: 700 }}>Welcome, <span style={{ fontWeight: 900 }}>{loginSuccessUser}</span>!</span>
                    </>
                  ) : loading ? (
                    <>
                      <span style={styles.spinner} />
                      <span style={{ fontSize: 15, fontWeight: 600 }}>Authenticating...</span>
                    </>
                  ) : (
                    <>
                      <span style={{ fontSize: 16, fontWeight: 700, letterSpacing: 0.5 }}>Sign In Securely</span>
                      <span style={{ fontSize: 20, lineHeight: 1 }}>→</span>
                    </>
                  )}
                </span>
              </button>

              {/* Removed redundant Success Message box as the button handles it */}

              {/* Error Message */}
              {error && (
                <div style={styles.errorBox}>
                  <span style={{ fontSize: 16 }}>⚠️</span>
                  <span style={{ flex: 1 }}>{error}</span>
                  <button onClick={() => setError('')} style={styles.errorClose}>✕</button>
                </div>
              )}

              {/* Security Note */}
              <div style={{ textAlign: 'center', marginTop: 16, fontSize: 11, color: t.securityText }}>
                🔒 Secured connection · Your data is encrypted
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}

const styles = {
  page: { position: 'relative', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  bgGrad: { position: 'fixed', inset: 0, zIndex: 0 },
  meshOverlay: { position: 'fixed', inset: 0, zIndex: 0, background: 'radial-gradient(ellipse 60% 50% at 70% 20%, rgba(99,102,241,0.12) 0%, transparent 60%), radial-gradient(ellipse 50% 60% at 20% 80%, rgba(201,151,58,0.08) 0%, transparent 60%), radial-gradient(ellipse 40% 40% at 50% 50%, rgba(139,92,246,0.06) 0%, transparent 60%)' },
  gridPattern: { position: 'fixed', inset: 0, zIndex: 0, opacity: 0.04, backgroundImage: 'linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)', backgroundSize: '60px 60px' },
  orb: { position: 'fixed', borderRadius: '50%', filter: 'blur(80px)', pointerEvents: 'none', zIndex: 0 },
  shimmerLine: { position: 'fixed', top: 0, left: 0, right: 0, height: 2, zIndex: 1, background: 'linear-gradient(90deg, transparent, rgba(201,151,58,0.4), rgba(99,102,241,0.3), transparent)', backgroundSize: '200% 100%', animation: 'shimmer 4s linear infinite' },
  card: { position: 'relative', zIndex: 10, width: '100%', maxWidth: 1020, display: 'flex', borderRadius: 28, overflow: 'hidden', margin: 20, border: '1px solid rgba(255,255,255,0.06)' },
  left: { flex: '0 0 340px', padding: '48px 36px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'space-between', textAlign: 'center', position: 'relative', overflow: 'hidden' },
  logoBox: { width: 140, height: 140, borderRadius: 20, margin: '0 auto', cursor: 'pointer', overflow: 'hidden', transition: 'all 0.3s ease' },
  colName: { fontFamily: "'Cormorant Garamond',serif", fontSize: 19, fontWeight: 700, lineHeight: 1.25, marginBottom: 6 },
  colLoc: { fontSize: 10, letterSpacing: 2.5, textTransform: 'uppercase', marginBottom: 16 },
  goldRule: { width: 50, height: 1.5, background: 'linear-gradient(90deg,transparent,#c9973a,transparent)', margin: '0 auto 16px' },
  badge: { display: 'flex', alignItems: 'center', gap: 10, borderRadius: 8, padding: '8px 12px', transition: 'all 0.3s ease' },
  portalPill: { position: 'relative', zIndex: 2, background: 'linear-gradient(135deg,rgba(201,151,58,0.15),rgba(201,151,58,0.05))', border: '1px solid rgba(201,151,58,0.25)', borderRadius: 30, padding: '9px 24px', fontSize: 11, fontWeight: 600, color: '#e8b85a', letterSpacing: 2, textTransform: 'uppercase' },
  right: { flex: 1, padding: '40px 50px', display: 'flex', flexDirection: 'column', justifyContent: 'center', position: 'relative', overflow: 'hidden' },
  pageTitle: { fontFamily: "'Cormorant Garamond',serif", fontSize: 32, fontWeight: 700, lineHeight: 1.1, marginBottom: 8 },
  pageSub: { fontSize: 13.5, lineHeight: 1.6, marginBottom: 22 },
  roleCard: { padding: '14px 18px', borderRadius: 14, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 14, transition: 'all 0.25s ease' },
  fieldLabel: { fontSize: 11, fontWeight: 700, letterSpacing: 1, textTransform: 'uppercase', display: 'flex', alignItems: 'center', marginBottom: 7 },
  input: { width: '100%', padding: '13px 16px', borderRadius: 12, fontFamily: "'Outfit',sans-serif", fontSize: 14, outline: 'none', transition: 'all 0.25s ease' },
  loginBtn: { width: '100%', marginTop: 22, padding: '16px 24px', color: '#fff', border: 'none', borderRadius: 14, fontFamily: "'Outfit',sans-serif", fontSize: 15, fontWeight: 700, cursor: 'pointer', letterSpacing: 0.5, transition: 'all 0.3s ease', position: 'relative', overflow: 'hidden' },
  btnShine: { position: 'absolute', top: 0, left: '-100%', width: '60%', height: '100%', background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.15), transparent)', animation: 'btnShine 3s ease-in-out infinite', zIndex: 0 },
  spinner: { width: 18, height: 18, border: '2.5px solid rgba(255,255,255,0.3)', borderTopColor: '#fff', borderRadius: '50%', animation: 'spin 0.8s linear infinite', display: 'inline-block' },
  previewOverlay: { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(8px)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' },
  previewModal: { position: 'relative', width: 360, height: 360, borderRadius: 24, boxShadow: '0 30px 80px rgba(0,0,0,0.5)', cursor: 'default', overflow: 'hidden' },
  previewClose: { position: 'absolute', top: 12, right: 12, width: 32, height: 32, borderRadius: '50%', border: 'none', fontSize: 16, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2, transition: 'all 0.3s ease' },
  successBox: { display: 'flex', alignItems: 'center', gap: 10, marginTop: 16, padding: '12px 16px', background: '#f0fdf4', border: '1.5px solid #86efac', borderRadius: 12, color: '#166534', fontSize: 13, fontWeight: 500, fontFamily: "'Outfit',sans-serif", animation: 'fadeIn 0.3s ease' },
  errorBox: { display: 'flex', alignItems: 'center', gap: 10, marginTop: 16, padding: '12px 16px', background: '#fef2f2', border: '1.5px solid #fca5a5', borderRadius: 12, color: '#991b1b', fontSize: 13, fontWeight: 500, fontFamily: "'Outfit',sans-serif", animation: 'fadeIn 0.3s ease' },
  errorClose: { background: 'none', border: 'none', color: '#991b1b', cursor: 'pointer', fontSize: 14, padding: 4, borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: 0.6, transition: 'opacity 0.2s' },
};
