<?php
require_once __DIR__ . '/../../includes/entities.php';

$admin = require_authenticated_admin();

if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    json_response(['error' => 'method_not_allowed'], 405);
}

$pdo = get_db_connection();

$stats = [
    'courses_total' => (int) $pdo->query('SELECT COUNT(*) FROM courses')->fetchColumn(),
    'classes_total' => (int) $pdo->query('SELECT COUNT(*) FROM classes')->fetchColumn(),
    'students_total' => (int) $pdo->query('SELECT COUNT(*) FROM students')->fetchColumn(),
    'professors_total' => (int) $pdo->query('SELECT COUNT(*) FROM professors')->fetchColumn(),
];

json_response([
    'stats' => $stats,
    'classes' => list_classes(),
    'courses' => list_courses(),
    'students' => list_students(),
    'professors' => list_professors(),
    'settings' => get_settings(),
]);
