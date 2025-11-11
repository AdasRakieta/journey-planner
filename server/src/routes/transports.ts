import express from 'express';
import {
  getTransportsByJourneyId,
  createTransport,
  updateTransport,
  deleteTransport,
  scrapeTicket,
} from '../controllers/transportController';
import { authenticateToken } from '../middleware/auth';

const router = express.Router();

// Routes are mounted at /api/transports
router.get('/journey/:journeyId', authenticateToken, getTransportsByJourneyId);
router.post('/journey/:journeyId', authenticateToken, createTransport);
router.put('/:id', authenticateToken, updateTransport);
router.delete('/:id', authenticateToken, deleteTransport);
router.post('/scrape-ticket', authenticateToken, scrapeTicket);

export default router;
