// --- app.js ---
import { initAuth, handleLogin } from './auth.js';
import { updateThemeIcon } from './ui.js';

// Initialize the application
function init() {
    updateThemeIcon(); // Set the correct theme icon on initial load
    initAuth(); // Start the authentication process
    document.getElementById('login-form')?.addEventListener('submit', handleLogin);
}

init();
