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

// --- APP LOGIC OBJECT ---
const appLogic = {
    getPayments(history) {
        return (history || []).reduce((sum, p) => sum + p.amount, 0);
    },

    createAvatar(name) {
        if (!name) return `<div class="avatar" style="background-color: #94a3b8;">?</div>`;
        const initials = name.split(' ').map(n => n[0]).join('').substring(0, 2);
        let hash = 0;
        for (let i = 0; i < name.length; i++) {
            hash = name.charCodeAt(i) + ((hash << 5) - hash);
        }
        const h = hash % 360;
        return `<div class="avatar" style="background-color: hsl(${h}, 50%, 40%)">${initials}</div>`;
    },

    getFilteredTransactions() {
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
    },
    
    renderDashboardPaginationControls(totalItems) {
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
                this.renderAll();
            }
        });

        document.getElementById('next-page-btn')?.addEventListener('click', () => {
            if (dashboardCurrentPage < totalPages) {
                dashboardCurrentPage++;
                this.renderAll();
            }
        });
    },

    renderDashboardMetrics() {
        let totalPayable = 0, totalReceivable = 0;

        transactions.forEach(t => {
            if (t.type === 'trade') {
                totalPayable += (t.supplierTotal || 0) - this.getPayments(t.paymentsToSupplier);
                totalReceivable += (t.buyerTotal || 0) - this.getPayments(t.paymentsFromBuyer);
            } else if (t.type === 'payment') {
                if (t.paymentType === 'made') {
                    totalPayable -= t.amount;
                } else {
                    totalReceivable -= t.amount;
                }
            }
        });

        contacts.forEach(c => {
            if (c.openingBalance && c.openingBalance.amount > 0) {
                if (c.openingBalance.type === 'payable') {
                    totalPayable += c.openingBalance.amount;
                } else {
                    totalReceivable += c.openingBalance.amount;
                }
            }
        });

        const profit = totalReceivable - totalPayable;
        
        animateCountUp(document.getElementById('total-payable'), totalPayable);
        animateCountUp(document.getElementById('total-receivable'), totalReceivable);
        animateCountUp(document.getElementById('total-profit'), profit);
    },

    renderTransactionHistory(data) {
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
                avatarHtml = this.createAvatar(t.supplierName);
                detailsHtml = `
                    <div class="font-semibold">${t.supplierName} → ${t.buyerName}</div>
                    <div class="text-sm text-slate-500">${t.item}</div>
                `;
                const profitClass = t.profit >= 0 ? 'text-green-600' : 'text-rose-500';
                amountHtml = `<div class="transaction-amount ${profitClass}">৳${(t.profit || 0).toFixed(2)}</div>`;
            } else if (t.type === 'payment') {
                avatarHtml = this.createAvatar(t.name);
                const typeClass = t.paymentType === 'made' ? 'text-rose-500' : 'text-green-600';
                detailsHtml = `
                    <div class="font-semibold">${t.name}</div>
                    <div class="text-sm text-slate-500">${t.description}</div>
                `;
                amountHtml = `<div class="transaction-amount ${typeClass}">${t.paymentType === 'made' ? '-' : '+'} ৳${(t.amount || 0).toFixed(2)}</div>`;
            }

            itemDiv.innerHTML = `
                ${avatarHtml}
                <div class="transaction-details">
                    ${detailsHtml}
                </div>
                ${amountHtml}
            `;
            listContainer.appendChild(itemDiv);
        });
    },

    renderContacts() {
        const tbody = document.getElementById('contacts-table-body'); if (!tbody) return; tbody.innerHTML = '';
        if (contacts.length === 0) { tbody.innerHTML = `<tr><td colspan="6" class="text-center py-12 text-slate-500">No contacts found. Add one to get started!</td></tr>`; return; }
        
        contacts.forEach(c => {
            let netBalance = 0;
            if (c.openingBalance && c.openingBalance.amount > 0) {
                netBalance = c.openingBalance.type === 'receivable' ? c.openingBalance.amount : -c.openingBalance.amount;
            }
            const relatedTransactions = transactions.filter(t => t.supplierName === c.name || t.buyerName === c.name || t.name === c.name);
            relatedTransactions.forEach(t => {
                if (t.type === 'trade') {
                    if (t.supplierName === c.name) netBalance -= (t.supplierTotal - this.getPayments(t.paymentsToSupplier));
                    if (t.buyerName === c.name) netBalance += (t.buyerTotal - this.getPayments(t.paymentsFromBuyer));
                } else if (t.type === 'payment' && t.name === c.name) {
                    if (t.paymentType === 'made') netBalance += t.amount;
                    else netBalance -= t.amount;
                }
            });

            let lastTransactionDate = '<span class="text-slate-400">N/A</span>';
            if (relatedTransactions.length > 0) {
                relatedTransactions.sort((a, b) => new Date(b.date) - new Date(a.date));
                lastTransactionDate = relatedTransactions[0].date;
            }

            const balanceText = `৳${Math.abs(netBalance).toFixed(2)}`;
            let balanceClass = 'text-slate-500';
            if (netBalance > 0.01) balanceClass = 'text-green-600';
            else if (netBalance < -0.01) balanceClass = 'text-rose-500';

            let typeBadge;
            if (c.type === 'buyer') {
                typeBadge = `<span class="inline-flex items-center gap-1.5 py-1 px-2.5 rounded-full text-xs font-medium bg-teal-100 text-teal-800">
                    <svg xmlns="http://www.w3.org/2000/svg" class="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M15 13l-3 3m0 0l-3-3m3 3V8m0 13a9 9 0 110-18 9 9 0 010 18z" /></svg>
                    Buyer
                </span>`;
            } else {
                typeBadge = `<span class="inline-flex items-center gap-1.5 py-1 px-2.5 rounded-full text-xs font-medium bg-slate-100 text-slate-800">
                    <svg xmlns="http://www.w3.org/2000/svg" class="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M9 11l3-3m0 0l3 3m-3-3v8m0-13a9 9 0 110-18 9 9 0 010 18z" /></svg>
                    Supplier
                </span>`;
            }
            
            const row = document.createElement('tr'); row.className = 'odd:bg-slate-50 hover:bg-slate-100 border-b md:border-b-0';
            row.innerHTML = `<td data-label="Name" class="py-4 px-4 align-middle">
                                <button data-ledger-id="${c.id}" class="font-medium text-slate-900 hover:text-teal-600 text-left cursor-pointer">${c.name}</button>
                               </td>
                               <td data-label="Type" class="py-4 px-4 align-middle">${typeBadge}</td>
                               <td data-label="Phone" class="py-4 px-4 align-middle">${c.phone || 'N/A'}</td>
                               <td data-label="Last Active" class="py-4 px-4 align-middle font-medium text-slate-600">${lastTransactionDate}</td>
                               <td data-label="Net Balance" class="py-4 px-4 align-middle font-bold text-right ${balanceClass}">${balanceText}</td>
                               <td data-label="Actions" class="py-4 px-4 align-middle actions-cell">
                                <div class="flex justify-end md:justify-center items-center gap-1">
                                    <button title="Add Direct Payment" data-direct-payment-id="${c.id}" class="p-1 text-teal-600 hover:bg-teal-100 rounded-full"><svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-11a1 1 0 10-2 0v2H7a1 1 0 100 2h2v2a1 1 0 102 0v-2h2a1 1 0 100-2h-2V7z" clip-rule="evenodd" /></svg></button>
                                    <button title="Edit Contact" data-edit-contact-id="${c.id}" class="p-1 text-blue-600 hover:bg-blue-100 rounded-full"><svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg></button>
                                    <button title="Delete Contact" data-delete-contact-id="${c.id}" class="p-1 text-rose-500 hover:bg-rose-100 rounded-full"><svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg></button>
                                </div>
                               </td>`;
            tbody.appendChild(row);
        });
    },

    renderAll() { 
        const data = this.getFilteredTransactions(); 
        this.renderDashboardMetrics(data); 
        this.renderTransactionHistory(data); 
        this.renderDashboardPaginationControls(data.length);
    },
    
    // ... (All other functions from handleDelete to showTransactionDetailsModal remain the same)
    // For brevity, I am omitting the functions that do not need changes. Please copy them from your previous version.

    async handleDelete(id) {
        if (confirm('Are you sure? This will permanently delete the transaction.')) {
            await deleteDoc(doc(db, "users", currentUserId, "transactions", id));
            showToast('Transaction deleted.');
        }
    },
    
    // ... all other functions like resetContactForm, handleSaveContact, etc.
};


// --- NAVIGATION & EVENT BINDING ---
const navigateTo = (section) => {
    return new Promise((resolve) => {
        document.querySelectorAll('.nav-link').forEach(link => {
            link.classList.toggle('active', link.dataset.section === section);
        });
        mainContent.innerHTML = templates[section];
        
        mainContent.classList.remove('content-enter');
        void mainContent.offsetWidth; // Trigger reflow
        mainContent.classList.add('content-enter');

        if (section === 'dashboard') {
            dashboardCurrentPage = 1;
        }
        setTimeout(() => {
            bindSectionEventListeners(section);
            resolve();
        }, 0);
    });
};

const bindAppEventListeners = () => {
    document.querySelectorAll('.nav-link').forEach(link => link.addEventListener('click', (e) => navigateTo(e.currentTarget.dataset.section)));
    document.getElementById('logout-btn').addEventListener('click', () => signOut(auth));
    document.getElementById('save-payment-btn').addEventListener('click', () => appLogic.handleSavePayment());
    document.querySelectorAll('[data-close-modal]').forEach(btn => btn.addEventListener('click', (e) => document.getElementById(e.currentTarget.dataset.closeModal).classList.add('hidden')));
    document.getElementById('overall-statement-btn').addEventListener('click', () => appLogic.showPaginatedStatement());
    document.getElementById('statement-png-btn').addEventListener('click', () => appLogic.handleContentExport('png'));
    document.getElementById('statement-pdf-btn').addEventListener('click', () => appLogic.handleContentExport('pdf'));
    document.getElementById('statement-csv-btn').addEventListener('click', () => appLogic.handleContentExportCSV());
    document.getElementById('contact-form').addEventListener('submit', (e) => appLogic.handleSaveContact(e));
    document.getElementById('settings-btn').addEventListener('click', () => document.getElementById('password-modal').classList.remove('hidden'));
    document.getElementById('password-change-form').addEventListener('submit', (e) => appLogic.handlePasswordChange(e));
    document.getElementById('direct-payment-form').addEventListener('submit', (e) => appLogic.handleDirectPaymentSubmit(e));
};

const bindSectionEventListeners = (section) => {
    if (section === 'dashboard') {
        appLogic.renderAll();
        document.getElementById('search-input').addEventListener('input', () => { dashboardCurrentPage = 1; appLogic.renderAll(); });
        document.getElementById('filter-start-date').addEventListener('change', () => { dashboardCurrentPage = 1; appLogic.renderAll(); });
        document.getElementById('filter-end-date').addEventListener('change', () => { dashboardCurrentPage = 1; appLogic.renderAll(); });
        
        const list = document.getElementById('transaction-history-list');
        list.addEventListener('click', (e) => {
            const item = e.target.closest('.transaction-item');
            if (item && item.dataset.id) {
                appLogic.showTransactionDetailsModal(item.dataset.id);
            }
        });
    } else if (section === 'contacts') {
        appLogic.renderContacts();
        document.getElementById('add-contact-btn').addEventListener('click', () => { appLogic.resetContactForm(); document.getElementById('contact-modal').classList.remove('hidden'); });
        document.getElementById('contacts-table-body').addEventListener('click', e => {
            const target = e.target.closest('button'); if (!target) return;
            const { editContactId, deleteContactId, ledgerId, directPaymentId } = target.dataset;
            if (editContactId) appLogic.setupContactFormForEdit(editContactId); 
            if (deleteContactId) appLogic.handleDeleteContact(deleteContactId); 
            if (ledgerId) appLogic.showContactLedger(ledgerId);
            if (directPaymentId) appLogic.openDirectPaymentModal(directPaymentId);
        });
    } else if (section === 'transaction-form') {
        appLogic.populateTradeDropdowns();
        appLogic.resetTradeForm();
        document.getElementById('transaction-form').addEventListener('submit', (e) => appLogic.handleTradeFormSubmit(e));
        document.getElementById('reset-form-btn').addEventListener('click', () => appLogic.resetTradeForm());
        document.getElementById('cancel-transaction-btn').addEventListener('click', () => navigateTo('dashboard'));
        ['scale-weight', 'less'].forEach(id => document.getElementById(id).addEventListener('input', () => appLogic.calculateNetWeight()));
        ['supplier-rate', 'buyer-rate'].forEach(id => document.getElementById(id).addEventListener('input', () => appLogic.updateTradeTotals()));
    }
};

// --- AUTH & INITIALIZATION ---
onAuthStateChanged(auth, user => {
    if (user) {
        currentUserId = user.uid;
        document.getElementById('user-email').textContent = user.email;

        if (transactionsUnsubscribe) transactionsUnsubscribe();
        if (contactsUnsubscribe) contactsUnsubscribe();

        const transQuery = query(collection(db, "users", currentUserId, "transactions"));
        transactionsUnsubscribe = onSnapshot(transQuery, snapshot => {
            transactions = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            const currentSection = document.querySelector('.nav-link.active')?.dataset.section;
            if (currentSection === 'dashboard' || currentSection === 'contacts') {
                appLogic.renderAll(); 
                appLogic.renderContacts();
            }
        });
        
        const contactsQuery = query(collection(db, "users", currentUserId, "contacts"), orderBy("name"));
        contactsUnsubscribe = onSnapshot(contactsQuery, snapshot => {
            contacts = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            const currentSection = document.querySelector('.nav-link.active')?.dataset.section;
             if (currentSection === 'dashboard' || currentSection === 'contacts') {
                appLogic.renderAll(); 
                appLogic.renderContacts();
            } else if (currentSection === 'transaction-form') {
                appLogic.populateTradeDropdowns();
            }
        });

        appContainer.classList.remove('hidden');
        authContainer.classList.add('hidden');
        loadingContainer.classList.add('hidden');
        
        navigateTo('dashboard');
        bindAppEventListeners();

    } else {
        currentUserId = null;
        transactions = [];
        contacts = [];
        if (transactionsUnsubscribe) transactionsUnsubscribe();
        if (contactsUnsubscribe) contactsUnsubscribe();
        
        appContainer.classList.add('hidden');
        authContainer.classList.remove('hidden');
        loadingContainer.classList.add('hidden');
    }
});

document.getElementById('login-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    loadingContainer.classList.remove('hidden');
    authContainer.classList.add('hidden');
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    const errorP = document.getElementById('auth-error');
    errorP.textContent = '';
    try {
        await signInWithEmailAndPassword(auth, email, password);
    } catch (error) {
        errorP.textContent = "Invalid email or password.";
        loadingContainer.classList.add('hidden');
        authContainer.classList.remove('hidden');
    }
});
