<?php
// Permission access page - accessed via email link with token
require_once __DIR__ . '/../includes/session.php';
require_once __DIR__ . '/../includes/permissions.php';
require_once __DIR__ . '/../includes/auth.php';

$token = $_GET['token'] ?? '';

if (empty($token)) {
    die('Invalid access. Token required.');
}

// Verify token
$tokenData = verify_permission_access_token($token);

if (!$tokenData) {
    die('Invalid or expired token. Please request a new access link.');
}

// Check if user is logged in
if (!isset($_SESSION['admin_id'])) {
    // Redirect to login first
    header('Location: index.php?redirect=' . urlencode($_SERVER['REQUEST_URI']));
    exit;
}

// Verify token belongs to logged-in admin
if ((int) $tokenData['admin_id'] !== (int) $_SESSION['admin_id']) {
    die('Token does not match your account.');
}

// Mark token as used and grant access
mark_permission_token_used($token);
$_SESSION['permissions_access_granted'] = true;
$_SESSION['permissions_access_expires'] = time() + (30 * 60); // 30 minutes

// Redirect to dashboard settings
header('Location: dashboard.php#settings');
exit;

