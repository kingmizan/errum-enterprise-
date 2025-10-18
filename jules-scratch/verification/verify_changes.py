import os
from playwright.sync_api import sync_playwright

def run():
    with sync_playwright() as p:
        browser = p.chromium.launch()
        page = browser.new_page(viewport={"width": 375, "height": 667})

        # Construct the file path to index.html
        # The script is in jules-scratch/verification, so we need to go up two levels
        base_dir = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
        file_path = "file://" + os.path.join(base_dir, "index.html")

        page.goto(file_path)

        # Wait for the loading container to be hidden
        page.wait_for_selector("#loading-container", state="hidden")

        # Create a new user
        page.fill("#email", "test@errum.com")
        page.fill("#password", "password")
        page.click("button[type='submit']")

        # Wait for the app to load
        page.wait_for_selector("#app-container")

        # Take a screenshot of the dashboard
        page.screenshot(path="jules-scratch/verification/dashboard.png")

        # Open the transaction details modal and take a screenshot
        page.click("[data-id]")
        page.wait_for_selector("#transaction-detail-modal")
        page.screenshot(path="jules-scratch/verification/transaction_details.png")

        browser.close()

if __name__ == "__main__":
    run()
