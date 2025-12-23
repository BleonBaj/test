<?php

require_once __DIR__ . '/auth.php';
require_once __DIR__ . '/db.php';
require_once __DIR__ . '/helpers.php';

// Get all PIN permissions
function get_pin_permissions(): array
{
    $pdo = get_db_connection();
    $stmt = $pdo->query('SELECT entity_type, action_type, requires_pin FROM pin_permissions ORDER BY entity_type, action_type');
    $permissions = [];
    foreach ($stmt->fetchAll() as $row) {
        $key = $row['entity_type'] . '.' . $row['action_type'];
        $permissions[$key] = (bool) $row['requires_pin'];
    }
    return $permissions;
}

// Check if PIN is required for a specific action
function is_pin_required_for_action(string $entityType, string $actionType): bool
{
    $pdo = get_db_connection();
    $stmt = $pdo->prepare('SELECT requires_pin FROM pin_permissions WHERE entity_type = :entity AND action_type = :action LIMIT 1');
    $stmt->execute(['entity' => $entityType, 'action' => $actionType]);
    $result = $stmt->fetchColumn();
    return (bool) $result;
}

// Update PIN permission
function update_pin_permission(string $entityType, string $actionType, bool $requiresPin, int $adminId): void
{
    $pdo = get_db_connection();
    $stmt = $pdo->prepare('INSERT INTO pin_permissions (entity_type, action_type, requires_pin, updated_by) 
                           VALUES (:entity, :action, :pin, :admin)
                           ON DUPLICATE KEY UPDATE requires_pin = :pin_upd, updated_by = :admin_upd, updated_at = NOW()');
    $stmt->execute([
        'entity' => $entityType,
        'action' => $actionType,
        'pin' => $requiresPin ? 1 : 0,
        'admin' => $adminId,
        'pin_upd' => $requiresPin ? 1 : 0,
        'admin_upd' => $adminId
    ]);
}

// Batch update permissions
function update_pin_permissions(array $permissions, int $adminId): void
{
    foreach ($permissions as $key => $requiresPin) {
        $parts = explode('.', $key);
        if (count($parts) === 2) {
            [$entityType, $actionType] = $parts;
            update_pin_permission($entityType, $actionType, (bool) $requiresPin, $adminId);
        }
    }
}

// Generate email verification token for accessing permissions
function generate_permission_access_token(int $adminId, string $email): string
{
    $pdo = get_db_connection();
    
    // Delete old unused tokens
    $stmt = $pdo->prepare('DELETE FROM permission_access_tokens WHERE admin_id = :id AND used_at IS NULL');
    $stmt->execute(['id' => $adminId]);
    
    // Generate new token
    $token = bin2hex(random_bytes(32));
    $expiresAt = date('Y-m-d H:i:s', time() + (15 * 60)); // 15 minutes
    
    $stmt = $pdo->prepare('INSERT INTO permission_access_tokens (admin_id, token, email_sent_to, expires_at) 
                           VALUES (:id, :token, :email, :expires)');
    $stmt->execute([
        'id' => $adminId,
        'token' => $token,
        'email' => $email,
        'expires' => $expiresAt
    ]);
    
    return $token;
}

// Verify permission access token
function verify_permission_access_token(string $token): ?array
{
    $pdo = get_db_connection();
    $stmt = $pdo->prepare('SELECT pat.*, a.email, a.name 
                           FROM permission_access_tokens pat
                           JOIN admins a ON a.id = pat.admin_id
                           WHERE pat.token = :token 
                           AND pat.used_at IS NULL 
                           AND pat.expires_at > NOW() 
                           LIMIT 1');
    $stmt->execute(['token' => $token]);
    $result = $stmt->fetch();
    
    return $result ?: null;
}

// Mark token as used
function mark_permission_token_used(string $token): void
{
    $pdo = get_db_connection();
    $stmt = $pdo->prepare('UPDATE permission_access_tokens SET used_at = NOW() WHERE token = :token');
    $stmt->execute(['token' => $token]);
}

// Send email with verification code
function send_permission_access_email(string $email, string $token, string $adminName): bool
{
    require_once __DIR__ . '/email.php';
    
    // Generate 6-digit numeric code
    // Use random_int if available (PHP 7.0+), otherwise fallback to mt_rand
    if (function_exists('random_int')) {
        $code = str_pad((string) random_int(0, 999999), 6, '0', STR_PAD_LEFT);
    } else {
        $code = str_pad((string) mt_rand(0, 999999), 6, '0', STR_PAD_LEFT);
    }
    
    $subject = "Kodi: {$code}";
    $message = "Kodi për menaxhimin e PASSCODE: {$code}\n\n";
    $message .= "I vlefshëm për 15 minuta.\n";
    
    // HTML email - i thjeshtë dhe i shkurtër
    $htmlMessage = "<!DOCTYPE html>";
    $htmlMessage .= "<html><head><meta charset='UTF-8'></head>";
    $htmlMessage .= "<body style='margin: 0; padding: 20px; font-family: Arial, sans-serif; background-color: #f5f5f5;'>";
    $htmlMessage .= "<div style='max-width: 500px; margin: 0 auto; background: #fff; padding: 30px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);'>";
    $htmlMessage .= "<h2 style='margin: 0 0 20px 0; color: #333;'>Menaxhimi i PASSCODE</h2>";
    $htmlMessage .= "<div style='background: #16a34a; color: #fff; padding: 20px; text-align: center; border-radius: 8px; margin: 20px 0;'>";
    $htmlMessage .= "<div style='font-size: 36px; font-weight: bold; letter-spacing: 8px; font-family: monospace;'>{$code}</div>";
    $htmlMessage .= "</div>";
    $htmlMessage .= "<p style='color: #666; font-size: 14px; margin: 15px 0;'>I vlefshëm për <strong>15 minuta</strong>.</p>";
    $htmlMessage .= "</div>";
    $htmlMessage .= "</body></html>";
    
    // Also store code in session as fallback (for testing/backup)
    require_once __DIR__ . '/session.php';
    $_SESSION['_pin_verify_code'] = $code;
    $_SESSION['_pin_verify_token'] = $token;
    $_SESSION['_pin_verify_expires'] = time() + (15 * 60);
    
    // Try to send email
    $sent = send_email($email, $subject, $message, $htmlMessage);
    
    if ($sent) {
        error_log("Permission access code sent via email to {$adminName} ({$email}): {$code}");
    } else {
        // Log that email failed but code is available in session
        error_log("Email sending failed (may need SMTP configuration), but code stored in session for {$adminName} ({$email}): {$code}");
        error_log("Note: To enable email sending, configure SMTP in config.php or set up sendmail in XAMPP");
    }
    
    return $sent; // Return true if email was sent, false otherwise
}

