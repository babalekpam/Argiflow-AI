// APILayer enrichment endpoints
// Mount: app.use("/api/enrichment", apilayerRoutes)

import { Router } from "express";
import {
  verifyEmail,
  validatePhone,
  getIpGeo,
  getExchangeRates,
  convertCurrency,
  validateVAT,
  getVATRates,
  detectLanguage,
  getWeather,
  getStockQuote,
  getScreenshotUrl,
  geocodeAddress,
  getPdfUrl,
} from "./apilayer";

const router = Router();

// POST /api/enrichment/verify-email   { email }
router.post("/verify-email", async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ error: "email is required" });
    res.json(await verifyEmail(email));
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/enrichment/validate-phone   { phone, countryCode? }
router.post("/validate-phone", async (req, res) => {
  try {
    const { phone, countryCode } = req.body;
    if (!phone) return res.status(400).json({ error: "phone is required" });
    res.json(await validatePhone(phone, countryCode));
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/enrichment/ip-geo/:ip
router.get("/ip-geo/:ip", async (req, res) => {
  try {
    res.json(await getIpGeo(req.params.ip));
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/enrichment/exchange-rates?base=USD&symbols=EUR,GBP,CAD
router.get("/exchange-rates", async (req, res) => {
  try {
    const { base = "USD", symbols } = req.query as { base?: string; symbols?: string };
    const symbolList = symbols ? symbols.split(",").map((s) => s.trim()) : undefined;
    res.json(await getExchangeRates(base, symbolList));
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/enrichment/convert-currency   { amount, from, to }
router.post("/convert-currency", async (req, res) => {
  try {
    const { amount, from, to } = req.body;
    if (!amount || !from || !to)
      return res.status(400).json({ error: "amount, from, and to are required" });
    res.json(await convertCurrency(Number(amount), String(from), String(to)));
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/enrichment/validate-vat   { vatNumber }
router.post("/validate-vat", async (req, res) => {
  try {
    const { vatNumber } = req.body;
    if (!vatNumber) return res.status(400).json({ error: "vatNumber is required" });
    res.json(await validateVAT(vatNumber));
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/enrichment/vat-rates/:countryCode  (e.g. DE, FR, GB)
router.get("/vat-rates/:countryCode", async (req, res) => {
  try {
    res.json(await getVATRates(req.params.countryCode.toUpperCase()));
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/enrichment/detect-language   { text }
router.post("/detect-language", async (req, res) => {
  try {
    const { text } = req.body;
    if (!text) return res.status(400).json({ error: "text is required" });
    res.json(await detectLanguage(text));
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/enrichment/weather/:location  (city name or lat,lng)
router.get("/weather/:location", async (req, res) => {
  try {
    res.json(await getWeather(decodeURIComponent(req.params.location)));
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/enrichment/stock/:symbol  (e.g. AAPL, TSLA)
router.get("/stock/:symbol", async (req, res) => {
  try {
    res.json(await getStockQuote(req.params.symbol.toUpperCase()));
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/enrichment/screenshot   { url, width? }
router.post("/screenshot", (req, res) => {
  try {
    const { url, width } = req.body;
    if (!url) return res.status(400).json({ error: "url is required" });
    res.json({ url: getScreenshotUrl(url, { width: width ? Number(width) : undefined }) });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/enrichment/geocode   { address, countryCode? }
router.post("/geocode", async (req, res) => {
  try {
    const { address, countryCode } = req.body;
    if (!address) return res.status(400).json({ error: "address is required" });
    res.json(await geocodeAddress(address, countryCode));
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/enrichment/pdf   { html?, url?, isUrl? }
router.post("/pdf", (req, res) => {
  try {
    const { html, url, isUrl = false } = req.body;
    const content = isUrl ? url : html;
    if (!content) return res.status(400).json({ error: "html or url is required" });
    res.json({ url: getPdfUrl(content, Boolean(isUrl)) });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
