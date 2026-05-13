import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { toast } from 'react-toastify';
import { useAuth } from '../../context/AuthContext';
import { exportStyledMidMarks, exportStyledFinalMarks } from '../../utils/excelUtils';

async function loadXLSX() { if(window.XLSX)return window.XLSX; await new Promise((res,rej)=>{const s=document.createElement('script');s.src='https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js';s.onload=res;s.onerror=rej;document.head.appendChild(s);}); return window.XLSX; }
async function exportExcel(sheets,filename) { const XLSX=await loadXLSX();const wb=XLSX.utils.book_new();sheets.forEach(({name,data})=>{const ws=XLSX.utils.aoa_to_sheet(data);ws['!cols']=data[0]?.map((_,ci)=>({wch:Math.max(...data.map(r=>String(r[ci]??'').length),10)}));XLSX.utils.book_append_sheet(wb,ws,name.slice(0,31));});XLSX.writeFile(wb,filename); }
async function loadJsPDF() { if(window.jspdf)return window.jspdf.jsPDF; await new Promise((res,rej)=>{const s=document.createElement('script');s.src='https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js';s.onload=res;s.onerror=rej;document.head.appendChild(s);}); await new Promise((res,rej)=>{const s=document.createElement('script');s.src='https://cdnjs.cloudflare.com/ajax/libs/jspdf-autotable/3.5.31/jspdf.plugin.autotable.min.js';s.onload=res;s.onerror=rej;document.head.appendChild(s);}); return window.jspdf.jsPDF; }

async function exportPDF(title,subtitle,head,body,filename) {
  const JsPDF=await loadJsPDF();
  const doc=new JsPDF({orientation:'landscape'});
  doc.setFontSize(16);doc.setFont('helvetica','bold');
  doc.text('VEMU Institute of Technology',doc.internal.pageSize.width/2,15,{align:'center'});
  doc.setFontSize(12);doc.setFont('helvetica','normal');
  doc.text(title,doc.internal.pageSize.width/2,23,{align:'center'});
  doc.setFontSize(10);
  doc.text(subtitle,doc.internal.pageSize.width/2,30,{align:'center'});
  doc.text(`Generated: ${new Date().toLocaleDateString('en-IN')}`,doc.internal.pageSize.width/2,36,{align:'center'});
  doc.autoTable({startY:42,head:[head],body,styles:{fontSize:8,cellPadding:2},headStyles:{fillColor:[26,86,219],textColor:255,fontStyle:'bold'},alternateRowStyles:{fillColor:[241,245,249]},margin:{left:10,right:10}});
  doc.save(filename);
}

const SEMESTERS = [1,2,3,4,5,6,7,8];

export default function StudentReports() {
  const { user } = useAuth();
  const [loading,   setLoading]   = useState(false);
  const [selSem,    setSelSem]    = useState('');
  const [selExam,   setSelExam]   = useState('');
  const [allMarks,  setAllMarks]  = useState([]);
  const [preview,   setPreview]   = useState(null);

  // Load all marks once
  useEffect(() => {
    axios.get('/api/student/marks').then(r => setAllMarks(r.data.subjects||[])).catch(()=>{});
  }, []);

  // Build preview when semester selected
  useEffect(() => {
    if (!selSem) { setPreview(null); return; }
    const semSubjects = allMarks.filter(g => g.subject?.semester === Number(selSem));
    setPreview(semSubjects);
  }, [selSem, allMarks]);

  const clearFilters = () => { setSelSem(''); setSelExam(''); };

  const wrap = async fn => { setLoading(true); try { await fn(); } catch(e) { toast.error('Export failed: '+e.message); } finally { setLoading(false); } };

  const computeFinal = (m1, m2) => Math.round(0.8*Math.max(m1,m2) + 0.2*Math.min(m1,m2));

  const buildRows = (semSubjects, mid) => semSubjects.map((g,i) => {
    const m = mid==='Mid-1' ? g.mid1 : mid==='Mid-2' ? g.mid2 : null;
    if (!m) return [i+1, g.subject?.name||'—', g.subject?.code||'—', '—','—','—','—','—','—','—','—','—','Not entered'];
    return [i+1, g.subject?.name||'—', g.subject?.code||'—', m.q1,m.q2,m.q3,m.q4,m.q5,m.q6, m.assignmentMarks,m.shaMarks,m.totalMarks, m.status];
  });

  const excelMyMarks = () => wrap(async () => {
    const sem = selSem || 'All';
    const semSubjects = selSem
      ? allMarks.filter(g=>g.subject?.semester===Number(selSem))
      : allMarks;
    if (!semSubjects.length) return toast.error('No marks data found');

    // Build student-row objects that match the mark shape exportStyledMidMarks expects
    const toMarkRows = (mid) => semSubjects.map(g => {
      const m = mid==='Mid-1' ? g.mid1 : g.mid2;
      return {
        student: { name: user?.name, rollNumber: user?.rollNumber, section: user?.section || '' },
        subject: g.subject,
        q1: m?.q1, q2: m?.q2, q3: m?.q3, q4: m?.q4, q5: m?.q5,
        assignmentMarks: m?.assignmentMarks,
        shaMarks: m?.shaMarks,
        questionHalf: m?.questionHalf,
        totalMarks: m?.totalMarks,
        status: m?.status,
      };
    });

    const meta = {
      dept: user?.department?.name || '',
      yearSem: `Semester ${sem}`,
      subject: semSubjects[0]?.subject?.name || '',
      subjectCode: semSubjects[0]?.subject?.code || '',
      faculty: '',
      section: user?.section || '',
    };

    await exportStyledMidMarks(
      { 'Mid-1': toMarkRows('Mid-1'), 'Mid-2': toMarkRows('Mid-2') },
      meta,
      `VEMU_MyMarks_${user?.rollNumber}_Sem${sem}.xlsx`
    ,
      ""
    );
    toast.success('My marks Excel downloaded!');
  });

  const pdfMyMarks = (mid) => wrap(async () => {
    const sem = selSem || 'All';
    const semSubjects = selSem
      ? allMarks.filter(g=>g.subject?.semester===Number(selSem))
      : allMarks;

    if (mid === 'final') {
      const rows = semSubjects.filter(g=>g.finalVisible).map((g,i)=>[i+1,g.subject?.name||'—',g.subject?.code||'—',g.mid1?.totalMarks||'—',g.mid2?.totalMarks||'—',g.finalMarks]);
      if (!rows.length) return toast.error('No final marks available yet');
      await exportPDF(
        `My Final Marks — Semester ${sem}`,
        `${user?.name} (${user?.rollNumber}) | ${user?.department?.name}`,
        ['#','Subject','Code','Mid-1','Mid-2','Final/30'],
        rows,
        `VEMU_FinalMarks_${user?.rollNumber}_Sem${sem}.pdf`
      );
    } else {
      const rows = buildRows(semSubjects, mid);
      await exportPDF(
        `My ${mid} Marks — Semester ${sem}`,
        `${user?.name} (${user?.rollNumber}) | ${user?.department?.name}`,
        ['#','Subject','Code','Q1','Q2','Q3','Q4','Q5','Q6','Asgn/5','SHA/10','Total/30','Status'],
        rows,
        `VEMU_${mid.replace('-','')}_${user?.rollNumber}_Sem${sem}.pdf`
      );
    }
    toast.success('PDF downloaded!');
  });

  return (
    <div>
      <div className="page-header">
        <div><div className="page-title">📋 My Reports</div><div className="page-subtitle">Download your mid marks for any semester</div></div>
      </div>

      {/* Student info banner */}
      <div className="info-box" style={{ marginBottom:20 }}>
        👨‍🎓 <strong>{user?.name}</strong> &nbsp;|&nbsp; Roll: <strong>{user?.rollNumber}</strong> &nbsp;|&nbsp;
        Dept: <strong>{user?.department?.name}</strong> &nbsp;|&nbsp; Current Sem: <strong>{user?.semester}</strong>
      </div>

      {/* Semester selector */}
      <div className="card" style={{ marginBottom:20 }}>
        <div className="card-header"><span className="card-title">🎓 Select Semester to Download</span></div>
        <div className="card-body">
          <p style={{ color:'var(--text-muted)',fontSize:13,marginBottom:14 }}>
            Choose a semester to preview and download your marks. Leave blank to download all semesters together.
          </p>
          <div style={{ display:'flex', gap:8, flexWrap:'wrap', alignItems:'flex-end', marginBottom:16 }}>
            <div>
              <label style={{ fontSize:11,fontWeight:600,display:'block',marginBottom:4,color:'var(--text-muted)' }}>Semester</label>
              <select className="form-select" style={{ width:180,fontSize:12 }} value={selSem} onChange={e=>setSelSem(e.target.value)}>
                <option value="">All Semesters</option>
                {SEMESTERS.map(s=><option key={s} value={s}>Semester {s}</option>)}
              </select>
            </div>
            <div>
              <label style={{ fontSize:11,fontWeight:600,display:'block',marginBottom:4,color:'var(--text-muted)' }}>Exam (for PDF)</label>
              <select className="form-select" style={{ width:140,fontSize:12 }} value={selExam} onChange={e=>setSelExam(e.target.value)}>
                <option value="">Both Mids</option>
                <option value="Mid-1">Mid-1 Only</option>
                <option value="Mid-2">Mid-2 Only</option>
              </select>
            </div>
            {(selSem||selExam) && (
              <div style={{ alignSelf:'flex-end' }}>
                <button className="btn btn-outline btn-sm" onClick={clearFilters} style={{ fontSize:11 }}>✕ Clear</button>
              </div>
            )}
            {selSem && preview && (
              <div style={{ alignSelf:'flex-end' }}>
                <span className="badge badge-blue" style={{ fontSize:13 }}>
                  {preview.length} subject{preview.length!==1?'s':''} found
                </span>
              </div>
            )}
          </div>

          {/* Preview table */}
          {preview && preview.length > 0 && (
            <div className="table-wrapper" style={{ marginBottom:16 }}>
              <table>
                <thead>
                  <tr><th>#</th><th>Subject</th><th>Code</th><th>Mid-1</th><th>Mid-2</th><th>Final</th></tr>
                </thead>
                <tbody>
                  {preview.map((g,i) => (
                    <tr key={i}>
                      <td>{i+1}</td>
                      <td className="fw-600">{g.subject?.name}</td>
                      <td><span className="badge badge-purple">{g.subject?.code}</span></td>
                      <td>{g.mid1 ? <span className="text-success fw-600">{g.mid1.totalMarks}/30</span> : <span className="text-muted">—</span>}</td>
                      <td>{g.mid2 ? <span className="text-success fw-600">{g.mid2.totalMarks}/30</span> : <span className="text-muted">—</span>}</td>
                      <td>{g.finalVisible ? <span style={{ color:'var(--primary)',fontWeight:700 }}>🏆 {g.finalMarks}/30</span> : <span className="text-muted">Pending</span>}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Download buttons */}
          <div style={{ borderTop:'1px solid var(--border)', paddingTop:16 }}>
            <div style={{ fontSize:13, fontWeight:600, marginBottom:10, color:'var(--text-muted)' }}>⬇ Download Options:</div>
            <div style={{ display:'flex', gap:10, flexWrap:'wrap' }}>
              <button className="btn btn-success" onClick={excelMyMarks} disabled={loading}>
                📊 Download Excel {selExam?`(${selExam})` : '(Mid-1 + Mid-2 + Final)'}
              </button>
              {(!selExam || selExam==='Mid-1') && (
                <button className="btn btn-danger btn-sm" onClick={()=>pdfMyMarks('Mid-1')} disabled={loading}>📄 Mid-1 PDF</button>
              )}
              {(!selExam || selExam==='Mid-2') && (
                <button className="btn btn-danger btn-sm" onClick={()=>pdfMyMarks('Mid-2')} disabled={loading}>📄 Mid-2 PDF</button>
              )}
              <button className="btn btn-primary btn-sm" onClick={()=>pdfMyMarks('final')} disabled={loading}>🏆 Final Marks PDF</button>
            </div>
          </div>
        </div>
      </div>

      {loading && <div style={{ textAlign:'center',padding:20,color:'var(--text-muted)',fontSize:13 }}>⏳ Generating report...</div>}
    </div>
  );
}
