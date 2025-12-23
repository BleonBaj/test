<?php

require_once __DIR__ . '/helpers.php';

function get_config(): array
{
    static $config = null;
    if ($config === null) {
        $config = require __DIR__ . '/../config/config.php';
    }
    return $config;
}

function get_db_connection(): PDO
{
    static $pdo = null;
    if ($pdo) return $pdo;

    $config = get_config();
    $dsn = sprintf('mysql:host=%s;port=%d;dbname=%s;charset=%s',
        $config['db']['host'],
        $config['db']['port'],
        $config['db']['name'],
        $config['db']['charset']
    );

    try {
        $pdo = new PDO($dsn, $config['db']['user'], $config['db']['pass'], [
            PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
            PDO::ATTR_EMULATE_PREPARES => false,
        ]);
    } catch (PDOException $e) {
        error_log('Database connection error: ' . $e->getMessage());
        error_log('DSN: ' . $dsn . ' | User: ' . $config['db']['user']);
        
        // If called from a page (not API), show a proper error page instead of JSON
        $isApiCall = !empty($_SERVER['REQUEST_URI']) && strpos($_SERVER['REQUEST_URI'], '/api/') !== false;
        
        if (!$isApiCall && php_sapi_name() !== 'cli') {
            http_response_code(500);
            header('Content-Type: text/html; charset=utf-8');
            die('<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Database Error</title><style>body{font-family:Arial,sans-serif;max-width:800px;margin:50px auto;padding:20px;background:#f5f5f5;}h1{color:#d32f2f;}code{background:#fff;padding:2px 6px;border-radius:3px;}</style></head><body><h1>Database Connection Error</h1><p>Could not connect to database. Please check:</p><ul><li>MySQL is running</li><li>Database credentials in <code>config/config.php</code> are correct</li><li>Database <code>' . htmlspecialchars($config['db']['name']) . '</code> exists</li></ul><p><strong>Error details:</strong></p><pre style="background:#fff;padding:15px;border-left:4px solid #d32f2f;">' . htmlspecialchars($e->getMessage()) . '</pre><p><strong>Connection details:</strong></p><ul><li>Host: <code>' . htmlspecialchars($config['db']['host']) . '</code></li><li>Port: <code>' . htmlspecialchars($config['db']['port']) . '</code></li><li>Database: <code>' . htmlspecialchars($config['db']['name']) . '</code></li><li>User: <code>' . htmlspecialchars($config['db']['user']) . '</code></li></ul></body></html>');
        }
        
        json_response(['error' => 'database_error', 'message' => 'Could not connect to database. Please check MySQL is running and credentials are correct.'], 500);
    }
    return $pdo;
}

/**
 * Create all database tables from schema and migrations
 * This function reads the schema.sql and migration files and executes them
 * Note: Does NOT create the database, only the tables
 */
function create_database_tables(): array
{
    $pdo = get_db_connection();
    $errors = [];
    $success = [];
    
    try {
        // Read schema.sql (main tables)
        $schemaFile = __DIR__ . '/../database/schema.sql';
        if (!file_exists($schemaFile)) {
            throw new Exception("Schema file not found: {$schemaFile}");
        }
        
        $schemaContent = file_get_contents($schemaFile);
        
        // Remove CREATE DATABASE and USE statements (we use the database from config)
        $schemaContent = preg_replace('/CREATE DATABASE[^;]+;/i', '', $schemaContent);
        $schemaContent = preg_replace('/USE\s+[^;]+;/i', '', $schemaContent);
        
        // Better SQL parsing - handle multi-line statements
        $schemaContent = preg_replace('/--.*$/m', '', $schemaContent); // Remove single-line comments
        $schemaContent = preg_replace('/\/\*.*?\*\//s', '', $schemaContent); // Remove multi-line comments
        
        // Split by semicolon, but be careful with JSON and strings
        $statements = [];
        $currentStatement = '';
        $inString = false;
        $stringChar = '';
        
        for ($i = 0; $i < strlen($schemaContent); $i++) {
            $char = $schemaContent[$i];
            
            if (!$inString && ($char === '"' || $char === "'" || $char === '`')) {
                $inString = true;
                $stringChar = $char;
            } elseif ($inString && $char === $stringChar && $schemaContent[$i - 1] !== '\\') {
                $inString = false;
            }
            
            $currentStatement .= $char;
            
            if (!$inString && $char === ';') {
                $stmt = trim($currentStatement);
                if (!empty($stmt) && strlen($stmt) > 10 && 
                    !preg_match('/^(SET|USE|CREATE DATABASE)/i', $stmt)) {
                    $statements[] = $stmt;
                }
                $currentStatement = '';
            }
        }
        
        $pdo->exec('SET FOREIGN_KEY_CHECKS = 0');
        
        foreach ($statements as $statement) {
            try {
                $pdo->exec($statement);
                if (preg_match('/CREATE TABLE/i', $statement)) {
                    preg_match('/CREATE TABLE\s+(?:IF NOT EXISTS\s+)?[`"]?(\w+)[`"]?/i', $statement, $matches);
                    if (!empty($matches[1])) {
                        $success[] = "Table '{$matches[1]}' created successfully";
                    }
                }
            } catch (PDOException $e) {
                // Ignore "table already exists" errors
                $errorMsg = $e->getMessage();
                if (strpos($errorMsg, 'already exists') === false && 
                    strpos($errorMsg, 'Duplicate') === false) {
                    $errors[] = "Error: " . substr($errorMsg, 0, 100);
                }
            }
        }
        
        $pdo->exec('SET FOREIGN_KEY_CHECKS = 1');
        
        // Execute migrations in order
        $migrations = [
            '001_add_security_features.sql',
            '002_prevent_cascade_deletes.sql',
            '003_pin_permissions.sql',
            '004_add_invoice_salary_permissions.sql'
        ];
        
        foreach ($migrations as $migrationFile) {
            $migrationPath = __DIR__ . '/../database/migrations/' . $migrationFile;
            if (!file_exists($migrationPath)) {
                continue;
            }
            
            $migrationContent = file_get_contents($migrationPath);
            
            // Remove comments
            $migrationContent = preg_replace('/--.*$/m', '', $migrationContent);
            $migrationContent = preg_replace('/\/\*.*?\*\//s', '', $migrationContent);
            
            // Split by semicolon, handling strings properly
            $migrationStatements = [];
            $currentStatement = '';
            $inString = false;
            $stringChar = '';
            
            for ($i = 0; $i < strlen($migrationContent); $i++) {
                $char = $migrationContent[$i];
                
                if (!$inString && ($char === '"' || $char === "'" || $char === '`')) {
                    $inString = true;
                    $stringChar = $char;
                } elseif ($inString && $char === $stringChar && $migrationContent[$i - 1] !== '\\') {
                    $inString = false;
                }
                
                $currentStatement .= $char;
                
                if (!$inString && $char === ';') {
                    $stmt = trim($currentStatement);
                    if (!empty($stmt) && strlen($stmt) > 10) {
                        $migrationStatements[] = $stmt;
                    }
                    $currentStatement = '';
                }
            }
            
            foreach ($migrationStatements as $statement) {
                try {
                    $pdo->exec($statement);
                } catch (PDOException $e) {
                    // Ignore "duplicate" or "already exists" errors for migrations
                    $errorMsg = $e->getMessage();
                    if (strpos($errorMsg, 'already exists') === false && 
                        strpos($errorMsg, 'Duplicate') === false &&
                        strpos($errorMsg, 'does not exist') === false &&
                        strpos($errorMsg, 'Unknown column') === false &&
                        strpos($errorMsg, 'Duplicate column') === false) {
                        $errors[] = "Migration {$migrationFile}: " . substr($errorMsg, 0, 100);
                    }
                }
            }
            
            $success[] = "Migration '{$migrationFile}' executed";
        }
        
    } catch (Exception $e) {
        $errors[] = $e->getMessage();
    }
    
    return [
        'success' => $success,
        'errors' => $errors
    ];
}
