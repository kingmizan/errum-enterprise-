// ui.js

// --- HELPER FUNCTIONS ---
export const showToast = (message) => {
    const toast = document.getElementById('toast');
    document.getElementById('toast-message').textContent = message;
    toast.classList.remove('opacity-0', 'translate-y-10');
    toast.classList.add('opacity-100', 'translate-y-0');
    setTimeout(() => {
        toast.classList.remove('opacity-100', 'translate-y-0');
        toast.classList.add('opacity-0', 'translate-y-10');
    }, 3000);
};

export const updateThemeIcon = () => {
    const isDark = document.documentElement.classList.contains('dark');
    document.getElementById('theme-icon-light').classList.toggle('hidden', isDark);
    document.getElementById('theme-icon-dark').classList.toggle('hidden', !isDark);
};

export const animateCountUp = (el, endValue) => {
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
export const templates = {
    dashboard: `
        <div class="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <div class="p-6 bg-white dark:bg-slate-900 rounded-lg shadow-sm border border-slate-200 dark:border-slate-800 transition-transform hover:-translate-y-1"><div class="flex items-center gap-4"><div class="p-3 rounded-lg bg-rose-100 dark:bg-rose-500/20 text-rose-500"><svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" /></svg></div><div><h3 class="text-sm font-semibold text-slate-500 dark:text-slate-400">Total Payable</h3><p id="total-payable" class="text-3xl font-bold text-rose-500 mt-1">৳0.00</p></div></div></div>
            <div class="p-6 bg-white dark:bg-slate-900 rounded-lg shadow-sm border border-slate-200 dark:border-slate-800 transition-transform hover:-translate-y-1"><div class="flex items-center gap-4"><div class="p-3 rounded-lg bg-green-100 dark:bg-green-500/20 text-green-500"><svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" /></svg></div><div><h3 class="text-sm font-semibold text-slate-500 dark:text-slate-400">Total Receivable</h3><p id="total-receivable" class="text-3xl font-bold text-green-600 dark:text-green-500 mt-1">৳0.00</p></div></div></div>
            <div class="p-6 bg-white dark:bg-slate-900 rounded-lg shadow-sm border border-slate-200 dark:border-slate-800 transition-transform hover:-translate-y-1"><div class="flex items-center gap-4"><div class="p-3 rounded-lg bg-teal-100 dark:bg-teal-500/20 text-teal-500"><svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M13 17h8m0 0V9m0 8l-8-8-4 4-6-6" /></svg></div><div><h3 class="text-sm font-semibold text-slate-500 dark:text-slate-400">Net Balance</h3><p id="total-profit" class="text-3xl font-bold text-teal-600 dark:text-teal-500 mt-1">৳0.00</p></div></div></div>
        </div>
        <div class="bg-white dark:bg-slate-900 rounded-lg shadow-sm border border-slate-200 dark:border-slate-800">
            <div class="p-4 border-b dark:border-slate-800 flex flex-wrap gap-4 justify-between items-center"><h2 class="text-xl font-bold">Recent Transactions</h2><div class="flex flex-wrap items-center gap-2"><input id="search-input" type="text" placeholder="Search..." class="w-48 p-2 border border-slate-300 dark:border-slate-700 rounded-lg bg-slate-50 dark:bg-slate-800"><input type="date" id="filter-start-date" class="p-2 border border-slate-300 dark:border-slate-700 rounded-lg bg-slate-50 dark:bg-slate-800"><input type="date" id="filter-end-date" class="p-2 border border-slate-300 dark:border-slate-700 rounded-lg bg-slate-50 dark:bg-slate-800"></div></div>
            <div class="overflow-x-auto"><table class="w-full text-sm responsive-table"><thead><tr class="border-b dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50"><th class="text-left font-semibold py-3 px-4">Date</th><th class="text-left font-semibold py-3 px-4">Details</th><th class="text-right font-semibold py-3 px-4">Profit/Value</th><th class="text-right font-semibold py-3 px-4">Payable Bal</th><th class="text-right font-semibold py-3 px-4">Receivable Bal</th><th class="text-center font-semibold py-3 px-4">Actions</th></tr></thead><tbody id="transaction-history-body"></tbody></table></div>
            <div id="pagination-controls" class="flex justify-center items-center gap-4 p-4 border-t dark:border-slate-800"></div>
        </div>`,
    contacts: `
        <div class="bg-white dark:bg-slate-900 rounded-lg shadow-sm border border-slate-200 dark:border-slate-800">
            <div class="p-4 border-b dark:border-slate-800 flex justify-between items-center"><h2 class="text-xl font-bold">Manage Party</h2><button id="add-contact-btn" class="flex items-center gap-2 px-4 py-2 rounded-lg font-semibold bg-teal-600 text-white hover:bg-teal-700 text-sm shadow-sm shadow-teal-500/30"><svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M10 5a1 1 0 011 1v3h3a1 1 0 110 2h-3v3a1 1 0 11-2 0v-3H6a1 1 0 110-2h3V6a1 1 0 011-1z" clip-rule="evenodd" /></svg>Add New Party</button></div>
            <div class="overflow-x-auto"><table class="w-full text-sm responsive-table"><thead><tr class="border-b dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50">
                <th class="text-left font-semibold py-3 px-4">Name</th>
                <th class="text-left font-semibold py-3 px-4">Type</th>
                <th class="text-left font-semibold py-3 px-4">Phone</th>
                <th class="text-left font-semibold py-3 px-4">Last Active</th>
                <th class="text-right font-semibold py-3 px-4">Net Balance</th>
                <th class="text-center font-semibold py-3 px-4">Actions</th>
            </tr></thead><tbody id="contacts-table-body"></tbody></table></div>
        </div>`,
    'transaction-form': `
        <div class="bg-white dark:bg-slate-900 rounded-lg shadow-sm border border-slate-200 dark:border-slate-800 max-w-4xl mx-auto">
            <div class="p-6 border-b dark:border-slate-800"><h2 id="form-title" class="text-xl font-bold">Add New Transaction</h2></div>
            <form id="transaction-form" class="p-6">
                <input type="hidden" id="transaction-id">
                <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
                    <div class="lg:col-span-2"><label for="item" class="font-semibold text-sm">Item Details</label><input type="text" id="item" class="w-full p-2 mt-1 border border-slate-300 dark:border-slate-700 rounded-lg bg-slate-50 dark:bg-slate-800" required></div>
                    <div><label for="scale-weight" class="font-semibold text-sm">Scale Weight (kg)</label><input type="number" step="any" id="scale-weight" placeholder="0.00" class="w-full p-2 mt-1 border border-slate-300 dark:border-slate-700 rounded-lg bg-slate-50 dark:bg-slate-800"></div>
                    <div><label for="less" class="font-semibold text-sm">Less (kg)</label><input type="number" step="any" id="less" placeholder="0.00" class="w-full p-2 mt-1 border border-slate-300 dark:border-slate-700 rounded-lg bg-slate-50 dark:bg-slate-800"></div>
                    <div><label for="net-weight" class="font-semibold text-sm">Net Weight (kg)</label><input type="number" step="any" id="net-weight" placeholder="0.00" class="w-full p-2 mt-1 border rounded-lg bg-slate-100 dark:bg-slate-800" readonly></div>
                </div>

                <div class="mt-6 grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
                    <div class="space-y-4 p-4 rounded-lg bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800">
                        <h3 class="font-bold text-lg text-rose-500">Supplier Details</h3>
                        <div><label for="supplier-select" class="font-semibold text-sm">Supplier Name</label><select id="supplier-select" class="w-full p-2 mt-1 border border-slate-300 dark:border-slate-700 rounded-lg bg-slate-50 dark:bg-slate-800" required><option value="">-- Select Supplier --</option></select></div>
                        <div><label for="vehicle-no" class="font-semibold text-sm">Vehicle No</label><input type="text" id="vehicle-no" placeholder="e.g., DHAKA-123" class="w-full p-2 mt-1 border border-slate-300 dark:border-slate-700 rounded-lg bg-slate-50 dark:bg-slate-800"></div>
                        <div><label for="supplier-rate" class="font-semibold text-sm">Supplier Rate (per kg)</label><input type="number" step="any" id="supplier-rate" placeholder="0.00" class="w-full p-2 mt-1 border border-slate-300 dark:border-slate-700 rounded-lg bg-slate-50 dark:bg-slate-800"></div>
                        <div class="grid grid-cols-2 gap-4">
                            <div><label for="paid-to-supplier" class="font-semibold text-sm">Initial Payment</label><input type="number" step="any" id="paid-to-supplier" placeholder="0.00" class="w-full p-2 mt-1 border border-slate-300 dark:border-slate-700 rounded-lg bg-slate-50 dark:bg-slate-800"></div>
                            <div><label for="paid-to-supplier-method" class="font-semibold text-sm">Method</label><select id="paid-to-supplier-method" class="w-full p-2 mt-1 border border-slate-300 dark:border-slate-700 rounded-lg bg-slate-50 dark:bg-slate-800"><option>Cash</option><option>Bank</option><option>Bkash</option><option>Rocket</option><option>Nagod</option></select></div>
                        </div>
                    </div>
                    <div class="space-y-4 p-4 rounded-lg bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800">
                        <h3 class="font-bold text-lg text-green-600 dark:text-green-500">Buyer Details</h3>
                        <div><label for="buyer-select" class="font-semibold text-sm">Buyer Name</label><select id="buyer-select" class="w-full p-2 mt-1 border border-slate-300 dark:border-slate-700 rounded-lg bg-slate-50 dark:bg-slate-800" required><option value="">-- Select Buyer --</option></select></div>
                        <div><label for="buyer-rate" class="font-semibold text-sm">Buyer Rate (per kg)</label><input type="number" step="any" id="buyer-rate" placeholder="0.00" class="w-full p-2 mt-1 border border-slate-300 dark:border-slate-700 rounded-lg bg-slate-50 dark:bg-slate-800"></div>
                        <div class="grid grid-cols-2 gap-4">
                            <div><label for="received-from-buyer" class="font-semibold text-sm">Initial Payment</label><input type="number" step="any" id="received-from-buyer" placeholder="0.00" class="w-full p-2 mt-1 border border-slate-300 dark:border-slate-700 rounded-lg bg-slate-50 dark:bg-slate-800"></div>
                            <div><label for="received-from-buyer-method" class="font-semibold text-sm">Method</label><select id="received-from-buyer-method" class="w-full p-2 mt-1 border border-slate-300 dark:border-slate-700 rounded-lg bg-slate-50 dark:bg-slate-800"><option>Cash</option><option>Bank</option><option>Bkash</option><option>Rocket</option><option>Nagod</option></select></div>
                        </div>
                    </div>
                </div>
                
                <div class="mt-6 pt-4 border-t dark:border-slate-800 space-y-2">
                    <div><label for="date" class="font-semibold text-sm">Transaction Date</label><input type="date" id="date" class="w-full p-2 mt-1 border border-slate-300 dark:border-slate-700 rounded-lg bg-slate-50 dark:bg-slate-800" required></div>
                    <div class="flex justify-between items-center text-lg"><span class="font-semibold text-slate-500">Total Payable (to Supplier):</span><span id="supplier-total" class="font-bold text-rose-500">৳0.00</span></div>
                    <div class="flex justify-between items-center text-lg"><span class="font-semibold text-slate-500">Total Receivable (from Buyer):</span><span id="buyer-total" class="font-bold text-green-600">৳0.00</span></div>
                    <div class="flex justify-between items-center text-xl"><span class="font-semibold">Gross Profit on Deal:</span><span id="transaction-profit" class="font-bold text-teal-600">৳0.00</span></div>
                </div>

                <div class="flex justify-end gap-3 pt-6">
                    <button type="button" id="cancel-transaction-btn" class="px-4 py-2 rounded-lg font-semibold bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-sm">Cancel</button>
                    <button type="button" id="reset-form-btn" class="px-4 py-2 rounded-lg font-semibold bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-sm">Reset</button>
                    <button type="submit" class="px-6 py-2 rounded-lg font-semibold bg-teal-600 text-white hover:bg-teal-700 text-sm">Save Transaction</button>
                </div>
            </form>
        </div>`
};
