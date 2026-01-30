const express = require('express');
const router = express.Router();
const {
  createLog,
  getStudentLogs,
  updateLog,
  deleteLog,
  verifyLog,
  createLogValidation
} = require('../controllers/logController');
const { authenticateToken, requireStudent } = require('../middleware/auth');

// Public route for supervisor verification
router.get('/verify', verifyLog);

// Protected routes (require authentication)
router.post('/', authenticateToken, requireStudent, createLogValidation, createLog);
router.get('/', authenticateToken, requireStudent, getStudentLogs);
router.put('/:id', authenticateToken, requireStudent, createLogValidation, updateLog);
router.delete('/:id', authenticateToken, requireStudent, deleteLog);

module.exports = router;