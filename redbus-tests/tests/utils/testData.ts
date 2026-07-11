// ─────────────────────────────────────────────────────────────────────────────
// Test Data – RedBus Playwright Suite
// ─────────────────────────────────────────────────────────────────────────────

export const BASE_URL = 'https://www.redbus.in';

/** Returns a future date string in DD-MMM-YYYY format (offset days from today) */
export function getFutureDate(offsetDays: number = 5): string {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
                  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const dd   = String(d.getDate()).padStart(2, '0');
  const mon  = months[d.getMonth()];
  const yyyy = d.getFullYear();
  return `${dd}-${mon}-${yyyy}`;   // e.g. "15-Jun-2026"
}

/** Returns ISO date string used for URL parameters */
export function getISODate(offsetDays: number = 5): string {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  return d.toISOString().split('T')[0];           // e.g. "2026-06-15"
}

// ─── Bus Routes ───────────────────────────────────────────────────────────────
export const BUS_ROUTES = {
  valid: {
    source:      'Mumbai',
    destination: 'Pune',
    sourceCode:  'Mumbai',
    destCode:    'Pune',
  },
  longDistance: {
    source:      'Bangalore',
    destination: 'Chennai',
  },
  intercity: {
    source:      'Delhi',
    destination: 'Jaipur',
  },
  invalid: {
    source:      'XYZ_INVALID_CITY_12345',
    destination: 'ABC_NOWHERE_99999',
  },
};

// ─── Hotel Data ───────────────────────────────────────────────────────────────
export const HOTEL_DATA = {
  city:         'Mumbai',
  checkInDays:  3,
  checkOutDays: 5,
  guests:       2,
  rooms:        1,
};

// ─── Train (RedRail) Data ─────────────────────────────────────────────────────
export const TRAIN_DATA = {
  source:      'Mumbai',
  destination: 'Delhi',
};

// ─── User Credentials (use env vars in CI) ────────────────────────────────────
export const USER_CREDENTIALS = {
  email:    process.env.REDBUS_EMAIL    || 'testuser@example.com',
  password: process.env.REDBUS_PASSWORD || 'Test@12345',
  phone:    process.env.REDBUS_PHONE    || '9999999999',
};

// ─── Performance Thresholds ───────────────────────────────────────────────────
export const PERFORMANCE = {
  pageLoadMs:   8000,   // 8 s max for homepage
  searchLoadMs: 12000,  // 12 s max for search results
};

// ─── Viewports ────────────────────────────────────────────────────────────────
export const VIEWPORTS = {
  mobile:  { width: 375,  height: 812 },
  tablet:  { width: 768,  height: 1024 },
  desktop: { width: 1280, height: 720 },
  wide:    { width: 1920, height: 1080 },
};

// ─── API Endpoints ────────────────────────────────────────────────────────────
export const API_ENDPOINTS = {
  home:          '/',
  busSearch:     '/bus-tickets',
  hotels:        '/hotels',
  trains:        '/redRail',
  offers:        '/offers',
  sitemap:       '/sitemap.xml',
};
