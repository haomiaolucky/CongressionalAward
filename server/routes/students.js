const express = require('express');
const router = express.Router();
const { getDashboard, getActivities, getSupervisors } = require('../controllers/studentController');
const { authenticateToken, requireStudent } = require('../middleware/auth');

// All routes require authentication and student role
router.use(authenticateToken, requireStudent);

// Get dashboard summary
router.get('/dashboard', getDashboard);

// Get available activities
router.get('/activities', getActivities);

// Get available supervisors
router.get('/supervisors', getSupervisors);

module.exports = router;