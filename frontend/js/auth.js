// Auth Page Logic

document.addEventListener('DOMContentLoaded', () => {
  // Redirect if already logged in
  if (isAuthenticated()) {
    window.location.href = 'dashboard.html';
    return;
  }

  // DOM Elements
  const tabBtns = document.querySelectorAll('.tab-btn');
  const loginForm = document.getElementById('login-form');
  const registerForm = document.getElementById('register-form');
  const authMessage = document.getElementById('auth-message');

  // Tab switching
  tabBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const tab = btn.dataset.tab;
      
      // Update active tab
      tabBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      
      // Show corresponding form
      if (tab === 'login') {
        loginForm.classList.add('active');
        registerForm.classList.remove('active');
      } else {
        registerForm.classList.add('active');
        loginForm.classList.remove('active');
      }
      
      // Clear message
      hideMessage();
    });
  });

  // Show message helper
  function showMessage(message, type = 'error') {
    authMessage.textContent = message;
    authMessage.className = `auth-message show ${type}`;
  }

  // Hide message helper
  function hideMessage() {
    authMessage.className = 'auth-message';
    authMessage.textContent = '';
  }

  // Set loading state
  function setLoading(form, loading) {
    const btn = form.querySelector('.btn');
    if (loading) {
      btn.classList.add('loading');
      btn.disabled = true;
    } else {
      btn.classList.remove('loading');
      btn.disabled = false;
    }
  }

  // Login form submission
  loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    hideMessage();
    
    const email = document.getElementById('login-email').value.trim();
    const password = document.getElementById('login-password').value;
    
    if (!email || !password) {
      showMessage('Please fill in all fields');
      return;
    }
    
    setLoading(loginForm, true);
    
    try {
      const response = await authAPI.login(email, password);
      
      if (response.success) {
        setToken(response.data.token);
        showMessage('Login successful! Redirecting...', 'success');
        
        setTimeout(() => {
          window.location.href = 'dashboard.html';
        }, 500);
      }
    } catch (error) {
      showMessage(error.message);
    } finally {
      setLoading(loginForm, false);
    }
  });

  // Register form submission
  registerForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    hideMessage();
    
    const email = document.getElementById('register-email').value.trim();
    const password = document.getElementById('register-password').value;
    const confirm = document.getElementById('register-confirm').value;
    
    if (!email || !password || !confirm) {
      showMessage('Please fill in all fields');
      return;
    }
    
    if (password.length < 6) {
      showMessage('Password must be at least 6 characters');
      return;
    }
    
    if (password !== confirm) {
      showMessage('Passwords do not match');
      return;
    }
    
    setLoading(registerForm, true);
    
    try {
      const response = await authAPI.register(email, password);
      
      if (response.success) {
        setToken(response.data.token);
        showMessage('Account created! Redirecting...', 'success');
        
        setTimeout(() => {
          window.location.href = 'dashboard.html';
        }, 500);
      }
    } catch (error) {
      showMessage(error.message);
    } finally {
      setLoading(registerForm, false);
    }
  });
});
