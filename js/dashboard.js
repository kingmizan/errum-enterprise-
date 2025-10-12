// js/dashboard.js

import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/9.15.0/firebase-auth.js";
import { auth } from './firebase.js';
// ✨ FIX: This import statement now correctly finds the exported functions from shared.js
import { renderHeaderAndNav, updateUserEmail } from './shared.js';
import { listenToContacts, listenToTransactions } from './api.js';
import { initializeAuthEventListeners } from './auth.js';
import { animateCountUp } from './ui.js';
import { showTransactionDetails, initializeDetailModalListeners } from './transactionDetail.js';

let userState = null;
let contactsState = null;
let transactionsState = null;
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
    renderHeaderAndNav('dashboard'); // This call will now work.
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

function getDashboardTemplate() { /* ... unchanged ... */ }
function renderDashboardMetrics() { /* ... unchanged ... */ }
function renderProfitChart() { /* ... unchanged ... */ }
function renderTransactionHistory() { /* ... unchanged ... */ }
function initializeDashboardListeners() { /* ... unchanged ... */ }

// Start the page
init();
