<?php

function json_response(array $payload, int $status = 200): void
{
    http_response_code($status);
    header('Content-Type: application/json');
    try {
        $json = json_encode($payload, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
        if ($json === false) {
            error_log('[helpers] JSON encode error: ' . json_last_error_msg());
            $json = json_encode(['error' => 'server_error', 'message' => 'Failed to encode response'], JSON_UNESCAPED_UNICODE);
        }
        echo $json;
    } catch (Throwable $e) {
        error_log('[helpers] Error in json_response: ' . $e->getMessage());
        echo json_encode(['error' => 'server_error', 'message' => 'Failed to generate response'], JSON_UNESCAPED_UNICODE);
    }
    exit;
}

function require_post_fields(array $fields, array $source): array
{
    $missing = [];
    $data = [];

    foreach ($fields as $field) {
        if (!isset($source[$field]) || $source[$field] === '') {
            $missing[] = $field;
        } else {
            $data[$field] = trim((string) $source[$field]);
        }
    }

    if ($missing) {
        json_response([
            'error' => 'missing_fields',
            'fields' => $missing,
        ], 400);
    }

    return $data;
}

function generate_prefixed_id(string $prefix, int $number): string
{
    return sprintf('%s-%d', strtoupper($prefix), $number);
}

function sanitize_string(?string $value): string
{
    return htmlspecialchars((string) $value, ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8');
}

function next_public_id(PDO $pdo, string $table, string $prefix, string $column = 'public_id'): string
{
    $stmt = $pdo->prepare(sprintf('SELECT %s FROM %s WHERE %s LIKE :prefix ORDER BY id DESC LIMIT 1',
        $column,
        $table,
        $column
    ));

    $stmt->execute(['prefix' => strtoupper($prefix) . '-%']);
    $last = $stmt->fetchColumn();

    if (!$last) {
        return strtoupper($prefix) . '-1';
    }

    if (!preg_match('/-(\d+)$/', $last, $matches)) {
        return strtoupper($prefix) . '-1';
    }

    $next = (int) $matches[1] + 1;

    return sprintf('%s-%d', strtoupper($prefix), $next);
}

function find_internal_id_by_public(PDO $pdo, string $table, string $publicId, string $column = 'public_id'): ?int
{
    $stmt = $pdo->prepare(sprintf('SELECT id FROM %s WHERE %s = :public_id LIMIT 1', $table, $column));
    $stmt->execute(['public_id' => $publicId]);
    $id = $stmt->fetchColumn();

    return $id ? (int) $id : null;
}

function get_request_payload(): array
{
    $contentType = $_SERVER['CONTENT_TYPE'] ?? $_SERVER['HTTP_CONTENT_TYPE'] ?? '';

    if (stripos($contentType, 'application/json') !== false) {
        $raw = file_get_contents('php://input');
        $data = json_decode($raw, true);
        if (json_last_error() !== JSON_ERROR_NONE) {
            json_response(['error' => 'invalid_json', 'message' => json_last_error_msg()], 400);
        }
        return $data ?: [];
    }

    return $_POST ?: [];
}

/**
 * Check if a given table has a specific column.
 */
function table_has_column(PDO $pdo, string $table, string $column): bool
{
    try {
        $stmt = $pdo->prepare(sprintf('SHOW COLUMNS FROM %s LIKE :col', $table));
        $stmt->execute(['col' => $column]);
        return (bool) $stmt->fetch();
    } catch (Throwable $_) {
        return false;
    }
}
