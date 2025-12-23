// Filters Module
// Handles filter initialization and rendering for all pages

(function() {
  'use strict';

  // Setup filters for management section
  window.setupManagementFilters = () => {
    const mgmtSection = document.querySelector('section[data-section="management"]');
    if (!mgmtSection) return;
    
    let mgmtFilters = mgmtSection.querySelector('#management-filters');
    if (!mgmtFilters) {
      mgmtFilters = document.createElement('div');
      mgmtFilters.className = 'filters';
      mgmtFilters.id = 'management-filters';
      const anchor = mgmtSection.querySelector('.entity-switcher') || mgmtSection.querySelector('.section-header');
      if (anchor?.nextElementSibling) {
        anchor.parentElement.insertBefore(mgmtFilters, anchor.nextElementSibling);
      } else {
        mgmtSection.querySelector('.section-body')?.prepend(mgmtFilters);
      }
    }
    
    if (!window.AppState || !window.t) {
      console.warn('AppState or t() not available for filters');
      return;
    }
    
    mgmtFilters.innerHTML = `
      <label class="filter-field">
        <span>${window.t('filter-from')}</span>
        <input type="date" data-filter="mgmt-date-from">
      </label>
      <label class="filter-field">
        <span>${window.t('filter-to')}</span>
        <input type="date" data-filter="mgmt-date-to">
      </label>
      <div class="filter-field">
        <button type="button" class="primary" data-filter-apply="management">${window.t('action-apply')}</button>
      </div>`;
    
    const from = mgmtFilters.querySelector('[data-filter="mgmt-date-from"]');
    const to = mgmtFilters.querySelector('[data-filter="mgmt-date-to"]');
    if (from) from.value = (window.AppState.filters?.management?.dateFrom) || '';
    if (to) to.value = (window.AppState.filters?.management?.dateTo) || '';
    
    if (!mgmtFilters.dataset.bound) {
      mgmtFilters.dataset.bound = 'true';
      mgmtFilters.addEventListener('change', (e) => {
        const target = e.target;
        if (!(target instanceof HTMLInputElement)) return;
        const key = target.getAttribute('data-filter');
        if (!window.AppState.filters) window.AppState.filters = {};
        if (!window.AppState.filters.management) window.AppState.filters.management = {};
        if (key === 'mgmt-date-from') window.AppState.filters.management.dateFrom = target.value;
        if (key === 'mgmt-date-to') window.AppState.filters.management.dateTo = target.value;
      });
      mgmtFilters.addEventListener('click', (e) => {
        const btn = e.target.closest?.('[data-filter-apply="management"]');
        if (!btn) return;
        const fromEl = mgmtFilters.querySelector('[data-filter="mgmt-date-from"]');
        const toEl = mgmtFilters.querySelector('[data-filter="mgmt-date-to"]');
        if (!window.AppState.filters) window.AppState.filters = {};
        if (!window.AppState.filters.management) window.AppState.filters.management = {};
        window.AppState.filters.management.dateFrom = fromEl?.value || '';
        window.AppState.filters.management.dateTo = toEl?.value || '';
        if (window.renderCourses) window.renderCourses();
        if (window.renderClasses) window.renderClasses();
        if (window.renderStudents) window.renderStudents();
        if (window.renderProfessors) window.renderProfessors();
      });
    }
  };

  // Setup filters for payments section
  window.setupPaymentFilters = () => {
    const paymentFilters = document.querySelector('#payment-filters');
    if (!paymentFilters) return;
    
    if (!window.AppState || !window.t) {
      console.warn('AppState or t() not available for filters');
      return;
    }
    
    paymentFilters.innerHTML = `
      <label class="filter-field">
        <span>${window.t('filter-from')}</span>
        <input type="date" data-filter="payment-date-from">
      </label>
      <label class="filter-field">
        <span>${window.t('filter-to')}</span>
        <input type="date" data-filter="payment-date-to">
      </label>
      <div class="filter-field">
        <button type="button" class="primary" data-filter-apply="payments">${window.t('action-apply')}</button>
      </div>
    `;

    const fromInput = paymentFilters.querySelector('[data-filter="payment-date-from"]');
    const toInput = paymentFilters.querySelector('[data-filter="payment-date-to"]');
    if (!window.AppState.filters) window.AppState.filters = {};
    if (!window.AppState.filters.payments) window.AppState.filters.payments = {};
    if (fromInput) fromInput.value = window.AppState.filters.payments.dateFrom || '';
    if (toInput) toInput.value = window.AppState.filters.payments.dateTo || '';

    if (!paymentFilters.dataset.bound) {
      paymentFilters.dataset.bound = 'true';
      paymentFilters.addEventListener('change', (event) => {
        const target = event.target;
        if (!(target instanceof HTMLInputElement || target instanceof HTMLSelectElement)) return;
        const filter = target.getAttribute('data-filter');
        if (!filter) return;
        if (!window.AppState.filters) window.AppState.filters = {};
        if (!window.AppState.filters.payments) window.AppState.filters.payments = {};
        if (filter === 'payment-date-from') {
          window.AppState.filters.payments.dateFrom = target.value;
        }
        if (filter === 'payment-date-to') {
          window.AppState.filters.payments.dateTo = target.value;
        }
      });
      paymentFilters.addEventListener('click', (e) => {
        const btn = e.target.closest?.('[data-filter-apply="payments"]');
        if (!btn) return;
        const fromEl = paymentFilters.querySelector('[data-filter="payment-date-from"]');
        const toEl = paymentFilters.querySelector('[data-filter="payment-date-to"]');
        if (!window.AppState.filters) window.AppState.filters = {};
        if (!window.AppState.filters.payments) window.AppState.filters.payments = {};
        window.AppState.filters.payments.dateFrom = fromEl?.value || '';
        window.AppState.filters.payments.dateTo = toEl?.value || '';
        if (window.renderPayments) window.renderPayments();
      });
    }
  };

  // Setup filters for salaries section
  window.setupSalaryFilters = () => {
    const salaryFilters = document.querySelector('#salary-filters');
    if (!salaryFilters) return;
    
    if (!window.AppState || !window.t) {
      console.warn('AppState or t() not available for filters');
      return;
    }
    
    salaryFilters.innerHTML = `
      <label class="filter-field">
        <span>${window.t('filter-from')}</span>
        <input type="date" data-filter="salary-date-from">
      </label>
      <label class="filter-field">
        <span>${window.t('filter-to')}</span>
        <input type="date" data-filter="salary-date-to">
      </label>
      <div class="filter-field">
        <button type="button" class="primary" data-filter-apply="salaries">${window.t('action-apply')}</button>
      </div>
    `;

    const fromInput = salaryFilters.querySelector('[data-filter="salary-date-from"]');
    const toInput = salaryFilters.querySelector('[data-filter="salary-date-to"]');
    if (!window.AppState.filters) window.AppState.filters = {};
    if (!window.AppState.filters.salaries) window.AppState.filters.salaries = {};
    if (fromInput) fromInput.value = window.AppState.filters.salaries.dateFrom || '';
    if (toInput) toInput.value = window.AppState.filters.salaries.dateTo || '';

    if (!salaryFilters.dataset.bound) {
      salaryFilters.dataset.bound = 'true';
      salaryFilters.addEventListener('change', (event) => {
        const target = event.target;
        if (!(target instanceof HTMLInputElement || target instanceof HTMLSelectElement)) return;
        const filter = target.getAttribute('data-filter');
        if (!filter) return;
        if (!window.AppState.filters) window.AppState.filters = {};
        if (!window.AppState.filters.salaries) window.AppState.filters.salaries = {};
        if (filter === 'salary-date-from') window.AppState.filters.salaries.dateFrom = target.value;
        if (filter === 'salary-date-to') window.AppState.filters.salaries.dateTo = target.value;
      });
      salaryFilters.addEventListener('click', (e) => {
        const btn = e.target.closest?.('[data-filter-apply="salaries"]');
        if (!btn) return;
        const fromEl = salaryFilters.querySelector('[data-filter="salary-date-from"]');
        const toEl = salaryFilters.querySelector('[data-filter="salary-date-to"]');
        if (!window.AppState.filters) window.AppState.filters = {};
        if (!window.AppState.filters.salaries) window.AppState.filters.salaries = {};
        window.AppState.filters.salaries.dateFrom = fromEl?.value || '';
        window.AppState.filters.salaries.dateTo = toEl?.value || '';
        if (window.renderSalaries) window.renderSalaries();
      });
    }
  };

  // Setup all filters
  window.setupAllFilters = () => {
    if (!window.AppState) {
      console.warn('AppState not available, retrying filter setup...');
      setTimeout(window.setupAllFilters, 200);
      return;
    }
    window.setupManagementFilters();
    window.setupPaymentFilters();
    window.setupSalaryFilters();
  };
})();
