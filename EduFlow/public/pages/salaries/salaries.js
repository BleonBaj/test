// Salaries Page JavaScript
// Handles professor salary statements

(function() {
  'use strict';

  // Render salaries table
  window.renderSalaries = () => {
    const tbody = document.querySelector('#salaries-table tbody');
    if (!tbody) {
      console.warn('Salaries table tbody not found');
      return;
    }

    // Ensure AppState is available
    if (!window.AppState) {
      console.warn('AppState not available for renderSalaries');
      tbody.innerHTML = '<tr><td colspan="8" class="no-data">Loading AppState...</td></tr>';
      return;
    }
    
    if (!window.AppState.data) {
      console.warn('AppState.data not available for renderSalaries');
      tbody.innerHTML = '<tr><td colspan="8" class="no-data">Loading data...</td></tr>';
      return;
    }
    
    // Ensure salaries array exists
    if (!window.AppState.data.salaries) {
      window.AppState.data.salaries = [];
    }

    const { dateFrom, dateTo } = window.AppState.filters.salaries || {};
    
    // Normalize date range if reversed
    let from = dateFrom || '';
    let to = dateTo || '';
    if (from && to && from > to) {
      [from, to] = [to, from];
      if (!window.AppState.filters) window.AppState.filters = {};
      if (!window.AppState.filters.salaries) window.AppState.filters.salaries = {};
      window.AppState.filters.salaries.dateFrom = from;
      window.AppState.filters.salaries.dateTo = to;
    }

    // Filter salaries by date range
    let filtered = (window.AppState.data.salaries || []).filter((salary) => {
      const dateStr = salary.confirmed_at || salary.created_at || (salary.pay_month ? `${salary.pay_month}-01` : '');
      if (!dateStr || (!from && !to)) return true;
      const d = window.toDateObj(dateStr);
      if (!d) return true;
      const fromOk = from ? (d >= new Date(`${from}T00:00:00`)) : true;
      const toOk = to ? (d <= new Date(`${to}T23:59:59`)) : true;
      return fromOk && toOk;
    });

    // Apply column filters
    const cf = window.AppState.filters.columns.salaries || {};
    filtered = filtered.filter((salary) => {
      const monthLabel = window.formatMonth(salary.pay_month);
      return (
        window.textIncludes(salary.public_id, cf.id || '') &&
        window.textIncludes(salary.professor_public_id, cf.professor || '') &&
        window.textIncludes(salary.class_public_id || '', cf.class || '') &&
        window.textIncludes(monthLabel, cf.month || '') &&
        window.textIncludes(window.formatCurrency(salary.paid_amount), cf.paid || '') &&
        window.textIncludes(window.formatCurrency(salary.advances || 0), cf.advances || '') &&
        window.textIncludes(window.t('status-' + salary.status), cf.status || '')
      );
    });

    if (!filtered.length) {
      tbody.innerHTML = `<tr><td colspan="8">—</td></tr>`;
      return;
    }

    tbody.innerHTML = filtered
      .map((salary) => {
        const statusClass = salary.status === 'paid' ? 'paid' : salary.status === 'partial' ? 'partial' : 'due';
        return `
          <tr data-entity="salary" data-id="${salary.public_id}">
            <td>${salary.public_id}</td>
            <td>${salary.professor_public_id}</td>
            <td>${salary.class_public_id || '—'}</td>
            <td>${window.formatMonth(salary.pay_month)}</td>
            <td>${window.formatCurrency(salary.base_amount)}</td>
            <td>${window.formatCurrency(salary.advances || 0)}</td>
            <td><span class="status-chip ${statusClass}">${window.t('status-' + salary.status)}</span></td>
            <td><button type="button" data-action="print" data-entity="salary" data-id="${salary.public_id}">${window.t('action-print')}</button></td>
          </tr>
        `;
      })
      .join('');
    
    // Ensure header filters after rendering
    if (window.ensureHeaderFilters) {
      setTimeout(() => window.ensureHeaderFilters('salaries'), 50);
    }
  };

  // Initialize salaries page
  window.initSalariesPage = () => {
    if (!window.AppState) {
      console.warn('AppState not available yet, retrying initialization...');
      setTimeout(() => window.initSalariesPage(), 200);
      return;
    }
    
    // Setup filters
    if (window.setupSalaryFilters) {
      window.setupSalaryFilters();
    }
    
    window.renderSalaries();
  };

  // Auto-initialize when salaries section exists (it will be active if it's the loaded page)
  // NOTE: This will be called by renderAll() after data is loaded, so we don't need to auto-init here
  // But we keep it as a fallback in case renderAll doesn't call it
  const checkAndInit = () => {
    const salariesSection = document.querySelector('[data-section="salaries"]');
    if (salariesSection && salariesSection.classList.contains('active')) {
      // Wait for AppState and data to be available
      const waitForData = () => {
        if (window.AppState && window.AppState.data && window.AppState.data.salaries !== undefined) {
          // Data is loaded, initialize only if not already initialized
          if (!salariesSection.dataset.initialized) {
            salariesSection.dataset.initialized = 'true';
            window.initSalariesPage();
          }
        } else {
          // Retry after a short delay (max 10 seconds)
          if (!salariesSection.dataset.initAttempts) {
            salariesSection.dataset.initAttempts = '0';
          }
          const attempts = parseInt(salariesSection.dataset.initAttempts) || 0;
          if (attempts < 50) { // 50 * 200ms = 10 seconds max
            salariesSection.dataset.initAttempts = String(attempts + 1);
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
        if (target.classList.contains('active') && target.dataset.section === 'salaries') {
          window.renderSalaries();
        }
      }
    });
  });

  const salariesSection = document.querySelector('[data-section="salaries"]');
  if (salariesSection) {
    observer.observe(salariesSection, { attributes: true });
  }
})();
