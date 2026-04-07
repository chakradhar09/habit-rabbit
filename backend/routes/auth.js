const express = require('express');
const router = express.Router();
const { register, login, getMe } = require('../controllers/authController');
const authMiddleware = require('../middleware/authMiddleware');
const { authLimiter } = require('../middleware/rateLimitMiddleware');
const {
	validateRegisterPayload,
	validateLoginPayload
} = require('../middleware/validationMiddleware');

// Public routes
router.post('/register', authLimiter, validateRegisterPayload, register);
router.post('/login', authLimiter, validateLoginPayload, login);

// Protected routes
router.get('/me', authMiddleware, getMe);

module.exports = router;
