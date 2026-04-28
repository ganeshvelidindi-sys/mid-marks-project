import React, { useState, useEffect } from 'react';
import Layout from '../components/Layout';
import { getStudents, getMarks, saveMarks, submitMarks } from '../api';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';
import { downloadClassReport } from '../utils/pdfGenerator';

// Removed static NAV array

const BRANCHES = ['CSE','ECE','EEE','MECH','CIVIL','AI&ML','IT'];
const SEMS = ['I','II','III','IV','V','VI','VII','VIII'];
const YEARS = ['I','II','III','IV'];
const SECTIONS = ['A','B','C','D','E'];

const SUBJECTS = {
  'CSE-I': [['CS101','Programming in C'],['MA101','Engineering Mathematics I'],['PH101','Engineering Physics'],['EN101','English Communication'],['ME101','Engineering Graphics']],
  'CSE-II': [['CS201','Data Structures'],['MA201','Engineering Mathematics II'],['EC201','Electronic Devices'],['CS202','OOP with Java'],['EN201','Technical Writing']],
  'CSE-III': [['CS301','Design & Analysis of Algorithms'],['CS302','Database Management Systems'],['CS303','Operating Systems'],['MA301','Discrete Mathematics'],['CS304','Computer Organization']],
  'CSE-IV': [['CS401','Theory of Computation'],['CS402','Computer Networks'],['CS403','Software Engineering'],['CS404','Microprocessors'],['CS405','Compiler Design']],
  'CSE-V': [['CS501','Web Technologies'],['CS502','Artificial Intelligence'],['CS503','Data Warehousing'],['CS504','Cloud Computing'],['CS505','Information Security']],
  'CSE-VI': [['CS601','Machine Learning'],['CS602','Mobile App Development'],['CS603','Big Data Analytics'],['CS604','IoT'],['CS605','Image Processing']],
  'CSE-VII': [['CS701','Deep Learning'],['CS702','NLP'],['CS703','Blockchain'],['CS704','Project Management'],['CS705','Elective I']],
  'CSE-VIII': [['CS801','Project Work'],['CS802','Seminar'],['CS803','Elective II'],['CS804','Industrial Training']],
  'ECE-I': [['EC101','Basic Electronics'],['MA101','Engineering Mathematics I'],['PH101','Engineering Physics'],['EN101','English Communication'],['ME101','Engineering Graphics']],
  'ECE-II': [['EC201','Electronic Devices'],['MA201','Engineering Mathematics II'],['EC202','Network Theory'],['EC203','Signals & Systems'],['EN201','Technical Writing']],
};

function getSubjects(branch, sem) {
  const key = `${branch}-${sem}`;
  return SUBJECTS[key] || [['SUB101','Subject 1'],['SUB102','Subject 2'],['SUB103','Subject 3'],['SUB104','Subject 4'],['SUB105','Subject 5']];
}

export default function FacultyDashboard() {
  const { user } = useAuth();
  const [page, setPage] = useState('entry');
  const [branch, setBranch] = useState(user?.department || 'CSE');
  const [year, setYear] = useState('');
  const [semester, setSemester] = useState('');
  const [section, setSection] = useState('');
  const [subjectCode, setSubjectCode] = useState('');
  const [subjectName, setSubjectName] = useState('');
  const [students, setStudents] = useState([]);
  const [marksData, setMarksData] = useState([]);
  const [savedMarks, setSavedMarks] = useState([]);
  const [loading, setLoading] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [mySubmissions, setMySubmissions] = useState([]);
  const [pdfLoading, setPdfLoading] = useState(null); // key = subject code

  const handlePrintClassReport = async (sub) => {
    setPdfLoading(sub.subjectCode);
    try {
      // Re-fetch full marks data for this submission
      const r = await getMarks({ branch: user.department, semester: sub.semester, section: sub.section, subjectCode: sub.subjectCode });
      await downloadClassReport({
        facultyName: user.name,
        branch: user.department,
        year: r.data[0]?.year || '',
        semester: sub.semester,
        section: sub.section,
        subjectCode: sub.subjectCode,
        subjectName: sub.subjectName,
        marksData: r.data,
      });
      toast.success('🖨️ Class report downloaded!');
    } catch (e) {
      console.error(e);
      toast.error('PDF generation failed');
    }
    setPdfLoading(null);
  };

  const subjects = getSubjects(branch, semester);

  useEffect(() => { if (page === 'mymarks') loadMySubmissions(); }, [page]);

  const loadMySubmissions = async () => {
    try {
      const r = await getMarks({ branch: user.department });
      // Group by subject
      const map = {};
      r.data.forEach(m => {
        const k = `${m.semester}|${m.section}|${m.subjectCode}`;
        if (!map[k]) map[k] = { semester:m.semester, section:m.section, subjectCode:m.subjectCode, subjectName:m.subjectName, status:m.status, count:0 };
        map[k].count++;
      });
      setMySubmissions(Object.values(map));
    } catch(e) {}
  };

  const handleLoadStudents = async () => {
    if (!year || !semester || !section || !subjectCode) { toast.error('Please select Year, Semester, Section and Subject first'); return; }
    setLoading(true);
    try {
      const [studRes, marksRes] = await Promise.all([
        getStudents({ branch, year, semester, section }),
        getMarks({ branch, year, semester, section, subjectCode })
      ]);
      const studs = studRes.data;
      const existingMarks = {};
      marksRes.data.forEach(m => { existingMarks[m.studentRollNo] = m; });

      const rows = studs.map(s => {
        const ex = existingMarks[s.rollNo];
        return {
          studentRollNo: s.rollNo,
          studentName: s.name,
          mid1: ex?.mid1 || { q1:0, q2:0, q3:0, q4:0, assignment:0 },
          mid2: ex?.mid2 || { q1:0, q2:0, q3:0, q4:0, assignment:0 },
          status: ex?.status || 'draft',
          internalMarks: ex?.internalMarks || 0,
        };
      });
      setMarksData(rows);
      setStudents(studs);
      setLoaded(true);
      toast.success(`Loaded ${studs.length} students`);
    } catch(e) { toast.error('Error loading students'); }
    setLoading(false);
  };

  const updateMark = (rowIdx, mid, field, value) => {
    const maxVal = field === 'assignment' ? 5 : 10;
    const val = Math.max(0, Math.min(maxVal, Number(value) || 0));
    setMarksData(prev => {
      const updated = [...prev];
      updated[rowIdx] = { ...updated[rowIdx], [mid]: { ...updated[rowIdx][mid], [field]: val } };
      return updated;
    });
  };

  const calcTotal = (mid) => {
    const q1 = Math.min(mid.q1||0, 10);
    const partB = ((mid.q2||0) + (mid.q3||0) + (mid.q4||0)) / 2;
    return Math.min(q1 + partB, 25);
  };
  const calcGrand = (mid) => Math.min(calcTotal(mid) + Math.min(mid.assignment||0, 5), 30);
  const calcInternal = (row) => {
    const g1 = calcGrand(row.mid1), g2 = calcGrand(row.mid2);
    const best = Math.max(g1,g2), second = Math.min(g1,g2);
    return Math.round((best*0.8 + second*0.2)*2)/2;
  };

  const handleSave = async () => {
    setLoading(true);
    try {
      await saveMarks({ branch, year, semester, section, subjectCode, subjectName, marksData });
      toast.success('✅ Marks saved successfully!');
      setLoaded(false); handleLoadStudents();
    } catch(e) { toast.error('Error saving marks'); }
    setLoading(false);
  };

  const handleSubmit = async () => {
    if (!window.confirm('Submit marks for HOD approval? You will not be able to edit after submission.')) return;
    setLoading(true);
    try {
      await saveMarks({ branch, year, semester, section, subjectCode, subjectName, marksData });
      await submitMarks({ branch, year, semester, section, subjectCode });
      toast.success('📤 Marks submitted for HOD approval!');
      setLoaded(false); setSemester(''); setYear(''); setSection(''); setSubjectCode('');
    } catch(e) { toast.error('Error submitting marks'); }
    setLoading(false);
  };

  const isLocked = marksData[0]?.status === 'submitted' || marksData[0]?.status === 'approved';

  const getNav = () => {
    const nav = [
      { label: 'MAIN', items: [
        { key: 'entry', icon: '✏️', label: 'Enter Marks' },
        { key: 'mymarks', icon: '📋', label: 'My Submissions' },
      ]},
    ];
    if (user?.role === 'classteacher') {
      nav.push({
        label: 'CLASS TEACHER ROLE', items: [
          { key: 'ct-portal', icon: '📋', label: 'Class Teacher Portal', path: '/classteacher' },
        ]
      });
    }
    if (user?.role === 'hod') {
      nav.push({
        label: 'HOD ROLE', items: [
          { key: 'hod-portal', icon: '🎓', label: 'HOD Portal', path: '/hod' },
        ]
      });
    }
    return nav;
  };

  return (
    <Layout navItems={getNav()} activePage={page} onNavClick={setPage}>
      {page === 'entry' && (
        <div>
          <div className="page-header">
            <div className="breadcrumb">Faculty / <span>Enter Marks</span></div>
            <h2>✏️ Marks Entry</h2>
            <p>Enter student marks question-wise for Mid 1 and Mid 2</p>
          </div>

          <div className="card">
            <div className="card-head"><h3>📌 Select Class & Subject</h3></div>
            <div className="card-body">
              <div className="form-grid form-grid-4">
                <div className="form-group">
                  <label>Branch</label>
                  <div className="sel-wrap"><select value={branch} onChange={e=>{setBranch(e.target.value);setSubjectCode('');setLoaded(false);}}>
                    {BRANCHES.map(b=><option key={b} value={b}>{b}</option>)}
                  </select></div>
                </div>
                <div className="form-group">
                  <label>Year</label>
                  <div className="sel-wrap"><select value={year} onChange={e=>{setYear(e.target.value);setSubjectCode('');setLoaded(false);}}>
                    <option value="">Select</option>{YEARS.map(y=><option key={y} value={y}>{y}</option>)}
                  </select></div>
                </div>
                <div className="form-group">
                  <label>Semester</label>
                  <div className="sel-wrap"><select value={semester} onChange={e=>{setSemester(e.target.value);setSubjectCode('');setLoaded(false);}}>
                    <option value="">Select</option>{SEMS.map(s=><option key={s} value={s}>{s}</option>)}
                  </select></div>
                </div>
                <div className="form-group">
                  <label>Section</label>
                  <div className="sel-wrap"><select value={section} onChange={e=>{setSection(e.target.value);setLoaded(false);}}>
                    <option value="">Select</option>{SECTIONS.map(s=><option key={s} value={s}>{s}</option>)}
                  </select></div>
                </div>
                <div className="form-group">
                  <label>Subject</label>
                  <div className="sel-wrap"><select value={subjectCode} onChange={e=>{const sub=subjects.find(s=>s[0]===e.target.value);setSubjectCode(e.target.value);setSubjectName(sub?sub[1]:'');setLoaded(false);}}>
                    <option value="">Select Subject</option>
                    {subjects.map(([code,name])=><option key={code} value={code}>{code} - {name}</option>)}
                  </select></div>
                </div>
              </div>
              <div className="form-actions">
                <button className="btn btn-primary" onClick={handleLoadStudents} disabled={loading}>{loading?'Loading…':'🔍 Load Students'}</button>
              </div>
            </div>
          </div>

          {isLocked && loaded && (
            <div className="alert alert-warn">⚠️ These marks have been <b>submitted/approved</b> and cannot be edited. Contact HOD to unlock.</div>
          )}

          {loaded && marksData.length > 0 && (
            <div className="card">
              <div className="card-head">
                <h3>📝 Marks Entry — {subjectCode} | Year {year} | Sem {semester} | Sec {section}</h3>
                <div style={{ display:'flex', gap:8 }}>
                  {!isLocked && <>
                    <button className="btn btn-gold btn-sm" onClick={handleSave} disabled={loading}>💾 Save Draft</button>
                    <button className="btn btn-primary btn-sm" onClick={handleSubmit} disabled={loading}>📤 Submit to HOD</button>
                  </>}
                </div>
              </div>
              <div className="card-body" style={{ padding:0 }}>
                <div style={{ overflowX:'auto' }}>
                  <table style={{ width:'100%', borderCollapse:'collapse', fontSize:12 }}>
                    <thead>
                      <tr style={{ background:'linear-gradient(135deg,#001852,#002070)' }}>
                        <th style={th} rowSpan={2}>#</th>
                        <th style={th} rowSpan={2}>Roll No</th>
                        <th style={th} rowSpan={2}>Student Name</th>
                        <th style={{...th, textAlign:'center'}} colSpan={6}>MID EXAM 1</th>
                        <th style={{...th, textAlign:'center'}} colSpan={6}>MID EXAM 2</th>
                        <th style={th} rowSpan={2}>Internal<br/>Marks</th>
                      </tr>
                      <tr style={{ background:'rgba(0,24,82,0.85)' }}>
                        {['Q1(10)','Q2(10)','Q3(10)','Q4(10)','Total','Asgn'].map((h, i)=><th key={`m1-${h}-${i}`} style={{...th,fontSize: h==='Total'||h==='Asgn'?10:9}}>{h}</th>)}
                        {['Q1(10)','Q2(10)','Q3(10)','Q4(10)','Total','Asgn'].map((h, i)=><th key={`m2-${h}-${i}`} style={{...th,fontSize: h==='Total'||h==='Asgn'?10:9}}>{h}</th>)}
                      </tr>
                    </thead>
                    <tbody>
                      {marksData.map((row, idx) => {
                        const t1=calcTotal(row.mid1), g1=calcGrand(row.mid1);
                        const t2=calcTotal(row.mid2), g2=calcGrand(row.mid2);
                        const internal=calcInternal(row);
                        return (
                          <tr key={idx} style={{ borderBottom:'1px solid #eef1f8', background:idx%2===0?'#fff':'#f8faff' }}>
                            <td style={td}>{idx+1}</td>
                            <td style={{...td,fontFamily:'monospace',fontSize:11}}>{row.studentRollNo}</td>
                            <td style={{...td,fontWeight:500,minWidth:150}}>{row.studentName}</td>
                            {['q1','q2','q3','q4'].map(q=>(
                              <td key={`m1-${q}`} style={td}>
                                <input type="number" min={0} max={10} value={row.mid1[q]||0}
                                  onChange={e=>updateMark(idx,'mid1',q,e.target.value)}
                                  disabled={isLocked}
                                  style={markInput} />
                              </td>
                            ))}
                            <td style={{...td,textAlign:'center',fontWeight:700,color:'#001852',background:'#eef1f8'}}>{t1}</td>
                            <td style={td}>
                              <input type="number" min={0} max={5} value={row.mid1.assignment||0}
                                onChange={e=>updateMark(idx,'mid1','assignment',e.target.value)}
                                disabled={isLocked}
                                style={markInput} />
                            </td>
                            {['q1','q2','q3','q4'].map(q=>(
                              <td key={`m2-${q}`} style={td}>
                                <input type="number" min={0} max={10} value={row.mid2[q]||0}
                                  onChange={e=>updateMark(idx,'mid2',q,e.target.value)}
                                  disabled={isLocked}
                                  style={markInput} />
                              </td>
                            ))}
                            <td style={{...td,textAlign:'center',fontWeight:700,color:'#001852',background:'#eef1f8'}}>{t2}</td>
                            <td style={td}>
                              <input type="number" min={0} max={5} value={row.mid2.assignment||0}
                                onChange={e=>updateMark(idx,'mid2','assignment',e.target.value)}
                                disabled={isLocked}
                                style={markInput} />
                            </td>
                            <td style={{...td,textAlign:'center',fontWeight:700,fontSize:15,color:internal>=15?'#16a34a':'#dc2626'}}>{internal}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
          {loaded && marksData.length === 0 && (
            <div className="alert alert-warn">⚠️ No students found for the selected class. Please add students in Admin panel first.</div>
          )}
        </div>
      )}

      {page === 'mymarks' && (
        <div>
          <div className="page-header">
            <div className="breadcrumb">Faculty / <span>My Submissions</span></div>
            <h2>📋 My Submissions</h2>
            <p>Track status of your mark submissions</p>
          </div>
          <div className="card">
            <div className="card-head"><h3>All Submissions ({mySubmissions.length})</h3><button className="btn btn-info btn-sm" onClick={loadMySubmissions}>🔄 Refresh</button></div>
            <div className="card-body">
              <div className="table-wrap">
                <table>
                  <thead><tr><th>Subject Code</th><th>Subject Name</th><th>Semester</th><th>Section</th><th>Students</th><th>Status</th><th>Report</th></tr></thead>
                  <tbody>
                    {mySubmissions.map((s,i)=>(
                      <tr key={i}>
                        <td style={{ fontFamily:'monospace', fontWeight:600 }}>{s.subjectCode}</td>
                        <td>{s.subjectName}</td>
                        <td>{s.semester}</td>
                        <td>{s.section}</td>
                        <td>{s.count}</td>
                        <td><span className={`badge badge-${s.status}`}>{s.status.toUpperCase()}</span></td>
                        <td>
                          <button
                            className="btn btn-primary btn-sm"
                            disabled={pdfLoading === s.subjectCode}
                            onClick={() => handlePrintClassReport(s)}
                            style={{ display:'flex', alignItems:'center', gap:5, whiteSpace:'nowrap' }}
                          >
                            {pdfLoading === s.subjectCode ? '⏳ Generating…' : '🖨️ Print PDF'}
                          </button>
                        </td>
                      </tr>
                    ))}
                    {mySubmissions.length===0 && <tr><td colSpan={7} style={{ textAlign:'center', padding:30, color:'#6b7280' }}>No submissions yet</td></tr>}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
}

const th = { color:'rgba(255,255,255,0.85)', fontSize:10, fontWeight:700, letterSpacing:0.8, textTransform:'uppercase', padding:'10px 8px', textAlign:'left', whiteSpace:'nowrap' };
const td = { padding:'7px 8px', verticalAlign:'middle' };
const markInput = { width:52, textAlign:'center', padding:'5px 4px', border:'1.5px solid #dde3ef', borderRadius:7, fontFamily:'Outfit,sans-serif', fontSize:13, fontWeight:600, outline:'none', background:'#fff' };
