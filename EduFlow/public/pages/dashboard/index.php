<?php
// Dashboard Page - Main overview page
$currentPage = $_GET['page'] ?? 'dashboard';
$isActive = ($currentPage === 'dashboard');
?>
<section class="section <?php echo $isActive ? 'active' : ''; ?>" data-section="dashboard"<?php echo $isActive ? ' style="display: block !important; visibility: visible !important;"' : ' style="display: none;"'; ?>>
    <div class="section-header">
        <button type="button" class="sidebar-toggle" id="sidebar-toggle">
            <i data-lucide="menu"></i>
        </button>
        <div>
            <h2 data-i18n="dashboard-title">
                <i data-lucide="layout-dashboard" class="section-icon"></i>
                <span>Dashboard</span>
            </h2>
            <p class="section-sub" data-i18n="dashboard-subtitle">Pasqyrë e përgjithshme e sistemit</p>
        </div>
    </div>
    <div class="section-body">
        <div class="dashboard-stats-grid" id="dashboard-stats">
            <!-- Stats will be loaded here -->
        </div>

        <div class="dashboard-charts-grid" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(400px, 1fr)); gap: 1.5rem; margin-bottom: 2rem;">
            <div class="card" style="padding: 1.5rem; height: 350px;">
                <h4 style="margin: 0 0 1rem 0; font-size: 1.1rem; color: var(--text);">Studentë sipas Kurseve</h4>
                <div style="position: relative; height: 100%; width: 100%;">
                    <canvas id="chart-students-course"></canvas>
                </div>
            </div>
            <div class="card" style="padding: 1.5rem; height: 350px;">
                <h4 style="margin: 0 0 1rem 0; font-size: 1.1rem; color: var(--text);">Regjistrimet mujore</h4>
                <div style="position: relative; height: 100%; width: 100%;">
                    <canvas id="chart-monthly-registrations"></canvas>
                </div>
            </div>
        </div>

        <div class="dashboard-quick-actions">
            <h3 data-i18n="dashboard-quick-actions">Veprime të shpejta</h3>
            <div class="quick-actions-grid">
                <button type="button" class="quick-action-card" data-quick-action="course">
                    <span class="action-icon"><i data-lucide="graduation-cap"></i></span>
                    <span class="action-label" data-i18n="dashboard-add-course">Shto Kurs</span>
                </button>
                <button type="button" class="quick-action-card" data-quick-action="class">
                    <span class="action-icon"><i data-lucide="book-open"></i></span>
                    <span class="action-label" data-i18n="dashboard-add-class">Shto Klasë</span>
                </button>
                <button type="button" class="quick-action-card" data-quick-action="student">
                    <span class="action-icon"><i data-lucide="user-plus"></i></span>
                    <span class="action-label" data-i18n="dashboard-add-student">Shto Student</span>
                </button>
                <button type="button" class="quick-action-card" data-quick-action="professor">
                    <span class="action-icon"><i data-lucide="user-check"></i></span>
                    <span class="action-label" data-i18n="dashboard-add-professor">Shto Profesor</span>
                </button>
                <button type="button" class="quick-action-card" data-quick-action="invoice">
                    <span class="action-icon"><i data-lucide="file-text"></i></span>
                    <span class="action-label" data-i18n="dashboard-add-invoice">Shto Faturë</span>
                </button>
                <button type="button" class="quick-action-card" data-quick-action="salary">
                    <span class="action-icon"><i data-lucide="briefcase"></i></span>
                    <span class="action-label" data-i18n="dashboard-add-salary">Shto Pagë</span>
                </button>
            </div>
        </div>

        <div class="dashboard-recent-activity">
            <h3 data-i18n="dashboard-recent-activity">Aktiviteti i fundit</h3>
            <div id="recent-activity-list">
                <!-- Recent activity will be loaded here -->
            </div>
        </div>
    </div>
</section>
