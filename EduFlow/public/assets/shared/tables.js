// Table Rendering and Actions Module
// Handles table rendering, row clicks, and table actions

// Selection state for bulk operations
window.selection = {
  enabled: false,
  entity: null,
};

// Table action handlers
window.handleEdit = (entity, publicId) => {
  if (!window.AppState || !window.AppState.data) {
    console.error('AppState not available');
    return;
  }
  
  const map = {
    course: ['course', window.AppState.data.courses],
    class: ['class', window.AppState.data.classes],
    student: ['student', window.AppState.data.students],
    professor: ['professor', window.AppState.data.professors],
    invoice: ['invoice', window.AppState.data.invoices],
    salary: ['salary', window.AppState.data.salaries],
  };

  const entry = map[entity];
  if (!entry) return;
  const [modalId, collection] = entry;
  const data = collection.find((item) => item.public_id === publicId);
  if (!data) return;

  const normalized = { ...data };

  if (modalId === 'class') {
    try {
      normalized.schedule = Array.isArray(data.schedule)
        ? data.schedule
        : JSON.parse(data.schedule || '[]');
    } catch (_) {
      normalized.schedule = [];
    }
    normalized.course_public_id = data.course_public_id || '';
    normalized.description = data.description || '';
    normalized.professors = data.professors?.map((prof) => prof.public_id) || [];
    normalized.students = data.students?.map((student) => student.public_id) || [];
  }

  if (modalId === 'invoice') {
    normalized.student_public_id = data.student_public_id;
    normalized.class_public_id = data.class_public_id;
    normalized.plan_month = data.plan_month;
  }

  if (modalId === 'salary') {
    normalized.professor_public_id = data.professor_public_id;
    normalized.class_public_id = data.class_public_id || '';
    normalized.pay_month = data.pay_month;
  }

  // Open modal with edit mode
  if (window.openModal) {
    window.openModal(modalId, 'edit', normalized);
  } else {
    console.error('openModal function not available');
  }
};

// Handle delete action
window.handleDelete = async (entity, publicId, pin = null) => {
  const deleteData = { public_id: publicId };
  if (pin && String(pin).trim() !== '') {
    deleteData.pin = pin;
  }

  switch (entity) {
    case 'course':
      await window.apiFetch('api/registrations.php', {
        method: 'POST',
        body: { action: 'delete_course', ...deleteData },
      });
      break;
    case 'class':
      await window.apiFetch('api/registrations.php', {
        method: 'POST',
        body: { action: 'delete_class', ...deleteData },
      });
      break;
    case 'student':
      await window.apiFetch('api/registrations.php', {
        method: 'POST',
        body: { action: 'delete_student', ...deleteData },
      });
      break;
    case 'professor':
      await window.apiFetch('api/registrations.php', {
        method: 'POST',
        body: { action: 'delete_professor', ...deleteData },
      });
      break;
    case 'invoice':
      await window.apiFetch('api/payments.php', {
        method: 'POST',
        body: { action: 'delete_invoice', ...deleteData },
      });
      break;
    case 'salary':
      await window.apiFetch('api/salaries.php', {
        method: 'POST',
        body: { action: 'delete_salary', ...deleteData },
      });
      break;
  }
};

// Bind table actions - handles clicks on table rows and action buttons
window.bindTableActions = () => {
  document.body.addEventListener('click', async (event) => {
    const target = event.target;
    if (!(target instanceof HTMLElement)) return;

    // Skip if clicking on checkbox or action button
    if (target.closest('.row-select')) return;
    if (target.getAttribute('data-action')) {
      // Handle action buttons below
    }

    // Skip row clicks if selection mode is enabled
    if (window.toolbarSelection && window.toolbarSelection.enabled) {
      return; // Let toolbar handle selection
    }

    // Handle row clicks for details modals
    const classRow = target.closest('tr[data-entity="class"]');
    if (classRow && !target.getAttribute('data-action')) {
      const publicId = classRow.getAttribute('data-id');
      if (publicId && window.showClassDetails) {
        await window.showClassDetails(publicId);
        return;
      }
    }

    const studentRow = target.closest('tr[data-entity="student"]');
    if (studentRow && !target.getAttribute('data-action')) {
      const publicId = studentRow.getAttribute('data-id');
      if (publicId && window.showStudentDetails) {
        window.showStudentDetails(publicId);
        return;
      }
    }

    const profRow = target.closest('tr[data-entity="professor"]');
    if (profRow && !target.getAttribute('data-action')) {
      const publicId = profRow.getAttribute('data-id');
      if (publicId && window.showProfessorDetails) {
        window.showProfessorDetails(publicId);
        return;
      }
    }

    // Handle action buttons
    const action = target.getAttribute('data-action');
    const entity = target.getAttribute('data-entity');
    const publicId = target.getAttribute('data-id');

    if (!action || !entity || !publicId) return;

    if (action === 'edit') {
      window.handleEdit(entity, publicId);
      return;
    }

    if (action === 'delete') {
      if (!confirm(window.t('confirm-delete') || 'A jeni i sigurt që doni të fshini këtë element?')) {
        return;
      }
      const mode = 'delete';
      let pin = null;

      const pinRequired = await window.isPinRequiredForAction(entity, mode);
      if (pinRequired) {
        try {
          pin = await window.requestPinForAction();
        } catch (error) {
          if (error.message === 'PIN request cancelled') return;
          window.showToast('error', 'Gabim në verifikimin e PIN-it');
          return;
        }
      }

      try {
        await window.handleDelete(entity, publicId, pin);
        window.showToast('success', 'toast-deleted');
        if (window.loadDashboardData) {
          await window.loadDashboardData();
        }
      } catch (error) {
        console.error(error);
        window.showToast('error', error?.error ?? 'toast-error');
      }
      return;
    }
  });

  // Double-click handlers
  document.body.addEventListener('dblclick', async (event) => {
    const target = event.target;
    if (!(target instanceof HTMLElement)) return;

    const classRow = target.closest('tr[data-entity="class"]');
    if (classRow && window.showClassDetails) {
      const id = classRow.getAttribute('data-id');
      if (id) await window.showClassDetails(id);
      return;
    }

    const studentRow = target.closest('tr[data-entity="student"]');
    if (studentRow && window.showStudentDetails) {
      const id = studentRow.getAttribute('data-id');
      if (id) window.showStudentDetails(id);
      return;
    }
  });
};

// Helper: Get class by public ID
window.getClassByPublicId = (pid) => {
  if (!window.AppState || !window.AppState.data) return null;
  return window.AppState.data.classes.find((c) => c.public_id === pid);
};

// Show student details
window.showStudentDetails = (publicId) => {
  if (!window.AppState || !window.AppState.data) {
    console.error('AppState not available');
    return;
  }
  const student = window.AppState.data.students.find(s => s.public_id === publicId);
  if (!student) return;
  const modal = document.querySelector('#modal-student-details');
  if (!modal) return;
  
  modal.querySelector('.student-details-id').textContent = student.public_id || '';
  modal.querySelector('.student-name').textContent = `${student.first_name || ''} ${student.last_name || ''}`.trim();
  modal.querySelector('.student-nid').textContent = student.national_id || '—';
  modal.querySelector('.student-age').textContent = student.age || '—';
  modal.querySelector('.student-registered').textContent = window.formatDate(student.registration_date);
  modal.querySelector('.student-phone').textContent = student.phone || '—';
  
  // Optional fields from notes
  let email = '', address = student.address || '', parentName = '', parentPhone = '', skills = '', description = '';
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
    const classes = window.AppState.data.classes.filter(c => (c.students || []).some(s => s.public_id === publicId));
    const classesHtml = classes.length ? classes.map(c => `<div class="person-item">${c.public_id} — ${c.name}</div>`).join('') : '<div class="no-data">—</div>';
    modal.querySelector('.student-classes').innerHTML = classesHtml;

    // Invoices for this student
    const invoices = window.AppState.data.invoices.filter(inv => inv.student_public_id === publicId);
  const invHtml = invoices.length ? invoices.map(inv => `
    <div class="payment-plan-item">
      <div><strong>${window.formatMonth(inv.plan_month)}</strong> — ${inv.class_public_id}</div>
      <div>${window.formatCurrency(inv.due_amount)} · ${window.t('label-paid')}: ${window.formatCurrency(inv.paid_amount)} · <span class="status-chip ${inv.status}">${window.t('status-' + inv.status)}</span></div>
    </div>
  `).join('') : '<div class="no-data">—</div>';
  modal.querySelector('.student-invoices').innerHTML = invHtml;

  if (window.openModal) {
    window.openModal('student-details');
  }
};

// Show professor details
window.showProfessorDetails = (publicId) => {
  if (!window.AppState || !window.AppState.data) {
    console.error('AppState not available');
    return;
  }
  const prof = window.AppState.data.professors.find(p => p.public_id === publicId);
  if (!prof) return;
  const modal = document.querySelector('#modal-professor-details');
  if (!modal) return;
  
  modal.querySelector('.professor-details-id').textContent = prof.public_id || '';
  modal.querySelector('.professor-name').textContent = `${prof.first_name || ''} ${prof.last_name || ''}`.trim();
  modal.querySelector('.professor-salary').textContent = window.formatCurrency(prof.base_salary);
  modal.querySelector('.professor-phone').textContent = prof.phone || '—';
  modal.querySelector('.professor-email').textContent = prof.email || '—';
  modal.querySelector('.professor-address').textContent = prof.address || '—';
  modal.querySelector('.professor-national').textContent = prof.national_id || '—';
  modal.querySelector('.professor-education').textContent = prof.education || '—';
  modal.querySelector('.professor-bio').textContent = prof.biography || '—';
    const salaryType = prof.salary_type === 'fixed' ? ((window.AppState && window.AppState.lang === 'sq') ? 'Mujore' : 'Monthly') : (prof.salary_type || '—');
  modal.querySelector('.professor-salary-type').textContent = salaryType;

    // Classes taught by this professor
    const classes = window.AppState.data.classes.filter(c => (c.professors || []).some(p => p.public_id === publicId));
    const classesHtml = classes.length ? classes.map(c => `<div class="person-item">${c.public_id} — ${c.name}</div>`).join('') : '<div class="no-data">—</div>';
    modal.querySelector('.professor-classes').innerHTML = classesHtml;

    // Salaries for this professor
    const salaries = window.AppState.data.salaries.filter(s => s.professor_public_id === publicId);
  const salHtml = salaries.length ? salaries.map(s => {
    let baseDisplay = Number(s.base_amount || 0);
      if (s.class_public_id) {
        const cls = window.AppState.data.classes.find(c => c.public_id === s.class_public_id);
      let base = 0;
      if (cls && cls.professor_class_pay != null && cls.professor_class_pay !== '') {
        base = Number(cls.professor_class_pay);
      } else if (cls && Array.isArray(cls.professors)) {
        const p = cls.professors.find(x => x.public_id === publicId);
        if (p && p.pay_amount != null && p.pay_amount !== '') base = Number(p.pay_amount);
      }
      if (!base) base = Number(cls?.monthly_price || 0);
      baseDisplay = base;
    } else {
      baseDisplay = Number(prof.base_salary || 0);
    }
    return `
      <div class="payment-plan-item">
        <div><strong>${window.formatMonth(s.pay_month)}</strong> — ${s.class_public_id || '—'}</div>
        <div>${window.formatCurrency(baseDisplay)} · ${window.t('label-advances')}: ${window.formatCurrency(s.advances)} · <span class="status-chip ${s.status}">${window.t('status-' + s.status)}</span></div>
      </div>
    `;
  }).join('') : '<div class="no-data">—</div>';
  modal.querySelector('.professor-salaries').innerHTML = salHtml;

  if (window.openModal) {
    window.openModal('professor-details');
  }
};

// Populate class details modal
window.populateClassDetailsModal = (classData) => {
  const modal = document.querySelector('#modal-class-details');
  if (!modal) return;
  modal.dataset.classId = classData.public_id || '';

  // Basic information
  modal.querySelector('.class-details-id').textContent = classData.public_id || '';
  modal.querySelector('.class-name').textContent = classData.name || '—';
  modal.querySelector('.class-course').textContent = classData.course_name ?
    `${classData.course_public_id} — ${classData.course_name}` : (classData.course_public_id || '—');
  modal.querySelector('.class-level').textContent = classData.level || '—';
  modal.querySelector('.class-price').textContent = window.formatCurrency(classData.monthly_price);

  // Period
  const startDate = window.formatDate(classData.start_date);
  const endDate = classData.end_date ? window.formatDate(classData.end_date) : '—';
  modal.querySelector('.class-period').textContent = `${startDate} – ${endDate}`;

  // Schedule
  const scheduleContainer = modal.querySelector('.class-schedule');
  let scheduleArr = [];
  if (Array.isArray(classData.schedule)) {
    scheduleArr = classData.schedule;
  } else {
    try { scheduleArr = JSON.parse(classData.schedule || '[]'); } catch (_) { scheduleArr = []; }
  }
  if (scheduleArr.length > 0) {
    const dayNames = {
      'mon': 'E hënë', 'tue': 'E martë', 'wed': 'E mërkurë', 'thu': 'E enjte',
      'fri': 'E premte', 'sat': 'E shtunë', 'sun': 'E diel'
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

  // Professors
  const professorsContainer = modal.querySelector('.class-professors');
  if (classData.professors && classData.professors.length > 0) {
    const header = (classData.professor_class_pay != null && classData.professor_class_pay !== '')
      ? `<div class="person-item"><em>Paga profesorit (për klasë): ${window.formatCurrency(Number(classData.professor_class_pay))}</em></div>`
      : '';
    professorsContainer.innerHTML = header + classData.professors.map(prof => {
      const pay = (prof && Object.prototype.hasOwnProperty.call(prof, 'pay_amount') && prof.pay_amount != null && prof.pay_amount !== '')
        ? ` · paga për klasë: ${window.formatCurrency(Number(prof.pay_amount))}`
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
  if (descriptionContainer) descriptionContainer.textContent = classData.description || '—';

  // Payment plan
  const paymentPlanContainer = modal.querySelector('.class-payment-plan');
  if (paymentPlanContainer) {
    if (classData.payment_plan && classData.payment_plan.length > 0) {
      paymentPlanContainer.innerHTML = classData.payment_plan.map(plan => {
        const month = window.formatMonth(plan.plan_month);
        const amount = window.formatCurrency(plan.due_amount);
        const dueDate = plan.due_date ? window.formatDate(plan.due_date) : '—';
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
  }

  // Invoices / Payments
  const invoicesContainer = modal.querySelector('.class-invoices');
  if (invoicesContainer) {
    const invoices = classData.invoices || [];
    if (invoices.length > 0) {
      invoicesContainer.innerHTML = invoices.map(inv => {
        const month = window.formatMonth(inv.plan_month);
        const due = window.formatCurrency(inv.due_amount);
        const paid = window.formatCurrency(inv.paid_amount);
        const statusClass = inv.status === 'paid' ? 'paid' : inv.status === 'partial' ? 'partial' : 'due';
        const confirmed = inv.confirmed_at ? window.formatDate(inv.confirmed_at) : '—';
        return `
          <div class="payment-plan-item">
            <div><strong>${month}</strong> — ${inv.student_public_id}</div>
            <div>${due} · ${window.t('label-paid')}: ${paid} · <span class="status-chip ${statusClass}">${window.t('status-' + inv.status)}</span></div>
            <div><small>${window.t('table-confirmed')}: ${confirmed}</small></div>
          </div>
        `;
      }).join('');
    } else {
      invoicesContainer.innerHTML = '<div class="no-data">—</div>';
    }
  }

  // Bind edit button
  const editBtn = modal.querySelector('[data-class-edit]');
  if (editBtn) {
    editBtn.onclick = () => {
      window.closeModal(modal);
      window.handleEdit('class', classData.public_id);
    };
  }
};

// Show class details
window.showClassDetails = async (publicId) => {
  try {
    const response = await window.apiFetch(`api/class-details.php?id=${encodeURIComponent(publicId)}`);
    const classData = response.class;
    if (window.populateClassDetailsModal) {
      window.populateClassDetailsModal(classData);
      if (window.openModal) {
        window.openModal('class-details');
      }
    }
  } catch (error) {
    console.error(error);
    if (window.showToast) {
      window.showToast('error', error?.error ?? 'toast-error');
    }
  }
};

// Format schedule compactly
window.formatScheduleCompact = (schedule) => {
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

// Export CSV utility
window.exportTableToCSV = (tableId, filename) => {
  const table = document.getElementById(tableId);
  if (!table) return;
  
  const headers = Array.from(table.querySelectorAll('thead th'))
    .map(th => th.textContent.trim())
    .filter(h => h);
  
  const rows = Array.from(table.querySelectorAll('tbody tr'))
    .map(tr => Array.from(tr.querySelectorAll('td'))
      .map(td => `"${td.textContent.trim().replace(/"/g, '""')}"`)
      .join(','));
  
  const csv = [headers.join(','), ...rows].join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename || 'export.csv';
  a.click();
  URL.revokeObjectURL(url);
};

// Table rendering functions (used by management page)
// These will be fully implemented by extracting from app.js
window.renderCourses = () => {
  const tbody = document.querySelector('#courses-table tbody');
  if (!tbody) {
    console.warn('Courses table tbody not found');
    return;
  }
  
  if (!window.AppState) {
    console.warn('AppState not available for renderCourses');
    tbody.innerHTML = `<tr><td colspan="5">Loading...</td></tr>`;
    return;
  }
  
  if (!window.AppState.data) {
    console.warn('AppState.data not available for renderCourses');
    tbody.innerHTML = `<tr><td colspan="5">Loading data...</td></tr>`;
    return;
  }
  
  if (!window.AppState.data.courses) {
    window.AppState.data.courses = [];
  }
  
  if (!window.AppState.data.courses.length) {
    tbody.innerHTML = `<tr><td colspan="5">—</td></tr>`;
    // Ensure header filters after rendering
    if (window.ensureHeaderFilters) {
      setTimeout(() => window.ensureHeaderFilters('courses'), 50);
    }
    return;
  }
  
  const f = window.AppState.filters.columns.courses || {};
  const rows = window.AppState.data.courses
    .filter((course) => {
      const from = window.AppState.filters.management.dateFrom;
      const to = window.AppState.filters.management.dateTo;
      if (!from && !to) return true;
      const d = window.toDateObj(course.updated_at);
      if (!d) return true;
      const fromOk = from ? (d >= new Date(`${from}T00:00:00`)) : true;
      const toOk = to ? (d <= new Date(`${to}T23:59:59`)) : true;
      return fromOk && toOk;
    })
    .filter((course) =>
      window.textIncludes(course.public_id, f.id || '') &&
      window.textIncludes(course.name, f.name || '') &&
      window.textIncludes(course.level, f.level || '') &&
      window.textIncludes(window.formatCurrency(course.price), f.price || '') &&
      window.textIncludes(window.formatDate(course.updated_at), f.updated || '')
    )
    .map((course) => `
      <tr data-entity="course" data-id="${course.public_id}">
        <td>${course.public_id}</td>
        <td>${course.name}</td>
        <td>${course.level}</td>
        <td>${window.formatCurrency(course.price)}</td>
        <td>${window.formatDate(course.updated_at)}</td>
      </tr>
    `)
    .join('');
  tbody.innerHTML = rows || `<tr><td colspan="5">—</td></tr>`;
  
  // Ensure header filters after rendering
  if (window.ensureHeaderFilters) {
    setTimeout(() => window.ensureHeaderFilters('courses'), 50);
  }
};

window.renderClasses = () => {
  const tbody = document.querySelector('#classes-table tbody');
  if (!tbody) {
    console.warn('Classes table tbody not found');
    return;
  }
  
  if (!window.AppState) {
    console.warn('AppState not available for renderClasses');
    tbody.innerHTML = `<tr><td colspan="8">Loading...</td></tr>`;
    return;
  }
  
  if (!window.AppState.data) {
    console.warn('AppState.data not available for renderClasses');
    tbody.innerHTML = `<tr><td colspan="8">Loading data...</td></tr>`;
    return;
  }
  
  if (!window.AppState.data.classes) {
    window.AppState.data.classes = [];
  }
  
  if (!window.AppState.data.classes.length) {
    tbody.innerHTML = `<tr><td colspan="8">—</td></tr>`;
    // Ensure header filters after rendering
    if (window.ensureHeaderFilters) {
      setTimeout(() => window.ensureHeaderFilters('classes'), 50);
    }
    return;
  }
  
  const f = window.AppState.filters.columns.classes || {};
  tbody.innerHTML = window.AppState.data.classes
    .filter((cls) => {
      const from = window.AppState.filters.management.dateFrom;
      const to = window.AppState.filters.management.dateTo;
      if (!from && !to) return true;
      const start = window.toDateObj(cls.start_date);
      const end = window.toDateObj(cls.end_date || cls.start_date);
      const fromD = from ? new Date(`${from}T00:00:00`) : null;
      const toD = to ? new Date(`${to}T23:59:59`) : null;
      if (!start && !end) return true;
      const startsBeforeTo = toD ? (start ? start <= toD : true) : true;
      const endsAfterFrom = fromD ? (end ? end >= fromD : true) : true;
      return startsBeforeTo && endsAfterFrom;
    })
    .filter((cls) => {
      const period = `${window.formatDate(cls.start_date)} – ${cls.end_date ? window.formatDate(cls.end_date) : '—'}`;
      const courseCell = cls.course_name ? `${cls.course_public_id} — ${cls.course_name}` : (cls.course_public_id || '—');
      const professors = (cls.professors || []).map((prof) => prof.public_id).join(', ') || '—';
      const students = (cls.students || []).map((student) => student.public_id).join(', ') || '—';
      return window.textIncludes(cls.public_id, f.id || '')
        && window.textIncludes(cls.name, f.name || '')
        && window.textIncludes(courseCell, f.course || '')
        && window.textIncludes(cls.level, f.level || '')
        && window.textIncludes(period, f.period || '')
        && window.textIncludes(window.formatCurrency(cls.monthly_price), f.price || '')
        && window.textIncludes(professors, f.professors || '')
        && window.textIncludes(students, f.students || '');
    })
    .map((cls) => {
      const period = `${window.formatDate(cls.start_date)} – ${cls.end_date ? window.formatDate(cls.end_date) : '—'}`;
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
          <td>${window.formatCurrency(cls.monthly_price)}</td>
          <td>${professors}</td>
          <td>${students}</td>
        </tr>
      `;
    })
    .join('');
    
  // Ensure header filters after rendering
  if (window.ensureHeaderFilters) {
    setTimeout(() => window.ensureHeaderFilters('classes'), 50);
  }
};

window.renderStudents = () => {
  const tbody = document.querySelector('#students-table tbody');
  if (!tbody) {
    console.warn('Students table tbody not found');
    return;
  }
  
  if (!window.AppState) {
    console.warn('AppState not available for renderStudents');
    tbody.innerHTML = `<tr><td colspan="6">Loading...</td></tr>`;
    return;
  }
  
  if (!window.AppState.data) {
    console.warn('AppState.data not available for renderStudents');
    tbody.innerHTML = `<tr><td colspan="6">Loading data...</td></tr>`;
    return;
  }
  
  if (!window.AppState.data.students) {
    window.AppState.data.students = [];
  }
  
  if (!window.AppState.data.students.length) {
    tbody.innerHTML = `<tr><td colspan="6">—</td></tr>`;
    // Ensure header filters after rendering
    if (window.ensureHeaderFilters) {
      setTimeout(() => window.ensureHeaderFilters('students'), 50);
    }
    return;
  }
  
  const f = window.AppState.filters.columns.students || {};
  tbody.innerHTML = window.AppState.data.students
    .filter((student) => {
      const from = window.AppState.filters.management.dateFrom;
      const to = window.AppState.filters.management.dateTo;
      if (!from && !to) return true;
      const d = window.toDateObj(student.registration_date);
      if (!d) return true;
      const fromOk = from ? (d >= new Date(`${from}T00:00:00`)) : true;
      const toOk = to ? (d <= new Date(`${to}T23:59:59`)) : true;
      return fromOk && toOk;
    })
    .filter((student) => {
      let email = '';
      try { const extra = JSON.parse(student.notes || '{}'); email = extra.email || ''; } catch (_) { }
      const name = `${student.first_name} ${student.last_name}`.trim();
      return window.textIncludes(student.public_id, f.id || '')
        && window.textIncludes(name, f.name || '')
        && window.textIncludes(student.national_id, f.nid || '')
        && window.textIncludes(`${student.phone} ${email}`.trim(), f.contact || '')
        && window.textIncludes(String(student.age ?? ''), f.age || '')
        && window.textIncludes(window.formatDate(student.registration_date), f.registered || '');
    })
    .map((student) => `
      <tr data-entity="student" data-id="${student.public_id}">
        <td>${student.public_id}</td>
        <td>${student.first_name} ${student.last_name}</td>
        <td>${student.national_id}</td>
        <td>${student.phone}</td>
        <td>${student.age}</td>
        <td>${window.formatDate(student.registration_date)}</td>
      </tr>
    `)
    .join('');
};

window.renderProfessors = () => {
  const tbody = document.querySelector('#professors-table tbody');
  if (!tbody) {
    console.warn('Professors table tbody not found');
    return;
  }
  
  if (!window.AppState) {
    console.warn('AppState not available for renderProfessors');
    tbody.innerHTML = `<tr><td colspan="6">Loading...</td></tr>`;
    return;
  }
  
  if (!window.AppState.data) {
    console.warn('AppState.data not available for renderProfessors');
    tbody.innerHTML = `<tr><td colspan="6">Loading data...</td></tr>`;
    return;
  }
  
  if (!window.AppState.data.professors) {
    window.AppState.data.professors = [];
  }
  
  if (!window.AppState.data.professors.length) {
    tbody.innerHTML = `<tr><td colspan="6">—</td></tr>`;
    // Ensure header filters after rendering
    if (window.ensureHeaderFilters) {
      setTimeout(() => window.ensureHeaderFilters('professors'), 50);
    }
    return;
  }
  
  const f = window.AppState.filters.columns.professors || {};
  tbody.innerHTML = window.AppState.data.professors
    .filter((prof) => {
      const from = window.AppState.filters.management.dateFrom;
      const to = window.AppState.filters.management.dateTo;
      if (!from && !to) return true;
      const d = window.toDateObj(prof.created_at);
      if (!d) return true;
      const fromOk = from ? (d >= new Date(`${from}T00:00:00`)) : true;
      const toOk = to ? (d <= new Date(`${to}T23:59:59`)) : true;
      return fromOk && toOk;
    })
    .filter((prof) => {
      const name = `${prof.first_name} ${prof.last_name}`.trim();
      const contact = `${prof.email || ''} ${prof.phone || ''}`.trim();
      return window.textIncludes(prof.public_id, f.id || '')
        && window.textIncludes(name, f.name || '')
        && window.textIncludes(contact, f.contact || '')
        && window.textIncludes(prof.education || '', f.education || '')
        && window.textIncludes(window.formatCurrency(prof.base_salary), f.salary || '');
    })
    .map((professor) => `
      <tr data-entity="professor" data-id="${professor.public_id}">
        <td>${professor.public_id}</td>
        <td>${professor.first_name} ${professor.last_name}</td>
        <td>${professor.email}<br>${professor.phone}</td>
        <td>${professor.education || '—'}</td>
        <td>${window.formatCurrency(professor.base_salary)}</td>
        <td><button type="button" data-action="view" data-entity="professor" data-id="${professor.public_id}">Shiko</button></td>
      </tr>
    `)
    .join('');
    
  // Ensure header filters after rendering
  if (window.ensureHeaderFilters) {
    setTimeout(() => window.ensureHeaderFilters('professors'), 50);
  }
};

// Initialize table actions when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    window.bindTableActions();
    // Ensure header filters are initialized after tables are rendered
    setTimeout(() => {
      if (window.ensureHeaderFilters) {
        ['courses', 'classes', 'students', 'professors', 'payments', 'salaries'].forEach(scope => {
          const table = document.querySelector(scope === 'courses' ? '#courses-table' : 
                                                scope === 'classes' ? '#classes-table' : 
                                                scope === 'students' ? '#students-table' : 
                                                scope === 'professors' ? '#professors-table' : 
                                                scope === 'payments' ? '#payments-table' : 
                                                '#salaries-table');
          if (table) {
            window.ensureHeaderFilters(scope);
          }
        });
      }
    }, 300);
  });
} else {
  window.bindTableActions();
  // Ensure header filters after a delay to allow tables to render
  setTimeout(() => {
    if (window.ensureHeaderFilters) {
      ['courses', 'classes', 'students', 'professors', 'payments', 'salaries'].forEach(scope => {
        const table = document.querySelector(scope === 'courses' ? '#courses-table' : 
                                              scope === 'classes' ? '#classes-table' : 
                                              scope === 'students' ? '#students-table' : 
                                              scope === 'professors' ? '#professors-table' : 
                                              scope === 'payments' ? '#payments-table' : 
                                              '#salaries-table');
        if (table) {
          window.ensureHeaderFilters(scope);
        }
      });
    }
  }, 300);
}
