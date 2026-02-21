/**
 * Seed Data Script — Habit Rabbit
 * 
 * Creates a demo user with sample habits and 90 days of realistic completion history.
 * 
 * Usage:
 *   node backend/utils/seedData.js
 * 
 * Environment:
 *   Reads MONGODB_URI from .env (defaults to mongodb://localhost:27017/habit-rabbit)
 */

require('dotenv').config({ path: require('path').join(__dirname, '../../.env') });
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('../models/User');
const Task = require('../models/Task');
const TaskCompletion = require('../models/TaskCompletion');

const DEMO_USER = {
  email: 'demo@habitrabbit.app',
  password: 'demo1234'
};

const DEMO_HABITS = [
  { title: 'Exercise for 30 mins', completionRate: 0.82 },
  { title: 'Read 20 pages', completionRate: 0.70 },
  { title: 'Drink 8 glasses of water', completionRate: 0.90 },
  { title: 'Meditate for 10 mins', completionRate: 0.60 },
  { title: 'No social media before noon', completionRate: 0.55 },
  { title: 'Journal before bed', completionRate: 0.65 }
];

const HISTORY_DAYS = 90;

function getDateStr(daysAgo) {
  const d = new Date();
  d.setDate(d.getDate() - daysAgo);
  return d.toISOString().split('T')[0];
}

async function seed() {
  const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/habit-rabbit';
  console.log(`\n🌱 Connecting to ${uri}...\n`);

  await mongoose.connect(uri);

  // Clean existing demo data
  const existingUser = await User.findOne({ email: DEMO_USER.email });
  if (existingUser) {
    await TaskCompletion.deleteMany({ userId: existingUser._id });
    await Task.deleteMany({ userId: existingUser._id });
    await User.deleteOne({ _id: existingUser._id });
    console.log('🗑️  Removed existing demo data.');
  }

  // Create demo user
  const salt = await bcrypt.genSalt(10);
  const passwordHash = await bcrypt.hash(DEMO_USER.password, salt);
  const user = await User.create({ email: DEMO_USER.email, passwordHash });
  console.log(`👤 Demo user: ${DEMO_USER.email} / ${DEMO_USER.password}`);

  // Create habits
  const tasks = [];
  for (const habit of DEMO_HABITS) {
    const task = await Task.create({ userId: user._id, title: habit.title });
    tasks.push({ ...habit, _id: task._id });
  }
  console.log(`✅ Created ${tasks.length} habits.`);

  // Generate completion history
  const completions = [];
  for (const task of tasks) {
    for (let i = HISTORY_DAYS - 1; i >= 0; i--) {
      const dateStr = getDateStr(i);
      // Weighted random: higher completion rate for recent days (simulates improvement)
      const recencyBoost = (HISTORY_DAYS - i) / HISTORY_DAYS * 0.1;
      const chance = Math.min(task.completionRate + recencyBoost, 0.97);
      const completed = Math.random() < chance;

      completions.push({
        userId: user._id,
        taskId: task._id,
        date: dateStr,
        completed
      });
    }
  }

  // Bulk insert completions
  await TaskCompletion.insertMany(completions);
  const completedCount = completions.filter(c => c.completed).length;
  console.log(`📊 Generated ${completions.length} records (${completedCount} completions, ${completions.length - completedCount} misses).`);

  console.log('\n🐰 Seed complete! Start the server and log in with the demo credentials.\n');
  await mongoose.disconnect();
  process.exit(0);
}

seed().catch(err => {
  console.error('❌ Seed failed:', err.message);
  process.exit(1);
});
