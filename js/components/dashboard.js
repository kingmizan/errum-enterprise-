// js/components/dashboard.js
import { state } from '../main.js';
import { renderPage, animateCountUp, showToast } from '../ui.js';
import { deleteTransaction, updateTransaction } from '../api.js';

let chartInstance = null;
let dashboardCurrentPage = 1;
const DASHBOARD_ITEMS_PER_PAGE = 7;

function getDashboardTemplate() {
    // This template is now correct and uses the responsive-table class
    return `
        <div class="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <div class="p-6 bg-white dark:bg-slate-900 rounded-lg shadow-sm border border-slate-200 dark:border-slate-800"><div><h3 class="text-sm font-semibold text-slate-500 dark:text-slate-400">Total Payable</h3><p id="total-payable" class="text-3xl font-bold text-rose-500 mt-1">৳0.00</p></div></div>
            <div class="p-6 bg-white dark:bg-slate-900 rounded-lg shadow-sm border border-slate-200 dark:border-slate-800"><div><h3 class="text-sm font-semibold text-slate-500 dark:text-slate-400">Total Receivable</h3><p id="total-receivable" class="text-3xl font-bold text-green-600 dark:text-green-500 mt-1">৳0.00</p></div></div>
            <div class="p-6 bg-white dark:bg-slate-900 rounded-lg shadow-sm border border-slate-200 dark:border-slate-800"><div><h3 class="text-sm font-semibold text-slate-500 dark:text-slate-400">Net Balance</h3><p id="net-balance" class="text-3xl font-bold text-teal-600 dark:text-teal-500 mt-1">৳0.00</p></div></div>
        </div>
        <div class="bg-white dark:bg-slate-900 rounded-lg p-4 sm:p-6 shadow-sm border border-slate-200 dark:border-slate-800 mb-8">
            <h3 class="font-bold text-lg mb-4">Monthly Profit Overview (Last 6 Months)</h3>
            <div class="relative h-64 md:h-72"><canvas id="profitChart"></canvas></div>
        </div>
        <div class="bg-white dark:bg-slate-900 rounded-lg shadow-sm border border-slate-200 dark:border-slate-800">
            <div class="p-4 border-b dark:border-slate-800 flex justify-between items-center"><h2 class="text-xl font-bold">Recent Transactions</h2><input id="search-input" type="text" placeholder="Search..." class="w-full sm:w-48 p-2 border rounded-lg bg-slate-50 dark:bg-slate-800 border-slate-300 dark:border-slate-700"></div>
            <div class="overflow-x-auto"><table class="w-full text-sm responsive-table"><thead><tr class="bg-slate-50 dark:bg-slate-900/50 border-b dark:border-slate-800"><th class="py-3 px-4 text-left font-semibold">Details</th><th class="py-3 px-4 text-right font-semibold">Payable Bal</th><th class="py-3 px-4 text-right font-semibold">Receivable Bal</th><th class="py-3 px-4 text-center font-semibold">Actions</th></tr></thead><tbody id="transaction-history-body"></tbody></table></div>
            <div id="pagination-controls" class="flex justify-center items-center gap-4 p-4 border-t dark:border-slate-800"></div>
        </div>
    `;
}

// ✨ FIX: This is the complete, working function to render the transaction list.
function renderTransactionHistory() {
    const tbody = document.getElementById('transaction-history-body');
    const paginationEl = document.getElementById('pagination-controls');
    if (!tbody || !paginationEl) return;

    const searchTerm = document.getElementById('search-input')?.value.toLowerCase() || '';
    const getPayments = (history) => (history || []).reduce((sum, p) => sum + p.amount, 0);

    // 1. Filter and Sort
    const filtered = state.transactions.filter(t => 
        searchTerm === '' ||
        (t.item && t.item.toLowerCase().includes(searchTerm)) ||
        (t.supplierName && t.supplierName.toLowerCase().includes(searchTerm)) ||
        (t.buyerName && t.buyerName.toLowerCase().includes(searchTerm)) ||
        (t.description && t.description.toLowerCase().includes(searchTerm))
    ).sort((a, b) => new Date(b.date) - new Date(a.date));

    // 2. Handle No Results
    if (filtered.length === 0) {
        tbody.innerHTML = `<tr><td colspan="4" class="text-center py-12 text-slate-500">No transactions found.</td></tr>`;
        paginationEl.innerHTML = '';
        return;
    }

    // 3. Paginate
    const totalPages = Math.ceil(filtered.length / DASHBOARD_ITEMS_PER_PAGE);
    const startIndex = (dashboardCurrentPage - 1) * DASHBOARD_ITEMS_PER_PAGE;
    const pageItems = filtered.slice(startIndex, startIndex + DASHBOARD_ITEMS_PER_PAGE);

    // 4. Render Rows
    tbody.innerHTML = pageItems.map(t => {
        let detailsHtml, payableBalHtml, receivableBalHtml, actionsHtml;

        if (t.type === 'trade') {
            const payableBalance = (t.supplierTotal || 0) - getPayments(t.paymentsToSupplier);
            const receivableBalance = (t.buyerTotal || 0) - getPayments(t.paymentsFromBuyer);
            
            detailsHtml = `<div class="font-medium">${t.item}</div><div class="text-xs text-slate-500">${t.supplierName} → ${t.buyerName}</div>`;
            payableBalHtml = `<span class="${payableBalance > 0.01 ? 'text-rose-500' : 'text-slate-500'}">৳${payableBalance.toFixed(2)}</span>`;
            receivableBalHtml = `<span class="${receivableBalance > 0.01 ? 'text-green-600' : 'text-slate-500'}">৳${receivableBalance.toFixed(2)}</span>`;
            actionsHtml = `
                <button title="Edit" data-action="edit" data-id="${t.id}" class="p-2 text-blue-600 hover:bg-blue-100 rounded-full">✏️</button>
                <button title="Delete" data-action="delete" data-id="${t.id}" class="p-2 text-rose-500 hover:bg-rose-100 rounded-full">🗑️</button>
            `;
        } else { // Payment
            detailsHtml = `<div class="font-medium">${t.description}</div><div class="text-xs text-slate-500">${t.name}</div>`;
            payableBalHtml = '<span>-</span>';
            receivableBalHtml = '<span>-</span>';
            actionsHtml = `<button title="Delete" data-action="delete" data-id="${t.id}" class="p-2 text-rose-500 hover:bg-rose-100 rounded-full">🗑️</button>`;
        }

        return `
            <tr class="border-b dark:border-slate-800">
                <td data-label="Details" class="py-3 px-4">${detailsHtml}</td>
                <td data-label="Payable Bal" class="py-3 px-4 text-right">${payableBalHtml}</td>
                <td data-label="Receivable Bal" class="py-3 px-4 text-right">${receivableBalHtml}</td>
                <td data-label="Actions" class="py-3 px-4 actions-cell">${actionsHtml}</td>
            </tr>
        `;
    }).join('');

    // 5. Render Pagination
    if (totalPages > 1) {
        const prevDisabled = dashboardCurrentPage === 1 ? 'disabled' : '';
        const nextDisabled = dashboardCurrentPage === totalPages ? 'disabled' : '';
        paginationEl.innerHTML = `
            <button data-page="${dashboardCurrentPage - 1}" class="px-3 py-1 text-sm rounded-md bg-slate-200 dark:bg-slate-700 disabled:opacity-50" ${prevDisabled}>Prev</button>
            <span>Page ${dashboardCurrentPage} of ${totalPages}</span>
            <button data-page="${dashboardCurrentPage + 1}" class="px-3 py-1 text-sm rounded-md bg-slate-200 dark:bg-slate-700 disabled:opacity-50" ${nextDisabled}>Next</button>
        `;
    } else {
        paginationEl.innerHTML = '';
    }
}


function initializeDashboardListeners() {
    document.getElementById('search-input')?.addEventListener('input', () => {
        dashboardCurrentPage = 1;
        renderTransactionHistory();
    });

    document.getElementById('transaction-history-body')?.addEventListener('click', e => {
        const button = e.target.closest('button[data-action]');
        if (!button) return;
        const { action, id } = button.dataset;

        if (action === 'edit') {
            window.location.hash = `transaction-form?id=${id}`;
        } else if (action === 'delete') {
            if (confirm('Are you sure you want to delete this transaction?')) {
                deleteTransaction(state.user.uid, id).then(() => showToast('Transaction deleted.'))
                    .catch(err => showToast('Error deleting transaction.'));
            }
        }
    });
    
    document.getElementById('pagination-controls')?.addEventListener('click', e => {
        const button = e.target.closest('button[data-page]');
        if (button && !button.disabled) {
            dashboardCurrentPage = parseInt(button.dataset.page);
            renderTransactionHistory();
        }
    });
}

// (The other functions like renderDashboardMetrics, renderProfitChart, etc., remain the same)
// ...
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
        data: { labels, datasets: [{ label: 'Gross Profit', data, backgroundColor: 'rgba(20, 184, 166, 0.6)', borderColor: 'rgba(13, 148, 136, 1)', borderWidth: 1, borderRadius: 4 }] },
        options: { responsive: true, maintainAspectRatio: false, scales: { y: { beginAtZero: true } }, plugins: { legend: { display: false } } }
    });
}


export function showDashboard() {
    dashboardCurrentPage = 1;
    renderPage(getDashboardTemplate());
    renderDashboardMetrics();
    renderProfitChart();
    renderTransactionHistory();
    initializeDashboardListeners();
}
