// js/party.js

import { checkAuth, renderHeaderAndNav, updateUserEmail } from './shared.js';
// Your other necessary imports
import { listenToContacts, listenToTransactions } from './api.js';

// This function is the entry point for the page
async function init() {
    const user = await checkAuth(); // First, ensure the user is logged in
    if (!user) return; // If not, stop loading the page

    // If logged in, build the page
    renderHeaderAndNav('party'); // Render common elements, highlighting 'party'
    updateUserEmail(user.email);

    const appContent = document.getElementById('app-content');
    appContent.innerHTML = getPartyPageTemplate(); // Render this page's specific HTML

    // Now, attach listeners and load data for this page ONLY
    listenToContacts(user.uid, (contacts) => {
        // You would have a function here to render the contacts table
        console.log("Contacts updated:", contacts);
    });
    
    listenToTransactions(user.uid, (transactions) => {
        // You might need transactions to calculate balances
        console.log("Transactions updated:", transactions);
    });

    // Attach all event listeners for this page
    initializePartyListeners();
}

function getPartyPageTemplate() {
    // This is the HTML that is UNIQUE to the party page
    return `
        <div class="bg-white dark:bg-slate-900 rounded-lg shadow-sm">
            <div class="p-4 border-b flex justify-between items-center">
                <h2 class="text-xl font-bold">Manage Party</h2>
                <button id="add-party-btn">Add New Party</button>
            </div>
            <div id="party-list-container">
                </div>
        </div>
        `;
}

function initializePartyListeners() {
    // All event listeners for the party page, like for the 'Add New Party' button
    // and for clicking on table rows, go here.
}


// Run the initialization function when the script loads
init();
