// --- dashboard.js ---
// Logic for rendering the dashboard view

import { state } from './state.js';
import { animateCountUp } from './ui.js';
import { renderAll } from './navigation.js'; // Import to handle pagination re-render

// Calculates and renders the top metrics
export function renderDashboardMetrics() {
    // ... (paste renderDashboardMetrics logic)
    // Make sure to use state.transactions and state.contacts instead of global variables
}

// Renders the paginated transaction history table
export function renderTransactionHistory() {
    // ... (paste renderTransactionHistory logic)
    // Use state.transactions and state.dashboardCurrentPage
}

// Renders the pagination controls
export function renderDashboardPaginationControls(totalItems) {
    // ... (paste renderDashboardPaginationControls logic)
    // Make sure to add event listeners that call renderAll() from navigation.js
}

// Filters transactions based on search and date inputs
export function getFilteredTransactions() {
    // ... (paste getFilteredTransactions logic)
    // Use state.transactions
}
