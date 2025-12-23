<?php
require_once __DIR__ . '/../../includes/entities.php';
require_once __DIR__ . '/../../includes/csrf.php';

$admin = require_authenticated_admin();

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    json_response(['error' => 'method_not_allowed'], 405);
}

// Expect multipart/form-data
if (!isset($_FILES['file'])) {
    json_response(['error' => 'missing_file'], 400);
}
// Logo upload doesn't require PIN (it's a simple file upload)
// PIN is optional and can be empty

$file = $_FILES['file'];
if (!isset($file['error']) || is_array($file['error'])) {
    json_response(['error' => 'invalid_upload'], 400);
}
if ($file['error'] !== UPLOAD_ERR_OK) {
    $err = $file['error'];
    $map = [
        UPLOAD_ERR_INI_SIZE => 'file_too_large',
        UPLOAD_ERR_FORM_SIZE => 'file_too_large',
        UPLOAD_ERR_PARTIAL => 'partial_upload',
        UPLOAD_ERR_NO_FILE => 'no_file',
        UPLOAD_ERR_NO_TMP_DIR => 'no_tmp_dir',
        UPLOAD_ERR_CANT_WRITE => 'cant_write',
        UPLOAD_ERR_EXTENSION => 'extension_blocked',
    ];
    json_response(['error' => $map[$err] ?? 'upload_error', 'code' => $err], 400);
}

// Validate type and size
$maxSize = 5 * 1024 * 1024; // 5MB
if (($file['size'] ?? 0) > $maxSize) {
    json_response(['error' => 'file_too_large'], 400);
}

$finfo = new finfo(FILEINFO_MIME_TYPE);
$mime = $finfo->file($file['tmp_name']);
$allowed = [
    'image/png' => 'png',
    'image/jpeg' => 'jpg',
    'image/gif' => 'gif',
    'image/webp' => 'webp',
    'image/svg+xml' => 'svg',
];
if (!isset($allowed[$mime])) {
    json_response(['error' => 'invalid_type', 'mime' => $mime], 400);
}
$ext = $allowed[$mime];

// Prepare destination
$uploadsDir = realpath(__DIR__ . '/..'); // public
$uploadsDir = $uploadsDir . DIRECTORY_SEPARATOR . 'uploads';
if (!is_dir($uploadsDir)) {
    @mkdir($uploadsDir, 0775, true);
}
if (!is_dir($uploadsDir) || !is_writable($uploadsDir)) {
    json_response(['error' => 'upload_dir_unwritable'], 500);
}

// Generate safe filename
$rand = bin2hex(random_bytes(6));
$filename = 'logo_' . date('Ymd_His') . '_' . $rand . '.' . $ext;
$destPath = $uploadsDir . DIRECTORY_SEPARATOR . $filename;

if (!move_uploaded_file($file['tmp_name'], $destPath)) {
    json_response(['error' => 'move_failed'], 500);
}

// Return relative URL (served from /uploads)
$url = 'uploads/' . $filename;

// Read previous logo URL from settings, then update setting to the new URL
$prevUrl = '';
try {
    $settings = get_settings();
    $prevUrl = (string) ($settings['business']['company_logo_url'] ?? '');
} catch (Throwable $_) {
    $prevUrl = '';
}

// Persist new logo URL into settings (business/company_logo_url)
try {
    $pdo = get_db_connection();
    $stmt = $pdo->prepare('INSERT INTO settings (settings_group, setting_key, setting_value) VALUES (:g, :k, :v) ON DUPLICATE KEY UPDATE setting_value = :v_upd');
    $stmt->execute(['g' => 'business', 'k' => 'company_logo_url', 'v' => $url, 'v_upd' => $url]);
} catch (Throwable $e) {
    // If settings update fails, keep the file and report error
    json_response(['error' => 'settings_update_failed'], 500);
}

// If previous logo was a local upload (within /uploads), attempt to delete it
if ($prevUrl !== '' && str_starts_with($prevUrl, 'uploads/')) {
    // prevent path traversal
    if (strpos($prevUrl, '..') === false) {
        $publicDir = realpath(__DIR__ . '/..');
        if ($publicDir !== false) {
            $prevPath = $publicDir . DIRECTORY_SEPARATOR . str_replace(['/', '\\'], DIRECTORY_SEPARATOR, $prevUrl);
            if (is_file($prevPath) && basename($prevPath) !== $filename) {
                @unlink($prevPath);
            }
        }
    }
}

record_activity((int) $admin['id'], 'file.upload', ['description' => 'Uploaded logo ' . $filename]);
json_response(['status' => 'ok', 'url' => $url]);
