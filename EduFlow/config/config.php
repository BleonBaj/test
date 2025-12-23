<?php

$env = static function (string $key, $default = null) {
    $value = getenv($key);
    if ($value === false) {
        $value = $_ENV[$key] ?? $_SERVER[$key] ?? $default;
    }
    return $value;
};

return [
    'db' => [
        'host' => '127.0.0.1',
        'port' => 3306,
        'name' => 'bts_ms',           // Sigurohuni që keni krijuar këtë databazë në phpMyAdmin
        'user' => 'root',             // User default i XAMPP
        'pass' => '',                 // Password bosh (default i XAMPP)
        'charset' => 'utf8mb4',
    ],
    'security' => [
        'management_pin_attempts' => (int) $env('MANAGEMENT_PIN_ATTEMPTS', 3),
        // Choose how to authorize privileged (PIN-gated) actions.
        // Options: 'pin' (default) | 'login_password'
        'management_auth_method' => $env('MANAGEMENT_AUTH_METHOD', 'pin'),
        // How long settings stay unlocked after a successful PIN in minutes
        'settings_unlock_ttl_minutes' => (int) $env('SETTINGS_UNLOCK_TTL_MINUTES', 15),
        // Account locking - enabled by default for security. Disable in local/dev with ACCOUNT_LOCK_ENABLED=false
        'account_lock_enabled' => filter_var($env('ACCOUNT_LOCK_ENABLED', 'true'), FILTER_VALIDATE_BOOLEAN),
        'account_lock_minutes' => (int) $env('ACCOUNT_LOCK_MINUTES', 30),
        // Rate limit controls - enabled by default for security. Disable in local/dev with RATE_LIMIT_ENABLED=false
        'rate_limit_enabled' => filter_var($env('RATE_LIMIT_ENABLED', 'false'), FILTER_VALIDATE_BOOLEAN),
        'rate_limit_window_seconds' => (int) $env('RATE_LIMIT_WINDOW_SECONDS', 15 * 60),
        'rate_limit_max_attempts' => (int) $env('RATE_LIMIT_MAX_ATTEMPTS', 5),
    ],
    'app' => [
        'default_language' => $env('APP_DEFAULT_LANGUAGE', 'sq'),
        'supported_languages' => array_map('trim', explode(',', $env('APP_SUPPORTED_LANGUAGES', 'sq,en'))),
        'name' => $env('APP_NAME', 'BTS Menaxhimi i Kursit Fizik'),
        'admin_email' => $env('APP_ADMIN_EMAIL', 'elon.berisha@universitetiaab.com'),
    ],
    'email' => [
        // SMTP Configuration
        // Për të përdorur SMTP, vendos SMTP_ENABLED=true dhe plotëso detajet e mëposhtme
        // Përndryshe, do të përdoret PHP mail() function (pa SMTP)
        'smtp_enabled' => filter_var($env('SMTP_ENABLED', 'true'), FILTER_VALIDATE_BOOLEAN), // Auto-enable if credentials exist

        // SMTP Server Settings
        'smtp_host' => $env('SMTP_HOST', 'smtp.gmail.com'), // P.sh. smtp.gmail.com, smtp.outlook.com
        'smtp_port' => (int) $env('SMTP_PORT', 587), // 587 për TLS, 465 për SSL
        'smtp_encryption' => $env('SMTP_ENCRYPTION', 'tls'), // 'tls' ose 'ssl'

        // SMTP Authentication
        'smtp_username' => $env('SMTP_USERNAME', 'elon.berisha@universitetiaab.com'), // Email-i ose username për SMTP
        'smtp_password' => $env('SMTP_PASSWORD', 'aggypiwsnflvxttq'), // Password për SMTP (për Gmail, përdor App Password) - VENDOS NË ENVIRONMENT VARIABLES

        // Email Settings
        'from_email' => $env('EMAIL_FROM', 'Confirm@bts.com'), // Email-i që do të shfaqet si dërgues (nëse bosh, përdoret smtp_username)
        'from_name' => $env('EMAIL_FROM_NAME', 'BTS Management System'), // Emri që do të shfaqet si dërgues
        'reply_to' => $env('EMAIL_REPLY_TO', ''), // Email për përgjigje (opsionale, nëse bosh, përdoret from_email)
    ],
];
