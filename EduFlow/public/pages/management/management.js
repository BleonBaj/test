// Management Page JavaScript
// Handles courses, classes, students, professors management

(function() {
  'use strict';

  // Bind entity switcher (tabs for course/class/student/professor)
  const bindEntitySwitcher = () => {
    const wrap = document.querySelector('.entity-switcher');
    if (!wrap || wrap.dataset.bound) return;
    wrap.dataset.bound = 'true';
    wrap.addEventListener('click', (e) => {
      const btn = e.target.closest('[data-entity-switch]');
      if (!btn) return;
      wrap.querySelectorAll('.entity-tab').forEach((c) => c.classList.remove('active'));
      btn.classList.add('active');
      const ent = btn.getAttribute('data-entity-switch');
      document.querySelectorAll('section[data-section="management"] .entity-section').forEach((d) => {
        const isMatch = d.getAttribute('data-entity') === ent;
        d.style.display = isMatch ? 'block' : 'none';
      });
      // Update selection UI if selection mode is active
      if (window.toolbarSelection && window.toolbarSelection.enabled && window.updateTableSelectionUI) {
        setTimeout(() => {
          window.updateTableSelectionUI();
        }, 100);
      }
      if (typeof lucide !== 'undefined') {
        setTimeout(() => lucide.createIcons(), 50);
      }
    });
    // Initialize first tab
    const first = wrap.querySelector('.entity-tab.active')?.getAttribute('data-entity-switch') || 'course';
    document.querySelectorAll('section[data-section="management"] .entity-section').forEach((d) => {
      const isMatch = d.getAttribute('data-entity') === first;
      d.style.display = isMatch ? '' : 'none';
    });
  };

  // Render stats for management section
  const renderManagementStats = () => {
    const container = document.querySelector('#management-stats');
    if (!container) return;

    // Ensure AppState is available
    if (!window.AppState || !window.AppState.data) {
      // If data isn't loaded yet, render empty stats and wait
      container.innerHTML = '<div class="stat-card"><div class="label">Loading...</div><div class="value">—</div></div>'.repeat(4);
      return;
    }

    const stats = window.AppState.data.stats || {};
    const cards = [
      { label: window.t('registrations-courses'), value: stats.courses_total || 0 },
      { label: window.t('registrations-classes'), value: stats.classes_total || 0 },
      { label: window.t('registrations-students'), value: stats.students_total || 0 },
      { label: window.t('registrations-professors'), value: stats.professors_total || 0 },
    ];

    container.innerHTML = cards
      .map((card) => `
        <div class="stat-card">
          <div class="label">${card.label}</div>
          <div class="value">${card.value}</div>
        </div>
      `)
      .join('');

    // Bind stat card clicks
    const statCards = container.querySelectorAll('.stat-card');
    statCards.forEach((card, idx) => {
      if (card.dataset.bound) return;
      card.dataset.bound = 'true';
      card.addEventListener('click', () => {
        const entityMap = { 0: 'course', 1: 'class', 2: 'student', 3: 'professor' };
        const entity = entityMap[idx];
        if (entity) {
          const btn = document.querySelector(`.entity-switcher [data-entity-switch="${entity}"]`);
          if (btn) btn.click();
        }
      });
    });
  };

  // Initialize management page
  window.initManagementPage = () => {
    if (!window.AppState) {
      console.warn('AppState not available yet, retrying initialization...');
      setTimeout(() => window.initManagementPage(), 200);
      return;
    }
    
    bindEntitySwitcher();
    renderManagementStats();
    
    // Setup filters
    if (window.setupManagementFilters) {
      window.setupManagementFilters();
    }
    
    // Render tables
    if (window.renderCourses) window.renderCourses();
    if (window.renderClasses) window.renderClasses();
    if (window.renderStudents) window.renderStudents();
    if (window.renderProfessors) window.renderProfessors();
    
    // Ensure header filters are set up after tables render
    setTimeout(() => {
      if (window.ensureHeaderFilters) {
        ['courses', 'classes', 'students', 'professors'].forEach(scope => {
          try {
            window.ensureHeaderFilters(scope);
          } catch (e) {
            console.warn(`Failed to setup header filters for ${scope}:`, e);
          }
        });
      }
      // Update table selection UI after rendering (for selection mode)
      if (window.toolbarSelection && window.updateTableSelectionUI) {
        if (window.toolbarSelection.enabled) {
          window.updateTableSelectionUI();
        }
      }
    }, 100);
  };

  // Auto-initialize when management section exists (it will be active if it's the loaded page)
  // NOTE: This will be called by renderAll() after data is loaded, so we don't need to auto-init here
  // But we keep it as a fallback in case renderAll doesn't call it
  const checkAndInit = () => {
    const managementSection = document.querySelector('[data-section="management"]');
    if (managementSection && managementSection.classList.contains('active')) {
      // Wait for AppState and data to be available
      const waitForData = () => {
        if (window.AppState && window.AppState.data && window.AppState.data.courses !== undefined) {
          // Data is loaded, initialize only if not already initialized
          if (!managementSection.dataset.initialized) {
            managementSection.dataset.initialized = 'true';
            window.initManagementPage();
          }
        } else {
          // Retry after a short delay (max 10 seconds)
          if (!managementSection.dataset.initAttempts) {
            managementSection.dataset.initAttempts = '0';
          }
          const attempts = parseInt(managementSection.dataset.initAttempts) || 0;
          if (attempts < 50) { // 50 * 200ms = 10 seconds max
            managementSection.dataset.initAttempts = String(attempts + 1);
            setTimeout(waitForData, 200);
          }
        }
      };
      waitForData();
    }
  };

  // Only auto-init if section is already active (fallback)
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      setTimeout(checkAndInit, 500); // Wait a bit for main init
    });
  } else {
    setTimeout(checkAndInit, 500);
  }

  // Re-render when section becomes active
  const observer = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
      if (mutation.type === 'attributes' && mutation.attributeName === 'class') {
        const target = mutation.target;
        if (target.classList.contains('active') && target.dataset.section === 'management') {
          renderManagementStats();
        }
      }
    });
  });

  const managementSection = document.querySelector('[data-section="management"]');
  if (managementSection) {
    observer.observe(managementSection, { attributes: true });
  }
})();
