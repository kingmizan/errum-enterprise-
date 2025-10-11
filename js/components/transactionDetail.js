// js/components/transactionDetail.js

import { state } from '../main.js';
import { showToast } from '../ui.js';

const getPayments = (history) => (history || []).reduce((sum, p) => sum + p.amount, 0);

/**
 * Main function to show the transaction details modal.
 * @param {string} transactionId - The ID of the transaction to display.
 */
export function showTransactionDetails(transactionId) {
    const t = state.transactions.find(tx => tx.id === transactionId);
    if (!t) return showToast('Error: Transaction not found.');

    const modal = document.getElementById('transaction-detail-modal');
    const detailsContent = document.getElementById('transaction-detail-content');
    const invoiceContent = document.getElementById('transaction-invoice-content');
    const footer = document.getElementById('transaction-detail-footer');
    const toggleBtn = document.getElementById('toggle-invoice-btn');
    const saveBtn = document.getElementById('save-invoice-btn');

    detailsContent.classList.remove('hidden');
    invoiceContent.classList.add('hidden');
    saveBtn.classList.add('hidden');
    toggleBtn.textContent = 'View Invoice';

    if (t.type === 'trade') {
        detailsContent.innerHTML = getTradeDetailsHTML(t);
        invoiceContent.innerHTML = getInvoiceHTML(t);
        footer.classList.remove('hidden');
    } else { // Payment
        detailsContent.innerHTML = getPaymentDetailsHTML(t);
        invoiceContent.innerHTML = '';
        footer.classList.add('hidden');
    }
    
    modal.classList.remove('hidden');
}

/**
 * ✨ FIX: Initializes the event listeners for the modal's buttons.
 * This function needs to be exported so main.js can call it.
 */
export function initializeDetailModalListeners() {
    const modal = document.getElementById('transaction-detail-modal');
    if (!modal) return;

    modal.addEventListener('click', (e) => {
        if (e.target.id === 'transaction-detail-modal' || e.target.closest('[data-action="close-modal"]')) {
            modal.classList.add('hidden');
        }
    });

    document.getElementById('toggle-invoice-btn')?.addEventListener('click', () => {
        document.getElementById('transaction-detail-content').classList.toggle('hidden');
        document.getElementById('transaction-invoice-content').classList.toggle('hidden');
        document.getElementById('save-invoice-btn').classList.toggle('hidden');
        document.getElementById('toggle-invoice-btn').textContent = document.getElementById('transaction-detail-content').classList.contains('hidden') ? 'View Details' : 'View Invoice';
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
        } catch (error) {
            showToast('Failed to generate PNG.');
            console.error(error);
        }
    });
}

// --- HTML Template Generators (These functions remain the same) ---
function getTradeDetailsHTML(t) { /* ... same as before ... */ }
function getPaymentDetailsHTML(t) { /* ... same as before ... */ }
function getInvoiceHTML(t) { /* ... same as before ... */ }
