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

// Determine logo src: prefer remote URL; otherwise use CID 'cid:mic_logo' and attach the local file in sendMail
const getLogoSrc = () => {
  if (process.env.EMAIL_LOGO_URL) return process.env.EMAIL_LOGO_URL;
  return 'cid:mic_logo';
};

const sendMail = async (mailOptions) => {
  try {
    // Remove any non-inline attachments so images don't appear as bottom attachments in mail clients
    if (mailOptions.attachments && mailOptions.attachments.length) {
      mailOptions.attachments = mailOptions.attachments.filter(a => a && (a.cid || a.contentDisposition === 'inline'));
    }

    // Allow callers to opt out of adding the inline logo (e.g., OTP messages)
    const skipLogo = mailOptions.skipLogo === true;

    // If no remote logo URL provided and caller didn't skip it, attach local logo as inline CID so <img src="cid:mic_logo"> works
    if (!process.env.EMAIL_LOGO_URL && !skipLogo) {
      try {
        const candidate = path.join(__dirname, '..', '..', 'frontend', 'src', 'assets', 'logo.png');
        if (fs.existsSync(candidate)) {
          mailOptions.attachments = (mailOptions.attachments || []).concat({
            filename: path.basename(candidate),
            path: candidate,
            cid: 'mic_logo',
            contentDisposition: 'inline'
          });
        }
      } catch (err) {
        console.error('Failed to attach local logo:', err);
      }
    }

    await transporter.sendMail(mailOptions);
    console.log('Email sent to', mailOptions.to, 'subject:', mailOptions.subject);
  } catch (error) {
    console.error('Error sending email:', error);
    throw error;
  }
};

const baseHeader = (title, subtitle) => `
  <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="font-family: 'Helvetica', Arial, sans-serif; background:#f4f7fa; padding:40px 0;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" role="presentation" style="background:#f0f3f7; border-radius:14px; overflow:hidden;">
          <tr style="background:#1a3a52; color:#ffffff; text-align:center; border-bottom:1px solid #1a3a52;">
                    <td style="padding:32px 24px;">
                      <img src="${getLogoSrc()}" alt="Logo" style="height:90px; width:auto; display:block; margin:0 auto 18px auto; object-fit:contain;" />
                      <h1 style="font-size:22px; margin:0; letter-spacing:2px; color:#ffffff;">MIC - INTELLICA PORTAL</h1>
                      <div style="color:#b8bcc4; opacity:0.95; margin-top:10px; font-size:16px; font-weight:500;">${subtitle || 'DVR & DR.HS MIC College of Technology'}</div>
                    </td>
                  </tr>
          <tr>
            <td style="padding:40px 48px; text-align:center; background:#f0f3f7;">
              ${title}
`; 

const baseFooter = `
            </td>
          </tr>
          <tr>
            <td style="padding:18px 24px; font-size:12px; color:#9aa3ae; text-align:center;">
              This is an automated message from MIC - INTELLICA PORTAL. Please do not reply to this email.<br/>DVR & DR.HS MIC College of Technology<br/>© MIC INTELLICA
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>`;

const pendingTemplate = (name, role) => {
  const title = `
    <div style="background:#f0f3f7; padding:30px 0; text-align:center;">
        <div style="font-size:60px; line-height:1; margin-bottom:20px;">⏱️</div>
      <p style="color:#0f2333; margin:0 0 18px 0; font-size:18px; font-weight:700;">Hello ${name}</p>
      <p style="color:#555; max-width:480px; margin:0 auto 18px; line-height:1.6; font-size:15px; font-weight:500;">Thank you for registering with MIC - INTELLICA PORTAL. Your account is currently under review by the Admin. You will receive an email notification once your account is approved.</p>
      <p style="color:#18a0ff; font-weight:600; margin:16px 0 0 0; font-size:15px;">Welcome aboard — we look forward to having you on the portal!</p>
    </div>
  `;

  return baseHeader(title, '') + baseFooter;
};

const approvedTemplate = (name) => {
  const title = `
    <div style="background:#f0f3f7; padding:30px 0; text-align:center;">
        <div style="font-size:60px; line-height:1; margin-bottom:20px;">✅</div>
      <p style="color:#0f2333; margin:0 0 18px 0; font-size:18px; font-weight:700;">Hello ${name}</p>
      <p style="color:#2da84a; font-weight:700; margin:0 0 16px 0; font-size:15px;">Here we go! Your account is approved — login now</p>
      <p style="color:#555; max-width:480px; margin:0 auto; line-height:1.6; font-size:15px; font-weight:500;">Your account has been approved. You can now log in and access the portal.</p>
    </div>
  `;

  return baseHeader(title, '') + baseFooter;
};

const adminNotifyTemplate = (name, role, dept) => {
  const title = `
    <div>
      <h2 style="color:#0f2333; margin:0 0 10px; font-size:20px;">New ${role} Registered</h2>
      <p style="color:#6b7780; margin:12px 0 0;">${name} has registered for ${dept || 'N/A'} and is awaiting approval.</p>
    </div>
  `;

  return baseHeader(title, '') + baseFooter;
};

const sendOTP = async (email, otp) => {
  const mailOptions = {
    from: process.env.EMAIL_USER,
    to: email,
    subject: 'Your OTP for Login',
    text: `Hello,\n\nYour OTP is: ${otp}. It expires in 10 minutes.\n\nHave a great day.`,
    // OTP should not include attachments (no logo or other files)
    skipLogo: true,
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
    subject: 'Your account is registered - awaiting approval',
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
        subject: `New ${userObj.role} Registration - ${userObj.name}`,
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
    subject: 'Your Faculty Account Has Been Approved',
    html
  };
  await sendMail(mailOptions);
};

const sendApprovalEmailToHod = async (hod) => {
  const html = approvedTemplate(hod.name);
  const mailOptions = {
    from: process.env.EMAIL_USER,
    to: hod.email,
    subject: 'Your HOD Account Has Been Approved',
    html
  };
  await sendMail(mailOptions);
};

module.exports = {
  sendOTP,
  sendRegistrationNotification,
  sendApprovalEmailToFaculty,
  sendApprovalEmailToHod
};