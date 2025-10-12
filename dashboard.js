// --- dashboard.js ---
// Logic for rendering the dashboard view

import { state } from './state.js';
import { animateCountUp } from './ui.js';
import { renderAll, navigateTo } from './navigation.js';
import { handleDelete, openPaymentModal } from './transactions.js';
import { setupTradeFormForEdit } from './transactions.js';

// Helper to get total payments from a payment history array
const getPayments = (history) => (history || []).reduce((sum, p) => sum + p.amount, 0);

// THIS FUNCTION IS THE FIX. It now handles cases where filter inputs don't exist.
export function getFilteredTransactions() {
    const allSortedTransactions = [...state.transactions].sort((a,b) => new Date(b.date) - new Date(a.date));

    // Get filter elements safely
    const searchInput = document.getElementById('search-input');
    const startDateInput = document.getElementById('filter-start-date');
    const endDateInput = document.getElementById('filter-end-date');

    // If inputs don't exist yet, just return all transactions
    if (!searchInput || !startDateInput || !endDateInput) {
        return allSortedTransactions;
    }

    const searchTerm = searchInput.value.toLowerCase();
    const startDate = startDateInput.value;
    const endDate = endDateInput.value;

    return allSortedTransactions.filter(t =>
        (searchTerm === '' ||
        (t.item && t.item.toLowerCase().includes(searchTerm)) ||
        (t.supplierName && t.supplierName.toLowerCase().includes(searchTerm)) ||
        (t.buyerName && t.buyerName.toLowerCase().includes(searchTerm)) ||
        (t.name && t.name.toLowerCase().includes(searchTerm))) &&
        (!startDate || t.date >= startDate) &&
        (!endDate || t.date <= endDate)
    );
};

// Calculates and renders the top metrics on the dashboard
export function renderDashboardMetrics() {
    let totalPayable = 0, totalReceivable = 0;

    state.transactions.forEach(t => {
        if (t.type === 'trade') {
            totalPayable += (t.supplierTotal || 0) - getPayments(t.paymentsToSupplier);
            totalReceivable += (t.buyerTotal || 0) - getPayments(t.paymentsFromBuyer);
        } else if (t.type === 'payment') {
            if (t.paymentType === 'made') {
                totalPayable -= t.amount;
            } else {
                totalReceivable -= t.amount;
            }
        }
    });

    state.contacts.forEach(c => {
        if (c.openingBalance && c.openingBalance.amount > 0) {
            if (c.openingBalance.type === 'payable') {
                totalPayable += c.openingBalance.amount;
            } else {
                totalReceivable += c.openingBalance.amount;
            }
        }
    });

    const profit = totalReceivable - totalPayable;

    animateCountUp(document.getElementById('total-payable'), totalPayable);
    animateCountUp(document.getElementById('total-receivable'), totalReceivable);
    animateCountUp(document.getElementById('total-profit'), profit);
};

// Renders the paginated transaction history table
export function renderTransactionHistory(data) {
    const tbody = document.getElementById('transaction-history-body');
    if(!tbody) return;

    const startIndex = (state.dashboardCurrentPage - 1) * state.dashboardItemsPerPage;
    const endIndex = startIndex + state.dashboardItemsPerPage;
    const pageData = data.slice(startIndex, endIndex);

    tbody.innerHTML = '';
    if (pageData.length === 0) {
        tbody.innerHTML = `<tr><td colspan="6" class="text-center py-12 text-slate-500">No Transactions Found</td></tr>`;
        return;
    }

    pageData.forEach(t => {
        const row = document.createElement('tr');
        row.className = 'hover:bg-slate-50 border-b border-slate-200 md:border-b-0 cursor-pointer';
        row.dataset.id = t.id;

        let detailsHtml, valueHtml, payableBalHtml, receivableBalHtml, actionsHtml;

        if (t.type === 'trade') {
            const paidToSupplier = getPayments(t.paymentsToSupplier);
            const receivedFromBuyer = getPayments(t.paymentsFromBuyer);
            const payableBalance = t.supplierTotal - paidToSupplier;
            const receivableBalance = t.buyerTotal - receivedFromBuyer;
            detailsHtml = `<div class="font-medium text-slate-800">${t.item}</div><div class="text-xs text-slate-500">${t.supplierName} → ${t.buyerName}</div>`;
            valueHtml = `৳${(t.profit || 0).toFixed(2)}`;
            payableBalHtml = `<span class="font-semibold ${payableBalance > 0.01 ? 'text-rose-500' : 'text-slate-500'}">৳${payableBalance.toFixed(2)}</span>`;
            receivableBalHtml = `<span class="font-semibold ${receivableBalance > 0.01 ? 'text-green-600' : 'text-slate-500'}">৳${receivableBalance.toFixed(2)}</span>`;

            actionsHtml = `<div class="flex justify-end md:justify-center items-center gap-2">
                ${payableBalance > 0.01 ? `<button title="Pay Supplier" data-payment-id="${t.id}" data-payment-type="toSupplier" class="px-2 py-1 text-xs rounded font-semibold text-rose-700 bg-rose-100 hover:bg-rose-200">Pay</button>` : ''}
                ${receivableBalance > 0.01 ? `<button title="Receive from Buyer" data-payment-id="${t.id}" data-payment-type="fromBuyer" class="px-2 py-1 text-xs rounded font-semibold text-green-700 bg-green-100 hover:bg-green-200">Receive</button>` : ''}
                <button title="Edit" data-edit-id="${t.id}" class="p-1 text-blue-600 hover:bg-blue-100 rounded-full"><svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg></button>
                <button title="Delete" data-delete-id="${t.id}" class="p-1 text-rose-500 hover:bg-rose-100 rounded-full"><svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg></button>
            </div>`;
        } else if (t.type === 'payment') {
            detailsHtml = `<div class="font-medium text-slate-800">${t.description} (${t.paymentType})</div><div class="text-xs text-slate-500">${t.name}</div>`;
            valueHtml = `৳${(t.amount || 0).toFixed(2)}`;
            payableBalHtml = '<span class="text-slate-400">-</span>';
            receivableBalHtml = '<span class="text-slate-400">-</span>';
            actionsHtml = `<div class="flex justify-end md:justify-center items-center gap-1">
                <button title="Delete" data-delete-id="${t.id}" class="p-1 text-rose-500 hover:bg-rose-100 rounded-full"><svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg></button>
            </div>`;
        }

        row.innerHTML = `
            <td data-label="Date" class="py-4 px-4 align-top">${t.date}</td>
            <td data-label="Details" class="py-4 px-4 align-top">${detailsHtml}</td>
            <td data-label="Profit/Value" class="py-4 px-4 align-top text-right font-medium">${valueHtml}</td>
            <td data-label="Payable Bal" class="py-4 px-4 align-top text-right">${payableBalHtml}</td>
            <td data-label="Receivable Bal" class="py-4 px-4 align-top text-right">${receivableBalHtml}</td>
            <td data-label="Actions" class="py-4 px-4 align-top actions-cell">${actionsHtml}</td>
        `;
        tbody.appendChild(row);
    });
};

// Renders the pagination controls below the transaction list
export function renderDashboardPaginationControls(totalItems) {
    const controlsContainer = document.getElementById('pagination-controls');
    if (!controlsContainer) return;

    const totalPages = Math.ceil(totalItems / state.dashboardItemsPerPage);
    if (totalPages <= 1) {
        controlsContainer.innerHTML = '';
        return;
    }

    const prevDisabled = state.dashboardCurrentPage === 1 ? 'disabled' : '';
    const nextDisabled = state.dashboardCurrentPage === totalPages ? 'disabled' : '';

    controlsContainer.innerHTML = `
        <button id="prev-page-btn" class="px-3 py-1 text-sm rounded-md font-semibold bg-slate-200 hover:bg-slate-300 disabled:opacity-50" ${prevDisabled}>Previous</button>
        <span class="text-sm font-semibold">Page ${state.dashboardCurrentPage} of ${totalPages}</span>
        <button id="next-page-btn" class="px-3 py-1 text-sm rounded-md font-semibold bg-slate-200 hover:bg-slate-300 disabled:opacity-50" ${nextDisabled}>Next</button>
    `;

    document.getElementById('prev-page-btn')?.addEventListener('click', () => {
        if (state.dashboardCurrentPage > 1) {
            state.dashboardCurrentPage--;
            renderAll();
        }
    });

    document.getElementById('next-page-btn')?.addEventListener('click', () => {
        if (state.dashboardCurrentPage < totalPages) {
            state.dashboardCurrentPage++;
            renderAll();
        }
    });
};
