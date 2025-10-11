// js/components/contacts.js

import { state } from '../main.js';
import { renderPage, showToast } from '../ui.js';
import { saveContact, deleteContact } from '../api.js';
// ✨ FIX: Import the ledger function from statement.js
import { showContactLedger } from './statement.js'; 

function getContactsTemplate() {
    // This template now includes the responsive-table class
    return `
        <div class="bg-white dark:bg-slate-900 rounded-lg shadow-sm border border-slate-200 dark:border-slate-800">
            <div class="p-4 border-b dark:border-slate-800 flex justify-between items-center"><h2 class="text-xl font-bold">Manage Party</h2><button id="add-contact-btn" class="flex items-center gap-2 px-4 py-2 rounded-lg font-semibold bg-teal-600 text-white hover:bg-teal-700 text-sm">Add New Party</button></div>
            <div class="overflow-x-auto"><table class="w-full text-sm responsive-table"><thead><tr class="border-b dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50"><th class="text-left font-semibold py-3 px-4">Name</th><th class="text-left font-semibold py-3 px-4">Type</th><th class="text-left font-semibold py-3 px-4">Phone</th><th class="text-right font-semibold py-3 px-4">Net Balance</th><th class="text-center font-semibold py-3 px-4">Actions</th></tr></thead><tbody id="contacts-table-body"></tbody></table></div>
        </div>
        <div id="contact-modal" class="hidden fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"><div class="bg-white dark:bg-slate-900 rounded-lg w-full max-w-md"><form id="contact-form"><div class="p-6"><h2 id="contact-form-title" class="text-xl font-bold mb-4">Add New Party</h2><input type="hidden" id="contact-id"><div class="space-y-4"><div><label class="font-semibold text-sm">Party Type</label><div class="flex gap-4 mt-2"><label class="flex items-center gap-2"><input type="radio" name="contact-type" value="supplier" class="form-radio" checked> Supplier</label><label class="flex items-center gap-2"><input type="radio" name="contact-type" value="buyer" class="form-radio"> Buyer</label></div></div><div><label for="contact-name" class="font-semibold text-sm">Full Name</label><input type="text" id="contact-name" class="w-full p-2 mt-1 border rounded-lg bg-slate-50 dark:bg-slate-800" required></div><div><label for="contact-phone" class="font-semibold text-sm">Phone Number</label><input type="tel" id="contact-phone" class="w-full p-2 mt-1 border rounded-lg bg-slate-50 dark:bg-slate-800"></div><div id="opening-balance-section" class="pt-4 border-t"><p class="font-semibold text-sm">Opening Balance</p><div class="mt-2 space-y-2"><input type="number" step="any" id="contact-opening-balance" placeholder="0.00" class="w-full p-2 border rounded-lg bg-slate-50 dark:bg-slate-800"><div class="flex gap-4 text-sm"><label class="flex items-center gap-2"><input type="radio" name="opening-balance-type" value="receivable" class="form-radio" checked> Receivable</label><label class="flex items-center gap-2"><input type="radio" name="opening-balance-type" value="payable" class="form-radio"> Payable</label></div></div></div></div></div><div class="bg-slate-50 dark:bg-slate-900/50 p-4 flex justify-end gap-3 rounded-b-lg"><button type="button" data-action="close-modal" class="px-4 py-2 rounded-lg font-semibold bg-slate-200 dark:bg-slate-700">Cancel</button><button type="submit" class="px-4 py-2 rounded-lg font-semibold bg-teal-600 text-white">Save Party</button></div></form></div></div>
    `;
}


function renderContactsTable() {
    const tbody = document.getElementById('contacts-table-body');
    if (!tbody) return;

    if (state.contacts.length === 0) {
        tbody.innerHTML = `<tr><td colspan="5" class="text-center py-12 text-slate-500">No parties found.</td></tr>`;
        return;
    }
    
    // ✨ FIX: This row rendering now includes a dedicated ledger button.
    const getPayments = (history) => (history || []).reduce((sum, p) => sum + p.amount, 0);
    tbody.innerHTML = state.contacts.map(contact => {
        let netBalance = 0;
        if (contact.openingBalance?.amount > 0) netBalance = contact.openingBalance.type === 'receivable' ? contact.openingBalance.amount : -contact.openingBalance.amount;
        state.transactions.filter(t => t.supplierName === contact.name || t.buyerName === contact.name || t.name === contact.name).forEach(t => {
            if (t.type === 'trade') {
                if (t.supplierName === contact.name) netBalance -= (t.supplierTotal - getPayments(t.paymentsToSupplier));
                if (t.buyerName === contact.name) netBalance += (t.buyerTotal - getPayments(t.paymentsFromBuyer));
            } else if (t.type === 'payment') {
                if (t.paymentType === 'made') netBalance += t.amount; else netBalance -= t.amount;
            }
        });
        const balanceText = `৳${Math.abs(netBalance).toFixed(2)}`;
        let balanceClass = netBalance > 0.01 ? 'text-green-600' : (netBalance < -0.01 ? 'text-rose-500' : 'text-slate-500');
        const typeBadge = contact.type === 'buyer' ? `<span class="py-1 px-2 rounded-full text-xs bg-teal-100 text-teal-800">Buyer</span>` : `<span class="py-1 px-2 rounded-full text-xs bg-slate-100 text-slate-800">Supplier</span>`;
        return `<tr class="border-b dark:border-slate-800"><td data-label="Name" class="py-3 px-4 font-medium">${contact.name}</td><td data-label="Type" class="py-3 px-4">${typeBadge}</td><td data-label="Phone" class="py-3 px-4">${contact.phone || 'N/A'}</td><td data-label="Net Balance" class="py-3 px-4 text-right font-bold ${balanceClass}">${balanceText}</td><td data-label="Actions" class="py-3 px-4 actions-cell"><div class="flex justify-end md:justify-center items-center gap-1"><button title="View Ledger" data-action="ledger" data-id="${contact.id}" class="p-2 text-sky-600 hover:bg-sky-100 rounded-full">📄</button><button title="Edit Party" data-action="edit" data-id="${contact.id}" class="p-2 text-blue-600 hover:bg-blue-100 rounded-full">✏️</button><button title="Delete Party" data-action="delete" data-id="${contact.id}" class="p-2 text-rose-500 hover:bg-rose-100 rounded-full">🗑️</button></div></td></tr>`;
    }).join('');
}


function initializeContactsListeners() {
    document.getElementById('add-contact-btn')?.addEventListener('click', () => showContactModal());

    // ✨ FIX: The event delegation now handles the 'ledger' action.
    document.getElementById('contacts-table-body')?.addEventListener('click', (e) => {
        const button = e.target.closest('button[data-action]');
        if (!button) return;
        const { action, id } = button.dataset;
        if (action === 'edit') showContactModal(id);
        if (action === 'delete') handleDeleteContact(id);
        if (action === 'ledger') showContactLedger(id); // This calls the imported function
    });

    document.getElementById('contact-form')?.addEventListener('submit', handleContactFormSubmit);
    document.querySelector('#contact-modal [data-action="close-modal"]')?.addEventListener('click', () => {
        document.getElementById('contact-modal').classList.add('hidden');
    });
}


// The rest of the functions (showContactModal, handleContactFormSubmit, etc.) remain the same
// ...
function showContactModal(contactId = null) { /* ... same as before ... */ }
async function handleContactFormSubmit(e) { /* ... same as before ... */ }
async function handleDeleteContact(contactId) { /* ... same as before ... */ }


export function showContacts() {
    renderPage(getContactsTemplate());
    renderContactsTable();
    initializeContactsListeners();
}
