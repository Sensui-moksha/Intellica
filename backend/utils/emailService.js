const nodemailer = require('nodemailer');
const User = require('../models/User');
const fs = require('fs');
const path = require('path');

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_APP_PASSWORD
  }
});

// ─────────────────────────────────────────────────────────────
// ─────────────────────────────────────────────────────────────
// Logo helper — Uses Base64 Data URI so NO attachment icon appears in Gmail inbox list
// ─────────────────────────────────────────────────────────────
let cachedLogoDataUri = null;
const getLogoSrc = () => {
  if (process.env.EMAIL_LOGO_URL) return process.env.EMAIL_LOGO_URL;
  if (cachedLogoDataUri) return cachedLogoDataUri;
  try {
    const candidates = [
      path.join(__dirname, '..', 'assets', 'mic_logo.png'),
      path.join(__dirname, '..', '..', 'frontend', 'src', 'assets', 'mic_logo.png'),
      path.join(__dirname, '..', '..', 'frontend', 'src', 'assets', 'logo.png')
    ];
    const foundPath = candidates.find(p => fs.existsSync(p));
    if (foundPath) {
      const fileBuf = fs.readFileSync(foundPath);
      cachedLogoDataUri = `data:image/png;base64,${fileBuf.toString('base64')}`;
      return cachedLogoDataUri;
    }
  } catch (err) {
    console.error('Failed to load logo data URI:', err);
  }
  return '';
};

const sendMail = async (mailOptions) => {
  try {
    // If EMAIL_OVERRIDE_TO is set, use it; otherwise send to the actual recipient (mailOptions.to)
    if (process.env.EMAIL_OVERRIDE_TO) {
      mailOptions.to = process.env.EMAIL_OVERRIDE_TO;
    }

    // Ensure zero attachments so Gmail doesn't show an attachment chip in the inbox thread list
    mailOptions.attachments = [];

    await transporter.sendMail(mailOptions);
    console.log('Email sent to', mailOptions.to, 'subject:', mailOptions.subject);
  } catch (error) {
    console.error('Error sending email:', error);
    throw error;
  }
};


/* ═══════════════════════════════════════════════════════════════
   PREMIUM EMAIL DESIGN SYSTEM
   ═══════════════════════════════════════════════════════════════ */

const COLORS = {
  navy:       '#070f23',
  navyMid:    '#0e1d45',
  navyLight:  '#142e6b',
  blue:       '#2563eb',
  blueDark:   '#1d4ed8',
  blueLight:  '#dbeafe',
  purple:     '#7c3aed',
  purpleLight:'#ede9fe',
  green:      '#059669',
  greenLight: '#d1fae5',
  amber:      '#d97706',
  amberLight: '#fef3c7',
  rose:       '#e11d48',
  roseLight:  '#ffe4e6',
  slate50:    '#f8fafc',
  slate100:   '#f1f5f9',
  slate200:   '#e2e8f0',
  slate300:   '#cbd5e1',
  slate400:   '#94a3b8',
  slate500:   '#64748b',
  slate700:   '#334155',
  slate900:   '#0f172a',
  white:      '#ffffff',
  bodyBg:     '#f0f4ff',
};

const FONT = "-apple-system, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif";

// ── Shared Layout Components ──────────────────────────────────

const emailWrapper = (bodyContent) => `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <meta http-equiv="X-UA-Compatible" content="IE=edge" />
  <title>MIC Intellica</title>
</head>
<body style="margin:0; padding:0; background:${COLORS.bodyBg}; font-family:${FONT}; -webkit-font-smoothing:antialiased;">
  <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="background:${COLORS.bodyBg}; padding:40px 16px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" role="presentation" style="max-width:600px; width:100%; border-radius:20px; overflow:hidden; box-shadow:0 4px 24px rgba(7,15,35,0.08), 0 1px 3px rgba(0,0,0,0.04);">
          ${bodyContent}
        </table>
        <!-- Footer -->
        <table width="600" cellpadding="0" cellspacing="0" role="presentation" style="max-width:600px; width:100%;">
          <tr>
            <td style="padding:24px 32px 16px; text-align:center;">
              <p style="margin:0 0 6px; font-size:11px; color:${COLORS.slate400}; font-family:${FONT}; line-height:1.5;">
                This is an automated message from MIC Intellica Portal. Please do not reply.
              </p>
              <p style="margin:0; font-size:11px; color:${COLORS.slate400}; font-family:${FONT}; line-height:1.5;">
                DVR & Dr. HS MIC College of Technology &middot; &copy; ${new Date().getFullYear()} Intellica
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

const headerBand = (subtitle) => `
  <tr>
    <td style="background: linear-gradient(135deg, ${COLORS.navy} 0%, ${COLORS.navyMid} 50%, ${COLORS.navyLight} 100%); padding:28px 24px 22px; text-align:center;">
      <div style="background:#ffffff; border-radius:18px; padding:8px; display:inline-block; width:64px; height:64px; box-shadow:0 4px 14px rgba(0,0,0,0.22); margin-bottom:12px;">
        <img src="${getLogoSrc()}" alt="MIC College of Technology" style="width:100%; height:100%; display:block; margin:0 auto; object-fit:contain;" />
      </div>
      <h1 style="margin:0; font-size:18px; font-weight:800; letter-spacing:1.5px; color:${COLORS.white}; font-family:${FONT}; text-transform:uppercase;">
        MIC &ndash; INTELLICA PORTAL
      </h1>
      ${subtitle ? `<p style="margin:6px 0 0; font-size:12px; color:rgba(255,255,255,0.7); font-family:${FONT}; font-weight:500;">${subtitle}</p>` : ''}
    </td>
  </tr>`;

const accentBar = (color) => `
  <tr><td style="height:4px; background:${color};"></td></tr>`;

const bodyOpen = `
  <tr>
    <td style="background:${COLORS.white}; padding:36px 40px;">`;

const bodyClose = `
    </td>
  </tr>`;


/* ═══════════════════════════════════════════════════════════════
   1. OTP TEMPLATE (Admin / HOD / Faculty)
   ═══════════════════════════════════════════════════════════════ */
const otpTemplate = (otp) => {
  const digits = String(otp).split('');
  const digitBoxes = digits.map(d =>
    `<td style="width:48px; height:56px; background:${COLORS.slate50}; border:2px solid ${COLORS.slate200}; border-radius:12px; text-align:center; vertical-align:middle; font-size:28px; font-weight:800; color:${COLORS.navy}; font-family:${FONT}; letter-spacing:0;">${d}</td>`
  ).join(`<td style="width:8px;"></td>`);

  return emailWrapper(`
    ${headerBand('Secure Login Verification')}
    ${accentBar(COLORS.blue)}
    ${bodyOpen}
      <div style="text-align:center;">
        <div style="width:56px; height:56px; background:${COLORS.blueLight}; border-radius:16px; display:inline-block; line-height:56px; margin-bottom:20px;">
          <span style="font-size:26px; color:${COLORS.blue};">&#128274;</span>
        </div>
        <h2 style="margin:0 0 8px; font-size:22px; font-weight:800; color:${COLORS.slate900}; font-family:${FONT};">
          Your Verification Code
        </h2>
        <p style="margin:0 0 28px; font-size:14px; color:${COLORS.slate500}; font-family:${FONT}; line-height:1.6;">
          Use the code below to complete your login. This code is valid for <strong style="color:${COLORS.slate700};">10 minutes</strong>.
        </p>
        <table cellpadding="0" cellspacing="0" role="presentation" style="margin:0 auto 28px;">
          <tr>${digitBoxes}</tr>
        </table>
        <div style="background:${COLORS.amberLight}; border:1px solid #fde68a; border-radius:12px; padding:14px 20px; margin-bottom:8px;">
          <p style="margin:0; font-size:12px; color:${COLORS.amber}; font-family:${FONT}; font-weight:600;">
            &#9888; If you did not request this code, please ignore this email or contact your administrator.
          </p>
        </div>
      </div>
    ${bodyClose}
  `);
};


/* ═══════════════════════════════════════════════════════════════
   2. REGISTRATION PENDING TEMPLATE
   ═══════════════════════════════════════════════════════════════ */
const pendingTemplate = (name, role) => {
  return emailWrapper(`
    ${headerBand('DVR & Dr. HS MIC College of Technology')}
    ${accentBar(COLORS.amber)}
    ${bodyOpen}
      <div style="text-align:center;">
        <div style="width:56px; height:56px; background:${COLORS.amberLight}; border-radius:16px; display:inline-block; line-height:56px; margin-bottom:20px;">
          <span style="font-size:26px; color:${COLORS.amber};">&#9203;</span>
        </div>
        <h2 style="margin:0 0 6px; font-size:20px; font-weight:800; color:${COLORS.slate900}; font-family:${FONT};">
          Registration Received
        </h2>
        <p style="margin:0 0 24px; font-size:13px; color:${COLORS.slate400}; font-family:${FONT};">
          Your ${role || 'account'} registration is being processed
        </p>

        <div style="background:${COLORS.slate50}; border:1px solid ${COLORS.slate200}; border-radius:16px; padding:24px; text-align:left; margin-bottom:24px;">
          <p style="margin:0 0 12px; font-size:15px; color:${COLORS.slate900}; font-family:${FONT}; font-weight:700;">
            Hello ${name},
          </p>
          <p style="margin:0; font-size:14px; color:${COLORS.slate500}; font-family:${FONT}; line-height:1.7;">
            Thank you for registering with the MIC Intellica Portal. Your account is currently <strong style="color:${COLORS.amber};">under review</strong> by the institutional administrator. You will receive an email notification once your account has been approved.
          </p>
        </div>

        <div style="background:${COLORS.blueLight}; border-radius:12px; padding:14px 20px;">
          <p style="margin:0; font-size:13px; color:${COLORS.blue}; font-family:${FONT}; font-weight:600;">
            Welcome aboard &mdash; we look forward to having you on the portal.
          </p>
        </div>
      </div>
    ${bodyClose}
  `);
};


/* ═══════════════════════════════════════════════════════════════
   3. ACCOUNT APPROVED TEMPLATE
   ═══════════════════════════════════════════════════════════════ */
const approvedTemplate = (name) => {
  return emailWrapper(`
    ${headerBand('DVR & Dr. HS MIC College of Technology')}
    ${accentBar(COLORS.green)}
    ${bodyOpen}
      <div style="text-align:center;">
        <div style="width:56px; height:56px; background:${COLORS.greenLight}; border-radius:16px; display:inline-block; line-height:56px; margin-bottom:20px;">
          <span style="font-size:26px; color:${COLORS.green};">&#10004;</span>
        </div>
        <h2 style="margin:0 0 6px; font-size:20px; font-weight:800; color:${COLORS.slate900}; font-family:${FONT};">
          Account Approved
        </h2>
        <p style="margin:0 0 24px; font-size:13px; color:${COLORS.slate400}; font-family:${FONT};">
          You are now verified and ready to go
        </p>

        <div style="background:${COLORS.slate50}; border:1px solid ${COLORS.slate200}; border-radius:16px; padding:24px; text-align:left; margin-bottom:24px;">
          <p style="margin:0 0 12px; font-size:15px; color:${COLORS.slate900}; font-family:${FONT}; font-weight:700;">
            Hello ${name},
          </p>
          <p style="margin:0; font-size:14px; color:${COLORS.slate500}; font-family:${FONT}; line-height:1.7;">
            Great news! Your account has been <strong style="color:${COLORS.green};">approved</strong> by the administrator. You can now log in and access the Intellica Portal to manage your academic research credits and activities.
          </p>
        </div>

        <a href="#" style="display:inline-block; background:${COLORS.blue}; color:${COLORS.white}; text-decoration:none; padding:14px 36px; border-radius:12px; font-size:14px; font-weight:700; font-family:${FONT}; letter-spacing:0.3px;">
          Log In to Intellica
        </a>
      </div>
    ${bodyClose}
  `);
};


/* ═══════════════════════════════════════════════════════════════
   4. ADMIN NOTIFY — NEW REGISTRATION
   ═══════════════════════════════════════════════════════════════ */
const adminNotifyTemplate = (name, role, dept) => {
  return emailWrapper(`
    ${headerBand('Admin Notification')}
    ${accentBar(COLORS.purple)}
    ${bodyOpen}
      <div style="text-align:center;">
        <div style="width:56px; height:56px; background:${COLORS.purpleLight}; border-radius:16px; display:inline-block; line-height:56px; margin-bottom:20px;">
          <span style="font-size:26px; color:${COLORS.purple};">&#128100;</span>
        </div>
        <h2 style="margin:0 0 6px; font-size:20px; font-weight:800; color:${COLORS.slate900}; font-family:${FONT};">
          New ${role} Registration
        </h2>
        <p style="margin:0 0 24px; font-size:13px; color:${COLORS.slate400}; font-family:${FONT};">
          A new user is awaiting approval
        </p>
      </div>

      <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="background:${COLORS.slate50}; border:1px solid ${COLORS.slate200}; border-radius:16px; margin-bottom:24px;">
        <tr>
          <td style="padding:20px 24px; border-bottom:1px solid ${COLORS.slate200};">
            <p style="margin:0; font-size:11px; font-weight:700; color:${COLORS.slate400}; font-family:${FONT}; text-transform:uppercase; letter-spacing:1px;">Name</p>
            <p style="margin:4px 0 0; font-size:15px; font-weight:700; color:${COLORS.slate900}; font-family:${FONT};">${name}</p>
          </td>
        </tr>
        <tr>
          <td style="padding:20px 24px; border-bottom:1px solid ${COLORS.slate200};">
            <p style="margin:0; font-size:11px; font-weight:700; color:${COLORS.slate400}; font-family:${FONT}; text-transform:uppercase; letter-spacing:1px;">Role</p>
            <p style="margin:4px 0 0; font-size:15px; font-weight:700; color:${COLORS.slate900}; font-family:${FONT};">${role}</p>
          </td>
        </tr>
        <tr>
          <td style="padding:20px 24px;">
            <p style="margin:0; font-size:11px; font-weight:700; color:${COLORS.slate400}; font-family:${FONT}; text-transform:uppercase; letter-spacing:1px;">Department</p>
            <p style="margin:4px 0 0; font-size:15px; font-weight:700; color:${COLORS.slate900}; font-family:${FONT};">${dept || 'N/A'}</p>
          </td>
        </tr>
      </table>

      <div style="text-align:center;">
        <p style="margin:0; font-size:13px; color:${COLORS.slate500}; font-family:${FONT};">
          Please log in to the Admin Portal to review and approve this registration.
        </p>
      </div>
    ${bodyClose}
  `);
};


/* ═══════════════════════════════════════════════════════════════
   5. INSTITUTIONAL ACTIVITY CREATED — SENT TO ALL HODs
   ═══════════════════════════════════════════════════════════════ */
const activityForHODsTemplate = (activity) => {
  const actDate = new Date(activity.date);
  const formattedDate = actDate.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
  const venue = activity.venue || 'Council Hall';
  const time = activity.time || '10:00 AM';
  const creatorName = activity.createdByName || 'Institutional Administrator';

  const linkRow = activity.link ? `
    <tr>
      <td style="padding:16px 24px;">
        <p style="margin:0; font-size:11px; font-weight:700; color:${COLORS.slate400}; font-family:${FONT}; text-transform:uppercase; letter-spacing:1px;">Meeting Link</p>
        <a href="${activity.link}" style="margin:4px 0 0; font-size:14px; font-weight:600; color:${COLORS.blue}; font-family:${FONT}; display:block; word-break:break-all; text-decoration:none;">${activity.link}</a>
      </td>
    </tr>` : '';

  return emailWrapper(`
    ${headerBand('Institutional Notification')}
    ${accentBar(COLORS.purple)}
    ${bodyOpen}
      <div style="text-align:center;">
        <div style="width:56px; height:56px; background:${COLORS.purpleLight}; border-radius:16px; display:inline-block; line-height:56px; margin-bottom:20px;">
          <span style="font-size:26px; color:${COLORS.purple};">&#128197;</span>
        </div>
        <h2 style="margin:0 0 6px; font-size:20px; font-weight:800; color:${COLORS.slate900}; font-family:${FONT};">
          New Institutional Activity
        </h2>
        <p style="margin:0 0 4px; font-size:13px; color:${COLORS.slate400}; font-family:${FONT};">
          Scheduled by ${creatorName}
        </p>
        <span style="display:inline-block; margin:8px 0 24px; background:${COLORS.purpleLight}; color:${COLORS.purple}; font-size:11px; font-weight:800; padding:5px 14px; border-radius:20px; font-family:${FONT}; text-transform:uppercase; letter-spacing:0.8px;">
          Target: All Department HODs
        </span>
      </div>

      <!-- Activity Title Card -->
      <div style="background:linear-gradient(135deg, ${COLORS.purple}08, ${COLORS.purpleLight}); border:1px solid #e0d4f5; border-left:4px solid ${COLORS.purple}; border-radius:16px; padding:20px 24px; margin-bottom:20px;">
        <h3 style="margin:0; font-size:18px; font-weight:800; color:${COLORS.slate900}; font-family:${FONT};">
          ${activity.title}
        </h3>
        ${activity.description ? `<p style="margin:10px 0 0; font-size:14px; color:${COLORS.slate500}; font-family:${FONT}; line-height:1.6;">${activity.description}</p>` : ''}
      </div>

      <!-- Details Table -->
      <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="background:${COLORS.slate50}; border:1px solid ${COLORS.slate200}; border-radius:16px; margin-bottom:24px;">
        <tr>
          <td style="padding:16px 24px; border-bottom:1px solid ${COLORS.slate200};">
            <p style="margin:0; font-size:11px; font-weight:700; color:${COLORS.slate400}; font-family:${FONT}; text-transform:uppercase; letter-spacing:1px;">Date</p>
            <p style="margin:4px 0 0; font-size:15px; font-weight:700; color:${COLORS.slate900}; font-family:${FONT};">${formattedDate}</p>
          </td>
        </tr>
        <tr>
          <td style="padding:16px 24px; border-bottom:1px solid ${COLORS.slate200};">
            <p style="margin:0; font-size:11px; font-weight:700; color:${COLORS.slate400}; font-family:${FONT}; text-transform:uppercase; letter-spacing:1px;">Time</p>
            <p style="margin:4px 0 0; font-size:15px; font-weight:700; color:${COLORS.slate900}; font-family:${FONT};">${time}</p>
          </td>
        </tr>
        <tr>
          <td style="padding:16px 24px;${activity.link ? ' border-bottom:1px solid ' + COLORS.slate200 + ';' : ''}">
            <p style="margin:0; font-size:11px; font-weight:700; color:${COLORS.slate400}; font-family:${FONT}; text-transform:uppercase; letter-spacing:1px;">Venue</p>
            <p style="margin:4px 0 0; font-size:15px; font-weight:700; color:${COLORS.slate900}; font-family:${FONT};">${venue}</p>
          </td>
        </tr>
        ${linkRow}
      </table>

      <div style="text-align:center;">
        <p style="margin:0; font-size:13px; color:${COLORS.slate500}; font-family:${FONT}; line-height:1.6;">
          Please mark your calendar and ensure attendance. Log in to the Intellica Calendar for full details.
        </p>
      </div>
    ${bodyClose}
  `);
};


/* ═══════════════════════════════════════════════════════════════
   6. DEPARTMENT ACTIVITY CREATED — SENT TO DEPT FACULTY
   ═══════════════════════════════════════════════════════════════ */
const activityForFacultyTemplate = (activity, department) => {
  const actDate = new Date(activity.date);
  const formattedDate = actDate.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
  const venue = activity.venue || 'Department Conference Room';
  const time = activity.time || '10:00 AM';
  const creatorName = activity.createdByName || 'Head of Department';
  const dept = department || activity.department || 'Your Department';

  const linkRow = activity.link ? `
    <tr>
      <td style="padding:16px 24px;">
        <p style="margin:0; font-size:11px; font-weight:700; color:${COLORS.slate400}; font-family:${FONT}; text-transform:uppercase; letter-spacing:1px;">Meeting Link</p>
        <a href="${activity.link}" style="margin:4px 0 0; font-size:14px; font-weight:600; color:${COLORS.blue}; font-family:${FONT}; display:block; word-break:break-all; text-decoration:none;">${activity.link}</a>
      </td>
    </tr>` : '';

  return emailWrapper(`
    ${headerBand('Department Notification')}
    ${accentBar(COLORS.blue)}
    ${bodyOpen}
      <div style="text-align:center;">
        <div style="width:56px; height:56px; background:${COLORS.blueLight}; border-radius:16px; display:inline-block; line-height:56px; margin-bottom:20px;">
          <span style="font-size:26px; color:${COLORS.blue};">&#128197;</span>
        </div>
        <h2 style="margin:0 0 6px; font-size:20px; font-weight:800; color:${COLORS.slate900}; font-family:${FONT};">
          New Department Activity
        </h2>
        <p style="margin:0 0 4px; font-size:13px; color:${COLORS.slate400}; font-family:${FONT};">
          Scheduled by ${creatorName} (HOD)
        </p>
        <span style="display:inline-block; margin:8px 0 24px; background:${COLORS.blueLight}; color:${COLORS.blue}; font-size:11px; font-weight:800; padding:5px 14px; border-radius:20px; font-family:${FONT}; text-transform:uppercase; letter-spacing:0.8px;">
          Target: ${dept} Faculty Members
        </span>
      </div>

      <!-- Activity Title Card -->
      <div style="background:linear-gradient(135deg, ${COLORS.blue}08, ${COLORS.blueLight}); border:1px solid #bfdbfe; border-left:4px solid ${COLORS.blue}; border-radius:16px; padding:20px 24px; margin-bottom:20px;">
        <h3 style="margin:0; font-size:18px; font-weight:800; color:${COLORS.slate900}; font-family:${FONT};">
          ${activity.title}
        </h3>
        ${activity.description ? `<p style="margin:10px 0 0; font-size:14px; color:${COLORS.slate500}; font-family:${FONT}; line-height:1.6;">${activity.description}</p>` : ''}
      </div>

      <!-- Details Table -->
      <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="background:${COLORS.slate50}; border:1px solid ${COLORS.slate200}; border-radius:16px; margin-bottom:24px;">
        <tr>
          <td style="padding:16px 24px; border-bottom:1px solid ${COLORS.slate200};">
            <p style="margin:0; font-size:11px; font-weight:700; color:${COLORS.slate400}; font-family:${FONT}; text-transform:uppercase; letter-spacing:1px;">Date</p>
            <p style="margin:4px 0 0; font-size:15px; font-weight:700; color:${COLORS.slate900}; font-family:${FONT};">${formattedDate}</p>
          </td>
        </tr>
        <tr>
          <td style="padding:16px 24px; border-bottom:1px solid ${COLORS.slate200};">
            <p style="margin:0; font-size:11px; font-weight:700; color:${COLORS.slate400}; font-family:${FONT}; text-transform:uppercase; letter-spacing:1px;">Time</p>
            <p style="margin:4px 0 0; font-size:15px; font-weight:700; color:${COLORS.slate900}; font-family:${FONT};">${time}</p>
          </td>
        </tr>
        <tr>
          <td style="padding:16px 24px;${activity.link ? ' border-bottom:1px solid ' + COLORS.slate200 + ';' : ''}">
            <p style="margin:0; font-size:11px; font-weight:700; color:${COLORS.slate400}; font-family:${FONT}; text-transform:uppercase; letter-spacing:1px;">Venue</p>
            <p style="margin:4px 0 0; font-size:15px; font-weight:700; color:${COLORS.slate900}; font-family:${FONT};">${venue}</p>
          </td>
        </tr>
        ${linkRow}
      </table>

      <div style="text-align:center;">
        <p style="margin:0; font-size:13px; color:${COLORS.slate500}; font-family:${FONT}; line-height:1.6;">
          Please plan accordingly and check the Intellica Calendar for updates.
        </p>
      </div>
    ${bodyClose}
  `);
};


/* ═══════════════════════════════════════════════════════════════
   PUBLIC API FUNCTIONS
   ═══════════════════════════════════════════════════════════════ */

const sendOTP = async (email, otp) => {
  const mailOptions = {
    from: process.env.EMAIL_USER,
    to: email,
    subject: 'Your OTP for Login — MIC Intellica',
    text: `Hello,\n\nYour OTP is: ${otp}. It expires in 10 minutes.\n\nHave a great day.`,
    html: otpTemplate(otp),
    attachments: []
  };

  await sendMail(mailOptions);
};

const sendRegistrationNotification = async (userObj) => {
  // userObj: { name, email, role, department }
  const html = pendingTemplate(userObj.name, userObj.role);
  const mailOptions = {
    from: process.env.EMAIL_USER,
    to: userObj.email,
    subject: 'Your account is registered — awaiting approval',
    html
  };

  await sendMail(mailOptions);

  // notify all admins
  try {
    const admins = await User.find({ role: 'ADMIN' });
    const adminEmails = admins.map(a => a.email).filter(Boolean);
    if (adminEmails.length) {
      const adminMail = {
        from: process.env.EMAIL_USER,
        to: adminEmails.join(','),
        subject: `New ${userObj.role} Registration — ${userObj.name}`,
        html: adminNotifyTemplate(userObj.name, userObj.role, userObj.department)
      };
      await sendMail(adminMail);
    }
  } catch (err) {
    console.error('Failed to notify admins:', err);
  }
};

const sendApprovalEmailToFaculty = async (faculty) => {
  const html = approvedTemplate(faculty.name);
  const mailOptions = {
    from: process.env.EMAIL_USER,
    to: faculty.email,
    subject: 'Your Faculty Account Has Been Approved — MIC Intellica',
    html
  };
  await sendMail(mailOptions);
};

const sendApprovalEmailToHod = async (hod) => {
  const html = approvedTemplate(hod.name);
  const mailOptions = {
    from: process.env.EMAIL_USER,
    to: hod.email,
    subject: 'Your HOD Account Has Been Approved — MIC Intellica',
    html
  };
  await sendMail(mailOptions);
};

/**
 * Send activity notification emails to all HODs (when Admin creates an institutional activity).
 * @param {Object} activity - The saved DepartmentActivity document
 * @param {Array<{name: string, email: string, department: string}>} hods - List of HOD records
 */
const sendActivityEmailToHODs = async (activity, hods) => {
  const html = activityForHODsTemplate(activity);
  const emails = hods.map(h => h.email).filter(Boolean);
  if (!emails.length) return;

  const mailOptions = {
    from: process.env.EMAIL_USER,
    to: emails.join(','),
    subject: `Institutional Activity: ${activity.title} — MIC Intellica`,
    html
  };

  await sendMail(mailOptions);
};

/**
 * Send activity notification emails to all Faculty in a department (when HOD creates a dept activity).
 * @param {Object} activity - The saved DepartmentActivity document
 * @param {Array<{name: string, email: string}>} facultyList - List of Faculty records in that department
 * @param {string} department - Department name (e.g. 'CSE')
 */
const sendActivityEmailToFaculty = async (activity, facultyList, department) => {
  const html = activityForFacultyTemplate(activity, department);
  const emails = facultyList.map(f => f.email).filter(Boolean);
  if (!emails.length) return;

  const mailOptions = {
    from: process.env.EMAIL_USER,
    to: emails.join(','),
    subject: `${department} Department Activity: ${activity.title} — MIC Intellica`,
    html
  };

  await sendMail(mailOptions);
};


/* ═══════════════════════════════════════════════════════════════
   7. ONBOARDING TEMPLATE — SENT TO NEWLY CREATED USERS
   ═══════════════════════════════════════════════════════════════ */
const onboardingTemplate = (name, role, department, createdBy) => {
  const roleLabel = role === 'HOD' ? 'Head of Department' : role === 'ADMIN' ? 'Administrator' : 'Faculty Member';
  const deptLine = department && department !== 'ADMINISTRATION' ? `Department of ${department}` : 'Institutional Administration';

  return emailWrapper(`
    ${headerBand('Welcome to MIC Intellica')}
    ${accentBar(COLORS.blue)}
    ${bodyOpen}
      <div style="text-align:center;">
        <div style="width:56px; height:56px; background:${COLORS.blueLight}; border-radius:16px; display:inline-block; line-height:56px; margin-bottom:20px;">
          <span style="font-size:26px; color:${COLORS.blue};">&#127891;</span>
        </div>
        <h2 style="margin:0 0 6px; font-size:20px; font-weight:800; color:${COLORS.slate900}; font-family:${FONT};">
          Welcome to Intellica
        </h2>
        <p style="margin:0 0 24px; font-size:13px; color:${COLORS.slate400}; font-family:${FONT};">
          Your account has been created by ${createdBy}
        </p>
      </div>

      <div style="background:${COLORS.slate50}; border:1px solid ${COLORS.slate200}; border-radius:16px; padding:24px; margin-bottom:24px;">
        <p style="margin:0 0 14px; font-size:15px; color:${COLORS.slate900}; font-family:${FONT}; font-weight:700;">
          Hello ${name},
        </p>
        <p style="margin:0 0 16px; font-size:14px; color:${COLORS.slate500}; font-family:${FONT}; line-height:1.7;">
          Your account on the MIC Intellica Portal has been set up for you as a <strong style="color:${COLORS.blue};">${roleLabel}</strong> in <strong style="color:${COLORS.slate700};">${deptLine}</strong>.
        </p>
        <p style="margin:0; font-size:14px; color:${COLORS.slate500}; font-family:${FONT}; line-height:1.7;">
          You can log in using your registered email address. On your first login, you will receive a one-time password (OTP) to verify your identity and set up access.
        </p>
      </div>

      <!-- Quick Info Card -->
      <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="background:${COLORS.slate50}; border:1px solid ${COLORS.slate200}; border-radius:16px; margin-bottom:24px;">
        <tr>
          <td style="padding:16px 24px; border-bottom:1px solid ${COLORS.slate200};">
            <p style="margin:0; font-size:11px; font-weight:700; color:${COLORS.slate400}; font-family:${FONT}; text-transform:uppercase; letter-spacing:1px;">Your Role</p>
            <p style="margin:4px 0 0; font-size:15px; font-weight:700; color:${COLORS.slate900}; font-family:${FONT};">${roleLabel}</p>
          </td>
        </tr>
        <tr>
          <td style="padding:16px 24px; border-bottom:1px solid ${COLORS.slate200};">
            <p style="margin:0; font-size:11px; font-weight:700; color:${COLORS.slate400}; font-family:${FONT}; text-transform:uppercase; letter-spacing:1px;">Department</p>
            <p style="margin:4px 0 0; font-size:15px; font-weight:700; color:${COLORS.slate900}; font-family:${FONT};">${deptLine}</p>
          </td>
        </tr>
        <tr>
          <td style="padding:16px 24px;">
            <p style="margin:0; font-size:11px; font-weight:700; color:${COLORS.slate400}; font-family:${FONT}; text-transform:uppercase; letter-spacing:1px;">Login</p>
            <p style="margin:4px 0 0; font-size:15px; font-weight:700; color:${COLORS.blue}; font-family:${FONT};">Use your email to receive OTP on first login</p>
          </td>
        </tr>
      </table>

      <div style="text-align:center;">
        <a href="#" style="display:inline-block; background:${COLORS.blue}; color:${COLORS.white}; text-decoration:none; padding:14px 36px; border-radius:12px; font-size:14px; font-weight:700; font-family:${FONT}; letter-spacing:0.3px;">
          Log In to Intellica
        </a>
        <p style="margin:16px 0 0; font-size:12px; color:${COLORS.slate400}; font-family:${FONT};">
          If you have questions, please contact your ${role === 'FACULTY' ? 'HOD or ' : ''}administrator.
        </p>
      </div>
    ${bodyClose}
  `);
};


/* ═══════════════════════════════════════════════════════════════
   8. FACULTY NOTIFICATION TEMPLATE — APPROVAL / REJECTION / REVISION
   ═══════════════════════════════════════════════════════════════ */
const STATUS_STYLES = {
  APPROVED: {
    icon: '&#10004;',
    iconBg: COLORS.greenLight,
    iconColor: COLORS.green,
    accent: COLORS.green,
    title: 'Proposal Approved',
    subtitle: 'Your submission has been verified',
    borderColor: '#86efac',
    cardBg: `linear-gradient(135deg, ${COLORS.green}08, ${COLORS.greenLight})`,
  },
  REJECTED: {
    icon: '&#10008;',
    iconBg: COLORS.roseLight,
    iconColor: COLORS.rose,
    accent: COLORS.rose,
    title: 'Proposal Rejected',
    subtitle: 'Your submission was not approved',
    borderColor: '#fda4af',
    cardBg: `linear-gradient(135deg, ${COLORS.rose}08, ${COLORS.roseLight})`,
  },
  REVISION: {
    icon: '&#9998;',
    iconBg: COLORS.amberLight,
    iconColor: COLORS.amber,
    accent: COLORS.amber,
    title: 'Revision Requested',
    subtitle: 'Please review and re-submit',
    borderColor: '#fde68a',
    cardBg: `linear-gradient(135deg, ${COLORS.amber}08, ${COLORS.amberLight})`,
  },
  HOD_APPROVED: {
    icon: '&#10004;',
    iconBg: COLORS.blueLight,
    iconColor: COLORS.blue,
    accent: COLORS.blue,
    title: 'HOD Approved — Forwarded to Admin',
    subtitle: 'Your proposal cleared departmental review',
    borderColor: '#93c5fd',
    cardBg: `linear-gradient(135deg, ${COLORS.blue}08, ${COLORS.blueLight})`,
  },
  DISCUSSION: {
    icon: '&#128172;',
    iconBg: COLORS.purpleLight,
    iconColor: COLORS.purple,
    accent: COLORS.purple,
    title: 'Review Comment Added',
    subtitle: 'A reviewer left feedback on your submission',
    borderColor: '#c4b5fd',
    cardBg: `linear-gradient(135deg, ${COLORS.purple}08, ${COLORS.purpleLight})`,
  },
};

const facultyNotificationTemplate = (facultyName, uploadTitle, statusKey, reviewerInfo, comment, credits) => {
  const style = STATUS_STYLES[statusKey] || STATUS_STYLES.APPROVED;

  const commentBlock = comment ? `
    <div style="background:${COLORS.slate50}; border:1px solid ${COLORS.slate200}; border-left:4px solid ${style.accent}; border-radius:12px; padding:16px 20px; margin:16px 0 0;">
      <p style="margin:0 0 4px; font-size:11px; font-weight:700; color:${COLORS.slate400}; font-family:${FONT}; text-transform:uppercase; letter-spacing:1px;">Reviewer Comment</p>
      <p style="margin:0; font-size:14px; color:${COLORS.slate700}; font-family:${FONT}; line-height:1.6; font-style:italic;">"${comment}"</p>
    </div>` : '';

  const creditsBlock = credits ? `
    <div style="text-align:center; margin:16px 0 0;">
      <span style="display:inline-block; background:${COLORS.greenLight}; color:${COLORS.green}; font-size:13px; font-weight:800; padding:8px 20px; border-radius:20px; font-family:${FONT};">
        +${credits} Credits Awarded
      </span>
    </div>` : '';

  return emailWrapper(`
    ${headerBand('Faculty Notification')}
    ${accentBar(style.accent)}
    ${bodyOpen}
      <div style="text-align:center;">
        <div style="width:56px; height:56px; background:${style.iconBg}; border-radius:16px; display:inline-block; line-height:56px; margin-bottom:20px;">
          <span style="font-size:26px; color:${style.iconColor};">${style.icon}</span>
        </div>
        <h2 style="margin:0 0 6px; font-size:20px; font-weight:800; color:${COLORS.slate900}; font-family:${FONT};">
          ${style.title}
        </h2>
        <p style="margin:0 0 24px; font-size:13px; color:${COLORS.slate400}; font-family:${FONT};">
          ${style.subtitle}
        </p>
      </div>

      <div style="background:${COLORS.slate50}; border:1px solid ${COLORS.slate200}; border-radius:16px; padding:24px; margin-bottom:20px;">
        <p style="margin:0 0 14px; font-size:15px; color:${COLORS.slate900}; font-family:${FONT}; font-weight:700;">
          Hello ${facultyName},
        </p>
        <p style="margin:0; font-size:14px; color:${COLORS.slate500}; font-family:${FONT}; line-height:1.7;">
          Your submission has been reviewed${reviewerInfo ? ` by <strong style="color:${COLORS.slate700};">${reviewerInfo}</strong>` : ''}.
        </p>
      </div>

      <!-- Upload Title Card -->
      <div style="background:${style.cardBg}; border:1px solid ${style.borderColor}; border-left:4px solid ${style.accent}; border-radius:16px; padding:20px 24px;">
        <p style="margin:0 0 4px; font-size:11px; font-weight:700; color:${COLORS.slate400}; font-family:${FONT}; text-transform:uppercase; letter-spacing:1px;">Submission</p>
        <h3 style="margin:0; font-size:16px; font-weight:800; color:${COLORS.slate900}; font-family:${FONT};">
          ${uploadTitle}
        </h3>
      </div>

      ${commentBlock}
      ${creditsBlock}

      <div style="text-align:center; margin-top:24px;">
        <p style="margin:0; font-size:13px; color:${COLORS.slate500}; font-family:${FONT}; line-height:1.6;">
          Log in to the Intellica Portal to view details and take further action.
        </p>
      </div>
    ${bodyClose}
  `);
};


/* ═══════════════════════════════════════════════════════════════
   SENDER FUNCTIONS
   ═══════════════════════════════════════════════════════════════ */

/**
 * Send onboarding welcome email to a newly created user.
 * @param {{ name: string, email: string, role: string, department: string }} user
 * @param {string} createdBy - Who created this user, e.g. "Administrator" or "HOD (Dr. Kumar)"
 */
const sendOnboardingEmail = async (user, createdBy) => {
  const html = onboardingTemplate(user.name, user.role || 'FACULTY', user.department || '', createdBy);
  const mailOptions = {
    from: process.env.EMAIL_USER,
    to: user.email,
    subject: `Welcome to MIC Intellica — Your ${user.role || 'Faculty'} Account is Ready`,
    html
  };
  await sendMail(mailOptions);
};

/**
 * Send email to faculty about upload status change (approved, rejected, revision, discussion).
 * @param {{ name: string, email: string }} faculty
 * @param {string} uploadTitle
 * @param {string} statusKey - One of: APPROVED, REJECTED, REVISION, HOD_APPROVED, DISCUSSION
 * @param {string} [reviewerInfo] - e.g. "HOD (Dr. Kumar)" or "Administrator"
 * @param {string} [comment] - Reviewer comment if any
 * @param {number} [credits] - Credits awarded (only for APPROVED)
 */
const sendFacultyNotificationEmail = async (faculty, uploadTitle, statusKey, reviewerInfo, comment, credits) => {
  const style = STATUS_STYLES[statusKey];
  if (!style) return; // Unknown status

  const html = facultyNotificationTemplate(faculty.name, uploadTitle, statusKey, reviewerInfo, comment, credits);
  const mailOptions = {
    from: process.env.EMAIL_USER,
    to: faculty.email,
    subject: `${style.title}: "${uploadTitle}" — MIC Intellica`,
    html
  };
  await sendMail(mailOptions);
};


module.exports = {
  sendOTP,
  sendRegistrationNotification,
  sendApprovalEmailToFaculty,
  sendApprovalEmailToHod,
  sendActivityEmailToHODs,
  sendActivityEmailToFaculty,
  sendOnboardingEmail,
  sendFacultyNotificationEmail
};