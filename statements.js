// --- statements.js ---
// Handles generation and export of financial statements.

import { state } from './state.js';
import { showToast } from './ui.js';

/**
 * Generates and displays the account ledger for a specific contact in a modal.
 * @param {string} id - The ID of the contact.
 */
export function showContactLedger(id) {
    const contact = state.contacts.find(c => c.id === id);
    if (!contact) return;

    let ledgerItems = [];

    // Add opening balance if it exists
    if (contact.openingBalance && contact.openingBalance.amount > 0) {
        ledgerItems.push({
            date: '0000-01-01', description: 'Opening Balance', vehicleNo: '-',
            debit: contact.openingBalance.type === 'receivable' ? contact.openingBalance.amount : 0,
            credit: contact.openingBalance.type === 'payable' ? contact.openingBalance.amount : 0,
        });
    }

    // Process all transactions related to this contact
    state.transactions.forEach(t => {
        const getPayments = (history) => (history || []).reduce((sum, p) => sum + p.amount, 0);
        if (t.type === 'trade') {
            if (t.supplierName === contact.name) {
                ledgerItems.push({ date: t.date, description: `Purchase: ${t.item}`, vehicleNo: t.vehicleNo || '-', debit: 0, credit: t.supplierTotal });
                (t.paymentsToSupplier || []).forEach(p => ledgerItems.push({ date: p.date, description: `Payment Made (${p.method})`, vehicleNo: '-', debit: p.amount, credit: 0 }));
            }
            if (t.buyerName === contact.name) {
                ledgerItems.push({ date: t.date, description: `Sale: ${t.item}`, vehicleNo: t.vehicleNo || '-', debit: t.buyerTotal, credit: 0 });
                (t.paymentsFromBuyer || []).forEach(p => ledgerItems.push({ date: p.date, description: `Payment Received (${p.method})`, vehicleNo: '-', debit: 0, credit: p.amount }));
            }
        } else if (t.type === 'payment' && t.name === contact.name) {
            ledgerItems.push({
                date: t.date, description: `Direct Payment - ${t.description}`, vehicleNo: '-',
                debit: t.paymentType === 'made' ? t.amount : 0,
                credit: t.paymentType === 'received' ? t.amount : 0,
            });
        }
    });
    
    // Sort items chronologically and calculate running balance
    ledgerItems.sort((a, b) => new Date(a.date) - new Date(b.date));
    state.currentStatementData = { type: 'contact', data: ledgerItems, name: contact.name };

    let runningBalance = 0;
    const ledgerRows = ledgerItems.map(item => {
        runningBalance += (item.debit || 0) - (item.credit || 0);
        const bal = runningBalance > 0.01 ? `৳${runningBalance.toFixed(2)} Dr` : runningBalance < -0.01 ? `৳${Math.abs(runningBalance).toFixed(2)} Cr` : '৳0.00';
        return `<tr class="border-b dark:border-slate-700 text-sm">
            <td class="p-2 whitespace-nowrap">${item.date === '0000-01-01' ? 'Initial' : item.date}</td>
            <td class="p-2">${item.description}</td>
            <td class="p-2">${item.vehicleNo}</td>
            <td class="p-2 text-right text-green-600 dark:text-green-500">${item.debit > 0 ? `৳${item.debit.toFixed(2)}` : ''}</td>
            <td class="p-2 text-right text-rose-500">${item.credit > 0 ? `৳${item.credit.toFixed(2)}` : ''}</td>
            <td class="p-2 text-right font-semibold">${bal}</td>
        </tr>`;
    }).join('');
    
    const finalBalance = runningBalance;
    const balanceStatus = finalBalance > 0.01 ? "Receivable" : (finalBalance < -0.01 ? "Payable" : "Settled");
    const balanceClass = finalBalance > 0.01 ? 'text-green-500' : (finalBalance < -0.01 ? 'text-rose-500' : 'text-slate-500');

    const html = `<div id="statement-to-export" class="bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200">
        <div class="text-center mb-6 border-b dark:border-slate-700 pb-4">
            <h2 class="text-3xl font-bold">Account Ledger</h2>
            <p class="text-lg">${contact.name}</p>
        </div>
        <div class="overflow-x-auto">
            <table class="min-w-full text-xs sm:text-sm mb-6">
                <thead class="bg-slate-100 dark:bg-slate-800"><tr>
                    <th class="text-left p-2">Date</th><th class="text-left p-2">Particulars</th><th class="text-left p-2">Vehicle</th>
                    <th class="text-right p-2">Debit (+)</th><th class="text-right p-2">Credit (-)</th><th class="text-right p-2">Balance</th>
                </tr></thead>
                <tbody>${ledgerRows}</tbody>
            </table>
        </div>
        <div class="flex justify-end"><div class="w-full md:w-1/2 text-right">
            <div class="flex justify-between font-bold text-lg border-t dark:border-slate-700 pt-2 mt-2">
                <span>Final Balance (${balanceStatus}):</span><span class="${balanceClass}">৳${Math.abs(finalBalance).toFixed(2)}</span>
            </div>
        </div></div>
    </div>`;

    document.getElementById('statement-title').textContent = `Ledger: ${contact.name}`;
    document.getElementById('statement-content').innerHTML = html;
    document.getElementById('statement-pagination-controls').innerHTML = '';
    document.getElementById('statement-modal').classList.remove('hidden');
}

/**
 * Kicks off the generation of the paginated overall statement.
 * @param {number} [page=1] - The page number to display.
 */
export function showPaginatedStatement(page = 1) {
    state.statementCurrentPage = page;
    generateOverallStatement(state.statementCurrentPage, state.statementItemsPerPage);
    document.getElementById('statement-modal').classList.remove('hidden');
}

/**
 * Generates the data and HTML for the overall business statement.
 * @param {number} page - The current page.
 * @param {number} itemsPerPage - The number of items per page.
 */
function generateOverallStatement(page, itemsPerPage) {
    let ledgerItems = [];

    state.contacts.forEach(c => {
        if (c.openingBalance && c.openingBalance.amount > 0) {
            ledgerItems.push({
                date: '0000-01-01',
                supplierName: `Opening Balance - ${c.name}`,
                debit: c.openingBalance.type === 'receivable' ? c.openingBalance.amount : 0,
                credit: c.openingBalance.type === 'payable' ? c.openingBalance.amount : 0,
            });
        }
    });

    state.transactions.forEach(t => {
        if (t.type === 'trade') {
            const initialDebit = (t.paymentsFromBuyer?.[0]?.date === t.date) ? t.paymentsFromBuyer[0].amount : 0;
            const initialCredit = (t.paymentsToSupplier?.[0]?.date === t.date) ? t.paymentsToSupplier[0].amount : 0;
            ledgerItems.push({ ...t, debit: initialDebit, credit: initialCredit });
            (t.paymentsFromBuyer || []).slice(initialDebit ? 1 : 0).forEach(p => ledgerItems.push({ date: p.date, supplierName: `(Payment from ${t.buyerName})`, debit: p.amount, credit: 0 }));
            (t.paymentsToSupplier || []).slice(initialCredit ? 1 : 0).forEach(p => ledgerItems.push({ date: p.date, supplierName: `(Payment to ${t.supplierName})`, debit: 0, credit: p.amount }));
        } else if (t.type === 'payment') {
            ledgerItems.push({
                date: t.date, supplierName: `(${t.description}) - ${t.name}`,
                debit: t.paymentType === 'received' ? t.amount : 0,
                credit: t.paymentType === 'made' ? t.amount : 0,
            });
        }
    });

    ledgerItems.sort((a, b) => new Date(a.date) - new Date(b.date));
    let runningBalance = 0;
    ledgerItems.forEach(item => {
        runningBalance += (item.debit || 0) - (item.credit || 0);
        item.balance = runningBalance;
    });
    
    ledgerItems.reverse(); // Newest first for display
    state.currentStatementData = { type: 'overall', data: ledgerItems, name: 'Overall' };

    const totalItems = ledgerItems.length;
    const totalPages = Math.ceil(totalItems / itemsPerPage);
    const pageItems = ledgerItems.slice((page - 1) * itemsPerPage, page * itemsPerPage);

    const rows = pageItems.map(item => { /* ... (paste the rows mapping logic from your single file here) ... */ }).join('');

    const html = `<div id="statement-to-export" class="bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200">
        <div class="text-center mb-6 border-b dark:border-slate-700 pb-4">
            <h2 class="text-3xl font-bold">Statement</h2><p class="text-lg">Full Transaction History</p>
        </div>
        <div class="overflow-x-auto"><table class="min-w-full text-xs sm:text-sm mb-6">
            <thead class="bg-slate-100 dark:bg-slate-800">
                </thead>
            <tbody>${rows}</tbody>
        </table></div>
    </div>`;
    
    document.getElementById('statement-title').textContent = 'Statement';
    document.getElementById('statement-content').innerHTML = html;

    const controlsContainer = document.getElementById('statement-pagination-controls');
    if (totalPages > 1) {
        // ... (paste the pagination controls logic from your single file here)
    } else {
        controlsContainer.innerHTML = '';
    }
}

/**
 * Handles exporting the current statement view to PNG or PDF.
 * @param {string} format - The desired format ('png' or 'pdf').
 */
export async function handleContentExport(format) {
    const { type, data, name } = state.currentStatementData;
    if (!data || data.length === 0) { showToast('No data to export.'); return; }
    const filename = `Statement-${name}-${new Date().toISOString().slice(0, 10)}`;

    if (format === 'png') {
        // ... (paste the 'png' export logic from your single file here)
    } else if (format === 'pdf') {
        // ... (paste the 'pdf' export logic, including the final balance row fix)
    }
}

/**
 * Handles exporting the current statement view to CSV.
 */
export function handleContentExportCSV() {
    // ... (paste the handleContentExportCSV logic from your single file here)
}
