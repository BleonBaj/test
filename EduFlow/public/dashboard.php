<?php
require_once __DIR__ . '/../includes/auth.php';
$admin = require_authenticated_admin_page();

// Get current page/section from URL or default to dashboard
$page = $_GET['page'] ?? 'dashboard';
$validPages = ['dashboard', 'reports', 'management', 'payments', 'salaries', 'settings'];
if (!in_array($page, $validPages)) {
    $page = 'dashboard';
}

require_once __DIR__ . '/../partials/header.php';
require_once __DIR__ . '/../partials/nav.php';
?>
<main class="app-root" id="dashboard" data-page="<?php echo htmlspecialchars($page); ?>">
    <!-- Sub Toolbar - Floating Action Bar (shown for management, payments, salaries) -->
    <div id="sub-toolbar" class="sub-toolbar" style="display: none;">
        <div class="toolbar-group">
            <button type="button" data-tool="add" title="Shto" class="toolbar-btn toolbar-btn-add">
                <i data-lucide="plus" class="toolbar-icon"></i>
                <span class="toolbar-label">Shto</span>
            </button>
            <button type="button" data-tool="edit" title="Ndrysho" class="toolbar-btn toolbar-btn-edit">
                <i data-lucide="edit-3" class="toolbar-icon"></i>
                <span class="toolbar-label">Ndrysho</span>
            </button>
            <button type="button" data-tool="delete" title="Fshij" class="toolbar-btn toolbar-btn-delete">
                <i data-lucide="trash-2" class="toolbar-icon"></i>
                <span class="toolbar-label">Fshij</span>
            </button>
            <button type="button" data-tool="select" title="Zgjidh" class="toolbar-btn toolbar-btn-select">
                <i data-lucide="check-square" class="toolbar-icon"></i>
                <span class="toolbar-label">Zgjidh</span>
            </button>
        </div>
    </div>
    
    <?php
    // Load the requested page
    $pageFile = __DIR__ . '/pages/' . $page . '/index.php';
    if (file_exists($pageFile)) {
        require $pageFile;
    } else {
        // Fallback to dashboard if page file doesn't exist
        $page = 'dashboard';
        require __DIR__ . '/pages/dashboard/index.php';
    }
    ?>
    
    <!-- Chart.js and reports.js will be loaded in footer.php for reports page -->
</main>

<?php require_once __DIR__ . '/../partials/footer.php'; ?>

<!-- Modals - Shared across all pages -->
<?php require_once __DIR__ . '/partials/modals.php'; ?>
