import React, { useEffect, useState, useMemo } from 'react';
import axios from 'axios';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';
import AnimatedNumber from '../../components/AnimatedNumber';

const COLORS = ['#1a56db','#10b981','#f59e0b','#ef4444','#6366f1','#06b6d4','#ec4899','#8b5cf6'];
const SEMESTERS = [1,2,3,4,5,6,7,8];
const roleBadge = { admin:'badge-red', hod:'badge-yellow', faculty:'badge-purple', student:'badge-blue' };
const STATUS_BADGE = { submitted:'badge-yellow', approved:'badge-green', rejected:'badge-red' };

function FilterBar({ filters, onClear }) {
  const hasAny = filters.some(f => f.value);
  return (
    <div style={{ padding:'10px 20px', borderBottom:'1px solid var(--border)', background:'#f8fafc', display:'flex', gap:8, flexWrap:'wrap', alignItems:'center' }}>
      {filters.map((f,i) =>
        f.type==='input' ? (
          <input key={i} className="form-input-sm" style={{ width:f.width||140, fontSize:12, padding:'5px 9px' }}
            placeholder={f.placeholder} value={f.value} onChange={e=>f.onChange(e.target.value)} />
        ) : (
          <select key={i} className="form-select" style={{ width:f.width||140, fontSize:12, padding:'5px 9px' }}
            value={f.value} onChange={e=>f.onChange(e.target.value)}>
            <option value="">{f.placeholder}</option>
            {f.options.map(o=><option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        )
      )}
      {hasAny && <button className="btn btn-outline btn-sm" style={{ fontSize:11, padding:'5px 10px' }} onClick={onClear}>✕ Clear Filters</button>}
    </div>
  );
}

function DetailModal({ title, icon, onClose, filterBar, children, count }) {
  return (
    <div className="modal-overlay" onClick={e=>e.target===e.currentTarget&&onClose()}>
      <div className="modal" style={{ maxWidth:860 }}>
        <div className="modal-header">
          <span className="modal-title">{icon} {title}</span>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>
        {filterBar}
        <div style={{ maxHeight:'60vh', overflowY:'auto' }}>{children}</div>
        <div style={{ padding:'10px 20px', borderTop:'1px solid var(--border)', fontSize:12, color:'var(--text-muted)', background:'#f8fafc' }}>
          Showing <strong>{count}</strong> record{count!==1?'s':''}
        </div>
      </div>
    </div>
  );
}

export default function AdminDashboard() {
  const [data,    setData]    = useState(null);
  const [loading, setLoading] = useState(true);
  const [modal,   setModal]   = useState(null);
  const [rawData, setRawData] = useState([]);
  const [loadingModal, setLoadingModal] = useState(false);
  const [departments, setDepartments] = useState([]);

  const [fsSearch,setFsSearch]=useState(''); const [fsRoll,setFsRoll]=useState('');
  const [fsDept,setFsDept]=useState('');     const [fsSem,setFsSem]=useState('');
  const [fsSec,setFsSec]=useState('');
  const [ffSearch,setFfSearch]=useState(''); const [ffDept,setFfDept]=useState('');
  const [fdSearch,setFdSearch]=useState('');
  const [fsuSearch,setFsuSearch]=useState(''); const [fsuCode,setFsuCode]=useState('');
  const [fsuDept,setFsuDept]=useState('');     const [fsuSem,setFsuSem]=useState('');
  const [fmSearch,setFmSearch]=useState(''); const [fmRoll,setFmRoll]=useState('');
  const [fmSubj,setFmSubj]=useState('');     const [fmExam,setFmExam]=useState('');
  const [fmFaculty,setFmFaculty]=useState('');

  const clearAll = () => { setFsSearch('');setFsRoll('');setFsDept('');setFsSem('');setFsSec('');setFfSearch('');setFfDept('');setFdSearch('');setFsuSearch('');setFsuCode('');setFsuDept('');setFsuSem('');setFmSearch('');setFmRoll('');setFmSubj('');setFmExam('');setFmFaculty(''); };

  useEffect(() => {
    axios.get('/api/admin/stats').then(r=>{ setData(r.data); setLoading(false); });
    axios.get('/api/admin/departments').then(r=>setDepartments(r.data.departments?.filter(d=>d.isActive)||[]));
  }, []);

  const openModal = async (type, title, icon) => {
    setModal({ type, title, icon }); setRawData([]); clearAll(); setLoadingModal(true);
    try {
      if (type==='students')  { const r=await axios.get('/api/admin/users',{params:{role:'student'}}); setRawData(r.data.users.filter(u=>u.isActive)); }
      else if(type==='faculty'){const r=await axios.get('/api/admin/users',{params:{role:'faculty'}}); setRawData(r.data.users.filter(u=>u.isActive)); }
      else if(type==='hods')  { const r=await axios.get('/api/admin/hods'); setRawData(r.data.hods||[]); }
      else if(type==='depts') { const r=await axios.get('/api/admin/departments');                      setRawData(r.data.departments.filter(d=>d.isActive)); }
      else if(type==='subjects'){const r=await axios.get('/api/admin/subjects');                        setRawData(r.data.subjects||[]); }
      else if(type==='marks') { const r=await axios.get('/api/admin/marks');                            setRawData(r.data.marks||[]); }
    } catch { setRawData([]); } finally { setLoadingModal(false); }
  };

  const uniqueSections = useMemo(()=>[...new Set(rawData.map(r=>r.section).filter(Boolean))].sort(),[rawData]);
  const uniqueSubjects  = useMemo(()=>{ const s=new Set(); return rawData.filter(r=>{ const k=r.subject?._id; if(!k||s.has(k))return false; s.add(k); return true; }).map(r=>({value:r.subject._id,label:`${r.subject.name} (${r.subject.code})`})); },[rawData]);
  const uniqueFaculty   = useMemo(()=>{ const s=new Set(); return rawData.filter(r=>{ const k=r.faculty?._id; if(!k||s.has(k))return false; s.add(k); return true; }).map(r=>({value:r.faculty._id,label:r.faculty.name})); },[rawData]);

  const filtered = useMemo(() => {
    if (!modal) return [];
    let d=[...rawData]; const t=modal.type;
    if(t==='students'){
      if(fsSearch){const q=fsSearch.toLowerCase();d=d.filter(r=>r.name?.toLowerCase().includes(q));}
      if(fsRoll)  {const q=fsRoll.toLowerCase();  d=d.filter(r=>r.rollNumber?.toLowerCase().includes(q));}
      if(fsDept)  d=d.filter(r=>r.department?._id===fsDept);
      if(fsSem)   d=d.filter(r=>r.semester===Number(fsSem));
      if(fsSec)   d=d.filter(r=>r.section===fsSec);
    } else if(t==='faculty'){
      if(ffSearch){const q=ffSearch.toLowerCase();d=d.filter(r=>r.name?.toLowerCase().includes(q));}
      if(ffDept)  d=d.filter(r=>r.department?._id===ffDept);
    } else if(t==='depts'){
      if(fdSearch){const q=fdSearch.toLowerCase();d=d.filter(r=>r.name?.toLowerCase().includes(q)||r.code?.toLowerCase().includes(q));}
    } else if(t==='subjects'){
      if(fsuSearch){const q=fsuSearch.toLowerCase();d=d.filter(r=>r.name?.toLowerCase().includes(q));}
      if(fsuCode)  {const q=fsuCode.toLowerCase(); d=d.filter(r=>r.code?.toLowerCase().includes(q));}
      if(fsuDept)  d=d.filter(r=>r.department?._id===fsuDept);
      if(fsuSem)   d=d.filter(r=>r.semester===Number(fsuSem));
    } else if(t==='marks'){
      if(fmSearch) {const q=fmSearch.toLowerCase(); d=d.filter(r=>r.student?.name?.toLowerCase().includes(q));}
      if(fmRoll)   {const q=fmRoll.toLowerCase();   d=d.filter(r=>r.student?.rollNumber?.toLowerCase().includes(q));}
      if(fmSubj)   d=d.filter(r=>r.subject?._id===fmSubj);
      if(fmExam)   d=d.filter(r=>r.midExam===fmExam);
      if(fmFaculty)d=d.filter(r=>r.faculty?._id===fmFaculty);
    }
    return d;
  },[rawData,modal,fsSearch,fsRoll,fsDept,fsSem,fsSec,ffSearch,ffDept,fdSearch,fsuSearch,fsuCode,fsuDept,fsuSem,fmSearch,fmRoll,fmSubj,fmExam,fmFaculty]);

  const filterBar = useMemo(() => {
    if (!modal) return null;
    const t=modal.type;
    const dOpts=departments.map(d=>({value:d._id,label:`${d.name} (${d.code})`}));
    const sOpts=SEMESTERS.map(s=>({value:s,label:`Semester ${s}`}));
    if(t==='students') return <FilterBar filters={[
      {type:'input', placeholder:'🔍 Name',       value:fsSearch, onChange:setFsSearch, width:118},
      {type:'input', placeholder:'🔍 Roll Number', value:fsRoll,   onChange:setFsRoll,   width:118},
      {type:'select',placeholder:'Department',    value:fsDept,   onChange:setFsDept,   options:dOpts, width:100},
      {type:'select',placeholder:'Semester',      value:fsSem,    onChange:setFsSem,    options:sOpts, width:100},
      {type:'select',placeholder:'Section',       value:fsSec,    onChange:setFsSec,    options:uniqueSections.map(s=>({value:s,label:`Sec ${s}`})), width:100},
    ]} onClear={()=>{setFsSearch('');setFsRoll('');setFsDept('');setFsSem('');setFsSec('');}}/>;
    if(t==='faculty') return <FilterBar filters={[
      {type:'input', placeholder:'🔍 Search name', value:ffSearch, onChange:setFfSearch, width:140},
      {type:'select',placeholder:'Department',    value:ffDept,   onChange:setFfDept,   options:dOpts, width:140},
    ]} onClear={()=>{setFfSearch('');setFfDept('');}}/>;
    if(t==='depts') return <FilterBar filters={[
      {type:'input',placeholder:'🔍 Search department name or code', value:fdSearch, onChange:setFdSearch, width:200},
    ]} onClear={()=>setFdSearch('')}/>;
    if(t==='subjects') return <FilterBar filters={[
      {type:'input', placeholder:'🔍 Subject name', value:fsuSearch, onChange:setFsuSearch, width:105},
      {type:'input', placeholder:'🔍 Code',         value:fsuCode,   onChange:setFsuCode,   width:105},
      {type:'select',placeholder:'Department',     value:fsuDept,   onChange:setFsuDept,   options:dOpts, width:100},
      {type:'select',placeholder:'Semester',       value:fsuSem,    onChange:setFsuSem,    options:sOpts, width:100},
    ]} onClear={()=>{setFsuSearch('');setFsuCode('');setFsuDept('');setFsuSem('');}}/>;
    if(t==='marks') return <FilterBar filters={[
      {type:'input', placeholder:'🔍 Student name', value:fmSearch,  onChange:setFmSearch,  width:118},
      {type:'input', placeholder:'🔍 Roll number',  value:fmRoll,    onChange:setFmRoll,    width:100},
      {type:'select',placeholder:'Subject',        value:fmSubj,    onChange:setFmSubj,    options:uniqueSubjects,  width:140},
      {type:'select',placeholder:'Exam',           value:fmExam,    onChange:setFmExam,    options:[{value:'Mid-1',label:'Mid-1'},{value:'Mid-2',label:'Mid-2'}], width:100},
      {type:'select',placeholder:'Faculty',        value:fmFaculty, onChange:setFmFaculty, options:uniqueFaculty,   width:105},
    ]} onClear={()=>{setFmSearch('');setFmRoll('');setFmSubj('');setFmExam('');setFmFaculty('');}}/>;
    return null;
  },[modal,fsSearch,fsRoll,fsDept,fsSem,fsSec,ffSearch,ffDept,fdSearch,fsuSearch,fsuCode,fsuDept,fsuSem,fmSearch,fmRoll,fmSubj,fmExam,fmFaculty,departments,uniqueSections,uniqueSubjects,uniqueFaculty]);

  const renderContent = () => {
    if(loadingModal) return <div className="empty-state" style={{ padding:48 }}><div className="spinner" style={{ margin:'0 auto' }}></div></div>;
    if(!filtered.length) return <div className="empty-state"><div className="empty-icon">📭</div><div className="empty-text">No records found</div></div>;
    const t=modal.type;
    if(t==='students') return <table><thead><tr><th>#</th><th>Name</th><th>Roll Number</th><th>Department</th><th>Sem</th><th>Section</th></tr></thead><tbody>{filtered.map((u,i)=><tr key={u._id}><td>{i+1}</td><td className="fw-600">{u.name}</td><td style={{fontFamily:'monospace',fontSize:12}}>{u.rollNumber}</td><td>{u.department?.name||'—'}</td><td><span className="badge badge-blue">Sem {u.semester}</span></td><td>{u.section||'—'}</td></tr>)}</tbody></table>;
    if(t==='faculty') return <table><thead><tr><th>#</th><th>Name</th><th>Roll Number</th><th>Department</th></tr></thead><tbody>{filtered.map((u,i)=><tr key={u._id}><td>{i+1}</td><td className="fw-600">{u.name}</td><td style={{fontFamily:'monospace',fontSize:12}}>{u.rollNumber}</td><td>{u.department?.name||'—'}</td></tr>)}</tbody></table>;
    if(t==='hods') return <table><thead><tr><th>#</th><th>Name</th><th>Roll Number</th><th>HOD Departments</th></tr></thead><tbody>{filtered.map((u,i)=><tr key={u._id}><td>{i+1}</td><td className="fw-600">{u.name}</td><td style={{fontFamily:'monospace',fontSize:12}}>{u.rollNumber}</td><td>{(u.hodDepartments||[]).map(d=>d.name||d).join(', ')||'—'}</td></tr>)}</tbody></table>;
    if(t==='depts') return <table><thead><tr><th>#</th><th>Department Name</th><th>Code</th><th>Description</th><th>Status</th></tr></thead><tbody>{filtered.map((d,i)=><tr key={d._id}><td>{i+1}</td><td className="fw-600">{d.name}</td><td><span className="badge badge-blue">{d.code}</span></td><td className="text-muted">{d.description||'—'}</td><td><span className={`badge ${d.isActive?'badge-green':'badge-red'}`}>{d.isActive?'Active':'Inactive'}</span></td></tr>)}</tbody></table>;
    if(t==='subjects') return <table><thead><tr><th>#</th><th>Subject Name</th><th>Code</th><th>Department</th><th>Semester</th><th>Credits</th></tr></thead><tbody>{filtered.map((s,i)=><tr key={s._id}><td>{i+1}</td><td className="fw-600">{s.name}</td><td><span className="badge badge-purple">{s.code}</span></td><td>{s.department?.name||'—'}</td><td>Sem {s.semester}</td><td>{s.credits}</td></tr>)}</tbody></table>;
    if(t==='marks') return <table><thead><tr><th>#</th><th>Student</th><th>Roll No</th><th>Subject</th><th>Exam</th><th>Marks</th><th>Faculty</th><th>Status</th></tr></thead><tbody>{filtered.map((m,i)=><tr key={m._id}><td>{i+1}</td><td className="fw-600">{m.student?.name}</td><td style={{fontFamily:'monospace',fontSize:11}}>{m.student?.rollNumber}</td><td>{m.subject?.name} <span style={{fontSize:10,color:'var(--text-muted)'}}>({m.subject?.code})</span></td><td><span className="badge badge-blue">{m.midExam}</span></td><td className="fw-600">{m.totalMarks}/30</td><td className="text-muted">{m.faculty?.name}</td><td><span className={`badge ${STATUS_BADGE[m.status]||'badge-gray'}`}>{m.status}</span>{m.isLocked&&<span className="badge badge-red" style={{marginLeft:4}}>🔒</span>}</td></tr>)}</tbody></table>;
  };

  if(loading) return <div className="loading-screen"><div className="spinner"></div></div>;
  if(!data)   return <div className="empty-state"><div className="empty-icon">⚠️</div><div className="empty-text">Failed to load</div></div>;

  const { stats, studentsByDept, studentsBySem } = data;
  const semData  = studentsBySem.map(s=>({ name:`Sem ${s._id}`, students:s.count }));
  const deptData = studentsByDept.map(d=>({ name:d.deptName||'Unknown', value:d.count }));
  const statCards = [
    {key:'students',value:stats.totalStudents,    label:'Total Students',  icon:'👨‍🎓',color:'blue',  title:'All Students'     },
    {key:'faculty', value:(stats.totalFaculty||0)+(stats.totalHods||0), label:'Faculty Members', icon:'👩‍🏫',color:'green', title:'All Faculty'      },
    {key:'hods',    value:stats.totalHods,        label:'HODs',            icon:'🧑‍💼',color:'purple',title:'All HODs'         },
    {key:'depts',   value:stats.totalDepartments, label:'Departments',     icon:'🏢', color:'yellow',title:'All Departments'  },
    {key:'subjects',value:stats.totalSubjects,    label:'Subjects',        icon:'📚', color:'cyan',  title:'All Subjects'     },
    {key:'marks',   value:stats.totalMarksEntries,label:'Marks Entries',   icon:'📊', color:'red',   title:'All Marks Entries'},
  ];

  return (
    <div>
      <div className="stats-grid">
        {statCards.map((card,idx)=>(
          <div key={card.key} className={`stat-card ${card.color} stat-card-animated`}
            onClick={()=>openModal(card.key,card.title,card.icon)}
            style={{'--delay':`${idx*0.08}s`,cursor:'pointer',userSelect:'none'}}>
            <div className="stat-icon">{card.icon}</div>
            <div>
              <div className="stat-value"><AnimatedNumber value={card.value}/></div>
              <div className="stat-label">{card.label}</div>
              <div style={{fontSize:10,color:'var(--primary)',marginTop:2,fontWeight:600}}>Click to view →</div>
            </div>
          </div>
        ))}
      </div>
      <div className="charts-grid">
        <div className="card"><div className="card-header"><span className="card-title">📊 Students by Semester</span></div><div className="card-body">{semData.length?<div className="chart-container"><ResponsiveContainer width="100%" height="100%"><BarChart data={semData} margin={{top:5,right:10,left:-10,bottom:5}}><XAxis dataKey="name" tick={{fontSize:11}}/><YAxis allowDecimals={false} tick={{fontSize:11}}/><Tooltip/><Bar dataKey="students" fill="#1a56db" radius={[4,4,0,0]}/></BarChart></ResponsiveContainer></div>:<div className="empty-state"><div className="empty-text">No data</div></div>}</div></div>
        <div className="card"><div className="card-header"><span className="card-title">🏢 Students by Department</span></div><div className="card-body">{deptData.length?<div className="chart-container"><ResponsiveContainer width="100%" height="100%"><PieChart margin={{top:5,right:5,left:5,bottom:5}}><Pie data={deptData} cx="50%" cy="45%" outerRadius="60%" dataKey="value" label={({value})=>value} labelLine>{deptData.map((_,i)=><Cell key={i} fill={COLORS[i%COLORS.length]}/>)}</Pie><Tooltip/><Legend layout="horizontal" verticalAlign="bottom" align="center" wrapperStyle={{fontSize:11,paddingTop:8}}/></PieChart></ResponsiveContainer></div>:<div className="empty-state"><div className="empty-text">No data</div></div>}</div></div>
      </div>
      {modal&&(
        <DetailModal title={modal.title} icon={modal.icon} onClose={()=>{setModal(null);setRawData([]);clearAll();}} filterBar={filterBar} count={filtered.length}>
          {renderContent()}
        </DetailModal>
      )}
    </div>
  );
}
