// --- firestore.js ---
import { db } from './firebase-config.js';
import { collection, onSnapshot, addDoc, doc, setDoc, deleteDoc, query, orderBy } from "https://www.gstatic.com/firebasejs/9.15.0/firebase-firestore.js";
import { state } from './state.js';
import { updateUI } from './navigation.js';

export function initFirestoreListeners() {
    if (state.transactionsUnsubscribe) state.transactionsUnsubscribe();
    if (state.contactsUnsubscribe) state.contactsUnsubscribe();

    const transQuery = query(collection(db, "users", state.currentUserId, "transactions"));
    state.transactionsUnsubscribe = onSnapshot(transQuery, snapshot => {
        state.transactions = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        updateUI();
    });

    const contactsQuery = query(collection(db, "users", state.currentUserId, "contacts"), orderBy("name"));
    state.contactsUnsubscribe = onSnapshot(contactsQuery, snapshot => {
        state.contacts = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        updateUI();
    });
}

export const saveDoc = async (collectionName, id, data) => {
    if (id) {
        return await setDoc(doc(db, "users", state.currentUserId, collectionName, id), data, { merge: true });
    } else {
        return await addDoc(collection(db, "users", state.currentUserId, collectionName), data);
    }
};

export const deleteDocument = async (collectionName, id) => {
    return await deleteDoc(doc(db, "users", state.currentUserId, collectionName, id));
};
