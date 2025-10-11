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
    orderBy 
} from "https://www.gstatic.com/firebasejs/9.15.0/firebase-firestore.js";

// Variables to hold the unsubscribe functions for real-time listeners
let contactsUnsubscribe = null;
let transactionsUnsubscribe = null;

/**
 * Listens for real-time updates to the contacts collection.
 * @param {string} userId - The UID of the logged-in user.
 * @param {function} callback - The function to call with the updated contacts array.
 */
export function listenToContacts(userId, callback) {
    if (contactsUnsubscribe) contactsUnsubscribe(); // Unsubscribe from any previous listener
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
    if (transactionsUnsubscribe) transactionsUnsubscribe(); // Unsubscribe from any previous listener
    const transQuery = query(collection(db, "users", userId, "transactions"));
    transactionsUnsubscribe = onSnapshot(transQuery, snapshot => {
        const transactions = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        callback(transactions);
    });
}

/**
 * Stops all active Firestore listeners. Crucial for when a user logs out.
 */
export function stopListeners() {
    if (contactsUnsubscribe) contactsUnsubscribe();
    if (transactionsUnsubscribe) transactionsUnsubscribe();
}

/**
 * Saves a contact to the database. Handles both creating and updating.
 * @param {string} userId - The UID of the logged-in user.
 * @param {object} contactData - The contact object to save.
 * @param {string|null} id - The ID of the contact to update, or null to create a new one.
 * @returns {Promise} A promise that resolves when the operation is complete.
 */
export function saveContact(userId, contactData, id = null) {
    if (id) {
        // Update an existing contact
        const contactRef = doc(db, "users", userId, "contacts", id);
        return setDoc(contactRef, contactData, { merge: true });
    } else {
        // Add a new contact
        const contactsCol = collection(db, "users", userId, "contacts");
        return addDoc(contactsCol, contactData);
    }
}

/**
 * Deletes a contact from the database.
 * @param {string} userId - The UID of the logged-in user.
 * @param {string} contactId - The ID of the contact to delete.
 * @returns {Promise} A promise that resolves when the deletion is complete.
 */
export function deleteContact(userId, contactId) {
    const contactRef = doc(db, "users", userId, "contacts", contactId);
    return deleteDoc(contactRef);
}

/**
 * Saves a transaction to the database. Handles both creating and updating.
 * @param {string} userId - The UID of the logged-in user.
 * @param {object} transactionData - The transaction object to save.
 * @param {string|null} id - The ID of the transaction to update, or null to create a new one.
 * @returns {Promise} A promise that resolves when the operation is complete.
 */
export function saveTransaction(userId, transactionData, id = null) {
    if (id) {
        // Update an existing transaction
        const transactionRef = doc(db, "users", userId, "transactions", id);
        return setDoc(transactionRef, transactionData);
    } else {
        // Add a new transaction
        const transactionsCol = collection(db, "users", userId, "transactions");
        return addDoc(transactionsCol, transactionData);
    }
}

/**
 * Updates a specific transaction, often for adding payments.
 * @param {string} userId - The UID of the logged-in user.
 * @param {string} transactionId - The ID of the transaction to update.
 * @param {object} data - The data to merge into the existing document (e.g., { paymentsToSupplier: [...] }).
 * @returns {Promise} A promise that resolves when the update is complete.
 */
export function updateTransaction(userId, transactionId, data) {
    const transactionRef = doc(db, "users", userId, "transactions", transactionId);
    return setDoc(transactionRef, data, { merge: true });
}

/**
 * Deletes a transaction from the database.
 * @param {string} userId - The UID of the logged-in user.
 * @param {string} transactionId - The ID of the transaction to delete.
 * @returns {Promise} A promise that resolves when the deletion is complete.
 */
export function deleteTransaction(userId, transactionId) {
    const transactionRef = doc(db, "users", userId, "transactions", transactionId);
    return deleteDoc(transactionRef);
}
