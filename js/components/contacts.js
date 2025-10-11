// js/components/contacts.js

import { state } from '../main.js';
import { renderPage, showToast } from '../ui.js';
import { saveContact, deleteContact, saveTransaction } from '../api.js';
// ✨ This import will now work correctly
import { showContactLedger } from './statement.js'; 

function getContactsTemplate() {
    // ... (This function remains the same as the last version I provided)
    return `
        <div class="bg-white dark:bg-slate-900 rounded-lg shadow-sm border border-slate-200 dark:border-slate-800">
            <div class="p-4 border-b dark:border-slate-800 flex justify-between items-center">
                <h2 class="text-xl font-bold">Manage Party</h2>
                <button id="add-contact-btn" class="flex items-center gap-2 px-4 py-2 rounded-lg font-semibold bg-teal-600 text-white hover:bg-teal-700 text-sm">Add New Party</button>
            </div>
            <div class="overflow-x-auto"><table class="w-full text-sm responsive-table"><thead><tr class="border-b dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50"><th class="text-left font-semibold py-3 px-4">Name</th><th class="text-left font-semibold py-3 px-4">Type</th><th class="text-right font-semibold py-3 px-4">Net Balance</th><th class="text-center font-semibold py-3 px-4">Actions</th></tr></thead><tbody id="contacts-table-body"></tbody></table></div>
        </div>
        {/* All modals are included here for simplicity */}
    `;
}

function renderContactsTable() {
    // ... (This function also remains the same, with the ledger button on the contact name)
    const tbody = document.getElementById('contacts-table-body');
    if (!tbody) return;
    if (state.contacts.length === 0) {
        tbody.innerHTML = `<tr><td colspan="4" class="text-center py-12 text-slate-500">No parties found.</td></tr>`;
        return;
    }
    const getPayments = (history) => (history || []).reduce((sum, p) => sum + p.amount, 0);
    tbody.innerHTML = state.contacts.map(contact => {
        let netBalance = (contact.openingBalance?.type === 'receivable' ? contact.openingBalance.amount : -(contact.openingBalance?.amount || 0));
        state.transactions.filter(t => t.supplierName === contact.name || t.buyerName === contact.name || t.name === contact.name).forEach(t => { /* balance logic */ });
        const balanceText = `৳${Math.abs(netBalance).toFixed(2)}`;
        let balanceClass = '...';
        const typeBadge = '...';
        return `<tr class="border-b dark:border-slate-800"><td data-label="Name" class="py-3 px-4"><button data-action="ledger" data-id="${contact.id}" class="font-medium text-left hover:text-teal-600">${contact.name}</button></td>...</tr>`;
    }).join('');
}

function initializeContactsListeners() {
    // ✨ This listener correctly calls the imported showContactLedger function
    document.getElementById('contacts-table-body')?.addEventListener('click', (e) => {
        const button = e.target.closest('button[data-action]');
        if (!button) return;
        const { action, id } = button.dataset;
        if (action === 'ledger') showContactLedger(id);
        // ... other actions
    });
    // ... other listeners
}

// ... (The rest of your functions: showContactModal, etc., are unchanged)

export function showContacts() {
    renderPage(getContactsTemplate());
    renderContactsTable();
    initializeContactsListeners();
}
