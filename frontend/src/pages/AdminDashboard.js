import React, { useState, useEffect } from 'react';
import { BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer, CartesianGrid, LineChart, Line } from 'recharts';
import Layout from '../components/Layout';
import { getUsers, createUser, updateUser, deleteUser, getStudents, createStudent, deleteStudent, bulkCreateStudents, getSettings, updateSettings, getMarkStats, getDepartmentReport, getActivityOnline, getActivityUsers, getActivityLogs, getActivityStats } from '../api';
import API from '../api';
import toast from 'react-hot-toast';
import { downloadDepartmentReport } from '../utils/pdfGenerator';

const NAV = [
  {
    label: 'MAIN', items: [
      { key: 'dashboard', icon: '📊', label: 'Dashboard' },
      { key: 'users', icon: '👥', label: 'User Management' },
      { key: 'students', icon: '🎓', label: 'Student Management' },
      { key: 'password', icon: '🔐', label: 'Change Password' },
      { key: 'toppers', icon: '🏆', label: 'Toppers Graph' },
    ]
  },
  {
    label: 'CONFIGURATION', items: [
      { key: 'settings', icon: '⚙️', label: 'System Settings' },
      { key: 'reports', icon: '📄', label: 'Institution Reports' },
    ]
  },
];

const BRANCHES = ['CSE', 'ECE', 'EEE', 'MECH', 'CIVIL', 'AI&ML', 'IT'];
const SEMS = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII'];
const YEARS = ['I', 'II', 'III', 'IV'];
const SECTIONS = ['A', 'B', 'C', 'D', 'E'];

export default function AdminDashboard() {
  const [page, setPage] = useState('dashboard');
  const [users, setUsers] = useState([]);
  const [students, setStudents] = useState([]);
  const [stats, setStats] = useState({});
  const [deptReport, setDeptReport] = useState([]);
  const [settings, setSettings] = useState({});
  const [showUserModal, setShowUserModal] = useState(false);
  const [showStudentModal, setShowStudentModal] = useState(false);
  const [editUser, setEditUser] = useState(null);
  const [editStudent, setEditStudent] = useState(null);
  const [loading, setLoading] = useState(false);
  const [filterRole, setFilterRole] = useState('');
  const [filterBranch, setFilterBranch] = useState('');
  const [filterYear, setFilterYear] = useState('');
  const [filterSem, setFilterSem] = useState('');
  const [filterSec, setFilterSec] = useState('');
  const [pdfLoading, setPdfLoading] = useState(false);

  // Activity Monitor state
  const [activityTab, setActivityTab]   = useState('online');
  const [actOnline, setActOnline]        = useState([]);
  const [actUsers, setActUsers]          = useState([]);
  const [actLogs, setActLogs]            = useState([]);
  const [actStats, setActStats]          = useState({});
  const [actLoading, setActLoading]      = useState(false);
  const [actLogFilter, setActLogFilter]  = useState('');
  const [actStatusFilter, setActStatusFilter] = useState('');

  // Toppers state
  const [toppers, setToppers]           = useState([]);
  const [topperBranch, setTopperBranch] = useState('');
  const [topperSem, setTopperSem]       = useState('');
  const [topperLimit, setTopperLimit]   = useState(10);
  const [toppersLoading, setToppersLoading] = useState(false);

  // Analytics state
  const [analyticsData, setAnalyticsData] = useState(null);
  const [analyticsLoading, setAnalyticsLoading] = useState(false);
  const [analyticsBranch, setAnalyticsBranch] = useState('');
  const [analyticsSem, setAnalyticsSem] = useState('');
  const [analyticsSec, setAnalyticsSec] = useState('');

  // Change Password page state
  const [pwSearch, setPwSearch]         = useState('');
  const [pwSelectedUser, setPwSelectedUser] = useState(null);
  const [pwNewVal, setPwNewVal]         = useState('');
  const [pwConfirm, setPwConfirm]       = useState('');
  const [pwResLoading, setPwResLoading] = useState(false);
  const [pwShow, setPwShow]             = useState(false);

  const [userForm, setUserForm] = useState({ username: '', password: '', name: '', role: 'hod', department: 'CSE', email: '', phone: '', year: '', semester: '', section: '', rollNo: '', course: 'B.Tech' });
  const [studentForm, setStudentForm] = useState({ rollNo: '', name: '', course: 'B.Tech', branch: 'CSE', year: 'I', semester: 'I', section: 'A', email: '', phone: '' });
  const [settingsForm, setSettingsForm] = useState({ mid_exam_max: 25, assignment_max: 5, total_max: 30, academic_year: '2025-26', mid1_deadline: '', mid2_deadline: '', assignment_deadline: '' });

  useEffect(() => { loadDashboard(); }, []);
  useEffect(() => { if (page === 'users') loadUsers(); }, [page, filterRole]);
  useEffect(() => { if (page === 'password') loadUsers(); }, [page]);
  useEffect(() => { if (page === 'toppers') loadToppers(); }, [page]);
  useEffect(() => { if (page === 'students') loadStudents(); }, [page, filterBranch, filterSem, filterSec]);
  useEffect(() => { if (page === 'settings') loadSettings(); }, [page]);
  useEffect(() => { if (page === 'reports') loadReports(); }, [page]);
  useEffect(() => { if (page === 'dashboard') loadAnalytics(); }, [page, analyticsBranch, analyticsSem, analyticsSec]);
  useEffect(() => { if (page === 'dashboard') loadActivity(); }, [page]);

  const loadActivity = async () => {
    setActLoading(true);
    try {
      const [onlineRes, usersRes, logsRes, statsRes] = await Promise.all([
        getActivityOnline(),
        getActivityUsers(),
        getActivityLogs({ limit: 200 }),
        getActivityStats(),
      ]);
      setActOnline(onlineRes.data);
      setActUsers(usersRes.data);
      setActLogs(logsRes.data.logs);
      setActStats(statsRes.data);
    } catch (e) { toast.error('Could not load activity data'); }
    setActLoading(false);
  };

  const loadActivityLogs = async () => {
    try {
      const params = { limit: 200 };
      if (actStatusFilter) params.status = actStatusFilter;
      if (actLogFilter)    params.username = actLogFilter;
      const r = await getActivityLogs(params);
      setActLogs(r.data.logs);
    } catch (e) {}
  };

  const loadAnalytics = async () => {
    setAnalyticsLoading(true);
    try {
      const params = new URLSearchParams();
      if (analyticsBranch) params.set('branch', analyticsBranch);
      if (analyticsSem) params.set('semester', analyticsSem);
      if (analyticsSec) params.set('section', analyticsSec);
      const r = await API.get(`/marks/analytics?${params}`);
      setAnalyticsData(r.data);
    } catch (e) { toast.error('Could not load analytics data'); }
    setAnalyticsLoading(false);
  };

  const loadDashboard = async () => {
    try {
      const [s, u, st] = await Promise.all([getMarkStats(), getUsers(), getStudents()]);
      setStats({ ...s.data, totalUsers: u.data.length, totalStudents: st.data.length });
    } catch (e) { console.error(e); }
  };
  const loadUsers = async () => {
    try { const r = await getUsers(filterRole ? { role: filterRole } : {}); setUsers(r.data); } catch (e) { }
  };
  const loadStudents = async () => {
    try {
      const params = {};
      if (filterBranch) params.branch = filterBranch;
      if (filterYear) params.year = filterYear;
      if (filterSem) params.semester = filterSem;
      if (filterSec) params.section = filterSec;
      const r = await getStudents(params); setStudents(r.data);
    } catch (e) { }
  };
  const loadSettings = async () => {
    try { const r = await getSettings(); setSettings(r.data); setSettingsForm({ mid_exam_max: r.data.mid_exam_max, assignment_max: r.data.assignment_max, total_max: r.data.total_max, academic_year: r.data.academic_year, mid1_deadline: r.data.mid1_deadline || '', mid2_deadline: r.data.mid2_deadline || '', assignment_deadline: r.data.assignment_deadline || '' }); } catch (e) { }
  };
  const loadReports = async () => {
    try { const r = await getDepartmentReport(); setDeptReport(r.data); } catch (e) { }
  };
  const loadToppers = async (branch = topperBranch, sem = topperSem, lim = topperLimit) => {
    setToppersLoading(true);
    try {
      const params = new URLSearchParams({ limit: lim });
      if (branch) params.set('branch', branch);
      if (sem) params.set('semester', sem);
      const r = await API.get(`/reports/toppers?${params}`);
      setToppers(r.data);
    } catch (e) { toast.error('Could not load toppers'); }
    setToppersLoading(false);
  };

  const handleSaveUser = async () => {
    setLoading(true);
    try {
      if (editUser) { await updateUser(editUser._id, userForm); toast.success('User updated!'); }
      else { await createUser(userForm); toast.success('User created! Default password: password123'); }
      setShowUserModal(false); setEditUser(null);
      setUserForm({ username: '', password: '', name: '', role: 'hod', department: 'CSE', email: '', phone: '', year: '', semester: '', section: '', rollNo: '', course: 'B.Tech' });
      loadUsers();
    } catch (e) { toast.error(e.response?.data?.message || 'Error saving user'); }
    setLoading(false);
  };

  const handleDeleteUser = async (id) => {
    if (!window.confirm('Delete this user?')) return;
    try { await deleteUser(id); toast.success('User deleted'); loadUsers(); } catch (e) { toast.error('Error deleting user'); }
  };

  const handleSaveStudent = async () => {
    setLoading(true);
    try {
      if (editStudent) { await updateUser(editStudent._id, studentForm); toast.success('Student updated!'); }
      else { await createStudent(studentForm); toast.success('Student & Login Account created!'); }
      setShowStudentModal(false); setEditStudent(null);
      setStudentForm({ rollNo: '', name: '', course: 'B.Tech', branch: 'CSE', year: 'I', semester: 'I', section: 'A', email: '', phone: '' });
      loadStudents();
    } catch (e) { toast.error(e.response?.data?.message || 'Error saving student'); }
    setLoading(false);
  };

  const handleDeleteStudent = async (id) => {
    if (!window.confirm('Delete this student?')) return;
    try { await deleteStudent(id); toast.success('Student deleted'); loadStudents(); } catch (e) { toast.error('Error'); }
  };

  const handleSaveSettings = async () => {
    try { await updateSettings(settingsForm); toast.success('Settings saved!'); } catch (e) { toast.error('Error saving settings'); }
  };

  const openEditUser = (u) => {
    setEditUser(u);
    setUserForm({ username: u.username, password: '', name: u.name, role: u.role, department: u.department || '', email: u.email || '', phone: u.phone || '', year: u.year || '', semester: u.semester || '', section: u.section || '', rollNo: u.rollNo || '', course: u.course || 'B.Tech' });
    setShowUserModal(true);
  };

  const handleAdminResetPw = async () => {
    if (!pwSelectedUser) return toast.error('Select a user first.');
    if (pwNewVal.length < 6) return toast.error('Password must be at least 6 characters.');
    if (pwNewVal !== pwConfirm) return toast.error('Passwords do not match.');
    setPwResLoading(true);
    try {
      await updateUser(pwSelectedUser._id, { password: pwNewVal });
      toast.success(`✅ Password reset for ${pwSelectedUser.name}!`);
      setPwNewVal('');
      setPwConfirm('');
      setPwSelectedUser(null);
      setPwSearch('');
    } catch (e) { toast.error(e.response?.data?.message || 'Failed to reset password.'); }
    setPwResLoading(false);
  };

  const roleBadgeColor = { admin: '#d97706', hod: '#7c3aed', faculty: '#16a34a', classteacher: '#1d4ed8', student: '#db2777' };

  return (
    <Layout navItems={NAV} activePage={page} onNavClick={setPage}>
      {/* DASHBOARD */}
      {page === 'dashboard' && (
        <div>
          <div className="page-header">
            <div className="breadcrumb">Admin / <span>Dashboard</span></div>
            <h2>System Dashboard</h2>
            <p>Overview of VEMU Mid Marks Management System</p>
          </div>
          <div className="stats-grid">
            {[
              { icon: '👥', val: stats.totalUsers || 0, label: 'Total Users', color: '#001852' },
              { icon: '🎓', val: stats.totalStudents || 0, label: 'Total Students', color: '#7c3aed' },
              { icon: '📝', val: stats.total || 0, label: 'Marks Records', color: '#0e7490' },
              { icon: '⏳', val: stats.submitted || 0, label: 'Pending Approval', color: '#d97706' },
              { icon: '✅', val: stats.approved || 0, label: 'Approved', color: '#16a34a' },
              { icon: '❌', val: stats.rejected || 0, label: 'Rejected', color: '#dc2626' },
            ].map((s, i) => (
              <div key={i} className="stat-card" style={{ borderTopColor: s.color }}>
                <div className="stat-icon">{s.icon}</div>
                <div className="stat-val" style={{ color: s.color }}>{s.val}</div>
                <div className="stat-lbl">{s.label}</div>
              </div>
            ))}
          </div>



          <div className="card">
            <div className="card-head"><h3>🏫 Department Summary</h3></div>
            <div className="card-body">
              <div className="table-wrap">
                <table>
                  <thead><tr><th>Department</th><th>Approved Records</th><th>Avg Internal</th><th>Pass %</th></tr></thead>
                  <tbody>
                    {deptReport.length === 0 ? (
                      <tr><td colSpan={4} style={{ textAlign: 'center', padding: 30, color: '#6b7280' }}>No approved marks data yet. Load reports to see data.</td></tr>
                    ) : deptReport.map((d, i) => (
                      <tr key={i}>
                        <td><span style={{ background: '#dbeafe', color: '#1d4ed8', padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 600 }}>{d._id}</span></td>
                        <td>{d.count}</td>
                        <td>{d.avgInternal?.toFixed(1)}</td>
                        <td>{d.count ? Math.round((d.passed / d.count) * 100) : 0}%</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
          <div className="card">
            <div className="card-head">
              <h3>📈 Analytics Filters</h3>
              <div style={{ display: 'flex', gap: 10 }}>
                <div className="sel-wrap">
                  <select value={analyticsBranch} onChange={e => setAnalyticsBranch(e.target.value)} style={{ padding: '8px 30px 8px 12px', border: '1px solid var(--border)', borderRadius: 8, fontSize: 12 }}>
                    <option value="">All Branches</option>
                    {BRANCHES.map(b => <option key={b} value={b}>{b}</option>)}
                  </select>
                </div>
                <div className="sel-wrap">
                  <select value={analyticsSem} onChange={e => setAnalyticsSem(e.target.value)} style={{ padding: '8px 30px 8px 12px', border: '1px solid var(--border)', borderRadius: 8, fontSize: 12 }}>
                    <option value="">All Semesters</option>
                    {SEMS.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
                <div className="sel-wrap">
                  <select value={analyticsSec} onChange={e => setAnalyticsSec(e.target.value)} style={{ padding: '8px 30px 8px 12px', border: '1px solid var(--border)', borderRadius: 8, fontSize: 12 }}>
                    <option value="">All Sections</option>
                    {SECTIONS.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
              </div>
            </div>
          </div>

          {analyticsLoading ? (
            <div style={{ textAlign: 'center', padding: 50, color: 'var(--muted)' }}>Loading analytics...</div>
          ) : analyticsData && (
            <>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 24, marginBottom: 24 }}>
                {/* Subject Performance Bar Chart */}
                <div className="card" style={{ marginBottom: 0 }}>
                  <div className="card-head"><h3>Subject Performance (Avg Internal)</h3></div>
                  <div className="card-body" style={{ height: 300, padding: '20px 20px 0 0' }}>
                    {analyticsData.subjectPerformance.length > 0 ? (
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={analyticsData.subjectPerformance} margin={{ top: 10, right: 10, left: -20, bottom: 20 }}>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" />
                          <XAxis dataKey="subject" tick={{ fontSize: 10, fill: 'var(--muted)' }} angle={-45} textAnchor="end" />
                          <YAxis tick={{ fontSize: 10, fill: 'var(--muted)' }} domain={[0, 30]} />
                          <Tooltip contentStyle={{ borderRadius: 8, border: 'none', boxShadow: '0 4px 15px rgba(0,0,0,0.1)' }} cursor={{ fill: 'rgba(0,24,82,0.05)' }} />
                          <Bar dataKey="average" fill="#001852" radius={[4, 4, 0, 0]} name="Avg Marks" />
                        </BarChart>
                      </ResponsiveContainer>
                    ) : <div style={{ textAlign: 'center', color: 'var(--muted)', marginTop: 100 }}>No data available</div>}
                  </div>
                </div>

                {/* Pass/Fail Pie Chart */}
                <div className="card" style={{ marginBottom: 0 }}>
                  <div className="card-head"><h3>Overall Pass vs Fail</h3></div>
                  <div className="card-body" style={{ height: 300 }}>
                    {analyticsData.passFailStats[0].value > 0 || analyticsData.passFailStats[1].value > 0 ? (
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie data={analyticsData.passFailStats} cx="50%" cy="50%" innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="value">
                            {analyticsData.passFailStats.map((entry, index) => <Cell key={`cell-${index}`} fill={entry.fill} />)}
                          </Pie>
                          <Tooltip contentStyle={{ borderRadius: 8, border: 'none', boxShadow: '0 4px 15px rgba(0,0,0,0.1)' }} />
                          <Legend verticalAlign="bottom" height={36} iconType="circle" />
                        </PieChart>
                      </ResponsiveContainer>
                    ) : <div style={{ textAlign: 'center', color: 'var(--muted)', marginTop: 100 }}>No data available</div>}
                  </div>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 24 }}>
                {/* Trend Chart Mid 1 vs Mid 2 */}
                <div className="card" style={{ marginBottom: 0 }}>
                  <div className="card-head"><h3>Mid 1 vs Mid 2 Trend</h3></div>
                  <div className="card-body" style={{ height: 300, padding: '20px 20px 0 0' }}>
                    {analyticsData.trendStats.length > 0 ? (
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={analyticsData.trendStats} margin={{ top: 10, right: 10, left: -20, bottom: 20 }}>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" />
                          <XAxis dataKey="subject" tick={{ fontSize: 10, fill: 'var(--muted)' }} angle={-45} textAnchor="end" />
                          <YAxis tick={{ fontSize: 10, fill: 'var(--muted)' }} domain={[0, 30]} />
                          <Tooltip contentStyle={{ borderRadius: 8, border: 'none', boxShadow: '0 4px 15px rgba(0,0,0,0.1)' }} />
                          <Legend verticalAlign="top" height={36} iconType="circle" />
                          <Line type="monotone" dataKey="Mid1" stroke="#c9973a" strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 6 }} name="Avg Mid 1" />
                          <Line type="monotone" dataKey="Mid2" stroke="#7c3aed" strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 6 }} name="Avg Mid 2" />
                        </LineChart>
                      </ResponsiveContainer>
                    ) : <div style={{ textAlign: 'center', color: 'var(--muted)', marginTop: 100 }}>No data available</div>}
                  </div>
                </div>

                {/* Top Performers Table */}
                <div className="card" style={{ marginBottom: 0 }}>
                  <div className="card-head"><h3>🏆 Top Performers Leaderboard</h3></div>
                  <div className="card-body" style={{ padding: 0, height: 300, overflowY: 'auto' }}>
                    {analyticsData.topPerformers.length > 0 ? (
                      <table style={{ width: '100%' }}>
                        <thead>
                          <tr style={{ position: 'sticky', top: 0, background: 'var(--white)', zIndex: 1, boxShadow: '0 1px 0 var(--border)' }}>
                            <th style={{ padding: '12px 20px', color: 'var(--muted)' }}>Rank</th>
                            <th style={{ padding: '12px 20px', color: 'var(--muted)' }}>Student</th>
                            <th style={{ padding: '12px 20px', textAlign: 'center', color: 'var(--muted)' }}>Total Internal</th>
                          </tr>
                        </thead>
                        <tbody>
                          {analyticsData.topPerformers.map((p, idx) => (
                            <tr key={p.rollNo}>
                              <td style={{ padding: '12px 20px', fontWeight: 700, fontSize: 16 }}>
                                {idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : `#${idx + 1}`}
                              </td>
                              <td style={{ padding: '12px 20px' }}>
                                <div style={{ fontWeight: 600 }}>{p.name}</div>
                                <div style={{ fontSize: 11, color: 'var(--muted)', fontFamily: 'monospace' }}>{p.rollNo}</div>
                              </td>
                              <td style={{ padding: '12px 20px', textAlign: 'center', fontWeight: 700, color: 'var(--green)' }}>{p.totalMarks}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    ) : <div style={{ textAlign: 'center', color: 'var(--muted)', marginTop: 100 }}>No top performers data</div>}
                  </div>
                </div>
              </div>
            </>
          )}

        </div>
      )}

      {/* ACTIVITY MONITOR SECTION IN DASHBOARD */}
      {page === 'dashboard' && (
        <div style={{ marginTop: 40 }}>
          <div className="page-header">
            <h2>Activity Monitor</h2>
            <p>Real-time system usage and security logs</p>
          </div>
          
          <div className="stats-grid">
            {[
              { icon: '⚡', val: actStats.onlineCount ?? 0, label: 'Active Sessions', color: '#16a34a' },
              { icon: '🔑', val: actStats.totalLogins ?? 0, label: 'Total Logins', color: '#1d4ed8' },
              { icon: '⚠️', val: actStats.failedToday ?? 0, label: 'Failed Logins Today', color: '#dc2626' },
              { icon: '👥', val: actUsers.length || 0, label: 'Staff Accounts', color: '#7c3aed' },
            ].map((s, i) => (
              <div key={`act-stat-${i}`} className="stat-card" style={{ borderTopColor: s.color }}>
                <div className="stat-icon">{s.icon}</div>
                <div className="stat-val" style={{ color: s.color }}>{s.val}</div>
                <div className="stat-lbl">{s.label}</div>
              </div>
            ))}
          </div>

          <div className="card">
            <div className="card-head">
              <div style={{ display: 'flex', gap: 10 }}>
                {[['online', '⚡ Online Now'], ['users', '👥 All Users'], ['logs', '📋 Login Logs']].map(([k, l]) => (
                  <button key={k} onClick={() => setActivityTab(k)} className="btn" style={{ padding: '8px 16px', borderRadius: 8, border: activityTab !== k ? '1px solid var(--border)' : 'none', background: activityTab === k ? 'var(--navy)' : 'transparent', color: activityTab === k ? '#fff' : 'var(--muted)', fontWeight: 600, cursor: 'pointer', transition: 'all 0.2s' }}>
                    {l}
                  </button>
                ))}
              </div>
              <button onClick={loadActivity} className="btn btn-gold btn-sm">🔄 Refresh</button>
            </div>
            <div className="card-body">
              {actLoading ? (
                <div style={{ textAlign: 'center', padding: 50, color: 'var(--muted)' }}>Loading activity data...</div>
              ) : (() => {
                const fmtTime = (d) => {
                  if (!d) return '—';
                  const diff = Date.now() - new Date(d).getTime();
                  if (diff < 60000) return 'Just now';
                  if (diff < 3600000) return `${Math.floor(diff/60000)}m ago`;
                  if (diff < 86400000) return `${Math.floor(diff/3600000)}h ago`;
                  return new Date(d).toLocaleDateString('en-IN',{day:'2-digit',month:'short',year:'numeric'});
                };
                const fmtFull = (d) => d ? new Date(d).toLocaleString('en-IN',{day:'2-digit',month:'short',year:'numeric',hour:'2-digit',minute:'2-digit'}) : '—';
                const filteredLogs = actLogs.filter(l =>
                  (!actStatusFilter || l.status === actStatusFilter) &&
                  (!actLogFilter || l.username?.toLowerCase().includes(actLogFilter.toLowerCase()) || l.name?.toLowerCase().includes(actLogFilter.toLowerCase()))
                );

                return (
                  <>
                    {activityTab === 'online' && (
                      <div className="table-wrap">
                        <table>
                          <thead><tr><th>User</th><th>Role</th><th>Department</th><th>Logged In</th><th>IP Address</th></tr></thead>
                          <tbody>
                            {actOnline.map(u => (
                              <tr key={u._id}>
                                <td>
                                  <div style={{ fontWeight: 600 }}>{u.name}</div>
                                  <div style={{ fontSize: 11, color: 'var(--muted)', fontFamily: 'monospace' }}>@{u.username}</div>
                                </td>
                                <td><span style={{ background: '#f3f4f6', color: '#4b5563', padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 600, textTransform: 'capitalize' }}>{u.role}</span></td>
                                <td>{u.department || '—'}</td>
                                <td>
                                  <div style={{ color: '#16a34a', fontWeight: 600 }}>{fmtTime(u.lastLoginAt)}</div>
                                </td>
                                <td><span style={{ fontFamily: 'monospace', fontSize: 11, color: 'var(--muted)' }}>{u.lastLoginIP || 'unknown'}</span></td>
                              </tr>
                            ))}
                            {actOnline.length === 0 && <tr><td colSpan={5} style={{ textAlign: 'center', padding: 30, color: 'var(--muted)' }}>No active sessions right now.</td></tr>}
                          </tbody>
                        </table>
                      </div>
                    )}
                    {activityTab === 'users' && (
                      <div className="table-wrap">
                        <table>
                          <thead><tr><th>User</th><th>Role</th><th>Total Logins</th><th>Last Login</th></tr></thead>
                          <tbody>
                            {actUsers.map(u => {
                              const isOnline = u.lastLoginAt && (Date.now()-new Date(u.lastLoginAt).getTime()) < 8*3600000;
                              return (
                              <tr key={u._id}>
                                <td>
                                  <div style={{ fontWeight: 600 }}>{isOnline ? '🟢 ' : ''}{u.name}</div>
                                  <div style={{ fontSize: 11, color: 'var(--muted)', fontFamily: 'monospace' }}>@{u.username} {u.department ? `· ${u.department}` : ''}</div>
                                </td>
                                <td><span style={{ background: '#f3f4f6', color: '#4b5563', padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 600, textTransform: 'capitalize' }}>{u.role}</span></td>
                                <td>{u.loginCount || 0}</td>
                                <td>
                                  <div style={{ fontWeight: 600 }}>{fmtTime(u.lastLoginAt)}</div>
                                  <div style={{ fontSize: 10, color: 'var(--muted)' }}>{fmtFull(u.lastLoginAt)}</div>
                                </td>
                              </tr>
                            )})}
                            {actUsers.length === 0 && <tr><td colSpan={4} style={{ textAlign: 'center', padding: 30, color: 'var(--muted)' }}>No users found.</td></tr>}
                          </tbody>
                        </table>
                      </div>
                    )}
                    {activityTab === 'logs' && (
                      <div>
                        <div style={{ display: 'flex', gap: 10, marginBottom: 16 }}>
                          <input value={actLogFilter} onChange={e=>setActLogFilter(e.target.value)} placeholder="Search logs..." style={{ padding: '8px 12px', border: '1px solid var(--border)', borderRadius: 8, fontSize: 12, flex: 1, outline: 'none' }} />
                          <select value={actStatusFilter} onChange={e=>setActStatusFilter(e.target.value)} style={{ padding: '8px 12px', border: '1px solid var(--border)', borderRadius: 8, fontSize: 12, outline: 'none' }}>
                            <option value="">All Statuses</option>
                            <option value="success">Success</option>
                            <option value="failed">Failed</option>
                          </select>
                        </div>
                        <div className="table-wrap">
                          <table>
                            <thead><tr><th>Status</th><th>User / Attempt</th><th>Message</th><th>Time</th><th>IP Address</th></tr></thead>
                            <tbody>
                              {filteredLogs.map((l, i) => {
                                const isOk = l.status === 'success';
                                return (
                                <tr key={i}>
                                  <td><span style={{ background: isOk ? '#dcfce7' : '#fee2e2', color: isOk ? '#16a34a' : '#dc2626', padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 600 }}>{isOk ? 'Success' : 'Failed'}</span></td>
                                  <td>
                                    <div style={{ fontWeight: 600 }}>{l.name || l.username}</div>
                                    <div style={{ fontSize: 11, color: 'var(--muted)', fontFamily: 'monospace' }}>@{l.username}</div>
                                  </td>
                                  <td>{l.message}</td>
                                  <td>
                                    <div style={{ fontWeight: 600 }}>{fmtTime(l.attemptedAt)}</div>
                                    <div style={{ fontSize: 10, color: 'var(--muted)' }}>{fmtFull(l.attemptedAt)}</div>
                                  </td>
                                  <td><span style={{ fontFamily: 'monospace', fontSize: 11, color: 'var(--muted)' }}>{l.ip || 'unknown'}</span></td>
                                </tr>
                              )})}
                              {filteredLogs.length === 0 && <tr><td colSpan={5} style={{ textAlign: 'center', padding: 30, color: 'var(--muted)' }}>No logs match your search.</td></tr>}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    )}
                  </>
                );
              })()}
            </div>
          </div>
        </div>
      )}

      {/* USERS */}
      {page === 'users' && (
        <div>
          <div className="page-header">
            <div className="breadcrumb">Admin / <span>User Management</span></div>
            <h2>User Management</h2>
            <p>Create and manage HOD, Faculty, Class Teacher and Student accounts</p>
          </div>
          <div className="card">
            <div className="card-head">
              <h3>All Users ({users.length})</h3>
              <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                <div className="sel-wrap">
                  <select value={filterRole} onChange={e => setFilterRole(e.target.value)} style={{ padding: '7px 28px 7px 10px', border: '1.5px solid #dde3ef', borderRadius: 8, fontSize: 12, fontFamily: 'Outfit,sans-serif' }}>
                    <option value="">All Roles</option>
                    <option value="admin">Admin</option>
                    <option value="hod">HOD</option>
                    <option value="faculty">Faculty</option>
                    <option value="classteacher">Class Teacher</option>
                    <option value="student">Student</option>
                  </select>
                </div>
                <button className="btn btn-primary btn-sm" onClick={() => { setEditUser(null); setShowUserModal(true); }}>➕ Add User</button>
              </div>
            </div>
            <div className="card-body">
              <div className="table-wrap">
                <table>
                  <thead><tr><th>Name</th><th>Username</th><th>Role</th><th>Department</th><th>Status</th><th>Actions</th></tr></thead>
                  <tbody>
                    {users.map(u => (
                      <tr key={u._id}>
                        <td style={{ fontWeight: 600 }}>{u.name}</td>
                        <td style={{ color: '#6b7280', fontFamily: 'monospace' }}>{u.username}</td>
                        <td><span style={{ background: `${roleBadgeColor[u.role]}20`, color: roleBadgeColor[u.role], padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 600, textTransform: 'capitalize' }}>{u.role}</span></td>
                        <td>{u.department || '—'}</td>
                        <td><span style={{ background: u.active ? '#dcfce7' : '#fee2e2', color: u.active ? '#16a34a' : '#dc2626', padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 600 }}>{u.active ? 'Active' : 'Inactive'}</span></td>
                        <td>
                          <div style={{ display: 'flex', gap: 6 }}>
                            <button className="btn btn-info btn-sm" onClick={() => openEditUser(u)}>✏️ Edit</button>
                            <button className="btn btn-danger btn-sm" onClick={() => handleDeleteUser(u._id)}>🗑️</button>
                          </div>
                        </td>
                      </tr>
                    ))}
                    {users.length === 0 && <tr><td colSpan={6} style={{ textAlign: 'center', padding: 30, color: '#6b7280' }}>No users found</td></tr>}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* STUDENTS */}
      {page === 'students' && (
        <div>
          <div className="page-header">
            <div className="breadcrumb">Admin / <span>Student Management</span></div>
            <h2>Student Management</h2>
            <p>Manage student records and information</p>
          </div>
          <div className="card">
            <div className="card-head">
              <h3>Students ({students.length})</h3>
              <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                {[['filterBranch', 'Branch', BRANCHES, 'All Branches'], ['filterYear', 'Year', YEARS, 'All Years'], ['filterSem', 'Sem', SEMS, 'All Sems'], ['filterSec', 'Section', SECTIONS, 'All Sections']].map(([stateKey, label, opts, placeholder]) => (
                  <div className="sel-wrap" key={stateKey}>
                    <select value={eval(stateKey)} onChange={e => { if (stateKey === 'filterBranch') setFilterBranch(e.target.value); else if (stateKey === 'filterYear') setFilterYear(e.target.value); else if (stateKey === 'filterSem') setFilterSem(e.target.value); else setFilterSec(e.target.value); }} style={{ padding: '7px 28px 7px 10px', border: '1.5px solid #dde3ef', borderRadius: 8, fontSize: 12, fontFamily: 'Outfit,sans-serif' }}>
                      <option value="">{placeholder}</option>
                      {opts.map(o => <option key={o} value={o}>{o}</option>)}
                    </select>
                  </div>
                ))}
                <button className="btn btn-primary btn-sm" onClick={() => { setEditStudent(null); setShowStudentModal(true); }}>➕ Add Student</button>
              </div>
            </div>
            <div className="card-body">
              <div className="table-wrap">
                <table>
                  <thead><tr><th>Roll No</th><th>Name</th><th>Branch</th><th>Year</th><th>Semester</th><th>Section</th><th>Course</th><th>Actions</th></tr></thead>
                  <tbody>
                    {students.map(s => (
                      <tr key={s._id}>
                        <td style={{ fontFamily: 'monospace', fontWeight: 600 }}>{s.rollNo}</td>
                        <td style={{ fontWeight: 500 }}>{s.name}</td>
                        <td><span style={{ background: '#dbeafe', color: '#1d4ed8', padding: '3px 8px', borderRadius: 20, fontSize: 11, fontWeight: 600 }}>{s.branch}</span></td>
                        <td>{s.year}</td>
                        <td>{s.semester}</td>
                        <td>{s.section}</td>
                        <td>{s.course}</td>
                        <td>
                          <button className="btn btn-danger btn-sm" onClick={() => handleDeleteStudent(s._id)}>🗑️</button>
                        </td>
                      </tr>
                    ))}
                    {students.length === 0 && <tr><td colSpan={7} style={{ textAlign: 'center', padding: 30, color: '#6b7280' }}>No students found. Add students or apply different filters.</td></tr>}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* SETTINGS */}
      {page === 'settings' && (
        <div>
          <div className="page-header">
            <div className="breadcrumb">Admin / <span>System Settings</span></div>
            <h2>System Settings</h2>
            <p>Configure academic settings and mark limits</p>
          </div>
          <div className="card">
            <div className="card-head"><h3>⚙️ Mark Configuration</h3></div>
            <div className="card-body">
              <div className="form-grid form-grid-2" style={{ maxWidth: 500 }}>
                {[['mid_exam_max', 'Mid Exam Max Marks (per mid)'], ['assignment_max', 'Assignment Max Marks'], ['total_max', 'Total Internal Max']].map(([k, l]) => (
                  <div className="form-group" key={k}>
                    <label>{l}</label>
                    <input type="number" value={settingsForm[k] || ''} onChange={e => setSettingsForm({ ...settingsForm, [k]: Number(e.target.value) })} />
                  </div>
                ))}
                <div className="form-group">
                  <label>Academic Year</label>
                  <input value={settingsForm.academic_year || ''} onChange={e => setSettingsForm({ ...settingsForm, academic_year: e.target.value })} />
                </div>
                <div className="form-group">
                  <label>Mid 1 Marks Deadline</label>
                  <input type="date" value={settingsForm.mid1_deadline || ''} onChange={e => setSettingsForm({ ...settingsForm, mid1_deadline: e.target.value })} />
                </div>
                <div className="form-group">
                  <label>Mid 2 Marks Deadline</label>
                  <input type="date" value={settingsForm.mid2_deadline || ''} onChange={e => setSettingsForm({ ...settingsForm, mid2_deadline: e.target.value })} />
                </div>
                <div className="form-group">
                  <label>Assignment Deadline</label>
                  <input type="date" value={settingsForm.assignment_deadline || ''} onChange={e => setSettingsForm({ ...settingsForm, assignment_deadline: e.target.value })} />
                </div>
              </div>
              <div className="form-actions">
                <button className="btn btn-primary" onClick={handleSaveSettings}>💾 Save Settings</button>
              </div>
            </div>
          </div>
          <div className="card">
            <div className="card-head"><h3>📚 Departments Configured</h3></div>
            <div className="card-body">
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {BRANCHES.map(b => <span key={b} style={{ background: '#dbeafe', color: '#1d4ed8', padding: '6px 16px', borderRadius: 20, fontSize: 13, fontWeight: 600 }}>{b}</span>)}
              </div>
              <div className="alert alert-info" style={{ marginTop: 16 }}>
                Semesters: I through VIII (8 semesters, 4-year B.Tech program)
              </div>
            </div>
          </div>

        </div>
      )}

      {/* REPORTS */}
      {page === 'reports' && (
        <div>
          <div className="page-header">
            <div className="breadcrumb">Admin / <span>Institution Reports</span></div>
            <h2>Institution Reports</h2>
            <p>Department-wise performance overview</p>
          </div>
          <div className="card">
            <div className="card-head">
              <h3>🏫 Department Performance</h3>
              <div style={{ display:'flex', gap:10, alignItems:'center' }}>
                <button className="btn btn-gold btn-sm" onClick={loadReports}>🔄 Refresh</button>
                <button
                  className="btn btn-success btn-sm"
                  disabled={pdfLoading || deptReport.length === 0}
                  onClick={async () => {
                    setPdfLoading(true);
                    try {
                      // Build a flat marks-like array from deptReport summary for the PDF
                      const summaryMarks = deptReport.flatMap(d =>
                        Array.from({ length: d.count }, (_, i) => ({
                          studentRollNo: `${d._id}-${i+1}`,
                          studentName: `Student ${i+1}`,
                          subjectCode: d._id,
                          subjectName: `${d._id} Department`,
                          internalMarks: d.avgInternal || 0,
                          mid1: { grandTotal: 0 },
                          mid2: { grandTotal: 0 },
                          status: 'approved',
                          facultyName: '—',
                        }))
                      );
                      await downloadDepartmentReport({
                        hodName: 'System Administrator',
                        department: 'All Departments',
                        semester: '',
                        section: '',
                        marks: summaryMarks,
                      });
                      toast.success('📄 Institution report downloaded!');
                    } catch(e) { console.error(e); toast.error('PDF generation failed'); }
                    setPdfLoading(false);
                  }}
                  style={{ display:'flex', alignItems:'center', gap:6, background:'linear-gradient(135deg,#16a34a,#22c55e)', color:'#fff', border:'none' }}
                >
                  {pdfLoading ? '⏳ Generating…' : '📥 Download PDF'}
                </button>
              </div>
            </div>
            <div className="card-body">
              <div className="table-wrap">
                <table>
                  <thead><tr><th>Department</th><th>Total Records</th><th>Avg Internal</th><th>Passed</th><th>Pass %</th></tr></thead>
                  <tbody>
                    {deptReport.map((d, i) => (
                      <tr key={i}>
                        <td><span style={{ background: '#dbeafe', color: '#1d4ed8', padding: '3px 10px', borderRadius: 20, fontSize: 12, fontWeight: 700 }}>{d._id}</span></td>
                        <td>{d.count}</td>
                        <td>{d.avgInternal?.toFixed(1)}</td>
                        <td>{d.passed}</td>
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <div style={{ flex: 1, background: '#e2e8f0', borderRadius: 4, height: 6 }}>
                              <div style={{ width: `${d.count ? Math.round((d.passed / d.count) * 100) : 0}%`, background: '#16a34a', borderRadius: 4, height: '100%' }} />
                            </div>
                            <span style={{ fontSize: 12, fontWeight: 600, color: '#16a34a', minWidth: 35 }}>{d.count ? Math.round((d.passed / d.count) * 100) : 0}%</span>
                          </div>
                        </td>
                      </tr>
                    ))}
                    {deptReport.length === 0 && <tr><td colSpan={5} style={{ textAlign: 'center', padding: 30, color: '#6b7280' }}>No approved marks data available yet</td></tr>}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* CHANGE PASSWORD */}
      {page === 'password' && (() => {
        const filteredUsers = users.filter(u =>
          (u.name?.toLowerCase().includes(pwSearch.toLowerCase()) ||
           u.username?.toLowerCase().includes(pwSearch.toLowerCase()) ||
           u.role?.toLowerCase().includes(pwSearch.toLowerCase())) &&
          u.role !== 'admin'
        );
        const roleBadge = { hod:'#7c3aed', faculty:'#16a34a', classteacher:'#1d4ed8', student:'#db2777' };
        return (
          <div style={{maxWidth:700,margin:'0 auto'}}>
            <div className="page-header">
              <div className="breadcrumb">Admin / <span>Change Password</span></div>
              <h2>🔐 Reset User Password</h2>
              <p>Search for any user and set a new password for their account</p>
            </div>

            {/* Step 1 — Pick User */}
            <div className="card" style={{marginBottom:20}}>
              <div style={{padding:'16px 24px',borderBottom:'1px solid var(--border)',display:'flex',alignItems:'center',gap:10}}>
                <span style={{width:26,height:26,borderRadius:'50%',background:'#dbeafe',color:'#1d4ed8',display:'inline-flex',alignItems:'center',justifyContent:'center',fontWeight:800,fontSize:13}}>1</span>
                <span style={{fontWeight:700,color:'var(--navy)',fontSize:15}}>Select User</span>
              </div>
              <div className="card-body">
                <div style={{position:'relative',marginBottom:16}}>
                  <span style={{position:'absolute',left:12,top:'50%',transform:'translateY(-50%)',fontSize:15,pointerEvents:'none'}}>🔍</span>
                  <input
                    value={pwSearch}
                    onChange={e => { setPwSearch(e.target.value); setPwSelectedUser(null); if(page==='password' && users.length===0) loadUsers(); }}
                    onFocus={() => { if(users.length===0) loadUsers(); }}
                    placeholder="Search by name, username or role…"
                    style={{width:'100%',padding:'10px 14px 10px 38px',borderRadius:10,border:'1.5px solid var(--border)',fontSize:13,fontFamily:"'Outfit',sans-serif",background:'var(--bg)',color:'var(--text)',outline:'none',boxSizing:'border-box'}}
                  />
                </div>
                {pwSearch && filteredUsers.length === 0 && (
                  <div style={{textAlign:'center',padding:'28px',color:'var(--muted)',fontSize:13}}>No users found matching "{pwSearch}"</div>
                )}
                {filteredUsers.length > 0 && (
                  <div style={{display:'flex',flexDirection:'column',gap:6,maxHeight:280,overflowY:'auto'}}>
                    {filteredUsers.map(u => (
                      <div key={u._id} onClick={() => { setPwSelectedUser(u); setPwNewVal(''); setPwConfirm(''); }}
                        style={{display:'flex',alignItems:'center',gap:14,padding:'12px 16px',borderRadius:10,border:`2px solid ${pwSelectedUser?._id===u._id?'#1d4ed8':'var(--border)'}`,background:pwSelectedUser?._id===u._id?'#eff6ff':'var(--bg)',cursor:'pointer',transition:'all .2s'}}>
                        <div style={{width:40,height:40,borderRadius:'50%',background:`${roleBadge[u.role]||'#6b7280'}22`,display:'flex',alignItems:'center',justifyContent:'center',fontSize:18,flexShrink:0}}>
                          {u.role==='student'?'🎒':u.role==='faculty'?'📚':u.role==='hod'?'🎓':'📋'}
                        </div>
                        <div style={{flex:1}}>
                          <div style={{fontWeight:700,color:'var(--navy)',fontSize:14}}>{u.name}</div>
                          <div style={{fontSize:11,color:'var(--muted)',marginTop:2}}>@{u.username} · {u.department||'—'}</div>
                        </div>
                        <span style={{background:`${roleBadge[u.role]||'#6b7280'}22`,color:roleBadge[u.role]||'#6b7280',padding:'3px 10px',borderRadius:20,fontSize:11,fontWeight:600,textTransform:'capitalize'}}>{u.role}</span>
                        {pwSelectedUser?._id===u._id && <span style={{fontSize:18}}>✔️</span>}
                      </div>
                    ))}
                  </div>
                )}
                {!pwSearch && (
                  <div style={{textAlign:'center',padding:'24px',color:'var(--muted)',fontSize:13}}>
                    <div style={{fontSize:32,marginBottom:8}}>👆</div>
                    Type a name or username above to find a user
                  </div>
                )}
              </div>
            </div>

            {/* Step 2 — Set Password */}
            {pwSelectedUser && (
              <div className="card">
                <div style={{padding:'16px 24px',borderBottom:'1px solid var(--border)',display:'flex',alignItems:'center',gap:10}}>
                  <span style={{width:26,height:26,borderRadius:'50%',background:'#dcfce7',color:'#16a34a',display:'inline-flex',alignItems:'center',justifyContent:'center',fontWeight:800,fontSize:13}}>2</span>
                  <span style={{fontWeight:700,color:'var(--navy)',fontSize:15}}>Set New Password</span>
                  <span style={{marginLeft:'auto',fontSize:12,color:'var(--muted)'}}>
                    For: <b style={{color:'var(--navy)'}}>{pwSelectedUser.name}</b> (@{pwSelectedUser.username})
                  </span>
                </div>
                <div className="card-body">
                  <div style={{display:'flex',flexDirection:'column',gap:16}}>
                    <div>
                      <label style={{fontSize:11,fontWeight:700,color:'var(--muted)',textTransform:'uppercase',letterSpacing:.5,display:'block',marginBottom:6}}>New Password *</label>
                      <div style={{position:'relative'}}>
                        <input
                          type={pwShow ? 'text' : 'password'}
                          value={pwNewVal}
                          onChange={e => setPwNewVal(e.target.value)}
                          placeholder="Min. 6 characters"
                          style={{width:'100%',padding:'10px 42px 10px 14px',borderRadius:10,border:'1.5px solid var(--border)',fontSize:13,fontFamily:"'Outfit',sans-serif",background:'var(--bg)',color:'var(--text)',outline:'none',boxSizing:'border-box'}}
                        />
                        <button type="button" onClick={()=>setPwShow(v=>!v)} style={{position:'absolute',right:12,top:'50%',transform:'translateY(-50%)',background:'none',border:'none',cursor:'pointer',fontSize:16,color:'var(--muted)',padding:0}}>
                          {pwShow?'🙈':'👁️'}
                        </button>
                      </div>
                    </div>
                    <div>
                      <label style={{fontSize:11,fontWeight:700,color:'var(--muted)',textTransform:'uppercase',letterSpacing:.5,display:'block',marginBottom:6}}>Confirm Password *</label>
                      <div style={{position:'relative'}}>
                        <input
                          type={pwShow ? 'text' : 'password'}
                          value={pwConfirm}
                          onChange={e => setPwConfirm(e.target.value)}
                          placeholder="Re-enter password"
                          style={{width:'100%',padding:'10px 42px 10px 14px',borderRadius:10,border:`1.5px solid ${pwConfirm&&pwConfirm!==pwNewVal?'#ef4444':pwConfirm?'#22c55e':'var(--border)'}`,fontSize:13,fontFamily:"'Outfit',sans-serif",background:'var(--bg)',color:'var(--text)',outline:'none',boxSizing:'border-box'}}
                        />
                        {pwConfirm && (
                          <span style={{position:'absolute',right:12,top:'50%',transform:'translateY(-50%)',fontSize:15}}>
                            {pwConfirm===pwNewVal?'✅':'❌'}
                          </span>
                        )}
                      </div>
                    </div>
                    <div style={{display:'flex',gap:12}}>
                      <button onClick={()=>{setPwSelectedUser(null);setPwNewVal('');setPwConfirm('');}}
                        className="btn btn-danger" style={{flex:1,padding:'11px 0',fontSize:14}}>
                        ✕ Cancel
                      </button>
                      <button onClick={handleAdminResetPw} disabled={pwResLoading}
                        className="btn btn-primary" style={{flex:2,padding:'11px 0',fontSize:14,fontWeight:700,display:'flex',alignItems:'center',justifyContent:'center',gap:8}}>
                        {pwResLoading?<><span>⏳</span> Resetting…</>:<><span>🔐</span> Reset Password</>}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        );
      })()}

      {/* TOPPERS GRAPH */}
      {page === 'toppers' && (
        <div>
          <div className="page-header">
            <div className="breadcrumb">Admin / <span>Toppers Graph</span></div>
            <h2>🏆 Institution Toppers</h2>
            <p>Top performing students ranked by average internal marks across approved subjects</p>
          </div>

          {/* Filters */}
          <div className="card" style={{marginBottom:20}}>
            <div className="card-body" style={{padding:'16px 24px'}}>
              <div style={{display:'flex',gap:12,alignItems:'flex-end',flexWrap:'wrap'}}>
                <div>
                  <label style={{fontSize:11,fontWeight:700,color:'var(--muted)',textTransform:'uppercase',letterSpacing:.5,display:'block',marginBottom:5}}>Branch</label>
                  <div className="sel-wrap">
                    <select value={topperBranch} onChange={e=>setTopperBranch(e.target.value)} style={{padding:'8px 28px 8px 10px',border:'1.5px solid var(--border)',borderRadius:8,fontSize:12,fontFamily:'Outfit,sans-serif'}}>
                      <option value="">All Branches</option>
                      {BRANCHES.map(b=><option key={b} value={b}>{b}</option>)}
                    </select>
                  </div>
                </div>
                <div>
                  <label style={{fontSize:11,fontWeight:700,color:'var(--muted)',textTransform:'uppercase',letterSpacing:.5,display:'block',marginBottom:5}}>Semester</label>
                  <div className="sel-wrap">
                    <select value={topperSem} onChange={e=>setTopperSem(e.target.value)} style={{padding:'8px 28px 8px 10px',border:'1.5px solid var(--border)',borderRadius:8,fontSize:12,fontFamily:'Outfit,sans-serif'}}>
                      <option value="">All Semesters</option>
                      {SEMS.map(s=><option key={s} value={s}>Semester {s}</option>)}
                    </select>
                  </div>
                </div>
                <div>
                  <label style={{fontSize:11,fontWeight:700,color:'var(--muted)',textTransform:'uppercase',letterSpacing:.5,display:'block',marginBottom:5}}>Show Top</label>
                  <div className="sel-wrap">
                    <select value={topperLimit} onChange={e=>setTopperLimit(Number(e.target.value))} style={{padding:'8px 28px 8px 10px',border:'1.5px solid var(--border)',borderRadius:8,fontSize:12,fontFamily:'Outfit,sans-serif'}}>
                      {[5,10,15,20].map(n=><option key={n} value={n}>Top {n}</option>)}
                    </select>
                  </div>
                </div>
                <button onClick={()=>loadToppers(topperBranch,topperSem,topperLimit)}
                  className="btn btn-primary" style={{padding:'8px 20px',fontSize:13,display:'flex',alignItems:'center',gap:7}}>
                  {toppersLoading?<><span>⏳</span> Loading…</>:<><span>🔍</span> Apply Filters</>}
                </button>
              </div>
            </div>
          </div>

          {toppersLoading ? (
            <div style={{textAlign:'center',padding:80,color:'var(--muted)'}}>
              <div style={{fontSize:48,marginBottom:16}}>⏳</div>
              <div style={{fontSize:16,fontWeight:600}}>Loading toppers data…</div>
            </div>
          ) : toppers.length === 0 ? (
            <div style={{textAlign:'center',padding:80,color:'var(--muted)',background:'var(--bg)',borderRadius:16,border:'1px dashed var(--border)'}}>
              <div style={{fontSize:56,marginBottom:16}}>🏆</div>
              <div style={{fontSize:16,fontWeight:600,color:'var(--blue)',marginBottom:8}}>No approved marks data yet</div>
              <div style={{fontSize:13}}>Toppers appear once HOD approves student marks. Try different filters.</div>
            </div>
          ) : (
            <>
              {/* Podium for Top 3 */}
              {toppers.length >= 3 && (
                <div className="card" style={{marginBottom:20}}>
                  <div style={{padding:'20px 24px',borderBottom:'1px solid var(--border)',display:'flex',alignItems:'center',gap:10}}>
                    <span style={{fontSize:22}}>🥇</span>
                    <span style={{fontWeight:700,color:'var(--navy)',fontSize:16}}>Top 3 Podium</span>
                  </div>
                  <div className="card-body">
                    <div style={{display:'grid',gridTemplateColumns:'1fr 1.15fr 1fr',gap:16,alignItems:'flex-end',maxWidth:640,margin:'0 auto'}}>
                      {/* 2nd Place */}
                      {[1,0,2].map((rank, col) => {
                        const t = toppers[rank];
                        const medals = ['🥇','🥈','🥉'];
                        const colors = [['#f59e0b','#fef3c7','#d97706'],['#9ca3af','#f3f4f6','#6b7280'],['#cd7f32','#fef9ee','#a85a00']];
                        const heights = [120, 160, 90];
                        const [mc,bc,tc] = colors[rank===0?0:rank===1?1:2];
                        return (
                          <div key={rank} style={{textAlign:'center',display:'flex',flexDirection:'column',alignItems:'center',gap:8}}>
                            <div style={{width:52,height:52,borderRadius:'50%',background:`linear-gradient(135deg,${mc},${tc})`,display:'flex',alignItems:'center',justifyContent:'center',fontSize:24,border:`3px solid ${mc}`,boxShadow:`0 4px 16px ${mc}55`}}>
                              {rank===0?'🥇':rank===1?'🥈':'🥉'}
                            </div>
                            <div style={{fontWeight:800,color:'var(--navy)',fontSize:13,lineHeight:1.2,maxWidth:120}}>{t.name}</div>
                            <div style={{fontSize:10,color:'var(--muted)',fontFamily:'monospace'}}>{t.rollNo}</div>
                            <div style={{fontSize:10,background:`${mc}22`,color:mc,padding:'2px 8px',borderRadius:12,fontWeight:700}}>{t.branch}</div>
                            <div style={{width:'100%',background:bc,borderRadius:'12px 12px 0 0',height:`${heights[col]}px`,display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',border:`2px solid ${mc}`,borderBottom:'none',position:'relative',boxShadow:`0 -4px 20px ${mc}30`}}>
                              <div style={{fontSize:28,fontWeight:900,color:mc,fontFamily:"'Cormorant Garamond',serif",lineHeight:1}}>{t.avgInternal}</div>
                              <div style={{fontSize:9,color:tc,textTransform:'uppercase',letterSpacing:1,fontWeight:700}}>Avg / 30</div>
                              <div style={{position:'absolute',top:-14,fontSize:13,fontWeight:800,color:mc,background:'#fff',borderRadius:20,padding:'2px 8px',border:`1px solid ${mc}`}}>#{rank===0?'1':rank===1?'2':'3'}</div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}

              {/* Bar Chart */}
              <div className="card">
                <div style={{padding:'20px 24px',borderBottom:'1px solid var(--border)',display:'flex',alignItems:'center',justifyContent:'space-between'}}>
                  <div style={{display:'flex',alignItems:'center',gap:10}}>
                    <span style={{fontSize:22}}>📊</span>
                    <span style={{fontWeight:700,color:'var(--navy)',fontSize:16}}>Avg Internal Marks — Top {toppers.length} Students</span>
                  </div>
                  <div style={{display:'flex',alignItems:'center',gap:16,fontSize:11,color:'var(--muted)'}}>
                    <span style={{display:'flex',alignItems:'center',gap:5}}><span style={{width:12,height:12,borderRadius:3,background:'#16a34a',display:'inline-block'}}/> Pass (≥15)</span>
                    <span>Max: 30</span>
                  </div>
                </div>
                <div className="card-body">
                  <div style={{display:'flex',flexDirection:'column',gap:10}}>
                    {toppers.map((t, i) => {
                      const pct = Math.min((t.avgInternal / 30) * 100, 100);
                      const isPassing = t.avgInternal >= 15;
                      const barColor = i === 0 ? '#f59e0b' : i === 1 ? '#9ca3af' : i === 2 ? '#cd7f32' : isPassing ? '#16a34a' : '#ef4444';
                      const medal = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : null;
                      return (
                        <div key={i} style={{display:'flex',alignItems:'center',gap:12}}>
                          {/* Rank */}
                          <div style={{width:28,textAlign:'center',fontSize:medal?16:12,fontWeight:800,color:'var(--muted)',flexShrink:0}}>
                            {medal || `#${i+1}`}
                          </div>
                          {/* Name + Roll */}
                          <div style={{width:160,flexShrink:0}}>
                            <div style={{fontSize:12,fontWeight:700,color:'var(--navy)',lineHeight:1.2,whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}>{t.name}</div>
                            <div style={{fontSize:9,color:'var(--muted)',fontFamily:'monospace'}}>{t.rollNo} · {t.branch}</div>
                          </div>
                          {/* Bar */}
                          <div style={{flex:1,background:'var(--bg)',borderRadius:8,height:22,overflow:'hidden',position:'relative',border:'1px solid var(--border)'}}>
                            <div style={{
                              width:`${pct}%`,
                              height:'100%',
                              background:`linear-gradient(90deg, ${barColor}cc, ${barColor})`,
                              borderRadius:8,
                              transition:'width 0.8s ease',
                              display:'flex',alignItems:'center',justifyContent:'flex-end',paddingRight:8,
                            }}>
                              {pct > 20 && <span style={{fontSize:10,fontWeight:800,color:'#fff'}}>{t.avgInternal}</span>}
                            </div>
                            {pct <= 20 && <span style={{position:'absolute',left:`${pct+1}%`,top:'50%',transform:'translateY(-50%)',fontSize:10,fontWeight:800,color:barColor}}>{t.avgInternal}</span>}
                            {/* Pass line at 50% */}
                            <div style={{position:'absolute',left:'50%',top:0,bottom:0,width:1.5,background:'rgba(0,0,0,0.15)',pointerEvents:'none'}}/>
                          </div>
                          {/* Stats */}
                          <div style={{width:90,flexShrink:0,display:'flex',gap:6,justifyContent:'flex-end'}}>
                            <span style={{fontSize:10,padding:'2px 7px',borderRadius:10,background:isPassing?'#dcfce7':'#fee2e2',color:isPassing?'#16a34a':'#dc2626',fontWeight:700}}>
                              {t.passed}/{t.totalSubjects} ✓
                            </span>
                            <span style={{fontSize:10,padding:'2px 7px',borderRadius:10,background:'var(--bg)',color:'var(--muted)',fontWeight:600,border:'1px solid var(--border)'}}>
                              {t.section}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* X-axis labels */}
                  <div style={{display:'flex',marginTop:12,paddingLeft:202,paddingRight:100}}>
                    {[0,5,10,15,20,25,30].map(v=>(
                      <div key={v} style={{flex:1,textAlign:'left',fontSize:9,color:'var(--muted)',fontWeight:600,borderLeft:'1px dashed var(--border)',paddingLeft:3,lineHeight:1}}>
                        {v}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {/* USER MODAL */}
      {showUserModal && (
        <div className="modal-overlay" onClick={e => { if (e.target === e.currentTarget) { setShowUserModal(false); setEditUser(null); } }}>
          <div className="modal">
            <div className="modal-head">
              <h3>{editUser ? 'Edit User' : 'Add New User'}</h3>
              <button className="modal-close" onClick={() => { setShowUserModal(false); setEditUser(null); }}>✕</button>
            </div>
            <div className="modal-body">
              <div className="form-grid form-grid-2" style={{ gap: 14 }}>
                <div className="form-group"><label>Full Name *</label><input value={userForm.name} onChange={e => setUserForm({ ...userForm, name: e.target.value })} placeholder="Dr. John Smith" /></div>
                <div className="form-group"><label>Username *</label><input value={userForm.username} onChange={e => setUserForm({ ...userForm, username: e.target.value })} placeholder="john_smith" disabled={!!editUser} /></div>
                {!editUser && <div className="form-group"><label>Password *</label><input type="password" value={userForm.password} onChange={e => setUserForm({ ...userForm, password: e.target.value })} placeholder="password123" /></div>}
                <div className="form-group"><label>Role *</label>
                  <div className="sel-wrap"><select value={userForm.role} onChange={e => setUserForm({ ...userForm, role: e.target.value })}>
                    <option value="admin">Admin</option><option value="hod">HOD</option><option value="faculty">Faculty</option><option value="classteacher">Class Teacher</option><option value="student">Student</option>
                  </select></div>
                </div>
                <div className="form-group"><label>Department *</label>
                  <div className="sel-wrap"><select value={userForm.department} onChange={e => setUserForm({ ...userForm, department: e.target.value })}>
                    {BRANCHES.map(b => <option key={b} value={b}>{b}</option>)}
                  </select></div>
                </div>
                <div className="form-group"><label>Email</label><input type="email" value={userForm.email} onChange={e => setUserForm({ ...userForm, email: e.target.value })} placeholder="email@vemu.edu.in" /></div>
                <div className="form-group"><label>Phone</label><input value={userForm.phone} onChange={e => setUserForm({ ...userForm, phone: e.target.value })} placeholder="9876543210" /></div>
                {(userForm.role === 'faculty' || userForm.role === 'classteacher') && <>
                  <div className="form-group"><label>Year</label>
                    <div className="sel-wrap"><select value={userForm.year} onChange={e => setUserForm({ ...userForm, year: e.target.value })}>
                      <option value="">Select</option>{YEARS.map(y => <option key={y} value={y}>{y}</option>)}
                    </select></div>
                  </div>
                  <div className="form-group"><label>Semester</label>
                    <div className="sel-wrap"><select value={userForm.semester} onChange={e => setUserForm({ ...userForm, semester: e.target.value })}>
                      <option value="">Select</option>{SEMS.map(s => <option key={s} value={s}>{s}</option>)}
                    </select></div>
                  </div>
                  <div className="form-group"><label>Section</label>
                    <div className="sel-wrap"><select value={userForm.section} onChange={e => setUserForm({ ...userForm, section: e.target.value })}>
                      <option value="">Select</option>{SECTIONS.map(s => <option key={s} value={s}>{s}</option>)}
                    </select></div>
                  </div>
                </>}
                {userForm.role === 'student' && <>
                  <div className="form-group"><label>Roll Number</label><input value={userForm.rollNo} onChange={e => setUserForm({ ...userForm, rollNo: e.target.value })} placeholder="21VE1A0501" /></div>
                  <div className="form-group"><label>Course</label><input value={userForm.course} onChange={e => setUserForm({ ...userForm, course: e.target.value })} placeholder="B.Tech" /></div>
                </>}
              </div>
            </div>
            <div className="modal-foot">
              <button className="btn btn-danger" onClick={() => { setShowUserModal(false); setEditUser(null); }}>Cancel</button>
              <button className="btn btn-primary" onClick={handleSaveUser} disabled={loading}>{loading ? 'Saving…' : editUser ? '💾 Update User' : '➕ Create User'}</button>
            </div>
          </div>
        </div>
      )}

      {/* STUDENT MODAL */}
      {showStudentModal && (
        <div className="modal-overlay" onClick={e => { if (e.target === e.currentTarget) setShowStudentModal(false); }}>
          <div className="modal">
            <div className="modal-head">
              <h3>Add New Student</h3>
              <button className="modal-close" onClick={() => setShowStudentModal(false)}>✕</button>
            </div>
            <div className="modal-body">
              {!editStudent && (
                <div className="alert alert-info" style={{ marginBottom: 16, fontSize: 13 }}>
                  💡 <b>Note:</b> A login account is automatically generated.<br/>
                  <b>Username & Password:</b> Defaults to the exact Roll Number.
                </div>
              )}
              <div className="form-grid form-grid-2" style={{ gap: 14 }}>
                <div className="form-group"><label>Roll Number *</label><input value={studentForm.rollNo} onChange={e => setStudentForm({ ...studentForm, rollNo: e.target.value })} placeholder="21VE1A0501" /></div>
                <div className="form-group"><label>Student Name *</label><input value={studentForm.name} onChange={e => setStudentForm({ ...studentForm, name: e.target.value })} placeholder="Full Name" /></div>
                <div className="form-group"><label>Course</label><input value={studentForm.course} onChange={e => setStudentForm({ ...studentForm, course: e.target.value })} /></div>
                <div className="form-group"><label>Branch *</label><div className="sel-wrap"><select value={studentForm.branch} onChange={e => setStudentForm({ ...studentForm, branch: e.target.value })}>{BRANCHES.map(b => <option key={b} value={b}>{b}</option>)}</select></div></div>
                <div className="form-group"><label>Year *</label><div className="sel-wrap"><select value={studentForm.year} onChange={e => setStudentForm({ ...studentForm, year: e.target.value })}>{YEARS.map(y => <option key={y} value={y}>{y}</option>)}</select></div></div>
                <div className="form-group"><label>Semester *</label><div className="sel-wrap"><select value={studentForm.semester} onChange={e => setStudentForm({ ...studentForm, semester: e.target.value })}>{SEMS.map(s => <option key={s} value={s}>{s}</option>)}</select></div></div>
                <div className="form-group"><label>Section *</label><div className="sel-wrap"><select value={studentForm.section} onChange={e => setStudentForm({ ...studentForm, section: e.target.value })}>{SECTIONS.map(s => <option key={s} value={s}>{s}</option>)}</select></div></div>
                <div className="form-group"><label>Email</label><input type="email" value={studentForm.email} onChange={e => setStudentForm({ ...studentForm, email: e.target.value })} /></div>
                <div className="form-group"><label>Phone</label><input value={studentForm.phone} onChange={e => setStudentForm({ ...studentForm, phone: e.target.value })} /></div>
              </div>
            </div>
            <div className="modal-foot">
              <button className="btn btn-danger" onClick={() => setShowStudentModal(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={handleSaveStudent} disabled={loading}>{loading ? 'Saving…' : '➕ Add Student'}</button>
            </div>
          </div>
        </div>
      )}





    </Layout>
  );
}
