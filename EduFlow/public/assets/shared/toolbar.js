// Toolbar Module
// Handles the floating sub-toolbar (Add, Edit, Delete, Select)

(function() {
  'use strict';

  // Selection state for bulk operations
  const selectionState = {
    enabled: false,
    entity: null,
    setEnabled(flag) { 
      this.enabled = flag; 
      updateTableSelectionUI(); 
      updateSelectToolUI(); 
    },
    toggle() { 
      this.setEnabled(!this.enabled); 
    },
    clear() {
      // Uncheck all checkboxes
      document.querySelectorAll('.row-select:checked').forEach(cb => cb.checked = false);
      // Disable selection mode
      this.setEnabled(false);
      // Update UI
      updateTableSelectionUI();
      updateSelectToolUI();
    },
  };

  // Export to window for other modules
  window.toolbarSelection = selectionState;

  const updateSelectToolUI = () => {
    const bar = document.querySelector('#sub-toolbar');
    if (!bar) return;
    const btn = bar.querySelector('button[data-tool="select"]');
    if (!btn) return;
    btn.classList.toggle('active', selectionState.enabled);
    const labelSpan = btn.querySelector('.toolbar-label');
    if (labelSpan) {
      labelSpan.textContent = selectionState.enabled ? 'Selecting… (Ctrl‑click to multi, dbl‑click to view)' : 'Zgjidh';
    }
    btn.title = selectionState.enabled ? 'Selecting… Click again to exit' : 'Zgjidh';
  };

  const updateTableSelectionUI = () => {
    // Remove existing selection columns/cells
    document.querySelectorAll('table [data-select-col]').forEach((th) => th.remove());
    document.querySelectorAll('table [data-select-cell]').forEach((td) => td.remove());
    
    if (!selectionState.enabled) return;
    
    const activeSection = document.querySelector('.section.active');
    if (!activeSection) return;
    
    // Find the currently visible entity section in management
    let targetTable = null;
    if (activeSection.getAttribute('data-section') === 'management') {
      const visibleEntity = activeSection.querySelector('.entity-section[style*="display: block"], .entity-section:not([style*="display: none"])');
      if (visibleEntity) {
        targetTable = visibleEntity.querySelector('table');
      }
    } else {
      // For payments/salaries, use the main table
      targetTable = activeSection.querySelector('table');
    }
    
    if (!targetTable) return;
    
    // Add selection column header
    const theadRow = targetTable.querySelector('thead tr');
    if (theadRow && !theadRow.querySelector('[data-select-col]')) {
      const th = document.createElement('th');
      th.setAttribute('data-select-col', '');
      th.textContent = '#';
      th.style.width = '40px';
      th.style.textAlign = 'center';
      theadRow.insertBefore(th, theadRow.firstElementChild);
    }
    
    // Add checkboxes to rows
    targetTable.querySelectorAll('tbody tr').forEach((tr) => {
      if (tr.querySelector('[data-select-cell]')) return; // Already has checkbox
      
      const td = document.createElement('td');
      td.setAttribute('data-select-cell', '');
      td.style.textAlign = 'center';
        const cb = document.createElement('input');
        cb.type = 'checkbox';
        cb.className = 'row-select';
        // Get ID from data-id attribute (should be on tr) or first td content
        let rowId = tr.getAttribute('data-id');
        if (!rowId && tr.querySelector('td')) {
          // Try first cell that doesn't have checkbox
          const firstCell = tr.querySelector('td:not([data-select-cell])');
          if (firstCell) {
            rowId = firstCell.textContent.trim();
          }
        }
        cb.dataset.id = rowId || '';
        
        // Bind checkbox click to toggle selection (prevent event bubbling)
        cb.addEventListener('click', (e) => {
          e.stopPropagation();
          // Update UI after checkbox state changes
          setTimeout(() => {
            updateSelectToolUI();
          }, 10);
        });
        
        td.appendChild(cb);
        tr.insertBefore(td, tr.firstElementChild);
      });
  };
  
  // Export updateTableSelectionUI to window for external calls
  window.updateTableSelectionUI = updateTableSelectionUI;

  const getSelectedIds = (entity) => {
    return Array.from(document.querySelectorAll('.row-select:checked')).map((cb) => cb.dataset.id).filter(Boolean);
  };

  // Initialize toolbar and bind actions
  window.initToolbar = () => {
    const bar = document.querySelector('#sub-toolbar');
    if (!bar) {
      console.warn('Sub-toolbar element not found');
      return;
    }
    
    // Skip if already bound (prevent duplicate event listeners)
    if (bar.dataset.bound === 'true') {
      return;
    }
    
    bar.dataset.bound = 'true';

    // Initialize Lucide icons
    if (typeof lucide !== 'undefined') {
      setTimeout(() => lucide.createIcons(), 50);
    }

    bar.addEventListener('click', async (e) => {
      const btn = e.target.closest('button[data-tool]');
      if (!btn) return;
      const tool = btn.getAttribute('data-tool');
      const activeSection = document.querySelector('.section.active');
      const sectionKey = activeSection?.getAttribute('data-section');

      // Infer entity based on visible/open panel
      let entity = null;
      if (sectionKey === 'management') {
        // First check active entity tab
        const activeTab = activeSection.querySelector('.entity-tab.active');
        if (activeTab) {
          const entitySwitch = activeTab.getAttribute('data-entity-switch');
          entity = entitySwitch || 'course';
        } else {
          // Fallback: find visible entity section (card-based structure)
          const entitySections = activeSection.querySelectorAll('.entity-section');
          for (const section of entitySections) {
            const style = window.getComputedStyle(section);
            if (style.display !== 'none' && (section.style.display === 'block' || section.style.display === '')) {
              entity = section.getAttribute('data-entity');
              break;
            }
          }
          entity = entity || 'course';
        }
      } else if (sectionKey === 'payments') {
        entity = 'invoice';
      } else if (sectionKey === 'salaries') {
        entity = 'salary';
      }

      selectionState.entity = entity;

      if (tool === 'select') {
        selectionState.toggle();
        // Update UI immediately after toggle
        setTimeout(() => {
          updateTableSelectionUI();
          updateSelectToolUI();
          // Re-initialize Lucide icons for new checkboxes
          if (typeof lucide !== 'undefined') {
            lucide.createIcons();
          }
        }, 50);
        return;
      }

      if (tool === 'add') {
        const modalId = entity;
        if (window.openModal) {
          window.openModal(modalId, 'create');
        }
        return;
      }

      const selected = getSelectedIds(entity);
      if (tool === 'edit') {
        if (selected.length !== 1) {
          if (window.showToast) {
            window.showToast('error', 'Vetëm një rresht duhet selektuar për editim.');
          }
          return;
        }
        if (window.handleEdit) {
          window.handleEdit(entity, selected[0]);
        }
        return;
      }

      if (tool === 'delete') {
        if (selected.length === 0) {
          if (window.showToast) {
            window.showToast('error', 'Asnjë rresht i selektuar.');
          }
          return;
        }

        const confirmMsg = (window.t && window.t('confirm-delete')) || 'A jeni i sigurt që doni të fshini këtë element?';
        if (!confirm(confirmMsg)) {
          return;
        }
        
        const mode = 'delete';
        let pin = null;

        // Check if PIN is required for delete
        if (window.isPinRequiredForAction) {
          const pinRequired = await window.isPinRequiredForAction(entity, mode);
          if (pinRequired) {
            try {
              if (window.requestPinForAction) {
                pin = await window.requestPinForAction();
              }
            } catch (error) {
              if (error.message === 'PIN request cancelled') {
                return;
              }
              if (window.showToast) {
                window.showToast('error', 'Gabim në verifikimin e PIN-it');
              }
              return;
            }
          }
        }

        try {
          for (const id of selected) {
            if (window.handleDelete) {
              await window.handleDelete(entity, id, pin);
            }
          }
          if (window.showToast) {
            window.showToast('success', 'toast-deleted');
          }
          if (window.loadDashboardData) {
            await window.loadDashboardData();
          }
          // Clear selection after successful delete
          selectionState.clear();
        } catch (err) {
          console.error(err);
          if (window.showToast) {
            window.showToast('error', err?.error ?? 'toast-error');
          }
          // If deletion failed due to dependencies, clear selection and disable selection mode
          if (err?.error === 'cannot_delete') {
            selectionState.clear();
          }
        }
        return;
      }
    });
  };

  // Export functions to window for external access
  window.getSelectedIds = getSelectedIds;
  window.updateSelectToolUI = updateSelectToolUI;
  
  // Initialize when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', window.initToolbar);
  } else {
    setTimeout(() => window.initToolbar(), 100);
  }
})();
