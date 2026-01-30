const express = require('express');
const router = express.Router();
const {
  getPendingUsers,
  approveUser,
  rejectUser,
  getAllStudents,
  getActivities,
  createActivity,
  updateActivity,
  deleteActivity,
  getSupervisors,
  createSupervisor,
  updateSupervisor,
  getAdminStats,
  createActivityValidation,
  createSupervisorValidation
} = require('../controllers/adminController');
const { authenticateToken, requireAdmin } = require('../middleware/auth');

// All routes require authentication and admin role
router.use(authenticateToken, requireAdmin);

// User management
router.get('/pending-users', getPendingUsers);
router.put('/approve-user/:id', approveUser);
router.put('/reject-user/:id', rejectUser);
router.get('/students', getAllStudents);

// Activity management
router.get('/activities', getActivities);
router.post('/activities', createActivityValidation, createActivity);
router.put('/activities/:id', updateActivity);
router.delete('/activities/:id', deleteActivity);

// Supervisor management
router.get('/supervisors', getSupervisors);
router.post('/supervisors', createSupervisorValidation, createSupervisor);
router.put('/supervisors/:id', updateSupervisor);

// Statistics
router.get('/stats', getAdminStats);

module.exports = router;