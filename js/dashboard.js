// js/dashboard.js

import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/9.15.0/firebase-auth.js";
import { auth } from './firebase.js';
import { renderHeaderAndNav, updateUserEmail } from './shared.js';
import { listenToContacts, listenToTransactions } from './api.js';
import { initializeAuthEventListeners } from './auth.js';
// ✨ This import will now work correctly
import { animateCountUp } from './ui.js';
import { showTransactionDetails, initializeDetailModalListeners } from './transactionDetail.js';

// --- Page State ---
let userState = null;
let contactsState = null; // Use null to track initial load
let transactionsState = null; // Use null to track initial load
let chartInstance = null;
let dashboardCurrentPage = 1;
const DASHBOARD_ITEMS_PER_PAGE = 7;

/**
 * Main entry point for the index.html page.
 */
async function init() {
    onAuthStateChanged(auth, (user) => {
        if (user) {
            // User is logged in: hide login, show and build the main app layout.
            document.getElementById('auth-container')?.classList.add('hidden');
            userState = user;
            loadDashboard();
        } else {
            // User is not logged in: show the login form.
            document.getElementById('app-container')?.classList.add('hidden');
            const authContainer = document.getElementById('auth-container');
            if(authContainer) {
                authContainer.classList.remove('hidden');
                initializeAuthEventListeners();
            }
        }
    });
}

/**
 * Renders the app layout and fetches data for the dashboard.
 */
function loadDashboard() {
    // Render the main app shell with a sidebar, header, etc.
    renderAppLayout('dashboard');
    updateUserEmail(userState.email);
    
    // Show skeleton loaders while data is being fetched
    document.getElementById('app-content').innerHTML = getDashboardSkeletonTemplate();
    
    initializeDetailModalListeners();
    initializeDashboardListeners();

    // Listen for data from Firebase
    listenToContacts(userState.uid, (contacts) => {
        contactsState = contacts || [];
        renderAllDashboardComponents();
    });
    
    listenToTransactions(userState.uid, (transactions) => {
        transactionsState = transactions || [];
        renderAllDashboardComponents();
    });
}

/**
 * A central function to update all dynamic parts of the dashboard.
 * It waits until both contacts and transactions have been fetched at least once.
 */
function renderAllDashboardComponents() {
    if (contactsState === null || transactionsState === null) {
        return; // Don't render until both datasets have arrived.
    }
    // Once data is ready, replace skeleton with real content
    document.getElementById('app-content').innerHTML = getDashboardTemplate();

    renderDashboardMetrics();
    renderProfitChart();
    renderTransactionHistory();
}

function getDashboardSkeletonTemplate() {
    return `
        <div class="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <div class="p-6 bg-white dark:bg-slate-900 rounded-lg shadow-sm space-y-2"><div class="skeleton skeleton-text w-1/2"></div><div class="skeleton h-8 w-3/4"></div></div>
            <div class="p-6 bg-white dark:bg-slate-900 rounded-lg shadow-sm space-y-2"><div class="skeleton skeleton-text w-1/2"></div><div class="skeleton h-8 w-3/4"></div></div>
            <div class="p-6 bg-white dark:bg-slate-900 rounded-lg shadow-sm space-y-2"><div class="skeleton skeleton-text w-1/2"></div><div class="skeleton h-8 w-3/4"></div></div>
        </div>
        <div class="bg-white dark:bg-slate-900 rounded-lg p-6 shadow-sm"><div class="skeleton skeleton-text w-1/3 mb-4"></div><div class="skeleton h-72 w-full"></div></div>
    `;
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

function renderDashboardMetrics() { /* ... unchanged ... */ }
function renderProfitChart() { /* ... unchanged ... */ }
function renderTransactionHistory() { /* ... unchanged ... */ }
function initializeDashboardListeners() { /* ... unchanged ... */ }

// Start the page logic
init();
