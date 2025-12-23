<?php
require_once __DIR__ . '/../includes/db.php';

try {
    $pdo = get_db_connection();
    
    $migrationFile = __DIR__ . '/../database/migrations/004_add_invoice_salary_permissions.sql';
    if (!file_exists($migrationFile)) {
        throw new Exception("Migration file not found: $migrationFile");
    }
    
    $sql = file_get_contents($migrationFile);
    $pdo->exec($sql);
    
    echo "Migration executed successfully\n";
} catch (Exception $e) {
    echo "Error: " . $e->getMessage() . "\n";
    exit(1);
}

