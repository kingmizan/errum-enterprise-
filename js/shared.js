// js/shared.js

import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/9.15.0/firebase-auth.js";
import { auth } from './firebase.js';

/**
 * Checks if a user is logged in. If not, it redirects them to the login page.
 * @returns {Promise<object|null>}
 */
export function checkAuth() {
    return new Promise((resolve) => {
        const unsubscribe = onAuthStateChanged(auth, (user) => {
            unsubscribe();
            if (user) {
                resolve(user);
            } else {
                if (window.location.pathname !== '/index.html' && window.location.pathname !== '/') {
                    window.location.href = '/index.html';
                }
                resolve(null);
            }
        });
    });
}

/**
 * ✨ FIX: This function is now correctly EXPORTED.
 * Injects the header and navigation into the page and sets the active link.
 * @param {string} activePage - The name of the current page.
 */
export function renderAppLayout(activePage) {
    const placeholder = document.getElementById('header-nav-placeholder');
    if (!placeholder) return;

    const headerNavHTML = `
        <header class="flex justify-between items-center mb-8">
            <div class="flex items-center gap-2 sm:gap-4">
                <div class="bg-teal-600 p-2 sm:p-3 rounded-xl text-white shadow-lg"><svg class="h-6 w-6 sm:h-8 sm:w-8" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="7" width="20" height="14" rx="2" ry="2"></rect><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"></path></svg></div>
                <div><h1 class="text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-white">Errum Enterprise</h1><p id="user-email" class="text-xs sm:text-sm text-slate-500 dark:text-slate-400"></p></div>
            </div>
            <div class="flex items-center gap-1 sm:gap-2">
                <button id="settings-btn" title="Settings" class="p-2 rounded-full text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-800"><svg class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path stroke-linecap="round" stroke-linejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg></button>
                <button id="logout-btn" title="Logout" class="p-2 rounded-full text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-800"><svg class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg></button>
            </div>
        </header>
        <nav class="bg-white/70 dark:bg-slate-900/80 backdrop-blur-sm border rounded-lg p-2 mb-8 flex flex-wrap justify-center gap-2">
            <a href="/index.html" class="nav-link ${activePage === 'dashboard' ? 'active' : ''} px-4 py-2 rounded-md font-semibold text-sm">Dashboard</a>
            <a href="/party.html" class="nav-link ${activePage === 'party' ? 'active' : ''} px-4 py-2 rounded-md font-semibold text-sm">Party</a>
            <a href="/transaction.html" class="nav-link ${activePage === 'transaction' ? 'active' : ''} px-4 py-2 rounded-md font-semibold text-sm">Add Transaction</a>
            <a href="/statement.html" class="nav-link ${activePage === 'statement' ? 'active' : ''} px-4 py-2 rounded-md font-semibold text-sm">Statement</a>
        </nav>
    `;
    placeholder.innerHTML = headerNavHTML;

    document.getElementById('logout-btn')?.addEventListener('click', () => {
        signOut(auth).catch(error => console.error("Logout Error:", error));
    });

    document.getElementById('settings-btn')?.addEventListener('click', () => {
        alert('Settings / Change Password modal would open here.');
    });
}

/**
 * Updates the user's email in the header.
 */
export function updateUserEmail(email) {
    const userEmailEl = document.getElementById('user-email');
    if(userEmailEl) userEmailEl.textContent = email;
}
