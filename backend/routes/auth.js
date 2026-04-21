const express = require('express');
const router = express.Router();
const { register, login, forgotPassword, resetPassword, getMe } = require('../controllers/authController');
const authMiddleware = require('../middleware/authMiddleware');
const { authLimiter } = require('../middleware/rateLimitMiddleware');
const {
	validateRegisterPayload,
	validateLoginPayload,
	validateForgotPasswordPayload,
	validateResetPasswordPayload
} = require('../middleware/validationMiddleware');

// Public routes
router.post('/register', authLimiter, validateRegisterPayload, register);
router.post('/login', authLimiter, validateLoginPayload, login);
router.post('/forgot-password', authLimiter, validateForgotPasswordPayload, forgotPassword);
router.post('/reset-password', authLimiter, validateResetPasswordPayload, resetPassword);

// Protected routes
router.get('/me', authMiddleware, getMe);

module.exports = router;
