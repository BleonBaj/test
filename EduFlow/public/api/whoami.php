<?php
require_once __DIR__ . '/../../includes/auth.php';
require_once __DIR__ . '/../../includes/helpers.php';
require_once __DIR__ . '/../../includes/csrf.php';

if (!isset($_SESSION['admin_id'])) {
    http_response_code(401);
    exit;
}

$pdo = get_db_connection();
$stmt = $pdo->prepare('SELECT id, public_id, name, email, last_login_at FROM admins WHERE id = :id LIMIT 1');
$stmt->execute(['id' => $_SESSION['admin_id']]);
$admin = $stmt->fetch();

if (!$admin) {
    http_response_code(401);
    exit;
}

// Include CSRF token for frontend
$csrfToken = get_csrf_token();

json_response(['authenticated' => true, 'admin' => $admin, 'csrf_token' => $csrfToken]);