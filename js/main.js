// js/main.js
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/9.15.0/firebase-auth.js";
import { auth } from './firebase.js';
import { listenToContacts, listenToTransactions, stopListeners } from './api.js';
import { initializeAuthEventListeners } from './auth.js';
import { AppShellHTML } from './ui.js';
import { showDashboard } from './components/dashboard.js';
import { showContacts } from './components/contacts.js';
// ... import other components

// --- GLOBAL STATE ---
export const state = {
    user: null,
    contacts: [],
    transactions: [],
    listenersActive: false,
};

// --- ROUTER ---
function handleNavigation() {
    const page = window.location.hash.substring(1) || 'dashboard';
    
    // Highlight active nav link
    document.querySelectorAll('.nav-link').forEach(link => {
        link.classList.toggle('active', link.dataset.section === page);
    });

    switch(page) {
        case 'dashboard':
            showDashboard();
            break;
        case 'contacts':
            showContacts();
            break;
        // ... other pages
        default:
            showDashboard(); // Fallback to dashboard
    }
}

// --- APP INITIALIZATION ---
function startApp(user) {
    state.user = user;
    document.getElementById('user-email').textContent = user.email;

    if (!state.listenersActive) {
        listenToContacts(user.uid, (contacts) => {
            state.contacts = contacts;
            handleNavigation(); // Re-render current page with new data
        });
        listenToTransactions(user.uid, (transactions) => {
            state.transactions = transactions;
            handleNavigation(); // Re-render current page with new data
        });
        state.listenersActive = true;
    }
    
    document.getElementById('app-container').classList.remove('hidden');
    document.getElementById('auth-container').classList.add('hidden');
    handleNavigation(); // Initial page load
}

function showLoginScreen() {
    state.user = null;
    stopListeners();
    state.listenersActive = false;
    document.getElementById('app-container').classList.add('hidden');
    document.getElementById('auth-container').classList.remove('hidden');
}

// --- ENTRY POINT ---
// 1. Inject the main app shell into the page
document.getElementById('app-root').innerHTML = AppShellHTML;

// 2. Listen for authentication changes to start the app or show login
onAuthStateChanged(auth, user => {
    if (user) {
        startApp(user);
    } else {
        showLoginScreen();
    }
    document.getElementById('loading-container').classList.add('hidden');
});

// 3. Set up all event listeners
initializeAuthEventListeners();
window.addEventListener('hashchange', handleNavigation);
document.querySelector('nav').addEventListener('click', (e) => {
    const link = e.target.closest('.nav-link');
    if (link) {
        window.location.hash = link.dataset.section;
    }
});
// ... add listeners for theme toggle, logout, modals etc.
