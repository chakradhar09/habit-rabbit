/* ============================================
   HABIT RABBIT - Auth Page Logic
   ============================================ */

document.addEventListener('DOMContentLoaded', () => {
  const THEME_STORAGE_KEY = 'habit_rabbit_theme';
  const systemThemeMediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
  const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const PASSWORD_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,72}$/;
  let isSystemThemeListenerBound = false;

  initializeTheme();

  if (API.auth.isAuthenticated()) {
    window.location.href = 'dashboard.html';
    return;
  }

  function initializeTheme() {
    const storedTheme = localStorage.getItem(THEME_STORAGE_KEY);
    const preferredTheme = storedTheme || 'system';

    if (!storedTheme) {
      localStorage.setItem(THEME_STORAGE_KEY, 'system');
    }

    applyTheme(preferredTheme);
  }

  function applyTheme(theme) {
    if (theme === 'system') {
      applyResolvedTheme(systemThemeMediaQuery.matches ? 'dark' : 'light');

      if (!isSystemThemeListenerBound) {
        systemThemeMediaQuery.addEventListener('change', (event) => {
          if (localStorage.getItem(THEME_STORAGE_KEY) === 'system') {
            applyResolvedTheme(event.matches ? 'dark' : 'light');
          }
        });
        isSystemThemeListenerBound = true;
      }

      return;
    }

    applyResolvedTheme(theme);
  }

  function applyResolvedTheme(themeName) {
    const resolvedTheme = themeName === 'light' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', resolvedTheme);
    document.documentElement.style.colorScheme = resolvedTheme;

    const themeColor = resolvedTheme === 'light' ? '#FFFFFF' : '#0E1512';
    document.querySelectorAll('meta[name="theme-color"]').forEach((meta) => {
      meta.setAttribute('content', themeColor);
    });

    const appleStatusMeta = document.querySelector('meta[name="apple-mobile-web-app-status-bar-style"]');
    if (appleStatusMeta) {
      appleStatusMeta.setAttribute('content', resolvedTheme === 'light' ? 'default' : 'black-translucent');
    }
  }

  const tabBtns = document.querySelectorAll('.tab-btn');
  const loginForm = document.getElementById('login-form');
  const registerForm = document.getElementById('register-form');
  const forgotForm = document.getElementById('forgot-form');
  const resetForm = document.getElementById('reset-form');
  const forgotPasswordBtn = document.getElementById('forgot-password-btn');
  const backToLoginFromForgotBtn = document.getElementById('back-to-login-from-forgot');
  const backToLoginFromResetBtn = document.getElementById('back-to-login-from-reset');

  const loginEmailInput = document.getElementById('login-email');
  const loginPasswordInput = document.getElementById('login-password');
  const registerEmailInput = document.getElementById('register-email');
  const registerPasswordInput = document.getElementById('register-password');
  const registerConfirmInput = document.getElementById('register-confirm');
  const forgotEmailInput = document.getElementById('forgot-email');
  const resetTokenInput = document.getElementById('reset-token');
  const resetPasswordInput = document.getElementById('reset-password');
  const resetConfirmInput = document.getElementById('reset-confirm');

  const forms = [loginForm, registerForm, forgotForm, resetForm].filter(Boolean);
  const authMessage = document.getElementById('auth-message');
  const authTitle = document.querySelector('.auth-title');
  const authSubtitle = document.querySelector('.auth-subtitle');

  function setActiveTab(tab) {
    tabBtns.forEach((btn) => {
      const isActive = btn.dataset.tab === tab;
      btn.classList.toggle('active', isActive);
    });
  }

  function activateForm(targetForm) {
    forms.forEach((form) => {
      form.classList.toggle('active', form === targetForm);
    });
  }

  function switchAuthView(view, options = {}) {
    hideMessage();

    if (view === 'register') {
      setActiveTab('register');
      activateForm(registerForm);
      if (authTitle) authTitle.textContent = 'Create account';
      if (authSubtitle) authSubtitle.textContent = 'Start building better habits today.';
      return;
    }

    if (view === 'forgot') {
      setActiveTab('login');
      activateForm(forgotForm);
      if (authTitle) authTitle.textContent = 'Forgot password';
      if (authSubtitle) authSubtitle.textContent = 'Generate a secure reset link to set a new password.';
      if (options.prefillEmail && forgotEmailInput) {
        forgotEmailInput.value = options.prefillEmail;
      }
      return;
    }

    if (view === 'reset') {
      setActiveTab('login');
      activateForm(resetForm);
      if (authTitle) authTitle.textContent = 'Reset password';
      if (authSubtitle) authSubtitle.textContent = 'Set your new password and continue your streak.';
      if (options.prefillToken && resetTokenInput) {
        resetTokenInput.value = options.prefillToken;
      }
      return;
    }

    setActiveTab('login');
    activateForm(loginForm);
    if (authTitle) authTitle.textContent = 'Welcome back';
    if (authSubtitle) authSubtitle.textContent = 'Sign in to continue your streak.';
  }

  function showMessage(message, type = 'error') {
    authMessage.textContent = message;
    authMessage.className = `auth-message show ${type}`;
  }

  function hideMessage() {
    authMessage.className = 'auth-message';
    authMessage.textContent = '';
  }

  function setLoading(form, loading) {
    const submitButton = form ? form.querySelector('.btn-primary') : null;
    if (!submitButton) return;

    submitButton.classList.toggle('loading', loading);
    submitButton.disabled = loading;
  }

  const validateEmail = (email) => EMAIL_REGEX.test(email);

  tabBtns.forEach((btn) => {
    btn.addEventListener('click', () => {
      if (btn.dataset.tab === 'register') {
        switchAuthView('register');
      } else {
        switchAuthView('login');
      }
    });
  });

  if (forgotPasswordBtn) {
    forgotPasswordBtn.addEventListener('click', () => {
      const prefillEmail = loginEmailInput ? loginEmailInput.value.trim() : '';
      switchAuthView('forgot', { prefillEmail });
    });
  }

  if (backToLoginFromForgotBtn) {
    backToLoginFromForgotBtn.addEventListener('click', () => {
      switchAuthView('login');
    });
  }

  if (backToLoginFromResetBtn) {
    backToLoginFromResetBtn.addEventListener('click', () => {
      switchAuthView('login');
    });
  }

  loginForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    hideMessage();

    const email = loginEmailInput.value.trim();
    const password = loginPasswordInput.value;

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

  registerForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    hideMessage();

    const email = registerEmailInput.value.trim();
    const password = registerPasswordInput.value;
    const confirm = registerConfirmInput.value;

    if (!email || !password || !confirm) {
      showMessage('Please fill in all fields');
      return;
    }

    if (!validateEmail(email)) {
      showMessage('Please enter a valid email address');
      return;
    }

    if (!PASSWORD_REGEX.test(password)) {
      showMessage('Password must be 8+ chars with uppercase, lowercase, and a number');
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

  forgotForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    hideMessage();

    const email = forgotEmailInput.value.trim();

    if (!email) {
      showMessage('Please enter your account email');
      return;
    }

    if (!validateEmail(email)) {
      showMessage('Please enter a valid email address');
      return;
    }

    setLoading(forgotForm, true);

    try {
      const response = await API.auth.forgotPassword(email);

      if (response?.data?.resetToken) {
        switchAuthView('reset', { prefillToken: response.data.resetToken });
        showMessage('Development reset token generated and prefilled below.', 'success');
      } else {
        showMessage('If an account exists, reset instructions have been sent.', 'success');
      }
    } catch (error) {
      showMessage(error.message);
    } finally {
      setLoading(forgotForm, false);
    }
  });

  resetForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    hideMessage();

    const token = resetTokenInput.value.trim().toLowerCase();
    const password = resetPasswordInput.value;
    const confirm = resetConfirmInput.value;

    if (!token || !password || !confirm) {
      showMessage('Please fill in all fields');
      return;
    }

    if (!/^[a-f0-9]{64}$/.test(token)) {
      showMessage('Reset token is invalid');
      return;
    }

    if (!PASSWORD_REGEX.test(password)) {
      showMessage('Password must be 8+ chars with uppercase, lowercase, and a number');
      return;
    }

    if (password !== confirm) {
      showMessage('Passwords do not match');
      return;
    }

    setLoading(resetForm, true);

    try {
      const response = await API.auth.resetPassword(token, password);

      if (response?.success) {
        resetForm.reset();
        switchAuthView('login');
        showMessage('Password reset successful. Sign in with your new password.', 'success');
      }
    } catch (error) {
      showMessage(error.message);
    } finally {
      setLoading(resetForm, false);
    }
  });

  const queryParams = new URLSearchParams(window.location.search);
  const resetTokenFromUrl = queryParams.get('resetToken') || queryParams.get('token');

  if (resetTokenFromUrl) {
    switchAuthView('reset', { prefillToken: resetTokenFromUrl });
    showMessage('Reset token detected. Set your new password to continue.', 'success');

    queryParams.delete('resetToken');
    queryParams.delete('token');
    const nextQuery = queryParams.toString();
    const cleanedUrl = `${window.location.pathname}${nextQuery ? `?${nextQuery}` : ''}${window.location.hash}`;
    window.history.replaceState({}, '', cleanedUrl);
  } else {
    switchAuthView('login');
  }

  const eyeOpenSVG = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>';
  const eyeClosedSVG = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>';

  document.querySelectorAll('.toggle-password').forEach((toggle) => {
    toggle.addEventListener('click', () => {
      const wrapper = toggle.closest('.input-wrapper');
      const input = wrapper ? wrapper.querySelector('input') : null;

      if (!input) return;

      const isPassword = input.type === 'password';
      input.type = isPassword ? 'text' : 'password';
      toggle.innerHTML = isPassword ? eyeClosedSVG : eyeOpenSVG;
    });
  });
});
