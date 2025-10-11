// js/components/statement.js

import { state } from '../main.js';
import { showToast } from '../ui.js';

let statementCurrentPage = 1;
const STATEMENT_ITEMS_PER_PAGE = 20;
let currentStatementData = { type: null, data: [], name: '' };

function generateLedgerItems(contactName = null) {
    let ledgerItems = [];
    const getPayments = (history) => (history || []).reduce((sum, p) => sum + p.amount, 0);

    const contactsToProcess = contactName ? state.contacts.filter(c => c.name === contactName) : state.contacts;
    const transactionsToProcess = contactName ? state.transactions.filter(t => t.supplierName === contactName || t.buyerName === contactName || t.name === contactName) : state.transactions;

    contactsToProcess.forEach(c => {
        if (c.openingBalance?.amount > 0) {
            ledgerItems.push({
                date: '0000-01-01',
                description: `Opening Balance`,
                debit: c.openingBalance.type === 'receivable' ? c.openingBalance.amount : 0,
                credit: c.openingBalance.type === 'payable' ? c.openingBalance.amount : 0,
            });
        }
    });

    transactionsToProcess.forEach(t => {
        if (t.type === 'trade') {
            if (!contactName || t.supplierName === contactName) {
                if (t.supplierTotal) ledgerItems.push({ date: t.date, description: `Purchase: ${t.item}`, credit: t.supplierTotal });
                (t.paymentsToSupplier || []).forEach(p => ledgerItems.push({ date: p.date, description: `Payment Made (${p.method})`, debit: p.amount }));
            }
            if (!contactName || t.buyerName === contactName) {
                if (t.buyerTotal) ledgerItems.push({ date: t.date, description: `Sale: ${t.item}`, debit: t.buyerTotal });
                (t.paymentsFromBuyer || []).forEach(p => ledgerItems.push({ date: p.date, description: `Payment Received (${p.method})`, credit: p.amount }));
            }
        } else if (t.type === 'payment') {
            ledgerItems.push({
                date: t.date,
                description: `Direct Payment: ${t.description}`,
                debit: t.paymentType === 'made' ? t.amount : 0,
                credit: t.paymentType === 'received' ? t.amount : 0
            });
        }
    });

    ledgerItems.sort((a, b) => new Date(a.date) - new Date(b.date));

    let runningBalance = 0;
    ledgerItems.forEach(item => {
        runningBalance += (item.debit || 0) - (item.credit || 0);
        item.balance = runningBalance;
    });

    return ledgerItems;
}

function renderStatement() {
    const contentEl = document.getElementById('statement-content');
    const paginationEl = document.getElementById('statement-pagination-controls');
    if (!contentEl || !paginationEl) return;

    const data = currentStatementData.data;
    const totalItems = data.length;
    if (totalItems === 0) {
        contentEl.innerHTML = `<p class="text-slate-500 text-center py-10">No statement data found.</p>`;
        paginationEl.innerHTML = '';
        return;
    }

    const totalPages = Math.ceil(totalItems / STATEMENT_ITEMS_PER_PAGE);
    const startIndex = (statementCurrentPage - 1) * STATEMENT_ITEMS_PER_PAGE;
    const pageItems = data.slice(startIndex, startIndex + STATEMENT_ITEMS_PER_PAGE);

    const rowsHtml = pageItems.map(item => {
        const debitText = item.debit ? `৳${item.debit.toFixed(2)}` : '';
        const creditText = item.credit ? `৳${item.credit.toFixed(2)}` : '';
        const balanceText = `৳${item.balance.toFixed(2)}`;
        const balanceClass = item.balance < -0.01 ? 'text-rose-500' : 'text-slate-700 dark:text-slate-300';
        return `<tr class="border-b dark:border-slate-700 text-sm"><td class="p-2">${item.date === '0000-01-01' ? 'Initial' : item.date}</td><td class="p-2">${item.description}</td><td class="p-2 text-right text-green-600">${debitText}</td><td class="p-2 text-right text-rose-500">${creditText}</td><td class="p-2 text-right font-semibold ${balanceClass}">${balanceText}</td></tr>`;
    }).join('');

    contentEl.innerHTML = `<div id="statement-to-export"><table class="min-w-full text-xs sm:text-sm"><thead><tr class="bg-slate-100 dark:bg-slate-800"><th class="text-left p-2 font-semibold">Date</th><th class="text-left p-2 font-semibold">Particulars</th><th class="text-right p-2 font-semibold">Debit</th><th class="text-right p-2 font-semibold">Credit</th><th class="text-right p-2 font-semibold">Balance</th></tr></thead><tbody>${rowsHtml}</tbody></table></div>`;

    if (totalPages > 1) {
        paginationEl.innerHTML = `<button data-page="${statementCurrentPage-1}" class="px-3 py-1 rounded-md bg-slate-200 dark:bg-slate-700" ${statementCurrentPage===1?'disabled':''}>Prev</button><span>Page ${statementCurrentPage} of ${totalPages}</span><button data-page="${statementCurrentPage+1}" class="px-3 py-1 rounded-md bg-slate-200 dark:bg-slate-700" ${statementCurrentPage===totalPages?'disabled':''}>Next</button>`;
    } else {
        paginationEl.innerHTML = '';
    }
}

export function showPaginatedStatement() {
    const modal = document.getElementById('statement-modal');
    if (!modal) return;
    
    document.getElementById('statement-title').textContent = 'Overall Statement';
    const ledgerItems = generateLedgerItems();
    currentStatementData = { type: 'overall', data: ledgerItems.reverse(), name: 'Overall' };
    statementCurrentPage = 1;
    renderStatement();
    modal.classList.remove('hidden');
}

// ✨ THIS IS THE MISSING EXPORTED FUNCTION ✨
export function showContactLedger(contactId) {
    const modal = document.getElementById('statement-modal');
    if (!modal) return;
    
    const contact = state.contacts.find(c => c.id === contactId);
    if (!contact) return showToast('Contact not found.');

    document.getElementById('statement-title').textContent = `Ledger: ${contact.name}`;
    const ledgerItems = generateLedgerItems(contact.name);
    currentStatementData = { type: 'contact', data: ledgerItems.reverse(), name: contact.name };
    statementCurrentPage = 1;
    renderStatement();
    modal.classList.remove('hidden');
}

// (The rest of the file: export functions and event listeners remain the same)
