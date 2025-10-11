// js/dashboard.js

import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/9.15.0/firebase-auth.js";
import { auth } from './firebase.js';
import { renderHeaderAndNav, updateUserEmail } from './shared.js';
import { listenToContacts, listenToTransactions } from './api.js';
import { initializeAuthEventListeners } from './auth.js';
import { animateCountUp } from './ui.js';
import { showTransactionDetails, initializeDetailModalListeners } from './transactionDetail.js';

// --- Page State ---
let userState = null;
let contactsState = null; // Use null to track initial load
let transactionsState = null; // Use null to track initial load
let chartInstance = null;
let dashboardCurrentPage = 1;
const DASHBOARD_ITEMS_PER_PAGE = 7;

async function init() {
    onAuthStateChanged(auth, (user) => {
        if (user) {
            document.getElementById('app-container').classList.remove('hidden');
            document.getElementById('auth-container').classList.add('hidden');
            userState = user;
            loadDashboard();
        } else {
            document.getElementById('app-container').classList.add('hidden');
            document.getElementById('auth-container').classList.remove('hidden');
            initializeAuthEventListeners();
        }
    });
}

function loadDashboard() {
    renderHeaderAndNav('dashboard');
    updateUserEmail(userState.email);
    document.getElementById('app-content').innerHTML = getDashboardTemplate();
    
    initializeDetailModalListeners();
    initializeDashboardListeners();

    // Each listener will independently call the render function
    listenToContacts(userState.uid, (contacts) => {
        contactsState = contacts || [];
        renderAllDashboardComponents();
    });
    
    listenToTransactions(userState.uid, (transactions) => {
        transactionsState = transactions || [];
        renderAllDashboardComponents();
    });
}

function renderAllDashboardComponents() {
    // ✨ FIX: This guard clause now correctly waits for both initial fetches to complete.
    if (contactsState === null || transactionsState === null) {
        return; // Don't render until both datasets have arrived at least once.
    }
    renderDashboardMetrics();
    renderProfitChart();
    renderTransactionHistory();
}

function getDashboardTemplate() {
    return `
        <div class="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <div class="p-6 bg-white dark:bg-slate-900 rounded-lg shadow-sm"><h3>Total Payable</h3><p id="total-payable" class="text-3xl font-bold text-rose-500 mt-1">৳0.00</p></div>
            <div class="p-6 bg-white dark:bg-slate-900 rounded-lg shadow-sm"><h3>Total Receivable</h3><p id="total-receivable" class="text-3xl font-bold text-green-600 mt-1">৳0.00</p></div>
            <div class="p-6 bg-white dark:bg-slate-900 rounded-lg shadow-sm"><h3>Net Balance</h3><p id="net-balance" class="text-3xl font-bold text-teal-600 mt-1">৳0.00</p></div>
        </div>
        <div class="bg-white dark:bg-slate-900 rounded-lg p-6 shadow-sm mb-8">
            <h3 class="font-bold text-lg mb-4">Monthly Profit Overview</h3>
            <div class="relative h-72"><canvas id="profitChart"></canvas></div>
        </div>
        <div class="bg-white dark:bg-slate-900 rounded-lg shadow-sm">
            <div class="p-4 border-b dark:border-slate-800"><h2 class="text-xl font-bold">Recent Transactions</h2></div>
            <div id="transaction-history-body"></div>
            <div id="pagination-controls" class="p-4 flex justify-center items-center gap-2 border-t dark:border-slate-700"></div>
        </div>
    `;
}

function renderDashboardMetrics() {
    let totalPayable = 0, totalReceivable = 0;
    const getPayments = (history) => (history || []).reduce((sum, p) => sum + p.amount, 0);

    (contactsState || []).forEach(c => {
        if (c.openingBalance?.amount > 0) {
            if (c.openingBalance.type === 'payable') totalPayable += c.openingBalance.amount;
            else totalReceivable += c.openingBalance.amount;
        }
    });

    (transactionsState || []).forEach(t => {
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
    (transactionsState || []).forEach(t => {
        if (t.type === 'trade' && new Date(t.date) >= sixMonthsAgo) {
            const month = t.date.slice(0, 7);
            monthlyData[month] = (monthlyData[month] || 0) + (t.profit || 0);
        }
    });
    const labels = Object.keys(monthlyData).sort();
    const data = labels.map(label => monthlyData[label]);
    if (chartInstance) chartInstance.destroy();
    chartInstance = new Chart(ctx, {
        type: 'bar',
        data: { labels, datasets: [{ label: 'Gross Profit', data, backgroundColor: 'rgba(20, 184, 166, 0.6)' }] },
        options: { responsive: true, maintainAspectRatio: false, scales: { y: { beginAtZero: true } } }
    });
}

function renderTransactionHistory() {
    const container = document.getElementById('transaction-history-body');
    const paginationEl = document.getElementById('pagination-controls');
    if (!container || !paginationEl) return;
    
    const totalItems = (transactionsState || []).length;
    
    if (totalItems === 0) {
        container.innerHTML = `<div class="p-4 text-center text-slate-500">No recent transactions.</div>`;
        paginationEl.innerHTML = '';
        return;
    }

    const totalPages = Math.ceil(totalItems / DASHBOARD_ITEMS_PER_PAGE);
    const startIndex = (dashboardCurrentPage - 1) * DASHBOARD_ITEMS_PER_PAGE;
    const pageItems = transactionsState.slice(startIndex, startIndex + DASHBOARD_ITEMS_PER_PAGE);

    container.innerHTML = pageItems.map(t => {
        const detail = t.type === 'trade' ? `${t.item || 'N/A'} (${t.supplierName || 'N/A'} → ${t.buyerName || 'N/A'})` : t.description || 'Direct Payment';
        const value = t.type === 'trade' ? (t.profit || 0) : (t.paymentType === 'made' ? -(t.amount || 0) : (t.amount || 0));
        const valueClass = value >= 0 ? 'text-green-600' : 'text-rose-500';
        return `<div data-id="${t.id}" class="flex justify-between items-center p-4 border-b last:border-b-0 dark:border-slate-800 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/50"><div class="max-w-[70%] sm:max-w-none"><p class="font-semibold truncate">${detail}</p><p class="text-sm text-slate-500">${t.date || 'No Date'}</p></div><p class="font-bold shrink-0 ${valueClass}">৳${value.toFixed(2)}</p></div>`;
    }).join('');

    if (totalPages > 1) {
        const prevDisabled = dashboardCurrentPage === 1 ? 'disabled' : '';
        const nextDisabled = dashboardCurrentPage === totalPages ? 'disabled' : '';
        paginationEl.innerHTML = `<button data-page="${dashboardCurrentPage - 1}" class="px-3 py-1 text-sm rounded-md bg-slate-200 dark:bg-slate-700 disabled:opacity-50" ${prevDisabled}>Previous</button><span class="text-sm font-semibold">Page ${dashboardCurrentPage} of ${totalPages}</span><button data-page="${dashboardCurrentPage + 1}" class="px-3 py-1 text-sm rounded-md bg-slate-200 dark:bg-slate-700 disabled:opacity-50" ${nextDisabled}>Next</button>`;
    } else {
        paginationEl.innerHTML = '';
    }
}

function initializeDashboardListeners() {
    const container = document.getElementById('app-content');
    if (container.dataset.initialized) return;
    container.addEventListener('click', e => {
        const row = e.target.closest('div[data-id]');
        if (row) {
            const transaction = transactionsState.find(t => t.id === row.dataset.id);
            if (transaction) {
                showTransactionDetails(transaction, contactsState);
            }
        }
        
        const pageButton = e.target.closest('#pagination-controls button[data-page]');
        if (pageButton && !pageButton.disabled) {
            dashboardCurrentPage = parseInt(pageButton.dataset.page);
            renderTransactionHistory();
        }
    });
    container.dataset.initialized = 'true';
}

init();
