// js/components/contacts.js

import { state } from '../main.js';
import { renderPage, showToast } from '../ui.js';
import { saveContact, deleteContact, saveTransaction } from '../api.js';
import { showContactLedger } from './statement.js'; 

/**
 * Returns the HTML template for the contacts page, including all necessary modals.
 */
function getContactsTemplate() {
    return `
        <div class="bg-white dark:bg-slate-900 rounded-lg shadow-sm border border-slate-200 dark:border-slate-800">
            <div class="p-4 border-b dark:border-slate-800 flex justify-between items-center">
                <h2 class="text-xl font-bold">Manage Party</h2>
                <button id="add-contact-btn" class="flex items-center gap-2 px-4 py-2 rounded-lg font-semibold bg-teal-600 text-white hover:bg-teal-700 text-sm">
                    Add New Party
                </button>
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

        <div id="contact-modal" class="hidden fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            </div>

        <div id="direct-payment-modal" class="hidden fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <div class="bg-white dark:bg-slate-900 rounded-lg w-full max-w-md">
                <form id="direct-payment-form">
                    <div class="p-6">
                        <h2 id="direct-payment-modal-title" class="text-xl font-bold mb-4">Add Direct Payment</h2>
                        <input type="hidden" id="direct-payment-contact-id">
                        <input type="hidden" id="direct-payment-contact-name">
                        <div class="space-y-4">
                            <div><label for="direct-payment-date" class="font-semibold text-sm">Date</label><input type="date" id="direct-payment-date" class="w-full p-2 mt-1 border rounded-lg bg-slate-50 dark:bg-slate-800" required></div>
                            <div><label for="direct-payment-amount" class="font-semibold text-sm">Amount</label><input type="number" step="any" id="direct-payment-amount" placeholder="0.00" class="w-full p-2 mt-1 border rounded-lg bg-slate-50 dark:bg-slate-800" required></div>
                            <div><label for="direct-payment-method" class="font-semibold text-sm">Method</label><select id="direct-payment-method" class="w-full p-2 mt-1 border rounded-lg bg-slate-50 dark:bg-slate-800"><option>Cash</option><option>Bank</option><option>Bkash</option></select></div>
                            <div><label for="direct-payment-desc" class="font-semibold text-sm">Description / Note</label><input type="text" id="direct-payment-desc" placeholder="e.g., Advance Payment" class="w-full p-2 mt-1 border rounded-lg bg-slate-50 dark:bg-slate-800" required></div>
                            <div><label class="font-semibold text-sm">Payment Type</label><div class="flex gap-4 mt-1"><label class="flex items-center gap-2"><input type="radio" name="direct-payment-type" value="made" class="form-radio"> Payment Made</label><label class="flex items-center gap-2"><input type="radio" name="direct-payment-type" value="received" class="form-radio"> Payment Received</label></div></div>
                        </div>
                    </div>
                    <div class="bg-slate-50 dark:bg-slate-900/50 p-4 flex justify-end gap-3 rounded-b-lg">
                        <button type="button" data-action="close-direct-payment" class="px-4 py-2 rounded-lg font-semibold bg-slate-200 dark:bg-slate-700">Cancel</button>
                        <button type="submit" class="px-4 py-2 rounded-lg font-semibold bg-teal-600 text-white">Save Payment</button>
                    </div>
                </form>
            </div>
        </div>
    `;
}

/**
 * Renders the list of contacts into the table.
 */
function renderContactsTable() {
    const tbody = document.getElementById('contacts-table-body');
    if (!tbody) return;

    if (state.contacts.length === 0) {
        tbody.innerHTML = `<tr><td colspan="4" class="text-center py-12 text-slate-500">No parties found.</td></tr>`;
        return;
    }
    
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
        
        return `
            <tr class="border-b dark:border-slate-800">
                <td data-label="Name" class="py-3 px-4">
                    <button data-action="ledger" data-id="${contact.id}" class="font-medium text-left hover:text-teal-600 dark:hover:text-teal-400">${contact.name}</button>
                </td>
                <td data-label="Type" class="py-3 px-4">${typeBadge}</td>
                <td data-label="Net Balance" class="py-3 px-4 text-right font-bold ${balanceClass}">${balanceText}</td>
                <td data-label="Actions" class="py-3 px-4 actions-cell">
                    <div class="flex justify-end md:justify-center items-center gap-1">
                        <button title="Add Direct Payment" data-action="direct-payment" data-id="${contact.id}" class="p-2 text-teal-600 hover:bg-teal-100 dark:hover:bg-teal-900/50 rounded-full">💰</button>
                        <button title="Edit Party" data-action="edit" data-id="${contact.id}" class="p-2 text-blue-600 hover:bg-blue-100 dark:hover:bg-blue-900/50 rounded-full">✏️</button>
                        <button title="Delete Party" data-action="delete" data-id="${contact.id}" class="p-2 text-rose-500 hover:bg-rose-100 dark:hover:bg-rose-900/50 rounded-full">🗑️</button>
                    </div>
                </td>
            </tr>
        `;
    }).join('');
}

/**
 * ✨ NEW: Opens and prepares the modal for adding a direct payment.
 */
function openDirectPaymentModal(contactId) {
    const contact = state.contacts.find(c => c.id === contactId);
    if (!contact) return showToast('Contact not found.');

    const modal = document.getElementById('direct-payment-modal');
    const form = document.getElementById('direct-payment-form');
    form.reset();

    document.getElementById('direct-payment-modal-title').textContent = `Direct Payment for ${contact.name}`;
    document.getElementById('direct-payment-contact-id').value = contact.id;
    document.getElementById('direct-payment-contact-name').value = contact.name;
    document.getElementById('direct-payment-date').value = new Date().toISOString().split('T')[0];

    // Auto-select "Payment Made" for suppliers and "Received" for buyers
    const typeToSelect = contact.type === 'supplier' ? 'made' : 'received';
    document.querySelector(`input[name="direct-payment-type"][value="${typeToSelect}"]`).checked = true;

    modal.classList.remove('hidden');
}

/**
 * ✨ NEW: Handles the submission of the direct payment form.
 */
async function handleDirectPaymentSubmit(e) {
    e.preventDefault();
    const paymentData = {
        type: 'payment',
        date: document.getElementById('direct-payment-date').value,
        name: document.getElementById('direct-payment-contact-name').value,
        amount: parseFloat(document.getElementById('direct-payment-amount').value) || 0,
        method: document.getElementById('direct-payment-method').value,
        description: document.getElementById('direct-payment-desc').value.trim(),
        paymentType: document.querySelector('input[name="direct-payment-type"]:checked')?.value,
    };

    if (!paymentData.date || !paymentData.amount || !paymentData.description || !paymentData.paymentType) {
        return showToast('Please fill out all fields.');
    }

    try {
        await saveTransaction(state.user.uid, paymentData); // Direct payments are also transactions
        showToast(`Payment for ${paymentData.name} saved!`);
        document.getElementById('direct-payment-modal').classList.add('hidden');
    } catch (error) {
        showToast('Error: Could not save payment.');
        console.error("Direct payment error:", error);
    }
}

function initializeContactsListeners() {
    document.getElementById('add-contact-btn')?.addEventListener('click', () => showContactModal());

    // ✨ FIX: Event listener now handles 'ledger' and 'direct-payment' actions.
    document.getElementById('contacts-table-body')?.addEventListener('click', (e) => {
        const button = e.target.closest('button[data-action]');
        if (!button) return;
        const { action, id } = button.dataset;
        if (action === 'edit') showContactModal(id);
        if (action === 'delete') handleDeleteContact(id);
        if (action === 'ledger') showContactLedger(id);
        if (action === 'direct-payment') openDirectPaymentModal(id);
    });
    
    // Listeners for both modals
    document.getElementById('contact-form')?.addEventListener('submit', handleContactFormSubmit);
    document.getElementById('direct-payment-form')?.addEventListener('submit', handleDirectPaymentSubmit);
    document.querySelector('[data-action="close-modal"]')?.addEventListener('click', () => document.getElementById('contact-modal').classList.add('hidden'));
    document.querySelector('[data-action="close-direct-payment"]')?.addEventListener('click', () => document.getElementById('direct-payment-modal').classList.add('hidden'));
}

// The rest of the functions remain the same
// ...
function showContactModal(contactId = null) { /* ... same as before ... */ }
async function handleContactFormSubmit(e) { /* ... same as before ... */ }
async function handleDeleteContact(contactId) { /* ... same as before ... */ }

export function showContacts() {
    renderPage(getContactsTemplate());
    renderContactsTable();
    initializeContactsListeners();
}
