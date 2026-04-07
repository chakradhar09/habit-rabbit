const mongoose = require('mongoose');

const taskSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  title: {
    type: String,
    required: [true, 'Task title is required'],
    trim: true,
    maxlength: [100, 'Title cannot exceed 100 characters']
  },
  isActive: {
    type: Boolean,
    default: true
  },
  priority: {
    type: String,
    enum: ['high', 'medium', 'low'],
    default: 'medium'
  },
  sortOrder: {
    type: Number,
    default: 0
  },
  reminder: {
    enabled: {
      type: Boolean,
      default: false
    },
    time: {
      type: String,
      default: '08:00',
      match: [/^([01]\d|2[0-3]):([0-5]\d)$/, 'Reminder time must be HH:mm']
    }
  },
  pausedUntil: {
    type: String,
    default: null
  },
  pauseReason: {
    type: String,
    default: null,
    maxlength: [160, 'Pause reason cannot exceed 160 characters']
  },
  fallbackFromTitle: {
    type: String,
    default: null,
    maxlength: [100, 'Fallback source title cannot exceed 100 characters']
  },
  fallbackAppliedAt: {
    type: Date,
    default: null
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Compound index for user's active tasks with sort order
taskSchema.index({ userId: 1, isActive: 1, sortOrder: 1 });

const Task = mongoose.model('Task', taskSchema);

module.exports = Task;
