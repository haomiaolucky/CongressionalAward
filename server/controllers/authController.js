const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { pool } = require('../config/db');
const { body, validationResult } = require('express-validator');
const { sendAdminNotification } = require('../utils/emailService');

// Validation rules
const registerValidation = [
  body('email').isEmail().normalizeEmail(),
  body('password').isLength({ min: 6 }),
  body('studentName').trim().notEmpty(),
  body('grade').isInt({ min: 1, max: 12 }),
  body('schoolName').trim().notEmpty(),
  body('parentEmail').isEmail().normalizeEmail()
];

const loginValidation = [
  body('email').isEmail().normalizeEmail(),
  body('password').notEmpty()
];

// Register new student
const register = async (req, res) => {
  // Validate input
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { email, password, studentName, grade, schoolName, parentEmail } = req.body;

  try {
    // Check if email already exists
    const [existingUsers] = await pool.query(
      'SELECT UserID FROM Users WHERE Email = ?',
      [email]
    );

    if (existingUsers.length > 0) {
      return res.status(409).json({ error: 'Email already registered' });
    }

    // Check if email is in AdminUsers table
    const [adminCheck] = await pool.query(
      'SELECT Email FROM AdminUsers WHERE Email = ? AND IsActive = TRUE',
      [email]
    );

    const isAdmin = adminCheck.length > 0;
    const role = isAdmin ? 'Admin' : 'Student';

    // Hash password
    const passwordHash = await bcrypt.hash(password, 10);

    // Start transaction
    const connection = await pool.getConnection();
    await connection.beginTransaction();

    try {
      // Insert into Users table
      const [userResult] = await connection.query(
        'INSERT INTO Users (Email, PasswordHash, Role, Status) VALUES (?, ?, ?, ?)',
        [email, passwordHash, role, 'Approved']
      );

      const userId = userResult.insertId;

      // Only create student profile if not admin
      if (!isAdmin) {
        // Insert into Students table (pending activation)
        await connection.query(
          'INSERT INTO Students (UserID, StudentName, Grade, SchoolName, ParentEmail, StartDate) VALUES (?, ?, ?, ?, ?, CURDATE())',
          [userId, studentName, grade, schoolName, parentEmail]
        );

        // Send notification to admin (non-blocking)
        sendAdminNotification(studentName, email).catch(err => {
          console.error('Failed to send admin notification:', err);
        });
      }

      await connection.commit();
      connection.release();

      res.status(201).json({
        message: isAdmin ? 'Admin registration successful!' : 'Registration successful. You can now login!',
        userId: userId,
        role: role
      });

    } catch (error) {
      await connection.rollback();
      connection.release();
      throw error;
    }

  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ error: 'Registration failed. Please try again.' });
  }
};

// Login
const login = async (req, res) => {
  // Validate input
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { email, password } = req.body;

  try {
    // Get user
    const [users] = await pool.query(
      'SELECT UserID, Email, PasswordHash, Role, Status FROM Users WHERE Email = ?',
      [email]
    );

    if (users.length === 0) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const user = users[0];

    // Check password
    const passwordMatch = await bcrypt.compare(password, user.PasswordHash);
    if (!passwordMatch) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Check if approved
    if (user.Status === 'Pending') {
      return res.status(403).json({ error: 'Account pending admin approval' });
    }

    if (user.Status === 'Rejected') {
      return res.status(403).json({ error: 'Account registration was rejected' });
    }

    // Generate JWT
    const token = jwt.sign(
      { userId: user.UserID, email: user.Email, role: user.Role },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
    );

    res.json({
      message: 'Login successful',
      token,
      user: {
        userId: user.UserID,
        email: user.Email,
        role: user.Role
      }
    });

  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Login failed. Please try again.' });
  }
};

// Get current user info
const getCurrentUser = async (req, res) => {
  try {
    const userId = req.user.userId;
    const role = req.user.role;

    if (role === 'Student') {
      const [students] = await pool.query(
        `SELECT u.UserID, u.Email, u.Role, s.StudentID, s.StudentName, s.Grade, 
         s.SchoolName, s.ParentEmail, s.StartDate, s.CurrentLevel, s.Status
         FROM Users u
         JOIN Students s ON u.UserID = s.UserID
         WHERE u.UserID = ?`,
        [userId]
      );

      if (students.length === 0) {
        return res.status(404).json({ error: 'Student profile not found' });
      }

      res.json(students[0]);
    } else {
      const [users] = await pool.query(
        'SELECT UserID, Email, Role FROM Users WHERE UserID = ?',
        [userId]
      );

      if (users.length === 0) {
        return res.status(404).json({ error: 'User not found' });
      }

      res.json(users[0]);
    }

  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({ error: 'Failed to retrieve user information' });
  }
};

// Check if email is admin
const checkAdminEmail = async (req, res) => {
  const { email } = req.body;
  
  if (!email) {
    return res.json({ isAdmin: false });
  }
  
  try {
    const [adminCheck] = await pool.query(
      'SELECT Email FROM AdminUsers WHERE Email = ? AND IsActive = TRUE',
      [email]
    );
    
    res.json({ isAdmin: adminCheck.length > 0 });
  } catch (error) {
    console.error('Check admin email error:', error);
    res.json({ isAdmin: false });
  }
};

module.exports = {
  register,
  login,
  getCurrentUser,
  checkAdminEmail,
  registerValidation,
  loginValidation
};
