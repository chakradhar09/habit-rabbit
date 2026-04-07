const Task = require('../models/Task');
const TaskCompletion = require('../models/TaskCompletion');

// Get today's date in YYYY-MM-DD format
const getTodayDate = () => {
  return new Date().toISOString().split('T')[0];
};

// @desc    Create new task
// @route   POST /api/tasks
// @access  Private
const createTask = async (req, res) => {
  try {
    const { title } = req.body;

    if (!title || title.trim() === '') {
      return res.status(400).json({
        success: false,
        message: 'Task title is required'
      });
    }

    const task = await Task.create({
      userId: req.user._id,
      title: title.trim()
    });

    res.status(201).json({
      success: true,
      message: 'Task created successfully',
      data: {
        task: {
          _id: task._id,
          title: task.title,
          isActive: task.isActive,
          createdAt: task.createdAt,
          completed: false // New tasks are not completed
        }
      }
    });
  } catch (error) {
    console.error('Create task error:', error);
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
      createdAt: task.createdAt,
      completed: completedMap.get(task._id.toString()) || false
    }));

    // Calculate progress
    const total = tasksWithStatus.length;
    const completed = tasksWithStatus.filter(t => t.completed).length;
    const percentage = total > 0 ? Math.round((completed / total) * 100) : 0;

    res.json({
      success: true,
      data: {
        tasks: tasksWithStatus,
        progress: {
          completed,
          total,
          percentage
        },
        date: today
      }
    });
  } catch (error) {
    console.error('Get tasks error:', error);
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
    console.error('Toggle completion error:', error);
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
    } else {
      // Soft delete: Just deactivate the task
      task.isActive = false;
      await task.save();
    }

    res.json({
      success: true,
      message: deleteHistory === 'true' 
        ? 'Task and history deleted' 
        : 'Task deactivated (history preserved)'
    });
  } catch (error) {
    console.error('Delete task error:', error);
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
    const tasks = await Task.find({ userId: req.user._id }).sort({ createdAt: -1 });
    
    res.json({
      success: true,
      data: {
        tasks
      }
    });
  } catch (error) {
    console.error('Get all tasks error:', error);
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

    res.json({
      success: true,
      message: 'Task order updated successfully'
    });
  } catch (error) {
    console.error('Update task order error:', error);
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

    // Refetch tasks to return updated order
    const updatedTasks = await Task.find({ userId, isActive: true })
      .sort({ sortOrder: 1, createdAt: -1 });

    res.json({
      success: true,
      message: 'Priorities applied successfully',
      data: {
        tasks: updatedTasks
      }
    });
  } catch (error) {
    console.error('Apply priorities error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error applying priorities'
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
  applyAIPriorities
};
