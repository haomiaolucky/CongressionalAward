const express = require('express');
const router = express.Router();
const { register, login, getCurrentUser, checkAdminEmail, registerValidation, loginValidation } = require('../controllers/authController');
const { authenticateToken } = require('../middleware/auth');

// Public routes
router.post('/register', registerValidation, register);
router.post('/login', loginValidation, login);
router.post('/check-admin-email', checkAdminEmail);

// Protected routes
router.get('/me', authenticateToken, getCurrentUser);

module.exports = router;