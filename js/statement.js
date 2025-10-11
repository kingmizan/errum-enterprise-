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

    // A special navigation link is not active for the statement page
    renderHeaderAndNav('statement');
    updateUserEmail(user.email);

    document.getElementById('app-content').innerHTML = getStatementPageTemplate();
    
    // We need both contacts (for opening balances) and transactions
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
        <div class="bg-white dark:bg-slate-900 rounded-lg shadow-sm border border-slate-200 dark:border-slate-800">
            <div class="p-4 border-b dark:border-slate-800 flex flex-wrap gap-4 justify-between items-center">
                <h2 id="statement-title" class="text-xl font-bold">Statement</h2>
                <div class="flex items-center gap-2">
                    <button id="statement-csv-btn" class="px-3 py-1.5 text-sm rounded-md bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600">CSV</button>
                    <button id="statement-png-btn" class="px-3 py-1.5 text-sm rounded-md bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600">PNG</button>
                    <button id="statement-pdf-btn" class="px-3 py-1.5 text-sm rounded-md bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600">PDF</button>
                </div>
            </div>
            <div class="overflow-y-auto" id="statement-content-wrapper">
                <div id="statement-content">
                    <p class="p-8 text-center text-slate-500">Loading statement data...</p>
                </div>
            </div>
            <div id="statement-pagination-controls" class="p-4 flex justify-center items-center gap-2 border-t dark:border-slate-700"></div>
        </div>
    `;
}

function loadStatementData() {
    const urlParams = new URLSearchParams(window.location.search);
    const contactId = urlParams.get('contactId');
    
    const titleEl = document.getElementById('statement-title');
    if (!titleEl) return;

    if (contactId) {
        const contact = contactsState.find(c => c.id === contactId);
        if (contact) {
            titleEl.textContent = `Ledger: ${contact.name}`;
            const ledgerItems = generateLedgerItems(contact.name);
            currentStatementData = { type: 'contact', data: ledgerItems.reverse(), name: contact.name };
        }
    } else {
        titleEl.textContent = 'Overall Statement';
        const ledgerItems = generateLedgerItems();
        currentStatementData = { type: 'overall', data: ledgerItems.reverse(), name: 'Overall' };
    }
    
    statementCurrentPage = 1;
    renderStatement();
}

function generateLedgerItems(contactName = null) {
    let ledgerItems = [];
    const getPayments = (history) => (history || []).reduce((sum, p) => sum + p.amount, 0);
    const contactsToProcess = contactName ? contactsState.filter(c => c.name === contactName) : contactsState;
    const transactionsToProcess = contactName ? transactionsState.filter(t => t.supplierName === contactName || t.buyerName === contactName || t.name === contactName) : transactionsState;
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

function renderStatement() {
    const contentEl = document.getElementById('statement-content');
    const paginationEl = document.getElementById('statement-pagination-controls');
    if (!contentEl || !paginationEl) return;
    const data = currentStatementData.data;
    const totalItems = data.length;
    if (totalItems === 0) {
        contentEl.innerHTML = `<p class="p-8 text-center text-slate-500">No statement data found.</p>`;
        paginationEl.innerHTML = '';
        return;
    }
    const totalPages = Math.ceil(totalItems / STATEMENT_ITEMS_PER_PAGE);
    const startIndex = (statementCurrentPage - 1) * STATEMENT_ITEMS_PER_PAGE;
    const pageItems = data.slice(startIndex, endIndex);
    const rowsHtml = pageItems.map(item => {
        const debitText = item.debit ? `৳${item.debit.toFixed(2)}` : '';
        const creditText = item.credit ? `৳${item.credit.toFixed(2)}` : '';
        const balanceText = `৳${item.balance.toFixed(2)}`;
        const balanceClass = item.balance < -0.01 ? 'text-rose-500' : 'text-slate-700 dark:text-slate-300';
        return `<tr class="border-b dark:border-slate-700 text-sm"><td class="p-2 whitespace-nowrap">${item.date === '0000-01-01' ? 'Initial' : item.date}</td><td class="p-2">${item.description}</td><td class="p-2 text-right text-green-600 dark:text-green-500">${debitText}</td><td class="p-2 text-right text-rose-500">${creditText}</td><td class="p-2 text-right font-semibold ${balanceClass}">${balanceText}</td></tr>`;
    }).join('');
    contentEl.innerHTML = `<div id="statement-to-export" class="p-4 sm:p-6 bg-white dark:bg-slate-900"><div class="overflow-x-auto"><table class="min-w-full text-xs sm:text-sm"><thead><tr class="bg-slate-100 dark:bg-slate-800"><th class="text-left p-2 font-semibold">Date</th><th class="text-left p-2 font-semibold">Particulars</th><th class="text-right p-2 font-semibold">Debit</th><th class="text-right p-2 font-semibold">Credit</th><th class="text-right p-2 font-semibold">Balance</th></tr></thead><tbody>${rowsHtml}</tbody></table></div></div>`;
    if (totalPages > 1) {
        paginationEl.innerHTML = `<button data-page="${statementCurrentPage - 1}" class="px-3 py-1 text-sm rounded-md bg-slate-200 dark:bg-slate-700 disabled:opacity-50" ${statementCurrentPage === 1 ? 'disabled' : ''}>Previous</button><span class="text-sm font-semibold">Page ${statementCurrentPage} of ${totalPages}</span><button data-page="${statementCurrentPage + 1}" class="px-3 py-1 text-sm rounded-md bg-slate-200 dark:bg-slate-700 disabled:opacity-50" ${statementCurrentPage === totalPages ? 'disabled' : ''}>Next</button>`;
    } else {
        paginationEl.innerHTML = '';
    }
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

init();
