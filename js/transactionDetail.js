// js/transactionDetail.js

import { showToast } from './ui.js';

const getPayments = (history) => (history || []).reduce((sum, p) => sum + p.amount, 0);

/**
 * Main function to show the transaction details modal.
 * @param {object} t - The full transaction object to display.
 * @param {Array} contacts - The array of all contacts to find buyer info.
 */
export function showTransactionDetails(t, contacts = []) {
    if (!t) {
        showToast('Error: Transaction data could not be loaded.');
        return;
    }

    const modal = document.getElementById('transaction-detail-modal');
    const detailsContent = document.getElementById('transaction-detail-content');
    const invoiceContent = document.getElementById('transaction-invoice-content');
    const footer = document.getElementById('transaction-detail-footer');
    const toggleBtn = document.getElementById('toggle-invoice-btn');
    const saveBtn = document.getElementById('save-invoice-btn');

    // Reset modal state
    detailsContent.classList.remove('hidden');
    invoiceContent.classList.add('hidden');
    saveBtn.classList.add('hidden');
    toggleBtn.textContent = 'View Invoice';

    // Populate content based on transaction type
    if (t.type === 'trade') {
        detailsContent.innerHTML = getTradeDetailsHTML(t);
        invoiceContent.innerHTML = getInvoiceHTML(t, contacts);
        footer.classList.remove('hidden');
    } else { // 'payment' type
        detailsContent.innerHTML = getPaymentDetailsHTML(t);
        invoiceContent.innerHTML = '';
        footer.classList.add('hidden'); // No invoice for simple payments
    }
    
    modal.classList.remove('hidden');
}

/**
 * Initializes the event listeners for the modal's buttons.
 * This should be run once when the dashboard page loads.
 */
export function initializeDetailModalListeners() {
    const modal = document.getElementById('transaction-detail-modal');
    if (!modal || modal.dataset.initialized) return; // Prevent re-attaching listeners

    modal.addEventListener('click', (e) => {
        if (e.target.id === 'transaction-detail-modal' || e.target.closest('[data-action="close-modal"]')) {
            modal.classList.add('hidden');
        }
    });

    document.getElementById('toggle-invoice-btn')?.addEventListener('click', () => {
        document.getElementById('transaction-detail-content').classList.toggle('hidden');
        document.getElementById('transaction-invoice-content').classList.toggle('hidden');
        document.getElementById('save-invoice-btn').classList.toggle('hidden');
        const isDetailsHidden = document.getElementById('transaction-detail-content').classList.contains('hidden');
        document.getElementById('toggle-invoice-btn').textContent = isDetailsHidden ? 'View Details' : 'View Invoice';
    });

    document.getElementById('save-invoice-btn')?.addEventListener('click', async () => {
        const invoiceEl = document.getElementById('invoice-to-export');
        if (!invoiceEl || !window.html2canvas) return showToast('Error: html2canvas library not found.');
        
        showToast('Generating PNG...');
        try {
            const canvas = await html2canvas(invoiceEl, { scale: 2, backgroundColor: '#ffffff' });
            const link = document.createElement('a');
            link.download = `Invoice-${new Date().toISOString().slice(0, 10)}.png`;
            link.href = canvas.toDataURL();
            link.click();
        } catch (error) { showToast('Failed to generate PNG.'); }
    });
    
    modal.dataset.initialized = 'true';
}

// --- HTML Template Generators ---

function getTradeDetailsHTML(t) {
    return `
    <div class="space-y-4">
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div class="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-lg"><h3 class="font-bold text-lg text-rose-500 mb-2">Supplier Details</h3><div class="text-sm space-y-1"><p><strong>Name:</strong> ${t.supplierName || 'N/A'}</p><p><strong>Rate:</strong> ৳${(t.supplierRate || 0).toFixed(2)} / kg</p><p><strong>Total:</strong> ৳${(t.supplierTotal || 0).toFixed(2)}</p></div></div>
            <div class="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-lg"><h3 class="font-bold text-lg text-green-600 mb-2">Buyer Details</h3><div class="text-sm space-y-1"><p><strong>Name:</strong> ${t.buyerName || 'N/A'}</p><p><strong>Rate:</strong> ৳${(t.buyerRate || 0).toFixed(2)} / kg</p><p><strong>Total:</strong> ৳${(t.buyerTotal || 0).toFixed(2)}</p></div></div>
        </div>
        <div class="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-lg"><h3 class="font-bold text-lg mb-2">Transaction Summary</h3><div class="text-sm space-y-1"><p><strong>Date:</strong> ${t.date || 'N/A'}</p><p><strong>Item:</strong> ${t.item || 'N/A'}</p><p><strong>Net Wt:</strong> ${(t.netWeight || 0).toFixed(2)} kg</p><p><strong>Gross Profit:</strong> ৳${(t.profit || 0).toFixed(2)}</p></div></div>
    </div>`;
}

function getPaymentDetailsHTML(t) {
     return `<div class="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-lg"><h3 class="font-bold text-lg mb-2">Payment Details</h3><div class="text-sm space-y-1"><p><strong>Date:</strong> ${t.date || 'N/A'}</p><p><strong>Party:</strong> ${t.name || 'N/A'}</p><p><strong>Type:</strong> ${t.paymentType === 'made' ? 'Payment Made' : 'Payment Received'}</p><p><strong>Amount:</strong> ৳${(t.amount || 0).toFixed(2)}</p><p><strong>Description:</strong> ${t.description || 'N/A'}</p></div></div>`;
}

function getInvoiceHTML(t, contacts) {
    const buyer = contacts.find(c => c.name === t.buyerName) || {};
    const amountPaid = getPayments(t.paymentsFromBuyer);
    const balanceDue = (t.buyerTotal || 0) - amountPaid;
    return `
        <div id="invoice-to-export" class="bg-white text-slate-800 p-8 mx-auto max-w-3xl">
            <header class="flex justify-between items-start mb-8"><div class="text-left"><h1 class="text-2xl font-bold">Errum Enterprise</h1><p class="text-slate-500">Chattogram, Bangladesh</p></div><div class="text-right"><h2 class="text-3xl font-bold text-slate-400 uppercase">Invoice</h2><p><strong>Date:</strong> ${t.date || 'N/A'}</p></div></header>
            <div class="mb-8"><h3 class="text-sm font-semibold text-slate-500 mb-1">BILL TO:</h3><p class="font-bold text-lg">${t.buyerName || 'N/A'}</p><p>${buyer.phone || 'N/A'}</p></div>
            <table class="w-full mb-8 text-sm">
                <thead class="bg-slate-50"><tr><th class="text-left p-2">Description</th><th class="text-right p-2">Qty (kg)</th><th class="text-right p-2">Rate</th><th class="text-right p-2">Amount</th></tr></thead>
                <tbody><tr class="border-b"><td class="p-2">${t.item || 'N/A'}</td><td class="text-right p-2">${(t.netWeight || 0).toFixed(2)}</td><td class="text-right p-2">৳${(t.buyerRate || 0).toFixed(2)}</td><td class="text-right p-2">৳${(t.buyerTotal || 0).toFixed(2)}</td></tr></tbody>
            </table>
            <div class="flex justify-end"><div class="w-full md:w-1/2 space-y-2"><div class="flex justify-between"><span>Subtotal:</span><span>৳${(t.buyerTotal || 0).toFixed(2)}</span></div><div class="flex justify-between"><span>Amount Paid:</span><span>- ৳${amountPaid.toFixed(2)}</span></div><div class="flex justify-between font-bold text-xl border-t pt-2 mt-2"><span class="text-teal-600">Balance Due:</span><span class="text-teal-600">৳${balanceDue.toFixed(2)}</span></div></div></div>
        </div>
    `;
}
