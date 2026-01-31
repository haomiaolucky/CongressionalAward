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
const upload = require('../middleware/upload');

// Public routes for supervisor verification
router.get('/verify', verifyLog);
router.post('/verify', verifyLog);

// Protected routes (require authentication)
router.post('/', authenticateToken, requireStudent, ...upload.single('proof'), createLog);
router.get('/', authenticateToken, requireStudent, getStudentLogs);
router.put('/:id', authenticateToken, requireStudent, ...upload.single('proof'), updateLog);
router.delete('/:id', authenticateToken, requireStudent, deleteLog);

module.exports = router;
