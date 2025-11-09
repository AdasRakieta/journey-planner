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
router.get('/journeys/:journeyId/stops', getStopsByJourneyId);

// Create stop
router.post('/journeys/:journeyId/stops', createStop);

// Update stop
router.put('/stops/:id', updateStop);

// Delete stop
router.delete('/stops/:id', deleteStop);

// Reverse geocoding - coordinates to address
router.post('/stops/reverse-geocode', reverseGeocode);

// Scrape Booking.com URL
router.post('/stops/scrape-booking', scrapeBookingUrl);

export default router;
