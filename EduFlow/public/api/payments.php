<?php
require_once __DIR__ . '/../../includes/entities.php';
require_once __DIR__ . '/../../includes/csrf.php';

$admin = require_authenticated_admin();

if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    json_response(['data' => list_invoices()]);
}

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $payload = get_request_payload();
    $action = $payload['action'] ?? null;
    if ($action === 'create_invoice') {
        $invoice = create_invoice($admin, $payload);
        json_response(['data' => $invoice]);
    }
    if ($action === 'update_invoice') {
        $public = (string) ($payload['public_id'] ?? '');
        $invoice = update_invoice($admin, $public, $payload);
        json_response(['data' => $invoice]);
    }
    if ($action === 'delete_invoice') {
        $public = (string) ($payload['public_id'] ?? '');
        $pin = (string) ($payload['pin'] ?? '');
        delete_invoice($admin, $public, $pin);
        json_response(['ok' => true]);
    }
    json_response(['error' => 'unknown_action'], 400);
}

json_response(['error' => 'method_not_allowed'], 405);
