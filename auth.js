// --- auth.js ---

// Make sure these start with './'
import { auth } from './firebase-config.js';
import { state } from './state.js';
import { initFirestoreListeners } from './firestore.js';
import { navigateTo, bindAppEventListeners } from './navigation.js';
import { showToast } from './ui.js';
// ... rest of the file

const loadingContainer = document.getElementById('loading-container');
const authContainer = document.getElementById('auth-container');
const appContainer = document.getElementById('app-container');

// Main function to initialize authentication flow
export function initAuth() {
    onAuthStateChanged(auth, user => {
        if (user) {
            // User is signed in
            state.currentUserId = user.uid;
            document.getElementById('user-email').textContent = user.email;
            initFirestoreListeners();

            appContainer.classList.remove('hidden');
            authContainer.classList.add('hidden');
            loadingContainer.classList.add('hidden');
            
            navigateTo('dashboard');
            bindAppEventListeners();
        } else {
            // User is signed out
            state.currentUserId = null;
            state.transactions = [];
            state.contacts = [];
            if (state.transactionsUnsubscribe) state.transactionsUnsubscribe();
            if (state.contactsUnsubscribe) state.contactsUnsubscribe();
            
            appContainer.classList.add('hidden');
            authContainer.classList.remove('hidden');
            loadingContainer.classList.add('hidden');
        }
    });
}

// Handles the login form submission
export async function handleLogin(e) {
    e.preventDefault();
    loadingContainer.classList.remove('hidden');
    authContainer.classList.add('hidden');
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    const errorP = document.getElementById('auth-error');
    errorP.textContent = '';
    try {
        await signInWithEmailAndPassword(auth, email, password);
    } catch (error) {
        errorP.textContent = "Invalid email or password.";
        loadingContainer.classList.add('hidden');
        authContainer.classList.remove('hidden');
    }
}

// Handles user sign out
export const handleSignOut = () => signOut(auth);

// Handles the password change form submission
export async function handlePasswordChange(e) {
    // ... (paste handlePasswordChange function code from original app.js)
    // You will need to import showToast from './ui.js' and auth from firebase-config
}
