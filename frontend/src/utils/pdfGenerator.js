import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

// ─── Constants ───────────────────────────────────────────────────────────────
const NAVY  = [0, 24, 82];
const GOLD  = [201, 151, 58];
const WHITE = [255, 255, 255];
const LIGHT = [245, 247, 255];
const GREEN = [22, 163, 74];
const RED   = [220, 38, 38];
const GRAY  = [107, 114, 128];

// ─── Helper: draw VEMU letterhead ────────────────────────────────────────────
function drawLetterhead(doc, logoBase64, subtitle) {
  const pw = doc.internal.pageSize.getWidth();

  // Top navy bar
  doc.setFillColor(...NAVY);
  doc.rect(0, 0, pw, 32, 'F');

  // Gold accent line
  doc.setFillColor(...GOLD);
  doc.rect(0, 32, pw, 2.5, 'F');

  // Logo (left)
  if (logoBase64) {
    try { doc.addImage(logoBase64, 'PNG', 10, 4, 22, 22); } catch (e) {}
  }

  // Institution name (center)
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.setTextColor(...WHITE);
  doc.text('VEMU INSTITUTE OF TECHNOLOGY', pw / 2, 12, { align: 'center' });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(220, 220, 220);
  doc.text('(Autonomous) :: Near Pakala, P.B. Siddhi, Chittoor Dt., A.P. - 517 112', pw / 2, 18, { align: 'center' });

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.setTextColor(...GOLD);
  doc.text(subtitle.toUpperCase(), pw / 2, 25.5, { align: 'center' });

  // Date (right)
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(200, 200, 200);
  const dateStr = new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
  doc.text(`Date: ${dateStr}`, pw - 10, 8, { align: 'right' });
}

// ─── Helper: info row block ───────────────────────────────────────────────────
function drawInfoBox(doc, fields, startY) {
  const pw = doc.internal.pageSize.getWidth();
  doc.setFillColor(...LIGHT);
  doc.setDrawColor(...NAVY);
  doc.setLineWidth(0.3);
  doc.roundedRect(10, startY, pw - 20, fields.length * 7 + 6, 3, 3, 'FD');

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  fields.forEach(([label, value], i) => {
    const y = startY + 8 + i * 7;
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...NAVY);
    doc.text(`${label}:`, 15, y);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(40, 40, 40);
    doc.text(String(value || '—'), 55, y);
  });
  return startY + fields.length * 7 + 10;
}

// ─── Helper: section title ────────────────────────────────────────────────────
function sectionTitle(doc, text, y) {
  const pw = doc.internal.pageSize.getWidth();
  doc.setFillColor(...NAVY);
  doc.rect(10, y, pw - 20, 7, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(...WHITE);
  doc.text(text, 14, y + 4.8);
  return y + 10;
}

// ─── Helper: load logo as base64 ─────────────────────────────────────────────
async function loadLogo() {
  try {
    const res  = await fetch('/vemu.png');
    const blob = await res.blob();
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result);
      reader.onerror  = () => resolve(null);
      reader.readAsDataURL(blob);
    });
  } catch { return null; }
}

// ─── Helper: calculation functions ───────────────────────────────────────────
function calcGrand(mid) {
  const q1    = Math.min(mid?.q1 || 0, 5);
  const partB = [mid?.q2 || 0, mid?.q3 || 0, mid?.q4 || 0].sort((a, b) => b - a);
  const exam  = Math.min(q1 + partB[0] + partB[1], 25);
  return Math.min(exam + Math.min(mid?.assignment || 0, 5), 30);
}
function calcInternal(m) {
  const g1   = calcGrand(m.mid1), g2 = calcGrand(m.mid2);
  const best = Math.max(g1, g2), sec = Math.min(g1, g2);
  return Math.round((best * 0.8 + sec * 0.2) * 2) / 2;
}

// ─── Helper: footer ──────────────────────────────────────────────────────────
function addFooter(doc) {
  const pw = doc.internal.pageSize.getWidth();
  const ph = doc.internal.pageSize.getHeight();
  const pages = doc.internal.getNumberOfPages();

  for (let i = 1; i <= pages; i++) {
    doc.setPage(i);
    doc.setDrawColor(...GOLD);
    doc.setLineWidth(0.5);
    doc.line(10, ph - 14, pw - 10, ph - 14);
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(7);
    doc.setTextColor(...GRAY);
    doc.text('This is a computer-generated report. VEMU Institute of Technology — Confidential.', pw / 2, ph - 9, { align: 'center' });
    doc.text(`Page ${i} of ${pages}`, pw - 10, ph - 9, { align: 'right' });
  }
}

// ════════════════════════════════════════════════════════════════════════════
// 1. STUDENT MARKS CARD PDF
// ════════════════════════════════════════════════════════════════════════════
export async function downloadStudentMarksCard(user, marks) {
  const doc    = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const logo   = await loadLogo();
  const pw     = doc.internal.pageSize.getWidth();

  drawLetterhead(doc, logo, 'Student Internal Marks Card');

  // Student info
  let y = 40;
  y = drawInfoBox(doc, [
    ['Student Name', user?.name],
    ['Roll Number',  user?.rollNo || user?.username],
    ['Department',   user?.department],
    ['Semester',     user?.semester ? `Semester ${user.semester}` : 'N/A'],
    ['Section',      user?.section || 'N/A'],
  ], y);

  // Summary stats
  const computedList = marks.map(m => calcInternal(m));
  const avg    = marks.length ? (computedList.reduce((a, v) => a + v, 0) / marks.length).toFixed(1) : '0.0';
  const passed = computedList.filter(v => v >= 15).length;
  const failed = computedList.length - passed;

  y = sectionTitle(doc, 'PERFORMANCE SUMMARY', y);

  const summaryData = [
    ['Total Subjects', String(marks.length), 'Average Internal', `${avg} / 30`],
    ['Passed',         String(passed),        'Failed',           String(failed)],
  ];
  autoTable(doc, {
    startY: y,
    margin: { left: 10, right: 10 },
    body: summaryData,
    theme: 'grid',
    styles: { fontSize: 8, cellPadding: 3 },
    alternateRowStyles: { fillColor: LIGHT },
    columnStyles: {
      0: { fontStyle: 'bold', textColor: NAVY, fillColor: LIGHT },
      2: { fontStyle: 'bold', textColor: NAVY, fillColor: LIGHT },
    },
  });

  y = doc.lastAutoTable.finalY + 6;
  y = sectionTitle(doc, 'SUBJECT-WISE MARKS DETAIL', y);

  // Marks table
  const approvedOnly = marks.filter(m => m.status === 'approved');
  const tableRows = marks.map((m, i) => {
    const g1       = calcGrand(m.mid1);
    const g2       = calcGrand(m.mid2);
    const internal = calcInternal(m);
    const status   = m.status?.toUpperCase() || '—';
    return [
      { content: String(i + 1),  styles: { halign: 'center' } },
      m.subjectCode || '—',
      m.subjectName || '—',
      { content: String(g1), styles: { halign: 'center' } },
      { content: String(g2), styles: { halign: 'center' } },
      { content: String(internal), styles: {
          halign: 'center', fontStyle: 'bold',
          textColor: internal >= 15 ? GREEN : RED,
        }
      },
      { content: status, styles: {
          halign: 'center', fontStyle: 'bold',
          textColor: m.status === 'approved' ? GREEN : m.status === 'rejected' ? RED : NAVY,
        }
      },
    ];
  });

  autoTable(doc, {
    startY: y,
    margin: { left: 10, right: 10 },
    head: [['#', 'Code', 'Subject Name', 'Mid 1\n/30', 'Mid 2\n/30', 'Internal\n/30', 'Status']],
    body: tableRows,
    theme: 'striped',
    headStyles: { fillColor: NAVY, textColor: WHITE, fontSize: 8, fontStyle: 'bold', halign: 'center' },
    styles: { fontSize: 8, cellPadding: 3 },
    alternateRowStyles: { fillColor: [250, 251, 255] },
    columnStyles: {
      0: { cellWidth: 8 },
      1: { cellWidth: 22 },
      2: { cellWidth: 65 },
      3: { cellWidth: 16 },
      4: { cellWidth: 16 },
      5: { cellWidth: 18 },
      6: { cellWidth: 22 },
    },
  });

  // Signature strip
  const finalY = doc.lastAutoTable.finalY + 14;
  if (finalY < doc.internal.pageSize.getHeight() - 40) {
    doc.setDrawColor(...NAVY);
    doc.setLineWidth(0.3);
    ['Student Signature', 'Class Teacher', 'HOD'].forEach((label, i) => {
      const x = 20 + i * 60;
      doc.line(x, finalY + 10, x + 45, finalY + 10);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7.5);
      doc.setTextColor(...GRAY);
      doc.text(label, x + 22, finalY + 14, { align: 'center' });
    });
  }

  addFooter(doc);
  doc.save(`MarksCard_${user?.rollNo || user?.username}_${Date.now()}.pdf`);
}

// ════════════════════════════════════════════════════════════════════════════
// 2. FACULTY CLASS REPORT PDF
// ════════════════════════════════════════════════════════════════════════════
export async function downloadClassReport({ facultyName, branch, year, semester, section, subjectCode, subjectName, marksData }) {
  const doc  = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
  const logo = await loadLogo();
  const pw   = doc.internal.pageSize.getWidth();

  drawLetterhead(doc, logo, 'Faculty Class Marks Report');

  let y = 40;
  y = drawInfoBox(doc, [
    ['Faculty',     facultyName],
    ['Branch',      branch],
    ['Class',       `Year ${year} | Semester ${semester} | Section ${section}`],
    ['Subject',     `${subjectCode} — ${subjectName}`],
    ['Total Stud.', String(marksData.length)],
  ], y);

  // Stats
  const internals = marksData.map(row => {
    const g1 = calcGrand(row.mid1), g2 = calcGrand(row.mid2);
    return Math.round((Math.max(g1,g2)*0.8 + Math.min(g1,g2)*0.2) * 2) / 2;
  });
  const passCount = internals.filter(v => v >= 15).length;
  const avg       = internals.length ? (internals.reduce((a,v)=>a+v,0)/internals.length).toFixed(1) : '0.0';
  const highest   = internals.length ? Math.max(...internals) : 0;
  const lowest    = internals.length ? Math.min(...internals) : 0;

  y = sectionTitle(doc, 'CLASS STATISTICS', y);
  autoTable(doc, {
    startY: y,
    margin: { left: 10, right: 10 },
    body: [
      ['Total Students', marksData.length, 'Pass Count', passCount, 'Fail Count', marksData.length - passCount],
      ['Avg Internal',   avg,              'Highest',    highest,   'Lowest',     lowest],
    ],
    theme: 'grid',
    styles: { fontSize: 8, cellPadding: 3 },
    alternateRowStyles: { fillColor: LIGHT },
    columnStyles: {
      0: { fontStyle: 'bold', textColor: NAVY, fillColor: LIGHT },
      2: { fontStyle: 'bold', textColor: NAVY, fillColor: LIGHT },
      4: { fontStyle: 'bold', textColor: NAVY, fillColor: LIGHT },
    },
  });

  y = doc.lastAutoTable.finalY + 6;
  y = sectionTitle(doc, 'STUDENT MARKS LIST', y);

  const rows = marksData.map((row, idx) => {
    const g1 = calcGrand(row.mid1), g2 = calcGrand(row.mid2);
    const internal = Math.round((Math.max(g1,g2)*0.8 + Math.min(g1,g2)*0.2)*2)/2;
    return [
      { content: idx + 1, styles: { halign: 'center' } },
      row.studentRollNo,
      row.studentName,
      { content: row.mid1?.q1 ?? 0, styles: { halign: 'center' } },
      { content: row.mid1?.q2 ?? 0, styles: { halign: 'center' } },
      { content: row.mid1?.q3 ?? 0, styles: { halign: 'center' } },
      { content: row.mid1?.q4 ?? 0, styles: { halign: 'center' } },
      { content: row.mid1?.assignment ?? 0, styles: { halign: 'center' } },
      { content: g1, styles: { halign: 'center', fontStyle: 'bold', textColor: NAVY } },
      { content: row.mid2?.q1 ?? 0, styles: { halign: 'center' } },
      { content: row.mid2?.q2 ?? 0, styles: { halign: 'center' } },
      { content: row.mid2?.q3 ?? 0, styles: { halign: 'center' } },
      { content: row.mid2?.q4 ?? 0, styles: { halign: 'center' } },
      { content: row.mid2?.assignment ?? 0, styles: { halign: 'center' } },
      { content: g2, styles: { halign: 'center', fontStyle: 'bold', textColor: NAVY } },
      { content: internal, styles: { halign: 'center', fontStyle: 'bold', textColor: internal >= 15 ? GREEN : RED } },
      { content: internal >= 15 ? 'P' : 'F', styles: { halign: 'center', fontStyle: 'bold', textColor: internal >= 15 ? GREEN : RED } },
    ];
  });

  autoTable(doc, {
    startY: y,
    margin: { left: 10, right: 10 },
    head: [[
      '#', 'Roll No', 'Student Name',
      'Q1', 'Q2', 'Q3', 'Q4', 'Asgn', 'GT1',
      'Q1', 'Q2', 'Q3', 'Q4', 'Asgn', 'GT2',
      'Internal', 'P/F'
    ]],
    body: rows,
    theme: 'striped',
    headStyles: { fillColor: NAVY, textColor: WHITE, fontSize: 7.5, fontStyle: 'bold', halign: 'center' },
    styles: { fontSize: 7.5, cellPadding: 2.5 },
    alternateRowStyles: { fillColor: [250, 251, 255] },
    didParseCell(data) {
      if (data.section === 'head') {
        if ([3,4,5,6,7,8].includes(data.column.index)) data.cell.styles.fillColor = [0, 30, 100];
        if ([9,10,11,12,13,14].includes(data.column.index)) data.cell.styles.fillColor = [10, 50, 130];
      }
    },
    columnStyles: {
      0:  { cellWidth: 8 },
      1:  { cellWidth: 28 },
      2:  { cellWidth: 50 },
      3:  { cellWidth: 10 }, 4: { cellWidth: 10 }, 5: { cellWidth: 10 }, 6: { cellWidth: 10 }, 7: { cellWidth: 12 }, 8: { cellWidth: 12 },
      9:  { cellWidth: 10 }, 10: { cellWidth: 10 }, 11: { cellWidth: 10 }, 12: { cellWidth: 10 }, 13: { cellWidth: 12 }, 14: { cellWidth: 12 },
      15: { cellWidth: 18 }, 16: { cellWidth: 10 },
    },
  });

  // Signatures
  const fy = doc.lastAutoTable.finalY + 12;
  if (fy < doc.internal.pageSize.getHeight() - 30) {
    ['Faculty Signature', 'Class Teacher', 'HOD'].forEach((label, i) => {
      const x = 20 + i * 90;
      doc.setDrawColor(...NAVY);
      doc.setLineWidth(0.3);
      doc.line(x, fy + 10, x + 65, fy + 10);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7.5);
      doc.setTextColor(...GRAY);
      doc.text(label, x + 32, fy + 14, { align: 'center' });
    });
  }

  addFooter(doc);
  doc.save(`ClassReport_${subjectCode}_Sec${section}_${Date.now()}.pdf`);
}

// ════════════════════════════════════════════════════════════════════════════
// 3. HOD DEPARTMENT REPORT PDF
// ════════════════════════════════════════════════════════════════════════════
export async function downloadDepartmentReport({ hodName, department, semester, section, marks }) {
  const doc  = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
  const logo = await loadLogo();
  const pw   = doc.internal.pageSize.getWidth();

  drawLetterhead(doc, logo, 'HOD — Department Marks Report');

  let y = 40;
  y = drawInfoBox(doc, [
    ['HOD',         hodName],
    ['Department',  department],
    ['Semester',    semester || 'All Semesters'],
    ['Section',     section  || 'All Sections'],
    ['Records',     String(marks.length)],
    ['Generated',   new Date().toLocaleString('en-IN')],
  ], y);

  // Overall stats
  const internals  = marks.map(m => m.internalMarks || 0);
  const passCount  = internals.filter(v => v >= 15).length;
  const avg        = internals.length ? (internals.reduce((a,v)=>a+v,0)/internals.length).toFixed(1) : '0.0';

  // Group by subject
  const subjectMap = {};
  marks.forEach(m => {
    if (!subjectMap[m.subjectCode]) {
      subjectMap[m.subjectCode] = { name: m.subjectName, totals: [], pass: 0 };
    }
    const int = m.internalMarks || 0;
    subjectMap[m.subjectCode].totals.push(int);
    if (int >= 15) subjectMap[m.subjectCode].pass++;
  });

  y = sectionTitle(doc, 'DEPARTMENT STATISTICS', y);
  autoTable(doc, {
    startY: y,
    margin: { left: 10, right: 10 },
    body: [
      ['Total Records', marks.length, 'Passed', passCount, 'Failed', marks.length - passCount],
      ['Avg Internal',  avg,          'Pass %', `${marks.length ? ((passCount/marks.length)*100).toFixed(1) : 0}%`, 'Subjects', Object.keys(subjectMap).length],
    ],
    theme: 'grid',
    styles: { fontSize: 8, cellPadding: 3 },
    alternateRowStyles: { fillColor: LIGHT },
    columnStyles: {
      0: { fontStyle: 'bold', textColor: NAVY, fillColor: LIGHT },
      2: { fontStyle: 'bold', textColor: NAVY, fillColor: LIGHT },
      4: { fontStyle: 'bold', textColor: NAVY, fillColor: LIGHT },
    },
  });

  // Subject-wise summary
  y = doc.lastAutoTable.finalY + 6;
  y = sectionTitle(doc, 'SUBJECT-WISE ANALYSIS', y);

  const subjectRows = Object.entries(subjectMap).map(([code, data]) => {
    const avg   = (data.totals.reduce((a,v)=>a+v,0)/data.totals.length).toFixed(1);
    const passP = ((data.pass/data.totals.length)*100).toFixed(0);
    return [
      code,
      data.name,
      { content: data.totals.length, styles: { halign: 'center' } },
      { content: avg, styles: { halign: 'center', fontStyle: 'bold' } },
      { content: data.pass, styles: { halign: 'center', textColor: GREEN } },
      { content: data.totals.length - data.pass, styles: { halign: 'center', textColor: RED } },
      { content: `${passP}%`, styles: { halign: 'center', fontStyle: 'bold', textColor: Number(passP) >= 50 ? GREEN : RED } },
    ];
  });

  autoTable(doc, {
    startY: y,
    margin: { left: 10, right: 10 },
    head: [['Subject Code', 'Subject Name', 'Students', 'Avg Internal', 'Passed', 'Failed', 'Pass %']],
    body: subjectRows,
    theme: 'striped',
    headStyles: { fillColor: NAVY, textColor: WHITE, fontSize: 8, fontStyle: 'bold', halign: 'center' },
    styles: { fontSize: 8, cellPadding: 3 },
    alternateRowStyles: { fillColor: [250, 251, 255] },
  });

  // Detailed marks
  y = doc.lastAutoTable.finalY + 6;
  y = sectionTitle(doc, 'DETAILED MARKS RECORDS', y);

  const detailRows = marks.map((m, i) => {
    const internal = m.internalMarks || 0;
    return [
      { content: i + 1, styles: { halign: 'center' } },
      m.studentRollNo,
      m.studentName,
      m.subjectCode,
      { content: m.mid1?.grandTotal ?? 0, styles: { halign: 'center' } },
      { content: m.mid2?.grandTotal ?? 0, styles: { halign: 'center' } },
      { content: internal, styles: { halign: 'center', fontStyle: 'bold', textColor: internal >= 15 ? GREEN : RED } },
      { content: internal >= 15 ? 'PASS' : 'FAIL', styles: { halign: 'center', fontStyle: 'bold', textColor: internal >= 15 ? GREEN : RED } },
      { content: m.status?.toUpperCase(), styles: { halign: 'center', textColor: m.status === 'approved' ? GREEN : NAVY } },
      m.facultyName || '—',
    ];
  });

  autoTable(doc, {
    startY: y,
    margin: { left: 10, right: 10 },
    head: [['#', 'Roll No', 'Student Name', 'Subject', 'Mid 1', 'Mid 2', 'Internal', 'Result', 'Status', 'Faculty']],
    body: detailRows,
    theme: 'striped',
    headStyles: { fillColor: NAVY, textColor: WHITE, fontSize: 7.5, fontStyle: 'bold', halign: 'center' },
    styles: { fontSize: 7.5, cellPadding: 2.5 },
    alternateRowStyles: { fillColor: [250, 251, 255] },
    columnStyles: {
      0: { cellWidth: 8 }, 1: { cellWidth: 28 }, 2: { cellWidth: 50 }, 3: { cellWidth: 22 },
      4: { cellWidth: 13 }, 5: { cellWidth: 13 }, 6: { cellWidth: 16 }, 7: { cellWidth: 14 },
      8: { cellWidth: 20 }, 9: { cellWidth: 38 },
    },
  });

  // HOD Signature
  const fy = doc.lastAutoTable.finalY + 12;
  if (fy < doc.internal.pageSize.getHeight() - 30) {
    doc.setDrawColor(...NAVY);
    doc.setLineWidth(0.3);
    doc.line(pw - 80, fy + 10, pw - 15, fy + 10);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(...GRAY);
    doc.text('Head of Department', pw - 47, fy + 14, { align: 'center' });
  }

  addFooter(doc);
  doc.save(`DeptReport_${department}_${Date.now()}.pdf`);
}
