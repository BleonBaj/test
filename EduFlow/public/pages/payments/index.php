<?php
// Payments Page - Student invoices and payments
$currentPage = $_GET['page'] ?? 'dashboard';
$isActive = ($currentPage === 'payments');
?>
<section class="section <?php echo $isActive ? 'active' : ''; ?>" data-section="payments" style="<?php echo $isActive ? 'display: block;' : 'display: none;'; ?>">
    <div class="section-header">
        <button type="button" class="sidebar-toggle">
            <i data-lucide="menu"></i>
        </button>
        <div>
            <h2 data-i18n="payments-title">Pagesa mujore</h2>
            <p class="section-sub" data-i18n="payments-subtitle">Monitoro faturat e studentëve dhe statuset mujore.</p>
        </div>
    </div>
    <div class="filters" id="payment-filters"></div>
    <div class="card">
        <div class="table-wrapper">
            <table id="payments-table" data-entity="payments">
                <thead>
                    <tr>
                        <th data-i18n="table-id">ID</th>
                        <th data-i18n="table-student">Studenti</th>
                        <th data-i18n="table-class">Klasa</th>
                        <th data-i18n="table-month">Muaji</th>
                        <th data-i18n="label-due">Detyrimi</th>
                        <th data-i18n="label-paid">Paguar</th>
                        <th data-i18n="table-status">Statusi</th>
                        <th data-i18n="table-confirmed">Konfirmuar</th>
                        <th data-i18n="table-receipt">Faturë</th>
                    </tr>
                </thead>
                <tbody></tbody>
            </table>
        </div>
    </div>
</section>
