// Import the functions you need from the SDKs you need
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.15.0/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/9.15.0/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/9.15.0/firebase-firestore.js";

// Your web app's Firebase configuration
const firebaseConfig = {
    apiKey: "AIzaSyABNEJkkGgPJ0dnR5d0MvMe7LKxNXmY3qA",
    authDomain: "errumint.firebaseapp.com",
    projectId: "errumint",
    storageBucket: "errumint.firebasestorage.app",
    messagingSenderId: "866391947093",
    appId: "1:866391947093:web:9800939477c9a3969ae1dc"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize and export Firebase services
export const auth = getAuth(app);
export const db = getFirestore(app);
