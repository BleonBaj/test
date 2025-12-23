<?php
/**
 * CSRF Protection System
 * 
 * This file provides CSRF token generation and validation
 * to protect against Cross-Site Request Forgery attacks.
 */

/**
 * Generate a CSRF token and store it in session
 * 
 * @return string The CSRF token
 */
function generate_csrf_token(): string
{
    if (session_status() === PHP_SESSION_NONE) {
        session_start();
    }
    
    // Generate a new token if one doesn't exist or if it's expired
    if (!isset($_SESSION['_csrf_token']) || !isset($_SESSION['_csrf_token_expires']) || $_SESSION['_csrf_token_expires'] < time()) {
        $_SESSION['_csrf_token'] = bin2hex(random_bytes(32));
        $_SESSION['_csrf_token_expires'] = time() + 3600; // Token valid for 1 hour
    }
    
    return $_SESSION['_csrf_token'];
}

/**
 * Get the current CSRF token
 * 
 * @return string The CSRF token
 */
function get_csrf_token(): string
{
    return generate_csrf_token();
}

/**
 * Validate a CSRF token
 * 
 * @param string $token The token to validate
 * @return bool True if token is valid, false otherwise
 */
function validate_csrf_token(string $token): bool
{
    if (session_status() === PHP_SESSION_NONE) {
        session_start();
    }
    
    // Check if token exists in session
    if (!isset($_SESSION['_csrf_token'])) {
        return false;
    }
    
    // Check if token is expired
    if (isset($_SESSION['_csrf_token_expires']) && $_SESSION['_csrf_token_expires'] < time()) {
        unset($_SESSION['_csrf_token'], $_SESSION['_csrf_token_expires']);
        return false;
    }
    
    // Validate token using constant-time comparison to prevent timing attacks
    return hash_equals($_SESSION['_csrf_token'], $token);
}

/**
 * Require CSRF token validation for POST requests
 * This function will exit with an error if token is invalid
 * 
 * @param string|null $token The token to validate (if null, will get from request)
 * @return void
 */
function require_csrf_token(?string $token = null): void
{
    if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
        return; // CSRF protection only needed for state-changing requests
    }
    
    // Get token from request if not provided
    if ($token === null) {
        $payload = get_request_payload();
        $token = $payload['_csrf_token'] ?? $_POST['_csrf_token'] ?? '';
    }
    
    if (empty($token) || !validate_csrf_token($token)) {
        error_log('[CSRF] Invalid or missing CSRF token from IP: ' . ($_SERVER['REMOTE_ADDR'] ?? 'unknown'));
        json_response([
            'error' => 'csrf_token_invalid',
            'message' => 'Invalid or missing security token. Please refresh the page and try again.'
        ], 403);
    }
}

/**
 * Regenerate CSRF token (useful after login or sensitive operations)
 * 
 * @return string The new CSRF token
 */
function regenerate_csrf_token(): string
{
    if (session_status() === PHP_SESSION_NONE) {
        session_start();
    }
    
    unset($_SESSION['_csrf_token'], $_SESSION['_csrf_token_expires']);
    return generate_csrf_token();
}


