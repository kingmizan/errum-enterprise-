// js/auth.js

import { signInWithEmailAndPassword, signOut } from "https://www.gstatic.com/firebasejs/9.15.0/firebase-auth.js";
import { auth } from './firebase.js';

async function signIn(email, password) {
    const errorP = document.getElementById('auth-error');
    if (errorP) errorP.textContent = '';
    try {
        await signInWithEmailAndPassword(auth, email, password);
    } catch (error) {
        if (errorP) errorP.textContent = "Invalid email or password.";
        console.error("Auth Error:", error);
    }
}

export function handleLogout() {
    signOut(auth).catch(error => console.error("Logout Error:", error));
}

export function initializeAuthEventListeners() {
    const loginForm = document.getElementById('login-form');
    loginForm?.addEventListener('submit', (e) => {
        e.preventDefault();
        const email = document.getElementById('email').value;
        const password = document.getElementById('password').value;
        signIn(email, password);
    });
}
