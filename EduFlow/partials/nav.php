<?php
$sections = [
    'dashboard' => ['sq' => 'Dashboard', 'en' => 'Dashboard', 'icon' => 'layout-dashboard'],
    'management' => ['sq' => 'Menaxhim', 'en' => 'Management', 'icon' => 'briefcase'],
    'reports' => ['sq' => 'Raporte', 'en' => 'Reports', 'icon' => 'bar-chart-3'],
    'payments' => ['sq' => 'Pagesa', 'en' => 'Payments', 'icon' => 'receipt'],
    'salaries' => ['sq' => 'Paga', 'en' => 'Salaries', 'icon' => 'wallet'],
    'settings' => ['sq' => 'Cilësime', 'en' => 'Settings', 'icon' => 'settings'],
];
$adminName = $_SESSION['admin_name'] ?? 'Administrator';
?>
<aside class="sidebar">
    <div class="sidebar-brand">
        <div class="brand-logo">BTS</div>
        <div class="brand-meta">
            <div class="brand-name">BTS</div>
            <small>Menaxhimi i kursit</small>
        </div>
    </div>

    <div class="sidebar-user">
        <i data-lucide="user-circle"></i>
        <div>
            <div class="user-name"><?php echo sanitize_string($adminName); ?></div>
            <small>Administrator</small>
        </div>
    </div>

    <nav class="sidebar-nav">
        <?php foreach ($sections as $key => $labels): ?>
            <a href="dashboard.php?page=<?php echo $key; ?>"
                class="nav-btn <?php echo ($page ?? 'dashboard') === $key ? 'active' : ''; ?>"
                data-section="<?php echo $key; ?>"
                data-i18n="nav-<?php echo $key; ?>">
                <i data-lucide="<?php echo $labels['icon']; ?>"></i>
                <span><?php echo sanitize_string($labels[$lang] ?? $labels['sq']); ?></span>
            </a>
        <?php endforeach; ?>
    </nav>

    <div class="sidebar-actions">
        <button type="button" id="lang-toggle" class="ghost">
            <i data-lucide="globe"></i>
            <span data-i18n="action-language">Shqip</span>
        </button>
        <button type="button" id="global-refresh" class="ghost" title="Refresh">
            <i data-lucide="refresh-cw"></i>
            <span data-i18n="action-refresh">Rifresko</span>
        </button>
        <form id="logout-form" method="post" action="api/auth.php" class="logout-form">
            <input type="hidden" name="action" value="logout">
            <button type="submit" class="danger block" data-i18n="action-logout">
                <i data-lucide="log-out"></i>
                <span>Dalje</span>
            </button>
        </form>
    </div>
</aside>