// app.js

// --- IMPORTS ---
import { auth, db } from './firebase-config.js';
import { showToast, animateCountUp, templates } from './ui.js';
import { signInWithEmailAndPassword, onAuthStateChanged, signOut, EmailAuthProvider, reauthenticateWithCredential, updatePassword } from "https://www.gstatic.com/firebasejs/9.15.0/firebase-auth.js";
import { collection, onSnapshot, addDoc, doc, setDoc, deleteDoc, query, orderBy } from "https://www.gstatic.com/firebasejs/9.15.0/firebase-firestore.js";

// --- GLOBAL STATE ---
let transactions = [];
let contacts = [];
let currentUserId = null;
let transactionsUnsubscribe = null;
let contactsUnsubscribe = null;
let currentPaymentInfo = { id: null, type: null };
let dashboardCurrentPage = 1;
const dashboardItemsPerPage = 7;
let statementCurrentPage = 1;
const statementItemsPerPage = 10;
let currentStatementData = { type: null, data: [], name: '' };

// --- DOM ELEMENTS ---
const loadingContainer = document.getElementById('loading-container');
const authContainer = document.getElementById('auth-container');
const appContainer = document.getElementById('app-container');
const mainContent = document.getElementById('app-content');

// --- APP LOGIC (IIFE Pattern) ---
const appLogic = (() => {

    // --- Private Helper Functions ---
    const getPayments = (history) => (history || []).reduce((sum, p) => sum + p.amount, 0);

    const createAvatar = (name) => {
        if (!name) return `<div class="avatar" style="background-color: #94a3b8;">?</div>`;
        const initials = name.split(' ').map(n => n[0]).join('').substring(0, 2);
        let hash = 0;
        for (let i = 0; i < name.length; i++) {
            hash = name.charCodeAt(i) + ((hash << 5) - hash);
        }
        const h = hash % 360;
        return `<div class="avatar" style="background-color: hsl(${h}, 50%, 40%)">${initials}</div>`;
    };

    const getFilteredTransactions = () => {
        const searchInput = document.getElementById('search-input');
        const allSortedTransactions = [...transactions].sort((a, b) => new Date(b.date) - new Date(a.date));
        if (!searchInput) return allSortedTransactions;
        const searchTerm = searchInput.value.toLowerCase();
        const startDate = document.getElementById('filter-start-date').value;
        const endDate = document.getElementById('filter-end-date').value;
        return allSortedTransactions.filter(t =>
            (searchTerm === '' ||
            (t.item && t.item.toLowerCase().includes(searchTerm)) ||
            (t.supplierName && t.supplierName.toLowerCase().includes(searchTerm)) ||
            (t.buyerName && t.buyerName.toLowerCase().includes(searchTerm)) ||
            (t.name && t.name.toLowerCase().includes(searchTerm))) &&
            (!startDate || t.date >= startDate) &&
            (!endDate || t.date <= endDate)
        );
    };

    const renderDashboardPaginationControls = (totalItems) => {
        const controlsContainer = document.getElementById('pagination-controls');
        if (!controlsContainer) return;
        const totalPages = Math.ceil(totalItems / dashboardItemsPerPage);
        if (totalPages <= 1) {
            controlsContainer.innerHTML = '';
            return;
        }
        const prevDisabled = dashboardCurrentPage === 1 ? 'disabled' : '';
        const nextDisabled = dashboardCurrentPage === totalPages ? 'disabled' : '';
        controlsContainer.innerHTML = `
            <button id="prev-page-btn" class="px-3 py-1 text-sm rounded-md font-semibold bg-slate-200 hover:bg-slate-300 disabled:opacity-50" ${prevDisabled}>Previous</button>
            <span class="text-sm font-semibold">Page ${dashboardCurrentPage} of ${totalPages}</span>
            <button id="next-page-btn" class="px-3 py-1 text-sm rounded-md font-semibold bg-slate-200 hover:bg-slate-300 disabled:opacity-50" ${nextDisabled}>Next</button>
        `;
        document.getElementById('prev-page-btn')?.addEventListener('click', () => {
            if (dashboardCurrentPage > 1) {
                dashboardCurrentPage--;
                renderAll();
            }
        });
        document.getElementById('next-page-btn')?.addEventListener('click', () => {
            if (dashboardCurrentPage < totalPages) {
                dashboardCurrentPage++;
                renderAll();
            }
        });
    };

    const renderDashboardMetrics = () => {
        let totalPayable = 0, totalReceivable = 0;
        transactions.forEach(t => {
            if (t.type === 'trade') {
                totalPayable += (t.supplierTotal || 0) - getPayments(t.paymentsToSupplier);
                totalReceivable += (t.buyerTotal || 0) - getPayments(t.paymentsFromBuyer);
            } else if (t.type === 'payment') {
                if (t.paymentType === 'made') totalPayable -= t.amount;
                else totalReceivable -= t.amount;
            }
        });
        contacts.forEach(c => {
            if (c.openingBalance && c.openingBalance.amount > 0) {
                if (c.openingBalance.type === 'payable') totalPayable += c.openingBalance.amount;
                else totalReceivable += c.openingBalance.amount;
            }
        });
        const profit = totalReceivable - totalPayable;
        animateCountUp(document.getElementById('total-payable'), totalPayable);
        animateCountUp(document.getElementById('total-receivable'), totalReceivable);
        animateCountUp(document.getElementById('total-profit'), profit);
    };
    
    // --- Public Functions (will be returned) ---
    const renderAll = () => {
        const data = getFilteredTransactions();
        renderDashboardMetrics();
        renderTransactionHistory(data);
        renderDashboardPaginationControls(data.length);
    };

    const renderTransactionHistory = (data) => {
        const listContainer = document.getElementById('transaction-history-list');
        if (!listContainer) return;

        const startIndex = (dashboardCurrentPage - 1) * dashboardItemsPerPage;
        const endIndex = startIndex + dashboardItemsPerPage;
        const pageData = data.slice(startIndex, endIndex);

        listContainer.innerHTML = '';
        if (pageData.length === 0) {
            listContainer.innerHTML = `<div class="text-center py-12 text-slate-500"><div class="flex flex-col items-center gap-2"><svg xmlns="http://www.w3.org/2000/svg" class="h-12 w-12 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5"><path stroke-linecap="round" stroke-linejoin="round" d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" /></svg><h3 class="font-semibold mt-2">No Transactions Found</h3><p>Your recorded transactions will appear here.</p></div></div>`;
            return;
        }

        let lastDate = null;
        pageData.forEach(t => {
            if (t.date !== lastDate) {
                const dateHeader = document.createElement('div');
                dateHeader.className = 'date-header';
                dateHeader.textContent = t.date;
                listContainer.appendChild(dateHeader);
                lastDate = t.date;
            }

            const itemDiv = document.createElement('div');
            itemDiv.className = 'transaction-item';
            itemDiv.dataset.id = t.id;

            let avatarHtml, detailsHtml, amountHtml;

            if (t.type === 'trade') {
                avatarHtml = createAvatar(t.supplierName);
                detailsHtml = `<div class="font-semibold">${t.supplierName} → ${t.buyerName}</div><div class="text-sm text-slate-500">${t.item}</div>`;
                const profitClass = t.profit >= 0 ? 'text-green-600' : 'text-rose-500';
                amountHtml = `<div class="transaction-amount ${profitClass}">৳${(t.profit || 0).toFixed(2)}</div>`;
            } else if (t.type === 'payment') {
                avatarHtml = createAvatar(t.name);
                const typeClass = t.paymentType === 'made' ? 'text-rose-500' : 'text-green-600';
                detailsHtml = `<div class="font-semibold">${t.name}</div><div class="text-sm text-slate-500">${t.description}</div>`;
                amountHtml = `<div class="transaction-amount ${typeClass}">${t.paymentType === 'made' ? '-' : '+'} ৳${(t.amount || 0).toFixed(2)}</div>`;
            }

            itemDiv.innerHTML = `${avatarHtml}<div class="transaction-details">${detailsHtml}</div>${amountHtml}`;
            listContainer.appendChild(itemDiv);
        });
    };
    
    // ... all other functions go here, defined as const
    const handleDelete = async (id) => {
        // ... (this function is now inside the IIFE)
    };

    const showTransactionDetailsModal = (id) => {
        // ... (this function is now inside the IIFE)
    };
    
    // ... all other functions from your previous app.js ...

    // Return only the functions that need to be called from outside
    return {
        renderAll,
        renderContacts,
        handleSaveContact: async (e) => { /* implementation */ },
        handleDeleteContact: async (id) => { /* implementation */ },
        setupContactFormForEdit: (id) => { /* implementation */ },
        resetContactForm: () => { /* implementation */ },
        populateTradeDropdowns: () => { /* implementation */ },
        updateTradeTotals: () => { /* implementation */ },
        calculateNetWeight: () => { /* implementation */ },
        handleTradeFormSubmit: async (e) => { /* implementation */ },
        resetTradeForm: () => { /* implementation */ },
        showContactLedger: (id) => { /* implementation */ },
        showPaginatedStatement: (page = 1) => { /* implementation */ },
        handleContentExport: async (format) => { /* implementation */ },
        handleContentExportCSV: () => { /* implementation */ },
        handlePasswordChange: async (e) => { /* implementation */ },
        handleDirectPaymentSubmit: async (e) => { /* implementation */ },
        openDirectPaymentModal: (id) => { /* implementation */ },
        handleSavePayment: async () => { /* implementation */ },
        showTransactionDetailsModal, // shorthand for showTransactionDetailsModal: showTransactionDetailsModal
        handleDelete,
    };
})();

// --- NAVIGATION & EVENT BINDING ---
// (This section now correctly calls the exposed appLogic methods)
const navigateTo = (section) => {
    // ...
};
const bindAppEventListeners = () => {
    // ...
};
const bindSectionEventListeners = (section) => {
    // ...
};

// --- AUTH & INITIALIZATION ---
// (This section is unchanged)
onAuthStateChanged(auth, user => {
    // ...
});
document.getElementById('login-form').addEventListener('submit', async (e) => {
    // ...
});
