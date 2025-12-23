<?php
// Salaries Page - Professor salary statements
$currentPage = $_GET['page'] ?? 'dashboard';
$isActive = ($currentPage === 'salaries');
?>
<section class="section <?php echo $isActive ? 'active' : ''; ?>" data-section="salaries" style="<?php echo $isActive ? 'display: block;' : 'display: none;'; ?>">
    <div class="section-header">
        <button type="button" class="sidebar-toggle">
            <i data-lucide="menu"></i>
        </button>
        <div>
            <h2 data-i18n="salaries-title">
                <i data-lucide="wallet" class="section-icon"></i>
                <span>Paga profesorëve</span>
            </h2>
            <p class="section-sub" data-i18n="salaries-subtitle">Avancat, borxhet dhe bilanci mujore për profesorët.</p>
        </div>
    </div>
    <div class="section-body">
        <div class="filters" id="salary-filters"></div>
        <div class="card">
            <div class="card-header">
                <h3 data-i18n="salaries-list-title">Lista e pagave</h3>
            </div>
            <div class="table-wrapper">
                <table id="salaries-table" data-entity="salaries">
                    <thead>
                        <tr>
                            <th data-i18n="table-id">ID</th>
                            <th data-i18n="table-professor">Profesori</th>
                            <th data-i18n="table-class">Klasa</th>
                            <th data-i18n="table-month">Muaji</th>
                            <th>Paga</th>
                            <th data-i18n="table-advances">Avanca</th>
                            <th data-i18n="table-status">Statusi</th>
                            <th data-i18n="table-receipt">Faturë</th>
                        </tr>
                    </thead>
                    <tbody></tbody>
                </table>
            </div>
        </div>
    </div>
</section>
