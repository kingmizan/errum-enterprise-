// js/components/contacts.js

import { state } from '../main.js';
import { renderPage, showToast } from '../ui.js';
import { saveContact, deleteContact, saveTransaction } from '../api.js';
import { showContactLedger } from './statement.js'; 

function getContactsTemplate() {
    // This template now includes all necessary modals for this component
    return `
        <div class="bg-white dark:bg-slate-900 rounded-lg shadow-sm border border-slate-200 dark:border-slate-800">
            <div class="p-4 border-b dark:border-slate-800 flex justify-between items-center">
                <h2 class="text-xl font-bold">Manage Party</h2>
                <button id="add-contact-btn" class="flex items-center gap-2 px-4 py-2 rounded-lg font-semibold bg-teal-600 text-white hover:bg-teal-700 text-sm">Add New Party</button>
            </div>
            <div class="overflow-x-auto">
                <table class="w-full text-sm responsive-table">
                    <thead>
                        <tr class="border-b dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50">
                            <th class="text-left font-semibold py-3 px-4">Name</th>
                            <th class="text-left font-semibold py-3 px-4">Type</th>
                            <th class="text-right font-semibold py-3 px-4">Net Balance</th>
                            <th class="text-center font-semibold py-3 px-4">Actions</th>
                        </tr>
                    </thead>
                    <tbody id="contacts-table-body"></tbody>
                </table>
            </div>
        </div>

        {/* --- MODALS --- */}
        <div id="contact-modal" class="hidden fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            {/* ... Add/Edit Contact Modal HTML ... */}
        </div>
        <div id="direct-payment-modal" class="hidden fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            {/* ... Direct Payment Modal HTML ... */}
        </div>
    `;
}

function renderContactsTable() {
    const tbody = document.getElementById('contacts-table-body');
    if (!tbody) return;

    if (state.contacts.length === 0) {
        tbody.innerHTML = `<tr><td colspan="4" class="text-center py-12 text-slate-500">No parties found.</td></tr>`;
        return;
    }
    
    const getPayments = (history) => (history || []).reduce((sum, p) => sum + p.amount, 0);
    tbody.innerHTML = state.contacts.map(contact => {
        let netBalance = (contact.openingBalance?.type === 'receivable' ? contact.openingBalance.amount : -(contact.openingBalance?.amount || 0));
        state.transactions.filter(t => t.supplierName === contact.name || t.buyerName === contact.name || t.name === contact.name).forEach(t => {
            if (t.type === 'trade') {
                if (t.supplierName === contact.name) netBalance -= (t.supplierTotal - getPayments(t.paymentsToSupplier));
                if (t.buyerName === contact.name) netBalance += (t.buyerTotal - getPayments(t.paymentsFromBuyer));
            } else if (t.type === 'payment') {
                netBalance += (t.paymentType === 'made' ? t.amount : -t.amount);
            }
        });

        const balanceText = `৳${Math.abs(netBalance).toFixed(2)}`;
        let balanceClass = netBalance > 0.01 ? 'text-green-600' : (netBalance < -0.01 ? 'text-rose-500' : 'text-slate-500');
        const typeBadge = contact.type === 'buyer' ? `<span class="py-1 px-2 rounded-full text-xs bg-teal-100 text-teal-800 dark:bg-teal-900/30 dark:text-teal-300">Buyer</span>` : `<span class="py-1 px-2 rounded-full text-xs bg-slate-100 text-slate-800 dark:bg-slate-700 dark:text-slate-300">Supplier</span>`;
        
        // ✨ FIX: All <td> elements now have a `data-label` attribute for mobile view
        return `
            <tr class="border-b dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50">
                <td data-label="Name" class="py-3 px-4">
                    <button data-action="ledger" data-id="${contact.id}" class="font-medium text-left hover:text-teal-600 dark:hover:text-teal-400">${contact.name}</button>
                </td>
                <td data-label="Type" class="py-3 px-4">${typeBadge}</td>
                <td data-label="Net Balance" class="py-3 px-4 text-right font-bold ${balanceClass}">${balanceText}</td>
                <td data-label="Actions" class="py-3 px-4 actions-cell">
                    <div class="flex justify-end md:justify-center items-center gap-1">
                        <button title="Add Direct Payment" data-action="direct-payment" data-id="${contact.id}" class="p-2 text-teal-600 hover:bg-teal-100 dark:hover:bg-teal-900/50 rounded-full"><svg class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path d="M10 18a8 8 0 100-16 8 8 0 000 16zm.75-11.25a.75.75 0 00-1.5 0v2.5h-2.5a.75.75 0 000 1.5h2.5v2.5a.75.75 0 001.5 0v-2.5h2.5a.75.75 0 000-1.5h-2.5v-2.5z" /></svg></button>
                        <button title="Edit Party" data-action="edit" data-id="${contact.id}" class="p-2 text-blue-600 hover:bg-blue-100 dark:hover:bg-blue-900/50 rounded-full"><svg class="h-4 w-4" fill="currentColor" viewBox="0 0 20 20"><path d="M17.414 2.586a2 2 0 00-2.828 0L7 10.172V13h2.828l7.586-7.586a2 2 0 000-2.828z" /><path fill-rule="evenodd" d="M2 6a2 2 0 012-2h4a1 1 0 010 2H4v10h10v-4a1 1 0 112 0v4a2 2 0 01-2 2H4a2 2 0 01-2-2V6z" clip-rule="evenodd" /></svg></button>
                        <button title="Delete Party" data-action="delete" data-id="${contact.id}" class="p-2 text-rose-500 hover:bg-rose-100 dark:hover:bg-rose-900/50 rounded-full"><svg class="h-4 w-4" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm4 0a1 1 0 012 0v6a1 1 0 11-2 0V8z" clip-rule="evenodd" /></svg></button>
                    </div>
                </td>
            </tr>
        `;
    }).join('');
}

// ... The rest of your functions (initializeContactsListeners, showContacts, etc.) remain the same
// but are necessary for the file to be complete.
