// js/dashboard.js

import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/9.15.0/firebase-auth.js";
import { auth } from './firebase.js';
import { renderHeaderAndNav, updateUserEmail } from './shared.js';
import { listenToContacts, listenToTransactions } from './api.js';
import { initializeAuthEventListeners } from './auth.js';
import { animateCountUp } from './ui.js';
// ✨ FIX: Import the modal functions
import { showTransactionDetails, initializeDetailModalListeners } from './transactionDetail.js';

let userState = null;
let contactsState = [];
let transactionsState = [];
let chartInstance = null;

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
    
    // ✨ FIX: Initialize the modal listeners once the dashboard loads
    initializeDetailModalListeners();
    initializeDashboardListeners();

    listenToContacts(userState.uid, (contacts) => {
        contactsState = contacts;
        renderAllDashboardComponents();
    });
    
    listenToTransactions(userState.uid, (transactions) => {
        transactionsState = transactions;
        renderAllDashboardComponents();
    });
}

function renderAllDashboardComponents() { /* ... unchanged ... */ }
function getDashboardTemplate() { /* ... unchanged ... */ }
function renderDashboardMetrics() { /* ... unchanged ... */ }
function renderProfitChart() { /* ... unchanged ... */ }

function renderTransactionHistory() {
    const container = document.getElementById('transaction-history-body');
    if (!container) return;
    const recentTransactions = [...transactionsState].slice(0, 7);
    if (recentTransactions.length === 0) {
        container.innerHTML = `<div class="p-4 text-center text-slate-500">No recent transactions.</div>`;
        return;
    }
    // ✨ FIX: Add data-id and cursor-pointer to each row
    container.innerHTML = recentTransactions.map(t => {
        const detail = t.type === 'trade' ? `${t.item} (${t.supplierName} → ${t.buyerName})` : t.description;
        const value = t.type === 'trade' ? (t.profit || 0) : (t.paymentType === 'made' ? -(t.amount || 0) : (t.amount || 0));
        return `<div data-id="${t.id}" class="flex justify-between items-center p-4 border-b dark:border-slate-800 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/50">...</div>`;
    }).join('');
}

// ✨ FIX: Add event listener for row clicks
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
    });
    container.dataset.initialized = 'true';
}

init();
