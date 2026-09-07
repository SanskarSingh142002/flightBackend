// ── Live currency conversion to USD ───────────────────────────────────────────
// Fetches real-time exchange rates from a free API and caches them.
// Falls back to a static rate table if the API is unreachable.

const FALLBACK_RATES = {
  USD: 1,
  INR: 84,
  EUR: 0.92,
  GBP: 0.79,
  AED: 3.67,
  SGD: 1.35,
  JPY: 150,
  AUD: 1.52,
  CAD: 1.36,
  CNY: 7.2,
  HKD: 7.8,
  THB: 36,
  MYR: 4.7,
  IDR: 15500,
  PHP: 56,
  VND: 24500,
  BDT: 110,
  PKR: 278,
  LKR: 300,
  NPR: 112,
  KWD: 0.31,
  SAR: 3.75,
  QAR: 3.64,
  OMR: 0.38,
  BHD: 0.38,
  ZAR: 18.5,
  BRL: 5.0,
  MXN: 17.0,
  RUB: 92,
  TRY: 32,
  KRW: 1350,
  NZD: 1.65,
  CHF: 0.88,
  SEK: 10.5,
  NOK: 10.7,
  DKK: 6.9,
  PLN: 4.0,
  CZK: 23,
  HUF: 360,
  ILS: 3.7,
  EGP: 48,
  NGN: 1500,
  KES: 130,
  GHS: 12,
  MAD: 10,
  DZD: 135,
  TND: 3.1,
  JOD: 0.71,
  LBP: 15000,
  IQD: 1310,
  IRR: 42000,
  AFN: 71,
  UZS: 12600,
  KZT: 450,
  AZN: 1.7,
  GEL: 2.7,
  AMD: 390,
  BYN: 3.3,
  UAH: 39,
  MDL: 17.6,
  RON: 4.6,
  BGN: 1.8,
  RSD: 108,
  HRK: 7.0,
  BAM: 1.8,
  MKD: 56,
  ALL: 94,
  ISK: 138,
  FJD: 2.25,
  PGK: 3.8,
  SBD: 8.4,
  TOP: 2.35,
  WST: 2.7,
  VUV: 118,
  XPF: 110,
  CDF: 2800,
  XAF: 600,
  XOF: 600,
  GMD: 67,
  GNF: 8600,
  SLL: 21000,
  LRD: 193,
  SLE: 22,
  MRU: 39,
  MUR: 46,
  SCR: 13.5,
  KMF: 450,
  DJF: 178,
  ERN: 15,
  ETB: 57,
  SOS: 570,
  SSP: 1300,
  SDG: 600,
  TZS: 2500,
  UGX: 3800,
  RWF: 1300,
  BIF: 2850,
  MWK: 1700,
  ZMW: 25,
  MZN: 64,
  AOA: 830,
  NAD: 18.5,
  BWP: 13.5,
  SZL: 18.5,
  LSL: 18.5,
  MGA: 4500,
  MOP: 8.0,
  TWD: 32,
  MNT: 3400,
  KHR: 4100,
  LAK: 21000,
  MMK: 2100,
  BND: 1.35,
  BTN: 84,
  MVR: 15.4,
  NPR: 112,
  PKR: 278,
  AFN: 71,
  TJS: 10.9,
  KGS: 89,
  TMT: 3.5,
  GYD: 209,
  SRD: 36,
  PYG: 7300,
  UYU: 39,
  ARS: 870,
  CLP: 950,
  COP: 3900,
  PEN: 3.7,
  BOB: 6.9,
  VES: 36,
  NIO: 36.5,
  HNL: 24.7,
  GTQ: 7.8,
  BZD: 2.0,
  SVC: 8.75,
  CRC: 510,
  PAB: 1.0,
  CUP: 24,
  DOP: 59,
  HTG: 133,
  JMD: 155,
  TTD: 6.8,
  BSD: 1.0,
  BBD: 2.0,
  XCD: 2.7,
  AWG: 1.8,
  ANG: 1.8,
  KYD: 0.83,
  BMD: 1.0,
  FKP: 0.79,
  GIP: 0.79,
  SHP: 0.79,
  IMP: 0.79,
  JEP: 0.79,
  GGP: 0.79,
  CVE: 100,
  STN: 22.5,
  SHP: 0.79,
};

// Cache live rates for 6 hours
let cachedRates = null;
let cacheTime = 0;
const CACHE_TTL = 6 * 60 * 60 * 1000; // 6 hours

/**
 * Fetch live exchange rates (USD as base) from a free API.
 * Returns { USD: 1, INR: 84, ... } or null on failure.
 */
const fetchLiveRates = async () => {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);

    const response = await fetch('https://open.er-api.com/v6/latest/USD', {
      signal: controller.signal,
    });
    clearTimeout(timeout);

    if (!response.ok) return null;

    const body = await response.json();
    if (body.result !== 'success' || !body.rates) return null;

    return { ...body.rates, USD: 1 };
  } catch {
    return null;
  }
};

/**
 * Get exchange rates, using cache or fetching fresh.
 */
const getRates = async () => {
  const now = Date.now();
  if (cachedRates && now - cacheTime < CACHE_TTL) {
    return cachedRates;
  }

  const live = await fetchLiveRates();
  if (live) {
    cachedRates = live;
    cacheTime = now;
    console.log('[currency] Live exchange rates loaded');
    return live;
  }

  console.warn('[currency] Live rates unavailable — using fallback rates');
  return FALLBACK_RATES;
};

/**
 * Convert an amount from any currency to USD.
 * @param {number|string} amount - The amount to convert
 * @param {string} currency - ISO currency code (e.g. 'INR', 'EUR')
 * @returns {number} Amount in USD (rounded to nearest integer)
 */
const convertToUSD = async (amount, currency = 'USD') => {
  const num = Number(amount) || 0;
  if (!num) return 0;

  let code = String(currency || 'USD').trim().toUpperCase();
  if (code === '₹' || code === 'RS' || code === 'RS.' || code === 'RUPEE' || code === 'RUPEES') {
    code = 'INR';
  }

  // Failsafe: If amount is unusually large (> 3500) and currency is USD or unspecified,
  // it is actually in INR (e.g. ₹78,831 -> ~$938 USD)
  if ((code === 'USD' || !code) && num > 3500) {
    console.warn(`[currency] Flight amount (${num}) exceeds USD threshold — auto-converting as INR`);
    code = 'INR';
  }

  if (code === 'USD') return Math.round(num);

  const rates = await getRates();
  const rate = rates[code];

  if (!rate) {
    console.warn(`[currency] No rate found for ${code} — returning raw amount`);
    return Math.round(num);
  }

  return Math.round(num / rate);
};

module.exports = { convertToUSD, getRates, FALLBACK_RATES };