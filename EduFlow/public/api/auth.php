<?php
// Local dev hardening: wrap all request handling in a safety net so we return JSON instead of a blank 500
set_error_handler(function ($severity, $message, $file, $line) {
    // Convert warnings/notices into exceptions for unified handling
    if (!(error_reporting() & $severity)) {
        return false;
    }
    throw new ErrorException($message, 0, $severity, $file, $line);
});

require_once __DIR__ . '/../../includes/session.php';
require_once __DIR__ . '/../../includes/auth.php';
require_once __DIR__ . '/../../includes/password_reset.php';
require_once __DIR__ . '/../../includes/helpers.php';
require_once __DIR__ . '/../../includes/csrf.php';

// Ensure session is started for email sending
if (session_status() === PHP_SESSION_NONE) {
    // Session should have been started by includes/session.php included above
    // If not, we start it here, but it's unlikely given lines 11-12
    session_start();
}

// Get client IP address
function get_client_ip(): string
{
    $ipKeys = ['HTTP_CLIENT_IP', 'HTTP_X_FORWARDED_FOR', 'REMOTE_ADDR'];
    foreach ($ipKeys as $key) {
        if (array_key_exists($key, $_SERVER) === true) {
            foreach (explode(',', $_SERVER[$key]) as $ip) {
                $ip = trim($ip);
                if (filter_var($ip, FILTER_VALIDATE_IP, FILTER_FLAG_NO_PRIV_RANGE | FILTER_FLAG_NO_RES_RANGE) !== false) {
                    return $ip;
                }
            }
        }
    }
    return $_SERVER['REMOTE_ADDR'] ?? '0.0.0.0';
}

try {
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    // Support both JSON and form data
    try {
        $payload = get_request_payload();
    } catch (Throwable $e) {
        error_log('[auth.api] Error getting request payload: ' . $e->getMessage());
        $payload = $_POST ?: [];
    }
    $action = $payload['action'] ?? $_POST['action'] ?? null;
    $ipAddress = get_client_ip();
    $userAgent = $_SERVER['HTTP_USER_AGENT'] ?? '';

    if ($action === 'signup') {
        $username = trim((string) ($payload['username'] ?? ''));
        $email = trim((string) ($payload['email'] ?? ''));
        $password = (string) ($payload['password'] ?? '');
        
        if (empty($username) || empty($email) || empty($password)) {
            json_response(['error' => 'missing_fields', 'message' => 'Të gjitha fushat janë të detyrueshme'], 400);
        }
        
        // Check if user exists (raw query to catch pending ones too)
        $pdo = get_db_connection();
        $stmt = $pdo->prepare('SELECT id FROM admins WHERE username = :u OR email = :e');
        $stmt->execute(['u' => $username, 'e' => $email]);
        if ($stmt->fetch()) {
            json_response(['error' => 'exists', 'message' => 'Përdoruesi ose email ekziston tashmë'], 409);
        }
        
        // Create pending user
        $hash = password_hash($password, PASSWORD_BCRYPT);
        // Generate a public ID like ADM + date + random
        $publicId = 'ADM' . date('ymd') . rand(100, 999);
        
        // Use username as name initially
        $stmt = $pdo->prepare('INSERT INTO admins (public_id, username, name, email, password_hash, status) VALUES (:pid, :u, :n, :e, :h, "pending")');
        $stmt->execute([
            'pid' => $publicId,
            'u' => $username,
            'n' => $username, 
            'e' => $email,
            'h' => $hash
        ]);
        
        json_response(['status' => 'ok', 'message' => 'Kërkesa u dërgua. Prisni aprovimin nga administratori.']);
    }

    if ($action === 'login') {
        $identifier = trim((string) ($payload['username'] ?? $payload['email'] ?? $_POST['username'] ?? $_POST['email'] ?? ''));
        $password = (string) ($payload['password'] ?? $_POST['password'] ?? '');
        $twoFactorCode = trim((string) ($payload['two_factor_code'] ?? $_POST['two_factor_code'] ?? ''));
        
        // Validate input
        if (empty($identifier) || empty($password)) {
            json_response(['error' => 'missing_fields', 'message' => 'Username and password are required'], 400);
        }
        
        // Rate limiting check
        try {
            if (!check_rate_limit($identifier, $ipAddress)) {
                record_login_attempt($identifier, $ipAddress, false);
                json_response(['error' => 'rate_limited', 'message' => 'Too many failed attempts. Please try again in 15 minutes.'], 429);
            }
        } catch (Throwable $e) {
            error_log('[auth.api] Rate limit check error: ' . $e->getMessage());
            // Continue with login if rate limit check fails
        }
        
        // Find admin by username or email
        $admin = find_admin_by_identifier($identifier);
        
        if (!$admin) {
            record_login_attempt($identifier, $ipAddress, false);
            json_response(['error' => 'invalid_credentials', 'message' => 'Invalid username or password'], 401);
        }

        // Check if account is pending or rejected
        if (isset($admin['status']) && $admin['status'] !== 'active') {
            if ($admin['status'] === 'pending') {
                json_response(['error' => 'account_pending', 'message' => 'Llogaria juaj është në pritje të aprovimit.'], 403);
            }
            if ($admin['status'] === 'rejected') {
                json_response(['error' => 'account_rejected', 'message' => 'Kërkesa juaj për regjistrim është refuzuar.'], 403);
            }
        }
        
        // Check if account is locked
        if (is_account_locked($admin)) {
            $lockedUntil = new DateTime($admin['locked_until']);
            $now = new DateTime();
            $remaining = $now->diff($lockedUntil);
            json_response([
                'error' => 'account_locked', 
                'message' => 'Account is locked. Try again in ' . $remaining->format('%i') . ' minutes.'
            ], 423);
        }
        
        // Verify password with soft lock threshold
        if (empty($admin['password_hash']) || !password_verify($password, $admin['password_hash'])) {
            $cfg = get_config();
            $lockEnabled = !empty($cfg['security']['account_lock_enabled']);
            $threshold = isset($cfg['security']['account_lock_attempts']) ? (int) $cfg['security']['account_lock_attempts'] : 5;
            $currentFails = (int) ($admin['failed_login_attempts'] ?? 0);
            $nextFails = $currentFails + 1;

            if ($lockEnabled && $threshold > 0 && $nextFails >= $threshold) {
                lock_account($admin['id']);
            } else {
                increment_failed_attempts($admin['id']);
            }

            record_login_attempt($identifier, $ipAddress, false);
            json_response(['error' => 'invalid_credentials', 'message' => 'Invalid username or password'], 401);
        }
        
        // Check if 2FA is enabled - always enabled for email-based 2FA
        $twoFactorEnabled = true; // Always require 2FA with email code
        
        if ($twoFactorEnabled) {
            // Check if 2FA code is provided
            if (empty($twoFactorCode)) {
                // Automatically send 2FA code to admin's email before returning response
                require_once __DIR__ . '/../../includes/email.php';
                
                // Generate 6-digit code
                if (function_exists('random_int')) {
                    $code = str_pad((string) random_int(0, 999999), 6, '0', STR_PAD_LEFT);
                } else {
                    $code = str_pad((string) mt_rand(0, 999999), 6, '0', STR_PAD_LEFT);
                }
                
                // Store in session
                $_SESSION['_2fa_code'] = $code;
                $_SESSION['_2fa_username'] = $identifier;
                $_SESSION['_2fa_expires'] = time() + (15 * 60); // 15 minutes
                
                // Send email to admin's email address (from database, not from input)
                $adminEmail = $admin['email'] ?? '';
                if (!empty($adminEmail)) {
                    $subject = "Kodi: {$code}";
                    $message = "Kodi për login: {$code}\n\n";
                    $message .= "I vlefshëm për 15 minuta.\n";
                    
                    // HTML email - i thjeshtë dhe i shkurtër
                    $htmlMessage = "<!DOCTYPE html>";
                    $htmlMessage .= "<html><head><meta charset='UTF-8'></head>";
                    $htmlMessage .= "<body style='margin: 0; padding: 20px; font-family: Arial, sans-serif; background-color: #f5f5f5;'>";
                    $htmlMessage .= "<div style='max-width: 500px; margin: 0 auto; background: #fff; padding: 30px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);'>";
                    $htmlMessage .= "<h2 style='margin: 0 0 20px 0; color: #333;'>Kodi për Login</h2>";
                    $htmlMessage .= "<div style='background: #1d4ed8; color: #fff; padding: 20px; text-align: center; border-radius: 8px; margin: 20px 0;'>";
                    $htmlMessage .= "<div style='font-size: 36px; font-weight: bold; letter-spacing: 8px; font-family: monospace;'>{$code}</div>";
                    $htmlMessage .= "</div>";
                    $htmlMessage .= "<p style='color: #666; font-size: 14px; margin: 15px 0;'>I vlefshëm për <strong>15 minuta</strong>.</p>";
                    $htmlMessage .= "</div>";
                    $htmlMessage .= "</body></html>";
                    
                    // Send email (non-blocking - don't wait for result)
                    @send_email($adminEmail, $subject, $message, $htmlMessage);
                }
                
                // Return 2FA required response with code (for fallback if email fails)
                json_response([
                    'error' => 'two_factor_required', 
                    'message' => 'Two-factor authentication code required',
                    'requires_2fa' => true,
                    'code' => $code // Include code in response as fallback
                ], 200);
            }
            
            // Verify 2FA code from email (stored in session)
            $storedCode = $_SESSION['_2fa_code'] ?? null;
            $storedUsername = $_SESSION['_2fa_username'] ?? '';
            $storedExpires = $_SESSION['_2fa_expires'] ?? 0;
            
            if ($storedCode && $storedCode === $twoFactorCode && 
                $storedUsername === $identifier && 
                $storedExpires > time()) {
                // Code is valid - clear session
                unset($_SESSION['_2fa_code'], $_SESSION['_2fa_username'], $_SESSION['_2fa_expires']);
            } else {
                record_login_attempt($identifier, $ipAddress, false);
                json_response(['error' => 'invalid_2fa', 'message' => 'Invalid or expired two-factor authentication code'], 401);
            }
        }
        
        // Successful login
        reset_failed_attempts($admin['id']);
        record_login_attempt($identifier, $ipAddress, true);
        create_admin_session($admin);
        record_activity((int) $admin['id'], 'auth.login', ['description' => 'Password login', 'ip' => $ipAddress]);
        
        // Regenerate CSRF token after successful login
        regenerate_csrf_token();
        
        // Always return JSON response (no HTML redirects)
        json_response(['status' => 'ok', 'message' => 'Login successful', 'csrf_token' => get_csrf_token()]);
    }

    if ($action === 'request_password_reset') {
        try {
            require_once __DIR__ . '/../../includes/password_reset.php';
            require_once __DIR__ . '/../../includes/email.php';
            
            // Find admin automatically (since there's only one admin)
            $pdo = get_db_connection();
            $stmt = $pdo->prepare('SELECT * FROM admins ORDER BY id ASC LIMIT 1');
            $stmt->execute();
            $admin = $stmt->fetch();
            
            if (!$admin) {
                // Don't reveal if admin exists (security best practice)
                json_response(['status' => 'ok', 'message' => 'If an account exists, a verification code has been sent to your email.']);
            }
            
            // Don't reveal if user exists (security best practice)
            if ($admin) {
                try {
                    $token = create_password_reset_token($admin['id'], $ipAddress, $userAgent);
                    $emailSent = send_password_reset_email($admin['email'], $token, $admin['username'] ?? $admin['email']);
                    
                    if (function_exists('record_activity')) {
                        try {
                            record_activity((int) $admin['id'], 'auth.password_reset_requested', ['description' => 'Password reset requested', 'ip' => $ipAddress]);
                        } catch (Throwable $e) {
                            error_log("Error recording activity: " . $e->getMessage());
                        }
                    }
                    
                    // Don't return code in response - user must enter it manually
                    $response = [
                        'status' => 'ok', 
                        'message' => 'Verification code has been sent to your email.'
                    ];
                    
                    json_response($response);
                } catch (Throwable $e) {
                    error_log('[auth.api] Error in request_password_reset: ' . $e->getMessage());
                    error_log('Stack trace: ' . $e->getTraceAsString());
                    json_response(['error' => 'server_error', 'message' => 'Failed to send password reset code. Please try again.'], 500);
                }
            } else {
                // Always return success to prevent user enumeration
                json_response(['status' => 'ok', 'message' => 'If an account exists, a verification code has been sent to your email.']);
            }
        } catch (Throwable $e) {
            error_log('[auth.api] Error in request_password_reset: ' . $e->getMessage());
            error_log('Stack trace: ' . $e->getTraceAsString());
            json_response(['error' => 'server_error', 'message' => 'Failed to process password reset request. Please try again.'], 500);
        }
    }
    
    if ($action === 'request_2fa_code') {
        try {
            require_once __DIR__ . '/../../includes/email.php';
            
            $identifier = trim((string) ($payload['username'] ?? $_POST['username'] ?? ''));
            
            if (empty($identifier)) {
                json_response(['error' => 'missing_fields', 'message' => 'Username is required'], 400);
            }
            
            $admin = find_admin_by_identifier($identifier);
        
        // Don't reveal if user exists (security best practice)
        if ($admin) {
            // Generate 6-digit numeric code
            // Use random_int if available (PHP 7.0+), otherwise fallback to mt_rand
            if (function_exists('random_int')) {
                $code = str_pad((string) random_int(0, 999999), 6, '0', STR_PAD_LEFT);
            } else {
                $code = str_pad((string) mt_rand(0, 999999), 6, '0', STR_PAD_LEFT);
            }
            
            // Store in session
            $_SESSION['_2fa_code'] = $code;
            $_SESSION['_2fa_username'] = $identifier;
            $_SESSION['_2fa_expires'] = time() + (15 * 60); // 15 minutes
            
            // Verify admin email exists
            $adminEmail = $admin['email'] ?? '';
            if (empty($adminEmail)) {
                json_response(['error' => 'invalid_config', 'message' => 'Admin email not configured'], 500);
            }
            
            // Send email
            $subject = "Kodi: {$code}";
            $message = "Kodi për login: {$code}\n\n";
            $message .= "I vlefshëm për 15 minuta.\n";
            
            // HTML email - i thjeshtë dhe i shkurtër
            $htmlMessage = "<!DOCTYPE html>";
            $htmlMessage .= "<html><head><meta charset='UTF-8'></head>";
            $htmlMessage .= "<body style='margin: 0; padding: 20px; font-family: Arial, sans-serif; background-color: #f5f5f5;'>";
            $htmlMessage .= "<div style='max-width: 500px; margin: 0 auto; background: #fff; padding: 30px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);'>";
            $htmlMessage .= "<h2 style='margin: 0 0 20px 0; color: #333;'>Kodi për Login</h2>";
            $htmlMessage .= "<div style='background: #1d4ed8; color: #fff; padding: 20px; text-align: center; border-radius: 8px; margin: 20px 0;'>";
            $htmlMessage .= "<div style='font-size: 36px; font-weight: bold; letter-spacing: 8px; font-family: monospace;'>{$code}</div>";
            $htmlMessage .= "</div>";
            $htmlMessage .= "<p style='color: #666; font-size: 14px; margin: 15px 0;'>I vlefshëm për <strong>15 minuta</strong>.</p>";
            $htmlMessage .= "</div>";
            $htmlMessage .= "</body></html>";
            
            $emailSent = false;
            try {
                $emailSent = send_email($adminEmail, $subject, $message, $htmlMessage);
            } catch (Throwable $e) {
                // Continue anyway - code is stored in session
                $emailSent = false;
            }
            
            if (function_exists('record_activity')) {
                try {
                    record_activity((int) $admin['id'], 'auth.2fa_code_requested', ['description' => '2FA code requested for login', 'ip' => $ipAddress]);
                } catch (Throwable $e) {
                    error_log("Error recording activity: " . $e->getMessage());
                }
            }
            
            // Store email sent status for response
            $emailSentStatus = $emailSent;
        }
        
        // Always return success to prevent user enumeration
        $response = [
            'status' => 'ok', 
            'message' => 'If an account exists, a verification code has been sent to your email.'
        ];
        
        // Always include code in response (for testing/fallback when email fails)
        $codeToReturn = $code ?? null;
        $emailSentToReturn = $emailSentStatus ?? false;
        
        if ($codeToReturn) {
            $response['code'] = $codeToReturn;
            if (!$emailSentToReturn) {
                $response['message'] = 'Verification code (email not sent): ' . $codeToReturn;
            }
        }
        
        json_response($response);
        } catch (Throwable $e) {
            json_response(['error' => 'server_error', 'message' => 'Failed to send verification code. Please try again.'], 500);
        }
    }

    if ($action === 'verify_reset_code') {
        try {
            require_once __DIR__ . '/../../includes/password_reset.php';
            
            $code = trim((string) ($payload['code'] ?? $_POST['code'] ?? ''));
            
            if (empty($code)) {
                json_response(['error' => 'missing_fields', 'message' => 'Code is required'], 400);
            }
            
            // Find admin automatically (since there's only one admin)
            $pdo = get_db_connection();
            $stmt = $pdo->prepare('SELECT * FROM admins ORDER BY id ASC LIMIT 1');
            $stmt->execute();
            $admin = $stmt->fetch();
            
            if (!$admin) {
                json_response(['error' => 'invalid_code', 'message' => 'Invalid or expired verification code'], 400);
            }
        
            // Verify code from session
            $storedCode = $_SESSION['_password_reset_code'] ?? null;
            $storedEmail = $_SESSION['_password_reset_email'] ?? '';
            $storedExpires = $_SESSION['_password_reset_expires'] ?? 0;
            
            // Normalize code comparison (trim, ensure numeric)
            $code = trim($code);
            $storedCode = $storedCode ? trim($storedCode) : null;
            
            if ($storedCode && $storedCode === $code && 
                $storedEmail === $admin['email'] && 
                $storedExpires > time()) {
                // Code is valid - return success (password reset will happen in next step)
                json_response(['status' => 'ok', 'message' => 'Verification code is valid']);
            } else {
                json_response(['error' => 'invalid_code', 'message' => 'Invalid or expired verification code'], 400);
            }
        } catch (Throwable $e) {
            error_log('[auth.api] Error in verify_reset_code: ' . $e->getMessage());
            error_log('Stack trace: ' . $e->getTraceAsString());
            json_response(['error' => 'server_error', 'message' => 'Failed to verify code. Please try again.'], 500);
        }
    }

    if ($action === 'verify_password_reset') {
        try {
            require_once __DIR__ . '/../../includes/password_reset.php';
            
            $code = trim((string) ($payload['code'] ?? $_POST['code'] ?? ''));
            $newPassword = (string) ($payload['password'] ?? $_POST['password'] ?? '');
            
            if (empty($code) || empty($newPassword)) {
                json_response(['error' => 'missing_fields', 'message' => 'Code and password are required'], 400);
            }
            
            if (strlen($newPassword) < 8) {
                json_response(['error' => 'weak_password', 'message' => 'Password must be at least 8 characters'], 400);
            }
            
            // Find admin automatically (since there's only one admin)
            $pdo = get_db_connection();
            $stmt = $pdo->prepare('SELECT * FROM admins ORDER BY id ASC LIMIT 1');
            $stmt->execute();
            $admin = $stmt->fetch();
            
            if (!$admin) {
                json_response(['error' => 'invalid_credentials', 'message' => 'Invalid request'], 400);
            }
        
        // Verify code from session
        $storedCode = $_SESSION['_password_reset_code'] ?? null;
        $storedToken = $_SESSION['_password_reset_token'] ?? null;
        $storedEmail = $_SESSION['_password_reset_email'] ?? '';
        $storedExpires = $_SESSION['_password_reset_expires'] ?? 0;
        
        // Normalize code comparison (trim, ensure numeric)
        $code = trim($code);
        $storedCode = $storedCode ? trim($storedCode) : null;
        
        if ($storedCode && $storedCode === $code && 
            $storedEmail === $admin['email'] && 
            $storedExpires > time()) {
            
            // Verify token and reset password
            if ($storedToken && reset_password_with_token($storedToken, $newPassword)) {
                // Clear session data
                unset($_SESSION['_password_reset_code'], $_SESSION['_password_reset_token'], 
                      $_SESSION['_password_reset_email'], $_SESSION['_password_reset_expires']);
                json_response(['status' => 'ok', 'message' => 'Password reset successful']);
            } else {
                json_response(['error' => 'invalid_token', 'message' => 'Invalid or expired reset token'], 400);
            }
        } else {
            json_response(['error' => 'invalid_code', 'message' => 'Invalid or expired verification code'], 400);
        }
        } catch (Throwable $e) {
            error_log('[auth.api] Error in verify_password_reset: ' . $e->getMessage());
            error_log('Stack trace: ' . $e->getTraceAsString());
            json_response(['error' => 'server_error', 'message' => 'Failed to verify password reset. Please try again.'], 500);
        }
    }

    if ($action === 'reset_password') {
        $token = trim((string) ($_POST['token'] ?? ''));
        $newPassword = (string) ($_POST['password'] ?? '');
        
        if (empty($token) || empty($newPassword)) {
            json_response(['error' => 'missing_fields', 'message' => 'Token and password are required'], 400);
        }
        
        if (strlen($newPassword) < 8) {
            json_response(['error' => 'weak_password', 'message' => 'Password must be at least 8 characters'], 400);
        }
        
        if (reset_password_with_token($token, $newPassword)) {
            json_response(['status' => 'ok', 'message' => 'Password reset successful']);
        } else {
            json_response(['error' => 'invalid_token', 'message' => 'Invalid or expired reset token'], 400);
        }
    }

    if ($action === 'change_password') {
        // Must be logged in
        $admin = require_authenticated_admin();
        $current = (string) ($payload['current_password'] ?? $_POST['current_password'] ?? '');
        $new = (string) ($payload['new_password'] ?? $_POST['new_password'] ?? '');
        if ($current === '' || $new === '') {
            json_response(['error' => 'missing_fields', 'message' => 'Current and new passwords are required'], 400);
        }
        if (!password_verify($current, $admin['password_hash'] ?? '')) {
            json_response(['error' => 'invalid_credentials', 'message' => 'Current password is incorrect'], 403);
        }
        if (strlen($new) < 6) {
            json_response(['error' => 'weak_password', 'message' => 'Password must be at least 6 characters'], 400);
        }
        $hash = password_hash($new, PASSWORD_BCRYPT);
        $pdo = get_db_connection();
        $stmt = $pdo->prepare('UPDATE admins SET password_hash = :hash WHERE id = :id');
        $stmt->execute(['hash' => $hash, 'id' => (int) $admin['id']]);
        record_activity((int) $admin['id'], 'auth.password_changed', ['description' => 'Changed login password']);
        json_response(['status' => 'ok', 'message' => 'Password changed']);
    }

    if ($action === 'logout') {
        if (isset($_SESSION['admin_id'])) {
            record_activity((int) $_SESSION['admin_id'], 'auth.logout', ['description' => 'Admin logout']);
        }
        destroy_admin_session();
        // For browser form posts, redirect back to login page to avoid showing JSON
        $accept = $_SERVER['HTTP_ACCEPT'] ?? '';
        if (stripos($accept, 'text/html') !== false) {
            header('Location: ../index.php');
            exit;
        }
        // For API clients, return no content with success status
        http_response_code(204);
        exit;
    }
}

json_response(['error' => 'method_not_allowed'], 405);
} catch (Throwable $e) {
    error_log('[auth.api] ' . $e->getMessage() . ' @ ' . $e->getFile() . ':' . $e->getLine());
    error_log('Stack trace: ' . $e->getTraceAsString());
    json_response(['error' => 'server_error', 'message' => 'Unexpected server error. Check logs.', 'details' => $e->getMessage()], 500);
}
