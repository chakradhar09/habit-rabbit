/* ============================================
   HABIT RABBIT - Auth Page Logic
   Intelligent Merge: Elegant design + Enhanced functionality
   ============================================ */

document.addEventListener('DOMContentLoaded', () => {
  // Redirect if already logged in
  if (API.auth.isAuthenticated()) {
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

  // Email validation
  const validateEmail = (email) => {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(email);
  };

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

    if (!validateEmail(email)) {
      showMessage('Please enter a valid email address');
      return;
    }
    
    setLoading(loginForm, true);
    
    try {
      const response = await API.auth.login(email, password);
      
      if (response.success || response.token) {
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

    if (!validateEmail(email)) {
      showMessage('Please enter a valid email address');
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
      const response = await API.auth.register(email, password);
      
      if (response.success || response.token) {
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

  // Password toggle functionality
  const eyeOpenSVG = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>';
  const eyeClosedSVG = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>';
  
  document.querySelectorAll('.toggle-password').forEach(toggle => {
    toggle.addEventListener('click', () => {
      const wrapper = toggle.closest('.input-wrapper');
      const input = wrapper ? wrapper.querySelector('input') : null;
      if (input) {
        const isPassword = input.type === 'password';
        input.type = isPassword ? 'text' : 'password';
        toggle.innerHTML = isPassword ? eyeClosedSVG : eyeOpenSVG;
      }
    });
  });
});
