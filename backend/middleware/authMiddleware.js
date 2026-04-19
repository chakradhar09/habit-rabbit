const jwt = require('jsonwebtoken');
const User = require('../models/User');
const logger = require('../utils/logger');

const authMiddleware = async (req, res, next) => {
  try {
    if (!process.env.JWT_SECRET) {
      logger.error('JWT secret missing during auth middleware execution');
      return res.status(500).json({
        success: false,
        message: 'Server authentication configuration error.'
      });
    }

    // Get token from header (default)
    const authHeader = req.headers.authorization;
    const tokenFromHeader = authHeader && authHeader.startsWith('Bearer ')
      ? authHeader.split(' ')[1]
      : null;

    // EventSource cannot send custom auth headers, so allow query token for stream endpoint only.
    const requestPath = typeof req.path === 'string' ? req.path : '';
    const originalPath = typeof req.originalUrl === 'string'
      ? req.originalUrl.split('?')[0]
      : '';
    const isWeeklyStreamRequest = req.method === 'GET' && (
      requestPath === '/weekly-plan/stream'
      || requestPath.endsWith('/weekly-plan/stream')
      || originalPath.endsWith('/api/analytics/weekly-plan/stream')
      || originalPath.endsWith('/weekly-plan/stream')
    );
    const tokenFromQuery = isWeeklyStreamRequest && typeof req.query.token === 'string'
      ? req.query.token.trim()
      : null;

    const token = tokenFromHeader || tokenFromQuery;

    if (!token) {
      return res.status(401).json({ 
        success: false, 
        message: 'Access denied. No token provided.' 
      });
    }

    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET, {
      issuer: process.env.JWT_ISSUER || 'habit-rabbit',
      audience: process.env.JWT_AUDIENCE || 'habit-rabbit-client'
    });
    
    // Get user from token
    const user = await User.findById(decoded.userId).select('-passwordHash');
    
    if (!user) {
      return res.status(401).json({ 
        success: false, 
        message: 'User not found.' 
      });
    }

    // Attach user to request
    req.user = user;
    next();
  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ 
        success: false, 
        message: 'Invalid token.' 
      });
    }
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ 
        success: false, 
        message: 'Token expired.' 
      });
    }
    logger.error('Authentication middleware failure', {
      path: req.path,
      method: req.method,
      error: error.message
    });

    res.status(500).json({ 
      success: false, 
      message: 'Server error during authentication.' 
    });
  }
};

module.exports = authMiddleware;
