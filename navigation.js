// --- navigation.js ---
// Handles client-side routing and event listener binding

import { templates } from './ui.js';
import { state } from './state.js';
import { handleSignOut, handlePasswordChange } from './auth.js';
import * as dashboard from './dashboard.js';
import * as contacts from './contacts.js';
import * as transactions from './transactions.js';
import * as statements from './statements.js';

const mainContent = document.getElementById('app-content');

/**
 * This is the new central function to refresh the user interface.
 * It checks which screen is currently active and calls the appropriate
 * rendering functions. This resolves the race condition.
 */
export function updateUI() {
    const currentSection = document.querySelector('.nav-link.active')?.dataset.section;
    if (!currentSection) return; // Exit if no section is active

    switch (currentSection) {
        case 'dashboard':
            renderAll();
            break;
        case 'contacts':
            renderContacts();
            break;
        case 'transaction-form':
            // If contacts data changes while on the form, refresh dropdowns
            transactions.populateTradeDropdowns();
            break;
        // Add cases for other sections if they need real-time updates
    }
}

/**
 * Renders all components for the dashboard.
 */
export function renderAll() {
    if (document.getElementById('transaction-history-body')) {
        const data = dashboard.getFilteredTransactions();
        dashboard.renderDashboardMetrics();
        dashboard.renderTransactionHistory(data);
        dashboard.renderDashboardPaginationControls(data.length);
    }
}

/**
 * Renders the contacts table.
 */
export function renderContacts() {
    if (document.getElementById('contacts-table-body')) {
        contacts.renderContacts();
    }
}

/**
 * Navigates to a new section by rendering its template and binding events.
 */
export const navigateTo = (section, context = null) => {
    return new Promise((resolve) => {
        document.querySelectorAll('.nav-link').forEach(link => {
            link.classList.toggle('active', link.dataset.section === section);
        });
        mainContent.innerHTML = templates[section];

        mainContent.classList.remove('content-enter');
        void mainContent.offsetWidth; // Trigger reflow
        mainContent.classList.add('content-enter');

        if (section === 'dashboard') {
            state.dashboardCurrentPage = 1;
        }
        setTimeout(() => {
            bindSectionEventListeners(section, context);
            resolve();
        }, 0);
    });
};

/**
 * Binds event listeners to the main application shell (elements that never change).
 */
export function bindAppEventListeners() {
    document.querySelectorAll('.nav-link').forEach(link => {
        link.addEventListener('click', (e) => navigateTo(e.currentTarget.dataset.section));
    });

    document.getElementById('logout-btn')?.addEventListener('click', handleSignOut);
    document.getElementById('settings-btn')?.addEventListener('click', () => document.getElementById('password-modal')?.classList.remove('hidden'));

    document.getElementById('save-payment-btn')?.addEventListener('click', transactions.handleSavePayment);
    document.getElementById('contact-form')?.addEventListener('submit', contacts.handleSaveContact);
    document.getElementById('password-change-form')?.addEventListener('submit', handlePasswordChange);
    document.getElementById('direct-payment-form')?.addEventListener('submit', transactions.handleDirectPaymentSubmit);

    document.querySelectorAll('[data-close-modal]').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const modalId = e.currentTarget.dataset.closeModal;
            document.getElementById(modalId)?.classList.add('hidden');
        });
    });
}

/**
 * Binds event listeners specific to the section that was just rendered.
 */
function bindSectionEventListeners(section, context) {
    // After navigating, immediately call updateUI to populate the new view with data.
    updateUI();

    if (section === 'dashboard') {
        document.getElementById('search-input')?.addEventListener('input', () => { state.dashboardCurrentPage = 1; renderAll(); });
        document.getElementById('filter-start-date')?.addEventListener('change', () => { state.dashboardCurrentPage = 1; renderAll(); });
        document.getElementById('filter-end-date')?.addEventListener('change', () => { state.dashboardCurrentPage = 1; renderAll(); });

        document.getElementById('transaction-history-body')?.addEventListener('click', (e) => {
            const button = e.target.closest('button');
            if (button && button.closest('td')?.classList.contains('actions-cell')) {
                e.stopPropagation();
                const { editId, deleteId, paymentId, paymentType } = button.dataset;
                if (editId) { navigateTo('transaction-form').then(() => transactions.setupTradeFormForEdit(editId)); }
                if (deleteId) transactions.handleDelete(deleteId);
                if (paymentId) transactions.openPaymentModal(paymentId, paymentType);
            }
        });

    } else if (section === 'contacts') {
        document.getElementById('add-contact-btn')?.addEventListener('click', () => { contacts.resetContactForm(); document.getElementById('contact-modal').classList.remove('hidden'); });
        document.getElementById('contacts-table-body')?.addEventListener('click', e => {
            const target = e.target.closest('button');
            if (!target) return;
            const { editContactId, deleteContactId, ledgerId, directPaymentId } = target.dataset;
            if (editContactId) contacts.setupContactFormForEdit(editContactId);
            if (deleteContactId) contacts.handleDeleteContact(deleteContactId);
            if (ledgerId) navigateTo('statements', { contactId: ledgerId });
            if (directPaymentId) transactions.openDirectPaymentModal(directPaymentId);
        });

    } else if (section === 'transaction-form') {
        transactions.resetTradeForm(); // Reset form on navigation
        document.getElementById('transaction-form')?.addEventListener('submit', transactions.handleTradeFormSubmit);
        document.getElementById('reset-form-btn')?.addEventListener('click', transactions.resetTradeForm);
        document.getElementById('cancel-transaction-btn')?.addEventListener('click', () => navigateTo('dashboard'));
        ['scale-weight', 'less'].forEach(id => document.getElementById(id)?.addEventListener('input', transactions.calculateNetWeight));
        ['supplier-rate', 'buyer-rate'].forEach(id => document.getElementById(id)?.addEventListener('input', transactions.updateTradeTotals));

    } else if (section === 'statements') {
        const partySelect = document.getElementById('party-ledger-select');
        if (partySelect) {
            state.contacts.forEach(c => {
                const option = document.createElement('option');
                option.value = c.id;
                option.textContent = c.name;
                partySelect.appendChild(option);
            });
            document.getElementById('generate-overall-statement-btn')?.addEventListener('click', statements.renderOverallStatement);
            partySelect.addEventListener('change', (e) => {
                if (e.target.value) {
                    statements.renderContactLedger(e.target.value);
                }
            });
            if (context?.contactId) {
                partySelect.value = context.contactId;
                statements.renderContactLedger(context.contactId);
            }
        }
    }
};
