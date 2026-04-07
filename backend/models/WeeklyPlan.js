const mongoose = require('mongoose');

const weeklyPlanSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  weekStartDate: {
    type: String,
    required: true,
    match: [/^\d{4}-\d{2}-\d{2}$/, 'weekStartDate must be YYYY-MM-DD']
  },
  focus: {
    type: String,
    default: '',
    trim: true,
    maxlength: [240, 'Focus cannot exceed 240 characters']
  },
  priorities: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Task'
  }],
  notes: {
    type: String,
    default: '',
    trim: true,
    maxlength: [800, 'Notes cannot exceed 800 characters']
  },
  reflection: {
    type: String,
    default: '',
    trim: true,
    maxlength: [800, 'Reflection cannot exceed 800 characters']
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

weeklyPlanSchema.index({ userId: 1, weekStartDate: 1 }, { unique: true });

weeklyPlanSchema.pre('save', function updateTimestamp(next) {
  this.updatedAt = new Date();
  next();
});

const WeeklyPlan = mongoose.model('WeeklyPlan', weeklyPlanSchema);

module.exports = WeeklyPlan;
