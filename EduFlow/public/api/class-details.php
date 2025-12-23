<?php
require_once __DIR__ . '/../../includes/entities.php';

$admin = require_authenticated_admin();

if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    json_response(['error' => 'method_not_allowed'], 405);
}

// Get the class public ID from the query parameter
$publicId = $_GET['id'] ?? '';

if (empty($publicId)) {
    json_response(['error' => 'missing_class_id'], 400);
}

$classDetails = get_class_by_public_id($publicId);

if (!$classDetails) {
    json_response(['error' => 'class_not_found'], 404);
}

json_response(['class' => $classDetails]);