<?php
/**
 * Temporary seed script to insert demo data so you can preview all features.
 *
 * Usage (from project root):
 *   php seed_sample_data.php
 *
 * This version clears core tables first (safe for demo) and loads richer data.
 * Do NOT run on production data.
 */
require_once __DIR__ . '/../includes/db.php';

// Get PDO connection
$conn = get_db_connection();

try {
    // NOTE: TRUNCATE does implicit commits in MySQL. To avoid breaking transactions,
    // we stay in autocommit mode and use DELETE + auto_increment reset.
    $conn->exec('SET FOREIGN_KEY_CHECKS = 0');
    $tables = [
        'salary_statements',
        'student_invoices',
        'class_students',
        'class_professors',
        'students',
        'classes',
        'courses',
        'professors'
    ];
    foreach ($tables as $tbl) {
        $conn->exec("DELETE FROM {$tbl}");
        $conn->exec("ALTER TABLE {$tbl} AUTO_INCREMENT = 1");
    }
    $conn->exec('SET FOREIGN_KEY_CHECKS = 1');

    // Professors (4)
    $conn->exec("
        INSERT INTO professors (public_id, first_name, last_name, email, phone, address, education, biography, salary_type, base_salary)
        VALUES 
        ('PRF-001', 'Arben', 'Krasniqi', 'arben@example.com', '+35567111111', 'Rr. Dëshmorët, Tiranë', 'MSc Informatikë', 'Ekspert në zhvillim web', 'fixed', 1800),
        ('PRF-002', 'Elira', 'Dervishi', 'elira@example.com', '+35567222222', 'Rr. Elbasani, Tiranë', 'MSc Matematikë', 'Pedagoge dhe mentore', 'fixed', 2000),
        ('PRF-003', 'Gent', 'Mema', 'gent@example.com', '+35567333333', 'Durres', 'BSc IT', 'Instruktor laboratorësh', 'per-class', 0),
        ('PRF-004', 'Ina', 'Pasha', 'ina@example.com', '+35567444444', 'Shkodër', 'MSc Data Science', 'Specialiste analitike', 'fixed', 2100)
    ");

    // Courses (3)
    $conn->exec("
        INSERT INTO courses (public_id, name, price, description)
        VALUES
        ('CRS-001', 'Programim Web', 1200, 'HTML, CSS, JS, PHP'),
        ('CRS-002', 'Algoritme & DS', 1000, 'Struktura të dhënash dhe algoritme bazë'),
        ('CRS-003', 'Data Science', 1500, 'Python, Pandas, Vizualizim, ML bazik')
    ");

    // Classes (4)
    $conn->exec("
        INSERT INTO classes (public_id, course_id, name, level, start_date, end_date, monthly_price, professor_class_pay, schedule)
        VALUES
        ('CLS-001', (SELECT id FROM courses WHERE public_id='CRS-001'), 'Web-A1', 'Fillestar', '2025-01-10', '2025-04-30', 150, 200, '[{\"day\":\"mon\",\"start\":\"10:00\",\"end\":\"12:00\"},{\"day\":\"wed\",\"start\":\"10:00\",\"end\":\"12:00\"}]'),
        ('CLS-002', (SELECT id FROM courses WHERE public_id='CRS-002'), 'Algo-B1', 'Mesatar', '2025-02-01', '2025-05-30', 140, 180, '[{\"day\":\"tue\",\"start\":\"14:00\",\"end\":\"16:00\"},{\"day\":\"thu\",\"start\":\"14:00\",\"end\":\"16:00\"}]'),
        ('CLS-003', (SELECT id FROM courses WHERE public_id='CRS-003'), 'DS-C1', 'Mesatar', '2025-03-01', '2025-06-30', 200, 230, '[{\"day\":\"sat\",\"start\":\"09:00\",\"end\":\"12:00\"}]'),
        ('CLS-004', (SELECT id FROM courses WHERE public_id='CRS-001'), 'Web-A2', 'Mesatar', '2025-02-15', '2025-06-15', 160, 190, '[{\"day\":\"fri\",\"start\":\"17:00\",\"end\":\"19:00\"}]')
    ");

    // Link professors to classes
    $conn->exec("
        INSERT INTO class_professors (class_id, professor_id, pay_amount)
        VALUES
        ((SELECT id FROM classes WHERE public_id='CLS-001'), (SELECT id FROM professors WHERE public_id='PRF-001'), 200),
        ((SELECT id FROM classes WHERE public_id='CLS-002'), (SELECT id FROM professors WHERE public_id='PRF-002'), 180),
        ((SELECT id FROM classes WHERE public_id='CLS-003'), (SELECT id FROM professors WHERE public_id='PRF-004'), 230),
        ((SELECT id FROM classes WHERE public_id='CLS-004'), (SELECT id FROM professors WHERE public_id='PRF-003'), 190)
    ");

    // Students (8)
    $conn->exec("
        INSERT INTO students (public_id, first_name, last_name, national_id, phone, registration_date, address)
        VALUES
        ('STD-001', 'Blerim', 'Hoxha', 'J12345678', '+35568111111', '2025-01-05', 'Tiranë'),
        ('STD-002', 'Sara', 'Leka', 'J87654321', '+35568222222', '2025-01-12', 'Durrës'),
        ('STD-003', 'Noel', 'Shehu', 'J99887766', '+35568333333', '2025-02-01', 'Shkodër'),
        ('STD-004', 'Arta', 'Balla', 'J11112222', '+35568444444', '2025-02-10', 'Vlorë'),
        ('STD-005', 'Kejt', 'Deda', 'J33334444', '+35568555555', '2025-02-18', 'Tiranë'),
        ('STD-006', 'Mira', 'Poro', 'J55556666', '+35568666666', '2025-03-01', 'Tiranë'),
        ('STD-007', 'Endrit', 'Duro', 'J77778888', '+35568777777', '2025-03-05', 'Korçë'),
        ('STD-008', 'Elson', 'Hysa', 'J99990000', '+35568888888', '2025-03-10', 'Elbasan')
    ");

    // Enroll students to classes
    $conn->exec("
        INSERT INTO class_students (class_id, student_id)
        VALUES
        ((SELECT id FROM classes WHERE public_id='CLS-001'), (SELECT id FROM students WHERE public_id='STD-001')),
        ((SELECT id FROM classes WHERE public_id='CLS-001'), (SELECT id FROM students WHERE public_id='STD-002')),
        ((SELECT id FROM classes WHERE public_id='CLS-001'), (SELECT id FROM students WHERE public_id='STD-004')),
        ((SELECT id FROM classes WHERE public_id='CLS-002'), (SELECT id FROM students WHERE public_id='STD-003')),
        ((SELECT id FROM classes WHERE public_id='CLS-002'), (SELECT id FROM students WHERE public_id='STD-005')),
        ((SELECT id FROM classes WHERE public_id='CLS-003'), (SELECT id FROM students WHERE public_id='STD-006')),
        ((SELECT id FROM classes WHERE public_id='CLS-003'), (SELECT id FROM students WHERE public_id='STD-007')),
        ((SELECT id FROM classes WHERE public_id='CLS-004'), (SELECT id FROM students WHERE public_id='STD-008')),
        ((SELECT id FROM classes WHERE public_id='CLS-004'), (SELECT id FROM students WHERE public_id='STD-001'))
    ");

    // Student invoices (mix paid/partial/due, multiple months)
    $conn->exec("
        INSERT INTO student_invoices (public_id, student_id, class_id, plan_month, due_amount, paid_amount, status, created_at, confirmed_at)
        VALUES
        ('INV-001', (SELECT id FROM students WHERE public_id='STD-001'), (SELECT id FROM classes WHERE public_id='CLS-001'), '2025-01', 150, 150, 'paid', NOW(), NOW()),
        ('INV-002', (SELECT id FROM students WHERE public_id='STD-002'), (SELECT id FROM classes WHERE public_id='CLS-001'), '2025-01', 150, 100, 'partial', NOW(), NULL),
        ('INV-003', (SELECT id FROM students WHERE public_id='STD-003'), (SELECT id FROM classes WHERE public_id='CLS-002'), '2025-02', 140, 0, 'due', NOW(), NULL),
        ('INV-004', (SELECT id FROM students WHERE public_id='STD-004'), (SELECT id FROM classes WHERE public_id='CLS-001'), '2025-02', 150, 150, 'paid', NOW(), NOW()),
        ('INV-005', (SELECT id FROM students WHERE public_id='STD-005'), (SELECT id FROM classes WHERE public_id='CLS-002'), '2025-03', 140, 70, 'partial', NOW(), NULL),
        ('INV-006', (SELECT id FROM students WHERE public_id='STD-006'), (SELECT id FROM classes WHERE public_id='CLS-003'), '2025-03', 200, 0, 'due', NOW(), NULL),
        ('INV-007', (SELECT id FROM students WHERE public_id='STD-007'), (SELECT id FROM classes WHERE public_id='CLS-003'), '2025-03', 200, 200, 'paid', NOW(), NOW()),
        ('INV-008', (SELECT id FROM students WHERE public_id='STD-008'), (SELECT id FROM classes WHERE public_id='CLS-004'), '2025-03', 160, 80, 'partial', NOW(), NULL),
        ('INV-009', (SELECT id FROM students WHERE public_id='STD-001'), (SELECT id FROM classes WHERE public_id='CLS-004'), '2025-04', 160, 0, 'due', NOW(), NULL)
    ");

    // Salaries (mix paid/partial)
    $conn->exec("
        INSERT INTO salary_statements (public_id, professor_id, class_id, pay_month, base_amount, advances, paid_amount, status, created_at, confirmed_at)
        VALUES
        ('SAL-001', (SELECT id FROM professors WHERE public_id='PRF-001'), (SELECT id FROM classes WHERE public_id='CLS-001'), '2025-01', 200, 50, 150, 'partial', NOW(), NULL),
        ('SAL-002', (SELECT id FROM professors WHERE public_id='PRF-002'), (SELECT id FROM classes WHERE public_id='CLS-002'), '2025-02', 180, 0, 180, 'paid', NOW(), NOW()),
        ('SAL-003', (SELECT id FROM professors WHERE public_id='PRF-004'), (SELECT id FROM classes WHERE public_id='CLS-003'), '2025-03', 230, 30, 150, 'partial', NOW(), NULL),
        ('SAL-004', (SELECT id FROM professors WHERE public_id='PRF-003'), (SELECT id FROM classes WHERE public_id='CLS-004'), '2025-03', 190, 0, 190, 'paid', NOW(), NOW())
    ");

    echo "✅ Seed completed. Tables were cleared and demo data added.\n";
} catch (Exception $e) {
    echo "❌ Seed failed: " . $e->getMessage() . "\n";
    exit(1);
}

