// Dashboard Page JavaScript
// Dashboard-specific functionality

(function() {
  'use strict';
  
  // Helper: get class by public ID
  const getClassByPublicId = (pid) => {
    if (!window.AppState || !window.AppState.data) return null;
    return window.AppState.data.classes.find((c) => c.public_id === pid);
  };

  // Render dashboard stats
  const renderDashboard = () => {
    const statsContainer = document.querySelector('#dashboard-stats');
    if (!statsContainer) {
      console.warn('Dashboard stats container not found');
      return;
    }

    // Ensure AppState is available
    if (!window.AppState || !window.AppState.data) {
      // Show loading state
      statsContainer.innerHTML = '<div class="stat-card"><div class="stat-label">Loading...</div><div class="stat-value">—</div></div>'.repeat(4);
      // Bind quick actions even in loading state (they work without data)
      if (typeof bindQuickActions === 'function') {
        bindQuickActions();
      }
      return;
    }

    const courses = window.AppState.data.courses || [];
    const classes = window.AppState.data.classes || [];
    const students = window.AppState.data.students || [];
    const professors = window.AppState.data.professors || [];

    const totalCourses = courses.length;
    const totalClasses = classes.length;
    const totalStudents = students.length;
    const totalProfessors = professors.length;

    statsContainer.innerHTML = `
      <div class="stat-card" data-stat="courses">
        <div class="stat-icon"><i data-lucide="graduation-cap"></i></div>
        <div class="stat-content">
          <div class="stat-value">${totalCourses}</div>
          <div class="stat-label">${window.t('registrations-courses')}</div>
        </div>
      </div>
      <div class="stat-card" data-stat="classes">
        <div class="stat-icon"><i data-lucide="book-open"></i></div>
        <div class="stat-content">
          <div class="stat-value">${totalClasses}</div>
          <div class="stat-label">${window.t('registrations-classes')}</div>
        </div>
      </div>
      <div class="stat-card" data-stat="students">
        <div class="stat-icon"><i data-lucide="users"></i></div>
        <div class="stat-content">
          <div class="stat-value">${totalStudents}</div>
          <div class="stat-label">${window.t('registrations-students')}</div>
        </div>
      </div>
      <div class="stat-card" data-stat="professors">
        <div class="stat-icon"><i data-lucide="user-check"></i></div>
        <div class="stat-content">
          <div class="stat-value">${totalProfessors}</div>
          <div class="stat-label">${window.t('registrations-professors')}</div>
        </div>
      </div>
    `;

    // Re-initialize Lucide icons after rendering stats
    if (typeof lucide !== 'undefined') {
      lucide.createIcons();
    }

    // Initialize charts
    initCharts();

    // Bind quick actions (only if not already bound)
    bindQuickActions();

    // Bind stat card clicks (only if not already bound)
    bindStatCardClicks();

    // Render recent activity
    renderRecentActivity();
  };

  // Initialize charts
  const initCharts = () => {
    if (typeof Chart === 'undefined') {
      setTimeout(initCharts, 500);
      return;
    }

    const courses = window.AppState.data.courses || [];
    const classes = window.AppState.data.classes || [];
    const students = window.AppState.data.students || [];

    // 1. Students per Course chart
    const courseStudentCounts = {};
    courses.forEach(c => courseStudentCounts[c.public_id] = { name: c.name, count: 0 });
    
    classes.forEach(cls => {
      if (cls.course_public_id && courseStudentCounts[cls.course_public_id]) {
        courseStudentCounts[cls.course_public_id].count += (cls.students ? cls.students.length : 0);
      }
    });

    const ctx1 = document.getElementById('chart-students-course');
    if (ctx1) {
      if (Chart.getChart(ctx1)) Chart.getChart(ctx1).destroy();
      new Chart(ctx1, {
        type: 'bar',
        data: {
          labels: Object.values(courseStudentCounts).map(c => c.name),
          datasets: [{
            label: 'Studentë',
            data: Object.values(courseStudentCounts).map(c => c.count),
            backgroundColor: [
              'rgba(29, 78, 216, 0.7)',
              'rgba(14, 165, 233, 0.7)',
              'rgba(99, 102, 241, 0.7)',
              'rgba(139, 92, 246, 0.7)',
              'rgba(236, 72, 153, 0.7)',
              'rgba(244, 63, 94, 0.7)'
            ],
            borderColor: 'transparent',
            borderRadius: 8,
            borderSkipped: false,
            barPercentage: 0.6,
            categoryPercentage: 0.8
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: { display: false },
            tooltip: {
              backgroundColor: '#1e293b',
              padding: 12,
              titleFont: { size: 13, family: 'Inter' },
              bodyFont: { size: 13, family: 'Inter' },
              cornerRadius: 8,
              displayColors: false
            }
          },
          scales: {
            y: {
              beginAtZero: true,
              grid: { color: '#e2e8f0', drawBorder: false },
              ticks: { precision: 0, font: { family: 'Inter', size: 11 }, color: '#64748b' }
            },
            x: {
              grid: { display: false },
              ticks: { autoSkip: false, maxRotation: 45, minRotation: 0, font: { family: 'Inter', size: 11 }, color: '#64748b' }
            }
          }
        }
      });
    }

    // 2. Monthly Registrations chart
    const last12Months = {};
    const today = new Date();
    for (let i = 11; i >= 0; i--) {
      const d = new Date(today.getFullYear(), today.getMonth() - i, 1);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      const label = d.toLocaleString('sq-AL', { month: 'short' });
      last12Months[key] = { label, count: 0 };
    }

    students.forEach(s => {
      if (s.registration_date) {
        const regDate = s.registration_date.substring(0, 7);
        if (last12Months[regDate]) {
          last12Months[regDate].count++;
        }
      }
    });

    const ctx2 = document.getElementById('chart-monthly-registrations');
    if (ctx2) {
      if (Chart.getChart(ctx2)) Chart.getChart(ctx2).destroy();
      const gradient = ctx2.getContext('2d').createLinearGradient(0, 0, 0, 300);
      gradient.addColorStop(0, 'rgba(16, 185, 129, 0.2)');
      gradient.addColorStop(1, 'rgba(16, 185, 129, 0)');

      new Chart(ctx2, {
        type: 'line',
        data: {
          labels: Object.values(last12Months).map(m => m.label),
          datasets: [{
            label: 'Regjistrime',
            data: Object.values(last12Months).map(m => m.count),
            borderColor: '#10b981',
            backgroundColor: gradient,
            tension: 0.4,
            fill: true,
            pointRadius: 4,
            pointHoverRadius: 6,
            pointBackgroundColor: '#ffffff',
            pointBorderColor: '#10b981',
            pointBorderWidth: 2
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          interaction: { mode: 'index', intersect: false },
          plugins: {
            legend: { display: false },
            tooltip: {
              backgroundColor: '#1e293b',
              padding: 12,
              titleFont: { size: 13, family: 'Inter' },
              bodyFont: { size: 13, family: 'Inter' },
              cornerRadius: 8,
              displayColors: false
            }
          },
          scales: {
            y: {
              beginAtZero: true,
              grid: { color: '#e2e8f0', drawBorder: false, borderDash: [5, 5] },
              ticks: { precision: 0, font: { family: 'Inter', size: 11 }, color: '#64748b' }
            },
            x: {
              grid: { display: false },
              ticks: { autoSkip: false, maxRotation: 45, minRotation: 0, font: { family: 'Inter', size: 11 }, color: '#64748b' }
            }
          }
        }
      });
    }
  };

  // Bind quick action buttons
  const bindQuickActions = () => {
    const quickActions = document.querySelectorAll('[data-quick-action]');
    quickActions.forEach(btn => {
      if (btn.dataset.bound) return;
      btn.dataset.bound = 'true';
      btn.addEventListener('click', () => {
        const action = btn.dataset.quickAction;
        // Open modal directly for the entity
        if (window.openModal) {
          window.openModal(action, 'create');
        } else {
          // Fallback: navigate to section and trigger add button
          if (action === 'invoice') {
            window.location.href = 'dashboard.php?page=payments';
            setTimeout(() => {
              const toolbarBtn = document.querySelector('#sub-toolbar [data-tool="add"]');
              if (toolbarBtn) toolbarBtn.click();
            }, 500);
          } else if (action === 'salary') {
            window.location.href = 'dashboard.php?page=salaries';
            setTimeout(() => {
              const toolbarBtn = document.querySelector('#sub-toolbar [data-tool="add"]');
              if (toolbarBtn) toolbarBtn.click();
            }, 500);
          } else {
            window.location.href = 'dashboard.php?page=management';
            setTimeout(() => {
              const switchBtn = document.querySelector(`.entity-switcher [data-entity-switch="${action}"]`);
              if (switchBtn) switchBtn.click();
              setTimeout(() => {
                const toolbarBtn = document.querySelector('#sub-toolbar [data-tool="add"]');
                if (toolbarBtn) toolbarBtn.click();
              }, 200);
            }, 500);
          }
        }
      });
    });
  };

  // Bind stat card clicks
  const bindStatCardClicks = () => {
    const statsContainer = document.querySelector('#dashboard-stats');
    if (!statsContainer) return;
    
    const statCards = statsContainer.querySelectorAll('.stat-card');
    statCards.forEach(card => {
      if (card.dataset.bound) return;
      card.dataset.bound = 'true';
      card.addEventListener('click', () => {
        const stat = card.dataset.stat;
        if (stat === 'debt') {
          window.activateSection('payments');
        } else if (stat === 'salary') {
          window.activateSection('salaries');
        } else {
          window.activateSection('management');
          setTimeout(() => {
            const entityMap = { courses: 'course', classes: 'class', students: 'student', professors: 'professor' };
            const entity = entityMap[stat];
            if (entity) {
              const btn = document.querySelector(`.entity-switcher [data-entity-switch="${entity}"]`);
              if (btn) btn.click();
            }
          }, 300);
        }
      });
    });
  };

  // Render recent activity
  const renderRecentActivity = () => {
    const activityList = document.querySelector('#recent-activity-list');
    if (activityList) {
      activityList.innerHTML = '<div class="no-data">Nuk ka aktivitet të fundit</div>';
      if (typeof lucide !== 'undefined') {
        setTimeout(() => lucide.createIcons(), 100);
      }
    }
  };

  // Initialize dashboard page
  window.initDashboardPage = () => {
    // Ensure dashboard section is active and visible
    const dashboardSection = document.querySelector('[data-section="dashboard"]');
    if (!dashboardSection) {
      console.error('Dashboard section not found');
      return;
    }
    
    // Force section to be visible
    dashboardSection.classList.add('active');
    dashboardSection.setAttribute('style', 'display: block !important; visibility: visible !important;');
    
    if (!window.AppState) {
      console.warn('AppState not available yet, retrying initialization...');
      setTimeout(() => window.initDashboardPage(), 200);
      return;
    }
    
    // Render dashboard content (this will also bind quick actions and stat cards)
    renderDashboard();
    
    // Render recent activity
    renderRecentActivity();
    
    // Ensure Lucide icons are initialized
    if (typeof lucide !== 'undefined') {
      setTimeout(() => lucide.createIcons(), 100);
    }
  };

  // Auto-initialize when dashboard section exists (it will be active if it's the loaded page)
  // NOTE: This is a fallback - initDashboardPage should be called by renderAll
  const checkAndInit = () => {
    const dashboardSection = document.querySelector('[data-section="dashboard"]');
    if (dashboardSection) {
      // Ensure section is visible first
      if (dashboardSection.classList.contains('active')) {
        dashboardSection.style.display = 'block';
        dashboardSection.style.visibility = 'visible';
      }
      
      // Wait for AppState and data to be available
      const waitForData = () => {
        if (window.AppState && window.AppState.data && window.AppState.data.courses !== undefined) {
          // Data is loaded, initialize only if not already initialized
          if (!dashboardSection.dataset.initialized) {
            dashboardSection.dataset.initialized = 'true';
            if (window.initDashboardPage) {
              window.initDashboardPage();
            }
          }
        } else {
          // Retry after a short delay (max 50 attempts = 10 seconds)
          if (!dashboardSection.dataset.initAttempts) {
            dashboardSection.dataset.initAttempts = '0';
          }
          const attempts = parseInt(dashboardSection.dataset.initAttempts) || 0;
          if (attempts < 50) {
            dashboardSection.dataset.initAttempts = String(attempts + 1);
            setTimeout(waitForData, 200);
          }
        }
      };
      waitForData();
    }
  };

  // Only auto-init as fallback if section exists
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      setTimeout(checkAndInit, 500);
    });
  } else {
    setTimeout(checkAndInit, 500);
  }

  // Also re-render when section becomes active
  const observer = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
      if (mutation.type === 'attributes' && mutation.attributeName === 'class') {
        const target = mutation.target;
        if (target.classList.contains('active') && target.dataset.section === 'dashboard') {
          renderDashboard();
        }
      }
    });
  });

  const dashboardSection = document.querySelector('[data-section="dashboard"]');
  if (dashboardSection) {
    observer.observe(dashboardSection, { attributes: true });
  }
})();
