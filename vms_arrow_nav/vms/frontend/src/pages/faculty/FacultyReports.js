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

// Filter: only active students + only students in this semester (not promoted)
const filterActive = (marks, sem) => marks.filter(m => m.student?.isActive !== false && (!sem || m.student?.semester === Number(sem)));

export default function FacultyReports() {
  const { user }   = useAuth();
  const [loading,  setLoading]  = useState(false);
  const [selSem,   setSelSem]   = useState('');
  const [subjects, setSubjects] = useState([]);
  const [selSubj,  setSelSubj]  = useState('');
  const [selMid,   setSelMid]   = useState('');

  useEffect(() => {
    if (!selSem) { setSubjects([]); setSelSubj(''); return; }
    axios.get('/api/faculty/subjects', { params:{ semester:selSem } }).then(r => { setSubjects(r.data.subjects||[]); setSelSubj(''); });
  }, [selSem]);

  const clearFilters = () => { setSelSem(''); setSelSubj(''); setSelMid(''); };
  const hasFilters   = selSem || selSubj || selMid;
  const wrap = async fn => { setLoading(true); try { await fn(); } catch(e) { toast.error('Export failed: '+e.message); } finally { setLoading(false); } };

  // ── Class Marks ──────────────────────────────────────────────
  const excelClassMarks = () => wrap(async () => {
    if (!selSem) return toast.error('Select semester');
    const r = await axios.get('/api/faculty/marks', { params:{ semester:selSem, ...(selSubj?{subjectId:selSubj}:{}), ...(selMid?{midExam:selMid}:{}) } });
    const marks = filterActive(r.data.marks, selSem);
    if (!marks.length) return toast.error('No marks data found');
    const subj = subjects.find(s=>s._id===selSubj);
    const firstMark = marks[0];
    const meta = {
      institute: 'VEMU INSTITUTE OF TECHNOLOGY(AUTONOMOUS)',
      dept: user?.department?.name || '',
      yearSem: `II- ${selSem} SEM`,
      subject: firstMark?.subject?.name || (subj?.name || ''),
      subjectCode: firstMark?.subject?.code || (subj?.code || ''),
      faculty: user?.name || '',
      section: firstMark?.student?.section || '',
      mid: selMid || 'All',
    };
    await exportStyledMidMarks(
      { 'Mid-1': marks.filter(m=>m.midExam==='Mid-1'), 'Mid-2': marks.filter(m=>m.midExam==='Mid-2') },
      meta,
      `VEMU_Sem${selSem}${subj?'_'+subj.code:''}_Marks.xlsx`
    ,
      selMid||""
    );
    toast.success('Excel downloaded!');
  });

  const pdfClassMarks = () => wrap(async () => {
    if (!selSem) return toast.error('Select semester');
    const r = await axios.get('/api/faculty/marks', { params:{ semester:selSem, ...(selSubj?{subjectId:selSubj}:{}), ...(selMid?{midExam:selMid}:{}) } });
    const marks = filterActive(r.data.marks, selSem);
    if (!marks.length) return toast.error('No data found');
    const subj = subjects.find(s=>s._id===selSubj);
    await exportPDF(`Semester ${selSem}${subj?' — '+subj.name:''} Marks`,`Faculty: ${user?.name}`,
      ['#','Student','Roll No','Sec','Subject','Exam','Asgn','SHA','Q-Half','Total/30','Status'],
      marks.map((m,i)=>[i+1,m.student?.name,m.student?.rollNumber,m.student?.section,m.subject?.name,m.midExam,m.assignmentMarks,m.shaMarks,m.questionHalf,m.totalMarks,m.status]),
      `VEMU_Sem${selSem}${subj?'_'+subj.code:''}_Marks.pdf`);
    toast.success('PDF downloaded!');
  });

  // ── Final Marks ──────────────────────────────────────────────
  const excelFinalMarks = () => wrap(async () => {
    if (!selSem) return toast.error('Select semester');
    const r = await axios.get('/api/faculty/final-marks', { params:{ semester:selSem } });
    const data = r.data.finalMarks||[];
    if (!data.length) return toast.error('No final marks found. Both Mid-1 and Mid-2 must be approved.');
    await exportStyledFinalMarks(data,
      { dept: user?.department?.name||'', yearSem: `II- ${selSem} SEM`, faculty: user?.name||'' },
      `VEMU_Sem${selSem}_FinalMarks.xlsx`);
    toast.success('Final marks Excel downloaded!');
  });

  const pdfFinalMarks = () => wrap(async () => {
    if (!selSem) return toast.error('Select semester');
    const r = await axios.get('/api/faculty/final-marks', { params:{ semester:selSem } });
    const data = r.data.finalMarks||[];
    if (!data.length) return toast.error('No final marks found. Both mids must be approved.');
    await exportPDF(`Final Marks — Semester ${selSem}`,`Faculty: ${user?.name}`,
      ['#','Student','Roll No','Section','Subject','Mid-1','Mid-2','Final/30'],
      data.map((f,i)=>[i+1,f.student?.name,f.student?.rollNumber,f.student?.section,f.subject?.name,f.mid1Marks,f.mid2Marks,f.finalMarks]),
      `VEMU_Sem${selSem}_FinalMarks.pdf`);
    toast.success('Final marks PDF downloaded!');
  });

  return (
    <div>
      <div className="page-header">
        <div><div className="page-title">📋 Reports</div><div className="page-subtitle">Generate marks reports for your subjects</div></div>
      </div>

      {/* Filters */}
      <div className="filter-bar" style={{ marginBottom:20 }}>
        <div>
          <label style={{ fontSize:11,fontWeight:600,display:'block',marginBottom:4,color:'var(--text-muted)' }}>Semester *</label>
          <select className="form-select" style={{ width:160 }} value={selSem} onChange={e=>setSelSem(e.target.value)}>
            <option value="">Select Semester</option>
            {SEMESTERS.map(s=><option key={s} value={s}>Semester {s}</option>)}
          </select>
        </div>
        <div>
          <label style={{ fontSize:11,fontWeight:600,display:'block',marginBottom:4,color:'var(--text-muted)' }}>Subject</label>
          <select className="form-select" style={{ width:220 }} value={selSubj} onChange={e=>setSelSubj(e.target.value)} disabled={!selSem}>
            <option value="">All Subjects</option>
            {subjects.map(s=><option key={s._id} value={s._id}>{s.name} ({s.code})</option>)}
          </select>
        </div>
        <div>
          <label style={{ fontSize:11,fontWeight:600,display:'block',marginBottom:4,color:'var(--text-muted)' }}>Exam</label>
          <select className="form-select" style={{ width:140 }} value={selMid} onChange={e=>setSelMid(e.target.value)}>
            <option value="Mid-1">Mid-1 Only</option>
            <option value="Mid-2">Mid-2 Only</option>
          </select>
        </div>
        {hasFilters && <div style={{ alignSelf:'flex-end' }}><button className="btn btn-outline btn-sm" onClick={clearFilters}>✕ Clear</button></div>}
      </div>

      {/* Class Marks Report */}
      <div className="card" style={{ marginBottom:16 }}>
        <div className="card-header"><span className="card-title">📚 Class-wise Marks Report</span></div>
        <div className="card-body">
          <p style={{ color:'var(--text-muted)',fontSize:13,marginBottom:14 }}>Download marks for your assigned subjects. Inactive students are excluded.</p>
          <div style={{ display:'flex',gap:10,flexWrap:'wrap' }}>
            <button className="btn btn-success" onClick={excelClassMarks} disabled={loading||!selSem}>📊 Download Excel</button>
            <button className="btn btn-danger"  onClick={pdfClassMarks}   disabled={loading||!selSem}>📄 Download PDF</button>
          </div>
          {!selSem && <div className="warning-box" style={{ marginTop:12,marginBottom:0 }}>⚠ Select a Semester first</div>}
        </div>
      </div>

      {/* Final Marks Report */}
      <div className="card">
        <div className="card-header"><span className="card-title">🏆 Final Marks Report (Both Mids Approved)</span></div>
        <div className="card-body">
          <p style={{ color:'var(--text-muted)',fontSize:13,marginBottom:14 }}>
            Final = <strong>80% × Higher Mid + 20% × Lower Mid</strong>. Only shown when both Mid-1 and Mid-2 are approved for a student.
          </p>
          <div style={{ display:'flex',gap:10,flexWrap:'wrap' }}>
            <button className="btn btn-success" onClick={excelFinalMarks} disabled={loading||!selSem}>📊 Download Final Excel</button>
            <button className="btn btn-danger"  onClick={pdfFinalMarks}   disabled={loading||!selSem}>📄 Download Final PDF</button>
          </div>
          {!selSem && <div className="warning-box" style={{ marginTop:12,marginBottom:0 }}>⚠ Select a Semester first</div>}
        </div>
      </div>

      {loading && <div style={{ textAlign:'center',padding:20,color:'var(--text-muted)',fontSize:13 }}>⏳ Generating report...</div>}
    </div>
  );
}
