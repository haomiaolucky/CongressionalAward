const { pool } = require('../config/db');
const { body, validationResult } = require('express-validator');

// Get pending student registrations
const getPendingUsers = async (req, res) => {
  try {
    const [users] = await pool.query(
      `SELECT u.UserID, u.Email, u.CreatedAt, u.Status,
       s.StudentID, s.StudentName, s.Grade, s.SchoolName, s.ParentEmail
       FROM Users u
       JOIN Students s ON u.UserID = s.UserID
       WHERE u.Status = 'Pending' AND u.Role = 'Student'
       ORDER BY u.CreatedAt ASC`
    );

    res.json(users);
  } catch (error) {
    console.error('Get pending users error:', error);
    res.status(500).json({ error: 'Failed to retrieve pending users' });
  }
};

// Approve student registration
const approveUser = async (req, res) => {
  const userId = req.params.id;

  try {
    // Check if user exists and is pending
    const [users] = await pool.query(
      'SELECT Status FROM Users WHERE UserID = ? AND Role = ?',
      [userId, 'Student']
    );

    if (users.length === 0) {
      return res.status(404).json({ error: 'Student not found' });
    }

    if (users[0].Status !== 'Pending') {
      return res.status(400).json({ error: 'Student is not pending approval' });
    }

    // Start transaction to update both Users and Students tables
    const connection = await pool.getConnection();
    await connection.beginTransaction();

    try {
      // Update Users status to approved
      await connection.query(
        'UPDATE Users SET Status = ? WHERE UserID = ?',
        ['Approved', userId]
      );

      // Update Students status to Active
      await connection.query(
        'UPDATE Students SET Status = ? WHERE UserID = ?',
        ['Active', userId]
      );

      await connection.commit();
      connection.release();

      res.json({ message: 'Student approved and activated successfully' });

    } catch (error) {
      await connection.rollback();
      connection.release();
      throw error;
    }

  } catch (error) {
    console.error('Approve user error:', error);
    res.status(500).json({ error: 'Failed to approve student' });
  }
};

// Reject student registration
const rejectUser = async (req, res) => {
  const userId = req.params.id;

  try {
    // Check if user exists and is pending
    const [users] = await pool.query(
      'SELECT Status FROM Users WHERE UserID = ? AND Role = ?',
      [userId, 'Student']
    );

    if (users.length === 0) {
      return res.status(404).json({ error: 'Student not found' });
    }

    if (users[0].Status !== 'Pending') {
      return res.status(400).json({ error: 'Student is not pending approval' });
    }

    // Update status to rejected
    await pool.query(
      'UPDATE Users SET Status = ? WHERE UserID = ?',
      ['Rejected', userId]
    );

    res.json({ message: 'Student registration rejected' });

  } catch (error) {
    console.error('Reject user error:', error);
    res.status(500).json({ error: 'Failed to reject student' });
  }
};

// Get all students with their statistics
const getAllStudents = async (req, res) => {
  try {
    const [students] = await pool.query(
      `SELECT s.StudentID, s.StudentName, s.Grade, s.SchoolName, s.StartDate, s.CurrentLevel, s.Status as StudentStatus,
       u.Email, u.Status as AccountStatus, u.UserID,
       shs.VolunteerHours, shs.PersonalDevelopmentHours, shs.PhysicalFitnessHours, 
       shs.ExpeditionCount, shs.PendingLogs, shs.ApprovedLogs
       FROM Students s
       JOIN Users u ON s.UserID = u.UserID
       LEFT JOIN StudentHoursSummary shs ON s.StudentID = shs.StudentID
       WHERE u.Status = 'Approved'
       ORDER BY s.StudentName`
    );

    res.json(students);
  } catch (error) {
    console.error('Get all students error:', error);
    res.status(500).json({ error: 'Failed to retrieve students' });
  }
};

// Activate student
const activateStudent = async (req, res) => {
  const studentId = req.params.id;

  try {
    const [result] = await pool.query(
      'UPDATE Students SET Status = ? WHERE StudentID = ?',
      ['Active', studentId]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Student not found' });
    }

    res.json({ message: 'Student activated successfully' });
  } catch (error) {
    console.error('Activate student error:', error);
    res.status(500).json({ error: 'Failed to activate student' });
  }
};

// Deactivate student
const deactivateStudent = async (req, res) => {
  const studentId = req.params.id;

  try {
    const [result] = await pool.query(
      'UPDATE Students SET Status = ? WHERE StudentID = ?',
      ['Inactive', studentId]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Student not found' });
    }

    res.json({ message: 'Student deactivated successfully' });
  } catch (error) {
    console.error('Deactivate student error:', error);
    res.status(500).json({ error: 'Failed to deactivate student' });
  }
};

// Get all activities
const getActivities = async (req, res) => {
  try {
    const [activities] = await pool.query(
      `SELECT a.*, s.SupervisorName, s.Email as SupervisorEmail
       FROM Activities a
       LEFT JOIN Supervisors s ON a.DefaultSupervisorID = s.SupervisorID
       ORDER BY a.Category, a.ActivityName`
    );

    res.json(activities);
  } catch (error) {
    console.error('Get activities error:', error);
    res.status(500).json({ error: 'Failed to retrieve activities' });
  }
};

// Create new activity
const createActivity = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { activityName, category, defaultSupervisorId, description, applyLink, location, price } = req.body;

  try {
    const [result] = await pool.query(
      `INSERT INTO Activities (ActivityName, Category, DefaultSupervisorID, Description, ApplyLink, Location, Price)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [activityName, category, defaultSupervisorId || null, description || null, 
       applyLink || null, location || null, price || 0]
    );

    res.status(201).json({
      message: 'Activity created successfully',
      activityId: result.insertId
    });

  } catch (error) {
    console.error('Create activity error:', error);
    res.status(500).json({ error: 'Failed to create activity' });
  }
};

// Update activity
const updateActivity = async (req, res) => {
  const activityId = req.params.id;
  const { activityName, category, defaultSupervisorId, description, applyLink, location, price, isActive } = req.body;

  try {
    const [result] = await pool.query(
      `UPDATE Activities 
       SET ActivityName = ?, Category = ?, DefaultSupervisorID = ?, Description = ?,
           ApplyLink = ?, Location = ?, Price = ?, IsActive = ?
       WHERE ActivityID = ?`,
      [activityName, category, defaultSupervisorId || null, description || null,
       applyLink || null, location || null, price || 0, isActive !== false, activityId]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Activity not found' });
    }

    res.json({ message: 'Activity updated successfully' });

  } catch (error) {
    console.error('Update activity error:', error);
    res.status(500).json({ error: 'Failed to update activity' });
  }
};

// Delete activity
const deleteActivity = async (req, res) => {
  const activityId = req.params.id;

  try {
    // Check if activity has associated logs
    const [logs] = await pool.query(
      'SELECT COUNT(*) as count FROM HourLogs WHERE ActivityID = ?',
      [activityId]
    );

    if (logs[0].count > 0) {
      // Has associated records, soft delete only
      const [result] = await pool.query(
        'UPDATE Activities SET IsActive = FALSE WHERE ActivityID = ?',
        [activityId]
      );

      if (result.affectedRows === 0) {
        return res.status(404).json({ error: 'Activity not found' });
      }

      res.json({ 
        message: 'Activity deactivated (has associated logs)',
        softDelete: true
      });
    } else {
      // No associated records, hard delete
      const [result] = await pool.query(
        'DELETE FROM Activities WHERE ActivityID = ?',
        [activityId]
      );

      if (result.affectedRows === 0) {
        return res.status(404).json({ error: 'Activity not found' });
      }

      res.json({ 
        message: 'Activity deleted permanently',
        softDelete: false
      });
    }
  } catch (error) {
    console.error('Delete activity error:', error);
    res.status(500).json({ error: 'Failed to delete activity' });
  }
};

// Get all supervisors
const getSupervisors = async (req, res) => {
  try {
    const [supervisors] = await pool.query(
      'SELECT * FROM Supervisors ORDER BY SupervisorName'
    );

    res.json(supervisors);
  } catch (error) {
    console.error('Get supervisors error:', error);
    res.status(500).json({ error: 'Failed to retrieve supervisors' });
  }
};

// Create new supervisor
const createSupervisor = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { supervisorName, email, role } = req.body;

  try {
    // Check if email already exists
    const [existing] = await pool.query(
      'SELECT SupervisorID FROM Supervisors WHERE Email = ?',
      [email]
    );

    if (existing.length > 0) {
      return res.status(409).json({ error: 'Email already registered' });
    }

    const [result] = await pool.query(
      'INSERT INTO Supervisors (SupervisorName, Email, Role) VALUES (?, ?, ?)',
      [supervisorName, email, role || null]
    );

    res.status(201).json({
      message: 'Supervisor created successfully',
      supervisorId: result.insertId
    });

  } catch (error) {
    console.error('Create supervisor error:', error);
    res.status(500).json({ error: 'Failed to create supervisor' });
  }
};

// Update supervisor
const updateSupervisor = async (req, res) => {
  const supervisorId = req.params.id;
  const { supervisorName, email, role, isActive } = req.body;

  try {
    const [result] = await pool.query(
      `UPDATE Supervisors 
       SET SupervisorName = ?, Email = ?, Role = ?, IsActive = ?
       WHERE SupervisorID = ?`,
      [supervisorName, email, role || null, isActive !== false, supervisorId]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Supervisor not found' });
    }

    res.json({ message: 'Supervisor updated successfully' });

  } catch (error) {
    console.error('Update supervisor error:', error);
    res.status(500).json({ error: 'Failed to update supervisor' });
  }
};

// Delete supervisor (soft delete)
const deleteSupervisor = async (req, res) => {
  const supervisorId = req.params.id;

  try {
    // Check if supervisor has associated logs
    const [logs] = await pool.query(
      'SELECT COUNT(*) as count FROM HourLogs WHERE SupervisorID = ?',
      [supervisorId]
    );

    if (logs[0].count > 0) {
      // Soft delete - just deactivate
      const [result] = await pool.query(
        'UPDATE Supervisors SET IsActive = FALSE WHERE SupervisorID = ?',
        [supervisorId]
      );

      if (result.affectedRows === 0) {
        return res.status(404).json({ error: 'Supervisor not found' });
      }

      res.json({ 
        message: 'Supervisor deactivated successfully',
        note: 'Supervisor has associated records and was deactivated instead of deleted'
      });
    } else {
      // No associated records, safe to delete
      const [result] = await pool.query(
        'DELETE FROM Supervisors WHERE SupervisorID = ?',
        [supervisorId]
      );

      if (result.affectedRows === 0) {
        return res.status(404).json({ error: 'Supervisor not found' });
      }

      res.json({ message: 'Supervisor deleted successfully' });
    }
  } catch (error) {
    console.error('Delete supervisor error:', error);
    res.status(500).json({ error: 'Failed to delete supervisor' });
  }
};

// Get all admin users
const getAdminUsers = async (req, res) => {
  try {
    const [admins] = await pool.query(
      `SELECT a.AdminID, a.Email, a.Name, a.IsActive, a.CreatedAt,
       u.Email as CreatedByEmail
       FROM AdminUsers a
       LEFT JOIN Users u ON a.CreatedBy = u.UserID
       ORDER BY a.CreatedAt DESC`
    );

    res.json(admins);
  } catch (error) {
    console.error('Get admin users error:', error);
    res.status(500).json({ error: 'Failed to retrieve admin users' });
  }
};

// Add new admin user
const addAdminUser = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { email, name } = req.body;
  const createdBy = req.user.userId;

  try {
    // Check if email already exists in AdminUsers
    const [existing] = await pool.query(
      'SELECT AdminID FROM AdminUsers WHERE Email = ?',
      [email]
    );

    if (existing.length > 0) {
      return res.status(409).json({ error: 'Email already registered as admin' });
    }

    const [result] = await pool.query(
      'INSERT INTO AdminUsers (Email, Name, CreatedBy) VALUES (?, ?, ?)',
      [email, name || null, createdBy]
    );

    res.status(201).json({
      message: 'Admin user added successfully. They can now register with this email.',
      adminId: result.insertId
    });

  } catch (error) {
    console.error('Add admin user error:', error);
    res.status(500).json({ error: 'Failed to add admin user' });
  }
};

// Deactivate admin user
const deactivateAdminUser = async (req, res) => {
  const adminId = req.params.id;

  try {
    const [result] = await pool.query(
      'UPDATE AdminUsers SET IsActive = FALSE WHERE AdminID = ?',
      [adminId]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Admin user not found' });
    }

    res.json({ message: 'Admin user deactivated successfully' });

  } catch (error) {
    console.error('Deactivate admin user error:', error);
    res.status(500).json({ error: 'Failed to deactivate admin user' });
  }
};

// Activate admin user
const activateAdminUser = async (req, res) => {
  const adminId = req.params.id;

  try {
    const [result] = await pool.query(
      'UPDATE AdminUsers SET IsActive = TRUE WHERE AdminID = ?',
      [adminId]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Admin user not found' });
    }

    res.json({ message: 'Admin user activated successfully' });

  } catch (error) {
    console.error('Activate admin user error:', error);
    res.status(500).json({ error: 'Failed to activate admin user' });
  }
};

// Get public activities (no auth required)
const getPublicActivities = async (req, res) => {
  try {
    const [activities] = await pool.query(
      `SELECT a.ActivityID, a.ActivityName, a.Category, a.Description, 
       a.Location, a.Price, a.ApplyLink,
       s.SupervisorName
       FROM Activities a
       LEFT JOIN Supervisors s ON a.DefaultSupervisorID = s.SupervisorID
       WHERE a.IsActive = TRUE
       ORDER BY a.Category, a.ActivityName`
    );
    res.json(activities);
  } catch (error) {
    console.error('Get public activities error:', error);
    res.status(500).json({ error: 'Failed to retrieve activities' });
  }
};

// Get all hour logs for admin
const getAllHourLogs = async (req, res) => {
  try {
    const [logs] = await pool.query(`
      SELECT hl.*, s.StudentName, sup.SupervisorName
      FROM HourLogs hl
      JOIN Students s ON hl.StudentID = s.StudentID
      JOIN Supervisors sup ON hl.SupervisorID = sup.SupervisorID
      ORDER BY hl.SubmittedAt DESC
    `);
    res.json(logs);
  } catch (error) {
    console.error('Get all logs error:', error);
    res.status(500).json({ error: 'Failed to retrieve logs' });
  }
};

// Get dashboard statistics
const getAdminStats = async (req, res) => {
  try {
    // Get total counts
    const [stats] = await pool.query(`
      SELECT 
        (SELECT COUNT(*) FROM Students s JOIN Users u ON s.UserID = u.UserID WHERE u.Status = 'Approved') as totalStudents,
        (SELECT COUNT(*) FROM Users WHERE Status = 'Pending' AND Role = 'Student') as pendingApprovals,
        (SELECT COUNT(*) FROM HourLogs WHERE Status = 'Pending') as pendingLogs,
        (SELECT COUNT(*) FROM Activities WHERE IsActive = TRUE) as activeActivities,
        (SELECT COALESCE(SUM(Hours), 0) FROM HourLogs WHERE Status = 'Approved') as totalHoursLogged
    `);

    res.json(stats[0]);

  } catch (error) {
    console.error('Get admin stats error:', error);
    res.status(500).json({ error: 'Failed to retrieve statistics' });
  }
};

// Validation rules
const createActivityValidation = [
  body('activityName').trim().notEmpty(),
  body('category').isIn(['Volunteer', 'Personal Development', 'Physical Fitness', 'Expedition']),
  body('price').optional().isFloat({ min: 0 })
];

const createSupervisorValidation = [
  body('supervisorName').trim().notEmpty(),
  body('email').isEmail().normalizeEmail()
];

const addAdminValidation = [
  body('email').isEmail().normalizeEmail(),
  body('name').optional().trim()
];

module.exports = {
  getPendingUsers,
  approveUser,
  rejectUser,
  getAllStudents,
  activateStudent,
  deactivateStudent,
  getAllHourLogs,
  getPublicActivities,
  getActivities,
  createActivity,
  updateActivity,
  deleteActivity,
  getSupervisors,
  createSupervisor,
  updateSupervisor,
  deleteSupervisor,
  getAdminUsers,
  addAdminUser,
  activateAdminUser,
  deactivateAdminUser,
  getAdminStats,
  createActivityValidation,
  createSupervisorValidation,
  addAdminValidation
};
