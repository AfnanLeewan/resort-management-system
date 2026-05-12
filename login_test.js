const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: false, slowMo: 500 });
  const page = await browser.newPage();
  await page.setViewportSize({ width: 1280, height: 800 });

  console.log('Navigating to app...');
  await page.goto('http://localhost:3000');
  await page.waitForTimeout(1500);
  await page.screenshot({ path: 'screenshot_01_login_page.png' });
  console.log('Screenshot 1: Login page loaded');

  // Find inputs
  const inputs = await page.$$('input');
  console.log(`Found ${inputs.length} input(s)`);

  const usernameInput = await page.$('input[type="text"], input[type="email"]');
  const passwordInput = await page.$('input[type="password"]');

  if (usernameInput && passwordInput) {
    await usernameInput.fill('admin');
    await passwordInput.fill('admin123');
    await page.screenshot({ path: 'screenshot_02_filled.png' });
    console.log('Screenshot 2: Credentials filled');

    const loginBtn = await page.$('button[type="submit"]') ||
      await page.$('button:has-text("Login")') ||
      await page.$('button:has-text("เข้าสู่ระบบ")');

    if (loginBtn) {
      await loginBtn.click();
      await page.waitForTimeout(2000);
      await page.screenshot({ path: 'screenshot_03_after_login.png' });
      console.log('Screenshot 3: After login');
    } else {
      // Try clicking any button
      const buttons = await page.$$('button');
      console.log(`Found ${buttons.length} button(s)`);
      for (const btn of buttons) {
        const text = await btn.textContent();
        console.log('Button:', text);
      }
    }
  } else {
    // Dump page HTML structure for debugging
    const title = await page.title();
    console.log('Page title:', title);
    const selects = await page.$$('select');
    console.log(`Found ${selects.length} select(s)`);
    const buttons = await page.$$('button');
    for (const btn of buttons) {
      const text = await btn.textContent();
      console.log('Button:', text?.trim());
    }
    await page.screenshot({ path: 'screenshot_debug.png' });
    console.log('Debug screenshot saved');
  }

  await page.waitForTimeout(1000);
  await browser.close();
  console.log('Done.');
})();
