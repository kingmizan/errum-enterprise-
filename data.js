// data.js

import { db } from './firebase-config.js';
import { collection, onSnapshot, query, orderBy } from "https://www.gstatic.com/firebasejs/9.15.0/firebase-firestore.js";

// Exported state arrays that other modules can import and read
export let transactions = [];
export let contacts = [];

let transactionsUnsubscribe = null;
let contactsUnsubscribe = null;

/**
 * Initializes the real-time data listeners for transactions and contacts.
 * @param {string} userId - The UID of the currently logged-in user.
 * @param {function} onDataUpdate - A callback function to be executed whenever data changes.
 */
export function initDataListeners(userId, onDataUpdate) {
    // Unsubscribe from any previous listeners to prevent memory leaks
    if (transactionsUnsubscribe) transactionsUnsubscribe();
    if (contactsUnsubscribe) contactsUnsubscribe();

    // Listener for transactions
    const transQuery = query(collection(db, "users", userId, "transactions"));
    transactionsUnsubscribe = onSnapshot(transQuery, snapshot => {
        transactions = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        onDataUpdate(); // Notify the main app that data has changed
    });
    
    // Listener for contacts
    const contactsQuery = query(collection(db, "users", userId, "contacts"), orderBy("name"));
    contactsUnsubscribe = onSnapshot(contactsQuery, snapshot => {
        contacts = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        onDataUpdate(); // Notify the main app that data has changed
    });
}

/**
 * Unsubscribes from all active Firebase listeners.
 */
export function unsubscribeDataListeners() {
    if (transactionsUnsubscribe) transactionsUnsubscribe();
    if (contactsUnsubscribe) contactsUnsubscribe();
    transactions = [];
    contacts = [];
}
