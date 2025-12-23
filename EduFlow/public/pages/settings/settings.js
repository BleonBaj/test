// Settings Page JavaScript
// Handles application settings and PIN management

(function() {
  'use strict';

  // Render settings form
  window.renderSettings = () => {
    const settingsForm = document.querySelector('#settings-main');
    if (!settingsForm || settingsForm.dataset.bound) return;
    
    settingsForm.dataset.bound = 'true';
    
    // Ensure AppState is available
    if (!window.AppState || !window.AppState.data) {
      console.warn('AppState not available for settings');
      return;
    }
    
    const settings = window.AppState.data.settings || {};
    const biz = settings.business || {};

    // Populate form fields
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

    // Handle form submission
    settingsForm.addEventListener('submit', async (event) => {
      event.preventDefault();
      const formData = new FormData(settingsForm);

      try {
        const businessKeys = ['company_name', 'company_address', 'company_phone', 'company_email', 'company_tax_id', 'company_logo_url'];
        await Promise.all(
          businessKeys.map((key) =>
            window.apiFetch('api/settings.php', {
              method: 'POST',
              body: { group: 'business', key, value: formData.get(key), pin: '' },
            })
          )
        );

        window.showToast('success', 'toast-saved');
        if (window.loadDashboardData) {
          await window.loadDashboardData();
        }
      } catch (error) {
        console.error(error);
        window.showToast('error', error?.error ?? 'toast-error');
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
          window.showToast('error', 'Zgjidh një skedar logoje.');
          return;
        }
        const fd = new FormData();
        fd.append('file', file);
        fd.append('pin', '');
        uploadBtn.disabled = true;
        try {
          const res = await window.apiFetch('api/upload.php', { method: 'POST', body: fd });
          const url = res?.url;
          if (urlInput && url) urlInput.value = url;
          if (fileInput) fileInput.value = '';
          window.showToast('success', 'toast-saved');
        } catch (err) {
          console.error(err);
          window.showToast('error', err?.error ?? 'toast-error');
        } finally {
          uploadBtn.disabled = false;
        }
      });
    }

    // Bind PIN Management button
    const pinManagementBtn = document.getElementById('btn-open-pin-management');
    if (pinManagementBtn && !pinManagementBtn.dataset.bound) {
      pinManagementBtn.dataset.bound = 'true';
      pinManagementBtn.addEventListener('click', () => {
        if (window.openPinVerifyModal) {
          window.openPinVerifyModal();
        }
      });
    }

    // Load signup requests
    loadSignupRequests();
  };

  // Load and display signup requests
  const loadSignupRequests = async () => {
    const tableBody = document.querySelector('#signup-requests-table tbody');
    if (!tableBody) return;
    
    try {
      const res = await window.apiFetch('api/settings.php?action=list_requests&pin=' + encodeURIComponent((window.AppState && window.AppState.settingsPin) || ''));
      const requests = res.requests || [];
      if (requests.length === 0) {
        tableBody.innerHTML = '<tr><td colspan="4" class="no-data">Nuk ka kërkesa në pritje</td></tr>';
        return;
      }
      
      tableBody.innerHTML = requests.map(req => `
        <tr>
          <td>${req.username}</td>
          <td>${req.email}</td>
          <td>${window.formatDate(req.created_at)}</td>
          <td>
            <button type="button" class="small primary" data-request-action="accept" data-id="${req.public_id}">Accept</button>
            <button type="button" class="small danger" data-request-action="ignore" data-id="${req.public_id}">Ignore</button>
          </td>
        </tr>
      `).join('');
      
      // Bind actions
      tableBody.querySelectorAll('button[data-request-action]').forEach(btn => {
        btn.addEventListener('click', async () => {
          const action = btn.dataset.requestAction;
          const id = btn.dataset.id;
          if (!confirm(action === 'accept' ? 'Aprovoni këtë përdorues?' : 'Refuzoni këtë kërkesë?')) return;
          
          try {
            btn.disabled = true;
            await window.apiFetch('api/settings.php', {
              method: 'POST',
              body: { 
                action: 'handle_request', 
                request_id: id, 
                decision: action,
                pin: (window.AppState && window.AppState.settingsPin) || ''
              }
            });
            window.showToast('success', 'Veprimi u krye me sukses');
            loadSignupRequests();
          } catch (err) {
            window.showToast('error', err.message || 'Gabim');
            btn.disabled = false;
          }
        });
      });
    } catch (err) {
      console.error(err);
      tableBody.innerHTML = '<tr><td colspan="4" class="no-data">Gabim gjatë ngarkimit</td></tr>';
    }
  };

  // Initialize settings page
  window.initSettingsPage = () => {
    if (!window.AppState) {
      console.warn('AppState not available yet, retrying initialization...');
      setTimeout(() => window.initSettingsPage(), 200);
      return;
    }
    window.renderSettings();
  };

  // Auto-initialize when settings section exists (it will be active if it's the loaded page)
  const checkAndInit = () => {
    const settingsSection = document.querySelector('[data-section="settings"]');
    if (settingsSection) {
      // Wait for AppState to be available
      const waitForData = () => {
        if (window.AppState && window.AppState.data) {
          // Data is loaded, initialize
          window.initSettingsPage();
        } else {
          // Retry after a short delay
          setTimeout(waitForData, 200);
        }
      };
      waitForData();
    }
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', checkAndInit);
  } else {
    checkAndInit();
  }

  // Re-render when section becomes active
  const observer = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
      if (mutation.type === 'attributes' && mutation.attributeName === 'class') {
        const target = mutation.target;
        if (target.classList.contains('active') && target.dataset.section === 'settings') {
          window.renderSettings();
        }
      }
    });
  });

  const settingsSection = document.querySelector('[data-section="settings"]');
  if (settingsSection) {
    observer.observe(settingsSection, { attributes: true });
  }
})();
