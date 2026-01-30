const jwt = require('jsonwebtoken');
const { pool } = require('../config/db');

// Verify JWT token
const authenticateToken = async (req, res, next) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

    if (!token) {
      return res.status(401).json({ error: 'Access token required' });
    }

    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Check if user still exists and is approved
    const [users] = await pool.query(
      'SELECT UserID, Email, Role, Status FROM Users WHERE UserID = ?',
      [decoded.userId]
    );

    if (users.length === 0) {
      return res.status(401).json({ error: 'User not found' });
    }

    const user = users[0];

    if (user.Status !== 'Approved') {
      return res.status(403).json({ error: 'Account not approved' });
    }

    // Attach user info to request
    req.user = {
      userId: user.UserID,
      email: user.Email,
      role: user.Role
    };

    next();
  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      return res.status(403).json({ error: 'Invalid token' });
    }
    if (error.name === 'TokenExpiredError') {
      return res.status(403).json({ error: 'Token expired' });
    }
    return res.status(500).json({ error: 'Authentication failed' });
  }
};

// Check if user is admin
const requireAdmin = (req, res, next) => {
  if (req.user.role !== 'Admin') {
    return res.status(403).json({ error: 'Admin access required' });
  }
  next();
};

// Check if user is student
const requireStudent = (req, res, next) => {
  if (req.user.role !== 'Student') {
    return res.status(403).json({ error: 'Student access required' });
  }
  next();
};

module.exports = {
  authenticateToken,
  requireAdmin,
  requireStudent
};