import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { toast } from 'react-toastify';
import { useAuth } from '../../context/AuthContext';
import { exportStyledMidMarks, exportStyledFinalMarks } from '../../utils/excelUtils';

const SEMESTERS = [1,2,3,4,5,6,7,8];

async function loadXLSX() { if(window.XLSX)return window.XLSX; await new Promise((r,j)=>{const s=document.createElement('script');s.src='https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js';s.onload=r;s.onerror=j;document.head.appendChild(s);}); return window.XLSX; }
async function exportExcel(sheets,filename) { const XLSX=await loadXLSX();const wb=XLSX.utils.book_new();sheets.forEach(({name,data})=>{const ws=XLSX.utils.aoa_to_sheet(data);ws['!cols']=data[0]?.map((_,ci)=>({wch:Math.max(...data.map(r=>String(r[ci]??'').length),10)}));XLSX.utils.book_append_sheet(wb,ws,name.slice(0,31));});XLSX.writeFile(wb,filename); }
async function loadJsPDF() { if(window.jspdf)return window.jspdf.jsPDF; await new Promise((r,j)=>{const s=document.createElement('script');s.src='https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js';s.onload=r;s.onerror=j;document.head.appendChild(s);}); await new Promise((r,j)=>{const s=document.createElement('script');s.src='https://cdnjs.cloudflare.com/ajax/libs/jspdf-autotable/3.5.31/jspdf.plugin.autotable.min.js';s.onload=r;s.onerror=j;document.head.appendChild(s);}); return window.jspdf.jsPDF; }
async function exportPDF(title,subtitle,head,body,filename) { const JsPDF=await loadJsPDF();const doc=new JsPDF({orientation:'landscape'});const pw=doc.internal.pageSize.width;doc.setFontSize(16);doc.setFont('helvetica','bold');doc.text('VEMU Institute of Technology',pw/2,14,{align:'center'});doc.setFontSize(11);doc.setFont('helvetica','normal');doc.text(title,pw/2,22,{align:'center'});doc.setFontSize(9);doc.text(subtitle,pw/2,28,{align:'center'});doc.text(`Generated: ${new Date().toLocaleDateString('en-IN')}`,pw/2,34,{align:'center'});doc.autoTable({startY:40,head:[head],body,styles:{fontSize:7.5,cellPadding:2},headStyles:{fillColor:[99,102,241],textColor:255,fontStyle:'bold'},alternateRowStyles:{fillColor:[241,245,249]},margin:{left:8,right:8}});doc.save(filename); }

const filterActive = (marks, sem) => marks.filter(m => m.student?.isActive !== false && (!sem || m.student?.semester === Number(sem)));

export default function HodReports() {
  const { user }   = useAuth();
  const deptName   = user?.department?.name || 'Department';
  const deptCode   = user?.department?.code || '';
  const [loading,  setLoading]  = useState(false);
  const [sections, setSections] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [selSem,   setSelSem]   = useState('');
  const [selSec,   setSelSec]   = useState('');
  const [selSubj,  setSelSubj]  = useState('');
  const [selExam,  setSelExam]  = useState('');

  useEffect(() => {
    if (!selSem) { setSections([]); setSubjects([]); setSelSec(''); setSelSubj(''); return; }
    axios.get('/api/hod/sections', { params:{semester:selSem} }).then(r=>{setSections(r.data.sections||[]);setSelSec('');}).catch(()=>{});
    axios.get('/api/hod/subjects', { params:{semester:selSem} }).then(r=>{setSubjects(r.data.subjects||[]);setSelSubj('');}).catch(()=>{});
  }, [selSem]);

  const clearFilters = () => { setSelSem(''); setSelSec(''); setSelSubj(''); setSelExam(''); };
  const hasFilters   = selSem||selSec||selSubj||selExam;
  const wrap = async fn => { setLoading(true); try { await fn(); } catch(e) { toast.error('Export failed: '+e.message); } finally { setLoading(false); } };

  const applyFilters = (marks) => {
    let d = filterActive(marks, selSem);
    if (selSec)  d = d.filter(m => m.student?.section === selSec);
    if (selSubj) d = d.filter(m => m.subject?._id === selSubj);
    if (selExam) d = d.filter(m => m.midExam === selExam);
    return d;
  };
  const label    = () => [deptCode,selSem?`Sem${selSem}`:'',selSec?`Sec${selSec}`:'',selExam||''].filter(Boolean).join('_');
  const subtitle = () => [deptName,selSem?`Semester ${selSem}`:'',selSec?`Section ${selSec}`:'',selSubj?subjects.find(s=>s._id===selSubj)?.name:'',selExam||''].filter(Boolean).join(' | ');

  const col     = ['#','Student','Roll No','Section','Subject','Code','Exam','Asgn/5','SHA/10','Q1','Q2','Q3','Q4','Q5','Q6','Best Q1/Q2','Best Q3/Q4','Best Q5/Q6','Q-Half/15','Total/30','Faculty','Status'];
  const makeRows = arr => arr.map((m,i)=>[i+1,m.student?.name,m.student?.rollNumber,m.student?.section,m.subject?.name,m.subject?.code,m.midExam,m.assignmentMarks,m.shaMarks,m.q1,m.q2,m.q3,m.q4,m.q5,m.q6,m.bestQ1Q2,m.bestQ3Q4,m.bestQ5Q6,m.questionHalf,m.totalMarks,m.faculty?.name,m.status]);

  const excelClassWise = () => wrap(async () => {
    if (!selSem) return toast.error('Select a Semester');
    const r = await axios.get('/api/hod/marks', { params:{semester:selSem} });
    const filtered = applyFilters(r.data.marks);
    if (!filtered.length) return toast.error('No data found');
    const lbl = label();
    const first = filtered[0];
    const meta = {
      dept: deptName,
      yearSem: `II- ${selSem} SEM`,
      subject: first?.subject?.name || '',
      subjectCode: first?.subject?.code || '',
      faculty: first?.faculty?.name || '',
      section: selSec || '',
    };
    await exportStyledMidMarks(
      { 'Mid-1': filtered.filter(m=>m.midExam==='Mid-1'), 'Mid-2': filtered.filter(m=>m.midExam==='Mid-2') },
      meta,
      `VEMU_${lbl}_Report.xlsx`
    ,
      selExam||""
    );
    toast.success('Excel downloaded!');
  });

  const pdfClassWise = () => wrap(async () => {
    if (!selSem) return toast.error('Select a Semester');
    const r = await axios.get('/api/hod/marks', { params:{semester:selSem} });
    const filtered = applyFilters(r.data.marks);
    if (!filtered.length) return toast.error('No data found');
    await exportPDF(`${deptName} — Class Marks Report`,subtitle(),
      ['#','Student','Roll No','Section','Subject','Exam','Asgn','SHA','Q-Half','Total/30','Faculty','Status'],
      filtered.map((m,i)=>[i+1,m.student?.name,m.student?.rollNumber,m.student?.section,m.subject?.name,m.midExam,m.assignmentMarks,m.shaMarks,m.questionHalf,m.totalMarks,m.faculty?.name,m.status]),
      `VEMU_${label()}_Report.pdf`);
    toast.success('PDF downloaded!');
  });

  const excelFinalMarks = () => wrap(async () => {
    if (!selSem) return toast.error('Select a Semester');
    const r = await axios.get('/api/hod/final-marks', { params:{semester:selSem} });
    let data = r.data.finalMarks||[];
    if (selSec)  data = data.filter(f=>f.student?.section===selSec);
    if (selSubj) data = data.filter(f=>f.subject?._id===selSubj);
    if (!data.length) return toast.error('No final marks found. Both mids must be approved.');
    await exportStyledFinalMarks(data,
      { dept: deptName, yearSem: `II- ${selSem} SEM`, faculty: '' },
      `VEMU_${deptCode}_Sem${selSem}_FinalMarks.xlsx`);
    toast.success('Final marks Excel downloaded!');
  });

  const pdfFinalMarks = () => wrap(async () => {
    if (!selSem) return toast.error('Select a Semester');
    const r = await axios.get('/api/hod/final-marks', { params:{semester:selSem} });
    let data = r.data.finalMarks||[];
    if (selSec)  data = data.filter(f=>f.student?.section===selSec);
    if (selSubj) data = data.filter(f=>f.subject?._id===selSubj);
    if (!data.length) return toast.error('No final marks found.');
    await exportPDF(`${deptName} — Final Marks — Semester ${selSem}`,`Semester ${selSem}`,
      ['#','Student','Roll No','Section','Subject','Mid-1','Mid-2','Final/30'],
      data.map((f,i)=>[i+1,f.student?.name,f.student?.rollNumber,f.student?.section,f.subject?.name,f.mid1Marks,f.mid2Marks,f.finalMarks]),
      `VEMU_${deptCode}_Sem${selSem}_FinalMarks.pdf`);
    toast.success('Final marks PDF downloaded!');
  });

  const FilterSelect = ({ label:lb, value, onChange, options, placeholder, width=140, disabled=false }) => (
    <div>
      <label style={{ fontSize:11,fontWeight:600,display:'block',marginBottom:4,color:'var(--text-muted)' }}>{lb}</label>
      <select className="form-select" style={{ width,fontSize:12 }} value={value} onChange={e=>onChange(e.target.value)} disabled={disabled}>
        <option value="">{placeholder}</option>
        {options.map(o=><option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    </div>
  );

  return (
    <div>
      <div className="page-header">
        <div><div className="page-title">📋 Reports</div><div className="page-subtitle">{deptName} — Generate marks reports</div></div>
      </div>

      {/* Shared Filters */}
      <div className="card" style={{ marginBottom:16 }}>
        <div className="card-header"><span className="card-title">🔍 Filters (apply to all reports below)</span></div>
        <div className="card-body">
          <div style={{ display:'flex',gap:8,flexWrap:'wrap',alignItems:'flex-end' }}>
            <FilterSelect lb="Semester *" value={selSem} onChange={setSelSem} placeholder="Select Sem" options={SEMESTERS.map(s=>({value:s,label:`Semester ${s}`}))} width={150}/>
            <FilterSelect lb="Section" value={selSec} onChange={setSelSec} placeholder="All Sections" options={sections.map(s=>({value:s.name,label:`Section ${s.name}`}))} width={130} disabled={!selSem}/>
            <FilterSelect lb="Subject" value={selSubj} onChange={setSelSubj} placeholder="All Subjects" options={subjects.map(s=>({value:s._id,label:`${s.name} (${s.code})`}))} width={200} disabled={!selSem}/>
            <FilterSelect lb="Exam" value={selExam} onChange={setSelExam} placeholder="Select Exam" options={[{value:'Mid-1',label:'Mid-1'},{value:'Mid-2',label:'Mid-2'}]} width={120}/>
            {hasFilters && <div style={{ alignSelf:'flex-end' }}><button className="btn btn-outline btn-sm" onClick={clearFilters}>✕ Clear</button></div>}
          </div>
          {hasFilters && <div className="info-box" style={{ marginTop:12,marginBottom:0,fontSize:12 }}>📌 {subtitle()} | Active students only</div>}
        </div>
      </div>

      {/* Class Marks */}
      <div className="card" style={{ marginBottom:16 }}>
        <div className="card-header"><span className="card-title">📚 Class-wise Marks Report</span></div>
        <div className="card-body">
          <div style={{ display:'flex',gap:10,flexWrap:'wrap' }}>
            <button className="btn btn-success" onClick={excelClassWise} disabled={loading||!selSem}>📊 Download Excel</button>
            <button className="btn btn-danger"  onClick={pdfClassWise}   disabled={loading||!selSem}>📄 Download PDF</button>
          </div>
          {!selSem && <div className="warning-box" style={{ marginTop:12,marginBottom:0 }}>⚠ Select a Semester to enable</div>}
        </div>
      </div>

      {/* Final Marks */}
      <div className="card">
        <div className="card-header"><span className="card-title">🏆 Final Marks Report</span></div>
        <div className="card-body">
          <p style={{ color:'var(--text-muted)',fontSize:13,marginBottom:14 }}>Final = <strong>80% × Higher Mid + 20% × Lower Mid</strong>. Requires both mids approved.</p>
          <div style={{ display:'flex',gap:10,flexWrap:'wrap' }}>
            <button className="btn btn-success" onClick={excelFinalMarks} disabled={loading||!selSem}>📊 Download Final Excel</button>
            <button className="btn btn-danger"  onClick={pdfFinalMarks}   disabled={loading||!selSem}>📄 Download Final PDF</button>
          </div>
          {!selSem && <div className="warning-box" style={{ marginTop:12,marginBottom:0 }}>⚠ Select a Semester to enable</div>}
        </div>
      </div>

      {loading && <div style={{ textAlign:'center',padding:20,color:'var(--text-muted)',fontSize:13 }}>⏳ Generating report...</div>}
    </div>
  );
}
