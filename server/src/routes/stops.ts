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
import { validate } from '../middleware/validation';
import { createStopSchema, updateStopSchema } from '../schemas/stop.schema';

const router = express.Router();

// Get all stops for a journey
router.get('/journey/:journeyId', authenticateToken, getStopsByJourneyId);

// Create stop for a journey (params + body validation)
router.post('/journey/:journeyId', authenticateToken, validate(createStopSchema), createStop);

// Update stop (params + body validation)
router.put('/:id', authenticateToken, validate(updateStopSchema), updateStop);

// Delete stop
router.delete('/:id', authenticateToken, deleteStop);

// Reverse geocoding - coordinates to address
router.post('/reverse-geocode', authenticateToken, reverseGeocode);

// Scrape Booking.com URL
router.post('/scrape-booking', authenticateToken, scrapeBookingUrl);

export default router;
