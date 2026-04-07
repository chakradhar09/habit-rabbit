const Task = require('../models/Task');
const TaskCompletion = require('../models/TaskCompletion');
const WeeklyPlan = require('../models/WeeklyPlan');
const logger = require('../utils/logger');

const toDateStr = (value = new Date()) => value.toISOString().split('T')[0];

const getWeekStartDate = (inputDate) => {
  const date = inputDate ? new Date(inputDate) : new Date();
  const normalized = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  const day = normalized.getUTCDay();
  const diff = day === 0 ? -6 : 1 - day;
  normalized.setUTCDate(normalized.getUTCDate() + diff);
  return toDateStr(normalized);
};

const getWeekEndDate = (weekStartDate) => {
  const start = new Date(`${weekStartDate}T00:00:00.000Z`);
  start.setUTCDate(start.getUTCDate() + 6);
  return toDateStr(start);
};

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
    const totalTasks = await Task.countDocuments({ userId, isActive: true });

    // Get all completions in the date range
    const startDateStr = startDate.toISOString().split('T')[0];
    const endDateStr = endDate.toISOString().split('T')[0];

    const completionCounts = await TaskCompletion.aggregate([
      {
        $match: {
          userId,
          date: { $gte: startDateStr, $lte: endDateStr },
          completed: true
        }
      },
      {
        $group: {
          _id: '$date',
          completed: { $sum: 1 }
        }
      }
    ]);

    const completionsByDate = new Map(completionCounts.map((entry) => [entry._id, entry.completed]));

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
    logger.error('Get daily progress error', {
      error: error.message,
      stack: error.stack
    });

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
    const task = await Task.findOne({ _id: taskId, userId }).select('_id title').lean();
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
    })
      .select('date completed -_id')
      .sort({ date: 1 })
      .lean();

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
    logger.error('Get task heatmap error', {
      taskId: req.params.taskId,
      error: error.message,
      stack: error.stack
    });

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

    const completionDates = await TaskCompletion.distinct('date', {
      userId,
      completed: true,
      date: { $lte: today }
    });

    const completionDateSet = new Set(completionDates);

    // Current streak (consecutive days)
    let streak = 0;
    const checkDate = new Date();
    
    while (true) {
      const dateStr = checkDate.toISOString().split('T')[0];

      if (completionDateSet.has(dateStr)) {
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
    logger.error('Get stats error', {
      error: error.message,
      stack: error.stack
    });

    res.status(500).json({
      success: false,
      message: 'Server error fetching stats'
    });
  }
};

// @desc    Get weekly plan and summary
// @route   GET /api/analytics/weekly-plan
// @access  Private
const getWeeklyPlan = async (req, res) => {
  try {
    const userId = req.user._id;
    const weekStartDate = getWeekStartDate(req.query.weekStartDate);
    const weekEndDate = getWeekEndDate(weekStartDate);

    const [weeklyPlan, activeTasks, completionRows] = await Promise.all([
      WeeklyPlan.findOne({ userId, weekStartDate }).lean(),
      Task.find({ userId, isActive: true }).select('_id title pausedUntil reminder').lean(),
      TaskCompletion.find({
        userId,
        date: { $gte: weekStartDate, $lte: weekEndDate },
        completed: true
      }).select('taskId date completed -_id').lean()
    ]);

    const completionMap = completionRows.reduce((acc, row) => {
      const key = String(row.taskId);
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    }, {});

    const totalCompletions = completionRows.length;
    const activeTaskCount = activeTasks.length;
    const completionRate = activeTaskCount > 0
      ? Math.round((totalCompletions / (activeTaskCount * 7)) * 100)
      : 0;

    const recommendations = activeTasks
      .map((task) => ({
        taskId: task._id,
        title: task.title,
        completions: completionMap[String(task._id)] || 0
      }))
      .sort((a, b) => a.completions - b.completions)
      .slice(0, 3)
      .map((entry) => ({
        taskId: entry.taskId,
        title: entry.title,
        note: entry.completions === 0
          ? 'Try a 2-minute fallback version this week.'
          : 'Schedule this habit earlier to protect consistency.'
      }));

    res.json({
      success: true,
      data: {
        weekStartDate,
        weekEndDate,
        plan: weeklyPlan || null,
        summary: {
          totalCompletions,
          activeTaskCount,
          completionRate
        },
        recommendations
      }
    });
  } catch (error) {
    logger.error('Get weekly plan error', {
      userId: String(req.user._id),
      error: error.message,
      stack: error.stack
    });

    res.status(500).json({
      success: false,
      message: 'Server error fetching weekly plan.'
    });
  }
};

// @desc    Save or update weekly plan
// @route   PUT /api/analytics/weekly-plan
// @access  Private
const saveWeeklyPlan = async (req, res) => {
  try {
    const userId = req.user._id;
    const {
      weekStartDate,
      focus = '',
      priorities = [],
      notes = '',
      reflection = ''
    } = req.body;

    const normalizedWeekStart = getWeekStartDate(weekStartDate);

    if (priorities.length > 0) {
      const ownedTasks = await Task.countDocuments({
        userId,
        _id: { $in: priorities }
      });

      if (ownedTasks !== priorities.length) {
        return res.status(403).json({
          success: false,
          message: 'Some priority tasks do not belong to this user.'
        });
      }
    }

    const updatedPlan = await WeeklyPlan.findOneAndUpdate(
      { userId, weekStartDate: normalizedWeekStart },
      {
        $set: {
          focus,
          priorities,
          notes,
          reflection,
          updatedAt: new Date()
        },
        $setOnInsert: {
          userId,
          weekStartDate: normalizedWeekStart,
          createdAt: new Date()
        }
      },
      {
        upsert: true,
        new: true
      }
    ).lean();

    logger.audit('weekly_plan_saved', {
      userId: String(userId),
      weekStartDate: normalizedWeekStart,
      prioritiesCount: priorities.length
    });

    res.json({
      success: true,
      message: 'Weekly plan saved successfully.',
      data: {
        plan: updatedPlan
      }
    });
  } catch (error) {
    logger.error('Save weekly plan error', {
      userId: String(req.user._id),
      error: error.message,
      stack: error.stack
    });

    res.status(500).json({
      success: false,
      message: 'Server error saving weekly plan.'
    });
  }
};

module.exports = {
  getDailyProgress,
  getTaskHeatmap,
  getStats,
  getWeeklyPlan,
  saveWeeklyPlan
};
