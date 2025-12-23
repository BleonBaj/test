<?php

require_once __DIR__ . '/db.php';
require_once __DIR__ . '/helpers.php';
require_once __DIR__ . '/auth.php';
require_once __DIR__ . '/helpers.php';

// --- PIN requirement helpers ---
function get_pin_requirements(): array {
    // settings.security.pin_requirements is expected to be a JSON object mapping action_key => bool
    try {
        $settings = get_settings();
        $raw = $settings['security']['pin_requirements'] ?? '';
        if (is_string($raw) && $raw !== '') {
            $decoded = json_decode($raw, true);
            if (json_last_error() === JSON_ERROR_NONE && is_array($decoded)) {
                return $decoded;
            }
        } elseif (is_array($raw)) {
            return $raw;
        }
    } catch (Throwable $_) {
        // ignore
    }
    return [];
}

function is_pin_required(string $actionKey): bool {
    // Check new permissions system first
    require_once __DIR__ . '/permissions.php';
    
    // Parse action key (e.g., "course.create" -> entity="course", action="create")
    $parts = explode('.', $actionKey);
    if (count($parts) >= 2) {
        $entityType = $parts[0];
        $actionType = $parts[1];
        
        // Map action types
        if (in_array($actionType, ['create', 'update', 'delete'])) {
            return is_pin_required_for_action($entityType, $actionType);
        }
    }
    
    // Fallback to old settings system
    $map = get_pin_requirements();
    return (bool) ($map[$actionKey] ?? false);
}

function maybe_require_pin(array $admin, string $pin, string $actionKey, ?string $entityType = null, ?string $entityId = null): void {
    if (is_pin_required($actionKey)) {
        // PIN is required - must be provided and valid
        if (empty($pin) || trim($pin) === '') {
            json_response(['error' => 'missing_pin', 'message' => 'PIN is required for this action'], 403);
        }
        ensure_management_pin($admin, $pin, $actionKey, $entityType, $entityId);
    }
}

// Utility lookups
function get_course_by_public_id(string $publicId): ?array {
    $pdo = get_db_connection();
    $stmt = $pdo->prepare('SELECT * FROM courses WHERE public_id = :pid');
    $stmt->execute(['pid' => $publicId]);
    $row = $stmt->fetch();
    return $row ?: null;
}

function list_courses(): array {
    $pdo = get_db_connection();
    return $pdo->query('SELECT * FROM courses ORDER BY updated_at DESC')->fetchAll();
}

function create_course(array $admin, array $payload): array {
    maybe_require_pin($admin, (string) ($payload['pin'] ?? ''), 'course.create', 'course', null);
    $pdo = get_db_connection();
    $public = next_public_id($pdo, 'courses', 'C');
    $stmt = $pdo->prepare('INSERT INTO courses (public_id, name, price, description) VALUES (:public_id, :name, :price, :description)');
    $stmt->execute([
        'public_id' => $public,
        'name' => $payload['name'] ?? '',
        'price' => $payload['price'] ?? 0,
        'description' => $payload['description'] ?? null,
    ]);
    record_activity((int) $admin['id'], 'course.create', ['description' => 'Created course ' . $public]);
    return get_course_by_public_id($public);
}

function update_course(array $admin, string $publicId, array $payload): array {
    maybe_require_pin($admin, (string) ($payload['pin'] ?? ''), 'course.update', 'course', $publicId);
    $pdo = get_db_connection();
    // Build partial update: only update fields that are provided in payload
    $sets = [];
    $params = ['public_id' => $publicId];
    $map = [
        'name' => 'name',
        'price' => 'price',
        'description' => 'description',
    ];
    foreach ($map as $key => $col) {
        if (array_key_exists($key, $payload)) {
            $sets[] = "$col = :$col";
            $params[$col] = $payload[$key];
        }
    }
    if ($sets) {
        $sql = 'UPDATE courses SET ' . implode(', ', $sets) . ' WHERE public_id = :public_id';
        $stmt = $pdo->prepare($sql);
        $stmt->execute($params);
    }
    record_activity((int) $admin['id'], 'course.update', ['description' => 'Updated course ' . $publicId]);
    return get_course_by_public_id($publicId);
}

function delete_course(array $admin, string $publicId, string $pin): void {
    maybe_require_pin($admin, $pin, 'course.delete', 'course', $publicId);
    $pdo = get_db_connection();
    
    // Check if course exists
    $course = get_course_by_public_id($publicId);
    if (!$course) {
        json_response(['error' => 'not_found', 'message' => 'Course not found'], 404);
    }
    
    $courseId = (int) $course['id'];
    
    // Start transaction
    $pdo->beginTransaction();
    
    try {
        // Get all classes associated with this course
        $stmt = $pdo->prepare('SELECT id, public_id FROM classes WHERE course_id = :cid');
        $stmt->execute(['cid' => $courseId]);
        $classes = $stmt->fetchAll();
        
        // Delete each class and its dependencies
        foreach ($classes as $class) {
            $classId = (int) $class['id'];
            
            // Delete class_students
            $pdo->prepare('DELETE FROM class_students WHERE class_id = :cid')->execute(['cid' => $classId]);
            
            // Delete class_professors
            $pdo->prepare('DELETE FROM class_professors WHERE class_id = :cid')->execute(['cid' => $classId]);
            
            // Delete student_invoices
            $pdo->prepare('DELETE FROM student_invoices WHERE class_id = :cid')->execute(['cid' => $classId]);
            
            // Delete class_payment_plan
            $pdo->prepare('DELETE FROM class_payment_plan WHERE class_id = :cid')->execute(['cid' => $classId]);
            
            // Delete salary_statements (class_id will be set to NULL, but we delete them if they reference this class)
            $pdo->prepare('DELETE FROM salary_statements WHERE class_id = :cid')->execute(['cid' => $classId]);
            
            // Delete the class itself
            $pdo->prepare('DELETE FROM classes WHERE id = :cid')->execute(['cid' => $classId]);
        }
        
        // Now delete the course
        $stmt = $pdo->prepare('DELETE FROM courses WHERE public_id = :public_id');
        $stmt->execute(['public_id' => $publicId]);
        
        // Commit transaction
        $pdo->commit();
        
        record_activity((int) $admin['id'], 'course.delete', ['description' => 'Deleted course ' . $publicId . ' and all associated classes']);
    } catch (PDOException $e) {
        $pdo->rollBack();
        error_log('Error deleting course: ' . $e->getMessage());
        json_response([
            'error' => 'database_error',
            'message' => 'Failed to delete course: ' . $e->getMessage()
        ], 500);
    }
}

// Minimal pass-throughs for lists
function list_students(): array { return get_db_connection()->query('SELECT * FROM students ORDER BY created_at DESC')->fetchAll(); }
function list_professors(): array {
    $pdo = get_db_connection();
    // Order robustly even if created_at is missing/null
    try {
        return $pdo->query('SELECT * FROM professors ORDER BY created_at DESC')->fetchAll();
    } catch (Throwable $_) {
        return $pdo->query('SELECT * FROM professors ORDER BY id DESC')->fetchAll();
    }
}

function list_classes(): array {
    $pdo = get_db_connection();
    $rows = $pdo->query('SELECT * FROM classes ORDER BY created_at DESC')->fetchAll();
    // Prepare helper to fetch course public id
    $stmtCourse = $pdo->prepare('SELECT public_id, name FROM courses WHERE id = :id');
    // Attach relations if available
    foreach ($rows as &$row) {
        // include course_public_id for frontend prefill
        $courseId = (int) ($row['course_id'] ?? 0);
        if ($courseId) {
            $stmtCourse->execute(['id' => $courseId]);
            $course = $stmtCourse->fetch();
            $row['course_public_id'] = (string) ($course['public_id'] ?? '');
            $row['course_name'] = (string) ($course['name'] ?? '');
        } else {
            $row['course_public_id'] = '';
            $row['course_name'] = '';
        }
        $cid = (int) $row['id'];
    $hasPay = table_has_column($pdo, 'class_professors', 'pay_amount');
    $profs = $pdo->prepare('SELECT p.public_id, p.first_name, p.last_name' . ($hasPay ? ', cp.pay_amount' : '') . ' FROM class_professors cp JOIN professors p ON p.id = cp.professor_id WHERE cp.class_id = :id');
        $profs->execute(['id' => $cid]);
        $row['professors'] = $profs->fetchAll();

    $studs = $pdo->prepare('SELECT s.public_id, s.first_name, s.last_name, cs.monthly_fee FROM class_students cs JOIN students s ON s.id = cs.student_id WHERE cs.class_id = :id');
        $studs->execute(['id' => $cid]);
        $row['students'] = $studs->fetchAll();

        $plan = $pdo->prepare('SELECT plan_month, due_amount, due_date, notes FROM class_payment_plan WHERE class_id = :id ORDER BY plan_month');
        $plan->execute(['id' => $cid]);
        $row['payment_plan'] = $plan->fetchAll();
    }
    return $rows;
}

// Payments and salaries (list only for preview)
function list_invoices(): array {
    $pdo = get_db_connection();
    $rows = $pdo->query('SELECT si.*, c.public_id AS class_public_id, s.public_id AS student_public_id FROM student_invoices si JOIN classes c ON c.id = si.class_id JOIN students s ON s.id = si.student_id ORDER BY si.created_at DESC')->fetchAll();
    // Backward compatibility: if tax column missing or empty but notes contains JSON with tax, project it into the row
    foreach ($rows as &$r) {
        if (!isset($r['tax']) || $r['tax'] === '' || $r['tax'] === null) {
            $notes = (string) ($r['notes'] ?? '');
            if ($notes !== '') {
                $parsed = json_decode($notes, true);
                if (json_last_error() === JSON_ERROR_NONE && is_array($parsed) && isset($parsed['tax'])) {
                    $r['tax'] = $parsed['tax'];
                }
            }
        }
    }
    return $rows;
}
function list_salaries(): array {
    $pdo = get_db_connection();
    try {
        return $pdo->query('SELECT ss.*, p.public_id AS professor_public_id, c.public_id AS class_public_id FROM salary_statements ss JOIN professors p ON p.id = ss.professor_id LEFT JOIN classes c ON c.id = ss.class_id ORDER BY ss.created_at DESC')->fetchAll();
    } catch (Throwable $_) {
        return $pdo->query('SELECT ss.*, p.public_id AS professor_public_id, c.public_id AS class_public_id FROM salary_statements ss JOIN professors p ON p.id = ss.professor_id LEFT JOIN classes c ON c.id = ss.class_id ORDER BY ss.id DESC')->fetchAll();
    }
}

// Settings
function get_settings(): array
{
    $pdo = get_db_connection();
    $stmt = $pdo->query('SELECT settings_group, setting_key, setting_value FROM settings ORDER BY settings_group, setting_key');
    $rows = $stmt->fetchAll();
    $grouped = [];
    foreach ($rows as $row) {
        $grouped[$row['settings_group']][$row['setting_key']] = $row['setting_value'];
    }
    return $grouped;
}

// --- Registrations CRUD: classes, students, professors ---

function create_class(array $admin, array $payload): array {
    maybe_require_pin($admin, (string) ($payload['pin'] ?? ''), 'class.create', 'class', null);
    $pdo = get_db_connection();
    $coursePublic = (string) ($payload['course_public_id'] ?? '');
    if (empty($coursePublic)) {
        json_response(['error' => 'invalid_course', 'message' => 'Course is required'], 400);
    }
    $courseId = find_internal_id_by_public($pdo, 'courses', $coursePublic);
    if (!$courseId) {
        json_response(['error' => 'invalid_course', 'message' => 'Selected course does not exist'], 400);
    }

    $public = next_public_id($pdo, 'classes', 'CL');
    $schedule = isset($payload['schedule']) ? json_encode(array_values((array) $payload['schedule']), JSON_UNESCAPED_UNICODE) : null;

    // Include description if column exists
    try {
        $columns = $pdo->query('SHOW COLUMNS FROM classes')->fetchAll();
    } catch (PDOException $e) {
        error_log('Failed to check columns: ' . $e->getMessage());
        throw new Exception('Failed to check database columns: ' . $e->getMessage());
    }
    $hasDescription = false;
    foreach ($columns as $col) { if (isset($col['Field']) && $col['Field'] === 'description') { $hasDescription = true; break; } }

    // Detect optional professor_class_pay column
    $hasProfClassPay = table_has_column($pdo, 'classes', 'professor_class_pay');
    
    // Build base parameters that are always used
    $params = [
        'pid' => $public,
        'cid' => $courseId,
        'name' => $payload['name'] ?? '',
        'level' => $payload['level'] ?? '',
        'start' => $payload['start_date'] ?? date('Y-m-d'),
        'end' => $payload['end_date'] ?? null,
        'schedule' => $schedule,
        'price' => isset($payload['monthly_price']) && $payload['monthly_price'] !== '' ? (float) $payload['monthly_price'] : 0,
    ];
    
    // Prepare query based on which optional columns exist
    if ($hasDescription && $hasProfClassPay) {
        $stmt = $pdo->prepare('INSERT INTO classes (public_id, course_id, name, level, start_date, end_date, schedule, monthly_price, professor_class_pay, description) VALUES (:pid, :cid, :name, :level, :start, :end, :schedule, :price, :prof_pay, :desc)');
        $params['prof_pay'] = $payload['professor_class_pay'] ?? null;
        $params['desc'] = $payload['description'] ?? null;
    } elseif ($hasDescription && !$hasProfClassPay) {
        $stmt = $pdo->prepare('INSERT INTO classes (public_id, course_id, name, level, start_date, end_date, schedule, monthly_price, description) VALUES (:pid, :cid, :name, :level, :start, :end, :schedule, :price, :desc)');
        $params['desc'] = $payload['description'] ?? null;
    } elseif (!$hasDescription && $hasProfClassPay) {
        $stmt = $pdo->prepare('INSERT INTO classes (public_id, course_id, name, level, start_date, end_date, schedule, monthly_price, professor_class_pay) VALUES (:pid, :cid, :name, :level, :start, :end, :schedule, :price, :prof_pay)');
        $params['prof_pay'] = $payload['professor_class_pay'] ?? null;
    } else {
        $stmt = $pdo->prepare('INSERT INTO classes (public_id, course_id, name, level, start_date, end_date, schedule, monthly_price) VALUES (:pid, :cid, :name, :level, :start, :end, :schedule, :price)');
    }
    
    try {
        $stmt->execute($params);
    } catch (PDOException $e) {
        $errorMsg = $e->getMessage();
        $errorCode = $e->getCode();
        error_log('Class INSERT error: ' . $errorMsg . ' | Code: ' . $errorCode);
        error_log('SQL State: ' . $e->getCode());
        error_log('Attempted insert data: public_id=' . $public . ', course_id=' . $courseId);
        
        // Check for duplicate public_id
        if ($e->getCode() == 23000 || strpos($errorMsg, 'Duplicate entry') !== false) {
            json_response(['error' => 'duplicate_class', 'message' => 'A class with this ID already exists'], 409);
        }
        // Check for foreign key constraint
        if (strpos($errorMsg, 'foreign key constraint') !== false || strpos($errorMsg, 'Cannot add or update') !== false) {
            json_response(['error' => 'invalid_course', 'message' => 'Selected course is invalid'], 400);
        }
        throw $e; // Re-throw to be caught by API handler
    }

    $classId = (int) $pdo->lastInsertId();
    if ($classId === 0) {
        error_log('Class creation failed: lastInsertId returned 0');
        json_response(['error' => 'database_error', 'message' => 'Failed to create class'], 500);
    }

    // Relations
    $hasPay = table_has_column($pdo, 'class_professors', 'pay_amount');
    $hasRole = table_has_column($pdo, 'class_professors', 'role');
    $getProfType = $pdo->prepare('SELECT salary_type FROM professors WHERE id = :pid');
    if ($hasPay && $hasRole) {
        $stmtProf = $pdo->prepare('INSERT IGNORE INTO class_professors (class_id, professor_id, role, pay_amount) VALUES (:cid, :pid, NULL, :pay)');
    } elseif ($hasPay && !$hasRole) {
        $stmtProf = $pdo->prepare('INSERT IGNORE INTO class_professors (class_id, professor_id, pay_amount) VALUES (:cid, :pid, :pay)');
    } elseif (!$hasPay && $hasRole) {
        $stmtProf = $pdo->prepare('INSERT IGNORE INTO class_professors (class_id, professor_id, role) VALUES (:cid, :pid, NULL)');
    } else {
        $stmtProf = $pdo->prepare('INSERT IGNORE INTO class_professors (class_id, professor_id) VALUES (:cid, :pid)');
    }
    foreach ((array) ($payload['professors'] ?? []) as $profPublic) {
        $pid = find_internal_id_by_public($pdo, 'professors', (string) $profPublic);
        if ($pid) {
            $pay = null;
            if ($hasPay) {
                // Only assign pay_amount if professor is per-class (DB monthly is 'fixed')
                $getProfType->execute(['pid' => $pid]);
                $stype = (string) ($getProfType->fetchColumn() ?? '');
                if ($stype !== 'fixed') {
                    $pay = $payload['professor_class_pay'] ?? null;
                }
                $stmtProf->execute(['cid' => $classId, 'pid' => $pid, 'pay' => $pay]);
                // If row existed already (INSERT IGNORE did nothing) but we have a pay to set, update it explicitly
                if ($stmtProf->rowCount() === 0 && $pay !== null) {
                    $upd = $pdo->prepare('UPDATE class_professors cp JOIN professors p ON p.id = cp.professor_id SET cp.pay_amount = :pay WHERE cp.class_id = :cid AND cp.professor_id = :pid AND p.salary_type <> "fixed"');
                    $upd->execute(['pay' => $pay, 'cid' => $classId, 'pid' => $pid]);
                }
            } else {
                $stmtProf->execute(['cid' => $classId, 'pid' => $pid]);
            }
        }
    }

    $stmtStud = $pdo->prepare('INSERT IGNORE INTO class_students (class_id, student_id, join_date, status, monthly_fee) VALUES (:cid, :sid, :join, "active", :fee)');
    foreach ((array) ($payload['students'] ?? []) as $stuPublic) {
        $sid = find_internal_id_by_public($pdo, 'students', (string) $stuPublic);
        if ($sid) $stmtStud->execute(['cid' => $classId, 'sid' => $sid, 'join' => date('Y-m-d'), 'fee' => $payload['monthly_price'] ?? 0]);
    }

    // Payment plan
    $stmtPlan = $pdo->prepare('INSERT INTO class_payment_plan (class_id, plan_month, due_amount, due_date, notes) VALUES (:cid, :m, :amt, :due, :notes) ON DUPLICATE KEY UPDATE due_amount = VALUES(due_amount), due_date = VALUES(due_date), notes = VALUES(notes)');
    foreach ((array) ($payload['payment_plan'] ?? []) as $plan) {
        if (!isset($plan['plan_month'])) continue;
        $stmtPlan->execute([
            'cid' => $classId,
            'm' => $plan['plan_month'],
            'amt' => $plan['due_amount'] ?? ($payload['monthly_price'] ?? 0),
            'due' => $plan['due_date'] ?? null,
            'notes' => $plan['notes'] ?? null,
        ]);
    }

    record_activity((int) $admin['id'], 'class.create', ['description' => 'Created class ' . $public]);
    
    $createdClass = get_class_by_public_id($public);
    if (!$createdClass) {
        error_log('Class created but could not be retrieved: ' . $public);
        json_response(['error' => 'database_error', 'message' => 'Class created but could not be retrieved'], 500);
    }
    return $createdClass;
}

function get_class_by_public_id(string $publicId): ?array {
    $pdo = get_db_connection();
    $stmt = $pdo->prepare('SELECT * FROM classes WHERE public_id = :pid');
    $stmt->execute(['pid' => $publicId]);
    $row = $stmt->fetch();
    if (!$row) return null;
    // include course_public_id
    $courseId = (int) ($row['course_id'] ?? 0);
    if ($courseId) {
        $cStmt = $pdo->prepare('SELECT public_id, name FROM courses WHERE id = :id');
        $cStmt->execute(['id' => $courseId]);
        $course = $cStmt->fetch();
        $row['course_public_id'] = (string) ($course['public_id'] ?? '');
        $row['course_name'] = (string) ($course['name'] ?? '');
    } else {
        $row['course_public_id'] = '';
        $row['course_name'] = '';
    }
    // hydrate relations similar to list
    $cid = (int) $row['id'];
    // Include pay_amount if the column exists to support per-class pay visibility
    $hasPay = table_has_column($pdo, 'class_professors', 'pay_amount');
    $sqlProfs = 'SELECT p.public_id, p.first_name, p.last_name' . ($hasPay ? ', cp.pay_amount' : '') . ' FROM class_professors cp JOIN professors p ON p.id = cp.professor_id WHERE cp.class_id = :id';
    $profs = $pdo->prepare($sqlProfs);
    $profs->execute(['id' => $cid]);
    $row['professors'] = $profs->fetchAll();
    $studs = $pdo->prepare('SELECT s.public_id, s.first_name, s.last_name, cs.monthly_fee FROM class_students cs JOIN students s ON s.id = cs.student_id WHERE cs.class_id = :id');
    $studs->execute(['id' => $cid]);
    $row['students'] = $studs->fetchAll();
    $plan = $pdo->prepare('SELECT plan_month, due_amount, due_date, notes FROM class_payment_plan WHERE class_id = :id ORDER BY plan_month');
    $plan->execute(['id' => $cid]);
    $row['payment_plan'] = $plan->fetchAll();

    // include invoices/payments for this class
    // Include notes column only if it exists to avoid SQL errors
        $hasNotes = table_has_column($pdo, 'student_invoices', 'notes');
        $hasTax = table_has_column($pdo, 'student_invoices', 'tax');
        $sqlInv = 'SELECT si.public_id, s.public_id AS student_public_id, si.plan_month, si.due_amount, si.paid_amount, si.status, si.confirmed_at, si.confirmed_by'
            . ($hasTax ? ', si.tax' : '')
            . ($hasNotes ? ', si.notes' : '')
            . ' FROM student_invoices si JOIN students s ON s.id = si.student_id WHERE si.class_id = :id ORDER BY si.plan_month DESC, si.created_at DESC';
    $inv = $pdo->prepare($sqlInv);
    $inv->execute(['id' => $cid]);
    $row['invoices'] = $inv->fetchAll();
    return $row;
}

function update_class(array $admin, string $publicId, array $payload): array {
    maybe_require_pin($admin, (string) ($payload['pin'] ?? ''), 'class.update', 'class', $publicId);
    $pdo = get_db_connection();
    $id = find_internal_id_by_public($pdo, 'classes', $publicId);
    if (!$id) json_response(['error' => 'not_found'], 404);

    // Build partial update for class
    $sets = [];
    $params = ['id' => $id];
    if (array_key_exists('course_public_id', $payload)) {
        $coursePublic = (string) ($payload['course_public_id'] ?? '');
        if ($coursePublic !== '') {
            $courseId = find_internal_id_by_public($pdo, 'courses', $coursePublic);
            $sets[] = 'course_id = :cid';
            $params['cid'] = $courseId;
        }
        // if empty string provided, ignore to avoid clearing course
    }
    foreach (['name','level','start_date','end_date','monthly_price','description','professor_class_pay'] as $key) {
        if (array_key_exists($key, $payload)) {
            $val = $payload[$key];
            if ($val === '' || $val === null) continue; // injoro vlerat bosh
            $col = $key === 'monthly_price' ? 'monthly_price' : ($key === 'start_date' ? 'start_date' : ($key === 'end_date' ? 'end_date' : $key));
            $sets[] = "$col = :$col";
            $params[$col] = $val;
        }
    }
    if (array_key_exists('schedule', $payload)) {
        $sets[] = 'schedule = :schedule';
        $params['schedule'] = isset($payload['schedule']) ? json_encode(array_values((array) $payload['schedule']), JSON_UNESCAPED_UNICODE) : null;
    }
    if ($sets) {
        $sql = 'UPDATE classes SET ' . implode(', ', $sets) . ' WHERE id = :id';
        $stmt = $pdo->prepare($sql);
        $stmt->execute($params);
    }

    // Relations update: merge additions by default, support explicit removals
    if (array_key_exists('professors', $payload)) {
        // Add new professors without wiping existing
        $hasPay = table_has_column($pdo, 'class_professors', 'pay_amount');
        $hasRole = table_has_column($pdo, 'class_professors', 'role');
        $getProfType = $pdo->prepare('SELECT salary_type FROM professors WHERE id = :pid');
        if ($hasPay && $hasRole) {
            $stmtProf = $pdo->prepare('INSERT IGNORE INTO class_professors (class_id, professor_id, role, pay_amount) VALUES (:cid, :pid, NULL, :pay)');
        } elseif ($hasPay && !$hasRole) {
            $stmtProf = $pdo->prepare('INSERT IGNORE INTO class_professors (class_id, professor_id, pay_amount) VALUES (:cid, :pid, :pay)');
        } elseif (!$hasPay && $hasRole) {
            $stmtProf = $pdo->prepare('INSERT IGNORE INTO class_professors (class_id, professor_id, role) VALUES (:cid, :pid, NULL)');
        } else {
            $stmtProf = $pdo->prepare('INSERT IGNORE INTO class_professors (class_id, professor_id) VALUES (:cid, :pid)');
        }
        foreach ((array) $payload['professors'] as $profPublic) {
            $pid = find_internal_id_by_public($pdo, 'professors', (string) $profPublic);
            if ($pid) {
                $pay = null;
                if ($hasPay) {
                    $getProfType->execute(['pid' => $pid]);
                    $stype = (string) ($getProfType->fetchColumn() ?? '');
                    if ($stype !== 'fixed') {
                        $pay = $payload['professor_class_pay'] ?? null;
                    }
                    $stmtProf->execute(['cid' => $id, 'pid' => $pid, 'pay' => $pay]);
                    if ($stmtProf->rowCount() === 0 && $pay !== null) {
                        $upd = $pdo->prepare('UPDATE class_professors cp JOIN professors p ON p.id = cp.professor_id SET cp.pay_amount = :pay WHERE cp.class_id = :cid AND cp.professor_id = :pid AND p.salary_type <> "fixed"');
                        $upd->execute(['pay' => $pay, 'cid' => $id, 'pid' => $pid]);
                    }
                } else {
                    $stmtProf->execute(['cid' => $id, 'pid' => $pid]);
                }
            }
        }
        // Remove specific professors if provided
        if (!empty($payload['professors_remove']) && is_array($payload['professors_remove'])) {
            $stmtDelProf = $pdo->prepare('DELETE FROM class_professors WHERE class_id = :cid AND professor_id = :pid');
            foreach ($payload['professors_remove'] as $profPublic) {
                $pid = find_internal_id_by_public($pdo, 'professors', (string) $profPublic);
                if ($pid) { $stmtDelProf->execute(['cid' => $id, 'pid' => $pid]); }
            }
        }
    }
    // If per-class professor pay is provided, update it for all linked professors
    if (array_key_exists('professor_class_pay', $payload)) {
        if (table_has_column($pdo, 'class_professors', 'pay_amount')) {
            // Update pay only for professors with per-class type (not 'fixed')
            $stmt = $pdo->prepare('UPDATE class_professors cp JOIN professors p ON p.id = cp.professor_id SET cp.pay_amount = :pay WHERE cp.class_id = :cid AND p.salary_type <> "fixed"');
            $stmt->execute(['pay' => $payload['professor_class_pay'] ?? null, 'cid' => $id]);
        }
    }
    if (array_key_exists('students', $payload)) {
        // Add new students without wiping existing
        // Determine fee default
        $monthlyFee = $payload['monthly_price'] ?? null;
        if ($monthlyFee === null) {
            $feeStmt = $pdo->prepare('SELECT monthly_price FROM classes WHERE id = :id');
            $feeStmt->execute(['id' => $id]);
            $monthlyFee = (float) ($feeStmt->fetch()['monthly_price'] ?? 0);
        }
        $stmtStud = $pdo->prepare('INSERT IGNORE INTO class_students (class_id, student_id, join_date, status, monthly_fee) VALUES (:cid, :sid, :join, "active", :fee)');
        foreach ((array) $payload['students'] as $stuPublic) {
            $sid = find_internal_id_by_public($pdo, 'students', (string) $stuPublic);
            if ($sid) { $stmtStud->execute(['cid' => $id, 'sid' => $sid, 'join' => date('Y-m-d'), 'fee' => $monthlyFee]); }
        }
        // Remove specific students if provided
        if (!empty($payload['students_remove']) && is_array($payload['students_remove'])) {
            $stmtDelStud = $pdo->prepare('DELETE FROM class_students WHERE class_id = :cid AND student_id = :sid');
            foreach ($payload['students_remove'] as $stuPublic) {
                $sid = find_internal_id_by_public($pdo, 'students', (string) $stuPublic);
                if ($sid) { $stmtDelStud->execute(['cid' => $id, 'sid' => $sid]); }
            }
        }
    }
    if (isset($payload['payment_plan'])) {
        $pdo->prepare('DELETE FROM class_payment_plan WHERE class_id = :id')->execute(['id' => $id]);
        $stmtPlan = $pdo->prepare('INSERT INTO class_payment_plan (class_id, plan_month, due_amount, due_date, notes) VALUES (:cid, :m, :amt, :due, :notes)');
        foreach ((array) $payload['payment_plan'] as $plan) {
            if (!isset($plan['plan_month'])) continue;
            $stmtPlan->execute([
                'cid' => $id,
                'm' => $plan['plan_month'],
                'amt' => $plan['due_amount'] ?? ($payload['monthly_price'] ?? 0),
                'due' => $plan['due_date'] ?? null,
                'notes' => $plan['notes'] ?? null,
            ]);
        }
    }

    record_activity((int) $admin['id'], 'class.update', ['description' => 'Updated class ' . $publicId]);
    return get_class_by_public_id($publicId);
}

function delete_class(array $admin, string $publicId, string $pin): void {
    maybe_require_pin($admin, $pin, 'class.delete', 'class', $publicId);
    $pdo = get_db_connection();
    
    // Check if class exists and get its ID
    $class = get_class_by_public_id($publicId);
    if (!$class) {
        json_response(['error' => 'not_found', 'message' => 'Class not found'], 404);
    }
    $classId = (int) $class['id'];
    
    // Start transaction
    $pdo->beginTransaction();
    
    try {
        // Delete all associations in the correct order
        
        // Delete class_students (enrollments)
        $pdo->prepare('DELETE FROM class_students WHERE class_id = :cid')->execute(['cid' => $classId]);
        
        // Delete class_professors (assignments)
        $pdo->prepare('DELETE FROM class_professors WHERE class_id = :cid')->execute(['cid' => $classId]);
        
        // Delete student_invoices
        $pdo->prepare('DELETE FROM student_invoices WHERE class_id = :cid')->execute(['cid' => $classId]);
        
        // Delete class_payment_plan
        $pdo->prepare('DELETE FROM class_payment_plan WHERE class_id = :cid')->execute(['cid' => $classId]);
        
        // Delete salary_statements associated with this class
        $pdo->prepare('DELETE FROM salary_statements WHERE class_id = :cid')->execute(['cid' => $classId]);
        
        // Now delete the class itself
        $stmt = $pdo->prepare('DELETE FROM classes WHERE public_id = :pid');
        $stmt->execute(['pid' => $publicId]);
        
        // Commit transaction
        $pdo->commit();
        
        record_activity((int) $admin['id'], 'class.delete', ['description' => 'Deleted class ' . $publicId . ' and all associations']);
    } catch (PDOException $e) {
        $pdo->rollBack();
        error_log('Error deleting class: ' . $e->getMessage());
        json_response([
            'error' => 'database_error',
            'message' => 'Failed to delete class: ' . $e->getMessage()
        ], 500);
    }
}

function create_student(array $admin, array $payload): array {
    maybe_require_pin($admin, (string) ($payload['pin'] ?? ''), 'student.create', 'student', null);
    $pdo = get_db_connection();
    $public = next_public_id($pdo, 'students', 'S');
    $stmt = $pdo->prepare('INSERT INTO students (public_id, first_name, last_name, national_id, phone, address, age, registration_date, notes) VALUES (:pid, :fn, :ln, :nid, :ph, :addr, :age, :reg, :notes)');
    $stmt->execute([
        'pid' => $public,
        'fn' => $payload['first_name'] ?? '',
        'ln' => $payload['last_name'] ?? '',
        'nid' => $payload['national_id'] ?? '',
        'ph' => $payload['phone'] ?? '',
        'addr' => $payload['address'] ?? null,
        'age' => $payload['age'] ?? null,
        'reg' => $payload['registration_date'] ?? date('Y-m-d'),
        'notes' => $payload['notes'] ?? null,
    ]);
    record_activity((int) $admin['id'], 'student.create', ['description' => 'Created student ' . $public]);
    return get_db_connection()->query("SELECT * FROM students WHERE public_id = '" . addslashes($public) . "' LIMIT 1")->fetch();
}

function update_student(array $admin, string $publicId, array $payload): array {
    maybe_require_pin($admin, (string) ($payload['pin'] ?? ''), 'student.update', 'student', $publicId);
    $pdo = get_db_connection();
    // Partial update: only set fields that are present in payload
    $sets = [];
    $params = ['pid' => $publicId];
    $map = [
        'first_name' => 'fn',
        'last_name' => 'ln',
        'national_id' => 'nid',
        'phone' => 'ph',
        'address' => 'addr',
        'age' => 'age',
        'registration_date' => 'reg',
        'notes' => 'notes',
    ];
    foreach ($map as $key => $param) {
        if (array_key_exists($key, $payload)) {
            $col = $key;
            $sets[] = "$col = :$param";
            $params[$param] = $payload[$key];
        }
    }
    if ($sets) {
        $sql = 'UPDATE students SET ' . implode(', ', $sets) . ' WHERE public_id = :pid';
        $stmt = $pdo->prepare($sql);
        $stmt->execute($params);
    }
    record_activity((int) $admin['id'], 'student.update', ['description' => 'Updated student ' . $publicId]);
    $stmt = $pdo->prepare('SELECT * FROM students WHERE public_id = :pid');
    $stmt->execute(['pid' => $publicId]);
    return $stmt->fetch();
}

function delete_student(array $admin, string $publicId, string $pin): void {
    maybe_require_pin($admin, $pin, 'student.delete', 'student', $publicId);
    $pdo = get_db_connection();
    
    // Find student ID
    $studentId = find_internal_id_by_public($pdo, 'students', $publicId);
    if (!$studentId) {
        json_response(['error' => 'not_found', 'message' => 'Student not found'], 404);
    }
    
    // Start transaction
    $pdo->beginTransaction();
    
    try {
        // Delete all associations
        
        // Delete class_students (enrollments)
        $pdo->prepare('DELETE FROM class_students WHERE student_id = :sid')->execute(['sid' => $studentId]);
        
        // Delete student_invoices
        $pdo->prepare('DELETE FROM student_invoices WHERE student_id = :sid')->execute(['sid' => $studentId]);
        
        // Now delete the student
        $stmt = $pdo->prepare('DELETE FROM students WHERE public_id = :pid');
        $stmt->execute(['pid' => $publicId]);
        
        // Commit transaction
        $pdo->commit();
        
        record_activity((int) $admin['id'], 'student.delete', ['description' => 'Deleted student ' . $publicId . ' and all associations']);
    } catch (PDOException $e) {
        $pdo->rollBack();
        error_log('Error deleting student: ' . $e->getMessage());
        json_response([
            'error' => 'database_error',
            'message' => 'Failed to delete student: ' . $e->getMessage()
        ], 500);
    }
}

function create_professor(array $admin, array $payload): array {
    maybe_require_pin($admin, (string) ($payload['pin'] ?? ''), 'professor.create', 'professor', null);
    $pdo = get_db_connection();
    $public = next_public_id($pdo, 'professors', 'P');
    // Detect optional columns
    $cols = $pdo->query('SHOW COLUMNS FROM professors')->fetchAll();
    $hasNational = false;
    foreach ($cols as $c) { if (($c['Field'] ?? '') === 'national_id') { $hasNational = true; break; } }
    $stmt = $pdo->prepare('INSERT INTO professors (public_id, first_name, last_name, ' . ($hasNational ? 'national_id, ' : '') . 'email, phone, address, education, biography, salary_type, base_salary) VALUES (:pid, :fn, :ln, ' . ($hasNational ? ':nid, ' : '') . ':email, :ph, :addr, :edu, :bio, :stype, :base)');
    $params = [
        'pid' => $public,
        'fn' => $payload['first_name'] ?? '',
        'ln' => $payload['last_name'] ?? '',
        'email' => $payload['email'] ?? '',
        'ph' => $payload['phone'] ?? '',
        'addr' => $payload['address'] ?? null,
        'edu' => $payload['education'] ?? null,
        'bio' => $payload['biography'] ?? null,
        'stype' => $payload['salary_type'] ?? 'fixed',
        'base' => $payload['base_salary'] ?? 0,
    ];
    if ($hasNational) { $params['nid'] = $payload['national_id'] ?? null; }
    $stmt->execute($params);
    record_activity((int) $admin['id'], 'professor.create', ['description' => 'Created professor ' . $public]);
    $stmt = $pdo->prepare('SELECT * FROM professors WHERE public_id = :pid');
    $stmt->execute(['pid' => $public]);
    return $stmt->fetch();
}

function update_professor(array $admin, string $publicId, array $payload): array {
    maybe_require_pin($admin, (string) ($payload['pin'] ?? ''), 'professor.update', 'professor', $publicId);
    $pdo = get_db_connection();
    // Partial update: only set provided fields (handle optional national_id)
    $sets = [];
    $params = ['pid' => $publicId];
    // Check columns once
    $cols = $pdo->query('SHOW COLUMNS FROM professors')->fetchAll();
    $hasNational = false;
    foreach ($cols as $c) { if (($c['Field'] ?? '') === 'national_id') { $hasNational = true; break; } }
    $map = [
        'first_name' => ['param' => 'fn', 'col' => 'first_name'],
        'last_name' => ['param' => 'ln', 'col' => 'last_name'],
        // include national id if column exists
        ...($hasNational ? ['national_id' => ['param' => 'nid', 'col' => 'national_id']] : []),
        'email' => ['param' => 'email', 'col' => 'email'],
        'phone' => ['param' => 'ph', 'col' => 'phone'],
        'address' => ['param' => 'addr', 'col' => 'address'],
        'education' => ['param' => 'edu', 'col' => 'education'],
        'biography' => ['param' => 'bio', 'col' => 'biography'],
        'salary_type' => ['param' => 'stype', 'col' => 'salary_type'],
        'base_salary' => ['param' => 'base', 'col' => 'base_salary'],
    ];
    foreach ($map as $key => $info) {
        if (array_key_exists($key, $payload)) {
            $val = $payload[$key];
            if ($val === '' || $val === null) continue; // injoro vlerat bosh
            $sets[] = $info['col'] . ' = :' . $info['param'];
            $params[$info['param']] = $val;
        }
    }
    if ($sets) {
        $sql = 'UPDATE professors SET ' . implode(', ', $sets) . ' WHERE public_id = :pid';
        $stmt = $pdo->prepare($sql);
        $stmt->execute($params);
    }
    record_activity((int) $admin['id'], 'professor.update', ['description' => 'Updated professor ' . $publicId]);
    $stmt = $pdo->prepare('SELECT * FROM professors WHERE public_id = :pid');
    $stmt->execute(['pid' => $publicId]);
    return $stmt->fetch();
}

function delete_professor(array $admin, string $publicId, string $pin): void {
    maybe_require_pin($admin, $pin, 'professor.delete', 'professor', $publicId);
    $pdo = get_db_connection();
    
    // Find professor ID
    $professorId = find_internal_id_by_public($pdo, 'professors', $publicId);
    if (!$professorId) {
        json_response(['error' => 'not_found', 'message' => 'Professor not found'], 404);
    }
    
    // Start transaction
    $pdo->beginTransaction();
    
    try {
        // Delete all associations
        
        // Delete class_professors (assignments)
        $pdo->prepare('DELETE FROM class_professors WHERE professor_id = :pid')->execute(['pid' => $professorId]);
        
        // Delete salary_statements
        $pdo->prepare('DELETE FROM salary_statements WHERE professor_id = :pid')->execute(['pid' => $professorId]);
        
        // Now delete the professor
        $stmt = $pdo->prepare('DELETE FROM professors WHERE public_id = :pid');
        $stmt->execute(['pid' => $publicId]);
        
        // Commit transaction
        $pdo->commit();
        
        record_activity((int) $admin['id'], 'professor.delete', ['description' => 'Deleted professor ' . $publicId . ' and all associations']);
    } catch (PDOException $e) {
        $pdo->rollBack();
        error_log('Error deleting professor: ' . $e->getMessage());
        json_response([
            'error' => 'database_error',
            'message' => 'Failed to delete professor: ' . $e->getMessage()
        ], 500);
    }
}

// --- Payments CRUD ---

function create_invoice(array $admin, array $payload): array {
    maybe_require_pin($admin, (string) ($payload['pin'] ?? ''), 'invoice.create', 'invoice', null);
    $pdo = get_db_connection();
    $public = next_public_id($pdo, 'student_invoices', 'INV');
    $classId = find_internal_id_by_public($pdo, 'classes', (string) ($payload['class_public_id'] ?? ''));
    $studentId = find_internal_id_by_public($pdo, 'students', (string) ($payload['student_public_id'] ?? ''));
    if (!$classId || !$studentId) json_response(['error' => 'invalid_refs'], 400);
    $hasNotes = table_has_column($pdo, 'student_invoices', 'notes');
    $hasTax = table_has_column($pdo, 'student_invoices', 'tax');
    if ($hasNotes && $hasTax) {
        $stmt = $pdo->prepare('INSERT INTO student_invoices (public_id, class_id, student_id, plan_month, due_amount, paid_amount, status, tax, confirmed_at, confirmed_by, notes) VALUES (:pid, :cid, :sid, :month, :due, :paid, :status, :tax, NULL, NULL, :notes)');
        $stmt->execute([
            'pid' => $public,
            'cid' => $classId,
            'sid' => $studentId,
            'month' => $payload['plan_month'] ?? date('Y-m'),
            'due' => $payload['due_amount'] ?? 0,
            'paid' => $payload['paid_amount'] ?? 0,
            'status' => $payload['status'] ?? 'due',
            'tax' => $payload['tax'] ?? 'none',
            'notes' => $payload['notes'] ?? null,
        ]);
    } elseif ($hasTax) {
        $stmt = $pdo->prepare('INSERT INTO student_invoices (public_id, class_id, student_id, plan_month, due_amount, paid_amount, status, tax, confirmed_at, confirmed_by) VALUES (:pid, :cid, :sid, :month, :due, :paid, :status, :tax, NULL, NULL)');
        $stmt->execute([
            'pid' => $public,
            'cid' => $classId,
            'sid' => $studentId,
            'month' => $payload['plan_month'] ?? date('Y-m'),
            'due' => $payload['due_amount'] ?? 0,
            'paid' => $payload['paid_amount'] ?? 0,
            'status' => $payload['status'] ?? 'due',
            'tax' => $payload['tax'] ?? 'none',
        ]);
    } elseif ($hasNotes) {
        // Store selected tax inside notes JSON for compatibility when tax column is missing
        $notesRaw = (string) ($payload['notes'] ?? '');
        $meta = [];
        $decoded = $notesRaw !== '' ? json_decode($notesRaw, true) : null;
        if (is_array($decoded)) {
            $meta = $decoded;
        } elseif ($notesRaw !== '') {
            $meta = ['text' => $notesRaw];
        }
        if (!isset($meta['tax']) && isset($payload['tax'])) {
            $meta['tax'] = (string) $payload['tax'];
        }
        $notesToStore = $meta ? json_encode($meta, JSON_UNESCAPED_UNICODE) : null;
        $stmt = $pdo->prepare('INSERT INTO student_invoices (public_id, class_id, student_id, plan_month, due_amount, paid_amount, status, confirmed_at, confirmed_by, notes) VALUES (:pid, :cid, :sid, :month, :due, :paid, :status, NULL, NULL, :notes)');
        $stmt->execute([
            'pid' => $public,
            'cid' => $classId,
            'sid' => $studentId,
            'month' => $payload['plan_month'] ?? date('Y-m'),
            'due' => $payload['due_amount'] ?? 0,
            'paid' => $payload['paid_amount'] ?? 0,
            'status' => $payload['status'] ?? 'due',
            'notes' => $notesToStore,
        ]);
    } else {
        $stmt = $pdo->prepare('INSERT INTO student_invoices (public_id, class_id, student_id, plan_month, due_amount, paid_amount, status, confirmed_at, confirmed_by) VALUES (:pid, :cid, :sid, :month, :due, :paid, :status, NULL, NULL)');
        $stmt->execute([
            'pid' => $public,
            'cid' => $classId,
            'sid' => $studentId,
            'month' => $payload['plan_month'] ?? date('Y-m'),
            'due' => $payload['due_amount'] ?? 0,
            'paid' => $payload['paid_amount'] ?? 0,
            'status' => $payload['status'] ?? 'due',
        ]);
    }
    record_activity((int) $admin['id'], 'invoice.create', ['description' => 'Created invoice ' . $public]);
    return get_invoice_by_public_id($public);
}

function get_invoice_by_public_id(string $publicId): ?array {
    $pdo = get_db_connection();
    $stmt = $pdo->prepare('SELECT si.*, c.public_id AS class_public_id, s.public_id AS student_public_id FROM student_invoices si JOIN classes c ON c.id = si.class_id JOIN students s ON s.id = si.student_id WHERE si.public_id = :pid');
    $stmt->execute(['pid' => $publicId]);
    $row = $stmt->fetch();
    // If tax column is missing/empty, try to load from notes JSON
    if ($row && (!isset($row['tax']) || $row['tax'] === '' || $row['tax'] === null)) {
        $notes = (string) ($row['notes'] ?? '');
        if ($notes !== '') {
            $parsed = json_decode($notes, true);
            if (json_last_error() === JSON_ERROR_NONE && is_array($parsed) && isset($parsed['tax'])) {
                $row['tax'] = $parsed['tax'];
            }
        }
    }
    return $row ?: null;
}

function update_invoice(array $admin, string $publicId, array $payload): array {
    maybe_require_pin($admin, (string) ($payload['pin'] ?? ''), 'invoice.update', 'invoice', $publicId);
    $pdo = get_db_connection();
    $hasNotes = table_has_column($pdo, 'student_invoices', 'notes');
    $hasTax = table_has_column($pdo, 'student_invoices', 'tax');
    if ($hasNotes && $hasTax) {
        $stmt = $pdo->prepare('UPDATE student_invoices SET plan_month=:month, due_amount=:due, paid_amount=:paid, status=:status, tax=:tax, notes=:notes, confirmed_at = (CASE WHEN :status_check_1 = "paid" THEN NOW() ELSE confirmed_at END), confirmed_by = (CASE WHEN :status_check_2 = "paid" THEN :admin_id ELSE confirmed_by END) WHERE public_id=:pid');
        $stmt->execute([
            'month' => $payload['plan_month'] ?? date('Y-m'),
            'due' => $payload['due_amount'] ?? 0,
            'paid' => $payload['paid_amount'] ?? 0,
            'status' => $payload['status'] ?? 'due',
            'tax' => $payload['tax'] ?? 'none',
            'notes' => $payload['notes'] ?? null,
            'status_check_1' => $payload['status'] ?? 'due',
            'status_check_2' => $payload['status'] ?? 'due',
            'admin_id' => (int) $admin['id'],
            'pid' => $publicId,
        ]);
    } elseif ($hasTax) {
        $stmt = $pdo->prepare('UPDATE student_invoices SET plan_month=:month, due_amount=:due, paid_amount=:paid, status=:status, tax=:tax, confirmed_at = (CASE WHEN :status_check_1 = "paid" THEN NOW() ELSE confirmed_at END), confirmed_by = (CASE WHEN :status_check_2 = "paid" THEN :admin_id ELSE confirmed_by END) WHERE public_id=:pid');
        $stmt->execute([
            'month' => $payload['plan_month'] ?? date('Y-m'),
            'due' => $payload['due_amount'] ?? 0,
            'paid' => $payload['paid_amount'] ?? 0,
            'status' => $payload['status'] ?? 'due',
            'tax' => $payload['tax'] ?? 'none',
            'status_check_1' => $payload['status'] ?? 'due',
            'status_check_2' => $payload['status'] ?? 'due',
            'admin_id' => (int) $admin['id'],
            'pid' => $publicId,
        ]);
    } elseif ($hasNotes) {
        // Merge tax into notes JSON on update if tax column missing
        $notesRaw = (string) ($payload['notes'] ?? '');
        $meta = [];
        $decoded = $notesRaw !== '' ? json_decode($notesRaw, true) : null;
        if (is_array($decoded)) {
            $meta = $decoded;
        } elseif ($notesRaw !== '') {
            $meta = ['text' => $notesRaw];
        }
        if (isset($payload['tax'])) {
            $meta['tax'] = (string) $payload['tax'];
        }
        $notesToStore = $meta ? json_encode($meta, JSON_UNESCAPED_UNICODE) : null;
        $stmt = $pdo->prepare('UPDATE student_invoices SET plan_month=:month, due_amount=:due, paid_amount=:paid, status=:status, notes=:notes, confirmed_at = (CASE WHEN :status_check_1 = "paid" THEN NOW() ELSE confirmed_at END), confirmed_by = (CASE WHEN :status_check_2 = "paid" THEN :admin_id ELSE confirmed_by END) WHERE public_id=:pid');
        $stmt->execute([
            'month' => $payload['plan_month'] ?? date('Y-m'),
            'due' => $payload['due_amount'] ?? 0,
            'paid' => $payload['paid_amount'] ?? 0,
            'status' => $payload['status'] ?? 'due',
            'notes' => $notesToStore,
            'status_check_1' => $payload['status'] ?? 'due',
            'status_check_2' => $payload['status'] ?? 'due',
            'admin_id' => (int) $admin['id'],
            'pid' => $publicId,
        ]);
    } else {
        $stmt = $pdo->prepare('UPDATE student_invoices SET plan_month=:month, due_amount=:due, paid_amount=:paid, status=:status, confirmed_at = (CASE WHEN :status_check_1 = "paid" THEN NOW() ELSE confirmed_at END), confirmed_by = (CASE WHEN :status_check_2 = "paid" THEN :admin_id ELSE confirmed_by END) WHERE public_id=:pid');
        $stmt->execute([
            'month' => $payload['plan_month'] ?? date('Y-m'),
            'due' => $payload['due_amount'] ?? 0,
            'paid' => $payload['paid_amount'] ?? 0,
            'status' => $payload['status'] ?? 'due',
            'status_check_1' => $payload['status'] ?? 'due',
            'status_check_2' => $payload['status'] ?? 'due',
            'admin_id' => (int) $admin['id'],
            'pid' => $publicId,
        ]);
    }
    record_activity((int) $admin['id'], 'invoice.update', ['description' => 'Updated invoice ' . $publicId]);
    return get_invoice_by_public_id($publicId);
}

function delete_invoice(array $admin, string $publicId, string $pin = ''): void {
    maybe_require_pin($admin, $pin, 'invoice.delete', 'invoice', $publicId);
    $pdo = get_db_connection();
    $stmt = $pdo->prepare('DELETE FROM student_invoices WHERE public_id = :pid');
    $stmt->execute(['pid' => $publicId]);
    record_activity((int) $admin['id'], 'invoice.delete', ['description' => 'Deleted invoice ' . $publicId]);
}

// --- Salaries CRUD ---

function create_salary(array $admin, array $payload): array {
    maybe_require_pin($admin, (string) ($payload['pin'] ?? ''), 'salary.create', 'salary', null);
    $pdo = get_db_connection();
    $public = next_public_id($pdo, 'salary_statements', 'SAL');
    $profId = find_internal_id_by_public($pdo, 'professors', (string) ($payload['professor_public_id'] ?? ''));
    $classPublic = (string) ($payload['class_public_id'] ?? '');
    $classId = $classPublic ? find_internal_id_by_public($pdo, 'classes', $classPublic) : null;
    if (!$profId) json_response(['error' => 'invalid_professor'], 400);
    
    // Calculate balance: base_amount - advances - paid_amount
    $baseAmount = (float) ($payload['base_amount'] ?? 0);
    $advances = (float) ($payload['advances'] ?? 0);
    $paidAmount = (float) ($payload['paid_amount'] ?? 0);
    $balance = $baseAmount - $advances - $paidAmount;
    
    $stmt = $pdo->prepare('INSERT INTO salary_statements (public_id, professor_id, class_id, pay_month, base_amount, advances, paid_amount, balance, status, confirmed_at, confirmed_by) VALUES (:pid, :prof, :cid, :month, :base, :adv, :paid, :balance, :status, NULL, NULL)');
    $stmt->execute([
        'pid' => $public,
        'prof' => $profId,
        'cid' => $classId,
        'month' => $payload['pay_month'] ?? date('Y-m'),
        'base' => $baseAmount,
        'adv' => $advances,
        'paid' => $paidAmount,
        'balance' => $balance,
        'status' => $payload['status'] ?? 'due',
    ]);
    record_activity((int) $admin['id'], 'salary.create', ['description' => 'Created salary ' . $public]);
    return get_salary_by_public_id($public);
}

function get_salary_by_public_id(string $publicId): ?array {
    $pdo = get_db_connection();
    $stmt = $pdo->prepare('SELECT ss.*, p.public_id AS professor_public_id, c.public_id AS class_public_id FROM salary_statements ss JOIN professors p ON p.id = ss.professor_id LEFT JOIN classes c ON c.id = ss.class_id WHERE ss.public_id = :pid');
    $stmt->execute(['pid' => $publicId]);
    $row = $stmt->fetch();
    return $row ?: null;
}

function update_salary(array $admin, string $publicId, array $payload): array {
    maybe_require_pin($admin, (string) ($payload['pin'] ?? ''), 'salary.update', 'salary', $publicId);
    $pdo = get_db_connection();
    $classPublic = (string) ($payload['class_public_id'] ?? '');
    $classId = $classPublic ? find_internal_id_by_public($pdo, 'classes', $classPublic) : null;
    
    // Calculate balance: base_amount - advances - paid_amount
    $baseAmount = (float) ($payload['base_amount'] ?? 0);
    $advances = (float) ($payload['advances'] ?? 0);
    $paidAmount = (float) ($payload['paid_amount'] ?? 0);
    $balance = $baseAmount - $advances - $paidAmount;
    
    $stmt = $pdo->prepare('UPDATE salary_statements SET class_id=:cid, pay_month=:month, base_amount=:base, advances=:adv, paid_amount=:paid, balance=:balance, status=:status, confirmed_at = (CASE WHEN :status_check_1 = "paid" THEN NOW() ELSE confirmed_at END), confirmed_by = (CASE WHEN :status_check_2 = "paid" THEN :admin_id ELSE confirmed_by END) WHERE public_id=:pid');
    $stmt->execute([
        'cid' => $classId,
        'month' => $payload['pay_month'] ?? date('Y-m'),
        'base' => $baseAmount,
        'adv' => $advances,
        'paid' => $paidAmount,
        'balance' => $balance,
        'status' => $payload['status'] ?? 'due',
        'status_check_1' => $payload['status'] ?? 'due',
        'status_check_2' => $payload['status'] ?? 'due',
        'admin_id' => (int) $admin['id'],
        'pid' => $publicId,
    ]);
    record_activity((int) $admin['id'], 'salary.update', ['description' => 'Updated salary ' . $publicId]);
    return get_salary_by_public_id($publicId);
}

function delete_salary(array $admin, string $publicId, string $pin = ''): void {
    maybe_require_pin($admin, $pin, 'salary.delete', 'salary', $publicId);
    $pdo = get_db_connection();
    $stmt = $pdo->prepare('DELETE FROM salary_statements WHERE public_id = :pid');
    $stmt->execute(['pid' => $publicId]);
    record_activity((int) $admin['id'], 'salary.delete', ['description' => 'Deleted salary ' . $publicId]);
}
