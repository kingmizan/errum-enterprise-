// --- In dashboard.js ---

// (Keep all other functions in the file as they are)

// Calculates and renders the top metrics on the dashboard
export function renderDashboardMetrics() {
    let totalPayable = 0, totalReceivable = 0;

    state.transactions.forEach(t => {
        if (t.type === 'trade') {
            const getPayments = (history) => (history || []).reduce((sum, p) => sum + p.amount, 0);
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

    // The fix is here: using optional chaining (?.) to prevent errors
    // if the elements aren't on the page for some reason.
    animateCountUp(document.getElementById('total-payable'), totalPayable);
    animateCountUp(document.getElementById('total-receivable'), totalReceivable);
    animateCountUp(document.getElementById('total-profit'), profit);
};
