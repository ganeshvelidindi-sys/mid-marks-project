import React, { useState, useEffect } from 'react';
import Layout from '../components/Layout';
import { getMarks, approveMarks, rejectMarks, getMarkStats, getClassReport, getFacultyList, getClassTeacherList, assignClassTeacher, removeClassTeacher } from '../api';
import API from '../api';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, LabelList, ReferenceLine, PieChart, Pie, Legend, LineChart, Line } from 'recharts';
import { downloadDepartmentReport } from '../utils/pdfGenerator';

const NAV = [
  { label: 'MAIN', items: [
    { key: 'dashboard', icon: '📊', label: 'Dashboard' },
    { key: 'review', icon: '🔍', label: 'Review Marks' },
    { key: 'class-teachers', icon: '👨‍🏫', label: 'Class Teachers' },
    { key: 'reports', icon: '📄', label: 'Department Reports' },
  ]},
  { label: 'FACULTY ROLE', items: [
    { key: 'faculty-portal', icon: '📚', label: 'Subject Marks Entry', path: '/faculty' },
  ]},
];
const SEMS = ['I','II','III','IV','V','VI','VII','VIII'];
const YEARS = ['I','II','III','IV'];
const SECTIONS = ['A','B','C','D','E'];

export default function HODDashboard() {
  const { user } = useAuth();
  const [page, setPage] = useState('dashboard');
  const [stats, setStats] = useState({});
  const [marks, setMarks] = useState([]);
  const [grouped, setGrouped] = useState([]);
  const [filterYear, setFilterYear] = useState('');
  const [filterSem, setFilterSem] = useState('');
  const [filterSec, setFilterSec] = useState('');
  const [filterStatus, setFilterStatus] = useState('submitted');
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectTarget, setRejectTarget] = useState(null);
  const [rejectRemarks, setRejectRemarks] = useState('');
  const [detailGroup, setDetailGroup] = useState(null);
  const [loading, setLoading] = useState(false);
  const [facultyList, setFacultyList] = useState([]);
  const [classTeachers, setClassTeachers] = useState([]);
  const [assignForm, setAssignForm] = useState({ semester: '', section: '', facultyId: '' });
  const [pdfLoading, setPdfLoading] = useState(false);

  // Toppers state
  const [toppers, setToppers]           = useState([]);
  const [topperSem, setTopperSem]       = useState('');
  const [topperLimit, setTopperLimit]   = useState(10);
  const [toppersLoading, setToppersLoading] = useState(false);

  // Analytics state
  const [analyticsData, setAnalyticsData] = useState(null);
  const [analyticsLoading, setAnalyticsLoading] = useState(false);
  const [analyticsSem, setAnalyticsSem] = useState('');
  const [analyticsSec, setAnalyticsSec] = useState('');

  useEffect(() => { loadStats(); loadToppers(); }, []);
  useEffect(() => { if (page === 'review' || page === 'approved') loadMarks(); }, [page, filterYear, filterSem, filterSec, filterStatus]);
  useEffect(() => { if (page === 'reports') loadReports(); }, [page, filterYear, filterSem, filterSec]);
  useEffect(() => { if (page === 'dashboard') loadAnalytics(); }, [page, analyticsSem, analyticsSec]);

  const loadAnalytics = async () => {
    setAnalyticsLoading(true);
    try {
      const params = new URLSearchParams();
      if (analyticsSem) params.set('semester', analyticsSem);
      if (analyticsSec) params.set('section', analyticsSec);
      const r = await API.get(`/marks/analytics?${params}`);
      setAnalyticsData(r.data);
    } catch (e) { toast.error('Could not load analytics data'); }
    setAnalyticsLoading(false);
  };

  const loadStats = async () => {
    try { const r = await getMarkStats(); setStats(r.data); } catch(e) {}
  };

  const loadToppers = async (sem = topperSem, lim = topperLimit) => {
    setToppersLoading(true);
    try {
      const params = new URLSearchParams({ limit: lim });
      if (sem) params.set('semester', sem);
      const r = await API.get(`/reports/toppers?${params}`);
      setToppers(r.data);
    } catch(e) { console.error('Toppers load error', e); }
    setToppersLoading(false);
  };
  
  useEffect(() => { if (page === 'class-teachers') loadClassTeachersData(); }, [page]);

  const loadClassTeachersData = async () => {
    try {
      const [facRes, ctRes] = await Promise.all([getFacultyList(), getClassTeacherList()]);
      setFacultyList(facRes.data);
      setClassTeachers(ctRes.data);
    } catch(e) { toast.error('Error loading faculty data'); }
  };

  const handleAssignSubmit = async (e) => {
    e.preventDefault();
    if (!assignForm.semester || !assignForm.section || !assignForm.facultyId) {
      toast.error('Please fill all fields'); return;
    }
    setLoading(true);
    try {
      await assignClassTeacher(assignForm);
      toast.success('Class teacher assigned successfully');
      setAssignForm({ semester: '', section: '', facultyId: '' });
      loadClassTeachersData();
    } catch(e) { toast.error(e.response?.data?.message || 'Error assigning class teacher'); }
    setLoading(false);
  };

  const loadMarks = async () => {
    try {
      const params = { branch: user.department, status: filterStatus };
      if (filterYear) params.year = filterYear;
      if (filterSem) params.semester = filterSem;
      if (filterSec) params.section = filterSec;
      const r = await getMarks(params);
      // Group by semester+section+subject
      const grpMap = {};
      r.data.forEach(m => {
        const key = `${m.semester}|${m.section}|${m.subjectCode}`;
        if (!grpMap[key]) grpMap[key] = { semester: m.semester, section: m.section, subjectCode: m.subjectCode, subjectName: m.subjectName, facultyName: m.facultyName, status: m.status, count: 0, records: [] };
        grpMap[key].count++;
        grpMap[key].records.push(m);
      });
      setGrouped(Object.values(grpMap));
      setMarks(r.data);
    } catch(e) {}
  };
  const loadReports = async () => {
    try {
      const params = { branch: user.department };
      if (filterYear) params.year = filterYear;
      if (filterSem) params.semester = filterSem;
      if (filterSec) params.section = filterSec;
      const r = await getClassReport(params);
      setMarks(r.data.marks || []);
    } catch(e) {}
  };

  const handleApprove = async (grp) => {
    setLoading(true);
    try {
      await approveMarks({ branch: user.department, semester: grp.semester, section: grp.section, subjectCode: grp.subjectCode });
      toast.success(`✅ Marks approved and locked for ${grp.subjectCode} - Sem ${grp.semester} ${grp.section}`);
      loadMarks(); loadStats();
    } catch(e) { toast.error('Error approving marks'); }
    setLoading(false);
  };

  const handleRejectOpen = (grp) => { setRejectTarget(grp); setShowRejectModal(true); };
  const handleReject = async () => {
    if (!rejectRemarks.trim()) { toast.error('Please enter remarks for rejection'); return; }
    setLoading(true);
    try {
      await rejectMarks({ branch: user.department, semester: rejectTarget.semester, section: rejectTarget.section, subjectCode: rejectTarget.subjectCode, remarks: rejectRemarks });
      toast.success('❌ Marks rejected and returned to faculty');
      setShowRejectModal(false); setRejectRemarks(''); setRejectTarget(null);
      loadMarks(); loadStats();
    } catch(e) { toast.error('Error rejecting marks'); }
    setLoading(false);
  };

  return (
    <Layout navItems={NAV} activePage={page} onNavClick={setPage}>
      {page === 'dashboard' && (
        <div>
          <div className="page-header">
            <div className="breadcrumb">HOD / <span>Dashboard</span></div>
            <h2>HOD Dashboard — {user?.department}</h2>
            <p>Monitor and approve faculty mark submissions</p>
          </div>
          <div className="stats-grid">
            {[
              { icon:'📝', val:stats.total||0, label:'Total Records', color:'#001852' },
              { icon:'📤', val:stats.draft||0, label:'Draft (Faculty)', color:'#6b7280' },
              { icon:'⏳', val:stats.submitted||0, label:'Awaiting Approval', color:'#d97706' },
              { icon:'✅', val:stats.approved||0, label:'Approved & Locked', color:'#16a34a' },
              { icon:'❌', val:stats.rejected||0, label:'Rejected', color:'#dc2626' },
            ].map((s,i)=>(
              <div key={i} className="stat-card" style={{ borderTopColor:s.color }}>
                <div className="stat-icon">{s.icon}</div>
                <div className="stat-val" style={{ color:s.color }}>{s.val}</div>
                <div className="stat-lbl">{s.label}</div>
              </div>
            ))}
          </div>
          <div className="card">
            <div className="card-head"><h3>⚡ Quick Actions</h3></div>
            <div className="card-body">
              <div style={{ display:'flex', gap:12, flexWrap:'wrap' }}>
                <button className="btn btn-warn" onClick={() => { setFilterStatus('submitted'); setPage('review'); }}>⏳ Review Pending ({stats.submitted||0})</button>
                <button className="btn btn-success" onClick={() => { setFilterStatus('approved'); setPage('approved'); }}>✅ View Approved</button>
                <button className="btn btn-info" onClick={() => setPage('reports')}>📊 Department Report</button>
              </div>
            </div>
          </div>
          {(stats.submitted||0) > 0 && (
            <div className="alert alert-warn">
              ⚠️ <b>{stats.submitted} mark submissions</b> are awaiting your review and approval. Please review them promptly.
            </div>
          )}



          {/* Analytics Filters & Charts */}
          <div className="card" style={{ marginTop: 24 }}>
            <div className="card-head">
              <h3>📈 Analytics Filters</h3>
              <div style={{ display: 'flex', gap: 10 }}>
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

      {(page === 'review' || page === 'approved') && (
        <div>
          <div className="page-header">
            <div className="breadcrumb">HOD / <span>{page === 'review' ? 'Review Marks' : 'Approved Marks'}</span></div>
            <h2>{page === 'review' ? '🔍 Review Submitted Marks' : '✅ Approved Marks'}</h2>
            <p>Department: {user?.department}</p>
          </div>
          <div className="card">
            <div className="card-head">
              <h3>Filter</h3>
              <div style={{ display:'flex', gap:10, flexWrap:'wrap' }}>
                {[['filterYear',YEARS,'All Years',setFilterYear],['filterSem',SEMS,'All Sems',setFilterSem],['filterSec',SECTIONS,'All Sections',setFilterSec]].map(([k,opts,ph,setter])=>(
                  <div className="sel-wrap" key={k}>
                    <select value={k==='filterYear'?filterYear:k==='filterSem'?filterSem:filterSec} onChange={e=>setter(e.target.value)} style={{ padding:'7px 28px 7px 10px', border:'1.5px solid #dde3ef', borderRadius:8, fontSize:12, fontFamily:'Outfit,sans-serif' }}>
                      <option value="">{ph}</option>{opts.map(o=><option key={o} value={o}>{o}</option>)}
                    </select>
                  </div>
                ))}
              </div>
            </div>
            <div className="card-body">
              {grouped.length === 0 ? (
                <div style={{ textAlign:'center', padding:40, color:'#6b7280' }}>
                  <div style={{ fontSize:40 }}>📭</div>
                  <div style={{ marginTop:12, fontSize:15 }}>{page==='review' ? 'No pending submissions to review' : 'No approved marks found'}</div>
                </div>
              ) : grouped.map((grp, i) => (
                <div key={i} className="card" style={{ marginBottom:16 }}>
                  <div className="card-head" style={{ background:'#f8faff' }}>
                    <div>
                      <div style={{ fontSize:14, fontWeight:700, color:'#001852' }}>{grp.subjectCode} — {grp.subjectName}</div>
                      <div style={{ fontSize:12, color:'#6b7280', marginTop:2 }}>Sem {grp.semester} | Section {grp.section} | Faculty: {grp.facultyName} | {grp.count} students</div>
                    </div>
                    <div style={{ display:'flex', gap:8, alignItems:'center' }}>
                      <span className={`badge badge-${grp.status}`}>{grp.status.toUpperCase()}</span>
                      <button className="btn btn-info btn-sm" onClick={()=>setDetailGroup(detailGroup===i?null:i)}>👁️ {detailGroup===i?'Hide':'View'}</button>
                      {page==='review' && <>
                        <button className="btn btn-success btn-sm" onClick={()=>handleApprove(grp)} disabled={loading}>✅ Approve</button>
                        <button className="btn btn-danger btn-sm" onClick={()=>handleRejectOpen(grp)} disabled={loading}>❌ Reject</button>
                      </>}
                    </div>
                  </div>
                  {detailGroup===i && (
                    <div className="card-body">
                      <div className="table-wrap">
                        <table className="marks-table">
                          <thead>
                            <tr>
                              <th>Roll No</th><th>Name</th>
                              <th colSpan={6} style={{ textAlign:'center', borderLeft:'2px solid rgba(255,255,255,0.2)' }}>MID 1</th>
                              <th colSpan={6} style={{ textAlign:'center', borderLeft:'2px solid rgba(255,255,255,0.2)' }}>MID 2</th>
                              <th>Internal</th>
                            </tr>
                            <tr>
                              <th/><th/>
                              <th>Q1</th><th>Q2</th><th>Q3</th><th>Q4</th><th>Q5</th><th>Total</th>
                              <th>Q1</th><th>Q2</th><th>Q3</th><th>Q4</th><th>Q5</th><th>Total</th>
                              <th/>
                            </tr>
                          </thead>
                          <tbody>
                            {grp.records.map(m=>(
                              <tr key={m._id}>
                                <td style={{ fontFamily:'monospace', fontSize:11 }}>{m.studentRollNo}</td>
                                <td style={{ fontWeight:500 }}>{m.studentName}</td>
                                {['q1','q2','q3','q4','q5'].map(q=><td key={q} style={{ textAlign:'center' }}>{m.mid1?.[q]||0}</td>)}
                                <td style={{ textAlign:'center', fontWeight:700, color:'#001852' }}>{m.mid1?.grandTotal||0}</td>
                                {['q1','q2','q3','q4','q5'].map(q=><td key={q} style={{ textAlign:'center' }}>{m.mid2?.[q]||0}</td>)}
                                <td style={{ textAlign:'center', fontWeight:700, color:'#001852' }}>{m.mid2?.grandTotal||0}</td>
                                <td style={{ textAlign:'center', fontWeight:700, color:'#16a34a', fontSize:14 }}>{m.internalMarks}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {page === 'reports' && (
        <div>
          <div className="page-header">
            <div className="breadcrumb">HOD / <span>Department Reports</span></div>
            <h2>📊 Department Reports — {user?.department}</h2>
            <p>View approved marks performance</p>
          </div>
          <div className="card">
            <div className="card-head">
              <h3>Filter</h3>
              <div style={{ display:'flex', gap:10, alignItems:'center', flexWrap:'wrap' }}>
                {[['filterYear',YEARS,'All Years',setFilterYear],['filterSem',SEMS,'All Sems',setFilterSem],['filterSec',SECTIONS,'All Sections',setFilterSec]].map(([k,opts,ph,setter])=>(
                  <div className="sel-wrap" key={k}>
                    <select value={k==='filterYear'?filterYear:k==='filterSem'?filterSem:filterSec} onChange={e=>setter(e.target.value)} style={{ padding:'7px 28px 7px 10px', border:'1.5px solid #dde3ef', borderRadius:8, fontSize:12, fontFamily:'Outfit,sans-serif' }}>
                      <option value="">{ph}</option>{opts.map(o=><option key={o} value={o}>{o}</option>)}
                    </select>
                  </div>
                ))}
                <button
                  className="btn btn-success btn-sm"
                  disabled={pdfLoading || marks.length === 0}
                  onClick={async () => {
                    setPdfLoading(true);
                    try {
                      await downloadDepartmentReport({
                        hodName: user?.name,
                        department: user?.department,
                        semester: filterSem,
                        section: filterSec,
                        marks,
                      });
                      toast.success('📄 Department report downloaded!');
                    } catch(e) { toast.error('PDF generation failed'); }
                    setPdfLoading(false);
                  }}
                  style={{ display:'flex', alignItems:'center', gap:6, whiteSpace:'nowrap', background:'linear-gradient(135deg,#16a34a,#22c55e)', color:'#fff', border:'none', padding:'8px 16px' }}
                >
                  {pdfLoading ? '⏳ Generating…' : '📥 Download PDF'}
                </button>
              </div>
            </div>
            <div className="card-body">
              <div className="table-wrap">
                <table>
                  <thead><tr><th>Roll No</th><th>Name</th><th>Subject</th><th>Mid 1</th><th>Mid 2</th><th>Internal Marks</th><th>Status</th></tr></thead>
                  <tbody>
                    {marks.map((m,i)=>(
                      <tr key={i}>
                        <td style={{ fontFamily:'monospace', fontSize:11 }}>{m.studentRollNo}</td>
                        <td style={{ fontWeight:500 }}>{m.studentName}</td>
                        <td>{m.subjectCode} - {m.subjectName}</td>
                        <td>{m.mid1?.grandTotal||0}</td>
                        <td>{m.mid2?.grandTotal||0}</td>
                        <td><span style={{ fontWeight:700, fontSize:15, color: (m.internalMarks||0)>=15?'#16a34a':'#dc2626' }}>{m.internalMarks||0}</span></td>
                        <td><span className={`badge badge-${m.status}`}>{m.status}</span></td>
                      </tr>
                    ))}
                    {marks.length===0 && <tr><td colSpan={7} style={{ textAlign:'center', padding:30, color:'#6b7280' }}>No approved marks data</td></tr>}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}

      {page === 'class-teachers' && (
        <div>
          <div className="page-header">
            <div className="breadcrumb">HOD / <span>Class Teachers</span></div>
            <h2>👨‍🏫 Manage Class Teachers — {user?.department}</h2>
            <p>Assign and monitor class teachers for academic sections</p>
          </div>
          
          <div style={{ display: 'grid', gridTemplateColumns: window.innerWidth > 768 ? '360px 1fr' : '1fr', gap: 24, alignItems: 'start' }}>
            {/* Assign Form Card */}
            <div className="card" style={{ borderRadius: 16, overflow: 'hidden' }}>
              <div style={{ background: 'linear-gradient(135deg, #001852 0%, #1e3a8a 100%)', padding: '20px 24px', color: '#fff' }}>
                <h3 style={{ margin: 0, fontSize: 18, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontSize: 22 }}>📋</span> Assign Role
                </h3>
                <p style={{ margin: '6px 0 0', fontSize: 12, color: 'rgba(255,255,255,0.8)' }}>Select a faculty member to promote to class teacher.</p>
              </div>
              <div className="card-body" style={{ padding: 24 }}>
                <form onSubmit={handleAssignSubmit} className="form-group">
                  <div style={{ marginBottom: 20 }}>
                    <label style={{ display: 'block', marginBottom: 8, fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5 }}>Semester <span style={{ color: '#dc2626' }}>*</span></label>
                    <div className="sel-wrap">
                      <select value={assignForm.semester} onChange={e=>setAssignForm({...assignForm, semester: e.target.value})} style={{ width: '100%', padding: '12px 14px', borderRadius: 10, fontSize: 14 }}>
                        <option value="">Select Semester</option>
                        {SEMS.map(s=><option key={s} value={s}>Semester {s}</option>)}
                      </select>
                    </div>
                  </div>

                  <div style={{ marginBottom: 20 }}>
                    <label style={{ display: 'block', marginBottom: 8, fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5 }}>Section <span style={{ color: '#dc2626' }}>*</span></label>
                    <div className="sel-wrap">
                      <select value={assignForm.section} onChange={e=>setAssignForm({...assignForm, section: e.target.value})} style={{ width: '100%', padding: '12px 14px', borderRadius: 10, fontSize: 14 }}>
                        <option value="">Select Section</option>
                        {SECTIONS.map(s=><option key={s} value={s}>Section {s}</option>)}
                      </select>
                    </div>
                  </div>

                  <div style={{ marginBottom: 24 }}>
                    <label style={{ display: 'block', marginBottom: 8, fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5 }}>Select Faculty <span style={{ color: '#dc2626' }}>*</span></label>
                    <div className="sel-wrap">
                      <select value={assignForm.facultyId} onChange={e=>setAssignForm({...assignForm, facultyId: e.target.value})} style={{ width: '100%', padding: '12px 14px', borderRadius: 10, fontSize: 14 }}>
                        <option value="">Select Faculty Member</option>
                        {facultyList.map(f=><option key={f._id} value={f._id}>{f.name} ({f.username})</option>)}
                      </select>
                    </div>
                  </div>

                  <button type="submit" disabled={loading} style={{ width: '100%', padding: '14px 20px', background: 'linear-gradient(135deg, var(--green) 0%, #22c55e 100%)', color: '#fff', border: 'none', borderRadius: 10, fontSize: 15, fontWeight: 700, cursor: loading ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, transition: 'all 0.2s' }}>
                    {loading ? <span style={{ width: 16, height: 16, border: '2px solid rgba(255,255,255,0.4)', borderTopColor: '#fff', borderRadius: '50%', animation: 'spin 1s linear infinite', display: 'inline-block' }} /> : <span style={{ fontSize: 18 }}>✨</span>}
                    {loading ? 'Assigning...' : 'Assign Class Teacher'}
                  </button>
                </form>
              </div>
            </div>

            {/* List Card */}
            <div className="card" style={{ borderRadius: 16, overflow: 'hidden' }}>
              <div className="card-head" style={{ padding: '20px 24px' }}>
                <h3 style={{ margin: 0, fontSize: 17, fontWeight: 700 }}>Current Class Teachers</h3>
              </div>
              <div className="card-body" style={{ padding: 0 }}>
                <div className="table-wrap" style={{ margin: 0, border: 'none' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                      <tr>
                        <th style={{ padding: '14px 24px' }}>Faculty Member</th>
                        <th style={{ padding: '14px 24px', textAlign: 'center' }}>Assigned Class</th>
                        <th style={{ padding: '14px 24px', textAlign: 'center' }}>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {classTeachers.map((ct) => (
                        <tr key={ct._id}>
                          <td style={{ padding: '16px 24px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                              <div style={{ width: 40, height: 40, borderRadius: '50%', background: 'linear-gradient(135deg, #dbeafe 0%, #bfdbfe 100%)', color: '#1d4ed8', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 14, flexShrink: 0, border: '2px solid rgba(255,255,255,0.5)', boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }}>
                                {ct.name.charAt(0)}
                              </div>
                              <div>
                                <div style={{ fontWeight: 600, fontSize: 14 }}>{ct.name}</div>
                                <div style={{ fontSize: 12, color: 'var(--muted)', fontFamily: 'monospace', marginTop: 2 }}>{ct.username}</div>
                              </div>
                            </div>
                          </td>
                          <td style={{ padding: '16px 24px', textAlign: 'center' }}>
                            <div className="badge badge-warn" style={{ padding: '6px 12px', fontSize: 12 }}>
                              <span style={{ fontSize: 14, marginRight: 4 }}>🏫</span>
                              Sem {ct.semester} - Sec {ct.section}
                            </div>
                          </td>
                          <td style={{ padding: '16px 24px', textAlign: 'center' }}>
                            <span className="badge badge-approved" style={{ padding: '4px 12px', fontSize: 11 }}>Active Role</span>
                          </td>
                        </tr>
                      ))}
                      {classTeachers.length === 0 && (
                        <tr>
                          <td colSpan={3} style={{ textAlign:'center', padding: '48px 24px', color: 'var(--muted)' }}>
                            <div style={{ fontSize: 40, marginBottom: 12 }}>👨‍🏫</div>
                            <div style={{ fontSize: 16, fontWeight: 600 }}>No Class Teachers Assigned</div>
                            <div style={{ fontSize: 13, marginTop: 4 }}>Use the form to assign a faculty member to a section.</div>
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* REJECT MODAL */}
      {showRejectModal && (
        <div className="modal-overlay">
          <div className="modal">
            <div className="modal-head">
              <h3>❌ Reject Marks</h3>
              <button className="modal-close" onClick={()=>{setShowRejectModal(false);setRejectRemarks('');}}>✕</button>
            </div>
            <div className="modal-body">
              <div className="alert alert-warn">Marks for <b>{rejectTarget?.subjectCode}</b> Sem {rejectTarget?.semester} Sec {rejectTarget?.section} will be sent back to faculty for correction.</div>
              <div className="form-group">
                <label>Rejection Remarks *</label>
                <textarea value={rejectRemarks} onChange={e=>setRejectRemarks(e.target.value)} placeholder="Please explain what needs to be corrected..." rows={4} style={{ resize:'vertical', padding:'10px 12px', border:'1.5px solid #dde3ef', borderRadius:9, fontFamily:'Outfit,sans-serif', fontSize:13, width:'100%', outline:'none' }} />
              </div>
            </div>
            <div className="modal-foot">
              <button className="btn btn-info" onClick={()=>{setShowRejectModal(false);setRejectRemarks('');}}>Cancel</button>
              <button className="btn btn-danger" onClick={handleReject} disabled={loading}>{loading?'Rejecting…':'❌ Confirm Reject'}</button>
            </div>
          </div>
        </div>
      )}

    </Layout>
  );
}
