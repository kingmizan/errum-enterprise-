// --- FIREBASE & APP DEPENDENCIES ---
import { auth, db } from './firebase-config.js';
import { signInWithEmailAndPassword, onAuthStateChanged, signOut, EmailAuthProvider, reauthenticateWithCredential, updatePassword } from "https://www.gstatic.com/firebasejs/9.15.0/firebase-auth.js";
import { getFirestore, collection, onSnapshot, addDoc, doc, setDoc, deleteDoc, query, orderBy } from "https://www.gstatic.com/firebasejs/9.15.0/firebase-firestore.js";

// --- GLOBAL STATE ---
let transactions = [];
let contacts = [];
let currentUserId = null;
let transactionsUnsubscribe = null;
let contactsUnsubscribe = null;
let currentPaymentInfo = { id: null, type: null };
let dashboardCurrentPage = 1;
const dashboardItemsPerPage = 7;
let currentStatementData = { type: null, data: [], name: '' };

// --- DOM ELEMENTS ---
const loadingContainer = document.getElementById('loading-container');
const authContainer = document.getElementById('auth-container');
const appContainer = document.getElementById('app-container');
const mainContent = document.getElementById('app-content');

// --- HELPER FUNCTIONS ---
const showToast = (message) => {
    const toast = document.getElementById('toast');
    document.getElementById('toast-message').textContent = message;
    toast.classList.remove('opacity-0', 'translate-y-10');
    toast.classList.add('opacity-100', 'translate-y-0');
    setTimeout(() => {
        toast.classList.remove('opacity-100', 'translate-y-0');
        toast.classList.add('opacity-0', 'translate-y-10');
    }, 3000);
};

const animateCountUp = (el, endValue) => {
    if (!el) return;
    let startValue = 0;
    const duration = 1500;
    const startTime = performance.now();
    const formatNumber = (value) => `৳${value.toFixed(2).replace(/\d(?=(\d{3})+\.)/g, '$&,')}`;
    const step = (currentTime) => {
        const elapsedTime = currentTime - startTime;
        if (elapsedTime > duration) {
            el.textContent = formatNumber(endValue);
            return;
        }
        const progress = (elapsedTime / duration);
        const current = startValue + (endValue - startValue) * progress;
        el.textContent = formatNumber(current);
        requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
};

// --- HTML TEMPLATES ---
const templates = {
    dashboard: `
        <div class="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <div class="p-6 bg-white rounded-xl shadow-md border border-slate-200 transition-transform hover:-translate-y-1"><div class="flex items-center gap-4"><div class="p-3 rounded-lg bg-rose-100 text-rose-500"><svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" /></svg></div><div><h3 class="text-sm font-semibold text-slate-500">Total Payable</h3><p id="total-payable" class="text-3xl font-bold text-rose-500 mt-1">৳0.00</p></div></div></div>
            <div class="p-6 bg-white rounded-xl shadow-md border border-slate-200 transition-transform hover:-translate-y-1"><div class="flex items-center gap-4"><div class="p-3 rounded-lg bg-green-100 text-green-500"><svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" /></svg></div><div><h3 class="text-sm font-semibold text-slate-500">Total Receivable</h3><p id="total-receivable" class="text-3xl font-bold text-green-600 mt-1">৳0.00</p></div></div></div>
            <div class="p-6 bg-white rounded-xl shadow-md border border-slate-200 transition-transform hover:-translate-y-1"><div class="flex items-center gap-4"><div class="p-3 rounded-lg bg-cyan-100 text-cyan-500"><svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M13 17h8m0 0V9m0 8l-8-8-4 4-6-6" /></svg></div><div><h3 class="text-sm font-semibold text-slate-500">Net Balance</h3><p id="total-profit" class="text-3xl font-bold text-cyan-600 mt-1">৳0.00</p></div></div></div>
        </div>
        <div class="card">
            <div class="card-header flex flex-wrap gap-4 justify-between items-center"><h2 class="text-lg font-bold text-slate-800">Recent Transactions</h2><div class="flex flex-wrap items-center gap-2"><input id="search-input" type="text" placeholder="Search..." class="w-48 input-field"><input type="date" id="filter-start-date" class="input-field"><input type="date" id="filter-end-date" class="input-field"></div></div>
            <div id="transaction-history-mobile" class="p-4 md:hidden"></div>
            <div class="overflow-x-auto hidden md:block"><table class="w-full text-sm"><thead><tr class="border-b border-slate-200 bg-slate-50"><th class="text-left font-semibold py-3 px-4">Date</th><th class="text-left font-semibold py-3 px-4">Details</th><th class="text-right font-semibold py-3 px-4">Profit/Value</th><th class="text-right font-semibold py-3 px-4">Payable Bal</th><th class="text-right font-semibold py-3 px-4">Receivable Bal</th><th class="text-center font-semibold py-3 px-4">Actions</th></tr></thead><tbody id="transaction-history-desktop"></tbody></table></div>
            <div id="pagination-controls" class="card-footer flex justify-center items-center gap-4"></div>
        </div>`,
    contacts: `
        <div class="card">
            <div class="p-4 border-b border-slate-200 flex justify-between items-center"><h2 class="text-xl font-bold text-slate-800">Manage Party</h2><button id="add-contact-btn" class="flex items-center gap-2 px-4 py-2 rounded-lg font-semibold bg-cyan-600 text-white hover:bg-cyan-700 text-sm shadow-sm shadow-cyan-500/30"><svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M10 5a1 1 0 011 1v3h3a1 1 0 110 2h-3v3a1 1 0 11-2 0v-3H6a1 1 0 110-2h3V6a1 1 0 011-1z" clip-rule="evenodd" /></svg>Add New Party</button></div>
            <div class="overflow-x-auto"><table class="w-full text-sm responsive-table"><thead><tr class="border-b border-slate-200 bg-slate-50">
                <th class="text-left font-semibold py-3 px-4">Name</th>
                <th class="text-left font-semibold py-3 px-4">Type</th>
                <th class="text-left font-semibold py-3 px-4">Phone</th>
                <th class="text-left font-semibold py-3 px-4">Last Active</th>
                <th class="text-right font-semibold py-3 px-4">Net Balance</th>
                <th class="text-center font-semibold py-3 px-4">Actions</th>
            </tr></thead><tbody id="contacts-table-body"></tbody></table></div>
        </div>`,
    'transaction-form': `
        <div class="bg-white rounded-xl shadow-md border border-slate-200 max-w-4xl mx-auto">
            <div class="p-6 border-b border-slate-200"><h2 id="form-title" class="text-xl font-bold text-slate-800">Add New Transaction</h2></div>
            <form id="transaction-form" class="p-6">
                <input type="hidden" id="transaction-id">
                <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
                    <div class="lg:col-span-2"><label for="item" class="font-semibold text-sm">Item Details</label><input type="text" id="item" class="w-full p-2 mt-1 border border-slate-300 rounded-lg bg-slate-50" required></div>
                    <div><label for="scale-weight" class="font-semibold text-sm">Scale Weight (kg)</label><input type="number" step="any" id="scale-weight" placeholder="0.00" class="w-full p-2 mt-1 border border-slate-300 rounded-lg bg-slate-50"></div>
                    <div><label for="less" class="font-semibold text-sm">Less (kg)</label><input type="number" step="any" id="less" placeholder="0.00" class="w-full p-2 mt-1 border border-slate-300 rounded-lg bg-slate-50"></div>
                    <div><label for="net-weight" class="font-semibold text-sm">Net Weight (kg)</label><input type="number" step="any" id="net-weight" placeholder="0.00" class="w-full p-2 mt-1 border border-slate-300 rounded-lg bg-slate-100" readonly></div>
                </div>
                <div class="mt-6 grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
                    <div class="space-y-4 p-4 rounded-lg bg-slate-50 border border-slate-200">
                        <h3 class="font-bold text-lg text-rose-500">Supplier Details</h3>
                        <div><label for="supplier-select" class="font-semibold text-sm">Supplier Name</label><select id="supplier-select" class="w-full p-2 mt-1 border border-slate-300 rounded-lg bg-white" required><option value="">-- Select Supplier --</option></select></div>
                        <div><label for="vehicle-no" class="font-semibold text-sm">Vehicle No</label><input type="text" id="vehicle-no" placeholder="e.g., DHAKA-123" class="w-full p-2 mt-1 border border-slate-300 rounded-lg bg-white"></div>
                        <div><label for="supplier-rate" class="font-semibold text-sm">Supplier Rate (per kg)</label><input type="number" step="any" id="supplier-rate" placeholder="0.00" class="w-full p-2 mt-1 border border-slate-300 rounded-lg bg-white"></div>
                        <div class="grid grid-cols-2 gap-4">
                            <div><label for="paid-to-supplier" class="font-semibold text-sm">Initial Payment</label><input type="number" step="any" id="paid-to-supplier" placeholder="0.00" class="w-full p-2 mt-1 border border-slate-300 rounded-lg bg-white"></div>
                            <div><label for="paid-to-supplier-method" class="font-semibold text-sm">Method</label><select id="paid-to-supplier-method" class="w-full p-2 mt-1 border border-slate-300 rounded-lg bg-white"><option>Cash</option><option>Bank</option><option>Bkash</option><option>Rocket</option><option>Nagod</option></select></div>
                        </div>
                    </div>
                    <div class="space-y-4 p-4 rounded-lg bg-slate-50 border border-slate-200">
                        <h3 class="font-bold text-lg text-green-600">Buyer Details</h3>
                        <div><label for="buyer-select" class="font-semibold text-sm">Buyer Name</label><select id="buyer-select" class="w-full p-2 mt-1 border border-slate-300 rounded-lg bg-white" required><option value="">-- Select Buyer --</option></select></div>
                        <div><label for="buyer-rate" class="font-semibold text-sm">Buyer Rate (per kg)</label><input type="number" step="any" id="buyer-rate" placeholder="0.00" class="w-full p-2 mt-1 border border-slate-300 rounded-lg bg-white"></div>
                        <div class="grid grid-cols-2 gap-4">
                            <div><label for="received-from-buyer" class="font-semibold text-sm">Initial Payment</label><input type="number" step="any" id="received-from-buyer" placeholder="0.00" class="w-full p-2 mt-1 border border-slate-300 rounded-lg bg-white"></div>
                            <div><label for="received-from-buyer-method" class="font-semibold text-sm">Method</label><select id="received-from-buyer-method" class="w-full p-2 mt-1 border border-slate-300 rounded-lg bg-white"><option>Cash</option><option>Bank</option><option>Bkash</option><option>Rocket</option><option>Nagod</option></select></div>
                        </div>
                    </div>
                </div>
                <div class="mt-6 pt-6 border-t border-slate-200 space-y-2">
                    <div><label for="date" class="font-semibold text-sm">Transaction Date</label><input type="date" id="date" class="w-full p-2 mt-1 border border-slate-300 rounded-lg bg-slate-50" required></div>
                    <div class="flex justify-between items-center text-lg"><span class="font-semibold text-slate-500">Total Payable:</span><span id="supplier-total" class="font-bold text-rose-500">৳0.00</span></div>
                    <div class="flex justify-between items-center text-lg"><span class="font-semibold text-slate-500">Total Receivable:</span><span id="buyer-total" class="font-bold text-green-600">৳0.00</span></div>
                    <div class="flex justify-between items-center text-xl"><span class="font-semibold text-slate-800">Gross Profit on Deal:</span><span id="transaction-profit" class="font-bold text-cyan-600">৳0.00</span></div>
                </div>
                <div class="flex justify-end gap-3 pt-6 mt-4 border-t border-slate-200">
                    <button type="button" id="cancel-transaction-btn" class="px-4 py-2 rounded-lg font-semibold bg-slate-200 hover:bg-slate-300 text-sm">Cancel</button>
                    <button type="button" id="reset-form-btn" class="px-4 py-2 rounded-lg font-semibold bg-slate-200 hover:bg-slate-300 text-sm">Reset</button>
                    <button type="submit" class="px-6 py-2 rounded-lg font-semibold bg-cyan-600 text-white hover:bg-cyan-700 text-sm">Save Transaction</button>
                </div>
            </form>
        </div>`,
    statements: `
        <div>
            <div class="bg-white rounded-xl shadow-md border border-slate-200 p-6 mb-8">
                <h2 class="text-xl font-bold text-slate-800 mb-4">Generate a Statement</h2>
                <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div class="bg-slate-50 p-4 rounded-lg border border-slate-200">
                        <h3 class="font-semibold mb-2">Overall Business Statement</h3>
                        <p class="text-sm text-slate-500 mb-4">View a complete ledger of all transactions.</p>
                        <button id="generate-overall-statement-btn" class="px-4 py-2 rounded-lg font-semibold bg-cyan-600 text-white hover:bg-cyan-700 text-sm">Generate Overall</button>
                    </div>
                    <div class="bg-slate-50 p-4 rounded-lg border border-slate-200">
                        <h3 class="font-semibold mb-2">Statement by Party</h3>
                        <p class="text-sm text-slate-500 mb-4">Select a specific party to view their ledger.</p>
                        <select id="party-ledger-select" class="w-full p-2 border border-slate-300 rounded-lg bg-white">
                            <option value="">-- Select a Party --</option>
                        </select>
                    </div>
                </div>
            </div>
            <div id="statement-output">
                <div class="text-center py-12 text-slate-500">
                    <svg xmlns="http://www.w3.org/2000/svg" class="mx-auto h-12 w-12 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5"><path stroke-linecap="round" stroke-linejoin="round" d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                    <h3 class="font-semibold mt-2">No Statement Generated</h3>
                    <p>Select an option above to view a statement.</p>
                </div>
            </div>
        </div>
    `
};

// --- ALL APP FUNCTIONS ---
const appLogic = (() => {
    const getPayments = (history) => (history || []).reduce((sum, p) => sum + p.amount, 0);
    
    const getFilteredTransactions = () => {
        const searchInput = document.getElementById('search-input');
        const allSortedTransactions = [...transactions].sort((a,b) => new Date(b.date) - new Date(a.date));
        if (!searchInput) return allSortedTransactions;
        const searchTerm = searchInput.value.toLowerCase();
        const startDate = document.getElementById('filter-start-date').value;
        const endDate = document.getElementById('filter-end-date').value;
        return allSortedTransactions.filter(t => 
            (searchTerm === '' || 
            (t.item && t.item.toLowerCase().includes(searchTerm)) ||
            (t.supplierName && t.supplierName.toLowerCase().includes(searchTerm)) ||
            (t.buyerName && t.buyerName.toLowerCase().includes(searchTerm)) ||
            (t.name && t.name.toLowerCase().includes(searchTerm))) &&
            (!startDate || t.date >= startDate) && 
            (!endDate || t.date <= endDate)
        );
    };
    
    const renderDashboardPaginationControls = (totalItems) => {
        const controlsContainer = document.getElementById('pagination-controls');
        if (!controlsContainer) return;

        const totalPages = Math.ceil(totalItems / dashboardItemsPerPage);
        if (totalPages <= 1) {
            controlsContainer.innerHTML = '';
            return;
        }

        const prevDisabled = dashboardCurrentPage === 1 ? 'disabled' : '';
        const nextDisabled = dashboardCurrentPage === totalPages ? 'disabled' : '';

        controlsContainer.innerHTML = `
            <button id="prev-page-btn" class="px-3 py-1 text-sm rounded-md font-semibold bg-slate-200 hover:bg-slate-300 disabled:opacity-50" ${prevDisabled}>Previous</button>
            <span class="text-sm font-semibold">Page ${dashboardCurrentPage} of ${totalPages}</span>
            <button id="next-page-btn" class="px-3 py-1 text-sm rounded-md font-semibold bg-slate-200 hover:bg-slate-300 disabled:opacity-50" ${nextDisabled}>Next</button>
        `;

        document.getElementById('prev-page-btn')?.addEventListener('click', () => {
            if (dashboardCurrentPage > 1) {
                dashboardCurrentPage--;
                renderAll();
            }
        });

        document.getElementById('next-page-btn')?.addEventListener('click', () => {
            if (dashboardCurrentPage < totalPages) {
                dashboardCurrentPage++;
                renderAll();
            }
        });
    };

    const renderDashboardMetrics = (data) => {
        let totalPayable = 0, totalReceivable = 0;

        transactions.forEach(t => { 
            if (t.type === 'trade') {
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

        contacts.forEach(c => {
            if (c.openingBalance && c.openingBalance.amount > 0) {
                if (c.openingBalance.type === 'payable') {
                    totalPayable += c.openingBalance.amount;
                } else {
                    totalReceivable += c.openingBalance.amount;
                }
            }
        });

        const profit = totalReceivable - totalPayable;
        
        animateCountUp(document.getElementById('total-payable'), totalPayable);
        animateCountUp(document.getElementById('total-receivable'), totalReceivable);
        animateCountUp(document.getElementById('total-profit'), profit);
    };

    const renderTransactionHistory = (data) => {
        const mobileContainer = document.getElementById('transaction-history-mobile');
        const desktopContainer = document.getElementById('transaction-history-desktop');
        if (!mobileContainer || !desktopContainer) return;

        const startIndex = (dashboardCurrentPage - 1) * dashboardItemsPerPage;
        const endIndex = startIndex + dashboardItemsPerPage;
        const pageData = data.slice(startIndex, endIndex);

        mobileContainer.innerHTML = '';
        desktopContainer.innerHTML = '';

        if (pageData.length === 0) {
            const emptyState = `<div class="text-center py-12 text-slate-500"><div class="flex flex-col items-center gap-2"><svg xmlns="http://www.w3.org/2000/svg" class="h-12 w-12 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5"><path stroke-linecap="round" stroke-linejoin="round" d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" /></svg><h3 class="font-semibold mt-2">No Transactions Found</h3><p>Your recorded transactions will appear here.</p></div></div>`;
            mobileContainer.innerHTML = emptyState;
            desktopContainer.innerHTML = `<tr><td colspan="6">${emptyState}</td></tr>`;
            return;
        }

        pageData.forEach(t => {
            // Mobile Card
            const card = document.createElement('div');
            card.className = 'card cursor-pointer hover:shadow-md transition-shadow duration-300 mb-4';
            card.dataset.id = t.id;

            let icon, title, subtitle, amount, amountColor;

            if (t.type === 'trade') {
                icon = `<svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" /></svg>`;
                title = t.item;
                subtitle = `${t.supplierName} → ${t.buyerName}`;
                amount = `৳${(t.profit || 0).toFixed(2)}`;
                amountColor = 'text-blue-600';
            } else if (t.type === 'payment') {
                if (t.paymentType === 'made') {
                    icon = `<svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M5 10l7-7m0 0l7 7m-7-7v18" /></svg>`;
                    amountColor = 'text-rose-500';
                } else { // received
                    icon = `<svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M19 14l-7 7m0 0l-7-7m7 7V3" /></svg>`;
                    amountColor = 'text-green-600';
                }
                title = t.description;
                subtitle = t.name;
                amount = `৳${(t.amount || 0).toFixed(2)}`;
            }

            card.innerHTML = `
                <div class="p-4 flex items-center">
                    <div class="mr-4 p-3 rounded-full bg-slate-100 ${amountColor}">${icon}</div>
                    <div class="flex-grow">
                        <div class="font-bold text-slate-800">${title}</div>
                        <div class="text-sm text-slate-500">${subtitle}</div>
                    </div>
                    <div class="text-right">
                        <div class="font-bold text-lg ${amountColor}">${amount}</div>
                        <div class="text-sm text-slate-500">${t.date}</div>
                    </div>
                </div>
            `;
            mobileContainer.appendChild(card);

            // Desktop Row
            const row = document.createElement('tr');
            row.className = 'hover:bg-slate-50 border-b border-slate-200 last:border-b-0 cursor-pointer';
            row.dataset.id = t.id;

            let detailsHtml, valueHtml, payableBalHtml, receivableBalHtml, actionsHtml;

            if (t.type === 'trade') {
                const paidToSupplier = getPayments(t.paymentsToSupplier);
                const receivedFromBuyer = getPayments(t.paymentsFromBuyer);
                const payableBalance = t.supplierTotal - paidToSupplier;
                const receivableBalance = t.buyerTotal - receivedFromBuyer;
                detailsHtml = `<div class="font-medium text-slate-800">${t.item}</div><div class="text-xs text-slate-500">${t.supplierName} → ${t.buyerName}</div>`;
                valueHtml = `৳${(t.profit || 0).toFixed(2)}`;
                payableBalHtml = `<span class="font-semibold ${payableBalance > 0.01 ? 'text-rose-500' : 'text-slate-500'}">৳${payableBalance.toFixed(2)}</span>`;
                receivableBalHtml = `<span class="font-semibold ${receivableBalance > 0.01 ? 'text-green-600' : 'text-slate-500'}">৳${receivableBalance.toFixed(2)}</span>`;

                actionsHtml = `<div class="flex justify-end md:justify-center items-center gap-2">
                    <button title="Edit" data-edit-id="${t.id}" class="p-1 text-blue-600 hover:bg-blue-100 rounded-full"><svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg></button>
                    <button title="Delete" data-delete-id="${t.id}" class="p-1 text-rose-500 hover:bg-rose-100 rounded-full"><svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg></button>
                </div>`;
            } else if (t.type === 'payment') {
                detailsHtml = `<div class="font-medium text-slate-800">${t.description} (${t.paymentType})</div><div class="text-xs text-slate-500">${t.name}</div>`;
                valueHtml = `৳${(t.amount || 0).toFixed(2)}`;
                payableBalHtml = '<span class="text-slate-400">-</span>';
                receivableBalHtml = '<span class="text-slate-400">-</span>';
                actionsHtml = `<div class="flex justify-end md:justify-center items-center gap-1">
                    <button title="Delete" data-delete-id="${t.id}" class="p-1 text-rose-500 hover:bg-rose-100 rounded-full"><svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg></button>
                </div>`;
            }

            row.innerHTML = `
                <td data-label="Date" class="py-4 px-4 align-top">${t.date}</td>
                <td data-label="Details" class="py-4 px-4 align-top">${detailsHtml}</td>
                <td data-label="Profit/Value" class="py-4 px-4 align-top text-right font-medium">${valueHtml}</td>
                <td data-label="Payable Bal" class="py-4 px-4 align-top text-right">${payableBalHtml}</td>
                <td data-label="Receivable Bal" class="py-4 px-4 align-top text-right">${receivableBalHtml}</td>
                <td data-label="Actions" class="py-4 px-4 align-top actions-cell">${actionsHtml}</td>
            `;
            desktopContainer.appendChild(row);
        });
    };

    const renderContacts = () => {
        const tbody = document.getElementById('contacts-table-body'); if (!tbody) return; tbody.innerHTML = '';
        if (contacts.length === 0) { tbody.innerHTML = `<tr><td colspan="6" class="text-center py-12 text-slate-500">No contacts found. Add one to get started!</td></tr>`; return; }
        
        contacts.forEach(c => {
            let netBalance = 0;
            if (c.openingBalance && c.openingBalance.amount > 0) {
                netBalance = c.openingBalance.type === 'receivable' ? c.openingBalance.amount : -c.openingBalance.amount;
            }
            const relatedTransactions = transactions.filter(t => t.supplierName === c.name || t.buyerName === c.name || t.name === c.name);
            relatedTransactions.forEach(t => {
                if (t.type === 'trade') {
                    if (t.supplierName === c.name) netBalance -= (t.supplierTotal - getPayments(t.paymentsToSupplier));
                    if (t.buyerName === c.name) netBalance += (t.buyerTotal - getPayments(t.paymentsFromBuyer));
                } else if (t.type === 'payment' && t.name === c.name) {
                    if (t.paymentType === 'made') netBalance += t.amount;
                    else netBalance -= t.amount;
                }
            });

            let lastTransactionDate = '<span class="text-slate-400">N/A</span>';
            if (relatedTransactions.length > 0) {
                relatedTransactions.sort((a, b) => new Date(b.date) - new Date(a.date));
                lastTransactionDate = relatedTransactions[0].date;
            }

            const balanceText = `৳${Math.abs(netBalance).toFixed(2)}`;
            let balanceClass = 'text-slate-500';
            if (netBalance > 0.01) balanceClass = 'text-green-600';
            else if (netBalance < -0.01) balanceClass = 'text-rose-500';

            let typeBadge;
            if (c.type === 'buyer') {
                typeBadge = `<span class="inline-flex items-center gap-1.5 py-1 px-2.5 rounded-full text-xs font-medium bg-cyan-100 text-cyan-800">
                    <svg xmlns="http://www.w3.org/2000/svg" class="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M15 13l-3 3m0 0l-3-3m3 3V8m0 13a9 9 0 110-18 9 9 0 010 18z" /></svg>
                    Buyer
                </span>`;
            } else {
                typeBadge = `<span class="inline-flex items-center gap-1.5 py-1 px-2.5 rounded-full text-xs font-medium bg-slate-100 text-slate-800">
                    <svg xmlns="http://www.w3.org/2000/svg" class="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M9 11l3-3m0 0l3 3m-3-3v8m0-13a9 9 0 110-18 9 9 0 010 18z" /></svg>
                    Supplier
                </span>`;
            }
            
            const row = document.createElement('tr'); row.className = 'hover:bg-slate-50 border-b border-slate-200 md:border-b-0';
            row.innerHTML = `<td data-label="Name" class="py-4 px-4 align-middle">
                                <button data-ledger-id="${c.id}" class="font-medium text-slate-800 hover:text-cyan-600 text-left cursor-pointer">${c.name}</button>
                               </td>
                               <td data-label="Type" class="py-4 px-4 align-middle">${typeBadge}</td>
                               <td data-label="Phone" class="py-4 px-4 align-middle">${c.phone || 'N/A'}</td>
                               <td data-label="Last Active" class="py-4 px-4 align-middle font-medium text-slate-600">${lastTransactionDate}</td>
                               <td data-label="Net Balance" class="py-4 px-4 align-middle font-bold text-right ${balanceClass}">${balanceText}</td>
                               <td data-label="Actions" class="py-4 px-4 align-middle actions-cell">
                                <div class="flex justify-end md:justify-center items-center gap-1">
                                    <button title="Add Direct Payment" data-direct-payment-id="${c.id}" class="p-1 text-cyan-600 hover:bg-cyan-100 rounded-full"><svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-11a1 1 0 10-2 0v2H7a1 1 0 100 2h2v2a1 1 0 102 0v-2h2a1 1 0 100-2h-2V7z" clip-rule="evenodd" /></svg></button>
                                    <button title="Edit Contact" data-edit-contact-id="${c.id}" class="p-1 text-blue-600 hover:bg-blue-100 rounded-full"><svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg></button>
                                    <button title="Delete Contact" data-delete-contact-id="${c.id}" class="p-1 text-rose-500 hover:bg-rose-100 rounded-full"><svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg></button>
                                </div>
                               </td>`;
            tbody.appendChild(row);
        });
    };

    const renderAll = () => { 
        const data = getFilteredTransactions(); 
        renderDashboardMetrics(data); 
        renderTransactionHistory(data); 
        renderDashboardPaginationControls(data.length);
    };
    const resetContactForm = () => {
        document.getElementById('contact-form-title').textContent = 'Add New Party'; 
        document.getElementById('contact-form').reset(); 
        document.getElementById('contact-id').value = ''; 
        document.getElementById('contact-opening-balance').disabled = false;
        document.querySelectorAll('input[name="opening-balance-type"]').forEach(el => el.disabled = false);
    };
    const setupContactFormForEdit = (id) => {
        const contact = contacts.find(c => c.id === id); if (!contact) return; 
        resetContactForm();
        document.getElementById('contact-form-title').textContent = 'Edit Party'; 
        document.getElementById('contact-id').value = contact.id;
        document.getElementById('contact-name').value = contact.name; 
        document.getElementById('contact-phone').value = contact.phone;
        document.getElementById('contact-address').value = contact.address || '';
        document.querySelector(`#contact-form input[name="contact-type"][value="${contact.type}"]`).checked = true; 
        
        const balanceInput = document.getElementById('contact-opening-balance');
        const balanceTypeRadios = document.querySelectorAll('input[name="opening-balance-type"]');
        if(contact.openingBalance) {
            balanceInput.value = contact.openingBalance.amount;
            document.querySelector(`input[name="opening-balance-type"][value="${contact.openingBalance.type}"]`).checked = true;
        }
        balanceInput.disabled = true;
        balanceTypeRadios.forEach(el => el.disabled = true);
        
        document.getElementById('contact-modal').classList.remove('hidden');
    };
    const handleSaveContact = async (e) => {
        e.preventDefault();
        const id = document.getElementById('contact-id').value;
        const name = document.getElementById('contact-name').value.trim();
        if (!name) { showToast('Contact name is required.'); return; }
        if (!id && contacts.some(c => c.name.toLowerCase() === name.toLowerCase())) { showToast('A contact with this name already exists.'); return; }
        
        const contactData = { 
            name: name, 
            type: document.querySelector('#contact-form input[name="contact-type"]:checked').value, 
            phone: document.getElementById('contact-phone').value.trim(),
            address: document.getElementById('contact-address').value.trim() 
        };

        if (!id) {
            const openingBalanceAmount = parseFloat(document.getElementById('contact-opening-balance').value) || 0;
            if (openingBalanceAmount > 0) {
                contactData.openingBalance = {
                    amount: openingBalanceAmount,
                    type: document.querySelector('input[name="opening-balance-type"]:checked').value
                };
            }
        }
        
        try {
            if (id) {
                const oldName = contacts.find(c => c.id === id)?.name;
                if (oldName && oldName !== name) {
                    if (transactions.some(t => t.name === oldName || t.supplierName === oldName || t.buyerName === oldName)) { 
                        showToast('Cannot rename contact with existing transactions.'); 
                        return; 
                    }
                }
                await setDoc(doc(db, "users", currentUserId, "contacts", id), contactData, { merge: true }); showToast('Contact updated!');
            } else {
                await addDoc(collection(db, "users", currentUserId, "contacts"), contactData); showToast('Contact added!');
            }
        } catch (error) {
            showToast('Error: Could not save contact.');
            console.error("Error saving contact: ", error);
        }
        document.getElementById('contact-modal').classList.add('hidden');
    };
    const handleDeleteContact = async (id) => {
        const contact = contacts.find(c => c.id === id); if (!contact) return;
        if(transactions.some(t => t.name === contact.name || t.supplierName === contact.name || t.buyerName === contact.name)){ 
            showToast('Cannot delete contact with existing transactions.'); 
            return; 
        }
        if (confirm('Are you sure? This action cannot be undone.')) { await deleteDoc(doc(db, "users", currentUserId, "contacts", id)); showToast('Contact deleted.'); }
    };
    
    // --- TRANSACTION & PAYMENT LOGIC ---
    const populateTradeDropdowns = () => {
        const supplierSelect = document.getElementById('supplier-select');
        const buyerSelect = document.getElementById('buyer-select');
        if (!supplierSelect || !buyerSelect) return;

        const suppliers = contacts.filter(c => c.type === 'supplier');
        const buyers = contacts.filter(c => c.type === 'buyer');

        supplierSelect.innerHTML = '<option value="">-- Select Supplier --</option>';
        suppliers.forEach(c => { const option = document.createElement('option'); option.value = c.name; option.textContent = c.name; supplierSelect.appendChild(option); });
        
        buyerSelect.innerHTML = '<option value="">-- Select Buyer --</option>';
        buyers.forEach(c => { const option = document.createElement('option'); option.value = c.name; option.textContent = c.name; buyerSelect.appendChild(option); });
    };

    const updateTradeTotals = () => {
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

    const calculateNetWeight = () => {
        const scaleWeight = parseFloat(document.getElementById('scale-weight').value) || 0;
        const less = parseFloat(document.getElementById('less').value) || 0;
        const netWeight = scaleWeight - less;
        const netWeightInput = document.getElementById('net-weight');
        if (netWeightInput) {
            netWeightInput.value = netWeight > 0 ? netWeight.toFixed(2) : '0.00';
            updateTradeTotals(); 
        }
    };

    const resetTradeForm = () => { 
        document.getElementById('form-title').textContent = 'Add New Transaction';
        const form = document.getElementById('transaction-form');
        if (form) {
            form.reset(); 
            document.getElementById('transaction-id').value = '';
        }
        calculateNetWeight(); 
    };

    const setupTradeFormForEdit = (id) => {
        const t = transactions.find(t => t.id === id); if (!t || t.type !== 'trade') return;
        
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
        const initialPaymentToSupplier = getPayments(t.paymentsToSupplier);
        document.getElementById('paid-to-supplier').value = initialPaymentToSupplier > 0 ? initialPaymentToSupplier : '';
        if(t.paymentsToSupplier && t.paymentsToSupplier[0]) {
             document.getElementById('paid-to-supplier-method').value = t.paymentsToSupplier[0].method;
        }

        document.getElementById('buyer-rate').value = t.buyerRate;
        const initialPaymentFromBuyer = getPayments(t.paymentsFromBuyer);
        document.getElementById('received-from-buyer').value = initialPaymentFromBuyer > 0 ? initialPaymentFromBuyer : '';
        if(t.paymentsFromBuyer && t.paymentsFromBuyer[0]) {
             document.getElementById('received-from-buyer-method').value = t.paymentsFromBuyer[0].method;
        }

        updateTradeTotals();
    };

    const handleTradeFormSubmit = async (e) => {
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

        const paidToSupplier = parseFloat(document.getElementById('paid-to-supplier').value) || 0;
        const receivedFromBuyer = parseFloat(document.getElementById('received-from-buyer').value) || 0;

        if (paidToSupplier > transactionData.supplierTotal + 0.01) { showToast('Paid amount cannot exceed supplier total.'); return; }
        if (receivedFromBuyer > transactionData.buyerTotal + 0.01) { showToast('Received amount cannot exceed buyer total.'); return; }
        
        const paymentsToSupplier = [];
        if (paidToSupplier > 0) { 
            const method = document.getElementById('paid-to-supplier-method').value;
            paymentsToSupplier.push({ date: transactionData.date, amount: paidToSupplier, method: method }); 
        }
        transactionData.paymentsToSupplier = paymentsToSupplier;
        
        const paymentsFromBuyer = [];
        if (receivedFromBuyer > 0) { 
            const method = document.getElementById('received-from-buyer-method').value;
            paymentsFromBuyer.push({ date: transactionData.date, amount: receivedFromBuyer, method: method }); 
        }
        transactionData.paymentsFromBuyer = paymentsFromBuyer;

        try {
            if (id) {
                await setDoc(doc(db, "users", currentUserId, "transactions", id), transactionData);
                showToast('Transaction Updated!');
            } else {
                await addDoc(collection(db, "users", currentUserId, "transactions"), transactionData);
                showToast('Transaction Saved!');
            }
            navigateTo('dashboard');
        } catch (error) {
            showToast("Error: Could not save transaction.");
            console.error("Transaction save error: ", error);
        }
    };

    const handleDelete = async (id) => { if (confirm('Are you sure? This will permanently delete the transaction.')) { await deleteDoc(doc(db, "users", currentUserId, "transactions", id)); showToast('Transaction deleted.'); } };
    
    const openPaymentModal = (id, type) => {
        currentPaymentInfo = { id, type };
        const t = transactions.find(t => t.id === id);
        if (!t) return;
        
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
    
    const handleSavePayment = async () => {
        const { id, type } = currentPaymentInfo;
        if (!id || !type) return;

        const paymentAmount = parseFloat(document.getElementById('payment-amount').value);
        if (isNaN(paymentAmount) || paymentAmount <= 0) { showToast('Please enter a valid amount.'); return; }
        
        const t = transactions.find(t => t.id === id);
        if (!t) return;

        const newPayment = {
            date: document.getElementById('payment-date').value,
            amount: paymentAmount,
            method: document.getElementById('partial-payment-method').value
        };

        let balance = 0, history = [];
        try {
            if (type === 'toSupplier') {
                balance = t.supplierTotal - getPayments(t.paymentsToSupplier);
                history = [...(t.paymentsToSupplier || []), newPayment];
                if (paymentAmount > balance + 0.01) { showToast('Payment exceeds balance.'); return; }
                await setDoc(doc(db, "users", currentUserId, "transactions", id), { paymentsToSupplier: history }, { merge: true });
            } else if (type === 'fromBuyer') {
                balance = t.buyerTotal - getPayments(t.paymentsFromBuyer);
                history = [...(t.paymentsFromBuyer || []), newPayment];
                if (paymentAmount > balance + 0.01) { showToast('Payment exceeds balance.'); return; }
                await setDoc(doc(db, "users", currentUserId, "transactions", id), { paymentsFromBuyer: history }, { merge: true });
            }
            showToast('Payment recorded!'); document.getElementById('payment-modal').classList.add('hidden');
        } catch (error) {
            showToast('Error: Could not save payment.');
            console.error("Error saving payment: ", error);
        }
    };

    const openDirectPaymentModal = (contactId) => {
        const contact = contacts.find(c => c.id === contactId);
        if (!contact) return;
        document.getElementById('direct-payment-modal-title').textContent = `Add Direct Payment for ${contact.name}`;
        document.getElementById('direct-payment-contact-id').value = contact.id;
        document.getElementById('direct-payment-contact-name').value = contact.name;
        document.getElementById('direct-payment-date').value = new Date().toISOString().split('T')[0];
        
        const madeRadio = document.querySelector('input[name="direct-payment-type"][value="made"]');
        const receivedRadio = document.querySelector('input[name="direct-payment-type"][value="received"]');
        if (contact.type === 'supplier') {
            madeRadio.checked = true;
        } else {
            receivedRadio.checked = true;
        }

        document.getElementById('direct-payment-modal').classList.remove('hidden');
    };

    const handleDirectPaymentSubmit = async (e) => {
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
            showToast('Please fill out all fields.'); return;
        }
        try {
            await addDoc(collection(db, "users", currentUserId, "transactions"), paymentData);
            showToast(`Payment for ${contactName} saved!`);
            document.getElementById('direct-payment-form').reset();
            document.getElementById('direct-payment-modal').classList.add('hidden');
        } catch (error) {
            showToast('Error: Could not save direct payment.');
            console.error("Error saving direct payment: ", error);
        }
    };
    
    const renderContactLedger = (id) => {
        const contact = contacts.find(c => c.id === id);
        if (!contact) return;

        let ledgerItems = [];
        if (contact.openingBalance && contact.openingBalance.amount > 0) {
            ledgerItems.push({
                date: '0000-01-01', description: 'Opening Balance', vehicleNo: '-', scaleWeight: 0, netWeight: 0, rate: 0,
                debit: contact.openingBalance.type === 'receivable' ? contact.openingBalance.amount : 0,
                credit: contact.openingBalance.type === 'payable' ? contact.openingBalance.amount : 0,
            });
        }
        transactions.forEach(t => {
            if (t.type === 'trade') {
                if (t.supplierName === contact.name) {
                    ledgerItems.push({ date: t.date, description: `Purchase: ${t.item}`, vehicleNo: t.vehicleNo || '-', scaleWeight: t.scaleWeight || 0, netWeight: t.netWeight || t.weight || 0, rate: t.supplierRate || 0, debit: 0, credit: t.supplierTotal });
                    (t.paymentsToSupplier || []).forEach(p => ledgerItems.push({ date: p.date, description: `Payment Made (${p.method})`, vehicleNo: '-', scaleWeight: 0, netWeight: 0, rate: 0, debit: p.amount, credit: 0 }));
                }
                if (t.buyerName === contact.name) {
                    ledgerItems.push({ date: t.date, description: `Sale: ${t.item}`, vehicleNo: t.vehicleNo || '-', scaleWeight: t.scaleWeight || 0, netWeight: t.netWeight || t.weight || 0, rate: t.buyerRate || 0, debit: t.buyerTotal, credit: 0 });
                    (t.paymentsFromBuyer || []).forEach(p => ledgerItems.push({ date: p.date, description: `Payment Received (${p.method})`, vehicleNo: '-', scaleWeight: 0, netWeight: 0, rate: 0, debit: 0, credit: p.amount }));
                }
            } else if (t.type === 'payment' && t.name === contact.name) {
                ledgerItems.push({ date: t.date, description: `Direct Payment - ${t.description}`, vehicleNo: '-', scaleWeight: 0, netWeight: 0, rate: 0, debit: t.paymentType === 'made' ? t.amount : 0, credit: t.paymentType === 'received' ? t.amount : 0 });
            }
        });
        
        ledgerItems.sort((a, b) => new Date(a.date) - new Date(b.date));
        currentStatementData = { type: 'contact', data: ledgerItems, name: contact.name };

        let runningBalance = 0;
        const ledgerRows = ledgerItems.map(item => {
            runningBalance += (item.debit - item.credit);
            const bal = runningBalance > 0.01 ? `৳${runningBalance.toFixed(2)} Dr` : runningBalance < -0.01 ? `৳${Math.abs(runningBalance).toFixed(2)} Cr` : '৳0.00';
            return `<tr class="border-b border-slate-200 text-sm">
                <td class="p-2 whitespace-nowrap">${item.date === '0000-01-01' ? 'Initial' : item.date}</td><td class="p-2">${item.description}</td><td class="p-2">${item.vehicleNo}</td>
                <td class="p-2 text-right">${item.scaleWeight > 0 ? item.scaleWeight.toFixed(2) : ''}</td><td class="p-2 text-right">${item.netWeight > 0 ? item.netWeight.toFixed(2) : ''}</td>
                <td class="p-2 text-right">${item.rate > 0 ? `＠${item.rate.toFixed(2)}` : ''}</td><td class="p-2 text-right text-green-600">${item.debit > 0 ? `৳${item.debit.toFixed(2)}` : ''}</td>
                <td class="p-2 text-right text-rose-500">${item.credit > 0 ? `৳${item.credit.toFixed(2)}` : ''}</td><td class="p-2 text-right font-semibold">${bal}</td>
            </tr>`;
        }).join('');
        
        const finalBalance = runningBalance;
        const balanceStatus = finalBalance > 0.01 ? "Receivable" : (finalBalance < -0.01 ? "Payable" : "Settled");
        const balanceClass = finalBalance > 0.01 ? 'text-green-500' : (finalBalance < -0.01 ? 'text-rose-500' : 'text-slate-500');

        document.getElementById('statement-output').innerHTML = `
            <div id="statement-to-export" class="bg-white rounded-xl shadow-md border border-slate-200 p-6">
                <div class="flex justify-between items-center mb-4 border-b border-slate-200 pb-4">
                    <div>
                        <h2 class="text-xl font-bold text-slate-800">Account Ledger: ${contact.name}</h2>
                        <p class="text-sm text-slate-500">${contact.type.charAt(0).toUpperCase() + contact.type.slice(1)}</p>
                    </div>
                    <div class="flex items-center gap-2">
                        <button id="statement-csv-btn" class="px-3 py-1.5 text-sm rounded-md font-semibold bg-slate-200 hover:bg-slate-300">CSV</button>
                        <button id="statement-png-btn" class="px-3 py-1.5 text-sm rounded-md font-semibold bg-slate-200 hover:bg-slate-300">PNG</button>
                        <button id="statement-pdf-btn" class="px-3 py-1.5 text-sm rounded-md font-semibold bg-slate-200 hover:bg-slate-300">PDF</button>
                    </div>
                </div>
                <div class="overflow-x-auto">
                    <table class="min-w-full text-xs sm:text-sm mb-6">
                        <thead class="bg-slate-100"><tr>
                            <th class="text-left p-2">Date</th><th class="text-left p-2">Product</th><th class="text-left p-2">Vehicle</th>
                            <th class="text-right p-2">Scale Wt.</th><th class="text-right p-2">Net Wt.</th><th class="text-right p-2">Rate</th>
                            <th class="text-right p-2">Debit (+)</th><th class="text-right p-2">Credit (-)</th><th class="text-right p-2">Balance</th>
                        </tr></thead>
                        <tbody>${ledgerRows}</tbody>
                    </table>
                </div>
                <div class="flex justify-end"><div class="w-full md:w-1/2 text-right">
                    <div class="flex justify-between font-bold text-lg border-t border-slate-200 pt-2 mt-2">
                        <span>Final Balance (${balanceStatus}):</span><span class="${balanceClass}">৳${Math.abs(finalBalance).toFixed(2)}</span>
                    </div>
                </div></div>
            </div>`;
        bindStatementExportButtons();
    };
    
    const renderOverallStatement = () => {
        let ledgerItems = [];
        contacts.forEach(c => {
            if (c.openingBalance && c.openingBalance.amount > 0) {
                ledgerItems.push({
                    date: '0000-01-01', supplierName: `Opening Balance - ${c.name}`,
                    debit: c.openingBalance.type === 'receivable' ? c.openingBalance.amount : 0,
                    credit: c.openingBalance.type === 'payable' ? c.openingBalance.amount : 0,
                });
            }
        });
        transactions.forEach(t => {
            if (t.type === 'trade') {
                const initialDebit = (t.paymentsFromBuyer?.[0]?.date === t.date) ? t.paymentsFromBuyer[0].amount : 0;
                const initialCredit = (t.paymentsToSupplier?.[0]?.date === t.date) ? t.paymentsToSupplier[0].amount : 0;
                ledgerItems.push({ date: t.date, supplierName: t.supplierName, supplierNetWeight: t.netWeight, supplierRate: t.supplierRate, supplierValue: t.supplierTotal, buyerName: t.buyerName, buyerNetWeight: t.netWeight, buyerRate: t.buyerRate, buyerValue: t.buyerTotal, profit: t.profit, debit: initialDebit, credit: initialCredit });
                (t.paymentsFromBuyer || []).slice(initialDebit ? 1 : 0).forEach(p => ledgerItems.push({ date: p.date, supplierName: `(Payment from ${t.buyerName})`, debit: p.amount, credit: 0 }));
                (t.paymentsToSupplier || []).slice(initialCredit ? 1 : 0).forEach(p => ledgerItems.push({ date: p.date, supplierName: `(Payment to ${t.supplierName})`, debit: 0, credit: p.amount }));
            } else if (t.type === 'payment') {
                ledgerItems.push({ date: t.date, supplierName: `(${t.description}) - ${t.name}`, debit: t.paymentType === 'received' ? t.amount : 0, credit: t.paymentType === 'made' ? t.amount : 0 });
            }
        });
        
        ledgerItems.sort((a, b) => new Date(a.date) - new Date(b.date));
        let runningBalance = 0;
        ledgerItems.forEach(item => {
            runningBalance += (item.debit || 0) - (item.credit || 0);
            item.balance = runningBalance;
        });
        
        currentStatementData = { type: 'overall', data: ledgerItems, name: 'Overall' };

        const rows = ledgerItems.map(item => {
            const bal = item.balance >= 0 ? `৳${item.balance.toFixed(2)}` : `(৳${Math.abs(item.balance).toFixed(2)})`;
            return `<tr class="border-b border-slate-200 text-sm">
                <td class="p-2 whitespace-nowrap">${item.date === '0000-01-01' ? 'Opening' : item.date}</td><td class="p-2">${item.supplierName || ''}</td>
                <td class="p-2 text-right">${item.supplierNetWeight ? item.supplierNetWeight.toFixed(2) : ''}</td><td class="p-2 text-right">${item.supplierRate ? `＠${item.supplierRate.toFixed(2)}` : ''}</td>
                <td class="p-2 text-right">${item.supplierValue ? `৳${item.supplierValue.toFixed(2)}` : ''}</td><td class="p-2">${item.buyerName || ''}</td>
                <td class="p-2 text-right">${item.buyerNetWeight ? item.buyerNetWeight.toFixed(2) : ''}</td><td class="p-2 text-right">${item.buyerRate ? `＠${item.buyerRate.toFixed(2)}` : ''}</td>
                <td class="p-2 text-right">${item.buyerValue ? `৳${item.buyerValue.toFixed(2)}` : ''}</td><td class="p-2 text-right">${item.profit !== undefined ? `৳${item.profit.toFixed(2)}` : ''}</td>
                <td class="p-2 text-right text-green-600">${item.debit ? `৳${item.debit.toFixed(2)}` : ''}</td><td class="p-2 text-right text-rose-500">${item.credit ? `৳${item.credit.toFixed(2)}` : ''}</td>
                <td class="p-2 text-right font-semibold">${bal}</td>
            </tr>`;
        }).join('');

        document.getElementById('statement-output').innerHTML = `
            <div id="statement-to-export" class="bg-white rounded-xl shadow-md border border-slate-200 p-6">
                <div class="flex justify-between items-center mb-4 border-b border-slate-200 pb-4">
                    <h2 class="text-xl font-bold text-slate-800">Overall Statement</h2>
                    <div class="flex items-center gap-2">
                        <button id="statement-csv-btn" class="px-3 py-1.5 text-sm rounded-md font-semibold bg-slate-200 hover:bg-slate-300">CSV</button>
                        <button id="statement-png-btn" class="px-3 py-1.5 text-sm rounded-md font-semibold bg-slate-200 hover:bg-slate-300">PNG</button>
                        <button id="statement-pdf-btn" class="px-3 py-1.5 text-sm rounded-md font-semibold bg-slate-200 hover:bg-slate-300">PDF</button>
                    </div>
                </div>
                <div class="overflow-x-auto">
                    <table class="min-w-full text-xs sm:text-sm mb-6">
                        <thead class="bg-slate-100">
                            <tr>
                                <th rowspan="2" class="text-left p-2 border border-slate-200">Date</th><th colspan="4" class="text-center p-2 border border-slate-200">Supplier Details</th>
                                <th colspan="4" class="text-center p-2 border border-slate-200">Buyer Details</th><th rowspan="2" class="text-right p-2 border border-slate-200">Profit</th>
                                <th rowspan="2" class="text-right p-2 border border-slate-200">Debit (In)</th><th rowspan="2" class="text-right p-2 border border-slate-200">Credit (Out)</th>
                                <th rowspan="2" class="text-right p-2 border border-slate-200">Balance</th>
                            </tr>
                            <tr>
                                <th class="text-left p-2 border border-slate-200">Name / Particulars</th><th class="text-right p-2 border border-slate-200">Net Wt.</th>
                                <th class="text-right p-2 border border-slate-200">Rate</th><th class="text-right p-2 border border-slate-200">Value</th>
                                <th class="text-left p-2 border border-slate-200">Name</th><th class="text-right p-2 border border-slate-200">Net Wt.</th>
                                <th class="text-right p-2 border border-slate-200">Rate</th><th class="text-right p-2 border border-slate-200">Value</th>
                            </tr>
                        </thead>
                        <tbody>${rows}</tbody>
                    </table>
                </div>
            </div>`;
        bindStatementExportButtons();
    };

    const handleContentExport = async (format) => {
        const { type, data, name } = currentStatementData;
        if (!data || data.length === 0) {
            showToast('No data to export.');
            return;
        }

        const filename = `Statement-${name}-${new Date().toISOString().slice(0, 10)}`;

        if (format === 'png') {
            const content = document.getElementById('statement-to-export');
            if (!content) { showToast('Could not find content to export.'); return; }
            showToast(`Generating PNG...`);
            const canvas = await html2canvas(content, { scale: 2, backgroundColor: '#ffffff' });
            const link = document.createElement('a');
            link.download = `${filename}.png`;
            link.href = canvas.toDataURL();
            link.click();
        
        } else if (format === 'pdf') {
            showToast(`Generating PDF...`);
            const { jsPDF } = window.jspdf;
            const doc = new jsPDF({ orientation: 'l', unit: 'pt', format: 'a4' });
            
            const head = [];
            const body = [];
            let finalBalance = 0;

            if (type === 'contact') {
                head.push(['Date', 'Description', 'Vehicle', 'Net Wt.', 'Rate', 'Debit', 'Credit', 'Balance']);
                let runningBalance = 0;
                data.forEach(item => {
                    runningBalance += (item.debit || 0) - (item.credit || 0);
                    const bal = runningBalance > 0.01 ? `${runningBalance.toFixed(2)} Dr` : runningBalance < -0.01 ? `${Math.abs(runningBalance).toFixed(2)} Cr` : '0.00';
                    body.push([
                        item.date === '0000-01-01' ? 'Initial' : item.date,
                        item.description, item.vehicleNo, item.netWeight > 0 ? item.netWeight.toFixed(2) : '',
                        item.rate > 0 ? `@${item.rate.toFixed(2)}` : '',
                        item.debit > 0 ? item.debit.toFixed(2) : '',
                        item.credit > 0 ? item.credit.toFixed(2) : '',
                        bal
                    ]);
                });
                finalBalance = runningBalance;
                
                const balanceStatus = finalBalance > 0.01 ? "Receivable" : (finalBalance < -0.01 ? "Payable" : "Settled");
                const foot = [[{ content: `Final Balance (${balanceStatus}):`, colSpan: 8, styles: { halign: 'right', fontStyle: 'bold' } }, { content: `৳${Math.abs(finalBalance).toFixed(2)}`, styles: { halign: 'right', fontStyle: 'bold' } }]];

            } else { // 'overall' type
                head.push([
                    { content: 'Date', rowSpan: 2 },
                    { content: 'Supplier Details', colSpan: 4, styles: { halign: 'center' } },
                    { content: 'Buyer Details', colSpan: 4, styles: { halign: 'center' } },
                    { content: 'Profit', rowSpan: 2 },
                    { content: 'Debit', rowSpan: 2 },
                    { content: 'Credit', rowSpan: 2 },
                    { content: 'Balance', rowSpan: 2 }
                ]);
                head.push(['Name / Particulars', 'Net Wt', 'Rate', 'Value', 'Name', 'Net Wt', 'Rate', 'Value']);
                
                data.forEach(item => {
                    body.push([
                        item.date === '0000-01-01' ? 'Opening' : item.date,
                        item.supplierName || '', item.supplierNetWeight ? item.supplierNetWeight.toFixed(2) : '', item.supplierRate ? `@${item.supplierRate.toFixed(2)}` : '', item.supplierValue ? ` ${item.supplierValue.toFixed(2)}` : '',
                        item.buyerName || '', item.buyerNetWeight ? item.buyerNetWeight.toFixed(2) : '', item.buyerRate ? `@${item.buyerRate.toFixed(2)}` : '', item.buyerValue ? ` ${item.buyerValue.toFixed(2)}` : '',
                        item.profit !== undefined ? ` ${item.profit.toFixed(2)}` : '', item.debit ? ` ${item.debit.toFixed(2)}` : '', item.credit ? ` ${item.credit.toFixed(2)}` : '',
                        item.balance >= 0 ? ` ${item.balance.toFixed(2)}` : `(${Math.abs(item.balance).toFixed(2)})`
                    ]);
                });
                finalBalance = data.length > 0 ? data[data.length - 1].balance : 0;
                
                const balanceStatus = finalBalance >= 0 ? "Net Receivable" : "Net Payable";
                const foot = [[{ content: `Final Net Balance (${balanceStatus}):`, colSpan: 12, styles: { halign: 'right', fontStyle: 'bold' } }, { content: `৳${Math.abs(finalBalance).toFixed(2)}`, styles: { halign: 'right', fontStyle: 'bold' } }]];
            }

            doc.autoTable({
                head: head, 
                body: body,
                foot: foot,
                theme: 'striped',
                headStyles: { fillColor: [8, 145, 178] }, // Cyan-600
                didDrawPage: (data) => {
                    doc.setFontSize(20); doc.setFont('helvetica', 'bold');
                    doc.text('Errum Enterprise', data.settings.margin.left, 40);
                    doc.setFontSize(12); doc.setFont('helvetica', 'normal');
                    doc.text(type === 'contact' ? `Account Ledger for: ${name}` : 'Overall Transaction Statement', data.settings.margin.left, 58);
                    
                    const pageCount = doc.internal.getNumberOfPages();
                    const footerY = doc.internal.pageSize.height - 30;
                    doc.setFontSize(8);
                    doc.text(`Page ${data.pageNumber} of ${pageCount}`, data.settings.margin.left, footerY);
                    doc.text(`Generated on: ${new Date().toLocaleDateString()}`, doc.internal.pageSize.width - data.settings.margin.right, footerY, { align: 'right' });
                },
                margin: { top: 70 },
                styles: { fontSize: 8 },
                didParseCell: function (data) {
                    if (data.row.index === body.length - 1) {
                        data.cell.styles.fontStyle = 'bold';
                        data.cell.styles.fillColor = '#f1f5f9';
                        data.cell.styles.textColor = '#0f172a';
                    }
                }
            });

            doc.save(`${filename}.pdf`);
        }
    };

    const handleContentExportCSV = () => {
        if (!currentStatementData.data || currentStatementData.data.length === 0) {
            showToast('No data available to export.');
            return;
        }
        
        const { type, data, name } = currentStatementData;
        let headers, rows;
        const escapeCSV = (str) => {
            if (str === undefined || str === null) return '';
            let result = String(str);
            if (result.includes('"') || result.includes(',') || result.includes('\n')) {
                result = '"' + result.replace(/"/g, '""') + '"';
            }
            return result;
        };

        if (type === 'contact') {
            headers = ["Date", "Description", "Vehicle", "Scale Wt", "Net Wt", "Rate", "Debit", "Credit", "Balance"];
            let runningBalance = 0;
            rows = data.map(item => {
                runningBalance += (item.debit || 0) - (item.credit || 0);
                return [ item.date === '0000-01-01' ? 'Opening Balance' : item.date, item.description, item.vehicleNo, item.scaleWeight, item.netWeight, item.rate, item.debit, item.credit, runningBalance.toFixed(2) ].map(escapeCSV);
            });
        } else { // overall
            headers = ["Date", "Supplier/Particulars", "Sup Net Wt", "Sup Rate", "Sup Value", "Buyer", "Buy Net Wt", "Buy Rate", "Buy Value", "Profit", "Debit(In)", "Credit(Out)", "Balance"];
            rows = data.map(item => [ item.date, item.supplierName, item.supplierNetWeight, item.supplierRate, item.supplierValue, item.buyerName, item.buyerNetWeight, item.buyerRate, item.buyerValue, item.profit, item.debit, item.credit, item.balance.toFixed(2) ].map(escapeCSV));
        }

        const csvContent = [headers.join(','), ...rows.map(row => row.join(','))].join('\n');
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        link.setAttribute('download', `Statement-${name}-${new Date().toISOString().slice(0,10)}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    };
    
    const handlePasswordChange = async (e) => {
        e.preventDefault();
        const currentPassword = document.getElementById('current-password').value;
        const newPassword = document.getElementById('new-password').value;
        const confirmPassword = document.getElementById('confirm-password').value;
        const errorP = document.getElementById('password-error');
        errorP.textContent = '';

        if (!currentPassword || !newPassword || !confirmPassword) {
            errorP.textContent = 'Please fill all fields.'; return;
        }
        if (newPassword.length < 6) {
            errorP.textContent = 'New password must be at least 6 characters.'; return;
        }
        if (newPassword !== confirmPassword) {
            errorP.textContent = 'New passwords do not match.'; return;
        }

        const user = auth.currentUser;
        const credential = EmailAuthProvider.credential(user.email, currentPassword);

        try {
            await reauthenticateWithCredential(user, credential);
            await updatePassword(user, newPassword);
            showToast('Password updated successfully!');
            document.getElementById('password-change-form').reset();
            document.getElementById('password-modal').classList.add('hidden');
        } catch (error) {
            if (error.code === 'auth/wrong-password') {
                errorP.textContent = 'Incorrect current password.';
            } else {
                errorP.textContent = 'An error occurred. Please try again.';
                console.error(error);
            }
        }
    };

    const renderTransactionDetails = (id) => {
        const t = transactions.find(t => t.id === id);
        if (!t) return;

        const contentEl = document.getElementById('transaction-detail-content');
        let html = '';

        if (t.type === 'trade') {
            const paidToSupplier = getPayments(t.paymentsToSupplier);
            const receivedFromBuyer = getPayments(t.paymentsFromBuyer);
            const payableBalance = t.supplierTotal - paidToSupplier;
            const receivableBalance = t.buyerTotal - receivedFromBuyer;

            html = `
                <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div class="card p-4">
                        <h3 class="font-bold text-lg text-rose-500 mb-2">Supplier: ${t.supplierName}</h3>
                        <p><strong>Item:</strong> ${t.item}</p>
                        <p><strong>Vehicle No:</strong> ${t.vehicleNo || 'N/A'}</p>
                        <p><strong>Net Weight:</strong> ${t.netWeight.toFixed(2)} kg @ ৳${t.supplierRate.toFixed(2)}/kg</p>
                        <p class="font-bold text-xl mt-2">Total: ৳${t.supplierTotal.toFixed(2)}</p>
                        <p><strong>Paid:</strong> ৳${paidToSupplier.toFixed(2)}</p>
                        <p class="font-bold ${payableBalance > 0.01 ? 'text-rose-500' : 'text-slate-500'}">Balance: ৳${payableBalance.toFixed(2)}</p>
                        <div class="mt-4 flex gap-2">
                             ${payableBalance > 0.01 ? `<button data-payment-id="${t.id}" data-payment-type="toSupplier" class="btn btn-secondary text-sm">Add Payment</button>` : ''}
                        </div>
                    </div>
                    <div class="card p-4">
                        <h3 class="font-bold text-lg text-green-600 mb-2">Buyer: ${t.buyerName}</h3>
                         <p><strong>Item:</strong> ${t.item}</p>
                        <p><strong>Vehicle No:</strong> ${t.vehicleNo || 'N/A'}</p>
                        <p><strong>Net Weight:</strong> ${t.netWeight.toFixed(2)} kg @ ৳${t.buyerRate.toFixed(2)}/kg</p>
                        <p class="font-bold text-xl mt-2">Total: ৳${t.buyerTotal.toFixed(2)}</p>
                        <p><strong>Received:</strong> ৳${receivedFromBuyer.toFixed(2)}</p>
                        <p class="font-bold ${receivableBalance > 0.01 ? 'text-green-600' : 'text-slate-500'}">Balance: ৳${receivableBalance.toFixed(2)}</p>
                        <div class="mt-4 flex gap-2">
                            ${receivableBalance > 0.01 ? `<button data-payment-id="${t.id}" data-payment-type="fromBuyer" class="btn btn-secondary text-sm">Receive Payment</button>` : ''}
                        </div>
                    </div>
                </div>
                 <div class="mt-4 flex justify-end gap-2">
                    <button title="Edit" data-edit-id="${t.id}" class="btn btn-secondary text-sm">Edit</button>
                    <button title="Delete" data-delete-id="${t.id}" class="btn btn-secondary text-sm">Delete</button>
                </div>
            `;
        } else { // Payment
             html = `
                <div class="card p-4">
                    <h3 class="font-bold text-lg mb-2">Payment Details</h3>
                    <p><strong>Contact:</strong> ${t.name}</p>
                    <p><strong>Date:</strong> ${t.date}</p>
                    <p><strong>Description:</strong> ${t.description}</p>
                    <p><strong>Amount:</strong> <span class="font-bold ${t.paymentType === 'made' ? 'text-rose-500' : 'text-green-600'}">৳${t.amount.toFixed(2)}</span></p>
                    <p><strong>Type:</strong> ${t.paymentType === 'made' ? 'Payment Made' : 'Payment Received'}</p>
                </div>
                 <div class="mt-4 flex justify-end">
                    <button title="Delete" data-delete-id="${t.id}" class="btn btn-secondary text-sm">Delete</button>
                </div>
            `;
        }

        contentEl.innerHTML = html;
    };

    const renderInvoice = (id) => {
        const t = transactions.find(t => t.id === id);
        if (!t || t.type !== 'trade') return;

        const invoiceContentEl = document.getElementById('transaction-invoice-content');
        const paidToSupplier = getPayments(t.paymentsToSupplier);
        const receivedFromBuyer = getPayments(t.paymentsFromBuyer);

        invoiceContentEl.innerHTML = `
            <div class="p-8 bg-white" id="invoice-to-print">
                <div class="text-center mb-8">
                    <h1 class="text-3xl font-bold">Errum Enterprise</h1>
                    <p>Your Business Address Here</p>
                </div>
                <div class="grid grid-cols-2 gap-4 mb-8">
                    <div>
                        <h3 class="font-bold">Bill To:</h3>
                        <p>${t.buyerName}</p>
                    </div>
                    <div class="text-right">
                        <p><strong>Invoice #:</strong> ${t.id.substring(0, 8)}</p>
                        <p><strong>Date:</strong> ${t.date}</p>
                    </div>
                </div>
                <table class="w-full text-sm mb-8">
                    <thead class="bg-slate-100">
                        <tr>
                            <th class="p-2 text-left">Item Description</th>
                            <th class="p-2 text-right">Net Weight (kg)</th>
                            <th class="p-2 text-right">Rate</th>
                            <th class="p-2 text-right">Total</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr class="border-b">
                            <td class="p-2">${t.item}</td>
                            <td class="p-2 text-right">${t.netWeight.toFixed(2)}</td>
                            <td class="p-2 text-right">৳${t.buyerRate.toFixed(2)}</td>
                            <td class="p-2 text-right">৳${t.buyerTotal.toFixed(2)}</td>
                        </tr>
                    </tbody>
                </table>
                <div class="flex justify-end">
                    <div class="w-full md:w-1/2">
                        <div class="flex justify-between mb-2"><span class="font-semibold">Subtotal:</span> <span>৳${t.buyerTotal.toFixed(2)}</span></div>
                        <div class="flex justify-between mb-2"><span class="font-semibold">Paid:</span> <span>৳${receivedFromBuyer.toFixed(2)}</span></div>
                        <div class="flex justify-between font-bold text-xl border-t pt-2"><span class="font-semibold">Amount Due:</span> <span>৳${(t.buyerTotal - receivedFromBuyer).toFixed(2)}</span></div>
                    </div>
                </div>
            </div>
        `;
    };

    const openTransactionDetailModal = (id) => {
        renderTransactionDetails(id);
        renderInvoice(id);
        document.getElementById('transaction-detail-modal').classList.remove('hidden');
    };

    const bindStatementExportButtons = () => {
        document.getElementById('statement-csv-btn')?.addEventListener('click', () => handleContentExportCSV());
        document.getElementById('statement-png-btn')?.addEventListener('click', () => handleContentExport('png'));
        document.getElementById('statement-pdf-btn')?.addEventListener('click', () => handleContentExport('pdf'));
    };

    return { renderAll, renderContacts, resetContactForm, setupContactFormForEdit, handleSaveContact, handleDeleteContact, populateTradeDropdowns, updateTradeTotals, calculateNetWeight, resetTradeForm, setupTradeFormForEdit, handleTradeFormSubmit, handleDelete, openPaymentModal, handleSavePayment, openDirectPaymentModal, handleDirectPaymentSubmit, renderContactLedger, renderOverallStatement, handlePasswordChange };
})();

// --- NAVIGATION & EVENT BINDING ---
const navigateTo = (section, context = null) => {
    return new Promise((resolve) => {
        document.querySelectorAll('.nav-link').forEach(link => {
            link.classList.toggle('active', link.dataset.section === section);
        });
        mainContent.innerHTML = templates[section];
        
        mainContent.classList.remove('content-enter');
        void mainContent.offsetWidth; // Trigger reflow
        mainContent.classList.add('content-enter');

        if (section === 'dashboard') {
            dashboardCurrentPage = 1;
        }
        setTimeout(() => {
            bindSectionEventListeners(section, context);
            resolve();
        }, 0);
    });
};

const bindAppEventListeners = () => {
    document.querySelectorAll('.nav-link').forEach(link => link.addEventListener('click', (e) => navigateTo(e.currentTarget.dataset.section)));
    document.getElementById('logout-btn').addEventListener('click', () => signOut(auth));
    document.getElementById('save-payment-btn').addEventListener('click', appLogic.handleSavePayment);
    document.querySelectorAll('[data-close-modal]').forEach(btn => btn.addEventListener('click', (e) => document.getElementById(e.currentTarget.dataset.closeModal).classList.add('hidden')));
    document.getElementById('contact-form').addEventListener('submit', appLogic.handleSaveContact);
    document.getElementById('settings-btn').addEventListener('click', () => document.getElementById('password-modal').classList.remove('hidden'));
    document.getElementById('password-change-form').addEventListener('submit', appLogic.handlePasswordChange);
    document.getElementById('direct-payment-form').addEventListener('submit', appLogic.handleDirectPaymentSubmit);

    document.getElementById('transaction-detail-modal').addEventListener('click', e => {
        const button = e.target.closest('button');
        if (!button) return;

        const { paymentId, paymentType, editId, deleteId } = button.dataset;
        const transactionId = transactions.find(t => t.id === paymentId || t.id === editId || t.id === deleteId)?.id;

        if (paymentId) appLogic.openPaymentModal(paymentId, paymentType);
        if (editId) { navigateTo('transaction-form').then(() => appLogic.setupTradeFormForEdit(editId)); document.getElementById('transaction-detail-modal').classList.add('hidden'); }
        if (deleteId) { appLogic.handleDelete(deleteId); document.getElementById('transaction-detail-modal').classList.add('hidden'); }

        if (button.id === 'toggle-invoice-btn') {
            document.getElementById('transaction-detail-content').classList.toggle('hidden');
            document.getElementById('transaction-invoice-content').classList.toggle('hidden');
            button.textContent = button.textContent === 'View Invoice' ? 'View Details' : 'View Invoice';
            document.getElementById('save-invoice-btn').classList.toggle('hidden');
        }

        if (button.id === 'save-invoice-btn') {
            const content = document.getElementById('invoice-to-print');
            showToast('Generating PNG...');
            html2canvas(content, { scale: 2 }).then(canvas => {
                const link = document.createElement('a');
                link.download = `invoice-${transactionId}.png`;
                link.href = canvas.toDataURL();
                link.click();
            });
        }
    });
};

const bindSectionEventListeners = (section, context) => {
    if (section === 'dashboard') {
        appLogic.renderAll();
        document.getElementById('search-input').addEventListener('input', () => { dashboardCurrentPage = 1; appLogic.renderAll(); });
        document.getElementById('filter-start-date').addEventListener('change', () => { dashboardCurrentPage = 1; appLogic.renderAll(); });
        document.getElementById('filter-end-date').addEventListener('change', () => { dashboardCurrentPage = 1; appLogic.renderAll(); });
        
        document.getElementById('transaction-history-mobile').addEventListener('click', (e) => {
            const card = e.target.closest('.card');
            if (card) {
                appLogic.openTransactionDetailModal(card.dataset.id);
            }
        });
        document.getElementById('transaction-history-desktop').addEventListener('click', (e) => {
            const row = e.target.closest('tr');
            if (row) {
                appLogic.openTransactionDetailModal(row.dataset.id);
            }
        });
    } else if (section === 'contacts') {
        appLogic.renderContacts();
        document.getElementById('add-contact-btn').addEventListener('click', () => { appLogic.resetContactForm(); document.getElementById('contact-modal').classList.remove('hidden'); });
        document.getElementById('contacts-table-body').addEventListener('click', e => {
            const target = e.target.closest('button'); if (!target) return;
            const { editContactId, deleteContactId, ledgerId, directPaymentId } = target.dataset;
            if (editContactId) appLogic.setupContactFormForEdit(editContactId); 
            if (deleteContactId) appLogic.handleDeleteContact(deleteContactId); 
            if (ledgerId) navigateTo('statements', { contactId: ledgerId });
            if (directPaymentId) appLogic.openDirectPaymentModal(directPaymentId);
        });
    } else if (section === 'transaction-form') {
        appLogic.populateTradeDropdowns();
        appLogic.resetTradeForm();
        document.getElementById('transaction-form').addEventListener('submit', appLogic.handleTradeFormSubmit);
        document.getElementById('reset-form-btn').addEventListener('click', appLogic.resetTradeForm);
        document.getElementById('cancel-transaction-btn').addEventListener('click', () => navigateTo('dashboard'));
        ['scale-weight', 'less'].forEach(id => document.getElementById(id).addEventListener('input', appLogic.calculateNetWeight));
        ['supplier-rate', 'buyer-rate'].forEach(id => document.getElementById(id).addEventListener('input', appLogic.updateTradeTotals));
    } else if (section === 'statements') {
        const partySelect = document.getElementById('party-ledger-select');
        contacts.forEach(c => {
            const option = document.createElement('option');
            option.value = c.id;
            option.textContent = c.name;
            partySelect.appendChild(option);
        });
        document.getElementById('generate-overall-statement-btn').addEventListener('click', appLogic.renderOverallStatement);
        partySelect.addEventListener('change', (e) => {
            if (e.target.value) {
                appLogic.renderContactLedger(e.target.value);
            }
        });
        if (context?.contactId) {
            partySelect.value = context.contactId;
            appLogic.renderContactLedger(context.contactId);
        }
    }
};

// --- AUTH & INITIALIZATION ---
onAuthStateChanged(auth, user => {
    if (user) {
        currentUserId = user.uid;
        document.getElementById('user-email').textContent = user.email;

        if (transactionsUnsubscribe) transactionsUnsubscribe();
        if (contactsUnsubscribe) contactsUnsubscribe();

        const transQuery = query(collection(db, "users", currentUserId, "transactions"));
        transactionsUnsubscribe = onSnapshot(transQuery, snapshot => {
            transactions = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            const currentSection = document.querySelector('.nav-link.active')?.dataset.section;
            if (currentSection === 'dashboard' || currentSection === 'contacts') {
                appLogic.renderAll(); 
                appLogic.renderContacts();
            }
        });
        
        const contactsQuery = query(collection(db, "users", currentUserId, "contacts"), orderBy("name"));
        contactsUnsubscribe = onSnapshot(contactsQuery, snapshot => {
            contacts = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            const currentSection = document.querySelector('.nav-link.active')?.dataset.section;
             if (currentSection === 'dashboard' || currentSection === 'contacts') {
                appLogic.renderAll(); 
                appLogic.renderContacts();
            } else if (currentSection === 'transaction-form') {
                appLogic.populateTradeDropdowns();
            }
        });

        appContainer.classList.remove('hidden');
        authContainer.classList.add('hidden');
        loadingContainer.classList.add('hidden');
        
        navigateTo('dashboard');
        bindAppEventListeners();

    } else {
        currentUserId = null;
        transactions = [];
        contacts = [];
        if (transactionsUnsubscribe) transactionsUnsubscribe();
        if (contactsUnsubscribe) contactsUnsubscribe();
        
        appContainer.classList.add('hidden');
        authContainer.classList.remove('hidden');
        loadingContainer.classList.add('hidden');
    }
});

document.getElementById('login-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    loadingContainer.classList.remove('hidden');
    authContainer.classList.add('hidden');
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    const errorP = document.getElementById('auth-error');
    errorP.textContent = '';
    try {
        await signInWithEmailAndPassword(auth, email, password);
    } catch (error) {
        errorP.textContent = "Invalid email or password.";
        loadingContainer.classList.add('hidden');
        authContainer.classList.remove('hidden');
    }
});
