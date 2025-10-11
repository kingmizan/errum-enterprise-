// js/components/contacts.js

import { state } from '../main.js';
import { renderPage, showToast } from '../ui.js';
import { saveContact, deleteContact } from '../api.js';
// We assume you will create a statement.js module for this functionality
// import { showContactLedger } from './statement.js'; 

/**
 * Returns the HTML template for the contacts page.
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
                            <th class="text-left font-semibold py-3 px-4">Last Active</th>
                            <th class="text-right font-semibold py-3 px-4">Net Balance</th>
                            <th class="text-center font-semibold py-3 px-4">Actions</th>
                        </tr>
                    </thead>
                    <tbody id="contacts-table-body">
                        </tbody>
                </table>
            </div>
        </div>

        <div id="contact-modal" class="hidden fixed inset-0 bg-black/50 dark:bg-black/70 z-50 flex items-center justify-center p-4">
            <div class="bg-white dark:bg-slate-900 rounded-lg shadow-lg w-full max-w-md border border-slate-200 dark:border-slate-800">
                <form id="contact-form">
                    <div class="p-6">
                        <h2 id="contact-form-title" class="text-xl font-bold mb-4 text-slate-900 dark:text-white">Add New Party</h2>
                        <input type="hidden" id="contact-id">
                        <div class="space-y-4">
                            <div><label class="font-semibold text-sm">Party Type</label><div class="flex gap-4 mt-2"><label class="flex items-center gap-2"><input type="radio" name="contact-type" value="supplier" class="form-radio" checked> Supplier</label><label class="flex items-center gap-2"><input type="radio" name="contact-type" value="buyer" class="form-radio"> Buyer</label></div></div>
                            <div><label for="contact-name" class="font-semibold text-sm">Full Name</label><input type="text" id="contact-name" class="w-full p-2 mt-1 border rounded-lg bg-slate-50 dark:bg-slate-800 border-slate-300 dark:border-slate-700" required></div>
                            <div><label for="contact-phone" class="font-semibold text-sm">Phone Number</label><input type="tel" id="contact-phone" class="w-full p-2 mt-1 border rounded-lg bg-slate-50 dark:bg-slate-800 border-slate-300 dark:border-slate-700"></div>
                            <div id="opening-balance-section" class="pt-4 border-t dark:border-slate-700">
                                <p class="font-semibold text-sm">Opening Balance</p>
                                <div class="mt-2 space-y-2">
                                    <input type="number" step="any" id="contact-opening-balance" placeholder="0.00" class="w-full p-2 border rounded-lg bg-slate-50 dark:bg-slate-800 border-slate-300 dark:border-slate-700">
                                    <div class="flex gap-4 text-sm"><label class="flex items-center gap-2"><input type="radio" name="opening-balance-type" value="receivable" class="form-radio" checked> Receivable</label><label class="flex items-center gap-2"><input type="radio" name="opening-balance-type" value="payable" class="form-radio"> Payable</label></div>
                                </div>
                            </div>
                        </div>
                    </div>
                    <div class="bg-slate-50 dark:bg-slate-900/50 p-4 flex justify-end gap-3 rounded-b-lg border-t border-slate-200 dark:border-slate-800">
                        <button type="button" id="cancel-contact-btn" class="px-4 py-2 rounded-lg font-semibold bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-sm">Cancel</button>
                        <button type="submit" class="px-4 py-2 rounded-lg font-semibold bg-teal-600 text-white hover:bg-teal-700 text-sm">Save Party</button>
                    </div>
                </form>
            </div>
        </div>
    `;
}

/**
 * Calculates balance and renders the list of contacts into the table.
 */
function renderContactsTable() {
    const tbody = document.getElementById('contacts-table-body');
    if (!tbody) return;

    if (state.contacts.length === 0) {
        tbody.innerHTML = `<tr><td colspan="6" class="text-center py-12 text-slate-500 dark:text-slate-400">No parties found. Add one to get started!</td></tr>`;
        return;
    }

    const getPayments = (history) => (history || []).reduce((sum, p) => sum + p.amount, 0);
    
    const rowsHtml = state.contacts.map(c => {
        // --- Calculate Net Balance ---
        let netBalance = 0;
        if (c.openingBalance?.amount > 0) {
            netBalance = c.openingBalance.type === 'receivable' ? c.openingBalance.amount : -c.openingBalance.amount;
        }
        
        const relatedTransactions = state.transactions.filter(t => t.supplierName === c.name || t.buyerName === c.name || t.name === c.name);
        
        relatedTransactions.forEach(t => {
            if (t.type === 'trade') {
                if (t.supplierName === c.name) netBalance -= (t.supplierTotal - getPayments(t.paymentsToSupplier));
                if (t.buyerName === c.name) netBalance += (t.buyerTotal - getPayments(t.paymentsFromBuyer));
            } else if (t.type === 'payment' && t.name === c.name) {
                if (t.paymentType === 'made') netBalance += t.amount; // We paid them, our debt to them decreases OR their debt to us increases
                else netBalance -= t.amount; // We received from them
            }
        });

        // --- Determine Last Active Date ---
        let lastTransactionDate = '<span class="text-slate-400">N/A</span>';
        if (relatedTransactions.length > 0) {
            relatedTransactions.sort((a, b) => new Date(b.date) - new Date(a.date));
            lastTransactionDate = relatedTransactions[0].date;
        }

        // --- Setup styles for Balance and Type Badge ---
        const balanceText = `৳${Math.abs(netBalance).toFixed(2)}`;
        let balanceClass = 'text-slate-500';
        if (netBalance > 0.01) balanceClass = 'text-green-600 dark:text-green-500'; // Receivable
        else if (netBalance < -0.01) balanceClass = 'text-rose-500'; // Payable

        const typeBadge = c.type === 'buyer'
            ? `<span class="inline-flex items-center py-1 px-2.5 rounded-full text-xs font-medium bg-teal-100 text-teal-800 dark:bg-teal-500/20 dark:text-teal-400">Buyer</span>`
            : `<span class="inline-flex items-center py-1 px-2.5 rounded-full text-xs font-medium bg-slate-100 text-slate-800 dark:bg-slate-700 dark:text-slate-300">Supplier</span>`;

        return `
            <tr class="odd:bg-slate-50 dark:odd:bg-slate-900/50 hover:bg-slate-100 dark:hover:bg-slate-800/50 border-b dark:border-slate-800 md:border-b-0">
                <td data-label="Name" class="py-4 px-4 align-middle font-medium text-slate-900 dark:text-slate-100">${c.name}</td>
                <td data-label="Type" class="py-4 px-4 align-middle">${typeBadge}</td>
                <td data-label="Phone" class="py-4 px-4 align-middle">${c.phone || 'N/A'}</td>
                <td data-label="Last Active" class="py-4 px-4 align-middle font-medium text-slate-600 dark:text-slate-400">${lastTransactionDate}</td>
                <td data-label="Net Balance" class="py-4 px-4 align-middle font-bold text-right ${balanceClass}">${balanceText}</td>
                <td data-label="Actions" class="py-4 px-4 align-middle actions-cell">
                    <div class="flex justify-end md:justify-center items-center gap-1">
                        <button title="View Ledger" data-action="ledger" data-id="${c.id}" class="p-1 text-sky-600 hover:bg-sky-100 rounded-full">📄</button>
                        <button title="Edit Contact" data-action="edit" data-id="${c.id}" class="p-1 text-blue-600 hover:bg-blue-100 rounded-full">✏️</button>
                        <button title="Delete Contact" data-action="delete" data-id="${c.id}" class="p-1 text-rose-500 hover:bg-rose-100 rounded-full">🗑️</button>
                    </div>
                </td>
            </tr>
        `;
    }).join('');

    tbody.innerHTML = rowsHtml;
}

/**
 * Shows the contact modal for creating or editing.
 * @param {string|null} contactId - The ID of the contact to edit, or null to create.
 */
function showContactModal(contactId = null) {
    const modal = document.getElementById('contact-modal');
    const form = document.getElementById('contact-form');
    const title = document.getElementById('contact-form-title');
    const openingBalanceSection = document.getElementById('opening-balance-section');
    form.reset();

    if (contactId) {
        // --- Edit Mode ---
        const contact = state.contacts.find(c => c.id === contactId);
        if (!contact) return showToast('Error: Contact not found.');
        
        title.textContent = 'Edit Party';
        document.getElementById('contact-id').value = contact.id;
        document.getElementById('contact-name').value = contact.name;
        document.getElementById('contact-phone').value = contact.phone || '';
        document.querySelector(`input[name="contact-type"][value="${contact.type}"]`).checked = true;

        // Hide and disable opening balance for existing contacts
        openingBalanceSection.classList.add('hidden');
    } else {
        // --- Add Mode ---
        title.textContent = 'Add New Party';
        document.getElementById('contact-id').value = '';
        openingBalanceSection.classList.remove('hidden');
    }
    modal.classList.remove('hidden');
}

/**
 * Handles the submission of the contact form.
 */
async function handleContactFormSubmit(e) {
    e.preventDefault();
    const id = document.getElementById('contact-id').value;
    const name = document.getElementById('contact-name').value.trim();

    if (!name) return showToast('Party name is required.');
    
    // Prevent creating a duplicate contact name
    if (!id && state.contacts.some(c => c.name.toLowerCase() === name.toLowerCase())) {
        return showToast('A party with this name already exists.');
    }
    
    const contactData = {
        name: name,
        type: document.querySelector('input[name="contact-type"]:checked').value,
        phone: document.getElementById('contact-phone').value.trim(),
    };

    // Only add opening balance for new contacts
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
        await saveContact(state.user.uid, contactData, id);
        showToast(id ? 'Party Updated!' : 'Party Added!');
        document.getElementById('contact-modal').classList.add('hidden');
    } catch (error) {
        showToast('Error: Could not save party.');
        console.error("Error saving contact:", error);
    }
}

/**
 * Handles the deletion of a contact after confirmation.
 */
async function handleDeleteContact(contactId) {
    const contact = state.contacts.find(c => c.id === contactId);
    if (!contact) return;

    // Critical check: Prevent deletion if transactions exist for this contact
    const hasTransactions = state.transactions.some(t => t.supplierName === contact.name || t.buyerName === contact.name || t.name === contact.name);
    if (hasTransactions) {
        return showToast('Cannot delete party with existing transactions.');
    }

    if (confirm(`Are you sure you want to delete ${contact.name}? This action cannot be undone.`)) {
        try {
            await deleteContact(state.user.uid, contactId);
            showToast('Party deleted.');
        } catch (error) {
            showToast('Error: Could not delete party.');
            console.error("Error deleting contact:", error);
        }
    }
}

/**
 * Attaches event listeners for the contacts page.
 */
function initializeContactsListeners() {
    document.getElementById('add-contact-btn')?.addEventListener('click', () => showContactModal());
    document.getElementById('contacts-table-body')?.addEventListener('click', (e) => {
        const button = e.target.closest('button[data-action]');
        if (!button) return;

        const { action, id } = button.dataset;
        if (action === 'edit') showContactModal(id);
        if (action === 'delete') handleDeleteContact(id);
        if (action === 'ledger') {
            // Placeholder for statement/ledger functionality
            console.log(`Show ledger for contact ${id}`);
            // showContactLedger(id); // This would be the actual function call
            alert(`Ledger functionality for ${state.contacts.find(c=>c.id === id)?.name} would be shown here.`);
        }
    });

    document.getElementById('contact-form')?.addEventListener('submit', handleContactFormSubmit);
    document.getElementById('cancel-contact-btn')?.addEventListener('click', () => {
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
