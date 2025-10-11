// js/main.js

// --- IMPORTS ---
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/9.15.0/firebase-auth.js";
import { auth } from './firebase.js';
import { listenToContacts, listenToTransactions, stopListeners } from './api.js';
import { initializeAuthEventListeners, handleLogout } from './auth.js';
import { AppShellHTML, updateThemeIcon } from './ui.js';
import { showDashboard } from './components/dashboard.js';
import { showContacts } from './components/contacts.js';
import { showTransactionForm } from './components/transactionForm.js';
import { showPaginatedStatement } from './components/statement.js';

// --- GLOBAL STATE ---
export const state = {
    user: null,
    contacts: [],
    transactions: [],
    listenersActive: false,
};

// --- ROUTER & NAVIGATION ---
function handleNavigation() {
    const page = window.location.hash.substring(1).split('?')[0] || 'dashboard';

    document.querySelectorAll('.nav-link').forEach(link => {
        link.classList.toggle('active', link.dataset.section === page);
    });

    switch (page) {
        case 'dashboard':
            showDashboard();
            break;
        case 'contacts':
            showContacts();
            break;
        case 'transaction-form':
            showTransactionForm();
            break;
        default:
            window.location.hash = 'dashboard';
    }
}

// --- APP LIFECYCLE ---
function startApp(user) {
    state.user = user;
    document.getElementById('user-email').textContent = user.email;

    if (!state.listenersActive) {
        listenToContacts(user.uid, (contacts) => {
            state.contacts = contacts;
            handleNavigation();
        });
        listenToTransactions(user.uid, (transactions) => {
            state.transactions = transactions;
            handleNavigation();
        });
        state.listenersActive = true;
    }

    document.getElementById('app-container').classList.remove('hidden');
    document.getElementById('auth-container').classList.add('hidden');
    handleNavigation();
}

function showLoginScreen() {
    state.user = null;
    stopListeners();
    state.listenersActive = false;
    document.getElementById('app-container').classList.add('hidden');
    document.getElementById('auth-container').classList.remove('hidden');
}

// --- INITIALIZATION ---
document.getElementById('app-root').innerHTML = AppShellHTML;

// --- GLOBAL EVENT LISTENERS ---
// These listeners are attached once to elements that are always present in the App Shell.
function initializeGlobalListeners() {
    initializeAuthEventListeners();

    document.getElementById('theme-toggle')?.addEventListener('click', () => {
        document.documentElement.classList.toggle('dark');
        localStorage.setItem('theme', document.documentElement.classList.contains('dark') ? 'dark' : 'light');
        updateThemeIcon();
    });

    document.getElementById('logout-btn')?.addEventListener('click', handleLogout);

    // ✨ FIX: This correctly attaches the listener for the statement button.
    document.getElementById('overall-statement-btn')?.addEventListener('click', () => {
        showPaginatedStatement();
    });

    document.getElementById('settings-btn')?.addEventListener('click', () => {
        // This is a placeholder for your settings/password modal
        alert('Settings modal would open here.');
    });

    document.querySelector('nav')?.addEventListener('click', (e) => {
        const link = e.target.closest('.nav-link[data-section]');
        if (link) {
            window.location.hash = link.dataset.section;
        }
    });

    window.addEventListener('hashchange', handleNavigation);
}

// --- ENTRY POINT ---
initializeGlobalListeners();
updateThemeIcon();

onAuthStateChanged(auth, user => {
    if (user) {
        startApp(user);
    } else {
        showLoginScreen();
    }
    document.getElementById('loading-container').classList.add('hidden');
});
