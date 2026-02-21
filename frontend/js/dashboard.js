// Dashboard Logic

// State
let tasks = [];
let progressChart = null;
let selectedHeatmapTask = null;
let deleteTaskId = null;
let currentChartType = 'line';
let currentRange = '7d';

// DOM Elements
const loadingScreen = document.getElementById('loading-screen');
const app = document.getElementById('app');
const taskList = document.getElementById('task-list');
const emptyState = document.getElementById('empty-state');
const addTaskForm = document.getElementById('add-task-form');
const newTaskInput = document.getElementById('new-task-input');
const progressFill = document.getElementById('progress-fill');
const progressText = document.getElementById('progress-text');
const statToday = document.getElementById('stat-today');
const statStreak = document.getElementById('stat-streak');
const statTotal = document.getElementById('stat-total');
const analyticsSection = document.getElementById('analytics-section');
const toggleAnalyticsBtn = document.getElementById('toggle-analytics-btn');
const logoutBtn = document.getElementById('logout-btn');
const deleteModal = document.getElementById('delete-modal');
const deleteTaskTitle = document.getElementById('delete-task-title');
const toastContainer = document.getElementById('toast-container');
const taskSkeleton = document.getElementById('task-skeleton');

// Initialize
document.addEventListener('DOMContentLoaded', async () => {
  // Check authentication
  if (!API.auth.isAuthenticated()) {
    window.location.href = 'index.html';
    return;
  }

  try {
    // Load initial data
    await Promise.all([
      loadTodaysTasks(),
      loadStats()
    ]);

    // Show app
    loadingScreen.classList.add('hidden');
    app.classList.remove('hidden');
  } catch (error) {
    showToast('Failed to load data. Please refresh.', 'error');
    loadingScreen.classList.add('hidden');
    app.classList.remove('hidden');
  }

  // Setup event listeners
  setupEventListeners();
});

// Event Listeners Setup
function setupEventListeners() {
  // Add task form
  addTaskForm.addEventListener('submit', handleAddTask);

  // Character counter
  newTaskInput.addEventListener('input', () => {
    const counter = document.getElementById('char-counter');
    const len = newTaskInput.value.length;
    counter.textContent = `${len}/100`;
    counter.classList.toggle('near-limit', len >= 80);
    counter.classList.toggle('at-limit', len >= 100);
  });

  // Logout
  logoutBtn.addEventListener('click', handleLogout);

  // Toggle analytics
  toggleAnalyticsBtn.addEventListener('click', toggleAnalytics);

  // Analytics tabs
  document.querySelectorAll('.analytics-tab').forEach(tab => {
    tab.addEventListener('click', (e) => handleRangeChange(e.target.dataset.range));
  });

  // Delete modal
  document.getElementById('delete-soft-btn').addEventListener('click', () => handleDelete(false));
  document.getElementById('delete-hard-btn').addEventListener('click', () => handleDelete(true));
  document.getElementById('delete-cancel-btn').addEventListener('click', closeDeleteModal);
  document.querySelector('.modal-backdrop').addEventListener('click', closeDeleteModal);

  // Chart type toggle
  document.querySelectorAll('.chart-type-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.chart-type-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      currentChartType = btn.dataset.type;
      loadProgressChart(currentRange);
    });
  });
}

// Load today's tasks
async function loadTodaysTasks() {
  try {
    const response = await API.tasks.getToday();
    if (response.success) {
      tasks = response.data.tasks;
      taskSkeleton.classList.add('hidden');
      taskList.classList.remove('hidden');
      renderTasks();
      updateProgress(response.data.progress);
    }
  } catch (error) {
    taskSkeleton.classList.add('hidden');
    taskList.classList.remove('hidden');
    throw error;
  }
}

// Load stats
async function loadStats() {
  try {
    const response = await API.analytics.getStats();
    if (response.success) {
      const { todayCompletions, totalTasks, currentStreak, totalCompletions } = response.data;
      const percentage = totalTasks > 0 ? Math.round((todayCompletions / totalTasks) * 100) : 0;
      
      statToday.textContent = percentage + '%';
      statStreak.textContent = currentStreak;
      statTotal.textContent = totalCompletions;
    }
  } catch (error) {
    console.error('Failed to load stats:', error);
  }
}

// Render tasks
function renderTasks() {
  if (tasks.length === 0) {
    taskList.innerHTML = '';
    emptyState.classList.remove('hidden');
    return;
  }

  emptyState.classList.add('hidden');
  taskList.innerHTML = tasks.map(task => createTaskHTML(task)).join('');

  // Add event listeners to task elements
  taskList.querySelectorAll('.task-card').forEach(card => {
    const taskId = card.dataset.taskId;
    
    // Checkbox click
    card.querySelector('.task-checkbox').addEventListener('click', () => toggleTaskComplete(taskId));
    
    // Delete button
    card.querySelector('.task-action-btn.delete').addEventListener('click', (e) => {
      e.stopPropagation();
      openDeleteModal(taskId);
    });
  });

  // Update heatmap selector if analytics is visible
  if (!analyticsSection.classList.contains('hidden')) {
    renderHeatmapSelector();
  }
}

// Create task HTML
function createTaskHTML(task) {
  return `
    <div class="task-card ${task.completed ? 'completed' : ''}" data-task-id="${task._id}">
      <button class="task-checkbox" aria-label="Toggle completion">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
          <polyline points="20 6 9 17 4 12"></polyline>
        </svg>
      </button>
      <div class="task-content">
        <span class="task-title">${escapeHtml(task.title)}</span>
      </div>
      <div class="task-actions">
        <button class="task-action-btn delete" aria-label="Delete task">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/>
          </svg>
        </button>
      </div>
    </div>
  `;
}

// Update progress display
function updateProgress(progress) {
  const { completed, total, percentage } = progress;
  progressFill.style.width = percentage + '%';
  progressText.textContent = `${completed}/${total} completed`;
  statToday.textContent = percentage + '%';
}

// Handle add task
async function handleAddTask(e) {
  e.preventDefault();
  
  const title = newTaskInput.value.trim();
  if (!title) return;

  try {
    const response = await API.tasks.create(title);
    if (response.success) {
      tasks.unshift(response.data.task);
      renderTasks();
      newTaskInput.value = '';
      
      // Update progress
      const total = tasks.length;
      const completed = tasks.filter(t => t.completed).length;
      const percentage = total > 0 ? Math.round((completed / total) * 100) : 0;
      updateProgress({ completed, total, percentage });
      
      showToast('Habit added!', 'success');
    }
  } catch (error) {
    showToast(error.message, 'error');
  }
}

// Toggle task completion
async function toggleTaskComplete(taskId) {
  const task = tasks.find(t => t._id === taskId);
  if (!task) return;

  // Optimistic update
  const taskCard = document.querySelector(`[data-task-id="${taskId}"]`);
  const wasCompleted = task.completed;
  task.completed = !task.completed;
  taskCard.classList.toggle('completed');

  try {
    const response = await API.tasks.toggleComplete(taskId);
    if (response.success) {
      // Update progress
      const total = tasks.length;
      const completed = tasks.filter(t => t.completed).length;
      const percentage = total > 0 ? Math.round((completed / total) * 100) : 0;
      updateProgress({ completed, total, percentage });
      
      // Refresh stats
      loadStats();
    }
  } catch (error) {
    // Revert on error
    task.completed = wasCompleted;
    taskCard.classList.toggle('completed');
    showToast(error.message, 'error');
  }
}

// Open delete modal
function openDeleteModal(taskId) {
  deleteTaskId = taskId;
  const task = tasks.find(t => t._id === taskId);
  if (task) {
    deleteTaskTitle.textContent = task.title;
    deleteModal.classList.remove('hidden');
  }
}

// Close delete modal
function closeDeleteModal() {
  deleteModal.classList.add('hidden');
  deleteTaskId = null;
}

// Handle delete
async function handleDelete(deleteHistory) {
  if (!deleteTaskId) return;

  try {
    const response = await API.tasks.delete(deleteTaskId, deleteHistory);
    if (response.success) {
      tasks = tasks.filter(t => t._id !== deleteTaskId);
      renderTasks();
      closeDeleteModal();
      
      // Update progress
      const total = tasks.length;
      const completed = tasks.filter(t => t.completed).length;
      const percentage = total > 0 ? Math.round((completed / total) * 100) : 0;
      updateProgress({ completed, total, percentage });
      
      showToast('Habit deleted', 'success');
      loadStats();
    }
  } catch (error) {
    showToast(error.message, 'error');
  }
}

// Toggle analytics section
function toggleAnalytics() {
  const isHidden = analyticsSection.classList.contains('hidden');
  
  if (isHidden) {
    analyticsSection.classList.remove('hidden');
    toggleAnalyticsBtn.querySelector('.btn-icon').innerHTML = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/></svg>';
    loadProgressChart('7d');
    renderHeatmapSelector();
  } else {
    analyticsSection.classList.add('hidden');
    toggleAnalyticsBtn.querySelector('.btn-icon').innerHTML = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>';
  }
}

// Handle range change
function handleRangeChange(range) {
  currentRange = range;
  document.querySelectorAll('.analytics-tab').forEach(tab => {
    tab.classList.toggle('active', tab.dataset.range === range);
  });
  loadProgressChart(range);
}

// Load progress chart
async function loadProgressChart(range) {
  try {
    const response = await API.analytics.getProgress(range);
    if (response.success) {
      renderProgressChart(response.data.progress);
    }
  } catch (error) {
    console.error('Failed to load progress:', error);
  }
}

// Render progress chart
function renderProgressChart(data) {
  const canvas = document.getElementById('progress-chart');
  const emptyState = document.getElementById('chart-empty-state');
  const ctx = canvas.getContext('2d');
  
  // Check for empty data
  const hasData = data.some(d => d.completed > 0);
  if (!hasData) {
    canvas.style.display = 'none';
    emptyState.classList.remove('hidden');
    if (progressChart) { progressChart.destroy(); progressChart = null; }
    return;
  }
  canvas.style.display = 'block';
  emptyState.classList.add('hidden');

  // Destroy existing chart
  if (progressChart) {
    progressChart.destroy();
  }

  const isBar = currentChartType === 'bar';

  progressChart = new Chart(ctx, {
    type: isBar ? 'bar' : 'line',
    data: {
      labels: data.map(d => formatDate(d.date)),
      datasets: [{
        label: 'Completion %',
        data: data.map(d => d.percentage),
        borderColor: '#4F46E5',
        backgroundColor: isBar 
          ? data.map(d => d.percentage >= 80 ? 'rgba(34, 197, 94, 0.65)' 
                        : d.percentage >= 40 ? 'rgba(79, 70, 229, 0.50)' 
                        : 'rgba(245, 166, 35, 0.50)')
          : 'rgba(79, 70, 229, 0.08)',
        fill: !isBar,
        tension: 0.4,
        pointBackgroundColor: '#4F46E5',
        pointBorderColor: '#4F46E5',
        pointRadius: isBar ? 0 : 4,
        pointHoverRadius: isBar ? 0 : 6,
        borderRadius: isBar ? 6 : 0,
        borderWidth: isBar ? 0 : 2,
        maxBarThickness: 28
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      animation: {
        duration: 600,
        easing: 'easeOutQuart'
      },
      plugins: {
        legend: {
          display: false
        },
        tooltip: {
          backgroundColor: 'rgba(31, 41, 55, 0.95)',
          titleColor: '#FFFFFF',
          bodyColor: 'rgba(229, 231, 235, 0.8)',
          borderColor: 'rgba(229, 231, 235, 0.15)',
          borderWidth: 1,
          padding: 12,
          cornerRadius: 8,
          displayColors: false,
          callbacks: {
            label: (context) => `${context.raw}% completed`
          }
        }
      },
      scales: {
        x: {
          grid: {
            color: 'rgba(0, 0, 0, 0.05)',
            display: !isBar
          },
          ticks: {
            color: '#9CA3AF',
            maxRotation: 45,
            maxTicksLimit: 15
          }
        },
        y: {
          beginAtZero: true,
          max: 100,
          grid: {
            color: 'rgba(0, 0, 0, 0.05)'
          },
          ticks: {
            color: '#9CA3AF',
            callback: (value) => value + '%'
          }
        }
      }
    }
  });
}

// Render heatmap selector
function renderHeatmapSelector() {
  const selector = document.getElementById('heatmap-task-selector');
  selector.innerHTML = tasks.map(task => `
    <button class="heatmap-task-btn ${selectedHeatmapTask === task._id ? 'active' : ''}" 
            data-task-id="${task._id}">
      ${escapeHtml(task.title)}
    </button>
  `).join('');

  // Add click handlers
  selector.querySelectorAll('.heatmap-task-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const taskId = btn.dataset.taskId;
      selectedHeatmapTask = taskId;
      
      // Update active state
      selector.querySelectorAll('.heatmap-task-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      
      loadHeatmap(taskId);
    });
  });
}

// Load heatmap
async function loadHeatmap(taskId) {
  try {
    const response = await API.analytics.getHeatmap(taskId);
    if (response.success) {
      renderHeatmap(response.data.heatmap);
    }
  } catch (error) {
    console.error('Failed to load heatmap:', error);
  }
}

// Render heatmap (GitHub-style contribution calendar)
function renderHeatmap(data) {
  const container = document.getElementById('heatmap-container');
  const grid = document.getElementById('heatmap-grid');
  const monthLabels = document.getElementById('heatmap-month-labels');
  
  container.classList.remove('hidden');

  // Generate last 91 days (13 weeks)
  const totalDays = 91;
  const days = [];
  const today = new Date();
  
  for (let i = totalDays - 1; i >= 0; i--) {
    const date = new Date(today);
    date.setDate(date.getDate() - i);
    const dateStr = date.toISOString().split('T')[0];
    
    const completion = data.find(d => d.date === dateStr);
    days.push({
      date: dateStr,
      dayOfWeek: date.getDay(), // 0=Sun .. 6=Sat
      completed: completion ? completion.completed : null,
      dateObj: date
    });
  }

  // Build columns (weeks). Each column = 7 rows (Sun-Sat)
  // Pad the first week so it starts on Sunday
  const firstDay = days[0];
  const padStart = firstDay.dayOfWeek; // number of empty cells before first day
  
  const weeks = [];
  let currentWeek = new Array(padStart).fill(null); // padding
  
  days.forEach(day => {
    currentWeek.push(day);
    if (currentWeek.length === 7) {
      weeks.push(currentWeek);
      currentWeek = [];
    }
  });
  if (currentWeek.length > 0) {
    weeks.push(currentWeek);
  }

  // Render grid (columns = weeks, rows = days of week)
  grid.innerHTML = '';
  grid.style.gridTemplateColumns = `repeat(${weeks.length}, 1fr)`;
  
  // We need to output row by row (Sun row, Mon row, ..., Sat row) for CSS grid
  for (let row = 0; row < 7; row++) {
    for (let col = 0; col < weeks.length; col++) {
      const day = weeks[col][row];
      if (!day) {
        grid.innerHTML += '<div class="heatmap-day empty"></div>';
      } else {
        let className = 'heatmap-day';
        if (day.completed === true) {
          className += ' completed';
        } else if (day.completed === false) {
          className += ' missed';
        }
        const label = formatDate(day.date);
        grid.innerHTML += `<div class="${className}" data-date="${label}" title="${label}${day.completed === true ? ' Done' : day.completed === false ? ' Missed' : ''}"></div>`;
      }
    }
  }

  // Render month labels
  const months = [];
  let lastMonth = -1;
  weeks.forEach((week, colIdx) => {
    // Find the first valid day in this week
    const validDay = week.find(d => d !== null);
    if (validDay) {
      const month = validDay.dateObj.getMonth();
      if (month !== lastMonth) {
        months.push({ colIdx, label: validDay.dateObj.toLocaleDateString('en-US', { month: 'short' }) });
        lastMonth = month;
      }
    }
  });

  monthLabels.innerHTML = '';
  monthLabels.style.gridTemplateColumns = `repeat(${weeks.length}, 1fr)`;
  for (let col = 0; col < weeks.length; col++) {
    const monthEntry = months.find(m => m.colIdx === col);
    monthLabels.innerHTML += `<span class="month-label">${monthEntry ? monthEntry.label : ''}</span>`;
  }
}

// Handle logout
function handleLogout() {
  API.auth.logout();
}

// Toast notification
function showToast(message, type = 'success') {
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.innerHTML = `
    <span class="toast-icon">${type === 'success' ? '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>' : '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>'}</span>
    <span class="toast-message">${escapeHtml(message)}</span>
  `;
  
  toastContainer.appendChild(toast);
  
  // Remove after 3 seconds
  setTimeout(() => {
    toast.style.animation = 'toastIn 0.3s ease reverse';
    setTimeout(() => toast.remove(), 300);
  }, 3000);
}

// Helper: Format date
function formatDate(dateStr) {
  const date = new Date(dateStr);
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

// Helper: Escape HTML
function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}
