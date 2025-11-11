import express from 'express';
import {
  createJourney,
  getAllJourneys,
  getJourneyById,
  updateJourney,
  deleteJourney,
  calculateTotalCost,
  shareJourney,
  getSharedWithMe,
  acceptInvitation,
  rejectInvitation,
} from '../controllers/journeyController';
import { authenticateToken } from '../middleware/auth';

const router = express.Router();

// Protected routes - require authentication
router.post('/', authenticateToken, createJourney);
router.get('/', authenticateToken, getAllJourneys);
router.get('/shared-with-me', authenticateToken, getSharedWithMe);
router.get('/:id', authenticateToken, getJourneyById);
router.put('/:id', authenticateToken, updateJourney);
router.delete('/:id', authenticateToken, deleteJourney);
router.post('/:id/calculate-cost', authenticateToken, calculateTotalCost);
router.post('/:id/share', authenticateToken, shareJourney);
router.post('/invitations/accept', authenticateToken, acceptInvitation);
router.post('/invitations/:id/reject', authenticateToken, rejectInvitation);

export default router;
