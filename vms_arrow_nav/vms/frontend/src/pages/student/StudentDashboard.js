import React, { useEffect, useState, useMemo } from 'react';
import axios from 'axios';
import { useAuth } from '../../context/AuthContext';
import AnimatedNumber from '../../components/AnimatedNumber';

function FilterBar({filters,onClear}) {
  const hasAny=filters.some(f=>f.value);
  return (
    <div className='filter-bar-inner'>
      {filters.map((f,i)=>
        <input key={i} className="form-input-sm" style={{width:f.width||120,minWidth:80,fontSize:11,padding:'4px 8px',flexShrink:0}} placeholder={f.placeholder} value={f.value} onChange={e=>f.onChange(e.target.value)}/>
      )}
      {hasAny&&<button className="btn btn-outline btn-sm" style={{fontSize:11,padding:'4px 8px',whiteSpace:'nowrap',flexShrink:0}} onClick={onClear}>✕ Clear</button>}
    </div>
  );
}

function DetailModal({title,icon,onClose,filterBar,children,count}) {
  return (
    <div className="modal-overlay" onClick={e=>e.target===e.currentTarget&&onClose()}>
      <div className="modal" style={{maxWidth:720}}>
        <div className="modal-header"><span className="modal-title">{icon} {title}</span><button className="modal-close" onClick={onClose}>×</button></div>
        {filterBar}
        <div style={{maxHeight:'60vh',overflowY:'auto'}}>{children}</div>
        <div style={{padding:'10px 20px',borderTop:'1px solid var(--border)',fontSize:12,color:'var(--text-muted)',background:'#f8fafc'}}>Showing <strong>{count}</strong> record{count!==1?'s':''}</div>
      </div>
    </div>
  );
}

export default function StudentDashboard() {
  const {user}=useAuth();
  const [data,setData]=useState(null); const [loading,setLoading]=useState(true);
  const [modal,setModal]=useState(null); const [rawData,setRawData]=useState([]);
  const [loadingModal,setLoadingModal]=useState(false);
  const [fSearch,setFSearch]=useState(''); const [fCode,setFCode]=useState('');

  useEffect(()=>{axios.get('/api/student/stats').then(r=>{setData(r.data);setLoading(false);}).catch(()=>setLoading(false));},[]);

  const openModal=async(type,title,icon)=>{
    if(type==='semester')return; // no modal for current semester
    setModal({type,title,icon}); setRawData([]); setFSearch(''); setFCode(''); setLoadingModal(true);
    try {
      const res=await axios.get('/api/student/marks');
      const all=[];
      res.data.subjects.forEach(g=>{
        // Only current semester subjects
        if(g.subject?.semester!==user?.semester) return;
        if(type==='subjects')      all.push({name:g.subject?.name,code:g.subject?.code,sem:g.subject?.semester});
        else if(type==='mid1'&&g.mid1) all.push({...g.mid1,subjectName:g.subject?.name,subjectCode:g.subject?.code});
        else if(type==='mid2'&&g.mid2) all.push({...g.mid2,subjectName:g.subject?.name,subjectCode:g.subject?.code});
        else if(type==='finals'&&g.finalVisible) all.push({subjectName:g.subject?.name,subjectCode:g.subject?.code,finalMarks:g.finalMarks,mid1:g.mid1?.totalMarks,mid2:g.mid2?.totalMarks});
      });
      setRawData(all);
    } catch{setRawData([]);} finally{setLoadingModal(false);}
  };

  const filtered=useMemo(()=>{
    if(!rawData.length)return rawData;
    let d=[...rawData];
    if(fSearch){const q=fSearch.toLowerCase();d=d.filter(r=>(r.subjectName||r.name)?.toLowerCase().includes(q));}
    if(fCode)  {const q=fCode.toLowerCase();  d=d.filter(r=>(r.subjectCode||r.code)?.toLowerCase().includes(q));}
    return d;
  },[rawData,fSearch,fCode]);

  const filterBarEl=modal&&modal.type!=='semester'?(
    <FilterBar filters={[
      {placeholder:'🔍 Subject name',value:fSearch,onChange:setFSearch,width:140},
      {placeholder:'🔍 Code',        value:fCode,  onChange:setFCode,  width:118},
    ]} onClear={()=>{setFSearch('');setFCode('');}}/>
  ):null;

  if(loading)return <div className="loading-screen"><div className="spinner"></div></div>;
  const {stats}=data||{stats:{}};

  const statCards=[
    {key:'semester',value:stats.currentSemester||0,label:'Current Semester',icon:'📅',color:'blue',  title:null},
    {key:'subjects',value:stats.totalSubjects||0,  label:'Total Subjects',  icon:'📚',color:'cyan',  title:'My Current Subjects'},
    {key:'mid1',    value:stats.mid1Count||0,       label:'Mid-1 Results',   icon:'📝',color:'yellow',title:'My Mid-1 Marks'},
    {key:'mid2',    value:stats.mid2Count||0,       label:'Mid-2 Results',   icon:'📋',color:'green', title:'My Mid-2 Marks'},
    {key:'finals',  value:stats.finalReadyCount||0, label:'Finals Ready',    icon:'🏆',color:'red',   title:'Final Marks Ready'},
  ];

  const patternRows=[
    {component:'Best of Q1/Q2',    max:10,note:'Higher of Q1 or Q2',       bg:'#eff6ff'},
    {component:'Best of Q3/Q4',    max:10,note:'Higher of Q3 or Q4',       bg:'#f0fdf4'},
    {component:'Best of Q5/Q6',    max:10,note:'Higher of Q5 or Q6',       bg:'#fef3c7'},
    {component:'Question Total ÷2',max:15,note:'Sum of above ÷ 2',         bg:'#f8fafc',italic:true},
    {component:'SHA',              max:10,note:'Surprise/Home Assignment',  bg:'#fff'},
    {component:'Assignment',       max:5, note:'Assignment marks',          bg:'#f8fafc'},
    {component:'Mid Total',        max:30,note:'Per mid exam',              bg:'#e0f2fe',bold:true},
    {component:'Final Marks',      max:30,note:'80% higher + 20% lower mid',bg:'#d1fae5',bold:true},
  ];

  const renderContent=()=>{
    if(loadingModal)return <div className="empty-state" style={{padding:48}}><div className="spinner" style={{margin:'0 auto'}}></div></div>;
    if(!filtered.length)return <div className="empty-state"><div className="empty-icon">📭</div><div className="empty-text">No data for current semester</div></div>;
    const t=modal.type;
    if(t==='subjects') return <table><thead><tr><th>#</th><th>Subject Name</th><th>Code</th><th>Semester</th></tr></thead><tbody>{filtered.map((m,i)=><tr key={i}><td>{i+1}</td><td className="fw-600">{m.name}</td><td><span className="badge badge-purple">{m.code}</span></td><td>Sem {m.sem}</td></tr>)}</tbody></table>;
    if(t==='finals')   return <table><thead><tr><th>#</th><th>Subject</th><th>Code</th><th>Mid-1</th><th>Mid-2</th><th>Final /30</th></tr></thead><tbody>{filtered.map((m,i)=><tr key={i}><td>{i+1}</td><td className="fw-600">{m.subjectName}</td><td><span className="badge badge-purple">{m.subjectCode}</span></td><td>{m.mid1}/30</td><td>{m.mid2}/30</td><td><strong style={{color:'var(--success)',fontSize:15}}>{m.finalMarks}/30</strong></td></tr>)}</tbody></table>;
    return <table><thead><tr><th>#</th><th>Subject</th><th>Code</th><th>Q1</th><th>Q2</th><th>Q3</th><th>Q4</th><th>Q5</th><th>Q6</th><th>Asgn</th><th>SHA</th><th>Total</th></tr></thead><tbody>{filtered.map((m,i)=><tr key={i}><td>{i+1}</td><td className="fw-600">{m.subjectName}</td><td><span className="badge badge-purple">{m.subjectCode}</span></td><td>{m.q1}</td><td>{m.q2}</td><td>{m.q3}</td><td>{m.q4}</td><td>{m.q5}</td><td>{m.q6}</td><td>{m.assignmentMarks}</td><td>{m.shaMarks}</td><td><strong style={{color:'var(--success)'}}>{m.totalMarks}/30</strong></td></tr>)}</tbody></table>;
  };

  return (
    <div>
      <div className="info-box" style={{marginBottom:20}}>
        👋 Welcome, <strong>{user?.name}</strong> &nbsp;|&nbsp; Roll: <strong>{user?.rollNumber}</strong> &nbsp;|&nbsp; Dept: <strong>{user?.department?.name}</strong> &nbsp;|&nbsp; Sem: <strong>{user?.semester}</strong>
      </div>
      <div className="stats-grid">
        {statCards.map((card,idx)=>(
          <div key={card.key} className={`stat-card ${card.color} stat-card-animated`}
            onClick={()=>card.title&&openModal(card.key,card.title,card.icon)}
            style={{'--delay':`${idx*0.08}s`,cursor:card.title?'pointer':'default',userSelect:'none'}}>
            <div className="stat-icon">{card.icon}</div>
            <div>
              <div className="stat-value"><AnimatedNumber value={card.value}/></div>
              <div className="stat-label">{card.label}</div>
              {card.title&&<div style={{fontSize:10,color:'var(--primary)',marginTop:2,fontWeight:600}}>Click to view →</div>}
            </div>
          </div>
        ))}
      </div>
      <div className="card">
        <div className="card-header"><span className="card-title">📐 Marks Pattern</span></div>
        <div className="card-body" style={{padding:0}}>
          {patternRows.map((row,i)=>(
            <div key={i} style={{display:'flex',alignItems:'center',padding:'11px 16px',background:row.bg,borderBottom:i<patternRows.length-1?'1px solid #f1f5f9':'none',gap:12}}>
              <div style={{flex:2,fontSize:13,fontWeight:row.bold?700:400,fontStyle:row.italic?'italic':'normal'}}>{row.component}</div>
              <div style={{flexShrink:0}}><span style={{display:'inline-block',padding:'2px 10px',borderRadius:20,fontSize:13,fontWeight:700,background:row.bold?'#1a56db':'#e2e8f0',color:row.bold?'white':'var(--text)',minWidth:36,textAlign:'center'}}>{row.max}</span></div>
              <div style={{flex:3,fontSize:12,color:row.bold?'var(--text)':'var(--text-muted)',textAlign:'right'}}>{row.note}</div>
            </div>
          ))}
        </div>
      </div>
      {modal&&<DetailModal title={modal.title} icon={modal.icon} onClose={()=>{setModal(null);setRawData([]);setFSearch('');setFCode('');}} filterBar={filterBarEl} count={filtered.length}>{renderContent()}</DetailModal>}
    </div>
  );
}
