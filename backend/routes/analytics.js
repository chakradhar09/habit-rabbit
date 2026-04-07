const express = require('express');
const router = express.Router();
const {
  getDailyProgress,
  getTaskHeatmap,
  getStats
} = require('../controllers/analyticsController');
const { getAIInsights } = require('../controllers/aiInsightsController');
const authMiddleware = require('../middleware/authMiddleware');
const { aiInsightsLimiter } = require('../middleware/rateLimitMiddleware');
const {
  validateAIInsightsPayload,
  validateObjectIdParam
} = require('../middleware/validationMiddleware');

// All routes are protected
router.use(authMiddleware);

// Analytics routes
router.get('/progress', getDailyProgress);
router.get('/heatmap/:taskId', validateObjectIdParam('taskId'), getTaskHeatmap);
router.get('/stats', getStats);

// AI Insights route
router.post('/ai-insights', aiInsightsLimiter, validateAIInsightsPayload, getAIInsights);

module.exports = router;
