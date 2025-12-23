// Shared Application State
// This file contains the global application state object

window.AppState = {
  lang: 'sq',
  langFromStorage: false,
  page: 'login',
  email: '',
  data: {
    courses: [],
    classes: [],
    students: [],
    professors: [],
    stats: {},
    invoices: [],
    salaries: [],
    settings: {
      app: {
        currency: 'EUR',
      },
      security: {},
    },
  },
  recentInvoiceMeta: {}, // { [public_id]: { tax, batchId } }
  filters: {
    // List filters
    payments: { dateFrom: '', dateTo: '' },
    salaries: { dateFrom: '', dateTo: '' },
    management: { dateFrom: '', dateTo: '' },
    reports: { dateFrom: '', dateTo: '', status: 'all', course: '', professor: '' },
    // Column filters for quick navigation inside tables
    columns: {
      courses: { id: '', name: '', level: '', price: '', updated: '' },
      classes: { id: '', name: '', course: '', level: '', period: '', price: '', professors: '', students: '' },
      students: { id: '', name: '', nid: '', contact: '', age: '', registered: '' },
      professors: { id: '', name: '', contact: '', education: '', salary: '' },
      payments: { id: '', student: '', class: '', month: '', paid: '', status: '', confirmed: '' },
      salaries: { id: '', professor: '', class: '', month: '', paid: '', advances: '', status: '' },
    },
  },
  settingsUnlocked: false,
  settingsPin: '',
};

// Recent invoice meta persistence
const RECENT_INV_META_KEY = 'btsms_recent_inv_meta_v1';
window.persistRecentInvoiceMeta = () => {
  try {
    if (!window.AppState) return;
    const payload = { v: 1, ts: Date.now(), data: window.AppState.recentInvoiceMeta };
    localStorage.setItem(RECENT_INV_META_KEY, JSON.stringify(payload));
  } catch (_) { /* ignore */ }
};

window.loadRecentInvoiceMeta = () => {
  try {
    if (!window.AppState) return;
    const raw = localStorage.getItem(RECENT_INV_META_KEY);
    if (!raw) return;
    const parsed = JSON.parse(raw);
    if (parsed && parsed.data && typeof parsed.data === 'object') {
      window.AppState.recentInvoiceMeta = parsed.data;
    }
  } catch (_) { /* ignore */ }
};

window.pruneRecentInvoiceMeta = (existingIds) => {
  if (!window.AppState) return;
  const now = Date.now();
  const keep = {};
  const idsSet = new Set(existingIds || []);
  Object.entries(window.AppState.recentInvoiceMeta || {}).forEach(([id, meta]) => {
    const ageOk = meta && typeof meta.ts === 'number' ? (now - meta.ts) < (48 * 3600 * 1000) : true;
    if (idsSet.has(id) || ageOk) keep[id] = meta;
  });
  window.AppState.recentInvoiceMeta = keep;
  window.persistRecentInvoiceMeta();
};
