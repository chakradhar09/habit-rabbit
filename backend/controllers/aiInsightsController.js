const { GoogleGenerativeAI } = require('@google/generative-ai');
const Task = require('../models/Task');
const TaskCompletion = require('../models/TaskCompletion');
const logger = require('../utils/logger');

// Initialize Gemini AI
const getGenAI = () => {
  if (!process.env.GEMINI_API_KEY || process.env.GEMINI_API_KEY === 'your_gemini_api_key_here') {
    return null;
  }
  return new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
};

// Helper: Get date N days ago in YYYY-MM-DD format
const getDateDaysAgo = (days) => {
  const date = new Date();
  date.setDate(date.getDate() - days);
  return date.toISOString().split('T')[0];
};

// Helper: Calculate completion metrics for each task
const calculateTaskMetrics = (tasks, completions) => {
  const metrics = [];
  const today = new Date().toISOString().split('T')[0];
  
  for (const task of tasks) {
    const taskCompletions = completions.filter(c => c.taskId.toString() === task._id.toString());
    
    // Calculate completion rate (last 30 days)
    const totalDays = 30;
    const completedDays = taskCompletions.filter(c => c.completed).length;
    const completionRate = Math.round((completedDays / totalDays) * 100);
    
    // Calculate current streak
    let streak = 0;
    const dateMap = new Map();
    taskCompletions.forEach(c => {
      dateMap.set(c.date, c.completed);
    });
    
    const checkDate = new Date();
    while (true) {
      const dateStr = checkDate.toISOString().split('T')[0];
      if (dateMap.get(dateStr)) {
        streak++;
        checkDate.setDate(checkDate.getDate() - 1);
      } else {
        break;
      }
    }
    
    // Find last completed date
    const completedDates = taskCompletions
      .filter(c => c.completed)
      .map(c => c.date)
      .sort()
      .reverse();
    
    const lastCompleted = completedDates[0] || null;
    const daysSinceLastCompleted = lastCompleted 
      ? Math.floor((new Date(today) - new Date(lastCompleted)) / (1000 * 60 * 60 * 24))
      : null;
    
    metrics.push({
      taskId: task._id.toString(),
      title: task.title,
      completionRate,
      currentStreak: streak,
      lastCompleted,
      daysSinceLastCompleted,
      totalCompletions: completedDays
    });
  }
  
  return metrics;
};

const normalizeInsights = (insights, taskMetrics) => {
  const taskMetricMap = new Map(taskMetrics.map((metric) => [metric.taskId, metric]));

  const normalizedPriorities = Array.isArray(insights.taskPriorities)
    ? insights.taskPriorities
        .filter((item) => item && typeof item === 'object' && taskMetricMap.has(item.taskId))
        .map((item) => ({
          taskId: item.taskId,
          priority: ['high', 'medium', 'low'].includes(item.priority) ? item.priority : 'medium',
          reason: typeof item.reason === 'string' && item.reason.trim()
            ? item.reason.trim()
            : 'Based on your completion pattern.'
        }))
    : [];

  const normalizedSkips = Array.isArray(insights.skipSuggestions)
    ? insights.skipSuggestions
        .filter((item) => item && typeof item === 'object' && taskMetricMap.has(item.taskId))
        .map((item) => ({
          taskId: item.taskId,
          reason: typeof item.reason === 'string' && item.reason.trim()
            ? item.reason.trim()
            : 'Pause this during high-load days.',
          days: Number(item.days) > 0 ? Math.min(14, Number(item.days)) : 3
        }))
    : [];

  const normalizedFallbacks = Array.isArray(insights.replacementSuggestions)
    ? insights.replacementSuggestions
        .filter((item) => item && typeof item === 'object' && taskMetricMap.has(item.taskId))
        .map((item) => {
          const metric = taskMetricMap.get(item.taskId);
          return {
            taskId: item.taskId,
            currentHabit: metric.title,
            suggestion: typeof item.suggestion === 'string' && item.suggestion.trim()
              ? item.suggestion.trim().slice(0, 100)
              : `2-minute ${metric.title.toLowerCase()}`,
            reason: typeof item.reason === 'string' && item.reason.trim()
              ? item.reason.trim()
              : 'Lower-friction fallback can preserve consistency.'
          };
        })
    : [];

  const fallbackPriorities = normalizedPriorities.length > 0
    ? normalizedPriorities
    : taskMetrics
        .map((metric) => ({
          taskId: metric.taskId,
          priority: metric.completionRate >= 70 ? 'high' : metric.completionRate >= 40 ? 'medium' : 'low',
          reason: 'Auto-prioritized from completion rate.'
        }))
        .sort((a, b) => {
          const priorityOrder = { high: 0, medium: 1, low: 2 };
          return priorityOrder[a.priority] - priorityOrder[b.priority];
        });

  const fallbackSkips = normalizedSkips.length > 0
    ? normalizedSkips
    : taskMetrics
        .filter((metric) => metric.completionRate < 35 && metric.currentStreak < 2)
        .slice(0, 3)
        .map((metric) => ({
          taskId: metric.taskId,
          reason: 'Temporarily pause and focus on higher-leverage habits.',
          days: 3
        }));

  const fallbackReplacements = normalizedFallbacks.length > 0
    ? normalizedFallbacks
    : taskMetrics
        .filter((metric) => metric.completionRate < 30)
        .slice(0, 3)
        .map((metric) => ({
          taskId: metric.taskId,
          currentHabit: metric.title,
          suggestion: `2-minute ${metric.title.toLowerCase()}`,
          reason: 'Reduce friction while keeping the streak alive.'
        }));

  return {
    summary: typeof insights.summary === 'string' && insights.summary.trim()
      ? insights.summary.trim()
      : 'Focus on one high-impact habit first, then stack easier wins.',
    taskPriorities: fallbackPriorities,
    skipSuggestions: fallbackSkips,
    replacementSuggestions: fallbackReplacements,
    generalTips: Array.isArray(insights.generalTips) && insights.generalTips.length > 0
      ? insights.generalTips
      : ['Anchor your first habit to a fixed cue.', 'Use low-friction fallback habits on busy days.']
  };
};

// @desc    Get AI-powered insights and suggestions
// @route   POST /api/analytics/ai-insights
// @access  Private
const getAIInsights = async (req, res) => {
  try {
    const genAI = getGenAI();
    
    if (!genAI) {
      logger.warn('AI insights unavailable due to missing GEMINI_API_KEY');
      return res.status(503).json({
        success: false,
        message: 'AI service not configured. Please add GEMINI_API_KEY to .env file.'
      });
    }
    
    const { context } = req.body; // User's situation (e.g., "I have exams next week")
    const userId = req.user._id;

    logger.audit('ai_insights_requested', {
      userId: String(userId),
      contextLength: context ? context.length : 0
    });
    
    // Get user's active tasks
    const tasks = await Task.find({ userId, isActive: true }).sort({ sortOrder: 1, createdAt: -1 });
    
    if (tasks.length === 0) {
      return res.json({
        success: true,
        data: {
          insights: {
            summary: "You haven't added any habits yet! Start by adding a few habits you'd like to track daily.",
            taskPriorities: [],
            skipSuggestions: [],
            replacementSuggestions: [],
            generalTips: ["Start with 2-3 small habits to build momentum", "Choose habits that take less than 5 minutes initially"]
          }
        }
      });
    }
    
    // Get last 30 days of completions
    const startDate = getDateDaysAgo(30);
    const completions = await TaskCompletion.find({
      userId,
      date: { $gte: startDate }
    });
    
    // Calculate metrics for each task
    const taskMetrics = calculateTaskMetrics(tasks, completions);
    
    // Build prompt for Gemini
    const prompt = buildGeminiPrompt(taskMetrics, context);
    
    // Call Gemini API
    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
    
    const result = await model.generateContent({
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      generationConfig: {
        temperature: 0.7,
        maxOutputTokens: 1500,
        responseMimeType: 'application/json'
      }
    });
    
    const responseText = result.response.text();
    
    // Parse AI response
    let insights;
    try {
      insights = JSON.parse(responseText);
    } catch (parseError) {
      // If JSON parsing fails, extract useful content
      logger.warn('Failed to parse AI response as JSON', {
        userId: String(userId),
        error: parseError.message
      });

      insights = {
        summary: responseText.slice(0, 500),
        taskPriorities: taskMetrics.map((t, i) => ({
          taskId: t.taskId,
          priority: i < 3 ? 'high' : i < 6 ? 'medium' : 'low',
          reason: 'Based on your completion history'
        })),
        skipSuggestions: [],
        replacementSuggestions: [],
        generalTips: []
      };
    }
    
    insights = normalizeInsights(insights, taskMetrics);
    
    res.json({
      success: true,
      data: {
        insights,
        taskMetrics // Include raw metrics for frontend display
      }
    });

    logger.audit('ai_insights_generated', {
      userId: String(userId),
      taskCount: tasks.length,
      insightsGenerated: Boolean(insights)
    });
    
  } catch (error) {
    logger.error('AI Insights error', {
      userId: req.user ? String(req.user._id) : undefined,
      error: error.message,
      stack: error.stack
    });
    
    // Handle specific Gemini API errors
    if (error.message?.includes('API key')) {
      return res.status(401).json({
        success: false,
        message: 'Invalid Gemini API key. Please check your .env configuration.'
      });
    }
    
    if (error.message?.includes('quota') || error.message?.includes('rate')) {
      return res.status(429).json({
        success: false,
        message: 'AI service rate limit reached. Please try again later.'
      });
    }
    
    res.status(500).json({
      success: false, 
      message: 'Failed to generate AI insights. Please try again.'
    });
  }
};

// Build the prompt for Gemini
function buildGeminiPrompt(taskMetrics, userContext) {
  const taskData = taskMetrics.map(t => 
    `- "${t.title}": ${t.completionRate}% completion rate, ${t.currentStreak} day streak, ` +
    `${t.daysSinceLastCompleted !== null ? `last done ${t.daysSinceLastCompleted} days ago` : 'never completed'}`
  ).join('\n');
  
  const contextSection = userContext 
    ? `\n\nUSER'S CURRENT SITUATION:\n"${userContext}"\n`
    : '';
  
  return `You are an AI habit coach helping a user optimize their daily habits. Analyze the following habit data and provide actionable insights.

HABIT DATA (Last 30 Days):
${taskData}
${contextSection}
Based on this data, provide a JSON response with the following structure:
{
  "summary": "A brief 2-3 sentence overview of the user's habit patterns",
  "taskPriorities": [
    {
      "taskId": "the exact taskId from the data",
      "priority": "high" | "medium" | "low",
      "reason": "Brief explanation why this priority"
    }
  ],
  "skipSuggestions": [
    {
      "taskId": "taskId that could be skipped",
      "reason": "Why this can be temporarily paused during busy times"
    }
  ],
  "replacementSuggestions": [
    {
      "taskId": "taskId with very low engagement",
      "currentHabit": "The habit name",
      "suggestion": "Alternative habit or modification to try",
      "reason": "Why this change might work better"
    }
  ],
  "generalTips": ["Tip 1", "Tip 2", "Tip 3"]
}

IMPORTANT GUIDELINES:
1. For taskPriorities: Assign based on BOTH completion rate and apparent importance. High-streak habits are working well and should stay high priority.
2. For skipSuggestions: Only suggest skipping habits that have low impact or can be paused without breaking momentum. ${userContext ? 'Consider the user\'s situation: "' + userContext + '"' : 'No specific busy period mentioned.'}
3. For replacementSuggestions: Only suggest for habits with <30% completion rate. The user might be struggling with these.
4. Keep all reasons concise (under 20 words).
5. Use the EXACT taskId strings provided in the data - they are MongoDB ObjectIds.

Here are the taskIds for reference:
${taskMetrics.map(t => `"${t.taskId}": "${t.title}"`).join('\n')}

Respond ONLY with valid JSON, no markdown formatting or code blocks.`;
}

module.exports = {
  getAIInsights
};
