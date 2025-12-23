// Internationalization (i18n) Module
// Contains translations and translation functions

// Import state (must be loaded first)
if (typeof AppState === 'undefined') {
  console.error('AppState not loaded. Load state.js first.');
}

// Full translation object (Albanian and English)
window.i18nData = {
  sq: {
    'nav-dashboard': 'Dashboard',
    'dashboard-title': 'Dashboard',
    'dashboard-subtitle': 'Pasqyrë e përgjithshme e sistemit',
    'dashboard-quick-actions': 'Veprime të shpejta',
    'dashboard-add-course': 'Shto Kurs',
    'dashboard-add-class': 'Shto Klasë',
    'dashboard-add-student': 'Shto Student',
    'dashboard-add-professor': 'Shto Profesor',
    'dashboard-add-invoice': 'Shto Faturë',
    'dashboard-add-salary': 'Shto Pagë',
    'dashboard-recent-activity': 'Aktiviteti i fundit',
    'nav-courses': 'Kurse',
    'nav-classes': 'Klasa',
    'nav-students': 'Studentë',
    'nav-professors': 'Profesorë',
    'nav-management': 'Menaxhim',
    'nav-payments': 'Pagesa',
    'nav-salaries': 'Paga',
    'nav-settings': 'Cilësime',
    'action-language': 'Shqip',
    'action-logout': 'Dalje',
    'registrations-courses': 'Lista e kurseve',
    'registrations-classes': 'Lista e klasave',
    'registrations-students': 'Lista e studentëve',
    'registrations-professors': 'Lista e profesorëve',
    'management-title': 'Menaxhim',
    'management-subtitle': 'Pasqyrë e përgjithshme dhe detajet e klasave.',
    'payments-title': 'Pagesa mujore',
    'payments-subtitle': 'Monitoro faturat e studentëve dhe statuset mujore.',
    'salaries-title': 'Paga profesorëve',
    'salaries-subtitle': 'Avancat, borxhet dhe bilanci mujor për profesorët.',
    'settings-title': 'Cilësime',
    'settings-subtitle': 'Personalizo preferencat e platformës.',
    'table-id': 'ID',
    'table-name': 'Emër',
    'table-level': 'Nivel',
    'table-price': 'Çmim',
    'table-updated': 'Përditësuar',
    'table-actions': 'Veprime',
    'table-course': 'Kursi',
    'table-period': 'Periudha',
    'table-professors': 'Profesorët',
    'table-students': 'Studentët',
    'table-class': 'Klasa',
    'table-student': 'Studenti',
    'table-month': 'Muaji',
    'table-amount': 'Shuma',
    'table-status': 'Statusi',
    'table-confirmed': 'Konfirmuar',
    'table-receipt': 'Faturë',
    'table-professor': 'Profesori',
    'table-advances': 'Avancat',
    'table-balance': 'Bilanci',
    'table-contact': 'Kontakt',
    'table-education': 'Arsimimi',
    'table-salary': 'Paga bazë',
    'table-national': 'NID',
    'table-age': 'Mosha',
    'table-registered': 'Regjistruar',
    'action-add-course': 'Shto kurs',
    'action-add-class': 'Shto klasë',
    'action-add-student': 'Shto student',
    'action-add-professor': 'Shto profesor',
    'action-add-invoice': 'Faturë e re',
    'action-add-salary': 'Deklaratë e re',
    'action-save': 'Ruaj',
    'action-cancel': 'Anulo',
    'action-save-settings': 'Ruaj ndryshimet',
    'action-edit': 'Ndrysho',
    'action-delete': 'Fshi',
    'confirm-delete': 'A jeni i sigurt që doni të fshini këtë element?',
    'action-print': 'Printo',
    'action-close': 'Mbyll',
    'label-due': 'Detyrimi',
    'label-paid': 'Paguar',
    'toast-saved': 'U ruajt me sukses.',
    'toast-deleted': 'U fshi me sukses.',
    'toast-error': 'Ndodhi një gabim. Provo përsëri.',
  },
  en: {
    'nav-dashboard': 'Dashboard',
    'dashboard-title': 'Dashboard',
    'dashboard-subtitle': 'System overview',
    'dashboard-quick-actions': 'Quick Actions',
    'dashboard-add-course': 'Add Course',
    'dashboard-add-class': 'Add Class',
    'dashboard-add-student': 'Add Student',
    'dashboard-add-professor': 'Add Professor',
    'dashboard-add-invoice': 'Add Invoice',
    'dashboard-add-salary': 'Add Salary',
    'dashboard-recent-activity': 'Recent Activity',
    'nav-courses': 'Courses',
    'nav-classes': 'Classes',
    'nav-students': 'Students',
    'nav-professors': 'Professors',
    'nav-management': 'Management',
    'nav-payments': 'Payments',
    'nav-salaries': 'Salaries',
    'nav-settings': 'Settings',
    'action-language': 'English',
    'action-logout': 'Log out',
    'registrations-courses': 'Course list',
    'registrations-classes': 'Class list',
    'registrations-students': 'Student list',
    'registrations-professors': 'Professor list',
    'management-title': 'Management',
    'management-subtitle': 'Overview and class details.',
    'payments-title': 'Monthly payments',
    'payments-subtitle': 'Track student invoices and monthly statuses.',
    'salaries-title': 'Teacher salaries',
    'salaries-subtitle': 'Advances, debts, and monthly balance for teachers.',
    'settings-title': 'Settings',
    'settings-subtitle': 'Customize platform preferences.',
    'table-id': 'ID',
    'table-name': 'Name',
    'table-level': 'Level',
    'table-price': 'Price',
    'table-updated': 'Updated',
    'table-actions': 'Actions',
    'table-course': 'Course',
    'table-period': 'Period',
    'table-professors': 'Professors',
    'table-students': 'Students',
    'table-class': 'Class',
    'table-student': 'Student',
    'table-month': 'Month',
    'table-amount': 'Amount',
    'table-status': 'Status',
    'table-confirmed': 'Confirmed',
    'table-receipt': 'Receipt',
    'table-professor': 'Professor',
    'table-advances': 'Advances',
    'table-balance': 'Balance',
    'table-contact': 'Contact',
    'table-education': 'Education',
    'table-salary': 'Base salary',
    'table-national': 'NID',
    'table-age': 'Age',
    'table-registered': 'Registered',
    'action-add-course': 'Add course',
    'action-add-class': 'Add class',
    'action-add-student': 'Add student',
    'action-add-professor': 'Add professor',
    'action-add-invoice': 'New invoice',
    'action-add-salary': 'New statement',
    'action-save': 'Save',
    'action-cancel': 'Cancel',
    'action-save-settings': 'Save changes',
    'action-edit': 'Edit',
    'action-delete': 'Delete',
    'confirm-delete': 'Are you sure you want to delete this item?',
    'action-print': 'Print',
    'action-close': 'Close',
    'label-due': 'Due',
    'label-paid': 'Paid',
    'toast-saved': 'Saved successfully.',
    'toast-deleted': 'Deleted successfully.',
    'toast-error': 'Something went wrong. Try again.',
  }
};

// Translation function - gets translation for current language
window.t = (key) => {
  if (!AppState) return key;
  return window.i18nData[AppState.lang]?.[key] ?? window.i18nData.sq[key] ?? key;
};

// Apply translations to all elements with data-i18n attribute
window.applyTranslations = () => {
  document.querySelectorAll('[data-i18n]').forEach((el) => {
    const key = el.getAttribute('data-i18n');
    const translated = window.t(key);
    if (translated && translated !== key) {
      const hasChildren = el.children.length > 0;
      if (hasChildren) {
        const span = el.querySelector('span');
        if (span) {
          span.textContent = translated;
        } else {
          const textNodes = Array.from(el.childNodes).filter(node => node.nodeType === Node.TEXT_NODE);
          if (textNodes.length > 0) {
            textNodes[0].textContent = translated;
          } else {
            el.textContent = translated;
          }
        }
      } else {
        el.textContent = translated;
      }
    }
  });

  // Apply placeholder translations
  document.querySelectorAll('[data-i18n-placeholder]').forEach((el) => {
    const key = el.getAttribute('data-i18n-placeholder');
    const translated = window.t(key);
    if (translated && (el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement)) {
      el.placeholder = translated;
    }
  });

  if (AppState) {
    document.documentElement.lang = AppState.lang;
  }
};

// Language management
window.saveLang = (lang) => {
  try {
    localStorage.setItem('btsms_lang', lang);
  } catch (_) { /* ignore */ }
  if (AppState) {
    AppState.langFromStorage = true;
  }
};

window.loadLang = () => {
  try {
    const stored = localStorage.getItem('btsms_lang');
    if (stored && ['sq', 'en'].includes(stored) && AppState) {
      AppState.lang = stored;
      AppState.langFromStorage = true;
      return;
    }
  } catch (_) { /* ignore */ }
  if (AppState) {
    AppState.langFromStorage = false;
  }
};
