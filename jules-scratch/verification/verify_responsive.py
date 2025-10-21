import asyncio
from playwright.async_api import async_playwright
import os

async def main():
    async with async_playwright() as p:
        browser = await p.chromium.launch()
        page = await browser.new_page()

        # Get the absolute path to the index.html file
        file_path = os.path.abspath('index.html')

        # Go to the local index.html file
        await page.goto(f'file://{file_path}')

        # Manually make the app container visible for the screenshot
        await page.evaluate("document.getElementById('app-container').classList.remove('hidden')")
        await page.evaluate("document.getElementById('loading-container').classList.add('hidden')")

        # Load the dashboard template and inject mock data
        await page.evaluate("""() => {
            const dashboardTemplate = `
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
                </div>
            `;
            document.getElementById('app-content').innerHTML = dashboardTemplate;

            const transactions = [
                { id: '1', type: 'trade', item: 'Test Item 1', supplierName: 'Supplier A', buyerName: 'Buyer B', profit: 100, date: '2023-10-26', netWeight: 10, supplierRate: 10, buyerRate: 20, supplierTotal: 100, buyerTotal: 200, paymentsToSupplier: [], paymentsFromBuyer: [] },
                { id: '2', type: 'payment', paymentType: 'made', description: 'Payment to Supplier', name: 'Supplier A', amount: 50, date: '2023-10-25' },
                { id: '3', type: 'payment', paymentType: 'received', description: 'Payment from Buyer', name: 'Buyer B', amount: 75, date: '2023-10-24' }
            ];

            const mobileContainer = document.getElementById('transaction-history-mobile');
            const desktopContainer = document.getElementById('transaction-history-desktop');
            mobileContainer.innerHTML = '';
            desktopContainer.innerHTML = '';

            transactions.forEach(t => {
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
                    const payableBalance = t.supplierTotal - t.paymentsToSupplier.reduce((sum, p) => sum + p.amount, 0);
                    const receivableBalance = t.buyerTotal - t.paymentsFromBuyer.reduce((sum, p) => sum + p.amount, 0);
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
        }""")

        # Give it a moment to render
        await page.wait_for_timeout(500)

        # Take a screenshot of the mobile view
        await page.set_viewport_size({"width": 375, "height": 667})
        await page.screenshot(path='jules-scratch/verification/verification_mobile.png')

        # Take a screenshot of the desktop view
        await page.set_viewport_size({"width": 1280, "height": 720})
        await page.screenshot(path='jules-scratch/verification/verification_desktop.png')

        await browser.close()

if __name__ == '__main__':
    asyncio.run(main())
