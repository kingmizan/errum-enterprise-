// --- auth.js ---
// Handles user sign-in, sign-out, and state changes.

import { auth } from './firebase-config.js';
// THIS LINE FIXES THE ERROR by importing the necessary Firebase functions
import { signInWithEmailAndPassword, onAuthStateChanged, signOut, EmailAuthProvider, reauthenticateWithCredential, updatePassword } from "https://www.gstatic.com/firebasejs/9.15.0/firebase-auth.js";
import { state } from './state.js';
import { initFirestoreListeners } from './firestore.js';
import { navigateTo, bindAppEventListeners } from './navigation.js';
import { showToast } from './ui.js';

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
    e.preventDefault();
    const currentPassword = document.getElementById('current-password').value;
    const newPassword = document.getElementById('new-password').value;
    const confirmPassword = document.getElementById('confirm-password').value;
    const errorP = document.getElementById('password-error');
    errorP.textContent = '';

    if (!currentPassword || !newPassword || !confirmPassword) {
        errorP.textContent = 'Please fill all fields.'; return;
    }
    if (newPassword.length < 6) {
        errorP.textContent = 'New password must be at least 6 characters.'; return;
    }
    if (newPassword !== confirmPassword) {
        errorP.textContent = 'New passwords do not match.'; return;
    }

    const user = auth.currentUser;
    const credential = EmailAuthProvider.credential(user.email, currentPassword);

    try {
        await reauthenticateWithCredential(user, credential);
        await updatePassword(user, newPassword);
        showToast('Password updated successfully!');
        document.getElementById('password-change-form').reset();
        document.getElementById('password-modal').classList.add('hidden');
    } catch (error) {
        if (error.code === 'auth/wrong-password') {
            errorP.textContent = 'Incorrect current password.';
        } else {
            errorP.textContent = 'An error occurred. Please try again.';
            console.error(error);
        }
    }
}
