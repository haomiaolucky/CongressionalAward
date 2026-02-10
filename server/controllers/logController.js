const { pool } = require('../config/db');
const { body, validationResult } = require('express-validator');
const { generateVerificationToken, getTokenExpiry } = require('../utils/tokenGenerator');
const { sendVerificationEmail, sendUpdateNotificationEmail, sendApprovalEmail, sendRejectionEmail } = require('../utils/emailService');

// Validation rules
const createLogValidation = [
  body('activityName').trim().notEmpty(),
  body('category').isIn(['Volunteer', 'Personal Development', 'Physical Fitness', 'Expedition']),
  body('date').isDate(),
  body('hours').isFloat({ min: 0.1 }),
  body('supervisorId').isInt(),
  body('activityId').optional().isInt(),
  body('notes').optional().trim(),
  body('proof').optional().trim()
];

// Create new hour log
const createLog = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { activityName, category, date, hours, supervisorId, activityId, notes } = req.body;
  const userId = req.user.userId;
  
  // Get uploaded file path if exists
  // req.file.path contains either blob URL (Azure) or local path
  const proof = req.file ? req.file.path : null;

  try {
    // Get student ID
    const [students] = await pool.query(
      'SELECT StudentID, StudentName FROM Students WHERE UserID = ?',
      [userId]
    );

    if (students.length === 0) {
      return res.status(404).json({ error: 'Student profile not found' });
    }

    const studentId = students[0].StudentID;
    const studentName = students[0].StudentName;

    // Get supervisor info
    const [supervisors] = await pool.query(
      'SELECT SupervisorName, Email FROM Supervisors WHERE SupervisorID = ? AND IsActive = TRUE',
      [supervisorId]
    );

    if (supervisors.length === 0) {
      return res.status(404).json({ error: 'Supervisor not found' });
    }

    const supervisorName = supervisors[0].SupervisorName;
    const supervisorEmail = supervisors[0].Email;

    // Generate verification token
    const token = generateVerificationToken();
    const tokenExpiry = getTokenExpiry();

    // Insert log
    const [result] = await pool.query(
      `INSERT INTO HourLogs 
       (StudentID, ActivityID, ActivityName, Category, Date, Hours, SupervisorID, 
        Status, Proof, Notes, VerificationToken, TokenExpiry) 
       VALUES (?, ?, ?, ?, ?, ?, ?, 'Pending', ?, ?, ?, ?)`,
      [studentId, activityId || null, activityName, category, date, hours, 
       supervisorId, proof || null, notes || null, token, tokenExpiry]
    );

    const logId = result.insertId;

    // Send verification email to supervisor
    try {
      await sendVerificationEmail(supervisorEmail, supervisorName, {
        studentName,
        activityName,
        category,
        date,
        hours,
        notes,
        proof,
        token,
        logId
      });
    } catch (emailError) {
      console.error('Failed to send verification email:', emailError);
      // Don't fail the request, log was created successfully
    }

    res.status(201).json({
      message: 'Activity log submitted successfully',
      logId,
      status: 'Pending'
    });

  } catch (error) {
    console.error('Create log error:', error);
    res.status(500).json({ error: 'Failed to create log entry' });
  }
};

// Get logs for current student
const getStudentLogs = async (req, res) => {
  const userId = req.user.userId;

  try {
    // Get student ID
    const [students] = await pool.query(
      'SELECT StudentID FROM Students WHERE UserID = ?',
      [userId]
    );

    if (students.length === 0) {
      return res.status(404).json({ error: 'Student profile not found' });
    }

    const studentId = students[0].StudentID;

    // Get logs with supervisor info
    const [logs] = await pool.query(
      `SELECT hl.LogID, hl.ActivityName, hl.Category, hl.Date, hl.Hours, 
       hl.Status, hl.Proof, hl.Notes, hl.SubmittedAt, hl.ApprovalTime,
       s.SupervisorName, s.Email as SupervisorEmail
       FROM HourLogs hl
       JOIN Supervisors s ON hl.SupervisorID = s.SupervisorID
       WHERE hl.StudentID = ?
       ORDER BY hl.Date DESC, hl.SubmittedAt DESC`,
      [studentId]
    );

    res.json(logs);

  } catch (error) {
    console.error('Get logs error:', error);
    res.status(500).json({ error: 'Failed to retrieve logs' });
  }
};

// Update pending log (student can only edit pending logs)
const updateLog = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const logId = req.params.id;
  const userId = req.user.userId;
  const { activityName, date, hours, notes } = req.body;
  
  // Get uploaded file path if exists
  // req.file.path contains either blob URL (Azure) or local path
  const proof = req.file ? req.file.path : req.body.existingProof;

  try {
    // Get student ID
    const [students] = await pool.query(
      'SELECT StudentID, StudentName FROM Students WHERE UserID = ?',
      [userId]
    );

    if (students.length === 0) {
      return res.status(404).json({ error: 'Student profile not found' });
    }

    const studentId = students[0].StudentID;
    const studentName = students[0].StudentName;

    // Check if log exists and belongs to student
    const [logs] = await pool.query(
      `SELECT hl.*, s.SupervisorName, s.Email as SupervisorEmail
       FROM HourLogs hl
       JOIN Supervisors s ON hl.SupervisorID = s.SupervisorID
       WHERE hl.LogID = ? AND hl.StudentID = ?`,
      [logId, studentId]
    );

    if (logs.length === 0) {
      return res.status(404).json({ error: 'Log not found' });
    }

    const log = logs[0];

    // Can only edit pending or rejected logs, not approved
    if (log.Status === 'Approved') {
      return res.status(403).json({ error: 'Cannot edit approved logs' });
    }

    // Generate new token
    const newToken = generateVerificationToken();
    const tokenExpiry = getTokenExpiry();

    // Update log and reset status to Pending
    await pool.query(
      `UPDATE HourLogs 
       SET ActivityName = ?, Date = ?, Hours = ?, Notes = ?, Proof = ?,
           VerificationToken = ?, TokenExpiry = ?, Status = 'Pending', 
           RejectionReason = NULL, ApprovalTime = NULL, ApprovedBy = NULL
       WHERE LogID = ?`,
      [activityName, date, hours, notes || null, proof || null, newToken, tokenExpiry, logId]
    );

    // Send update notification email
    try {
      await sendUpdateNotificationEmail(log.SupervisorEmail, log.SupervisorName, {
        studentName,
        activityName,
        category: log.Category,
        date,
        hours,
        notes,
        token: newToken
      });
    } catch (emailError) {
      console.error('Failed to send update notification:', emailError);
    }

    res.json({
      message: 'Log updated successfully',
      logId
    });

  } catch (error) {
    console.error('Update log error:', error);
    res.status(500).json({ error: 'Failed to update log' });
  }
};

// Delete pending or rejected log
const deleteLog = async (req, res) => {
  const logId = req.params.id;
  const userId = req.user.userId;

  try {
    // Get student ID
    const [students] = await pool.query(
      'SELECT StudentID FROM Students WHERE UserID = ?',
      [userId]
    );

    if (students.length === 0) {
      return res.status(404).json({ error: 'Student profile not found' });
    }

    const studentId = students[0].StudentID;

    // Check if log exists and belongs to student
    const [logs] = await pool.query(
      'SELECT Status FROM HourLogs WHERE LogID = ? AND StudentID = ?',
      [logId, studentId]
    );

    if (logs.length === 0) {
      return res.status(404).json({ error: 'Log not found' });
    }

    // Can only delete pending or rejected logs, not approved
    if (logs[0].Status === 'Approved') {
      return res.status(403).json({ error: 'Cannot delete approved logs' });
    }

    // Delete log
    await pool.query('DELETE FROM HourLogs WHERE LogID = ?', [logId]);

    res.json({ message: 'Log deleted successfully' });

  } catch (error) {
    console.error('Delete log error:', error);
    res.status(500).json({ error: 'Failed to delete log' });
  }
};

// Verify log (supervisor approval/rejection via email link)
const verifyLog = async (req, res) => {
  const { token, action } = req.query;
  const { reason } = req.body || {};

  if (!token) {
    return res.status(400).send('<h1>Invalid verification link</h1>');
  }

  try {
    // Get log details
    const [logs] = await pool.query(
      `SELECT hl.*, s.StudentName, u.Email as StudentEmail, sup.Email as SupervisorEmail, sup.SupervisorName
       FROM HourLogs hl
       JOIN Students s ON hl.StudentID = s.StudentID
       JOIN Users u ON s.UserID = u.UserID
       JOIN Supervisors sup ON hl.SupervisorID = sup.SupervisorID
       WHERE hl.VerificationToken = ?`,
      [token]
    );

    if (logs.length === 0) {
      return res.status(404).send('<h1>Verification link not found or already used</h1>');
    }

    const log = logs[0];

    // Check if already processed
    if (log.Status !== 'Pending') {
      return res.send(`<h1>This log has already been ${log.Status.toLowerCase()}</h1>`);
    }

    // Check token expiry
    if (new Date() > new Date(log.TokenExpiry)) {
      return res.status(400).send('<h1>Verification link has expired</h1>');
    }

    // If no action yet, show form (for reject with reason)
    if (!action) {
      return res.send(generateVerificationPage(log, token));
    }

    if (action !== 'approve' && action !== 'reject') {
      return res.status(400).send('<h1>Invalid action</h1>');
    }

    // Update status
    const newStatus = action === 'approve' ? 'Approved' : 'Rejected';
    const rejectionReason = action === 'reject' ? reason : null;
    
    await pool.query(
      `UPDATE HourLogs 
       SET Status = ?, ApprovalTime = NOW(), ApprovedBy = ?, RejectionReason = ?
       WHERE LogID = ?`,
      [newStatus, log.SupervisorEmail, rejectionReason, log.LogID]
    );

    // Send notification email to student
    try {
      if (action === 'approve') {
        await sendApprovalEmail(log.StudentEmail, log.StudentName, {
          activityName: log.ActivityName,
          category: log.Category,
          hours: log.Hours
        });
      } else {
        await sendRejectionEmail(log.StudentEmail, log.StudentName, {
          activityName: log.ActivityName,
          category: log.Category,
          hours: log.Hours,
          date: log.Date,
          supervisorName: log.SupervisorName
        }, rejectionReason);
      }
    } catch (emailError) {
      console.error('Failed to send notification email:', emailError);
    }

    res.send(`
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; display: flex; justify-content: center; align-items: center; min-height: 100vh; margin: 0; background-color: #f5f5f5; }
          .container { text-align: center; padding: 40px; background: white; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); max-width: 500px; }
          .success { color: #28a745; }
          .rejected { color: #dc3545; }
          h1 { margin-bottom: 20px; }
        </style>
      </head>
      <body>
        <div class="container">
          <h1 class="${action === 'approve' ? 'success' : 'rejected'}">
            ${action === 'approve' ? '✓' : '✗'} Log ${newStatus}
          </h1>
          <p>Student: ${log.StudentName}</p>
          <p>Activity: ${log.ActivityName}</p>
          <p>Hours: ${log.Hours}</p>
          <p style="margin-top: 30px; color: #666;">The student has been notified by email.</p>
          <p style="color: #666;">You can close this window.</p>
        </div>
      </body>
      </html>
    `);

  } catch (error) {
    console.error('Verify log error:', error);
    res.status(500).send('<h1>Verification failed. Please try again.</h1>');
  }
};

function generateVerificationPage(log, token) {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Verify Activity Log</title>
      <style>
        body { font-family: Arial, sans-serif; background-color: #f5f5f5; padding: 20px; }
        .container { max-width: 600px; margin: 0 auto; background: white; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); padding: 30px; }
        h1 { color: #333; margin-bottom: 10px; }
        .info { background: #f8f9fa; padding: 15px; border-radius: 5px; margin: 20px 0; }
        .info p { margin: 5px 0; }
        .buttons { display: flex; gap: 15px; margin-top: 30px; }
        .btn { flex: 1; padding: 15px; border: none; border-radius: 5px; font-size: 16px; cursor: pointer; text-decoration: none; display: block; text-align: center; }
        .btn-approve { background: #28a745; color: white; }
        .btn-reject { background: #dc3545; color: white; }
        .btn:hover { opacity: 0.9; }
        .reject-form { display: none; margin-top: 20px; }
        .reject-form.show { display: block; }
        textarea { width: 100%; padding: 10px; border: 1px solid #ddd; border-radius: 5px; font-family: Arial, sans-serif; margin-top: 10px; }
        .submit-btn { background: #dc3545; color: white; padding: 10px 20px; border: none; border-radius: 5px; cursor: pointer; margin-top: 10px; }
        .cancel-btn { background: #6c757d; color: white; padding: 10px 20px; border: none; border-radius: 5px; cursor: pointer; margin-top: 10px; margin-left: 10px; }
      </style>
    </head>
    <body>
      <div class="container">
        <h1>Verify Activity Log</h1>
        <p>Please review and verify this activity submission:</p>
        
        <div class="info">
          <p><strong>Student:</strong> ${log.StudentName}</p>
          <p><strong>Activity:</strong> ${log.ActivityName}</p>
          <p><strong>Category:</strong> ${log.Category}</p>
          <p><strong>Date:</strong> ${new Date(log.Date).toLocaleDateString()}</p>
          <p><strong>Hours:</strong> ${log.Hours}</p>
          ${log.Notes ? `<p><strong>Notes:</strong> ${log.Notes}</p>` : ''}
          ${log.Proof ? `<p><strong>Proof:</strong> <a href="${log.Proof}" target="_blank">View Attachment</a></p>` : ''}
        </div>

        <div class="buttons">
          <a href="?token=${token}&action=approve" class="btn btn-approve">✓ Approve</a>
          <button onclick="showRejectForm()" class="btn btn-reject">✗ Reject</button>
        </div>

        <div id="rejectForm" class="reject-form">
          <h3>Rejection Reason</h3>
          <p>Please explain why you're rejecting this log (the student will receive this in an email):</p>
          <form method="POST" action="?token=${token}&action=reject">
            <textarea name="reason" rows="5" placeholder="e.g., The hours seem incorrect, or I need more information about the activity..." required></textarea>
            <div>
              <button type="submit" class="submit-btn">Submit Rejection</button>
              <button type="button" onclick="hideRejectForm()" class="cancel-btn">Cancel</button>
            </div>
          </form>
        </div>
      </div>

      <script>
        function showRejectForm() {
          document.getElementById('rejectForm').classList.add('show');
          document.querySelector('.buttons').style.display = 'none';
        }
        function hideRejectForm() {
          document.getElementById('rejectForm').classList.remove('show');
          document.querySelector('.buttons').style.display = 'flex';
        }
      </script>
    </body>
    </html>
  `;
}

module.exports = {
  createLog,
  getStudentLogs,
  updateLog,
  deleteLog,
  verifyLog,
  createLogValidation
};