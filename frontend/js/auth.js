/* ============================================
   HABIT RABBIT - Auth Page Logic
   ============================================ */

document.addEventListener('DOMContentLoaded', () => {
  // ============================================
  // Check if already authenticated
  // ============================================
  if (API.auth.isAuthenticated()) {
    window.location.href = '/dashboard.html';
    return;
  }

  // ============================================
  // DOM Elements
  // ============================================
  const loginTab = document.getElementById('login-tab');
  const registerTab = document.getElementById('register-tab');
  const loginForm = document.getElementById('login-form');
  const registerForm = document.getElementById('register-form');
  
  // Login form elements
  const loginEmail = document.getElementById('login-email');
  const loginPassword = document.getElementById('login-password');
  const loginSubmit = document.getElementById('login-submit');
  const loginError = document.getElementById('login-error');
  
  // Register form elements
  const registerEmail = document.getElementById('register-email');
  const registerPassword = document.getElementById('register-password');
  const registerConfirmPassword = document.getElementById('register-confirm-password');
  const registerSubmit = document.getElementById('register-submit');
  const registerError = document.getElementById('register-error');
  
  // Password toggles
  const passwordToggles = document.querySelectorAll('.password-toggle');

  // ============================================
  // Tab Switching
  // ============================================
  const switchToLogin = () => {
    loginTab.classList.add('active');
    registerTab.classList.remove('active');
    loginForm.classList.add('active');
    registerForm.classList.remove('active');
    clearErrors();
  };

  const switchToRegister = () => {
    registerTab.classList.add('active');
    loginTab.classList.remove('active');
    registerForm.classList.add('active');
    loginForm.classList.remove('active');
    clearErrors();
  };

  loginTab.addEventListener('click', switchToLogin);
  registerTab.addEventListener('click', switchToRegister);

  // ============================================
  // Password Toggle
  // ============================================
  passwordToggles.forEach(toggle => {
    toggle.addEventListener('click', () => {
      const input = toggle.previousElementSibling;
      const type = input.type === 'password' ? 'text' : 'password';
      input.type = type;
      
      // Update icon
      const eyeOpen = toggle.querySelector('.eye-open');
      const eyeClosed = toggle.querySelector('.eye-closed');
      if (type === 'text') {
        eyeOpen.style.display = 'none';
        eyeClosed.style.display = 'block';
      } else {
        eyeOpen.style.display = 'block';
        eyeClosed.style.display = 'none';
      }
    });
  });

  // ============================================
  // Validation
  // ============================================
  const validateEmail = (email) => {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(email);
  };

  const validatePassword = (password) => {
    return password.length >= 6;
  };

  const showError = (element, message) => {
    element.textContent = message;
    element.style.display = 'block';
    element.classList.add('animate-shake');
    setTimeout(() => element.classList.remove('animate-shake'), 500);
  };

  const clearErrors = () => {
    if (loginError) {
      loginError.style.display = 'none';
      loginError.textContent = '';
    }
    if (registerError) {
      registerError.style.display = 'none';
      registerError.textContent = '';
    }
  };

  // ============================================
  // Password Strength Indicator
  // ============================================
  const checkPasswordStrength = (password) => {
    let strength = 0;
    if (password.length >= 6) strength++;
    if (password.length >= 10) strength++;
    if (/[A-Z]/.test(password)) strength++;
    if (/[0-9]/.test(password)) strength++;
    if (/[^A-Za-z0-9]/.test(password)) strength++;
    
    if (strength <= 1) return 'weak';
    if (strength <= 3) return 'medium';
    return 'strong';
  };

  if (registerPassword) {
    registerPassword.addEventListener('input', () => {
      const strengthIndicator = document.querySelector('.password-strength');
      const strengthText = document.querySelector('.password-strength-text');
      
      if (strengthIndicator && strengthText) {
        const strength = checkPasswordStrength(registerPassword.value);
        strengthIndicator.className = 'password-strength ' + strength;
        
        const messages = {
          weak: 'Weak password',
          medium: 'Medium strength',
          strong: 'Strong password'
        };
        strengthText.textContent = registerPassword.value ? messages[strength] : '';
      }
    });
  }

  // ============================================
  // Form Submission - Login
  // ============================================
  const handleLogin = async (e) => {
    e.preventDefault();
    clearErrors();

    const email = loginEmail.value.trim();
    const password = loginPassword.value;

    // Validate
    if (!email) {
      showError(loginError, 'Please enter your email');
      loginEmail.focus();
      return;
    }

    if (!validateEmail(email)) {
      showError(loginError, 'Please enter a valid email address');
      loginEmail.focus();
      return;
    }

    if (!password) {
      showError(loginError, 'Please enter your password');
      loginPassword.focus();
      return;
    }

    // Show loading state
    loginSubmit.disabled = true;
    loginSubmit.innerHTML = '<span class="auth-loading"><span class="spinner"></span> Signing in...</span>';

    try {
      await API.auth.login(email, password);
      
      // Success - redirect to dashboard
      loginSubmit.innerHTML = '<span class="auth-loading"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><polyline points="20,6 9,17 4,12"></polyline></svg> Success!</span>';
      loginSubmit.classList.remove('btn-primary');
      loginSubmit.classList.add('btn-success');
      
      setTimeout(() => {
        window.location.href = '/dashboard.html';
      }, 500);
      
    } catch (error) {
      showError(loginError, error.message);
      loginSubmit.disabled = false;
      loginSubmit.innerHTML = 'Sign In';
    }
  };

  loginForm.addEventListener('submit', handleLogin);

  // ============================================
  // Form Submission - Register
  // ============================================
  const handleRegister = async (e) => {
    e.preventDefault();
    clearErrors();

    const email = registerEmail.value.trim();
    const password = registerPassword.value;
    const confirmPassword = registerConfirmPassword.value;

    // Validate
    if (!email) {
      showError(registerError, 'Please enter your email');
      registerEmail.focus();
      return;
    }

    if (!validateEmail(email)) {
      showError(registerError, 'Please enter a valid email address');
      registerEmail.focus();
      return;
    }

    if (!password) {
      showError(registerError, 'Please enter a password');
      registerPassword.focus();
      return;
    }

    if (!validatePassword(password)) {
      showError(registerError, 'Password must be at least 6 characters');
      registerPassword.focus();
      return;
    }

    if (password !== confirmPassword) {
      showError(registerError, 'Passwords do not match');
      registerConfirmPassword.focus();
      return;
    }

    // Show loading state
    registerSubmit.disabled = true;
    registerSubmit.innerHTML = '<span class="auth-loading"><span class="spinner"></span> Creating account...</span>';

    try {
      await API.auth.register(email, password);
      
      // Success - redirect to dashboard
      registerSubmit.innerHTML = '<span class="auth-loading"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><polyline points="20,6 9,17 4,12"></polyline></svg> Success!</span>';
      registerSubmit.classList.remove('btn-primary');
      registerSubmit.classList.add('btn-success');
      
      setTimeout(() => {
        window.location.href = '/dashboard.html';
      }, 500);
      
    } catch (error) {
      showError(registerError, error.message);
      registerSubmit.disabled = false;
      registerSubmit.innerHTML = 'Create Account';
    }
  };

  registerForm.addEventListener('submit', handleRegister);

  // ============================================
  // Enter Key Support
  // ============================================
  [loginEmail, loginPassword].forEach(input => {
    input.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') handleLogin(e);
    });
  });

  [registerEmail, registerPassword, registerConfirmPassword].forEach(input => {
    input.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') handleRegister(e);
    });
  });

  // ============================================
  // Input Focus Effects
  // ============================================
  const inputs = document.querySelectorAll('.form-input');
  inputs.forEach(input => {
    input.addEventListener('focus', () => {
      input.parentElement.classList.add('focused');
    });
    input.addEventListener('blur', () => {
      input.parentElement.classList.remove('focused');
    });
  });
});
