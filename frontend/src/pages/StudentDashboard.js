import React, { useState, useEffect } from 'react';
import Layout from '../components/Layout';
import { getMyMarks, getSettings } from '../api';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';
import { downloadStudentMarksCard } from '../utils/pdfGenerator';

const NAV = [
  { label: 'MAIN', items: [
    { key: 'marks',   icon: '📊', label: 'My Marks' },
    { key: 'profile', icon: '👤', label: 'My Profile' },
  ]},
];

/* ── Secure calculation helpers ──────────────────────────────────── */
function computeGrand(mid) {
  const q1    = Math.min(mid?.q1 || 0, 10);
  const partB = ((mid?.q2||0) + (mid?.q3||0) + (mid?.q4||0)) / 2;
  const exam  = Math.min(q1 + partB, 25);
  return Math.min(exam + Math.min(mid?.assignment||0, 5), 30);
}
function computeInternal(m) {
  const g1 = computeGrand(m.mid1), g2 = computeGrand(m.mid2);
  const best = Math.max(g1,g2), sec = Math.min(g1,g2);
  return Math.round((best*0.8 + sec*0.2)*2)/2;
}
function bestTwoIdx(scores) {
  const rem=[...scores], picked=[];
  for(let k=0;k<2;k++){const i=rem.indexOf(Math.max(...rem));picked.push(i);rem[i]=-1;}
  return picked;
}
function getRequiredMid2(m1) {
  let req = (15 - 0.8 * m1) / 0.2;
  if (req <= m1) return Math.max(0, Math.ceil(req));
  return Math.max(0, Math.ceil((15 - 0.2 * m1) / 0.8));
}

/* ── Tiny sub-components ─────────────────────────────────────────── */
function BarRow({ label, value, max, colorVar, bgVar }) {
  return (
    <div style={{display:'flex',alignItems:'center',gap:10}}>
      <div style={{width:90,fontSize:11,fontWeight:600,color:`var(${colorVar})`}}>{label}</div>
      <div style={{flex:1,background:`var(${bgVar})`,borderRadius:8,height:7,overflow:'hidden'}}>
        <div style={{width:`${Math.min((value/max)*100,100)}%`,background:`var(${colorVar})`,height:'100%',borderRadius:8,transition:'width .4s'}}/>
      </div>
      <div style={{width:46,textAlign:'right',fontSize:12,fontWeight:700,color:`var(${colorVar})`}}>
        {value}<span style={{color:'var(--muted)',fontSize:10}}>/{max}</span>
      </div>
    </div>
  );
}

/* ── Main component ──────────────────────────────────────────────── */
export default function StudentDashboard() {
  const {user} = useAuth();
  const [page, setPage]         = useState('marks');
  const [marks, setMarks]       = useState([]);
  const [settings, setSettings] = useState({});
  const [loading, setLoading]   = useState(true);
  const [activeTab, setActiveTab] = useState({});

  useEffect(()=>{ loadData(); },[]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [rM, rS] = await Promise.all([getMyMarks(), getSettings()]);
      setMarks(rM.data);
      setSettings(rS.data);
    } catch { toast.error('Could not load data'); }
    setLoading(false);
  };

  const computedList  = marks.map(m=>computeInternal(m));
  const [pdfLoading, setPdfLoading] = useState(false);

  const handleDownloadPdf = async () => {
    if (marks.length === 0) { toast.error('No marks to download'); return; }
    setPdfLoading(true);
    try {
      await downloadStudentMarksCard(user, marks);
      toast.success('📄 Marks Card downloaded!');
    } catch (e) {
      console.error(e);
      toast.error('PDF generation failed');
    }
    setPdfLoading(false);
  };
  const avgInternal   = marks.length ? (computedList.reduce((a,v)=>a+v,0)/marks.length).toFixed(1) : '0.0';
  const passed        = computedList.filter(v=>v>=15).length;
  const highScore     = computedList.length ? Math.max(...computedList) : 0;

  const getTab = (i) => activeTab[i] || 'mid1';
  const setTab = (i, t) => setActiveTab(p=>({...p,[i]:t}));

  return (
    <Layout navItems={NAV} activePage={page} onNavClick={setPage}>
      {page==='marks' && (
        <div style={{maxWidth:1100,margin:'0 auto'}}>

          {/* ── TOP ICON ACTION BAR ─────────────────────────────── */}
          <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:24,flexWrap:'wrap',gap:12}}>
            <div>
              <div style={{fontSize:11,letterSpacing:2,color:'var(--gold)',textTransform:'uppercase',fontWeight:700,marginBottom:4}}>VEMU Academic Portal</div>
              <h2 style={{margin:0,fontSize:26,fontWeight:800,color:'var(--navy)',display:'flex',alignItems:'center',gap:10}}>
                <span style={{fontSize:28}}>📊</span> My Academic Report
              </h2>
            </div>
            <div style={{display:'flex',gap:10}}>
                {[
                  {icon:'📥', label: pdfLoading ? 'Generating…' : 'Download PDF', onClick: handleDownloadPdf, className:'btn-success', style:{background:'linear-gradient(135deg,#16a34a,#22c55e)',color:'#fff',border:'none'}},
                  {icon:'🖨️', label:'Print',   onClick:()=>window.print(), className:'btn-primary'},
                  {icon:'🔄', label:'Refresh', onClick:loadData,          className:'btn-logout', style:{color:'var(--navy)',borderColor:'var(--border)'}},
                ].map((btn,i)=>(
                  <button key={i} onClick={btn.onClick} disabled={btn.label.includes('Generating')} className={btn.className} style={{display:'flex',alignItems:'center',gap:7,padding:'9px 18px',borderRadius:10,cursor:'pointer',fontFamily:'Outfit,sans-serif',fontSize:13,fontWeight:600,transition:'all .2s',...btn.style}}
                    onMouseEnter={e=>e.currentTarget.style.opacity='.85'}
                    onMouseLeave={e=>e.currentTarget.style.opacity='1'}>
                    <span style={{fontSize:15}}>{btn.icon}</span> {btn.label}
                  </button>
                ))}
            </div>
          </div>

          {/* ── PROFILE HERO ────────────────────────────────────── */}
          <div style={{background:'linear-gradient(135deg,var(--navy) 0%,var(--navy-mid) 60%,var(--navy-deep) 100%)',borderRadius:20,padding:'28px 32px',marginBottom:24,position:'relative',overflow:'hidden',boxShadow:'0 20px 40px rgba(0,0,0,.15)'}}>
            <div style={{position:'absolute',top:-60,right:-60,width:220,height:220,borderRadius:'50%',background:'var(--gold)',filter:'blur(80px)',opacity:.18}}/>
            <div style={{position:'absolute',bottom:-60,left:80,width:180,height:180,borderRadius:'50%',background:'var(--blue)',filter:'blur(70px)',opacity:.12}}/>

            <div style={{display:'flex',gap:24,alignItems:'center',position:'relative',zIndex:1,flexWrap:'wrap'}}>
              <div style={{width:80,height:80,borderRadius:'50%',background:'linear-gradient(135deg,var(--gold),#a17320)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:38,border:'3px solid rgba(255,255,255,.15)',flexShrink:0,boxShadow:'0 8px 20px rgba(0,0,0,.3)'}}>🎓</div>

              <div style={{flex:1,minWidth:200}}>
                <div style={{fontSize:22,fontWeight:800,color:'#fff',fontFamily:"'Cormorant Garamond',serif",marginBottom:8}}>{user?.name}</div>
                <div style={{display:'flex',gap:16,flexWrap:'wrap'}}>
                  {[
                    {icon:'🆔', val: user?.rollNo||'N/A'},
                    {icon:'🏛️', val: user?.department||'N/A'},
                    {icon:'📅', val: `Sem ${user?.semester||'—'} · Sec ${user?.section||'—'}`},
                  ].map((t,i)=>(
                    <div key={i} style={{display:'flex',alignItems:'center',gap:5,fontSize:12,color:'rgba(255,255,255,.7)',fontWeight:500}}>
                      <span style={{color:'var(--gold)'}}>{t.icon}</span>{t.val}
                    </div>
                  ))}
                </div>
              </div>

              <div style={{display:'flex',gap:12,flexWrap:'wrap'}}>
                {[
                  {icon:'📚', val:marks.length, label:'Subjects', color:'#93c5fd'},
                  {icon:'⭐', val:avgInternal,   label:'Avg / 30',  color:'var(--gold2)'},
                  {icon:'✅', val:`${passed}/${marks.length}`, label:'Passed', color:'#4ade80'},
                  {icon:'🏆', val:highScore,     label:'Top Score', color:'#f9a8d4'},
                ].map((s,i)=>(
                  <div key={i} style={{textAlign:'center',padding:'12px 18px',background:'rgba(255,255,255,.06)',borderRadius:14,border:'1px solid rgba(255,255,255,.1)',backdropFilter:'blur(10px)',minWidth:80}}>
                    <div style={{fontSize:20,marginBottom:2}}>{s.icon}</div>
                    <div style={{fontSize:22,fontWeight:700,color:s.color,fontFamily:"'Cormorant Garamond',serif",lineHeight:1}}>{s.val}</div>
                    <div style={{fontSize:9,color:'rgba(255,255,255,.45)',textTransform:'uppercase',letterSpacing:.8,marginTop:3}}>{s.label}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* ── SECTION TITLE ───────────────────────────────────── */}
          <div style={{display:'flex',alignItems:'center',gap:10,marginBottom:20}}>
            <span style={{fontSize:18}}>📋</span>
            <h3 style={{margin:0,fontSize:17,fontWeight:700,color:'var(--navy)'}}>Subject-wise Internal Marks</h3>
            <div style={{flex:1,height:1,background:'linear-gradient(90deg,var(--border),transparent)'}}/>
            <div style={{fontSize:11,color:'var(--muted)',background:'var(--bg)',padding:'3px 10px',borderRadius:20,fontWeight:600}}>
              Pass Mark: 15 / 30
            </div>
          </div>

          {/* ── MARKS CARDS ─────────────────────────────────────── */}
          {loading ? (
            <div style={{textAlign:'center',padding:80,color:'var(--muted)'}}>
              <div style={{fontSize:40,marginBottom:12}}>⏳</div>
              <div style={{fontSize:15,fontWeight:500}}>Loading your marks…</div>
            </div>
          ) : marks.length===0 ? (
            <div style={{textAlign:'center',padding:80,color:'var(--muted)',background:'var(--bg)',borderRadius:16,border:'1px dashed var(--border)'}}>
              <div style={{fontSize:48,marginBottom:12}}>📭</div>
              <div style={{fontSize:16,fontWeight:600,color:'var(--blue)',marginBottom:6}}>No marks yet</div>
              <div style={{fontSize:13}}>Your faculty hasn't submitted marks for your profile yet.</div>
            </div>
          ) : (
            <div style={{display:'flex',flexDirection:'column',gap:20}}>
              {marks.map((m, i) => {
                const q1_1=Math.min(m.mid1?.q1||0,10), bs1=[m.mid1?.q2||0,m.mid1?.q3||0,m.mid1?.q4||0];
                const sumB1=bs1[0]+bs1[1]+bs1[2], ex1=Math.min(q1_1+(sumB1/2),25);
                const gr1=Math.min(ex1+Math.min(m.mid1?.assignment||0,5),30);

                const q1_2=Math.min(m.mid2?.q1||0,10), bs2=[m.mid2?.q2||0,m.mid2?.q3||0,m.mid2?.q4||0];
                const sumB2=bs2[0]+bs2[1]+bs2[2], ex2=Math.min(q1_2+(sumB2/2),25);
                const gr2=Math.min(ex2+Math.min(m.mid2?.assignment||0,5),30);

                const internal = computeInternal(m);
                const isPassing = internal>=15;
                const tab = getTab(i);

                const midData = tab==='mid1' 
                  ? {q1:q1_1,bs:bs1,ex:ex1,gr:gr1,asgn:Math.min(m.mid1?.assignment||0,5)}
                  : {q1:q1_2,bs:bs2,ex:ex2,gr:gr2,asgn:Math.min(m.mid2?.assignment||0,5)};

                const mid1Empty = (!m.mid1 || (m.mid1.q1===0 && m.mid1.q2===0 && m.mid1.q3===0 && m.mid1.q4===0 && m.mid1.assignment===0));
                const mid2Empty = (!m.mid2 || (m.mid2.q1===0 && m.mid2.q2===0 && m.mid2.q3===0 && m.mid2.q4===0 && m.mid2.assignment===0));

                return (
                  <div key={i} style={{borderRadius:18,overflow:'hidden',boxShadow:'0 4px 20px rgba(0,0,0,.03)',border:`1px solid var(${isPassing?'--green':'--red'})`,background:'var(--white)',transition:'transform .25s, box-shadow .25s'}}
                    onMouseEnter={e=>{e.currentTarget.style.transform='translateY(-3px)';e.currentTarget.style.boxShadow='0 10px 30px rgba(0,0,0,.08)'}}
                    onMouseLeave={e=>{e.currentTarget.style.transform='none';e.currentTarget.style.boxShadow='0 4px 20px rgba(0,0,0,.03)'}}>

                    <div style={{height:4,background:`var(${isPassing?'--green':'--red'})`}}/>

                    <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',flexWrap:'wrap',gap:12,padding:'18px 24px',borderBottom:'1px solid var(--border)'}}>
                      <div>
                        <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:4}}>
                          <span style={{fontSize:10,fontWeight:700,letterSpacing:1.5,color:'var(--muted)',textTransform:'uppercase'}}>{m.subjectCode}</span>
                          <span className={`badge badge-${m.status}`} style={{fontSize:9,padding:'2px 8px',borderRadius:12}}>{m.status.toUpperCase()}</span>
                        </div>
                        <div style={{fontSize:17,fontWeight:700,color:'var(--navy)'}}>{m.subjectName}</div>
                        <div style={{fontSize:11,color:'var(--muted)',marginTop:3,display:'flex',alignItems:'center',gap:6}}>
                          <span>👨‍🏫</span> {m.facultyName}
                          {m.status==='approved' && <span style={{color:'var(--green)',fontWeight:600}}>· Verified {new Date(m.approvedAt).toLocaleDateString('en-GB',{day:'numeric',month:'short'})}</span>}
                        </div>
                      </div>

                      <div style={{display:'flex',alignItems:'center',gap:12}}>
                        <div style={{textAlign:'center',background:`var(${isPassing?'--green-bg':'--red-bg'})`,border:`1.5px solid var(${isPassing?'--green':'--red'})`,borderRadius:14,padding:'10px 20px'}}>
                          <div style={{fontSize:10,color:'var(--muted)',textTransform:'uppercase',letterSpacing:1,fontWeight:600,marginBottom:2}}>Internal</div>
                          <div style={{fontSize:30,fontWeight:800,color:`var(${isPassing?'--green':'--red'})`,lineHeight:1,fontFamily:"'Cormorant Garamond',serif"}}>
                            {internal}<span style={{fontSize:13,color:'var(--muted)',fontWeight:400}}>/30</span>
                          </div>
                          <div style={{fontSize:10,fontWeight:700,color:`var(${isPassing?'--green':'--red'})`,marginTop:2}}>
                            {isPassing?'✅ PASS':'❌ FAIL'}
                          </div>
                        </div>
                      </div>
                    </div>

                    <div style={{display:'flex',gap:0,padding:'0 24px',background:'var(--bg)',borderBottom:'1px solid var(--border)'}}>
                      {['mid1','mid2'].map(t=>(
                        <button key={t} onClick={()=>setTab(i,t)} style={{padding:'10px 22px',border:'none',background:'none',cursor:'pointer',fontSize:12,fontWeight:700,color:tab===t?'var(--blue)':'var(--muted)',borderBottom:`2px solid ${tab===t?'var(--blue)':'transparent'}`,transition:'all .2s',fontFamily:'Outfit,sans-serif'}}>
                          {t==='mid1'?'📘 Mid Exam 1':'📗 Mid Exam 2'}
                        </button>
                      ))}
                    </div>

                    <div style={{padding:'20px 24px',background:'var(--white)'}}>
                      <div style={{display:'grid',gridTemplateColumns:'1fr auto',gap:20,alignItems:'start'}}>
                        <div style={{display:'flex',flexDirection:'column',gap:10}}>
                          <BarRow label="Q1 · Part A" value={midData.q1} max={10} colorVar="--blue" bgVar="--blue-bg"/>
                          <div style={{fontSize:10,color:'var(--muted)',fontStyle:'italic',marginTop:2}}>Part B — Average of Q2, Q3, Q4 is counted</div>
                          {midData.bs.map((score,qi)=>{
                            return (
                              <div key={qi} style={{display:'flex',alignItems:'center',gap:10}}>
                                <div style={{width:90,fontSize:11,fontWeight:600,color:'var(--green)'}}>Q{qi+2}</div>
                                <div style={{flex:1,background:'var(--green-bg)',borderRadius:8,height:7,overflow:'hidden'}}>
                                  <div style={{width:`${Math.min((score/10)*100,100)}%`,background:'var(--green)',height:'100%',borderRadius:8,transition:'width .4s'}}/>
                                </div>
                                <div style={{width:46,textAlign:'right',fontSize:12,fontWeight:700,color:'var(--green)'}}>{score}<span style={{color:'var(--muted)',fontSize:10}}>/10</span></div>
                              </div>
                            );
                          })}
                          <div style={{borderTop:'1px dashed var(--border)',margin:'4px 0'}}/>
                          <BarRow label="Assignment" value={midData.asgn} max={5} colorVar="--amber" bgVar="--amber-bg"/>
                        </div>

                        <div style={{minWidth:140,background:'var(--bg)',borderRadius:12,border:'1px solid var(--border)',padding:'14px 18px',textAlign:'center'}}>
                          <div style={{fontSize:10,color:'var(--muted)',textTransform:'uppercase',letterSpacing:1,fontWeight:600,marginBottom:4}}>Exam (Q1 + Part B/2)</div>
                          <div style={{fontSize:26,fontWeight:800,color:'var(--navy)',fontFamily:"'Cormorant Garamond',serif",lineHeight:1}}>
                            {midData.ex}<span style={{fontSize:13,color:'var(--muted)'}}>/25</span>
                          </div>
                          <div style={{width:'100%',height:1,background:'var(--border)',margin:'10px 0'}}/>
                          <div style={{fontSize:10,color:'var(--muted)',textTransform:'uppercase',letterSpacing:1,fontWeight:600,marginBottom:4}}>Grand Total</div>
                          <div style={{fontSize:28,fontWeight:800,color:'var(--navy)',fontFamily:"'Cormorant Garamond',serif",lineHeight:1}}>
                            {midData.gr}<span style={{fontSize:13,color:'var(--muted)'}}>/30</span>
                          </div>
                        </div>
                      </div>

                      <div style={{marginTop:16,background:'var(--bg)',borderRadius:12,border:'1px solid var(--border)',padding:'12px 18px',display:'flex',alignItems:'center',gap:8,flexWrap:'wrap',fontSize:12}}>
                        <span style={{fontSize:13}}>🧮</span>
                        <span style={{color:'var(--blue)',fontWeight:600}}>Internal =</span>
                        <span style={{background:'var(--white)',padding:'3px 10px',borderRadius:6,border:'1px solid var(--border)',color:'var(--blue)',fontWeight:700}}>{Math.max(gr1,gr2)} × 80% = {(Math.max(gr1,gr2)*.8).toFixed(1)}</span>
                        <span style={{color:'var(--muted)',fontWeight:700}}>+</span>
                        <span style={{background:'var(--white)',padding:'3px 10px',borderRadius:6,border:'1px solid var(--border)',color:'var(--green)',fontWeight:700}}>{Math.min(gr1,gr2)} × 20% = {(Math.min(gr1,gr2)*.2).toFixed(1)}</span>
                        <span style={{color:'var(--muted)',fontWeight:700}}>=</span>
                        <span style={{background:`var(${isPassing?'--green-bg':'--red-bg'})`,padding:'3px 12px',borderRadius:6,border:`1px solid var(${isPassing?'--green':'--red'})`,color:`var(${isPassing?'--green':'--red'})`,fontWeight:800,fontSize:13}}>{internal} / 30</span>
                        {Math.abs(internal-(m.internalMarks||0))>=1 && (
                          <span style={{marginLeft:'auto',fontSize:10,color:'var(--amber)',background:'var(--amber-bg)',padding:'3px 8px',borderRadius:6}}>⚠️ DB value: {m.internalMarks||0}</span>
                        )}
                      </div>

                      {(!mid1Empty && mid2Empty) && (
                        <div style={{marginTop:12,padding:'12px 16px',background:'linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%)',borderRadius:12,border:'1px solid #bae6fd',borderLeft:'4px solid #0ea5e9',display:'flex',alignItems:'flex-start',gap:12}}>
                          <div style={{fontSize:20,marginTop:2}}>🤖</div>
                          <div>
                            <div style={{fontSize:12,fontWeight:800,color:'#0284c7',textTransform:'uppercase',letterSpacing:0.5,marginBottom:4}}>AI Marks Predictor</div>
                            <div style={{fontSize:13,color:'#0369a1',lineHeight:1.4}}>
                              {getRequiredMid2(gr1) === 0 ? (
                                <>🎉 <b>Excellent!</b> Your Mid 1 score ({gr1}/30) already secures a passing grade. Mid 2 will only boost your average!</>
                              ) : (
                                <>Based on your Mid 1 score of <b>{gr1}/30</b>, you need to score at least <b style={{fontSize:14,color:'#0ea5e9',background:'#fff',padding:'2px 8px',borderRadius:6,border:'1px solid #bae6fd',margin:'0 4px',boxShadow:'0 2px 6px rgba(14,165,233,0.15)'}}>{getRequiredMid2(gr1)} / 30</b> in Mid 2 to secure a pass.</>
                              )}
                            </div>
                          </div>
                        </div>
                      )}

                      {m.hodRemarks && (
                        <div style={{marginTop:12,padding:'10px 14px',background:'var(--amber-bg)',borderRadius:8,borderLeft:'4px solid var(--amber)',color:'var(--amber)',fontSize:12,display:'flex',alignItems:'center',gap:8}}>
                          <span>💬</span><b>HOD Remarks:</b> {m.hodRemarks}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {page==='profile' && (
        <div style={{maxWidth:600,margin:'0 auto'}}>
          <div className="page-header">
            <div className="breadcrumb">Student / <span>My Profile</span></div>
            <h2>👤 My Profile</h2>
          </div>
          <div className="card">
            <div className="card-body">
              <div style={{display:'flex',flexDirection:'column',gap:0}}>
                {[
                  {icon:'📛', label:'Full Name',   val:user?.name},
                  {icon:'👤', label:'Username',    val:user?.username},
                  {icon:'🆔', label:'Roll Number', val:user?.rollNo||'N/A'},
                  {icon:'🏛️', label:'Department',  val:user?.department},
                  {icon:'📅', label:'Semester',    val:user?.semester||'N/A'},
                  {icon:'🏷️', label:'Section',     val:user?.section||'N/A'},
                  {icon:'📧', label:'Email',       val:user?.email||'N/A'},
                ].map(({icon,label,val})=>(
                  <div key={label} style={{display:'flex',alignItems:'center',gap:14,padding:'13px 0',borderBottom:'1px solid var(--border)'}}>
                    <div style={{width:34,height:34,borderRadius:8,background:'var(--blue-bg)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:16,flexShrink:0}}>{icon}</div>
                    <div style={{width:120,fontSize:11,fontWeight:700,color:'var(--muted)',textTransform:'uppercase',letterSpacing:.5}}>{label}</div>
                    <div style={{fontSize:14,fontWeight:600,color:'var(--text)'}}>{val}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
}
