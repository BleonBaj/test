// Common Utilities and API Functions
// Shared across all pages

// Ensure AppState is loaded
if (typeof AppState === 'undefined') {
  console.error('AppState not loaded. Load state.js first.');
}

// Toast notification system
window.toast = {
  el: null,
  timeout: 0,
};

window.showToast = (type, messageKey) => {
  if (!window.toast.el) {
    window.toast.el = document.createElement('div');
    window.toast.el.className = 'toast';
    document.body.appendChild(window.toast.el);
    window.toast.el.hidden = true;
  }

  window.toast.el.textContent = typeof messageKey === 'string' ? window.t(messageKey) : messageKey;
  window.toast.el.className = `toast ${type}`;
  window.toast.el.hidden = false;

  clearTimeout(window.toast.timeout);
  window.toast.timeout = window.setTimeout(() => {
    window.toast.el.hidden = true;
  }, 3200);
};

// CSRF Token Management
let csrfTokenCache = null;

window.getCsrfToken = async () => {
  if (csrfTokenCache) {
    return csrfTokenCache;
  }
  try {
    let response = await fetch('api/csrf.php', { credentials: 'same-origin' });
    if (response.ok) {
      const data = await response.json();
      csrfTokenCache = data.csrf_token || null;
      return csrfTokenCache;
    }
    response = await fetch('api/whoami.php', { credentials: 'same-origin' });
    if (response.ok) {
      const data = await response.json();
      csrfTokenCache = data.csrf_token || null;
      return csrfTokenCache;
    }
  } catch (error) {
    // Silently fail - CSRF token is optional for some endpoints
  }
  return null;
};

// API Fetch function with CSRF protection
window.apiFetch = async (url, options = {}) => {
  const config = { credentials: 'same-origin', ...options };
  config.headers = config.headers || {};

  // Add CSRF token to POST requests
  if (config.method === 'POST' || (config.method === undefined && options.body)) {
    const csrfToken = await window.getCsrfToken();
    if (csrfToken) {
      if (config.body instanceof FormData) {
        config.body.append('_csrf_token', csrfToken);
      } else if (config.body instanceof URLSearchParams) {
        config.body.append('_csrf_token', csrfToken);
      } else {
        let bodyObj = config.body;
        if (typeof bodyObj === 'string') {
          try {
            bodyObj = JSON.parse(bodyObj);
          } catch (e) {
            bodyObj = { _raw: bodyObj };
          }
        }
        if (!bodyObj || typeof bodyObj !== 'object' || Array.isArray(bodyObj)) {
          bodyObj = {};
        }
        bodyObj._csrf_token = csrfToken;
        config.body = bodyObj;
      }
    }
  }

  // Stringify JSON body if needed
  if (config.body && !(config.body instanceof FormData) && !(config.body instanceof URLSearchParams)) {
    config.headers['Content-Type'] = 'application/json';
    if (typeof config.body !== 'string') {
      config.body = JSON.stringify(config.body);
    }
  }

  const response = await fetch(url, config);
  let data = null;
  try {
    data = await response.json();
  } catch (_) {
    data = {};
  }

  if (!response.ok) {
    const nonRedirectErrors = [
      'settings_locked', 'invalid_pin', 'invalid_username', 'missing_fields',
      'access_required', 'access_expired', 'invalid_credentials',
      'invalid_course', 'database_error', 'server_error', 'duplicate_class',
      'cannot_delete', 'invalid_token', 'invalid_code', 'unknown_action',
      'method_not_allowed', 'invalid_data', 'error', 'csrf_token_invalid'
    ];

    if (data && data.error && nonRedirectErrors.includes(data.error)) {
      return Promise.reject(data);
    }

    if (response.status === 401 || response.status === 403) {
      if (data && data.error) {
        return Promise.reject(data);
      }
      const baseMeta = document.querySelector('meta[name="app-base"]');
      const base = baseMeta?.getAttribute('content') || '';
      window.location.href = base + 'index.php';
      return Promise.reject({ error: 'unauthorized' });
    }

    throw data || { error: 'request_failed', status: response.status };
  }
  return data;
};

// Utility Functions
window.serializeForm = (form) => {
  const formData = new FormData(form);
  const payload = {};

  formData.forEach((value, key) => {
    if (key.endsWith('[]')) {
      const base = key.slice(0, -2);
      if (!payload[base]) {
        payload[base] = [];
      }
      payload[base].push(value);
    } else {
      payload[key] = value;
    }
  });

  return payload;
};

window.formatDate = (value) => {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  const lang = window.AppState ? window.AppState.lang : 'sq';
  return new Intl.DateTimeFormat(lang === 'sq' ? 'sq-AL' : 'en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  }).format(date);
};

window.formatMonth = (value) => {
  if (!value) return '—';
  const date = new Date(`${value}-01T00:00:00`);
  if (Number.isNaN(date.getTime())) return value;
  const lang = window.AppState ? window.AppState.lang : 'sq';
  return new Intl.DateTimeFormat(lang === 'sq' ? 'sq-AL' : 'en-US', {
    year: 'numeric',
    month: 'long',
  }).format(date);
};

window.formatCurrency = (amount) => {
  const currency = (window.AppState?.data?.settings?.app?.currency) || 'EUR';
  const number = Number(amount || 0);
  const lang = window.AppState ? window.AppState.lang : 'sq';
  return new Intl.NumberFormat(lang === 'sq' ? 'sq-AL' : 'en-US', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
  }).format(number);
};

window.textIncludes = (value, query) => {
  const q = (query ?? '').toString().trim().toLowerCase();
  if (!q) return true;
  const v = (value ?? '').toString().trim().toLowerCase();
  return v.includes(q);
};

window.toDateObj = (value) => {
  if (!value) return null;
  let s = String(value);
  if (/^\d{4}-\d{2}$/.test(s)) s = `${s}-01T00:00:00`;
  else if (/^\d{4}-\d{2}-\d{2}$/.test(s) && !s.includes('T')) s = `${s}T00:00:00`;
  else if (/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}(:\d{2})?$/.test(s)) s = s.replace(' ', 'T');
  else if (/^\d{2}\/\d{2}\/\d{4}$/.test(s)) {
    const [dd, mm, yyyy] = s.split('/');
    s = `${yyyy}-${mm}-${dd}T00:00:00`;
  }
  const d = new Date(s);
  if (Number.isNaN(d.getTime())) return null;
  return d;
};

window.debounce = (fn, wait = 200) => {
  let t;
  return (...args) => { clearTimeout(t); t = setTimeout(() => fn(...args), wait); };
};

// Navigation and Section Management
window.activateSection = (section) => {
  if (!section) {
    console.warn('activateSection called without section parameter');
    return;
  }
  
  // Get target section first
  const targetSection = document.querySelector(`[data-section="${section}"]`);
  if (!targetSection) {
    console.warn(`Section with data-section="${section}" not found`);
    return;
  }
  
  // Check if already active - if so, just ensure it's visible and return early
  if (targetSection.classList.contains('active')) {
    targetSection.setAttribute('style', 'display: block !important; visibility: visible !important;');
    return; // Already active, no need to do anything else
  }
  
  // Remove active class from all sections and nav buttons
  document.querySelectorAll('.section').forEach((sec) => {
    sec.classList.remove('active');
    // Hide all sections first - but use setAttribute to ensure it works
    if (sec !== targetSection) {
      sec.style.display = 'none';
    }
  });
  document.querySelectorAll('.nav-btn').forEach((btn) => {
    btn.classList.remove('active');
  });
  
  // Add active class to the target section
  targetSection.classList.add('active');
  // Force visibility with inline styles using setAttribute to ensure !important
  targetSection.setAttribute('style', 'display: block !important; visibility: visible !important;');
  
  // Find nav button by href
  const navButtons = document.querySelectorAll('.nav-btn');
  navButtons.forEach((btn) => {
    const href = btn.getAttribute('href') || '';
    if (href.includes(`page=${section}`) || (section === 'dashboard' && (!href || href.includes('dashboard')))) {
      btn.classList.add('active');
    }
  });

  // Show/hide sub-toolbar based on section
  const toolbar = document.querySelector('#sub-toolbar');
  if (toolbar) {
    const sectionsWithCrud = ['management', 'payments', 'salaries'];
    if (sectionsWithCrud.includes(section)) {
      toolbar.style.display = 'flex';
      // Ensure toolbar is initialized
      if (window.initToolbar) {
        if (!toolbar.dataset.bound || toolbar.dataset.bound !== 'true') {
          setTimeout(() => {
            window.initToolbar();
          }, 100);
        } else {
          // If already bound, just ensure it's visible and icons are updated
          setTimeout(() => {
            if (typeof lucide !== 'undefined') {
              lucide.createIcons();
            }
          }, 50);
        }
      }
      // Update Lucide icons
      if (typeof lucide !== 'undefined') {
        setTimeout(() => lucide.createIcons(), 100);
      }
    } else {
      toolbar.style.display = 'none';
    }
  }
  
  // Re-initialize Lucide icons for the newly active section
  if (typeof lucide !== 'undefined') {
    setTimeout(() => {
      lucide.createIcons();
    }, 150);
  }
};

window.detectPage = () => {
  const main = document.querySelector('main');
  if (window.AppState) {
    window.AppState.page = main && main.dataset.page === 'dashboard' ? 'dashboard' : 'login';
  }
};

// Load all dashboard data
window.loadDashboardData = async () => {
  try {
    if (!window.AppState) {
      console.error('AppState not available for loadDashboardData');
      return;
    }
    
    // Ensure data object exists
    if (!window.AppState.data) {
      window.AppState.data = {
        courses: [],
        classes: [],
        students: [],
        professors: [],
        invoices: [],
        salaries: [],
        stats: {},
        settings: {}
      };
    }
    
    // Ensure filters object exists
    if (!window.AppState.filters) {
      window.AppState.filters = {
        management: { dateFrom: '', dateTo: '' },
        payments: { dateFrom: '', dateTo: '' },
        salaries: { dateFrom: '', dateTo: '' },
        columns: {
          courses: {},
          classes: {},
          students: {},
          professors: {},
          payments: {},
          salaries: {}
        }
      };
    }
    
    console.log('Loading dashboard data...');
    
    const management = await window.apiFetch('api/management.php');
    window.AppState.data.courses = management.courses || [];
    window.AppState.data.classes = management.classes || [];
    window.AppState.data.students = management.students || [];
    window.AppState.data.professors = management.professors || [];
    window.AppState.data.stats = management.stats || {};
    window.AppState.data.settings = management.settings || window.AppState.data.settings;

    const [payments, salaries] = await Promise.all([
      window.apiFetch('api/payments.php?t=' + Date.now()),
      window.apiFetch('api/salaries.php?t=' + Date.now()),
    ]);

    const normalizeList = (resp) => {
      if (Array.isArray(resp)) return resp;
      if (!resp || typeof resp !== 'object') return [];
      return resp.data || resp.invoices || resp.rows || [];
    };
    
    window.AppState.data.invoices = normalizeList(payments);
    window.AppState.data.salaries = normalizeList(salaries);

    if (window.pruneRecentInvoiceMeta) {
      window.pruneRecentInvoiceMeta((window.AppState.data.invoices || []).map(i => i.public_id));
    }

    // Populate select options after data is loaded
    if (window.populateSelectOptions) {
      window.populateSelectOptions();
    }
    
    // Render all tables/views after data is loaded - renderAll will check which section is active
    // Ensure section is active before rendering
    const urlParams = new URLSearchParams(window.location.search);
    const currentPage = urlParams.get('page') || 'dashboard';
    
    // Always ensure section is active before rendering
    if (window.activateSection) {
      window.activateSection(currentPage);
    }
    
    // Small delay to ensure DOM is updated
    setTimeout(() => {
      if (window.renderAll) {
        window.renderAll();
      }
    }, 50);
  } catch (error) {
    console.error('Error loading dashboard data:', error);
    if (window.showToast) {
      window.showToast('error', error?.error ?? 'toast-error');
    }
  }
};

// Populate select dropdowns with options
window.populateSelectOptions = () => {
  const courseSelects = document.querySelectorAll('select[name="course_public_id"]');
  const professorSelects = document.querySelectorAll('select[name="professors[]"], select[name="professor_public_id"]');
  const studentSelects = document.querySelectorAll('select[name="students[]"], select[name="student_public_id"]');
  const classSelects = document.querySelectorAll('select[name="class_public_id"]');

  if (!window.AppState || !window.AppState.data) {
    console.warn('AppState not available for populating select options');
    return;
  }

  courseSelects.forEach((select) => {
    const isMultiple = select.multiple;
    const options = (window.AppState.data.courses || [])
      .map((course) => `<option value="${course.public_id}">${course.public_id} — ${course.name}</option>`)
      .join('');
    select.innerHTML = isMultiple ? options : `<option value="">—</option>${options}`;
  });

  professorSelects.forEach((select) => {
    const isMultiple = select.multiple;
    const options = (window.AppState.data.professors || [])
      .map((prof) => `<option value="${prof.public_id}">${prof.public_id} — ${prof.first_name} ${prof.last_name}</option>`)
      .join('');
    select.innerHTML = isMultiple ? options : `<option value="">—</option>${options}`;
  });

  studentSelects.forEach((select) => {
    const isMultiple = select.multiple;
    const options = (window.AppState.data.students || [])
      .map((student) => `<option value="${student.public_id}">${student.public_id} — ${student.first_name} ${student.last_name}</option>`)
      .join('');
    select.innerHTML = isMultiple ? options : `<option value="">—</option>${options}`;
  });

  classSelects.forEach((select) => {
    const isMultiple = select.multiple;
    const options = (window.AppState.data.classes || [])
      .map((cls) => `<option value="${cls.public_id}">${cls.public_id} — ${cls.name}</option>`)
      .join('');
    select.innerHTML = isMultiple ? options : `<option value="">—</option>${options}`;
  });
};

// Bind navigation
window.bindNav = () => {
  // Navigation links are <a> tags that do full page reloads
  // The nav buttons get active class from PHP based on current page
  // This function just ensures everything is properly synchronized
  
  // Extract section from URL and ensure it's active using activateSection
  const urlParams = new URLSearchParams(window.location.search);
  const currentPage = urlParams.get('page') || 'dashboard';
  
  // Use activateSection to properly activate (it will check if already active)
  if (window.activateSection) {
    window.activateSection(currentPage);
  }
};

// Language toggle
window.toggleLanguage = () => {
  if (!window.AppState) return;
  window.AppState.lang = window.AppState.lang === 'sq' ? 'en' : 'sq';
  if (window.saveLang) {
    window.saveLang(window.AppState.lang);
  }
  if (window.applyTranslations) {
    window.applyTranslations();
  }
  // Re-render all pages
  if (window.renderAll) {
    window.renderAll();
  }
};

// Bind language toggle button
window.bindLanguageToggle = () => {
  const toggle = document.querySelector('#lang-toggle');
  if (toggle && !toggle.dataset.bound) {
    toggle.dataset.bound = 'true';
    toggle.addEventListener('click', window.toggleLanguage);
  }
  
  const refresh = document.querySelector('#global-refresh');
  if (refresh && !refresh.dataset.bound) {
    refresh.dataset.bound = 'true';
    refresh.addEventListener('click', () => {
      try {
        const u = new URL(window.location.href);
        u.searchParams.set('ts', String(Date.now()));
        window.location.replace(u.toString());
      } catch (_) {
        window.location.reload();
      }
    });
  }
};
