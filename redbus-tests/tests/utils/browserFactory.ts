import { chromium, firefox, webkit, Browser, LaunchOptions } from '@playwright/test';

export class BrowserFactory {
  /**
   * Factory method to launch a browser instance with configured parameters.
   */
  static async getBrowser(
    type: 'chromium' | 'firefox' | 'webkit',
    options: LaunchOptions = {}
  ): Promise<Browser> {
    const launchOptions: LaunchOptions = {
      headless: true,
      ...options,
    };

    console.log(`🏭 BrowserFactory: Launching browser type "${type}"...`);

    switch (type) {
      case 'chromium':
        return await chromium.launch({
          ...launchOptions,
          args: [
            ...(launchOptions.args || []),
            '--disable-blink-features=AutomationControlled',
            '--disable-dev-shm-usage',      // Prevents memory limits issues in Docker/CI
            '--disable-gpu',
          ]
        });
      case 'firefox':
        return await firefox.launch(launchOptions);
      case 'webkit':
        return await webkit.launch(launchOptions);
      default:
        throw new Error(`Unsupported browser type: ${type}`);
    }
  }
}
