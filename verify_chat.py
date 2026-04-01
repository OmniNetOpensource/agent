from playwright.sync_api import sync_playwright

def run_cuj(page):
    page.goto("http://localhost:3000", timeout=60000)
    page.wait_for_timeout(2000)

    # Type a message
    page.get_by_placeholder("输入您的消息...").fill("Hello, this is a test message to verify the message list rendering performance.")
    page.wait_for_timeout(500)

    # Send message
    page.keyboard.press('Enter')
    page.wait_for_timeout(2000)

    # Type another message
    page.get_by_placeholder("输入您的消息...").fill("And here is another message to make the list scroll.")
    page.wait_for_timeout(500)

    # Send message
    page.keyboard.press('Enter')
    page.wait_for_timeout(2000)

    # Take screenshot at the key moment
    page.screenshot(path="/home/jules/verification/screenshots/verification.png")
    page.wait_for_timeout(1000)

if __name__ == "__main__":
    import os
    os.makedirs("/home/jules/verification/screenshots", exist_ok=True)
    os.makedirs("/home/jules/verification/videos", exist_ok=True)

    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context(
            record_video_dir="/home/jules/verification/videos",
            viewport={'width': 1280, 'height': 800}
        )
        page = context.new_page()
        try:
            run_cuj(page)
        finally:
            context.close()
            browser.close()
