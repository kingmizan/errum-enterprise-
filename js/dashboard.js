// js/dashboard.js

import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/9.15.0/firebase-auth.js";
import { auth } from './firebase.js';
// ✨ FIX: This import now correctly pulls in the exported function.
import { renderAppLayout, updateUserEmail } from './shared.js'; 
import { listenToContacts, listenToTransactions } from './api.js';
import { initializeAuthEventListeners } from './auth.js';
import { animateCountUp } from './ui.js';
import { showTransactionDetails, initializeDetailModalListeners } from './transactionDetail.js';

// ... (The rest of the dashboard.js code is correct and remains the same)
// The init() function will now successfully call renderAppLayout().

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
    renderAppLayout('dashboard'); // This call will now work.
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

function renderAllDashboardComponents() { /* ... */ }
function getDashboardTemplate() { /* ... */ }
function renderDashboardMetrics() { /* ... */ }
function renderProfitChart() { /* ... */ }
function renderTransactionHistory() { /* ... */ }
function initializeDashboardListeners() { /* ... */ }

init();
