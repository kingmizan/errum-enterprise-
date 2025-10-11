// js/api.js

import { db } from './firebase.js';
import { 
    collection, 
    onSnapshot, 
    addDoc, 
    doc, 
    setDoc, 
    deleteDoc, 
    query, 
    orderBy,
    getDoc // This is needed for fetching a single document
} from "https://www.gstatic.com/firebasejs/9.15.0/firebase-firestore.js";

// ✨ FIX: Export the necessary Firestore objects for use in other files
export { db, doc, getDoc };

// Variables to hold the unsubscribe functions for real-time listeners
let contactsUnsubscribe = null;
let transactionsUnsubscribe = null;

/**
 * Listens for real-time updates to the contacts collection.
 * @param {string} userId - The UID of the logged-in user.
 * @param {function} callback - The function to call with the updated contacts array.
 */
export function listenToContacts(userId, callback) {
    if (contactsUnsubscribe) contactsUnsubscribe();
    const contactsQuery = query(collection(db, "users", userId, "contacts"), orderBy("name"));
    contactsUnsubscribe = onSnapshot(contactsQuery, snapshot => {
        const contacts = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        callback(contacts);
    });
}

/**
 * Listens for real-time updates to the transactions collection.
 * @param {string} userId - The UID of the logged-in user.
 * @param {function} callback - The function to call with the updated transactions array.
 */
export function listenToTransactions(userId, callback) {
    if (transactionsUnsubscribe) transactionsUnsubscribe();
    const transQuery = query(collection(db, "users", userId, "transactions"), orderBy("date", "desc"));
    transactionsUnsubscribe = onSnapshot(transQuery, snapshot => {
        const transactions = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        callback(transactions);
    });
}

/**
 * Stops all active Firestore listeners. Called on user logout.
 */
export function stopListeners() {
    if (contactsUnsubscribe) contactsUnsubscribe();
    if (transactionsUnsubscribe) transactionsUnsubscribe();
}

/**
 * Saves a contact to the database (creates or updates).
 * @param {string} userId
 * @param {object} contactData
 * @param {string|null} id
 */
export function saveContact(userId, contactData, id = null) {
    if (id) {
        return setDoc(doc(db, "users", userId, "contacts", id), contactData, { merge: true });
    }
    return addDoc(collection(db, "users", userId, "contacts"), contactData);
}

/**
 * Deletes a contact from the database.
 * @param {string} userId
 * @param {string} contactId
 */
export function deleteContact(userId, contactId) {
    return deleteDoc(doc(db, "users", userId, "contacts", contactId));
}

/**
 * Saves a transaction to the database (creates or updates).
 * @param {string} userId
 * @param {object} transactionData
 * @param {string|null} id
 */
export function saveTransaction(userId, transactionData, id = null) {
    if (id) {
        return setDoc(doc(db, "users", userId, "transactions", id), transactionData);
    }
    return addDoc(collection(db, "users", userId, "transactions"), transactionData);
}

/**
 * Deletes a transaction from the database.
 * @param {string} userId
 * @param {string} transactionId
 */
export function deleteTransaction(userId, transactionId) {
    return deleteDoc(doc(db, "users", userId, "transactions", transactionId));
}

/**
 * Updates a specific field or fields in a transaction document.
 * Used for adding payments without overwriting the whole document.
 * @param {string} userId
 * @param {string} transactionId
 * @param {object} data
 */
export function updateTransaction(userId, transactionId, data) {
    const transactionRef = doc(db, "users", userId, "transactions", transactionId);
    return setDoc(transactionRef, data, { merge: true });
}
