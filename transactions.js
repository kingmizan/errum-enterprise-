// --- transactions.js ---
import { state } from './state.js';
import { showToast } from './ui.js';
import { saveDoc, deleteDocument } from './firestore.js';
import { navigateTo } from './navigation.js';

const getPayments = (history) => (history || []).reduce((sum, p) => sum + p.amount, 0);

export function populateTradeDropdowns() {
    const supplierSelect = document.getElementById('supplier-select');
    const buyerSelect = document.getElementById('buyer-select');
    if (!supplierSelect || !buyerSelect) return;
    const suppliers = state.contacts.filter(c => c.type === 'supplier');
    const buyers = state.contacts.filter(c => c.type === 'buyer');
    supplierSelect.innerHTML = '<option value="">-- Select Supplier --</option>';
    suppliers.forEach(c => supplierSelect.add(new Option(c.name, c.name)));
    buyerSelect.innerHTML = '<option value="">-- Select Buyer --</option>';
    buyers.forEach(c => buyerSelect.add(new Option(c.name, c.name)));
}

export function updateTradeTotals() { /* ... (same as before) ... */ }
export function calculateNetWeight() { /* ... (same as before) ... */ }

export function resetTradeForm() {
    const formTitle = document.getElementById('form-title');
    if (formTitle) formTitle.textContent = 'Add New Transaction';
    const form = document.getElementById('transaction-form');
    if (form) {
        form.reset();
        document.getElementById('transaction-id').value = '';
        const dateInput = document.getElementById('date');
        if(dateInput) {
            const today = new Date();
            today.setMinutes(today.getMinutes() - today.getTimezoneOffset());
            dateInput.value = today.toISOString().split('T')[0];
        }
    }
    calculateNetWeight();
}

export function setupTradeFormForEdit(id) { /* ... (same as before, now works with new structure) ... */ }

export async function handleTradeFormSubmit(e) { /* ... (same as before) ... */ }
export async function handleDelete(id) { /* ... (same as before) ... */ }
export function openPaymentModal(id, type) { /* ... (same as before) ... */ }
export async function handleSavePayment() { /* ... (same as before) ... */ }
export function openDirectPaymentModal(contactId) { /* ... (same as before) ... */ }
export async function handleDirectPaymentSubmit(e) { /* ... (same as before) ... */ }

export function showTransactionDetailsModal(id) {
    const t = state.transactions.find(tx => tx.id === id);
    if (!t) return;

    const detailsContent = document.getElementById('transaction-detail-content');
    const invoiceContent = document.getElementById('transaction-invoice-content');
    const modalFooter = document.getElementById('transaction-detail-footer');
    const toggleBtn = document.getElementById('toggle-invoice-btn');

    if (t.type === 'trade') {
        const buyer = state.contacts.find(c => c.name === t.buyerName) || {};
        detailsContent.innerHTML = `
            <div class="space-y-4">
                <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                   <div class="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-lg">
                       <h3 class="font-bold text-lg text-rose-500 mb-2">Supplier Details</h3>
                       <div class="text-sm space-y-1">
                           <p><strong class="w-24 inline-block text-slate-500">Name:</strong> ${t.supplierName}</p>
                           <p><strong class="w-24 inline-block text-slate-500">Rate:</strong> ৳${(t.supplierRate || 0).toFixed(2)} / kg</p>
                           <p><strong class="w-24 inline-block text-slate-500">Total:</strong> ৳${(t.supplierTotal || 0).toFixed(2)}</p>
                       </div>
                   </div>
                   <div class="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-lg">
                       <h3 class="font-bold text-lg text-green-600 mb-2">Buyer Details</h3>
                       <div class="text-sm space-y-1">
                           <p><strong class="w-24 inline-block text-slate-500">Name:</strong> ${t.buyerName}</p>
                           <p><strong class="w-24 inline-block text-slate-500">Rate:</strong> ৳${(t.buyerRate || 0).toFixed(2)} / kg</p>
                           <p><strong class="w-24 inline-block text-slate-500">Total:</strong> ৳${(t.buyerTotal || 0).toFixed(2)}</p>
                       </div>
                   </div>
                </div>
                 <div class="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-lg">
                     <h3 class="font-bold text-lg text-slate-800 dark:text-slate-200 mb-2">Item & Weight</h3>
                     <div class="text-sm space-y-1">
                         <p><strong class="w-24 inline-block text-slate-500">Item:</strong> ${t.item}</p>
                         <p><strong class="w-24 inline-block text-slate-500">Vehicle No:</strong> ${t.vehicleNo || 'N/A'}</p>
                         <p><strong class="w-24 inline-block text-slate-500">Net Weight:</strong> ${(t.netWeight || 0).toFixed(2)} kg</p>
                     </div>
                 </div>
                <div class="p-4 rounded-lg border dark:border-slate-700">
                     <h3 class="font-bold text-lg text-teal-600 mb-2">Financial Summary</h3>
                     <div class="text-sm space-y-1">
                         <p><strong class="w-24 inline-block text-slate-500">Gross Profit:</strong> ৳${(t.profit || 0).toFixed(2)}</p>
                         <p><strong class="w-24 inline-block text-slate-500">Paid to Sup:</strong> ৳${getPayments(t.paymentsToSupplier).toFixed(2)}</p>
                         <p><strong class="w-24 inline-block text-slate-500">Rcvd from Buy:</strong> ৳${getPayments(t.paymentsFromBuyer).toFixed(2)}</p>
                    </div>
                </div>
            </div>`;
        const balanceDue = (t.buyerTotal || 0) - getPayments(t.paymentsFromBuyer);
        invoiceContent.innerHTML = ``;
        modalFooter.style.display = 'flex';
        toggleBtn.disabled = false;
        toggleBtn.title = '';
    } else { // Payment type
        detailsContent.innerHTML = ``;
        invoiceContent.innerHTML = '';
        modalFooter.style.display = 'flex';
        toggleBtn.disabled = true;
        toggleBtn.title = 'Invoices are only available for trade transactions.';
    }
    
    // Logic for toggling invoice view and saving
    // ... (paste the logic for toggleBtn.onclick and saveBtn.onclick here)
    document.getElementById('transaction-detail-modal').classList.remove('hidden');
}
