<?php
require_once __DIR__ . '/../../includes/entities.php';
require_once __DIR__ . '/../../includes/csrf.php';

$admin = require_authenticated_admin();

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    json_response(['error' => 'method_not_allowed'], 405);
}

// Require CSRF token for all POST requests
require_csrf_token();

$payload = get_request_payload();
$action = $payload['action'] ?? null;

switch ($action) {
    // Courses
    case 'create_course': {
        $course = create_course($admin, $payload);
        json_response(['data' => $course]);
        break;
    }
    case 'update_course': {
        $public = (string) ($payload['public_id'] ?? '');
        $course = update_course($admin, $public, $payload);
        json_response(['data' => $course]);
        break;
    }
    case 'delete_course': {
        delete_course($admin, (string) ($payload['public_id'] ?? ''), (string) ($payload['pin'] ?? ''));
        json_response(['status' => 'ok']);
        break;
    }

    // Classes
    case 'create_class': {
        try {
            $class = create_class($admin, $payload);
            json_response(['data' => $class]);
        } catch (PDOException $e) {
            $errorMsg = $e->getMessage();
            $errorCode = $e->getCode();
            error_log('Class creation PDO error: ' . $errorMsg . ' | Code: ' . $errorCode);
            error_log('SQL State: ' . $e->getCode());
            error_log('Payload: ' . json_encode($payload));
            // Return more detailed error in development, but generic in production
            $message = 'Database error occurred.';
            if (strpos($errorMsg, 'SQLSTATE') !== false) {
                $message = 'SQL Error: ' . substr($errorMsg, 0, 100);
            }
            json_response(['error' => 'database_error', 'message' => $message, 'details' => $errorMsg], 500);
        } catch (Exception $e) {
            $errorMsg = $e->getMessage();
            error_log('Class creation error: ' . $errorMsg);
            error_log('Trace: ' . $e->getTraceAsString());
            error_log('Payload: ' . json_encode($payload));
            json_response(['error' => 'server_error', 'message' => 'An error occurred: ' . $errorMsg], 500);
        }
        break;
    }
    case 'update_class': {
        $public = (string) ($payload['public_id'] ?? '');
        $class = update_class($admin, $public, $payload);
        json_response(['data' => $class]);
        break;
    }
    case 'delete_class': {
        delete_class($admin, (string) ($payload['public_id'] ?? ''), (string) ($payload['pin'] ?? ''));
        json_response(['status' => 'ok']);
        break;
    }

    // Students
    case 'create_student': {
        $student = create_student($admin, $payload);
        json_response(['data' => $student]);
        break;
    }
    case 'update_student': {
        $public = (string) ($payload['public_id'] ?? '');
        $student = update_student($admin, $public, $payload);
        json_response(['data' => $student]);
        break;
    }
    case 'delete_student': {
        delete_student($admin, (string) ($payload['public_id'] ?? ''), (string) ($payload['pin'] ?? ''));
        json_response(['status' => 'ok']);
        break;
    }

    // Professors
    case 'create_professor': {
        $professor = create_professor($admin, $payload);
        json_response(['data' => $professor]);
        break;
    }
    case 'update_professor': {
        $public = (string) ($payload['public_id'] ?? '');
        $professor = update_professor($admin, $public, $payload);
        json_response(['data' => $professor]);
        break;
    }
    case 'delete_professor': {
        delete_professor($admin, (string) ($payload['public_id'] ?? ''), (string) ($payload['pin'] ?? ''));
        json_response(['status' => 'ok']);
        break;
    }
}

json_response(['error' => 'unknown_action'], 400);
