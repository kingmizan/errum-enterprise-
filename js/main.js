// js/main.js

// --- IMPORTS ---
// Firebase and Authentication
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/9.15.0/firebase-auth.js";
import { auth } from './firebase.js';

// App Modules
import { listenToContacts, listenToTransactions, stopListeners } from './api.js';
import { initializeAuthEventListeners, handleLogout } from './auth.js';
import { AppShellHTML, updateThemeIcon } from './ui.js';
import { showDashboard } from './components/dashboard.js';
import { showContacts } from './components/contacts.js';
import { showTransactionForm } from './components/transactionForm.js';
import { showPaginatedStatement } from './components/statement.js';

// --- GLOBAL STATE ---
/**
 * A central object to hold the application's data.
 * Exported so other modules can read from it.
 */
export const state = {
    user: null,
    contacts: [],
    transactions: [],
    listenersActive: false,
};

// --- ROUTER & NAVIGATION ---
/**
 * Reads the URL hash and displays the corresponding page.
 */
function handleNavigation() {
    // Default to 'dashboard' if hash is empty
    const page = window.location.hash.substring(1) || 'dashboard';

    // Highlight the active navigation link
    document.querySelectorAll('.nav-link').forEach(link => {
        link.classList.toggle('active', link.dataset.section === page);
    });

    // Load the correct module based on the page hash
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
            // Fallback to dashboard for any unknown hash
            window.location.hash = 'dashboard';
            showDashboard();
    }
}

// --- APP LIFECYCLE ---
/**
 * Sets up the application for a logged-in user.
 * @param {object} user - The Firebase user object.
 */
function startApp(user) {
    state.user = user;
    document.getElementById('user-email').textContent = user.email;

    // Start listening to real-time database changes if not already listening
    if (!state.listenersActive) {
        listenToContacts(user.uid, (contacts) => {
            state.contacts = contacts;
            // Re-render the current page to reflect any data changes
            handleNavigation();
        });
        listenToTransactions(user.uid, (transactions) => {
            state.transactions = transactions;
            // Re-render the current page to reflect any data changes
            handleNavigation();
        });
        state.listenersActive = true;
    }

    // Show the main app view and hide the login form
    document.getElementById('app-container').classList.remove('hidden');
    document.getElementById('auth-container').classList.add('hidden');
    handleNavigation(); // Load the initial page based on the URL hash
}

/**
 * Resets the application to the login state.
 */
function showLoginScreen() {
    state.user = null;
    state.contacts = [];
    state.transactions = [];
    
    // Stop listening to database updates when logged out
    stopListeners();
    state.listenersActive = false;

    // Show the login form and hide the main app view
    document.getElementById('app-container').classList.add('hidden');
    document.getElementById('auth-container').classList.remove('hidden');
}

// --- INITIALIZATION (ENTRY POINT) ---

// 1. Inject the basic HTML structure into the document body.
document.getElementById('app-root').innerHTML = AppShellHTML;

// 2. Set up global event listeners that are always active.
initializeAuthEventListeners(); // Handles login form submission

document.getElementById('theme-toggle').addEventListener('click', () => {
    document.documentElement.classList.toggle('dark');
    localStorage.setItem('theme', document.documentElement.classList.contains('dark') ? 'dark' : 'light');
    updateThemeIcon();
});

document.getElementById('logout-btn').addEventListener('click', handleLogout);
document.getElementById('overall-statement-btn').addEventListener('click', () => showPaginatedStatement());
document.getElementById('settings-btn').addEventListener('click', () => {
    // This is a placeholder for opening your settings/password modal
    const passwordModal = document.getElementById('password-modal');
    if (passwordModal) passwordModal.classList.remove('hidden');
});

// Add event listener to the main navigation container
document.querySelector('nav').addEventListener('click', (e) => {
    const link = e.target.closest('.nav-link');
    if (link && link.dataset.section) {
        // Update the URL hash to trigger the router
        window.location.hash = link.dataset.section;
    }
});

// Listen for hash changes to navigate between pages
window.addEventListener('hashchange', handleNavigation);

// 3. Listen for Firebase authentication state changes to start the app or show the login screen.
// This is the main trigger that determines what the user sees.
onAuthStateChanged(auth, user => {
    if (user) {
        startApp(user);
    } else {
        showLoginScreen();
    }
    // Hide the initial loading spinner
    document.getElementById('loading-container').classList.add('hidden');
});

// 4. Initialize the dark/light theme based on user's preference
updateThemeIcon();
