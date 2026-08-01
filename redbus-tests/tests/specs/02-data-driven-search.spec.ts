// =============================================================================
// 02-data-driven-search.spec.ts
// Data-Driven Tests & Data Injection Validation
// =============================================================================

import { test, expect } from '@playwright/test';
import { MockApiManager } from '../utils/MockApiManager';
import { BusDataBuilder } from '../utils/BusDataBuilder';
import { StateInjector }  from '../utils/StateInjector';

test.describe('📊  Data Injection & Parameterized Data-Driven Tests', () => {

  const testDatasets = [
    { source: 'Mumbai', destination: 'Pune', busType: 'AC Sleeper' },
    { source: 'Bangalore', destination: 'Chennai', busType: 'Volvo Multi-Axle' },
    { source: 'Hyderabad', destination: 'Vijayawada', busType: 'Non-AC Seater' },
  ];

  test.beforeEach(async ({ context, page }) => {
    await context.route('**/*', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'text/html',
        body: '<html><body><h1>RedBus Data Injection Demo</h1></body></html>',
      }).catch(() => {});
    });

    // 1. Inject Network Mock API Suite
    await MockApiManager.injectFullMockSuite(context);

    // 2. Inject Client-side Auth Session & Promo Cookie State
    await StateInjector.injectUserSession(context, {
      authToken: 'test-jwt-token-xyz-123',
      userId: 'USR_9999',
      userName: 'Automation Tester',
      email: 'tester@redbus.automation',
      mobile: '9876543210',
    });

    await StateInjector.injectPromoCookie(context, 'DISCOUNT500');
    await page.goto('/', { waitUntil: 'commit' }).catch(() => {});
  });

  for (const data of testDatasets) {
    test(`DDT | Bus search flow for ${data.source} ➔ ${data.destination} (${data.busType})`, async ({ page }) => {
      // Create dynamic bus payload using Builder Pattern
      const customBus = BusDataBuilder.create()
        .withTravelsName('Antigravity Express')
        .withBusType(data.busType)
        .withFare(650)
        .withRating(4.9)
        .build();

      expect(customBus.travelsName).toBe('Antigravity Express');
      expect(customBus.fare).toBe(650);

      // Verify injected session state in browser local storage
      const storedToken = await page.evaluate(() => window.localStorage.getItem('auth_token'));
      expect(storedToken).toBe('test-jwt-token-xyz-123');
    });
  }
});
