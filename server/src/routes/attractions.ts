import express from 'express';
import {
  getAttractionsByStopId,
  createAttraction,
  updateAttraction,
  deleteAttraction,
} from '../controllers/attractionController';
import { authenticateToken } from '../middleware/auth';

const router = express.Router();

// Get all attractions for a stop
router.get('/stop/:stopId', authenticateToken, getAttractionsByStopId);

// Create attraction for a stop
router.post('/stop/:stopId', authenticateToken, createAttraction);

// Update attraction
router.put('/:id', authenticateToken, updateAttraction);

// Delete attraction
router.delete('/:id', authenticateToken, deleteAttraction);

export default router;
