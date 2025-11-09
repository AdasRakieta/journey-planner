import express from 'express';
import {
  getAttractionsByStopId,
  createAttraction,
  updateAttraction,
  deleteAttraction,
} from '../controllers/attractionController';

const router = express.Router();

// Get all attractions for a stop
router.get('/stop/:stopId', getAttractionsByStopId);

// Create attraction for a stop
router.post('/stop/:stopId', createAttraction);

// Update attraction
router.put('/:id', updateAttraction);

// Delete attraction
router.delete('/:id', deleteAttraction);

export default router;
