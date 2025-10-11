// js/components/transactionForm.js

import { state } from '../main.js';
import { renderPage, showToast } from '../ui.js';
import { saveTransaction } from '../api.js';

// A variable to hold the ID of the transaction being edited
let currentEditId = null;

/**
 * Returns the HTML template for the transaction form page.
 */
function getTransactionFormTemplate() {
    return `
        <div class="bg-white dark:bg-slate-900 rounded-lg shadow-sm border border-slate-200 dark:border-slate-800 max-w-4xl mx-auto">
            <div class="p-6 border-b dark:border-slate-800">
                <h2 id="form-title" class="text-xl font-bold">Add New Transaction</h2>
            </div>
            <form id="transaction-form" class="p-6">
                <input type="hidden" id="transaction-id">
                
                <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
                    <div class="lg:col-span-2"><label for="item" class="font-semibold text-sm">Item Details</label><input type="text" id="item" class="w-full p-2 mt-1 border rounded-lg bg-slate-50 dark:bg-slate-800 border-slate-300 dark:border-slate-700" required></div>
                    <div><label for="scale-weight" class="font-semibold text-sm">Scale Wt. (kg)</label><input type="number" step="any" id="scale-weight" placeholder="0.00" class="w-full p-2 mt-1 border rounded-lg bg-slate-50 dark:bg-slate-800 border-slate-300 dark:border-slate-700"></div>
                    <div><label for="less" class="font-semibold text-sm">Less (kg)</label><input type="number" step="any" id="less" placeholder="0.00" class="w-full p-2 mt-1 border rounded-lg bg-slate-50 dark:bg-slate-800 border-slate-300 dark:border-slate-700"></div>
                    <div><label for="net-weight" class="font-semibold text-sm">Net Wt. (kg)</label><input type="number" step="any" id="net-weight" placeholder="0.00" class="w-full p-2 mt-1 border rounded-lg bg-slate-100 dark:bg-slate-800" readonly></div>
                </div>

                <div class="mt-6 grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
                    <div class="space-y-4 p-4 rounded-lg bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800">
                        <h3 class="font-bold text-lg text-rose-500">Supplier Details</h3>
                        <div><label for="supplier-select" class="font-semibold text-sm">Supplier Name</label><select id="supplier-select" class="w-full p-2 mt-1 border rounded-lg bg-slate-50 dark:bg-slate-800 border-slate-300 dark:border-slate-700" required><option value="">-- Select --</option></select></div>
                        <div><label for="vehicle-no" class="font-semibold text-sm">Vehicle No</label><input type="text" id="vehicle-no" placeholder="e.g., DHAKA-123" class="w-full p-2 mt-1 border rounded-lg bg-slate-50 dark:bg-slate-800 border-slate-300 dark:border-slate-700"></div>
                        <div><label for="supplier-rate" class="font-semibold text-sm">Rate (per kg)</label><input type="number" step="any" id="supplier-rate" placeholder="0.00" class="w-full p-2 mt-1 border rounded-lg bg-slate-50 dark:bg-slate-800 border-slate-300 dark:border-slate-700"></div>
                        <div class="grid grid-cols-2 gap-4">
                            <div><label for="paid-to-supplier" class="font-semibold text-sm">Initial Payment</label><input type="number" step="any" id="paid-to-supplier" placeholder="0.00" class="w-full p-2 mt-1 border rounded-lg bg-slate-50 dark:bg-slate-800 border-slate-300 dark:border-slate-700"></div>
                            <div><label for="paid-to-supplier-method" class="font-semibold text-sm">Method</label><select id="paid-to-supplier-method" class="w-full p-2 mt-1 border rounded-lg bg-slate-50 dark:bg-slate-800 border-slate-300 dark:border-slate-700"><option>Cash</option><option>Bank</option><option>Bkash</option><option>Rocket</option><option>Nagod</option></select></div>
                        </div>
                    </div>
                    <div class="space-y-4 p-4 rounded-lg bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800">
                        <h3 class="font-bold text-lg text-green-600 dark:text-green-500">Buyer Details</h3>
                        <div><label for="buyer-select" class="font-semibold text-sm">Buyer Name</label><select id="buyer-select" class="w-full p-2 mt-1 border rounded-lg bg-slate-50 dark:bg-slate-800 border-slate-300 dark:border-slate-700" required><option value="">-- Select --</option></select></div>
                        <div><label for="buyer-rate" class="font-semibold text-sm">Rate (per kg)</label><input type="number" step="any" id="buyer-rate" placeholder="0.00" class="w-full p-2 mt-1 border rounded-lg bg-slate-50 dark:bg-slate-800 border-slate-300 dark:border-slate-700"></div>
                        <div class="grid grid-cols-2 gap-4">
                            <div><label for="received-from-buyer" class="font-semibold text-sm">Initial Payment</label><input type="number" step="any" id="received-from-buyer" placeholder="0.00" class="w-full p-2 mt-1 border rounded-lg bg-slate-50 dark:bg-slate-800 border-slate-300 dark:border-slate-700"></div>
                            <div><label for="received-from-buyer-method" class="font-semibold text-sm">Method</label><select id="received-from-buyer-method" class="w-full p-2 mt-1 border rounded-lg bg-slate-50 dark:bg-slate-800 border-slate-300 dark:border-slate-700"><option>Cash</option><option>Bank</option><option>Bkash</option><option>Rocket</option><option>Nagod</option></select></div>
                        </div>
                    </div>
                </div>
                
                <div class="mt-6 pt-4 border-t dark:border-slate-800 space-y-2">
                    <div><label for="date" class="font-semibold text-sm">Transaction Date</label><input type="date" id="date" class="w-full p-2 mt-1 border rounded-lg bg-slate-50 dark:bg-slate-800 border-slate-300 dark:border-slate-700" required></div>
                    <div class="flex justify-between items-center text-lg"><span class="font-semibold text-slate-500">Total Payable (to Supplier):</span><span id="supplier-total" class="font-bold text-rose-500">৳0.00</span></div>
                    <div class="flex justify-between items-center text-lg"><span class="font-semibold text-slate-500">Total Receivable (from Buyer):</span><span id="buyer-total" class="font-bold text-green-600">৳0.00</span></div>
                    <div class="flex justify-between items-center text-xl"><span class="font-semibold">Gross Profit on Deal:</span><span id="transaction-profit" class="font-bold text-teal-600">৳0.00</span></div>
                </div>

                <div class="flex justify-end gap-3 pt-6 mt-4 border-t dark:border-slate-800">
                    <button type="button" id="cancel-transaction-btn" class="px-4 py-2 rounded-lg font-semibold bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-sm">Cancel</button>
                    <button type="button" id="reset-form-btn" class="px-4 py-2 rounded-lg font-semibold bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-sm">Reset</button>
                    <button type="submit" class="px-6 py-2 rounded-lg font-semibold bg-teal-600 text-white hover:bg-teal-700 text-sm">Save Transaction</button>
                </div>
            </form>
        </div>
    `;
}

/**
 * Populates the supplier and buyer dropdowns from the global state.
 */
function populateDropdowns() {
    const supplierSelect = document.getElementById('supplier-select');
    const buyerSelect = document.getElementById('buyer-select');
    if (!supplierSelect || !buyerSelect) return;

    const suppliers = state.contacts.filter(c => c.type === 'supplier');
    const buyers = state.contacts.filter(c => c.type === 'buyer');

    // Clear existing options except the first placeholder
    supplierSelect.innerHTML = '<option value="">-- Select Supplier --</option>';
    buyerSelect.innerHTML = '<option value="">-- Select Buyer --</option>';

    suppliers.forEach(c => {
        supplierSelect.innerHTML += `<option value="${c.name}">${c.name}</option>`;
    });
    buyers.forEach(c => {
        buyerSelect.innerHTML += `<option value="${c.name}">${c.name}</option>`;
    });
}

/**
 * Calculates net weight and updates the form.
 */
function calculateNetWeight() {
    const scaleWeight = parseFloat(document.getElementById('scale-weight').value) || 0;
    const less = parseFloat(document.getElementById('less').value) || 0;
    const netWeight = scaleWeight - less;
    const netWeightInput = document.getElementById('net-weight');
    if (netWeightInput) {
        netWeightInput.value = netWeight > 0 ? netWeight.toFixed(2) : '0.00';
    }
    updateTradeTotals();
}

/**
 * Calculates and displays the financial totals for the transaction.
 */
function updateTradeTotals() {
    const netWeight = parseFloat(document.getElementById('net-weight').value) || 0;
    const supplierRate = parseFloat(document.getElementById('supplier-rate').value) || 0;
    const buyerRate = parseFloat(document.getElementById('buyer-rate').value) || 0;

    const supplierTotal = netWeight * supplierRate;
    const buyerTotal = netWeight * buyerRate;
    const profit = buyerTotal - supplierTotal;

    document.getElementById('supplier-total').textContent = `৳${supplierTotal.toFixed(2)}`;
    document.getElementById('buyer-total').textContent = `৳${buyerTotal.toFixed(2)}`;
    document.getElementById('transaction-profit').textContent = `৳${profit.toFixed(2)}`;
}

/**
 * Resets the form to its initial state.
 */
function resetForm() {
    const form = document.getElementById('transaction-form');
    if (form) {
        form.reset();
        document.getElementById('transaction-id').value = '';
        document.getElementById('form-title').textContent = 'Add New Transaction';
        document.getElementById('date').value = new Date().toISOString().split('T')[0];
        calculateNetWeight(); // This also calls updateTradeTotals
    }
    currentEditId = null;
}

/**
 * Fills the form with data from an existing transaction for editing.
 * @param {string} transactionId - The ID of the transaction to edit.
 */
function fillFormForEdit(transactionId) {
    const t = state.transactions.find(tx => tx.id === transactionId);
    if (!t) {
        showToast('Error: Transaction not found.');
        resetForm();
        return;
    }

    currentEditId = transactionId;
    document.getElementById('form-title').textContent = 'Edit Transaction';
    document.getElementById('transaction-id').value = t.id;
    document.getElementById('date').value = t.date;
    document.getElementById('item').value = t.item;
    document.getElementById('vehicle-no').value = t.vehicleNo || '';
    document.getElementById('scale-weight').value = t.scaleWeight || '';
    document.getElementById('less').value = t.less || '';
    
    document.getElementById('supplier-select').value = t.supplierName;
    document.getElementById('supplier-rate').value = t.supplierRate;

    document.getElementById('buyer-select').value = t.buyerName;
    document.getElementById('buyer-rate').value = t.buyerRate;

    // Handle initial payments (note: this logic assumes payments are part of the transaction document)
    const initialPaymentToSupplier = (t.paymentsToSupplier?.[0]?.amount) || '';
    const initialPaymentFromBuyer = (t.paymentsFromBuyer?.[0]?.amount) || '';
    document.getElementById('paid-to-supplier').value = initialPaymentToSupplier;
    document.getElementById('received-from-buyer').value = initialPaymentFromBuyer;
    
    // Recalculate everything to ensure UI is consistent
    calculateNetWeight();
}

/**
 * Handles the form submission event.
 */
async function handleFormSubmit(event) {
    event.preventDefault();
    const id = document.getElementById('transaction-id').value;

    // Construct the data object from form values
    const transactionData = {
        type: 'trade',
        date: document.getElementById('date').value,
        item: document.getElementById('item').value.trim(),
        vehicleNo: document.getElementById('vehicle-no').value.trim(),
        scaleWeight: parseFloat(document.getElementById('scale-weight').value) || 0,
        less: parseFloat(document.getElementById('less').value) || 0,
        netWeight: parseFloat(document.getElementById('net-weight').value) || 0,
        supplierName: document.getElementById('supplier-select').value,
        supplierRate: parseFloat(document.getElementById('supplier-rate').value) || 0,
        buyerName: document.getElementById('buyer-select').value,
        buyerRate: parseFloat(document.getElementById('buyer-rate').value) || 0,
    };

    // --- Validation ---
    if (!transactionData.date || !transactionData.item || !transactionData.supplierName || !transactionData.buyerName) {
        return showToast('Please fill all required fields.');
    }
    if (transactionData.supplierName === transactionData.buyerName) {
        return showToast('Supplier and Buyer cannot be the same.');
    }

    // --- Calculations ---
    transactionData.supplierTotal = transactionData.netWeight * transactionData.supplierRate;
    transactionData.buyerTotal = transactionData.netWeight * transactionData.buyerRate;
    transactionData.profit = transactionData.buyerTotal - transactionData.supplierTotal;

    // --- Handle Initial Payments ---
    const paidToSupplier = parseFloat(document.getElementById('paid-to-supplier').value) || 0;
    const receivedFromBuyer = parseFloat(document.getElementById('received-from-buyer').value) || 0;
    
    transactionData.paymentsToSupplier = [];
    if (paidToSupplier > 0) {
        transactionData.paymentsToSupplier.push({
            date: transactionData.date,
            amount: paidToSupplier,
            method: document.getElementById('paid-to-supplier-method').value
        });
    }

    transactionData.paymentsFromBuyer = [];
    if (receivedFromBuyer > 0) {
        transactionData.paymentsFromBuyer.push({
            date: transactionData.date,
            amount: receivedFromBuyer,
            method: document.getElementById('received-from-buyer-method').value
        });
    }

    try {
        await saveTransaction(state.user.uid, transactionData, id);
        showToast(id ? 'Transaction Updated!' : 'Transaction Saved!');
        window.location.hash = 'dashboard'; // Navigate back to dashboard on success
    } catch (error) {
        showToast('Error: Could not save transaction.');
        console.error("Transaction save error: ", error);
    }
}

/**
 * Attaches all necessary event listeners to the form elements.
 */
function initializeFormListeners() {
    const form = document.getElementById('transaction-form');
    form?.addEventListener('submit', handleFormSubmit);

    document.getElementById('reset-form-btn')?.addEventListener('click', resetForm);
    document.getElementById('cancel-transaction-btn')?.addEventListener('click', () => {
        window.location.hash = 'dashboard';
    });

    // Add listeners for real-time calculations
    ['scale-weight', 'less'].forEach(id => {
        document.getElementById(id)?.addEventListener('input', calculateNetWeight);
    });
    ['supplier-rate', 'buyer-rate'].forEach(id => {
        document.getElementById(id)?.addEventListener('input', updateTradeTotals);
    });
}

/**
 * Main function to display and initialize the transaction form page.
 */
export function showTransactionForm() {
    // Check URL for an edit ID, e.g., #transaction-form?id=XYZ123
    const urlParams = new URLSearchParams(window.location.hash.split('?')[1]);
    const transactionId = urlParams.get('id');

    renderPage(getTransactionFormTemplate());
    populateDropdowns();
    
    if (transactionId) {
        fillFormForEdit(transactionId);
    } else {
        resetForm();
    }
    
    initializeFormListeners();
}
