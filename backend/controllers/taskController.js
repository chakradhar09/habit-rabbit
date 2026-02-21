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

    // Get all active tasks for the user
    const tasks = await Task.find({ userId, isActive: true }).sort({ createdAt: -1 });

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

module.exports = {
  createTask,
  getTodaysTasks,
  toggleCompletion,
  deleteTask,
  getAllTasks
};
