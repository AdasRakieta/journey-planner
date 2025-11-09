import express from 'express';
import {
  getTransportsByJourneyId,
  createTransport,
  updateTransport,
  deleteTransport,
} from '../controllers/transportController';

const router = express.Router();

router.get('/journeys/:journeyId/transports', getTransportsByJourneyId);
router.post('/journeys/:journeyId/transports', createTransport);
router.put('/transports/:id', updateTransport);
router.delete('/transports/:id', deleteTransport);

export default router;
