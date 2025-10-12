// --- state.js ---
export let state = {
    transactions: [],
    contacts: [],
    currentUserId: null,
    transactionsUnsubscribe: null,
    contactsUnsubscribe: null,
    currentPaymentInfo: { id: null, type: null },
    dashboardCurrentPage: 1,
    dashboardItemsPerPage: 7,
    statementCurrentPage: 1,
    statementItemsPerPage: 10,
    currentStatementData: { type: null, data: [], name: '' }
};
