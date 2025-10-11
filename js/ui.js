// js/ui.js

/**
 * The main HTML structure of the entire application.
 * This is injected once when the app loads.
 */
export const AppShellHTML = `
    <div id="loading-container" class="fixed inset-0 bg-slate-50 dark:bg-slate-950 z-50 flex items-center justify-center p-4">
        <div class="flex flex-col items-center gap-4">
            <svg class="animate-spin h-8 w-8 text-teal-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
            <p class="text-slate-600 dark:text-slate-400">Connecting...</p>
        </div>
    </div>

    <div id="auth-container" class="hidden fixed inset-0 bg-slate-50 dark:bg-slate-950 z-40 flex items-center justify-center p-4">
        <div class="w-full max-w-md">
            <div class="flex flex-col items-center justify-center gap-4 mb-6">
                <div class="bg-teal-600 p-3 rounded-xl text-white shadow-lg shadow-teal-500/20">
                    <svg xmlns="http://www.w3.org/2000/svg" class="h-8 w-8" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="7" width="20" height="14" rx="2" ry="2"></rect><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"></path></svg>
                </div>
                <div class="text-center">
                    <h1 class="text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">Errum Enterprise</h1>
                    <p class="text-slate-500 dark:text-slate-400">Please sign in to continue</p>
                </div>
            </div>
            <div class="bg-white dark:bg-slate-900 p-8 rounded-xl shadow-lg border border-slate-200 dark:border-slate-800">
                <form id="login-form" class="space-y-4">
                    <h2 class="text-2xl font-bold text-center text-slate-800 dark:text-white">Sign In</h2>
                    <div>
                        <label for="email" class="font-semibold text-sm text-slate-700 dark:text-slate-300">Email Address</label>
                        <input type="email" id="email" class="w-full p-3 mt-1 border border-slate-300 dark:border-slate-700 rounded-lg bg-slate-50 dark:bg-slate-800 focus:ring-2 focus:ring-teal-500" required>
                    </div>
                    <div>
                        <label for="password" class="font-semibold text-sm text-slate-700 dark:text-slate-300">Password</label>
                        <input type="password" id="password" class="w-full p-3 mt-1 border border-slate-300 dark:border-slate-700 rounded-lg bg-slate-50 dark:bg-slate-800 focus:ring-2 focus:ring-teal-500" required>
                    </div>
                    <p id="auth-error" class="text-rose-500 text-sm h-4"></p>
                    <button type="submit" class="w-full bg-teal-600 hover:bg-teal-700 text-white font-bold py-3 px-4 rounded-lg transition shadow-sm shadow-teal-500/20">Sign In</button>
                </form>
            </div>
        </div>
    </div>

    <div id="app-container" class="hidden">
        <div class="container mx-auto p-4 md:p-6 lg:p-8 max-w-7xl">
            <header class="flex justify-between items-center mb-8">
                <div class="flex items-center gap-2 sm:gap-4">
                    <div class="bg-teal-600 p-2 sm:p-3 rounded-xl text-white shadow-lg shadow-teal-500/20 flex-shrink-0">
                        <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6 sm:h-8 sm:w-8" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="7" width="20" height="14" rx="2" ry="2"></rect><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"></path></svg>
                    </div>
                    <div>
                        <h1 class="text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight">Errum Enterprise</h1>
                        <p id="user-email" class="text-xs sm:text-sm text-slate-500 dark:text-slate-400 truncate">Welcome!</p>
                    </div>
                </div>
                <div class="flex items-center gap-1 sm:gap-2">
                    <button id="settings-btn" class="p-2 rounded-full text-slate-500 hover:bg-slate-200 dark:text-slate-300 dark:hover:bg-slate-800 transition-colors" title="Settings">
                         <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path stroke-linecap="round" stroke-linejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                    </button>
                    <button id="theme-toggle" class="p-2 rounded-full text-slate-500 hover:bg-slate-200 dark:text-slate-300 dark:hover:bg-slate-800 transition-colors" title="Toggle Theme">
                        <svg id="theme-icon-light" xmlns="http://www.w3.org/2000/svg" class="h-6 w-6 hidden" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z"></path></svg>
                        <svg id="theme-icon-dark" xmlns="http://www.w3.org/2000/svg" class="h-6 w-6 hidden" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z"></path></svg>
                    </button>
                    <button id="logout-btn" class="p-2 rounded-full text-slate-500 hover:bg-slate-200 dark:text-slate-300 dark:hover:bg-slate-800 transition-colors" title="Logout">
                        <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>
                    </button>
                </div>
            </header>

            <nav class="bg-white/70 dark:bg-slate-900/80 backdrop-blur-sm border border-slate-200 dark:border-slate-800 shadow-sm rounded-lg p-2 mb-8 flex flex-nowrap justify-start sm:justify-center gap-2 overflow-x-auto">
                <button data-section="dashboard" class="nav-link active flex-shrink-0 flex items-center gap-2 px-4 py-2 rounded-md font-semibold text-sm transition text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800/50">Dashboard</button>
                <button data-section="contacts" class="nav-link flex-shrink-0 flex items-center gap-2 px-4 py-2 rounded-md font-semibold text-sm transition text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800/50">Party</button>
                <button data-section="transaction-form" class="nav-link flex-shrink-0 flex items-center gap-2 px-4 py-2 rounded-md font-semibold text-sm transition text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800/50">Add Transaction</button>
                <button id="overall-statement-btn" class="flex-shrink-0 flex items-center gap-2 px-4 py-2 rounded-md font-semibold text-sm transition text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800/50 hover:bg-slate-200 dark:hover:bg-slate-700">Statement</button>
            </nav>

            <main id="app-content"></main>
            
            <footer class="text-center py-6 mt-8 text-xs text-slate-500 dark:text-slate-400">
                Coded and Developed By <a href="https://t.me/GoITBD" target="_blank" rel="noopener noreferrer" class="font-semibold text-teal-600 dark:text-teal-400 hover:underline">GoIT</a>.
            </footer>
        </div>
    </div>
    
    <div id="modals-and-helpers">
        <div id="toast" class="fixed bottom-5 right-5 bg-slate-900 dark:bg-slate-200 text-white dark:text-slate-900 py-2 px-5 rounded-lg shadow-xl text-sm font-semibold opacity-0 translate-y-10 transition-all duration-300">
            <span id="toast-message"></span>
        </div>
        
        </div>
`;

/**
 * Renders a page template into the main content area with an animation.
 * @param {string} template - The HTML string for the page.
 */
export function renderPage(template) {
    const content = document.getElementById('app-content');
    if (!content) return;
    content.innerHTML = template;
    content.classList.remove('content-enter');
    void content.offsetWidth; // Trigger browser reflow to restart animation
    content.classList.add('content-enter');
}

/**
 * Shows a toast notification message.
 * @param {string} message - The message to display.
 */
export function showToast(message) {
    const toast = document.getElementById('toast');
    if (!toast) return;
    document.getElementById('toast-message').textContent = message;
    toast.classList.remove('opacity-0', 'translate-y-10');
    toast.classList.add('opacity-100', 'translate-y-0');
    setTimeout(() => {
        toast.classList.remove('opacity-100', 'translate-y-0');
        toast.classList.add('opacity-0', 'translate-y-10');
    }, 3000);
}

/**
 * Updates the theme toggle icon based on the current theme.
 */
export function updateThemeIcon() {
    const isDark = document.documentElement.classList.contains('dark');
    document.getElementById('theme-icon-light')?.classList.toggle('hidden', isDark);
    document.getElementById('theme-icon-dark')?.classList.toggle('hidden', !isDark);
}

/**
 * Animates a number counting up from 0 to a target value.
 * @param {HTMLElement} el - The element to update.
 * @param {number} endValue - The final number to display.
 */
export function animateCountUp(el, endValue) {
    if (!el) return;
    let startValue = 0;
    const duration = 1500;
    const startTime = performance.now();

    const formatNumber = (value) => `৳${value.toFixed(2).replace(/\d(?=(\d{3})+\.)/g, '$&,')}`;

    const step = (currentTime) => {
        const elapsedTime = currentTime - startTime;
        if (elapsedTime > duration) {
            el.textContent = formatNumber(endValue);
            return;
        }
        const progress = (elapsedTime / duration);
        const current = startValue + (endValue - startValue) * progress;
        el.textContent = formatNumber(current);
        requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
}
