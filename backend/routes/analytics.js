const express = require('express');
const router = express.Router();
const {
  getDailyProgress,
  getTaskHeatmap,
  getStats,
  getWeeklyPlan,
  saveWeeklyPlan
} = require('../controllers/analyticsController');
const { getAIInsights } = require('../controllers/aiInsightsController');
const authMiddleware = require('../middleware/authMiddleware');
const { aiInsightsLimiter } = require('../middleware/rateLimitMiddleware');
const {
  validateAIInsightsPayload,
  validateWeeklyPlanPayload,
  validateObjectIdParam
} = require('../middleware/validationMiddleware');

// All routes are protected
router.use(authMiddleware);

// Analytics routes
router.get('/progress', getDailyProgress);
router.get('/heatmap/:taskId', validateObjectIdParam('taskId'), getTaskHeatmap);
router.get('/stats', getStats);
router.get('/weekly-plan', getWeeklyPlan);
router.put('/weekly-plan', validateWeeklyPlanPayload, saveWeeklyPlan);

// AI Insights route
router.post('/ai-insights', aiInsightsLimiter, validateAIInsightsPayload, getAIInsights);

module.exports = router;
