// API Configuration and Helper Functions

const API_BASE = window.location.origin + '/api';

// Get stored JWT token
function getToken() {
  return localStorage.getItem('habit_rabbit_token');
}

// Store JWT token
function setToken(token) {
  localStorage.setItem('habit_rabbit_token', token);
}

// Remove JWT token
function removeToken() {
  localStorage.removeItem('habit_rabbit_token');
}

// Check if user is authenticated
function isAuthenticated() {
  const token = getToken();
  if (!token) return false;
  
  // Check if token is expired (basic check)
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    return payload.exp * 1000 > Date.now();
  } catch (e) {
    return false;
  }
}

// Centralized API call function
async function apiCall(endpoint, method = 'GET', body = null) {
  const headers = {
    'Content-Type': 'application/json'
  };

  const token = getToken();
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const config = {
    method,
    headers
  };

  if (body && (method === 'POST' || method === 'PUT' || method === 'PATCH')) {
    config.body = JSON.stringify(body);
  }

  try {
    const response = await fetch(`${API_BASE}${endpoint}`, config);
    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || 'Something went wrong');
    }

    return data;
  } catch (error) {
    // Handle network errors
    if (error instanceof TypeError && error.message === 'Failed to fetch') {
      throw new Error('Unable to connect to server. Please check your connection.');
    }
    throw error;
  }
}

// Auth API calls
const authAPI = {
  register: (email, password) => apiCall('/auth/register', 'POST', { email, password }),
  login: (email, password) => apiCall('/auth/login', 'POST', { email, password }),
  getMe: () => apiCall('/auth/me')
};

// Tasks API calls
const tasksAPI = {
  getTodaysTasks: () => apiCall('/tasks/today'),
  createTask: (title) => apiCall('/tasks', 'POST', { title }),
  toggleComplete: (taskId) => apiCall(`/tasks/${taskId}/complete`, 'PUT'),
  deleteTask: (taskId, deleteHistory = false) => 
    apiCall(`/tasks/${taskId}?deleteHistory=${deleteHistory}`, 'DELETE')
};

// Analytics API calls
const analyticsAPI = {
  getProgress: (range = '7d') => apiCall(`/analytics/progress?range=${range}`),
  getHeatmap: (taskId) => apiCall(`/analytics/heatmap/${taskId}`),
  getStats: () => apiCall('/analytics/stats')
};
