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
    let ledgerItems = [];
    const getPayments = (history) => (history || []).reduce((sum, p) => sum + p.amount, 0);
    const contactsToProcess = contactName ? contactsState.filter(c => c.name === contactName) : contactsState;
    const transactionsToProcess = contactName ? transactionsState.filter(t => t.supplierName === contactName || t.buyerName === contactName || t.name === contactName) : transactionsState;
    contactsToProcess.forEach(c => { if (c.openingBalance?.amount > 0) ledgerItems.push({ date: '0000-01-01', description: 'Opening Balance', debit: c.openingBalance.type === 'receivable' ? c.openingBalance.amount : 0, credit: c.openingBalance.type === 'payable' ? c.openingBalance.amount : 0 }); });
    transactionsToProcess.forEach(t => { 
        if (t.type === 'trade') {
            if (!contactName || t.supplierName === contactName) {
                ledgerItems.push({ date: t.date, description: `Purchase: ${t.item}`, credit: t.supplierTotal });
                (t.paymentsToSupplier || []).forEach(p => ledgerItems.push({ date: p.date, description: `Payment Made (${p.method})`, debit: p.amount }));
            }
            if (!contactName || t.buyerName === contactName) {
                ledgerItems.push({ date: t.date, description: `Sale: ${t.item}`, debit: t.buyerTotal });
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
    const totalPages = Math.ceil(totalItems / STATEMENT_ITEMS_PER_PAGE);

    const startIndex = (statementCurrentPage - 1) * STATEMENT_ITEMS_PER_PAGE;
    const endIndex = startIndex + STATEMENT_ITEMS_PER_PAGE;
    const pageItems = data.slice(startIndex, endIndex);

    if (totalItems === 0) {
        contentEl.innerHTML = `<p class="text-slate-500 text-center py-10">No statement data found.</p>`;
        paginationEl.innerHTML = '';
        return;
    }

    const rowsHtml = pageItems.map(item => {
        const debitText = item.debit ? `৳${item.debit.toFixed(2)}` : '';
        const creditText = item.credit ? `৳${item.credit.toFixed(2)}` : '';
        const balanceText = `৳${item.balance.toFixed(2)}`;
        const balanceClass = item.balance < -0.01 ? 'text-rose-500' : 'text-slate-700 dark:text-slate-300';
        return `<tr class="border-b dark:border-slate-700 text-sm"><td class="p-2 whitespace-nowrap">${item.date === '0000-01-01' ? 'Initial' : item.date}</td><td class="p-2">${item.description}</td><td class="p-2 text-right text-green-600 dark:text-green-500">${debitText}</td><td class="p-2 text-right text-rose-500">${creditText}</td><td class="p-2 text-right font-semibold ${balanceClass}">${balanceText}</td></tr>`;
    }).join('');

    contentEl.innerHTML = `<div id="statement-to-export" class="bg-white dark:bg-slate-900"><div class="overflow-x-auto"><table class="min-w-full text-xs sm:text-sm"><thead class="bg-slate-100 dark:bg-slate-800"><tr><th class="text-left p-2 font-semibold">Date</th><th class="text-left p-2 font-semibold">Particulars</th><th class="text-right p-2 font-semibold">Debit (In/Paid)</th><th class="text-right p-2 font-semibold">Credit (Out/Received)</th><th class="text-right p-2 font-semibold">Balance</th></tr></thead><tbody>${rowsHtml}</tbody></table></div></div>`;

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
async function handleExportPNG() { 
    const content = document.getElementById('statement-to-export');
    if (!content || !window.html2canvas) return showToast('Export library not found.');
    showToast('Generating PNG...');
    try {
        const isDark = document.documentElement.classList.contains('dark');
        const canvas = await html2canvas(content, { scale: 2, backgroundColor: isDark ? '#020617' : '#ffffff' });
        const link = document.createElement('a');
        link.download = `Statement-${currentStatementData.name}-${new Date().toISOString().slice(0, 10)}.png`;
        link.href = canvas.toDataURL();
        link.click();
    } catch (e) {
        showToast('Error generating PNG.');
        console.error("PNG Export Error:", e);
    }
}
function handleExportCSV() { 
    if (!currentStatementData.data.length) return showToast('No data to export.');
    showToast('Generating CSV...');
    const headers = ["Date", "Particulars", "Debit", "Credit", "Balance"];
    const data = [...currentStatementData.data].reverse();
    const rows = data.map(item => [item.date === '0000-01-01' ? 'Initial Balance' : item.date, `"${item.description.replace(/"/g, '""')}"`, item.debit?.toFixed(2) || '0.00', item.credit?.toFixed(2) || '0.00', item.balance.toFixed(2)]);
    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Statement-${currentStatementData.name}-${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}
function handleExportPDF() { 
    if (!currentStatementData.data.length || !window.jspdf) return showToast('PDF library not found.');
    showToast('Generating PDF...');
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    doc.setFontSize(18);
    doc.text("Errum Enterprise", 14, 22);
    doc.setFontSize(11);
    doc.text(`Ledger For: ${currentStatementData.name}`, 14, 30);
    const head = [["Date", "Particulars", "Debit", "Credit", "Balance"]];
    const body = [...currentStatementData.data].reverse().map(item => [item.date === '0000-01-01' ? 'Initial' : item.date, item.description, item.debit ? `৳${item.debit.toFixed(2)}` : '', item.credit ? `৳${item.credit.toFixed(2)}` : '', `৳${item.balance.toFixed(2)}`]);
    doc.autoTable({ startY: 35, head: head, body: body, theme: 'striped', headStyles: { fillColor: [13, 148, 136] } });
    doc.save(`Statement-${currentStatementData.name}-${new Date().toISOString().slice(0, 10)}.pdf`);
}

// Start the page
init();
