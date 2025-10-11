// js/components/dashboard.js
import { renderPage } from '../ui.js';
import { state } from '../main.js';

let chartInstance = null; // To hold the chart object

function getDashboardTemplate() {
    return `
        <div class="bg-white dark:bg-slate-900 rounded-lg p-6 shadow-sm border border-slate-200 dark:border-slate-800 mt-8">
            <h3 class="font-bold text-lg mb-4">Monthly Profit Overview (Last 6 Months)</h3>
            <canvas id="profitChart" height="100"></canvas>
        </div>
        `;
}

function renderProfitChart() {
    const ctx = document.getElementById('profitChart')?.getContext('2d');
    if (!ctx) return;

    // Logic to calculate profit for the last 6 months
    const monthlyData = {};
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

    state.transactions.forEach(t => {
        const transactionDate = new Date(t.date);
        if (t.type === 'trade' && transactionDate >= sixMonthsAgo) {
            const month = transactionDate.toISOString().slice(0, 7); // "YYYY-MM"
            monthlyData[month] = (monthlyData[month] || 0) + (t.profit || 0);
        }
    });

    const labels = Object.keys(monthlyData).sort();
    const data = labels.map(label => monthlyData[label]);

    if (chartInstance) {
        chartInstance.destroy(); // Destroy old chart before creating new one
    }
    
    chartInstance = new Chart(ctx, {
        type: 'bar',
        data: {
            labels,
            datasets: [{
                label: 'Gross Profit',
                data,
                backgroundColor: 'rgba(20, 184, 166, 0.6)',
                borderColor: 'rgba(13, 148, 136, 1)',
                borderWidth: 1
            }]
        },
        options: { scales: { y: { beginAtZero: true } } }
    });
}

export function showDashboard() {
    renderPage(getDashboardTemplate());
    // ... render your metrics and transaction table ...
    renderProfitChart();
}
