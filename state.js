// --- state.js ---
// Centralized state for the entire application

export let state = {
    transactions: [],
    contacts: [],
    currentUserId: null,
    transactionsUnsubscribe: null,
    contactsUnsubscribe: null,
    currentPaymentInfo: { id: null, type: null },
    dashboardCurrentPage: 1,
    dashboardItemsPerPage: 7,
    currentStatementData: { type: null, data: [], name: '' }
};
