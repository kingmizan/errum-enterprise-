// js/components/contacts.js

import { state } from '../main.js';
import { renderPage, showToast } from '../ui.js';
import { saveContact, deleteContact } from '../api.js';
import { showContactLedger } from './statement.js';

/**
 * Returns the HTML template for the contacts page, including the modal.
 */
function getContactsTemplate() {
    return `
        <div class="bg-white dark:bg-slate-900 rounded-lg shadow-sm border border-slate-200 dark:border-slate-800">
            <div class="p-4 border-b dark:border-slate-800 flex justify-between items-center">
                <h2 class="text-xl font-bold">Manage Party</h2>
                <button id="add-contact-btn" class="flex items-center gap-2 px-4 py-2 rounded-lg font-semibold bg-teal-600 text-white hover:bg-teal-700 text-sm shadow-sm shadow-teal-500/30">
                    <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M10 5a1 1 0 011 1v3h3a1 1 0 110 2h-3v3a1 1 0 11-2 0v-3H6a1 1 0 110-2h3V6a1 1 0 011-1z" clip-rule="evenodd" /></svg>
                    Add New Party
                </button>
            </div>
            <div class="overflow-x-auto">
                <table class="w-full text-sm responsive-table">
                    <thead>
                        <tr class="border-b dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50">
                            <th class="text-left font-semibold py-3 px-4">Name</th>
                            <th class="text-left font-semibold py-3 px-4">Type</th>
                            <th class="text-left font-semibold py-3 px-4">Phone</th>
                            <th class="text-right font-semibold py-3 px-4">Net Balance</th>
                            <th class="text-center font-semibold py-3 px-4">Actions</th>
                        </tr>
                    </thead>
                    <tbody id="contacts-table-body"></tbody>
                </table>
            </div>
        </div>

        <div id="contact-modal" class="hidden fixed inset-0 bg-black/50 dark:bg-black/70 z-50 flex items-center justify-center p-4">
            <div class="bg-white dark:bg-slate-900 rounded-lg shadow-lg w-full max-w-md border border-slate-200 dark:border-slate-800">
                <form id="contact-form">
                    <div class="p-6">
                        <h2 id="contact-form-title" class="text-xl font-bold mb-4">Add New Party</h2>
                        <input type="hidden" id="contact-id">
                        <div class="space-y-4">
                            <div><label class="font-semibold text-sm">Party Type</label><div class="flex gap-4 mt-2"><label class="flex items-center gap-2"><input type="radio" name="contact-type" value="supplier" class="form-radio" checked> Supplier</label><label class="flex items-center gap-2"><input type="radio" name="contact-type" value="buyer" class="form-radio"> Buyer</label></div></div>
                            <div><label for="contact-name" class="font-semibold text-sm">Full Name</label><input type="text" id="contact-name" class="w-full p-2 mt-1 border rounded-lg bg-slate-50 dark:bg-slate-800 border-slate-300 dark:border-slate-700" required></div>
                            <div><label for="contact-phone" class="font-semibold text-sm">Phone Number</label><input type="tel" id="contact-phone" class="w-full p-2 mt-1 border rounded-lg bg-slate-50 dark:bg-slate-800 border-slate-300 dark:border-slate-700"></div>
                            <div id="opening-balance-section" class="pt-4 border-t dark:border-slate-700">
                                <p class="font-semibold text-sm">Opening Balance</p>
                                <div class="mt-2 space-y-2">
                                    <input type="number" step="any" id="contact-opening-balance" placeholder="0.00" class="w-full p-2 border rounded-lg bg-slate-50 dark:bg-slate-800 border-slate-300 dark:border-slate-700">
                                    <div class="flex gap-4 text-sm"><label class="flex items-center gap-2"><input type="radio" name="opening-balance-type" value="receivable" class="form-radio" checked> Receivable (They Owe You)</label><label class="flex items-center gap-2"><input type="radio" name="opening-balance-type" value="payable" class="form-radio"> Payable (You Owe Them)</label></div>
                                </div>
                            </div>
                        </div>
                    </div>
                    <div class="bg-slate-50 dark:bg-slate-900/50 p-4 flex justify-end gap-3 rounded-b-lg border-t border-slate-200 dark:border-slate-800">
                        <button type="button" data-action="close-modal" class="px-4 py-2 rounded-lg font-semibold bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-sm">Cancel</button>
                        <button type="submit" class="px-4 py-2 rounded-lg font-semibold bg-teal-600 text-white hover:bg-teal-700 text-sm">Save Party</button>
                    </div>
                </form>
            </div>
        </div>
    `;
}

/**
 * Renders the list of contacts into the table with calculated balances.
 */
function renderContactsTable() {
    const tbody = document.getElementById('contacts-table-body');
    if (!tbody) return;

    if (state.contacts.length === 0) {
        tbody.innerHTML = `<tr><td colspan="5" class="text-center py-12 text-slate-500 dark:text-slate-400">No parties found. Add one to get started!</td></tr>`;
        return;
    }

    const getPayments = (history) => (history || []).reduce((sum, p) => sum + p.amount, 0);
    
    const rowsHtml = state.contacts.map(contact => {
        // --- Calculate Net Balance ---
        let netBalance = 0;
        if (contact.openingBalance?.amount > 0) {
            netBalance = contact.openingBalance.type === 'receivable' ? contact.openingBalance.amount : -contact.openingBalance.amount;
        }
        
        const relatedTransactions = state.transactions.filter(t => t.supplierName === contact.name || t.buyerName === contact.name || t.name === contact.name);
        
        relatedTransactions.forEach(t => {
            if (t.type === 'trade') {
                if (t.supplierName === contact.name) netBalance -= (t.supplierTotal - getPayments(t.paymentsToSupplier));
                if (t.buyerName === contact.name) netBalance += (t.buyerTotal - getPayments(t.paymentsFromBuyer));
            } else if (t.type === 'payment' && t.name === contact.name) {
                if (t.paymentType === 'made') netBalance += t.amount;
                else netBalance -= t.amount;
            }
        });

        // --- Setup styles ---
        const balanceText = `৳${Math.abs(netBalance).toFixed(2)}`;
        let balanceClass = 'text-slate-500';
        if (netBalance > 0.01) balanceClass = 'text-green-600 dark:text-green-500'; // Receivable
        else if (netBalance < -0.01) balanceClass = 'text-rose-500'; // Payable

        const typeBadge = contact.type === 'buyer'
            ? `<span class="inline-flex items-center py-1 px-2.5 rounded-full text-xs font-medium bg-teal-100 text-teal-800 dark:bg-teal-500/20 dark:text-teal-400">Buyer</span>`
            : `<span class="inline-flex items-center py-1 px-2.5 rounded-full text-xs font-medium bg-slate-100 text-slate-800 dark:bg-slate-700 dark:text-slate-300">Supplier</span>`;

        return `
            <tr class="odd:bg-slate-50 dark:odd:bg-slate-900/50 hover:bg-slate-100 dark:hover:bg-slate-800/50">
                <td data-label="Name" class="py-4 px-4 align-middle font-medium">${contact.name}</td>
                <td data-label="Type" class="py-4 px-4 align-middle">${typeBadge}</td>
                <td data-label="Phone" class="py-4 px-4 align-middle">${contact.phone || 'N/A'}</td>
                <td data-label="Net Balance" class="py-4 px-4 align-middle font-bold text-right ${balanceClass}">${balanceText}</td>
                <td data-label="Actions" class="py-4 px-4 align-middle actions-cell">
                    <div class="flex justify-end md:justify-center items-center gap-1">
                        <button title="View Ledger" data-action="ledger" data-id="${contact.id}" class="p-2 text-sky-600 hover:bg-sky-100 dark:hover:bg-sky-900/50 rounded-full">📄</button>
                        <button title="Edit Party" data-action="edit" data-id="${contact.id}" class="p-2 text-blue-600 hover:bg-blue-100 dark:hover:bg-blue-900/50 rounded-full">✏️</button>
                        <button title="Delete Party" data-action="delete" data-id="${contact.id}" class="p-2 text-rose-500 hover:bg-rose-100 dark:hover:bg-rose-900/50 rounded-full">🗑️</button>
                    </div>
                </td>
            </tr>
        `;
    }).join('');

    tbody.innerHTML = rowsHtml;
}

/**
 * Opens and prepares the contact modal for adding or editing.
 */
function showContactModal(contactId = null) {
    const modal = document.getElementById('contact-modal');
    const form = document.getElementById('contact-form');
    const title = document.getElementById('contact-form-title');
    const openingBalanceSection = document.getElementById('opening-balance-section');
    form.reset();

    if (contactId) {
        // Edit Mode
        const contact = state.contacts.find(c => c.id === contactId);
        if (!contact) return showToast('Error: Contact not found.');
        
        title.textContent = 'Edit Party';
        document.getElementById('contact-id').value = contact.id;
        document.getElementById('contact-name').value = contact.name;
        document.getElementById('contact-phone').value = contact.phone || '';
        document.querySelector(`input[name="contact-type"][value="${contact.type}"]`).checked = true;
        openingBalanceSection.classList.add('hidden'); // Cannot edit opening balance
    } else {
        // Add Mode
        title.textContent = 'Add New Party';
        document.getElementById('contact-id').value = '';
        openingBalanceSection.classList.remove('hidden');
    }
    modal.classList.remove('hidden');
}

/**
 * Handles the contact form submission.
 */
async function handleContactFormSubmit(e) {
    e.preventDefault();
    const id = document.getElementById('contact-id').value;
    const name = document.getElementById('contact-name').value.trim();

    if (!name) return showToast('Party name is required.');
    if (!id && state.contacts.some(c => c.name.toLowerCase() === name.toLowerCase())) {
        return showToast('A party with this name already exists.');
    }
    
    const contactData = {
        name,
        type: document.querySelector('input[name="contact-type"]:checked').value,
        phone: document.getElementById('contact-phone').value.trim(),
    };

    if (!id) {
        const amount = parseFloat(document.getElementById('contact-opening-balance').value) || 0;
        if (amount > 0) {
            contactData.openingBalance = {
                amount,
                type: document.querySelector('input[name="opening-balance-type"]:checked').value
            };
        }
    }

    try {
        await saveContact(state.user.uid, contactData, id);
        showToast(id ? 'Party Updated!' : 'Party Added!');
        document.getElementById('contact-modal').classList.add('hidden');
    } catch (error) {
        showToast('Error: Could not save party.');
        console.error("Error saving contact:", error);
    }
}

/**
 * Handles deleting a contact after confirmation.
 */
async function handleDeleteContact(contactId) {
    const contact = state.contacts.find(c => c.id === contactId);
    if (!contact) return;

    const hasTransactions = state.transactions.some(t => t.supplierName === contact.name || t.buyerName === contact.name || t.name === contact.name);
    if (hasTransactions) {
        return showToast('Cannot delete a party that has existing transactions.');
    }

    if (confirm(`Are you sure you want to delete ${contact.name}? This cannot be undone.`)) {
        try {
            await deleteContact(state.user.uid, contactId);
            showToast('Party deleted.');
        } catch (error) {
            showToast('Error: Could not delete party.');
        }
    }
}

/**
 * Attaches event listeners for the contacts page.
 */
function initializeContactsListeners() {
    document.getElementById('add-contact-btn')?.addEventListener('click', () => showContactModal());

    // Event delegation for table actions
    document.getElementById('contacts-table-body')?.addEventListener('click', (e) => {
        const button = e.target.closest('button[data-action]');
        if (!button) return;

        const { action, id } = button.dataset;
        if (action === 'edit') showContactModal(id);
        if (action === 'delete') handleDeleteContact(id);
        if (action === 'ledger') showContactLedger(id);
    });

    // Modal listeners
    document.getElementById('contact-form')?.addEventListener('submit', handleContactFormSubmit);
    document.querySelector('#contact-modal [data-action="close-modal"]')?.addEventListener('click', () => {
        document.getElementById('contact-modal').classList.add('hidden');
    });
}

/**
 * Main function to display and initialize the contacts page.
 */
export function showContacts() {
    renderPage(getContactsTemplate());
    renderContactsTable();
    initializeContactsListeners();
}
