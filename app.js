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


// --- ALL APP FUNCTIONS ---
const appLogic = (() => {
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
        const allSortedTransactions = [...transactions].sort((a,b) => new Date(b.date) - new Date(a.date));
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

    const renderDashboardMetrics = (data) => {
        let totalPayable = 0, totalReceivable = 0;

        transactions.forEach(t => { 
            if (t.type === 'trade') {
                totalPayable += (t.supplierTotal || 0) - getPayments(t.paymentsToSupplier);
                totalReceivable += (t.buyerTotal || 0) - getPayments(t.paymentsFromBuyer);
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
                detailsHtml = `
                    <div class="font-semibold">${t.supplierName} → ${t.buyerName}</div>
                    <div class="text-sm text-slate-500">${t.item}</div>
                `;
                const profitClass = t.profit >= 0 ? 'text-green-600' : 'text-rose-500';
                amountHtml = `<div class="transaction-amount ${profitClass}">৳${(t.profit || 0).toFixed(2)}</div>`;
            } else if (t.type === 'payment') {
                avatarHtml = createAvatar(t.name);
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
    };

    const renderContacts = () => {
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
                    if (t.supplierName === c.name) netBalance -= (t.supplierTotal - getPayments(t.paymentsToSupplier));
                    if (t.buyerName === c.name) netBalance += (t.buyerTotal - getPayments(t.paymentsFromBuyer));
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
    };

    const renderAll = () => { 
        const data = getFilteredTransactions(); 
        renderDashboardMetrics(data); 
        renderTransactionHistory(data); 
        renderDashboardPaginationControls(data.length);
    };
    const resetContactForm = () => {
        document.getElementById('contact-form-title').textContent = 'Add New Party'; 
        document.getElementById('contact-form').reset(); 
        document.getElementById('contact-id').value = ''; 
        document.getElementById('contact-opening-balance').disabled = false;
        document.querySelectorAll('input[name="opening-balance-type"]').forEach(el => el.disabled = false);
    };
    const setupContactFormForEdit = (id) => {
        const contact = contacts.find(c => c.id === id); if (!contact) return; 
        resetContactForm();
        document.getElementById('contact-form-title').textContent = 'Edit Party'; 
        document.getElementById('contact-id').value = contact.id;
        document.getElementById('contact-name').value = contact.name; 
        document.getElementById('contact-phone').value = contact.phone;
        document.getElementById('contact-address').value = contact.address || '';
        document.querySelector(`#contact-form input[name="contact-type"][value="${contact.type}"]`).checked = true; 
        
        const balanceInput = document.getElementById('contact-opening-balance');
        const balanceTypeRadios = document.querySelectorAll('input[name="opening-balance-type"]');
        if(contact.openingBalance) {
            balanceInput.value = contact.openingBalance.amount;
            document.querySelector(`input[name="opening-balance-type"][value="${contact.openingBalance.type}"]`).checked = true;
        }
        balanceInput.disabled = true;
        balanceTypeRadios.forEach(el => el.disabled = true);
        
        document.getElementById('contact-modal').classList.remove('hidden');
    };
    const handleSaveContact = async (e) => {
        e.preventDefault();
        const id = document.getElementById('contact-id').value;
        const name = document.getElementById('contact-name').value.trim();
        if (!name) { showToast('Contact name is required.'); return; }
        if (!id && contacts.some(c => c.name.toLowerCase() === name.toLowerCase())) { showToast('A contact with this name already exists.'); return; }
        
        const contactData = { 
            name: name, 
            type: document.querySelector('#contact-form input[name="contact-type"]:checked').value, 
            phone: document.getElementById('contact-phone').value.trim(),
            address: document.getElementById('contact-address').value.trim() 
        };

        if (!id) {
            const openingBalanceAmount = parseFloat(document.getElementById('contact-opening-balance').value) || 0;
            if (openingBalanceAmount > 0) {
                contactData.openingBalance = {
                    amount: openingBalanceAmount,
                    type: document.querySelector('input[name="opening-balance-type"]:checked').value
                };
            }
        }
        
        try {
            if (id) {
                const oldName = contacts.find(c => c.id === id)?.name;
                if (oldName && oldName !== name) {
                    if (transactions.some(t => t.name === oldName || t.supplierName === oldName || t.buyerName === oldName)) { 
                        showToast('Cannot rename contact with existing transactions.'); 
                        return; 
                    }
                }
                await setDoc(doc(db, "users", currentUserId, "contacts", id), contactData, { merge: true }); showToast('Contact updated!');
            } else {
                await addDoc(collection(db, "users", currentUserId, "contacts"), contactData); showToast('Contact added!');
            }
        } catch (error) {
            showToast('Error: Could not save contact.');
            console.error("Error saving contact: ", error);
        }
        document.getElementById('contact-modal').classList.add('hidden');
    };
    const handleDeleteContact = async (id) => {
        const contact = contacts.find(c => c.id === id); if (!contact) return;
        if(transactions.some(t => t.name === contact.name || t.supplierName === contact.name || t.buyerName === contact.name)){ 
            showToast('Cannot delete contact with existing transactions.'); 
            return; 
        }
        if (confirm('Are you sure? This action cannot be undone.')) { await deleteDoc(doc(db, "users", currentUserId, "contacts", id)); showToast('Contact deleted.'); }
    };
    
    // --- TRANSACTION & PAYMENT LOGIC ---
    const populateTradeDropdowns = () => {
        const supplierSelect = document.getElementById('supplier-select');
        const buyerSelect = document.getElementById('buyer-select');
        if (!supplierSelect || !buyerSelect) return;

        const suppliers = contacts.filter(c => c.type === 'supplier');
        const buyers = contacts.filter(c => c.type === 'buyer');

        supplierSelect.innerHTML = '<option value="">-- Select Supplier --</option>';
        suppliers.forEach(c => { const option = document.createElement('option'); option.value = c.name; option.textContent = c.name; supplierSelect.appendChild(option); });
        
        buyerSelect.innerHTML = '<option value="">-- Select Buyer --</option>';
        buyers.forEach(c => { const option = document.createElement('option'); option.value = c.name; option.textContent = c.name; buyerSelect.appendChild(option); });
    };

    const updateTradeTotals = () => {
        const netWeight = parseFloat(document.getElementById('net-weight').value) || 0;
        const supplierRate = parseFloat(document.getElementById('supplier-rate').value) || 0;
        const buyerRate = parseFloat(document.getElementById('buyer-rate').value) || 0;

        const supplierTotal = netWeight * supplierRate;
        const buyerTotal = netWeight * buyerRate;
        const profit = buyerTotal - supplierTotal;

        document.getElementById('supplier-total').textContent = `৳${supplierTotal.toFixed(2)}`;
        document.getElementById('buyer-total').textContent = `৳${buyerTotal.toFixed(2)}`;
        document.getElementById('transaction-profit').textContent = `৳${profit.toFixed(2)}`;
    };

    const calculateNetWeight = () => {
        const scaleWeight = parseFloat(document.getElementById('scale-weight').value) || 0;
        const less = parseFloat(document.getElementById('less').value) || 0;
        const netWeight = scaleWeight - less;
        const netWeightInput = document.getElementById('net-weight');
        if (netWeightInput) {
            netWeightInput.value = netWeight > 0 ? netWeight.toFixed(2) : '0.00';
            updateTradeTotals(); 
        }
    };

    const resetTradeForm = () => { 
        document.getElementById('form-title').textContent = 'Add New Transaction';
        const form = document.getElementById('transaction-form');
        if (form) {
            form.reset(); 
            document.getElementById('transaction-id').value = '';
        }
        calculateNetWeight(); 
    };

    const setupTradeFormForEdit = (id) => {
        const t = transactions.find(t => t.id === id); if (!t || t.type !== 'trade') return;
        
        document.getElementById('form-title').textContent = 'Edit Transaction';
        document.getElementById('transaction-id').value = t.id;
        document.getElementById('date').value = t.date;
        document.getElementById('item').value = t.item;
        document.getElementById('vehicle-no').value = t.vehicleNo || '';
        document.getElementById('scale-weight').value = t.scaleWeight || '';
        document.getElementById('less').value = t.less || '';
        document.getElementById('net-weight').value = (t.netWeight !== undefined) ? t.netWeight : (t.weight || '');
        
        populateTradeDropdowns();
        setTimeout(() => {
            document.getElementById('supplier-select').value = t.supplierName;
            document.getElementById('buyer-select').value = t.buyerName;
        }, 0);

        document.getElementById('supplier-rate').value = t.supplierRate;
        const initialPaymentToSupplier = getPayments(t.paymentsToSupplier);
        document.getElementById('paid-to-supplier').value = initialPaymentToSupplier > 0 ? initialPaymentToSupplier : '';
        if(t.paymentsToSupplier && t.paymentsToSupplier[0]) {
             document.getElementById('paid-to-supplier-method').value = t.paymentsToSupplier[0].method;
        }

        document.getElementById('buyer-rate').value = t.buyerRate;
        const initialPaymentFromBuyer = getPayments(t.paymentsFromBuyer);
        document.getElementById('received-from-buyer').value = initialPaymentFromBuyer > 0 ? initialPaymentFromBuyer : '';
        if(t.paymentsFromBuyer && t.paymentsFromBuyer[0]) {
             document.getElementById('received-from-buyer-method').value = t.paymentsFromBuyer[0].method;
        }

        updateTradeTotals();
    };

    const handleTradeFormSubmit = async (e) => {
        e.preventDefault();
        const id = document.getElementById('transaction-id').value;
        
        const transactionData = {
            type: 'trade',
            date: document.getElementById('date').value,
            item: document.getElementById('item').value.trim(),
            vehicleNo: document.getElementById('vehicle-no').value.trim(),
            scaleWeight: parseFloat(document.getElementById('scale-weight').value) || 0,
            less: parseFloat(document.getElementById('less').value) || 0,
            netWeight: parseFloat(document.getElementById('net-weight').value) || 0,
            supplierName: document.getElementById('supplier-select').value,
            supplierRate: parseFloat(document.getElementById('supplier-rate').value) || 0,
            buyerName: document.getElementById('buyer-select').value,
            buyerRate: parseFloat(document.getElementById('buyer-rate').value) || 0,
        };

        if (!transactionData.date || !transactionData.item || !transactionData.supplierName || !transactionData.buyerName) {
            showToast('Please fill all required fields.'); return;
        }

        if (transactionData.supplierName === transactionData.buyerName) {
            showToast('Supplier and Buyer cannot be the same.'); return;
        }

        transactionData.supplierTotal = transactionData.netWeight * transactionData.supplierRate;
        transactionData.buyerTotal = transactionData.netWeight * transactionData.buyerRate;
        transactionData.profit = transactionData.buyerTotal - transactionData.supplierTotal;

        const paidToSupplier = parseFloat(document.getElementById('paid-to-supplier').value) || 0;
        const receivedFromBuyer = parseFloat(document.getElementById('received-from-buyer').value) || 0;

        if (paidToSupplier > transactionData.supplierTotal + 0.01) { showToast('Paid amount cannot exceed supplier total.'); return; }
        if (receivedFromBuyer > transactionData.buyerTotal + 0.01) { showToast('Received amount cannot exceed buyer total.'); return; }
        
        const paymentsToSupplier = [];
        if (paidToSupplier > 0) { 
            const method = document.getElementById('paid-to-supplier-method').value;
            paymentsToSupplier.push({ date: transactionData.date, amount: paidToSupplier, method: method }); 
        }
        transactionData.paymentsToSupplier = paymentsToSupplier;
        
        const paymentsFromBuyer = [];
        if (receivedFromBuyer > 0) { 
            const method = document.getElementById('received-from-buyer-method').value;
            paymentsFromBuyer.push({ date: transactionData.date, amount: receivedFromBuyer, method: method }); 
        }
        transactionData.paymentsFromBuyer = paymentsFromBuyer;

        try {
            if (id) {
                await setDoc(doc(db, "users", currentUserId, "transactions", id), transactionData);
                showToast('Transaction Updated!');
            } else {
                await addDoc(collection(db, "users", currentUserId, "transactions"), transactionData);
                showToast('Transaction Saved!');
            }
            navigateTo('dashboard');
        } catch (error) {
            showToast("Error: Could not save transaction.");
            console.error("Transaction save error: ", error);
        }
    };
    
    // ... (The rest of the app.js file from the previous step remains the same) ...

    const handleDelete = async (id) => { 
        if (confirm('Are you sure? This will permanently delete the transaction.')) { 
            await deleteDoc(doc(db, "users", currentUserId, "transactions", id)); 
            showToast('Transaction deleted.'); 
        } 
    };

    const showTransactionDetailsModal = (id) => {
        const t = transactions.find(tx => tx.id === id);
        if (!t) return;

        const detailsContent = document.getElementById('transaction-detail-content');
        const invoiceContent = document.getElementById('transaction-invoice-content');
        const modalFooter = document.getElementById('transaction-detail-footer');
        const toggleBtn = document.getElementById('toggle-invoice-btn');

        if(t.type === 'trade') {
            const buyer = contacts.find(c => c.name === t.buyerName) || {};
            detailsContent.innerHTML = `
                <div class="space-y-4">
                    <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                       <div class="bg-slate-50 p-4 rounded-lg">
                           <h3 class="font-bold text-lg text-rose-500 mb-2">Supplier Details</h3>
                           <div class="text-sm space-y-1">
                               <p><strong class="w-24 inline-block text-slate-500">Name:</strong> ${t.supplierName}</p>
                               <p><strong class="w-24 inline-block text-slate-500">Rate:</strong> ৳${t.supplierRate.toFixed(2)} / kg</p>
                               <p><strong class="w-24 inline-block text-slate-500">Total:</strong> ৳${t.supplierTotal.toFixed(2)}</p>
                           </div>
                       </div>
                       <div class="bg-slate-50 p-4 rounded-lg">
                           <h3 class="font-bold text-lg text-green-600 mb-2">Buyer Details</h3>
                           <div class="text-sm space-y-1">
                               <p><strong class="w-24 inline-block text-slate-500">Name:</strong> ${t.buyerName}</p>
                               <p><strong class="w-24 inline-block text-slate-500">Rate:</strong> ৳${t.buyerRate.toFixed(2)} / kg</p>
                               <p><strong class="w-24 inline-block text-slate-500">Total:</strong> ৳${t.buyerTotal.toFixed(2)}</p>
                           </div>
                       </div>
                    </div>
                     <div class="bg-slate-50 p-4 rounded-lg">
                         <h3 class="font-bold text-lg text-slate-800 mb-2">Item & Weight</h3>
                         <div class="text-sm space-y-1">
                              <p><strong class="w-24 inline-block text-slate-500">Item:</strong> ${t.item}</p>
                              <p><strong class="w-24 inline-block text-slate-500">Vehicle No:</strong> ${t.vehicleNo || 'N/A'}</p>
                              <p><strong class="w-24 inline-block text-slate-500">Net Weight:</strong> ${t.netWeight.toFixed(2)} kg</p>
                         </div>
                     </div>
                    <div class="p-4 rounded-lg border">
                         <h3 class="font-bold text-lg text-teal-600 mb-2">Financial Summary</h3>
                         <div class="text-sm space-y-1">
                             <p><strong class="w-24 inline-block text-slate-500">Gross Profit:</strong> ৳${t.profit.toFixed(2)}</p>
                             <p><strong class="w-24 inline-block text-slate-500">Paid to Sup:</strong> ৳${getPayments(t.paymentsToSupplier).toFixed(2)}</p>
                             <p><strong class="w-24 inline-block text-slate-500">Rcvd from Buy:</strong> ৳${getPayments(t.paymentsFromBuyer).toFixed(2)}</p>
                        </div>
                    </div>
                </div>
            `;

            const balanceDue = t.buyerTotal - getPayments(t.paymentsFromBuyer);
            invoiceContent.innerHTML = `
                <div id="invoice-to-export" class="bg-white text-slate-800 p-8 mx-auto max-w-3xl">
                     <div class="flex justify-between items-start mb-8">
                         <div>
                             <h1 class="text-2xl font-bold text-slate-900">Errum Enterprise</h1>
                             <p class="text-slate-500">Your Company Address</p>
                             <p class="text-slate-500">Chattogram, Bangladesh</p>
                         </div>
                         <div class="text-right">
                             <h2 class="text-3xl font-bold text-slate-400 uppercase">Invoice</h2>
                             <p class="text-slate-500"><strong>Invoice #:</strong> ${t.id.slice(0, 8).toUpperCase()}</p>
                             <p class="text-slate-500"><strong>Date:</strong> ${t.date}</p>
                         </div>
                     </div>
                     <div class="mb-8">
                         <h3 class="text-sm font-semibold text-slate-500 mb-1">BILL TO</h3>
                         <p class="font-bold text-slate-800">${t.buyerName}</p>
                         <p class="text-slate-600">${buyer.address || 'N/A'}</p>
                         <p class="text-slate-600">${buyer.phone || 'N/A'}</p>
                     </div>
                     <table class="w-full mb-8">
                         <thead class="bg-slate-50">
                             <tr>
                                 <th class="text-left font-semibold p-2">Description</th>
                                 <th class="text-right font-semibold p-2">Quantity (kg)</th>
                                 <th class="text-right font-semibold p-2">Rate</th>
                                 <th class="text-right font-semibold p-2">Amount</th>
                             </tr>
                         </thead>
                         <tbody>
                             <tr class="border-b">
                                 <td class="p-2">${t.item} (${t.vehicleNo || 'N/A'})</td>
                                 <td class="text-right p-2">${t.netWeight.toFixed(2)}</td>
                                 <td class="text-right p-2">৳${t.buyerRate.toFixed(2)}</td>
                                 <td class="text-right p-2">৳${t.buyerTotal.toFixed(2)}</td>
                             </tr>
                         </tbody>
                     </table>
                     <div class="flex justify-end">
                         <div class="w-full md:w-1/2 space-y-2 text-slate-600">
                             <div class="flex justify-between"><span class="font-semibold">Subtotal:</span><span>৳${t.buyerTotal.toFixed(2)}</span></div>
                             <div class="flex justify-between"><span class="font-semibold">Amount Paid:</span><span>- ৳${getPayments(t.paymentsFromBuyer).toFixed(2)}</span></div>
                             <div class="flex justify-between font-bold text-xl text-slate-900 border-t pt-2 mt-2"><span class="text-teal-600">Balance Due:</span><span class="text-teal-600">৳${balanceDue.toFixed(2)}</span></div>
                         </div>
                     </div>
                     <div class="text-center mt-12 text-xs text-slate-400">
                         <p>Thank you for your business!</p>
                     </div>
                </div>
            `;
            modalFooter.style.display = 'flex';
            toggleBtn.disabled = false;
            toggleBtn.title = '';
        } else if (t.type === 'payment') {
            detailsContent.innerHTML = `
                <div class="bg-slate-50 p-4 rounded-lg">
                    <h3 class="font-bold text-lg text-slate-800 mb-2">Payment Details</h3>
                    <div class="text-sm space-y-1">
                        <p><strong class="w-28 inline-block text-slate-500">Date:</strong> ${t.date}</p>
                        <p><strong class="w-28 inline-block text-slate-500">Party Name:</strong> ${t.name}</p>
                        <p><strong class="w-28 inline-block text-slate-500">Type:</strong> <span class="capitalize font-semibold ${t.paymentType === 'made' ? 'text-rose-500' : 'text-green-600'}">${t.paymentType}</span></p>
                        <p><strong class="w-28 inline-block text-slate-500">Amount:</strong> ৳${t.amount.toFixed(2)}</p>
                        <p><strong class="w-28 inline-block text-slate-500">Method:</strong> ${t.method}</p>
                        <p><strong class="w-28 inline-block text-slate-500">Description:</strong> ${t.description}</p>
                    </div>
               </div>
            `;
            invoiceContent.innerHTML = '';
            modalFooter.style.display = 'flex';
            toggleBtn.disabled = true;
            toggleBtn.title = 'Invoices are only available for trade transactions.';
        }
        
        const modal = document.getElementById('transaction-detail-modal');
        const saveBtn = document.getElementById('save-invoice-btn');
        
        detailsContent.classList.remove('hidden');
        invoiceContent.classList.add('hidden');
        toggleBtn.textContent = 'View Invoice';
        saveBtn.classList.add('hidden');

        toggleBtn.onclick = () => {
            if (toggleBtn.disabled) return;
            detailsContent.classList.toggle('hidden');
            invoiceContent.classList.toggle('hidden');
            saveBtn.classList.toggle('hidden');
            toggleBtn.textContent = detailsContent.classList.contains('hidden') ? 'View Details' : 'View Invoice';
        };
        
        saveBtn.onclick = async () => {
            showToast(`Generating PNG...`);
            const content = document.getElementById('invoice-to-export');
            if (!content) return;
            const canvas = await html2canvas(content, { scale: 2, backgroundColor: '#ffffff' });
            const link = document.createElement('a');
            link.download = `Invoice-${t.id.slice(0, 8)}-${t.date}.png`;
            link.href = canvas.toDataURL();
            link.click();
        };

        modal.classList.remove('hidden');
    };
    
    // --- THIS IS THE FIX ---
    return { getPayments, getFilteredTransactions, renderDashboardMetrics, renderTransactionHistory, renderAll, renderContacts, resetContactForm, setupContactFormForEdit, handleSaveContact, handleDeleteContact, populateTradeDropdowns, updateTradeTotals, calculateNetWeight, resetTradeForm, setupTradeFormForEdit, handleTradeFormSubmit, handleDelete, openPaymentModal, handleSavePayment, openDirectPaymentModal, handleDirectPaymentSubmit, showContactLedger, generateOverallStatement, showPaginatedStatement, handleContentExport, handleContentExportCSV, handlePasswordChange, showTransactionDetailsModal };
})();

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
    document.getElementById('save-payment-btn').addEventListener('click', appLogic.handleSavePayment);
    document.querySelectorAll('[data-close-modal]').forEach(btn => btn.addEventListener('click', (e) => document.getElementById(e.currentTarget.dataset.closeModal).classList.add('hidden')));
    document.getElementById('overall-statement-btn').addEventListener('click', () => appLogic.showPaginatedStatement());
    document.getElementById('statement-png-btn').addEventListener('click', () => appLogic.handleContentExport('png'));
    document.getElementById('statement-pdf-btn').addEventListener('click', () => appLogic.handleContentExport('pdf'));
    document.getElementById('statement-csv-btn').addEventListener('click', () => appLogic.handleContentExportCSV());
    document.getElementById('contact-form').addEventListener('submit', appLogic.handleSaveContact);
    document.getElementById('settings-btn').addEventListener('click', () => document.getElementById('password-modal').classList.remove('hidden'));
    document.getElementById('password-change-form').addEventListener('submit', appLogic.handlePasswordChange);
    document.getElementById('direct-payment-form').addEventListener('submit', appLogic.handleDirectPaymentSubmit);
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
        document.getElementById('transaction-form').addEventListener('submit', appLogic.handleTradeFormSubmit);
        document.getElementById('reset-form-btn').addEventListener('click', appLogic.resetTradeForm);
        document.getElementById('cancel-transaction-btn').addEventListener('click', () => navigateTo('dashboard'));
        ['scale-weight', 'less'].forEach(id => document.getElementById(id).addEventListener('input', appLogic.calculateNetWeight));
        ['supplier-rate', 'buyer-rate'].forEach(id => document.getElementById(id).addEventListener('input', appLogic.updateTradeTotals));
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
