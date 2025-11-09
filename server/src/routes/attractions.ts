import express from 'express';
import {
  getAttractionsByStopId,
  createAttraction,
  updateAttraction,
  deleteAttraction,
} from '../controllers/attractionController';

const router = express.Router();

// Get all attractions for a stop
router.get('/stops/:stopId/attractions', getAttractionsByStopId);

// Create attraction
router.post('/stops/:stopId/attractions', createAttraction);

// Update attraction
router.put('/attractions/:id', updateAttraction);

// Delete attraction
router.delete('/attractions/:id', deleteAttraction);

export default router;
