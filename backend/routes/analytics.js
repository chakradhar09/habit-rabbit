const express = require('express');
const router = express.Router();
const {
  getDailyProgress,
  getTaskHeatmap,
  getStats
} = require('../controllers/analyticsController');
const authMiddleware = require('../middleware/authMiddleware');

// All routes are protected
router.use(authMiddleware);

// Analytics routes
router.get('/progress', getDailyProgress);
router.get('/heatmap/:taskId', getTaskHeatmap);
router.get('/stats', getStats);

module.exports = router;
