// js/dashboard.js

import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/9.15.0/firebase-auth.js";
import { auth } from './firebase.js';
// ✨ FIX: Import the correct function name 'renderAppLayout'
import { renderAppLayout, updateUserEmail } from './shared.js';
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
            userState = user;
            // ✨ FIX: Call the correct function name here
            renderAppLayout('dashboard');
            loadDashboard();
        } else {
            // Show the login form (no layout needed yet)
            const authContainer = document.getElementById('auth-container');
            if (authContainer) {
                document.body.innerHTML = authContainer.outerHTML;
                document.getElementById('auth-container').classList.remove('hidden');
                initializeAuthEventListeners();
            }
        }
    });
}

function loadDashboard() {
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

// ... (The rest of your dashboard.js functions: getDashboardTemplate, renderDashboardMetrics, etc. are correct and remain the same)
// ...

init();
