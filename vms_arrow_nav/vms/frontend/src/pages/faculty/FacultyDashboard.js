import React, { useEffect, useState, useMemo } from 'react';
import axios from 'axios';
import { useAuth } from '../../context/AuthContext';
import AnimatedNumber from '../../components/AnimatedNumber';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';

const SEMESTERS=[1,2,3,4,5,6,7,8];
const STATUS_BADGE={submitted:'badge-yellow',approved:'badge-green',rejected:'badge-red'};

function FilterBar({filters,onClear}) {
  const hasAny=filters.some(f=>f.value);
  return (
    <div className='filter-bar-inner'>
      {filters.map((f,i)=>f.type==='input'
        ?<input key={i} className="form-input-sm" style={{width:f.width||110,minWidth:80,fontSize:11,padding:'4px 8px',flexShrink:0}} placeholder={f.placeholder} value={f.value} onChange={e=>f.onChange(e.target.value)}/>
        :<select key={i} className="form-select" style={{width:f.width||110,minWidth:80,fontSize:11,padding:'4px 8px',flexShrink:0}} value={f.value} onChange={e=>f.onChange(e.target.value)}><option value="">{f.placeholder}</option>{f.options.map(o=><option key={o.value} value={o.value}>{o.label}</option>)}</select>
      )}
      {hasAny&&<button className="btn btn-outline btn-sm" style={{fontSize:11,padding:'4px 8px',whiteSpace:'nowrap',flexShrink:0}} onClick={onClear}>✕ Clear</button>}
    </div>
  );
}

function DetailModal({title,icon,onClose,filterBar,children,count}) {
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

export default function FacultyDashboard() {
  const {user}=useAuth();
  const [data,setData]=useState(null); const [loading,setLoading]=useState(true);
  const [modal,setModal]=useState(null); const [rawData,setRawData]=useState([]);
  const [loadingModal,setLoadingModal]=useState(false);

  const [fSearch,setFSearch]=useState(''); const [fRoll,setFRoll]=useState('');
  const [fSem,setFSem]=useState('');       const [fSec,setFSec]=useState('');
  const [fSubj,setFSubj]=useState('');     const [fExam,setFExam]=useState('');
  const [fStatus,setFStatus]=useState(''); const [fCode,setFCode]=useState('');

  const clearAll=()=>{setFSearch('');setFRoll('');setFSem('');setFSec('');setFSubj('');setFExam('');setFStatus('');setFCode('');};

  useEffect(()=>{axios.get('/api/faculty/stats').then(r=>{setData(r.data);setLoading(false);}).catch(()=>setLoading(false));},[]);

  const openModal=async(type,title,icon)=>{
    setModal({type,title,icon}); setRawData([]); clearAll(); setLoadingModal(true);
    try {
      if(type==='assignedSubjects'){
        const results=[];
        for(const sem of SEMESTERS){ try{ const r=await axios.get('/api/faculty/subjects',{params:{semester:sem}}); if(r.data.subjects?.length) results.push(...r.data.subjects.map(s=>({...s,semester:sem}))); }catch{} }
        setRawData(results);
      } else if(type==='finalMarks'){
        const results=[];
        for(const sem of SEMESTERS){ try{ const r=await axios.get('/api/faculty/final-marks',{params:{semester:sem}}); if(r.data.finalMarks?.length) results.push(...r.data.finalMarks); }catch{} }
        setRawData(results);
      } else {
        const params={};
        if(type==='submitted') {} // all marks, no status filter
        if(type==='pending')  params.status='submitted';
        if(type==='approved') params.status='approved';
        if(type==='rejected') params.status='rejected';
        const r=await axios.get('/api/faculty/marks',{params});
        setRawData(r.data.marks||[]);
      }
    } catch{setRawData([]);} finally{setLoadingModal(false);}
  };

  const uniqueSections=useMemo(()=>[...new Set(rawData.map(r=>r.student?.section||r.section).filter(Boolean))].sort(),[rawData]);
  const uniqueSubjects =useMemo(()=>{const s=new Set();return rawData.filter(r=>{const k=r.subject?._id||r._id;if(!k||s.has(k))return false;s.add(k);return true;}).map(r=>({value:r.subject?._id||r._id,label:r.subject?`${r.subject.name} (${r.subject.code})`:`${r.name} (${r.code})`}));},[rawData]);

  const filtered=useMemo(()=>{
    if(!modal)return[];
    let d=[...rawData];const t=modal.type;
    if(t==='assignedSubjects'){
      if(fSearch){const q=fSearch.toLowerCase();d=d.filter(r=>r.name?.toLowerCase().includes(q));}
      if(fCode)  {const q=fCode.toLowerCase();  d=d.filter(r=>r.code?.toLowerCase().includes(q));}
      if(fSem)   d=d.filter(r=>r.semester===Number(fSem));
      if(fSec)   d=d.filter(r=>r.mySections?.some(s=>s.sectionName===fSec));
    } else if(t==='finalMarks'){
      if(fSearch){const q=fSearch.toLowerCase();d=d.filter(r=>r.student?.name?.toLowerCase().includes(q));}
      if(fRoll)  {const q=fRoll.toLowerCase();  d=d.filter(r=>r.student?.rollNumber?.toLowerCase().includes(q));}
      if(fSem)   d=d.filter(r=>r.semester===Number(fSem));
      if(fSec)   d=d.filter(r=>r.student?.section===fSec);
      if(fSubj)  d=d.filter(r=>r.subject?._id===fSubj);
    } else {
      if(fSearch){const q=fSearch.toLowerCase();d=d.filter(r=>r.student?.name?.toLowerCase().includes(q));}
      if(fRoll)  {const q=fRoll.toLowerCase();  d=d.filter(r=>r.student?.rollNumber?.toLowerCase().includes(q));}
      if(fSem)   d=d.filter(r=>(r.semester||r.subject?.semester)===Number(fSem));
      if(fSec)   d=d.filter(r=>r.student?.section===fSec);
      if(fSubj)  d=d.filter(r=>r.subject?._id===fSubj);
      if(fExam)  d=d.filter(r=>r.midExam===fExam);
      if(fStatus)d=d.filter(r=>r.status===fStatus);
      if(t==='submitted'&&!fStatus) {} // no extra status filter for "all"
    }
    return d;
  },[rawData,modal,fSearch,fRoll,fSem,fSec,fSubj,fExam,fStatus,fCode]);

  const filterBar=useMemo(()=>{
    if(!modal)return null;const t=modal.type;
    const sOpts=SEMESTERS.map(s=>({value:s,label:`Sem ${s}`}));
    const secOpts=uniqueSections.map(s=>({value:s,label:`Sec ${s}`}));
    const subOpts=uniqueSubjects;

    if(t==='assignedSubjects') return <FilterBar filters={[
      {type:'input', placeholder:'🔍 Subject name',value:fSearch,onChange:setFSearch,width:105},
      {type:'input', placeholder:'🔍 Code',        value:fCode,  onChange:setFCode,  width:105},
      {type:'select',placeholder:'Semester',      value:fSem,   onChange:setFSem,   options:sOpts,  width:105},
      {type:'select',placeholder:'Section',       value:fSec,   onChange:setFSec,   options:secOpts,width:100},
    ]} onClear={()=>{setFSearch('');setFCode('');setFSem('');setFSec('');}}/>;

    return <FilterBar filters={[
      {type:'input', placeholder:'🔍 Student name',value:fSearch, onChange:setFSearch, width:100},
      {type:'input', placeholder:'🔍 Roll No',     value:fRoll,   onChange:setFRoll,   width:108},
      {type:'select',placeholder:'Semester',      value:fSem,    onChange:setFSem,    options:sOpts,  width:105},
      {type:'select',placeholder:'Section',       value:fSec,    onChange:setFSec,    options:secOpts,width:100},
      {type:'select',placeholder:'Subject',       value:fSubj,   onChange:setFSubj,   options:subOpts,width:135},
      {type:'select',placeholder:'Exam',          value:fExam,   onChange:setFExam,   options:[{value:'Mid-1',label:'Mid-1'},{value:'Mid-2',label:'Mid-2'}],width:100},
      ...(t==='submitted'?[{type:'select',placeholder:'Status',value:fStatus,onChange:setFStatus,options:[{value:'submitted',label:'Pending'},{value:'approved',label:'Approved'},{value:'rejected',label:'Rejected'}],width:108}]:[]),
    ]} onClear={()=>{setFSearch('');setFRoll('');setFSem('');setFSec('');setFSubj('');setFExam('');setFStatus('');}}/>;
  },[modal,fSearch,fRoll,fSem,fSec,fSubj,fExam,fStatus,fCode,uniqueSections,uniqueSubjects]);

  const renderContent=()=>{
    if(loadingModal)return <div className="empty-state" style={{padding:48}}><div className="spinner" style={{margin:'0 auto'}}></div></div>;
    if(!filtered.length)return <div className="empty-state"><div className="empty-icon">📭</div><div className="empty-text">No records found</div></div>;
    const t=modal.type;
    if(t==='assignedSubjects') return <table><thead><tr><th>#</th><th>Subject</th><th>Code</th><th>Semester</th><th>My Sections</th></tr></thead><tbody>{filtered.map((s,i)=><tr key={`${s._id}-${i}`}><td>{i+1}</td><td className="fw-600">{s.name}</td><td><span className="badge badge-purple">{s.code}</span></td><td>Sem {s.semester}</td><td>{s.mySections?.map(sec=><span key={sec.sectionId} className="badge badge-blue" style={{marginRight:4}}>Sec {sec.sectionName}</span>)||'—'}</td></tr>)}</tbody></table>;
    if(t==='finalMarks') return <table><thead><tr><th>#</th><th>Student</th><th>Roll No</th><th>Sec</th><th>Subject</th><th>Semester</th><th>Mid-1/30</th><th>Mid-2/30</th><th>Final/30</th></tr></thead><tbody>{filtered.map((f,i)=><tr key={i}><td>{i+1}</td><td className="fw-600">{f.student?.name}</td><td style={{fontFamily:'monospace',fontSize:11}}>{f.student?.rollNumber}</td><td>{f.student?.section||'—'}</td><td>{f.subject?.name}</td><td>Sem {f.semester}</td><td>{f.mid1Marks}</td><td>{f.mid2Marks}</td><td className="fw-600" style={{color:'#7c3aed'}}>{f.finalMarks}/30</td></tr>)}</tbody></table>;
    return <table><thead><tr><th>#</th><th>Student</th><th>Roll No</th><th>Sec</th><th>Subject</th><th>Exam</th><th>Marks</th><th>Status</th></tr></thead><tbody>{filtered.map((m,i)=><tr key={m._id}><td>{i+1}</td><td className="fw-600">{m.student?.name}</td><td style={{fontFamily:'monospace',fontSize:11}}>{m.student?.rollNumber}</td><td>{m.student?.section||'—'}</td><td>{m.subject?.name}</td><td><span className="badge badge-blue">{m.midExam}</span></td><td className="fw-600">{m.totalMarks}/30</td><td><span className={`badge ${STATUS_BADGE[m.status]||'badge-gray'}`}>{m.status}</span>{m.isLocked&&<span className="badge badge-red" style={{marginLeft:4}}>🔒</span>}</td></tr>)}</tbody></table>;
  };

  if(loading)return <div className="loading-screen"><div className="spinner"></div></div>;
  if(!data)  return <div className="empty-state"><div className="empty-icon">⚠️</div><div className="empty-text">Failed to load</div></div>;
  const{stats}=data;
  const chartData=[{name:'Total',value:stats.submittedMarks,fill:'#1a56db'},{name:'Pending',value:stats.pendingMarks,fill:'#f59e0b'},{name:'Approved',value:stats.approvedMarks,fill:'#10b981'},{name:'Rejected',value:stats.rejectedMarks,fill:'#ef4444'}];
  const statCards=[
    {key:'submitted',        value:stats.submittedMarks,  label:'Total Marks Entered', icon:'📊',color:'blue',  title:'All Marks Entries'   },
    {key:'pending',          value:stats.pendingMarks,    label:'Pending Approval',    icon:'⏳',color:'yellow',title:'Pending (Submitted)'  },
    {key:'approved',         value:stats.approvedMarks,   label:'Approved by HOD',     icon:'✅',color:'green', title:'Approved Marks'       },
    {key:'rejected',         value:stats.rejectedMarks,   label:'Rejected by HOD',     icon:'❌',color:'red',   title:'Rejected Marks'       },
    {key:'assignedSubjects', value:stats.assignedSubjects,label:'Assigned Subjects',   icon:'📚',color:'cyan',  title:'My Assigned Subjects' },
    {key:'finalMarks',       value:'🏆',                  label:'Final Marks',         icon:'🏆',color:'purple',title:'Final Marks (Both Mids Approved)'},
  ];

  return (
    <div>
      <div className="info-box" style={{marginBottom:20}}>👩‍🏫 Welcome, <strong>{user?.name}</strong> | Dept: <strong>{user?.department?.name}</strong></div>
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
      <div className="card"><div className="card-header"><span className="card-title">📊 Marks Submission Summary</span></div><div className="card-body"><div className="chart-container"><ResponsiveContainer width="100%" height="100%"><BarChart data={chartData}><XAxis dataKey="name"/><YAxis allowDecimals={false}/><Tooltip/><Bar dataKey="value" radius={[4,4,0,0]}>{chartData.map((e,i)=><Cell key={i} fill={e.fill}/>)}</Bar></BarChart></ResponsiveContainer></div></div></div>
      {modal&&<DetailModal title={modal.title} icon={modal.icon} onClose={()=>{setModal(null);setRawData([]);clearAll();}} filterBar={filterBar} count={filtered.length}>{renderContent()}</DetailModal>}
    </div>
  );
}
