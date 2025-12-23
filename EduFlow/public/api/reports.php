<?php
require_once __DIR__ . '/../../includes/auth.php';
require_once __DIR__ . '/../../includes/db.php';

header('Content-Type: application/json');

try {
    require_authenticated_admin();
    $conn = get_db_connection();

    // Filters
    $month = $_GET['month'] ?? date('Y-m');
    $year = $_GET['year'] ?? date('Y');
    $startDate = $_GET['start_date'] ?? date('Y-m-01');
    $endDate = $_GET['end_date'] ?? date('Y-m-t');

    $response = [
        'summary' => [],
        'financials' => [],
        'students' => [],
        'professors' => [],
        'charts' => []
    ];

    // 1. Summary Statistics (Current Month)
    
    // Total Income (Paid Invoices in range)
    $stmt = $conn->prepare("
        SELECT COALESCE(SUM(paid_amount), 0) as total_income 
        FROM student_invoices 
        WHERE status IN ('paid', 'partial') 
        AND (created_at BETWEEN ? AND ? OR confirmed_at BETWEEN ? AND ?)
    ");
    $stmt->execute([$startDate . ' 00:00:00', $endDate . ' 23:59:59', $startDate . ' 00:00:00', $endDate . ' 23:59:59']);
    $response['summary']['income'] = (float) $stmt->fetchColumn();

    // Total Expenses (Paid Salaries in range)
    $stmt = $conn->prepare("
        SELECT COALESCE(SUM(paid_amount), 0) as total_expenses 
        FROM salary_statements 
        WHERE status IN ('paid', 'partial') 
        AND (created_at BETWEEN ? AND ? OR confirmed_at BETWEEN ? AND ?)
    ");
    $stmt->execute([$startDate . ' 00:00:00', $endDate . ' 23:59:59', $startDate . ' 00:00:00', $endDate . ' 23:59:59']);
    $response['summary']['expenses'] = (float) $stmt->fetchColumn();

    $response['summary']['profit'] = $response['summary']['income'] - $response['summary']['expenses'];

    // Total Active Students
    $stmt = $conn->query("SELECT COUNT(*) FROM students"); // Could filter by active classes if status exists
    $response['summary']['total_students'] = (int) $stmt->fetchColumn();

    // New Students this month
    $stmt = $conn->prepare("SELECT COUNT(*) FROM students WHERE registration_date BETWEEN ? AND ?");
    $stmt->execute([$startDate, $endDate]);
    $response['summary']['new_students'] = (int) $stmt->fetchColumn();


    // 2. Financial Charts Data (Last 6 Months)
    $chartsData = [
        'labels' => [],
        'income' => [],
        'expenses' => []
    ];

    for ($i = 5; $i >= 0; $i--) {
        $d = new DateTime();
        $d->modify("-$i month");
        $m = $d->format('Y-m');
        $mStart = $d->format('Y-m-01');
        $mEnd = $d->format('Y-m-t');
        
        $chartsData['labels'][] = $d->format('M Y');

        // Income
        $stmt = $conn->prepare("
            SELECT COALESCE(SUM(paid_amount), 0) 
            FROM student_invoices 
            WHERE status IN ('paid', 'partial') 
            AND (created_at BETWEEN ? AND ? OR confirmed_at BETWEEN ? AND ?)
        ");
        $stmt->execute([$mStart . ' 00:00:00', $mEnd . ' 23:59:59', $mStart . ' 00:00:00', $mEnd . ' 23:59:59']);
        $chartsData['income'][] = (float) $stmt->fetchColumn();

        // Expenses
        $stmt = $conn->prepare("
            SELECT COALESCE(SUM(paid_amount), 0) 
            FROM salary_statements 
            WHERE status IN ('paid', 'partial') 
            AND (created_at BETWEEN ? AND ? OR confirmed_at BETWEEN ? AND ?)
        ");
        $stmt->execute([$mStart . ' 00:00:00', $mEnd . ' 23:59:59', $mStart . ' 00:00:00', $mEnd . ' 23:59:59']);
        $chartsData['expenses'][] = (float) $stmt->fetchColumn();
    }
    $response['charts']['financial_history'] = $chartsData;


    // 3. Top Courses (by Revenue)
    $stmt = $conn->prepare("
        SELECT c.name, COALESCE(SUM(i.paid_amount), 0) as revenue
        FROM courses c
        JOIN classes cl ON c.id = cl.course_id
        JOIN student_invoices i ON cl.id = i.class_id
        WHERE i.status IN ('paid', 'partial')
        GROUP BY c.id
        ORDER BY revenue DESC
        LIMIT 5
    ");
    $stmt->execute();
    $response['top_courses'] = $stmt->fetchAll(PDO::FETCH_ASSOC);

    // 4. Overdue Invoices (Top 10)
    $stmt = $conn->prepare("
        SELECT i.id, i.public_id, s.first_name, s.last_name, c.name as class_name, i.plan_month, i.due_amount, i.paid_amount
        FROM student_invoices i
        JOIN students s ON i.student_id = s.id
        JOIN classes c ON i.class_id = c.id
        WHERE i.status = 'due' OR (i.status = 'partial' AND i.paid_amount < i.due_amount)
        ORDER BY i.plan_month ASC, i.due_amount DESC
        LIMIT 10
    ");
    $stmt->execute();
    $response['overdue_invoices'] = $stmt->fetchAll(PDO::FETCH_ASSOC);

    echo json_encode(['success' => true, 'data' => $response]);

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'error' => $e->getMessage()]);
}

