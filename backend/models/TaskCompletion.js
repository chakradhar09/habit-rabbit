const mongoose = require('mongoose');

const taskCompletionSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  taskId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Task',
    required: true
  },
  date: {
    type: String, // YYYY-MM-DD format for easy querying
    required: true
  },
  completed: {
    type: Boolean,
    default: true
  }
});

// Unique constraint: One completion record per user per task per day
taskCompletionSchema.index({ userId: 1, taskId: 1, date: 1 }, { unique: true });

// Index for fetching all completions for a task (heatmap)
taskCompletionSchema.index({ taskId: 1, date: 1 });

// Index for daily progress analytics
taskCompletionSchema.index({ userId: 1, date: 1 });

const TaskCompletion = mongoose.model('TaskCompletion', taskCompletionSchema);

module.exports = TaskCompletion;
