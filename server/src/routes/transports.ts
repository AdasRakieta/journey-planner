import express from 'express';
import {
  getTransportsByJourneyId,
  createTransport,
  updateTransport,
  deleteTransport,
  scrapeTicket,
} from '../controllers/transportController';

const router = express.Router();

// Routes are mounted at /api/transports
router.get('/journey/:journeyId', getTransportsByJourneyId);
router.post('/journey/:journeyId', createTransport);
router.put('/:id', updateTransport);
router.delete('/:id', deleteTransport);
router.post('/scrape-ticket', scrapeTicket);

export default router;
