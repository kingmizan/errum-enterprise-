// js/transaction.js

import { checkAuth, renderHeaderAndNav, updateUserEmail } from './shared.js';
import { listenToContacts, saveTransaction, getDoc, doc, db } from './api.js'; // Assuming getDoc, doc, db are exported from api.js
import { showToast } from './ui.js';

let contactsState = [];

// Main entry point for the page
async function init() {
    const user = await checkAuth();
    if (!user) return;

    renderHeaderAndNav('transaction');
    updateUserEmail(user.email);

    document.getElementById('app-content').innerHTML = getTransactionPageTemplate();
    
    // Listen for contacts to populate dropdowns
    listenToContacts(user.uid, (contacts) => {
        contactsState = contacts;
        populateDropdowns();
        
        // Check for edit mode after contacts are loaded
        const urlParams = new URLSearchParams(window.location.search);
        const transactionId = urlParams.get('id');
        if (transactionId) {
            fillFormForEdit(user.uid, transactionId);
        } else {
            resetForm();
        }
    });

    initializeTransactionListeners();
}

function getTransactionPageTemplate() {
    // This is the full HTML of the transaction form
    return `
        <div class="bg-white dark:bg-slate-900 rounded-lg shadow-sm max-w-4xl mx-auto">
            <div class="p-6 border-b"><h2 id="form-title" class="text-xl font-bold">Add New Transaction</h2></div>
            <form id="transaction-form" class="p-6">
                <input type="hidden" id="transaction-id">
                <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
                    <div class="lg:col-span-2"><label class="font-semibold text-sm">Item Details</label><input type="text" id="item" class="w-full p-2 mt-1 border rounded-lg" required></div>
                    <div><label class="font-semibold text-sm">Scale Wt. (kg)</label><input type="number" step="any" id="scale-weight" placeholder="0.00" class="w-full p-2 mt-1 border rounded-lg"></div>
                    <div><label class="font-semibold text-sm">Less (kg)</label><input type="number" step="any" id="less" placeholder="0.00" class="w-full p-2 mt-1 border rounded-lg"></div>
                    <div><label class="font-semibold text-sm">Net Wt. (kg)</label><input type="number" step="any" id="net-weight" class="w-full p-2 mt-1 border rounded-lg bg-slate-100" readonly></div>
                </div>
                <div class="mt-6 grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div class="space-y-4 p-4 rounded-lg bg-slate-50 dark:bg-slate-800">
                        <h3 class="font-bold text-lg text-rose-500">Supplier Details</h3>
                        <div><label class="font-semibold text-sm">Supplier</label><select id="supplier-select" class="w-full p-2 mt-1 border rounded-lg" required><option value="">-- Select --</option></select></div>
                        <div><label class="font-semibold text-sm">Rate (per kg)</label><input type="number" step="any" id="supplier-rate" placeholder="0.00" class="w-full p-2 mt-1 border rounded-lg"></div>
                    </div>
                    <div class="space-y-4 p-4 rounded-lg bg-slate-50 dark:bg-slate-800">
                        <h3 class="font-bold text-lg text-green-600">Buyer Details</h3>
                        <div><label class="font-semibold text-sm">Buyer</label><select id="buyer-select" class="w-full p-2 mt-1 border rounded-lg" required><option value="">-- Select --</option></select></div>
                        <div><label class="font-semibold text-sm">Rate (per kg)</label><input type="number" step="any" id="buyer-rate" placeholder="0.00" class="w-full p-2 mt-1 border rounded-lg"></div>
                    </div>
                </div>
                <div class="mt-6 pt-4 border-t space-y-2">
                    <div><label class="font-semibold text-sm">Date</label><input type="date" id="date" class="w-full p-2 mt-1 border rounded-lg" required></div>
                    <div class="flex justify-between items-center text-lg"><span class="font-semibold text-slate-500">Total Payable:</span><span id="supplier-total" class="font-bold text-rose-500">৳0.00</span></div>
                    <div class="flex justify-between items-center text-lg"><span class="font-semibold text-slate-500">Total Receivable:</span><span id="buyer-total" class="font-bold text-green-600">৳0.00</span></div>
                    <div class="flex justify-between items-center text-xl"><span class="font-semibold">Gross Profit:</span><span id="transaction-profit" class="font-bold text-teal-600">৳0.00</span></div>
                </div>
                <div class="flex justify-end gap-3 pt-6 mt-4 border-t">
                    <a href="/index.html" class="px-4 py-2 rounded-lg font-semibold bg-slate-200 dark:bg-slate-700">Cancel</a>
                    <button type="button" id="reset-form-btn" class="px-4 py-2 rounded-lg font-semibold bg-slate-200 dark:bg-slate-700">Reset</button>
                    <button type="submit" class="px-6 py-2 rounded-lg font-semibold bg-teal-600 text-white">Save Transaction</button>
                </div>
            </form>
        </div>
    `;
}

function initializeTransactionListeners() {
    const form = document.getElementById('transaction-form');
    form?.addEventListener('submit', handleFormSubmit);
    document.getElementById('reset-form-btn')?.addEventListener('click', resetForm);
    ['scale-weight', 'less', 'supplier-rate', 'buyer-rate'].forEach(id => {
        document.getElementById(id)?.addEventListener('input', calculateTotals);
    });
}

function populateDropdowns() {
    const supplierSelect = document.getElementById('supplier-select');
    const buyerSelect = document.getElementById('buyer-select');
    if (!supplierSelect || !buyerSelect) return;

    const suppliers = contactsState.filter(c => c.type === 'supplier');
    const buyers = contactsState.filter(c => c.type === 'buyer');

    supplierSelect.innerHTML = '<option value="">-- Select Supplier --</option>' + suppliers.map(c => `<option value="${c.name}">${c.name}</option>`).join('');
    buyerSelect.innerHTML = '<option value="">-- Select Buyer --</option>' + buyers.map(c => `<option value="${c.name}">${c.name}</option>`).join('');
}

function calculateTotals() {
    const scaleWeight = parseFloat(document.getElementById('scale-weight').value) || 0;
    const less = parseFloat(document.getElementById('less').value) || 0;
    const netWeight = scaleWeight - less;
    document.getElementById('net-weight').value = netWeight > 0 ? netWeight.toFixed(2) : '0.00';

    const supplierRate = parseFloat(document.getElementById('supplier-rate').value) || 0;
    const buyerRate = parseFloat(document.getElementById('buyer-rate').value) || 0;
    const supplierTotal = netWeight * supplierRate;
    const buyerTotal = netWeight * buyerRate;

    document.getElementById('supplier-total').textContent = `৳${supplierTotal.toFixed(2)}`;
    document.getElementById('buyer-total').textContent = `৳${buyerTotal.toFixed(2)}`;
    document.getElementById('transaction-profit').textContent = `৳${(buyerTotal - supplierTotal).toFixed(2)}`;
}

function resetForm() {
    const form = document.getElementById('transaction-form');
    if (form) {
        form.reset();
        document.getElementById('form-title').textContent = 'Add New Transaction';
        document.getElementById('transaction-id').value = '';
        document.getElementById('date').value = new Date().toISOString().split('T')[0];
        calculateTotals();
    }
}

async function fillFormForEdit(userId, transactionId) {
    // For edit mode, we need to fetch the specific transaction document
    const transactionDoc = await getDoc(doc(db, "users", userId, "transactions", transactionId));
    if (!transactionDoc.exists()) {
        showToast('Error: Transaction not found.');
        return;
    }
    const t = { id: transactionDoc.id, ...transactionDoc.data() };

    document.getElementById('form-title').textContent = 'Edit Transaction';
    document.getElementById('transaction-id').value = t.id;
    document.getElementById('date').value = t.date;
    document.getElementById('item').value = t.item;
    document.getElementById('scale-weight').value = t.scaleWeight || '';
    document.getElementById('less').value = t.less || '';
    document.getElementById('supplier-select').value = t.supplierName;
    document.getElementById('supplier-rate').value = t.supplierRate;
    document.getElementById('buyer-select').value = t.buyerName;
    document.getElementById('buyer-rate').value = t.buyerRate;
    
    calculateTotals();
}

async function handleFormSubmit(event) {
    event.preventDefault();
    const user = auth.currentUser;
    if (!user) return showToast('You must be logged in.');

    const id = document.getElementById('transaction-id').value;
    const transactionData = {
        type: 'trade',
        date: document.getElementById('date').value,
        item: document.getElementById('item').value.trim(),
        netWeight: parseFloat(document.getElementById('net-weight').value) || 0,
        supplierName: document.getElementById('supplier-select').value,
        supplierRate: parseFloat(document.getElementById('supplier-rate').value) || 0,
        buyerName: document.getElementById('buyer-select').value,
        buyerRate: parseFloat(document.getElementById('buyer-rate').value) || 0,
    };
    
    // Add other fields and calculations
    transactionData.supplierTotal = transactionData.netWeight * transactionData.supplierRate;
    transactionData.buyerTotal = transactionData.netWeight * transactionData.buyerRate;
    transactionData.profit = transactionData.buyerTotal - transactionData.supplierTotal;

    // Validation
    if (!transactionData.date || !transactionData.item || !transactionData.supplierName || !transactionData.buyerName) {
        return showToast('Please fill all required fields.');
    }

    try {
        await saveTransaction(user.uid, transactionData, id || null);
        showToast(id ? 'Transaction Updated!' : 'Transaction Saved!');
        window.location.href = '/index.html'; // Go to dashboard after saving
    } catch (error) {
        showToast('Error: Could not save transaction.');
        console.error("Save error: ", error);
    }
}

// Start the page
init();
