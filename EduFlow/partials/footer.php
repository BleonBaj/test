<?php
// Determine current page for loading page-specific assets
$currentPage = $_GET['page'] ?? (isset($_SERVER['REQUEST_URI']) && strpos($_SERVER['REQUEST_URI'], 'dashboard') !== false ? 'dashboard' : 'login');
$validPages = ['dashboard', 'reports', 'management', 'payments', 'salaries', 'settings'];
if (!in_array($currentPage, $validPages)) {
    $currentPage = 'dashboard';
}
?>

<!-- Shared JavaScript Modules (load in order - dependencies matter) -->
<script src="assets/shared/state.js?v=<?= time() ?>"></script>
<script src="assets/shared/i18n.js?v=<?= time() ?>"></script>
<script src="assets/shared/common.js?v=<?= time() ?>"></script>
<script src="assets/shared/modals.js?v=<?= time() ?>"></script>
<script src="assets/shared/forms.js?v=<?= time() ?>"></script>
<script src="assets/shared/tables.js?v=<?= time() ?>"></script>
<script src="assets/shared/toolbar.js?v=<?= time() ?>"></script>
<script src="assets/shared/filters.js?v=<?= time() ?>"></script>
<script src="assets/shared/table-filters.js?v=<?= time() ?>"></script>

<!-- Main App Initializer -->
<script src="assets/shared/app.js?v=<?= time() ?>"></script>

<!-- Page-specific JavaScript -->
<?php if ($currentPage !== 'login'): ?>
  <?php if (file_exists(__DIR__ . '/../public/pages/' . $currentPage . '/' . $currentPage . '.js')): ?>
    <script src="pages/<?php echo htmlspecialchars($currentPage); ?>/<?php echo htmlspecialchars($currentPage); ?>.js?v=<?= time() ?>"></script>
  <?php endif; ?>
  <!-- Chart.js is needed for dashboard charts and reports -->
  <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
  
  <?php if ($currentPage === 'reports'): ?>
    <script src="assets/js/reports.js?v=<?= time() ?>"></script>
  <?php endif; ?>
<?php endif; ?>

<!-- Legacy app.js - DISABLED to prevent conflicts with new modular structure -->
<!-- The old app.js is still in the codebase but not loaded to avoid conflicts -->
<!-- TODO: Once all functionality is fully migrated, we can remove the old app.js file -->
<!-- <script src="assets/js/app.js?v=<?= time() ?>" defer></script> -->
</body>
</html>