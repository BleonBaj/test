// Main Application Initializer
// Ties everything together and initializes the app

(function() {
  'use strict';

  // Main initialization function
  window.initApp = () => {
    // Detect page type
    window.detectPage();
    
    // Load language preference
    window.loadLang();
    
    // Load recent invoice metadata
    window.loadRecentInvoiceMeta();
    
    // Apply translations
    window.applyTranslations();
    
    // Bind language toggle
    window.bindLanguageToggle();

    // Initialize Lucide icons
    if (typeof lucide !== 'undefined') {
      lucide.createIcons();
      setTimeout(() => {
        if (typeof lucide !== 'undefined') {
          lucide.createIcons();
        }
      }, 100);
    }

    // Initialize based on page type
    if (window.AppState && window.AppState.page === 'login') {
      // Login page initialization would go here
      // For now, login page handles its own initialization
    } else {
      // Dashboard pages
      // Get current page from URL
      const urlParams = new URLSearchParams(window.location.search);
      const page = urlParams.get('page') || 'dashboard';
      
      // CRITICAL: Activate section FIRST before anything else
      // This ensures the section is visible and has the 'active' class
      // Use activateSection which will check if already active
      if (window.activateSection) {
        window.activateSection(page);
      } else {
        // Fallback: manually activate section if activateSection doesn't exist
        const targetSection = document.querySelector(`[data-section="${page}"]`);
        if (targetSection) {
          document.querySelectorAll('.section').forEach(s => {
            if (s !== targetSection) {
              s.classList.remove('active');
              s.style.display = 'none';
            }
          });
          targetSection.classList.add('active');
          targetSection.setAttribute('style', 'display: block !important; visibility: visible !important;');
        }
      }
      
      // Small delay to ensure DOM is updated
      setTimeout(() => {
        // Bind navigation (for future navigation if switching without reload)
        if (window.bindNav) {
          window.bindNav();
        }
        
        // Bind modal triggers (for buttons with data-open-modal)
        if (window.bindModalTriggers) {
          window.bindModalTriggers();
        }
        
        // Initialize toolbar (will be shown/hidden by activateSection based on section)
        if (window.initToolbar) {
          window.initToolbar();
        }
        
        // Ensure table actions are bound
        if (window.bindTableActions) {
          window.bindTableActions();
        }
        
        // Load initial data - this will trigger renderAll which will initialize page-specific code
        if (window.loadDashboardData) {
          window.loadDashboardData().then(() => {
            // Setup filters after data is loaded
            if (window.setupAllFilters) {
              window.setupAllFilters();
            }
            
            // Small delay to ensure DOM is ready, then render
            setTimeout(() => {
              // Double-check section is active before rendering
              let activeSection = document.querySelector('.section.active');
              if (!activeSection) {
                // If no active section, activate the current page section
                if (window.activateSection) {
                  window.activateSection(page);
                } else {
                  // Manual fallback
                  const targetSection = document.querySelector(`[data-section="${page}"]`);
                  if (targetSection) {
                    document.querySelectorAll('.section').forEach(s => {
                      s.classList.remove('active');
                      s.style.display = 'none';
                    });
                    targetSection.classList.add('active');
                    targetSection.setAttribute('style', 'display: block !important; visibility: visible !important;');
                  }
                }
                activeSection = document.querySelector('.section.active');
              } else {
                // Ensure active section is visible
                activeSection.setAttribute('style', 'display: block !important; visibility: visible !important;');
              }
              
              // Now render all
              if (window.renderAll && activeSection) {
                window.renderAll();
              }
              
              // Ensure header filters are set up after all tables are rendered
              if (window.ensureHeaderFilters) {
                setTimeout(() => {
                  ['courses', 'classes', 'students', 'professors', 'payments', 'salaries'].forEach(scope => {
                    const table = document.querySelector(scope === 'courses' ? '#courses-table' : 
                                                          scope === 'classes' ? '#classes-table' : 
                                                          scope === 'students' ? '#students-table' : 
                                                          scope === 'professors' ? '#professors-table' : 
                                                          scope === 'payments' ? '#payments-table' : 
                                                          '#salaries-table');
                    if (table && table.querySelector('thead tr')) {
                      try {
                        window.ensureHeaderFilters(scope);
                      } catch (e) {
                        console.warn(`Failed to setup header filters for ${scope}:`, e);
                      }
                    }
                  });
                }, 300);
              }
            }, 200);
          }).catch((error) => {
            console.error('Error in loadDashboardData:', error);
          });
        } else {
          // If loadDashboardData is not available, still try to initialize page
          setTimeout(() => {
            // Ensure section is active
            if (window.activateSection) {
              window.activateSection(page);
            } else {
              const targetSection = document.querySelector(`[data-section="${page}"]`);
              if (targetSection) {
                targetSection.classList.add('active');
                targetSection.style.display = 'block';
                targetSection.style.visibility = 'visible';
              }
            }
            if (window.renderAll) {
              window.renderAll();
            }
          }, 200);
        }
      }, 100);
    }
  };

  // Initialize when DOM is ready
  // Note: We don't do immediate activation here anymore to avoid conflicts
  // Sections are already set to active in PHP, and activateSection will be called in initApp
  
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      window.initApp();
    });
  } else {
    window.initApp();
  }

  // Re-render all function (called after data reload)
  window.renderAll = () => {
    if (!window.AppState) {
      console.warn('AppState not available for renderAll');
      return;
    }
    
    // Ensure data object exists
    if (!window.AppState.data) {
      window.AppState.data = {
        courses: [],
        classes: [],
        students: [],
        professors: [],
        invoices: [],
        salaries: [],
        stats: {},
        settings: {}
      };
      console.warn('AppState.data was missing, initialized empty');
      return; // Wait for data to load
    }
    
    if (window.applyTranslations) {
      window.applyTranslations();
    }
    
    // Get current active section - if none, try to find by URL or default to dashboard
    let activeSection = document.querySelector('.section.active');
    if (!activeSection) {
      // Try to get from URL
      const urlParams = new URLSearchParams(window.location.search);
      const page = urlParams.get('page') || 'dashboard';
      // Try to activate the section
      if (window.activateSection) {
        window.activateSection(page);
      }
      // Wait a moment for DOM to update
      setTimeout(() => {
        activeSection = document.querySelector('.section.active');
      }, 10);
      activeSection = document.querySelector('.section.active');
      
      // If still no active section, use dashboard as fallback
      if (!activeSection) {
        const dashboardSection = document.querySelector('[data-section="dashboard"]');
        if (dashboardSection) {
          dashboardSection.classList.add('active');
          dashboardSection.style.display = 'block';
          dashboardSection.style.visibility = 'visible';
          activeSection = dashboardSection;
        }
      }
    }
    
    if (!activeSection) {
      console.warn('No active section found for renderAll, trying to activate dashboard...');
      // Last resort: try to activate dashboard
      const dashboardSection = document.querySelector('[data-section="dashboard"]');
      if (dashboardSection) {
        dashboardSection.classList.add('active');
        dashboardSection.style.display = 'block';
        dashboardSection.style.visibility = 'visible';
        activeSection = dashboardSection;
      } else {
        console.error('Cannot render: no sections found in DOM');
        return;
      }
    }
    
    const sectionName = activeSection.getAttribute('data-section') || 'dashboard';
    
    // Render dashboard if active
    if (sectionName === 'dashboard') {
      // Ensure section is visible first
      const dashboardSection = document.querySelector('[data-section="dashboard"]');
      if (dashboardSection) {
        dashboardSection.classList.add('active');
        // Force visibility with inline styles
        dashboardSection.setAttribute('style', 'display: block !important; visibility: visible !important;');
      }
      
      // Initialize dashboard page
      if (window.initDashboardPage) {
        window.initDashboardPage();
      } else {
        // Fallback: if initDashboardPage doesn't exist, at least ensure section is visible
        console.warn('initDashboardPage not available, ensuring dashboard section is visible');
      }
    }
    
    // Render management page if active
    if (sectionName === 'management' && window.initManagementPage) {
      // Reset initialization flag to allow re-initialization
      const managementSection = document.querySelector('[data-section="management"]');
      if (managementSection) {
        delete managementSection.dataset.initialized;
      }
      window.initManagementPage();
    }
    
    // Render payments page if active
    if (sectionName === 'payments') {
      // Reset initialization flag to allow re-initialization
      const paymentsSection = document.querySelector('[data-section="payments"]');
      if (paymentsSection) {
        delete paymentsSection.dataset.initialized;
      }
      if (window.initPaymentsPage) {
        window.initPaymentsPage();
      } else if (window.renderPayments) {
        window.renderPayments();
      }
    }
    
    // Render salaries page if active
    if (sectionName === 'salaries') {
      // Reset initialization flag to allow re-initialization
      const salariesSection = document.querySelector('[data-section="salaries"]');
      if (salariesSection) {
        delete salariesSection.dataset.initialized;
      }
      if (window.initSalariesPage) {
        window.initSalariesPage();
      } else if (window.renderSalaries) {
        window.renderSalaries();
      }
    }
    
    // Render settings page if active
    if (sectionName === 'settings' && window.initSettingsPage) {
      window.initSettingsPage();
    }
    
    // Render reports page if active (reports.js handles its own initialization via observer)
    // The reports.js in assets/js/ will auto-initialize when section becomes active
    
    // Ensure header filters are set up for all tables after rendering
    setTimeout(() => {
      if (window.ensureHeaderFilters && window.AppState && window.AppState.data) {
        ['courses', 'classes', 'students', 'professors', 'payments', 'salaries'].forEach(scope => {
          try {
            const table = document.querySelector(scope === 'courses' ? '#courses-table' : 
                                                  scope === 'classes' ? '#classes-table' : 
                                                  scope === 'students' ? '#students-table' : 
                                                  scope === 'professors' ? '#professors-table' : 
                                                  scope === 'payments' ? '#payments-table' : 
                                                  '#salaries-table');
            if (table && table.querySelector('thead tr')) {
              window.ensureHeaderFilters(scope);
            }
          } catch (e) {
            console.warn(`Failed to setup header filters for ${scope}:`, e);
          }
        });
      }
    }, 200);
  };
})();
