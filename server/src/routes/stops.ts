import express from 'express';
import {
  getStopsByJourneyId,
  createStop,
  updateStop,
  deleteStop,
  reverseGeocode,
  scrapeBookingUrl,
} from '../controllers/stopController';

const router = express.Router();

// Get all stops for a journey
router.get('/journey/:journeyId', getStopsByJourneyId);

// Create stop for a journey
router.post('/journey/:journeyId', createStop);

// Update stop
router.put('/:id', updateStop);

// Delete stop
router.delete('/:id', deleteStop);

// Reverse geocoding - coordinates to address
router.post('/reverse-geocode', reverseGeocode);

// Scrape Booking.com URL
router.post('/scrape-booking', scrapeBookingUrl);

export default router;
