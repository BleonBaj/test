// Table Header Filters Module
// Creates inline column filters in table headers

(function() {
  'use strict';

  // Ensure header filters are created for a table
  window.ensureHeaderFilters = (scope) => {
    if (!window.AppState || !window.t) {
      console.warn('AppState or t() not available for header filters');
      return;
    }

    const map = {
      courses: {
        sel: '#courses-table', cols: [
          { key: 'id', label: window.t('table-id') },
          { key: 'name', label: window.t('table-name') },
          { key: 'level', label: window.t('table-level') },
          { key: 'price', label: window.t('table-price') },
          { key: 'updated', label: window.t('table-updated') },
        ]
      },
      classes: {
        sel: '#classes-table', cols: [
          { key: 'id', label: window.t('table-id') },
          { key: 'name', label: window.t('table-name') },
          { key: 'course', label: window.t('table-course') },
          { key: 'level', label: window.t('table-level') },
          { key: 'period', label: window.t('table-period') },
          { key: 'price', label: window.t('table-price') },
          { key: 'professors', label: window.t('table-professors') },
          { key: 'students', label: window.t('table-students') },
        ]
      },
      students: {
        sel: '#students-table', cols: [
          { key: 'id', label: window.t('table-id') },
          { key: 'name', label: window.t('table-name') },
          { key: 'nid', label: window.t('table-national') },
          { key: 'contact', label: window.t('table-contact') },
          { key: 'age', label: window.t('table-age') },
          { key: 'registered', label: window.t('table-registered') },
        ]
      },
      professors: {
        sel: '#professors-table', cols: [
          { key: 'id', label: window.t('table-id') },
          { key: 'name', label: window.t('table-name') },
          { key: 'contact', label: window.t('table-contact') },
          { key: 'education', label: window.t('table-education') },
          { key: 'salary', label: window.t('table-salary') },
          { key: '_actions', label: window.t('table-actions'), readonly: true },
        ]
      },
      payments: {
        sel: '#payments-table', cols: [
          { key: 'id', label: window.t('table-id') },
          { key: 'student', label: window.t('table-student') },
          { key: 'class', label: window.t('table-class') },
          { key: 'month', label: window.t('table-month') },
          { key: 'paid', label: window.t('label-paid') },
          { key: 'status', label: window.t('table-status'), options: ['paid', 'partial', 'due'] },
          { key: 'confirmed', label: window.t('table-confirmed') },
          { key: '_receipt', label: window.t('table-receipt'), readonly: true },
        ]
      },
      salaries: {
        sel: '#salaries-table', cols: [
          { key: 'id', label: window.t('table-id') },
          { key: 'professor', label: window.t('table-professor') },
          { key: 'class', label: window.t('table-class') },
          { key: 'month', label: window.t('table-month') },
          { key: 'paid', label: 'Paga' },
          { key: 'advances', label: window.t('table-advances') },
          { key: 'status', label: window.t('table-status'), options: ['paid', 'partial', 'due'] },
          { key: '_receipt', label: window.t('table-receipt'), readonly: true },
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

    // Select header THs excluding selection checkbox column if present
    const ths = Array.from(headerRow.querySelectorAll('th')).filter(th => !th.hasAttribute('data-select-col'));
    
    // Use debounce from common.js if available
    const debounceFn = window.debounce || ((fn, delay) => {
      let timeout;
      return function(...args) {
        clearTimeout(timeout);
        timeout = setTimeout(() => fn.apply(this, args), delay);
      };
    });
    
    const onInput = debounceFn((e) => {
      const target = e.target;
      if (!(target instanceof HTMLInputElement || target instanceof HTMLSelectElement)) return;
      if (target.type === 'text' && target.readOnly) return;

      const token = target.getAttribute('data-col-filter') || '';
      const [sc, key] = token.split(':');
      if (!sc || !key) return;
      if (!window.AppState.filters) window.AppState.filters = {};
      if (!window.AppState.filters.columns) window.AppState.filters.columns = {};
      if (!window.AppState.filters.columns[sc]) window.AppState.filters.columns[sc] = {};
      window.AppState.filters.columns[sc][key] = target.value;
      
      // Trigger re-render
      if (sc === 'courses' && window.renderCourses) window.renderCourses();
      else if (sc === 'classes' && window.renderClasses) window.renderClasses();
      else if (sc === 'students' && window.renderStudents) window.renderStudents();
      else if (sc === 'professors' && window.renderProfessors) window.renderProfessors();
      else if (sc === 'payments' && window.renderPayments) window.renderPayments();
      else if (sc === 'salaries' && window.renderSalaries) window.renderSalaries();
    }, 180);

    ths.forEach((th, i) => {
      const col = conf.cols[i];
      if (!col) return;
      if (col.readonly) return;

      let label = th.querySelector('.th-label');
      let input = th.querySelector('input[data-inline-filter], select[data-inline-filter]');
      
      if (!label) {
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
        if (col.options && Array.isArray(col.options)) {
          // Create SELECT for status columns
          input = document.createElement('select');
          input.setAttribute('data-inline-filter', '');
          input.setAttribute('data-col-filter', `${scope}:${col.key}`);
          
          const defaultOpt = document.createElement('option');
          defaultOpt.value = '';
          defaultOpt.textContent = col.label || '';
          input.appendChild(defaultOpt);
          
          col.options.forEach(opt => {
            const o = document.createElement('option');
            o.value = opt;
            // Translate if possible
            const key = `status-${opt}`;
            const lang = (window.AppState && window.AppState.lang) || 'sq';
            let translated = opt;
            if (window.i18nData && window.i18nData[lang] && window.i18nData[lang][key]) {
              translated = window.i18nData[lang][key];
            } else if (window.t) {
              translated = window.t(key) || opt;
            }
            o.textContent = translated;
            input.appendChild(o);
          });

          Object.assign(input.style, {
            position: 'absolute',
            inset: '0',
            width: '100%',
            height: '100%',
            padding: '0.75rem 1rem',
            border: 'none',
            outline: 'none',
            background: 'transparent',
            font: 'inherit',
            letterSpacing: '0.05em',
            fontWeight: '700',
            textTransform: 'uppercase',
            color: 'inherit',
            opacity: '0',
            cursor: 'pointer',
            appearance: 'none'
          });

          th.addEventListener('click', () => { 
            input.style.opacity = '1';
            input.focus(); 
          });
          
          input.addEventListener('change', (e) => {
            onInput(e);
            input.blur();
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
              input.style.opacity = '1';
            }
          });

          th.appendChild(input);
        } else {
          // Create lazy INPUT for text columns
          if (!th.hasAttribute('data-lazy-filter-bound')) {
            th.setAttribute('data-lazy-filter-bound', 'true');
            th.style.cursor = 'text';
            
            const activateInput = () => {
              let lazyInput = th.querySelector('input[data-inline-filter]');
              if (lazyInput) {
                lazyInput.style.opacity = '1';
                if (label) label.style.visibility = 'hidden';
                lazyInput.focus();
                return;
              }

              lazyInput = document.createElement('input');
              lazyInput.type = 'text';
              lazyInput.name = `filter_${scope}_${col.key}_${Date.now()}`;
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
                background: 'var(--surface)',
                font: 'inherit',
                letterSpacing: '0.05em',
                fontWeight: '700',
                textTransform: 'uppercase',
                color: 'inherit',
                opacity: '1',
              });

              const existingVal = (window.AppState.filters?.columns?.[scope]?.[col.key]) || '';
              lazyInput.value = existingVal;

              lazyInput.addEventListener('input', onInput);
              lazyInput.addEventListener('blur', () => {
                const val = (lazyInput.value || '').trim();
                if (val === '') {
                  lazyInput.remove();
                  if (label) label.style.visibility = 'visible';
                }
              });
              
              lazyInput.addEventListener('click', (e) => e.stopPropagation());

              th.appendChild(lazyInput);
              if (label) label.style.visibility = 'hidden';
              lazyInput.focus();
            };

            th.addEventListener('click', activateInput);
            
            const existingVal = window.AppState.filters?.columns?.[scope]?.[col.key];
            if (existingVal) {
              activateInput();
            }
          }
        }
      }
    });
  };
})();
