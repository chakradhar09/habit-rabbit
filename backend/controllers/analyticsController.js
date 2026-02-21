const Task = require('../models/Task');
const TaskCompletion = require('../models/TaskCompletion');

// @desc    Get daily progress over time
// @route   GET /api/analytics/progress
// @access  Private
const getDailyProgress = async (req, res) => {
  try {
    const { range = '7d' } = req.query;
    const userId = req.user._id;

    // Calculate date range
    let days;
    switch (range) {
      case '30d':
        days = 30;
        break;
      case '6m':
        days = 180;
        break;
      case '7d':
      default:
        days = 7;
    }

    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days + 1);

    // Get all active tasks (for calculating totals)
    const activeTasks = await Task.find({ userId, isActive: true });
    const totalTasks = activeTasks.length;

    // Get all completions in the date range
    const startDateStr = startDate.toISOString().split('T')[0];
    const endDateStr = endDate.toISOString().split('T')[0];

    const completions = await TaskCompletion.find({
      userId,
      date: { $gte: startDateStr, $lte: endDateStr },
      completed: true
    });

    // Group completions by date
    const completionsByDate = new Map();
    completions.forEach(c => {
      const count = completionsByDate.get(c.date) || 0;
      completionsByDate.set(c.date, count + 1);
    });

    // Generate data for each day in range
    const progressData = [];
    const currentDate = new Date(startDate);

    while (currentDate <= endDate) {
      const dateStr = currentDate.toISOString().split('T')[0];
      const completed = completionsByDate.get(dateStr) || 0;
      const percentage = totalTasks > 0 ? Math.round((completed / totalTasks) * 100) : 0;

      progressData.push({
        date: dateStr,
        completed,
        total: totalTasks,
        percentage
      });

      currentDate.setDate(currentDate.getDate() + 1);
    }

    res.json({
      success: true,
      data: {
        progress: progressData,
        range
      }
    });
  } catch (error) {
    console.error('Get daily progress error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error fetching progress'
    });
  }
};

// @desc    Get heatmap data for a specific task
// @route   GET /api/analytics/heatmap/:taskId
// @access  Private
const getTaskHeatmap = async (req, res) => {
  try {
    const { taskId } = req.params;
    const userId = req.user._id;

    // Verify task belongs to user
    const task = await Task.findOne({ _id: taskId, userId });
    if (!task) {
      return res.status(404).json({
        success: false,
        message: 'Task not found'
      });
    }

    // Get last 6 months of data
    const endDate = new Date();
    const startDate = new Date();
    startDate.setMonth(startDate.getMonth() - 6);

    const startDateStr = startDate.toISOString().split('T')[0];
    const endDateStr = endDate.toISOString().split('T')[0];

    const completions = await TaskCompletion.find({
      taskId,
      date: { $gte: startDateStr, $lte: endDateStr }
    }).sort({ date: 1 });

    // Generate heatmap data
    const heatmapData = completions.map(c => ({
      date: c.date,
      completed: c.completed
    }));

    res.json({
      success: true,
      data: {
        task: {
          _id: task._id,
          title: task.title
        },
        heatmap: heatmapData
      }
    });
  } catch (error) {
    console.error('Get task heatmap error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error fetching heatmap'
    });
  }
};

// @desc    Get overall stats
// @route   GET /api/analytics/stats
// @access  Private
const getStats = async (req, res) => {
  try {
    const userId = req.user._id;
    const today = new Date().toISOString().split('T')[0];

    // Total active tasks
    const totalTasks = await Task.countDocuments({ userId, isActive: true });

    // Today's completions
    const todayCompletions = await TaskCompletion.countDocuments({
      userId,
      date: today,
      completed: true
    });

    // Total completions all time
    const totalCompletions = await TaskCompletion.countDocuments({
      userId,
      completed: true
    });

    // Current streak (consecutive days)
    let streak = 0;
    const checkDate = new Date();
    
    while (true) {
      const dateStr = checkDate.toISOString().split('T')[0];
      const dayCompletions = await TaskCompletion.countDocuments({
        userId,
        date: dateStr,
        completed: true
      });
      
      if (dayCompletions > 0) {
        streak++;
        checkDate.setDate(checkDate.getDate() - 1);
      } else {
        break;
      }

      // Safety limit
      if (streak > 365) break;
    }

    res.json({
      success: true,
      data: {
        totalTasks,
        todayCompletions,
        totalCompletions,
        currentStreak: streak
      }
    });
  } catch (error) {
    console.error('Get stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error fetching stats'
    });
  }
};

module.exports = {
  getDailyProgress,
  getTaskHeatmap,
  getStats
};
