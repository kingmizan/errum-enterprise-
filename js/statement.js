// js/statement.js

import { checkAuth, renderHeaderAndNav, updateUserEmail } from './shared.js';
import { listenToContacts, listenToTransactions } from './api.js';
import { showToast } from './ui.js';

// --- Page State ---
// ✨ FIX: Initialize as null to properly track if data has been fetched at least once.
let localContacts = null;
let localTransactions = null;

let statementCurrentPage = 1;
const STATEMENT_ITEMS_PER_PAGE = 25;
let currentStatementData = { type: null, data: [], name: '' };

/**
 * Main entry point for the statement page.
 */
async function init() {
    const user = await checkAuth();
    if (!user) return; // Guard clause stops the script if not logged in

    renderHeaderAndNav('statement');
    updateUserEmail(user.email);
    document.getElementById('app-content').innerHTML = getStatementPageTemplate();
    
    initializeStatementListeners();

    // Fetch data. Each listener will independently try to render the page.
    listenToContacts(user.uid, (contacts) => {
        localContacts = contacts || []; // Ensure it's an array, even if empty
        loadAndRenderData();
    });

    listenToTransactions(user.uid, (transactions) => {
        localTransactions = transactions || []; // Ensure it's an array, even if empty
        loadAndRenderData();
    });
}

function getStatementPageTemplate() {
    return `
        <div class="bg-white dark:bg-slate-900 rounded-lg shadow-sm border border-slate-200 dark:border-slate-800">
            <div class="p-4 border-b dark:border-slate-800 flex flex-wrap gap-4 justify-between items-center">
                <h2 id="statement-title" class="text-xl font-bold">Statement</h2>
                <div class="flex items-center gap-2">
                    <button id="statement-csv-btn" class="px-3 py-1.5 text-sm rounded-md bg-slate-200 dark:bg-slate-700">CSV</button>
                    <button id="statement-png-btn" class="px-3 py-1.5 text-sm rounded-md bg-slate-200 dark:bg-slate-700">PNG</button>
                    <button id="statement-pdf-btn" class="px-3 py-1.5 text-sm rounded-md bg-slate-200 dark:bg-slate-700">PDF</button>
                </div>
            </div>
            <div id="statement-content-wrapper">
                <div id="statement-content"><p class="p-8 text-center text-slate-500">Loading statement data...</p></div>
            </div>
            <div id="statement-pagination-controls" class="p-4 flex justify-center items-center gap-2 border-t dark:border-slate-700"></div>
        </div>
    `;
}

/**
 * Determines which statement to load, generates the data, and renders it.
 */
function loadAndRenderData() {
    // ✨ FIX: This guard clause now correctly waits for both initial fetches to complete.
    // It will not get stuck if one of the datasets is an empty array.
    if (localContacts === null || localTransactions === null) {
        return; // Don't render until both listeners have fired at least once.
    }

    const urlParams = new URLSearchParams(window.location.search);
    const contactId = urlParams.get('contactId');
    const titleEl = document.getElementById('statement-title');

    if (contactId) {
        const contact = localContacts.find(c => c.id === contactId);
        if (contact) {
            titleEl.textContent = `Ledger: ${contact.name}`;
            const ledgerItems = generateLedgerItems(contact.name);
            currentStatementData = { type: 'contact', data: ledgerItems.reverse(), name: contact.name };
        } else {
            titleEl.textContent = 'Error: Contact Not Found';
            currentStatementData = { data: [] };
        }
    } else {
        titleEl.textContent = 'Overall Statement';
        const ledgerItems = generateLedgerItems();
        currentStatementData = { type: 'overall', data: ledgerItems.reverse(), name: 'Overall' };
    }
    
    statementCurrentPage = 1;
    renderStatementTable();
}

function generateLedgerItems(contactName = null) {
    // ... This function is correct and remains unchanged ...
    let ledgerItems = [];
    const getPayments = (history) => (history || []).reduce((sum, p) => sum + p.amount, 0);
    const contactsToProcess = contactName ? localContacts.filter(c => c.name === contactName) : localContacts;
    const transactionsToProcess = contactName ? localTransactions.filter(t => t.supplierName === contactName || t.buyerName === contactName || t.name === contactName) : localTransactions;
    contactsToProcess.forEach(c => { if (c.openingBalance?.amount > 0) ledgerItems.push({ date: '0000-01-01', description: 'Opening Balance', debit: c.openingBalance.type === 'receivable' ? c.openingBalance.amount : 0, credit: c.openingBalance.type === 'payable' ? c.openingBalance.amount : 0 }); });
    transactionsToProcess.forEach(t => { 
        if (t.type === 'trade') {
            if (!contactName || t.supplierName === contactName) {
                if(t.supplierTotal) ledgerItems.push({ date: t.date, description: `Purchase: ${t.item}`, credit: t.supplierTotal });
                (t.paymentsToSupplier || []).forEach(p => ledgerItems.push({ date: p.date, description: `Payment Made (${p.method})`, debit: p.amount }));
            }
            if (!contactName || t.buyerName === contactName) {
                if(t.buyerTotal) ledgerItems.push({ date: t.date, description: `Sale: ${t.item}`, debit: t.buyerTotal });
                (t.paymentsFromBuyer || []).forEach(p => ledgerItems.push({ date: p.date, description: `Payment Received (${p.method})`, credit: p.amount }));
            }
        } else if (t.type === 'payment') {
            ledgerItems.push({ date: t.date, description: `Direct Payment: ${t.description}`, debit: t.paymentType === 'made' ? t.amount : 0, credit: t.paymentType === 'received' ? t.amount : 0 });
        }
    });
    ledgerItems.sort((a, b) => new Date(a.date) - new Date(b.date));
    let runningBalance = 0;
    ledgerItems.forEach(item => { runningBalance += (item.debit || 0) - (item.credit || 0); item.balance = runningBalance; });
    return ledgerItems;
}

function renderStatementTable() {
    // ... This function is correct and remains unchanged ...
}

function initializeStatementListeners() {
    // ... This function is correct and remains unchanged ...
}

// --- EXPORT FUNCTIONS ---
async function handleExportPNG() { /* ... same as before ... */ }
function handleExportCSV() { /* ... same as before ... */ }
function handleExportPDF() { /* ... same as before ... */ }

// Start the page logic
init();
