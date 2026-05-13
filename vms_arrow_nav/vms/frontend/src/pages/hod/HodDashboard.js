import React, { useEffect, useState, useMemo } from 'react';
import axios from 'axios';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { useAuth } from '../../context/AuthContext';
import AnimatedNumber from '../../components/AnimatedNumber';

const SEMESTERS=[1,2,3,4,5,6,7,8];
const STATUS_BADGE={submitted:'badge-yellow',approved:'badge-green',rejected:'badge-red'};

function FilterBar({ filters, onClear }) {
  const hasAny=filters.some(f=>f.value);
  return (
    <div className='filter-bar-inner'>
      {filters.map((f,i)=> f.type==='input'
        ? <input key={i} className="form-input-sm" style={{width:f.width||110,minWidth:80,fontSize:11,padding:'4px 8px',flexShrink:0}} placeholder={f.placeholder} value={f.value} onChange={e=>f.onChange(e.target.value)}/>
        : <select key={i} className="form-select" style={{width:f.width||110,minWidth:80,fontSize:11,padding:'4px 8px',flexShrink:0}} value={f.value} onChange={e=>f.onChange(e.target.value)}><option value="">{f.placeholder}</option>{f.options.map(o=><option key={o.value} value={o.value}>{o.label}</option>)}</select>
      )}
      {hasAny&&<button className="btn btn-outline btn-sm" style={{fontSize:11,padding:'4px 8px',whiteSpace:'nowrap',flexShrink:0}} onClick={onClear}>✕ Clear</button>}
    </div>
  );
}

function DetailModal({ title, icon, onClose, filterBar, children, count }) {
  return (
    <div className="modal-overlay" onClick={e=>e.target===e.currentTarget&&onClose()}>
      <div className="modal" style={{maxWidth:860}}>
        <div className="modal-header"><span className="modal-title">{icon} {title}</span><button className="modal-close" onClick={onClose}>×</button></div>
        {filterBar}
        <div style={{maxHeight:'60vh',overflowY:'auto'}}>{children}</div>
        <div style={{padding:'10px 20px',borderTop:'1px solid var(--border)',fontSize:12,color:'var(--text-muted)',background:'#f8fafc'}}>Showing <strong>{count}</strong> record{count!==1?'s':''}</div>
      </div>
    </div>
  );
}

export default function HodDashboard() {
  const { user } = useAuth();
  const [data,setData]=useState(null); const [loading,setLoading]=useState(true);
  const [modal,setModal]=useState(null); const [rawData,setRawData]=useState([]);
  const [loadingModal,setLoadingModal]=useState(false);

  // students filters
  const [fsSearch,setFsSearch]=useState(''); const [fsRoll,setFsRoll]=useState('');
  const [fsSem,setFsSem]=useState('');       const [fsSec,setFsSec]=useState('');
  // faculty filter
  const [ffSearch,setFfSearch]=useState('');
  // subjects filters
  const [fsuSearch,setFsuSearch]=useState(''); const [fsuCode,setFsuCode]=useState('');
  const [fsuSem,setFsuSem]=useState('');
  // marks filters
  const [fmSearch,setFmSearch]=useState(''); const [fmRoll,setFmRoll]=useState('');
  const [fmSem,setFmSem]=useState('');       const [fmSec,setFmSec]=useState('');
  const [fmSubj,setFmSubj]=useState('');     const [fmExam,setFmExam]=useState('');

  const clearAll=()=>{setFsSearch('');setFsRoll('');setFsSem('');setFsSec('');setFfSearch('');setFsuSearch('');setFsuCode('');setFsuSem('');setFmSearch('');setFmRoll('');setFmSem('');setFmSec('');setFmSubj('');setFmExam('');};

  useEffect(()=>{ axios.get('/api/hod/stats').then(r=>{setData(r.data);setLoading(false);}).catch(()=>setLoading(false)); },[]);

  const openModal=async(type,title,icon)=>{
    setModal({type,title,icon}); setRawData([]); clearAll(); setLoadingModal(true);
    try {
      if(type==='students')      {const r=await axios.get('/api/hod/students');           setRawData(r.data.students||[]);}
      else if(type==='faculty')  {
        // Get ALL active faculty in this department (even unassigned)
        const r=await axios.get('/api/hod/faculty');
        setRawData(r.data.faculty||[]);
      }
      else if(type==='subjects') {const r=await axios.get('/api/hod/subjects');            setRawData(r.data.subjects||[]);}
      else if(type==='pending')  {const r=await axios.get('/api/hod/marks',{params:{status:'submitted'}});  setRawData(r.data.marks||[]);}
      else if(type==='approved') {const r=await axios.get('/api/hod/marks',{params:{status:'approved'}}); setRawData(r.data.marks||[]);}
    } catch{setRawData([]);} finally{setLoadingModal(false);}
  };

  const uniqueSections=useMemo(()=>[...new Set(rawData.map(r=>r.section||r.student?.section).filter(Boolean))].sort(),[rawData]);
  const uniqueSubjects =useMemo(()=>{const s=new Set();return rawData.filter(r=>{const k=r.subject?._id;if(!k||s.has(k))return false;s.add(k);return true;}).map(r=>({value:r.subject._id,label:`${r.subject.name} (${r.subject.code})`}));},[rawData]);

  const filtered=useMemo(()=>{
    if(!modal)return[];
    let d=[...rawData];const t=modal.type;
    if(t==='students'){
      if(fsSearch){const q=fsSearch.toLowerCase();d=d.filter(r=>r.name?.toLowerCase().includes(q));}
      if(fsRoll)  {const q=fsRoll.toLowerCase();  d=d.filter(r=>r.rollNumber?.toLowerCase().includes(q));}
      if(fsSem)   d=d.filter(r=>r.semester===Number(fsSem));
      if(fsSec)   d=d.filter(r=>r.section===fsSec);
    } else if(t==='faculty'){
      if(ffSearch){const q=ffSearch.toLowerCase();d=d.filter(r=>r.name?.toLowerCase().includes(q));}
    } else if(t==='subjects'){
      if(fsuSearch){const q=fsuSearch.toLowerCase();d=d.filter(r=>r.name?.toLowerCase().includes(q));}
      if(fsuCode)  {const q=fsuCode.toLowerCase(); d=d.filter(r=>r.code?.toLowerCase().includes(q));}
      if(fsuSem)   d=d.filter(r=>r.semester===Number(fsuSem));
    } else if(t==='pending'||t==='approved'){
      if(fmSearch){const q=fmSearch.toLowerCase();d=d.filter(r=>r.student?.name?.toLowerCase().includes(q));}
      if(fmRoll)  {const q=fmRoll.toLowerCase();  d=d.filter(r=>r.student?.rollNumber?.toLowerCase().includes(q));}
      if(fmSem)   d=d.filter(r=>r.semester===Number(fmSem));
      if(fmSec)   d=d.filter(r=>r.student?.section===fmSec);
      if(fmSubj)  d=d.filter(r=>r.subject?._id===fmSubj);
      if(fmExam)  d=d.filter(r=>r.midExam===fmExam);
    }
    return d;
  },[rawData,modal,fsSearch,fsRoll,fsSem,fsSec,ffSearch,fsuSearch,fsuCode,fsuSem,fmSearch,fmRoll,fmSem,fmSec,fmSubj,fmExam]);

  const filterBar=useMemo(()=>{
    if(!modal)return null;const t=modal.type;
    const sOpts=SEMESTERS.map(s=>({value:s,label:`Sem ${s}`}));
    if(t==='students') return <FilterBar filters={[
      {type:'input', placeholder:'🔍 Name',    value:fsSearch,onChange:setFsSearch,width:118},
      {type:'input', placeholder:'🔍 Roll No', value:fsRoll,  onChange:setFsRoll,  width:118},
      {type:'select',placeholder:'Semester',  value:fsSem,   onChange:setFsSem,   options:sOpts,width:100},
      {type:'select',placeholder:'Section',   value:fsSec,   onChange:setFsSec,   options:uniqueSections.map(s=>({value:s,label:`Sec ${s}`})),width:100},
    ]} onClear={()=>{setFsSearch('');setFsRoll('');setFsSem('');setFsSec('');}}/>;
    if(t==='faculty') return <FilterBar filters={[
      {type:'input',placeholder:'🔍 Search faculty name',value:ffSearch,onChange:setFfSearch,width:160},
    ]} onClear={()=>setFfSearch('')}/>;
    if(t==='subjects') return <FilterBar filters={[
      {type:'input', placeholder:'🔍 Subject name',value:fsuSearch,onChange:setFsuSearch,width:100},
      {type:'input', placeholder:'🔍 Code',        value:fsuCode,  onChange:setFsuCode,  width:105},
      {type:'select',placeholder:'Semester',      value:fsuSem,   onChange:setFsuSem,   options:sOpts,width:100},
    ]} onClear={()=>{setFsuSearch('');setFsuCode('');setFsuSem('');}}/>;
    if(t==='pending'||t==='approved') return <FilterBar filters={[
      {type:'input', placeholder:'🔍 Student name',value:fmSearch,onChange:setFmSearch,width:100},
      {type:'input', placeholder:'🔍 Roll No',     value:fmRoll,  onChange:setFmRoll,  width:100},
      {type:'select',placeholder:'Semester',      value:fmSem,   onChange:setFmSem,   options:sOpts,width:105},
      {type:'select',placeholder:'Section',       value:fmSec,   onChange:setFmSec,   options:uniqueSections.map(s=>({value:s,label:`Sec ${s}`})),width:100},
      {type:'select',placeholder:'Subject',       value:fmSubj,  onChange:setFmSubj,  options:uniqueSubjects,width:140},
      {type:'select',placeholder:'Exam',          value:fmExam,  onChange:setFmExam,  options:[{value:'Mid-1',label:'Mid-1'},{value:'Mid-2',label:'Mid-2'}],width:100},
    ]} onClear={()=>{setFmSearch('');setFmRoll('');setFmSem('');setFmSec('');setFmSubj('');setFmExam('');}}/>;
    return null;
  },[modal,fsSearch,fsRoll,fsSem,fsSec,ffSearch,fsuSearch,fsuCode,fsuSem,fmSearch,fmRoll,fmSem,fmSec,fmSubj,fmExam,uniqueSections,uniqueSubjects]);

  const renderContent=()=>{
    if(loadingModal)return <div className="empty-state" style={{padding:48}}><div className="spinner" style={{margin:'0 auto'}}></div></div>;
    if(!filtered.length)return <div className="empty-state"><div className="empty-icon">📭</div><div className="empty-text">No records found</div></div>;
    const t=modal.type;
    if(t==='students') return <table><thead><tr><th>#</th><th>Name</th><th>Roll No</th><th>Semester</th><th>Section</th></tr></thead><tbody>{filtered.map((s,i)=><tr key={s._id}><td>{i+1}</td><td className="fw-600">{s.name}</td><td style={{fontFamily:'monospace',fontSize:12}}>{s.rollNumber}</td><td><span className="badge badge-blue">Sem {s.semester}</span></td><td>{s.section||'—'}</td></tr>)}</tbody></table>;
    if(t==='faculty')  return <table><thead><tr><th>#</th><th>Name</th><th>Faculty ID</th><th>Department</th></tr></thead><tbody>{filtered.map((f,i)=><tr key={f._id}><td>{i+1}</td><td className="fw-600">{f.name}</td><td style={{fontFamily:'monospace',fontSize:12}}>{f.rollNumber}</td><td><span className="badge badge-blue">{f.department?.name||'—'}</span></td></tr>)}</tbody></table>;
    if(t==='subjects') return <table><thead><tr><th>#</th><th>Subject</th><th>Code</th><th>Semester</th><th>Credits</th></tr></thead><tbody>{filtered.map((s,i)=><tr key={s._id}><td>{i+1}</td><td className="fw-600">{s.name}</td><td><span className="badge badge-purple">{s.code}</span></td><td>Sem {s.semester}</td><td>{s.credits}</td></tr>)}</tbody></table>;
    return <table><thead><tr><th>#</th><th>Student</th><th>Roll No</th><th>Sem</th><th>Sec</th><th>Subject</th><th>Exam</th><th>Marks</th><th>Faculty</th><th>Status</th></tr></thead><tbody>{filtered.map((m,i)=><tr key={m._id}><td>{i+1}</td><td className="fw-600">{m.student?.name}</td><td style={{fontFamily:'monospace',fontSize:11}}>{m.student?.rollNumber}</td><td>{m.semester}</td><td>{m.student?.section||'—'}</td><td>{m.subject?.name}</td><td><span className="badge badge-blue">{m.midExam}</span></td><td className="fw-600">{m.totalMarks}/30</td><td className="text-muted">{m.faculty?.name}</td><td><span className={`badge ${STATUS_BADGE[m.status]||'badge-gray'}`}>{m.status}</span></td></tr>)}</tbody></table>;
  };

  if(loading) return <div className="loading-screen"><div className="spinner"></div></div>;
  if(!data)   return <div className="empty-state"><div className="empty-icon">⚠️</div><div className="empty-text">Failed to load</div></div>;
  const {stats,studentsBySem,subjectsBySem}=data;
  const semData=studentsBySem.map(s=>({name:`Sem ${s._id}`,students:s.count}));
  const subData=subjectsBySem.map(s=>({name:`Sem ${s._id}`,subjects:s.count}));
  const statCards=[
    {key:'students',value:stats.totalStudents, label:'Students',         icon:'👨‍🎓',color:'blue',  title:'All Students'     },
    {key:'faculty', value:stats.totalFaculty,  label:'Faculty Members',  icon:'👩‍🏫',color:'green', title:'All Faculty'      },
    {key:'subjects',value:stats.totalSubjects, label:'Subjects',         icon:'📚', color:'cyan',  title:'All Subjects'     },
    {key:'pending', value:stats.pendingMarks,  label:'Pending Approvals',icon:'⏳', color:'yellow',title:'Pending Marks'    },
    {key:'approved',value:stats.approvedMarks, label:'Approved Marks',   icon:'✅', color:'green', title:'Approved Marks'   },
  ];

  return (
    <div>
      <div className="info-box" style={{marginBottom:20}}>🏢 Department: <strong>{user?.department?.name}</strong> ({user?.department?.code})</div>
      <div className="stats-grid">
        {statCards.map((card,idx)=>(
          <div key={card.key} className={`stat-card ${card.color} stat-card-animated`}
            onClick={()=>openModal(card.key,card.title,card.icon)}
            style={{'--delay':`${idx*0.08}s`,cursor:'pointer',userSelect:'none'}}>
            <div className="stat-icon">{card.icon}</div>
            <div><div className="stat-value"><AnimatedNumber value={card.value}/></div><div className="stat-label">{card.label}</div><div style={{fontSize:10,color:'var(--primary)',marginTop:2,fontWeight:600}}>Click to view →</div></div>
          </div>
        ))}
      </div>
      <div className="charts-grid">
        <div className="card"><div className="card-header"><span className="card-title">👨‍🎓 Students per Semester</span></div><div className="card-body">{semData.length?<div className="chart-container"><ResponsiveContainer width="100%" height="100%"><BarChart data={semData} margin={{top:5,right:10,left:-10,bottom:5}}><XAxis dataKey="name" tick={{fontSize:11}}/><YAxis allowDecimals={false} tick={{fontSize:11}}/><Tooltip/><Bar dataKey="students" fill="#1a56db" radius={[4,4,0,0]}/></BarChart></ResponsiveContainer></div>:<div className="empty-state"><div className="empty-text">No data</div></div>}</div></div>
        <div className="card"><div className="card-header"><span className="card-title">📚 Subjects per Semester</span></div><div className="card-body">{subData.length?<div className="chart-container"><ResponsiveContainer width="100%" height="100%"><BarChart data={subData} margin={{top:5,right:10,left:-10,bottom:5}}><XAxis dataKey="name" tick={{fontSize:11}}/><YAxis allowDecimals={false} tick={{fontSize:11}}/><Tooltip/><Bar dataKey="subjects" fill="#10b981" radius={[4,4,0,0]}/></BarChart></ResponsiveContainer></div>:<div className="empty-state"><div className="empty-text">No data</div></div>}</div></div>
      </div>
      {modal&&<DetailModal title={modal.title} icon={modal.icon} onClose={()=>{setModal(null);setRawData([]);clearAll();}} filterBar={filterBar} count={filtered.length}>{renderContent()}</DetailModal>}
    </div>
  );
}
