const Task = require('../models/Task');
const TaskCompletion = require('../models/TaskCompletion');
const User = require('../models/User');
const logger = require('../utils/logger');
const {
  getWeekStartDateISO,
  emitWeeklyPlanUpdate
} = require('../utils/weeklyPlanRealtime');

const STARTER_PACKS = [
  {
    id: 'focus-foundation',
    label: 'Focus Foundation',
    habits: ['Deep work block', 'Hydration check-in', 'Evening reflection']
  },
  {
    id: 'student-sprint',
    label: 'Student Sprint',
    habits: ['Review notes for 25 minutes', 'Practice questions', 'Plan tomorrow priorities']
  },
  {
    id: 'wellness-core',
    label: 'Wellness Core',
    habits: ['Morning stretch', 'Walk for 20 minutes', 'No-screen wind-down']
  }
];

// Get today's date in YYYY-MM-DD format
const getTodayDate = () => {
  return new Date().toISOString().split('T')[0];
};

const getDateOffset = (days = 0) => {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date.toISOString().split('T')[0];
};

const isTaskPaused = (task, dateStr) => Boolean(task.pausedUntil && task.pausedUntil >= dateStr);

const notifyWeeklyPlanChange = (userId, reason, dateValue) => {
  emitWeeklyPlanUpdate(String(userId), {
    weekStartDate: getWeekStartDateISO(dateValue),
    reason
  });
};

// @desc    Create new task
// @route   POST /api/tasks
// @access  Private
const createTask = async (req, res) => {
  try {
    const { title, reminder } = req.body;

    if (!title || title.trim() === '') {
      return res.status(400).json({
        success: false,
        message: 'Task title is required'
      });
    }

    const reminderPayload = reminder && typeof reminder === 'object'
      ? {
          enabled: Boolean(reminder.enabled),
          time: typeof reminder.time === 'string' ? reminder.time : '08:00'
        }
      : undefined;

    const task = await Task.create({
      userId: req.user._id,
      title: title.trim(),
      ...(reminderPayload ? { reminder: reminderPayload } : {})
    });

    logger.audit('task_created', {
      userId: String(req.user._id),
      taskId: String(task._id),
      title: task.title
    });

    notifyWeeklyPlanChange(req.user._id, 'tasks-updated');

    res.status(201).json({
      success: true,
      message: 'Task created successfully',
      data: {
        task: {
          _id: task._id,
          title: task.title,
          isActive: task.isActive,
          reminder: task.reminder,
          pausedUntil: task.pausedUntil,
          pauseReason: task.pauseReason,
          isPaused: false,
          createdAt: task.createdAt,
          completed: false // New tasks are not completed
        }
      }
    });
  } catch (error) {
    logger.error('Create task error', {
      userId: String(req.user._id),
      error: error.message,
      stack: error.stack
    });

    res.status(500).json({
      success: false,
      message: 'Server error creating task'
    });
  }
};

// @desc    Get today's tasks with completion status
// @route   GET /api/tasks/today
// @access  Private
const getTodaysTasks = async (req, res) => {
  try {
    const today = getTodayDate();
    const userId = req.user._id;

    // Get all active tasks for the user (sorted by sortOrder, then createdAt)
    const tasks = await Task.find({ userId, isActive: true }).sort({ sortOrder: 1, createdAt: -1 });

    // Get today's completions for these tasks
    const taskIds = tasks.map(t => t._id);
    const completions = await TaskCompletion.find({
      userId,
      taskId: { $in: taskIds },
      date: today
    });

    // Create a map of completed tasks
    const completedMap = new Map();
    completions.forEach(c => {
      completedMap.set(c.taskId.toString(), c.completed);
    });

    // Merge tasks with completion status
    const tasksWithStatus = tasks.map(task => ({
      _id: task._id,
      title: task.title,
      isActive: task.isActive,
      priority: task.priority || 'medium',
      sortOrder: task.sortOrder || 0,
      reminder: task.reminder,
      pausedUntil: task.pausedUntil,
      pauseReason: task.pauseReason,
      fallbackFromTitle: task.fallbackFromTitle,
      fallbackAppliedAt: task.fallbackAppliedAt,
      isPaused: isTaskPaused(task, today),
      createdAt: task.createdAt,
      completed: completedMap.get(task._id.toString()) || false
    }));

    // Calculate progress
    const actionableTasks = tasksWithStatus.filter((task) => !task.isPaused);
    const total = actionableTasks.length;
    const completed = actionableTasks.filter(t => t.completed).length;
    const percentage = total > 0 ? Math.round((completed / total) * 100) : 0;

    const pausedTasks = tasksWithStatus.filter((task) => task.isPaused).length;

    res.json({
      success: true,
      data: {
        tasks: tasksWithStatus,
        progress: {
          completed,
          total,
          percentage,
          pausedTasks
        },
        date: today
      }
    });
  } catch (error) {
    logger.error('Get today tasks error', {
      userId: String(req.user._id),
      error: error.message,
      stack: error.stack
    });

    res.status(500).json({
      success: false,
      message: 'Server error fetching tasks'
    });
  }
};

// @desc    Toggle task completion for today
// @route   PUT /api/tasks/:id/complete
// @access  Private
const toggleCompletion = async (req, res) => {
  try {
    const { id } = req.params;
    const today = getTodayDate();
    const userId = req.user._id;

    // Verify task belongs to user
    const task = await Task.findOne({ _id: id, userId });
    if (!task) {
      return res.status(404).json({
        success: false,
        message: 'Task not found'
      });
    }

    // Find existing completion record
    let completion = await TaskCompletion.findOne({
      userId,
      taskId: id,
      date: today
    });

    if (completion) {
      // Toggle the completion status
      completion.completed = !completion.completed;
      await completion.save();
    } else {
      // Create new completion (marked as completed)
      completion = await TaskCompletion.create({
        userId,
        taskId: id,
        date: today,
        completed: true
      });
    }

    notifyWeeklyPlanChange(userId, 'tasks-updated', today);

    res.json({
      success: true,
      message: completion.completed ? 'Task marked as completed' : 'Task marked as incomplete',
      data: {
        taskId: id,
        date: today,
        completed: completion.completed
      }
    });
  } catch (error) {
    logger.error('Toggle completion error', {
      userId: String(req.user._id),
      taskId: req.params.id,
      error: error.message,
      stack: error.stack
    });

    res.status(500).json({
      success: false,
      message: 'Server error toggling completion'
    });
  }
};

// @desc    Delete task
// @route   DELETE /api/tasks/:id
// @access  Private
const deleteTask = async (req, res) => {
  try {
    const { id } = req.params;
    const { deleteHistory } = req.query;
    const userId = req.user._id;

    // Verify task belongs to user
    const task = await Task.findOne({ _id: id, userId });
    if (!task) {
      return res.status(404).json({
        success: false,
        message: 'Task not found'
      });
    }

    if (deleteHistory === 'true') {
      // Hard delete: Remove task and all completion history
      await TaskCompletion.deleteMany({ taskId: id });
      await Task.findByIdAndDelete(id);

      logger.audit('task_hard_deleted', {
        userId: String(userId),
        taskId: id,
        taskTitle: task.title
      });
    } else {
      // Soft delete: Just deactivate the task
      task.isActive = false;
      await task.save();

      logger.audit('task_soft_deleted', {
        userId: String(userId),
        taskId: id,
        taskTitle: task.title
      });
    }

    notifyWeeklyPlanChange(userId, 'tasks-updated');

    res.json({
      success: true,
      message: deleteHistory === 'true' 
        ? 'Task and history deleted' 
        : 'Task deactivated (history preserved)'
    });
  } catch (error) {
    logger.error('Delete task error', {
      userId: String(req.user._id),
      taskId: req.params.id,
      error: error.message,
      stack: error.stack
    });

    res.status(500).json({
      success: false,
      message: 'Server error deleting task'
    });
  }
};

// @desc    Get all tasks (including inactive)
// @route   GET /api/tasks
// @access  Private
const getAllTasks = async (req, res) => {
  try {
    const today = getTodayDate();
    const tasks = await Task.find({ userId: req.user._id }).sort({ createdAt: -1 });
    const normalized = tasks.map((task) => ({
      ...task.toObject(),
      isPaused: isTaskPaused(task, today)
    }));
    
    res.json({
      success: true,
      data: {
        tasks: normalized
      }
    });
  } catch (error) {
    logger.error('Get all tasks error', {
      userId: String(req.user._id),
      error: error.message,
      stack: error.stack
    });

    res.status(500).json({
      success: false,
      message: 'Server error fetching tasks'
    });
  }
};

// @desc    Update task order (drag-drop reordering)
// @route   PUT /api/tasks/reorder
// @access  Private
const updateTaskOrder = async (req, res) => {
  try {
    const { taskOrders } = req.body; // Array of { taskId, sortOrder }
    const userId = req.user._id;

    if (!Array.isArray(taskOrders) || taskOrders.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'taskOrders array is required'
      });
    }

    // Validate all tasks belong to user
    const taskIds = taskOrders.map(t => t.taskId);
    const userTasks = await Task.find({ _id: { $in: taskIds }, userId });
    
    if (userTasks.length !== taskIds.length) {
      return res.status(403).json({
        success: false,
        message: 'Some tasks do not belong to this user'
      });
    }

    // Bulk update sort orders
    const bulkOps = taskOrders.map(({ taskId, sortOrder }) => ({
      updateOne: {
        filter: { _id: taskId, userId },
        update: { $set: { sortOrder } }
      }
    }));

    await Task.bulkWrite(bulkOps);

    logger.audit('task_order_updated', {
      userId: String(userId),
      itemCount: taskOrders.length
    });

    res.json({
      success: true,
      message: 'Task order updated successfully'
    });
  } catch (error) {
    logger.error('Update task order error', {
      userId: String(req.user._id),
      error: error.message,
      stack: error.stack
    });

    res.status(500).json({
      success: false,
      message: 'Server error updating task order'
    });
  }
};

// @desc    Apply AI-suggested priorities to tasks
// @route   PUT /api/tasks/apply-priorities
// @access  Private
const applyAIPriorities = async (req, res) => {
  try {
    const { priorities } = req.body; // Array of { taskId, priority }
    const userId = req.user._id;

    if (!Array.isArray(priorities) || priorities.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'priorities array is required'
      });
    }

    // Validate priority values
    const validPriorities = ['high', 'medium', 'low'];
    const invalidPriority = priorities.find(p => !validPriorities.includes(p.priority));
    if (invalidPriority) {
      return res.status(400).json({
        success: false,
        message: 'Invalid priority value. Must be high, medium, or low'
      });
    }

    // Validate all tasks belong to user
    const taskIds = priorities.map(p => p.taskId);
    const userTasks = await Task.find({ _id: { $in: taskIds }, userId });
    
    if (userTasks.length !== taskIds.length) {
      return res.status(403).json({
        success: false,
        message: 'Some tasks do not belong to this user'
      });
    }

    // Bulk update priorities and reorder by priority
    const priorityOrder = { high: 0, medium: 1, low: 2 };
    const bulkOps = priorities.map(({ taskId, priority }) => ({
      updateOne: {
        filter: { _id: taskId, userId },
        update: { 
          $set: { 
            priority,
            sortOrder: priorityOrder[priority] * 100 // Group by priority
          } 
        }
      }
    }));

    await Task.bulkWrite(bulkOps);

    logger.audit('ai_priorities_applied', {
      userId: String(userId),
      itemCount: priorities.length
    });

    // Refetch tasks to return updated order
    const updatedTasks = await Task.find({ userId, isActive: true })
      .sort({ sortOrder: 1, createdAt: -1 });

    const today = getTodayDate();

    res.json({
      success: true,
      message: 'Priorities applied successfully',
      data: {
        tasks: updatedTasks.map((task) => ({
          ...task.toObject(),
          isPaused: isTaskPaused(task, today)
        }))
      }
    });
  } catch (error) {
    logger.error('Apply priorities error', {
      userId: String(req.user._id),
      error: error.message,
      stack: error.stack
    });

    res.status(500).json({
      success: false,
      message: 'Server error applying priorities'
    });
  }
};

// @desc    Get starter packs for onboarding
// @route   GET /api/tasks/starter-packs
// @access  Private
const getStarterPacks = async (req, res) => {
  res.json({
    success: true,
    data: {
      starterPacks: STARTER_PACKS
    }
  });
};

// @desc    Setup onboarding starter habits
// @route   POST /api/tasks/onboarding/setup
// @access  Private
const setupOnboarding = async (req, res) => {
  try {
    const { packId, customHabits = [] } = req.body;
    const userId = req.user._id;

    const pack = STARTER_PACKS.find((item) => item.id === packId) || STARTER_PACKS[0];
    const normalizedCustomHabits = Array.isArray(customHabits)
      ? customHabits
          .filter((habit) => typeof habit === 'string')
          .map((habit) => habit.trim())
          .filter(Boolean)
          .slice(0, 5)
      : [];

    const starterHabits = [...pack.habits, ...normalizedCustomHabits]
      .filter((title, index, list) => list.findIndex((value) => value.toLowerCase() === title.toLowerCase()) === index)
      .slice(0, 8);

    if (starterHabits.length < 3) {
      return res.status(400).json({
        success: false,
        message: 'At least three starter habits are required.'
      });
    }

    const existingTasks = await Task.find({ userId, isActive: true }).select('title sortOrder').lean();
    const existingTitleSet = new Set(existingTasks.map((task) => task.title.toLowerCase()));
    let sortOrderBase = existingTasks.length > 0
      ? Math.max(...existingTasks.map((task) => Number(task.sortOrder) || 0)) + 1
      : 0;

    const tasksToCreate = starterHabits
      .filter((title) => !existingTitleSet.has(title.toLowerCase()))
      .map((title) => ({
        userId,
        title,
        sortOrder: sortOrderBase++
      }));

    const createdTasks = tasksToCreate.length > 0 ? await Task.insertMany(tasksToCreate) : [];

    await User.findByIdAndUpdate(userId, {
      $set: {
        'onboarding.starterPack': pack.id
      }
    });

    logger.audit('onboarding_setup_completed', {
      userId: String(userId),
      packId: pack.id,
      createdTaskCount: createdTasks.length
    });

    notifyWeeklyPlanChange(userId, 'tasks-updated');

    res.status(201).json({
      success: true,
      message: 'Starter habits created successfully.',
      data: {
        packId: pack.id,
        createdTaskCount: createdTasks.length,
        tasks: createdTasks
      }
    });
  } catch (error) {
    logger.error('Onboarding setup error', {
      userId: String(req.user._id),
      error: error.message,
      stack: error.stack
    });

    res.status(500).json({
      success: false,
      message: 'Server error during onboarding setup.'
    });
  }
};

// @desc    Mark onboarding completed
// @route   PUT /api/tasks/onboarding/complete
// @access  Private
const completeOnboarding = async (req, res) => {
  try {
    const userId = req.user._id;
    const completedAt = new Date();

    await User.findByIdAndUpdate(userId, {
      $set: {
        'onboarding.completed': true,
        'onboarding.completedAt': completedAt
      }
    });

    logger.audit('onboarding_marked_complete', {
      userId: String(userId)
    });

    res.json({
      success: true,
      message: 'Onboarding completed.',
      data: {
        completed: true,
        completedAt
      }
    });
  } catch (error) {
    logger.error('Complete onboarding error', {
      userId: String(req.user._id),
      error: error.message,
      stack: error.stack
    });

    res.status(500).json({
      success: false,
      message: 'Server error while completing onboarding.'
    });
  }
};

// @desc    Apply temporary pauses from AI suggestions
// @route   PUT /api/tasks/apply-skips
// @access  Private
const applyAISkips = async (req, res) => {
  try {
    const { skips } = req.body;
    const userId = req.user._id;

    const taskIds = skips.map((item) => item.taskId);
    const userTasks = await Task.find({ _id: { $in: taskIds }, userId }).select('_id').lean();

    if (userTasks.length !== taskIds.length) {
      return res.status(403).json({
        success: false,
        message: 'Some tasks do not belong to this user.'
      });
    }

    const operations = skips.map((item) => {
      const days = Number(item.days) > 0 ? Number(item.days) : 3;
      return {
        updateOne: {
          filter: { _id: item.taskId, userId },
          update: {
            $set: {
              pausedUntil: getDateOffset(days),
              pauseReason: typeof item.reason === 'string' ? item.reason.trim().slice(0, 160) : 'AI suggested skip'
            }
          }
        }
      };
    });

    await Task.bulkWrite(operations);

    logger.audit('ai_skips_applied', {
      userId: String(userId),
      itemCount: skips.length
    });

    notifyWeeklyPlanChange(userId, 'tasks-updated');

    res.json({
      success: true,
      message: 'AI skip suggestions applied successfully.'
    });
  } catch (error) {
    logger.error('Apply AI skips error', {
      userId: String(req.user._id),
      error: error.message,
      stack: error.stack
    });

    res.status(500).json({
      success: false,
      message: 'Server error applying skip suggestions.'
    });
  }
};

// @desc    Apply fallback habit conversions from AI suggestions
// @route   PUT /api/tasks/apply-fallbacks
// @access  Private
const applyAIFallbacks = async (req, res) => {
  try {
    const { fallbacks } = req.body;
    const userId = req.user._id;

    const taskIds = fallbacks.map((item) => item.taskId);
    const userTasks = await Task.find({ _id: { $in: taskIds }, userId }).select('_id title').lean();

    if (userTasks.length !== taskIds.length) {
      return res.status(403).json({
        success: false,
        message: 'Some tasks do not belong to this user.'
      });
    }

    const titleById = new Map(userTasks.map((task) => [String(task._id), task.title]));

    const operations = fallbacks.map((item) => ({
      updateOne: {
        filter: { _id: item.taskId, userId },
        update: {
          $set: {
            title: item.suggestion,
            fallbackFromTitle: titleById.get(String(item.taskId)) || null,
            fallbackAppliedAt: new Date(),
            pausedUntil: null,
            pauseReason: null
          }
        }
      }
    }));

    await Task.bulkWrite(operations);

    logger.audit('ai_fallbacks_applied', {
      userId: String(userId),
      itemCount: fallbacks.length
    });

    notifyWeeklyPlanChange(userId, 'tasks-updated');

    res.json({
      success: true,
      message: 'Fallback habits applied successfully.'
    });
  } catch (error) {
    logger.error('Apply AI fallbacks error', {
      userId: String(req.user._id),
      error: error.message,
      stack: error.stack
    });

    res.status(500).json({
      success: false,
      message: 'Server error applying fallback suggestions.'
    });
  }
};

// @desc    Update reminder settings for a task
// @route   PUT /api/tasks/:id/reminder
// @access  Private
const updateTaskReminder = async (req, res) => {
  try {
    const { id } = req.params;
    const { enabled, time } = req.body;
    const userId = req.user._id;

    const task = await Task.findOneAndUpdate(
      { _id: id, userId },
      {
        $set: {
          reminder: {
            enabled,
            time
          }
        }
      },
      { new: true }
    );

    if (!task) {
      return res.status(404).json({
        success: false,
        message: 'Task not found.'
      });
    }

    logger.audit('task_reminder_updated', {
      userId: String(userId),
      taskId: String(task._id),
      enabled: task.reminder.enabled,
      time: task.reminder.time
    });

    res.json({
      success: true,
      message: 'Reminder updated successfully.',
      data: {
        taskId: task._id,
        reminder: task.reminder
      }
    });
  } catch (error) {
    logger.error('Update task reminder error', {
      userId: String(req.user._id),
      taskId: req.params.id,
      error: error.message,
      stack: error.stack
    });

    res.status(500).json({
      success: false,
      message: 'Server error updating reminder.'
    });
  }
};

module.exports = {
  createTask,
  getTodaysTasks,
  toggleCompletion,
  deleteTask,
  getAllTasks,
  updateTaskOrder,
  applyAIPriorities,
  getStarterPacks,
  setupOnboarding,
  completeOnboarding,
  applyAISkips,
  applyAIFallbacks,
  updateTaskReminder
};
