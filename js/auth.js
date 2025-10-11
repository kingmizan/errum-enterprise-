// js/auth.js

import { 
    signInWithEmailAndPassword, 
    signOut 
} from "https://www.gstatic.com/firebasejs/9.15.0/firebase-auth.js";
import { auth } from './firebase.js';

/**
 * Attempts to sign in the user with the provided credentials.
 * @param {string} email - The user's email.
 * @param {string} password - The user's password.
 */
async function signIn(email, password) {
    const loadingContainer = document.getElementById('loading-container');
    const authContainer = document.getElementById('auth-container');
    const errorP = document.getElementById('auth-error');
    
    // Reset previous error messages
    if (errorP) errorP.textContent = '';

    // Show loading spinner and hide login form
    loadingContainer?.classList.remove('hidden');
    authContainer?.classList.add('hidden');

    try {
        await signInWithEmailAndPassword(auth, email, password);
        // No need to do anything else here. The onAuthStateChanged listener in main.js will handle the UI switch.
    } catch (error) {
        // Handle specific authentication errors
        if (error.code === 'auth/invalid-credential' || error.code === 'auth/wrong-password' || error.code === 'auth/user-not-found') {
            if (errorP) errorP.textContent = "Invalid email or password. Please try again.";
        } else {
            if (errorP) errorP.textContent = "An unknown error occurred. Please check your connection.";
            console.error("Authentication Error:", error);
        }
        
        // Show the login form again on failure
        loadingContainer?.classList.add('hidden');
        authContainer?.classList.remove('hidden');
    }
}

/**
 * Signs the current user out.
 */
export function handleLogout() {
    signOut(auth).catch(error => {
        console.error("Logout Error:", error);
        alert("Could not log out. Please check your connection.");
    });
}

/**
 * Attaches event listeners to the authentication-related elements.
 * This should be called once when the application loads.
 */
export function initializeAuthEventListeners() {
    const loginForm = document.getElementById('login-form');
    
    loginForm?.addEventListener('submit', (e) => {
        e.preventDefault();
        const email = document.getElementById('email').value;
        const password = document.getElementById('password').value;
        signIn(email, password);
    });
}
