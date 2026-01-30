const { pool } = require('../config/db');
const { body, validationResult } = require('express-validator');
const { generateVerificationToken, getTokenExpiry } = require('../utils/tokenGenerator');
const { sendVerificationEmail, sendUpdateNotificationEmail, sendApprovalEmail } = require('../utils/emailService');

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
  const proof = req.file ? `/uploads/proofs/${req.file.filename}` : null;

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
  const proof = req.file ? `/uploads/proofs/${req.file.filename}` : req.body.existingProof;

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

    // Check if log exists and is pending
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

    if (log.Status !== 'Pending') {
      return res.status(403).json({ error: 'Can only edit pending logs' });
    }

    // Generate new token
    const newToken = generateVerificationToken();
    const tokenExpiry = getTokenExpiry();

    // Update log
    await pool.query(
      `UPDATE HourLogs 
       SET ActivityName = ?, Date = ?, Hours = ?, Notes = ?, Proof = ?,
           VerificationToken = ?, TokenExpiry = ?
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

// Delete pending log
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

    // Check if log exists and is pending
    const [logs] = await pool.query(
      'SELECT Status FROM HourLogs WHERE LogID = ? AND StudentID = ?',
      [logId, studentId]
    );

    if (logs.length === 0) {
      return res.status(404).json({ error: 'Log not found' });
    }

    if (logs[0].Status !== 'Pending') {
      return res.status(403).json({ error: 'Can only delete pending logs' });
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

  if (!token || !action) {
    return res.status(400).send('<h1>Invalid verification link</h1>');
  }

  if (action !== 'approve' && action !== 'reject') {
    return res.status(400).send('<h1>Invalid action</h1>');
  }

  try {
    // Get log details
    const [logs] = await pool.query(
      `SELECT hl.*, s.StudentName, u.Email as StudentEmail, sup.Email as SupervisorEmail
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

    // Update status
    const newStatus = action === 'approve' ? 'Approved' : 'Rejected';
    await pool.query(
      `UPDATE HourLogs 
       SET Status = ?, ApprovalTime = NOW(), ApprovedBy = ?
       WHERE LogID = ?`,
      [newStatus, log.SupervisorEmail, log.LogID]
    );

    // If approved, send confirmation to student
    if (action === 'approve') {
      try {
        await sendApprovalEmail(log.StudentEmail, log.StudentName, {
          activityName: log.ActivityName,
          hours: log.Hours,
          category: log.Category
        });
      } catch (emailError) {
        console.error('Failed to send approval email:', emailError);
      }
    }

    res.send(`
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; display: flex; justify-content: center; align-items: center; height: 100vh; margin: 0; background-color: #f5f5f5; }
          .container { text-align: center; padding: 40px; background: white; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
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
          <p style="margin-top: 30px; color: #666;">You can close this window.</p>
        </div>
      </body>
      </html>
    `);

  } catch (error) {
    console.error('Verify log error:', error);
    res.status(500).send('<h1>Verification failed. Please try again.</h1>');
  }
};

module.exports = {
  createLog,
  getStudentLogs,
  updateLog,
  deleteLog,
  verifyLog,
  createLogValidation
};