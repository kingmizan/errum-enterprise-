// js/statement.js

import { checkAuth, renderHeaderAndNav, updateUserEmail } from './shared.js';
import { listenToContacts, listenToTransactions } from './api.js';
import { showToast } from './ui.js';

// --- Page State ---
let localContacts = null;
let localTransactions = null;
let statementCurrentPage = 1;
const STATEMENT_ITEMS_PER_PAGE = 25;
let currentStatementData = { type: null, data: [], name: '' };

async function init() {
    const user = await checkAuth();
    if (!user) return;

    renderHeaderAndNav('statement');
    updateUserEmail(user.email);
    document.getElementById('app-content').innerHTML = getStatementPageTemplate();
    
    initializeStatementListeners();

    listenToContacts(user.uid, (contacts) => {
        localContacts = contacts || [];
        loadAndRenderData();
    });

    listenToTransactions(user.uid, (transactions) => {
        localTransactions = transactions || [];
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

function loadAndRenderData() {
    if (localContacts === null || localTransactions === null) return;
    const urlParams = new URLSearchParams(window.location.search);
    const contactId = urlParams.get('contactId');
    const titleEl = document.getElementById('statement-title');
    if (contactId) {
        const contact = localContacts.find(c => c.id === contactId);
        if (contact) {
            titleEl.textContent = `Ledger: ${contact.name}`;
            currentStatementData = { type: 'contact', data: generateLedgerItems(contact.name), name: contact.name };
        }
    } else {
        titleEl.textContent = 'Overall Statement';
        currentStatementData = { type: 'overall', data: generateLedgerItems(), name: 'Overall' };
    }
    statementCurrentPage = 1;
    renderStatementTable();
}

function generateLedgerItems(contactName = null) {
    let ledgerItems = [];
    const getPayments = (history) => (history || []).reduce((sum, p) => sum + p.amount, 0);
    const contacts = contactName ? localContacts.filter(c => c.name === contactName) : localContacts;
    const transactions = contactName ? localTransactions.filter(t => t.supplierName === contactName || t.buyerName === contactName || t.name === contactName) : localTransactions;
    contacts.forEach(c => { if (c.openingBalance?.amount > 0) ledgerItems.push({ date: '0000-01-01', description: 'Opening Balance', debit: c.openingBalance.type === 'receivable' ? c.openingBalance.amount : 0, credit: c.openingBalance.type === 'payable' ? c.openingBalance.amount : 0 }); });
    transactions.forEach(t => { 
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
    const contentEl = document.getElementById('statement-content');
    const paginationEl = document.getElementById('statement-pagination-controls');
    const data = [...currentStatementData.data].reverse(); 
    if (data.length === 0) {
        contentEl.innerHTML = `<p class="p-8 text-center text-slate-500">No statement data found.</p>`;
        paginationEl.innerHTML = '';
        return;
    }
    const totalPages = Math.ceil(data.length / STATEMENT_ITEMS_PER_PAGE);
    const pageItems = data.slice((statementCurrentPage - 1) * STATEMENT_ITEMS_PER_PAGE, statementCurrentPage * STATEMENT_ITEMS_PER_PAGE);
    const rowsHtml = pageItems.map(item => {
        const debitText = item.debit ? `৳${item.debit.toFixed(2)}` : '';
        const creditText = item.credit ? `৳${item.credit.toFixed(2)}` : '';
        const balanceText = `৳${item.balance.toFixed(2)}`;
        const balanceClass = item.balance < -0.01 ? 'text-rose-500' : 'text-slate-700 dark:text-slate-300';
        return `<tr class="border-b dark:border-slate-700 text-sm"><td class="p-2 whitespace-nowrap">${item.date === '0000-01-01' ? 'Initial' : item.date}</td><td class="p-2">${item.description}</td><td class="p-2 text-right text-green-600">${debitText}</td><td class="p-2 text-right text-rose-500">${creditText}</td><td class="p-2 text-right font-semibold ${balanceClass}">${balanceText}</td></tr>`;
    }).join('');
    const finalBalance = currentStatementData.data.length > 0 ? currentStatementData.data[currentStatementData.data.length - 1].balance : 0;
    const finalBalanceClass = finalBalance < -0.01 ? 'text-rose-500' : 'text-green-600';
    const balanceStatus = finalBalance < -0.01 ? 'Payable' : 'Receivable';
    contentEl.innerHTML = `<div id="statement-to-export" class="p-4 sm:p-6"><div class="overflow-x-auto"><table class="min-w-full text-xs sm:text-sm"><thead><tr class="bg-slate-100 dark:bg-slate-800"><th class="text-left p-2 font-semibold">Date</th><th class="text-left p-2 font-semibold">Particulars</th><th class="text-right p-2 font-semibold">Debit</th><th class="text-right p-2 font-semibold">Credit</th><th class="text-right p-2 font-semibold">Balance</th></tr></thead><tbody>${rowsHtml}</tbody></table></div><div class="flex justify-end mt-4"><div class="w-full md:w-1/2 text-right border-t dark:border-slate-700 pt-2"><div class="flex justify-between font-bold text-lg"><span class="text-slate-600 dark:text-slate-300">Final Balance (${balanceStatus}):</span><span class="${finalBalanceClass}">৳${Math.abs(finalBalance).toFixed(2)}</span></div></div></div></div>`;
    if (totalPages > 1) {
        paginationEl.innerHTML = `<button data-page="${statementCurrentPage - 1}" class="px-3 py-1 text-sm rounded-md bg-slate-200 dark:bg-slate-700" ${statementCurrentPage === 1 ? 'disabled' : ''}>Prev</button><span>Page ${statementCurrentPage} of ${totalPages}</span><button data-page="${statementCurrentPage + 1}" class="px-3 py-1 text-sm rounded-md bg-slate-200 dark:bg-slate-700" ${statementCurrentPage === totalPages ? 'disabled' : ''}>Next</button>`;
    } else { paginationEl.innerHTML = ''; }
}

function initializeStatementListeners() {
    document.getElementById('statement-csv-btn')?.addEventListener('click', handleExportCSV);
    document.getElementById('statement-png-btn')?.addEventListener('click', handleExportPNG);
    document.getElementById('statement-pdf-btn')?.addEventListener('click', handleExportPDF);
    document.getElementById('statement-pagination-controls')?.addEventListener('click', e => {
        const button = e.target.closest('button[data-page]');
        if (button && !button.disabled) {
            statementCurrentPage = parseInt(button.dataset.page);
            renderStatementTable();
        }
    });
}

// --- FULLY WORKING EXPORT FUNCTIONS ---
async function handleExportPNG() { /* ... unchanged ... */ }
function handleExportCSV() { /* ... unchanged ... */ }

function handleExportPDF() {
    if (!currentStatementData.data.length || !window.jspdf) return showToast('PDF library (jsPDF) not found.');
    showToast('Generating PDF...');
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    
    doc.setFontSize(18);
    doc.text("Errum Enterprise", 14, 22);
    doc.setFontSize(11);
    doc.text(`Ledger For: ${currentStatementData.name}`, 14, 30);
    
    const head = [["Date", "Particulars", "Debit", "Credit", "Balance"]];
    
    // ✨ FIX 1: Remove the '৳' symbol, which causes font errors. Use plain numbers.
    const body = currentStatementData.data.map(item => [
        item.date === '0000-01-01' ? 'Initial' : item.date,
        item.description,
        item.debit ? item.debit.toFixed(2) : '',
        item.credit ? item.credit.toFixed(2) : '',
        item.balance.toFixed(2)
    ]);

    // ✨ FIX 2: Calculate the final balance and create a footer row.
    const finalBalance = currentStatementData.data.length > 0 ? currentStatementData.data[currentStatementData.data.length - 1].balance : 0;
    const balanceStatus = finalBalance < -0.01 ? 'Payable' : 'Receivable';
    const foot = [[
        { content: `Final Balance (${balanceStatus}):`, colSpan: 4, styles: { halign: 'right', fontStyle: 'bold' } },
        { content: Math.abs(finalBalance).toFixed(2), styles: { halign: 'right', fontStyle: 'bold' } }
    ]];

    doc.autoTable({
        startY: 35,
        head: head,
        body: body,
        foot: foot, // Add the footer here
        theme: 'striped',
        headStyles: { fillColor: [13, 148, 136] }, // Teal color
        footStyles: { fillColor: [230, 230, 230], textColor: 0 }
    });

    doc.save(`Statement-${currentStatementData.name}-${new Date().toISOString().slice(0, 10)}.pdf`);
}

init();
