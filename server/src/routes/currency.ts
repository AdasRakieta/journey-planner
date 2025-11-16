import express from 'express';
import { getRates as loadRatesCache, forceRefresh } from '../services/currencyService';

const router = express.Router();

// GET /api/currency/rates?base=USD - returns cached rates (refreshes automatically if stale)
router.get('/rates', async (req, res) => {
  try {
    const base = (req.query.base as string) || 'PLN';
    const cache = await loadRatesCache(base);
    return res.json({ base: cache.base, timestamp: cache.timestamp, rates: cache.rates });
  } catch (err: any) {
    console.error('Failed to get rates:', err);
    return res.status(500).json({ message: 'Failed to get rates' });
  }
});

// POST /api/currency/refresh - force refresh rates from upstream
router.post('/refresh', async (req, res) => {
  try {
    const base = (req.body.base as string) || 'PLN';
    const refreshed = await forceRefresh(base);
    return res.json({ message: 'Refreshed', base: refreshed.base, timestamp: refreshed.timestamp });
  } catch (err: any) {
    console.error('Failed to refresh rates:', err);
    return res.status(500).json({ message: 'Failed to refresh rates' });
  }
});

export default router;
