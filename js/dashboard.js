// js/dashboard.js

import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/9.15.0/firebase-auth.js";
import { auth } from './firebase.js';
// ✨ FIX: This import was missing or incorrect, causing the error.
import { renderAppLayout, updateUserEmail } from './shared.js';
import { listenToContacts, listenToTransactions } from './api.js';
import { initializeAuthEventListeners } from './auth.js';
import { animateCountUp } from './ui.js';
import { showTransactionDetails, initializeDetailModalListeners } from './transactionDetail.js';

// --- Page State ---
let userState = null;
let contactsState = null;
let transactionsState = null;
let chartInstance = null;
let dashboardCurrentPage = 1;
const DASHBOARD_ITEMS_PER_PAGE = 7;

async function init() {
    onAuthStateChanged(auth, (user) => {
        if (user) {
            document.getElementById('auth-container')?.classList.add('hidden');
            userState = user;
            loadDashboard();
        } else {
            document.getElementById('app-container')?.classList.add('hidden');
            const authContainer = document.getElementById('auth-container');
            if (authContainer) {
                authContainer.classList.remove('hidden');
                initializeAuthEventListeners();
            }
        }
    });
}

function loadDashboard() {
    renderAppLayout('dashboard');
    updateUserEmail(userState.email);
    document.getElementById('app-content').innerHTML = getDashboardTemplate();
    initializeDetailModalListeners();
    initializeDashboardListeners();

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
    if (contactsState === null || transactionsState === null) return;
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

function renderDashboardMetrics() { /* ... same as before ... */ }
function renderProfitChart() { /* ... same as before ... */ }
function renderTransactionHistory() { /* ... same as before ... */ }
function initializeDashboardListeners() { /* ... same as before ... */ }

// Start the page logic
init();
