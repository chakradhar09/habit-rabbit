/* ============================================
   HABIT RABBIT - Dashboard Logic
   ============================================ */

document.addEventListener('DOMContentLoaded', () => {
  // ============================================
  // Hide page loader after 2 seconds
  // ============================================
  setTimeout(() => {
    const loader = document.getElementById('page-loader');
    if (loader) {
      loader.classList.add('hidden');
    }
  }, 2000);

  // ============================================
  // Auth Check
  // ============================================
  if (!API.auth.isAuthenticated()) {
    window.location.href = '/frontend/index.html';
    return;
  }

  // ============================================
  // State
  // ============================================
  let tasks = [];
  let filter = 'all'; // 'all', 'active', 'completed'

  // ============================================
  // DOM Elements
  // ============================================
  const userEmailSpan = document.getElementById('user-email');
  const userAvatarSpan = document.getElementById('user-avatar');
  const logoutBtn = document.getElementById('logout-btn');
  const welcomeTitle = document.getElementById('welcome-title');
  const currentDate = document.getElementById('current-date');
  
  const progressPercentage = document.getElementById('progress-percentage');
  const progressCount = document.getElementById('progress-count');
  const progressBarFill = document.getElementById('progress-bar-fill');
  const progressCelebration = document.getElementById('progress-celebration');
  
  const taskInput = document.getElementById('task-input');
  const addTaskBtn = document.getElementById('add-task-btn');
  const taskList = document.getElementById('task-list');
  const emptyState = document.getElementById('empty-state');
  
  const filterBtns = document.querySelectorAll('.tasks-filter-btn');
  
  const analyticsToggle = document.getElementById('analytics-toggle');
  const analyticsContent = document.getElementById('analytics-content');

  // ============================================
  // Initialize
  // ============================================
  const init = async () => {
    setupUser();
    setupDate();
    await loadTasks();
    setupEventListeners();
  };

  // ============================================
  // Setup User Info
  // ============================================
  const setupUser = () => {
    const user = API.auth.getUser();
    if (user) {
      userEmailSpan.textContent = user.email;
      userAvatarSpan.textContent = user.email.charAt(0).toUpperCase();
      
      // Greeting based on time
      const hour = new Date().getHours();
      let greeting = 'Good morning';
      if (hour >= 12 && hour < 17) greeting = 'Good afternoon';
      else if (hour >= 17) greeting = 'Good evening';
      
      welcomeTitle.textContent = `${greeting}! 👋`;
    }
  };

  // ============================================
  // Setup Date
  // ============================================
  const setupDate = () => {
    const now = new Date();
    const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    currentDate.textContent = now.toLocaleDateString('en-US', options);
  };

  // ============================================
  // Load Tasks
  // ============================================
  const loadTasks = async () => {
    try {
      showLoading();
      const response = await API.tasks.getToday();
      
      if (response.success) {
        tasks = response.data.tasks;
        updateProgress(response.data.progress);
        renderTasks();
      }
    } catch (error) {
      showToast(error.message, 'error');
    }
  };

  // ============================================
  // Render Tasks
  // ============================================
  const renderTasks = () => {
    const filteredTasks = getFilteredTasks();
    
    if (filteredTasks.length === 0) {
      taskList.innerHTML = '';
      emptyState.style.display = 'block';
      
      if (tasks.length === 0) {
        emptyState.querySelector('.empty-state-title').textContent = 'No habits yet';
        emptyState.querySelector('.empty-state-text').textContent = 'Add your first habit above to start tracking!';
      } else {
        emptyState.querySelector('.empty-state-title').textContent = 'No tasks here';
        emptyState.querySelector('.empty-state-text').textContent = filter === 'completed' 
          ? 'Complete some tasks to see them here!' 
          : 'All tasks are completed! 🎉';
      }
      return;
    }
    
    emptyState.style.display = 'none';
    taskList.innerHTML = filteredTasks.map(task => createTaskHTML(task)).join('');
    
    // Add event listeners to new task elements
    attachTaskListeners();
  };

  // ============================================
  // Get Filtered Tasks
  // ============================================
  const getFilteredTasks = () => {
    switch (filter) {
      case 'active':
        return tasks.filter(t => !t.completed);
      case 'completed':
        return tasks.filter(t => t.completed);
      default:
        return tasks;
    }
  };

  // ============================================
  // Create Task HTML
  // ============================================
  const createTaskHTML = (task) => {
    const createdDate = new Date(task.createdAt);
    const daysAgo = Math.floor((new Date() - createdDate) / (1000 * 60 * 60 * 24));
    let metaText = 'Added today';
    if (daysAgo === 1) metaText = 'Added yesterday';
    else if (daysAgo > 1) metaText = `Added ${daysAgo} days ago`;
    
    return `
      <div class="task-card ${task.completed ? 'completed' : ''}" data-id="${task._id}">
        <label class="task-checkbox">
          <input type="checkbox" ${task.completed ? 'checked' : ''}>
          <span class="task-checkbox-custom">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
              <polyline points="20,6 9,17 4,12"></polyline>
            </svg>
          </span>
        </label>
        <div class="task-content">
          <p class="task-title">${escapeHTML(task.title)}</p>
          <span class="task-meta">${metaText}</span>
        </div>
        <div class="task-actions">
          <button class="task-action-btn view-heatmap" title="View progress">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <rect x="3" y="3" width="7" height="7"></rect>
              <rect x="14" y="3" width="7" height="7"></rect>
              <rect x="14" y="14" width="7" height="7"></rect>
              <rect x="3" y="14" width="7" height="7"></rect>
            </svg>
          </button>
          <button class="task-action-btn delete" title="Delete habit">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <polyline points="3,6 5,6 21,6"></polyline>
              <path d="M19,6 L19,20 C19,21.1 18.1,22 17,22 L7,22 C5.9,22 5,21.1 5,20 L5,6 M8,6 L8,4 C8,2.9 8.9,2 10,2 L14,2 C15.1,2 16,2.9 16,4 L16,6"></path>
            </svg>
          </button>
        </div>
      </div>
    `;
  };

  // ============================================
  // Attach Task Listeners
  // ============================================
  const attachTaskListeners = () => {
    // Checkbox toggle
    document.querySelectorAll('.task-card input[type="checkbox"]').forEach(checkbox => {
      checkbox.addEventListener('change', handleToggleComplete);
    });
    
    // Delete buttons
    document.querySelectorAll('.task-action-btn.delete').forEach(btn => {
      btn.addEventListener('click', handleDeleteClick);
    });
    
    // Heatmap buttons
    document.querySelectorAll('.task-action-btn.view-heatmap').forEach(btn => {
      btn.addEventListener('click', handleViewHeatmap);
    });
  };

  // ============================================
  // Add Task
  // ============================================
  const handleAddTask = async () => {
    const title = taskInput.value.trim();
    
    if (!title) {
      taskInput.classList.add('error');
      taskInput.focus();
      setTimeout(() => taskInput.classList.remove('error'), 500);
      return;
    }
    
    if (title.length > 100) {
      showToast('Task title must be 100 characters or less', 'error');
      return;
    }
    
    // Optimistic UI update
    const tempId = 'temp-' + Date.now();
    const tempTask = {
      _id: tempId,
      title,
      completed: false,
      createdAt: new Date().toISOString()
    };
    
    tasks.unshift(tempTask);
    renderTasks();
    updateProgressLocal();
    taskInput.value = '';
    
    try {
      const response = await API.tasks.create(title);
      
      if (response.success) {
        // Replace temp task with real one
        const index = tasks.findIndex(t => t._id === tempId);
        if (index !== -1) {
          tasks[index] = { ...response.data.task, completed: false };
        }
        renderTasks();
        showToast('Habit added successfully!', 'success');
      }
    } catch (error) {
      // Rollback
      tasks = tasks.filter(t => t._id !== tempId);
      renderTasks();
      updateProgressLocal();
      showToast(error.message, 'error');
    }
  };

  // ============================================
  // Toggle Complete
  // ============================================
  const handleToggleComplete = async (e) => {
    const taskCard = e.target.closest('.task-card');
    const taskId = taskCard.dataset.id;
    const isCompleted = e.target.checked;
    
    // Optimistic UI update
    taskCard.classList.toggle('completed', isCompleted);
    taskCard.classList.add('completing');
    
    const task = tasks.find(t => t._id === taskId);
    if (task) {
      task.completed = isCompleted;
      updateProgressLocal();
    }
    
    setTimeout(() => taskCard.classList.remove('completing'), 500);
    
    try {
      await API.tasks.toggleComplete(taskId);
    } catch (error) {
      // Rollback
      e.target.checked = !isCompleted;
      taskCard.classList.toggle('completed', !isCompleted);
      if (task) {
        task.completed = !isCompleted;
        updateProgressLocal();
      }
      showToast(error.message, 'error');
    }
  };

  // ============================================
  // Delete Task
  // ============================================
  let taskToDelete = null;

  const handleDeleteClick = (e) => {
    const taskCard = e.target.closest('.task-card');
    taskToDelete = taskCard.dataset.id;
    showDeleteModal();
  };

  const showDeleteModal = () => {
    const modal = document.getElementById('delete-modal');
    modal.style.display = 'flex';
    document.body.style.overflow = 'hidden';
  };

  const hideDeleteModal = () => {
    const modal = document.getElementById('delete-modal');
    modal.style.display = 'none';
    document.body.style.overflow = '';
    taskToDelete = null;
    
    // Reset option selection
    document.querySelectorAll('.delete-option').forEach(opt => {
      opt.classList.remove('selected');
    });
  };

  const handleDeleteConfirm = async (deleteHistory) => {
    if (!taskToDelete) return;
    
    const taskId = taskToDelete;
    const taskIndex = tasks.findIndex(t => t._id === taskId);
    const deletedTask = tasks[taskIndex];
    
    // Optimistic UI update
    tasks = tasks.filter(t => t._id !== taskId);
    renderTasks();
    updateProgressLocal();
    hideDeleteModal();
    
    try {
      await API.tasks.delete(taskId, deleteHistory);
      showToast('Habit deleted successfully', 'success');
    } catch (error) {
      // Rollback
      tasks.splice(taskIndex, 0, deletedTask);
      renderTasks();
      updateProgressLocal();
      showToast(error.message, 'error');
    }
  };

  // ============================================
  // View Heatmap
  // ============================================
  const handleViewHeatmap = async (e) => {
    const taskCard = e.target.closest('.task-card');
    const taskId = taskCard.dataset.id;
    const task = tasks.find(t => t._id === taskId);
    
    if (!task) return;
    
    // Show heatmap modal
    showHeatmapModal(task);
  };

  const showHeatmapModal = async (task) => {
    const modal = document.getElementById('heatmap-modal');
    const title = document.getElementById('heatmap-task-title');
    const container = document.getElementById('heatmap-display');
    
    title.textContent = task.title;
    container.innerHTML = '<div class="spinner spinner-lg" style="margin: 40px auto;"></div>';
    
    modal.style.display = 'flex';
    document.body.style.overflow = 'hidden';
    
    try {
      const response = await API.analytics.getHeatmap(task._id);
      
      if (response.success) {
        renderHeatmap(container, response.data);
      }
    } catch (error) {
      container.innerHTML = `<p class="text-center text-muted">Unable to load heatmap data</p>`;
    }
  };

  const hideHeatmapModal = () => {
    const modal = document.getElementById('heatmap-modal');
    modal.style.display = 'none';
    document.body.style.overflow = '';
  };

  const renderHeatmap = (container, data) => {
    // Create a map of dates to completion status
    const completionMap = {};
    data.forEach(item => {
      completionMap[item.date] = item.completed;
    });
    
    // Generate last 6 months of dates
    const cells = [];
    const today = new Date();
    for (let i = 180; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];
      const isCompleted = completionMap[dateStr] || false;
      
      cells.push(`
        <div class="heatmap-cell" 
             data-level="${isCompleted ? '4' : '0'}" 
             title="${dateStr}: ${isCompleted ? 'Completed' : 'Not completed'}">
        </div>
      `);
    }
    
    container.innerHTML = `
      <div class="heatmap-container">
        <div class="heatmap">${cells.join('')}</div>
        <div class="heatmap-legend">
          <span>Less</span>
          <div class="heatmap-legend-cells">
            <div class="heatmap-legend-cell" style="background: var(--bg-color);"></div>
            <div class="heatmap-legend-cell" style="background: rgba(16, 185, 129, 0.4);"></div>
            <div class="heatmap-legend-cell" style="background: var(--secondary-color);"></div>
          </div>
          <span>More</span>
        </div>
      </div>
    `;
  };

  // ============================================
  // Update Progress
  // ============================================
  const updateProgress = (progress) => {
    progressPercentage.textContent = `${progress.percentage}%`;
    progressCount.textContent = `${progress.completed}/${progress.total} tasks`;
    progressBarFill.style.width = `${progress.percentage}%`;
    
    // Show celebration at 100%
    if (progress.percentage === 100 && progress.total > 0) {
      progressCelebration.classList.add('show');
      triggerConfetti();
    } else {
      progressCelebration.classList.remove('show');
    }
  };

  const updateProgressLocal = () => {
    const total = tasks.length;
    const completed = tasks.filter(t => t.completed).length;
    const percentage = total > 0 ? Math.round((completed / total) * 100) : 0;
    
    updateProgress({ completed, total, percentage });
  };

  // ============================================
  // Filter Tasks
  // ============================================
  const handleFilterChange = (e) => {
    const newFilter = e.target.dataset.filter;
    if (newFilter === filter) return;
    
    filter = newFilter;
    
    filterBtns.forEach(btn => {
      btn.classList.toggle('active', btn.dataset.filter === filter);
    });
    
    renderTasks();
  };

  // ============================================
  // Analytics Toggle
  // ============================================
  const handleAnalyticsToggle = async () => {
    analyticsToggle.classList.toggle('active');
    
    if (analyticsToggle.classList.contains('active')) {
      analyticsContent.classList.add('show');
      await loadAnalytics();
    } else {
      analyticsContent.classList.remove('show');
    }
  };

  const loadAnalytics = async () => {
    const chartContainer = document.getElementById('progress-chart');
    chartContainer.innerHTML = '<div class="spinner spinner-lg" style="margin: 40px auto;"></div>';
    
    try {
      const range = document.querySelector('.time-range-btn.active')?.dataset.range || '7d';
      const response = await API.analytics.getProgress(range);
      
      if (response.success && typeof Charts !== 'undefined') {
        Charts.renderProgressChart('progress-chart', response.data);
      }
    } catch (error) {
      chartContainer.innerHTML = `<p class="text-center text-muted">Unable to load analytics</p>`;
    }
  };

  // ============================================
  // Confetti Effect
  // ============================================
  const triggerConfetti = () => {
    const container = document.getElementById('confetti-container');
    const colors = ['#fbbf24', '#f59e0b', '#fcd34d', '#fde68a', '#fef3c7', '#fffbeb'];
    
    for (let i = 0; i < 50; i++) {
      const confetti = document.createElement('div');
      confetti.className = 'confetti';
      confetti.style.left = Math.random() * 100 + '%';
      confetti.style.backgroundColor = colors[Math.floor(Math.random() * colors.length)];
      confetti.style.animationDelay = Math.random() * 2 + 's';
      confetti.style.animationDuration = (Math.random() * 2 + 2) + 's';
      container.appendChild(confetti);
      
      setTimeout(() => confetti.remove(), 4000);
    }
  };

  // ============================================
  // Utility Functions
  // ============================================
  const escapeHTML = (str) => {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  };

  const showLoading = () => {
    taskList.innerHTML = `
      <div class="task-card" style="justify-content: center; opacity: 0.5;">
        <div class="spinner"></div>
      </div>
    `;
    emptyState.style.display = 'none';
  };

  const showToast = (message, type = 'info') => {
    const container = document.getElementById('toast-container');
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    
    const icon = type === 'success' 
      ? '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>'
      : type === 'error'
      ? '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><line x1="15" y1="9" x2="9" y2="15"></line><line x1="9" y1="9" x2="15" y2="15"></line></svg>'
      : '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg>';
    
    toast.innerHTML = `${icon}<span>${message}</span>`;
    container.appendChild(toast);
    
    setTimeout(() => {
      toast.style.animation = 'fadeIn var(--transition-normal) ease-out reverse';
      setTimeout(() => toast.remove(), 300);
    }, 3000);
  };

  // ============================================
  // Event Listeners
  // ============================================
  const setupEventListeners = () => {
    // Logout
    logoutBtn.addEventListener('click', () => {
      API.auth.logout();
    });
    
    // Add task
    addTaskBtn.addEventListener('click', handleAddTask);
    taskInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') handleAddTask();
    });
    
    // Filter
    filterBtns.forEach(btn => {
      btn.addEventListener('click', handleFilterChange);
    });
    
    // Analytics toggle
    analyticsToggle.addEventListener('click', handleAnalyticsToggle);
    
    // Time range buttons
    document.querySelectorAll('.time-range-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        document.querySelectorAll('.time-range-btn').forEach(b => b.classList.remove('active'));
        e.target.classList.add('active');
        if (analyticsContent.classList.contains('show')) {
          loadAnalytics();
        }
      });
    });
    
    // Delete modal
    document.getElementById('delete-modal-close')?.addEventListener('click', hideDeleteModal);
    document.getElementById('delete-modal-cancel')?.addEventListener('click', hideDeleteModal);
    document.getElementById('delete-modal-overlay')?.addEventListener('click', hideDeleteModal);
    
    document.querySelectorAll('.delete-option').forEach(option => {
      option.addEventListener('click', () => {
        document.querySelectorAll('.delete-option').forEach(opt => opt.classList.remove('selected'));
        option.classList.add('selected');
      });
    });
    
    document.getElementById('delete-modal-confirm')?.addEventListener('click', () => {
      const selected = document.querySelector('.delete-option.selected');
      const deleteHistory = selected?.dataset.option === 'with-history';
      handleDeleteConfirm(deleteHistory);
    });
    
    // Heatmap modal
    document.getElementById('heatmap-modal-close')?.addEventListener('click', hideHeatmapModal);
    document.getElementById('heatmap-modal-overlay')?.addEventListener('click', hideHeatmapModal);
    
    // Escape key closes modals
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        hideDeleteModal();
        hideHeatmapModal();
      }
    });
  };

  // ============================================
  // Initialize App
  // ============================================
  init();
});
