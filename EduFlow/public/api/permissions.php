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
require_once __DIR__ . '/../../includes/permissions.php';
require_once __DIR__ . '/../../includes/auth.php';
require_once __DIR__ . '/../../includes/helpers.php';

try {
$admin = require_authenticated_admin();

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $payload = get_request_payload();
    $action = $payload['action'] ?? null;
    
    if ($action === 'request_access') {
        // Request username verification to access permissions
        $username = trim((string) ($payload['username'] ?? ''));
        
        if (empty($username)) {
            json_response(['error' => 'missing_fields', 'message' => 'Username is required'], 400);
        }
        
        // Verify username matches current admin
        if (strtolower($username) !== strtolower($admin['username'])) {
            json_response(['error' => 'invalid_username', 'message' => 'Username does not match your account'], 403);
        }
        
        // Use admin's email from database for sending verification
        $adminEmail = $admin['email'] ?? '';
        if (empty($adminEmail)) {
            json_response(['error' => 'config_error', 'message' => 'Admin email not configured'], 500);
        }
        
        $token = generate_permission_access_token((int) $admin['id'], $adminEmail);
        $emailSent = send_permission_access_email($adminEmail, $token, $admin['name']);
        
        // Return code for display (get from session where it's stored)
        require_once __DIR__ . '/../../includes/session.php';
        $code = $_SESSION['_pin_verify_code'] ?? null;
        
        record_activity((int) $admin['id'], 'permissions.access_requested', ['description' => 'Requested access to PIN permissions']);
        
        // Only return code if email was NOT sent (for testing/fallback)
        $response = [
            'status' => 'ok', 
            'message' => 'Verification email sent. Check your email for the code.'
        ];
        
        if ($code && !$emailSent) {
            $response['code'] = $code;
            $response['message'] = 'Verification code (email not sent): ' . $code;
            $response['email_note'] = 'Email sending may not work without SMTP configuration. Code is also stored in session.';
        }
        
        json_response($response);
    }
    
    if ($action === 'verify_token') {
        // Verify code and grant session access
        $code = trim((string) ($payload['token'] ?? $payload['code'] ?? ''));
        
        if (empty($code)) {
            json_response(['error' => 'missing_fields', 'message' => 'Verification code is required'], 400);
        }
        
        // Check if code matches stored code (for testing - in production, verify from email)
        $storedCode = $_SESSION['_pin_verify_code'] ?? null;
        $storedToken = $_SESSION['_pin_verify_token'] ?? null;
        $storedExpires = $_SESSION['_pin_verify_expires'] ?? 0;
        
        error_log("Verifying code: {$code}, stored: {$storedCode}, expires: {$storedExpires}, time: " . time());
        
        // Normalize code comparison (trim, ensure numeric)
        $code = trim($code);
        $storedCode = $storedCode ? trim($storedCode) : null;
        
        if ($storedCode && $storedToken && time() < $storedExpires && $code === $storedCode) {
            // Code matches, verify full token
            $tokenData = verify_permission_access_token($storedToken);
            if (!$tokenData) {
                error_log("Token verification failed for: {$storedToken}");
                json_response(['error' => 'invalid_token', 'message' => 'Invalid or expired token'], 400);
            }
            
            // Verify token belongs to current admin
            if ((int) $tokenData['admin_id'] !== (int) $admin['id']) {
                error_log("Token admin mismatch: token admin={$tokenData['admin_id']}, current={$admin['id']}");
                json_response(['error' => 'invalid_token', 'message' => 'Token does not match your account'], 403);
            }
            
            // Mark token as used
            mark_permission_token_used($storedToken);
            
            // Clear session codes
            unset($_SESSION['_pin_verify_code'], $_SESSION['_pin_verify_token'], $_SESSION['_pin_verify_expires']);
            
            // Grant permissions access in session (but don't persist - will be cleared after use)
            $_SESSION['permissions_access_granted'] = true;
            $_SESSION['permissions_access_expires'] = time() + (5 * 60); // Only 5 minutes, and will be cleared after saving
            
            record_activity((int) $admin['id'], 'permissions.access_granted', ['description' => 'Granted access to PIN permissions']);
            json_response(['status' => 'ok', 'message' => 'Access granted']);
        } else {
            // Try direct token verification (fallback - if code is full token)
            $tokenData = verify_permission_access_token($code);
            if ($tokenData && (int) $tokenData['admin_id'] === (int) $admin['id']) {
                mark_permission_token_used($code);
                $_SESSION['permissions_access_granted'] = true;
                $_SESSION['permissions_access_expires'] = time() + (5 * 60); // Only 5 minutes, and will be cleared after saving
                record_activity((int) $admin['id'], 'permissions.access_granted', ['description' => 'Granted access to PIN permissions']);
                json_response(['status' => 'ok', 'message' => 'Access granted']);
            } else {
                error_log("Code verification failed. Code: {$code}, Stored: {$storedCode}, Expired: " . ($storedExpires < time() ? 'yes' : 'no'));
                json_response(['error' => 'invalid_token', 'message' => 'Invalid or expired verification code'], 400);
            }
        }
    }
    
    if ($action === 'update_permissions') {
        // Check if access is granted
        if (!isset($_SESSION['permissions_access_granted']) || !$_SESSION['permissions_access_granted']) {
            json_response(['error' => 'access_required', 'message' => 'Email verification required to modify permissions'], 403);
        }
        
        if (isset($_SESSION['permissions_access_expires']) && $_SESSION['permissions_access_expires'] < time()) {
            unset($_SESSION['permissions_access_granted']);
            json_response(['error' => 'access_expired', 'message' => 'Access expired. Please request new verification.'], 403);
        }
        
        $permissions = $payload['permissions'] ?? [];
        if (!is_array($permissions)) {
            json_response(['error' => 'invalid_data', 'message' => 'Permissions must be an object'], 400);
        }
        
        update_pin_permissions($permissions, (int) $admin['id']);
        record_activity((int) $admin['id'], 'permissions.updated', ['description' => 'Updated PIN permissions', 'permissions' => $permissions]);
        
        // Don't clear permissions access yet - allow PIN change in same request cycle
        // It will be cleared by change_pin action or after timeout
        
        json_response(['status' => 'ok', 'message' => 'Permissions updated successfully']);
    }
    
    if ($action === 'change_pin') {
        // Check if access is granted
        if (!isset($_SESSION['permissions_access_granted']) || !$_SESSION['permissions_access_granted']) {
            json_response(['error' => 'access_required', 'message' => 'Verification required to change PIN'], 403);
        }
        
        if (isset($_SESSION['permissions_access_expires']) && $_SESSION['permissions_access_expires'] < time()) {
            unset($_SESSION['permissions_access_granted']);
            json_response(['error' => 'access_expired', 'message' => 'Access expired. Please request new verification.'], 403);
        }
        
        $newPin = trim((string) ($payload['new_pin'] ?? ''));
        if (empty($newPin)) {
            json_response(['error' => 'missing_fields', 'message' => 'New PIN is required'], 400);
        }
        
        if (strlen($newPin) < 4) {
            json_response(['error' => 'weak_pin', 'message' => 'PIN must be at least 4 characters'], 400);
        }
        
        // Update PIN
        $pdo = get_db_connection();
        $hash = password_hash($newPin, PASSWORD_BCRYPT);
        $stmt = $pdo->prepare('UPDATE admins SET management_pin_hash = :hash WHERE id = :id');
        $stmt->execute(['hash' => $hash, 'id' => (int) $admin['id']]);
        
        record_activity((int) $admin['id'], 'permissions.pin_changed', ['description' => 'Management PIN changed from permissions']);
        
        // Clear permissions access after PIN change (end of operations)
        unset($_SESSION['permissions_access_granted'], $_SESSION['permissions_access_expires']);
        
        json_response(['status' => 'ok', 'message' => 'PIN changed successfully']);
    }
}

if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    $action = $_GET['action'] ?? null;
    
    if ($action === 'check_access') {
        $hasAccess = isset($_SESSION['permissions_access_granted']) && $_SESSION['permissions_access_granted'];
        if ($hasAccess && isset($_SESSION['permissions_access_expires']) && $_SESSION['permissions_access_expires'] < time()) {
            $hasAccess = false;
            unset($_SESSION['permissions_access_granted']);
        }
        json_response(['has_access' => $hasAccess]);
    }
    
    if ($action === 'get_permissions') {
        json_response(['permissions' => get_pin_permissions()]);
    }
}

json_response(['error' => 'method_not_allowed'], 405);
} catch (Throwable $e) {
    error_log('[permissions.api] ' . $e->getMessage() . ' @ ' . $e->getFile() . ':' . $e->getLine());
    error_log('Stack trace: ' . $e->getTraceAsString());
    json_response(['error' => 'server_error', 'message' => 'Unexpected server error. Check logs.'], 500);
}

