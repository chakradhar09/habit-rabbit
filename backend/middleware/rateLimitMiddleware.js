const rateLimit = require('express-rate-limit');

const createLimiter = ({ windowMs, max, message }) =>
  rateLimit({
    windowMs,
    max,
    standardHeaders: true,
    legacyHeaders: false,
    handler: (req, res) => {
      res.status(429).json({
        success: false,
        message,
        retryAfterSeconds: Math.ceil(windowMs / 1000)
      });
    }
  });

const authLimiter = createLimiter({
  windowMs: 15 * 60 * 1000,
  max: 15,
  message: 'Too many authentication attempts. Please try again later.'
});

const aiInsightsLimiter = createLimiter({
  windowMs: 15 * 60 * 1000,
  max: 8,
  message: 'Too many AI insight requests. Please wait before trying again.'
});

module.exports = {
  authLimiter,
  aiInsightsLimiter
};
