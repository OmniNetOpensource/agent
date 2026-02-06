from playwright.sync_api import sync_playwright

def run(playwright):
    browser = playwright.chromium.launch(headless=True)
    page = browser.new_page()

    # Navigate to the chat application
    print("Navigating to http://localhost:3000")
    page.goto("http://localhost:3000")

    # Wait for the composer (input area) to be visible
    print("Waiting for composer...")
    # Based on Composer.tsx, it likely has a textarea
    page.wait_for_selector("textarea", timeout=30000)

    # Take a screenshot
    print("Taking screenshot...")
    page.screenshot(path="verification_chat.png", full_page=True)

    browser.close()

with sync_playwright() as playwright:
    run(playwright)
