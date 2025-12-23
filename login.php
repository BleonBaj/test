<?php
/**
 * Login Page - Root Entry Point
 * This file is accessible from the root directory for hosting on Hostinger
 * It redirects authenticated users to dashboard, otherwise shows login page
 */

// Start session first
require_once __DIR__ . '/includes/session.php';

// If already authenticated, redirect to dashboard
if (isset($_SESSION['admin_id'])) {
    header('Location: public/dashboard.php');
    exit;
}

// Otherwise, redirect to login page in public directory
header('Location: public/index.php');
exit;


