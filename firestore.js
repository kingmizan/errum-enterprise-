// --- firestore.js ---
// Handles all interactions with the Firestore database

import { db } from './firebase-config.js';
import { collection, onSnapshot, addDoc, doc, setDoc, deleteDoc, query, orderBy } from "https://www.gstatic.com/firebasejs/9.15.0/firebase-firestore.js";
import { state } from './state.js';
import { updateUI } from './navigation.js'; // Import the new central UI updater

/**
 * Initializes real-time listeners for transactions and contacts.
 * When data changes, it updates the state and calls the central UI updater.
 */
export function initFirestoreListeners() {
    if (state.transactionsUnsubscribe) state.transactionsUnsubscribe();
    if (state.contactsUnsubscribe) state.contactsUnsubscribe();

    const transQuery = query(collection(db, "users", state.currentUserId, "transactions"));
    state.transactionsUnsubscribe = onSnapshot(transQuery, snapshot => {
        state.transactions = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        updateUI(); // Call the central updater function
    });

    const contactsQuery = query(collection(db, "users", state.currentUserId, "contacts"), orderBy("name"));
    state.contactsUnsubscribe = onSnapshot(contactsQuery, snapshot => {
        state.contacts = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        updateUI(); // Call the central updater function
    });
}

/**
 * Generic function to save a document (creates or updates).
 * @param {string} collectionName - The name of the collection.
 * @param {string|null} id - The document ID to update, or null to create.
 * @param {object} data - The data to save.
 */
export const saveDoc = async (collectionName, id, data) => {
    if (id) {
        return await setDoc(doc(db, "users", state.currentUserId, collectionName, id), data, { merge: true });
    } else {
        return await addDoc(collection(db, "users", state.currentUserId, collectionName), data);
    }
};

/**
 * Generic function to delete a document.
 * @param {string} collectionName - The name of the collection.
 * @param {string} id - The document ID to delete.
 */
export const deleteDocument = async (collectionName, id) => {
    return await deleteDoc(doc(db, "users", state.currentUserId, collectionName, id));
};
