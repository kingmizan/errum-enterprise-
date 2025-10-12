// --- contacts.js ---
// Handles all logic for the 'Contacts' (Party) section.

import { state } from './state.js';
import { showToast } from './ui.js';
import { saveDoc, deleteDocument } from './firestore.js';

// Helper function to calculate the net balance for a contact
const getContactNetBalance = (contactName) => {
    const contact = state.contacts.find(c => c.name === contactName);
    if (!contact) return 0;

    let netBalance = 0;
    // 1. Add opening balance
    if (contact.openingBalance && contact.openingBalance.amount > 0) {
        netBalance = contact.openingBalance.type === 'receivable' ? contact.openingBalance.amount : -contact.openingBalance.amount;
    }

    // 2. Process related transactions
    const relatedTransactions = state.transactions.filter(t => t.supplierName === contactName || t.buyerName === contactName || t.name === contactName);
    relatedTransactions.forEach(t => {
        if (t.type === 'trade') {
            const getPayments = (history) => (history || []).reduce((sum, p) => sum + p.amount, 0);
            if (t.supplierName === contactName) { // We owe the supplier
                netBalance -= (t.supplierTotal - getPayments(t.paymentsToSupplier));
            }
            if (t.buyerName === contactName) { // The buyer owes us
                netBalance += (t.buyerTotal - getPayments(t.paymentsFromBuyer));
            }
        } else if (t.type === 'payment' && t.name === contactName) {
            if (t.paymentType === 'made') netBalance += t.amount; // We paid them, reducing what we owe (or creating a receivable)
            else netBalance -= t.amount; // We received from them, reducing what they owe
        }
    });
    return netBalance;
};

// Renders the contacts table in the UI
export function renderContacts() {
    const tbody = document.getElementById('contacts-table-body');
    if (!tbody) return;
    tbody.innerHTML = '';
    if (state.contacts.length === 0) {
        tbody.innerHTML = `<tr><td colspan="6" class="text-center py-12 text-slate-500">No contacts found. Add one to get started!</td></tr>`;
        return;
    }

    state.contacts.forEach(c => {
        const netBalance = getContactNetBalance(c.name);
        const relatedTransactions = state.transactions.filter(t => t.supplierName === c.name || t.buyerName === c.name || t.name === c.name);

        let lastTransactionDate = '<span class="text-slate-400">N/A</span>';
        if (relatedTransactions.length > 0) {
            relatedTransactions.sort((a, b) => new Date(b.date) - new Date(a.date));
            lastTransactionDate = relatedTransactions[0].date;
        }

        const balanceText = `৳${Math.abs(netBalance).toFixed(2)}`;
        let balanceClass = 'text-slate-500';
        if (netBalance > 0.01) balanceClass = 'text-green-600'; // Receivable
        else if (netBalance < -0.01) balanceClass = 'text-rose-500'; // Payable

        const typeBadge = c.type === 'buyer'
            ? `<span class="inline-flex items-center gap-1.5 py-1 px-2.5 rounded-full text-xs font-medium bg-cyan-100 text-cyan-800">Buyer</span>`
            : `<span class="inline-flex items-center gap-1.5 py-1 px-2.5 rounded-full text-xs font-medium bg-slate-100 text-slate-800">Supplier</span>`;

        const row = document.createElement('tr');
        row.className = 'hover:bg-slate-50 border-b border-slate-200 md:border-b-0';
        row.innerHTML = `
            <td data-label="Name" class="py-4 px-4 align-middle">
                <button data-ledger-id="${c.id}" class="font-medium text-slate-800 hover:text-cyan-600 text-left cursor-pointer">${c.name}</button>
            </td>
            <td data-label="Type" class="py-4 px-4 align-middle">${typeBadge}</td>
            <td data-label="Phone" class="py-4 px-4 align-middle">${c.phone || 'N/A'}</td>
            <td data-label="Last Active" class="py-4 px-4 align-middle font-medium text-slate-600">${lastTransactionDate}</td>
            <td data-label="Net Balance" class="py-4 px-4 align-middle font-bold text-right ${balanceClass}">${balanceText}</td>
            <td data-label="Actions" class="py-4 px-4 align-middle actions-cell">
                <div class="flex justify-end md:justify-center items-center gap-1">
                    <button title="Add Direct Payment" data-direct-payment-id="${c.id}" class="p-1 text-cyan-600 hover:bg-cyan-100 rounded-full"><svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-11a1 1 0 10-2 0v2H7a1 1 0 100 2h2v2a1 1 0 102 0v-2h2a1 1 0 100-2h-2V7z" clip-rule="evenodd" /></svg></button>
                    <button title="Edit Contact" data-edit-contact-id="${c.id}" class="p-1 text-blue-600 hover:bg-blue-100 rounded-full"><svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg></button>
                    <button title="Delete Contact" data-delete-contact-id="${c.id}" class="p-1 text-rose-500 hover:bg-rose-100 rounded-full"><svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg></button>
                </div>
            </td>`;
        tbody.appendChild(row);
    });
}

// Resets the contact form modal for adding a new contact
export const resetContactForm = () => {
    document.getElementById('contact-form-title').textContent = 'Add New Party';
    document.getElementById('contact-form').reset();
    document.getElementById('contact-id').value = '';
    document.getElementById('contact-opening-balance').disabled = false;
    document.querySelectorAll('input[name="opening-balance-type"]').forEach(el => el.disabled = false);
};

// Sets up the contact form modal for editing an existing contact
export const setupContactFormForEdit = (id) => {
    const contact = state.contacts.find(c => c.id === id);
    if (!contact) return;
    resetContactForm();
    document.getElementById('contact-form-title').textContent = 'Edit Party';
    document.getElementById('contact-id').value = contact.id;
    document.getElementById('contact-name').value = contact.name;
    document.getElementById('contact-phone').value = contact.phone || '';
    document.getElementById('contact-address').value = contact.address || '';
    document.querySelector(`#contact-form input[name="contact-type"][value="${contact.type}"]`).checked = true;

    // Disable opening balance fields when editing
    const balanceInput = document.getElementById('contact-opening-balance');
    const balanceTypeRadios = document.querySelectorAll('input[name="opening-balance-type"]');
    if (contact.openingBalance) {
        balanceInput.value = contact.openingBalance.amount;
        document.querySelector(`input[name="opening-balance-type"][value="${contact.openingBalance.type}"]`).checked = true;
    }
    balanceInput.disabled = true;
    balanceTypeRadios.forEach(el => el.disabled = true);

    document.getElementById('contact-modal').classList.remove('hidden');
};

// Handles the submission of the contact form (save or update)
export const handleSaveContact = async (e) => {
    e.preventDefault();
    const id = document.getElementById('contact-id').value;
    const name = document.getElementById('contact-name').value.trim();
    if (!name) {
        showToast('Contact name is required.');
        return;
    }
    if (!id && state.contacts.some(c => c.name.toLowerCase() === name.toLowerCase())) {
        showToast('A contact with this name already exists.');
        return;
    }

    const contactData = {
        name: name,
        type: document.querySelector('#contact-form input[name="contact-type"]:checked').value,
        phone: document.getElementById('contact-phone').value.trim(),
        address: document.getElementById('contact-address').value.trim()
    };

    if (!id) { // Only add opening balance on creation
        const openingBalanceAmount = parseFloat(document.getElementById('contact-opening-balance').value) || 0;
        if (openingBalanceAmount > 0) {
            contactData.openingBalance = {
                amount: openingBalanceAmount,
                type: document.querySelector('input[name="opening-balance-type"]:checked').value
            };
        }
    }

    try {
        await saveDoc("contacts", id, contactData);
        showToast(id ? 'Contact updated!' : 'Contact added!');
        document.getElementById('contact-modal').classList.add('hidden');
    } catch (error) {
        showToast('Error: Could not save contact.');
        console.error("Error saving contact: ", error);
    }
};

// Handles the deletion of a contact
export const handleDeleteContact = async (id) => {
    const contact = state.contacts.find(c => c.id === id);
    if (!contact) return;
    if (state.transactions.some(t => t.name === contact.name || t.supplierName === contact.name || t.buyerName === contact.name)) {
        showToast('Cannot delete contact with existing transactions.');
        return;
    }
    if (confirm(`Are you sure you want to delete ${contact.name}? This action cannot be undone.`)) {
        try {
            await deleteDocument("contacts", id);
            showToast('Contact deleted.');
        } catch (error) {
            showToast('Error: Could not delete contact.');
            console.error("Error deleting contact: ", error);
        }
    }
};
