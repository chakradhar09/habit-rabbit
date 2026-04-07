const mongoose = require('mongoose');

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PASSWORD_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,72}$/;

const badRequest = (res, message, details) =>
  res.status(400).json({
    success: false,
    message,
    ...(details ? { details } : {})
  });

const normalizeEmail = (email) => (typeof email === 'string' ? email.trim().toLowerCase() : '');

const validateRegisterPayload = (req, res, next) => {
  const email = normalizeEmail(req.body.email);
  const password = typeof req.body.password === 'string' ? req.body.password : '';

  if (!email || !password) {
    return badRequest(res, 'Please provide email and password.');
  }

  if (!EMAIL_REGEX.test(email)) {
    return badRequest(res, 'Please provide a valid email address.');
  }

  if (!PASSWORD_REGEX.test(password)) {
    return badRequest(
      res,
      'Password must be 8-72 characters and include at least one uppercase letter, one lowercase letter, and one number.'
    );
  }

  req.body.email = email;
  req.body.password = password;
  return next();
};

const validateLoginPayload = (req, res, next) => {
  const email = normalizeEmail(req.body.email);
  const password = typeof req.body.password === 'string' ? req.body.password : '';

  if (!email || !password) {
    return badRequest(res, 'Please provide email and password.');
  }

  if (!EMAIL_REGEX.test(email)) {
    return badRequest(res, 'Please provide a valid email address.');
  }

  req.body.email = email;
  req.body.password = password;
  return next();
};

const validateTaskCreatePayload = (req, res, next) => {
  const title = typeof req.body.title === 'string' ? req.body.title.trim() : '';

  if (!title) {
    return badRequest(res, 'Task title is required.');
  }

  if (title.length > 100) {
    return badRequest(res, 'Task title cannot exceed 100 characters.');
  }

  req.body.title = title;
  return next();
};

const validateTaskOrderPayload = (req, res, next) => {
  const { taskOrders } = req.body;

  if (!Array.isArray(taskOrders) || taskOrders.length === 0) {
    return badRequest(res, 'taskOrders array is required.');
  }

  for (const item of taskOrders) {
    const hasObjectShape = item && typeof item === 'object';
    if (!hasObjectShape) {
      return badRequest(res, 'Each task order item must be an object.');
    }

    if (!mongoose.Types.ObjectId.isValid(item.taskId)) {
      return badRequest(res, `Invalid taskId: ${item.taskId}`);
    }

    if (!Number.isInteger(item.sortOrder) || item.sortOrder < 0) {
      return badRequest(res, `Invalid sortOrder for taskId: ${item.taskId}`);
    }
  }

  req.body.taskOrders = taskOrders.map(({ taskId, sortOrder }) => ({
    taskId: String(taskId),
    sortOrder
  }));

  return next();
};

const validateApplyPrioritiesPayload = (req, res, next) => {
  const { priorities } = req.body;
  const validPriorities = new Set(['high', 'medium', 'low']);

  if (!Array.isArray(priorities) || priorities.length === 0) {
    return badRequest(res, 'priorities array is required.');
  }

  for (const item of priorities) {
    const hasObjectShape = item && typeof item === 'object';
    if (!hasObjectShape) {
      return badRequest(res, 'Each priority item must be an object.');
    }

    if (!mongoose.Types.ObjectId.isValid(item.taskId)) {
      return badRequest(res, `Invalid taskId: ${item.taskId}`);
    }

    if (!validPriorities.has(item.priority)) {
      return badRequest(res, `Invalid priority value for taskId: ${item.taskId}`);
    }
  }

  req.body.priorities = priorities.map(({ taskId, priority }) => ({
    taskId: String(taskId),
    priority
  }));

  return next();
};

const validateOnboardingSetupPayload = (req, res, next) => {
  const { packId, customHabits } = req.body;

  if (packId !== undefined && (typeof packId !== 'string' || !packId.trim())) {
    return badRequest(res, 'packId must be a non-empty string.');
  }

  if (customHabits !== undefined) {
    if (!Array.isArray(customHabits)) {
      return badRequest(res, 'customHabits must be an array of strings.');
    }

    const invalidHabit = customHabits.find((habit) => typeof habit !== 'string' || !habit.trim() || habit.trim().length > 100);
    if (invalidHabit !== undefined) {
      return badRequest(res, 'Each custom habit must be a non-empty string up to 100 characters.');
    }
  }

  req.body.packId = typeof packId === 'string' ? packId.trim() : undefined;
  req.body.customHabits = Array.isArray(customHabits)
    ? customHabits.map((habit) => habit.trim()).filter(Boolean)
    : [];

  return next();
};

const validateApplySkipsPayload = (req, res, next) => {
  const { skips } = req.body;

  if (!Array.isArray(skips) || skips.length === 0) {
    return badRequest(res, 'skips array is required.');
  }

  for (const item of skips) {
    if (!item || typeof item !== 'object') {
      return badRequest(res, 'Each skip item must be an object.');
    }

    if (!mongoose.Types.ObjectId.isValid(item.taskId)) {
      return badRequest(res, `Invalid taskId: ${item.taskId}`);
    }

    if (item.days !== undefined && (!Number.isInteger(item.days) || item.days < 1 || item.days > 14)) {
      return badRequest(res, 'days must be an integer between 1 and 14.');
    }

    if (item.reason !== undefined && (typeof item.reason !== 'string' || item.reason.trim().length > 160)) {
      return badRequest(res, 'reason must be a string up to 160 characters.');
    }
  }

  req.body.skips = skips.map((item) => ({
    taskId: String(item.taskId),
    days: Number.isInteger(item.days) ? item.days : 3,
    reason: typeof item.reason === 'string' ? item.reason.trim() : ''
  }));

  return next();
};

const validateApplyFallbacksPayload = (req, res, next) => {
  const { fallbacks } = req.body;

  if (!Array.isArray(fallbacks) || fallbacks.length === 0) {
    return badRequest(res, 'fallbacks array is required.');
  }

  for (const item of fallbacks) {
    if (!item || typeof item !== 'object') {
      return badRequest(res, 'Each fallback item must be an object.');
    }

    if (!mongoose.Types.ObjectId.isValid(item.taskId)) {
      return badRequest(res, `Invalid taskId: ${item.taskId}`);
    }

    if (typeof item.suggestion !== 'string' || !item.suggestion.trim() || item.suggestion.trim().length > 100) {
      return badRequest(res, 'Each fallback suggestion must be a non-empty string up to 100 characters.');
    }
  }

  req.body.fallbacks = fallbacks.map((item) => ({
    taskId: String(item.taskId),
    suggestion: item.suggestion.trim()
  }));

  return next();
};

const validateTaskReminderPayload = (req, res, next) => {
  const { enabled, time } = req.body;

  if (typeof enabled !== 'boolean') {
    return badRequest(res, 'enabled must be a boolean.');
  }

  if (typeof time !== 'string' || !/^([01]\d|2[0-3]):([0-5]\d)$/.test(time)) {
    return badRequest(res, 'time must be in HH:mm format.');
  }

  req.body.enabled = enabled;
  req.body.time = time;
  return next();
};

const validateWeeklyPlanPayload = (req, res, next) => {
  const {
    weekStartDate,
    focus = '',
    priorities = [],
    notes = '',
    reflection = ''
  } = req.body;

  if (weekStartDate !== undefined && (typeof weekStartDate !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(weekStartDate))) {
    return badRequest(res, 'weekStartDate must be YYYY-MM-DD.');
  }

  if (typeof focus !== 'string' || focus.trim().length > 240) {
    return badRequest(res, 'focus must be a string up to 240 characters.');
  }

  if (!Array.isArray(priorities)) {
    return badRequest(res, 'priorities must be an array of task IDs.');
  }

  if (priorities.length > 10) {
    return badRequest(res, 'priorities cannot exceed 10 tasks.');
  }

  const invalidPriority = priorities.find((taskId) => !mongoose.Types.ObjectId.isValid(taskId));
  if (invalidPriority) {
    return badRequest(res, `Invalid priority taskId: ${invalidPriority}`);
  }

  if (typeof notes !== 'string' || notes.trim().length > 800) {
    return badRequest(res, 'notes must be a string up to 800 characters.');
  }

  if (typeof reflection !== 'string' || reflection.trim().length > 800) {
    return badRequest(res, 'reflection must be a string up to 800 characters.');
  }

  req.body.weekStartDate = typeof weekStartDate === 'string' ? weekStartDate : undefined;
  req.body.focus = focus.trim();
  req.body.priorities = priorities.map((taskId) => String(taskId));
  req.body.notes = notes.trim();
  req.body.reflection = reflection.trim();
  return next();
};

const validateAIInsightsPayload = (req, res, next) => {
  let { context } = req.body;

  if (context === undefined || context === null) {
    context = '';
  }

  if (typeof context !== 'string') {
    return badRequest(res, 'Context must be a string.');
  }

  const normalized = context.trim();
  if (normalized.length > 500) {
    return badRequest(res, 'Context cannot exceed 500 characters.');
  }

  req.body.context = normalized;
  return next();
};

const validateObjectIdParam = (paramName) => (req, res, next) => {
  const value = req.params[paramName];
  if (!mongoose.Types.ObjectId.isValid(value)) {
    return badRequest(res, `Invalid ${paramName}.`);
  }

  return next();
};

module.exports = {
  validateRegisterPayload,
  validateLoginPayload,
  validateTaskCreatePayload,
  validateTaskOrderPayload,
  validateApplyPrioritiesPayload,
  validateOnboardingSetupPayload,
  validateApplySkipsPayload,
  validateApplyFallbacksPayload,
  validateTaskReminderPayload,
  validateWeeklyPlanPayload,
  validateAIInsightsPayload,
  validateObjectIdParam,
  PASSWORD_REGEX
};
