// js/components/contacts.js

import { state } from '../main.js';
import { renderPage, showToast } from '../ui.js';
import { saveContact, deleteContact, saveTransaction } from '../api.js';
import { showContactLedger } from './statement.js'; 

function getContactsTemplate() {
    return `
        <div class="bg-white dark:bg-slate-900 rounded-lg shadow-sm border border-slate-200 dark:border-slate-800">
            <div class="p-4 border-b dark:border-slate-800 flex justify-between items-center">
                <h2 class="text-xl font-bold">Manage Party</h2>
                <button id="add-contact-btn" class="flex items-center gap-2 px-4 py-2 rounded-lg font-semibold bg-teal-600 text-white hover:bg-teal-700 text-sm">
                    <svg class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M10 5a1 1 0 011 1v3h3a1 1 0 110 2h-3v3a1 1 0 11-2 0v-3H6a1 1 0 110-2h3V6a1 1 0 011-1z" clip-rule="evenodd" /></svg>
                    Add New Party
                </button>
            </div>
            <div class="overflow-x-auto">
                <table class="w-full text-sm responsive-table">
                    <thead><tr class="border-b dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50"><th class="text-left font-semibold py-3 px-4">Name</th><th class="text-left font-semibold py-3 px-4">Type</th><th class="text-right font-semibold py-3 px-4">Net Balance</th><th class="text-center font-semibold py-3 px-4">Actions</th></tr></thead>
                    <tbody id="contacts-table-body"></tbody>
                </table>
            </div>
        </div>

        {/* --- Modals --- */}
        <div id="contact-modal" class="hidden fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <div class="bg-white dark:bg-slate-900 rounded-lg w-full max-w-md"><form id="contact-form"><div class="p-6"><h2 id="contact-form-title" class="text-xl font-bold mb-4">Add New Party</h2><input type="hidden" id="contact-id"><div class="space-y-4"><div><label class="font-semibold text-sm">Party Type</label><div class="flex gap-4 mt-2"><label class="flex items-center gap-2"><input type="radio" name="contact-type" value="supplier" class="form-radio" checked> Supplier</label><label class="flex items-center gap-2"><input type="radio" name="contact-type" value="buyer" class="form-radio"> Buyer</label></div></div><div><label for="contact-name" class="font-semibold text-sm">Full Name</label><input type="text" id="contact-name" class="w-full p-2 mt-1 border rounded-lg bg-slate-50 dark:bg-slate-800" required></div><div><label for="contact-phone" class="font-semibold text-sm">Phone</label><input type="tel" id="contact-phone" class="w-full p-2 mt-1 border rounded-lg bg-slate-50 dark:bg-slate-800"></div><div id="opening-balance-section" class="pt-4 border-t"><p class="font-semibold text-sm">Opening Balance</p><div class="mt-2 space-y-2"><input type="number" step="any" id="contact-opening-balance" placeholder="0.00" class="w-full p-2 border rounded-lg bg-slate-50 dark:bg-slate-800"><div class="flex gap-4 text-sm"><label class="flex items-center gap-2"><input type="radio" name="opening-balance-type" value="receivable" class="form-radio" checked> Receivable</label><label class="flex items-center gap-2"><input type="radio" name="opening-balance-type" value="payable" class="form-radio"> Payable</label></div></div></div></div></div><div class="bg-slate-50 dark:bg-slate-900/50 p-4 flex justify-end gap-3 rounded-b-lg"><button type="button" data-action="close-modal" class="px-4 py-2 rounded-lg font-semibold bg-slate-200 dark:bg-slate-700">Cancel</button><button type="submit" class="px-4 py-2 rounded-lg font-semibold bg-teal-600 text-white">Save</button></div></form></div></div>
        <div id="direct-payment-modal" class="hidden fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <div class="bg-white dark:bg-slate-900 rounded-lg w-full max-w-md"><form id="direct-payment-form"><div class="p-6"><h2 id="direct-payment-modal-title" class="text-xl font-bold mb-4">Add Direct Payment</h2><input type="hidden" id="direct-payment-contact-id"><input type="hidden" id="direct-payment-contact-name"><div class="space-y-4"><div><label class="font-semibold text-sm">Date</label><input type="date" id="direct-payment-date" class="w-full p-2 mt-1 border rounded-lg bg-slate-50 dark:bg-slate-800" required></div><div><label class="font-semibold text-sm">Amount</label><input type="number" step="any" id="direct-payment-amount" placeholder="0.00" class="w-full p-2 mt-1 border rounded-lg bg-slate-50 dark:bg-slate-800" required></div><div><label class="font-semibold text-sm">Method</label><select id="direct-payment-method" class="w-full p-2 mt-1 border rounded-lg bg-slate-50 dark:bg-slate-800"><option>Cash</option><option>Bank</option><option>Bkash</option></select></div><div><label class="font-semibold text-sm">Description</label><input type="text" id="direct-payment-desc" class="w-full p-2 mt-1 border rounded-lg bg-slate-50 dark:bg-slate-800" required></div><div><label class="font-semibold text-sm">Type</label><div class="flex gap-4 mt-1"><label class="flex items-center gap-2"><input type="radio" name="direct-payment-type" value="made" class="form-radio"> Made</label><label class="flex items-center gap-2"><input type="radio" name="direct-payment-type" value="received" class="form-radio"> Received</label></div></div></div></div><div class="bg-slate-50 dark:bg-slate-900/50 p-4 flex justify-end gap-3 rounded-b-lg"><button type="button" data-action="close-direct-payment" class="px-4 py-2 rounded-lg font-semibold bg-slate-200 dark:bg-slate-700">Cancel</button><button type="submit" class="px-4 py-2 rounded-lg font-semibold bg-teal-600 text-white">Save</button></div></form></div></div>
    `;
}

function renderContactsTable() {
    // ... code to render table rows ...
}

function initializeContactsListeners() {
    // ... code for event listeners ...
}

// ... other helper functions for the component (showContactModal, openDirectPaymentModal, etc.)

/**
 * ✨ FIX: This function must be exported so main.js can import it.
 * Main function to display and initialize the contacts page.
 */
export function showContacts() {
    renderPage(getContactsTemplate());
    renderContactsTable();
    initializeContactsListeners();
}
