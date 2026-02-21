const express = require('express');
const router = express.Router();
const {
  createTask,
  getTodaysTasks,
  toggleCompletion,
  deleteTask,
  getAllTasks
} = require('../controllers/taskController');
const authMiddleware = require('../middleware/authMiddleware');

// All routes are protected
router.use(authMiddleware);

// Task routes
router.post('/', createTask);
router.get('/today', getTodaysTasks);
router.get('/', getAllTasks);
router.put('/:id/complete', toggleCompletion);
router.delete('/:id', deleteTask);

module.exports = router;
