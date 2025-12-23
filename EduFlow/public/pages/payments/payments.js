// Payments Page JavaScript
// Handles student invoices and payments

(function() {
  'use strict';

  // Render payments table
  window.renderPayments = () => {
    const tbody = document.querySelector('#payments-table tbody');
    if (!tbody) {
      console.warn('Payments table tbody not found');
      return;
    }

    // Ensure AppState is available
    if (!window.AppState) {
      console.warn('AppState not available for renderPayments');
      tbody.innerHTML = '<tr><td colspan="9" class="no-data">Loading AppState...</td></tr>';
      return;
    }
    
    if (!window.AppState.data) {
      console.warn('AppState.data not available for renderPayments');
      tbody.innerHTML = '<tr><td colspan="9" class="no-data">Loading data...</td></tr>';
      return;
    }
    
    // Ensure invoices array exists
    if (!window.AppState.data.invoices) {
      window.AppState.data.invoices = [];
    }

    const { dateFrom, dateTo } = window.AppState.filters.payments || {};
    
    // Normalize date range if reversed
    let from = dateFrom || '';
    let to = dateTo || '';
    if (from && to && from > to) {
      [from, to] = [to, from];
      if (!window.AppState.filters) window.AppState.filters = {};
      if (!window.AppState.filters.payments) window.AppState.filters.payments = {};
      window.AppState.filters.payments.dateFrom = from;
      window.AppState.filters.payments.dateTo = to;
    }

    // Filter invoices by date range
    let filtered = (window.AppState.data.invoices || []).filter((invoice) => {
      const dateStr = invoice.confirmed_at || invoice.created_at || (invoice.plan_month ? `${invoice.plan_month}-01` : '');
      if (!dateStr || (!from && !to)) return true;
      const d = window.toDateObj(dateStr);
      if (!d) return true;
      const fromOk = from ? (d >= new Date(`${from}T00:00:00`)) : true;
      const toOk = to ? (d <= new Date(`${to}T23:59:59`)) : true;
      return fromOk && toOk;
    });

    // Apply column filters
    const cf = window.AppState.filters.columns.payments || {};
    filtered = filtered.filter((invoice) => {
      const confirmedLabel = invoice.confirmed_at ? window.formatDate(invoice.confirmed_at) : '—';
      const monthLabel = window.formatMonth(invoice.plan_month);
      return (
        window.textIncludes(invoice.public_id, cf.id || '') &&
        window.textIncludes(invoice.student_public_id, cf.student || '') &&
        window.textIncludes(invoice.class_public_id, cf.class || '') &&
        window.textIncludes(monthLabel, cf.month || '') &&
        window.textIncludes(window.formatCurrency(invoice.paid_amount), cf.paid || '') &&
        window.textIncludes(window.t('status-' + invoice.status), cf.status || '') &&
        window.textIncludes(confirmedLabel, cf.confirmed || '')
      );
    });

    if (!filtered.length) {
      tbody.innerHTML = `<tr><td colspan="9">—</td></tr>`;
      return;
    }

    tbody.innerHTML = filtered
      .map((invoice) => {
        const statusClass = invoice.status === 'paid' ? 'paid' : invoice.status === 'partial' ? 'partial' : 'due';
        return `
          <tr data-entity="invoice" data-id="${invoice.public_id}">
            <td>${invoice.public_id}</td>
            <td>${invoice.student_public_id}</td>
            <td>${invoice.class_public_id}</td>
            <td>${window.formatMonth(invoice.plan_month)}</td>
            <td>${window.formatCurrency(invoice.due_amount)}</td>
            <td>${window.formatCurrency(invoice.paid_amount)}</td>
            <td><span class="status-chip ${statusClass}">${window.t('status-' + invoice.status)}</span></td>
            <td>${invoice.confirmed_at ? window.formatDate(invoice.confirmed_at) : '—'}</td>
            <td><button type="button" data-action="print" data-entity="invoice" data-id="${invoice.public_id}">${window.t('action-print')}</button></td>
          </tr>
        `;
      })
      .join('');
    
    // Ensure header filters after rendering
    if (window.ensureHeaderFilters) {
      setTimeout(() => window.ensureHeaderFilters('payments'), 50);
    }
  };

  // Initialize payments page
  window.initPaymentsPage = () => {
    if (!window.AppState) {
      console.warn('AppState not available yet, retrying initialization...');
      setTimeout(() => window.initPaymentsPage(), 200);
      return;
    }
    
    // Setup filters
    if (window.setupPaymentFilters) {
      window.setupPaymentFilters();
    }
    
    window.renderPayments();
  };

  // Auto-initialize when payments section exists (it will be active if it's the loaded page)
  // NOTE: This will be called by renderAll() after data is loaded, so we don't need to auto-init here
  // But we keep it as a fallback in case renderAll doesn't call it
  const checkAndInit = () => {
    const paymentsSection = document.querySelector('[data-section="payments"]');
    if (paymentsSection && paymentsSection.classList.contains('active')) {
      // Wait for AppState and data to be available
      const waitForData = () => {
        if (window.AppState && window.AppState.data && window.AppState.data.invoices !== undefined) {
          // Data is loaded, initialize only if not already initialized
          if (!paymentsSection.dataset.initialized) {
            paymentsSection.dataset.initialized = 'true';
            window.initPaymentsPage();
          }
        } else {
          // Retry after a short delay (max 10 seconds)
          if (!paymentsSection.dataset.initAttempts) {
            paymentsSection.dataset.initAttempts = '0';
          }
          const attempts = parseInt(paymentsSection.dataset.initAttempts) || 0;
          if (attempts < 50) { // 50 * 200ms = 10 seconds max
            paymentsSection.dataset.initAttempts = String(attempts + 1);
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
        if (target.classList.contains('active') && target.dataset.section === 'payments') {
          window.renderPayments();
        }
      }
    });
  });

  const paymentsSection = document.querySelector('[data-section="payments"]');
  if (paymentsSection) {
    observer.observe(paymentsSection, { attributes: true });
  }
})();
