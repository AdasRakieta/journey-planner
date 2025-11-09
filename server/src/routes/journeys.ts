import express from 'express';
import {
  createJourney,
  getAllJourneys,
  getJourneyById,
  updateJourney,
  deleteJourney,
  calculateTotalCost,
} from '../controllers/journeyController';

const router = express.Router();

router.post('/', createJourney);
router.get('/', getAllJourneys);
router.get('/:id', getJourneyById);
router.put('/:id', updateJourney);
router.delete('/:id', deleteJourney);
router.post('/:id/calculate-cost', calculateTotalCost);

export default router;
