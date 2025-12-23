<?php
/**
 * CSRF Token Endpoint
 * Returns CSRF token without requiring authentication
 * This is needed for login and other public forms
 */
require_once __DIR__ . '/../../includes/session.php';
require_once __DIR__ . '/../../includes/csrf.php';
require_once __DIR__ . '/../../includes/helpers.php';

// Ensure session is started
if (session_status() === PHP_SESSION_NONE) {
    session_start();
}

// Generate and return CSRF token (no authentication required)
$csrfToken = get_csrf_token();

json_response(['csrf_token' => $csrfToken]);

