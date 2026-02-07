const express = require('express');
const router = express.Router();
const {
  getPendingUsers,
  approveUser,
  rejectUser,
  getAllStudents,
  activateStudent,
  deactivateStudent,
  getAllHourLogs,
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
} = require('../controllers/adminController');
const { authenticateToken, requireAdmin } = require('../middleware/auth');

// All routes require authentication and admin role
router.use(authenticateToken, requireAdmin);

// User management
router.get('/pending-users', getPendingUsers);
router.put('/approve-user/:id', approveUser);
router.put('/reject-user/:id', rejectUser);
router.get('/students', getAllStudents);
router.put('/students/:id/activate', activateStudent);
router.put('/students/:id/deactivate', deactivateStudent);

// Hour logs
router.get('/logs', getAllHourLogs);

// Activity management
router.get('/activities', getActivities);
router.post('/activities', createActivityValidation, createActivity);
router.put('/activities/:id', updateActivity);
router.delete('/activities/:id', deleteActivity);

// Supervisor management
router.get('/supervisors', getSupervisors);
router.post('/supervisors', createSupervisorValidation, createSupervisor);
router.put('/supervisors/:id', updateSupervisor);
router.delete('/supervisors/:id', deleteSupervisor);

// Admin users management
router.get('/admin-users', getAdminUsers);
router.post('/admin-users', addAdminValidation, addAdminUser);
router.put('/admin-users/:id/activate', activateAdminUser);
router.put('/admin-users/:id/deactivate', deactivateAdminUser);

// Statistics
router.get('/stats', getAdminStats);

module.exports = router;
