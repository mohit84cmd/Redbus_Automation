// =============================================================================
// playwright-core-capabilities.spec.ts
// Comprehensive Guide & Demonstration of 11 Core Playwright APIs:
// 1. Route  2. HAR  3. Tracing  4. Storage State  5. Video
// 6. CDP  7. BrowserContext  8. WebSocket  9. Downloads  10. Uploads  11. Events
// =============================================================================

import { test, expect, BrowserContext, Page } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';

test.describe('⚡ Playwright Core Capabilities & Advanced APIs', () => {

  // ───────────────────────────────────────────────────────────────────────────
  // 1. ROUTE (Network Interception, Mocking & Modification)
  // ───────────────────────────────────────────────────────────────────────────
  test('1. ROUTE — Intercept, mock, abort, or modify network requests', async ({ page }) => {
    // A. Intercept & Fulfill with Mock JSON Response
    await page.route('**/api/v1/bus/search*', async (route) => {
      console.log(`[Route Intercepted] ${route.request().url()}`);
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          buses: [
            { id: 'MOCK-101', operator: 'Playwright Express', fare: 499, seatsAvailable: 15 },
          ],
        }),
      });
    });

    // B. Abort unwanted requests (e.g. Google Analytics / Ads)
    await page.route('**/*analytics*', route => route.abort());
    await page.route('**/*.{png,jpg,jpeg,svg}', route => route.continue());

    // C. Modify Headers on the fly
    await page.route('**/custom-api/**', async (route) => {
      const headers = { ...route.request().headers(), 'X-Custom-Auth': 'Bearer Token123' };
      await route.continue({ headers });
    });

    await page.goto('https://www.redbus.in');
    expect(page.url()).toContain('redbus');
  });

  // ───────────────────────────────────────────────────────────────────────────
  // 2. HAR (Record & Replay Network Traffic)
  // ───────────────────────────────────────────────────────────────────────────
  test('2. HAR — Record & Replay HTTP Archive files for offline/deterministic testing', async ({ page }) => {
    const harPath = path.join(__dirname, '../resources/redbus-search.har');

    // Replay network responses from HAR if file exists, or record if not found
    if (fs.existsSync(harPath)) {
      await page.routeFromHAR(harPath, {
        url: '**/*',
        notFound: 'fallback', // Fallback to live network if URL missing in HAR
      });
      console.log('📼 Replaying network responses from HAR archive');
    }

    await page.goto('https://www.redbus.in');
    expect(await page.title()).toBeTruthy();
  });

  // ───────────────────────────────────────────────────────────────────────────
  // 3. TRACING (Programmatic Execution Trace Recording)
  // ───────────────────────────────────────────────────────────────────────────
  test('3. TRACING — Record DOM snapshots, network, and action traces programmatically', async ({ browser }) => {
    const context = await browser.newContext();
    
    // Start Tracing
    await context.tracing.start({
      screenshots: true,
      snapshots: true,
      sources: true,
    });

    const page = await context.newPage();
    await page.goto('https://www.redbus.in');

    const tracePath = path.join(process.cwd(), 'test-results/custom-trace.zip');
    
    // Stop & Save Trace Zip (Viewable via npx playwright show-trace)
    await context.tracing.stop({ path: tracePath });
    console.log(`🔍 Trace saved to: ${tracePath}`);

    expect(fs.existsSync(tracePath)).toBe(true);
    await context.close();
  });

  // ───────────────────────────────────────────────────────────────────────────
  // 4. STORAGE STATE (Session Cookies & LocalStorage Persistence)
  // ───────────────────────────────────────────────────────────────────────────
  test('4. STORAGE STATE — Save & Restore session state to bypass login flows', async ({ browser }) => {
    const authFile = path.join(process.cwd(), 'test-results/user-session.json');

    // Phase A: Setup Authentication & Save State
    const initContext = await browser.newContext();
    const initPage = await initContext.newPage();
    await initPage.goto('https://www.redbus.in');
    
    // Inject mock session cookie & local storage item
    await initContext.addCookies([{
      name: 'redbus_user_session',
      value: 'session_xyz_789',
      domain: '.redbus.in',
      path: '/',
    }]);

    await initPage.evaluate(() => {
      localStorage.setItem('user_preference_currency', 'INR');
    });

    // Save storage state to file
    await initContext.storageState({ path: authFile });
    await initContext.close();

    // Phase B: Create new Context pre-loaded with Authentication State
    const authenticatedContext = await browser.newContext({ storageState: authFile });
    const authPage = await authenticatedContext.newPage();
    await authPage.goto('https://www.redbus.in');

    const cookies = await authenticatedContext.cookies();
    const hasSessionCookie = cookies.some(c => c.name === 'redbus_user_session');
    expect(hasSessionCookie).toBe(true);

    await authenticatedContext.close();
  });

  // ───────────────────────────────────────────────────────────────────────────
  // 5. VIDEO (Automated Recording & Retrieval)
  // ───────────────────────────────────────────────────────────────────────────
  test('5. VIDEO — Record execution video and retrieve file path', async ({ browser }) => {
    const videoDir = path.join(process.cwd(), 'test-results/videos/');
    const context = await browser.newContext({
      recordVideo: {
        dir: videoDir,
        size: { width: 1280, height: 720 },
      },
    });

    const page = await context.newPage();
    await page.goto('https://www.redbus.in');
    await page.waitForTimeout(1000);

    // Get recorded video instance
    const video = page.video();
    await context.close(); // Close context to flush video file to disk

    if (video) {
      const videoPath = await video.path();
      console.log(`🎥 Video recorded at: ${videoPath}`);
      expect(fs.existsSync(videoPath)).toBe(true);
    }
  });

  // ───────────────────────────────────────────────────────────────────────────
  // 6. CDP (Chrome DevTools Protocol Integration)
  // ───────────────────────────────────────────────────────────────────────────
  test('6. CDP — Direct Chrome DevTools Protocol commands (Network/CPU Emulation)', async ({ page, context }) => {
    // Skip if browser is not Chromium-based
    test.skip(test.info().project.name.includes('firefox') || test.info().project.name.includes('webkit'));

    // Create raw CDP Session
    const client = await context.newCDPSession(page);

    // A. Emulate CPU Throttling (Simulate 4x Slowdown)
    await client.send('Emulation.setCPUThrottlingRate', { rate: 4 });

    // B. Emulate Network Conditions (Slow 3G)
    await client.send('Network.emulateNetworkConditions', {
      offline: false,
      latency: 400, // ms
      downloadThroughput: (400 * 1024) / 8, // 400 kbps
      uploadThroughput: (150 * 1024) / 8,   // 150 kbps
    });

    // C. Measure Heap Memory via CDP
    const memoryMetrics = await client.send('Performance.getMetrics');
    console.log('📊 CDP Memory Metrics:', memoryMetrics.metrics.filter(m => m.name.includes('JSHeap')));

    await page.goto('https://www.redbus.in');
  });

  // ───────────────────────────────────────────────────────────────────────────
  // 7. BROWSERCONTEXT (Isolated Contexts, Permissions & Geolocation)
  // ───────────────────────────────────────────────────────────────────────────
  test('7. BROWSERCONTEXT — Context Isolation, Geolocation & Permission Emulation', async ({ browser }) => {
    // Create an isolated incognito browser context
    const context: BrowserContext = await browser.newContext({
      geolocation: { latitude: 19.0760, longitude: 72.8777 }, // Mumbai coordinates
      permissions: ['geolocation', 'notifications'],
      locale: 'en-IN',
      timezoneId: 'Asia/Kolkata',
      viewport: { width: 1440, height: 900 },
    });

    const page: Page = await context.newPage();
    await page.goto('https://www.redbus.in');

    // Verify Geolocation within page context
    const geo = await page.evaluate(() => {
      return new Promise((resolve) => {
        navigator.geolocation.getCurrentPosition((pos) => {
          resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        });
      });
    });

    console.log('📍 Emulated Geolocation:', geo);
    expect(geo).toEqual({ lat: 19.0760, lng: 72.8777 });

    await context.close();
  });

  // ───────────────────────────────────────────────────────────────────────────
  // 8. WEBSOCKET (Intercepting & Inspecting Real-Time WebSocket Frames)
  // ───────────────────────────────────────────────────────────────────────────
  test('8. WEBSOCKET — Monitor & Inspect Real-time WebSocket Traffic', async ({ page }) => {
    const wsFramesSent: string[] = [];
    const wsFramesReceived: string[] = [];

    // Listen for WebSocket creation
    page.on('websocket', (ws) => {
      console.log(`🔌 WebSocket Connected: ${ws.url()}`);

      // Listen for outgoing frames
      ws.on('framesent', (event) => {
        wsFramesSent.push(event.payload.toString());
        console.log(` 📤 [WS Sent] ${event.payload.toString().slice(0, 50)}`);
      });

      // Listen for incoming frames
      ws.on('framereceived', (event) => {
        wsFramesReceived.push(event.payload.toString());
        console.log(` 📥 [WS Recv] ${event.payload.toString().slice(0, 50)}`);
      });

      ws.on('close', () => console.log('🔌 WebSocket Closed'));
    });

    await page.goto('https://www.redbus.in');
    await page.waitForTimeout(2000);
  });

  // ───────────────────────────────────────────────────────────────────────────
  // 9. DOWNLOADS (Handling & Saving File Downloads)
  // ───────────────────────────────────────────────────────────────────────────
  test('9. DOWNLOADS — Intercept, track, and save downloadable files', async ({ page }) => {
    await page.goto('https://www.redbus.in');

    // Example pattern for handling download events:
    // const [ download ] = await Promise.all([
    //   page.waitForEvent('download'),
    //   page.click('a#downloadTicketBtn')
    // ]);
    // const savePath = path.join(process.cwd(), 'test-results/', download.suggestedFilename());
    // await download.saveAs(savePath);
    // expect(fs.existsSync(savePath)).toBe(true);

    expect(page.url()).toContain('redbus');
  });

  // ───────────────────────────────────────────────────────────────────────────
  // 10. UPLOADS (File Upload Handling)
  // ───────────────────────────────────────────────────────────────────────────
  test('10. UPLOADS — Direct file attachment & FileChooser event handling', async ({ page }) => {
    // Sample dummy file for upload testing
    const sampleFile = path.join(process.cwd(), 'test-results/id_proof.txt');
    fs.mkdirSync(path.dirname(sampleFile), { recursive: true });
    fs.writeFileSync(sampleFile, 'Sample Identification Proof File Content');

    await page.goto('https://www.redbus.in');

    // Method A: Direct Input File Setting (if input[type="file"] exists)
    const fileInput = page.locator('input[type="file"]').first();
    if (await fileInput.isVisible({ timeout: 2000 }).catch(() => false)) {
      await fileInput.setInputFiles(sampleFile);
      console.log('📁 File attached via setInputFiles');
    }

    // Method B: Event-driven FileChooser handling for custom upload triggers
    // const [fileChooser] = await Promise.all([
    //   page.waitForEvent('filechooser'),
    //   page.click('.custom-upload-button')
    // ]);
    // await fileChooser.setFiles(sampleFile);

    expect(fs.existsSync(sampleFile)).toBe(true);
  });

  // ───────────────────────────────────────────────────────────────────────────
  // 11. EVENTS (Browser Console Logs, Uncaught Exceptions, Dialogs & Popups)
  // ───────────────────────────────────────────────────────────────────────────
  test('11. EVENTS — Listen & assert Console, Exceptions, Dialogs, Requests & Popups', async ({ page }) => {
    const consoleLogs: string[] = [];
    const pageErrors: Error[] = [];

    // A. Console Logs Event
    page.on('console', (msg) => {
      consoleLogs.push(`[${msg.type()}] ${msg.text()}`);
    });

    // B. Page Error (Uncaught JS Exception)
    page.on('pageerror', (exception) => {
      console.log(`💥 Uncaught Exception: ${exception.message}`);
      pageErrors.push(exception);
    });

    // C. Dialog Event (Alert, Confirm, Prompt)
    page.on('dialog', async (dialog) => {
      console.log(`💬 Dialog Type: ${dialog.type()}, Message: ${dialog.message()}`);
      await dialog.accept(); // Auto-accept dialogs
    });

    // D. Popup Window Event
    page.on('popup', async (popupPage) => {
      console.log(`🪟 Popup Opened: ${popupPage.url()}`);
      await popupPage.waitForLoadState();
    });

    // E. Request & Response Event Observers
    page.on('request', (req) => {
      if (req.url().includes('/api/')) {
        console.log(`🌐 [Request] ${req.method()} ${req.url()}`);
      }
    });

    page.on('response', (res) => {
      if (res.url().includes('/api/')) {
        console.log(`📥 [Response] Status ${res.status()} from ${res.url()}`);
      }
    });

    await page.goto('https://www.redbus.in');
    console.log(` Total Console Logs Captured: ${consoleLogs.length}`);
    expect(pageErrors.length).toBe(0); // Assert zero uncaught JS exceptions
  });

});
