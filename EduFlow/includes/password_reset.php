<?php

require_once __DIR__ . '/auth.php';
require_once __DIR__ . '/db.php';
require_once __DIR__ . '/helpers.php';

// Send password reset email with verification code
function send_password_reset_email(string $email, string $token, string $username): bool
{
    require_once __DIR__ . '/email.php';
    require_once __DIR__ . '/session.php';
    
    // Generate 6-digit numeric code
    // Use random_int if available (PHP 7.0+), otherwise fallback to mt_rand
    if (function_exists('random_int')) {
        $code = str_pad((string) random_int(0, 999999), 6, '0', STR_PAD_LEFT);
    } else {
        $code = str_pad((string) mt_rand(0, 999999), 6, '0', STR_PAD_LEFT);
    }
    
    $subject = "Kodi: {$code}";
    $message = "Kodi për reset password: {$code}\n\n";
    $message .= "I vlefshëm për 1 orë.\n";
    
    // HTML email - i thjeshtë dhe i shkurtër
    $htmlMessage = "<!DOCTYPE html>";
    $htmlMessage .= "<html><head><meta charset='UTF-8'></head>";
    $htmlMessage .= "<body style='margin: 0; padding: 20px; font-family: Arial, sans-serif; background-color: #f5f5f5;'>";
    $htmlMessage .= "<div style='max-width: 500px; margin: 0 auto; background: #fff; padding: 30px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);'>";
    $htmlMessage .= "<h2 style='margin: 0 0 20px 0; color: #333;'>Reset Password</h2>";
    $htmlMessage .= "<div style='background: #dc2626; color: #fff; padding: 20px; text-align: center; border-radius: 8px; margin: 20px 0;'>";
    $htmlMessage .= "<div style='font-size: 36px; font-weight: bold; letter-spacing: 8px; font-family: monospace;'>{$code}</div>";
    $htmlMessage .= "</div>";
    $htmlMessage .= "<p style='color: #666; font-size: 14px; margin: 15px 0;'>I vlefshëm për <strong>1 orë</strong>.</p>";
    $htmlMessage .= "</div>";
    $htmlMessage .= "</body></html>";
    
    // Store code in session for verification
    $_SESSION['_password_reset_code'] = $code;
    $_SESSION['_password_reset_token'] = $token;
    $_SESSION['_password_reset_email'] = $email;
    $_SESSION['_password_reset_expires'] = time() + (60 * 60); // 1 hour
    
    // Log for debugging
    error_log("Password reset code generated and stored in session: {$code} for {$username} ({$email})");
    
    // Try to send email
    $sent = send_email($email, $subject, $message, $htmlMessage);
    
    if ($sent) {
        error_log("Password reset code sent via email to {$username} ({$email}): {$code}");
    } else {
        error_log("Email sending failed (may need SMTP configuration), but code stored in session for {$username} ({$email}): {$code}");
    }
    
    return $sent; // Return true if email was sent, false otherwise
}

function get_reset_link(string $token): string
{
    $baseUrl = (isset($_SERVER['HTTPS']) && $_SERVER['HTTPS'] === 'on' ? 'https' : 'http') 
               . '://' . $_SERVER['HTTP_HOST'] 
               . dirname($_SERVER['SCRIPT_NAME']);
    return $baseUrl . '/public/reset-password.php?token=' . urlencode($token);
}

// Create password reset token
function create_password_reset_token(int $adminId, string $ipAddress, string $userAgent): string
{
    $pdo = get_db_connection();
    
    // Delete old unused tokens for this admin
    $stmt = $pdo->prepare('DELETE FROM password_reset_tokens WHERE admin_id = :id AND used_at IS NULL');
    $stmt->execute(['id' => $adminId]);
    
    // Generate new token
    $token = generate_secure_token(32);
    $expiresAt = date('Y-m-d H:i:s', time() + (60 * 60)); // 1 hour
    
    $stmt = $pdo->prepare('INSERT INTO password_reset_tokens (admin_id, token, expires_at, ip_address, user_agent) 
                          VALUES (:id, :token, :expires, :ip, :ua)');
    $stmt->execute([
        'id' => $adminId,
        'token' => $token,
        'expires' => $expiresAt,
        'ip' => $ipAddress,
        'ua' => $userAgent
    ]);
    
    return $token;
}

// Verify password reset token
function verify_password_reset_token(string $token): ?array
{
    $pdo = get_db_connection();
    $stmt = $pdo->prepare('SELECT prt.*, a.id as admin_id, a.username, a.email 
                           FROM password_reset_tokens prt 
                           JOIN admins a ON a.id = prt.admin_id 
                           WHERE prt.token = :token 
                           AND prt.used_at IS NULL 
                           AND prt.expires_at > NOW() 
                           LIMIT 1');
    $stmt->execute(['token' => $token]);
    $result = $stmt->fetch();
    
    return $result ?: null;
}

// Mark password reset token as used
function mark_reset_token_used(string $token): void
{
    $pdo = get_db_connection();
    $stmt = $pdo->prepare('UPDATE password_reset_tokens SET used_at = NOW() WHERE token = :token');
    $stmt->execute(['token' => $token]);
}

// Reset password using token
function reset_password_with_token(string $token, string $newPassword): bool
{
    $tokenData = verify_password_reset_token($token);
    if (!$tokenData) {
        return false;
    }
    
    $pdo = get_db_connection();
    $hash = password_hash($newPassword, PASSWORD_BCRYPT);
    
    $stmt = $pdo->prepare('UPDATE admins SET password_hash = :hash, failed_login_attempts = 0, locked_until = NULL WHERE id = :id');
    $stmt->execute(['hash' => $hash, 'id' => $tokenData['admin_id']]);
    
    mark_reset_token_used($token);
    
    record_activity((int) $tokenData['admin_id'], 'auth.password_reset', ['description' => 'Password reset via token']);
    
    return true;
}

