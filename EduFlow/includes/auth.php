<?php

require_once __DIR__ . '/session.php';
require_once __DIR__ . '/db.php';
require_once __DIR__ . '/helpers.php';

function find_admin_by_email(string $email): ?array
{
    try {
        $pdo = get_db_connection();
        $stmt = $pdo->prepare('SELECT * FROM admins WHERE email = :email LIMIT 1');
        $stmt->execute(['email' => strtolower($email)]);
        $admin = $stmt->fetch();
        return $admin ?: null;
    } catch (Throwable $e) {
        error_log('[auth] Error finding admin by email: ' . $e->getMessage());
        return null;
    }
}

function find_admin_by_username(string $username): ?array
{
    try {
        $pdo = get_db_connection();
        $stmt = $pdo->prepare('SELECT * FROM admins WHERE username = :username LIMIT 1');
        $stmt->execute(['username' => trim($username)]);
        $admin = $stmt->fetch();
        return $admin ?: null;
    } catch (Throwable $e) {
        error_log('[auth] Error finding admin by username: ' . $e->getMessage());
        return null;
    }
}

function find_admin_by_identifier(string $identifier): ?array
{
    try {
        // Try username first, then email
        $admin = find_admin_by_username($identifier);
        if (!$admin) {
            $admin = find_admin_by_email($identifier);
        }
        return $admin;
    } catch (Throwable $e) {
        error_log('[auth] Error finding admin by identifier: ' . $e->getMessage());
        return null;
    }
}

// Rate limiting: Check if too many failed attempts
function check_rate_limit(string $identifier, string $ipAddress): bool
{
    $cfg = get_config();
    // Always return true if rate limiting is disabled (default in dev)
    if (empty($cfg['security']['rate_limit_enabled'])) {
        return true; // disabled in dev
    }
    
    // Check if table exists first
    try {
        $pdo = get_db_connection();
        
        // Check if table exists
        $stmt = $pdo->query("SHOW TABLES LIKE 'login_attempts'");
        if ($stmt->rowCount() === 0) {
            error_log('[auth] login_attempts table does not exist, skipping rate limit check');
            return true; // Table doesn't exist, allow login
        }
        
        $window = isset($cfg['security']['rate_limit_window_seconds']) ? (int) $cfg['security']['rate_limit_window_seconds'] : (15 * 60);
        $maxAttempts = isset($cfg['security']['rate_limit_max_attempts']) ? (int) $cfg['security']['rate_limit_max_attempts'] : 5;
        
        // Count failed attempts in last 15 minutes
        $stmt = $pdo->prepare('SELECT COUNT(*) FROM login_attempts 
                               WHERE identifier = :identifier 
                               AND ip_address = :ip 
                               AND success = 0 
                               AND attempted_at > DATE_SUB(NOW(), INTERVAL :window SECOND)');
        $stmt->execute([
            'identifier' => $identifier,
            'ip' => $ipAddress,
            'window' => $window
        ]);
        $count = (int) $stmt->fetchColumn();
        
        return $count < $maxAttempts;
    } catch (Throwable $e) {
        // If table doesn't exist or other DB error, allow login (fail open)
        error_log('[auth] Rate limit check failed: ' . $e->getMessage());
        return true;
    }
}

// Record login attempt
function record_login_attempt(string $identifier, string $ipAddress, bool $success): void
{
    try {
        $pdo = get_db_connection();
        
        // Check if table exists first
        $checkStmt = $pdo->query("SHOW TABLES LIKE 'login_attempts'");
        if ($checkStmt->rowCount() === 0) {
            // Table doesn't exist, skip recording (fail silently)
            return;
        }
        
        $stmt = $pdo->prepare('INSERT INTO login_attempts (identifier, ip_address, success) VALUES (:identifier, :ip, :success)');
        $stmt->execute([
            'identifier' => $identifier,
            'ip' => $ipAddress,
            'success' => $success ? 1 : 0
        ]);
    } catch (Throwable $e) {
        // If table doesn't exist or other DB error, just log it (fail silently)
        error_log('[auth] Failed to record login attempt: ' . $e->getMessage());
    }
}

// Check if account is locked
function is_account_locked(array $admin): bool
{
    // Respect config toggle: disable lockouts entirely if not enabled
    $cfg = get_config();
    if (empty($cfg['security']['account_lock_enabled'])) {
        return false;
    }
    if (!isset($admin['locked_until']) || $admin['locked_until'] === null) {
        return false;
    }
    $lockedUntil = new DateTime($admin['locked_until']);
    $now = new DateTime();
    return $now < $lockedUntil;
}

// Lock account after too many failed attempts
function lock_account(int $adminId, int $minutes = 30): void
{
    // Respect config toggle: no-op if lockouts disabled
    $cfg = get_config();
    if (empty($cfg['security']['account_lock_enabled'])) {
        return;
    }
    
    try {
        // Allow duration override from config
        $duration = isset($cfg['security']['account_lock_minutes']) ? (int) $cfg['security']['account_lock_minutes'] : $minutes;
        $pdo = get_db_connection();
        $lockedUntil = date('Y-m-d H:i:s', time() + ($duration * 60));
        $stmt = $pdo->prepare('UPDATE admins SET locked_until = :locked_until, failed_login_attempts = failed_login_attempts + 1 WHERE id = :id');
        $stmt->execute(['locked_until' => $lockedUntil, 'id' => $adminId]);
    } catch (Throwable $e) {
        error_log('[auth] Failed to lock account: ' . $e->getMessage());
    }
}

// Reset failed attempts on successful login
function reset_failed_attempts(int $adminId): void
{
    try {
        $pdo = get_db_connection();
        $stmt = $pdo->prepare('UPDATE admins SET failed_login_attempts = 0, locked_until = NULL WHERE id = :id');
        $stmt->execute(['id' => $adminId]);
    } catch (Throwable $e) {
        error_log('[auth] Failed to reset failed attempts: ' . $e->getMessage());
    }
}

// Increment failed attempts without locking (used before threshold)
function increment_failed_attempts(int $adminId): void
{
    try {
        $pdo = get_db_connection();
        $stmt = $pdo->prepare('UPDATE admins SET failed_login_attempts = failed_login_attempts + 1 WHERE id = :id');
        $stmt->execute(['id' => $adminId]);
    } catch (Throwable $e) {
        error_log('[auth] Failed to increment failed attempts: ' . $e->getMessage());
    }
}

// Generate secure random token
function generate_secure_token(int $length = 32): string
{
    return bin2hex(random_bytes($length));
}

// Verify 2FA TOTP code
function verify_2fa_code(string $secret, string $code): bool
{
    if (strlen($code) !== 6 || !ctype_digit($code)) {
        return false;
    }
    
    // Use Google Authenticator compatible TOTP
    $time = floor(time() / 30); // 30 second window
    $codes = [];
    for ($i = -1; $i <= 1; $i++) { // Allow 30 seconds before/after
        $codes[] = generate_totp($secret, $time + $i);
    }
    
    return in_array($code, $codes, true);
}

// Generate TOTP code (simplified - should use library like robthree/twofactorauth)
function generate_totp(string $secret, int $time): string
{
    $key = base32_decode($secret);
    $time = pack('N*', 0) . pack('N*', $time);
    $hash = hash_hmac('sha1', $time, $key, true);
    $offset = ord($hash[19]) & 0xf;
    $code = (
        ((ord($hash[$offset + 0]) & 0x7f) << 24) |
        ((ord($hash[$offset + 1]) & 0xff) << 16) |
        ((ord($hash[$offset + 2]) & 0xff) << 8) |
        (ord($hash[$offset + 3]) & 0xff)
    ) % 1000000;
    return str_pad((string) $code, 6, '0', STR_PAD_LEFT);
}

function base32_decode(string $input): string
{
    $chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
    $input = strtoupper($input);
    $output = '';
    $v = 0;
    $vbits = 0;
    
    for ($i = 0; $i < strlen($input); $i++) {
        $v <<= 5;
        $v += strpos($chars, $input[$i]);
        $vbits += 5;
        if ($vbits >= 8) {
            $output .= chr($v >> ($vbits - 8));
            $vbits -= 8;
        }
    }
    return $output;
}

// Generate 2FA secret for new user
function generate_2fa_secret(): string
{
    $chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
    $secret = '';
    for ($i = 0; $i < 16; $i++) {
        $secret .= $chars[random_int(0, 31)];
    }
    return $secret;
}

function create_admin_session(array $admin): void
{
    try {
        if (session_status() === PHP_SESSION_ACTIVE) {
            @session_regenerate_id(true);
        }
        $_SESSION['admin_id'] = $admin['id'];
        $_SESSION['admin_email'] = $admin['email'];
        $_SESSION['admin_name'] = $admin['name'];
        // optional: track last login
        try {
            $pdo = get_db_connection();
            $stmt = $pdo->prepare('UPDATE admins SET last_login_at = NOW() WHERE id = :id');
            $stmt->execute(['id' => $admin['id']]);
        } catch (Throwable $e) {
            // Silently fail if update fails
            error_log('[auth] Failed to update last_login_at: ' . $e->getMessage());
        }
    } catch (Throwable $e) {
        error_log('[auth] Failed to create admin session: ' . $e->getMessage());
        throw $e; // Re-throw as this is critical
    }
}

function destroy_admin_session(): void
{
    $_SESSION = [];
    if (ini_get('session.use_cookies')) {
        $params = session_get_cookie_params();
        setcookie(session_name(), '', time() - 42000, $params['path'], $params['domain'], $params['secure'], $params['httponly']);
    }
    session_destroy();
}

function require_authenticated_admin(): array
{
    if (!isset($_SESSION['admin_id'])) {
        http_response_code(401);
        exit; // empty body to avoid exposing backend JSON on unauthenticated
    }
    $pdo = get_db_connection();
    $stmt = $pdo->prepare('SELECT * FROM admins WHERE id = :id LIMIT 1');
    $stmt->execute(['id' => $_SESSION['admin_id']]);
    $admin = $stmt->fetch();
    if (!$admin) {
        destroy_admin_session();
        http_response_code(401);
        exit;
    }
    return $admin;
}

function require_authenticated_admin_page(): array
{
    if (!isset($_SESSION['admin_id'])) {
        header('Location: index.php');
        exit;
    }
    $pdo = get_db_connection();
    $stmt = $pdo->prepare('SELECT * FROM admins WHERE id = :id LIMIT 1');
    $stmt->execute(['id' => $_SESSION['admin_id']]);
    $admin = $stmt->fetch();
    if (!$admin) {
        destroy_admin_session();
        header('Location: index.php');
        exit;
    }
    return $admin;
}

// OTP flow removed

function record_activity(int $adminId, string $actionKey, array $context = []): void
{
    try {
        // Check if table exists first
        $pdo = get_db_connection();
        $checkStmt = $pdo->query("SHOW TABLES LIKE 'activity_logs'");
        if ($checkStmt->rowCount() === 0) {
            // Table doesn't exist, skip recording (fail silently)
            return;
        }
        
        $stmt = $pdo->prepare('INSERT INTO activity_logs (admin_id, action_key, description, context) VALUES (:admin_id, :action_key, :description, :context)');
        $stmt->execute([
            'admin_id' => $adminId,
            'action_key' => $actionKey,
            'description' => $context['description'] ?? null,
            'context' => $context ? json_encode($context, JSON_UNESCAPED_UNICODE) : null,
        ]);
    } catch (Throwable $e) {
        // If table doesn't exist or other DB error, just log it (fail silently)
        error_log('[auth] Failed to record activity: ' . $e->getMessage());
    }
}

function log_pin_verification(int $adminId, string $actionKey, string $entityType = null, string $entityId = null, string $status = 'failure', array $metadata = []): void
{
    $pdo = get_db_connection();
    $stmt = $pdo->prepare('INSERT INTO pin_audit_logs (admin_id, action_key, entity_type, entity_public_id, status, metadata) VALUES (:admin_id, :action_key, :entity_type, :entity_public_id, :status, :metadata)');
    $stmt->execute([
        'admin_id' => $adminId,
        'action_key' => $actionKey,
        'entity_type' => $entityType,
        'entity_public_id' => $entityId,
        'status' => $status,
        'metadata' => $metadata ? json_encode($metadata, JSON_UNESCAPED_UNICODE) : null,
    ]);
}

function verify_management_pin(int $adminId, string $secret, string $actionKey, ?string $entityType = null, ?string $entityId = null): bool
{
    $pdo = get_db_connection();
    $stmt = $pdo->prepare('SELECT password_hash, management_pin_hash FROM admins WHERE id = :id');
    $stmt->execute(['id' => $adminId]);
    $admin = $stmt->fetch();
    if (!$admin) return false;

    $usedMethod = 'management_pin';
    $isValid = false;
    
    // Always prioritize management_pin_hash if it exists (the PIN set in settings)
    // This ensures the same PIN is used for both settings and CRUD operations
    if (!empty($admin['management_pin_hash'])) {
        $isValid = password_verify($secret, $admin['management_pin_hash']);
        $usedMethod = 'management_pin';
    } else {
        // Fallback: if no management PIN is set, use login password
        // This allows the system to work even if PIN hasn't been set yet
        $isValid = password_verify($secret, $admin['password_hash'] ?? '');
        $usedMethod = 'login_password';
    }

    // Record audit with the method used (no secrets stored)
    log_pin_verification(
        $adminId,
        $actionKey,
        $entityType,
        $entityId,
        $isValid ? 'success' : 'failure',
        ['method' => $usedMethod]
    );
    return $isValid;
}

function ensure_management_pin(array $admin, string $pin, string $actionKey, ?string $entityType = null, ?string $entityId = null): void
{
    if (!verify_management_pin((int) $admin['id'], $pin, $actionKey, $entityType, $entityId)) {
        json_response(['error' => 'invalid_pin'], 403);
    }
}

// Settings unlock: require a one-time PIN (or configured method) to access settings for a limited time window
function ensure_settings_unlocked(array $admin, ?string $pin = null): void
{
    // Always require a PIN per request for settings operations
    if ($pin === null || $pin === '') {
        json_response(['error' => 'settings_locked'], 403);
    }
    $ok = verify_management_pin((int) $admin['id'], $pin, 'settings.unlock', 'settings', null);
    if ($ok) {
        return;
    }
    json_response(['error' => 'invalid_pin'], 403);
}
