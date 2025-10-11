// js/components/statement.js

import { state } from '../main.js';
import { renderPage, showToast } from '../ui.js';

// --- COMPONENT STATE ---
let statementCurrentPage = 1;
const STATEMENT_ITEMS_PER_PAGE = 15;
let currentStatementData = { type: null, data: [], name: '' };

/**
 * Returns the HTML template for the statement modal.
 */
function getStatementModalTemplate() {
    return `
        <div id="statement-modal" class="hidden fixed inset-0 bg-black/50 dark:bg-black/70 z-50 flex items-center justify-center p-4">
            <div class="bg-white dark:bg-slate-900 rounded-lg shadow-lg w-full max-w-7xl h-[90vh] flex flex-col border border-slate-200 dark:border-slate-800">
                <div class="p-4 flex justify-between items-center border-b dark:border-slate-800 flex-shrink-0">
                    <h2 id="statement-title" class="text-xl font-bold text-slate-900 dark:text-white">Statement</h2>
                    <div class="flex items-center gap-2">
                        <button id="statement-csv-btn" class="px-3 py-1.5 text-sm rounded-md font-semibold bg-slate-200 dark:bg-slate-700">CSV</button>
                        <button id="statement-pdf-btn" class="px-3 py-1.5 text-sm rounded-md font-semibold bg-slate-200 dark:bg-slate-700">PDF</button>
                        <button data-close-modal="statement-modal" class="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 -mr-2">
                            <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clip-rule="evenodd" /></svg>
                        </button>
                    </div>
                </div>
                <div class="overflow-y-auto flex-grow" id="statement-content-wrapper">
                    <div class="p-6" id="statement-content"></div>
                </div>
                <div id="statement-pagination-controls" class="p-4 flex justify-center items-center gap-2 border-t dark:border-slate-800 flex-shrink-0"></div>
            </div>
        </div>
    `;
}

/**
 * Main logic to generate and render the overall business statement.
 */
function generateOverallStatement(page) {
    statementCurrentPage = page;
    let ledgerItems = [];

    // Add opening balances from all contacts
    state.contacts.forEach(c => {
        if (c.openingBalance?.amount > 0) {
            ledgerItems.push({
                date: '0000-01-01',
                description: `Opening Balance - ${c.name}`,
                debit: c.openingBalance.type === 'receivable' ? c.openingBalance.amount : 0,
                credit: c.openingBalance.type === 'payable' ? c.openingBalance.amount : 0,
            });
        }
    });

    // Process all transactions
    state.transactions.forEach(t => {
        if (t.type === 'trade') {
            ledgerItems.push({
                date: t.date,
                description: `Trade: ${t.item} (${t.supplierName} → ${t.buyerName})`,
                debit: t.buyerTotal || 0,
                credit: t.supplierTotal || 0
            });
            (t.paymentsFromBuyer || []).forEach(p => ledgerItems.push({ date: p.date, description: `Payment Received (${t.buyerName})`, debit: 0, credit: p.amount }));
            (t.paymentsToSupplier || []).forEach(p => ledgerItems.push({ date: p.date, description: `Payment Made (${t.supplierName})`, debit: p.amount, credit: 0 }));
        } else if (t.type === 'payment') {
            ledgerItems.push({
                date: t.date,
                description: `Direct Payment: ${t.description} (${t.name})`,
                debit: t.paymentType === 'made' ? t.amount : 0,
                credit: t.paymentType === 'received' ? t.amount : 0
            });
        }
    });

    // Sort all items by date
    ledgerItems.sort((a, b) => new Date(a.date) - new Date(b.date));

    // Calculate running balance
    let runningBalance = 0;
    ledgerItems.forEach(item => {
        runningBalance += (item.debit || 0) - (item.credit || 0);
        item.balance = runningBalance;
    });

    // Reverse for newest-first display and store for export
    currentStatementData = { type: 'overall', data: [...ledgerItems].reverse(), name: 'Overall' };

    // Paginate and render the HTML
    // This is a placeholder for the full rendering logic. You would build the table here.
    const statementContent = document.getElementById('statement-content');
    statementContent.innerHTML = `<p class="text-slate-500">Overall statement table will be rendered here. Found ${ledgerItems.length} items.</p>`;

    // You would copy your full statement rendering logic here.
}


/**
 * Initializes and shows the statement modal for the overall business view.
 * This is the EXPORTED function that main.js is looking for.
 */
export function showPaginatedStatement(page = 1) {
    // Inject the modal HTML if it's not already there
    if (!document.getElementById('statement-modal')) {
        document.getElementById('modals-and-helpers').insertAdjacentHTML('beforeend', getStatementModalTemplate());
        // Add event listeners for the newly created modal
        document.querySelector('[data-close-modal="statement-modal"]').addEventListener('click', () => {
             document.getElementById('statement-modal').classList.add('hidden');
        });
    }

    generateOverallStatement(page);
    document.getElementById('statement-modal').classList.remove('hidden');
}

/**
 * EXPORTED function to show an individual contact's ledger.
 * (Placeholder - you will build this out)
 */
export function showContactLedger(contactId) {
    if (!document.getElementById('statement-modal')) {
         document.getElementById('modals-and-helpers').insertAdjacentHTML('beforeend', getStatementModalTemplate());
    }
    const contact = state.contacts.find(c => c.id === contactId);
    if (!contact) return;
    
    // You would add the logic to calculate and render the ledger for ONLY this contact here.
    
    const statementContent = document.getElementById('statement-content');
    const statementTitle = document.getElementById('statement-title');
    
    statementTitle.textContent = `Ledger: ${contact.name}`;
    statementContent.innerHTML = `<p class="text-slate-500">Ledger for ${contact.name} will be rendered here.</p>`;

    document.getElementById('statement-modal').classList.remove('hidden');
}
