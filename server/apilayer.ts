// APILayer integrations for B2B sales/marketing data enrichment
// https://apilayer.com
//
// Env vars (each falls back to APILAYER_API_KEY):
//   APILAYER_API_KEY           — unified marketplace key (newer APIs)
//   IPSTACK_ACCESS_KEY         — ipstack.com
//   WEATHERSTACK_ACCESS_KEY    — weatherstack.com
//   CURRENCYLAYER_ACCESS_KEY   — currencylayer.com
//   VATLAYER_ACCESS_KEY        — vatlayer.com
//   NUMVERIFY_ACCESS_KEY       — numverify.com
//   MARKETSTACK_ACCESS_KEY     — marketstack.com
//   SCREENSHOTLAYER_ACCESS_KEY — screenshotlayer.com
//   POSITIONSTACK_ACCESS_KEY   — positionstack.com
//   PDFLAYER_ACCESS_KEY        — pdflayer.com
//   LANGUAGELAYER_ACCESS_KEY   — languagelayer.com

function key(envVar: string): string {
  return process.env[envVar] || process.env.APILAYER_API_KEY || '';
}

async function apiFetch(url: string, opts?: RequestInit): Promise<any> {
  const res = await fetch(url, opts);
  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`APILayer ${res.status}: ${body}`);
  }
  return res.json();
}

// ── EMAIL VERIFICATION ────────────────────────────────────────────────────────
// Validates format, MX records, SMTP deliverability, disposable/catch-all detection
// Use before outreach to protect sender reputation
// Docs: https://apilayer.com/marketplace/email_verification-api
export async function verifyEmail(email: string) {
  return apiFetch(`https://api.apilayer.com/email_verification/${encodeURIComponent(email)}`, {
    headers: { apikey: key('APILAYER_API_KEY') },
  });
}

// ── PHONE VALIDATION (Numverify) ──────────────────────────────────────────────
// Validates phone numbers across 232 countries; detects carrier and line type
// Docs: https://apilayer.com/marketplace/numverify-api
export async function validatePhone(phone: string, countryCode?: string) {
  const p = new URLSearchParams({ access_key: key('NUMVERIFY_ACCESS_KEY'), number: phone });
  if (countryCode) p.set('country_code', countryCode);
  return apiFetch(`https://apilayer.net/api/validate?${p}`);
}

// ── IP GEOLOCATION (IPstack) ──────────────────────────────────────────────────
// Resolves any IPv4/IPv6 to location, timezone, currency, ISP
// Docs: https://apilayer.com/marketplace/ipstack-api
export async function getIpGeo(ip: string) {
  return apiFetch(`https://api.ipstack.com/${encodeURIComponent(ip)}?access_key=${key('IPSTACK_ACCESS_KEY')}`);
}

// ── CURRENCY EXCHANGE (Currencylayer) ─────────────────────────────────────────
// Live & historical forex rates for 168 currencies; used for multi-currency invoicing
// Docs: https://apilayer.com/marketplace/currency_data-api
export async function getExchangeRates(base = 'USD', symbols?: string[]) {
  const p = new URLSearchParams({ access_key: key('CURRENCYLAYER_ACCESS_KEY'), source: base });
  if (symbols?.length) p.set('currencies', symbols.join(','));
  return apiFetch(`https://api.currencylayer.com/live?${p}`);
}

export async function convertCurrency(amount: number, from: string, to: string) {
  const rates = await getExchangeRates(from, [to]);
  const rate: number | undefined = rates.quotes?.[`${from}${to}`];
  if (!rate) throw new Error(`No exchange rate for ${from}→${to}`);
  return { from, to, amount, converted: +(amount * rate).toFixed(4), rate };
}

// ── VAT VALIDATION (VATlayer) ─────────────────────────────────────────────────
// Validates EU VAT numbers; retrieves company name and address for invoicing
// Docs: https://apilayer.com/marketplace/vatlayer-api
export async function validateVAT(vatNumber: string) {
  return apiFetch(
    `https://apilayer.net/api/validate?access_key=${key('VATLAYER_ACCESS_KEY')}&vat_number=${encodeURIComponent(vatNumber)}`
  );
}

export async function getVATRates(countryCode: string) {
  return apiFetch(
    `https://apilayer.net/api/rate_list?access_key=${key('VATLAYER_ACCESS_KEY')}&country_codes=${countryCode}`
  );
}

// ── LANGUAGE DETECTION (Languagelayer) ───────────────────────────────────────
// Detects the language of any text; enables personalized outreach
// Docs: https://apilayer.com/marketplace/language_detection-api
export async function detectLanguage(text: string) {
  return apiFetch('https://api.apilayer.com/language_detection/detect', {
    method: 'POST',
    headers: { apikey: key('LANGUAGELAYER_ACCESS_KEY'), 'Content-Type': 'application/json' },
    body: JSON.stringify({ q: text }),
  });
}

// ── WEATHER (Weatherstack) ────────────────────────────────────────────────────
// Real-time weather for any location; useful for context-aware campaign timing
// Docs: https://apilayer.com/marketplace/weatherstack-api
export async function getWeather(location: string) {
  const p = new URLSearchParams({
    access_key: key('WEATHERSTACK_ACCESS_KEY'),
    query: location,
    units: 'm',
  });
  return apiFetch(`https://api.weatherstack.com/current?${p}`);
}

// ── STOCK DATA (Marketstack) ──────────────────────────────────────────────────
// Real-time and historical stock quotes; powers company intelligence features
// Docs: https://apilayer.com/marketplace/marketstack-api
export async function getStockQuote(symbol: string) {
  const p = new URLSearchParams({
    access_key: key('MARKETSTACK_ACCESS_KEY'),
    symbols: symbol,
  });
  return apiFetch(`https://api.marketstack.com/v2/eod/latest?${p}`);
}

// ── WEBSITE SCREENSHOT (Screenshotlayer) ─────────────────────────────────────
// Returns a signed capture URL; render it in an <img> for lead profiles / proposals
// Docs: https://apilayer.com/marketplace/screenshotlayer-api
export function getScreenshotUrl(targetUrl: string, opts?: { width?: number; viewport?: string }): string {
  const p = new URLSearchParams({
    access_key: key('SCREENSHOTLAYER_ACCESS_KEY'),
    url: targetUrl,
    viewport: opts?.viewport || '1440x900',
    width: String(opts?.width || 1440),
    format: 'png',
  });
  return `https://api.screenshotlayer.com/api/capture?${p}`;
}

// ── ADDRESS GEOCODING (Positionstack) ─────────────────────────────────────────
// Forward geocoding: converts addresses to lat/lng for lead enrichment and mapping
// Docs: https://apilayer.com/marketplace/positionstack-api
export async function geocodeAddress(address: string, countryCode?: string) {
  const p = new URLSearchParams({
    access_key: key('POSITIONSTACK_ACCESS_KEY'),
    query: address,
    limit: '1',
  });
  if (countryCode) p.set('country', countryCode);
  return apiFetch(`https://api.positionstack.com/v1/forward?${p}`);
}

// ── PDF GENERATION (Pdflayer) ──────────────────────────────────────────────────
// Converts HTML or a URL to a PDF download; used for proposals and invoices
// Docs: https://apilayer.com/marketplace/pdflayer-api
export function getPdfUrl(content: string, isUrl = false): string {
  const p = new URLSearchParams({
    access_key: key('PDFLAYER_ACCESS_KEY'),
    [isUrl ? 'document_url' : 'document_html']: content,
    document_name: 'document.pdf',
  });
  return `https://api.pdflayer.com/api/convert?${p}`;
}
