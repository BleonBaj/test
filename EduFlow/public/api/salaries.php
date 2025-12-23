<?php
require_once __DIR__ . '/../../includes/entities.php';
require_once __DIR__ . '/../../includes/csrf.php';

// Ensure JSON response
header('Content-Type: application/json');

try {
    $admin = require_authenticated_admin();

    if ($_SERVER['REQUEST_METHOD'] === 'GET') {
        $data = list_salaries();
        // Log count for debugging (check php error log)
        error_log("Salaries API: Found " . count($data) . " records.");
        json_response(['data' => $data]);
    }

    if ($_SERVER['REQUEST_METHOD'] === 'POST') {
        $payload = get_request_payload();
        $action = $payload['action'] ?? null;
        
        if ($action === 'create_salary') {
            $salary = create_salary($admin, $payload);
            json_response(['data' => $salary]);
        }
        
        if ($action === 'update_salary') {
            $public = (string) ($payload['public_id'] ?? '');
            $salary = update_salary($admin, $public, $payload);
            json_response(['data' => $salary]);
        }
        
        if ($action === 'delete_salary') {
            $public = (string) ($payload['public_id'] ?? '');
            $pin = (string) ($payload['pin'] ?? '');
            delete_salary($admin, $public, $pin);
            json_response(['ok' => true]);
        }
        
        json_response(['error' => 'unknown_action'], 400);
    }

    json_response(['error' => 'method_not_allowed'], 405);

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['error' => 'server_error', 'message' => $e->getMessage()]);
}
