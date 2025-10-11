// js/dashboard.js

import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/9.15.0/firebase-auth.js";
import { auth } from './firebase.js';
import { renderHeaderAndNav, updateUserEmail } from './shared.js';
import { listenToContacts, listenToTransactions } from './api.js';
import { initializeAuthEventListeners } from './auth.js';

let userState = null;
let contactsState = [];
let transactionsState = [];
let chartInstance = null;

// Main entry point for the dashboard page
async function init() {
    onAuthStateChanged(auth, (user) => {
        if (user) {
            // User is logged in, show the app
            document.getElementById('app-container').classList.remove('hidden');
            document.getElementById('auth-container').classList.add('hidden');
            
            userState = user;
            loadDashboard();
        } else {
            // User is not logged in, show the login form
            document.getElementById('app-container').classList.add('hidden');
            document.getElementById('auth-container').classList.remove('hidden');
            initializeAuthEventListeners();
        }
    });
}

function loadDashboard() {
    renderHeaderAndNav('dashboard');
    updateUserEmail(userState.email);

    const appContent = document.getElementById('app-content');
    appContent.innerHTML = getDashboardTemplate();

    // Listen for data and re-render everything when it changes
    listenToContacts(userState.uid, (contacts) => {
        contactsState = contacts;
        renderAllDashboardComponents();
    });
    
    listenToTransactions(userState.uid, (transactions) => {
        transactionsState = transactions;
        renderAllDashboardComponents();
    });
}

function renderAllDashboardComponents() {
    renderDashboardMetrics();
    renderProfitChart();
    renderTransactionHistory();
}

function getDashboardTemplate() {
    // This is the unique HTML for the dashboard content
    return `
        <div class="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <div class="p-6 bg-white dark:bg-slate-900 rounded-lg shadow-sm"><h3>Total Payable</h3><p id="total-payable" class="text-3xl font-bold text-rose-500 mt-1">৳0.00</p></div>
            <div class="p-6 bg-white dark:bg-slate-900 rounded-lg shadow-sm"><h3>Total Receivable</h3><p id="total-receivable" class="text-3xl font-bold text-green-600 mt-1">৳0.00</p></div>
            <div class="p-6 bg-white dark:bg-slate-900 rounded-lg shadow-sm"><h3>Net Balance</h3><p id="net-balance" class="text-3xl font-bold text-teal-600 mt-1">৳0.00</p></div>
        </div>
        <div class="bg-white dark:bg-slate-900 rounded-lg p-6 shadow-sm mb-8">
            <h3 class="font-bold text-lg mb-4">Monthly Profit</h3>
            <div class="relative h-72"><canvas id="profitChart"></canvas></div>
        </div>
        <div class="bg-white dark:bg-slate-900 rounded-lg shadow-sm">
            <div class="p-4 border-b"><h2 class="text-xl font-bold">Recent Transactions</h2></div>
            <div id="transaction-history-body"></div>
        </div>
    `;
}

function renderDashboardMetrics() {
    let totalPayable = 0, totalReceivable = 0;
    const getPayments = (history) => (history || []).reduce((sum, p) => sum + p.amount, 0);

    contactsState.forEach(c => {
        if (c.openingBalance?.amount > 0) {
            if (c.openingBalance.type === 'payable') totalPayable += c.openingBalance.amount;
            else totalReceivable += c.openingBalance.amount;
        }
    });

    transactionsState.forEach(t => {
        if (t.type === 'trade') {
            totalPayable += (t.supplierTotal || 0) - getPayments(t.paymentsToSupplier);
            totalReceivable += (t.buyerTotal || 0) - getPayments(t.paymentsFromBuyer);
        } else if (t.type === 'payment') {
            if (t.paymentType === 'made') totalPayable -= t.amount;
            else totalReceivable -= t.amount;
        }
    });

    document.getElementById('total-payable').textContent = `৳${totalPayable.toFixed(2)}`;
    document.getElementById('total-receivable').textContent = `৳${totalReceivable.toFixed(2)}`;
    document.getElementById('net-balance').textContent = `৳${(totalReceivable - totalPayable).toFixed(2)}`;
}

function renderProfitChart() {
    const ctx = document.getElementById('profitChart')?.getContext('2d');
    if (!ctx) return;

    const monthlyData = {};
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

    transactionsState.forEach(t => {
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
        data: { labels, datasets: [{ label: 'Gross Profit', data, backgroundColor: 'rgba(20, 184, 166, 0.6)' }] },
        options: { responsive: true, maintainAspectRatio: false }
    });
}

function renderTransactionHistory() {
    const container = document.getElementById('transaction-history-body');
    if (!container) return;
    
    const recentTransactions = [...transactionsState]
        .sort((a, b) => new Date(b.date) - new Date(a.date))
        .slice(0, 5); // Show latest 5

    if (recentTransactions.length === 0) {
        container.innerHTML = `<p class="p-4 text-slate-500">No recent transactions.</p>`;
        return;
    }

    container.innerHTML = recentTransactions.map(t => {
        const detail = t.type === 'trade' ? `${t.item} (${t.supplierName} → ${t.buyerName})` : t.description;
        const value = t.type === 'trade' ? t.profit : (t.paymentType === 'made' ? -t.amount : t.amount);
        const valueClass = value >= 0 ? 'text-green-600' : 'text-rose-500';
        return `
            <div class="flex justify-between items-center p-4 border-b dark:border-slate-800">
                <div>
                    <p class="font-semibold">${detail}</p>
                    <p class="text-sm text-slate-500">${t.date}</p>
                </div>
                <p class="font-bold ${valueClass}">৳${value.toFixed(2)}</p>
            </div>
        `;
    }).join('');
}


// Start the process
init();
