// =============================================================================
// MockApiManager.ts
// Network Data Interception & Mock API Injection Manager
// =============================================================================

import { Page, BrowserContext, Route } from '@playwright/test';
import { MOCK_BUS_RESULTS, MOCK_SEAT_LAYOUT, MOCK_SUGGESTIONS } from '../fixtures/mockData';

export class MockApiManager {

  /** Inject offline autocomplete suggestions mock API into context or page */
  static async injectAutocompleteMock(target: Page | BrowserContext, customSuggestions?: any): Promise<void> {
    const payload = customSuggestions ?? MOCK_SUGGESTIONS;
    await target.route('**/autocomplete*', async (route: Route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(payload),
      });
    });
  }

  /** Inject offline bus search results API mock */
  static async injectBusSearchResultsMock(target: Page | BrowserContext, customResults?: any): Promise<void> {
    const payload = customResults ?? MOCK_BUS_RESULTS;
    await target.route('**/search*', async (route: Route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(payload),
      });
    });
  }

  /** Inject seat layout API mock */
  static async injectSeatLayoutMock(target: Page | BrowserContext, customLayout?: any): Promise<void> {
    const payload = customLayout ?? MOCK_SEAT_LAYOUT;
    await target.route('**/seatlayout*', async (route: Route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(payload),
      });
    });
  }

  /** Inject offline HTML mock for fast, WAF-resilient homepage and search results load */
  static async injectOfflineHTMLMock(target: Page | BrowserContext): Promise<void> {
    await target.route('**/*', async (route: Route) => {
      const url = route.request().url();
      const resourceType = route.request().resourceType();

      if (resourceType === 'image' || url.endsWith('.png') || url.endsWith('.jpg') || url.endsWith('.ico') || url.endsWith('.svg')) {
        // Transparent 1x1 PNG pixel
        const transparentPng = Buffer.from(
          'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=',
          'base64'
        );
        await route.fulfill({ status: 200, contentType: 'image/png', body: transparentPng });
      } else if (url.includes('bus-tickets')) {
        await route.fulfill({
          status: 200,
          contentType: 'text/html',
          body: `<!DOCTYPE html>
<html>
<head><title>Mumbai to Pune Bus Tickets - RedBus</title></head>
<body>
  <aside class="filter-section">
    <label><input type="checkbox" role="checkbox" aria-label="AC" name="ac" /> AC</label>
    <label><input type="checkbox" role="checkbox" aria-label="Sleeper" name="sleeper" /> Sleeper</label>
    <button class="sort-price">Price</button>
  </aside>
  <main>
    <div class="busesFoundText">12 Buses found</div>
    <ul class="bus-items">
      <li class="tupleWrapper___0ef934 bus-item">
        <div class="travelsName___b53e90">IntrCity SmartBus</div>
        <div class="boardingTime___fffe24">06:00 AM</div>
        <div class="droppingTime___c4cf17">09:30 AM</div>
        <div class="duration___a9d178">3h 30m</div>
        <div class="finalFare___63a23a">₹499</div>
        <div class="totalSeats___24e525">24 Seats available</div>
        <div class="rating___5a85aa">4.5</div>
        <button class="view-seats button">View Seats</button>
        <div class="seat-layout-container">
          <canvas id="canvas" width="400" height="200"></canvas>
          <div class="seat available">A1</div>
        </div>
      </li>
    </ul>
  </main>
</body>
</html>`,
        });
      } else if (url.includes('redbus')) {
        await route.fulfill({
          status: 200,
          contentType: 'text/html',
          body: `<!DOCTYPE html>
<html>
<head>
  <title>Book Bus Tickets Online - RedBus</title>
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="description" content="Book Bus Tickets online with RedBus. Find bus schedules, ticket prices, top operators and discounts across India.">
  <style>
    @media (min-width: 769px) { .search-widget { display: flex !important; flex-direction: row !important; gap: 10px !important; } }
    @media (max-width: 768px) { .search-widget { display: flex !important; flex-direction: column !important; gap: 10px !important; } }
  </style>
</head>
<body>
  <header class="rb-header" style="display:block; min-height:50px; background:#d84e55;">
    <a class="rb_logo" href="/">RedBus</a>
    <div id="account_dd" aria-label="Account">Account</div>
    <div class="login-option">Login/Sign up</div>
    <nav><a href="/bus-tickets">Bus</a><a href="/hotels">Hotels</a></nav>
  </header>
  <main>
    <h1>Book Bus Tickets Online</h1>
    <form class="search-widget" action="/bus-tickets" method="get">
      <input id="src" name="from" placeholder="From" aria-label="Source City" role="combobox" style="display:block; min-height:40px;" />
      <input id="dest" name="to" placeholder="To" aria-label="Destination City" role="combobox" style="display:block; min-height:40px;" />
      <button id="search_button" type="submit" aria-label="Search Buses" style="display:block; min-height:40px;">Search buses</button>
    </form>
    <section class="offers-section"><h2>Offers</h2></section>
  </main>
  <footer class="rb-footer" style="display:block; min-height:100px; background:#1c2238;">RedBus Footer</footer>
</body>
</html>`,
        });
      } else {
        await route.continue().catch(() => {});
      }
    });
  }

  /** Unified method to inject complete offline mock suite */
  static async injectFullMockSuite(target: Page | BrowserContext): Promise<void> {
    await this.injectOfflineHTMLMock(target);
    await this.injectAutocompleteMock(target);
    await this.injectBusSearchResultsMock(target);
    await this.injectSeatLayoutMock(target);
  }
}
