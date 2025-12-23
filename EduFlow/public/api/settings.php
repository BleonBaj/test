<?php
require_once __DIR__ . '/../../includes/entities.php';
require_once __DIR__ . '/../../includes/csrf.php';

$admin = require_authenticated_admin();

// Support unlocking settings via GET ?pin=...
if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    $action = $_GET['action'] ?? '';
    if ($action === 'list_requests') {
        $pdo = get_db_connection();
        $stmt = $pdo->prepare("SELECT id, public_id, username, email, created_at, status FROM admins WHERE status = 'pending' ORDER BY created_at DESC");
        $stmt->execute();
        json_response(['requests' => $stmt->fetchAll()]);
    }

    $pin = isset($_GET['pin']) ? (string) $_GET['pin'] : '';
    if ($pin !== '') {
        ensure_settings_unlocked($admin, $pin);
        json_response(['status' => 'ok']);
    }
}

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    // Require CSRF token for all POST requests (except login/password reset which don't have session)
    require_csrf_token();
    
    $payload = get_request_payload();
    
    // Handle Signup Requests
    if (isset($payload['action']) && $payload['action'] === 'handle_request') {
        $targetId = $payload['request_id'] ?? '';
        $decision = $payload['decision'] ?? '';
        $pin = $payload['pin'] ?? ''; // Require PIN for security actions
        
        // Ensure unlocked/authorized
        if (!empty($pin)) {
             ensure_settings_unlocked($admin, (string) $pin);
        } else {
             // If no PIN provided in payload, maybe check session or error?
             // For consistency with settings updates, let's require it or use ensure_settings_unlocked(..., null) which fails
             // But wait, the frontend might not send PIN if it thinks it's already unlocked.
             // We'll enforce PIN for this sensitive action.
             ensure_settings_unlocked($admin, null);
        }

        if (empty($targetId) || !in_array($decision, ['accept', 'ignore'])) {
            json_response(['error' => 'invalid_params'], 400);
        }
        
        $pdo = get_db_connection();
        if ($decision === 'accept') {
            $stmt = $pdo->prepare("UPDATE admins SET status = 'active' WHERE public_id = :id AND status = 'pending'");
            $stmt->execute(['id' => $targetId]);
        } else {
            // Ignore/Reject - maybe delete or set status rejected
            $stmt = $pdo->prepare("UPDATE admins SET status = 'rejected' WHERE public_id = :id AND status = 'pending'");
            $stmt->execute(['id' => $targetId]);
        }
        
        json_response(['status' => 'ok']);
    }

    $group = $payload['group'] ?? '';
    $key = $payload['key'] ?? '';
    $value = $payload['value'] ?? '';
    $pin = $payload['pin'] ?? '';

    if ($group === '' || $key === '') {
        json_response(['error' => 'missing_fields', 'fields' => array_filter([
            $group === '' ? 'group' : null,
            $key === '' ? 'key' : null,
        ])], 400);
    }

    $pdo = get_db_connection();

    // Only require PIN for security settings, not for business/app settings
    // If a PIN is provided in the payload, it will be used to unlock the session
    if ($group === 'security') {
        if (!empty($pin)) {
            ensure_settings_unlocked($admin, (string) $pin);
        } else {
            ensure_settings_unlocked($admin, null);
        }
    }
    // Business and app settings don't require PIN

    // Handle security settings updates using the same unlocked flow
    if ($group === 'security') {
        if ($key === 'management_pin') {
            if (!$value) {
                json_response(['error' => 'missing_fields', 'fields' => ['value']], 400);
            }
            $hash = password_hash($value, PASSWORD_BCRYPT);
            $stmt = $pdo->prepare('UPDATE admins SET management_pin_hash = :hash WHERE id = :id');
            $stmt->execute(['hash' => $hash, 'id' => (int) $admin['id']]);
            record_activity((int) $admin['id'], 'settings.pin_change', ['description' => 'Management PIN changed']);
            json_response(['status' => 'ok']);
        }

        if ($key === 'pin_requirements') {
            // Expect JSON object mapping action_key => bool
            $map = is_array($value) ? $value : json_decode((string) $value, true);
            if (json_last_error() !== JSON_ERROR_NONE || !is_array($map)) {
                json_response(['error' => 'invalid_json'], 400);
            }
            $serialized = json_encode($map, JSON_UNESCAPED_UNICODE);
            $stmt = $pdo->prepare('INSERT INTO settings (settings_group, setting_key, setting_value) VALUES (:g, :k, :v) ON DUPLICATE KEY UPDATE setting_value = :v_upd');
            $stmt->execute(['g' => $group, 'k' => $key, 'v' => $serialized, 'v_upd' => $serialized]);
            record_activity((int) $admin['id'], 'settings.update', ['description' => 'Updated pin requirements']);
            json_response(['status' => 'ok']);
        }

        json_response(['error' => 'invalid_key'], 400);
    }

    // CRITICAL: Prevent management_pin from falling through to generic settings table
    if ($key === 'management_pin') {
        json_response(['error' => 'logic_error', 'message' => 'Security key handled incorrectly'], 500);
    }

    // Avoid deprecated VALUES() usage in newer MySQL by rebinding the value for UPDATE
    $stmt = $pdo->prepare('INSERT INTO settings (settings_group, setting_key, setting_value) VALUES (:g, :k, :v) ON DUPLICATE KEY UPDATE setting_value = :v_upd');
    $stmt->execute(['g' => $group, 'k' => $key, 'v' => $value, 'v_upd' => $value]);

    record_activity((int) $admin['id'], 'settings.update', ['description' => 'Updated setting ' . $group . '.' . $key]);
    json_response(['status' => 'ok']);
}

if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    // If no PIN is provided here, do not auto-unlock; simply return settings (unlock is enforced client-side before entering settings UI)
    json_response(['settings' => get_settings()]);
}

json_response(['error' => 'method_not_allowed'], 405);
