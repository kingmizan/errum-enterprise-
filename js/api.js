// js/api.js

import { db } from './firebase.js';
import { collection, onSnapshot, addDoc, doc, setDoc, deleteDoc, query, orderBy, getDoc } from "https://www.gstatic.com/firebasejs/9.15.0/firebase-firestore.js";

export { db, doc, getDoc };

let contactsUnsubscribe = null;
let transactionsUnsubscribe = null;

export function listenToContacts(userId, callback) {
    if (contactsUnsubscribe) contactsUnsubscribe();
    const contactsQuery = query(collection(db, "users", userId, "contacts"), orderBy("name"));
    contactsUnsubscribe = onSnapshot(contactsQuery, snapshot => {
        const contacts = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        callback(contacts);
    });
}

export function listenToTransactions(userId, callback) {
    if (transactionsUnsubscribe) transactionsUnsubscribe();
    const transQuery = query(collection(db, "users", userId, "transactions"), orderBy("date", "desc"));
    transactionsUnsubscribe = onSnapshot(transQuery, snapshot => {
        const transactions = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        callback(transactions);
    });
}

export function stopListeners() {
    if (contactsUnsubscribe) contactsUnsubscribe();
    if (transactionsUnsubscribe) transactionsUnsubscribe();
}

export function saveContact(userId, contactData, id = null) {
    if (id) { return setDoc(doc(db, "users", userId, "contacts", id), contactData, { merge: true }); }
    return addDoc(collection(db, "users", userId, "contacts"), contactData);
}

export function deleteContact(userId, contactId) {
    return deleteDoc(doc(db, "users", userId, "contacts", contactId));
}

export function saveTransaction(userId, transactionData, id = null) {
    if (id) { return setDoc(doc(db, "users", userId, "transactions", id), transactionData); }
    return addDoc(collection(db, "users", userId, "transactions"), transactionData);
}

export function deleteTransaction(userId, transactionId) {
    return deleteDoc(doc(db, "users", userId, "transactions", transactionId));
}
