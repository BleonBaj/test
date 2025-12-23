const App = (() => {
  const state = {
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

  // Persist recent invoice meta locally to keep grouping consistent across refreshes
  const RECENT_INV_META_KEY = 'btsms_recent_inv_meta_v1';
  const persistRecentInvoiceMeta = () => {
    try {
      const payload = { v: 1, ts: Date.now(), data: state.recentInvoiceMeta };
      localStorage.setItem(RECENT_INV_META_KEY, JSON.stringify(payload));
    } catch (_) { /* ignore */ }
  };
  const loadRecentInvoiceMeta = () => {
    try {
      const raw = localStorage.getItem(RECENT_INV_META_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw);
      if (parsed && parsed.data && typeof parsed.data === 'object') {
        state.recentInvoiceMeta = parsed.data;
      }
    } catch (_) { /* ignore */ }
  };
  const pruneRecentInvoiceMeta = (existingIds) => {
    // Keep only entries that still exist on server or are very recent (< 48h)
    const now = Date.now();
    const keep = {};
    const idsSet = new Set(existingIds || []);
    Object.entries(state.recentInvoiceMeta || {}).forEach(([id, meta]) => {
      const ageOk = meta && typeof meta.ts === 'number' ? (now - meta.ts) < (48 * 3600 * 1000) : true;
      if (idsSet.has(id) || ageOk) keep[id] = meta;
    });
    state.recentInvoiceMeta = keep;
    persistRecentInvoiceMeta();
  };

  const i18n = {
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
      'nav-registrations': 'Regjistrime',
      'nav-management': 'Menaxhim',
      'nav-payments': 'Pagesa',
      'nav-salaries': 'Paga',
      'nav-settings': 'Cilësime',
      'action-language': 'Shqip',
      'action-logout': 'Dalje',
      'registrations-title': 'Regjistrime',
      'registrations-subtitle': 'Krijo dhe menaxho kurset, klasat, studentët dhe profesorët.',
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
      'settings-app-title': 'Parametrat e aplikacionit',
      'settings-security-title': 'Siguria',
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
      'table-debts': 'Borgjet',
      'table-payments': 'Pagesat e konfirmuara',
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
      'label-course-name': 'Emri i kursit',
      'label-course-level': 'Niveli',
      'label-course-price': 'Çmimi',
      'label-pin': 'PIN i menaxhimit',
      'label-description': 'Përshkrimi',
      'label-class-course': 'Kursi',
      'label-class-name': 'Emri i klasës',
      'label-class-level': 'Niveli',
      'label-class-start': 'Data e fillimit',
      'label-class-end': 'Data e mbarimit',
      'label-class-price': 'Pagesa mujore',
      'label-class-schedule': 'Orari (një për rresht)',
      'label-class-professors': 'Profesorët',
      'label-class-students': 'Studentët',
      'label-class-plan': 'Plani mujor (muaji;shuma;data;shënime)',
      'label-first-name': 'Emri',
      'label-last-name': 'Mbiemri',
      'label-national-id': 'Numri i identitetit',
      'label-phone': 'Telefoni',
      'label-age': 'Mosha',
      'label-registration-date': 'Data e regjistrimit',
      'label-address': 'Adresa',
      'label-notes': 'Shënime',
      'label-email': 'Email',
      'label-salary-type': 'Tipi i pagesës',
      'label-base-salary': 'Paga bazë',
      'label-education': 'Arsimimi',
      'label-biography': 'Biografia',
      'label-student': 'Studenti',
      'label-class': 'Klasa',
      'label-month': 'Muaji',
      'label-amount': 'Shuma',
      'label-paid': 'Paguar',
      'label-status': 'Statusi',
      'label-tax': 'Tarifa tatimore',
      'tax-none': 'Pa Tatim',
      'tax-vat8': 'Tvsh 8%',
      'tax-vat18': 'Tvsh 18%',
      'tax-exempt': 'Tvsh e Liruar',
      'label-confirmed-by': 'Konfirmuar nga',
      'label-professor': 'Profesori',
      'label-advances': 'Avancat',
      'label-balance': 'Bilanci',
      'label-management-pin': 'PIN i menaxhimit',
      'label-default-language': 'Gjuha e paracaktuar',
      'label-currency': 'Monedha',
      'label-pin-confirm': 'PIN i menaxhimit',
      'label-password': 'Fjalëkalimi',
      'help-multiselect': 'Mbaj CTRL ose CMD për të zgjedhur disa.',
      'help-plan-format': 'Format: YYYY-MM;shuma;YYYY-MM-DD;shënime (opsionale) për rresht.',
      'modal-course-title': 'Kurs i ri',
      'modal-class-title': 'Klasë e re',
      'modal-student-title': 'Student i ri',
      'modal-professor-title': 'Profesor i ri',
      'modal-invoice-title': 'Faturë student',
      'modal-salary-title': 'Deklaratë page',
      'modal-invoice-details-title': 'Detajet e pagesës',
      'modal-class-details-title': 'Detajet e klasës',
      'class-details-basic': 'Informacione bazë',
      'class-details-schedule': 'Orari',
      'class-details-professors': 'Profesorët',
      'class-details-students': 'Studentët',
      'class-details-description': 'Përshkrimi',
      'class-details-payment-plan': 'Plani i pagesave',
      'class-details-invoices': 'Pagesat / Faturat',
      'label-class-period': 'Periudha',
      'action-close': 'Mbyll',
      'status-paid': 'Paguar',
      'status-due': 'Borxh',
      'status-partial': 'Partial',
      'filter-status': 'Statusi',
      'filter-month': 'Muaji',
      'filter-professor': 'Profesori',
      'filter-all': 'Të gjitha',
      'filter-from': 'Nga',
      'filter-to': 'Deri',
      'action-apply': 'Apliko',
      'login-title': 'Qasja në platformë',
      'login-subtitle': 'Hyni në llogarinë tuaj për të vazhduar',
      'action-login': 'Hyr',
      'login-success': 'Autentikimi u krye me sukses. Po të ridrejtojmë...',
      'login-error': 'Email ose fjalëkalim i pasaktë.',
      'invalid_credentials': 'Username ose password i gabuar.',
      'link-forgot-password': 'Keni harruar fjalëkalimin?',
      'forgot-password-title': 'Rivendosja e fjalëkalimit',
      'verify-code-title': 'Verifikimi i kodit',
      'verify-code-description': 'Shkruaj kod-in që u dërgua në email',
      'reset-password-title': 'Rivendos fjalëkalimin',
      'reset-password-description': 'Shkruaj fjalëkalimin e ri',
      'action-send-code': 'Dërgo kod',
      'action-reset-password': 'Rivendos fjalëkalimin',
      'action-verify': 'Verifiko',
      'action-cancel': 'Anulo',
      'action-resend-code': 'Dërgo kodin përsëri',
      '2fa-verify-title': 'Verifikim me kod',
      '2fa-verify-description': 'Shkruani kod-in 6-shifror që u dërgua në email-in tuaj.',
      'label-username': 'Përdoruesi',
      'label-email': 'Email',
      'label-verification-code': 'Kodi i verifikimit',
      'label-new-password': 'Fjalëkalimi i ri',
      'label-confirm-password': 'Konfirmo fjalëkalimin',
      'toast-saved': 'U ruajt me sukses.',
      'toast-deleted': 'U fshi me sukses.',
      'toast-error': 'Ndodhi një gabim. Provo përsëri.',
      'error-invalid-pin': 'PIN i menaxhimit është i pasaktë.',
      'error-invalid-course': 'Kursi i selektuar është i pavlefshëm. Zgjidhni një kurs të vlefshëm.',
      'error-missing-pin': 'PIN i menaxhimit kërkohet për këtë veprim.',
      'error-database_error': 'Gabim në bazën e të dhënave. Kontrolloni log-et e serverit.',
      'error-duplicate_class': 'Një klasë me këtë ID ekziston tashmë.',
      'error-server_error': 'Gabim në server. Provo përsëri.',
      'error-cannot_delete': 'Nuk mund të fshihet. Ka të dhëna të varura.',
      'error-not_found': 'Nuk u gjet.',
      'action-refresh': 'Rifresko',
      // Receipt VAT breakdown
      'receipt-net-total': 'Totali pa TVSH',
      'receipt-vat': 'TVSH',
      'receipt-gross-total': 'Totali me TVSH',
      // Settings
      'settings-business-title': 'Të dhënat e biznesit',
      'label-company-name': 'Emri i kompanisë',
      'label-company-address': 'Adresa',
      'label-company-phone': 'Telefoni',
      'label-company-email': 'Email',
      'label-company-tax-id': 'NIPT / Nr. fiskal',
      'label-company-logo-url': 'Logo (URL ose rrugë relative)',
      'label-company-logo-upload': 'Logo (ngarko skedar)',
      'action-upload-logo': 'Ngarko logon',
      'help-logo-upload': 'Zgjidh skedarin dhe kliko "Ngarko logon"',
      'placeholder-company-name': 'Emri i kompanisë',
      'placeholder-address': 'Rruga, Qyteti, Kodi postar',
      'placeholder-phone': '+355 ...',
      'placeholder-email': 'info@example.com',
      'placeholder-tax-id': 'NIPT',
      'placeholder-logo-url': 'p.sh. uploads/logo.png',
      'placeholder-currency': 'EUR',
      'btn-pin-management': 'Menaxhimi i PASSCODE (PIN)',
      // PIN Management Modal
      'modal-pin-verify-title': 'Verifikim me kod',
      'modal-pin-verify-description': 'Shkruani kod-in që u dërgua në email-in tuaj për të hyrë në menaxhimin e PASSCODE.',
      'modal-pin-management-title': 'Menaxhimi i PASSCODE (PIN)',
      'modal-pin-management-description': 'Kontrollo çfarë veprimesh kërkojnë PASSCODE për verifikim. Aktivizo ose çaktivizo për çdo veprim.',
      'label-verification-code': 'Kodi i verifikimit',
      'help-verification-code': 'Kodi u dërgua në email-in tuaj',
      'action-verify': 'Verifiko',
      'action-resend-code': 'Dërgo kodin përsëri',
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
      'nav-registrations': 'Registrations',
      'nav-management': 'Management',
      'nav-payments': 'Payments',
      'nav-salaries': 'Salaries',
      'nav-settings': 'Settings',
      'action-language': 'English',
      'action-logout': 'Log out',
      'registrations-title': 'Registrations',
      'registrations-subtitle': 'Create and manage courses, classes, students, and professors.',
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
      'settings-app-title': 'Application parameters',
      'settings-security-title': 'Security',
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
      'table-debts': 'Debts',
      'table-payments': 'Confirmed payments',
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
      'label-course-name': 'Course name',
      'label-course-level': 'Level',
      'label-course-price': 'Price',
      'label-pin': 'Management PIN',
      'label-description': 'Description',
      'label-class-course': 'Course',
      'label-class-name': 'Class name',
      'label-class-level': 'Level',
      'label-class-start': 'Start date',
      'label-class-end': 'End date',
      'label-class-price': 'Monthly fee',
      'label-class-schedule': 'Schedule (one per line)',
      'label-class-professors': 'Professors',
      'label-class-students': 'Students',
      'label-class-plan': 'Monthly plan (month;amount;date;notes)',
      'label-first-name': 'First name',
      'label-last-name': 'Last name',
      'label-national-id': 'National ID',
      'label-phone': 'Phone',
      'label-age': 'Age',
      'label-registration-date': 'Registration date',
      'label-address': 'Address',
      'label-notes': 'Notes',
      'label-email': 'Email',
      'label-salary-type': 'Salary type',
      'label-base-salary': 'Base salary',
      'label-education': 'Education',
      'label-biography': 'Biography',
      'label-student': 'Student',
      'label-class': 'Class',
      'label-month': 'Month',
      'label-amount': 'Amount',
      'label-paid': 'Paid',
      'label-status': 'Status',
      'label-tax': 'Tax rate',
      'tax-none': 'No Tax',
      'tax-vat8': 'VAT 8%',
      'tax-vat18': 'VAT 18%',
      'tax-exempt': 'VAT Exempt',
      'label-confirmed-by': 'Confirmed by',
      'label-professor': 'Professor',
      'label-advances': 'Advances',
      'label-balance': 'Balance',
      'label-management-pin': 'Management PIN',
      'label-default-language': 'Default language',
      'label-currency': 'Currency',
      'label-pin-confirm': 'Management PIN',
      'help-multiselect': 'Hold CTRL or CMD to pick more.',
      'help-plan-format': 'Format: YYYY-MM;amount;YYYY-MM-DD;notes (optional) per line.',
      'modal-course-title': 'New course',
      'modal-class-title': 'New class',
      'modal-student-title': 'New student',
      'modal-professor-title': 'New professor',
      'modal-invoice-title': 'Student invoice',
      'modal-salary-title': 'Salary statement',
      'modal-invoice-details-title': 'Payment Details',
      'modal-class-details-title': 'Class Details',
      'class-details-basic': 'Basic Information',
      'class-details-schedule': 'Schedule',
      'class-details-professors': 'Professors',
      'class-details-students': 'Students',
      'class-details-description': 'Description',
      'class-details-payment-plan': 'Payment Plan',
      'class-details-invoices': 'Payments / Invoices',
      'label-class-period': 'Period',
      'action-close': 'Close',
      'status-paid': 'Paid',
      'status-due': 'Due',
      'status-partial': 'Partial',
      'filter-status': 'Status',
      'filter-month': 'Month',
      'filter-professor': 'Professor',
      'filter-all': 'All',
      'filter-from': 'From',
      'filter-to': 'To',
      'action-apply': 'Apply',
      'login-title': 'Platform access',
      'login-subtitle': 'Sign in to your account to continue',
      'label-password': 'Password',
      'action-login': 'Sign in',
      'login-success': 'Login successful. Redirecting...',
      'login-error': 'Invalid email or password.',
      'invalid_credentials': 'Invalid username or password.',
      'link-forgot-password': 'Forgot password?',
      'forgot-password-title': 'Password Reset',
      'verify-code-title': 'Code Verification',
      'verify-code-description': 'Enter the code sent to your email',
      'reset-password-title': 'Reset Password',
      'reset-password-description': 'Enter your new password',
      'action-send-code': 'Send Code',
      'action-reset-password': 'Reset Password',
      'action-verify': 'Verify',
      'action-cancel': 'Cancel',
      'action-resend-code': 'Resend Code',
      '2fa-verify-title': 'Verification Code',
      '2fa-verify-description': 'Enter the 6-digit code sent to your email.',
      'label-username': 'Username',
      'label-email': 'Email',
      'label-verification-code': 'Verification Code',
      'label-new-password': 'New Password',
      'label-confirm-password': 'Confirm Password',
      'toast-saved': 'Saved successfully.',
      'toast-deleted': 'Deleted successfully.',
      'toast-error': 'Something went wrong. Try again.',
      'error-invalid-pin': 'Management PIN is incorrect.',
      'error-invalid-course': 'Selected course is invalid. Please select a valid course.',
      'error-missing-pin': 'Management PIN is required for this action.',
      'error-database_error': 'Database error. Please check server logs.',
      'error-duplicate_class': 'A class with this ID already exists.',
      'error-server_error': 'Server error. Please try again.',
      'error-cannot_delete': 'Cannot delete. Has dependent data.',
      'error-not_found': 'Not found.',
      'action-refresh': 'Refresh',
      // Receipt VAT breakdown
      'receipt-net-total': 'Total without VAT',
      'receipt-vat': 'VAT',
      'receipt-gross-total': 'Total with VAT',
      // Settings
      'settings-business-title': 'Business Information',
      'label-company-name': 'Company name',
      'label-company-address': 'Address',
      'label-company-phone': 'Phone',
      'label-company-email': 'Email',
      'label-company-tax-id': 'Tax ID / Fiscal number',
      'label-company-logo-url': 'Logo (URL or relative path)',
      'label-company-logo-upload': 'Logo (upload file)',
      'action-upload-logo': 'Upload logo',
      'help-logo-upload': 'Select file and click "Upload logo"',
      'placeholder-company-name': 'Company name',
      'placeholder-address': 'Street, City, Postal code',
      'placeholder-phone': '+1 ...',
      'placeholder-email': 'info@example.com',
      'placeholder-tax-id': 'Tax ID',
      'placeholder-logo-url': 'e.g. uploads/logo.png',
      'placeholder-currency': 'USD',
      'btn-pin-management': 'PASSCODE (PIN) Management',
      // PIN Management Modal
      'modal-pin-verify-title': 'Verification with code',
      'modal-pin-verify-description': 'Enter the code sent to your email to access PASSCODE management.',
      'modal-pin-management-title': 'PASSCODE (PIN) Management',
      'modal-pin-management-description': 'Control which actions require PASSCODE for verification. Enable or disable for each action.',
      'label-verification-code': 'Verification code',
      'help-verification-code': 'Code was sent to your email',
      'action-verify': 'Verify',
      'action-resend-code': 'Resend code',
    },
  };

  const toast = {
    el: null,
    timeout: 0,
  };

  const t = (key) => i18n[state.lang]?.[key] ?? i18n.sq[key] ?? key;

  const detectPage = () => {
    const main = document.querySelector('main');
    state.page = main && main.dataset.page === 'dashboard' ? 'dashboard' : 'login';
  };

  const saveLang = (lang) => {
    try {
      localStorage.setItem('btsms_lang', lang);
    } catch (_) {
      /* ignore */
    }
    state.langFromStorage = true;
  };

  const loadLang = () => {
    try {
      const stored = localStorage.getItem('btsms_lang');
      if (stored && ['sq', 'en'].includes(stored)) {
        state.lang = stored;
        state.langFromStorage = true;
        return;
      }
    } catch (_) {
      /* ignore */
    }
    state.langFromStorage = false;
  };

  const applyTranslations = () => {
    document.querySelectorAll('[data-i18n]').forEach((el) => {
      const key = el.getAttribute('data-i18n');
      const translated = t(key);
      if (translated && translated !== key) {
        // If element has child elements (like <span>), update only the text node or first text node
        const hasChildren = el.children.length > 0;
        if (hasChildren) {
          // Find the first text node or span element and update it
          const span = el.querySelector('span');
          if (span) {
            span.textContent = translated;
          } else {
            // If no span, update the element's text content but preserve structure
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
      const translated = t(key);
      if (translated && el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement) {
        el.placeholder = translated;
      }
    });

    document.documentElement.lang = state.lang;
  };

  const toggleLanguage = () => {
    state.lang = state.lang === 'sq' ? 'en' : 'sq';
    saveLang(state.lang);
    applyTranslations();
    renderAll();
  };

  const bindLanguageToggle = () => {
    const toggle = document.querySelector('#lang-toggle');
    if (toggle) {
      toggle.addEventListener('click', toggleLanguage);
    }
    const refresh = document.querySelector('#global-refresh');
    if (refresh) {
      refresh.addEventListener('click', () => {
        // Perform a full page reload to ensure everything resets
        try {
          // Prefer a cache-busting reload
          const u = new URL(window.location.href);
          u.searchParams.set('ts', String(Date.now()));
          window.location.replace(u.toString());
        } catch (_) {
          // Fallback
          window.location.reload();
        }
      });
    }
  };

  const activateSection = (section) => {
    document.querySelectorAll('.section').forEach((sec) => {
      sec.classList.toggle('active', sec.dataset.section === section);
    });
    document.querySelectorAll('.nav-btn').forEach((btn) => {
      btn.classList.toggle('active', btn.dataset.section === section);
    });

    // Show/hide toolbar based on section
    const toolbar = document.querySelector('#sub-toolbar');
    if (toolbar) {
      const sectionsWithCrud = ['management', 'payments', 'salaries'];
      if (sectionsWithCrud.includes(section)) {
        toolbar.style.display = 'flex';
      } else {
        toolbar.style.display = 'none';
      }
    }
  };

  const bindNav = () => {
    // Use delegation for better stability
    document.addEventListener('click', (e) => {
        const btn = e.target.closest('.nav-btn');
        if (!btn) return;
        
        const target = btn.dataset.section;
        if (!target) return;

        if (target === 'settings') {
          // Always require PIN on entry
          state.settingsUnlocked = false;
          state.settingsPin = '';
          openSettingsUnlockModal();
          return;
        }

        // For other sections, clear unlock state
        state.settingsUnlocked = false; 
        state.settingsPin = '';
        activateSection(target);
        
        // Mobile sidebar handling
        if (window.innerWidth <= 900) {
            document.body.classList.remove('sidebar-open');
        }
    });
  };

  // Cache CSRF token
  let csrfTokenCache = null;

  // Get CSRF token from server
  const getCsrfToken = async () => {
    if (csrfTokenCache) {
      return csrfTokenCache;
    }
    try {
      // Try csrf.php first (no auth required) - for login and public forms
      let response = await fetch('api/csrf.php', { credentials: 'same-origin' });
      if (response.ok) {
        const data = await response.json();
        csrfTokenCache = data.csrf_token || null;
        return csrfTokenCache;
      }
      // Fallback to whoami.php if authenticated (for dashboard)
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

  const apiFetch = async (url, options = {}) => {
    const config = { credentials: 'same-origin', ...options };
    config.headers = config.headers || {};

    // Add CSRF token to POST requests
    if (config.method === 'POST' || (config.method === undefined && options.body)) {
      const csrfToken = await getCsrfToken();
      if (csrfToken) {
        if (config.body instanceof FormData) {
          // For FormData, append CSRF token
          config.body.append('_csrf_token', csrfToken);
        } else if (config.body instanceof URLSearchParams) {
          // For URLSearchParams, append CSRF token
          config.body.append('_csrf_token', csrfToken);
        } else {
          // For JSON body, add CSRF token to the body object
          let bodyObj = config.body;
          if (typeof bodyObj === 'string') {
            try {
              bodyObj = JSON.parse(bodyObj);
            } catch (e) {
              // If parsing fails, treat as string and create new object
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
      if (typeof config.body === 'string') {
        // Already stringified, keep as is
      } else {
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
      // Check if this is a validation/application error that should be shown to user
      // These errors should NOT cause redirect
      const nonRedirectErrors = [
        'settings_locked', 'invalid_pin', 'invalid_username', 'missing_fields',
        'access_required', 'access_expired', 'invalid_credentials',
        'invalid_course', 'database_error', 'server_error', 'duplicate_class',
        'cannot_delete', 'invalid_token', 'invalid_code', 'unknown_action',
        'method_not_allowed', 'invalid_data', 'error', 'csrf_token_invalid'
      ];

      // If it's a validation/application error, always reject without redirect
      if (data && data.error && nonRedirectErrors.includes(data.error)) {
        return Promise.reject(data);
      }

      // If unauthorized or session expired, redirect to login quietly
      // BUT only if it's NOT a validation error
      if (response.status === 401 || response.status === 403) {
        // Check if we have error data - if yes, it's likely a validation error
        if (data && data.error) {
          // It's a validation error, don't redirect
          return Promise.reject(data);
        }
        // Real authentication error - redirect to login
        const baseMeta = document.querySelector('meta[name="app-base"]');
        const base = baseMeta?.getAttribute('content') || '';
        window.location.href = base + 'index.php';
        return Promise.reject({ error: 'unauthorized' });
      }

      // For all other errors (400, 409, 500, etc.), just reject with the error data
      // Don't redirect - let the UI handle the error message
      throw data || { error: 'request_failed', status: response.status };
    }
    return data;
  };

  // Settings unlock modal (simple helpers using element id)
  const openSimpleModal = (id) => { document.querySelector(`#${id}`)?.classList.add('active'); };
  const closeSimpleModal = (id) => { document.querySelector(`#${id}`)?.classList.remove('active'); };

  const openSettingsUnlockModal = () => {
    // Force find modal
    const modal = document.getElementById('modal-settings-unlock');
    if (!modal) {
        console.error('Modal settings unlock not found');
        return;
    }

    const form = modal.querySelector('form');
    if (form) {
      // Just clear value if input exists
      const pinInput = form.querySelector('input[name="pin"]');
      if (pinInput) {
        pinInput.value = '';
        pinInput.setAttribute('autocomplete', 'off');
      }
    }

    modal.classList.add('active');

    // Focus on input after modal opens
    setTimeout(() => {
      const pinInput = form?.querySelector('input[name="pin"]');
      if (pinInput) {
        pinInput.focus();
        pinInput.value = ''; // Ensure clear
      }
    }, 100);
  };

  const loadSignupRequests = async () => {
    const tableBody = document.querySelector('#signup-requests-table tbody');
    if (!tableBody) return;
    
    try {
        const res = await apiFetch('api/settings.php?action=list_requests&pin=' + encodeURIComponent(state.settingsPin));
        const requests = res.requests || [];
        if (requests.length === 0) {
            tableBody.innerHTML = '<tr><td colspan="4" class="no-data">Nuk ka kërkesa në pritje</td></tr>';
            return;
        }
        
        tableBody.innerHTML = requests.map(req => `
            <tr>
                <td>${req.username}</td>
                <td>${req.email}</td>
                <td>${formatDate(req.created_at)}</td>
                <td>
                    <button type="button" class="small primary" data-request-action="accept" data-id="${req.public_id}">Accept</button>
                    <button type="button" class="small danger" data-request-action="ignore" data-id="${req.public_id}">Ignore</button>
                </td>
            </tr>
        `).join('');
        
        // Bind actions
        tableBody.querySelectorAll('button[data-request-action]').forEach(btn => {
            btn.addEventListener('click', async () => {
                const action = btn.dataset.requestAction; // 'accept' or 'ignore'
                const id = btn.dataset.id;
                if (!confirm(action === 'accept' ? 'Aprovoni këtë përdorues?' : 'Refuzoni këtë kërkesë?')) return;
                
                try {
                    btn.disabled = true;
                    await apiFetch('api/settings.php', {
                        method: 'POST',
                        body: { 
                            action: 'handle_request', 
                            request_id: id, 
                            decision: action,
                            pin: state.settingsPin
                        }
                    });
                    showToast('success', 'Veprimi u krye me sukses');
                    loadSignupRequests();
                } catch (err) {
                    showToast('error', err.message || 'Gabim');
                    btn.disabled = false;
                }
            });
        });
        
    } catch (err) {
        console.error(err);
        tableBody.innerHTML = '<tr><td colspan="4" class="no-data">Gabim gjatë ngarkimit</td></tr>';
    }
  };

  const bindSettingsUnlockModal = () => {
    const modal = document.querySelector('#modal-settings-unlock');
    if (!modal) return;

    // Remove old event listeners if they exist
    if (modal.dataset.bound) {
      const form = document.querySelector('#form-settings-unlock');
      if (form && form._settingsUnlockHandler) {
        form.removeEventListener('submit', form._settingsUnlockHandler);
      }
    }

    modal.dataset.bound = 'true';
    modal.addEventListener('click', (e) => {
      const btn = e.target.closest('[data-close]');
      if (btn) {
        // Clear PIN input when closing
        const form = document.querySelector('#form-settings-unlock');
        const pinInput = form?.querySelector('input[name="pin"]');
        if (pinInput) {
          pinInput.value = '';
        }
        closeSimpleModal('modal-settings-unlock');
      }
    });

    const form = document.querySelector('#form-settings-unlock');
    if (!form) return;

    // Create handler function
    const handleSubmit = async (e) => {
      e.preventDefault();

      // Get PIN input
      const pinInput = form.querySelector('input[name="pin"]');
      if (!pinInput) return;

      const pin = pinInput.value.trim();
      if (!pin) {
        showToast('error', 'Shkruani PIN-in');
        return;
      }

      try {
        const btn = form.querySelector('button[type="submit"]');
        if(btn) { btn.disabled = true; btn.textContent = 'Duke verifikuar...'; }

        await apiFetch('api/settings.php?pin=' + encodeURIComponent(pin));
        
        state.settingsUnlocked = true;
        state.settingsPin = pin;

        // Clear PIN input after successful verification
        pinInput.value = '';
        
        closeSimpleModal('modal-settings-unlock');
        activateSection('settings');
        loadSignupRequests();
        showToast('success', 'Settings u hapën me sukses');
      } catch (err) {
        console.error('Settings unlock error:', err);
        // Show specific error message
        if (err?.error === 'invalid_pin') {
          showToast('error', 'PIN i pasaktë. Provoni përsëri.');
        } else if (err?.error === 'settings_locked') {
          showToast('error', 'PIN kërkohet për të hyrë në settings');
        } else if (err?.message) {
          showToast('error', err.message);
        } else {
          showToast('error', 'PIN i pasaktë ose gabim në server.');
        }
        // Do NOT clear PIN input on error, let user correct it
        if (pinInput) {
          pinInput.focus();
          pinInput.select(); // Select text so they can easily type over
        }
      } finally {
         const btn = form.querySelector('button[type="submit"]');
         if(btn) { btn.disabled = false; btn.textContent = 'Hap'; }
      }
    };

    // Store handler reference and add event listener
    form._settingsUnlockHandler = handleSubmit;
    form.addEventListener('submit', handleSubmit);
  };

  const showToast = (type, messageKey) => {
    if (!toast.el) {
      toast.el = document.createElement('div');
      toast.el.className = 'toast';
      document.body.appendChild(toast.el);
      toast.el.hidden = true;
    }

    toast.el.textContent = typeof messageKey === 'string' ? t(messageKey) : messageKey;
    toast.el.className = `toast ${type}`;
    toast.el.hidden = false;

    clearTimeout(toast.timeout);
    toast.timeout = window.setTimeout(() => {
      toast.el.hidden = true;
    }, 3200);
  };

  const serializeForm = (form) => {
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

  const formatDate = (value) => {
    if (!value) return '—';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return value;
    return new Intl.DateTimeFormat(state.lang === 'sq' ? 'sq-AL' : 'en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    }).format(date);
  };

  const formatMonth = (value) => {
    if (!value) return '—';
    const date = new Date(`${value}-01T00:00:00`);
    if (Number.isNaN(date.getTime())) return value;
    return new Intl.DateTimeFormat(state.lang === 'sq' ? 'sq-AL' : 'en-US', {
      year: 'numeric',
      month: 'long',
    }).format(date);
  };

  const formatCurrency = (amount) => {
    const currency = state.data.settings?.app?.currency || 'EUR';
    const number = Number(amount || 0);
    return new Intl.NumberFormat(state.lang === 'sq' ? 'sq-AL' : 'en-US', {
      style: 'currency',
      currency,
      minimumFractionDigits: 2,
    }).format(number);
  };

  // --- Helpers for filtering and header filter rows ---
  const textIncludes = (value, query) => {
    const q = (query ?? '').toString().trim().toLowerCase();
    if (!q) return true;
    const v = (value ?? '').toString().trim().toLowerCase();
    return v.includes(q);
  };
  const toDateObj = (value) => {
    if (!value) return null;
    let s = String(value);
    // Normalize common formats:
    // 1) YYYY-MM -> YYYY-MM-01T00:00:00
    if (/^\d{4}-\d{2}$/.test(s)) s = `${s}-01T00:00:00`;
    // 2) YYYY-MM-DD -> YYYY-MM-DDT00:00:00
    else if (/^\d{4}-\d{2}-\d{2}$/.test(s) && !s.includes('T')) s = `${s}T00:00:00`;
    // 3) YYYY-MM-DD HH:MM:SS -> YYYY-MM-DDTHH:MM:SS (space to 'T')
    else if (/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}(:\d{2})?$/.test(s)) s = s.replace(' ', 'T');
    // 4) DD/MM/YYYY -> convert to YYYY-MM-DDT00:00:00 (defensive, in case any text inputs supply this format)
    else if (/^\d{2}\/\d{2}\/\d{4}$/.test(s)) {
      const [dd, mm, yyyy] = s.split('/');
      s = `${yyyy}-${mm}-${dd}T00:00:00`;
    }
    const d = new Date(s);
    if (Number.isNaN(d.getTime())) return null;
    return d;
  };
  const debounce = (fn, wait = 200) => {
    let t;
    return (...args) => { clearTimeout(t); t = setTimeout(() => fn(...args), wait); };
  };
  const ensureHeaderFilters = (scope) => {
    const map = {
      courses: {
        sel: '#courses-table', cols: [
          { key: 'id', label: t('table-id') },
          { key: 'name', label: t('table-name') },
          { key: 'level', label: t('table-level') },
          { key: 'price', label: t('table-price') },
          { key: 'updated', label: t('table-updated') },
        ]
      },
      classes: {
        sel: '#classes-table', cols: [
          { key: 'id', label: t('table-id') },
          { key: 'name', label: t('table-name') },
          { key: 'course', label: t('table-course') },
          { key: 'level', label: t('table-level') },
          { key: 'period', label: t('table-period') },
          { key: 'price', label: t('table-price') },
          { key: 'professors', label: t('table-professors') },
          { key: 'students', label: t('table-students') },
        ]
      },
      students: {
        sel: '#students-table', cols: [
          { key: 'id', label: t('table-id') },
          { key: 'name', label: t('table-name') },
          { key: 'nid', label: t('table-national') },
          { key: 'contact', label: t('table-contact') },
          { key: 'age', label: t('table-age') },
          { key: 'registered', label: t('table-registered') },
        ]
      },
      professors: {
        sel: '#professors-table', cols: [
          { key: 'id', label: t('table-id') },
          { key: 'name', label: t('table-name') },
          { key: 'contact', label: t('table-contact') },
          { key: 'education', label: t('table-education') },
          { key: 'salary', label: t('table-salary') },
          { key: '_actions', label: t('table-actions'), readonly: true },
        ]
      },
      payments: {
        sel: '#payments-table', cols: [
          { key: 'id', label: t('table-id') },
          { key: 'student', label: t('table-student') },
          { key: 'class', label: t('table-class') },
          { key: 'month', label: t('table-month') },
          { key: 'paid', label: t('label-paid') },
          { key: 'status', label: t('table-status'), options: ['paid', 'partial', 'due'] },
          { key: 'confirmed', label: t('table-confirmed') },
          { key: '_receipt', label: t('table-receipt'), readonly: true },
        ]
      },
      salaries: {
        sel: '#salaries-table', cols: [
          { key: 'id', label: t('table-id') },
          { key: 'professor', label: t('table-professor') },
          { key: 'class', label: t('table-class') },
          { key: 'month', label: t('table-month') },
          { key: 'paid', label: 'Paga' },
          { key: 'advances', label: t('table-advances') },
          { key: 'status', label: t('table-status'), options: ['paid', 'partial', 'due'] },
          { key: '_receipt', label: t('table-receipt'), readonly: true },
        ]
      },
    };
    const conf = map[scope];
    if (!conf) return;
    const table = document.querySelector(conf.sel);
    if (!table) return;
    const thead = table.querySelector('thead');
    if (!thead) return;
    const headerRow = thead.querySelector('tr');
    if (!headerRow) return;
    // select header THs excluding selection checkbox column if present
    const ths = Array.from(headerRow.querySelectorAll('th')).filter(th => !th.hasAttribute('data-select-col'));
    const onInput = debounce((e) => {
      const target = e.target;
      if (!(target instanceof HTMLInputElement || target instanceof HTMLSelectElement)) return;
      
      // Additional safety: ignore input if it happened while readonly (autofill sometimes bypasses this, but good to have)
      // Only for text inputs, not selects
      if (target.type === 'text' && target.readOnly) return;

      const token = target.getAttribute('data-col-filter') || '';
      const [sc, key] = token.split(':');
      if (!sc || !key) return;
      if (!state.filters.columns[sc]) state.filters.columns[sc] = {};
      state.filters.columns[sc][key] = target.value;
      if (sc === 'courses') renderCourses();
      else if (sc === 'classes') renderClasses();
      else if (sc === 'students') renderStudents();
      else if (sc === 'professors') renderProfessors();
      else if (sc === 'payments') renderPayments();
      else if (sc === 'salaries') renderSalaries();
    }, 180);
    ths.forEach((th, i) => {
      const col = conf.cols[i];
      if (!col) return;
      if (col.readonly) return; // leave as-is
      // If already bound, just sync label/value
      let label = th.querySelector('.th-label');
      let input = th.querySelector('input[data-inline-filter]');
      if (!label) {
        // Preserve original header look via a label span
        const current = th.textContent?.trim() || col.label;
        th.textContent = '';
        label = document.createElement('span');
        label.className = 'th-label';
        label.textContent = current;
        th.style.position = 'relative';
        th.appendChild(label);
      } else {
        label.textContent = col.label;
      }
      if (!input) {
        // If col.options exists, create a SELECT instead of INPUT
        if (col.options && Array.isArray(col.options)) {
            input = document.createElement('select');
            input.setAttribute('data-inline-filter', '');
            input.setAttribute('data-col-filter', `${scope}:${col.key}`);
            
            // Default/empty option
            const defaultOpt = document.createElement('option');
            defaultOpt.value = '';
            defaultOpt.textContent = col.label || ''; // Show label as placeholder
            input.appendChild(defaultOpt);
            
            col.options.forEach(opt => {
                const o = document.createElement('option');
                o.value = opt;
                // Translate if possible
                const key = `status-${opt}`;
                o.textContent = i18n[state.lang]?.[key] || opt;
                input.appendChild(o);
            });

            // Styling for select
            Object.assign(input.style, {
              position: 'absolute',
              inset: '0',
              width: '100%',
              height: '100%',
              padding: '0.75rem 1rem', // Match th padding
              border: 'none',
              outline: 'none',
              background: 'transparent', // Transparent to blend
              font: 'inherit',
              letterSpacing: '0.05em',
              fontWeight: '700',
              textTransform: 'uppercase',
              color: 'inherit',
              opacity: '0', // Hide until interaction or value set
              cursor: 'pointer',
              appearance: 'none' // Hide native arrow for cleaner look initially
            });

            // Events for select
            th.addEventListener('click', () => { 
                input.style.opacity = '1';
                input.focus(); 
            });
            
            input.addEventListener('change', (e) => {
                // Trigger filter update immediately on change
                onInput(e);
                input.blur(); // Remove focus after selection
            });

            input.addEventListener('focus', () => {
              input.style.opacity = '1';
              if (label) label.style.visibility = 'hidden';
            });
            
            input.addEventListener('blur', () => {
              const val = (input.value || '').trim();
              if (val === '') {
                input.style.opacity = '0';
                if (label) label.style.visibility = 'visible';
              } else {
                 // Keep visible if value selected
                 input.style.opacity = '1';
              }
            });

            th.appendChild(input);

        } else {
            // Standard Text Input - Lazy Creation Logic
            // Instead of creating the input immediately, we just set up the click handler on TH
            // This completely prevents autofill on page load because the input doesn't exist yet!
            
            // Only attach click listener if not already attached (check via data attribute)
            if (!th.hasAttribute('data-lazy-filter-bound')) {
                th.setAttribute('data-lazy-filter-bound', 'true');
                
                th.style.cursor = 'text';
                
                const activateInput = () => {
                    // Check if input already exists
                    let lazyInput = th.querySelector('input[data-inline-filter]');
                    if (lazyInput) {
                        lazyInput.style.opacity = '1';
                        if (label) label.style.visibility = 'hidden';
                        lazyInput.focus();
                        return;
                    }

                    // Create input now
                    lazyInput = document.createElement('input');
                    lazyInput.type = 'text';
                    lazyInput.name = `filter_${scope}_${col.key}_${Date.now()}`; // Unique name
                    lazyInput.setAttribute('autocomplete', 'off'); 
                    lazyInput.setAttribute('data-inline-filter', '');
                    lazyInput.setAttribute('data-col-filter', `${scope}:${col.key}`);
                    
                    Object.assign(lazyInput.style, {
                      position: 'absolute',
                      inset: '0',
                      width: '100%',
                      height: '100%',
                      padding: '0.75rem 1rem',
                      border: 'none',
                      outline: 'none',
                      background: 'var(--surface)', // Opaque background when active
                      font: 'inherit',
                      letterSpacing: '0.05em',
                      fontWeight: '700',
                      textTransform: 'uppercase',
                      color: 'inherit',
                      opacity: '1',
                    });

                    // Set initial value from state
                    lazyInput.value = state.filters.columns[scope]?.[col.key] || '';

                    // Events
                    lazyInput.addEventListener('input', onInput);
                    lazyInput.addEventListener('blur', () => {
                        const val = (lazyInput.value || '').trim();
                        if (val === '') {
                            // If empty on blur, destroy the input to prevent autofill later
                            lazyInput.remove();
                            if (label) label.style.visibility = 'visible';
                        } else {
                            // If has value, keep it but maybe hide? No, keep visible
                        }
                    });
                    
                    // Prevent propagation to avoid double triggering if needed
                    lazyInput.addEventListener('click', (e) => e.stopPropagation());

                    th.appendChild(lazyInput);
                    if (label) label.style.visibility = 'hidden';
                    lazyInput.focus();
                };

                th.addEventListener('click', activateInput);
                
                // If there's already a value in state, we must create it immediately to show it
                // BUT we do it safely
                const existingVal = state.filters.columns[scope]?.[col.key];
                if (existingVal) {
                    activateInput();
                }
            }
        }
      }
      
      // Sync value and visibility on rerender - ONLY if input exists
      // If it doesn't exist, we don't need to sync anything (lazy)
      /*
      const val = state.filters.columns[scope]?.[col.key] || '';
      
      // Only update if input is NOT focused to avoid cursor jumping
      if (document.activeElement !== input) {
          input.value = val;
      }
      
      if ((val || '').trim() !== '') {
        input.style.opacity = '1';
        if (label) label.style.visibility = 'hidden';
      } else {
        input.style.opacity = document.activeElement === input ? '1' : '0';
        if (label && document.activeElement !== input) label.style.visibility = 'visible';
      }
      */
    });
  };

  const initLogin = () => {
    const form = document.querySelector('#login-form');
    const messageEl = document.querySelector('#login-message');

    const showMessage = (type, keyOrText) => {
      if (!messageEl) return;
      // Check if it's a translation key (exists in translations) or direct text
      const translated = t(keyOrText);
      messageEl.textContent = (translated !== keyOrText) ? translated : keyOrText;
      messageEl.className = `alert ${type}`;
      messageEl.hidden = false;
      // Initialize icons in alert
      if (typeof lucide !== 'undefined') {
        setTimeout(() => lucide.createIcons(), 10);
      }
    };

    // Password toggle functionality
    const passwordToggle = document.getElementById('password-toggle');
    const passwordInput = document.getElementById('password');
    if (passwordToggle && passwordInput) {
      passwordToggle.addEventListener('click', () => {
        const isPassword = passwordInput.type === 'password';
        passwordInput.type = isPassword ? 'text' : 'password';
        const eyeIcon = passwordToggle.querySelector('.eye-icon');
        const eyeOffIcon = passwordToggle.querySelector('.eye-off-icon');
        if (eyeIcon && eyeOffIcon) {
          eyeIcon.style.display = isPassword ? 'none' : 'block';
          eyeOffIcon.style.display = isPassword ? 'block' : 'none';
        }
        if (typeof lucide !== 'undefined') {
          setTimeout(() => lucide.createIcons(), 10);
        }
      });
    }

    // Always use AJAX for login form
    form?.addEventListener('submit', async (event) => {
      event.preventDefault();
      const username = (form.querySelector('#username')?.value || '').trim();
      const password = form.querySelector('#password')?.value || '';
      if (!username || !password) return;

      // Show loading state
      const submitBtn = form.querySelector('.btn-login');
      if (submitBtn) {
        submitBtn.classList.add('loading');
        submitBtn.disabled = true;
      }

      try {
        // First login attempt - support both username and email
        const response = await apiFetch('api/auth.php', {
          method: 'POST',
          body: {
            action: 'login',
            username: username, // Backend accepts both username and email via this field
            password: password
          }
        });

        // Check if 2FA is required (even if response has error field, status is 200)
        if (response && (response.requires_2fa || response.error === 'two_factor_required')) {
          // Store username and password temporarily for 2FA
          form.dataset.username = username;
          form.dataset.password = password;

          // Code is already sent automatically by backend - just show modal
          const modal2fa = document.querySelector('#modal-2fa-verify');
          if (modal2fa) {
            modal2fa.classList.add('active');
            if (typeof lucide !== 'undefined') {
              setTimeout(() => lucide.createIcons(), 50);
            }

            const modalMessage = modal2fa.querySelector('#2fa-message');
            const showModalMessage = (type, text) => {
              if (modalMessage) {
                modalMessage.textContent = text;
                modalMessage.className = `alert ${type}`;
                modalMessage.hidden = false;
                if (typeof lucide !== 'undefined') {
                  setTimeout(() => lucide.createIcons(), 10);
                }
              }
              showMessage(type, text);
            };

            // Pre-fill code if provided in response (fallback if email fails)
            if (response.code) {
              const codeInput = document.getElementById('2fa-code');
              if (codeInput) {
                codeInput.value = response.code;
              }
              showModalMessage('info', 'Kodi u dërgua. Shkruani kod-in 6-shifror (kodi është i plotësuar automatikisht).');
            } else {
              showModalMessage('success', 'Kodi u dërgua. Shkruani kod-in 6-shifror.');
            }
          }
        } else if (response && response.status === 'ok') {
          // Login successful without 2FA
          showMessage('success', 'login-success');
          const baseMeta = document.querySelector('meta[name="app-base"]');
          const base = baseMeta?.getAttribute('content') || '';
          setTimeout(() => { window.location.href = base + 'dashboard.php'; }, 400);
        } else {
          // Unexpected response - check for specific errors
          const errorKey = response?.error || 'login-error';
          if (errorKey === 'invalid_credentials') {
            showMessage('error', 'invalid_credentials');
          } else {
            showMessage('error', errorKey);
          }
        }
      } catch (error) {
        // Check if 2FA is required (error response with requires_2fa)
        if (error && (error.requires_2fa || error.error === 'two_factor_required')) {
          form.dataset.username = username;
          form.dataset.password = password;

          // Code is already sent automatically by backend - just show modal
          const modal2fa = document.querySelector('#modal-2fa-verify');
          if (modal2fa) {
            modal2fa.classList.add('active');
            if (typeof lucide !== 'undefined') {
              setTimeout(() => lucide.createIcons(), 50);
            }

            const modalMessage = modal2fa.querySelector('#2fa-message');
            const showModalMessage = (type, text) => {
              if (modalMessage) {
                modalMessage.textContent = text;
                modalMessage.className = `alert ${type}`;
                modalMessage.hidden = false;
                if (typeof lucide !== 'undefined') {
                  setTimeout(() => lucide.createIcons(), 10);
                }
              }
              showMessage(type, text);
            };

            // Pre-fill code if provided in error response (fallback if email fails)
            if (error.code) {
              const codeInput = document.getElementById('2fa-code');
              if (codeInput) {
                codeInput.value = error.code;
              }
              showModalMessage('info', 'Kodi u dërgua. Shkruani kod-in 6-shifror (kodi është i plotësuar automatikisht).');
            } else {
              showModalMessage('success', 'Kodi u dërgua. Shkruani kod-in 6-shifror.');
            }
          }
        } else {
          const errorKey = error?.error || 'login-error';
          if (errorKey === 'invalid_credentials') {
            showMessage('error', 'invalid_credentials');
            // Clear password field to allow retry
            if (passwordInput) {
              passwordInput.value = '';
              passwordInput.focus();
            }
          } else {
            showMessage('error', errorKey);
          }
        }
      } finally {
        if (submitBtn) {
          submitBtn.classList.remove('loading');
          submitBtn.disabled = false;
        }
      }
    });

    // 2FA Verification Form
    const form2fa = document.getElementById('2fa-verify-form');
    if (form2fa) {
      // Add input handler for 2FA code
      const codeInput2fa = document.getElementById('2fa-code');
      if (codeInput2fa) {
        codeInput2fa.addEventListener('input', (e) => {
          e.target.value = e.target.value.replace(/\D/g, '').substring(0, 6);
        });
      }

      form2fa.addEventListener('submit', async (e) => {
        e.preventDefault();
        const codeInput = document.getElementById('2fa-code');
        if (!codeInput) {
          console.error('2FA code input not found');
          return;
        }
        // Only numbers, max 6 digits, auto-format
        let code = (codeInput.value || '').trim().replace(/\D/g, '').substring(0, 6);
        codeInput.value = code; // Update input with cleaned value

        const username = form?.dataset.username || '';
        const password = form?.dataset.password || '';

        if (!code || code.length !== 6 || !username || !password) {
          showMessage('error', 'Ju lutem shkruani kod-in e plotë 6-shifror');
          return;
        }

        try {
          await apiFetch('api/auth.php', {
            method: 'POST',
            body: {
              action: 'login',
              username: username,
              password: password,
              two_factor_code: code
            }
          });

          showMessage('success', 'login-success');

          // Clear stored credentials
          if (form) {
            delete form.dataset.username;
            delete form.dataset.password;
          }

          // Don't close modal or clear code - let user see success message
          // Modal will close only when user clicks "Anulo" button
          // Code will remain visible for user reference

          const baseMeta = document.querySelector('meta[name="app-base"]');
          const base = baseMeta?.getAttribute('content') || '';
          // Redirect to dashboard (works for both root and public directory)
          const dashboardPath = base + 'dashboard.php';
          setTimeout(() => { window.location.href = dashboardPath; }, 1500);
        } catch (error) {
          showMessage('error', error?.error || error?.message || 'Kodi i verifikimit është i pasaktë');
          // Don't clear code on error - let user try again
          // Modal stays open so user can correct the code
        }
      });
    }

    // Resend 2FA Code
    const btnResend2fa = document.querySelector('#btn-resend-2fa-code');
    if (btnResend2fa) {
      btnResend2fa.addEventListener('click', async () => {
        const username = form?.dataset.username || '';
        if (!username) return;

        try {
          const codeRes = await apiFetch('api/auth.php', {
            method: 'POST',
            body: {
              action: 'request_2fa_code',
              username: username
            }
          });

          if (codeRes && codeRes.code) {
            const codeInput = document.getElementById('2fa-code');
            if (codeInput) {
              codeInput.value = codeRes.code;
            }
            const emailNotSent = codeRes.message && codeRes.message.includes('email not sent');
            if (emailNotSent) {
              showMessage('error', `Email-i nuk u dërgua. Përdore këtë kod: ${codeRes.code}`);
            } else {
              showMessage('success', 'Kodi u dërgua përsëri. Shkruani kod-in 6-shifror.');
            }
          } else {
            showMessage('success', 'Kodi u dërgua përsëri. Shkruani kod-in 6-shifror.');
          }
        } catch (error) {
          showMessage('error', error?.error || 'toast-error');
        }
      });
    }

    // Forgot Password Link
    const forgotLink = document.querySelector('#forgot-password-link');
    if (forgotLink) {
      forgotLink.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        const modal = document.querySelector('#modal-forgot-password');
        if (modal) {
          modal.classList.add('active');
        } else {
          console.error('Forgot password modal not found');
        }
      });
    }

    // Close modals ONLY when clicking [data-close] buttons (not on backdrop)
    // Helper function to close modals properly
    const closeModalHelper = (modal) => {
      if (modal) {
        modal.classList.remove('active');
        // Clear 2FA code input if it's the 2FA modal
        if (modal.id === 'modal-2fa-verify') {
          const codeInput = document.getElementById('2fa-code');
          if (codeInput) {
            codeInput.value = '';
          }
        }
        // Clear verify code modal inputs
        if (modal.id === 'modal-verify-code') {
          const verifyForm = document.querySelector('#verify-code-form');
          if (verifyForm) {
            verifyForm.reset();
          }
        }
        // Clear reset password modal
        if (modal.id === 'modal-reset-password') {
          const resetForm = document.querySelector('#reset-password-form');
          if (resetForm) {
            resetForm.reset();
            delete resetForm.dataset.username;
            delete resetForm.dataset.code;
          }
        }
        // Clear forgot password modal
        if (modal.id === 'modal-forgot-password') {
          const forgotForm = document.querySelector('#forgot-password-form');
          if (forgotForm) {
            forgotForm.reset();
          }
        }
      }
    };

    // Set up modal close handlers for login page modals
    // Use event delegation on document to catch all clicks
    document.addEventListener('click', (e) => {
      // Check if clicked element or its parent has data-close attribute
      const closeBtn = e.target.closest('[data-close]');
      if (closeBtn) {
        // Find the parent modal
        const modal = closeBtn.closest('[data-modal]');
        if (modal) {
          e.preventDefault();
          e.stopPropagation();
          closeModalHelper(modal);
        }
      }
    });

    // Prevent modal-content clicks from closing the modal
    document.querySelectorAll('[data-modal]').forEach(modal => {
      const modalContent = modal.querySelector('.modal-content');
      if (modalContent) {
        modalContent.addEventListener('click', (e) => {
          e.stopPropagation();
        });
      }

      // Prevent backdrop clicks from closing
      modal.addEventListener('click', (e) => {
        if (e.target === modal) {
          e.stopPropagation();
        }
      });
    });

    // Forgot Password Form
    const forgotForm = document.querySelector('#forgot-password-form');
    if (forgotForm) {
      forgotForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        // Show loading state
        const submitBtn = forgotForm.querySelector('button[type="submit"]');
        if (submitBtn) {
          submitBtn.disabled = true;
          submitBtn.textContent = 'Po dërgohet...';
        }

        try {
          const res = await apiFetch('api/auth.php', {
            method: 'POST',
            body: {
              action: 'request_password_reset'
            }
          });

          // Close forgot password modal immediately
          const forgotModal = document.querySelector('#modal-forgot-password');
          if (forgotModal) forgotModal.classList.remove('active');

          // Open verify code modal
          const verifyModal = document.querySelector('#modal-verify-code');
          if (verifyModal) {
            verifyModal.classList.add('active');

            // Clear code input - don't pre-fill
            const codeInput = verifyModal.querySelector('#reset-code');
            if (codeInput) {
              codeInput.value = '';
            }

            // Show message (but don't show code even if provided)
            const emailNotSent = res.message && res.message.includes('email not sent');
            if (emailNotSent && res.code) {
              showMessage('error', `Email-i nuk u dërgua. Kontaktoni administratorin.`);
            } else {
              showMessage('success', 'Kodi u dërgua në email-in tuaj. Shkruani kod-in 6-shifror.');
            }
          }
        } catch (error) {
          showMessage('error', error?.error || error?.message || 'Gabim në dërgimin e kodit');
        } finally {
          if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.textContent = 'Dërgo kod';
          }
        }
      });
    }

    // Verify Code Form - only verifies code, doesn't reset password
    const verifyForm = document.querySelector('#verify-code-form');
    if (verifyForm) {
      // Add input handler for reset code
      const resetCodeInput = document.getElementById('reset-code');
      if (resetCodeInput) {
        resetCodeInput.addEventListener('input', (e) => {
          e.target.value = e.target.value.replace(/\D/g, '').substring(0, 6);
        });
      }

      verifyForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const code = (verifyForm.querySelector('#reset-code')?.value || '').trim().replace(/\D/g, '').substring(0, 6);

        if (!code || code.length !== 6) {
          showMessage('error', 'Ju lutem shkruani kod-in e plotë 6-shifror');
          return;
        }

        try {
          // Verify code (no username needed - admin is found automatically)
          const verifyRes = await apiFetch('api/auth.php', {
            method: 'POST',
            body: {
              action: 'verify_reset_code',
              code: code
            }
          });

          // If verification successful, open password reset modal
          const verifyModal = document.querySelector('#modal-verify-code');
          const resetPasswordModal = document.querySelector('#modal-reset-password');

          if (verifyModal) verifyModal.classList.remove('active');
          if (resetPasswordModal) {
            resetPasswordModal.classList.add('active');
            // Store code in reset password form
            const resetForm = document.querySelector('#reset-password-form');
            if (resetForm) {
              resetForm.dataset.code = code;
            }
          }
        } catch (error) {
          showMessage('error', error?.error || error?.message || 'Kodi i verifikimit është i pasaktë');
        }
      });
    }

    // Reset Password Form - actually resets the password
    const resetPasswordForm = document.querySelector('#reset-password-form');
    if (resetPasswordForm) {
      resetPasswordForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const password = resetPasswordForm.querySelector('#new-password')?.value || '';
        const confirmPassword = resetPasswordForm.querySelector('#confirm-password')?.value || '';
        const code = resetPasswordForm.dataset.code || '';

        if (!password || !confirmPassword || !code) {
          showMessage('error', 'Ju lutem plotësoni të gjitha fushat');
          return;
        }

        if (password.length < 8) {
          showMessage('error', 'Fjalëkalimi duhet të jetë të paktën 8 karaktere');
          return;
        }

        if (password !== confirmPassword) {
          showMessage('error', 'Fjalëkalimet nuk përputhen');
          return;
        }

        try {
          await apiFetch('api/auth.php', {
            method: 'POST',
            body: {
              action: 'verify_password_reset',
              code: code,
              password: password
            }
          });

          showMessage('success', 'Fjalëkalimi u rivendos me sukses. Tani mund të logoheni.');
          const resetPasswordModal = document.querySelector('#modal-reset-password');
          if (resetPasswordModal) resetPasswordModal.classList.remove('active');
          resetPasswordForm.reset();

          // Clear stored data
          const forgotForm = document.querySelector('#forgot-password-form');
          if (forgotForm) {
            forgotForm.reset();
            delete forgotForm.dataset.username;
          }
          delete resetPasswordForm.dataset.username;
          delete resetPasswordForm.dataset.code;
        } catch (error) {
          showMessage('error', error?.error || error?.message || 'Dështoi rivendosja e fjalëkalimit');
        }
      });
    }

    // Password toggle for new password fields
    const newPasswordToggle = document.getElementById('new-password-toggle');
    const newPasswordInput = document.getElementById('new-password');
    if (newPasswordToggle && newPasswordInput) {
      newPasswordToggle.addEventListener('click', () => {
        const isPassword = newPasswordInput.type === 'password';
        newPasswordInput.type = isPassword ? 'text' : 'password';
        const eyeIcon = newPasswordToggle.querySelector('.eye-icon');
        const eyeOffIcon = newPasswordToggle.querySelector('.eye-off-icon');
        if (eyeIcon && eyeOffIcon) {
          eyeIcon.style.display = isPassword ? 'none' : 'block';
          eyeOffIcon.style.display = isPassword ? 'block' : 'none';
        }
        if (typeof lucide !== 'undefined') {
          setTimeout(() => lucide.createIcons(), 10);
        }
      });
    }

    const confirmPasswordToggle = document.getElementById('confirm-password-toggle');
    const confirmPasswordInput = document.getElementById('confirm-password');
    if (confirmPasswordToggle && confirmPasswordInput) {
      confirmPasswordToggle.addEventListener('click', () => {
        const isPassword = confirmPasswordInput.type === 'password';
        confirmPasswordInput.type = isPassword ? 'text' : 'password';
        const eyeIcon = confirmPasswordToggle.querySelector('.eye-icon');
        const eyeOffIcon = confirmPasswordToggle.querySelector('.eye-off-icon');
        if (eyeIcon && eyeOffIcon) {
          eyeIcon.style.display = isPassword ? 'none' : 'block';
          eyeOffIcon.style.display = isPassword ? 'block' : 'none';
        }
        if (typeof lucide !== 'undefined') {
          setTimeout(() => lucide.createIcons(), 10);
        }
      });
    }
  };

  const initDashboard = () => {
    bindNav();
    bindModalTriggers();
    bindTableActions();
    bindFormSubmissions();
    bindFilterInputs();
    ensureSubToolbar();
    bindSubToolbarActions();
    bindEntitySwitcher();
    loadDashboardData();
    activateSection('dashboard');
    renderDashboard();
    // Prepare invoice modal UX bindings once
    initInvoiceFormUX();
    // Prepare salary modal UX bindings once
    initSalaryFormUX();
  };

  const bindStatClicks = () => {
    const container = document.querySelector('#management-stats');
    if (!container || container.dataset.bound) return;
    container.dataset.bound = 'true';
    container.addEventListener('click', (e) => {
      const card = e.target.closest('.stat-card');
      if (!card) return;
      const idx = Array.from(container.children).indexOf(card);
      // cards: courses, classes, students, professors, debts, salary_balance
      activateSection('management');
      const details = document.querySelectorAll('.section[data-section="management"] details');
      details.forEach(d => d.open = false);
      const mapIdxToDetails = { 0: 0, 1: 1, 2: 2, 3: 3 };
      const which = mapIdxToDetails[idx];
      if (which !== undefined && details[which]) {
        details[which].open = true;
        details[which].scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
      // if clicked debts or salary_balance, jump to payments/salaries
      if (idx === 4) activateSection('payments');
      if (idx === 5) activateSection('salaries');
    });
  };

  // --- Sub toolbar ---
  const ensureSubToolbar = () => {
    if (document.querySelector('#sub-toolbar')) return;
    const toolbar = document.createElement('div');
    toolbar.id = 'sub-toolbar';
    toolbar.className = 'sub-toolbar';
    toolbar.innerHTML = `
      <div class="toolbar-group">
        <button type="button" data-tool="add" title="Shto" class="toolbar-btn toolbar-btn-add">
          <i data-lucide="plus" class="toolbar-icon"></i>
          <span class="toolbar-label">Shto</span>
        </button>
        <button type="button" data-tool="edit" title="Ndrysho" class="toolbar-btn toolbar-btn-edit">
          <i data-lucide="edit-3" class="toolbar-icon"></i>
          <span class="toolbar-label">Ndrysho</span>
        </button>
        <button type="button" data-tool="delete" title="Fshij" class="toolbar-btn toolbar-btn-delete">
          <i data-lucide="trash-2" class="toolbar-icon"></i>
          <span class="toolbar-label">Fshij</span>
        </button>
        <button type="button" data-tool="select" title="Zgjidh" class="toolbar-btn toolbar-btn-select">
          <i data-lucide="check-square" class="toolbar-icon"></i>
          <span class="toolbar-label">Zgjidh</span>
        </button>
      </div>`;

    // Insert at the top of app-root
    const appRoot = document.querySelector('.app-root');
    if (appRoot) {
      appRoot.insertBefore(toolbar, appRoot.firstChild);
      // Initialize Lucide icons for toolbar
      if (typeof lucide !== 'undefined') {
        setTimeout(() => lucide.createIcons(), 50);
      }
    }
  };

  const selection = {
    enabled: false,
    entity: null,
    setEnabled(flag) { this.enabled = flag; updateTableSelectionUI(); updateSelectToolUI(); },
    toggle() { this.setEnabled(!this.enabled); },
    clear() {
      // Uncheck all checkboxes
      document.querySelectorAll('.row-select:checked').forEach(cb => cb.checked = false);
      // Disable selection mode
      this.setEnabled(false);
    },
  };

  const bindSubToolbarActions = () => {
    const bar = document.querySelector('#sub-toolbar');
    if (!bar || bar.dataset.bound) return;
    bar.dataset.bound = 'true';
    bar.addEventListener('click', async (e) => {
      const btn = e.target.closest('button[data-tool]');
      if (!btn) return;
      const tool = btn.getAttribute('data-tool');
      const activeSection = document.querySelector('.section.active');
      const sectionKey = activeSection?.getAttribute('data-section');

      // Infer entity based on visible/open panel
      let entity = null;
      if (sectionKey === 'management') {
        // Find visible entity section (new card-based structure)
        const visibleEntity = activeSection.querySelector('.entity-section[style*="display: block"], .entity-section:not([style*="display: none"])');
        entity = visibleEntity?.getAttribute('data-entity') || 'course';
      } else if (sectionKey === 'payments') {
        entity = 'invoice';
      } else if (sectionKey === 'salaries') {
        entity = 'salary';
      }

      selection.entity = entity;

      if (tool === 'select') {
        selection.toggle();
        return;
      }

      if (tool === 'add') {
        const modalId = entity;
        openModal(modalId, 'create');
        return;
      }

      const selected = getSelectedIds(entity);
      if (tool === 'edit') {
        if (selected.length !== 1) {
          showToast('error', 'Vetëm një rresht duhet selektuar për editim.');
          return;
        }
        handleEdit(entity, selected[0]);
        return;
      }

      if (tool === 'delete') {
        if (selected.length === 0) {
          showToast('error', 'Asnjë rresht i selektuar.');
          return;
        }

        if (!confirm(t('confirm-delete') || 'A jeni i sigurt që doni të fshini këtë element?')) {
          return;
        }
        
        const mode = 'delete';
        let pin = null;

        // Check if PIN is required for delete
        const pinRequired = await isPinRequiredForAction(entity, mode);
        if (pinRequired) {
          try {
            pin = await requestPinForAction();
          } catch (error) {
            if (error.message === 'PIN request cancelled') {
              return;
            }
            showToast('error', 'Gabim në verifikimin e PIN-it');
            return;
          }
        }

        try {
          for (const id of selected) {
            await handleDelete(entity, id, pin);
          }
          showToast('success', 'toast-deleted');
          await loadDashboardData();
          // Clear selection after successful delete
          selection.clear();
        } catch (err) {
          console.error(err);
          showToast('error', err?.error ?? 'toast-error');
          // If deletion failed due to dependencies, clear selection and disable selection mode
          if (err?.error === 'cannot_delete') {
            selection.clear();
          }
        }
        return;
      }
    });
  };

  const updateSelectToolUI = () => {
    const bar = document.querySelector('#sub-toolbar');
    if (!bar) return;
    const btn = bar.querySelector('button[data-tool="select"]');
    if (!btn) return;
    btn.classList.toggle('active', selection.enabled);
    const labelSpan = btn.querySelector('.toolbar-label');
    if (labelSpan) {
      labelSpan.textContent = selection.enabled ? 'Selecting… (Ctrl‑click to multi, dbl‑click to view)' : 'Select';
    }
    btn.title = selection.enabled ? 'Selecting… Click again to exit' : 'Select';
  };

  const updateTableSelectionUI = () => {
    document.querySelectorAll('table [data-select-col]').forEach((th) => th.remove());
    document.querySelectorAll('table [data-select-cell]').forEach((td) => td.remove());
    if (!selection.enabled) return;
    const activeSection = document.querySelector('.section.active');
    if (!activeSection) return;
    const tables = activeSection.querySelectorAll('table');
    tables.forEach((table) => {
      const theadRow = table.querySelector('thead tr');
      if (theadRow) {
        const th = document.createElement('th');
        th.setAttribute('data-select-col', '');
        th.textContent = '#';
        theadRow.insertBefore(th, theadRow.firstElementChild);
      }
      table.querySelectorAll('tbody tr').forEach((tr) => {
        const td = document.createElement('td');
        td.setAttribute('data-select-cell', '');
        const cb = document.createElement('input');
        cb.type = 'checkbox';
        cb.className = 'row-select';
        cb.dataset.id = tr.getAttribute('data-id') || tr.querySelector('[data-entity][data-id]')?.getAttribute('data-id') || tr.firstElementChild?.textContent?.trim() || '';
        td.appendChild(cb);
        tr.insertBefore(td, tr.firstElementChild);
      });
    });
  };

  const getSelectedIds = (entity) => {
    return Array.from(document.querySelectorAll('.row-select:checked')).map((cb) => cb.dataset.id).filter(Boolean);
  };

  const bindModalTriggers = () => {
    document.querySelectorAll('[data-open-modal]').forEach((btn) => {
      btn.addEventListener('click', () => {
        openModal(btn.getAttribute('data-open-modal'));
      });
    });

    document.querySelectorAll('[data-modal]').forEach((modal) => {
      modal.addEventListener('click', (event) => {
        // All modals should only close with explicit [data-close] buttons, not on backdrop click
        const target = event.target;
        if (target instanceof HTMLElement && target.closest('[data-close]')) {
          closeModal(modal);
          // Clear code when manually closed for 2FA modal
          if (modal.id === 'modal-2fa-verify') {
            const codeInput = document.getElementById('2fa-code');
            if (codeInput) {
              codeInput.value = '';
            }
          }
          // Clear code when manually closed for PIN verify modal
          if (modal.id === 'modal-pin-verify') {
            const verifyForm = modal.querySelector('#pin-verify-form');
            if (verifyForm) {
              verifyForm.reset();
            }
          }
        }
        // Prevent closing on background click for all modals
        if (event.target === modal) {
          event.stopPropagation();
          return;
        }
      });
    });
  };

  const openModal = async (id, mode = 'create', data = null) => {
    const modal = document.querySelector(`#modal-${id}`);
    if (!modal) return;

    // Check if PIN is required BEFORE opening the form
    const form = modal.querySelector('[data-form]');
    if (form) {
      const type = form.getAttribute('data-form');
      if (type) {
        // Map mode to action type
        let actionType = 'create';
        if (mode === 'edit' || mode === 'update') {
          actionType = 'update';
        }

        const pinRequired = await isPinRequiredForAction(type, mode);

        if (pinRequired) {
          try {
            const pin = await requestPinForAction();
            if (!pin) {
              return; // Don't open modal if PIN not provided
            }
            // Store PIN temporarily for form submission
            form._verifiedPin = pin;
          } catch (error) {
            if (error.message === 'PIN request cancelled') {
              return; // Don't open modal if user cancelled PIN
            }
            showToast('error', 'Gabim në verifikimin e PIN-it');
            return;
          }
        }
      }

      form.reset();
      form.dataset.mode = mode;
      delete form.dataset.publicId;
      // Ensure form submission is bound (in case form was re-rendered)
      if (!form._pinSubmitHandler) {
        bindFormSubmissions();
      }
      // clear chips containers if present
      form.querySelectorAll('.selected-chips').forEach((el) => { el.innerHTML = ''; });
      if (data) {
        populateForm(form, data);
        if (data.public_id) {
          form.dataset.publicId = data.public_id;
        }
        // Special population for class schedule (weekday/time controls)
        if (id === 'class' && data.schedule) {
          try {
            let sched = data.schedule;
            if (typeof sched === 'string') {
              try { sched = JSON.parse(sched); } catch (_) { sched = []; }
            }
            if (!Array.isArray(sched)) sched = [];

            // Clear all first
            form.querySelectorAll('input[name="schedule_days[]"]').forEach(el => el.checked = false);
            form.querySelectorAll('input[type="time"]').forEach(el => el.value = '');

            // Expect objects {day,start,end}; ignore legacy string entries
            sched.forEach((entry) => {
              if (!entry || typeof entry !== 'object') return;
              const d = String(entry.day || '').toLowerCase();
              const start = entry.start || '';
              const end = entry.end || '';
              const dayCb = form.querySelector(`[name="schedule_days[]"][value="${d}"]`);
              if (dayCb) {
                dayCb.checked = true;
                const s = form.querySelector(`[name="schedule_${d}_start"]`);
                const e = form.querySelector(`[name="schedule_${d}_end"]`);
                if (s) s.value = start;
                if (e) e.value = end;
              }
            });
          } catch (_) {
            /* ignore */
          }
        }
        // For class edit: render removable chips reflecting selected professors/students
        if (id === 'class') {
          renderChipsForSelect(form, 'professors');
          renderChipsForSelect(form, 'students');
          bindChipInteractions(form);
          // Keep chips in sync when user selects/deselects in multiselect
          const profSel = form.querySelector('select[name="professors[]"]');
          const studSel = form.querySelector('select[name="students[]"]');
          profSel?.addEventListener('change', () => renderChipsForSelect(form, 'professors'));
          studSel?.addEventListener('change', () => renderChipsForSelect(form, 'students'));
        }
      }
    }

    // Invoice modal: ensure UX bindings and sensible defaults
    if (id === 'invoice') {
      // Always repopulate selects to full lists when opening to avoid stale filters
      populateSelectOptions();
      initInvoiceFormUX && initInvoiceFormUX();
      const studentSel = modal.querySelector('#invoice-student');
      const classSel = modal.querySelector('#invoice-class');
      const monthsSel = modal.querySelector('#invoice-months');
      const amountInput = modal.querySelector('#invoice-amount');
      const statusSelect = modal.querySelector('#invoice-status');
      const taxSelect = modal.querySelector('#invoice-tax');
      if (mode === 'edit' && data) {
        if (studentSel && data.student_public_id) studentSel.value = data.student_public_id;
        if (classSel && data.class_public_id) classSel.value = data.class_public_id;
        if (monthsSel && data.plan_month) {
          monthsSel.innerHTML = `<option value="${data.plan_month}">${formatMonth(data.plan_month)}</option>`;
          Array.from(monthsSel.options).forEach(opt => { opt.selected = (opt.value === data.plan_month); });
        }
        if (amountInput && (data.due_amount || data.paid_amount)) {
          amountInput.value = String(data.due_amount ?? '');
        }
        if (taxSelect) taxSelect.value = data.tax || 'none';
      } else {
        // Create mode: clear selections and values completely
        if (studentSel) studentSel.value = '';
        if (classSel) classSel.value = '';
        if (monthsSel) monthsSel.innerHTML = '';
        if (amountInput) amountInput.value = '';
        const paidInput = modal.querySelector('#modal-invoice [name="paid_amount"]');
        if (paidInput) paidInput.value = '0';
        if (statusSelect) statusSelect.value = 'partial';
        if (taxSelect) taxSelect.value = 'none';
      }
    }

    // Professor modal: toggle base salary field depending on salary type
    if (id === 'professor') {
      initProfessorFormUX && initProfessorFormUX();
      const pform = document.querySelector('#modal-professor [data-form="professor"]');
      const typeSel = pform?.querySelector('select[name="salary_type"]');
      const baseField = pform?.querySelector('input[name="base_salary"]');
      const apply = () => {
        const type = (typeSel?.value || 'monthly').toLowerCase();
        const isPerClass = type === 'per-class' || type === 'perclass' || type === 'class';
        if (baseField) {
          baseField.disabled = isPerClass;
          baseField.required = !isPerClass;
          if (isPerClass) baseField.value = '';
        }
      };
      apply();
      typeSel?.addEventListener('change', apply);
    }

    // Salary modal: initialize UX and then harmonize UI based on current values (create or edit)
    if (id === 'salary') {
      initSalaryFormUX && initSalaryFormUX();
      const form = document.querySelector('#modal-salary [data-form="salary"]');
      const profSel = form?.querySelector('select[name="professor_public_id"]');
      const classSel = form?.querySelector('select[name="class_public_id"]');
      const baseInput = form?.querySelector('input[name="base_amount"]');
      const paidInput = form?.querySelector('input[name="paid_amount"]');
      // Defaults for create
      if (mode !== 'edit') {
        if (classSel) { classSel.disabled = true; classSel.value = ''; }
        if (baseInput) baseInput.value = '';
        if (paidInput) paidInput.value = '0';
      }
      // Trigger handlers to align UI with selected professor/class (especially in edit mode)
      // Dispatch change on professor to set type-specific UI and class list; then on class to compute base/due
      if (profSel) profSel.dispatchEvent(new Event('change'));
      if (classSel && classSel.value) classSel.dispatchEvent(new Event('change'));
    }

    modal.classList.add('active');
  };

  // Build chips from current selection for a given field (professors|students)
  const renderChipsForSelect = (form, field) => {
    const select = form.querySelector(`select[name="${field}[]"]`);
    const container = form.querySelector(`.selected-chips[data-chips="${field}"]`);
    if (!select || !container) return;
    const selected = Array.from(select.selectedOptions).map(opt => ({ id: opt.value, label: opt.textContent }));
    container.innerHTML = selected.map(({ id, label }) => `
      <span class="chip-item" data-chip="${field}" data-id="${id}">
        ${label}
        <button type="button" class="chip-remove" aria-label="remove" title="${t('action-delete')}">×</button>
      </span>
    `).join('');
  };

  const bindChipInteractions = (form) => {
    if (form.dataset.chipsBound) return;
    form.dataset.chipsBound = 'true';
    form.addEventListener('click', (e) => {
      const btn = e.target.closest('.chip-remove');
      if (!btn) return;
      const chip = btn.closest('[data-chip]');
      if (!chip) return;
      const field = chip.getAttribute('data-chip'); // professors|students
      const id = chip.getAttribute('data-id');
      const select = form.querySelector(`select[name="${field}[]"]`);
      if (!select || !id) return;
      // deselect option in select
      Array.from(select.options).forEach(opt => { if (opt.value === id) opt.selected = false; });
      // remove chip
      chip.remove();
    });
  };

  const closeModal = (modal) => {
    modal.classList.remove('active');
    // Strong reset on close to avoid lingering state between opens
    const form = modal.querySelector('[data-form]');
    if (form) {
      form.reset();
    }
    // Also clear PIN modal if it exists (in case it was open)
    const pinModal = document.getElementById('modal-action-pin');
    if (pinModal) {
      const pinForm = document.getElementById('action-pin-form');
      const pinInput = document.getElementById('action-pin-input');
      if (pinForm) pinForm.reset();
      if (pinInput) pinInput.value = '';
    }
    // Special handling for invoice modal: restore full options and clear computed fields
    if (modal.id === 'modal-invoice') {
      // Repopulate full student/class lists
      populateSelectOptions();
      const studentSel = modal.querySelector('#invoice-student');
      const classSel = modal.querySelector('#invoice-class');
      const monthsSel = modal.querySelector('#invoice-months');
      const amountInput = modal.querySelector('#invoice-amount');
      const statusSelect = modal.querySelector('#invoice-status');
      const taxSelect = modal.querySelector('#invoice-tax');
      if (studentSel) studentSel.value = '';
      if (classSel) classSel.value = '';
      if (monthsSel) monthsSel.innerHTML = '';
      if (amountInput) amountInput.value = '';
      const paidInput = modal.querySelector('#modal-invoice [name="paid_amount"]');
      if (paidInput) paidInput.value = '0';
      if (statusSelect) statusSelect.value = 'partial';
      if (taxSelect) taxSelect.value = 'none';
    }
  };

  const populateForm = (form, data) => {
    Object.entries(data).forEach(([key, value]) => {
      let input = form.querySelector(`[name="${key}"]`);
      // support array-style names like professors[] / students[]
      if (!input) {
        input = form.querySelector(`[name="${key}[]"]`);
      }
      if (!input) return;

      if (input instanceof HTMLSelectElement && input.multiple && Array.isArray(value)) {
        Array.from(input.options).forEach((opt) => {
          opt.selected = value.includes(opt.value);
        });
      } else if (input.type === 'date' || input.type === 'month') {
        input.value = value ? value : '';
      } else if (input.tagName === 'TEXTAREA') {
        if (Array.isArray(value)) {
          input.value = value.join('\n');
        } else {
          input.value = value ?? '';
        }
      } else {
        input.value = value ?? '';
      }
    });
  };

  // Bind PIN toggle button in forms
  const bindPinToggleButtons = async () => {
    // Load permissions to check if PIN is required
    let permissions = {};
    try {
      const res = await apiFetch('api/permissions.php?action=get_permissions');
      permissions = res?.permissions || {};
    } catch (error) {
      console.error('Failed to load permissions:', error);
    }

    document.querySelectorAll('[data-form]').forEach((form) => {
      const toggleBtn = form.querySelector('[data-toggle-pin]');
      const pinContainer = form.querySelector('[data-pin-container]');
      const pinInput = form.querySelector('[name="pin"]');
      const toggleText = form.querySelector('[data-pin-toggle-text]');

      if (!toggleBtn || !pinContainer) return;

      if (toggleBtn.dataset.bound) return;
      toggleBtn.dataset.bound = 'true';

      // Check if PIN is required by permissions
      const formType = form.getAttribute('data-form');
      const mode = form.dataset.mode || 'create';
      const actionKey = formType ? `${formType}.${mode === 'edit' ? 'update' : 'create'}` : null;
      const isPinRequiredByPermissions = actionKey && permissions[actionKey];

      let pinRequired = isPinRequiredByPermissions;

      // Auto-show PIN if required by permissions
      if (isPinRequiredByPermissions) {
        pinContainer.style.display = 'block';
        toggleBtn.classList.add('primary');
        toggleBtn.classList.remove('secondary');
        toggleText.textContent = 'PIN i kërkuar (kliko për ta çaktivizuar)';
        if (pinInput) pinInput.required = true;
      }

      toggleBtn.addEventListener('click', () => {
        pinRequired = !pinRequired;
        if (pinRequired) {
          pinContainer.style.display = 'block';
          toggleBtn.classList.add('primary');
          toggleBtn.classList.remove('secondary');
          toggleText.textContent = isPinRequiredByPermissions
            ? 'PIN i kërkuar (kliko për ta çaktivizuar)'
            : 'Mos kërko PIN (kliko për të fshehur)';
          if (pinInput) {
            pinInput.required = isPinRequiredByPermissions;
            pinInput.focus();
          }
        } else {
          if (isPinRequiredByPermissions) {
            // Cannot hide if required by permissions
            showToast('warning', 'PIN është i detyruar për këtë veprim në cilësime.');
            return;
          }
          pinContainer.style.display = 'none';
          toggleBtn.classList.remove('primary');
          toggleBtn.classList.add('secondary');
          toggleText.textContent = 'Kërko PIN për këtë veprim';
          if (pinInput) {
            pinInput.value = '';
            pinInput.required = false;
          }
        }
      });
    });
  };

  // Check if PIN is required for an action
  const isPinRequiredForAction = async (formType, mode) => {
    try {
      const res = await apiFetch('api/permissions.php?action=get_permissions');
      const permissions = res?.permissions || {};

      // Map mode to action type
      let actionType = 'create';
      if (mode === 'edit' || mode === 'update') {
        actionType = 'update';
      } else if (mode === 'delete') {
        actionType = 'delete';
      }

      const actionKey = `${formType}.${actionType}`;
      const isRequired = permissions[actionKey] === true;

      return isRequired;
    } catch (error) {
      console.error('Failed to check PIN requirement:', error);
      return false;
    }
  };

  // Show PIN modal and return PIN when verified
  const requestPinForAction = () => {
    return new Promise((resolve, reject) => {
      const modal = document.getElementById('modal-action-pin');
      const form = document.getElementById('action-pin-form');
      const pinInput = document.getElementById('action-pin-input');

      if (!modal || !form || !pinInput) {
        reject(new Error('PIN modal not found'));
        return;
      }

      // Always clear PIN input first (before showing modal)
      // Force clear using multiple methods to prevent browser autocomplete

      // Ensure modal is closed first
      modal.classList.remove('active');

      // Remove old input and create a new one to prevent browser from remembering
      const parent = pinInput.parentElement;
      const label = pinInput.previousElementSibling;
      const help = pinInput.nextElementSibling;
      const oldInput = pinInput;

      // Create new input element
      const newInput = document.createElement('input');
      newInput.type = 'password';
      newInput.name = 'pin';
      newInput.id = 'action-pin-input';
      newInput.setAttribute('autocomplete', 'new-password');
      newInput.setAttribute('autocomplete', 'off');
      newInput.placeholder = 'Shkruani PIN-in';
      newInput.required = true;

      // Replace old input with new one
      oldInput.remove();
      if (help) {
        parent.insertBefore(newInput, help);
      } else {
        parent.appendChild(newInput);
      }

      // Update reference
      const pinInputRef = newInput;

      // Small delay to ensure DOM is ready
      setTimeout(() => {
        // Ensure input is cleared
        pinInputRef.value = '';
        pinInputRef.setAttribute('value', '');

        // Show modal
        modal.classList.add('active');

        // Small delay before focus to ensure input is cleared
        setTimeout(() => {
          pinInputRef.focus();
          // Clear one more time after focus (in case browser autofilled)
          pinInputRef.value = '';
          pinInputRef.blur();
          pinInputRef.focus();
        }, 100);

        // Handle form submission
        const handleSubmit = async (e) => {
          e.preventDefault();
          const pin = pinInputRef.value.trim();
          if (!pin) {
            showToast('error', 'Shkruani PIN-in');
            return;
          }

          // Verify PIN before resolving
          try {
            // Verify PIN by attempting to unlock settings (this verifies the PIN)
            await apiFetch('api/settings.php?pin=' + encodeURIComponent(pin));

            // PIN is valid, clear input and close modal
            pinInputRef.value = '';
            form.reset();
            modal.classList.remove('active');
            form.removeEventListener('submit', handleSubmit);

            // Resolve with PIN
            resolve(pin);
          } catch (error) {
            // PIN is invalid
            showToast('error', 'PIN i pasaktë. Ju lutem provoni përsëri.');
            pinInputRef.value = '';
            pinInputRef.focus();
            // Don't close modal, let user try again
          }
        };

        // Handle cancel
        const handleCancel = () => {
          pinInputRef.value = '';
          form.reset();
          modal.classList.remove('active');
          form.removeEventListener('submit', handleSubmit);
          modal.removeEventListener('click', handleCancelClick);
          reject(new Error('PIN request cancelled'));
        };

        const handleCancelClick = (e) => {
          // Only close when explicit [data-close] button is clicked, not on backdrop
          if (e.target.closest('[data-close]')) {
            handleCancel();
          }
        };

        form.addEventListener('submit', handleSubmit);
        modal.addEventListener('click', handleCancelClick);
      }, 10); // Small delay to ensure DOM is ready
    });
  };

  const bindFormSubmissions = () => {
    document.querySelectorAll('[data-form]').forEach((form) => {
      // Prevent duplicate event listeners by removing old one first
      if (form._pinSubmitHandler) {
        form.removeEventListener('submit', form._pinSubmitHandler, true);
        form.removeEventListener('submit', form._pinSubmitHandler, false);
      }

      // Create new handler
      const handler = async (event) => {
        // CRITICAL: Prevent default immediately to stop form submission
        event.preventDefault();
        event.stopImmediatePropagation(); // Stop ALL other handlers from running

        const type = form.getAttribute('data-form');
        if (!type) {
          console.warn('[Form Submit] No data-form attribute found');
          return;
        }

        const mode = form.dataset.mode || 'create';
        // Use PIN that was verified when modal opened, or check if PIN is required now
        let pin = form._verifiedPin || null;

        // If PIN was already verified when modal opened, use it
        if (!pin) {
          // Check if PIN is required (for cases where modal was opened without PIN check)
          const pinRequired = await isPinRequiredForAction(type, mode);

          if (pinRequired) {
            try {
              pin = await requestPinForAction();
              if (!pin) {
                return;
              }
            } catch (error) {
              // User cancelled PIN entry
              if (error.message === 'PIN request cancelled') {
                return;
              }
              showToast('error', 'Gabim në verifikimin e PIN-it');
              return;
            }
          }
        }

        // Clear the stored PIN after use (one-time use)
        if (form._verifiedPin) {
          delete form._verifiedPin;
        }

        try {
          await handleFormSubmit(type, form, pin);
          showToast('success', 'toast-saved');
          const modal = form.closest('[data-modal]');
          if (modal) {
            closeModal(modal);
          }
          await loadDashboardData();
          
          // Re-render specifically the current active section to ensure view is updated
          const activeSection = document.querySelector('.section.active');
          if (activeSection) {
            const sectionKey = activeSection.dataset.section;
            if (sectionKey === 'salaries') {
                setTimeout(() => renderSalaries(), 50);
            } else if (sectionKey === 'payments') {
                setTimeout(() => renderPayments(), 50);
            }
          }
        } catch (error) {
          console.error('Form submission error:', error);

          // Always show error message - prioritize custom message from server
          let errorMessage = null;
          let errorKey = 'toast-error';

          // Check for custom error message first
          if (error?.message && typeof error.message === 'string' && error.message.trim() !== '') {
            errorMessage = error.message;
          }

          // Map specific error codes to user-friendly messages
          if (error?.error === 'invalid_pin') {
            errorKey = 'error-invalid-pin';
          } else if (error?.error === 'invalid_course') {
            errorKey = 'error-invalid-course';
            if (!errorMessage) errorMessage = 'Kursi i zgjedhur është i pasaktë';
          } else if (error?.error === 'missing_fields') {
            errorKey = 'error-missing_fields';
            if (!errorMessage) {
              const fields = error?.fields || [];
              if (fields.length > 0) {
                errorMessage = `Fushat e munguara: ${fields.join(', ')}`;
              } else {
                errorMessage = 'Disa fusha janë bosh';
              }
            }
          } else if (error?.error === 'csrf_token_invalid') {
            errorKey = 'error-csrf_token_invalid';
            if (!errorMessage) {
              errorMessage = 'Token i sigurisë i pavlefshëm. Ju lutem rifreskoni faqen dhe provoni përsëri.';
            }
            // Clear CSRF token cache to force refresh
            csrfTokenCache = null;
          } else if (error?.error === 'database_error') {
            errorKey = 'error-database_error';
            if (!errorMessage) errorMessage = 'Gabim në bazën e të dhënave';
            console.error('Database error:', error?.details || error?.message || error);
            if (error?.details) {
              console.error('Detailed error:', error.details);
            }
          } else if (error?.error === 'server_error') {
            errorKey = 'error-server_error';
            if (!errorMessage) errorMessage = 'Gabim në server';
            console.error('Server error:', error?.message || error);
            if (error?.details) {
              console.error('Error details:', error.details);
            }
          } else if (error?.error === 'duplicate_class') {
            errorKey = 'error-duplicate_class';
            if (!errorMessage) errorMessage = 'Klasa me këtë ID ekziston tashmë';
          } else if (error?.error === 'cannot_delete') {
            errorKey = 'error-cannot_delete';
            if (!errorMessage) errorMessage = 'Nuk mund të fshihet';
          } else if (error?.error) {
            errorKey = `error-${error.error}`;
          }

          // Show error message - prioritize custom message
          if (errorMessage) {
            showToast('error', errorMessage);
          } else {
            showToast('error', errorKey);
          }

          // Log full error for debugging
          console.error('Full error object:', error);

          // Keep modal open so user can fix the error
          // Don't close modal or reload data on error
          // Don't redirect or reload page
        }
      };

      // Store handler reference and add event listener with capture phase
      // This ensures our handler runs BEFORE any other handlers
      form._pinSubmitHandler = handler;
      form.addEventListener('submit', handler, { capture: true, once: false });
    });
  };

  const parseSchedule = (value) => {
    if (!value) return [];
    return value
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean);
  };

  const parsePlan = (value, fallbackAmount) => {
    if (!value) return [];
    return value
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean)
      .map((line) => {
        const [month, amount, dueDate, notes] = line.split(';').map((part) => part?.trim());
        return {
          plan_month: month,
          due_amount: amount || fallbackAmount,
          due_date: dueDate || null,
          notes: notes || null,
        };
      });
  };

  const handleFormSubmit = async (type, form, pin = null) => {
    const payload = serializeForm(form);
    const mode = form.dataset.mode || 'create';
    const publicId = form.dataset.publicId;

    switch (type) {
      case 'course': {
        const endpoint = 'api/registrations.php';
        const action = mode === 'edit' ? 'update_course' : 'create_course';
        const data = {
          action,
          name: payload.name,
          price: payload.price,
          description: payload.description || null
        };
        if (mode === 'edit') {
          data.public_id = publicId;
          const current = state.data.courses.find((c) => c.public_id === publicId) || {};
          if (String(payload.name) === String(current.name)) delete data.name;
          if (String(payload.price) === String(current.price)) delete data.price;
          if (String(payload.description || '') === String(current.description || '')) delete data.description;
        }
        if (pin && String(pin).trim() !== '') {
          data.pin = pin;
        }
        await apiFetch(endpoint, { method: 'POST', body: data });
        break;
      }
      case 'class': {
        const endpoint = 'api/registrations.php';
        const action = mode === 'edit' ? 'update_class' : 'create_class';

        // Validate required fields before proceeding
        if (!payload.course_public_id) {
          throw { error: 'invalid_course', message: 'Please select a course' };
        }
        if (!payload.name || !payload.name.trim()) {
          throw { error: 'missing_fields', message: 'Class name is required' };
        }
        if (!payload.level || !payload.level.trim()) {
          throw { error: 'missing_fields', message: 'Level is required' };
        }
        if (!payload.start_date) {
          throw { error: 'missing_fields', message: 'Start date is required' };
        }

        // Build schedule from weekday inputs
        const days = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];
        const schedule = [];
        days.forEach((d) => {
          const checked = form.querySelector(`[name="schedule_days[]"][value="${d}"]`)?.checked;
          if (checked) {
            const start = form.querySelector(`[name="schedule_${d}_start"]`)?.value || '';
            const end = form.querySelector(`[name="schedule_${d}_end"]`)?.value || '';
            schedule.push({ day: d, start, end });
          }
        });
        // Always take monthly_price from the selected course (read-only in UI)
        const courseForPrice = state.data.courses.find(c => c.public_id === payload.course_public_id);
        const monthly_price = courseForPrice?.price ?? 0;

        // Ensure monthly_price is a valid number
        if (!monthly_price || isNaN(parseFloat(monthly_price))) {
          throw { error: 'invalid_course', message: 'Selected course has no valid price' };
        }
        const data = {
          action,
          course_public_id: payload.course_public_id,
          name: payload.name,
          level: payload.level,
          start_date: payload.start_date,
          end_date: payload.end_date || null,
          monthly_price: parseFloat(monthly_price) || 0,
          description: payload.description || null,
          schedule,
          professors: payload.professors || [],
          students: payload.students || [],
        };
        // Include PIN if provided from modal
        if (pin && String(pin).trim() !== '') {
          data.pin = pin;
        }

        // Include professor_class_pay only if provided (non-empty) to avoid clearing existing values unintentionally
        if (payload.professor_class_pay != null && String(payload.professor_class_pay).trim() !== '') {
          data.professor_class_pay = payload.professor_class_pay;
        }
        if (mode === 'edit') {
          data.public_id = publicId;
          const current = state.data.classes.find((c) => c.public_id === publicId) || {};
          const eq = (a, b) => JSON.stringify(a ?? null) === JSON.stringify(b ?? null);
          if (String(payload.course_public_id) === String(current.course_public_id)) delete data.course_public_id;
          if (String(payload.name) === String(current.name)) delete data.name;
          if (String(payload.level) === String(current.level)) delete data.level;
          if (String(payload.start_date) === String(current.start_date)) delete data.start_date;
          if (String(payload.end_date || '') === String(current.end_date || '')) delete data.end_date;
          if (String(monthly_price) === String(current.monthly_price)) delete data.monthly_price;
          if (String(payload.description || '') === String(current.description || '')) delete data.description;
          // normalize current.schedule (may be JSON string)
          let currentSchedule = current.schedule;
          if (!Array.isArray(currentSchedule)) {
            try { currentSchedule = JSON.parse(currentSchedule || '[]'); } catch (_) { currentSchedule = []; }
          }
          if (eq(schedule, currentSchedule)) delete data.schedule;
          // For update, keep professor_class_pay only when user provided a new non-empty value; otherwise don't send it
          if (!(payload.professor_class_pay != null && String(payload.professor_class_pay).trim() !== '')) {
            delete data.professor_class_pay;
          }

          // Professors: compute additions and removals
          const currentProfIds = (current.professors || []).map(p => p.public_id);
          const newProfIds = (payload.professors || []);
          const profAdd = newProfIds.filter(id => !currentProfIds.includes(id));
          const profRemove = currentProfIds.filter(id => !newProfIds.includes(id));
          if (profAdd.length > 0) {
            data.professors = profAdd;
          } else {
            delete data.professors;
          }
          if (profRemove.length > 0) {
            data.professors_remove = profRemove;
          }

          // Students: compute additions and removals
          const currentStudentIds = (current.students || []).map(s => s.public_id);
          const newStudentIds = (payload.students || []);
          const studentAdd = newStudentIds.filter(id => !currentStudentIds.includes(id));
          const studentRemove = currentStudentIds.filter(id => !newStudentIds.includes(id));
          if (studentAdd.length > 0) {
            data.students = studentAdd;
          } else {
            delete data.students;
          }
          if (studentRemove.length > 0) {
            data.students_remove = studentRemove;
          }
        }
        await apiFetch(endpoint, { method: 'POST', body: data });
        break;
      }
      case 'student': {
        const endpoint = 'api/registrations.php';
        const action = mode === 'edit' ? 'update_student' : 'create_student';
        let mergedNotes = {};
        if (mode === 'edit') {
          const current = state.data.students.find((s) => s.public_id === publicId);
          try { mergedNotes = JSON.parse(current?.notes || '{}'); } catch (_) { mergedNotes = {}; }
        }
        const data = {
          action,
          first_name: payload.first_name,
          last_name: payload.last_name,
          national_id: payload.national_id,
          phone: payload.phone,
          address: payload.address,
          age: payload.age,
          registration_date: payload.registration_date,
          notes: JSON.stringify({
            ...mergedNotes,
            ...(payload.parent_name ? { parent_name: payload.parent_name } : {}),
            ...(payload.parent_phone ? { parent_phone: payload.parent_phone } : {}),
            ...(payload.email ? { email: payload.email } : {}),
            ...(payload.skills ? { skills: payload.skills } : {}),
            ...(payload.description ? { description: payload.description } : {}),
          }),
        };
        if (mode === 'edit') {
          data.public_id = publicId;
          const current = state.data.students.find((s) => s.public_id === publicId) || {};
          if (String(payload.first_name) === String(current.first_name)) delete data.first_name;
          if (String(payload.last_name) === String(current.last_name)) delete data.last_name;
          if (String(payload.national_id) === String(current.national_id)) delete data.national_id;
          if (String(payload.phone) === String(current.phone)) delete data.phone;
          if (String(payload.address || '') === String(current.address || '')) delete data.address;
          if (String(payload.age || '') === String(current.age || '')) delete data.age;
          if (String(payload.registration_date) === String(current.registration_date)) delete data.registration_date;
          const currentNotesStr = (() => { try { return JSON.stringify(JSON.parse(current.notes || '{}')); } catch (_) { return '{}'; } })();
          if (data.notes === currentNotesStr) delete data.notes;
        }
        if (pin && String(pin).trim() !== '') {
          data.pin = pin;
        }
        await apiFetch(endpoint, { method: 'POST', body: data });
        break;
      }
      case 'professor': {
        const endpoint = 'api/registrations.php';
        const action = mode === 'edit' ? 'update_professor' : 'create_professor';
        let bio = payload.description;
        if (mode === 'edit' && (!bio || (typeof bio === 'string' && bio.trim() === ''))) {
          const current = state.data.professors.find((p) => p.public_id === publicId);
          bio = current?.biography || '';
        }
        const data = {
          action,
          first_name: payload.first_name,
          last_name: payload.last_name,
          national_id: payload.national_id,
          email: payload.email,
          phone: payload.phone,
          address: payload.address,
          education: payload.education,
          biography: bio,
          salary_type: payload.salary_type === 'monthly' ? 'fixed' : payload.salary_type,
          base_salary: payload.base_salary,
        };
        if (mode === 'edit') {
          data.public_id = publicId;
          const current = state.data.professors.find((p) => p.public_id === publicId) || {};
          if (String(payload.first_name) === String(current.first_name)) delete data.first_name;
          if (String(payload.last_name) === String(current.last_name)) delete data.last_name;
          if (String(payload.national_id || '') === String(current.national_id || '')) delete data.national_id;
          if (String(payload.email) === String(current.email)) delete data.email;
          if (String(payload.phone) === String(current.phone)) delete data.phone;
          if (String(payload.address || '') === String(current.address || '')) delete data.address;
          if (String(payload.education || '') === String(current.education || '')) delete data.education;
          if (String(data.salary_type) === String(current.salary_type)) delete data.salary_type;
          if (String(payload.base_salary) === String(current.base_salary)) delete data.base_salary;
          if (String(data.biography || '') === String(current.biography || '')) delete data.biography;
        }
        if (pin && String(pin).trim() !== '') {
          data.pin = pin;
        }
        {
          const res = await apiFetch(endpoint, { method: 'POST', body: data });
          const saved = res?.data;
          if (saved && mode !== 'edit') {
            // Show immediately without waiting a full reload
            state.data.professors = [saved, ...(state.data.professors || [])];
            renderProfessors();
          }
        }
        break;
      }
      case 'invoice': {
        const endpoint = 'api/payments.php';
        const action = mode === 'edit' ? 'update_invoice' : 'create_invoice';
        const tax = payload.tax || 'none';
        // Generate a batch id for multi-month payments so they can be grouped in the list
        const batchId = mode === 'create' ? `B${Date.now()}` : null;
        const buildNotesWithMeta = (notes, meta) => {
          const raw = (notes == null ? '' : String(notes)).trim();
          let obj = {};
          if (raw) {
            try {
              const parsed = JSON.parse(raw);
              if (parsed && typeof parsed === 'object') obj = parsed;
              else obj = { text: raw };
            } catch (_) {
              obj = { text: raw };
            }
          }
          Object.assign(obj, meta);
          try { return JSON.stringify(obj); } catch (_) { return raw || null; }
        };
        // Derive caps and status (sum of remaining across selected months)
        let months = Array.isArray(payload.plan_month) ? payload.plan_month : [payload.plan_month].filter(Boolean);
        // normalize and sort YYYY-MM ascending
        months = months.filter(Boolean).sort();
        const totalRemaining = months.length > 0
          ? months.reduce((sum, m) => sum + getMonthRemaining(payload.student_public_id, payload.class_public_id, m), 0)
          : Number(payload.due_amount || 0);
        let paid = Number(payload.paid_amount || 0);
        if (Number.isNaN(paid) || paid < 0) paid = 0;
        if (paid > totalRemaining) paid = totalRemaining;
        const computedStatus = paid === totalRemaining && totalRemaining > 0 ? 'paid' : 'partial';

        if (mode === 'edit') {
          // plan_month may come as array from multi-select; pick first
          const planMonth = Array.isArray(payload.plan_month) ? payload.plan_month[0] : payload.plan_month;
          const data = {
            action,
            public_id: publicId,
            student_public_id: payload.student_public_id,
            class_public_id: payload.class_public_id,
            plan_month: planMonth,
            // Keep due_amount as provided (read-only in UI during edit) to avoid rewriting existing invoice amounts
            due_amount: payload.due_amount,
            paid_amount: paid,
            status: computedStatus,
            tax,
            notes: payload.notes,
          };
          // Include PIN if provided from modal
          if (pin && String(pin).trim() !== '') {
            data.pin = pin;
          }
          await apiFetch(endpoint, { method: 'POST', body: data });
        } else {
          // Distribute a single payment across selected months in order
          let remainingPaid = paid;
          const createdIds = [];
          for (let i = 0; i < months.length; i++) {
            const m = months[i];
            const remainingForMonth = getMonthRemaining(payload.student_public_id, payload.class_public_id, m);
            if (remainingForMonth <= 0) continue; // already fully paid
            if (remainingPaid <= 0) break; // no funds left; do NOT create due-only invoices
            const toPay = Math.min(remainingPaid, remainingForMonth);
            if (toPay <= 0) break; // safety: avoid creating zero-paid invoices
            const status = toPay >= remainingForMonth ? 'paid' : 'partial';
            const data = {
              action,
              student_public_id: payload.student_public_id,
              class_public_id: payload.class_public_id,
              plan_month: m,
              due_amount: remainingForMonth,
              paid_amount: toPay,
              status,
              tax,
              notes: batchId ? buildNotesWithMeta(payload.notes, { batch_id: batchId }) : payload.notes,
            };
            // Include PIN if provided from modal
            if (pin && String(pin).trim() !== '') {
              data.pin = pin;
            }
            const res = await apiFetch(endpoint, { method: 'POST', body: data });
            const inv = res?.data;
            if (inv?.public_id) {
              createdIds.push(inv.public_id);
              state.recentInvoiceMeta[inv.public_id] = { tax, batchId, ts: Date.now() };
            }
            remainingPaid = Math.max(0, remainingPaid - toPay);
            if (remainingPaid <= 0) break;
          }
          // Persist grouping metadata so subsequent refreshes keep these invoices grouped
          persistRecentInvoiceMeta();
        }
        break;
      }
      case 'salary': {
        const endpoint = 'api/salaries.php';
        const action = mode === 'edit' ? 'update_salary' : 'create_salary';
        // Compute status and ensure amounts align with remaining due
        const prof = state.data.professors.find(p => p.public_id === payload.professor_public_id);
        const type = getProfessorType(prof);
        const monthVal = payload.pay_month;
        let due = 0;
        let baseForPeriod = 0;
        if (type === 'monthly') {
          baseForPeriod = Number(prof?.base_salary || 0);
          due = getMonthlyRemainingForProfessor(payload.professor_public_id, monthVal);
        } else if (payload.class_public_id) {
          const cls = state.data.classes.find(c => c.public_id === payload.class_public_id);
          // Prefer class-level per-class pay; then legacy per-professor pay; fallback to class monthly_price
          let base = 0;
          if (cls && cls.professor_class_pay != null && cls.professor_class_pay !== '') {
            base = Number(cls.professor_class_pay);
          } else {
            if (cls && Array.isArray(cls.professors)) {
              const p = cls.professors.find(x => x.public_id === payload.professor_public_id);
              if (p && p.pay_amount != null && p.pay_amount !== '') base = Number(p.pay_amount);
            }
            if (!base) base = Number(cls?.monthly_price || 0);
          }
          baseForPeriod = base;
          due = getClassRemainingForProfessor(payload.professor_public_id, payload.class_public_id, monthVal);
        }
        let paid = Number(payload.paid_amount || 0);
        if (!Number.isFinite(paid) || paid < 0) paid = 0;
        if (paid > due) paid = due;
        const computedStatus = paid >= due && due > 0 ? 'paid' : 'partial';
        // Base amount should reflect full base for the period (e.g., 2000), not remaining
        const base_amount = baseForPeriod;
        const data = {
          action,
          professor_public_id: payload.professor_public_id,
          class_public_id: type === 'monthly' ? null : (payload.class_public_id || null),
          pay_month: monthVal,
          base_amount,
          advances: payload.advances,
          paid_amount: String(paid),
          balance: undefined,
          status: computedStatus,
          notes: payload.notes,
        };
        if (mode === 'edit') {
          data.public_id = publicId;
        }
        // Include PIN if provided from modal
        if (pin && String(pin).trim() !== '') {
          data.pin = pin;
        }
        await apiFetch(endpoint, { method: 'POST', body: data });
        break;
      }
      default:
        break;
    }
  };

  const bindTableActions = () => {
    document.body.addEventListener('click', async (event) => {
      const target = event.target;
      if (!(target instanceof HTMLElement)) return;

      // If clicking inside an invoice row (not on action button or checkbox), open details immediately
      // but NOT when selection mode is enabled
      const invRowEarly = target.closest('tr[data-entity="invoice"]');
      if (invRowEarly && !selection.enabled) {
        const isAction = !!target.getAttribute('data-action');
        const isCheckbox = !!target.closest('.row-select');
        if (!isAction && !isCheckbox) {
          const publicId = invRowEarly.getAttribute('data-id');
          const groupAttr = invRowEarly.getAttribute('data-group-ids') || '';
          const groupIds = groupAttr.split(',').map(s => s.trim()).filter(Boolean);
          if (groupIds.length > 1) {
            showInvoiceGroupDetails(groupIds);
            return;
          }
          if (publicId) {
            showInvoiceDetails(publicId);
            return;
          }
        }
      }

      // Avoid intercepting clicks on selection checkboxes
      if (target.closest('.row-select')) return;

      // If selection mode is enabled, any click on a row toggles its checkbox selection and prevents view modals
      if (selection.enabled) {
        const row = target.closest('tr');
        if (row) {
          let cb = row.querySelector('.row-select');
          if (!cb) {
            // if selection just enabled, UI might need to be updated
            updateTableSelectionUI();
            cb = row.querySelector('.row-select');
          }
          if (cb) {
            const multi = (event.ctrlKey === true) || (event.metaKey === true);
            if (!multi) {
              // clear others in the same active section
              const activeSection = document.querySelector('.section.active');
              activeSection?.querySelectorAll('.row-select').forEach(other => { if (other !== cb) other.checked = false; });
              cb.checked = true;
            } else {
              // toggle only this row
              cb.checked = !cb.checked;
            }
            return; // prevent opening view modals while selecting
          }
        }
      }

      // Check if the target or its parent row has class entity
      const row = target.closest('tr[data-entity="class"]');
      if (row && !target.getAttribute('data-action')) {
        const publicId = row.getAttribute('data-id');
        if (publicId) {
          await showClassDetails(publicId);
          return;
        }
      }

      // Student row: open details
      const sRow = target.closest('tr[data-entity="student"]');
      if (sRow && !target.getAttribute('data-action')) {
        const publicId = sRow.getAttribute('data-id');
        if (publicId) {
          showStudentDetails(publicId);
          return;
        }
      }

      // Professor row: open details
      const pRow = target.closest('tr[data-entity="professor"]');
      if (pRow && !target.getAttribute('data-action')) {
        const publicId = pRow.getAttribute('data-id');
        if (publicId) {
          showProfessorDetails(publicId);
          return;
        }
      }

      // Salary row: open details
      const salRow = target.closest('tr[data-entity="salary"]');
      if (salRow && !target.getAttribute('data-action')) {
        const publicId = salRow.getAttribute('data-id');
        if (publicId) {
          showSalaryDetails(publicId);
          return;
        }
      }

      // (Handled early) Invoice row view is prioritized above selection mode.

      const action = target.getAttribute('data-action');
      const entity = target.getAttribute('data-entity');
      const publicId = target.getAttribute('data-id');

      if (!action || !entity || !publicId) return;

      if (action === 'edit') {
        handleEdit(entity, publicId);
      }

      if (action === 'view' && entity === 'professor') {
        showProfessorDetails(publicId);
        return;
      }

      if (action === 'delete') {
        if (!confirm(t('confirm-delete') || 'A jeni i sigurt që doni të fshini këtë element?')) {
          return;
        }
        const mode = 'delete';
        let pin = null;

        // Check if PIN is required for delete
        const pinRequired = await isPinRequiredForAction(entity, mode);
        if (pinRequired) {
          try {
            pin = await requestPinForAction();
          } catch (error) {
            if (error.message === 'PIN request cancelled') {
              return;
            }
            showToast('error', 'Gabim në verifikimin e PIN-it');
            return;
          }
        }

        try {
          await handleDelete(entity, publicId, pin);
          showToast('success', 'toast-deleted');
          // Reload to recompute monthly remaining and update UI
          await loadDashboardData();
        } catch (error) {
          console.error(error);
          showToast('error', error?.error ?? 'toast-error');
        }
      }

      if (action === 'print' && entity === 'invoice') {
        const row = target.closest('tr[data-entity="invoice"]');
        const groupAttr = row?.getAttribute('data-group-ids') || '';
        const groupIds = groupAttr.split(',').map(s => s.trim()).filter(Boolean);
        if (groupIds.length > 1) {
          const invs = groupIds.map(id => state.data.invoices.find(i => i.public_id === id)).filter(Boolean);
          if (invs.length) openInvoiceTemplateForGroup(invs);
        } else {
          const inv = state.data.invoices.find(i => i.public_id === publicId);
          if (inv) openInvoiceTemplateForSingle(inv);
        }
      }

      if (action === 'print' && entity === 'salary') {
        const sal = state.data.salaries.find(s => s.public_id === publicId);
        if (sal) openSalaryTemplateForSingle(sal);
      }
    });

    // Allow double-click to open details even when selection mode is enabled
    document.body.addEventListener('dblclick', async (event) => {
      const target = event.target;
      if (!(target instanceof HTMLElement)) return;

      const classRow = target.closest('tr[data-entity="class"]');
      const studentRow = target.closest('tr[data-entity="student"]');
      const profRow = target.closest('tr[data-entity="professor"]');
      const invRow = target.closest('tr[data-entity="invoice"]');
      const salaryRow = target.closest('tr[data-entity="salary"]');

      if (classRow) {
        const id = classRow.getAttribute('data-id');
        if (id) await showClassDetails(id);
        return;
      }
      if (studentRow) {
        const id = studentRow.getAttribute('data-id');
        if (id) showStudentDetails(id);
        return;
      }
      if (profRow) {
        const id = profRow.getAttribute('data-id');
        if (id) showProfessorDetails(id);
        return;
      }
      if (invRow) {
        const id = invRow.getAttribute('data-id');
        const groupAttr = invRow.getAttribute('data-group-ids') || '';
        const groupIds = groupAttr.split(',').map(s => s.trim()).filter(Boolean);
        if (groupIds.length > 1) showInvoiceGroupDetails(groupIds);
        else if (id) showInvoiceDetails(id);
        return;
      }
      if (salaryRow) {
        const id = salaryRow.getAttribute('data-id');
        if (id) showSalaryDetails(id);
        return;
      }
    });
  };

  const parseTaxFromNotes = (notes) => {
    try { const obj = JSON.parse(notes || ''); if (obj && typeof obj === 'object' && obj.tax) return String(obj.tax); } catch (_) { }
    return null;
  };
  const getEffectiveTax = (inv) => {
    const override = state.recentInvoiceMeta[inv.public_id]?.tax;
    if (override) return override;
    if (inv.tax && inv.tax !== '') return String(inv.tax);
    const fromNotes = parseTaxFromNotes(inv.notes || '');
    return fromNotes || 'none';
  };

  const showInvoiceGroupDetails = (ids) => {
    const invs = ids.map(id => state.data.invoices.find(i => i.public_id === id)).filter(Boolean);
    if (!invs.length) return;
    const modal = document.querySelector('#modal-invoice-details');
    if (!modal) return;
    const first = invs[0];
    const student = state.data.students.find(s => s.public_id === first.student_public_id);
    const cls = state.data.classes.find(c => c.public_id === first.class_public_id);
    const months = invs.map(i => i.plan_month).sort();
    const totalDue = invs.reduce((s, i) => s + Number(i.due_amount || 0), 0);
    const totalPaid = invs.reduce((s, i) => s + Number(i.paid_amount || 0), 0);
    const status = totalPaid >= totalDue && totalDue > 0 ? 'paid' : (totalPaid > 0 ? 'partial' : 'due');
    // Tax uniformity
    const taxes = Array.from(new Set(invs.map(getEffectiveTax)));
    const taxLabel = taxes.length === 1 ? t('tax-' + taxes[0]) : (state.lang === 'sq' ? 'Tatim i përzier' : 'Mixed tax');

    // Show only the base id for groups (no (+N) suffix)
    modal.querySelector('.invoice-details-id').textContent = `${ids[0]}`;
    modal.querySelector('.invoice-student').textContent = first.student_public_id + (student ? ` — ${student.first_name} ${student.last_name}` : '');
    modal.querySelector('.invoice-class').textContent = first.class_public_id + (cls ? ` — ${cls.name}` : '');
    modal.querySelector('.invoice-month').textContent = months.map(m => formatMonth(m)).join(', ');
    modal.querySelector('.invoice-due').textContent = formatCurrency(totalDue);
    modal.querySelector('.invoice-paid').textContent = formatCurrency(totalPaid);
    modal.querySelector('.invoice-status').textContent = t('status-' + status);
    const taxContainer = modal.querySelector('.invoice-tax');
    if (taxContainer) taxContainer.textContent = taxLabel || '—';
    // Build per-month lines in notes area
    const notesEl = modal.querySelector('.invoice-notes');
    if (notesEl) {
      const lines = invs
        .slice()
        .sort((a, b) => a.plan_month.localeCompare(b.plan_month))
        .map(i => `${formatMonth(i.plan_month)} — ${t('table-amount')}: ${formatCurrency(i.due_amount)} • ${t('label-paid')}: ${formatCurrency(i.paid_amount)}`);
      notesEl.textContent = lines.join('\n');
    }
    // Insert VAT breakdown for group if uniform and vat8/vat18
    const prevBreak = modal.querySelector('.vat-breakdown');
    if (prevBreak) prevBreak.remove();
    const effective = taxes.length === 1 ? taxes[0] : null;
    if (effective === 'vat8' || effective === 'vat18') {
      const rate = effective === 'vat18' ? 0.18 : 0.08;
      const currency = state.data.settings?.app?.currency || 'EUR';
      const net = totalPaid / (1 + rate);
      const vat = Math.max(0, totalPaid - net);
      const vatPctLabel = `${Math.round(rate * 100)}%`;
      const breakdown = document.createElement('div');
      breakdown.className = 'vat-breakdown';
      breakdown.style.marginBottom = '8px';
      breakdown.innerHTML = `
        <div><strong>${t('receipt-net-total')}:</strong> ${formatCurrency(net)} (${currency})</div>
        <div><strong>${t('receipt-vat')} (${vatPctLabel}):</strong> ${formatCurrency(vat)} (${currency})</div>
        <div><strong>${t('receipt-gross-total')}:</strong> ${formatCurrency(totalPaid)} (${currency})</div>`;
      const detailsSection = notesEl?.parentElement || modal.querySelector('.details-section');
      detailsSection?.insertBefore(breakdown, notesEl || detailsSection.firstChild);
    }
    // Bind print for group (use branded invoice template)
    const printBtn = modal.querySelector('[data-invoice-print]');
    if (printBtn) {
      printBtn.onclick = () => openInvoiceTemplateForGroup(invs);
    }
    openModal('invoice-details');
  };

  const openGroupReceiptWindow = (invoices) => {
    if (!invoices || invoices.length === 0) return;
    const first = invoices[0];
    const student = state.data.students.find(s => s.public_id === first.student_public_id);
    const clazz = state.data.classes.find(c => c.public_id === first.class_public_id);
    const course = clazz ? state.data.courses.find(c => c.public_id === clazz.course_public_id) : null;
    const currency = state.data.settings?.app?.currency || 'EUR';
    const months = invoices.map(i => i.plan_month).sort();
    const totalPaid = invoices.reduce((s, i) => s + Number(i.paid_amount || 0), 0);
    const totalDue = invoices.reduce((s, i) => s + Number(i.due_amount || 0), 0);
    const statusClass = totalPaid >= totalDue && totalDue > 0 ? 'paid' : (totalPaid > 0 ? 'partial' : 'due');
    const taxes = Array.from(new Set(invoices.map(getEffectiveTax)));
    const effective = taxes.length === 1 ? taxes[0] : null;
    const rate = effective === 'vat18' ? 0.18 : effective === 'vat8' ? 0.08 : 0;
    const net = rate > 0 ? (totalPaid / (1 + rate)) : totalPaid;
    const vat = Math.max(0, totalPaid - net);
    const vatPctLabel = `${Math.round(rate * 100)}%`;
    const w = window.open('', '_blank');
    if (!w) return;
    const styles = `
      <style>
        body { font-family: system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif; padding: 24px; }
        .header { display:flex; justify-content: space-between; align-items: center; margin-bottom: 16px; }
        h1 { font-size: 18px; margin: 0; }
        .meta { font-size: 12px; color: #555; }
        table { width: 100%; border-collapse: collapse; margin-top: 16px; }
        th, td { padding: 6px 4px; vertical-align: top; border-bottom: 1px solid #eee; }
        .right { text-align: right; }
        .total { font-weight: bold; border-top: 1px solid #ccc; }
        .badge { display:inline-block; padding: 2px 6px; border-radius: 12px; font-size: 12px; }
        .badge.paid { background: #e6ffed; color: #067d1f; }
        .badge.partial { background: #fff4e5; color: #8a5b00; }
        .badge.due { background: #ffe6e6; color: #9b1c1c; }
        .print { margin-top: 20px; }
      </style>`;
    const rows = invoices
      .slice()
      .sort((a, b) => a.plan_month.localeCompare(b.plan_month))
      .map(i => `<tr><td>${formatMonth(i.plan_month)}</td><td class="right">${formatCurrency(i.due_amount)}</td><td class="right">${formatCurrency(i.paid_amount)}</td></tr>`)
      .join('');
    const html = `
      <!doctype html>
      <html>
        <head>
          <meta charset="utf-8">
          <title>${t('table-receipt')} ${first.public_id}</title>
          ${styles}
        </head>
        <body>
          <div class="header">
            <h1>${t('table-receipt')} • ${first.public_id}</h1>
            <div class="meta">${new Date().toLocaleString()}</div>
          </div>
          <table>
            <tr><td>ID</td><td>${first.public_id}</td></tr>
            <tr><td>${t('table-student')}</td><td>${first.student_public_id}${student ? ` — ${student.first_name} ${student.last_name}` : ''}</td></tr>
            <tr><td>${t('table-class')}</td><td>${first.class_public_id}${clazz ? ` — ${clazz.name}` : ''}${course ? ` (${course.name})` : ''}</td></tr>
            <tr><td>${t('label-tax')}</td><td>${effective ? t('tax-' + effective) : '—'}</td></tr>
          </table>
          <table>
            <thead><tr><th>${t('table-month')}</th><th class="right">${t('table-amount')}</th><th class="right">${t('label-paid')}</th></tr></thead>
            <tbody>${rows}
              <tr class="total"><td>Total</td><td class="right">${formatCurrency(totalDue)}</td><td class="right">${formatCurrency(totalPaid)}</td></tr>
            </tbody>
          </table>
          ${rate > 0 ? `
          <table>
            <tr><td>${t('receipt-net-total')}</td><td class="right">${formatCurrency(net)} (${currency})</td></tr>
            <tr><td>${t('receipt-vat')} (${vatPctLabel})</td><td class="right">${formatCurrency(vat)} (${currency})</td></tr>
            <tr class="total"><td>${t('receipt-gross-total')}</td><td class="right">${formatCurrency(totalPaid)} (${currency})</td></tr>
          </table>` : ''}
          <div class="print">
            <button onclick="window.print()">${t('action-print')}</button>
          </div>
        </body>
      </html>`;
    w.document.open();
    w.document.write(html);
    w.document.close();
  };

  const openReceiptWindow = (invoice) => {
    const student = state.data.students.find(s => s.public_id === invoice.student_public_id);
    const clazz = state.data.classes.find(c => c.public_id === invoice.class_public_id);
    const course = clazz ? state.data.courses.find(c => c.public_id === clazz.course_public_id) : null;
    const currency = state.data.settings?.app?.currency || 'EUR';
    // VAT breakdown (inclusive pricing): treat stored amounts as gross, compute net + VAT for display
    const taxCode = String(getEffectiveTax(invoice) || 'none');
    const vatRate = taxCode === 'vat18' ? 0.18 : (taxCode === 'vat8' ? 0.08 : 0);
    const grossPaid = Number(invoice.paid_amount || 0);
    const netPaid = vatRate > 0 ? (grossPaid / (1 + vatRate)) : grossPaid;
    const vatPaid = Math.max(0, grossPaid - netPaid);
    const vatPctLabel = `${Math.round(vatRate * 100)}%`;
    const w = window.open('', '_blank');
    if (!w) return;
    const styles = `
      <style>
        body { font-family: system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif; padding: 24px; }
        .header { display:flex; justify-content: space-between; align-items: center; margin-bottom: 16px; }
        h1 { font-size: 18px; margin: 0; }
        .meta { font-size: 12px; color: #555; }
        table { width: 100%; border-collapse: collapse; margin-top: 16px; }
        td { padding: 6px 4px; vertical-align: top; }
        .right { text-align: right; }
        .total { font-weight: bold; border-top: 1px solid #ccc; }
        .badge { display:inline-block; padding: 2px 6px; border-radius: 12px; font-size: 12px; }
        .badge.paid { background: #e6ffed; color: #067d1f; }
        .badge.partial { background: #fff4e5; color: #8a5b00; }
        .badge.due { background: #ffe6e6; color: #9b1c1c; }
        .print { margin-top: 20px; }
      </style>`;
    const statusClass = invoice.status === 'paid' ? 'paid' : invoice.status === 'partial' ? 'partial' : 'due';
    const html = `
      <!doctype html>
      <html>
        <head>
          <meta charset="utf-8">
          <title>${t('table-receipt')} ${invoice.public_id}</title>
          ${styles}
        </head>
        <body>
          <div class="header">
            <h1>${t('table-receipt')} • ${invoice.public_id}</h1>
            <div class="meta">${new Date().toLocaleString()}</div>
          </div>
          <table>
            <tr><td>ID</td><td>${invoice.public_id}</td></tr>
            <tr><td>${t('table-student')}</td><td>${invoice.student_public_id}${student ? ` — ${student.first_name} ${student.last_name}` : ''}</td></tr>
            <tr><td>${t('table-class')}</td><td>${invoice.class_public_id}${clazz ? ` — ${clazz.name}` : ''}${course ? ` (${course.name})` : ''}</td></tr>
            <tr><td>${t('table-month')}</td><td>${formatMonth(invoice.plan_month)}</td></tr>
            <tr><td>${t('table-amount')}</td><td>${formatCurrency(invoice.due_amount)} (${currency})</td></tr>
            ${invoice.tax ? `<tr><td>${t('label-tax')}</td><td>${t('tax-' + String(invoice.tax))}</td></tr>` : ''}
            <tr><td>${t('label-paid')}</td><td>${formatCurrency(invoice.paid_amount)} (${currency})</td></tr>
            ${vatRate > 0 ? `
            <tr><td colspan="2"><hr></td></tr>
            <tr><td>${t('receipt-net-total')}</td><td class="right">${formatCurrency(netPaid)} (${currency})</td></tr>
            <tr><td>${t('receipt-vat')} (${vatPctLabel})</td><td class="right">${formatCurrency(vatPaid)} (${currency})</td></tr>
            <tr class="total"><td>${t('receipt-gross-total')}</td><td class="right">${formatCurrency(grossPaid)} (${currency})</td></tr>
            ` : ''}
            <tr><td>${t('table-status')}</td><td><span class="badge ${statusClass}">${t('status-' + invoice.status)}</span></td></tr>
            <tr><td>${t('table-confirmed')}</td><td>${invoice.confirmed_at ? formatDate(invoice.confirmed_at) : '—'}</td></tr>
          </table>
          <div class="print">
            <button onclick="window.print()">${t('action-print')}</button>
          </div>
        </body>
      </html>
    `;
    w.document.open();
    w.document.write(html);
    w.document.close();
  };

  const showStudentDetails = (publicId) => {
    const student = state.data.students.find(s => s.public_id === publicId);
    if (!student) return;
    const modal = document.querySelector('#modal-student-details');
    if (!modal) return;
    modal.querySelector('.student-details-id').textContent = student.public_id || '';
    modal.querySelector('.student-name').textContent = `${student.first_name || ''} ${student.last_name || ''}`.trim();
    modal.querySelector('.student-nid').textContent = student.national_id || '—';
    modal.querySelector('.student-age').textContent = student.age || '—';
    modal.querySelector('.student-registered').textContent = formatDate(student.registration_date);
    modal.querySelector('.student-phone').textContent = student.phone || '—';
    // optional fields from notes
    let email = ''; let address = student.address || ''; let parentName = ''; let parentPhone = ''; let skills = ''; let description = '';
    try {
      const extra = JSON.parse(student.notes || '{}');
      email = extra.email || '';
      parentName = extra.parent_name || '';
      parentPhone = extra.parent_phone || '';
      skills = extra.skills || '';
      description = extra.description || '';
    } catch (_) { /* ignore */ }
    modal.querySelector('.student-email').textContent = email || '—';
    modal.querySelector('.student-address').textContent = address || '—';
    modal.querySelector('.student-parent-name').textContent = parentName || '—';
    modal.querySelector('.student-parent-phone').textContent = parentPhone || '—';
    modal.querySelector('.student-skills').textContent = skills || '—';
    modal.querySelector('.student-description').textContent = description || '—';

    // Classes where this student is enrolled
    const classes = state.data.classes.filter(c => (c.students || []).some(s => s.public_id === publicId));
    const classesHtml = classes.length ? classes.map(c => `<div class="person-item">${c.public_id} — ${c.name}</div>`).join('') : '<div class="no-data">—</div>';
    modal.querySelector('.student-classes').innerHTML = classesHtml;

    // Invoices for this student
    const invoices = state.data.invoices.filter(inv => inv.student_public_id === publicId);
    const invHtml = invoices.length ? invoices.map(inv => `
      <div class="payment-plan-item">
        <div><strong>${formatMonth(inv.plan_month)}</strong> — ${inv.class_public_id}</div>
        <div>${formatCurrency(inv.due_amount)} · ${t('label-paid')}: ${formatCurrency(inv.paid_amount)} · <span class="status-chip ${inv.status}">${t('status-' + inv.status)}</span></div>
      </div>
    `).join('') : '<div class="no-data">—</div>';
    modal.querySelector('.student-invoices').innerHTML = invHtml;

    openModal('student-details');
  };

  const showProfessorDetails = (publicId) => {
    const prof = state.data.professors.find(p => p.public_id === publicId);
    if (!prof) return;
    const modal = document.querySelector('#modal-professor-details');
    if (!modal) return;
    modal.querySelector('.professor-details-id').textContent = prof.public_id || '';
    modal.querySelector('.professor-name').textContent = `${prof.first_name || ''} ${prof.last_name || ''}`.trim();
    modal.querySelector('.professor-salary').textContent = formatCurrency(prof.base_salary);
    modal.querySelector('.professor-phone').textContent = prof.phone || '—';
    modal.querySelector('.professor-email').textContent = prof.email || '—';
    modal.querySelector('.professor-address').textContent = prof.address || '—';
    modal.querySelector('.professor-national').textContent = prof.national_id || '—';
    modal.querySelector('.professor-education').textContent = prof.education || '—';
    modal.querySelector('.professor-bio').textContent = prof.biography || '—';
    const salaryType = prof.salary_type === 'fixed' ? (state.lang === 'sq' ? 'Mujore' : 'Monthly') : (prof.salary_type || '—');
    modal.querySelector('.professor-salary-type').textContent = salaryType;

    // Classes taught by this professor
    const classes = state.data.classes.filter(c => (c.professors || []).some(p => p.public_id === publicId));
    const classesHtml = classes.length ? classes.map(c => `<div class="person-item">${c.public_id} — ${c.name}</div>`).join('') : '<div class="no-data">—</div>';
    modal.querySelector('.professor-classes').innerHTML = classesHtml;

    // Salaries for this professor
    const salaries = state.data.salaries.filter(s => s.professor_public_id === publicId);
    const salHtml = salaries.length ? salaries.map(s => {
      // Compute display base: for per-class use class/professor-class pay priority; for monthly use professor base
      let baseDisplay = 0;
      if (s.class_public_id) {
        const cls = state.data.classes.find(c => c.public_id === s.class_public_id);
        if (cls && cls.professor_class_pay != null && cls.professor_class_pay !== '') baseDisplay = Number(cls.professor_class_pay);
        else if (cls && Array.isArray(cls.professors)) {
          const p = cls.professors.find(x => x.public_id === publicId);
          if (p && p.pay_amount != null && p.pay_amount !== '') baseDisplay = Number(p.pay_amount);
        }
        if (!baseDisplay) baseDisplay = Number(cls?.monthly_price || 0);
      } else {
        baseDisplay = Number(prof.base_salary || 0);
      }
      return `
        <div class="payment-plan-item">
          <div><strong>${formatMonth(s.pay_month)}</strong> — ${s.class_public_id || '—'}</div>
          <div>${formatCurrency(baseDisplay)} · ${t('label-advances')}: ${formatCurrency(s.advances)} · <span class="status-chip ${s.status}">${t('status-' + s.status)}</span></div>
        </div>
      `;
    }).join('') : '<div class="no-data">—</div>';
    modal.querySelector('.professor-salaries').innerHTML = salHtml;

    openModal('professor-details');
  };

  const handleEdit = (entity, publicId) => {
    const map = {
      course: ['course', state.data.courses],
      class: ['class', state.data.classes],
      student: ['student', state.data.students],
      professor: ['professor', state.data.professors],
      invoice: ['invoice', state.data.invoices],
      salary: ['salary', state.data.salaries],
    };

    const entry = map[entity];
    if (!entry) return;
    const [modalId, collection] = entry;
    const data = collection.find((item) => item.public_id === publicId);
    if (!data) return;

    const normalized = { ...data };

    if (modalId === 'class') {
      // Keep schedule array for openModal prefill
      try {
        normalized.schedule = Array.isArray(data.schedule)
          ? data.schedule
          : JSON.parse(data.schedule || '[]');
      } catch (_) {
        normalized.schedule = [];
      }
      // prefill course and description
      normalized.course_public_id = data.course_public_id || '';
      normalized.description = data.description || '';
      normalized.professors = data.professors?.map((prof) => prof.public_id) || [];
      normalized.students = data.students?.map((student) => student.public_id) || [];
      // Prefill professor_class_pay: prefer class-level field if present; otherwise if all linked professors share the same pay_amount (uniform), use that; else leave blank
      try {
        if (data.professor_class_pay != null && String(data.professor_class_pay) !== '') {
          normalized.professor_class_pay = data.professor_class_pay;
        } else {
          const pays = (Array.isArray(data.professors) ? data.professors : []).map(p => {
            const val = p && Object.prototype.hasOwnProperty.call(p, 'pay_amount') ? p.pay_amount : null;
            return (val === '' || val == null) ? null : Number(val);
          }).filter(v => v != null);
          const unique = Array.from(new Set(pays.map(v => String(v))));
          if (unique.length === 1) {
            normalized.professor_class_pay = unique[0];
          }
        }
      } catch (_) { /* ignore */ }
      // payment plan removed
    }

    if (modalId === 'invoice') {
      normalized.student_public_id = data.student_public_id;
      normalized.class_public_id = data.class_public_id;
      normalized.plan_month = data.plan_month;
    }

    if (modalId === 'salary') {
      normalized.professor_public_id = data.professor_public_id;
      normalized.class_public_id = data.class_public_id || '';
    }

    if (modalId === 'student') {
      // Pre-fill from notes JSON if present
      try {
        const extra = JSON.parse(data.notes || '{}');
        if (extra && typeof extra === 'object') {
          normalized.parent_name = extra.parent_name || '';
          normalized.parent_phone = extra.parent_phone || '';
          normalized.email = extra.email || '';
          normalized.skills = extra.skills || '';
          normalized.description = extra.description || '';
        }
      } catch (_) {
        /* ignore */
      }
    }

    if (modalId === 'professor') {
      // Map biography to description field
      normalized.description = data.biography || '';
      normalized.national_id = data.national_id || '';
      // map DB salary_type to UI value
      // DB uses 'fixed' for monthly
      normalized.salary_type = data.salary_type === 'fixed' ? 'monthly' : data.salary_type;
    }

    openModal(modalId, 'edit', { ...normalized, public_id: publicId });
  };

  const handleDelete = async (entity, publicId, pin = null) => {
    const deleteData = { public_id: publicId };
    if (pin && String(pin).trim() !== '') {
      deleteData.pin = pin;
    }

    switch (entity) {
      case 'course':
        await apiFetch('api/registrations.php', {
          method: 'POST',
          body: { action: 'delete_course', ...deleteData },
        });
        break;
      case 'class':
        await apiFetch('api/registrations.php', {
          method: 'POST',
          body: { action: 'delete_class', ...deleteData },
        });
        break;
      case 'student':
        await apiFetch('api/registrations.php', {
          method: 'POST',
          body: { action: 'delete_student', ...deleteData },
        });
        break;
      case 'professor':
        await apiFetch('api/registrations.php', {
          method: 'POST',
          body: { action: 'delete_professor', ...deleteData },
        });
        break;
      case 'invoice':
        await apiFetch('api/payments.php', {
          method: 'POST',
          body: { action: 'delete_invoice', ...deleteData },
        });
        break;
      case 'salary':
        await apiFetch('api/salaries.php', {
          method: 'POST',
          body: { action: 'delete_salary', ...deleteData },
        });
        break;
      default:
        break;
    }
  };

  const showClassDetails = async (publicId) => {
    try {
      const response = await apiFetch(`api/class-details.php?id=${encodeURIComponent(publicId)}`);
      const classData = response.class;
      populateClassDetailsModal(classData);
      openModal('class-details');
    } catch (error) {
      console.error(error);
      showToast('error', error?.error ?? 'toast-error');
    }
  };

  const populateClassDetailsModal = (classData) => {
    const modal = document.querySelector('#modal-class-details');
    if (!modal) return;
    // store class id for follow-up actions
    modal.dataset.classId = classData.public_id || '';

    // Basic information
    modal.querySelector('.class-details-id').textContent = classData.public_id || '';
    modal.querySelector('.class-name').textContent = classData.name || '—';
    modal.querySelector('.class-course').textContent = classData.course_name ?
      `${classData.course_public_id} — ${classData.course_name}` : (classData.course_public_id || '—');
    modal.querySelector('.class-level').textContent = classData.level || '—';
    modal.querySelector('.class-price').textContent = formatCurrency(classData.monthly_price);

    // Period
    const startDate = formatDate(classData.start_date);
    const endDate = classData.end_date ? formatDate(classData.end_date) : '—';
    modal.querySelector('.class-period').textContent = `${startDate} – ${endDate}`;

    // Schedule
    const scheduleContainer = modal.querySelector('.class-schedule');
    // Normalize schedule to array
    let scheduleArr = [];
    if (Array.isArray(classData.schedule)) {
      scheduleArr = classData.schedule;
    } else {
      try { scheduleArr = JSON.parse(classData.schedule || '[]'); } catch (_) { scheduleArr = []; }
    }
    if (scheduleArr.length > 0) {
      const dayNames = {
        'mon': 'E hënë',
        'tue': 'E martë',
        'wed': 'E mërkurë',
        'thu': 'E enjte',
        'fri': 'E premte',
        'sat': 'E shtunë',
        'sun': 'E diel'
      };

      scheduleContainer.innerHTML = scheduleArr.map(entry => {
        if (typeof entry === 'object' && entry.day) {
          const dayName = dayNames[entry.day] || entry.day;
          const timeRange = entry.start && entry.end ? `${entry.start} - ${entry.end}` : '';
          return `<div class="schedule-item"><strong>${dayName}:</strong> ${timeRange}</div>`;
        }
        return '';
      }).filter(Boolean).join('');
    } else {
      scheduleContainer.innerHTML = '<div class="no-data">—</div>';
    }

    // Professors (show class-level per-class pay if available, and legacy per-professor if present)
    const professorsContainer = modal.querySelector('.class-professors');
    if (classData.professors && classData.professors.length > 0) {
      const header = (classData.professor_class_pay != null && classData.professor_class_pay !== '')
        ? `<div class="person-item"><em>Paga profesorit (për klasë): ${formatCurrency(Number(classData.professor_class_pay))}</em></div>`
        : '';
      professorsContainer.innerHTML = header + classData.professors.map(prof => {
        const pay = (prof && Object.prototype.hasOwnProperty.call(prof, 'pay_amount') && prof.pay_amount != null && prof.pay_amount !== '')
          ? ` · paga për klasë: ${formatCurrency(Number(prof.pay_amount))}`
          : '';
        return `<div class="person-item">${prof.public_id} — ${prof.first_name} ${prof.last_name}${pay}</div>`;
      }).join('');
    } else {
      professorsContainer.innerHTML = '<div class="no-data">—</div>';
    }

    // Students
    const studentsContainer = modal.querySelector('.class-students');
    if (classData.students && classData.students.length > 0) {
      studentsContainer.innerHTML = classData.students.map(student =>
        `<div class="person-item">${student.public_id} — ${student.first_name} ${student.last_name}</div>`
      ).join('');
    } else {
      studentsContainer.innerHTML = '<div class="no-data">—</div>';
    }

    // Description
    const descriptionContainer = modal.querySelector('.class-description');
    descriptionContainer.textContent = classData.description || '—';

    // Payment plan
    const paymentPlanContainer = modal.querySelector('.class-payment-plan');
    if (classData.payment_plan && classData.payment_plan.length > 0) {
      paymentPlanContainer.innerHTML = classData.payment_plan.map(plan => {
        const month = formatMonth(plan.plan_month);
        const amount = formatCurrency(plan.due_amount);
        const dueDate = plan.due_date ? formatDate(plan.due_date) : '—';
        const notes = plan.notes || '';
        return `
          <div class="payment-plan-item">
            <div><strong>${month}:</strong> ${amount}</div>
            <div><small>Deri më: ${dueDate}</small></div>
            ${notes ? `<div><small>${notes}</small></div>` : ''}
          </div>
        `;
      }).join('');
    } else {
      paymentPlanContainer.innerHTML = '<div class="no-data">—</div>';
    }

    // Invoices / Payments
    const invoicesContainer = modal.querySelector('.class-invoices');
    const invoices = classData.invoices || [];
    if (invoices.length > 0) {
      invoicesContainer.innerHTML = invoices.map(inv => {
        const month = formatMonth(inv.plan_month);
        const due = formatCurrency(inv.due_amount);
        const paid = formatCurrency(inv.paid_amount);
        const statusClass = inv.status === 'paid' ? 'paid' : inv.status === 'partial' ? 'partial' : 'due';
        const confirmed = inv.confirmed_at ? formatDate(inv.confirmed_at) : '—';
        const confirmedBy = inv.confirmed_by ? String(inv.confirmed_by) : '';
        const notes = inv.notes ? String(inv.notes) : '';
        return `
          <div class="payment-plan-item">
            <div><strong>${month}</strong> — ${inv.student_public_id}</div>
            <div>${due} · ${t('label-paid')}: ${paid} · <span class="status-chip ${statusClass}">${t('status-' + inv.status)}</span></div>
            <div><small>${t('table-confirmed')}: ${confirmed}${confirmedBy ? ` • ${t('label-confirmed-by')}: ${confirmedBy}` : ''}</small></div>
            ${notes ? `<div><small>${t('label-notes')}: ${notes}</small></div>` : ''}
          </div>
        `;
      }).join('');
    } else {
      invoicesContainer.innerHTML = '<div class="no-data">—</div>';
    }

    // Bind edit button
    const editBtn = modal.querySelector('[data-class-edit]');
    if (editBtn) {
      editBtn.onclick = () => {
        closeModal(modal);
        handleEdit('class', classData.public_id);
      };
    }

    // View-only: no remove buttons here
  };
  const bindFilterInputs = () => {
    setupFilters();
  };

  const setupFilters = () => {
    // Management filters (date range + apply), injected dynamically
    const mgmtSection = document.querySelector('section[data-section="management"]');
    if (mgmtSection) {
      let mgmtFilters = mgmtSection.querySelector('#management-filters');
      if (!mgmtFilters) {
        mgmtFilters = document.createElement('div');
        mgmtFilters.className = 'filters';
        mgmtFilters.id = 'management-filters';
        const anchor = mgmtSection.querySelector('.entity-switcher') || mgmtSection.querySelector('.section-header');
        (anchor?.nextElementSibling ? anchor.parentElement.insertBefore(mgmtFilters, anchor.nextElementSibling) : mgmtSection.querySelector('.section-body')?.prepend(mgmtFilters));
      }
      mgmtFilters.innerHTML = `
        <label class="filter-field">
          <span>${t('filter-from')}</span>
          <input type="date" data-filter="mgmt-date-from">
        </label>
        <label class="filter-field">
          <span>${t('filter-to')}</span>
          <input type="date" data-filter="mgmt-date-to">
        </label>
        <div class="filter-field">
          <button type="button" class="primary" data-filter-apply="management">${t('action-apply')}</button>
        </div>`;
      const from = mgmtFilters.querySelector('[data-filter="mgmt-date-from"]');
      const to = mgmtFilters.querySelector('[data-filter="mgmt-date-to"]');
      if (from) from.value = state.filters.management.dateFrom || '';
      if (to) to.value = state.filters.management.dateTo || '';
      if (!mgmtFilters.dataset.bound) {
        mgmtFilters.dataset.bound = 'true';
        mgmtFilters.addEventListener('change', (e) => {
          const target = e.target;
          if (!(target instanceof HTMLInputElement)) return;
          const key = target.getAttribute('data-filter');
          if (key === 'mgmt-date-from') state.filters.management.dateFrom = target.value;
          if (key === 'mgmt-date-to') state.filters.management.dateTo = target.value;
        });
        mgmtFilters.addEventListener('click', (e) => {
          const btn = e.target.closest?.('[data-filter-apply="management"]');
          if (!btn) return;
          // Ensure we capture latest values even if inputs didn't fire 'change'
          const fromEl = mgmtFilters.querySelector('[data-filter="mgmt-date-from"]');
          const toEl = mgmtFilters.querySelector('[data-filter="mgmt-date-to"]');
          state.filters.management.dateFrom = fromEl?.value || '';
          state.filters.management.dateTo = toEl?.value || '';
          renderCourses();
          renderClasses();
          renderStudents();
          renderProfessors();
        });
      }
    }

    const paymentFilters = document.querySelector('#payment-filters');
    if (paymentFilters) {
      paymentFilters.innerHTML = `
        <label class="filter-field">
          <span>${t('filter-from')}</span>
          <input type="date" data-filter="payment-date-from">
        </label>
        <label class="filter-field">
          <span>${t('filter-to')}</span>
          <input type="date" data-filter="payment-date-to">
        </label>
        <div class="filter-field">
          <button type="button" class="primary" data-filter-apply="payments">${t('action-apply')}</button>
        </div>
      `;

      const fromInput = paymentFilters.querySelector('[data-filter="payment-date-from"]');
      const toInput = paymentFilters.querySelector('[data-filter="payment-date-to"]');
      if (fromInput) fromInput.value = state.filters.payments.dateFrom || '';
      if (toInput) toInput.value = state.filters.payments.dateTo || '';

      if (!paymentFilters.dataset.bound) {
        paymentFilters.dataset.bound = 'true';
        paymentFilters.addEventListener('change', (event) => {
          const target = event.target;
          if (!(target instanceof HTMLInputElement || target instanceof HTMLSelectElement)) return;
          const filter = target.getAttribute('data-filter');
          if (!filter) return;
          if (filter === 'payment-date-from') {
            state.filters.payments.dateFrom = target.value;
          }
          if (filter === 'payment-date-to') {
            state.filters.payments.dateTo = target.value;
          }
          // Do not auto-render here; Apply button will trigger rendering
        });
        paymentFilters.addEventListener('click', (e) => {
          const btn = e.target.closest?.('[data-filter-apply="payments"]');
          if (!btn) return;
          // Capture latest values in case 'change' hasn't fired yet
          const fromEl = paymentFilters.querySelector('[data-filter="payment-date-from"]');
          const toEl = paymentFilters.querySelector('[data-filter="payment-date-to"]');
          state.filters.payments.dateFrom = fromEl?.value || '';
          state.filters.payments.dateTo = toEl?.value || '';
          renderPayments();
        });
      }
    }

    const salaryFilters = document.querySelector('#salary-filters');
    if (salaryFilters) {
      salaryFilters.innerHTML = `
        <label class="filter-field">
          <span>${t('filter-from')}</span>
          <input type="date" data-filter="salary-date-from">
        </label>
        <label class="filter-field">
          <span>${t('filter-to')}</span>
          <input type="date" data-filter="salary-date-to">
        </label>
        <div class="filter-field">
          <button type="button" class="primary" data-filter-apply="salaries">${t('action-apply')}</button>
        </div>
      `;

      const fromInput = salaryFilters.querySelector('[data-filter="salary-date-from"]');
      const toInput = salaryFilters.querySelector('[data-filter="salary-date-to"]');
      if (fromInput) fromInput.value = state.filters.salaries.dateFrom || '';
      if (toInput) toInput.value = state.filters.salaries.dateTo || '';

      if (!salaryFilters.dataset.bound) {
        salaryFilters.dataset.bound = 'true';
        salaryFilters.addEventListener('change', (event) => {
          const target = event.target;
          if (!(target instanceof HTMLInputElement || target instanceof HTMLSelectElement)) return;
          const filter = target.getAttribute('data-filter');
          if (!filter) return;
          if (filter === 'salary-date-from') state.filters.salaries.dateFrom = target.value;
          if (filter === 'salary-date-to') state.filters.salaries.dateTo = target.value;
          // Do not auto-render here; Apply button will trigger rendering
        });
        salaryFilters.addEventListener('click', (e) => {
          const btn = e.target.closest?.('[data-filter-apply="salaries"]');
          if (!btn) return;
          // Capture latest values in case 'change' hasn't fired yet
          const fromEl = salaryFilters.querySelector('[data-filter="salary-date-from"]');
          const toEl = salaryFilters.querySelector('[data-filter="salary-date-to"]');
          state.filters.salaries.dateFrom = fromEl?.value || '';
          state.filters.salaries.dateTo = toEl?.value || '';
          renderSalaries();
        });
      }
    }

    const reportsFilters = document.querySelector('#reports-filters');
    if (reportsFilters) {
      const courseOptions = state.data.courses.map((c) => `<option value="${c.public_id}">${c.public_id} — ${c.name}</option>`).join('');
      const professorOptions = state.data.professors.map((p) => `<option value="${p.public_id}">${p.public_id} — ${p.first_name} ${p.last_name}</option>`).join('');
      reportsFilters.innerHTML = `
        <label class="filter-field">
          <span>Muaji nga</span>
          <input type="month" data-filter="reports-date-from">
        </label>
        <label class="filter-field">
          <span>Muaji deri</span>
          <input type="month" data-filter="reports-date-to">
        </label>
        <label class="filter-field">
          <span>Statusi</span>
          <select data-filter="reports-status">
            <option value="all">Të gjitha</option>
            <option value="paid">Paguar</option>
            <option value="partial">Partial</option>
            <option value="due">Pa paguar</option>
          </select>
        </label>
        <label class="filter-field">
          <span>Kursi</span>
          <select data-filter="reports-course">
            <option value="">Të gjithë</option>
            ${courseOptions}
          </select>
        </label>
        <label class="filter-field">
          <span>Profesori</span>
          <select data-filter="reports-professor">
            <option value="">Të gjithë</option>
            ${professorOptions}
          </select>
        </label>
        <div class="filter-field">
          <button type="button" class="primary" data-filter-apply="reports">${t('action-apply')}</button>
        </div>
      `;

      const setVals = () => {
        const f = state.filters.reports;
        reportsFilters.querySelector('[data-filter="reports-date-from"]')?.setAttribute('value', f.dateFrom || '');
        reportsFilters.querySelector('[data-filter="reports-date-to"]')?.setAttribute('value', f.dateTo || '');
        const statusSel = reportsFilters.querySelector('[data-filter="reports-status"]');
        if (statusSel) statusSel.value = f.status || 'all';
        const courseSel = reportsFilters.querySelector('[data-filter="reports-course"]');
        if (courseSel) courseSel.value = f.course || '';
        const profSel = reportsFilters.querySelector('[data-filter="reports-professor"]');
        if (profSel) profSel.value = f.professor || '';
      };
      setVals();

      if (!reportsFilters.dataset.bound) {
        reportsFilters.dataset.bound = 'true';
        reportsFilters.addEventListener('change', (event) => {
          const target = event.target;
          if (!(target instanceof HTMLInputElement || target instanceof HTMLSelectElement)) return;
          const key = target.getAttribute('data-filter');
          if (key === 'reports-date-from') state.filters.reports.dateFrom = target.value;
          if (key === 'reports-date-to') state.filters.reports.dateTo = target.value;
          if (key === 'reports-status') state.filters.reports.status = target.value;
          if (key === 'reports-course') state.filters.reports.course = target.value;
          if (key === 'reports-professor') state.filters.reports.professor = target.value;
        });
        reportsFilters.addEventListener('click', (e) => {
          const btn = e.target.closest?.('[data-filter-apply="reports"]');
          if (!btn) return;
          // sync latest values
          state.filters.reports.dateFrom = reportsFilters.querySelector('[data-filter="reports-date-from"]')?.value || '';
          state.filters.reports.dateTo = reportsFilters.querySelector('[data-filter="reports-date-to"]')?.value || '';
          state.filters.reports.status = reportsFilters.querySelector('[data-filter="reports-status"]')?.value || 'all';
          state.filters.reports.course = reportsFilters.querySelector('[data-filter="reports-course"]')?.value || '';
          state.filters.reports.professor = reportsFilters.querySelector('[data-filter="reports-professor"]')?.value || '';
          renderReports();
        });
      }
    }
  };

  const loadDashboardData = async () => {
    try {
      const management = await apiFetch('api/management.php');
      state.data.courses = management.courses || [];
      state.data.classes = management.classes || [];
      state.data.students = management.students || [];
      state.data.professors = management.professors || [];
      state.data.stats = management.stats || {};
      state.data.settings = management.settings || state.data.settings;

      const [payments, salaries] = await Promise.all([
        apiFetch('api/payments.php?t=' + Date.now()),
        apiFetch('api/salaries.php?t=' + Date.now()),
      ]);

      // Be resilient to API response shapes (array, {data:[]}, {invoices:[]}, {rows:[]})
      const normalizeList = (resp) => {
        if (Array.isArray(resp)) return resp;
        if (!resp || typeof resp !== 'object') return [];
        return resp.data || resp.invoices || resp.rows || [];
      };
      state.data.invoices = normalizeList(payments);
      state.data.salaries = normalizeList(salaries);
      
      console.log('Salaries loaded:', state.data.salaries); // Debug


      // Keep recent meta consistent with fetched invoices
      pruneRecentInvoiceMeta((state.data.invoices || []).map(i => i.public_id));

      populateSelectOptions();
      renderAll();
    } catch (error) {
      console.error(error);
      showToast('error', error?.error ?? 'toast-error');
    }
  };

  const populateSelectOptions = () => {
    const courseSelects = document.querySelectorAll('select[name="course_public_id"]');
    const professorSelects = document.querySelectorAll('select[name="professors[]"], select[name="professor_public_id"]');
    const studentSelects = document.querySelectorAll('select[name="students[]"], select[name="student_public_id"]');
    const classSelects = document.querySelectorAll('select[name="class_public_id"]');

    courseSelects.forEach((select) => {
      const isMultiple = select.multiple;
      const options = state.data.courses
        .map((course) => `<option value="${course.public_id}">${course.public_id} — ${course.name}</option>`)
        .join('');
      select.innerHTML = isMultiple ? options : `<option value="">—</option>${options}`;
    });

    professorSelects.forEach((select) => {
      const isMultiple = select.multiple;
      const options = state.data.professors
        .map((prof) => `<option value="${prof.public_id}">${prof.public_id} — ${prof.first_name} ${prof.last_name}</option>`)
        .join('');
      select.innerHTML = isMultiple ? options : `<option value="">—</option>${options}`;
    });

    studentSelects.forEach((select) => {
      const isMultiple = select.multiple;
      const options = state.data.students
        .map((student) => `<option value="${student.public_id}">${student.public_id} — ${student.first_name} ${student.last_name}</option>`)
        .join('');
      select.innerHTML = isMultiple ? options : `<option value="">—</option>${options}`;
    });

    classSelects.forEach((select) => {
      const isMultiple = select.multiple;
      const options = state.data.classes
        .map((cls) => `<option value="${cls.public_id}">${cls.public_id} — ${cls.name}</option>`)
        .join('');
      select.innerHTML = isMultiple ? options : `<option value="">—</option>${options}`;
    });

    // Bind course -> monthly_price autofill for class form
    const classForm = document.querySelector('#modal-class [data-form="class"]');
    if (classForm && !classForm.dataset.priceBound) {
      classForm.dataset.priceBound = 'true';
      const courseSel = classForm.querySelector('select[name="course_public_id"]');
      const priceInput = classForm.querySelector('input[name="monthly_price"]');
      if (priceInput) priceInput.readOnly = true;
      const applyCoursePrice = () => {
        const course = state.data.courses.find(c => c.public_id === courseSel?.value);
        if (priceInput) priceInput.value = course?.price ?? '';
      };
      courseSel?.addEventListener('change', applyCoursePrice);
      applyCoursePrice();
      // Toggle professor_class_pay: enable only if all selected professors are per-class
      const profSel = classForm.querySelector('select[name="professors[]"]');
      const classPayInput = classForm.querySelector('input[name="professor_class_pay"]');
      const allPerClass = (ids) => {
        const set = new Set(ids);
        const profs = state.data.professors.filter(p => set.has(p.public_id));
        if (profs.length === 0) return false;
        return profs.every(p => {
          const t = String(p.salary_type || '').trim().toLowerCase();
          return t === 'per-class' || t === 'perclass' || t === 'class';
        });
      };
      const applyProfPayState = () => {
        const selected = Array.from(profSel?.selectedOptions || []).map(o => o.value).filter(Boolean);
        const enable = allPerClass(selected);
        if (classPayInput) {
          classPayInput.disabled = !enable;
          classPayInput.placeholder = enable ? 'p.sh. 2000' : 'Vetëm për profesorë me pagesë “për klasë”';
          if (!enable) classPayInput.value = '';
        }
      };
      profSel?.addEventListener('change', applyProfPayState);
      applyProfPayState();
    }
  };

  // ==== Invoice helpers and UX bindings ====
  const monthRange = (start, end) => {
    const out = [];
    if (!start) return out;
    const startD = new Date(`${start}-01T00:00:00`);
    const endD = end ? new Date(`${end}-01T00:00:00`) : new Date();
    let y = startD.getFullYear();
    let m = startD.getMonth();
    const yEnd = endD.getFullYear();
    const mEnd = endD.getMonth();
    while (y < yEnd || (y === yEnd && m <= mEnd)) {
      const mm = String(m + 1).padStart(2, '0');
      out.push(`${y}-${mm}`);
      m++;
      if (m > 11) { m = 0; y++; }
    }
    return out;
  };

  const getUnpaidMonthsFor = (studentId, classId) => {
    const cls = state.data.classes.find(c => c.public_id === classId);
    if (!cls) return [];
    const start = cls.start_date ? String(cls.start_date).slice(0, 7) : null;
    const end = cls.end_date ? String(cls.end_date).slice(0, 7) : null;
    const activeMonths = monthRange(start, end);
    // Consider a month unpaid if monthly fee - total paid for that month > 0
    return activeMonths.filter(m => getMonthRemaining(studentId, classId, m) > 0);
  };

  const getMonthRemaining = (studentId, classId, month) => {
    const fee = getStudentMonthlyFeeInClass(studentId, classId);
    const invoices = state.data.invoices.filter(inv => inv.class_public_id === classId && inv.student_public_id === studentId && inv.plan_month === month);
    const paidSum = invoices.reduce((s, i) => s + Number(i.paid_amount || 0), 0) || 0;
    // Remaining should be based on the monthly fee minus total paid for that month
    const remaining = Math.max(0, Number(fee || 0) - Number(paidSum || 0));
    return remaining;
  };

  const getStudentMonthlyFeeInClass = (studentId, classId) => {
    const cls = state.data.classes.find(c => c.public_id === classId);
    if (!cls) return 0;
    const match = (cls.students || []).find(s => s.public_id === studentId);
    let fee = match?.monthly_fee;
    if (fee == null || fee === '') fee = cls.monthly_price;
    if (fee == null || fee === '') {
      const course = state.data.courses.find(c => c.public_id === cls.course_public_id);
      fee = course?.price;
    }
    return Number(fee ?? 0);
  };

  const initInvoiceFormUX = () => {
    const form = document.querySelector('#modal-invoice [data-form="invoice"]');
    if (!form || form.dataset.uxBound) return;
    form.dataset.uxBound = 'true';
    const studentSel = document.querySelector('#invoice-student');
    const classSel = document.querySelector('#invoice-class');
    const monthsSel = document.querySelector('#invoice-months');
    const amountInput = document.querySelector('#invoice-amount');
    const statusSelect = document.querySelector('#invoice-status');

    // Helpers for filtering and population
    const populateMonths = (sid, cid) => {
      if (!sid || !cid || !monthsSel) return;
      const months = getUnpaidMonthsFor(sid, cid);
      monthsSel.innerHTML = months.map(m => `<option value="${m}">${formatMonth(m)}</option>`).join('');
      if (amountInput) amountInput.value = '';
      if (statusSelect) statusSelect.value = 'partial';
      // Auto-select first month to surface fee immediately
      if (monthsSel.options.length > 0) {
        monthsSel.options[0].selected = true;
        monthsSel.dispatchEvent(new Event('change'));
      }
    };

    const resetInvoiceCalcs = () => {
      if (monthsSel) monthsSel.innerHTML = '';
      if (amountInput) amountInput.value = '';
      if (statusSelect) statusSelect.value = 'partial';
    };

    const filterClassesForStudent = (sid) => {
      if (!classSel) return;
      const classes = sid
        ? state.data.classes.filter(cls => (cls.students || []).some(s => s.public_id === sid))
        : state.data.classes;
      const current = classSel.value;
      classSel.innerHTML = ['<option value="">—</option>']
        .concat(classes.map(cls => `<option value="${cls.public_id}">${cls.public_id} — ${cls.name}</option>`))
        .join('');
      // Preserve current if still valid; otherwise clear
      if (current && classes.some(c => c.public_id === current)) {
        classSel.value = current;
      } else {
        classSel.value = '';
      }
      resetInvoiceCalcs();
      const cid = classSel.value;
      if (sid && cid) populateMonths(sid, cid);
    };

    const filterStudentsForClass = (cid) => {
      if (!studentSel) return;
      let students = state.data.students;
      if (cid) {
        const cls = state.data.classes.find(c => c.public_id === cid);
        const allowed = (cls?.students || []).map(s => s.public_id);
        students = state.data.students.filter(s => allowed.includes(s.public_id));
      }
      const current = studentSel.value;
      studentSel.innerHTML = ['<option value="">—</option>']
        .concat(students.map(s => `<option value="${s.public_id}">${s.public_id} — ${s.first_name} ${s.last_name}</option>`))
        .join('');
      if (current && students.some(s => s.public_id === current)) {
        studentSel.value = current;
      } else {
        studentSel.value = '';
      }
      resetInvoiceCalcs();
      const sid = studentSel.value;
      if (sid && cid) populateMonths(sid, cid);
    };

    studentSel?.addEventListener('change', () => {
      const sid = studentSel.value;
      filterClassesForStudent(sid);
    });

    classSel?.addEventListener('change', () => {
      const cid = classSel?.value;
      filterStudentsForClass(cid);
    });

    monthsSel?.addEventListener('change', () => {
      const sid = studentSel?.value;
      const cid = classSel?.value;
      if (!sid || !cid || !amountInput) return;
      const selected = Array.from(monthsSel.selectedOptions || []).map(o => o.value);
      const totals = selected.map(m => getMonthRemaining(sid, cid, m));
      const total = totals.reduce((s, v) => s + Number(v || 0), 0);
      amountInput.value = Number.isFinite(total) ? String(total.toFixed(2)) : '0.00';
      // Also update computed status against paid input
      const paidVal = Number((document.querySelector('#modal-invoice [name="paid_amount"]').value) || 0);
      const dueVal = Number(amountInput.value || 0);
      if (statusSelect) statusSelect.value = paidVal >= dueVal && dueVal > 0 ? 'paid' : 'partial';
    });

    const paidInput = document.querySelector('#modal-invoice [name="paid_amount"]');
    paidInput?.addEventListener('input', () => {
      const dueVal = Number(amountInput?.value || 0);
      let paid = Number(paidInput.value || 0);
      if (Number.isNaN(paid) || paid < 0) paid = 0;
      if (paid > dueVal) { paid = dueVal; paidInput.value = String(paid); }
      if (statusSelect) statusSelect.value = paid >= dueVal && dueVal > 0 ? 'paid' : 'partial';
    });
  };

  // ==== Professor form UX (base salary visibility) ====
  const initProfessorFormUX = () => {
    const form = document.querySelector('#modal-professor [data-form="professor"]');
    if (!form || form.dataset.uxBound) return;
    form.dataset.uxBound = 'true';
    const typeSel = form.querySelector('select[name="salary_type"]');
    const baseField = form.querySelector('input[name="base_salary"]');
    const apply = () => {
      const type = (typeSel?.value || 'monthly').toLowerCase();
      const isPerClass = type === 'per-class' || type === 'perclass' || type === 'class';
      if (baseField) {
        baseField.disabled = isPerClass;
        baseField.required = !isPerClass;
        if (isPerClass) baseField.value = '';
      }
    };
    typeSel?.addEventListener('change', apply);
  };

  // ==== Salary helpers and UX bindings ====
  const getProfessorById = (profId) => state.data.professors.find(p => p.public_id === profId);
  const getProfessorType = (prof) => {
    const t = String(prof?.salary_type || '').trim().toLowerCase();
    if (t === 'fixed' || t === 'monthly') return 'monthly'; // DB 'fixed' == UI 'monthly'
    if (t === 'per-class' || t === 'perclass' || t === 'class') return 'per-class';
    // Default safe behavior: treat unknown/missing as monthly (hide class dropdown)
    return 'monthly';
  };
  const classesForProfessor = (profId) => state.data.classes.filter(c => (c.professors || []).some(p => p.public_id === profId));
  const getProfessorCreatedMonth = (prof) => {
    const s = String(prof?.created_at || '').slice(0, 10);
    if (!s) return new Date().toISOString().slice(0, 7);
    try { const d = new Date(s); if (!Number.isNaN(d.getTime())) return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`; } catch (_) { }
    return new Date().toISOString().slice(0, 7);
  };
  const monthCmp = (a, b) => a.localeCompare(b);
  const sumPaidFor = (pred) => (state.data.salaries || []).filter(pred).reduce((s, row) => s + Number(row.paid_amount || 0), 0);
  const sumAdvancesFor = (pred) => (state.data.salaries || []).filter(pred).reduce((s, row) => s + Number(row.advances || 0), 0);
  function getMonthlyRemainingForProfessor(profId, month) {
    const prof = getProfessorById(profId);
    const base = Number(prof?.base_salary || 0);
    // Sum both paid_amount and advances (advances count as payment)
    const paid = sumPaidFor(s => s.professor_public_id === profId && (!s.class_public_id || s.class_public_id === '' || s.class_public_id === null) && s.pay_month === month);
    const advances = sumAdvancesFor(s => s.professor_public_id === profId && (!s.class_public_id || s.class_public_id === '' || s.class_public_id === null) && s.pay_month === month);
    return Math.max(0, base - paid - advances);
  }
  function getClassRemainingForProfessor(profId, classId, month) {
    const cls = state.data.classes.find(c => c.public_id === classId);
    // Prefer class-level per-class pay first; then legacy per-professor pay; finally fallback to monthly_price
    let base = 0;
    if (cls && cls.professor_class_pay != null && cls.professor_class_pay !== '') {
      base = Number(cls.professor_class_pay);
    } else if (cls && Array.isArray(cls.professors)) {
      const p = cls.professors.find(x => x.public_id === profId);
      if (p && p.pay_amount != null && p.pay_amount !== '') base = Number(p.pay_amount);
    }
    if (!base) {
      base = Number(cls?.monthly_price || 0);
    }
    // Sum both paid_amount and advances (advances count as payment)
    const paid = sumPaidFor(s => s.professor_public_id === profId && s.class_public_id === classId && s.pay_month === month);
    const advances = sumAdvancesFor(s => s.professor_public_id === profId && s.class_public_id === classId && s.pay_month === month);
    return Math.max(0, base - paid - advances);
  }
  const getUnpaidMonthsForProfessor = (profId) => {
    const prof = getProfessorById(profId);
    const start = getProfessorCreatedMonth(prof);
    const all = monthRange(start, new Date().toISOString().slice(0, 7));
    return all.filter(m => getMonthlyRemainingForProfessor(profId, m) > 0);
  };
  const getUnpaidMonthsForProfessorClass = (profId, classId) => {
    const cls = state.data.classes.find(c => c.public_id === classId);
    if (!cls) return [];
    const start = cls.start_date ? String(cls.start_date).slice(0, 7) : getProfessorCreatedMonth(getProfessorById(profId));
    const end = cls.end_date ? String(cls.end_date).slice(0, 7) : new Date().toISOString().slice(0, 7);
    const all = monthRange(start, end);
    return all.filter(m => getClassRemainingForProfessor(profId, classId, m) > 0);
  };

  const initSalaryFormUX = () => {
    const form = document.querySelector('#modal-salary [data-form="salary"]');
    if (!form || form.dataset.uxBound) return;
    form.dataset.uxBound = 'true';
    const profSel = form.querySelector('select[name="professor_public_id"]');
    const classSel = form.querySelector('select[name="class_public_id"]');
    const monthInput = form.querySelector('input[name="pay_month"]');
    const monthFieldWrap = monthInput?.closest('.form-field') || null;
    const baseInput = form.querySelector('input[name="base_amount"]');
    const paidInput = form.querySelector('input[name="paid_amount"]');
    const statusSelect = form.querySelector('select[name="status"]');
    const classFieldWrap = classSel?.closest('.form-field') || null;
    const remainingInput = form.querySelector('#salary-remaining-amount');

    // Create a dynamic months <select> for monthly type
    const ensureMonthsSelect = () => {
      let sel = form.querySelector('#salary-months-select');
      if (!sel) {
        sel = document.createElement('select');
        sel.id = 'salary-months-select';
        sel.style.display = 'none';
        monthInput?.insertAdjacentElement('afterend', sel);
      }
      return sel;
    };

    const applyStatusFromPaidDue = (due) => {
      const paid = Number(paidInput?.value || 0);
      const advances = Number(form.querySelector('input[name="advances"]')?.value || 0);
      // Total payment includes both paid_amount and advances
      const totalPaid = paid + advances;
      const clamped = Math.min(Math.max(paid, 0), Number(due || 0));
      if (paidInput) paidInput.value = String(clamped);
      if (statusSelect) statusSelect.value = (totalPaid >= Number(due || 0) && Number(due || 0) > 0) ? 'paid' : 'partial';
      if (remainingInput) {
        const currency = state.data.settings?.app?.currency || 'EUR';
        // Remaining = due - paid - advances
        const rem = Math.max(0, Number(due || 0) - clamped - advances);
        remainingInput.value = `${formatCurrency(rem)} (${currency})`;
      }
    };

    const handleProfessorChange = () => {
      const profId = profSel?.value || '';
      const prof = getProfessorById(profId);
      const type = getProfessorType(prof);
      const monthsSel = ensureMonthsSelect();
      if (!profId) {
        if (classSel) { classSel.disabled = false; classSel.innerHTML = '<option value="">—</option>' + state.data.classes.map(c => `<option value="${c.public_id}">${c.public_id} — ${c.name}</option>`).join(''); }
        monthsSel.style.display = 'none';
        if (monthInput) { monthInput.style.display = ''; }
        return;
      }
      if (type === 'monthly') {
        // Disable class selection
        if (classSel) { classSel.disabled = true; classSel.value = ''; }
        if (classFieldWrap) classFieldWrap.style.display = 'none';
        // Populate months select with unpaid months
        const unpaid = getUnpaidMonthsForProfessor(profId).sort(monthCmp);
        monthsSel.innerHTML = unpaid.map(m => `<option value="${m}">${formatMonth(m)}</option>`).join('');
        monthsSel.style.display = '';
        if (monthFieldWrap) monthFieldWrap.style.display = '';
        if (monthInput) { monthInput.style.display = 'none'; }
        // Set base to professor base salary (always base, not remaining)
        if (baseInput) baseInput.value = String(Number(prof?.base_salary || 0));
        // Preselect first unpaid month
        if (unpaid.length > 0) {
          monthsSel.value = unpaid[0];
          // Mirror into hidden monthInput value to keep form payload consistent
          if (monthInput) monthInput.value = unpaid[0];
          const due = getMonthlyRemainingForProfessor(profId, unpaid[0]);
          applyStatusFromPaidDue(due);
        } else {
          if (monthInput) monthInput.value = new Date().toISOString().slice(0, 7);
          applyStatusFromPaidDue(getMonthlyRemainingForProfessor(profId, monthInput.value));
        }
      } else if (type === 'per-class') {
        // Enable and filter classes to only those taught by this professor
        const nowMonth = new Date().toISOString().slice(0, 7);
        const currentVal = classSel?.value || '';
        const clsList = classesForProfessor(profId);
        if (classSel) {
          classSel.disabled = false;
          classSel.innerHTML = '<option value="">—</option>' + clsList.map(c => `<option value="${c.public_id}">${c.public_id} — ${c.name}</option>`).join('');
          // Preserve selection if present in list (especially for edit mode)
          if (currentVal && clsList.some(c => c.public_id === currentVal)) {
            classSel.value = currentVal;
          }
        }
        if (classFieldWrap) classFieldWrap.style.display = '';
        // Hide months select and entire month field for per-class; set current month internally
        monthsSel.style.display = 'none';
        if (monthFieldWrap) monthFieldWrap.style.display = 'none';
        if (monthInput) { monthInput.style.display = 'none'; monthInput.value = nowMonth; }
        // Clear base and compute remaining for selected class after selection
        if (baseInput) baseInput.value = '';
        // If a class is already selected, compute due/base immediately
        if (classSel && classSel.value) {
          classSel.dispatchEvent(new Event('change'));
        } else {
          applyStatusFromPaidDue(0);
        }
      }
    };

    const handleClassChange = () => {
      const profId = profSel?.value || '';
      const classId = classSel?.value || '';
      const m = monthInput?.value || new Date().toISOString().slice(0, 7);
      if (!profId || !classId) return;
      // If selected month is fully paid, pick first unpaid
      const unpaid = getUnpaidMonthsForProfessorClass(profId, classId).sort(monthCmp);
      if (unpaid.length > 0) {
        if (!unpaid.includes(m) && monthInput) monthInput.value = unpaid[0];
      } else if (monthInput) {
        monthInput.value = m;
      }
      const due = getClassRemainingForProfessor(profId, classId, monthInput?.value || m);
      // Base equals class-level per-class pay if present; then legacy per-professor; else monthly price
      const cls = state.data.classes.find(c => c.public_id === classId);
      let base = 0;
      if (cls && cls.professor_class_pay != null && cls.professor_class_pay !== '') {
        base = Number(cls.professor_class_pay);
      } else if (cls && Array.isArray(cls.professors)) {
        const p = cls.professors.find(x => x.public_id === profId);
        if (p && p.pay_amount != null && p.pay_amount !== '') base = Number(p.pay_amount);
      }
      if (!base) base = Number(cls?.monthly_price || 0);
      if (baseInput) baseInput.value = String(base);
      applyStatusFromPaidDue(due);
    };

    const handleMonthChange = () => {
      const profId = profSel?.value || '';
      const prof = getProfessorById(profId);
      const type = getProfessorType(prof);
      const monthsSel = ensureMonthsSelect();
      const monthVal = monthsSel.style.display === 'none' ? (monthInput?.value || '') : monthsSel.value;
      // Mirror into hidden month input so form submits correctly
      if (monthInput) monthInput.value = monthVal;
      if (!profId || !monthVal) return;
      if (type === 'monthly') {
        const due = getMonthlyRemainingForProfessor(profId, monthVal);
        // base is professor base
        if (baseInput) baseInput.value = String(Number(getProfessorById(profId)?.base_salary || 0));
        applyStatusFromPaidDue(due);
      } else {
        // Refilter classes by selected month to show only those with remaining
        if (classSel) {
          const clsList = classesForProfessor(profId).filter(c => getClassRemainingForProfessor(profId, c.public_id, monthVal) > 0);
          const current = classSel.value;
          classSel.innerHTML = '<option value="">—</option>' + clsList.map(c => `<option value="${c.public_id}">${c.public_id} — ${c.name}</option>`).join('');
          if (current && clsList.some(c => c.public_id === current)) classSel.value = current; else classSel.value = '';
        }
        const classId = classSel?.value || '';
        if (!classId) return;
        const due = getClassRemainingForProfessor(profId, classId, monthVal);
        const cls = state.data.classes.find(c => c.public_id === classId);
        let base = 0;
        if (cls && cls.professor_class_pay != null && cls.professor_class_pay !== '') {
          base = Number(cls.professor_class_pay);
        } else if (cls && Array.isArray(cls.professors)) {
          const p = cls.professors.find(x => x.public_id === profId);
          if (p && p.pay_amount != null && p.pay_amount !== '') base = Number(p.pay_amount);
        }
        if (!base) base = Number(cls?.monthly_price || 0);
        if (baseInput) baseInput.value = String(base);
        applyStatusFromPaidDue(due);
      }
    };

    profSel?.addEventListener('change', handleProfessorChange);
    classSel?.addEventListener('change', handleClassChange);
    form.addEventListener('change', (e) => {
      const monthsSel = form.querySelector('#salary-months-select');
      if (e.target === monthsSel) handleMonthChange();
      if (e.target === monthInput) handleMonthChange();
    });
    const advancesInput = form.querySelector('input[name="advances"]');
    const updateRemaining = () => {
      // Recompute against current due
      const profId = profSel?.value || '';
      const prof = getProfessorById(profId);
      const type = getProfessorType(prof);
      const monthVal = (form.querySelector('#salary-months-select')?.style.display === 'none') ? (monthInput?.value || '') : (form.querySelector('#salary-months-select')?.value || '');
      let due = 0;
      if (type === 'monthly') due = getMonthlyRemainingForProfessor(profId, monthVal);
      else {
        const classId = classSel?.value || '';
        if (classId && monthVal) due = getClassRemainingForProfessor(profId, classId, monthVal);
      }
      applyStatusFromPaidDue(due);
    };
    paidInput?.addEventListener('input', updateRemaining);
    advancesInput?.addEventListener('input', updateRemaining);

    // Initialize on first open
    handleProfessorChange();
  };

  const renderDashboard = () => {
    const statsContainer = document.querySelector('#dashboard-stats');
    if (!statsContainer) return;

    const courses = state.data.courses || [];
    const classes = state.data.classes || [];
    const students = state.data.students || [];
    const professors = state.data.professors || [];
    const invoices = state.data.invoices || [];
    const salaries = state.data.salaries || [];

    // Calculate stats
    const totalCourses = courses.length;
    const totalClasses = classes.length;
    const totalStudents = students.length;
    const totalProfessors = professors.length;

    // Render stats with staggered animation (Removed Debt and Salary cards)
    statsContainer.innerHTML = `
      <div class="stat-card" data-stat="courses">
        <div class="stat-icon"><i data-lucide="graduation-cap"></i></div>
        <div class="stat-content">
          <div class="stat-value">${totalCourses}</div>
          <div class="stat-label">${t('registrations-courses')}</div>
        </div>
      </div>
      <div class="stat-card" data-stat="classes">
        <div class="stat-icon"><i data-lucide="book-open"></i></div>
        <div class="stat-content">
          <div class="stat-value">${totalClasses}</div>
          <div class="stat-label">${t('registrations-classes')}</div>
        </div>
      </div>
      <div class="stat-card" data-stat="students">
        <div class="stat-icon"><i data-lucide="users"></i></div>
        <div class="stat-content">
          <div class="stat-value">${totalStudents}</div>
          <div class="stat-label">${t('registrations-students')}</div>
        </div>
      </div>
      <div class="stat-card" data-stat="professors">
        <div class="stat-icon"><i data-lucide="user-check"></i></div>
        <div class="stat-content">
          <div class="stat-value">${totalProfessors}</div>
          <div class="stat-label">${t('registrations-professors')}</div>
        </div>
      </div>
    `;

    // Initialize Lucide icons after rendering
    if (typeof lucide !== 'undefined') {
      lucide.createIcons();
    }

    // --- Charts Integration ---
    const initCharts = () => {
      // Debug logs
      console.log('initCharts running...');
      if (typeof Chart === 'undefined') {
        console.log('Chart.js library not loaded yet.');
        return false;
      }
      console.log('Chart.js loaded. Data:', { coursesCount: courses.length, studentsCount: students.length });

      // 1. Students per Course
      const courseStudentCounts = {};
      // Fill with ALL courses first, even those with 0 students
      courses.forEach(c => courseStudentCounts[c.public_id] = { name: c.name, count: 0 });
      
      classes.forEach(cls => {
        if (cls.course_public_id && courseStudentCounts[cls.course_public_id]) {
          courseStudentCounts[cls.course_public_id].count += (cls.students ? cls.students.length : 0);
        }
      });

      const courseLabels = Object.values(courseStudentCounts).map(c => c.name);
      const courseData = Object.values(courseStudentCounts).map(c => c.count);

      const ctx1 = document.getElementById('chart-students-course');
      if (ctx1) {
        if (Chart.getChart(ctx1)) Chart.getChart(ctx1).destroy();
        new Chart(ctx1, {
          type: 'bar',
          data: {
            labels: courseLabels,
            datasets: [{
              label: 'Studentë',
              data: courseData,
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
                grid: {
                  color: '#e2e8f0',
                  drawBorder: false,
                },
                ticks: {
                  precision: 0,
                  font: { family: 'Inter', size: 11 },
                  color: '#64748b'
                }
              },
              x: {
                grid: { display: false },
                ticks: {
                  autoSkip: false, // Force show all
                  maxRotation: 45,
                  minRotation: 0,
                  font: { family: 'Inter', size: 11 },
                  color: '#64748b'
                }
              }
            }
          }
        });
      } else {
        console.error('Canvas #chart-students-course not found in DOM.');
      }

      // 2. Monthly Registrations (Last 12 Months)
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
          const regDate = s.registration_date.substring(0, 7); // YYYY-MM
          if (last12Months[regDate]) {
            last12Months[regDate].count++;
          }
        }
      });

      const regLabels = Object.values(last12Months).map(m => m.label);
      const regData = Object.values(last12Months).map(m => m.count);

      const ctx2 = document.getElementById('chart-monthly-registrations');
      if (ctx2) {
        if (Chart.getChart(ctx2)) Chart.getChart(ctx2).destroy();
        // Create gradient
        const gradient = ctx2.getContext('2d').createLinearGradient(0, 0, 0, 300);
        gradient.addColorStop(0, 'rgba(16, 185, 129, 0.2)');
        gradient.addColorStop(1, 'rgba(16, 185, 129, 0)');

        new Chart(ctx2, {
          type: 'line',
          data: {
            labels: regLabels,
            datasets: [{
              label: 'Regjistrime',
              data: regData,
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
            interaction: {
              mode: 'index',
              intersect: false,
            },
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
                grid: {
                  color: '#e2e8f0',
                  drawBorder: false,
                  borderDash: [5, 5]
                },
                ticks: {
                  precision: 0,
                  font: { family: 'Inter', size: 11 },
                  color: '#64748b'
                }
              },
              x: {
                grid: { display: false },
                ticks: {
                  autoSkip: false, // Force show all months
                  maxRotation: 45,
                  minRotation: 0,
                  font: { family: 'Inter', size: 11 },
                  color: '#64748b'
                }
              }
            }
          }
        });
      } else {
        console.error('Canvas #chart-monthly-registrations not found in DOM.');
      }
      
      return true;
    };

    // Attempt to init charts with polling
    if (!initCharts()) {
      const chartInterval = setInterval(() => {
        if (initCharts()) clearInterval(chartInterval);
      }, 500);
      // Stop polling after 10 seconds
      setTimeout(() => clearInterval(chartInterval), 10000);
    }

    // Bind quick actions
    const quickActions = document.querySelectorAll('[data-quick-action]');
    quickActions.forEach(btn => {
      if (btn.dataset.bound) return;
      btn.dataset.bound = 'true';
      btn.addEventListener('click', () => {
        const action = btn.dataset.quickAction;
        if (action === 'invoice') {
          activateSection('payments');
          setTimeout(() => {
            const addBtn = document.querySelector('[data-action="add"][data-entity="invoice"]');
            if (addBtn) addBtn.click();
          }, 300);
        } else if (action === 'salary') {
          activateSection('salaries');
          setTimeout(() => {
            const addBtn = document.querySelector('[data-action="add"][data-entity="salary"]');
            if (addBtn) addBtn.click();
          }, 300);
        } else {
          activateSection('management');
          setTimeout(() => {
            const switchBtn = document.querySelector(`.entity-switcher [data-entity-switch="${action}"]`);
            if (switchBtn) switchBtn.click();
          }, 300);
        }
      });
    });

    // Bind stat card clicks
    const statCards = statsContainer.querySelectorAll('.stat-card');
    statCards.forEach(card => {
      if (card.dataset.bound) return;
      card.dataset.bound = 'true';
      card.addEventListener('click', () => {
        const stat = card.dataset.stat;
        if (stat === 'debt') {
          activateSection('payments');
        } else if (stat === 'salary') {
          activateSection('salaries');
        } else {
          activateSection('management');
          // Scroll to relevant entity
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

    // Bind sidebar toggle
    const sidebarToggles = document.querySelectorAll('.sidebar-toggle');
    sidebarToggles.forEach(btn => {
      if (btn.dataset.bound) return;
      btn.dataset.bound = 'true';
      btn.addEventListener('click', () => {
        document.body.classList.toggle('sidebar-open');
      });
    });

    // Close sidebar when clicking outside on mobile
    document.addEventListener('click', (e) => {
      if (!e.target.closest('.sidebar') && !e.target.closest('.sidebar-toggle') && document.body.classList.contains('sidebar-open')) {
        document.body.classList.remove('sidebar-open');
      }
    });

    // Render recent activity (placeholder for now)
    const activityList = document.querySelector('#recent-activity-list');
    if (activityList) {
      activityList.innerHTML = '<div class="no-data">Nuk ka aktivitet të fundit</div>';
      // Initialize Lucide icons for no-data icon
      if (typeof lucide !== 'undefined') {
        setTimeout(() => lucide.createIcons(), 100);
      }
    }
  };

  const renderAll = () => {
    applyTranslations();
    setupFilters();
    renderCourses();
    renderClasses();
    renderStudents();
    renderProfessors();
    renderStats();
    renderManagementTable();
    renderReports();
    renderPayments();
    renderSalaries();
    renderSettings();
    renderDashboard();
    updateTableSelectionUI();
  };

  const renderCourses = () => {
    const tbody = document.querySelector('#courses-table tbody');
    if (!tbody) return;
    if (!state.data.courses.length) {
      tbody.innerHTML = `<tr><td colspan="5">—</td></tr>`;
      return;
    }
    ensureHeaderFilters('courses');
    const f = state.filters.columns.courses;
    // Normalize date range (swap if user picked reversed)
    if (state.filters.management.dateFrom && state.filters.management.dateTo && state.filters.management.dateFrom > state.filters.management.dateTo) {
      const tmp = state.filters.management.dateFrom;
      state.filters.management.dateFrom = state.filters.management.dateTo;
      state.filters.management.dateTo = tmp;
    }
    const rows = state.data.courses
      .filter((course) => {
        // Management date filter uses updated_at for courses
        const from = state.filters.management.dateFrom;
        const to = state.filters.management.dateTo;
        if (!from && !to) return true;
        const d = toDateObj(course.updated_at);
        if (!d) return true;
        const fromOk = from ? (d >= new Date(`${from}T00:00:00`)) : true;
        const toOk = to ? (d <= new Date(`${to}T23:59:59`)) : true;
        return fromOk && toOk;
      })
      .filter((course) =>
        textIncludes(course.public_id, f.id) &&
        textIncludes(course.name, f.name) &&
        textIncludes(course.level, f.level) &&
        textIncludes(formatCurrency(course.price), f.price) &&
        textIncludes(formatDate(course.updated_at), f.updated)
      )
      .map((course) => `
        <tr data-entity="course" data-id="${course.public_id}">
          <td>${course.public_id}</td>
          <td>${course.name}</td>
          <td>${course.level}</td>
          <td>${formatCurrency(course.price)}</td>
          <td>${formatDate(course.updated_at)}</td>
        </tr>
      `)
      .join('');
    tbody.innerHTML = rows || `<tr><td colspan="5">—</td></tr>`;
  };
  const renderClasses = () => {
    const tbody = document.querySelector('#classes-table tbody');
    if (!tbody) return;
    if (!state.data.classes.length) {
      tbody.innerHTML = `<tr><td colspan="8">—</td></tr>`;
      return;
    }
    ensureHeaderFilters('classes');
    const f = state.filters.columns.classes;
    // Normalize date range for management if reversed
    if (state.filters.management.dateFrom && state.filters.management.dateTo && state.filters.management.dateFrom > state.filters.management.dateTo) {
      const tmp = state.filters.management.dateFrom;
      state.filters.management.dateFrom = state.filters.management.dateTo;
      state.filters.management.dateTo = tmp;
    }
    tbody.innerHTML = state.data.classes
      .filter((cls) => {
        const from = state.filters.management.dateFrom;
        const to = state.filters.management.dateTo;
        if (!from && !to) return true;
        // Consider class period overlapping with filter range
        const start = toDateObj(cls.start_date);
        const end = toDateObj(cls.end_date || cls.start_date);
        const fromD = from ? new Date(`${from}T00:00:00`) : null;
        const toD = to ? new Date(`${to}T23:59:59`) : null;
        if (!start && !end) return true;
        // overlap if start<=to and end>=from
        const startsBeforeTo = toD ? (start ? start <= toD : true) : true;
        const endsAfterFrom = fromD ? (end ? end >= fromD : true) : true;
        return startsBeforeTo && endsAfterFrom;
      })
      .filter((cls) => {
        const period = `${formatDate(cls.start_date)} – ${cls.end_date ? formatDate(cls.end_date) : '—'}`;
        const courseCell = cls.course_name ? `${cls.course_public_id} — ${cls.course_name}` : (cls.course_public_id || '—');
        const professors = (cls.professors || []).map((prof) => prof.public_id).join(', ') || '—';
        const students = (cls.students || []).map((student) => student.public_id).join(', ') || '—';
        return textIncludes(cls.public_id, f.id)
          && textIncludes(cls.name, f.name)
          && textIncludes(courseCell, f.course)
          && textIncludes(cls.level, f.level)
          && textIncludes(period, f.period)
          && textIncludes(formatCurrency(cls.monthly_price), f.price)
          && textIncludes(professors, f.professors)
          && textIncludes(students, f.students);
      })
      .map((cls) => {
        const period = `${formatDate(cls.start_date)} – ${cls.end_date ? formatDate(cls.end_date) : '—'}`;
        const professors = (cls.professors || []).map((prof) => prof.public_id).join(', ') || '—';
        const students = (cls.students || []).map((student) => student.public_id).join(', ') || '—';
        const courseCell = cls.course_name ? `${cls.course_public_id} — ${cls.course_name}` : (cls.course_public_id || '—');
        return `
          <tr data-entity="class" data-id="${cls.public_id}" class="clickable-row" title="Kliko për detajet">
            <td>${cls.public_id}</td>
            <td>${cls.name}</td>
            <td>${courseCell}</td>
            <td>${cls.level}</td>
            <td>${period}</td>
            <td>${formatCurrency(cls.monthly_price)}</td>
            <td>${professors}</td>
            <td>${students}</td>
            
          </tr>
        `;
      })
      .join('');
  };
  const renderStudents = () => {
    const tbody = document.querySelector('#students-table tbody');
    if (!tbody) return;
    if (!state.data.students.length) {
      tbody.innerHTML = `<tr><td colspan="6">—</td></tr>`;
      return;
    }
    ensureHeaderFilters('students');
    const f = state.filters.columns.students;
    // Normalize date range for management if reversed
    if (state.filters.management.dateFrom && state.filters.management.dateTo && state.filters.management.dateFrom > state.filters.management.dateTo) {
      const tmp = state.filters.management.dateFrom;
      state.filters.management.dateFrom = state.filters.management.dateTo;
      state.filters.management.dateTo = tmp;
    }
    tbody.innerHTML = state.data.students
      .filter((student) => {
        const from = state.filters.management.dateFrom;
        const to = state.filters.management.dateTo;
        if (!from && !to) return true;
        const d = toDateObj(student.registration_date);
        if (!d) return true;
        const fromOk = from ? (d >= new Date(`${from}T00:00:00`)) : true;
        const toOk = to ? (d <= new Date(`${to}T23:59:59`)) : true;
        return fromOk && toOk;
      })
      .filter((student) => {
        // contact: phone or email from notes
        let email = '';
        try { const extra = JSON.parse(student.notes || '{}'); email = extra.email || ''; } catch (_) { }
        const name = `${student.first_name} ${student.last_name}`.trim();
        return textIncludes(student.public_id, f.id)
          && textIncludes(name, f.name)
          && textIncludes(student.national_id, f.nid)
          && textIncludes(`${student.phone} ${email}`.trim(), f.contact)
          && textIncludes(String(student.age ?? ''), f.age)
          && textIncludes(formatDate(student.registration_date), f.registered);
      })
      .map((student) => `
        <tr data-entity="student" data-id="${student.public_id}">
          <td>${student.public_id}</td>
          <td>${student.first_name} ${student.last_name}</td>
          <td>${student.national_id}</td>
          <td>${student.phone}</td>
          <td>${student.age}</td>
          <td>${formatDate(student.registration_date)}</td>
          
        </tr>
      `)
      .join('');
  };
  const renderProfessors = () => {
    const tbody = document.querySelector('#professors-table tbody');
    if (!tbody) return;
    if (!state.data.professors.length) {
      tbody.innerHTML = `<tr><td colspan="6">—</td></tr>`;
      return;
    }
    ensureHeaderFilters('professors');
    const f = state.filters.columns.professors;
    // Normalize date range for management if reversed
    if (state.filters.management.dateFrom && state.filters.management.dateTo && state.filters.management.dateFrom > state.filters.management.dateTo) {
      const tmp = state.filters.management.dateFrom;
      state.filters.management.dateFrom = state.filters.management.dateTo;
      state.filters.management.dateTo = tmp;
    }
    tbody.innerHTML = state.data.professors
      .filter((prof) => {
        const from = state.filters.management.dateFrom;
        const to = state.filters.management.dateTo;
        if (!from && !to) return true;
        const d = toDateObj(prof.created_at);
        if (!d) return true;
        const fromOk = from ? (d >= new Date(`${from}T00:00:00`)) : true;
        const toOk = to ? (d <= new Date(`${to}T23:59:59`)) : true;
        return fromOk && toOk;
      })
      .filter((prof) => {
        const name = `${prof.first_name} ${prof.last_name}`.trim();
        const contact = `${prof.email || ''} ${prof.phone || ''}`.trim();
        return textIncludes(prof.public_id, f.id)
          && textIncludes(name, f.name)
          && textIncludes(contact, f.contact)
          && textIncludes(prof.education || '', f.education)
          && textIncludes(formatCurrency(prof.base_salary), f.salary);
      })
      .map((professor) => `
        <tr data-entity="professor" data-id="${professor.public_id}">
          <td>${professor.public_id}</td>
          <td>${professor.first_name} ${professor.last_name}</td>
          <td>${professor.email}<br>${professor.phone}</td>
          <td>${professor.education || '—'}</td>
          <td>${formatCurrency(professor.base_salary)}</td>
          <td><button type="button" data-action="view" data-entity="professor" data-id="${professor.public_id}">Shiko</button></td>
          
        </tr>
      `)
      .join('');
  };

  const renderStats = () => {
    const container = document.querySelector('#management-stats');
    if (!container) return;

    const stats = state.data.stats;
    const cards = [
      { label: t('registrations-courses'), value: stats.courses_total || 0 },
      { label: t('registrations-classes'), value: stats.classes_total || 0 },
      { label: t('registrations-students'), value: stats.students_total || 0 },
      { label: t('registrations-professors'), value: stats.professors_total || 0 },
    ];

    container.innerHTML = cards
      .map((card) => `
        <div class="stat-card">
          <div class="label">${card.label}</div>
          <div class="value">${card.value}</div>
        </div>
      `)
      .join('');
  };

  const renderManagementTable = () => { };

  const getClassByPublicId = (pid) => state.data.classes.find((c) => c.public_id === pid);

  const formatScheduleCompact = (schedule) => {
    let sched = schedule;
    if (!Array.isArray(sched)) {
      try { sched = JSON.parse(schedule || '[]'); } catch (_) { sched = []; }
    }
    if (!sched.length) return '—';
    const names = { mon: 'E hënë', tue: 'E martë', wed: 'E mërkurë', thu: 'E enjte', fri: 'E premte', sat: 'E shtunë', sun: 'E diel' };
    return sched
      .filter((s) => s && s.day)
      .map((s) => `${names[s.day] || s.day}${(s.start && s.end) ? ` (${s.start}–${s.end})` : ''}`)
      .join('<br>');
  };

  const exportCsv = (filename, headers, rows) => {
    const csv = [
      headers.join(','),
      ...rows.map((r) => headers.map((h) => `"${String(r[h] ?? '').replace(/"/g, '""')}"`).join(',')),
    ].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${filename}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const bindEntitySwitcher = () => {
    const wrap = document.querySelector('.entity-switcher');
    if (!wrap || wrap.dataset.bound) return;
    wrap.dataset.bound = 'true';
    wrap.addEventListener('click', (e) => {
      const btn = e.target.closest('[data-entity-switch]');
      if (!btn) return;
      // Support both new .entity-tab and legacy .chip classes
      wrap.querySelectorAll('.chip, .entity-tab').forEach((c) => c.classList.remove('active'));
      btn.classList.add('active');
      const ent = btn.getAttribute('data-entity-switch');
      document.querySelectorAll('section[data-section="management"] .entity-section').forEach((d) => {
        const isMatch = d.getAttribute('data-entity') === ent;
        d.style.display = isMatch ? '' : 'none';
      });
      updateTableSelectionUI();
      // Initialize Lucide icons after switching
      if (typeof lucide !== 'undefined') {
        setTimeout(() => lucide.createIcons(), 50);
      }
    });
    // initialize hidden others
    const first = wrap.querySelector('.chip.active, .entity-tab.active')?.getAttribute('data-entity-switch') || 'course';
    document.querySelectorAll('section[data-section="management"] .entity-section').forEach((d) => {
      const isMatch = d.getAttribute('data-entity') === first;
      d.style.display = isMatch ? '' : 'none';
    });
  };

  const renderPayments = () => {
    const tbody = document.querySelector('#payments-table tbody');
    if (!tbody) return;

    const { dateFrom, dateTo } = state.filters.payments;
    // Group multi-month payments created in one submission by batch_id stored in notes JSON
    const withMeta = state.data.invoices.map((invoice) => {
      let meta = {};
      if (invoice.notes) {
        try { const parsed = JSON.parse(invoice.notes); if (parsed && typeof parsed === 'object') meta = parsed; } catch (_) { /* ignore */ }
      }
      const override = state.recentInvoiceMeta[invoice.public_id];
      const tax = override?.tax ?? invoice.tax;
      return { ...invoice, tax, _meta: meta, _batch: override?.batchId };
    });
    // Normalize payments range if reversed
    if (state.filters.payments.dateFrom && state.filters.payments.dateTo && state.filters.payments.dateFrom > state.filters.payments.dateTo) {
      const tmp = state.filters.payments.dateFrom;
      state.filters.payments.dateFrom = state.filters.payments.dateTo;
      state.filters.payments.dateTo = tmp;
    }
    const rowsRaw = withMeta
      .filter((invoice) => {
        // Date range filter: prefer confirmed_at; then created_at; fallback to plan_month first day
        const dateStr = (invoice.confirmed_at || invoice.created_at || (invoice.plan_month ? `${invoice.plan_month}-01` : ''));
        if (!dateStr || (!dateFrom && !dateTo)) return true;
        const d = toDateObj(dateStr);
        if (!d) return true;
        const fromOk = dateFrom ? (d >= new Date(`${dateFrom}T00:00:00`)) : true;
        const toOk = dateTo ? (d <= new Date(`${dateTo}T23:59:59`)) : true;
        return fromOk && toOk;
      });

    // Build grouping: prefer explicit batch_id; fallback to time-bucket proximity (<=2s) by student+class
    const fallbackCounts = new Map();
    const toBucket = (createdAt) => {
      const s = String(createdAt || '');
      if (!s) return '';
      // Normalize to a parseable ISO-like string
      const norm = s.includes('T') ? s : s.replace(' ', 'T');
      const d = new Date(norm);
      const ts = Number.isNaN(d.getTime()) ? null : d.getTime();
      if (ts == null) return s.slice(0, 19);
      return String(Math.floor(ts / 2000)); // 2-second buckets
    };
    for (const inv of rowsRaw) {
      const hasBatch = !!(inv._batch || inv._meta?.batch_id);
      if (hasBatch) continue;
      const bucket = toBucket(inv.created_at);
      if (!bucket) continue;
      const ck = `${inv.student_public_id}|${inv.class_public_id}|${bucket}`;
      fallbackCounts.set(ck, (fallbackCounts.get(ck) || 0) + 1);
    }
    const groups = new Map();
    for (const inv of rowsRaw) {
      const batchId = inv._batch || inv._meta?.batch_id;
      let key;
      if (batchId) {
        key = `batch:${batchId}:${inv.student_public_id}:${inv.class_public_id}`;
      } else {
        const bucket = toBucket(inv.created_at);
        const ck = `${inv.student_public_id}|${inv.class_public_id}|${bucket}`;
        if (bucket && (fallbackCounts.get(ck) || 0) > 1) key = `created:${ck}`;
        else key = `single:${inv.public_id}`;
      }
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key).push(inv);
    }
    const grouped = Array.from(groups.values()).map((items) => {
      if (items.length === 1) return items[0];
      // Merge: keep earliest plan_month label range and sum paid_amount, compute status=paid if all paid
      const sorted = items.slice().sort((a, b) => a.plan_month.localeCompare(b.plan_month));
      const first = sorted[0];
      const last = sorted[sorted.length - 1];
      const paidSum = sorted.reduce((s, i) => s + Number(i.paid_amount || 0), 0);
      const dueSum = sorted.reduce((s, i) => s + Number(i.due_amount || 0), 0);
      const statusMerged = paidSum >= dueSum && dueSum > 0 ? 'paid' : (paidSum > 0 ? 'partial' : 'due');
      return {
        ...first,
        public_id: first.public_id,
        _group_ids: sorted.map(i => i.public_id),
        plan_month: `${first.plan_month} … ${last.plan_month}`,
        paid_amount: paidSum,
        due_amount: dueSum,
        status: statusMerged,
        confirmed_at: first.confirmed_at || last.confirmed_at,
      };
    });

    // Apply column quick filters (ID, student, class, month, paid, status, confirmed)
    ensureHeaderFilters('payments');
    const cf = state.filters.columns.payments;
    const rows = grouped.filter((invoice) => {
      const confirmedLabel = invoice.confirmed_at ? formatDate(invoice.confirmed_at) : '—';
      const monthLabel = invoice.plan_month.includes('…') ? invoice.plan_month : formatMonth(invoice.plan_month);
      return (
        textIncludes(invoice.public_id, cf.id) &&
        textIncludes(invoice.student_public_id, cf.student) &&
        textIncludes(invoice.class_public_id, cf.class) &&
        textIncludes(monthLabel, cf.month) &&
        textIncludes(formatCurrency(invoice.paid_amount), cf.paid) &&
        textIncludes(t('status-' + invoice.status), cf.status) &&
        textIncludes(confirmedLabel, cf.confirmed)
      );
    });
    if (!rows.length) {
      tbody.innerHTML = `<tr><td colspan="8">—</td></tr>`;
      return;
    }

    tbody.innerHTML = rows
      .map((invoice) => {
        const statusClass = invoice.status === 'paid' ? 'paid' : invoice.status === 'partial' ? 'partial' : 'due';
        // Always display only the base invoice id, even for grouped rows
        const idCell = invoice.public_id;
        return `
          <tr data-entity="invoice" data-id="${invoice.public_id}" ${invoice._group_ids ? `data-group-ids="${invoice._group_ids.join(',')}"` : ''}>
            <td>${idCell}</td>
            <td>${invoice.student_public_id}</td>
            <td>${invoice.class_public_id}</td>
            <td>${invoice.plan_month.includes('…') ? invoice.plan_month : formatMonth(invoice.plan_month)}</td>
            <td>${formatCurrency(invoice.due_amount)}</td>
            <td>${formatCurrency(invoice.paid_amount)}</td>
            <td><span class="status-chip ${statusClass}">${t('status-' + invoice.status)}</span></td>
            <td>${invoice.confirmed_at ? formatDate(invoice.confirmed_at) : '—'}</td>
            <td><button type="button" data-action="print" data-entity="invoice" data-id="${invoice.public_id}">${t('action-print')}</button></td>
          </tr>
        `;
      })
      .join('');
  };

  const renderReports = () => {
    const summaryWrap = document.querySelector('#reports-summary');
    const overdueTbody = document.querySelector('#reports-overdue-table tbody');
    const classTbody = document.querySelector('#reports-classes-table tbody');
    if (!summaryWrap || !overdueTbody || !classTbody) return;

    const reportsGrid = document.querySelector('.reports-grid');
    if (reportsGrid && !reportsGrid.dataset.exportsBound) {
      reportsGrid.dataset.exportsBound = 'true';
      reportsGrid.addEventListener('click', (e) => {
        const btn = e.target.closest('[data-report-export]');
        if (!btn) return;
        const kind = btn.getAttribute('data-report-export');
        if (kind === 'overdue' && state.reportsCache?.overdue) {
          exportCsv('raport_faturat_e_vonuara', ['id', 'student', 'class', 'month', 'due', 'paid', 'status'], state.reportsCache.overdue);
        }
        if (kind === 'classes' && state.reportsCache?.classes) {
          exportCsv('raport_klasa', ['class', 'course', 'students', 'professors', 'price', 'paid', 'due', 'schedule'], state.reportsCache.classes);
        }
      });
    }

    const { dateFrom, dateTo, status, course, professor } = state.filters.reports;
    const normalizeDate = (d) => (d ? new Date(`${d}T00:00:00`) : null);
    const fromD = normalizeDate(dateFrom);
    const toD = normalizeDate(dateTo ? `${dateTo}-28` : '');

    const filteredInvoices = (state.data.invoices || []).filter((inv) => {
      const cls = getClassByPublicId(inv.class_public_id);
      if (course && cls?.course_public_id !== course) return false;
      if (professor && !(cls?.professors || []).some((p) => p.public_id === professor)) return false;
      if (status && status !== 'all' && inv.status !== status) return false;
      const dateStr = inv.confirmed_at || inv.created_at || (inv.plan_month ? `${inv.plan_month}-01` : '');
      if (!dateStr) return true;
      const d = toDateObj(dateStr);
      if (!d) return true;
      const fromOk = fromD ? d >= fromD : true;
      const toOk = toD ? d <= toD : true;
      return fromOk && toOk;
    });

    const paidSum = filteredInvoices.reduce((s, i) => s + Number(i.paid_amount || 0), 0);
    const dueSum = filteredInvoices.reduce((s, i) => s + Number(i.due_amount || 0), 0);
    const outstanding = Math.max(dueSum - paidSum, 0);

    const currentMonth = (() => {
      const d = new Date();
      const m = String(d.getMonth() + 1).padStart(2, '0');
      return `${d.getFullYear()}-${m}`;
    })();
    const overdueRows = filteredInvoices
      .filter((inv) => inv.status !== 'paid' && inv.plan_month && inv.plan_month < currentMonth)
      .map((inv) => {
        const cls = getClassByPublicId(inv.class_public_id);
        const student = inv.student_public_id || '—';
        return {
          id: inv.public_id,
          student,
          class: cls ? `${cls.public_id} — ${cls.name}` : (inv.class_public_id || '—'),
          month: inv.plan_month || '—',
          due: formatCurrency(inv.due_amount || 0),
          paid: formatCurrency(inv.paid_amount || 0),
          status: inv.status || '—',
        };
      });

    const classRows = (state.data.classes || []).map((cls) => {
      const invForClass = filteredInvoices.filter((inv) => inv.class_public_id === cls.public_id);
      const paid = invForClass.reduce((s, i) => s + Number(i.paid_amount || 0), 0);
      const due = invForClass.reduce((s, i) => s + Number(i.due_amount || 0), 0);
      const outstandingCls = Math.max(due - paid, 0);
      return {
        class: `${cls.public_id} — ${cls.name}`,
        course: cls.course_name ? `${cls.course_public_id} — ${cls.course_name}` : (cls.course_public_id || '—'),
        students: (cls.students || []).length,
        professors: (cls.professors || []).length,
        price: formatCurrency(cls.monthly_price || 0),
        paid: formatCurrency(paid),
        due: formatCurrency(outstandingCls),
        schedule: formatScheduleCompact(cls.schedule),
      };
    });

    summaryWrap.innerHTML = [
      { label: 'Faturat totale', value: filteredInvoices.length },
      { label: 'Paguar', value: formatCurrency(paidSum) },
      { label: 'Detyrim', value: formatCurrency(outstanding) },
      { label: 'Fatura të vonuara', value: overdueRows.length },
    ].map((c) => `
      <div class="reports-summary-card">
        <div class="label">${c.label}</div>
        <div class="value">${c.value}</div>
      </div>
    `).join('');

    overdueTbody.innerHTML = overdueRows.length
      ? overdueRows.map((row) => `
          <tr>
            <td>${row.id}</td>
            <td>${row.student}</td>
            <td>${row.class}</td>
            <td>${row.month}</td>
            <td>${row.due}</td>
            <td>${row.paid}</td>
            <td>${row.status}</td>
          </tr>
        `).join('')
      : '<tr><td colspan="7">—</td></tr>';

    classTbody.innerHTML = classRows.length
      ? classRows.map((row) => `
          <tr>
            <td>${row.class}</td>
            <td>${row.course}</td>
            <td>${row.students}</td>
            <td>${row.professors}</td>
            <td>${row.price}</td>
            <td>${row.paid}</td>
            <td>${row.due}</td>
            <td class="report-schedule">${row.schedule}</td>
          </tr>
        `).join('')
      : '<tr><td colspan="8">—</td></tr>';

    state.reportsCache = {
      overdue: overdueRows,
      classes: classRows,
    };
  };

  const showInvoiceDetails = (publicId) => {
    const inv = state.data.invoices.find(i => i.public_id === publicId);
    if (!inv) return;
    const modal = document.querySelector('#modal-invoice-details');
    if (!modal) return;
    modal.querySelector('.invoice-details-id').textContent = inv.public_id || '';
    const student = state.data.students.find(s => s.public_id === inv.student_public_id);
    const cls = state.data.classes.find(c => c.public_id === inv.class_public_id);
    modal.querySelector('.invoice-student').textContent = inv.student_public_id + (student ? ` — ${student.first_name} ${student.last_name}` : '');
    modal.querySelector('.invoice-class').textContent = inv.class_public_id + (cls ? ` — ${cls.name}` : '');
    modal.querySelector('.invoice-month').textContent = formatMonth(inv.plan_month);
    modal.querySelector('.invoice-due').textContent = formatCurrency(inv.due_amount);
    modal.querySelector('.invoice-paid').textContent = formatCurrency(inv.paid_amount);
    modal.querySelector('.invoice-status').textContent = t('status-' + inv.status);
    // Inject tax row using effective tax
    const taxContainer = modal.querySelector('.invoice-tax');
    const effectiveTax = getEffectiveTax(inv);
    if (taxContainer) taxContainer.textContent = effectiveTax ? t('tax-' + String(effectiveTax)) : '—';
    // VAT-inclusive breakdown for display
    const taxCode = String(effectiveTax || 'none');
    const vatRate = taxCode === 'vat18' ? 0.18 : (taxCode === 'vat8' ? 0.08 : 0);
    const currency = state.data.settings?.app?.currency || 'EUR';
    const grossPaid = Number(inv.paid_amount || 0);
    const notesEl = modal.querySelector('.invoice-notes');
    // Remove any previous breakdown if present
    const prevBreak = modal.querySelector('.vat-breakdown');
    if (prevBreak) prevBreak.remove();
    if (vatRate > 0) {
      const netPaid = grossPaid / (1 + vatRate);
      const vatPaid = Math.max(0, grossPaid - netPaid);
      const vatPctLabel = `${Math.round(vatRate * 100)}%`;
      const breakdown = document.createElement('div');
      breakdown.className = 'vat-breakdown';
      breakdown.style.marginBottom = '8px';
      breakdown.innerHTML = `
          <div><strong>${t('receipt-net-total')}:</strong> ${formatCurrency(netPaid)} (${currency})</div>
          <div><strong>${t('receipt-vat')} (${vatPctLabel}):</strong> ${formatCurrency(vatPaid)} (${currency})</div>
          <div><strong>${t('receipt-gross-total')}:</strong> ${formatCurrency(grossPaid)} (${currency})</div>`;
      // Insert before notes, or at end if notes missing
      if (notesEl && notesEl.parentElement) {
        notesEl.parentElement.insertBefore(breakdown, notesEl);
      } else {
        modal.querySelector('.details-section')?.appendChild(breakdown);
      }
    }
    if (notesEl) notesEl.textContent = inv.notes ? String(inv.notes) : '—';
    // Bind print button (use branded invoice template)
    const printBtn = modal.querySelector('[data-invoice-print]');
    if (printBtn) {
      printBtn.onclick = () => openInvoiceTemplateForSingle(inv);
    }
    openModal('invoice-details');
  };

  const showSalaryDetails = (publicId) => {
    const sal = state.data.salaries.find(s => s.public_id === publicId);
    if (!sal) return;
    const modal = document.querySelector('#modal-salary-details');
    if (!modal) return;
    modal.querySelector('.salary-details-id').textContent = sal.public_id || '';
    const prof = state.data.professors.find(p => p.public_id === sal.professor_public_id);
    const cls = sal.class_public_id ? state.data.classes.find(c => c.public_id === sal.class_public_id) : null;
    modal.querySelector('.salary-professor').textContent = sal.professor_public_id + (prof ? ` — ${prof.first_name} ${prof.last_name}` : '');
    modal.querySelector('.salary-class').textContent = sal.class_public_id ? (sal.class_public_id + (cls ? ` — ${cls.name}` : '')) : '—';
    modal.querySelector('.salary-month').textContent = formatMonth(sal.pay_month);
    // Compute displayed base: for per-class use class-level per-class pay if present; else legacy per-professor; else monthly_price. For monthly, use professor base.
    let baseDisplay = Number(sal.base_amount || 0);
    if (sal.class_public_id) {
      let base = 0;
      if (cls && cls.professor_class_pay != null && cls.professor_class_pay !== '') {
        base = Number(cls.professor_class_pay);
      } else if (cls && Array.isArray(cls.professors)) {
        const p = cls.professors.find(x => x.public_id === sal.professor_public_id);
        if (p && p.pay_amount != null && p.pay_amount !== '') base = Number(p.pay_amount);
      }
      if (!base) base = Number(cls?.monthly_price || 0);
      baseDisplay = base;
    } else if (prof) {
      baseDisplay = Number(prof.base_salary || 0);
    }
    modal.querySelector('.salary-base').textContent = formatCurrency(baseDisplay);
    modal.querySelector('.salary-advances').textContent = formatCurrency(sal.advances);
    modal.querySelector('.salary-paid').textContent = formatCurrency(sal.paid_amount);
    modal.querySelector('.salary-status').textContent = t('status-' + sal.status);
    const notesEl = modal.querySelector('.salary-notes');
    if (notesEl) notesEl.textContent = sal.notes ? String(sal.notes) : '—';
    const printBtn = modal.querySelector('[data-salary-print]');
    if (printBtn) {
      printBtn.onclick = () => openSalaryTemplateForSingle(sal);
    }
    openModal('salary-details');
  };

  const openSalaryTemplateForSingle = (salary) => {
    const currency = state.data.settings?.app?.currency || 'EUR';
    const prof = state.data.professors.find(p => p.public_id === salary.professor_public_id);
    const clazz = salary.class_public_id ? state.data.classes.find(c => c.public_id === salary.class_public_id) : null;
    const settings = state.data.settings || {};
    const biz = settings.business || {};
    const data = {
      company_name: biz.company_name || '',
      company_address: biz.company_address || '',
      company_phone: biz.company_phone || '',
      company_email: biz.company_email || '',
      company_tax_id: biz.company_tax_id || '',
      company_logo_url: biz.company_logo_url || '',
      number: salary.public_id,
      date: new Date().toLocaleDateString(),
      class: clazz ? `${clazz.public_id} — ${clazz.name}` : (salary.class_public_id || ''),
      professor_name: prof ? `${prof.first_name} ${prof.last_name}` : '',
      professor_id: prof ? prof.public_id : (salary.professor_public_id || ''),
      professor_phone: prof?.phone || '',
      professor_email: prof?.email || '',
      professor_address: prof?.address || '',
      lines: [
        {
          month: formatMonth(salary.pay_month),
          base: formatCurrency(salary.base_amount) + ` (${currency})`,
          advances: formatCurrency(salary.advances) + ` (${currency})`,
          paid: formatCurrency(salary.paid_amount) + ` (${currency})`,
        }
      ],
      // Total paid = paid_amount + advances (avancat llogariten si pagë)
      total_paid: formatCurrency((Number(salary.paid_amount || 0) + Number(salary.advances || 0))) + ` (${currency})`,
    };
    const key = `sal:${Date.now()}:${salary.public_id}`;
    try { localStorage.setItem(key, JSON.stringify(data)); } catch (_) { }
    const json = encodeURIComponent(JSON.stringify(data));
    const baseMeta = document.querySelector('meta[name="app-base"]');
    const base = baseMeta?.getAttribute('content') || '';
    window.open(`${base}salary.html?key=${encodeURIComponent(key)}&data=${json}`, '_blank');
  };

  const renderSalaries = () => {
    const tbody = document.querySelector('#salaries-table tbody');
    if (!tbody) return;

    const { dateFrom, dateTo } = state.filters.salaries;
    ensureHeaderFilters('salaries');
    const cf = state.filters.columns.salaries;
    // Normalize salaries range if reversed
    if (state.filters.salaries.dateFrom && state.filters.salaries.dateTo && state.filters.salaries.dateFrom > state.filters.salaries.dateTo) {
      const tmp = state.filters.salaries.dateFrom;
      state.filters.salaries.dateFrom = state.filters.salaries.dateTo;
      state.filters.salaries.dateTo = tmp;
    }

    console.log('Rendering salaries with data:', state.data.salaries);

    const rows = (state.data.salaries || [])
      .filter((salary) => {
        // Date filter
        if (!dateFrom && !dateTo) return true;
        const dateStr = salary.created_at ? salary.created_at.substring(0, 10) : '';
        if (!dateStr) return true;
        
        const d = new Date(dateStr);
        // Reset times for accurate comparison
        d.setHours(0,0,0,0);
        
        let fromOk = true;
        if (dateFrom) {
            const df = new Date(dateFrom);
            df.setHours(0,0,0,0);
            fromOk = d >= df;
        }
        
        let toOk = true;
        if (dateTo) {
            const dt = new Date(dateTo);
            dt.setHours(0,0,0,0);
            toOk = d <= dt;
        }
        
        return fromOk && toOk;
      })
      .filter((salary) => {
        // Column filter
        const monthLabel = formatMonth(salary.pay_month);
        const statusKey = 'status-' + (salary.status || 'due');
        const statusLabel = i18n[state.lang]?.[statusKey] || statusKey;
        
        return (
          textIncludes(salary.public_id, cf.id) &&
          textIncludes(salary.professor_public_id, cf.professor) &&
          textIncludes(salary.class_public_id || '—', cf.class) &&
          textIncludes(monthLabel, cf.month) &&
          textIncludes(formatCurrency(salary.paid_amount), cf.paid) &&
          textIncludes(formatCurrency(salary.advances), cf.advances) &&
          textIncludes(statusLabel, cf.status)
        );
      });

    if (rows.length === 0) {
      console.log('No salary rows after filtering');
      tbody.innerHTML = `<tr><td colspan="8" style="text-align:center; padding: 1rem;">Nuk u gjetën të dhëna (Data: ${state.data.salaries?.length || 0}, Filtered: 0)</td></tr>`;
      return;
    }

    tbody.innerHTML = rows
      .map((salary) => {
        const statusClass = salary.status === 'paid' ? 'paid' : salary.status === 'partial' ? 'partial' : 'due';
        const pagaNow = formatCurrency(salary.paid_amount);
        
        // Resolve names safely
        const profs = state.data.professors || [];
        const classes = state.data.classes || [];
        
        const prof = profs.find(p => p.public_id === salary.professor_public_id);
        const profName = prof ? `${prof.first_name} ${prof.last_name}` : (salary.professor_public_id || '?');
        
        const cls = classes.find(c => c.public_id === salary.class_public_id);
        const className = cls ? cls.name : (salary.class_public_id || '—');

        return `
          <tr data-entity="salary" data-id="${salary.public_id}" class="clickable-row" title="Kliko për detajet">
            <td>${salary.public_id}</td>
            <td>${profName}</td>
            <td>${className}</td>
            <td>${formatMonth(salary.pay_month)}</td>
            <td>${pagaNow}</td>
            <td>${formatCurrency(salary.advances)}</td>
            <td><span class="status-chip ${statusClass}">${t('status-' + salary.status)}</span></td>
            <td><button type="button" data-action="print" data-entity="salary" data-id="${salary.public_id}">${t('action-print')}</button></td>
          </tr>
        `;
      })
      .join('');
  };

  const computeVatParts = (amount, rate) => {
    const gross = Number(amount || 0);
    if (rate <= 0) return { net: gross, vat: 0, gross };
    const net = gross / (1 + rate);
    const vat = Math.max(0, gross - net);
    return { net, vat, gross };
  };

  const openInvoiceTemplateForSingle = (invoice) => {
    const currency = state.data.settings?.app?.currency || 'EUR';
    const student = state.data.students.find(s => s.public_id === invoice.student_public_id);
    const clazz = state.data.classes.find(c => c.public_id === invoice.class_public_id);
    const rate = (() => { const t = getEffectiveTax(invoice); return t === 'vat18' ? 0.18 : (t === 'vat8' ? 0.08 : 0); })();
    const parts = computeVatParts(invoice.paid_amount, rate);
    const settings = state.data.settings || {};
    const biz = settings.business || {};
    const data = {
      company_name: biz.company_name || '',
      company_address: biz.company_address || '',
      company_phone: biz.company_phone || '',
      company_email: biz.company_email || '',
      company_tax_id: biz.company_tax_id || '',
      company_logo_url: biz.company_logo_url || '',
      number: invoice.public_id,
      date: new Date().toLocaleDateString(),
      class: clazz ? `${clazz.public_id} — ${clazz.name}` : invoice.class_public_id,
      student: student ? `${student.public_id} — ${student.first_name} ${student.last_name}` : invoice.student_public_id,
      // Client details for invoice template tables
      client_name: student ? `${student.first_name} ${student.last_name}` : '',
      client_id: student ? student.public_id : invoice.student_public_id,
      client_phone: student?.phone || '',
      client_email: student?.email || '',
      client_address: student?.address || '',
      lines: [
        { month: formatMonth(invoice.plan_month), amount: formatCurrency(invoice.due_amount), paid: formatCurrency(invoice.paid_amount) }
      ],
      total_paid: formatCurrency(invoice.paid_amount) + ` (${currency})`,
      net: formatCurrency(parts.net) + ` (${currency})`,
      vat: formatCurrency(parts.vat) + ` (${currency})`,
      vat_label: rate > 0 ? `TVSH (${Math.round(rate * 100)}%)` : 'TVSH',
      gross: formatCurrency(parts.gross) + ` (${currency})`,
    };
    // Prefer passing data via localStorage key to avoid URL length/encoding issues
    const key = `inv:${Date.now()}:${invoice.public_id}`;
    try { localStorage.setItem(key, JSON.stringify(data)); } catch (_) { }
    const json = encodeURIComponent(JSON.stringify(data)); // fallback
    const baseMeta = document.querySelector('meta[name="app-base"]');
    const base = baseMeta?.getAttribute('content') || '';
    // Provide both key and data (data as fallback). The invoice page will prefer key.
    window.open(`${base}invoice.html?key=${encodeURIComponent(key)}&data=${json}`, '_blank');
  };

  const openInvoiceTemplateForGroup = (invoices) => {
    if (!Array.isArray(invoices) || invoices.length === 0) return;
    const currency = state.data.settings?.app?.currency || 'EUR';
    const first = invoices[0];
    const student = state.data.students.find(s => s.public_id === first.student_public_id);
    const clazz = state.data.classes.find(c => c.public_id === first.class_public_id);
    // Sum lines and VAT per-invoice (supports mixed rates)
    let netTotal = 0, vatTotal = 0, grossTotal = 0;
    const lines = invoices.slice().sort((a, b) => a.plan_month.localeCompare(b.plan_month)).map(inv => {
      const rate = (() => { const t = getEffectiveTax(inv); return t === 'vat18' ? 0.18 : (t === 'vat8' ? 0.08 : 0); })();
      const parts = computeVatParts(inv.paid_amount, rate);
      netTotal += parts.net; vatTotal += parts.vat; grossTotal += parts.gross;
      return { month: formatMonth(inv.plan_month), amount: formatCurrency(inv.due_amount), paid: formatCurrency(inv.paid_amount) };
    });
    const settings = state.data.settings || {};
    const biz = settings.business || {};
    const data = {
      company_name: biz.company_name || '',
      company_address: biz.company_address || '',
      company_phone: biz.company_phone || '',
      company_email: biz.company_email || '',
      company_tax_id: biz.company_tax_id || '',
      company_logo_url: biz.company_logo_url || '',
      number: `${first.public_id}`,
      date: new Date().toLocaleDateString(),
      class: clazz ? `${clazz.public_id} — ${clazz.name}` : first.class_public_id,
      student: student ? `${student.public_id} — ${student.first_name} ${student.last_name}` : first.student_public_id,
      // Client details for invoice template tables
      client_name: student ? `${student.first_name} ${student.last_name}` : '',
      client_id: student ? student.public_id : first.student_public_id,
      client_phone: student?.phone || '',
      client_email: student?.email || '',
      client_address: student?.address || '',
      lines,
      total_paid: formatCurrency(grossTotal) + ` (${currency})`,
      net: formatCurrency(netTotal) + ` (${currency})`,
      vat: formatCurrency(vatTotal) + ` (${currency})`,
      vat_label: 'TVSH',
      gross: formatCurrency(grossTotal) + ` (${currency})`,
    };
    const key = `invgrp:${Date.now()}:${first.public_id}`;
    try { localStorage.setItem(key, JSON.stringify(data)); } catch (_) { }
    const json = encodeURIComponent(JSON.stringify(data)); // fallback
    const baseMeta = document.querySelector('meta[name="app-base"]');
    const base = baseMeta?.getAttribute('content') || '';
    window.open(`${base}invoice.html?key=${encodeURIComponent(key)}&data=${json}`, '_blank');
  };

  const renderSettings = () => {
    const settingsForm = document.querySelector('#settings-main');
    const settings = state.data.settings || {};

    if (settingsForm && !settingsForm.dataset.bound) {
      settingsForm.dataset.bound = 'true';

      // Populate form fields
      const biz = settings.business || {};
      const setValue = (name, value) => {
        const el = settingsForm.querySelector(`[name="${name}"]`);
        if (el) el.value = value || '';
      };

      setValue('company_name', biz.company_name);
      setValue('company_address', biz.company_address);
      setValue('company_phone', biz.company_phone);
      setValue('company_email', biz.company_email);
      setValue('company_tax_id', biz.company_tax_id);
      setValue('company_logo_url', biz.company_logo_url);

      const languageSelect = settingsForm.querySelector('#language_default');
      const currencyInput = settingsForm.querySelector('#currency');
      if (languageSelect) {
        languageSelect.value = settings.app?.language_default || 'sq';
      }
      if (currencyInput) {
        currencyInput.value = settings.app?.currency || 'EUR';
      }

      // Handle form submission
      settingsForm.addEventListener('submit', async (event) => {
        event.preventDefault();
        const formData = new FormData(settingsForm);

        try {
          // Save business settings
          const businessKeys = ['company_name', 'company_address', 'company_phone', 'company_email', 'company_tax_id', 'company_logo_url'];
          await Promise.all(
            businessKeys.map((key) =>
              apiFetch('api/settings.php', {
                method: 'POST',
                body: { group: 'business', key, value: formData.get(key), pin: '' },
              })
            )
          );

          // Save app settings
          await Promise.all(
            ['language_default', 'currency'].map((key) =>
              apiFetch('api/settings.php', {
                method: 'POST',
                body: { group: 'app', key, value: formData.get(key), pin: '' },
              })
            )
          );

          showToast('success', 'toast-saved');
          await loadDashboardData();
        } catch (error) {
          console.error(error);
          showToast('error', error?.error ?? 'toast-error');
        }
      });

      // Handle logo upload
      const uploadBtn = settingsForm.querySelector('[data-upload-logo]');
      if (uploadBtn) {
        uploadBtn.addEventListener('click', async () => {
          const fileInput = settingsForm.querySelector('[name="company_logo_file"]');
          const urlInput = settingsForm.querySelector('[name="company_logo_url"]');
          const file = fileInput?.files?.[0];
          if (!file) {
            showToast('error', 'Zgjidh një skedar logoje.');
            return;
          }
          const fd = new FormData();
          fd.append('file', file);
          fd.append('pin', '');
          uploadBtn.disabled = true;
          try {
            const res = await apiFetch('api/upload.php', { method: 'POST', body: fd });
            const url = res?.url;
            if (urlInput && url) urlInput.value = url;
            if (fileInput) fileInput.value = '';
            showToast('success', 'toast-saved');
          } catch (err) {
            console.error(err);
            showToast('error', err?.error ?? 'toast-error');
          } finally {
            uploadBtn.disabled = false;
          }
        });
      }
    } else if (settingsForm) {
      // Update values if form already bound
      const biz = settings.business || {};
      const setValue = (name, value) => {
        const el = settingsForm.querySelector(`[name="${name}"]`);
        if (el) el.value = value || '';
      };
      setValue('company_name', biz.company_name);
      setValue('company_address', biz.company_address);
      setValue('company_phone', biz.company_phone);
      setValue('company_email', biz.company_email);
      setValue('company_tax_id', biz.company_tax_id);
      setValue('company_logo_url', biz.company_logo_url);

      const languageSelect = settingsForm.querySelector('#language_default');
      const currencyInput = settingsForm.querySelector('#currency');
      if (languageSelect) {
        languageSelect.value = settings.app?.language_default || 'sq';
      }
      if (currencyInput) {
        currencyInput.value = settings.app?.currency || 'EUR';
      }
    }

    // Bind PIN Management button
    const pinManagementBtn = document.getElementById('btn-open-pin-management');
    if (pinManagementBtn && !pinManagementBtn.dataset.bound) {
      pinManagementBtn.dataset.bound = 'true';
      pinManagementBtn.addEventListener('click', () => {
        openPinVerifyModal();
      });
    }

    // Bind PIN Verify Modal
    const pinVerifyModal = document.getElementById('modal-pin-verify');
    const pinVerifyForm = document.getElementById('pin-verify-form');
    if (pinVerifyForm && !pinVerifyForm.dataset.bound) {
      pinVerifyForm.dataset.bound = 'true';

      pinVerifyForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const formData = new FormData(pinVerifyForm);
        const code = formData.get('verification_code')?.trim();

        if (!code) {
          showToast('error', 'Shkruani kod-in e verifikimit');
          return;
        }

        try {
          const submitBtn = pinVerifyForm.querySelector('button[type="submit"]');
          submitBtn.disabled = true;
          submitBtn.textContent = t('action-verify') + '...';

          const res = await apiFetch('api/permissions.php', {
            method: 'POST',
            body: { action: 'verify_token', code: code }
          });

          if (res?.status === 'ok') {
            pinVerifyModal.classList.remove('active');
            openPinManagementModal();
          }
        } catch (error) {
          console.error(error);
          showToast('error', error?.message || 'Kodi i verifikimit është i pasaktë');
        } finally {
          const submitBtn = pinVerifyForm.querySelector('button[type="submit"]');
          submitBtn.disabled = false;
          submitBtn.textContent = t('action-verify');
        }
      });

      // Resend code button
      const resendBtn = document.getElementById('btn-resend-code');
      if (resendBtn) {
        resendBtn.addEventListener('click', async () => {
          const username = prompt(t('label-username') + ':');
          if (!username) return;
          try {
            const res = await apiFetch('api/permissions.php', {
              method: 'POST',
              body: { action: 'request_access', username }
            });
            // Show success message
            if (res?.code && res?.email_note) {
              // SMTP not enabled - show code in toast (no alert)
              showToast('info', `Kodi i verifikimit: ${res.code}. ${res.email_note}`);
            } else {
              // SMTP enabled - just show success message
              showToast('success', res?.message || 'Email u dërgua përsëri. Kontrolloni email-in tuaj për kod-in.');
            }
            // Clear and focus on code input
            const codeInput = pinVerifyForm.querySelector('input[name="verification_code"]');
            if (codeInput) {
              codeInput.value = '';
              setTimeout(() => codeInput.focus(), 100);
            }
          } catch (error) {
            showToast('error', error?.message || 'toast-error');
          }
        });
      }
    }

    // Bind PIN Management Modal
    const pinManagementModal = document.getElementById('modal-pin-management');
    const pinPermissionsGrid = document.getElementById('pin-permissions-grid');
    const savePinPermissionsBtn = document.getElementById('btn-save-pin-permissions');

    if (pinManagementModal && !pinManagementModal.dataset.bound) {
      pinManagementModal.dataset.bound = 'true';

      const loadPinPermissions = async () => {
        try {
          const res = await apiFetch('api/permissions.php?action=get_permissions');
          const permissions = res?.permissions || {};
          renderPinPermissionsGrid(permissions);
        } catch (error) {
          console.error('Failed to load permissions:', error);
        }
      };

      const renderPinPermissionsGrid = (permissions) => {
        const entities = ['course', 'class', 'student', 'professor', 'invoice', 'salary'];
        const actions = [
          { key: 'create', label: t('action-add-course')?.replace('Shto ', '') || 'Krijim', icon: 'plus' },
          { key: 'update', label: t('action-edit') || 'Editim', icon: 'edit' },
          { key: 'delete', label: t('action-delete') || 'Fshirje', icon: 'trash-2' }
        ];

        pinPermissionsGrid.innerHTML = entities.map(entity => {
          const entityIcons = {
            course: 'graduation-cap',
            class: 'book-open',
            student: 'users',
            professor: 'user-check',
            invoice: 'file-text',
            salary: 'briefcase'
          };
          const entityIcon = entityIcons[entity] || 'circle';
          const entityLabel = (t('table-' + entity) || t('nav-' + entity) || entity.charAt(0).toUpperCase() + entity.slice(1));

          return `
            <div class="permission-entity">
              <h4><i data-lucide="${entityIcon}" style="width: 18px; height: 18px; display: inline-block; vertical-align: middle; margin-right: 0.5rem;"></i>${entityLabel}</h4>
              <div class="permission-actions-list">
                ${actions.map(action => {
            const key = `${entity}.${action.key}`;
            const isEnabled = permissions[key] || false;
            return `
                    <div class="permission-item ${isEnabled ? 'active' : ''}">
                      <span class="permission-label">
                        <span class="permission-icon"><i data-lucide="${action.icon}" style="width: 16px; height: 16px; display: inline-block; vertical-align: middle;"></i></span>
                        <span>${action.label}</span>
                      </span>
                      <label class="toggle-switch">
                        <input type="checkbox" data-permission-key="${key}" ${isEnabled ? 'checked' : ''}>
                        <span class="toggle-slider"></span>
                      </label>
                    </div>
                  `;
          }).join('')}
              </div>
            </div>
          `;
        }).join('');

        // Initialize Lucide icons after rendering
        if (typeof lucide !== 'undefined') {
          lucide.createIcons();
        }

        // Add real-time toggle updates
        pinPermissionsGrid.addEventListener('change', (e) => {
          if (e.target.matches('input[data-permission-key]')) {
            const item = e.target.closest('.permission-item');
            if (item) {
              if (e.target.checked) {
                item.classList.add('active');
              } else {
                item.classList.remove('active');
              }
            }
          }
        });
      };

      const openPinManagementModal = () => {
        pinManagementModal.classList.add('active');
        loadPinPermissions();
      };

      window.openPinManagementModal = openPinManagementModal;

      // Save permissions and PIN
      if (savePinPermissionsBtn) {
        savePinPermissionsBtn.addEventListener('click', async () => {
          const checkboxes = pinPermissionsGrid.querySelectorAll('input[data-permission-key]');
          const permissions = {};
          checkboxes.forEach(cb => {
            permissions[cb.dataset.permissionKey] = cb.checked;
          });

          // Get new PIN if provided
          const newPinInput = document.getElementById('new_pin_modal');
          const newPin = newPinInput?.value?.trim() || '';

          try {
            savePinPermissionsBtn.disabled = true;
            savePinPermissionsBtn.textContent = t('action-save') + '...';

            // Save permissions
            await apiFetch('api/permissions.php', {
              method: 'POST',
              body: { action: 'update_permissions', permissions }
            });

            // Save new PIN if provided
            if (newPin) {
              await apiFetch('api/permissions.php', {
                method: 'POST',
                body: { action: 'change_pin', new_pin: newPin }
              });
              showToast('success', 'Lejet dhe PASSCODE u ruajtën me sukses');
              // Clear PIN field
              if (newPinInput) newPinInput.value = '';
            } else {
              showToast('success', 'toast-saved');
            }

            // Close modal after successful save
            pinManagementModal.classList.remove('active');
          } catch (error) {
            console.error(error);
            if (error?.error === 'access_required' || error?.error === 'access_expired') {
              showToast('error', error.message || 'Aksesi skadoi. Ju lutem verifikoni përsëri.');
              pinManagementModal.classList.remove('active');
              // Don't automatically reopen verify modal - let user click button again
              // openPinVerifyModal();
            } else {
              showToast('error', error?.message || 'toast-error');
            }
          } finally {
            savePinPermissionsBtn.disabled = false;
            savePinPermissionsBtn.textContent = t('action-save');
          }
        });
      }
    }

    const openPinVerifyModal = () => {
      const modal = document.getElementById('modal-pin-verify');
      if (modal) {
        // Request code first
        const username = prompt(t('label-username') + ':');
        if (!username) return;

        apiFetch('api/permissions.php', {
          method: 'POST',
          body: { action: 'request_access', username }
        }).then((res) => {
          // Show success message
          if (res?.code && res?.email_note) {
            // SMTP not enabled - show code in toast (no alert)
            showToast('info', `Kodi i verifikimit: ${res.code}. ${res.email_note}`);
          } else {
            // SMTP enabled - just show success message
            showToast('success', res?.message || 'Email u dërgua. Kontrolloni email-in tuaj për kod-in.');
          }

          // Open modal after code is sent
          modal.classList.add('active');
          // Focus on code input
          const codeInput = modal.querySelector('input[name="verification_code"]');
          if (codeInput) {
            setTimeout(() => codeInput.focus(), 100);
          }
        }).catch(error => {
          // Don't redirect on email validation errors - just show the error
          if (error?.error === 'invalid_username' || error?.error === 'missing_fields') {
            showToast('error', error?.message || 'Email-i është i pasaktë ose mungon');
            return;
          }
          showToast('error', error?.message || 'toast-error');
        });
      }
    };

    window.openPinVerifyModal = openPinVerifyModal;

    const pinMgmtForm = document.querySelector('#form-pin-management');
    if (pinMgmtForm && !pinMgmtForm.dataset.bound) {
      pinMgmtForm.dataset.bound = 'true';
      pinMgmtForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        if (!state.settingsUnlocked) { openSettingsUnlockModal(); return; }
        const fd = new FormData(pinMgmtForm);
        const newPin = (fd.get('new_pin') || '').toString();
        if (!newPin) return;
        try {
          await apiFetch('api/settings.php', { method: 'POST', body: { group: 'security', key: 'management_pin', value: newPin, pin: state.settingsPin } });
          // Update session pin
          state.settingsPin = newPin;
          showToast('success', 'PASSCODE u ndryshua');
          closeSimpleModal('modal-pin-management');
          pinMgmtForm.reset();
        } catch (err) {
          showToast('error', err?.error || 'toast-error');
        }
      });
      // Allow closing via [data-close]
      const modal = document.querySelector('#modal-pin-management');
      modal?.addEventListener('click', (e) => { if (e.target.closest('[data-close]')) closeSimpleModal('modal-pin-management'); });
    }
  };
  const init = () => {
    detectPage();
    loadLang();
    // Rehydrate any recent invoice grouping metadata
    loadRecentInvoiceMeta();
    applyTranslations();
    bindLanguageToggle();

    // Initialize Lucide icons when DOM is ready
    if (typeof lucide !== 'undefined') {
      lucide.createIcons();
      // Also initialize after a short delay for dynamic content
      setTimeout(() => {
        if (typeof lucide !== 'undefined') {
          lucide.createIcons();
        }
      }, 100);
    }

    if (state.page === 'login') {
      initLogin();
    } else {
      initDashboard();
      bindSettingsUnlockModal();
    }
  };
  return { init };
})();
document.addEventListener('DOMContentLoaded', App.init);