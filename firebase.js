// js/firebase.js
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.15.0/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/9.15.0/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/9.15.0/firebase-firestore.js";

// ⚠️ YOUR FIREBASE CONFIGURATION - THIS WILL BE PUBLIC
// SECURE YOUR DATABASE USING FIRESTORE SECURITY RULES
const firebaseConfig = {
    apiKey: "AIzaSyAvjLh6aRRUyrJDUtywBbOUwTLH4hWX9e4",
    authDomain: "milon-ltd.firebaseapp.com",
    projectId: "milon-ltd",
    storageBucket: "milon-ltd.appspot.com",
    messagingSenderId: "780532796920",
    appId: "1:780532796920:web:433cb112e3836c79e35a0d"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
