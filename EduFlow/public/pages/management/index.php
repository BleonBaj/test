<?php
// Management Page - Courses, Classes, Students, Professors
$currentPage = $_GET['page'] ?? 'dashboard';
$isActive = ($currentPage === 'management');
?>
<section class="section <?php echo $isActive ? 'active' : ''; ?>" data-section="management" style="<?php echo $isActive ? 'display: block;' : 'display: none;'; ?>">
    <div class="section-header">
        <button type="button" class="sidebar-toggle">
            <i data-lucide="menu"></i>
        </button>
        <div>
            <h2 data-i18n="management-title">
                <i data-lucide="briefcase" class="section-icon"></i>
                <span>Menaxhim</span>
            </h2>
            <p class="section-sub" data-i18n="management-subtitle">Pasqyrë e përgjithshme dhe detajet e klasave.</p>
        </div>
    </div>
    <div class="section-body">
        <div class="stat-grid" id="management-stats"></div>
        
        <!-- Filters will be injected here by setupManagementFilters() -->
        <div class="filters" id="management-filters" style="display: none;"></div>

        <div class="entity-switcher">
            <button type="button" class="entity-tab active" data-entity-switch="course" data-i18n="nav-courses">
                <i data-lucide="graduation-cap" class="entity-icon"></i>
                <span class="entity-label">Kurse</span>
            </button>
            <button type="button" class="entity-tab" data-entity-switch="class" data-i18n="nav-classes">
                <i data-lucide="book-open" class="entity-icon"></i>
                <span class="entity-label">Klasa</span>
            </button>
            <button type="button" class="entity-tab" data-entity-switch="student" data-i18n="nav-students">
                <i data-lucide="users" class="entity-icon"></i>
                <span class="entity-label">Studentë</span>
            </button>
            <button type="button" class="entity-tab" data-entity-switch="professor" data-i18n="nav-professors">
                <i data-lucide="user-check" class="entity-icon"></i>
                <span class="entity-label">Profesorë</span>
            </button>
        </div>

        <!-- Courses Entity -->
        <div class="card entity-section" data-entity="course">
            <div class="card-header">
                <div>
                    <h3 data-i18n="registrations-courses">Lista e kurseve</h3>
                </div>
            </div>
            <div class="table-wrapper">
                <table id="courses-table" data-entity="courses">
                    <thead>
                        <tr>
                            <th data-i18n="table-id">ID</th>
                            <th data-i18n="table-name">Emër</th>
                            <th data-i18n="table-level">Nivel</th>
                            <th data-i18n="table-price">Çmim</th>
                            <th data-i18n="table-updated">Përditësuar</th>
                        </tr>
                    </thead>
                    <tbody></tbody>
                </table>
            </div>
        </div>

        <!-- Classes Entity -->
        <div class="card entity-section" data-entity="class" style="display: none;">
            <div class="card-header">
                <div>
                    <h3 data-i18n="registrations-classes">Lista e klasave</h3>
                </div>
            </div>
            <div class="table-wrapper">
                <table id="classes-table" data-entity="classes">
                    <thead>
                        <tr>
                            <th data-i18n="table-id">ID</th>
                            <th data-i18n="table-name">Emër</th>
                            <th data-i18n="table-course">Kursi</th>
                            <th data-i18n="table-level">Nivel</th>
                            <th data-i18n="table-period">Periudha</th>
                            <th data-i18n="table-price">Çmim</th>
                            <th data-i18n="table-professors">Profesorë</th>
                            <th data-i18n="table-students">Studentë</th>
                        </tr>
                    </thead>
                    <tbody></tbody>
                </table>
            </div>
        </div>

        <!-- Students Entity -->
        <div class="card entity-section" data-entity="student" style="display: none;">
            <div class="card-header">
                <div>
                    <h3 data-i18n="registrations-students">Lista e studentëve</h3>
                </div>
            </div>
            <div class="table-wrapper">
                <table id="students-table" data-entity="students">
                    <thead>
                        <tr>
                            <th data-i18n="table-id">ID</th>
                            <th data-i18n="table-name">Emër</th>
                            <th data-i18n="table-national">NID</th>
                            <th data-i18n="table-contact">Kontakt</th>
                            <th data-i18n="table-age">Mosha</th>
                            <th data-i18n="table-registered">Regjistruar</th>
                        </tr>
                    </thead>
                    <tbody></tbody>
                </table>
            </div>
        </div>

        <!-- Professors Entity -->
        <div class="card entity-section" data-entity="professor" style="display: none;">
            <div class="card-header">
                <div>
                    <h3 data-i18n="registrations-professors">Lista e profesorëve</h3>
                </div>
            </div>
            <div class="table-wrapper">
                <table id="professors-table" data-entity="professors">
                    <thead>
                        <tr>
                            <th data-i18n="table-id">ID</th>
                            <th data-i18n="table-name">Emër</th>
                            <th data-i18n="table-contact">Kontakt</th>
                            <th data-i18n="table-education">Arsimimi</th>
                            <th data-i18n="table-salary">Paga bazë</th>
                            <th data-i18n="table-actions">Veprime</th>
                        </tr>
                    </thead>
                    <tbody></tbody>
                </table>
            </div>
        </div>
    </div>
</section>
