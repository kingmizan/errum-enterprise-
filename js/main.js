// js/main.js

// --- IMPORTS ---
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/9.15.0/firebase-app.js";
import { auth } from './firebase.js';
import { listenToContacts, listenToTransactions, stopListeners } from './api.js';
import { initializeAuthEventListeners, handleLogout } from './auth.js';
import { AppShellHTML, updateThemeIcon } from './ui.js';
import { showDashboard } from './components/dashboard.js';
import { showContacts } from './components/contacts.js';
import { showTransactionForm } from './components/transactionForm.js';
import { showPaginatedStatement } from './components/statement.js';
import { initializeDetailModalListeners } from './components/transactionDetail.js';

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
            // Fallback to the dashboard for any unknown URL hash
            window.location.hash = 'dashboard';
    }
}

// --- APP LIFECYCLE ---
function startApp(user) {
    state.user = user;
    document.getElementById('user-email').textContent = user.email;

    // Start listening for real-time database changes if not already active
    if (!state.listenersActive) {
        listenToContacts(user.uid, (contacts) => {
            state.contacts = contacts;
            handleNavigation(); // Re-render the current page to reflect data changes
        });
        listenToTransactions(user.uid, (transactions) => {
            state.transactions = transactions;
            handleNavigation(); // Re-render the current page to reflect data changes
        });
        state.listenersActive = true;
    }

    document.getElementById('app-container').classList.remove('hidden');
    document.getElementById('auth-container').classList.add('hidden');
    handleNavigation(); // Load the initial page
}

function showLoginScreen() {
    state.user = null;
    state.contacts = [];
    state.transactions = [];

    stopListeners(); // Stop listening to the database when the user logs out
    state.listenersActive = false;

    document.getElementById('app-container').classList.add('hidden');
    document.getElementById('auth-container').classList.remove('hidden');
}

// --- INITIALIZATION ---
// Inject the main HTML shell into the page as soon as the script loads.
document.getElementById('app-root').innerHTML = AppShellHTML;

// --- GLOBAL EVENT LISTENERS ---
// Sets up event listeners for elements that are always present in the App Shell.
function initializeGlobalListeners() {
    initializeAuthEventListeners();
    initializeDetailModalListeners(); // Set up listeners for the transaction detail modal

    document.getElementById('theme-toggle')?.addEventListener('click', () => {
        document.documentElement.classList.toggle('dark');
        localStorage.setItem('theme', document.documentElement.classList.contains('dark') ? 'dark' : 'light');
        updateThemeIcon();
    });

    document.getElementById('logout-btn')?.addEventListener('click', handleLogout);

    document.getElementById('overall-statement-btn')?.addEventListener('click', () => {
        showPaginatedStatement();
    });

    document.getElementById('settings-btn')?.addEventListener('click', () => {
        alert('Settings / Change Password modal would open here.');
    });

    // Use event delegation for the main navigation bar
    document.querySelector('nav')?.addEventListener('click', (e) => {
        const link = e.target.closest('.nav-link[data-section]');
        if (link) {
            window.location.hash = link.dataset.section;
        }
    });

    // Listen for URL hash changes to trigger navigation
    window.addEventListener('hashchange', handleNavigation);
}

// --- ENTRY POINT ---
// This is the code that runs when the application starts.
initializeGlobalListeners();
updateThemeIcon(); // Set the initial theme icon

// The main Firebase listener that determines if the user sees the login screen or the app.
onAuthStateChanged(auth, user => {
    if (user) {
        startApp(user);
    } else {
        showLoginScreen();
    }
    // Hide the initial loading spinner once the state is determined
    document.getElementById('loading-container').classList.add('hidden');
});
