import React, { useState } from 'react';
import { useTheme } from '../context/ThemeContext';
import { Outlet, NavLink, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import ChangePasswordModal from './ChangePasswordModal';
import vemuLogo from '../assets/vemu-logo.jpg';

const navConfig = {
  admin:   [
    { path: '/admin',             label: 'Dashboard',        icon: '📊', exact: true },
    { path: '/admin/departments', label: 'Departments',      icon: '🏢' },
    { path: '/admin/users',       label: 'Users',            icon: '👥' },
    { path: '/admin/sections',    label: 'Sections',         icon: '🏫' },
    { path: '/admin/reports',     label: 'Reports',          icon: '📋' },
  ],
  hod:     [
    { path: '/hod',           label: 'Dashboard',        icon: '📊', exact: true },
    { path: '/hod/subjects',  label: 'Subjects',         icon: '📚' },
    { path: '/hod/marks',     label: 'Review Marks',     icon: '📝' },
    { path: '/hod/promote',   label: 'Promote Students', icon: '🎓' },
    { path: '/hod/reports',   label: 'Reports',          icon: '📋' },
  ],
  faculty: [
    { path: '/faculty',              label: 'Dashboard',    icon: '📊', exact: true },
    { path: '/faculty/enter-marks',  label: 'Enter Marks',  icon: '✏️' },
    { path: '/faculty/view-marks',   label: 'View Marks',   icon: '👁️' },
    { path: '/faculty/final-marks',  label: 'Final Marks',  icon: '🏆' },
    { path: '/faculty/reports',      label: 'Reports',      icon: '📋' },
  ],
  student: [
    { path: '/student',       label: 'Dashboard', icon: '📊', exact: true },
    { path: '/student/marks',   label: 'My Marks',  icon: '📋' },
    { path: '/student/reports', label: 'Reports',    icon: '📊' },
  ],
};

const roleLabels = {
  admin: 'Administrator', hod: 'Head of Department',
  faculty: 'Faculty',     student: 'Student'
};
const pageTitles = {
  '/admin': 'Dashboard',            '/admin/departments': 'Departments',   '/admin/users': 'User Management',   '/admin/sections': 'Section Management',
  '/admin/reports': 'Reports',
  '/hod/reports': 'Reports', '/faculty/reports': 'Reports', '/student/reports': 'My Reports',
  '/hod': 'Dashboard',              '/hod/subjects': 'Subjects',           '/hod/marks': 'Review Marks',     '/hod/promote': 'Promote Students',
  '/faculty': 'Dashboard',          '/faculty/enter-marks': 'Enter Marks', '/faculty/view-marks': 'View Marks', '/faculty/final-marks': 'Final Marks',
  '/student': 'Dashboard',          '/student/marks': 'My Marks',
};

export default function Layout() {
  const { user, logout }  = useAuth();
  const { dark, toggleTheme } = useTheme();
  const navigate          = useNavigate();
  const location          = useLocation();
  const [sidebarOpen, setSidebarOpen]     = useState(false);
  const [showChangePwd, setShowChangePwd] = useState(false);

  const handleLogout = () => { logout(); navigate('/login'); };
  const closeSidebar = () => setSidebarOpen(false);
  const navItems     = navConfig[user?.role] || [];
  const pageTitle    = pageTitles[location.pathname] || 'VEMU Marks System';
  const initials     = user?.name?.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() || 'U';

  return (
    <div className="layout">

      {/* Mobile overlay */}
      <div className={`sidebar-overlay ${sidebarOpen ? 'visible' : ''}`} onClick={closeSidebar} />

      {/* Sidebar */}
      <aside className={`sidebar ${sidebarOpen ? 'mobile-open' : ''}`}>
        <div className="sidebar-brand">
          <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:8 }}>
            <img src={vemuLogo} alt="VEMU Logo"
              style={{ width:44, height:44, borderRadius:'50%', objectFit:'cover', border:'2px solid rgba(255,255,255,0.5)', flexShrink:0 }} />
            <div>
              <h2 style={{ margin:0 }}>VEMU Institute</h2>
              <p style={{ margin:0 }}>Student Mid Marks System</p>
            </div>
          </div>
          <span className={`sidebar-role-badge role-${user?.role}`}>{roleLabels[user?.role]}</span>
        </div>

        <nav className="sidebar-nav">
          <div className="nav-section-title">Navigation</div>
          {navItems.map(item => (
            <NavLink key={item.path} to={item.path} end={item.exact}
              className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}
              onClick={closeSidebar}>
              <span className="nav-icon">{item.icon}</span>{item.label}
            </NavLink>
          ))}
        </nav>

        <div className="sidebar-bottom">
          <div className="sidebar-user">
            <div className="user-avatar">{initials}</div>
            <div className="user-info">
              <div className="user-name">{user?.name}</div>
              <div className="user-roll">{user?.rollNumber}</div>
            </div>
          </div>
          <button className="btn-change-pwd" onClick={() => { setShowChangePwd(true); closeSidebar(); }}>🔑 Change Password</button>
          <button className="btn-logout" onClick={handleLogout}>🚪 Sign Out</button>
        </div>
      </aside>

      {/* Main content */}
      <div className="main-content">
        <header className="topbar">
          <button className="hamburger" onClick={() => setSidebarOpen(o => !o)}>☰</button>
          <div style={{ display:'flex', alignItems:'center', gap:10, flex:1, minWidth:0 }}>
            <img src={vemuLogo} alt="VEMU"
              style={{ width:36, height:36, borderRadius:'50%', objectFit:'cover', border:'2px solid #e2e8f0', flexShrink:0 }} />
            <div style={{ minWidth:0 }}>
              <div className="topbar-title">{pageTitle}</div>
              <div className="topbar-subtitle">
                {user?.department?.name && `${user.department.name} · `}
                {user?.semester && `Semester ${user.semester} · `}
                VEMU Institute of Technology
              </div>
            </div>
          </div>
          <div className="topbar-right" style={{ display:'flex', alignItems:'center', gap:12, flexShrink:0 }}>
            <label className="theme-toggle-wrap" title={dark ? 'Switch to Light Mode' : 'Switch to Dark Mode'}>
              <span className="theme-toggle-icon">{dark ? '☀️' : '🌙'}</span>
              <div className="theme-switch">
                <input type="checkbox" checked={dark} onChange={toggleTheme} />
                <span className="theme-slider"></span>
              </div>
              <span className="theme-toggle-label">{dark ? 'Light' : 'Dark'}</span>
            </label>
            <button className="btn btn-outline btn-sm" onClick={() => setShowChangePwd(true)}>🔑 Change Password</button>
            <span className="topbar-date" style={{ fontSize:13, color:'var(--text-muted)', whiteSpace:'nowrap' }}>
              {new Date().toLocaleDateString('en-IN', { weekday:'short', year:'numeric', month:'short', day:'numeric' })}
            </span>
          </div>
        </header>

        {/* ── Page body — clean light background, no image ── */}
        <main className="page-body">
          <Outlet />
        </main>
      </div>

      {showChangePwd && <ChangePasswordModal forced={false} onClose={() => setShowChangePwd(false)} />}
    </div>
  );
}
