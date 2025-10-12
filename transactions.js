// --- transactions.js ---
// Handles all logic for the transaction form and payments.

import { state } from './state.js';
import { showToast } from './ui.js';
import { saveDoc, deleteDocument } from './firestore.js';
import { navigateTo } from './navigation.js';

// Populates the supplier and buyer dropdowns in the transaction form
export const populateTradeDropdowns = () => {
    const supplierSelect = document.getElementById('supplier-select');
    const buyerSelect = document.getElementById('buyer-select');
    if (!supplierSelect || !buyerSelect) return;

    const suppliers = state.contacts.filter(c => c.type === 'supplier');
    const buyers = state.contacts.filter(c => c.type === 'buyer');

    supplierSelect.innerHTML = '<option value="">-- Select Supplier --</option>';
    suppliers.forEach(c => {
        const option = document.createElement('option');
        option.value = c.name;
        option.textContent = c.name;
        supplierSelect.appendChild(option);
    });

    buyerSelect.innerHTML = '<option value="">-- Select Buyer --</option>';
    buyers.forEach(c => {
        const option = document.createElement('option');
        option.value = c.name;
        option.textContent = c.name;
        buyerSelect.appendChild(option);
    });
};

// Updates the total amounts and profit on the transaction form
export const updateTradeTotals = () => {
    const netWeight = parseFloat(document.getElementById('net-weight').value) || 0;
    const supplierRate = parseFloat(document.getElementById('supplier-rate').value) || 0;
    const buyerRate = parseFloat(document.getElementById('buyer-rate').value) || 0;

    const supplierTotal = netWeight * supplierRate;
    const buyerTotal = netWeight * buyerRate;
    const profit = buyerTotal - supplierTotal;

    document.getElementById('supplier-total').textContent = `৳${supplierTotal.toFixed(2)}`;
    document.getElementById('buyer-total').textContent = `৳${buyerTotal.toFixed(2)}`;
    document.getElementById('transaction-profit').textContent = `৳${profit.toFixed(2)}`;
};

// Calculates net weight based on scale weight and less
export const calculateNetWeight = () => {
    const scaleWeight = parseFloat(document.getElementById('scale-weight').value) || 0;
    const less = parseFloat(document.getElementById('less').value) || 0;
    const netWeight = scaleWeight - less;
    const netWeightInput = document.getElementById('net-weight');
    if (netWeightInput) {
        netWeightInput.value = netWeight > 0 ? netWeight.toFixed(2) : '0.00';
        updateTradeTotals();
    }
};

// Resets the trade form to its initial state
export const resetTradeForm = () => {
    document.getElementById('form-title').textContent = 'Add New Transaction';
    const form = document.getElementById('transaction-form');
    if (form) {
        form.reset();
        document.getElementById('transaction-id').value = '';
        document.getElementById('date').value = new Date().toISOString().split('T')[0];
    }
    calculateNetWeight();
};

// Pre-fills the transaction form for editing
export const setupTradeFormForEdit = (id) => {
    const t = state.transactions.find(t => t.id === id);
    if (!t || t.type !== 'trade') return;

    resetTradeForm();
    document.getElementById('form-title').textContent = 'Edit Transaction';
    document.getElementById('transaction-id').value = t.id;
    document.getElementById('date').value = t.date;
    document.getElementById('item').value = t.item;
    document.getElementById('vehicle-no').value = t.vehicleNo || '';
    document.getElementById('scale-weight').value = t.scaleWeight || '';
    document.getElementById('less').value = t.less || '';
    document.getElementById('net-weight').value = (t.netWeight !== undefined) ? t.netWeight : (t.weight || '');

    populateTradeDropdowns();
    setTimeout(() => {
        document.getElementById('supplier-select').value = t.supplierName;
        document.getElementById('buyer-select').value = t.buyerName;
    }, 0);

    document.getElementById('supplier-rate').value = t.supplierRate;
    document.getElementById('buyer-rate').value = t.buyerRate;
    
    // Note: This simplified version does not allow editing initial payments.
    // The fields will be empty upon editing to avoid complexity.
    document.getElementById('paid-to-supplier').value = '';
    document.getElementById('received-from-buyer').value = '';

    updateTradeTotals();
};

// Handles the submission of the main transaction form
export const handleTradeFormSubmit = async (e) => {
    e.preventDefault();
    const id = document.getElementById('transaction-id').value;
    
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

    if (!transactionData.date || !transactionData.item || !transactionData.supplierName || !transactionData.buyerName) {
        showToast('Please fill all required fields.'); return;
    }
    if (transactionData.supplierName === transactionData.buyerName) {
        showToast('Supplier and Buyer cannot be the same.'); return;
    }

    transactionData.supplierTotal = transactionData.netWeight * transactionData.supplierRate;
    transactionData.buyerTotal = transactionData.netWeight * transactionData.buyerRate;
    transactionData.profit = transactionData.buyerTotal - transactionData.supplierTotal;
    
    // Only add initial payments if creating a new transaction
    if (!id) {
        const paidToSupplier = parseFloat(document.getElementById('paid-to-supplier').value) || 0;
        const receivedFromBuyer = parseFloat(document.getElementById('received-from-buyer').value) || 0;

        if (paidToSupplier > 0) {
            transactionData.paymentsToSupplier = [{
                date: transactionData.date,
                amount: paidToSupplier,
                method: document.getElementById('paid-to-supplier-method').value
            }];
        }
        if (receivedFromBuyer > 0) {
            transactionData.paymentsFromBuyer = [{
                date: transactionData.date,
                amount: receivedFromBuyer,
                method: document.getElementById('received-from-buyer-method').value
            }];
        }
    } else {
        // Preserve existing payments when editing
        const existingTransaction = state.transactions.find(t => t.id === id);
        transactionData.paymentsToSupplier = existingTransaction.paymentsToSupplier || [];
        transactionData.paymentsFromBuyer = existingTransaction.paymentsFromBuyer || [];
    }

    try {
        await saveDoc("transactions", id, transactionData);
        showToast(id ? 'Transaction Updated!' : 'Transaction Saved!');
        navigateTo('dashboard');
    } catch (error) {
        showToast("Error: Could not save transaction.");
        console.error("Transaction save error: ", error);
    }
};

// Handles deleting any transaction (trade or direct payment)
export const handleDelete = async (id) => {
    if (confirm('Are you sure? This will permanently delete the transaction.')) {
        try {
            await deleteDocument("transactions", id);
            showToast('Transaction deleted.');
        } catch (error) {
            showToast('Error: Could not delete transaction.');
            console.error("Delete error: ", error);
        }
    }
};

// Opens the modal for adding a partial payment
export const openPaymentModal = (id, type) => {
    state.currentPaymentInfo = { id, type };
    const t = state.transactions.find(t => t.id === id);
    if (!t) return;
    const getPayments = (history) => (history || []).reduce((sum, p) => sum + p.amount, 0);

    let balance = 0;
    let title = 'Add Payment';

    if (type === 'toSupplier') {
        balance = t.supplierTotal - getPayments(t.paymentsToSupplier);
        title = `Pay Supplier: ${t.supplierName}`;
    } else if (type === 'fromBuyer') {
        balance = t.buyerTotal - getPayments(t.paymentsFromBuyer);
        title = `Receive from Buyer: ${t.buyerName}`;
    }

    document.getElementById('payment-modal-title').textContent = title;
    document.getElementById('payment-due-amount').textContent = `৳${balance.toFixed(2)}`;
    document.getElementById('payment-date').value = new Date().toISOString().split('T')[0];
    document.getElementById('payment-amount').value = '';
    document.getElementById('payment-modal').classList.remove('hidden');
};

// Saves a partial payment
export const handleSavePayment = async () => {
    const { id, type } = state.currentPaymentInfo;
    if (!id || !type) return;

    const paymentAmount = parseFloat(document.getElementById('payment-amount').value);
    if (isNaN(paymentAmount) || paymentAmount <= 0) {
        showToast('Please enter a valid amount.');
        return;
    }

    const t = state.transactions.find(t => t.id === id);
    if (!t) return;
    const getPayments = (history) => (history || []).reduce((sum, p) => sum + p.amount, 0);

    const newPayment = {
        date: document.getElementById('payment-date').value,
        amount: paymentAmount,
        method: document.getElementById('partial-payment-method').value
    };

    let updateData = {};
    if (type === 'toSupplier') {
        const balance = t.supplierTotal - getPayments(t.paymentsToSupplier);
        if (paymentAmount > balance + 0.01) { showToast('Payment exceeds balance.'); return; }
        updateData.paymentsToSupplier = [...(t.paymentsToSupplier || []), newPayment];
    } else if (type === 'fromBuyer') {
        const balance = t.buyerTotal - getPayments(t.paymentsFromBuyer);
        if (paymentAmount > balance + 0.01) { showToast('Payment exceeds balance.'); return; }
        updateData.paymentsFromBuyer = [...(t.paymentsFromBuyer || []), newPayment];
    }

    try {
        await saveDoc("transactions", id, updateData);
        showToast('Payment recorded!');
        document.getElementById('payment-modal').classList.add('hidden');
    } catch (error) {
        showToast('Error: Could not save payment.');
        console.error("Error saving payment: ", error);
    }
};


// Opens the modal for adding a direct payment to a contact
export const openDirectPaymentModal = (contactId) => {
    const contact = state.contacts.find(c => c.id === contactId);
    if (!contact) return;
    document.getElementById('direct-payment-modal-title').textContent = `Add Direct Payment for ${contact.name}`;
    document.getElementById('direct-payment-contact-id').value = contact.id;
    document.getElementById('direct-payment-contact-name').value = contact.name;
    document.getElementById('direct-payment-date').value = new Date().toISOString().split('T')[0];
    document.getElementById('direct-payment-form').reset(); // Reset form fields
    
    // Pre-select payment type based on contact type
    const madeRadio = document.querySelector('input[name="direct-payment-type"][value="made"]');
    const receivedRadio = document.querySelector('input[name="direct-payment-type"][value="received"]');
    if (contact.type === 'supplier') {
        madeRadio.checked = true;
    } else {
        receivedRadio.checked = true;
    }

    document.getElementById('direct-payment-modal').classList.remove('hidden');
};

// Saves a direct payment as a new transaction
export const handleDirectPaymentSubmit = async (e) => {
    e.preventDefault();
    const contactName = document.getElementById('direct-payment-contact-name').value;
    const paymentData = {
        type: 'payment',
        date: document.getElementById('direct-payment-date').value,
        name: contactName,
        amount: parseFloat(document.getElementById('direct-payment-amount').value) || 0,
        method: document.getElementById('direct-payment-method').value,
        description: document.getElementById('direct-payment-desc').value.trim(),
        paymentType: document.querySelector('input[name="direct-payment-type"]:checked').value
    };

    if (!paymentData.date || !paymentData.amount || !paymentData.description) {
        showToast('Please fill out all required fields.');
        return;
    }
    try {
        await saveDoc("transactions", null, paymentData); // null id means create new
        showToast(`Payment for ${contactName} saved!`);
        document.getElementById('direct-payment-form').reset();
        document.getElementById('direct-payment-modal').classList.add('hidden');
    } catch (error) {
        showToast('Error: Could not save direct payment.');
        console.error("Error saving direct payment: ", error);
    }
};
