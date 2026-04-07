const express = require('express');
const router = express.Router();
const {
  createTask,
  getTodaysTasks,
  toggleCompletion,
  deleteTask,
  getAllTasks,
  updateTaskOrder,
  applyAIPriorities
} = require('../controllers/taskController');
const authMiddleware = require('../middleware/authMiddleware');
const {
  validateTaskCreatePayload,
  validateTaskOrderPayload,
  validateApplyPrioritiesPayload,
  validateObjectIdParam
} = require('../middleware/validationMiddleware');

// All routes are protected
router.use(authMiddleware);

// Task routes
router.post('/', validateTaskCreatePayload, createTask);
router.get('/today', getTodaysTasks);
router.get('/', getAllTasks);
router.put('/:id/complete', validateObjectIdParam('id'), toggleCompletion);
router.put('/reorder', validateTaskOrderPayload, updateTaskOrder);
router.put('/apply-priorities', validateApplyPrioritiesPayload, applyAIPriorities);
router.delete('/:id', validateObjectIdParam('id'), deleteTask);

module.exports = router;
