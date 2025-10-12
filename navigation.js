// --- navigation.js ---
import { templates, updateThemeIcon } from './ui.js';
import { state } from './state.js';
import { handleSignOut, handlePasswordChange } from './auth.js';
import * as dashboard from './dashboard.js';
import * as contacts from './contacts.js';
import * as transactions from './transactions.js';
import * as statements from './statements.js';

const mainContent = document.getElementById('app-content');

export function updateUI() {
    const currentSection = document.querySelector('.nav-link.active')?.dataset.section;
    if (!currentSection) return;

    switch (currentSection) {
        case 'dashboard':
            dashboard.renderAll();
            break;
        case 'contacts':
            contacts.renderContacts();
            break;
        case 'transaction-form':
            transactions.populateTradeDropdowns();
            break;
    }
}

export const navigateTo = (section) => {
    return new Promise((resolve) => {
        document.querySelectorAll('.nav-link').forEach(link => {
            link.classList.toggle('active', link.dataset.section === section);
        });
        mainContent.innerHTML = templates[section];

        mainContent.classList.remove('content-enter');
        void mainContent.offsetWidth;
        mainContent.classList.add('content-enter');

        if (section === 'dashboard') {
            state.dashboardCurrentPage = 1;
        }
        setTimeout(() => {
            bindSectionEventListeners(section);
            resolve();
        }, 0);
    });
};

export function bindAppEventListeners() {
    document.getElementById('theme-toggle')?.addEventListener('click', () => {
        document.documentElement.classList.toggle('dark');
        localStorage.setItem('theme', document.documentElement.classList.contains('dark') ? 'dark' : 'light');
        updateThemeIcon();
    });
    document.querySelectorAll('.nav-link').forEach(link => link.addEventListener('click', (e) => navigateTo(e.currentTarget.dataset.section)));
    document.getElementById('logout-btn')?.addEventListener('click', handleSignOut);
    document.getElementById('overall-statement-btn')?.addEventListener('click', () => statements.showPaginatedStatement());

    // Modal & Form Listeners
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
    document.getElementById('settings-btn')?.addEventListener('click', () => document.getElementById('password-modal')?.classList.remove('hidden'));
    
    // Statement Modal Export Buttons
    document.getElementById('statement-png-btn')?.addEventListener('click', () => statements.handleContentExport('png'));
    document.getElementById('statement-pdf-btn')?.addEventListener('click', () => statements.handleContentExport('pdf'));
    document.getElementById('statement-csv-btn')?.addEventListener('click', () => statements.handleContentExportCSV());
}

function bindSectionEventListeners(section) {
    updateUI(); // Immediately render the content for the new section

    if (section === 'dashboard') {
        document.getElementById('search-input')?.addEventListener('input', () => { state.dashboardCurrentPage = 1; dashboard.renderAll(); });
        document.getElementById('filter-start-date')?.addEventListener('change', () => { state.dashboardCurrentPage = 1; dashboard.renderAll(); });
        document.getElementById('filter-end-date')?.addEventListener('change', () => { state.dashboardCurrentPage = 1; dashboard.renderAll(); });
        document.getElementById('transaction-history-body')?.addEventListener('click', dashboard.handleDashboardClick);
    } else if (section === 'contacts') {
        document.getElementById('add-contact-btn')?.addEventListener('click', () => { contacts.resetContactForm(); document.getElementById('contact-modal').classList.remove('hidden'); });
        document.getElementById('contacts-table-body')?.addEventListener('click', contacts.handleContactsClick);
    } else if (section === 'transaction-form') {
        transactions.resetTradeForm();
        document.getElementById('transaction-form')?.addEventListener('submit', transactions.handleTradeFormSubmit);
        document.getElementById('reset-form-btn')?.addEventListener('click', transactions.resetTradeForm);
        document.getElementById('cancel-transaction-btn')?.addEventListener('click', () => navigateTo('dashboard'));
        ['scale-weight', 'less'].forEach(id => document.getElementById(id)?.addEventListener('input', transactions.calculateNetWeight));
        ['supplier-rate', 'buyer-rate'].forEach(id => document.getElementById(id)?.addEventListener('input', transactions.updateTradeTotals));
    }
}
