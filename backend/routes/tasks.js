const express = require('express');
const router = express.Router();
const {
  createTask,
  getTodaysTasks,
  toggleCompletion,
  deleteTask,
  updateTask,
  getAllTasks,
  updateTaskOrder,
  applyAIPriorities,
  getStarterPacks,
  setupOnboarding,
  completeOnboarding,
  applyAISkips,
  applyAIFallbacks,
  updateTaskReminder
} = require('../controllers/taskController');
const authMiddleware = require('../middleware/authMiddleware');
const {
  validateTaskCreatePayload,
  validateTaskOrderPayload,
  validateApplyPrioritiesPayload,
  validateOnboardingSetupPayload,
  validateApplySkipsPayload,
  validateApplyFallbacksPayload,
  validateTaskReminderPayload,
  validateObjectIdParam
} = require('../middleware/validationMiddleware');

// All routes are protected
router.use(authMiddleware);

// Task routes
router.get('/starter-packs', getStarterPacks);
router.post('/onboarding/setup', validateOnboardingSetupPayload, setupOnboarding);
router.put('/onboarding/complete', completeOnboarding);
router.post('/', validateTaskCreatePayload, createTask);
router.get('/today', getTodaysTasks);
router.get('/', getAllTasks);
router.put('/reorder', validateTaskOrderPayload, updateTaskOrder);
router.put('/apply-priorities', validateApplyPrioritiesPayload, applyAIPriorities);
router.put('/apply-skips', validateApplySkipsPayload, applyAISkips);
router.put('/apply-fallbacks', validateApplyFallbacksPayload, applyAIFallbacks);
router.put('/:id', validateObjectIdParam('id'), validateTaskCreatePayload, updateTask);
router.put('/:id/reminder', validateObjectIdParam('id'), validateTaskReminderPayload, updateTaskReminder);
router.put('/:id/complete', validateObjectIdParam('id'), toggleCompletion);
router.delete('/:id', validateObjectIdParam('id'), deleteTask);

module.exports = router;
