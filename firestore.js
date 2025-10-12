// --- firestore.js ---
// Handles all interactions with the Firestore database

import { db } from './firebase-config.js';
import { collection, onSnapshot, addDoc, doc, setDoc, deleteDoc, query, orderBy } from "https://www.gstatic.com/firebasejs/9.15.0/firebase-firestore.js";
import { state } from './state.js';
import { renderAll, renderContacts } from './navigation.js'; // To trigger re-renders
import { populateTradeDropdowns } from './transactions.js';

// Initializes the real-time listeners for transactions and contacts
export function initFirestoreListeners() {
    if (state.transactionsUnsubscribe) state.transactionsUnsubscribe();
    if (state.contactsUnsubscribe) state.contactsUnsubscribe();

    const transQuery = query(collection(db, "users", state.currentUserId, "transactions"));
    state.transactionsUnsubscribe = onSnapshot(transQuery, snapshot => {
        state.transactions = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        const currentSection = document.querySelector('.nav-link.active')?.dataset.section;
        if (['dashboard', 'contacts', 'statements'].includes(currentSection)) {
            renderAll();
            renderContacts();
        }
    });

    const contactsQuery = query(collection(db, "users", state.currentUserId, "contacts"), orderBy("name"));
    state.contactsUnsubscribe = onSnapshot(contactsQuery, snapshot => {
        state.contacts = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        const currentSection = document.querySelector('.nav-link.active')?.dataset.section;
        if (['dashboard', 'contacts'].includes(currentSection)) {
            renderAll();
            renderContacts();
        } else if (currentSection === 'transaction-form') {
            populateTradeDropdowns();
        }
    });
}

// Generic function to save a document (create or update)
export const saveDoc = async (collectionName, id, data) => {
    if (id) {
        return await setDoc(doc(db, "users", state.currentUserId, collectionName, id), data, { merge: true });
    } else {
        return await addDoc(collection(db, "users", state.currentUserId, collectionName), data);
    }
};

// Generic function to delete a document
export const deleteDocument = async (collectionName, id) => {
    return await deleteDoc(doc(db, "users", state.currentUserId, collectionName, id));
};
