import * as path from 'path';
import * as fs from 'fs';

const configPath = path.join(__dirname, '../resources/testData.json');
const rawData = fs.readFileSync(configPath, 'utf-8');
const data = JSON.parse(rawData);

export const BASE_URL = 'https://www.redbus.in';

export const BUS_ROUTES = data.BUS_ROUTES;
export const HOTEL_DATA = data.HOTEL_DATA;
export const TRAIN_DATA = data.TRAIN_DATA;
export const USER_CREDENTIALS = {
  email: process.env.REDBUS_EMAIL || data.USER_CREDENTIALS.email,
  password: process.env.REDBUS_PASSWORD || data.USER_CREDENTIALS.password,
  phone: process.env.REDBUS_PHONE || data.USER_CREDENTIALS.phone,
};
export const PERFORMANCE = data.PERFORMANCE;
export const VIEWPORTS = data.VIEWPORTS;
export const API_ENDPOINTS = data.API_ENDPOINTS;

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
