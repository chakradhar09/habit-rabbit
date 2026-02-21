/* ============================================
   HABIT RABBIT - API Service Layer
   Intelligent Merge: Best of both versions
   ============================================ */

const API = (() => {
  // Configuration - Uses dynamic BASE_URL for production flexibility
  const CONFIG = {
    BASE_URL: window.location.origin + '/api', // Dynamic URL from elegant version
    TOKEN_KEY: 'habit_rabbit_token', // Consistent with elegant design naming
    USER_KEY: 'habit_rabbit_user'
  };

  // ============================================
  // Token Management
  // ============================================
  
  const getToken = () => localStorage.getItem(CONFIG.TOKEN_KEY);
  
  const setToken = (token) => localStorage.setItem(CONFIG.TOKEN_KEY, token);
  
  const removeToken = () => localStorage.removeItem(CONFIG.TOKEN_KEY);
  
  const getUser = () => {
    const user = localStorage.getItem(CONFIG.USER_KEY);
    return user ? JSON.parse(user) : null;
  };
  
  const setUser = (user) => localStorage.setItem(CONFIG.USER_KEY, JSON.stringify(user));
  
  const removeUser = () => localStorage.removeItem(CONFIG.USER_KEY);
  
  const isAuthenticated = () => {
    const token = getToken();
    if (!token) return false;
    
    // Check if token is expired (enhanced from elegant version)
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      return payload.exp * 1000 > Date.now();
    } catch (e) {
      return false;
    }
  };

  // ============================================
  // HTTP Helper - Enhanced error handling
  // ============================================
  
  const request = async (endpoint, options = {}) => {
    const url = `${CONFIG.BASE_URL}${endpoint}`;
    const token = getToken();
    
    const config = {
      headers: {
        'Content-Type': 'application/json',
        ...(token && { 'Authorization': `Bearer ${token}` }),
        ...options.headers
      },
      ...options
    };
    
    if (options.body && typeof options.body === 'object') {
      config.body = JSON.stringify(options.body);
    }
    
    try {
      const response = await fetch(url, config);
      const data = await response.json();
      
      if (!response.ok) {
        // Handle unauthorized - redirect to login
        if (response.status === 401) {
          removeToken();
          removeUser();
          window.location.href = '/index.html';
          throw new Error('Session expired. Please login again.');
        }
        
        throw new Error(data.error || data.message || 'Something went wrong');
      }
      
      return data;
    } catch (error) {
      // Network error
      if (error.name === 'TypeError' && error.message === 'Failed to fetch') {
        throw new Error('Unable to connect to server. Please check your connection.');
      }
      throw error;
    }
  };

  // ============================================
  // Auth API
  // ============================================
  
  const auth = {
    /**
     * Register a new user
     * @param {string} email 
     * @param {string} password 
     * @returns {Promise<{token: string, user: object}>}
     */
    register: async (email, password) => {
      const response = await request('/auth/register', {
        method: 'POST',
        body: { email, password }
      });
      
      if (response.success || response.token) {
        setToken(response.token || response.data.token);
        setUser(response.user || response.data.user);
      }
      
      return response;
    },
    
    /**
     * Login existing user
     * @param {string} email 
     * @param {string} password 
     * @returns {Promise<{token: string, user: object}>}
     */
    login: async (email, password) => {
      const response = await request('/auth/login', {
        method: 'POST',
        body: { email, password }
      });
      
      if (response.success || response.token) {
        setToken(response.token || response.data.token);
        setUser(response.user || response.data.user);
      }
      
      return response;
    },
    
    /**
     * Logout current user
     */
    logout: () => {
      removeToken();
      removeUser();
      window.location.href = '/index.html';
    },
    
    /**
     * Check if user is authenticated
     * @returns {boolean}
     */
    isAuthenticated,
    
    /**
     * Get current user
     * @returns {object|null}
     */
    getUser,
    
    /**
     * Get current token
     * @returns {string|null}
     */
    getToken
  };

  // ============================================
  // Tasks API
  // ============================================
  
  const tasks = {
    /**
     * Get today's tasks with completion status
     * @returns {Promise<{tasks: array, date: string, progress: object}>}
     */
    getToday: async () => {
      const response = await request('/tasks/today');
      return response;
    },
    
    /**
     * Create a new task
     * @param {string} title 
     * @returns {Promise<{task: object}>}
     */
    create: async (title) => {
      const response = await request('/tasks', {
        method: 'POST',
        body: { title }
      });
      return response;
    },
    
    /**
     * Toggle task completion for today
     * @param {string} taskId 
     * @returns {Promise<{completed: boolean}>}
     */
    toggleComplete: async (taskId) => {
      const response = await request(`/tasks/${taskId}/complete`, {
        method: 'PUT'
      });
      return response;
    },
    
    /**
     * Delete a task
     * @param {string} taskId 
     * @param {boolean} deleteHistory - If true, delete all completion records too
     * @returns {Promise<{success: boolean}>}
     */
    delete: async (taskId, deleteHistory = false) => {
      const response = await request(`/tasks/${taskId}?deleteHistory=${deleteHistory}`, {
        method: 'DELETE'
      });
      return response;
    }
  };

  // ============================================
  // Analytics API
  // ============================================
  
  const analytics = {
    /**
     * Get daily progress data
     * @param {string} range - '7d', '30d', or '6m'
     * @returns {Promise<array>} - Array of {date, percentage, completed, total}
     */
    getProgress: async (range = '7d') => {
      const response = await request(`/analytics/progress?range=${range}`);
      return response;
    },
    
    /**
     * Get heatmap data for a specific task
     * @param {string} taskId 
     * @returns {Promise<array>} - Array of {date, completed}
     */
    getHeatmap: async (taskId) => {
      const response = await request(`/analytics/heatmap/${taskId}`);
      return response;
    },
    
    /**
     * Get overall stats
     * @returns {Promise<object>} - Stats object
     */
    getStats: async () => {
      const response = await request('/analytics/stats');
      return response;
    }
  };

  // ============================================
  // Public API
  // ============================================
  
  return {
    auth,
    tasks,
    analytics,
    // Expose config for debugging
    get config() {
      return { ...CONFIG, BASE_URL: CONFIG.BASE_URL };
    },
    // Allow setting base URL (useful for different environments)
    setBaseUrl: (url) => {
      CONFIG.BASE_URL = url;
    }
  };
})();

// Export for module systems (optional)
if (typeof module !== 'undefined' && module.exports) {
  module.exports = API;
}
