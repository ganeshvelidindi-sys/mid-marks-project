const nodemailer = require('nodemailer');

// ─── Transporter (Gmail SMTP) ─────────────────────────────────────────────────
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

// ─── Verify connection on startup (non-blocking) ─────────────────────────────
transporter.verify().then(() => {
  console.log('✅ Email service ready (Gmail SMTP)');
}).catch(err => {
  console.warn('⚠️  Email service not available:', err.message);
});

// ─── Shared email template wrapper ───────────────────────────────────────────
function wrapHtml(title, bodyHtml) {
  return `
  <!DOCTYPE html>
  <html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width,initial-scale=1"/>
    <title>${title}</title>
  </head>
  <body style="margin:0;padding:0;background:#f0f4ff;font-family:'Segoe UI',Arial,sans-serif;">
    <table width="100%" cellpadding="0" cellspacing="0" style="background:#f0f4ff;padding:32px 0;">
      <tr><td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 8px 32px rgba(0,24,82,.12);">

          <!-- Header -->
          <tr>
            <td style="background:linear-gradient(135deg,#001852 0%,#002580 100%);padding:28px 32px;text-align:center;">
              <div style="font-size:13px;letter-spacing:2px;color:#c9973a;text-transform:uppercase;font-weight:700;margin-bottom:6px;">VEMU Institute of Technology</div>
              <div style="font-size:22px;font-weight:800;color:#fff;margin-bottom:4px;">${title}</div>
              <div style="font-size:11px;color:rgba(255,255,255,.65);">Internal Marks Management System</div>
            </td>
          </tr>

          <!-- Gold bar -->
          <tr><td style="height:3px;background:linear-gradient(90deg,#c9973a,#f0c060,#c9973a);"></td></tr>

          <!-- Body -->
          <tr><td style="padding:28px 32px;">${bodyHtml}</td></tr>

          <!-- Footer -->
          <tr>
            <td style="background:#f8faff;border-top:1px solid #e8edff;padding:18px 32px;text-align:center;">
              <div style="font-size:11px;color:#94a3b8;">This is an automated notification from the VEMU Marks System.</div>
              <div style="font-size:11px;color:#94a3b8;margin-top:4px;">Please do not reply to this email.</div>
              <div style="margin-top:10px;font-size:11px;color:#001852;font-weight:700;">© ${new Date().getFullYear()} VEMU Institute of Technology</div>
            </td>
          </tr>

        </table>
      </td></tr>
    </table>
  </body>
  </html>`;
}

// ─── Helper: fire-and-forget send ────────────────────────────────────────────
function sendMail(to, subject, html) {
  if (!to || !to.includes('@')) return; // skip if no valid email
  transporter.sendMail({
    from: process.env.EMAIL_FROM,
    to,
    subject,
    html,
  }).then(info => {
    console.log(`📧 Email sent to ${to} — ${info.messageId}`);
  }).catch(err => {
    console.warn(`⚠️  Email failed to ${to}:`, err.message);
  });
}

// ════════════════════════════════════════════════════════════════════════════
// 1. STUDENT — Marks Approved Notification
// ════════════════════════════════════════════════════════════════════════════
function sendMarksApprovedEmail(studentEmail, studentName, subjectName, subjectCode, section, semester) {
  const subject = `✅ Your Marks are Approved — ${subjectName}`;
  const html = wrapHtml('Marks Approved! 🎉', `
    <p style="font-size:15px;color:#334155;margin:0 0 20px;">Dear <strong style="color:#001852">${studentName}</strong>,</p>
    <p style="font-size:14px;color:#475569;line-height:1.7;margin:0 0 20px;">
      Your internal marks for the subject listed below have been <strong style="color:#16a34a">reviewed and officially approved</strong> by the Head of Department.
    </p>

    <div style="background:#f0fff4;border:1.5px solid #16a34a;border-radius:12px;padding:20px 24px;margin:0 0 24px;">
      <div style="display:flex;align-items:center;gap:10px;margin-bottom:14px;">
        <span style="font-size:24px;">📚</span>
        <div>
          <div style="font-size:16px;font-weight:700;color:#001852;">${subjectName}</div>
          <div style="font-size:12px;color:#64748b;margin-top:2px;">${subjectCode} &nbsp;·&nbsp; Semester ${semester} &nbsp;·&nbsp; Section ${section}</div>
        </div>
      </div>
      <div style="display:inline-block;background:#16a34a;color:#fff;font-weight:700;font-size:13px;padding:6px 18px;border-radius:20px;">✅ APPROVED &amp; LOCKED</div>
    </div>

    <p style="font-size:13px;color:#64748b;line-height:1.6;">
      You can view your detailed marks breakdown by logging into the <strong>VEMU Academic Portal</strong> and navigating to <em>My Marks</em>.
    </p>
    <p style="font-size:13px;color:#94a3b8;margin-top:20px;">Keep up the great work! 🌟</p>
  `);
  sendMail(studentEmail, subject, html);
}

// ════════════════════════════════════════════════════════════════════════════
// 2. HOD — Marks Submitted by Faculty Notification
// ════════════════════════════════════════════════════════════════════════════
function sendMarksSubmittedEmail(hodEmail, hodName, facultyName, subjectName, subjectCode, section, semester) {
  const subject = `📤 New Marks Submission — ${subjectName} (Sem ${semester} Sec ${section})`;
  const html = wrapHtml('New Marks Submission Pending Review', `
    <p style="font-size:15px;color:#334155;margin:0 0 20px;">Dear <strong style="color:#001852">${hodName}</strong>,</p>
    <p style="font-size:14px;color:#475569;line-height:1.7;margin:0 0 20px;">
      Faculty member <strong style="color:#001852">${facultyName}</strong> has submitted marks for your review and approval.
    </p>

    <div style="background:#fffbeb;border:1.5px solid #d97706;border-radius:12px;padding:20px 24px;margin:0 0 24px;">
      <div style="display:flex;align-items:center;gap:10px;margin-bottom:12px;">
        <span style="font-size:24px;">📋</span>
        <div>
          <div style="font-size:16px;font-weight:700;color:#001852;">${subjectName}</div>
          <div style="font-size:12px;color:#64748b;margin-top:2px;">${subjectCode} &nbsp;·&nbsp; Semester ${semester} &nbsp;·&nbsp; Section ${section}</div>
        </div>
      </div>
      <table style="width:100%;border-collapse:collapse;font-size:13px;">
        <tr>
          <td style="padding:5px 0;color:#64748b;width:120px;">Submitted By</td>
          <td style="padding:5px 0;font-weight:600;color:#001852;">${facultyName}</td>
        </tr>
        <tr>
          <td style="padding:5px 0;color:#64748b;">Submitted On</td>
          <td style="padding:5px 0;font-weight:600;color:#001852;">${new Date().toLocaleString('en-IN')}</td>
        </tr>
      </table>
    </div>

    <div style="background:#001852;border-radius:10px;padding:16px 24px;text-align:center;">
      <p style="color:rgba(255,255,255,.85);font-size:13px;margin:0 0 8px;">Log in to review, approve, or reject this submission.</p>
      <div style="display:inline-block;background:#c9973a;color:#fff;font-weight:700;font-size:13px;padding:8px 24px;border-radius:20px;">⏳ Action Required</div>
    </div>
  `);
  sendMail(hodEmail, subject, html);
}

// ════════════════════════════════════════════════════════════════════════════
// 3. FACULTY — Marks Rejected Notification
// ════════════════════════════════════════════════════════════════════════════
function sendMarksRejectedEmail(facultyEmail, facultyName, subjectName, subjectCode, section, semester, remarks) {
  const subject = `❌ Marks Rejected — ${subjectName} (Sem ${semester} Sec ${section})`;
  const html = wrapHtml('Marks Returned for Correction', `
    <p style="font-size:15px;color:#334155;margin:0 0 20px;">Dear <strong style="color:#001852">${facultyName}</strong>,</p>
    <p style="font-size:14px;color:#475569;line-height:1.7;margin:0 0 20px;">
      The marks you submitted for the subject below have been <strong style="color:#dc2626">rejected by the HOD</strong> and returned to you for correction. Please review the remarks and resubmit.
    </p>

    <div style="background:#fff5f5;border:1.5px solid #dc2626;border-radius:12px;padding:20px 24px;margin:0 0 20px;">
      <div style="display:flex;align-items:center;gap:10px;margin-bottom:12px;">
        <span style="font-size:24px;">📖</span>
        <div>
          <div style="font-size:16px;font-weight:700;color:#001852;">${subjectName}</div>
          <div style="font-size:12px;color:#64748b;margin-top:2px;">${subjectCode} &nbsp;·&nbsp; Semester ${semester} &nbsp;·&nbsp; Section ${section}</div>
        </div>
      </div>
      <div style="display:inline-block;background:#dc2626;color:#fff;font-weight:700;font-size:12px;padding:4px 14px;border-radius:20px;margin-bottom:16px;">❌ REJECTED</div>
    </div>

    <div style="background:#fffbeb;border-left:4px solid #d97706;border-radius:0 10px 10px 0;padding:16px 20px;margin:0 0 24px;">
      <div style="font-size:11px;font-weight:700;color:#d97706;text-transform:uppercase;letter-spacing:1px;margin-bottom:8px;">💬 HOD Remarks</div>
      <div style="font-size:14px;color:#334155;line-height:1.7;">${remarks || 'No remarks provided. Please contact your HOD.'}</div>
    </div>

    <p style="font-size:13px;color:#64748b;line-height:1.6;">
      Please log in to the portal, make the necessary corrections, and resubmit the marks for approval.
    </p>
  `);
  sendMail(facultyEmail, subject, html);
}

module.exports = {
  sendMarksApprovedEmail,
  sendMarksSubmittedEmail,
  sendMarksRejectedEmail,
};
