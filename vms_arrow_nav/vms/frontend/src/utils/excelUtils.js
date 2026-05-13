// ── VEMU Excel Export — matches demo PDF ──────────────────────────────────────
//
// Logic:
//  - If specific mid selected → single mid block only (no other mid cols)
//  - If both mids → I-MID + II-MID side by side + Internal marks
//  - Final Marks → summary sheet (mid1 total, mid2 total, final calc)
//
// Column layout per mid block (11 cols):
//  Q1(A,B) Q2(A,B) Q3(A,B)  DES30M DES15M  SHA10M ASG5M FinalMarks(30)
//  q1  q2  q3  q4  q5  q6   qTotal qHalf   sha    asgn  total

export async function loadXLSX() {
  if (window.XLSX) return window.XLSX;
  await new Promise((res, rej) => {
    const s = document.createElement('script');
    s.src = 'https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js';
    s.onload = res; s.onerror = rej;
    document.head.appendChild(s);
  });
  return window.XLSX;
}

// ── Style helpers ─────────────────────────────────────────────────────────────
const T = { style:'thin',   color:{ rgb:'000000' } };
const M = { style:'medium', color:{ rgb:'000000' } };
const THIN = { top:T, bottom:T, left:T, right:T };
const MED  = { top:M, bottom:M, left:M, right:M };

function cell(v, { bold=false, sz=9, hz='center', border=THIN, wrap=false, bg=null }={}) {
  const c = {
    v: (v===null||v===undefined) ? '' : v,
    t: typeof v === 'number' ? 'n' : 's',
    s: {
      font:      { name:'Times New Roman', sz, bold },
      alignment: { horizontal:hz, vertical:'center', wrapText:wrap },
      border,
    }
  };
  if (bg) c.s.fill = { patternType:'solid', fgColor:{ rgb:bg } };
  return c;
}

const H1 = v => cell(v, { bold:true, sz:11, border:MED,  wrap:true, bg:'C5D9F1' });
const H2 = v => cell(v, { bold:true, sz:10, border:MED,  wrap:true, bg:'DCE6F1' });
const H3 = v => cell(v, { bold:true, sz:9,  border:MED,  wrap:true, bg:'DCE6F1' });
const GH = v => cell(v, { bold:true, sz:9,  border:THIN, wrap:true, bg:'BDD7EE' });
const SH = v => cell(v, { bold:true, sz:8,  border:THIN, wrap:true, bg:'DEEAF1' });
const LH = v => cell(v, { bold:true, sz:8,  border:THIN, wrap:true });
const FH = v => cell(v, { bold:true, sz:9,  border:THIN, wrap:true });
const D  = v => cell(v, { sz:8, border:THIN });
const DL = v => cell(v, { sz:8, border:THIN, hz:'left' });
const BK = () => cell('', { sz:8, border:THIN });

function sc(ws, r, c, cel) { ws[window.XLSX.utils.encode_cell({r,c})] = cel; }
function mg(arr, r1, r2, c1, c2) { arr.push({ s:{r:r1,c:c1}, e:{r:r2,c:c2} }); }

// ── Write one mid-block header (11 cols starting at `off`) ───────────────────
function writeMidHeader(ws, merges, label, off) {
  // Row 4: group label
  sc(ws,4,off, GH(label)); mg(merges,4,4, off,off+10);
  // Row 5: QUESTION WISE(PART B) | PART A
  sc(ws,5,off,   SH('QUESTION WISE(PART B)')); mg(merges,5,5, off,off+5);
  sc(ws,5,off+6, SH('PART A'));                mg(merges,5,5, off+6,off+10);
  // Row 6: Q1, Q2, Q3 + PART A cols
  sc(ws,6,off+0, SH('Q1'));  mg(merges,6,6, off+0,off+1);
  sc(ws,6,off+2, SH('Q2'));  mg(merges,6,6, off+2,off+3);
  sc(ws,6,off+4, SH('Q3'));  mg(merges,6,6, off+4,off+5);
  sc(ws,6,off+6,  SH('DES\n30M'));       mg(merges,6,7, off+6, off+6);
  sc(ws,6,off+7,  SH('DES\n15M'));       mg(merges,6,7, off+7, off+7);
  sc(ws,6,off+8,  SH('SHA\n10M'));       mg(merges,6,7, off+8, off+8);
  sc(ws,6,off+9,  SH('ASG\n5M'));        mg(merges,6,7, off+9, off+9);
  sc(ws,6,off+10, SH('Final\nMarks(30)')); mg(merges,6,7, off+10,off+10);
  // Row 7: A/B + blank placeholders (already merged above)
  sc(ws,7,off+0, LH('A')); sc(ws,7,off+1, LH('B'));
  sc(ws,7,off+2, LH('A')); sc(ws,7,off+3, LH('B'));
  sc(ws,7,off+4, LH('A')); sc(ws,7,off+5, LH('B'));
  [6,7,8,9,10].forEach(i => sc(ws,7,off+i, BK()));
}

// ── Write one student's mark data for a mid block ────────────────────────────
function writeMidData(ws, r, off, m) {
  sc(ws,r,off+0,  D(m.q1??'')); sc(ws,r,off+1, D(m.q2??''));
  sc(ws,r,off+2,  D(m.q3??'')); sc(ws,r,off+3, D(m.q4??''));
  sc(ws,r,off+4,  D(m.q5??'')); sc(ws,r,off+5, D(m.q6??''));
  sc(ws,r,off+6,  D(m.questionTotal??''));
  sc(ws,r,off+7,  D(m.questionHalf??''));
  sc(ws,r,off+8,  D(m.shaMarks??''));
  sc(ws,r,off+9,  D(m.assignmentMarks??''));
  sc(ws,r,off+10, D(m.totalMarks??''));
}

// ── Column widths for one mid block ──────────────────────────────────────────
const MID_BLOCK_COLS = [
  {wch:5},{wch:5}, // Q1 A B
  {wch:5},{wch:5}, // Q2 A B
  {wch:5},{wch:5}, // Q3 A B
  {wch:9},{wch:9}, // DES30 DES15
  {wch:9},{wch:7}, // SHA10 ASG5
  {wch:12},        // Final30
];

// ── Shared header rows 0-3 ───────────────────────────────────────────────────
function writeFileHeaders(ws, merges, meta, totalCols, midLabel) {
  sc(ws,0,0, H1('VEMU INSTITUTE OF TECHNOLOGY::P.KOTHAKOTA(AUTONOMOUS)')); mg(merges,0,0,0,totalCols-1);
  sc(ws,1,0, H1(`DEPT: ${meta.dept||''}`));                                mg(merges,1,1,0,totalCols-1);
  const row2 = midLabel
    ? `Year/ Sem: ${meta.yearSem||''}  Faculty Name:${meta.faculty||''}  [${midLabel}]`
    : `Year/ Sem: ${meta.yearSem||''}  Faculty Name:${meta.faculty||''}`;
  sc(ws,2,0, H2(row2)); mg(merges,2,2,0,totalCols-1);
  sc(ws,3,0, H3(`SUBJECT NAME WITH CODE: ${meta.subjectCode||meta.subject||''}`)); mg(merges,3,3,0,totalCols-1);
}

// ── Fixed col headers (S.No, Roll, Name) span rows 4-7 ──────────────────────
function writeFixedHeaders(ws, merges) {
  sc(ws,4,0, FH('S.No'));                 mg(merges,4,7,0,0);
  sc(ws,4,1, FH('Roll Number'));          mg(merges,4,7,1,1);
  sc(ws,4,2, FH('Name of the\nStudent')); mg(merges,4,7,2,2);
}

// ── exportStyledMidMarks ──────────────────────────────────────────────────────
// marks:   { 'Mid-1': [...], 'Mid-2': [...] }
// meta:    { dept, yearSem, subject, subjectCode, faculty }
// selMid:  '' | 'Mid-1' | 'Mid-2'
export async function exportStyledMidMarks(marks, meta, filename, selMid='') {
  const XLSX   = await loadXLSX();
  const wb     = XLSX.utils.book_new();

  const mid1List = (marks['Mid-1']||[]).slice().sort((a,b)=>(a.student?.rollNumber||'').localeCompare(b.student?.rollNumber||''));
  const mid2List = (marks['Mid-2']||[]).slice().sort((a,b)=>(a.student?.rollNumber||'').localeCompare(b.student?.rollNumber||''));

  // Decide which mids to show
  const showMid1 = !selMid || selMid === 'Mid-1';
  const showMid2 = !selMid || selMid === 'Mid-2';
  const showBoth = showMid1 && showMid2;

  // ── Build columns layout ─────────────────────────────────────────────────
  // 0=S.No 1=Roll 2=Name  then mid blocks  then (if both) Internal marks
  const FIXED = 3;
  const mid1Off = FIXED;                            // 3
  const mid2Off = showBoth ? FIXED + 11 : FIXED;   // 14 (both) or 3 (mid2 only)
  const internalCol = showBoth ? FIXED + 22 : null;
  const TOTAL = showBoth ? FIXED + 22 + 1 : FIXED + 11;

  const ws      = {};
  const merges  = [];

  // Rows 0-3
  const midLabel = selMid || '';
  writeFileHeaders(ws, merges, meta, TOTAL, midLabel);

  // Rows 4-7 fixed col headers
  writeFixedHeaders(ws, merges);

  // Mid block headers
  if (showMid1) writeMidHeader(ws, merges, 'I-MID',  mid1Off);
  if (showMid2) writeMidHeader(ws, merges, 'II-MID', mid2Off);

  // Internal marks col (only when both mids shown)
  if (showBoth && internalCol !== null) {
    sc(ws,4,internalCol, FH('Internal\nmarks')); mg(merges,4,7,internalCol,internalCol);
  }

  // ── Data rows ─────────────────────────────────────────────────────────────
  const DATA_ROW = 8;

  // Build lookup maps
  const mid2Map = {};
  mid2List.forEach(m => { mid2Map[String(m.student?._id||m.student)] = m; });

  // Base student list: if specific mid selected use that list; else merge
  let baseList;
  if (selMid === 'Mid-1') {
    baseList = mid1List;
  } else if (selMid === 'Mid-2') {
    baseList = mid2List;
  } else {
    const mid1Keys = new Set(mid1List.map(m=>String(m.student?._id||m.student)));
    const extra = mid2List.filter(m=>!mid1Keys.has(String(m.student?._id||m.student)));
    baseList = [...mid1List, ...extra];
  }

  baseList.forEach((baseM, idx) => {
    const r   = DATA_ROW + idx;
    const sid = String(baseM.student?._id||baseM.student);
    const m1  = mid1List.find(m=>String(m.student?._id||m.student)===sid)||{};
    const m2  = mid2Map[sid]||{};
    const st  = baseM.student||{};

    sc(ws,r,0, D(idx+1));
    sc(ws,r,1, D(st.rollNumber||''));
    sc(ws,r,2, DL(st.name||''));

    if (showMid1) writeMidData(ws, r, mid1Off, m1);
    if (showMid2) writeMidData(ws, r, mid2Off, selMid==='Mid-2' ? baseM : m2);

    if (showBoth && internalCol !== null) {
      const t1 = typeof m1.totalMarks==='number' ? m1.totalMarks : null;
      const t2 = typeof m2.totalMarks==='number' ? m2.totalMarks : null;
      const fm = (t1!==null && t2!==null)
        ? Math.round(0.8*Math.max(t1,t2)+0.2*Math.min(t1,t2))
        : (t1??t2??'');
      sc(ws,r,internalCol, D(fm));
    }
  });

  // ── Finalise ──────────────────────────────────────────────────────────────
  const lastRow = DATA_ROW + baseList.length - 1;
  ws['!ref']    = XLSX.utils.encode_range({r:0,c:0},{r:Math.max(lastRow,DATA_ROW),c:TOTAL-1});
  ws['!merges'] = merges;

  const fixedWidths = [{wch:5},{wch:14},{wch:26}];
  const midCols     = [...MID_BLOCK_COLS];
  ws['!cols'] = showBoth
    ? [...fixedWidths, ...midCols, ...midCols, {wch:12}]
    : [...fixedWidths, ...midCols];

  ws['!rows'] = [
    {hpt:22},{hpt:18},{hpt:18},{hpt:18},
    {hpt:24},{hpt:22},{hpt:26},{hpt:20},
  ];

  XLSX.utils.book_append_sheet(wb, ws, 'Mid Marks');
  XLSX.writeFile(wb, filename);
}

// ── exportStyledFinalMarks ────────────────────────────────────────────────────
// Full question-wise detail: both mids side by side (same demo structure)
// + extra fixed cols (Section, Subject, Code) + Final Marks + Internal marks
//
// finalData: array of API final-marks objects, each having:
//   { student, subject, faculty, mid1:{q1..q6,questionTotal,questionHalf,shaMarks,assignmentMarks,totalMarks},
//     mid2:{...same...}, finalMarks }
export async function exportStyledFinalMarks(finalData, meta, filename) {
  const XLSX   = await loadXLSX();
  const wb     = XLSX.utils.book_new();
  const ws     = {};
  const merges = [];

  // Column layout:
  //  0=S.No  1=Roll  2=Name  3=Section  4=Subject  5=Code
  //  I-MID  → cols 6-16  (11 cols)
  //  II-MID → cols 17-27 (11 cols)
  //  28=Final Marks(30)   29=Internal marks
  const TOTAL   = 30;
  const MID1OFF = 6;
  const MID2OFF = 17;

  // Rows 0-3: institute headers
  sc(ws,0,0, H1('VEMU INSTITUTE OF TECHNOLOGY::P.KOTHAKOTA(AUTONOMOUS)')); mg(merges,0,0,0,TOTAL-1);
  sc(ws,1,0, H1(`DEPT: ${meta.dept||''}`));                                mg(merges,1,1,0,TOTAL-1);
  sc(ws,2,0, H2(`Year/ Sem: ${meta.yearSem||''}  Faculty Name:${meta.faculty||''}`)); mg(merges,2,2,0,TOTAL-1);
  sc(ws,3,0, H3('FINAL MARKS REPORT (Both Mids Approved)'));               mg(merges,3,3,0,TOTAL-1);

  // Rows 4-7: column headers
  // Fixed cols span all 4 header rows (4-7)
  sc(ws,4,0, FH('S.No'));                   mg(merges,4,7,0,0);
  sc(ws,4,1, FH('Roll\nNumber'));           mg(merges,4,7,1,1);
  sc(ws,4,2, FH('Name of the\nStudent'));   mg(merges,4,7,2,2);
  sc(ws,4,3, FH('Section'));                mg(merges,4,7,3,3);
  sc(ws,4,4, FH('Subject'));                mg(merges,4,7,4,4);
  sc(ws,4,5, FH('Code'));                   mg(merges,4,7,5,5);

  // Mid block headers
  writeMidHeader(ws, merges, 'I-MID',  MID1OFF);
  writeMidHeader(ws, merges, 'II-MID', MID2OFF);

  // Final Marks and Internal marks span all 4 header rows
  sc(ws,4,28, FH('Final\nMarks\n(30)'));   mg(merges,4,7,28,28);
  sc(ws,4,29, FH('Internal\nmarks'));      mg(merges,4,7,29,29);

  // Data rows
  const DATA_ROW = 8;
  const sorted = [...finalData].sort((a,b) =>
    (a.student?.rollNumber||'').localeCompare(b.student?.rollNumber||''));

  sorted.forEach((f, idx) => {
    const r  = DATA_ROW + idx;
    const st = f.student || {};
    const m1 = f.mid1 || {};
    const m2 = f.mid2 || {};

    sc(ws,r,0, D(idx+1));
    sc(ws,r,1, D(st.rollNumber||''));
    sc(ws,r,2, DL(st.name||''));
    sc(ws,r,3, D(st.section||''));
    sc(ws,r,4, DL(f.subject?.name||''));
    sc(ws,r,5, D(f.subject?.code||''));

    writeMidData(ws, r, MID1OFF, m1);
    writeMidData(ws, r, MID2OFF, m2);

    sc(ws,r,28, D(f.finalMarks??''));
    sc(ws,r,29, D(f.finalMarks??'')); // internal = final
  });

  const lastRow = DATA_ROW + sorted.length - 1;
  ws['!ref']    = XLSX.utils.encode_range({r:0,c:0},{r:Math.max(lastRow,DATA_ROW),c:TOTAL-1});
  ws['!merges'] = merges;
  ws['!cols']   = [
    {wch:5},{wch:14},{wch:26},{wch:8},{wch:24},{wch:8}, // fixed cols 0-5
    ...MID_BLOCK_COLS,                                    // I-MID  cols 6-16
    ...MID_BLOCK_COLS,                                    // II-MID cols 17-27
    {wch:10},{wch:10},                                    // Final, Internal
  ];
  ws['!rows'] = [
    {hpt:22},{hpt:18},{hpt:18},{hpt:18},
    {hpt:24},{hpt:22},{hpt:26},{hpt:20},
  ];

  XLSX.utils.book_append_sheet(wb, ws, 'Final Marks');
  XLSX.writeFile(wb, filename);
}
