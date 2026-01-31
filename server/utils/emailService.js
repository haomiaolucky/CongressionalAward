const nodemailer = require('nodemailer');
require('dotenv').config();

// Create transporter
const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST,
  port: process.env.EMAIL_PORT,
  secure: false, // true for 465, false for other ports
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASSWORD
  }
});

// Verify email configuration
const verifyEmailConfig = async () => {
  try {
    await transporter.verify();
    console.log('✅ Email service is ready');
  } catch (error) {
    console.error('⚠️  Email service configuration error:', error.message);
  }
};

// Send supervisor verification email
const sendVerificationEmail = async (supervisorEmail, supervisorName, logDetails) => {
  const { studentName, activityName, category, date, hours, notes, proof, token, logId } = logDetails;
  
  const verifyUrl = `${process.env.APP_URL}/api/logs/verify?token=${token}`;

  const mailOptions = {
    from: process.env.EMAIL_FROM,
    to: supervisorEmail,
    subject: `Hour Log Verification Required - ${studentName}`,
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background-color: #0066cc; color: white; padding: 20px; text-align: center; }
          .content { padding: 20px; background-color: #f9f9f9; }
          .details { background-color: white; padding: 15px; margin: 15px 0; border-left: 4px solid #0066cc; }
          .button-container { text-align: center; margin: 30px 0; }
          .button { display: inline-block; padding: 15px 40px; text-decoration: none; border-radius: 5px; font-weight: bold; background-color: #0066cc; color: white; font-size: 16px; }
          .button:hover { background-color: #0052a3; }
          .footer { text-align: center; padding: 20px; font-size: 12px; color: #666; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Congressional Award Tracker</h1>
            <p>Hour Log Verification Request</p>
          </div>
          
          <div class="content">
            <p>Dear ${supervisorName},</p>
            
            <p><strong>${studentName}</strong> has submitted a new activity log that requires your verification:</p>
            
            <div class="details">
              <p><strong>Activity:</strong> ${activityName}</p>
              <p><strong>Category:</strong> ${category}</p>
              <p><strong>Date:</strong> ${date}</p>
              <p><strong>Hours:</strong> ${hours}</p>
              ${notes ? `<p><strong>Notes:</strong> ${notes}</p>` : ''}
              ${proof ? `<p><strong>Proof:</strong> <a href="${proof}">View attachment</a></p>` : ''}
            </div>
            
            <p>Please click the button below to review this submission. You will be able to approve or reject it, and provide a reason if needed:</p>
            
            <div class="button-container">
              <a href="${verifyUrl}" class="button">📋 Review & Verify</a>
            </div>
            
            <p style="font-size: 12px; color: #666;">
              This verification link will expire in ${process.env.TOKEN_EXPIRY_HOURS || 168} hours.
              If the button doesn't work, copy and paste this link into your browser:
            </p>
            <p style="font-size: 11px; word-break: break-all;">
              ${verifyUrl}
            </p>
          </div>
          
          <div class="footer">
            <p>Congressional Award Tracker - Helping students achieve their goals</p>
            <p>This is an automated email. Please do not reply.</p>
          </div>
        </div>
      </body>
      </html>
    `
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log(`✅ Verification email sent to ${supervisorEmail}`);
    return true;
  } catch (error) {
    console.error('❌ Error sending verification email:', error);
    throw error;
  }
};

// Send log update notification email
const sendUpdateNotificationEmail = async (supervisorEmail, supervisorName, logDetails) => {
  const { studentName, activityName, category, date, hours, notes, token } = logDetails;
  
  const verifyUrl = `${process.env.APP_URL}/api/logs/verify?token=${token}`;

  const mailOptions = {
    from: process.env.EMAIL_FROM,
    to: supervisorEmail,
    subject: `Updated Hour Log - ${studentName}`,
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background-color: #ff8800; color: white; padding: 20px; text-align: center; }
          .content { padding: 20px; background-color: #f9f9f9; }
          .details { background-color: white; padding: 15px; margin: 15px 0; border-left: 4px solid #ff8800; }
          .button-container { text-align: center; margin: 30px 0; }
          .button { display: inline-block; padding: 15px 40px; text-decoration: none; border-radius: 5px; font-weight: bold; background-color: #ff8800; color: white; font-size: 16px; }
          .button:hover { opacity: 0.9; }
          .footer { text-align: center; padding: 20px; font-size: 12px; color: #666; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Congressional Award Tracker</h1>
            <p>Hour Log Updated</p>
          </div>
          
          <div class="content">
            <p>Dear ${supervisorName},</p>
            
            <p><strong>${studentName}</strong> has resubmitted an activity log:</p>
            
            <div class="details">
              <p><strong>Activity:</strong> ${activityName}</p>
              <p><strong>Category:</strong> ${category}</p>
              <p><strong>Date:</strong> ${date}</p>
              <p><strong>Hours:</strong> ${hours}</p>
              ${notes ? `<p><strong>Notes:</strong> ${notes}</p>` : ''}
            </div>
            
            <p>Please click the button below to review this updated submission:</p>
            
            <div class="button-container">
              <a href="${verifyUrl}" class="button">📋 Review & Verify</a>
            </div>
            
            <p style="font-size: 12px; color: #666;">
              If the button doesn't work, copy and paste this link into your browser:
            </p>
            <p style="font-size: 11px; word-break: break-all;">
              ${verifyUrl}
            </p>
          </div>
          
          <div class="footer">
            <p>Congressional Award Tracker</p>
          </div>
        </div>
      </body>
      </html>
    `
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log(`✅ Update notification sent to ${supervisorEmail}`);
    return true;
  } catch (error) {
    console.error('❌ Error sending update notification:', error);
    throw error;
  }
};

// Send approval confirmation to student
const sendApprovalEmail = async (studentEmail, studentName, logDetails) => {
  const { activityName, hours, category } = logDetails;

  const mailOptions = {
    from: process.env.EMAIL_FROM,
    to: studentEmail,
    subject: 'Activity Log Approved',
    html: `
      <!DOCTYPE html>
      <html>
      <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
        <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background-color: #28a745; color: white; padding: 20px; text-align: center;">
            <h1>Activity Approved! ✓</h1>
          </div>
          
          <div style="padding: 20px; background-color: #f9f9f9;">
            <p>Hi ${studentName},</p>
            
            <p>Great news! Your activity log has been approved:</p>
            
            <div style="background-color: white; padding: 15px; margin: 15px 0; border-left: 4px solid #28a745;">
              <p><strong>Activity:</strong> ${activityName}</p>
              <p><strong>Category:</strong> ${category}</p>
              <p><strong>Hours:</strong> ${hours}</p>
            </div>
            
            <p>These hours have been added to your Congressional Award progress. Keep up the great work!</p>
            
            <p style="text-align: center; margin: 30px 0;">
              <a href="${process.env.APP_URL}/dashboard.html" style="display: inline-block; padding: 12px 30px; background-color: #0066cc; color: white; text-decoration: none; border-radius: 5px; font-weight: bold;">View Dashboard</a>
            </p>
          </div>
        </div>
      </body>
      </html>
    `
  };

  try {
    await transporter.sendMail(mailOptions);
    return true;
  } catch (error) {
    console.error('❌ Error sending approval email:', error);
    throw error;
  }
};

// Send admin notification for new registration
const sendAdminNotification = async (studentName, studentEmail) => {
  const mailOptions = {
    from: process.env.EMAIL_FROM,
    to: process.env.ADMIN_EMAIL,
    subject: 'New Student Registration Pending Approval',
    html: `
      <!DOCTYPE html>
      <html>
      <body style="font-family: Arial, sans-serif;">
        <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
          <h2>New Student Registration</h2>
          <p>A new student has registered and is awaiting approval:</p>
          <ul>
            <li><strong>Name:</strong> ${studentName}</li>
            <li><strong>Email:</strong> ${studentEmail}</li>
          </ul>
          <p><a href="${process.env.APP_URL}/admin.html">Go to Admin Panel</a></p>
        </div>
      </body>
      </html>
    `
  };

  try {
    await transporter.sendMail(mailOptions);
    return true;
  } catch (error) {
    console.error('❌ Error sending admin notification:', error);
    return false; // Non-critical, don't throw
  }
};

// Send rejection notification to student
const sendRejectionEmail = async (studentEmail, studentName, logDetails, rejectionReason) => {
  const { activityName, hours, category, date, supervisorName } = logDetails;

  const mailOptions = {
    from: process.env.EMAIL_FROM,
    to: studentEmail,
    subject: '❌ Activity Log Rejected',
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background-color: #dc3545; color: white; padding: 20px; text-align: center; }
          .content { padding: 20px; background-color: #f9f9f9; }
          .details { background-color: white; padding: 15px; margin: 15px 0; border-left: 4px solid #dc3545; }
          .reason-box { background: #fff3cd; padding: 15px; border-radius: 5px; margin: 20px 0; border-left: 4px solid #ffc107; }
          .button { display: inline-block; padding: 12px 30px; background-color: #0066cc; color: white; text-decoration: none; border-radius: 5px; font-weight: bold; margin-top: 20px; }
          .footer { text-align: center; padding: 20px; font-size: 12px; color: #666; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Activity Log Requires Revision</h1>
          </div>
          
          <div class="content">
            <p>Dear ${studentName},</p>
            
            <p>Your activity log has been <strong>rejected</strong> by ${supervisorName}.</p>
            
            <div class="details">
              <p><strong>Activity:</strong> ${activityName}</p>
              <p><strong>Category:</strong> ${category}</p>
              <p><strong>Hours:</strong> ${hours}</p>
              <p><strong>Date:</strong> ${new Date(date).toLocaleDateString()}</p>
            </div>
            
            ${rejectionReason ? `
            <div class="reason-box">
              <strong>📝 Reason for Rejection:</strong>
              <p style="margin: 10px 0 0 0;">${rejectionReason}</p>
            </div>
            ` : ''}
            
            <p>Please review the feedback above and make the necessary changes. You can edit and resubmit this log from your dashboard.</p>
            
            <p style="text-align: center;">
              <a href="${process.env.APP_URL || 'http://localhost:3000'}/dashboard" class="button">Go to Dashboard</a>
            </p>
          </div>
          
          <div class="footer">
            <p>Congressional Award Tracker</p>
            <p>This is an automated email. Please do not reply.</p>
          </div>
        </div>
      </body>
      </html>
    `
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log(`✅ Rejection email sent to ${studentEmail}`);
    return true;
  } catch (error) {
    console.error('❌ Error sending rejection email:', error);
    throw error;
  }
};

module.exports = {
  verifyEmailConfig,
  sendVerificationEmail,
  sendUpdateNotificationEmail,
  sendApprovalEmail,
  sendAdminNotification,
  sendRejectionEmail
};
