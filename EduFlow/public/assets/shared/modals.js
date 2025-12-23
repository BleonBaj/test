// Modal Management Module
// Handles opening, closing, and managing modals

// Simple modal helpers
window.openSimpleModal = (id) => {
  const modal = document.querySelector(`#${id}`);
  if (modal) modal.classList.add('active');
};

window.closeSimpleModal = (id) => {
  const modal = document.querySelector(`#${id}`);
  if (modal) modal.classList.remove('active');
};

// Settings unlock modal helper
window.openSettingsUnlockModal = () => {
  const modal = document.getElementById('modal-settings-unlock');
  if (!modal) {
    console.error('Modal settings unlock not found');
    return;
  }

  const form = modal.querySelector('form');
  if (form) {
    const pinInput = form.querySelector('input[name="pin"]');
    if (pinInput) {
      pinInput.value = '';
      pinInput.setAttribute('autocomplete', 'off');
    }
  }

  modal.classList.add('active');

  setTimeout(() => {
    const pinInput = form?.querySelector('input[name="pin"]');
    if (pinInput) {
      pinInput.focus();
      pinInput.value = '';
    }
  }, 100);
};

// Main modal management functions
window.closeModal = (modal) => {
  if (typeof modal === 'string') {
    modal = document.querySelector(`#modal-${modal}`);
  }
  if (!modal || !(modal instanceof HTMLElement)) return;
  
  modal.classList.remove('active');
  const form = modal.querySelector('[data-form]');
  if (form) {
    form.reset();
  }
  
  // Clear PIN modal if it exists
  const pinModal = document.querySelector('#modal-action-pin');
  if (pinModal) {
    pinModal.classList.remove('active');
    const pinInput = pinModal.querySelector('#action-pin-input');
    if (pinInput) pinInput.value = '';
  }
};

// Main openModal function - handles all modal types
window.openModal = async (id, mode = 'create', data = null) => {
  const modal = document.querySelector(`#modal-${id}`);
  if (!modal) {
    console.error(`Modal #modal-${id} not found`);
    return;
  }

  // Check if PIN is required BEFORE opening the form
  const form = modal.querySelector('[data-form]');
  if (form) {
    const type = form.getAttribute('data-form');
    if (type && window.isPinRequiredForAction) {
      const actionType = (mode === 'edit' || mode === 'update') ? 'update' : 'create';
      const pinRequired = await window.isPinRequiredForAction(type, mode);

      if (pinRequired && window.requestPinForAction) {
        try {
          const pin = await window.requestPinForAction();
          if (!pin) {
            return; // Don't open modal if PIN not provided
          }
          // Store PIN temporarily for form submission
          form._verifiedPin = pin;
        } catch (error) {
          if (error.message === 'PIN request cancelled') {
            return; // Don't open modal if user cancelled PIN
          }
          if (window.showToast) {
            window.showToast('error', 'Gabim në verifikimin e PIN-it');
          }
          return;
        }
      }
    }

    form.reset();
    form.dataset.mode = mode;
    delete form.dataset.publicId;
    
    // Ensure form submission is bound
    if (!form._pinSubmitHandler && window.bindFormSubmissions) {
      window.bindFormSubmissions();
    }
    
    // Clear chips containers if present
    form.querySelectorAll('.selected-chips').forEach((el) => { el.innerHTML = ''; });
    
    if (data && window.populateForm) {
      window.populateForm(form, data);
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

          // Expect objects {day,start,end}
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
      if (id === 'class' && window.renderChipsForSelect && window.bindChipInteractions) {
        window.renderChipsForSelect(form, 'professors');
        window.renderChipsForSelect(form, 'students');
        window.bindChipInteractions(form);
        
        // Keep chips in sync when user selects/deselects in multiselect
        const profSel = form.querySelector('select[name="professors[]"]');
        const studSel = form.querySelector('select[name="students[]"]');
        profSel?.addEventListener('change', () => window.renderChipsForSelect(form, 'professors'));
        studSel?.addEventListener('change', () => window.renderChipsForSelect(form, 'students'));
      }
    }
  }

  // Invoice modal: ensure UX bindings and sensible defaults
  if (id === 'invoice') {
    if (window.populateSelectOptions) {
      window.populateSelectOptions();
    }
    // initInvoiceFormUX would be called here if it exists
    const studentSel = modal.querySelector('#invoice-student');
    const classSel = modal.querySelector('#invoice-class');
    const monthsSel = modal.querySelector('#invoice-months');
    const amountInput = modal.querySelector('#invoice-amount');
    const statusSelect = modal.querySelector('#invoice-status');
    const taxSelect = modal.querySelector('#invoice-tax');
    
    if (mode === 'edit' && data) {
      if (studentSel && data.student_public_id) studentSel.value = data.student_public_id;
      if (classSel && data.class_public_id) classSel.value = data.class_public_id;
      if (monthsSel && data.plan_month && window.formatMonth) {
        monthsSel.innerHTML = `<option value="${data.plan_month}">${window.formatMonth(data.plan_month)}</option>`;
        Array.from(monthsSel.options).forEach(opt => { opt.selected = (opt.value === data.plan_month); });
      }
      if (amountInput && (data.due_amount || data.paid_amount)) {
        amountInput.value = String(data.due_amount ?? '');
      }
      if (taxSelect) taxSelect.value = data.tax || 'none';
    } else {
      // Create mode: clear selections
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

  // Salary modal: initialize UX
  if (id === 'salary') {
    // initSalaryFormUX would be called here if it exists
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
    
    // Trigger handlers if needed
    if (profSel) profSel.dispatchEvent(new Event('change'));
    if (classSel && classSel.value) classSel.dispatchEvent(new Event('change'));
  }

  modal.classList.add('active');
};

// Build chips from current selection for a given field (professors|students)
window.renderChipsForSelect = (form, field) => {
  const select = form.querySelector(`select[name="${field}[]"]`);
  const container = form.querySelector(`.selected-chips[data-chips="${field}"]`);
  if (!select || !container) return;
  const selected = Array.from(select.selectedOptions).map(opt => ({ id: opt.value, label: opt.textContent }));
  container.innerHTML = selected.map(({ id, label }) => `
    <span class="chip-item" data-chip="${field}" data-id="${id}">
      ${label}
      <button type="button" class="chip-remove" aria-label="remove" title="${window.t ? window.t('action-delete') : 'Delete'}">×</button>
    </span>
  `).join('');
};

window.bindChipInteractions = (form) => {
  if (form.dataset.chipsBound) return;
  form.dataset.chipsBound = 'true';
  form.addEventListener('click', (e) => {
    const btn = e.target.closest('.chip-remove');
    if (!btn) return;
    const chip = btn.closest('[data-chip]');
    if (!chip) return;
    const field = chip.getAttribute('data-chip');
    const id = chip.getAttribute('data-id');
    const select = form.querySelector(`select[name="${field}[]"]`);
    if (!select || !id) return;
    // Deselect option in select
    Array.from(select.options).forEach(opt => { if (opt.value === id) opt.selected = false; });
    // Remove chip
    chip.remove();
    // Re-render chips to sync
    if (window.renderChipsForSelect) {
      window.renderChipsForSelect(form, field);
    }
  });
};

// Bind modal triggers - for data-open-modal and data-close attributes
window.bindModalTriggers = () => {
  document.querySelectorAll('[data-open-modal]').forEach((btn) => {
    if (btn.dataset.bound) return;
    btn.dataset.bound = 'true';
    btn.addEventListener('click', () => {
      const modalId = btn.getAttribute('data-open-modal');
      if (window.openModal) {
        window.openModal(modalId);
      } else {
        window.openSimpleModal(`modal-${modalId}`);
      }
    });
  });

  document.querySelectorAll('[data-modal]').forEach((modal) => {
    modal.addEventListener('click', (event) => {
      const target = event.target;
      if (target instanceof HTMLElement && target.closest('[data-close]')) {
        window.closeModal(modal);
        
        // Clear code when manually closed for 2FA modal
        if (modal.id === 'modal-2fa-verify') {
          const codeInput = document.getElementById('2fa-code');
          if (codeInput) codeInput.value = '';
        }
        
        // Clear code when manually closed for PIN verify modal
        if (modal.id === 'modal-pin-verify') {
          const verifyForm = modal.querySelector('#pin-verify-form');
          if (verifyForm) verifyForm.reset();
        }
      }
      
      // Prevent closing on background click
      if (event.target === modal) {
        event.stopPropagation();
        return;
      }
    });
  });
};

// Initialize modals when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', window.bindModalTriggers);
} else {
  window.bindModalTriggers();
}
