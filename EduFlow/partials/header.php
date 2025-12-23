<?php
require_once __DIR__ . '/../includes/session.php';
$config = require __DIR__ . '/../config/config.php';
$lang = $config['app']['default_language'] ?? 'sq';
$basePath = rtrim(dirname($_SERVER['SCRIPT_NAME'] ?? '/'), '/\\') . '/';
// Apply Content Security Policy via HTTP headers (meta can't set frame-ancestors)
if (!headers_sent()) {
  $csp = "default-src 'self'; script-src 'self' 'unsafe-inline' https://unpkg.com https://cdn.jsdelivr.net; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob: https://*.googleusercontent.com; connect-src 'self' https://unpkg.com https://cdn.jsdelivr.net; base-uri 'self'; frame-ancestors 'none'; object-src 'none'";
  header('Content-Security-Policy: ' . $csp);
  // For legacy browsers
  header('X-Frame-Options: DENY');
}
?>
<!doctype html>
<html lang="<?php echo htmlspecialchars($lang); ?>">

<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="app-base" content="<?php echo htmlspecialchars($basePath); ?>">
  <title><?php echo htmlspecialchars($config['app']['name'] ?? 'BTS'); ?></title>
  
  <!-- Base CSS - Common styles and components -->
  <link rel="stylesheet" href="assets/css/style.css">
  
  <?php
  // Load page-specific CSS
  $currentPage = $_GET['page'] ?? 'dashboard';
  $validPages = ['dashboard', 'reports', 'management', 'payments', 'salaries', 'settings'];
  if (in_array($currentPage, $validPages) && file_exists(__DIR__ . '/../public/assets/css/pages/' . $currentPage . '.css')): ?>
    <link rel="stylesheet" href="assets/css/pages/<?php echo htmlspecialchars($currentPage); ?>.css?v=<?= time() ?>">
  <?php endif; ?>
  
  <!-- Lucide Icons - Professional Icon Library -->
  <script src="https://unpkg.com/lucide@latest"></script>
</head>

<body>