// --- contacts.js ---
import { state } from './state.js';
import { showToast } from './ui.js';
import { saveDoc, deleteDocument } from './firestore.js';
import { showContactLedger } from './statements.js';
import { openDirectPaymentModal } from './transactions.js';

const getPayments = (history) => (history || []).reduce((sum, p) => sum + p.amount, 0);

export function renderContacts() {
    const tbody = document.getElementById('contacts-table-body');
    if (!tbody) return;
    tbody.innerHTML = '';
    if (state.contacts.length === 0) {
        tbody.innerHTML = `<tr><td colspan="6" class="text-center py-12 text-slate-500 dark:text-slate-400">No contacts found. Add one to get started!</td></tr>`;
        return;
    }

    state.contacts.forEach(c => {
        let netBalance = 0;
        if (c.openingBalance && c.openingBalance.amount > 0) {
            netBalance = c.openingBalance.type === 'receivable' ? c.openingBalance.amount : -c.openingBalance.amount;
        }
        const relatedTransactions = state.transactions.filter(t => t.supplierName === c.name || t.buyerName === c.name || t.name === c.name);
        relatedTransactions.forEach(t => {
            if (t.type === 'trade') {
                if (t.supplierName === c.name) netBalance -= ((t.supplierTotal || 0) - getPayments(t.paymentsToSupplier));
                if (t.buyerName === c.name) netBalance += ((t.buyerTotal || 0) - getPayments(t.paymentsFromBuyer));
            } else if (t.type === 'payment' && t.name === c.name) {
                if (t.paymentType === 'made') netBalance += t.amount;
                else netBalance -= t.amount;
            }
        });

        let lastTransactionDate = '<span class="text-slate-400">N/A</span>';
        if (relatedTransactions.length > 0) {
            lastTransactionDate = relatedTransactions.sort((a, b) => new Date(b.date) - new Date(a.date))[0].date;
        }

        const balanceText = `৳${Math.abs(netBalance).toFixed(2)}`;
        let balanceClass = 'text-slate-500';
        if (netBalance > 0.01) balanceClass = 'text-green-600 dark:text-green-500';
        else if (netBalance < -0.01) balance
