<?php
// Reports Page - Financial reports and analytics
$currentPage = $_GET['page'] ?? 'dashboard';
$isActive = ($currentPage === 'reports');
?>
<section class="section <?php echo $isActive ? 'active' : ''; ?>" data-section="reports" style="<?php echo $isActive ? 'display: block;' : 'display: none;'; ?>">
    <div class="section-header">
        <button type="button" class="sidebar-toggle">
            <i data-lucide="menu"></i>
        </button>
        <div>
            <h2>
                <i data-lucide="bar-chart-3" class="section-icon"></i>
                <span>Raporte & Analiza</span>
            </h2>
            <p class="section-sub">Pasqyrë e detajuar financiare dhe akademike</p>
        </div>
        <div class="section-actions">
            <div class="filter-group" style="flex-direction: row; align-items: center;">
                <select id="reports-range-select" style="padding: 0.5rem; border-radius: 8px; border: 1px solid var(--border);">
                    <option value="this_month">Ky muaj</option>
                    <option value="last_month">Muaji i kaluar</option>
                    <option value="this_year">Ky vit</option>
                    <option value="last_year">Viti i kaluar</option>
                </select>
                <button type="button" class="primary small" id="reports-refresh-btn">
                    <i data-lucide="refresh-cw" style="width: 16px; height: 16px;"></i>
                </button>
            </div>
        </div>
    </div>

    <div class="section-body">
        <!-- Financial Summary Cards -->
        <div class="reports-summary-cards">
            <div class="summary-card" style="background: linear-gradient(135deg, #10b981 0%, #059669 100%);">
                <div class="card-icon">
                    <i data-lucide="trending-up"></i>
                </div>
                <div class="card-content">
                    <div class="card-value" id="report-income">0 €</div>
                    <div class="card-label">Të hyrat (Paguar)</div>
                </div>
            </div>
            <div class="summary-card" style="background: linear-gradient(135deg, #ef4444 0%, #b91c1c 100%);">
                <div class="card-icon">
                    <i data-lucide="trending-down"></i>
                </div>
                <div class="card-content">
                    <div class="card-value" id="report-expenses">0 €</div>
                    <div class="card-label">Shpenzime (Paga)</div>
                </div>
            </div>
            <div class="summary-card" style="background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);">
                <div class="card-icon">
                    <i data-lucide="wallet"></i>
                </div>
                <div class="card-content">
                    <div class="card-value" id="report-profit">0 €</div>
                    <div class="card-label">Fitimi Neto</div>
                </div>
            </div>
            <div class="summary-card" style="background: linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%);">
                <div class="card-icon">
                    <i data-lucide="users"></i>
                </div>
                <div class="card-content">
                    <div class="card-value" id="report-students">0</div>
                    <div class="card-label">Studentë të rinj</div>
                </div>
            </div>
        </div>

        <!-- Charts Section -->
        <div class="reports-charts">
            <div class="chart-card">
                <h4>Performanca Financiare (6 Muajt e fundit)</h4>
                <div style="position: relative; height: 300px; width: 100%;">
                    <canvas id="chart-financial-history"></canvas>
                </div>
            </div>
            <div class="chart-card">
                <h4>Top Kurset (Sipas Të Hyrave)</h4>
                <div style="position: relative; height: 300px; width: 100%;">
                    <canvas id="chart-top-courses"></canvas>
                </div>
            </div>
        </div>

        <!-- Detailed Tables -->
        <div class="reports-grid">
            <div class="card">
                <div class="card-header">
                    <div>
                        <h4><i data-lucide="alert-circle" style="color: var(--danger); width: 20px;"></i> Faturat e vonuara (Top 10)</h4>
                        <p class="text-muted">Pagesat që kërkojnë vëmendje</p>
                    </div>
                    <div class="card-actions">
                         <button type="button" class="secondary small" onclick="exportTableToCSV('reports-overdue-table', 'faturat_vonesa.csv')">
                            <i data-lucide="download"></i> CSV
                        </button>
                    </div>
                </div>
                <div class="table-wrapper compact">
                    <table id="reports-overdue-table">
                        <thead>
                            <tr>
                                <th>Studenti</th>
                                <th>Klasa</th>
                                <th>Muaji</th>
                                <th>Detyrimi</th>
                                <th>Paguar</th>
                                <th>Mbetur</th>
                            </tr>
                        </thead>
                        <tbody>
                            <!-- Populated by JS -->
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    </div>
</section>
