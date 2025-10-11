// js/statement.js

import { checkAuth, renderHeaderAndNav, updateUserEmail } from './shared.js';
import { listenToContacts, listenToTransactions } from './api.js';
import { showToast } from './ui.js';

let contactsState = [];
let transactionsState = [];
let statementCurrentPage = 1;
const STATEMENT_ITEMS_PER_PAGE = 25;
let currentStatementData = { type: null, data: [], name: '' };

// Main entry point for the page
async function init() {
    const user = await checkAuth();
    if (!user) return;

    renderHeaderAndNav('statement'); // 'statement' is not a nav link, so none will be active
    updateUserEmail(user.email);

    document.getElementById('app-content').innerHTML = getStatementPageTemplate();

    listenToContacts(user.uid, (contacts) => {
        contactsState = contacts;
        loadStatementData();
    });

    listenToTransactions(user.uid, (transactions) => {
        transactionsState = transactions;
        loadStatementData();
    });
    
    initializeStatementListeners();
}

function getStatementPageTemplate() {
    return `
        <div class="bg-white dark:bg-slate-900 rounded-lg shadow-sm">
            <div class="p-4 border-b flex justify-between items-center">
                <h2 id="statement-title" class="text-xl font-bold">Statement</h2>
                <div class="flex items-center gap-2">
                    <button id="statement-csv-btn" class="px-3 py-1.5 text-sm rounded-md bg-slate-200 dark:bg-slate-700">CSV</button>
                    <button id="statement-png-btn" class="px-3 py-1.5 text-sm rounded-md bg-slate-200 dark:bg-slate-700">PNG</button>
                    <button id="statement-pdf-btn" class="px-3 py-1.5 text-sm rounded-md bg-slate-200 dark:bg-slate-700">PDF</button>
                </div>
            </div>
            <div class="overflow-y-auto" id="statement-content-wrapper">
                <div class="p-4 sm:p-6" id="statement-content">Loading...</div>
            </div>
            <div id="statement-pagination-controls" class="p-4 flex justify-center items-center gap-2 border-t"></div>
        </div>
    `;
}

function loadStatementData() {
    const urlParams = new URLSearchParams(window.location.search);
    const contactId = urlParams.get('contactId');
    
    if (contactId) {
        const contact = contactsState.find(c => c.id === contactId);
        if (contact) {
            document.getElementById('statement-title').textContent = `Ledger: ${contact.name}`;
            const ledgerItems = generateLedgerItems(contact.name);
            currentStatementData = { type: 'contact', data: ledgerItems.reverse(), name: contact.name };
        }
    } else {
        document.getElementById('statement-title').textContent = 'Overall Statement';
        const ledgerItems = generateLedgerItems();
        currentStatementData = { type: 'overall', data: ledgerItems.reverse(), name: 'Overall' };
    }
    
    statementCurrentPage = 1;
    renderStatement();
}

function generateLedgerItems(contactName = null) {
    // ... This function is unchanged from the last version ...
    let ledgerItems = [];
    const getPayments = (history) => (history || []).reduce((sum, p) => sum + p.amount, 0);
    const contactsToProcess = contactName ? contactsState.filter(c => c.name === contactName) : contactsState;
    const transactionsToProcess = contactName ? transactionsState.filter(t => t.supplierName === contactName || t.buyerName === contactName || t.name === contactName) : transactionsState;
    contactsToProcess.forEach(c => { if (c.openingBalance?.amount > 0) ledgerItems.push({ date: '0000-01-01', description: 'Opening Balance', debit: c.openingBalance.type === 'receivable' ? c.openingBalance.amount : 0, credit: c.openingBalance.type === 'payable' ? c.openingBalance.amount : 0 }); });
    transactionsToProcess.forEach(t => { /* ... same logic as before to process transactions ... */ });
    ledgerItems.sort((a, b) => new Date(a.date) - new Date(b.date));
    let runningBalance = 0;
    ledgerItems.forEach(item => { runningBalance += (item.debit || 0) - (item.credit || 0); item.balance = runningBalance; });
    return ledgerItems;
}

function renderStatement() {
    // ... This function is also unchanged ...
}

function initializeStatementListeners() {
    document.getElementById('statement-csv-btn')?.addEventListener('click', handleExportCSV);
    document.getElementById('statement-png-btn')?.addEventListener('click', handleExportPNG);
    document.getElementById('statement-pdf-btn')?.addEventListener('click', handleExportPDF);
    document.getElementById('statement-pagination-controls')?.addEventListener('click', e => {
        const button = e.target.closest('button[data-page]');
        if (button && !button.disabled) {
            statementCurrentPage = parseInt(button.dataset.page);
            renderStatement();
        }
    });
}

// --- EXPORT FUNCTIONS ---
async function handleExportPNG() { /* ... same as before ... */ }
function handleExportCSV() { /* ... same as before ... */ }
function handleExportPDF() { /* ... same as before ... */ }

// Start the page
init();
