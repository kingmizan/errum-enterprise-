// --- app.js ---
// Main application entry point

import { initAuth, handleLogin } from './auth.js';

// Initialize the authentication state listener, which starts the app
initAuth();

// Bind the login form event listener
document.getElementById('login-form').addEventListener('submit', handleLogin);
