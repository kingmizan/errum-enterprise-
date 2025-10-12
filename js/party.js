// js/party.js

import { checkAuth, renderAppLayout, updateUserEmail } from './shared.js';
import { listenToContacts, listenToTransactions, saveContact, deleteContact, saveTransaction } from './api.js';
import { showToast, showConfirmModal } from './ui.js';

let localContacts = null;
let localTransactions = null;
const user = auth.currentUser;

async function init() {
    const user = await checkAuth();
    if (!user) return;

    renderAppLayout('party');
    updateUserEmail(user.email);
    document.getElementById('app-content').innerHTML = getPartyPageTemplate();
    initializePartyListeners();

    listenToContacts(user.uid, (contacts) => {
        localContacts = contacts || [];
        renderContactsTable();
    });
    
    listenToTransactions(user.uid, (transactions) => {
        localTransactions = transactions || [];
        renderContactsTable();
    });
}

function getPartyPageTemplate() {
    return `
        <div class="bg-white dark:bg-slate-900 rounded-lg shadow-sm border dark:border-slate-700">
            <div class="p-4 border-b dark:border-slate-800 flex justify-between items-center">
                <h2 class="text-2xl font-bold">Manage Party</h2>
                <button id="add-contact-btn" class="flex items-center gap-2 px-4 py-2 rounded-lg font-semibold bg-teal-600 text-white hover:bg-teal-700 text-sm">Add New Party</button>
            </div>
            <div class="overflow-x-auto">
                <table class="w-full text-sm responsive-table">
                    <thead><tr class="border-b dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50"><th class="text-left font-semibold py-3 px-4">Name</th><th class="text-left font-semibold py-3 px-4">Type</th><th class="text-right font-semibold py-3 px-4">Net Balance</th><th class="text-center font-semibold py-3 px-4">Actions</th></tr></thead>
                    <tbody id="contacts-table-body"><tr id="skeleton-row"><td colspan="4"><div class="p-4 space-y-2"><div class="skeleton h-4 w-full"></div><div class="skeleton h-4 w-full"></div></div></td></tr></tbody>
                </table>
            </div>
        </div>
        <div id="contact-modal" class="hidden fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">{/* Modal HTML */}</div>
        <div id="direct-payment-modal" class="hidden fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">{/* Modal HTML */}</div>
    `;
}

function renderContactsTable() {
    if (localContacts === null || localTransactions === null) return;
    const tbody = document.getElementById('contacts-table-body');
    if (!tbody) return;

    if (localContacts.length === 0) {
        tbody.innerHTML = `<tr><td colspan="4" class="text-center py-12 text-slate-500">No parties found.</td></tr>`;
        return;
    }
    const getPayments = (history) => (history || []).reduce((sum, p) => sum + p.amount, 0);
    tbody.innerHTML = localContacts.map(contact => {
        let netBalance = (contact.openingBalance?.type === 'receivable' ? contact.openingBalance.amount : -(contact.openingBalance?.amount || 0));
        localTransactions.filter(t => t.supplierName === contact.name || t.buyerName === contact.name || t.name === contact.name).forEach(t => {
            if (t.type === 'trade') {
                if (t.supplierName === contact.name) netBalance -= ((t.supplierTotal || 0) - getPayments(t.paymentsToSupplier));
                if (t.buyerName === contact.name) netBalance += ((t.buyerTotal || 0) - getPayments(t.paymentsFromBuyer));
            } else if (t.type === 'payment' && t.name === contact.name) {
                netBalance += (t.paymentType === 'made' ? t.amount : -t.amount);
            }
        });
        const balanceText = `৳${Math.abs(netBalance).toFixed(2)}`;
        let balanceClass = netBalance > 0.01 ? 'text-green-600' : (netBalance < -0.01 ? 'text-rose-500' : 'text-slate-500');
        const typeBadge = contact.type === 'buyer' ? `<span class="py-1 px-2 rounded-full text-xs bg-teal-100 text-teal-800">Buyer</span>` : `<span class="py-1 px-2 rounded-full text-xs bg-slate-100 text-slate-800">Supplier</span>`;
        return `<tr class="border-b dark:border-border-dark"><td data-label="Name" class="py-3 px-4"><button data-action="ledger" data-id="${contact.id}" class="font-medium text-left hover:text-primary-500">${contact.name}</button></td><td data-label="Type" class="py-3 px-4">${typeBadge}</td><td data-label="Net Balance" class="py-3 px-4 text-right font-bold ${balanceClass}">${balanceText}</td><td data-label="Actions" class="py-3 px-4 actions-cell"><div class="flex justify-end md:justify-center items-center gap-1">{/* SVG Icons for actions */}</div></td></tr>`;
    }).join('');
}

function initializePartyListeners() { /* ... unchanged ... */ }
function showContactModal(contactId = null) { /* ... unchanged ... */ }
async function handleContactFormSubmit(e) { /* ... unchanged ... */ }
async function handleDeleteContact(contactId) { /* ... unchanged ... */ }
function openDirectPaymentModal(contactId) { /* ... unchanged ... */ }
async function handleDirectPaymentSubmit(e) { /* ... unchanged ... */ }

// This function must be exported so it's not removed by any bundling process.
// For this multi-page app, this is not strictly necessary but good practice.
export function showContacts() {
    init();
}

showContacts(); // Run the script
