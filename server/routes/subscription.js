const express = require('express');
const router = express.Router();
const subscriptionController = require('../controllers/subscriptionController');
const { authenticateToken } = require('../middleware/auth');

// Public routes
router.get('/plans', subscriptionController.getPlans);

// Student routes (require authentication)
router.get('/my-subscription', authenticateToken, subscriptionController.getStudentSubscription);
router.get('/trial-status', authenticateToken, subscriptionController.getTrialStatus);
router.post('/create', authenticateToken, subscriptionController.createSubscription);
router.post('/cancel', authenticateToken, subscriptionController.cancelSubscription);
router.get('/payment-history', authenticateToken, subscriptionController.getPaymentHistory);

// Admin routes
router.get('/all', authenticateToken, subscriptionController.getAllSubscriptions);
router.get('/stats', authenticateToken, subscriptionController.getSubscriptionStats);

module.exports = router;