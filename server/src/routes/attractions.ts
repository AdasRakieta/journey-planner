import express from 'express';
import {
  getAttractionsByStopId,
  createAttraction,
  updateAttraction,
  deleteAttraction,
  reorderAttractions,
  moveAttraction,
  updateAttractionPriority,
  bulkUpdateAttractions,
} from '../controllers/attractionController';
import { authenticateToken } from '../middleware/auth';

const router = express.Router();

// Get all attractions for a stop
router.get('/stop/:stopId', authenticateToken, getAttractionsByStopId);

// Create attraction for a stop
router.post('/stop/:stopId', authenticateToken, createAttraction);

// Update attraction
router.put('/:id', authenticateToken, updateAttraction);

// Reorder attractions within a stop
router.patch('/stop/:stopId/reorder', authenticateToken, reorderAttractions);

// Bulk update attractions (order, priority, dates, move between stops)
router.patch('/bulk', authenticateToken, bulkUpdateAttractions);

// Move attraction to another stop
router.patch('/:id/move', authenticateToken, moveAttraction);

// Update attraction priority
router.patch('/:id/priority', authenticateToken, updateAttractionPriority);

// Delete attraction
router.delete('/:id', authenticateToken, deleteAttraction);

export default router;
