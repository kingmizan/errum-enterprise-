import asyncio
from playwright.async_api import async_playwright, expect
import os

async def main():
    # --- File modification strategy ---
    with open('app.js', 'r') as f:
        original_content = f.read()

    # This mock script will replace the original auth block
    mock_auth_section = """
// --- AUTH & INITIALIZATION ---
// This entire block is mocked for frontend verification purposes.
const mockAuthAndInit = () => {
    const mockUser = { uid: 'mock-uid', email: 'test@example.com' };

    currentUserId = mockUser.uid;
    document.getElementById('user-email').textContent = mockUser.email;

    transactions = [
        { id: 't1', type: 'trade', date: '2024-01-01', item: 'Test Item', supplierName: 'Supplier A', buyerName: 'Buyer B', supplierTotal: 100, buyerTotal: 150, profit: 50, netWeight: 10, supplierRate: 10, buyerRate: 15, paymentsToSupplier: [], paymentsFromBuyer: [] }
    ];
    contacts = [
        { id: 'c1', name: 'Supplier A', type: 'supplier' }, { id: 'c2', name: 'Buyer B', type: 'buyer' }
    ];

    appContainer.classList.remove('hidden');
    authContainer.classList.add('hidden');
    loadingContainer.classList.add('hidden');

    navigateTo('dashboard');
    bindAppEventListeners();
};
// Run the mock initialization immediately on script load
mockAuthAndInit();
"""

    # Find the start and end of the block to replace
    start_marker = "// --- AUTH & INITIALIZATION ---"
    end_marker = "document.getElementById('login-form').addEventListener('submit',"

    start_index = original_content.find(start_marker)
    end_index = original_content.find(end_marker)

    if start_index == -1 or end_index == -1:
        raise ValueError("Could not find the authentication block markers in app.js")

    # Construct the new content
    modified_content = (
        original_content[:start_index] +
        mock_auth_section +
        original_content[end_index:]
    )

    try:
        with open('app.js', 'w') as f:
            f.write(modified_content)

        async with async_playwright() as p:
            browser = await p.chromium.launch(headless=True)
            page = await browser.new_page()

            file_path = f"file://{os.path.abspath('index.html')}"
            await page.goto(file_path)

            # With the mocked auth, the app should load directly to the dashboard
            await expect(page.locator("#app-container")).to_be_visible(timeout=15000)
            await expect(page.locator("text=Recent Transactions")).to_be_visible()
            await expect(page.locator("text=Test Item")).to_be_visible()

            # Click the transaction to test the fix
            await page.locator("#transaction-history-body tr[data-id='t1']").click()

            # Check if the details modal is visible
            await expect(page.locator("#transaction-detail-modal")).to_be_visible()
            await expect(page.locator("text=Item: Test Item")).to_be_visible()

            # Screenshot for verification
            await page.screenshot(path="jules-scratch/verification/verification.png")

            await browser.close()

    finally:
        # Restore the original app.js content
        with open('app.js', 'w') as f:
            f.write(original_content)

if __name__ == "__main__":
    asyncio.run(main())
