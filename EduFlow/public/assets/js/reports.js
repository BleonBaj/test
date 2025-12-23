document.addEventListener('DOMContentLoaded', () => {
    const reportsSection = document.querySelector('section[data-section="reports"]');
    const refreshBtn = document.getElementById('reports-refresh-btn');
    const rangeSelect = document.getElementById('reports-range-select');
    
    let financialChart = null;
    let coursesChart = null;

    function getDateRange(range) {
        const now = new Date();
        let start, end;

        if (range === 'this_month') {
            start = new Date(now.getFullYear(), now.getMonth(), 1);
            end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
        } else if (range === 'last_month') {
            start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
            end = new Date(now.getFullYear(), now.getMonth(), 0);
        } else if (range === 'this_year') {
            start = new Date(now.getFullYear(), 0, 1);
            end = new Date(now.getFullYear(), 11, 31);
        } else if (range === 'last_year') {
            start = new Date(now.getFullYear() - 1, 0, 1);
            end = new Date(now.getFullYear() - 1, 11, 31);
        }

        const formatDate = (d) => {
            const year = d.getFullYear();
            const month = String(d.getMonth() + 1).padStart(2, '0');
            const day = String(d.getDate()).padStart(2, '0');
            return `${year}-${month}-${day}`;
        };

        return { start: formatDate(start), end: formatDate(end) };
    }

    async function loadReports() {
        if (!reportsSection.classList.contains('active')) return;

        const range = rangeSelect ? rangeSelect.value : 'this_month';
        const { start, end } = getDateRange(range);

        if (refreshBtn) refreshBtn.classList.add('loading');

        try {
            // Add timestamp to avoid caching
            const response = await fetch(`api/reports.php?start_date=${start}&end_date=${end}&t=${new Date().getTime()}`);
            
            if (!response.ok) {
                const text = await response.text();
                console.error('Reports API Error:', response.status, text);
                throw new Error(`Server returned ${response.status}`);
            }

            const result = await response.json();

            if (result.success) {
                updateSummary(result.data.summary);
                updateCharts(result.data.charts, result.data.top_courses);
                updateOverdueTable(result.data.overdue_invoices);
                
                if (window.lucide) window.lucide.createIcons();
            } else {
                console.error('Reports API returned success:false', result);
            }
        } catch (error) {
            console.error('Error loading reports:', error);
            // Optionally show error to user in UI
            const tableBody = document.querySelector('#reports-overdue-table tbody');
            if (tableBody) tableBody.innerHTML = `<tr><td colspan="6" class="text-center" style="color:red">Gabim gjatë ngarkimit të të dhënave: ${error.message}</td></tr>`;
        } finally {
            if (refreshBtn) refreshBtn.classList.remove('loading');
        }
    }

    function updateSummary(summary) {
        const fmt = (num) => new Intl.NumberFormat('sq-AL', { style: 'currency', currency: 'EUR' }).format(num);

        const elIncome = document.getElementById('report-income');
        const elExpenses = document.getElementById('report-expenses');
        const elProfit = document.getElementById('report-profit');
        const elStudents = document.getElementById('report-students');

        if (elIncome) elIncome.textContent = fmt(summary.income || 0);
        if (elExpenses) elExpenses.textContent = fmt(summary.expenses || 0);
        if (elProfit) elProfit.textContent = fmt(summary.profit || 0);
        if (elStudents) elStudents.textContent = summary.new_students || 0;
    }

    function updateCharts(history, topCourses) {
        if (typeof Chart === 'undefined') {
            console.warn('Chart.js is not loaded');
            return;
        }

        const ctxHistory = document.getElementById('chart-financial-history');
        if (ctxHistory) {
            if (financialChart) financialChart.destroy();
            
            financialChart = new Chart(ctxHistory, {
                type: 'bar',
                data: {
                    labels: history.labels,
                    datasets: [
                        {
                            label: 'Të hyrat',
                            data: history.income,
                            backgroundColor: '#10b981',
                            borderRadius: 4
                        },
                        {
                            label: 'Shpenzime',
                            data: history.expenses,
                            backgroundColor: '#ef4444',
                            borderRadius: 4
                        }
                    ]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: { position: 'bottom' }
                    },
                    scales: {
                        y: { beginAtZero: true }
                    }
                }
            });
        }

        const ctxCourses = document.getElementById('chart-top-courses');
        if (ctxCourses) {
            if (coursesChart) coursesChart.destroy();

            coursesChart = new Chart(ctxCourses, {
                type: 'doughnut',
                data: {
                    labels: topCourses.map(c => c.name),
                    datasets: [{
                        data: topCourses.map(c => c.revenue),
                        backgroundColor: [
                            '#3b82f6', '#8b5cf6', '#f59e0b', '#10b981', '#ef4444'
                        ]
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: { position: 'right' }
                    }
                }
            });
        }
    }

    function updateOverdueTable(invoices) {
        const tbody = document.querySelector('#reports-overdue-table tbody');
        if (!tbody) return;

        tbody.innerHTML = '';
        if (!invoices || invoices.length === 0) {
            tbody.innerHTML = '<tr><td colspan="6" class="text-center p-4">Nuk ka fatura të vonuara</td></tr>';
            return;
        }

        invoices.forEach(inv => {
            const tr = document.createElement('tr');
            const remaining = parseFloat(inv.due_amount) - parseFloat(inv.paid_amount);
            
            tr.innerHTML = `
                <td>${inv.first_name} ${inv.last_name}</td>
                <td>${inv.class_name}</td>
                <td>${inv.plan_month}</td>
                <td>${parseFloat(inv.due_amount).toFixed(2)} €</td>
                <td>${parseFloat(inv.paid_amount).toFixed(2)} €</td>
                <td style="color: var(--danger); font-weight: bold;">${remaining.toFixed(2)} €</td>
            `;
            tbody.appendChild(tr);
        });
    }

    // Export function global
    window.exportTableToCSV = function(tableId, filename) {
        const table = document.getElementById(tableId);
        if (!table) return;

        const rows = table.querySelectorAll('tr');
        const csv = [];

        for (const row of rows) {
            const rowData = [];
            const cols = row.querySelectorAll('td, th');
            for (const col of cols) {
                rowData.push('"' + col.innerText.replace(/"/g, '""') + '"');
            }
            csv.push(rowData.join(','));
        }

        const csvFile = new Blob([csv.join('\n')], { type: 'text/csv' });
        const downloadLink = document.createElement('a');
        downloadLink.download = filename;
        downloadLink.href = window.URL.createObjectURL(csvFile);
        downloadLink.style.display = 'none';
        document.body.appendChild(downloadLink);
        downloadLink.click();
        document.body.removeChild(downloadLink);
    };

    if (refreshBtn) refreshBtn.addEventListener('click', loadReports);
    if (rangeSelect) rangeSelect.addEventListener('change', loadReports);

    const observer = new MutationObserver((mutations) => {
        mutations.forEach((mutation) => {
            if (mutation.target.classList.contains('active')) {
                loadReports();
            }
        });
    });

    if (reportsSection) {
        observer.observe(reportsSection, { attributes: true, attributeFilter: ['class'] });
        // Initial check if already active
        if (reportsSection.classList.contains('active')) {
            loadReports();
        }
    }
});
