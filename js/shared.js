// js/shared.js

import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/9.15.0/firebase-auth.js";
import { auth } from './firebase.js';

export function checkAuth() { /* ... (This function remains the same) ... */ }

/**
 * ✨ FIX: This function now builds the entire professional layout with a sidebar.
 * It replaces the old header/nav placeholder logic.
 */
export function renderAppLayout(activePage) {
    const body = document.body;
    body.innerHTML = `
        <div class="flex h-screen bg-slate-100 dark:bg-slate-950">
            <aside id="sidebar" class="fixed inset-y-0 left-0 bg-white dark:bg-slate-900 shadow-lg w-64 transform -translate-x-full md:relative md:translate-x-0 transition-transform duration-300 ease-in-out z-30">
                <div class="p-4 flex items-center gap-3 border-b dark:border-slate-800">
                    <div class="bg-teal-600 p-2 rounded-lg text-white"><svg class="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="7" width="20" height="14" rx="2" ry="2"></rect><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"></path></svg></div>
                    <h1 class="text-xl font-extrabold">Errum Ent.</h1>
                </div>
                <nav class="mt-4 p-2 space-y-1">
                    <a href="/index.html" class="nav-link flex items-center gap-3 px-3 py-2 rounded-md ${activePage === 'dashboard' ? 'active' : ''}">Dashboard</a>
                    <a href="/party.html" class="nav-link flex items-center gap-3 px-3 py-2 rounded-md ${activePage === 'party' ? 'active' : ''}">Party</a>
                    <a href="/transaction.html" class="nav-link flex items-center gap-3 px-3 py-2 rounded-md ${activePage === 'transaction' ? 'active' : ''}">Add Transaction</a>
                    <a href="/statement.html" class="nav-link flex items-center gap-3 px-3 py-2 rounded-md ${activePage === 'statement' ? 'active' : ''}">Statement</a>
                </nav>
            </aside>

            <div class="flex-1 flex flex-col overflow-hidden">
                <header class="bg-white/70 dark:bg-slate-900/80 backdrop-blur-sm border-b dark:border-slate-800 p-4 flex justify-between items-center">
                    <button id="hamburger-btn" class="md:hidden text-slate-600 dark:text-slate-300">
                        <svg class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16"></path></svg>
                    </button>
                    <div class="flex-1"></div> <div class="relative">
                        <button id="profile-btn" class="flex items-center gap-2">
                            <span id="user-email" class="text-sm font-medium hidden sm:inline"></span>
                            <div class="h-8 w-8 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center font-bold text-teal-600" id="user-initial"></div>
                        </button>
                        <div id="profile-menu" class="hidden absolute right-0 mt-2 w-48 bg-white dark:bg-slate-800 rounded-md shadow-lg py-1 z-20">
                            <a href="#" id="logout-btn" class="block px-4 py-2 text-sm text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700">Logout</a>
                        </div>
                    </div>
                </header>
                <main id="app-content" class="flex-1 overflow-x-hidden overflow-y-auto p-4 md:p-8"></main>
            </div>
        </div>
    `;

    // Attach listeners for the new layout
    initializeLayoutListeners();
}

function initializeLayoutListeners() {
    // Profile Dropdown Toggle
    document.getElementById('profile-btn')?.addEventListener('click', () => {
        document.getElementById('profile-menu').classList.toggle('hidden');
    });
    // Hamburger Menu Toggle
    document.getElementById('hamburger-btn')?.addEventListener('click', () => {
        document.getElementById('sidebar').classList.toggle('-translate-x-full');
    });
    // Logout Button
    document.getElementById('logout-btn')?.addEventListener('click', () => {
        signOut(auth);
    });
}

export function updateUserEmail(email) {
    const userEmailEl = document.getElementById('user-email');
    const userInitialEl = document.getElementById('user-initial');
    if (userEmailEl) userEmailEl.textContent = email;
    if (userInitialEl && email) userInitialEl.textContent = email.charAt(0).toUpperCase();
}
