// Dashboard Logic

// State
let tasks = [];
let taskStreaks = {}; // Map of taskId -> streak number
let progressChart = null;
let selectedHeatmapTask = null;
let deleteTaskId = null;
let editingTaskId = null;
let currentChartType = 'line';
let currentRange = '7d';
let aiInsights = null; // AI-generated insights
let aiTaskMetrics = null; // Task metrics from AI analysis
let habitListResizeRaf = null;
let currentUser = null;
let starterPacks = [];
let selectedStarterPackId = null;
let weeklyPlanData = null;
let isAiDrawerOpen = false;

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
const settingsBtn = document.getElementById('settings-btn');
const logoutBtn = document.getElementById('logout-btn');
const deleteModal = document.getElementById('delete-modal');
const deleteTaskTitle = document.getElementById('delete-task-title');
const settingsModal = document.getElementById('settings-modal');
const settingsCloseBtn = document.getElementById('settings-close-btn');
const reorderTaskList = document.getElementById('reorder-task-list');
const toastContainer = document.getElementById('toast-container');
const taskSkeleton = document.getElementById('task-skeleton');
const headerDate = document.getElementById('header-date');
const habitsCard = document.getElementById('habits-card');
const habitBadge = document.getElementById('habit-badge');
const headerTodayCount = document.getElementById('header-today-count');
const headerStreakCount = document.getElementById('header-streak-count');

// AI Insights DOM Elements
const aiInsightsSection = document.getElementById('ai-insights-section');
const aiInsightsContent = document.getElementById('ai-insights-content');
const toggleAiBtn = document.getElementById('toggle-ai-btn');
const aiCoachFab = document.getElementById('ai-coach-fab');
const aiCoachDrawer = document.getElementById('ai-coach-drawer');
const aiCoachBackdrop = document.getElementById('ai-coach-backdrop');
const aiContextInput = document.getElementById('ai-context-input');
const generateInsightsBtn = document.getElementById('generate-insights-btn');
const aiInsightsResults = document.getElementById('ai-insights-results');
const aiInsightsEmpty = document.getElementById('ai-insights-empty');
const aiSummaryText = document.getElementById('ai-summary-text');
const aiPriorityList = document.getElementById('ai-priority-list');
const aiSkipSection = document.getElementById('ai-skip-section');
const aiSkipList = document.getElementById('ai-skip-list');
const aiReplaceSection = document.getElementById('ai-replace-section');
const aiReplaceList = document.getElementById('ai-replace-list');
const aiTipsSection = document.getElementById('ai-tips-section');
const aiTipsList = document.getElementById('ai-tips-list');
const applyPrioritiesBtn = document.getElementById('apply-priorities-btn');
const applySkipsBtn = document.getElementById('apply-skips-btn');
const applyFallbacksBtn = document.getElementById('apply-fallbacks-btn');
const onboardingModal = document.getElementById('onboarding-modal');
const starterPackList = document.getElementById('starter-pack-list');
const onboardingCustomHabitsInput = document.getElementById('onboarding-custom-habits');
const onboardingContinueBtn = document.getElementById('onboarding-continue-btn');
const reminderSettingsList = document.getElementById('reminder-settings-list');
const weeklyPlanWeekLabel = document.getElementById('weekly-plan-week-label');
const weeklySummaryRate = document.getElementById('weekly-summary-rate');
const weeklySummaryCount = document.getElementById('weekly-summary-count');
const weeklySummaryActive = document.getElementById('weekly-summary-active');
const weeklyFocusInput = document.getElementById('weekly-focus-input');
const weeklyPriorityList = document.getElementById('weekly-priority-list');
const weeklyNotesInput = document.getElementById('weekly-notes-input');
const weeklyReflectionInput = document.getElementById('weekly-reflection-input');
const saveWeeklyPlanBtn = document.getElementById('save-weekly-plan-btn');
const weeklyPlanStatus = document.getElementById('weekly-plan-status');
const weeklyRecommendations = document.getElementById('weekly-recommendations');

const systemThemeMediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
let isSystemThemeListenerBound = false;

const WARM_THEME_TOKENS = {
  '--bg': '#FFFDF7',
  '--bg2': '#FFFDF7',
  '--surface': '#FFFFFF',
  '--surface-2': '#FFFFFF',
  '--surface-3': '#FFF8E1',
  '--border': '#F1F1EF',
  '--border-soft': '#F1F1EF',
  '--border-mid': '#ECEBE6',
  '--accent': '#F4C95D',
  '--accent-dim': '#FFF4CC',
  '--accent-glow': 'rgba(244, 201, 93, 0.24)',
  '--accent-bright': '#E8BE52',
  '--accent-contrast': '#1F1F1F',
  '--amber': '#D8A73D',
  '--amber-dim': 'rgba(244, 201, 93, 0.22)',
  '--red': '#D26666',
  '--red-dim': 'rgba(210, 102, 102, 0.12)',
  '--t1': '#1F1F1F',
  '--t2': '#6B7280',
  '--t3': '#8B93A1',
  '--t4': '#B4BAC5',
  '--header-bg': 'rgba(255, 253, 247, 0.94)',
  '--scroll-thumb': 'rgba(31, 31, 31, 0.16)',
  '--brand': '#1F1F1F',
  '--text-primary': '#1F1F1F',
  '--text-secondary': '#6B7280',
  '--text-muted': '#8B93A1',
  '--bg-page': '#FFFDF7',
  '--bg-card': '#FFFFFF',
  '--bg-input': '#FFFFFF',
  '--border-light': '#F1F1EF',
  '--border-color': '#F1F1EF'
};

const THEME_TOKENS = {
  dark: WARM_THEME_TOKENS,
  light: WARM_THEME_TOKENS
};

// Initialize
document.addEventListener('DOMContentLoaded', async () => {
  initializeDashboardHeader();
  updateHabitListMaxHeight();
  window.addEventListener('resize', updateHabitListMaxHeight);

  // Initialize theme
  initializeTheme();

  toggleAiSection(false);
  
  // Check authentication
  if (!API.auth.isAuthenticated()) {
    window.location.href = 'index.html';
    return;
  }

  try {
    // Load initial data
    await Promise.all([
      loadCurrentUser(),
      loadTodaysTasks(),
      loadStats(),
      loadWeeklyPlan()
    ]);

    if (shouldShowOnboarding()) {
      await loadStarterPacks();
      openOnboardingModal();
    }

    // Show app
    loadingScreen.classList.add('hidden');
    app.classList.remove('hidden');
    updateHabitListMaxHeight();
  } catch (error) {
    showToast('Failed to load data. Please refresh.', 'error');
    loadingScreen.classList.add('hidden');
    app.classList.remove('hidden');
    updateHabitListMaxHeight();
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

  // Settings
  settingsBtn.addEventListener('click', openSettings);
  settingsCloseBtn.addEventListener('click', closeSettings);
  settingsModal.querySelector('.modal-backdrop').addEventListener('click', closeSettings);

  // Theme switcher
  document.querySelectorAll('input[name="theme"]').forEach(radio => {
    radio.addEventListener('change', (e) => handleThemeChange(e.target.value));
  });

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
  deleteModal.querySelector('.modal-backdrop').addEventListener('click', closeDeleteModal);

  // Chart type toggle
  document.querySelectorAll('.chart-type-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.chart-type-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      currentChartType = btn.dataset.type;
      loadProgressChart(currentRange);
    });
  });

  // AI Insights event listeners
  if (aiCoachFab) {
    aiCoachFab.addEventListener('click', () => toggleAiSection(true));
  }
  if (toggleAiBtn) {
    toggleAiBtn.addEventListener('click', () => toggleAiSection(false));
  }
  if (aiCoachBackdrop) {
    aiCoachBackdrop.addEventListener('click', () => toggleAiSection(false));
  }
  if (generateInsightsBtn) {
    generateInsightsBtn.addEventListener('click', generateAIInsights);
  }
  if (applyPrioritiesBtn) {
    applyPrioritiesBtn.addEventListener('click', applyAIPriorities);
  }
  if (applySkipsBtn) {
    applySkipsBtn.addEventListener('click', applyAISkips);
  }
  if (applyFallbacksBtn) {
    applyFallbacksBtn.addEventListener('click', applyAIFallbacks);
  }
  if (saveWeeklyPlanBtn) {
    saveWeeklyPlanBtn.addEventListener('click', saveWeeklyPlan);
  }
  if (onboardingContinueBtn) {
    onboardingContinueBtn.addEventListener('click', completeOnboardingFlow);
  }
  if (onboardingModal) {
    const backdrop = onboardingModal.querySelector('.modal-backdrop');
    if (backdrop) {
      backdrop.addEventListener('click', (event) => {
        event.preventDefault();
      });
    }
  }

  document.addEventListener('keydown', handleGlobalKeydown);
}

function handleGlobalKeydown(event) {
  if (event.key === 'Escape' && isAiDrawerOpen) {
    toggleAiSection(false);
  }
}

async function loadCurrentUser() {
  try {
    const response = await API.auth.getMe();
    if (response.success) {
      currentUser = response.data.user;
    }
  } catch (error) {
    console.error('Failed to load current user:', error);
  }
}

function initializeDashboardHeader() {
  const now = new Date();

  if (headerDate) {
    headerDate.textContent = now.toLocaleDateString('en-GB', {
      weekday: 'long',
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    });
  }
}

function updateHabitListMaxHeight() {
  if (!habitsCard) return;

  // Task list now flows naturally and relies on page scroll.
  habitsCard.style.removeProperty('--habit-list-max-height');
}

function shouldShowOnboarding() {
  if (!currentUser || !currentUser.onboarding) return false;
  const isCompleted = Boolean(currentUser.onboarding.completed);
  return !isCompleted && tasks.length < 3;
}

async function loadStarterPacks() {
  try {
    const response = await API.tasks.getStarterPacks();
    if (response.success) {
      starterPacks = response.data.starterPacks || [];
      selectedStarterPackId = starterPacks[0]?.id || null;
      renderStarterPacks();
    }
  } catch (error) {
    console.error('Failed to load starter packs:', error);
    showToast('Failed to load starter packs', 'error');
  }
}

function renderStarterPacks() {
  if (!starterPackList) return;

  if (!starterPacks.length) {
    starterPackList.innerHTML = '<p style="color: var(--t3); font-size: 12px;">Starter packs are unavailable right now.</p>';
    return;
  }

  starterPackList.innerHTML = starterPacks.map((pack) => `
    <button
      class="starter-pack-item ${selectedStarterPackId === pack.id ? 'active' : ''}"
      data-pack-id="${pack.id}"
      type="button"
      aria-label="Select ${escapeHtml(pack.label)}"
    >
      <div class="starter-pack-title">${escapeHtml(pack.label)}</div>
      <div class="starter-pack-preview">${pack.habits.map((habit) => escapeHtml(habit)).join(' • ')}</div>
    </button>
  `).join('');

  starterPackList.querySelectorAll('.starter-pack-item').forEach((button) => {
    button.addEventListener('click', () => {
      selectedStarterPackId = button.dataset.packId;
      renderStarterPacks();
    });
  });
}

function openOnboardingModal() {
  if (!onboardingModal) return;
  onboardingModal.classList.remove('hidden');
}

function closeOnboardingModal() {
  if (!onboardingModal) return;
  onboardingModal.classList.add('hidden');
}

async function completeOnboardingFlow() {
  if (!selectedStarterPackId) {
    showToast('Select a starter pack first.', 'error');
    return;
  }

  onboardingContinueBtn.disabled = true;
  onboardingContinueBtn.textContent = 'Creating...';

  try {
    const customHabits = onboardingCustomHabitsInput.value
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean)
      .slice(0, 5);

    const setupResponse = await API.tasks.setupOnboarding({
      packId: selectedStarterPackId,
      customHabits
    });

    if (!setupResponse.success) {
      throw new Error(setupResponse.message || 'Failed to create starter tasks.');
    }

    await API.tasks.completeOnboarding();
    await loadCurrentUser();
    await Promise.all([loadTodaysTasks(), loadStats(), loadWeeklyPlan()]);

    closeOnboardingModal();
    showToast('Starter tasks created. You are ready to go!', 'success');
  } catch (error) {
    showToast(error.message || 'Failed to complete onboarding.', 'error');
  } finally {
    onboardingContinueBtn.disabled = false;
    onboardingContinueBtn.textContent = 'Create Starter Tasks';
  }
}

// Load today's tasks
async function loadTodaysTasks() {
  try {
    const response = await API.tasks.getToday();
    if (response.success) {
      tasks = response.data.tasks;
      taskSkeleton.classList.add('hidden');
      taskList.classList.remove('hidden');
      
      // Load streak data for all tasks
      await loadTaskStreaks();
      
      renderTasks();
      updateProgress(response.data.progress);
      updateHabitListMaxHeight();
    }
  } catch (error) {
    taskSkeleton.classList.add('hidden');
    taskList.classList.remove('hidden');
    throw error;
  }
}

// Load streak data for all tasks
async function loadTaskStreaks() {
  taskStreaks = {};
  const streakPromises = tasks.map(async (task) => {
    try {
      const response = await API.analytics.getHeatmap(task._id);
      if (response.success) {
        const streak = calculateStreakFromHeatmap(response.data.heatmap);
        taskStreaks[task._id] = streak;
      }
    } catch (error) {
      console.error(`Failed to load streak for task ${task._id}:`, error);
      taskStreaks[task._id] = 0;
    }
  });
  
  await Promise.all(streakPromises);
}

// Calculate current streak from heatmap data
function calculateStreakFromHeatmap(heatmapData) {
  if (!heatmapData || heatmapData.length === 0) return 0;
  
  // Sort by date descending (most recent first)
  const sortedData = [...heatmapData].sort((a, b) => 
    new Date(b.date) - new Date(a.date)
  );
  
  let streak = 0;
  const today = new Date().toISOString().split('T')[0];
  let checkDate = new Date();
  
  // Count consecutive completed days going backwards from today
  for (let i = 0; i < 365; i++) { // Safety limit
    const dateStr = checkDate.toISOString().split('T')[0];
    const dayData = sortedData.find(d => d.date === dateStr);
    
    if (dayData && dayData.completed === true) {
      streak++;
      checkDate.setDate(checkDate.getDate() - 1);
    } else {
      break;
    }
  }
  
  return streak;
}

// Load stats
async function loadStats() {
  try {
    const response = await API.analytics.getStats();
    if (response.success) {
      const { todayCompletions, currentStreak, totalCompletions } = response.data;

      statToday.textContent = todayCompletions;
      statStreak.textContent = currentStreak;
      statTotal.textContent = totalCompletions;
      if (headerTodayCount) headerTodayCount.textContent = todayCompletions;
      if (headerStreakCount) headerStreakCount.textContent = currentStreak;
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
    updateHabitListMaxHeight();
    return;
  }

  emptyState.classList.add('hidden');
  taskList.innerHTML = tasks.map(task => createTaskHTML(task)).join('');

  // Add event listeners to task elements
  taskList.querySelectorAll('.task-card').forEach(card => {
    const taskId = card.dataset.taskId;

    card.addEventListener('click', () => toggleTaskComplete(taskId));
  });

  // Update heatmap selector if analytics is visible
  if (!analyticsSection.classList.contains('hidden')) {
    renderHeatmapSelector();
  }

  const selectedPriorities = weeklyPriorityList
    ? [...weeklyPriorityList.querySelectorAll('input[type="checkbox"]:checked')].map((checkbox) => checkbox.dataset.taskId)
    : [];
  renderWeeklyPriorityOptions(selectedPriorities.length > 0 ? selectedPriorities : ((weeklyPlanData?.plan?.priorities || []).map((id) => String(id))));

  updateHabitListMaxHeight();
}

// Create task HTML
function createTaskHTML(task) {
  return `
    <div class="habit-item task-card ${task.completed ? 'completed' : ''}" data-task-id="${task._id}">
      <span class="habit-name task-title">${escapeHtml(task.title)}</span>
    </div>
  `;
}

// Update progress display
function updateProgress(progress) {
  const { completed, total, percentage, pausedTasks = 0 } = progress;
  progressFill.style.width = percentage + '%';
  progressText.textContent = `${completed} / ${total}`;
  statToday.textContent = completed;
  if (habitBadge) {
    habitBadge.textContent = pausedTasks > 0 ? `${completed} / ${total} (+${pausedTasks} paused)` : `${completed} / ${total}`;
  }
  if (headerTodayCount) headerTodayCount.textContent = completed;
}

// Handle add task
async function handleAddTask(e) {
  e.preventDefault();
  
  const title = newTaskInput.value.trim();
  if (!title) return;

  // If editing, update the task
  if (editingTaskId) {
    try {
      // For now, delete and recreate (since we have no update endpoint)
      const task = tasks.find(t => t._id === editingTaskId);
      if (task) {
        task.title = title;
        renderTasks();
        newTaskInput.value = '';
        editingTaskId = null;
        
        // Update button text back to "Add"
        const addBtn = addTaskForm.querySelector('button[type="submit"]');
        addBtn.textContent = 'Add';
        
        showToast('Task updated', 'success');
      }
    } catch (error) {
      showToast(error.message, 'error');
    }
    return;
  }

  try {
    const response = await API.tasks.create(title);
    if (response.success) {
      const newTask = response.data.task;
      tasks.unshift(newTask);
      
      // Load streak for the new task
      try {
        const streakResponse = await API.analytics.getHeatmap(newTask._id);
        if (streakResponse.success) {
          taskStreaks[newTask._id] = calculateStreakFromHeatmap(streakResponse.data.heatmap);
        } else {
          taskStreaks[newTask._id] = 0;
        }
      } catch (err) {
        taskStreaks[newTask._id] = 0;
      }
      
      renderTasks();
      newTaskInput.value = '';
      
      // Update progress
      const total = tasks.length;
      const completed = tasks.filter(t => t.completed).length;
      const percentage = total > 0 ? Math.round((completed / total) * 100) : 0;
      updateProgress({ completed, total, percentage });
      
      showToast('New task added', 'success');
      loadStats();
      
      // Refresh progress chart and heatmap selector
      loadProgressChart(currentRange);
      renderHeatmapSelector();
    }
  } catch (error) {
    showToast(error.message, 'error');
  }
}

// Open edit mode
function openEditMode(taskId) {
  const task = tasks.find(t => t._id === taskId);
  if (task) {
    editingTaskId = taskId;
    newTaskInput.value = task.title;
    newTaskInput.focus();
    
    // Update button text
    const addBtn = addTaskForm.querySelector('button[type="submit"]');
    addBtn.textContent = 'Update';
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
      
      // Recalculate streak for this task
      try {
        const streakResponse = await API.analytics.getHeatmap(taskId);
        if (streakResponse.success && streakResponse.data.heatmap) {
          taskStreaks[taskId] = calculateStreakFromHeatmap(streakResponse.data.heatmap);
        }
      } catch (streakError) {
        console.error('Failed to update streak:', streakError);
      }
      
      // Refresh stats
      loadStats();
      
      // Refresh progress chart with current range
      loadProgressChart(currentRange);
      
      // Refresh heatmap if a task is selected
      if (selectedHeatmapTask) {
        loadHeatmap(selectedHeatmapTask);
      }
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
      
      showToast('Task deleted', 'success');
      loadStats();
      
      // Refresh progress chart and heatmap selector
      loadProgressChart(currentRange);
      renderHeatmapSelector();
      
      // Clear selected heatmap if the deleted task was selected
      if (selectedHeatmapTask === deleteTaskId) {
        selectedHeatmapTask = null;
        const heatmapContainer = document.getElementById('heatmap-container');
        if (heatmapContainer) {
          heatmapContainer.innerHTML = '<p style="text-align: center; color: var(--text-secondary); padding: 2rem;">Select a task to view its completion history</p>';
        }
      }
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
    toggleAnalyticsBtn.classList.add('active');
    loadProgressChart('7d');
    renderHeatmapSelector();
  } else {
    analyticsSection.classList.add('hidden');
    toggleAnalyticsBtn.classList.remove('active');
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
  const styles = getComputedStyle(document.documentElement);
  const activeTheme = document.documentElement.getAttribute('data-theme') || 'dark';
  const isLightTheme = activeTheme === 'light';
  const brandColor = styles.getPropertyValue('--brand').trim() || (isLightTheme ? '#2E8B62' : '#7FD4A2');
  const amberColor = styles.getPropertyValue('--amber').trim() || (isLightTheme ? '#C28640' : '#E8C07A');
  const mutedColor = styles.getPropertyValue('--text-muted').trim() || (isLightTheme ? '#627A6E' : '#8BA597');
  const lineFill = styles.getPropertyValue('--accent-dim').trim() || toRgba(brandColor, 0.12);
  const highBarColor = toRgba(brandColor, 0.72);
  const midBarColor = toRgba(brandColor, 0.45);
  const lowBarColor = toRgba(amberColor, 0.48);
  const gridColor = isLightTheme ? 'rgba(20, 34, 27, 0.10)' : 'rgba(255, 255, 255, 0.06)';
  const tooltipBackground = isLightTheme ? 'rgba(255, 255, 255, 0.96)' : 'rgba(31, 41, 55, 0.95)';
  const tooltipTitleColor = isLightTheme ? '#14221B' : '#FFFFFF';
  const tooltipBodyColor = isLightTheme ? 'rgba(20, 34, 27, 0.80)' : 'rgba(229, 231, 235, 0.80)';
  const tooltipBorderColor = isLightTheme ? 'rgba(20, 34, 27, 0.12)' : 'rgba(229, 231, 235, 0.15)';
  
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
        borderColor: brandColor,
        backgroundColor: isBar 
          ? data.map(d => d.percentage >= 80 ? highBarColor
                        : d.percentage >= 40 ? midBarColor
                        : lowBarColor)
          : lineFill,
        fill: !isBar,
        tension: 0.4,
        pointBackgroundColor: brandColor,
        pointBorderColor: brandColor,
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
          backgroundColor: tooltipBackground,
          titleColor: tooltipTitleColor,
          bodyColor: tooltipBodyColor,
          borderColor: tooltipBorderColor,
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
            color: gridColor,
            display: !isBar
          },
          ticks: {
            color: mutedColor,
            maxRotation: 45,
            maxTicksLimit: 15
          }
        },
        y: {
          beginAtZero: true,
          max: 100,
          grid: {
            color: gridColor
          },
          ticks: {
            color: mutedColor,
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

function getCurrentWeekStartDate() {
  const today = new Date();
  const day = today.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  const weekStart = new Date(today);
  weekStart.setDate(today.getDate() + diff);
  return weekStart.toISOString().split('T')[0];
}

function renderWeeklyPriorityOptions(selectedTaskIds = []) {
  if (!weeklyPriorityList) return;

  if (!tasks.length) {
    weeklyPriorityList.innerHTML = '<p style="color: var(--text-muted); font-size: 12px;">Add tasks to build your weekly plan.</p>';
    return;
  }

  const selectedSet = new Set(selectedTaskIds.map((id) => String(id)));
  weeklyPriorityList.innerHTML = tasks.map((task) => `
    <div class="weekly-priority-item">
      <input id="weekly-priority-${task._id}" type="checkbox" data-task-id="${task._id}" ${selectedSet.has(String(task._id)) ? 'checked' : ''}>
      <label for="weekly-priority-${task._id}">${escapeHtml(task.title)}</label>
    </div>
  `).join('');
}

function renderWeeklyRecommendations(recommendations = []) {
  if (!weeklyRecommendations) return;

  if (!recommendations.length) {
    weeklyRecommendations.classList.add('hidden');
    weeklyRecommendations.innerHTML = '';
    return;
  }

  weeklyRecommendations.classList.remove('hidden');
  weeklyRecommendations.innerHTML = recommendations.map((entry) => `
    <div class="weekly-recommendation-item">
      <strong>${escapeHtml(entry.title)}:</strong> ${escapeHtml(entry.note)}
    </div>
  `).join('');
}

async function loadWeeklyPlan() {
  if (!weeklyPlanWeekLabel) return;

  try {
    const weekStartDate = getCurrentWeekStartDate();
    const response = await API.analytics.getWeeklyPlan(weekStartDate);

    if (!response.success) {
      throw new Error(response.message || 'Failed to load weekly plan.');
    }

    weeklyPlanData = response.data;
    const plan = response.data.plan || {};
    const summary = response.data.summary || {};

    weeklyPlanWeekLabel.textContent = `${response.data.weekStartDate} - ${response.data.weekEndDate}`;
    weeklySummaryRate.textContent = `${summary.completionRate || 0}%`;
    weeklySummaryCount.textContent = `${summary.totalCompletions || 0}`;
    weeklySummaryActive.textContent = `${summary.activeTaskCount || 0}`;

    weeklyFocusInput.value = plan.focus || '';
    weeklyNotesInput.value = plan.notes || '';
    weeklyReflectionInput.value = plan.reflection || '';
    weeklyPlanStatus.textContent = plan.updatedAt
      ? `Last saved ${new Date(plan.updatedAt).toLocaleString()}`
      : 'Not saved yet';

    renderWeeklyPriorityOptions((plan.priorities || []).map((taskId) => String(taskId)));
    renderWeeklyRecommendations(response.data.recommendations || []);
  } catch (error) {
    console.error('Failed to load weekly plan:', error);
    weeklyPlanStatus.textContent = 'Failed to load weekly plan';
  }
}

async function saveWeeklyPlan() {
  if (!saveWeeklyPlanBtn) return;

  const selectedPriorities = [...weeklyPriorityList.querySelectorAll('input[type="checkbox"]:checked')]
    .map((checkbox) => checkbox.dataset.taskId)
    .slice(0, 10);

  saveWeeklyPlanBtn.disabled = true;
  saveWeeklyPlanBtn.textContent = 'Saving...';

  try {
    const payload = {
      weekStartDate: getCurrentWeekStartDate(),
      focus: weeklyFocusInput.value.trim(),
      priorities: selectedPriorities,
      notes: weeklyNotesInput.value.trim(),
      reflection: weeklyReflectionInput.value.trim()
    };

    const response = await API.analytics.saveWeeklyPlan(payload);
    if (!response.success) {
      throw new Error(response.message || 'Failed to save weekly plan.');
    }

    weeklyPlanStatus.textContent = `Saved ${new Date().toLocaleString()}`;
    showToast('Weekly plan saved.', 'success');
    await loadWeeklyPlan();
  } catch (error) {
    weeklyPlanStatus.textContent = 'Save failed';
    showToast(error.message || 'Failed to save weekly plan.', 'error');
  } finally {
    saveWeeklyPlanBtn.disabled = false;
    saveWeeklyPlanBtn.textContent = 'Save Weekly Plan';
  }
}

// ===== Settings & Theme Management =====

// Initialize theme on page load
function initializeTheme() {
  const savedTheme = localStorage.getItem('habit_rabbit_theme') || 'light';
  applyTheme(savedTheme);
  
  // Set the correct radio button
  const radio = document.querySelector(`input[name="theme"][value="${savedTheme}"]`);
  if (radio) radio.checked = true;
}

// Handle theme change
function handleThemeChange(theme) {
  localStorage.setItem('habit_rabbit_theme', theme);
  applyTheme(theme);

  if (!analyticsSection.classList.contains('hidden')) {
    loadProgressChart(currentRange);
  }

  showToast(`Theme changed to ${theme}`, 'success');
}

// Apply theme to document
function applyTheme(theme) {
  const root = document.documentElement;

  if (theme === 'system') {
    applyResolvedTheme(systemThemeMediaQuery.matches ? 'dark' : 'light');

    if (!isSystemThemeListenerBound) {
      systemThemeMediaQuery.addEventListener('change', (e) => {
        if (localStorage.getItem('habit_rabbit_theme') === 'system') {
          applyResolvedTheme(e.matches ? 'dark' : 'light');

          if (!analyticsSection.classList.contains('hidden')) {
            loadProgressChart(currentRange);
          }
        }
      });
      isSystemThemeListenerBound = true;
    }

    return;
  }

  applyResolvedTheme(theme);
}

function applyResolvedTheme(themeName) {
  const tokens = THEME_TOKENS[themeName] || THEME_TOKENS.dark;
  const root = document.documentElement;

  Object.entries(tokens).forEach(([name, value]) => {
    root.style.setProperty(name, value);
  });

  root.setAttribute('data-theme', themeName);
}

// Open settings modal
function openSettings() {
  // Populate reorder list
  renderReorderList();
  renderReminderSettings();
  
  settingsModal.classList.remove('hidden');
}

// Close settings modal
function closeSettings() {
  settingsModal.classList.add('hidden');
}

// Render reorder task list
function renderReorderList() {
  if (tasks.length === 0) {
    reorderTaskList.innerHTML = '<p style="color: var(--text-muted); font-size: 13px; padding: 12px; text-align: center;">No tasks to reorder</p>';
    return;
  }
  
  reorderTaskList.innerHTML = tasks.map((task, index) => `
    <div class="reorder-task-item" draggable="true" data-task-id="${task._id}" data-index="${index}">
      <span class="reorder-drag-handle">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="18" x2="21" y2="18"/>
        </svg>
      </span>
      <span class="reorder-task-title">${escapeHtml(task.title)}</span>
    </div>
  `).join('');
  
  // Add drag and drop event listeners
  setupDragAndDrop();
}

function renderReminderSettings() {
  if (!reminderSettingsList) return;

  if (!tasks.length) {
    reminderSettingsList.innerHTML = '<p style="color: var(--text-muted); font-size: 13px; padding: 12px; text-align: center;">No tasks available for reminders</p>';
    return;
  }

  reminderSettingsList.innerHTML = tasks.map((task) => {
    const enabled = Boolean(task.reminder?.enabled);
    const time = task.reminder?.time || '08:00';
    return `
      <div class="reorder-task-item reminder-item" data-task-id="${task._id}">
        <label class="reorder-task-title" for="reminder-enabled-${task._id}">${escapeHtml(task.title)}</label>
        <input id="reminder-enabled-${task._id}" type="checkbox" ${enabled ? 'checked' : ''}>
        <input id="reminder-time-${task._id}" type="time" value="${escapeHtml(time)}" ${enabled ? '' : 'disabled'}>
      </div>
    `;
  }).join('');

  reminderSettingsList.querySelectorAll('.reminder-item').forEach((row) => {
    const taskId = row.dataset.taskId;
    const enabledInput = row.querySelector(`#reminder-enabled-${taskId}`);
    const timeInput = row.querySelector(`#reminder-time-${taskId}`);

    const persistReminder = async () => {
      try {
        const response = await API.tasks.updateReminder(taskId, enabledInput.checked, timeInput.value || '08:00');
        if (!response.success) {
          throw new Error(response.message || 'Failed to save reminder.');
        }

        tasks = tasks.map((task) => (
          task._id === taskId
            ? {
                ...task,
                reminder: {
                  enabled: enabledInput.checked,
                  time: timeInput.value || '08:00'
                }
              }
            : task
        ));

        renderTasks();
        showToast('Reminder updated.', 'success');
      } catch (error) {
        showToast(error.message || 'Failed to update reminder.', 'error');
      }
    };

    enabledInput.addEventListener('change', async () => {
      timeInput.disabled = !enabledInput.checked;
      await persistReminder();
    });

    timeInput.addEventListener('change', persistReminder);
  });
}

// Setup drag and drop for task reordering
function setupDragAndDrop() {
  const items = reorderTaskList.querySelectorAll('.reorder-task-item');
  
  items.forEach(item => {
    item.addEventListener('dragstart', handleDragStart);
    item.addEventListener('dragenter', handleDragEnter);
    item.addEventListener('dragover', handleDragOver);
    item.addEventListener('dragleave', handleDragLeave);
    item.addEventListener('drop', handleDrop);
    item.addEventListener('dragend', handleDragEnd);
  });
}

let draggedItem = null;

function handleDragStart(e) {
  draggedItem = this;
  this.classList.add('dragging');
  e.dataTransfer.effectAllowed = 'move';
  e.dataTransfer.setData('text/html', this.innerHTML);
}

function handleDragEnter(e) {
  if (this !== draggedItem) {
    this.classList.add('drag-over');
  }
}

function handleDragOver(e) {
  if (e.preventDefault) {
    e.preventDefault();
  }
  e.dataTransfer.dropEffect = 'move';
  return false;
}

function handleDragLeave(e) {
  this.classList.remove('drag-over');
}

function handleDrop(e) {
  if (e.stopPropagation) {
    e.stopPropagation();
  }
  
  if (draggedItem !== this) {
    // Get the indices
    const draggedIndex = parseInt(draggedItem.dataset.index);
    const targetIndex = parseInt(this.dataset.index);
    
    // Reorder the tasks array
    const [movedTask] = tasks.splice(draggedIndex, 1);
    tasks.splice(targetIndex, 0, movedTask);
    
    // Re-render both lists
    renderTasks();
    renderReorderList();
    
    showToast('Task order updated', 'success');
  }
  
  return false;
}

function handleDragEnd(e) {
  this.classList.remove('dragging');
  
  // Remove all drag-over classes
  const items = reorderTaskList.querySelectorAll('.reorder-task-item');
  items.forEach(item => item.classList.remove('drag-over'));
  
  draggedItem = null;
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

function toRgba(color, alpha) {
  const source = (color || '').trim();

  if (/^#([0-9A-F]{3}){1,2}$/i.test(source)) {
    let hex = source.slice(1);
    if (hex.length === 3) {
      hex = hex.split('').map((c) => c + c).join('');
    }

    const intValue = parseInt(hex, 16);
    const r = (intValue >> 16) & 255;
    const g = (intValue >> 8) & 255;
    const b = intValue & 255;
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  }

  const rgbMatch = source.match(/^rgba?\(([^)]+)\)$/i);
  if (rgbMatch) {
    const channels = rgbMatch[1].split(',').map((value) => value.trim());
    if (channels.length >= 3) {
      return `rgba(${channels[0]}, ${channels[1]}, ${channels[2]}, ${alpha})`;
    }
  }

  return `rgba(127, 212, 162, ${alpha})`;
}

// Helper: Escape HTML
function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// ============================================
// AI INSIGHTS FUNCTIONS
// ============================================

// Toggle AI section collapse
function toggleAiSection(forceState) {
  if (!aiCoachDrawer || !aiCoachBackdrop) return;

  const nextState = typeof forceState === 'boolean' ? forceState : !isAiDrawerOpen;
  isAiDrawerOpen = nextState;

  aiCoachDrawer.classList.toggle('open', nextState);
  aiCoachBackdrop.classList.toggle('open', nextState);
  document.body.classList.toggle('ai-drawer-open', nextState);

  aiCoachDrawer.setAttribute('aria-hidden', String(!nextState));
  aiCoachBackdrop.setAttribute('aria-hidden', String(!nextState));

  if (aiCoachFab) {
    aiCoachFab.setAttribute('aria-expanded', String(nextState));
  }
}

// Generate AI Insights
async function generateAIInsights() {
  const context = aiContextInput.value.trim();
  
  // Show loading state
  generateInsightsBtn.classList.add('loading');
  generateInsightsBtn.disabled = true;
  
  try {
    const response = await API.analytics.getAIInsights(context);
    
    if (response.success) {
      aiInsights = response.data.insights;
      aiTaskMetrics = response.data.taskMetrics;
      renderAIInsights();
      showToast('AI insights generated successfully!', 'success');
    } else {
      throw new Error(response.message || 'Failed to generate insights');
    }
  } catch (error) {
    console.error('AI Insights error:', error);
    showToast(error.message || 'Failed to generate AI insights', 'error');
  } finally {
    generateInsightsBtn.classList.remove('loading');
    generateInsightsBtn.disabled = false;
  }
}

// Render AI Insights
function renderAIInsights() {
  if (!aiInsights) {
    aiInsightsResults.classList.add('hidden');
    aiInsightsEmpty.classList.remove('hidden');
    return;
  }
  
  // Show results, hide empty state
  aiInsightsEmpty.classList.add('hidden');
  aiInsightsResults.classList.remove('hidden');
  
  // Render summary
  aiSummaryText.textContent = aiInsights.summary || 'No summary available.';
  
  // Render priority list
  renderAIPriorityList();
  
  // Render skip suggestions
  if (aiInsights.skipSuggestions && aiInsights.skipSuggestions.length > 0) {
    aiSkipSection.classList.remove('hidden');
    aiSkipList.innerHTML = aiInsights.skipSuggestions.map(skip => {
      const task = tasks.find(t => t._id === skip.taskId);
      const habitName = task ? task.title : skip.currentHabit || 'Unknown task';
      return `
        <div class="ai-suggestion-item">
          <span class="ai-suggestion-habit">${escapeHtml(habitName)}</span>
          <span class="ai-suggestion-reason">${escapeHtml(skip.reason)} ${skip.days ? `(${skip.days} days)` : ''}</span>
        </div>
      `;
    }).join('');
  } else {
    aiSkipSection.classList.add('hidden');
  }
  
  // Render replacement suggestions
  if (aiInsights.replacementSuggestions && aiInsights.replacementSuggestions.length > 0) {
    aiReplaceSection.classList.remove('hidden');
    aiReplaceList.innerHTML = aiInsights.replacementSuggestions.map(replace => {
      const task = tasks.find(t => t._id === replace.taskId);
      const habitName = task ? task.title : replace.currentHabit || 'Unknown task';
      return `
        <div class="ai-suggestion-item">
          <span class="ai-suggestion-habit">${escapeHtml(habitName)}</span>
          <span class="ai-suggestion-reason">${escapeHtml(replace.reason)}</span>
          ${replace.suggestion ? `<span class="ai-suggestion-new">💡 Try: ${escapeHtml(replace.suggestion)}</span>` : ''}
        </div>
      `;
    }).join('');
  } else {
    aiReplaceSection.classList.add('hidden');
  }
  
  // Render general tips
  if (aiInsights.generalTips && aiInsights.generalTips.length > 0) {
    aiTipsSection.classList.remove('hidden');
    aiTipsList.innerHTML = aiInsights.generalTips
      .map(tip => `<li>${escapeHtml(tip)}</li>`)
      .join('');
  } else {
    aiTipsSection.classList.add('hidden');
  }
}

async function applyAISkips() {
  if (!aiInsights?.skipSuggestions?.length) {
    showToast('No skip suggestions available.', 'error');
    return;
  }

  applySkipsBtn.disabled = true;
  applySkipsBtn.textContent = 'Applying...';

  try {
    const skips = aiInsights.skipSuggestions
      .filter((item) => item.taskId)
      .map((item) => ({
        taskId: item.taskId,
        days: Number(item.days) > 0 ? Number(item.days) : 3,
        reason: item.reason || 'AI suggested temporary pause'
      }));

    const response = await API.tasks.applySkips(skips);
    if (!response.success) {
      throw new Error(response.message || 'Failed to apply skip suggestions.');
    }

    await Promise.all([loadTodaysTasks(), loadStats(), loadWeeklyPlan()]);
    showToast('Skip suggestions applied.', 'success');
  } catch (error) {
    showToast(error.message || 'Failed to apply skip suggestions.', 'error');
  } finally {
    applySkipsBtn.disabled = false;
    applySkipsBtn.textContent = 'Pause Suggested Tasks';
  }
}

async function applyAIFallbacks() {
  if (!aiInsights?.replacementSuggestions?.length) {
    showToast('No fallback suggestions available.', 'error');
    return;
  }

  applyFallbacksBtn.disabled = true;
  applyFallbacksBtn.textContent = 'Applying...';

  try {
    const fallbacks = aiInsights.replacementSuggestions
      .filter((item) => item.taskId && item.suggestion)
      .map((item) => ({
        taskId: item.taskId,
        suggestion: item.suggestion
      }));

    const response = await API.tasks.applyFallbacks(fallbacks);
    if (!response.success) {
      throw new Error(response.message || 'Failed to apply fallback suggestions.');
    }

    await Promise.all([loadTodaysTasks(), loadStats(), loadWeeklyPlan()]);
    showToast('Fallback conversions applied.', 'success');
  } catch (error) {
    showToast(error.message || 'Failed to apply fallback suggestions.', 'error');
  } finally {
    applyFallbacksBtn.disabled = false;
    applyFallbacksBtn.textContent = 'Apply Fallback Conversions';
  }
}

// Render AI Priority List with drag-drop
function renderAIPriorityList() {
  if (!aiInsights.taskPriorities || aiInsights.taskPriorities.length === 0) {
    // Fallback: show all tasks without priorities
    aiPriorityList.innerHTML = tasks.map(task => `
      <div class="ai-priority-item" data-task-id="${task._id}" draggable="true">
        <span class="ai-priority-handle">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/>
          </svg>
        </span>
        <span class="ai-priority-badge medium">medium</span>
        <span class="ai-priority-title">${escapeHtml(task.title)}</span>
      </div>
    `).join('');
  } else {
    // Render with AI priorities
    aiPriorityList.innerHTML = aiInsights.taskPriorities.map(p => {
      const task = tasks.find(t => t._id === p.taskId);
      if (!task) return '';
      return `
        <div class="ai-priority-item" data-task-id="${p.taskId}" data-priority="${p.priority}" draggable="true">
          <span class="ai-priority-handle">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/>
            </svg>
          </span>
          <span class="ai-priority-badge ${p.priority}">${p.priority}</span>
          <span class="ai-priority-title">${escapeHtml(task.title)}</span>
          <span class="ai-priority-reason">${escapeHtml(p.reason || '')}</span>
        </div>
      `;
    }).join('');
  }
  
  // Setup drag-drop for priority items
  setupAIPriorityDragDrop();
}

// Setup drag-drop for AI priority list
function setupAIPriorityDragDrop() {
  const items = aiPriorityList.querySelectorAll('.ai-priority-item');
  let draggedItem = null;
  
  items.forEach(item => {
    item.addEventListener('dragstart', (e) => {
      draggedItem = item;
      item.classList.add('dragging');
      e.dataTransfer.effectAllowed = 'move';
    });
    
    item.addEventListener('dragend', () => {
      item.classList.remove('dragging');
      items.forEach(i => i.classList.remove('drag-over'));
      draggedItem = null;
    });
    
    item.addEventListener('dragover', (e) => {
      e.preventDefault();
      if (draggedItem && draggedItem !== item) {
        item.classList.add('drag-over');
      }
    });
    
    item.addEventListener('dragleave', () => {
      item.classList.remove('drag-over');
    });
    
    item.addEventListener('drop', (e) => {
      e.preventDefault();
      item.classList.remove('drag-over');
      
      if (draggedItem && draggedItem !== item) {
        // Reorder in DOM
        const allItems = [...aiPriorityList.querySelectorAll('.ai-priority-item')];
        const draggedIndex = allItems.indexOf(draggedItem);
        const targetIndex = allItems.indexOf(item);
        
        if (draggedIndex < targetIndex) {
          item.after(draggedItem);
        } else {
          item.before(draggedItem);
        }
        
        // Update priorities based on new order
        updatePrioritiesFromOrder();
      }
    });
  });
}

// Update priorities based on current DOM order
function updatePrioritiesFromOrder() {
  const items = aiPriorityList.querySelectorAll('.ai-priority-item');
  const newPriorities = [];
  
  items.forEach((item, index) => {
    const taskId = item.dataset.taskId;
    // Assign priority based on position
    let priority = 'low';
    if (index < items.length * 0.33) priority = 'high';
    else if (index < items.length * 0.66) priority = 'medium';
    
    newPriorities.push({ taskId, priority });
    
    // Update badge visually
    const badge = item.querySelector('.ai-priority-badge');
    badge.className = `ai-priority-badge ${priority}`;
    badge.textContent = priority;
    item.dataset.priority = priority;
  });
  
  // Update aiInsights.taskPriorities
  if (aiInsights) {
    aiInsights.taskPriorities = newPriorities.map(p => ({
      ...p,
      reason: 'Manually reordered'
    }));
  }
}

// Apply AI Priorities to tasks
async function applyAIPriorities() {
  if (!aiInsights || !aiInsights.taskPriorities) {
    showToast('No AI priorities to apply', 'error');
    return;
  }
  
  applyPrioritiesBtn.disabled = true;
  applyPrioritiesBtn.innerHTML = `
    <svg class="spinner" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
      <circle cx="12" cy="12" r="10" stroke-opacity="0.25"></circle>
      <path d="M12 2a10 10 0 0 1 10 10" stroke-linecap="round"></path>
    </svg>
    Applying...
  `;
  
  try {
    const priorities = aiInsights.taskPriorities.map(p => ({
      taskId: p.taskId,
      priority: p.priority
    }));
    
    const response = await API.tasks.applyPriorities(priorities);
    
    if (response.success) {
      // Update local tasks with new data
      tasks = response.data.tasks.map(t => ({
        ...t,
        completed: tasks.find(ot => ot._id === t._id)?.completed || false
      }));
      
      // Re-render tasks with priority badges
      renderTasks();
      showToast('Priorities applied successfully!', 'success');
    } else {
      throw new Error(response.message || 'Failed to apply priorities');
    }
  } catch (error) {
    console.error('Apply priorities error:', error);
    showToast(error.message || 'Failed to apply priorities', 'error');
  } finally {
    applyPrioritiesBtn.disabled = false;
    applyPrioritiesBtn.innerHTML = `
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <polyline points="20 6 9 17 4 12"></polyline>
      </svg>
      Apply AI Priorities
    `;
  }
}
