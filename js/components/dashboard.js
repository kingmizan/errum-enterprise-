// js/components/dashboard.js
import { state } from '../main.js';
import { renderPage, animateCountUp } from '../ui.js';

let chartInstance = null;
let dashboardCurrentPage = 1;
const DASHBOARD_ITEMS_PER_PAGE = 7;

function getDashboardTemplate() {
    return `
        <div class="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <div class="p-6 bg-white dark:bg-slate-900 rounded-lg shadow-sm border border-slate-200 dark:border-slate-800"><div class="flex items-center gap-4"><div><h3 class="text-sm font-semibold text-slate-500 dark:text-slate-400">Total Payable</h3><p id="total-payable" class="text-3xl font-bold text-rose-500 mt-1">৳0.00</p></div></div></div>
            <div class="p-6 bg-white dark:bg-slate-900 rounded-lg shadow-sm border border-slate-200 dark:border-slate-800"><div class="flex items-center gap-4"><div><h3 class="text-sm font-semibold text-slate-500 dark:text-slate-400">Total Receivable</h3><p id="total-receivable" class="text-3xl font-bold text-green-600 dark:text-green-500 mt-1">৳0.00</p></div></div></div>
            <div class="p-6 bg-white dark:bg-slate-900 rounded-lg shadow-sm border border-slate-200 dark:border-slate-800"><div class="flex items-center gap-4"><div><h3 class="text-sm font-semibold text-slate-500 dark:text-slate-400">Net Balance</h3><p id="net-balance" class="text-3xl font-bold text-teal-600 dark:text-teal-500 mt-1">৳0.00</p></div></div></div>
        </div>

        <div class="bg-white dark:bg-slate-900 rounded-lg p-4 sm:p-6 shadow-sm border border-slate-200 dark:border-slate-800 mb-8">
            <h3 class="font-bold text-lg mb-4">Monthly Profit Overview (Last 6 Months)</h3>
            <div class="relative h-64 md:h-72">
                <canvas id="profitChart"></canvas>
            </div>
        </div>

        <div class="bg-white dark:bg-slate-900 rounded-lg shadow-sm border border-slate-200 dark:border-slate-800">
            <div class="p-4 border-b dark:border-slate-800 flex flex-wrap gap-4 justify-between items-center">
                <h2 class="text-xl font-bold">Recent Transactions</h2>
                <div class="flex flex-wrap items-center gap-2">
                    <input id="search-input" type="text" placeholder="Search..." class="w-full sm:w-48 p-2 border rounded-lg bg-slate-50 dark:bg-slate-800 border-slate-300 dark:border-slate-700">
                </div>
            </div>
            <div class="overflow-x-auto"><table class="w-full text-sm responsive-table"><thead><tr class="border-b dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50"><th class="text-left font-semibold py-3 px-4">Date & Details</th><th class="text-right font-semibold py-3 px-4">Payable Bal</th><th class="text-right font-semibold py-3 px-4">Receivable Bal</th><th class="text-center font-semibold py-3 px-4">Actions</th></tr></thead><tbody id="transaction-history-body"></tbody></table></div>
            <div id="pagination-controls" class="flex justify-center items-center gap-4 p-4 border-t dark:border-slate-800"></div>
        </div>
    `;
}

function renderDashboardMetrics() {
    let totalPayable = 0, totalReceivable = 0;
    const getPayments = (history) => (history || []).reduce((sum, p) => sum + p.amount, 0);

    state.contacts.forEach(c => {
        if (c.openingBalance?.amount > 0) {
            if (c.openingBalance.type === 'payable') totalPayable += c.openingBalance.amount;
            else totalReceivable += c.openingBalance.amount;
        }
    });

    state.transactions.forEach(t => {
        if (t.type === 'trade') {
            totalPayable += (t.supplierTotal || 0) - getPayments(t.paymentsToSupplier);
            totalReceivable += (t.buyerTotal || 0) - getPayments(t.paymentsFromBuyer);
        } else if (t.type === 'payment') {
            if (t.paymentType === 'made') totalPayable -= t.amount;
            else totalReceivable -= t.amount;
        }
    });

    animateCountUp(document.getElementById('total-payable'), totalPayable);
    animateCountUp(document.getElementById('total-receivable'), totalReceivable);
    animateCountUp(document.getElementById('net-balance'), totalReceivable - totalPayable);
}

function renderProfitChart() {
    const ctx = document.getElementById('profitChart')?.getContext('2d');
    if (!ctx) return;

    const monthlyData = {};
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

    state.transactions.forEach(t => {
        if (t.type === 'trade' && new Date(t.date) >= sixMonthsAgo) {
            const month = t.date.slice(0, 7); // "YYYY-MM"
            monthlyData[month] = (monthlyData[month] || 0) + (t.profit || 0);
        }
    });

    const labels = Object.keys(monthlyData).sort();
    const data = labels.map(label => monthlyData[label]);

    if (chartInstance) chartInstance.destroy();

    chartInstance = new Chart(ctx, {
        type: 'bar',
        data: {
            labels,
            datasets: [{
                label: 'Gross Profit',
                data,
                backgroundColor: 'rgba(20, 184, 166, 0.6)',
                borderColor: 'rgba(13, 148, 136, 1)',
                borderWidth: 1,
                borderRadius: 4,
            }]
        },
        options: {
            // ✨ --- FIX FOR CHART SCROLLING --- ✨
            responsive: true,
            maintainAspectRatio: false, // This is the key to prevent overflow
            scales: { y: { beginAtZero: true } },
            plugins: { legend: { display: false } }
        }
    });
}

function renderTransactionHistory() {
    // This function will be more complex in your app, this is a simplified version for demonstration
    const tbody = document.getElementById('transaction-history-body');
    if(!tbody) return;
    
    tbody.innerHTML = `<tr><td data-label="Info" colspan="4" class="text-center p-8 text-slate-500">Loading transactions...</td></tr>`;
    
    const transactions = [...state.transactions].sort((a,b) => new Date(b.date) - new Date(a.date));
    
    if (transactions.length === 0) {
         tbody.innerHTML = `<tr><td data-label="Info" colspan="4" class="text-center p-8 text-slate-500">No transactions found.</td></tr>`;
         return;
    }
    
    const rowsHtml = transactions.slice(0, DASHBOARD_ITEMS_PER_PAGE).map(t => {
         // Your logic to create each table row would go here.
         return `<tr><td data-label="Details" class="py-4 px-4">${t.item || t.description}</td><td data-label="Payable" class="py-4 px-4 text-right">...</td><td data-label="Receivable" class="py-4 px-4 text-right">...</td><td data-label="Actions" class="py-4 px-4 actions-cell">...</td></tr>`;
    }).join('');
    
    tbody.innerHTML = rowsHtml;
}


export function showDashboard() {
    renderPage(getDashboardTemplate());
    renderDashboardMetrics();
    renderProfitChart();
    renderTransactionHistory();
}
