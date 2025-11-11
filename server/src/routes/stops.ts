import express from 'express';
import {
  getStopsByJourneyId,
  createStop,
  updateStop,
  deleteStop,
  reverseGeocode,
  scrapeBookingUrl,
} from '../controllers/stopController';
import { authenticateToken } from '../middleware/auth';

const router = express.Router();

// Get all stops for a journey
router.get('/journey/:journeyId', authenticateToken, getStopsByJourneyId);

// Create stop for a journey
router.post('/journey/:journeyId', authenticateToken, createStop);

// Update stop
router.put('/:id', authenticateToken, updateStop);

// Delete stop
router.delete('/:id', authenticateToken, deleteStop);

// Reverse geocoding - coordinates to address
router.post('/reverse-geocode', authenticateToken, reverseGeocode);

// Scrape Booking.com URL
router.post('/scrape-booking', authenticateToken, scrapeBookingUrl);

export default router;
