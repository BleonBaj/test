<?php
/**
 * Script për të krijuar një përdorues admin të ri
 * Përdorim: php create_admin.php
 */

require_once __DIR__ . '/includes/db.php';
require_once __DIR__ . '/includes/helpers.php';

// Të dhënat e përdoruesit admin
$email = 'elonberisha1999@gmail.com';
$password = 'loniloni123';
$name = 'Administrator'; // Ose mund ta merrni si parametër

try {
    $pdo = get_db_connection();
    
    // Kontrollo nëse përdoruesi ekziston tashmë
    $stmt = $pdo->prepare('SELECT id FROM admins WHERE email = :email LIMIT 1');
    $stmt->execute(['email' => strtolower($email)]);
    $existing = $stmt->fetch();
    
    if ($existing) {
        echo "❌ Përdoruesi me email '$email' ekziston tashmë!\n";
        echo "Duke përditësuar fjalëkalimin...\n";
        
        // Përditëso fjalëkalimin
        $passwordHash = password_hash($password, PASSWORD_BCRYPT);
        $pinHash = password_hash($password, PASSWORD_BCRYPT); // Përdor të njëjtin password për PIN
        
        $updateStmt = $pdo->prepare('
            UPDATE admins 
            SET password_hash = :password_hash,
                management_pin_hash = :pin_hash,
                failed_login_attempts = 0,
                locked_until = NULL
            WHERE email = :email
        ');
        $updateStmt->execute([
            'password_hash' => $passwordHash,
            'pin_hash' => $pinHash,
            'email' => strtolower($email)
        ]);
        
        echo "✅ Fjalëkalimi u përditësua me sukses!\n";
        echo "Email: $email\n";
        echo "Password: $password\n";
        exit(0);
    }
    
    // Gjenero public_id të ri
    $publicId = next_public_id($pdo, 'admins', 'A', 'public_id');
    
    // Gjenero username nga email (merr pjesën para @)
    $username = strtolower(explode('@', $email)[0]);
    
    // Hash password dhe management PIN
    $passwordHash = password_hash($password, PASSWORD_BCRYPT);
    $pinHash = password_hash($password, PASSWORD_BCRYPT); // Përdor të njëjtin password për PIN
    
    // Shto përdoruesin admin
    $insertStmt = $pdo->prepare('
        INSERT INTO admins (
            public_id, username, name, email, password_hash, management_pin_hash,
            two_factor_enabled, two_factor_secret, failed_login_attempts, locked_until
        ) VALUES (
            :public_id, :username, :name, :email, :password_hash, :pin_hash,
            0, NULL, 0, NULL
        )
    ');
    
    $insertStmt->execute([
        'public_id' => $publicId,
        'username' => $username,
        'name' => $name,
        'email' => strtolower($email),
        'password_hash' => $passwordHash,
        'pin_hash' => $pinHash
    ]);
    
    echo "✅ Përdoruesi admin u krijua me sukses!\n";
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n";
    echo "Public ID: $publicId\n";
    echo "Username: $username\n";
    echo "Name: $name\n";
    echo "Email: $email\n";
    echo "Password: $password\n";
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n";
    echo "\nTani mund të hyni në sistem me këto kredenciale.\n";
    
} catch (PDOException $e) {
    echo "❌ Gabim në bazën e të dhënave: " . $e->getMessage() . "\n";
    exit(1);
} catch (Exception $e) {
    echo "❌ Gabim: " . $e->getMessage() . "\n";
    exit(1);
}

