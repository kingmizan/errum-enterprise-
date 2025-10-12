// --- transactions.js ---
// (Only showing the modified function, the rest of the file is the same)

// ... other functions (populateTradeDropdowns, updateTradeTotals, etc.) ...

// Resets the trade form to its initial state
export const resetTradeForm = () => {
    // FIX IS HERE: Use optional chaining (?.)
    const formTitle = document.getElementById('form-title');
    if (formTitle) {
        formTitle.textContent = 'Add New Transaction';
    }
    
    const form = document.getElementById('transaction-form');
    if (form) {
        form.reset();
        document.getElementById('transaction-id').value = '';
        document.getElementById('date').value = new Date().toISOString().split('T')[0];
    }
    calculateNetWeight();
};

// ... rest of the functions in transactions.js ...
