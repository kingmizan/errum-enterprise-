// js/shared.js

import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/9.15.0/firebase-auth.js";
import { auth } from './firebase.js';

/**
 * Checks if a user is logged in. If not, it redirects them to the login page.
 * This function is a "page guard" and should be the first thing called on any protected page.
 * @returns {Promise<object|null>} A promise that resolves with the user object or null if not logged in.
 */
export function checkAuth() {
    return new Promise((resolve) => {
        onAuthStateChanged(auth, (user) => {
            if (user) {
                // User is signed in, allow the page to load.
                resolve(user);
            } else {
                // User is not signed in, redirect to the login page (index.html).
                // We check to avoid an infinite redirect loop if we're already on the login page.
                if (window.location.pathname !== '/index.html' && window.location.pathname !== '/') {
                    window.location.href = '/index.html';
                }
                resolve(null);
            }
        });
    });
}

/**
 * Injects the header and navigation into the page and sets the active link.
 * @param {string} activePage - The name of the current page (e.g., 'dashboard', 'party').
 */
export function renderHeaderAndNav(activePage) {
    const headerNavPlaceholder = document.getElementById('header-nav-placeholder');
    if (!headerNavPlaceholder) return;

    const headerNavHTML = `
        <header class="flex justify-between items-center mb-8">
            <div class="flex items-center gap-4">
                <div class="bg-teal-600 p-3 rounded-xl text-white"><svg class="h-8 w-8" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="7" width="20" height="14" rx="2" ry="2"></rect><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"></path></svg></div>
                <div><h1 class="text-3xl font-extrabold text-slate-900 dark:text-white">Errum Enterprise</h1><p id="user-email" class="text-slate-500 dark:text-slate-400"></p></div>
            </div>
            <div class="flex items-center gap-2">
                <button id="logout-btn" title="Logout" class="p-2 rounded-full hover:bg-slate-200 dark:hover:bg-slate-800"><svg class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg></button>
            </div>
        </header>
        <nav class="bg-white/70 dark:bg-slate-900/80 backdrop-blur-sm border rounded-lg p-2 mb-8 flex flex-wrap justify-center gap-2">
            <a href="/index.html" class="nav-link ${activePage === 'dashboard' ? 'active' : ''} px-4 py-2 rounded-md font-semibold text-sm">Dashboard</a>
            <a href="/party.html" class="nav-link ${activePage === 'party' ? 'active' : ''} px-4 py-2 rounded-md font-semibold text-sm">Party</a>
            <a href="/transaction.html" class="nav-link ${activePage === 'transaction' ? 'active' : ''} px-4 py-2 rounded-md font-semibold text-sm">Add Transaction</a>
        </nav>
    `;
    headerNavPlaceholder.innerHTML = headerNavHTML;

    // Attach listener for the logout button
    document.getElementById('logout-btn')?.addEventListener('click', () => {
        signOut(auth);
    });
}

/**
 * Updates the user's email in the header.
 * @param {string} email - The user's email address.
 */
export function updateUserEmail(email) {
    const userEmailEl = document.getElementById('user-email');
    if(userEmailEl) userEmailEl.textContent = email;
}
