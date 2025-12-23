<?php
/**
 * Pre-Deployment Check Script
 * Verifikon që projekti është gati për deployment
 */

echo "========================================\n";
echo "   BTS-MS Pre-Deployment Check\n";
echo "========================================\n\n";

$errors = [];
$warnings = [];
$passed = 0;

// Change to project root directory
$projectRoot = dirname(__DIR__);
chdir($projectRoot);

// Check 1: Config file exists
echo "[1/10] Checking config.php... ";
if (file_exists($projectRoot . '/config/config.php')) {
    echo "✓ OK\n";
    $passed++;
    
    // Check if config has sensitive data
    $configContent = file_get_contents($projectRoot . '/config/config.php');
    if (strpos($configContent, 'aggypiwsnflvxttq') !== false || 
        strpos($configContent, 'tqaiampehyytmdcn') !== false) {
        $warnings[] = "config.php contains hardcoded SMTP password - use environment variables!";
    }
} else {
    $errors[] = "config.php not found - copy from config.php.example";
}

// Check 2: Database connection
echo "[2/10] Testing database connection... ";
try {
    require_once $projectRoot . '/includes/db.php';
    $pdo = get_db_connection();
    echo "✓ OK\n";
    $passed++;
} catch (Exception $e) {
    echo "✗ FAIL\n";
    $errors[] = "Database connection failed: " . $e->getMessage();
}

// Check 3: Required tables exist
echo "[3/10] Checking database tables... ";
if (isset($pdo)) {
    $requiredTables = [
        'admins', 'settings', 'activity_logs', 'pin_audit_logs',
        'login_attempts', 'password_reset_tokens', 'permission_access_tokens',
        'pin_permissions', 'courses', 'students', 'professors', 'classes',
        'class_professors', 'class_students', 'class_payment_plan',
        'student_invoices', 'salary_statements'
    ];
    
    $stmt = $pdo->query("SHOW TABLES");
    $existingTables = $stmt->fetchAll(PDO::FETCH_COLUMN);
    
    $missingTables = array_diff($requiredTables, $existingTables);
    
    if (empty($missingTables)) {
        echo "✓ OK (17 tables)\n";
        $passed++;
    } else {
        echo "✗ FAIL\n";
        $errors[] = "Missing tables: " . implode(', ', $missingTables);
    }
} else {
    echo "⊘ SKIP (no DB connection)\n";
}

// Check 4: Admin user exists
echo "[4/10] Checking admin user... ";
if (isset($pdo)) {
    try {
        $stmt = $pdo->query("SELECT COUNT(*) FROM admins");
        $count = $stmt->fetchColumn();
        
        if ($count > 0) {
            $stmt = $pdo->query("SELECT username, email FROM admins LIMIT 1");
            $admin = $stmt->fetch(PDO::FETCH_ASSOC);
            echo "✓ OK (username: {$admin['username']}, email: {$admin['email']})\n";
            $passed++;
            
            // Check if username is 'admin'
            if ($admin['username'] !== 'admin') {
                $warnings[] = "Admin username is '{$admin['username']}' - recommended to use 'admin'";
            }
        } else {
            echo "✗ FAIL\n";
            $errors[] = "No admin user found - run: php create_admin.php";
        }
    } catch (Exception $e) {
        echo "✗ FAIL\n";
        $errors[] = "Error checking admin: " . $e->getMessage();
    }
} else {
    echo "⊘ SKIP (no DB connection)\n";
}

// Check 5: Sessions directory is writable
echo "[5/10] Checking storage/sessions/... ";
$sessionsDir = $projectRoot . '/storage/sessions';
if (is_dir($sessionsDir) && is_writable($sessionsDir)) {
    echo "✓ OK\n";
    $passed++;
} else {
    echo "✗ FAIL\n";
    $errors[] = "storage/sessions/ is not writable - run: chmod 755 storage/sessions/";
}

// Check 6: Uploads directory is writable
echo "[6/10] Checking public/uploads/... ";
$uploadsDir = $projectRoot . '/public/uploads';
if (is_dir($uploadsDir) && is_writable($uploadsDir)) {
    echo "✓ OK\n";
    $passed++;
} else {
    echo "✗ FAIL\n";
    $errors[] = "public/uploads/ is not writable - run: chmod 755 public/uploads/";
}

// Check 7: SMTP configuration
echo "[7/10] Checking SMTP configuration... ";
if (isset($pdo)) {
    require_once $projectRoot . '/includes/db.php';
    $config = get_config();
    
    $smtpHost = $config['email']['smtp_host'] ?? '';
    $smtpUser = $config['email']['smtp_username'] ?? '';
    $smtpPass = $config['email']['smtp_password'] ?? '';
    
    if (!empty($smtpHost) && !empty($smtpUser) && !empty($smtpPass)) {
        echo "✓ OK\n";
        $passed++;
    } else {
        echo "⚠ WARNING\n";
        $warnings[] = "SMTP not fully configured - email-et nuk do të funksionojnë";
    }
} else {
    echo "⊘ SKIP\n";
}

// Check 8: Security settings
echo "[8/10] Checking security settings... ";
if (isset($config)) {
    $accountLock = $config['security']['account_lock_enabled'] ?? false;
    $rateLimit = $config['security']['rate_limit_enabled'] ?? false;
    
    if ($accountLock && $rateLimit) {
        echo "✓ OK (enabled)\n";
        $passed++;
    } else {
        echo "⚠ WARNING\n";
        $warnings[] = "Security features disabled - enable for production!";
    }
} else {
    echo "⊘ SKIP\n";
}

// Check 9: PHP version
echo "[9/10] Checking PHP version... ";
$phpVersion = PHP_VERSION;
if (version_compare($phpVersion, '7.4.0', '>=')) {
    echo "✓ OK (PHP {$phpVersion})\n";
    $passed++;
} else {
    echo "✗ FAIL\n";
    $errors[] = "PHP version {$phpVersion} is too old - requires 7.4+";
}

// Check 10: Required PHP extensions
echo "[10/10] Checking PHP extensions... ";
$requiredExtensions = ['pdo', 'pdo_mysql', 'mbstring', 'json', 'session'];
$missingExtensions = [];

foreach ($requiredExtensions as $ext) {
    if (!extension_loaded($ext)) {
        $missingExtensions[] = $ext;
    }
}

if (empty($missingExtensions)) {
    echo "✓ OK\n";
    $passed++;
} else {
    echo "✗ FAIL\n";
    $errors[] = "Missing PHP extensions: " . implode(', ', $missingExtensions);
}

// Summary
echo "\n========================================\n";
echo "           SUMMARY\n";
echo "========================================\n";
echo "Passed: {$passed}/10\n";
echo "Errors: " . count($errors) . "\n";
echo "Warnings: " . count($warnings) . "\n\n";

if (!empty($errors)) {
    echo "❌ ERRORS (must fix before deployment):\n";
    foreach ($errors as $i => $error) {
        echo "   " . ($i + 1) . ". {$error}\n";
    }
    echo "\n";
}

if (!empty($warnings)) {
    echo "⚠️  WARNINGS (recommended to fix):\n";
    foreach ($warnings as $i => $warning) {
        echo "   " . ($i + 1) . ". {$warning}\n";
    }
    echo "\n";
}

if (empty($errors)) {
    echo "✅ PROJECT IS READY FOR DEPLOYMENT!\n\n";
    echo "Next steps:\n";
    echo "1. Upload files to production server\n";
    echo "2. Configure production config.php\n";
    echo "3. Run: php create_admin.php (if not already done)\n";
    echo "4. Test: https://your-domain.com/public/index.php\n";
    exit(0);
} else {
    echo "❌ PROJECT IS NOT READY - Fix errors above\n";
    exit(1);
}

