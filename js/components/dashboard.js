// js/components/dashboard.js
import { state } from '../main.js';
import { renderPage, animateCountUp } from '../ui.js';
// Note: You will need to create and import these modules as you build them out
// import { openTransactionDetailModal } from './transactionDetail.js';
// import { openPaymentModal } from './payment.js';
// import { deleteTransaction } from '../api.js';

let chartInstance = null; // To hold the chart object
let dashboardCurrentPage = 1;
const DASHBOARD_ITEMS_PER_PAGE = 7;

/**
 * Returns the HTML template for the dashboard page.
 */
function getDashboardTemplate() {
    return `
        <div class="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <div class="p-6 bg-white dark:bg-slate-900 rounded-lg shadow-sm border border-slate-200 dark:border-slate-800"><div class="flex items-center gap-4"><div><h3 class="text-sm font-semibold text-slate-500 dark:text-slate-400">Total Payable</h3><p id="total-payable" class="text-3xl font-bold text-rose-500 mt-1">৳0.00</p></div></div></div>
            <div class="p-6 bg-white dark:bg-slate-900 rounded-lg shadow-sm border border-slate-200 dark:border-slate-800"><div class="flex items-center gap-4"><div><h3 class="text-sm font-semibold text-slate-500 dark:text-slate-400">Total Receivable</h3><p id="total-receivable" class="text-3xl font-bold text-green-600 dark:text-green-500 mt-1">৳0.00</p></div></div></div>
            <div class="p-6 bg-white dark:bg-slate-900 rounded-lg shadow-sm border border-slate-200 dark:border-slate-800"><div class="flex items-center gap-4"><div><h3 class="text-sm font-semibold text-slate-500 dark:text-slate-400">Net Balance</h3><p id="net-balance" class="text-3xl font-bold text-teal-600 dark:text-teal-500 mt-1">৳0.00</p></div></div></div>
        </div>

        <div class="bg-white dark:bg-slate-900 rounded-lg p-4 sm:p-6 shadow-sm border border-slate-200 dark:border-slate-800 mb-8">
            <h3 class="font-bold text-lg mb-4">Monthly Profit Overview (Last 6 Months)</h3>
            <canvas id="profitChart" height="120"></canvas>
        </div>

        <div class="bg-white dark:bg-slate-900 rounded-lg shadow-sm border border-slate-200 dark:border-slate-800">
            <div class="p-4 border-b dark:border-slate-800 flex flex-wrap gap-4 justify-between items-center">
                <h2 class="text-xl font-bold">Recent Transactions</h2>
                <div class="flex flex-wrap items-center gap-2">
                    <input id="search-input" type="text" placeholder="Search..." class="w-48 p-2 border border-slate-300 dark:border-slate-700 rounded-lg bg-slate-50 dark:bg-slate-800">
                    <input type="date" id="filter-start-date" class="p-2 border border-slate-300 dark:border-slate-700 rounded-lg bg-slate-50 dark:bg-slate-800">
                    <input type="date" id="filter-end-date" class="p-2 border border-slate-300 dark:border-slate-700 rounded-lg bg-slate-50 dark:bg-slate-800">
                </div>
            </div>
            <div class="overflow-x-auto"><table class="w-full text-sm responsive-table"><thead><tr class="border-b dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50"><th class="text-left font-semibold py-3 px-4">Date</th><th class="text-left font-semibold py-3 px-4">Details</th><th class="text-right font-semibold py-3 px-4">Profit/Value</th><th class="text-right font-semibold py-3 px-4">Payable Bal</th><th class="text-right font-semibold py-3 px-4">Receivable Bal</th><th class="text-center font-semibold py-3 px-4">Actions</th></tr></thead><tbody id="transaction-history-body"></tbody></table></div>
            <div id="pagination-controls" class="flex justify-center items-center gap-4 p-4 border-t dark:border-slate-800"></div>
        </div>
    `;
}

/**
 * Calculates and renders the summary metrics.
 */
function renderDashboardMetrics() {
    let totalPayable = 0;
    let totalReceivable = 0;

    // Calculate opening balances from contacts
    state.contacts.forEach(c => {
        if (c.openingBalance?.amount > 0) {
            if (c.openingBalance.type === 'payable') totalPayable += c.openingBalance.amount;
            else totalReceivable += c.openingBalance.amount;
        }
    });

    // Calculate balances from transactions
    state.transactions.forEach(t => {
        const getPayments = (history) => (history || []).reduce((sum, p) => sum + p.amount, 0);
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

/**
 * Renders the profit overview chart.
 */
function renderProfitChart() {
    const ctx = document.getElementById('profitChart')?.getContext('2d');
    if (!ctx) return;

    const monthlyData = {};
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

    state.transactions.forEach(t => {
        const transactionDate = new Date(t.date);
        if (t.type === 'trade' && transactionDate >= sixMonthsAgo) {
            const month = transactionDate.toISOString().slice(0, 7); // "YYYY-MM" format
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
            scales: { y: { beginAtZero: true } },
            responsive: true,
            maintainAspectRatio: false,
        }
    });
}

/**
 * Filters and paginates transactions to render the list.
 */
function renderTransactionHistory() {
    // This function combines filtering, sorting, pagination, and rendering
    // It's the core logic for the transaction table
    // (This would contain the full logic from your original `getFilteredTransactions` and `renderTransactionHistory` functions)
    const tbody = document.getElementById('transaction-history-body');
    if(!tbody) return;
    
    // Placeholder content
    tbody.innerHTML = `<tr><td colspan="6" class="text-center p-8 text-slate-500">Transaction list will be rendered here.</td></tr>`;
    
    // NOTE: You would copy your full, detailed `renderTransactionHistory` logic here,
    // including the filtering by search/date, pagination, and row creation.
}

/**
 * Sets up all event listeners for the dashboard page.
 */
function initializeDashboardListeners() {
    const searchInput = document.getElementById('search-input');
    const startDate = document.getElementById('filter-start-date');
    const endDate = document.getElementById('filter-end-date');

    // Re-render the list when filters change
    searchInput?.addEventListener('input', renderTransactionHistory);
    startDate?.addEventListener('change', renderTransactionHistory);
    endDate?.addEventListener('change', renderTransactionHistory);

    // Event delegation for action buttons in the table
    const tableBody = document.getElementById('transaction-history-body');
    tableBody?.addEventListener('click', (e) => {
        const button = e.target.closest('button[data-action]');
        if (button) {
            const action = button.dataset.action;
            const id = button.dataset.id;
            
            // Placeholder actions
            if (action === 'edit') {
                window.location.hash = `transaction-form?id=${id}`;
            } else if (action === 'delete') {
                if(confirm('Are you sure you want to delete this transaction?')) {
                    // deleteTransaction(state.user.uid, id);
                    console.log(`Deleting transaction ${id}`);
                }
            }
        }
    });
}

/**
 * Main function to display and initialize the dashboard.
 */
export function showDashboard() {
    dashboardCurrentPage = 1; // Reset page on navigation
    renderPage(getDashboardTemplate());
    
    // Render all dynamic parts of the dashboard
    renderDashboardMetrics();
    renderProfitChart();
    renderTransactionHistory();
    
    // Attach event listeners for interaction
    initializeDashboardListeners();
}
