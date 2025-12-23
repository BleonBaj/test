// Form Handling Module
// Handles form submissions, PIN verification, and form population

// Populate form with data
window.populateForm = (form, data) => {
  Object.entries(data).forEach(([key, value]) => {
    let input = form.querySelector(`[name="${key}"]`);
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

// Check if PIN is required for an action
window.isPinRequiredForAction = async (formType, mode) => {
  try {
    const res = await window.apiFetch('api/permissions.php?action=get_permissions');
    const permissions = res?.permissions || {};

    let actionType = 'create';
    if (mode === 'edit' || mode === 'update') {
      actionType = 'update';
    } else if (mode === 'delete') {
      actionType = 'delete';
    }

    const actionKey = `${formType}.${actionType}`;
    return permissions[actionKey] === true;
  } catch (error) {
    console.error('Failed to check PIN requirement:', error);
    return false;
  }
};

// Show PIN modal and return PIN when verified
window.requestPinForAction = () => {
  return new Promise((resolve, reject) => {
    const modal = document.getElementById('modal-action-pin');
    const form = document.getElementById('action-pin-form');
    const pinInput = document.getElementById('action-pin-input');

    if (!modal || !form || !pinInput) {
      reject(new Error('PIN modal not found'));
      return;
    }

    modal.classList.remove('active');

    // Clear and recreate input to prevent autocomplete
    const parent = pinInput.parentElement;
    const label = pinInput.previousElementSibling;
    const help = pinInput.nextElementSibling;
    const oldInput = pinInput;

    const newInput = document.createElement('input');
    newInput.type = 'password';
    newInput.name = 'pin';
    newInput.id = 'action-pin-input';
    newInput.setAttribute('autocomplete', 'new-password');
    newInput.setAttribute('autocomplete', 'off');
    newInput.placeholder = 'Shkruani PIN-in';
    newInput.required = true;

    oldInput.remove();
    if (help) {
      parent.insertBefore(newInput, help);
    } else {
      parent.appendChild(newInput);
    }

    const pinInputRef = newInput;

    setTimeout(() => {
      pinInputRef.value = '';
      pinInputRef.setAttribute('value', '');
      modal.classList.add('active');

      setTimeout(() => {
        pinInputRef.focus();
        pinInputRef.value = '';
        pinInputRef.blur();
        pinInputRef.focus();
      }, 100);

      const handleSubmit = async (e) => {
        e.preventDefault();
        const pin = pinInputRef.value.trim();
        if (!pin) {
          window.showToast('error', 'Shkruani PIN-in');
          return;
        }

        try {
          await window.apiFetch('api/settings.php?pin=' + encodeURIComponent(pin));
          pinInputRef.value = '';
          form.reset();
          modal.classList.remove('active');
          form.removeEventListener('submit', handleSubmit);
          resolve(pin);
        } catch (error) {
          window.showToast('error', 'PIN i pasaktë. Ju lutem provoni përsëri.');
          pinInputRef.value = '';
          pinInputRef.focus();
        }
      };

      const handleCancel = () => {
        pinInputRef.value = '';
        form.reset();
        modal.classList.remove('active');
        form.removeEventListener('submit', handleSubmit);
        modal.removeEventListener('click', handleCancelClick);
        reject(new Error('PIN request cancelled'));
      };

      const handleCancelClick = (e) => {
        if (e.target.closest('[data-close]')) {
          handleCancel();
        }
      };

      form.addEventListener('submit', handleSubmit);
      modal.addEventListener('click', handleCancelClick);
    }, 10);
  });
};

// Parse schedule from textarea
window.parseSchedule = (value) => {
  if (!value) return [];
  return value
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);
};

// Parse payment plan from textarea
window.parsePlan = (value, fallbackAmount) => {
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

// Handle form submission - main handler for all forms
window.handleFormSubmit = async (type, form, pin = null) => {
  const payload = window.serializeForm(form);
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
        const current = AppState.data.courses.find((c) => c.public_id === publicId) || {};
        if (String(payload.name) === String(current.name)) delete data.name;
        if (String(payload.price) === String(current.price)) delete data.price;
        if (String(payload.description || '') === String(current.description || '')) delete data.description;
      }
      if (pin && String(pin).trim() !== '') {
        data.pin = pin;
      }
      await window.apiFetch(endpoint, { method: 'POST', body: data });
      break;
    }
    case 'class': {
      const endpoint = 'api/registrations.php';
      const action = mode === 'edit' ? 'update_class' : 'create_class';
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
      const courseForPrice = AppState.data.courses.find(c => c.public_id === payload.course_public_id);
      const monthly_price = courseForPrice?.price ?? 0;
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
      if (pin && String(pin).trim() !== '') {
        data.pin = pin;
      }
      if (payload.professor_class_pay != null && String(payload.professor_class_pay).trim() !== '') {
        data.professor_class_pay = payload.professor_class_pay;
      }
      if (mode === 'edit') {
        data.public_id = publicId;
        // For edit mode, compute additions/removals for professors and students
        const current = AppState.data.classes.find((c) => c.public_id === publicId) || {};
        const currentProfIds = (current.professors || []).map(p => p.public_id);
        const newProfIds = (payload.professors || []);
        const profAdd = newProfIds.filter(id => !currentProfIds.includes(id));
        const profRemove = currentProfIds.filter(id => !newProfIds.includes(id));
        if (profAdd.length > 0) data.professors = profAdd;
        else delete data.professors;
        if (profRemove.length > 0) data.professors_remove = profRemove;
        const currentStudentIds = (current.students || []).map(s => s.public_id);
        const newStudentIds = (payload.students || []);
        const studentAdd = newStudentIds.filter(id => !currentStudentIds.includes(id));
        const studentRemove = currentStudentIds.filter(id => !newStudentIds.includes(id));
        if (studentAdd.length > 0) data.students = studentAdd;
        else delete data.students;
        if (studentRemove.length > 0) data.students_remove = studentRemove;
      }
      await window.apiFetch(endpoint, { method: 'POST', body: data });
      break;
    }
    case 'student': {
      const endpoint = 'api/registrations.php';
      const action = mode === 'edit' ? 'update_student' : 'create_student';
      let mergedNotes = {};
      if (mode === 'edit') {
        const current = AppState.data.students.find((s) => s.public_id === publicId);
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
      }
      if (pin && String(pin).trim() !== '') {
        data.pin = pin;
      }
      await window.apiFetch(endpoint, { method: 'POST', body: data });
      break;
    }
    case 'professor': {
      const endpoint = 'api/registrations.php';
      const action = mode === 'edit' ? 'update_professor' : 'create_professor';
      let bio = payload.description;
      if (mode === 'edit' && (!bio || (typeof bio === 'string' && bio.trim() === ''))) {
        const current = AppState.data.professors.find((p) => p.public_id === publicId);
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
      }
      if (pin && String(pin).trim() !== '') {
        data.pin = pin;
      }
      await window.apiFetch(endpoint, { method: 'POST', body: data });
      break;
    }
    case 'invoice':
    case 'salary': {
      // These are complex and require helper functions
      // Will be handled in respective page files or a dedicated module
      throw new Error(`${type} form submission needs helper functions - implement in page-specific file`);
    }
    default:
      throw new Error(`Unknown form type: ${type}`);
  }
};

// Bind form submissions - sets up event listeners for all forms
window.bindFormSubmissions = () => {
  document.querySelectorAll('[data-form]').forEach((form) => {
    if (form._pinSubmitHandler) {
      form.removeEventListener('submit', form._pinSubmitHandler, true);
    }

    const handler = async (event) => {
      event.preventDefault();
      event.stopImmediatePropagation();

      const type = form.getAttribute('data-form');
      if (!type) {
        console.warn('[Form Submit] No data-form attribute found');
        return;
      }

      const mode = form.dataset.mode || 'create';
      let pin = form._verifiedPin || null;

      if (!pin) {
        const pinRequired = await window.isPinRequiredForAction(type, mode);
        if (pinRequired) {
          try {
            pin = await window.requestPinForAction();
            if (!pin) return;
          } catch (error) {
            if (error.message === 'PIN request cancelled') return;
            window.showToast('error', 'Gabim në verifikimin e PIN-it');
            return;
          }
        }
      }

      if (form._verifiedPin) {
        delete form._verifiedPin;
      }

      try {
        await window.handleFormSubmit(type, form, pin);
        window.showToast('success', 'toast-saved');
        const modal = form.closest('[data-modal]');
        if (modal) {
          window.closeModal(modal);
        }
        // Reload data after successful submission
        if (window.loadDashboardData) {
          await window.loadDashboardData();
        }
      } catch (error) {
        console.error('Form submission error:', error);
        let errorMessage = error?.message || 'toast-error';
        
        if (error?.error === 'invalid_pin') {
          errorMessage = 'error-invalid-pin';
        } else if (error?.error === 'invalid_course') {
          errorMessage = 'Kursi i zgjedhur është i pasaktë';
        } else if (error?.error === 'missing_fields') {
          const fields = error?.fields || [];
          errorMessage = fields.length > 0 
            ? `Fushat e munguara: ${fields.join(', ')}`
            : 'Disa fusha janë bosh';
        } else if (error?.error === 'database_error') {
          errorMessage = 'Gabim në bazën e të dhënave';
        } else if (error?.error === 'server_error') {
          errorMessage = 'Gabim në server';
        }
        
        window.showToast('error', errorMessage);
      }
    };

    form._pinSubmitHandler = handler;
    form.addEventListener('submit', handler, { capture: true, once: false });
  });
};

// Initialize form bindings when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', window.bindFormSubmissions);
} else {
  window.bindFormSubmissions();
}
