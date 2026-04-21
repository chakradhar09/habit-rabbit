const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const User = require('../models/User');
const logger = require('../utils/logger');
const { PASSWORD_REGEX } = require('../middleware/validationMiddleware');

const MAX_FAILED_ATTEMPTS = Number(process.env.MAX_LOGIN_ATTEMPTS || 5);
const LOGIN_LOCKOUT_MINUTES = Number(process.env.LOGIN_LOCKOUT_MINUTES || 10);
const LOGIN_ATTEMPT_WINDOW_MS = Number(process.env.LOGIN_ATTEMPT_WINDOW_MINUTES || 30) * 60 * 1000;
const PASSWORD_RESET_TTL_MINUTES = Number(process.env.PASSWORD_RESET_TTL_MINUTES || 30);
const loginAttempts = new Map();

// Generate JWT Token
const generateToken = (userId) => {
  return jwt.sign({ userId }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
    issuer: process.env.JWT_ISSUER || 'habit-rabbit',
    audience: process.env.JWT_AUDIENCE || 'habit-rabbit-client'
  });
};

const getAttemptKey = (email, req) => {
  const forwarded = req.headers['x-forwarded-for'];
  const forwardedIp = Array.isArray(forwarded) ? forwarded[0] : forwarded;
  const ip = forwardedIp || req.ip || 'unknown';
  return `${email}:${ip}`;
};

const getAttemptRecord = (attemptKey) => {
  const existing = loginAttempts.get(attemptKey);
  if (!existing) {
    return null;
  }

  const now = Date.now();

  if (now - existing.lastAttemptAt > LOGIN_ATTEMPT_WINDOW_MS && (!existing.blockedUntil || existing.blockedUntil <= now)) {
    loginAttempts.delete(attemptKey);
    return null;
  }

  return existing;
};

const registerFailedAttempt = (attemptKey) => {
  const now = Date.now();
  const current = getAttemptRecord(attemptKey) || {
    failures: 0,
    lastAttemptAt: now,
    blockedUntil: null
  };

  current.failures += 1;
  current.lastAttemptAt = now;

  if (current.failures >= MAX_FAILED_ATTEMPTS) {
    const overLimitMultiplier = Math.min(8, 2 ** (current.failures - MAX_FAILED_ATTEMPTS));
    current.blockedUntil = now + LOGIN_LOCKOUT_MINUTES * 60 * 1000 * overLimitMultiplier;
  }

  loginAttempts.set(attemptKey, current);
  return current;
};

const clearAttemptRecord = (attemptKey) => {
  loginAttempts.delete(attemptKey);
};

const hashResetToken = (token) =>
  crypto.createHash('sha256').update(token).digest('hex');

// @desc    Register new user
// @route   POST /api/auth/register
// @access  Public
const register = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Validation
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Please provide email and password'
      });
    }

    if (!PASSWORD_REGEX.test(password)) {
      return res.status(400).json({
        success: false,
        message: 'Password must be 8-72 characters and include uppercase, lowercase, and a number'
      });
    }

    // Check if user exists
    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      logger.warn('Duplicate registration attempt', { email: email.toLowerCase() });

      return res.status(409).json({
        success: false,
        message: 'User already exists with this email'
      });
    }

    // Create user
    const user = await User.create({
      email: email.toLowerCase(),
      passwordHash: password // Will be hashed by pre-save hook
    });

    // Generate token
    const token = generateToken(user._id);

    logger.audit('user_registered', {
      userId: String(user._id),
      email: user.email
    });

    res.status(201).json({
      success: true,
      message: 'Registration successful',
      data: {
        user: {
          id: user._id,
          email: user.email
        },
        token
      }
    });
  } catch (error) {
    logger.error('Registration failure', {
      error: error.message,
      stack: error.stack
    });

    res.status(500).json({
      success: false,
      message: 'Server error during registration'
    });
  }
};

// @desc    Login user
// @route   POST /api/auth/login
// @access  Public
const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Validation
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Please provide email and password'
      });
    }

    const normalizedEmail = email.toLowerCase();
    const attemptKey = getAttemptKey(normalizedEmail, req);
    const attemptRecord = getAttemptRecord(attemptKey);

    if (attemptRecord?.blockedUntil && attemptRecord.blockedUntil > Date.now()) {
      const retryAfterSeconds = Math.ceil((attemptRecord.blockedUntil - Date.now()) / 1000);
      return res.status(429).json({
        success: false,
        message: 'Too many failed login attempts. Please try again later.',
        retryAfterSeconds
      });
    }

    // Find user
    const user = await User.findOne({ email: normalizedEmail });
    if (!user) {
      registerFailedAttempt(attemptKey);
      logger.warn('Login failed: user not found', { email: normalizedEmail });

      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

    // Check password
    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      const updatedAttempts = registerFailedAttempt(attemptKey);
      logger.warn('Login failed: invalid password', {
        email: normalizedEmail,
        failedAttempts: updatedAttempts.failures
      });

      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

    clearAttemptRecord(attemptKey);

    // Generate token
    const token = generateToken(user._id);

    logger.audit('user_logged_in', {
      userId: String(user._id),
      email: user.email
    });

    res.json({
      success: true,
      message: 'Login successful',
      data: {
        user: {
          id: user._id,
          email: user.email
        },
        token
      }
    });
  } catch (error) {
    logger.error('Login failure', {
      error: error.message,
      stack: error.stack
    });

    res.status(500).json({
      success: false,
      message: 'Server error during login'
    });
  }
};

// @desc    Request password reset token
// @route   POST /api/auth/forgot-password
// @access  Public
const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;
    const normalizedEmail = String(email || '').toLowerCase();
    const user = await User.findOne({ email: normalizedEmail });

    let resetToken = null;

    if (user) {
      resetToken = crypto.randomBytes(32).toString('hex');
      user.passwordResetTokenHash = hashResetToken(resetToken);
      user.passwordResetExpiresAt = new Date(Date.now() + PASSWORD_RESET_TTL_MINUTES * 60 * 1000);
      await user.save();

      logger.audit('password_reset_requested', {
        userId: String(user._id),
        email: user.email
      });
    }

    const response = {
      success: true,
      message: 'If an account exists for this email, reset instructions have been generated.'
    };

    if (resetToken && process.env.NODE_ENV !== 'production') {
      const appBaseUrl = (process.env.FRONTEND_URL || `${req.protocol}://${req.get('host')}`).replace(/\/$/, '');
      response.data = {
        resetToken,
        resetUrl: `${appBaseUrl}/index.html?resetToken=${resetToken}`,
        expiresInMinutes: PASSWORD_RESET_TTL_MINUTES
      };
    }

    return res.json(response);
  } catch (error) {
    logger.error('Forgot password failure', {
      error: error.message,
      stack: error.stack
    });

    return res.status(500).json({
      success: false,
      message: 'Server error while processing password reset request'
    });
  }
};

// @desc    Reset password using token
// @route   POST /api/auth/reset-password
// @access  Public
const resetPassword = async (req, res) => {
  try {
    const { token, password } = req.body;

    if (!PASSWORD_REGEX.test(password)) {
      return res.status(400).json({
        success: false,
        message: 'Password must be 8-72 characters and include uppercase, lowercase, and a number'
      });
    }

    const tokenHash = hashResetToken(token);
    const user = await User.findOne({
      passwordResetTokenHash: tokenHash,
      passwordResetExpiresAt: { $gt: new Date() }
    });

    if (!user) {
      return res.status(400).json({
        success: false,
        message: 'Reset token is invalid or has expired'
      });
    }

    user.passwordHash = password;
    user.passwordResetTokenHash = null;
    user.passwordResetExpiresAt = null;
    await user.save();

    logger.audit('password_reset_completed', {
      userId: String(user._id),
      email: user.email
    });

    return res.json({
      success: true,
      message: 'Password has been reset successfully.'
    });
  } catch (error) {
    logger.error('Reset password failure', {
      error: error.message,
      stack: error.stack
    });

    return res.status(500).json({
      success: false,
      message: 'Server error while resetting password'
    });
  }
};

// @desc    Get current user
// @route   GET /api/auth/me
// @access  Private
const getMe = async (req, res) => {
  const user = req.user;

  res.json({
    success: true,
    data: {
      user: {
        id: user._id,
        email: user.email,
        onboarding: user.onboarding || {
          completed: false,
          completedAt: null,
          starterPack: null
        },
        reminderPreferences: user.reminderPreferences || {
          enabled: false,
          time: '08:00',
          timezone: 'UTC'
        },
        createdAt: user.createdAt
      }
    }
  });
};

module.exports = {
  register,
  login,
  forgotPassword,
  resetPassword,
  getMe
};
