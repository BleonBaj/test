<?php

if (session_status() === PHP_SESSION_NONE) {
    // Ensure a writable session save path (fallback to project storage)
    $defaultSavePath = ini_get('session.save_path');
    if (!$defaultSavePath || !is_dir($defaultSavePath) || !is_writable($defaultSavePath)) {
        $projectSavePath = __DIR__ . '/../storage/sessions';
        if (!is_dir($projectSavePath)) {
            @mkdir($projectSavePath, 0777, true);
        }
        if (is_dir($projectSavePath) && is_writable($projectSavePath)) {
            @session_save_path($projectSavePath);
        }
    }

    // Use a custom session name to avoid collisions
    @session_name('BTSSESSID');

    // Set safe cookie params explicitly
    $secure = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off') || (isset($_SERVER['SERVER_PORT']) && (int)$_SERVER['SERVER_PORT'] === 443);
    $cookieParams = session_get_cookie_params();
    @session_set_cookie_params([
        'lifetime' => 0,
        'path' => '/',
        'domain' => $cookieParams['domain'] ?? '',
        'secure' => $secure,
        'httponly' => true,
        'samesite' => 'Lax',
    ]);

    session_start();
}
