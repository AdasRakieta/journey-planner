import { Request, Response } from 'express';
import { query } from '../config/db';
import axios from 'axios';
import * as cheerio from 'cheerio';

// Helper function to convert snake_case to camelCase
const toCamelCase = (obj: any): any => {
  if (Array.isArray(obj)) {
    return obj.map(item => toCamelCase(item));
  }
  // Keep Date objects as ISO strings
  if (obj instanceof Date) {
    return obj.toISOString();
  }
  if (obj !== null && typeof obj === 'object') {
    return Object.keys(obj).reduce((acc, key) => {
      const camelKey = key.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
      const value = obj[key];
      
      // Convert Date objects to ISO strings
      if (value instanceof Date) {
        acc[camelKey] = value.toISOString();
      }
      // Convert numeric strings to numbers for specific fields
      else if (typeof value === 'string' && 
               (key.includes('price') || key.includes('cost') || 
                key === 'latitude' || key === 'longitude') &&
               /^-?\d+(\.\d+)?$/.test(value)) {
        acc[camelKey] = parseFloat(value);
      }
      else {
        acc[camelKey] = toCamelCase(value);
      }
      
      return acc;
    }, {} as any);
  }
  return obj;
};

// Get all stops for a journey
export const getStopsByJourneyId = async (req: Request, res: Response) => {
  try {
    const journeyId = parseInt(req.params.journeyId);
    const result = await query(
      'SELECT * FROM stops WHERE journey_id = $1 ORDER BY arrival_date ASC',
      [journeyId]
    );
    res.json(toCamelCase(result.rows));
  } catch (error) {
    console.error('Error fetching stops:', error);
    res.status(500).json({ message: 'Failed to fetch stops' });
  }
};

// Create stop
export const createStop = async (req: Request, res: Response) => {
  try {
    const journeyId = parseInt(req.params.journeyId);
    const {
      city,
      country,
      latitude,
      longitude,
      arrivalDate,
      departureDate,
      accommodationName,
      accommodationUrl,
      accommodationPrice,
      accommodationCurrency,
      notes
    } = req.body;
    
    const result = await query(
      `INSERT INTO stops (
        journey_id, city, country, latitude, longitude,
        arrival_date, departure_date, accommodation_name,
        accommodation_url, accommodation_price, accommodation_currency, notes
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12) RETURNING *`,
      [
        journeyId, city, country, latitude, longitude,
        arrivalDate, departureDate, accommodationName,
        accommodationUrl, accommodationPrice, accommodationCurrency, notes
      ]
    );
    
    const stop = toCamelCase(result.rows[0]);
    
    // Emit Socket.IO event
    const io = req.app.get('io');
    io.emit('stop:created', stop);
    
    res.status(201).json(stop);
  } catch (error) {
    console.error('Error creating stop:', error);
    res.status(500).json({ message: 'Failed to create stop' });
  }
};

// Update stop
export const updateStop = async (req: Request, res: Response) => {
  try {
    const stopId = parseInt(req.params.id);
    const {
      city,
      country,
      latitude,
      longitude,
      arrivalDate,
      departureDate,
      accommodationName,
      accommodationUrl,
      accommodationPrice,
      accommodationCurrency,
      notes
    } = req.body;
    
    const result = await query(
      `UPDATE stops SET
        city=$1, country=$2, latitude=$3, longitude=$4,
        arrival_date=$5, departure_date=$6, accommodation_name=$7,
        accommodation_url=$8, accommodation_price=$9, accommodation_currency=$10, notes=$11
      WHERE id=$12 RETURNING *`,
      [
        city, country, latitude, longitude,
        arrivalDate, departureDate, accommodationName,
        accommodationUrl, accommodationPrice, accommodationCurrency, notes, stopId
      ]
    );
    
    if (!result.rows[0]) {
      return res.status(404).json({ message: 'Stop not found' });
    }
    
    const stop = toCamelCase(result.rows[0]);
    
    // Emit Socket.IO event
    const io = req.app.get('io');
    io.emit('stop:updated', stop);
    
    res.json(stop);
  } catch (error) {
    console.error('Error updating stop:', error);
    res.status(500).json({ message: 'Failed to update stop' });
  }
};

// Delete stop
export const deleteStop = async (req: Request, res: Response) => {
  try {
    const stopId = parseInt(req.params.id);
    await query('DELETE FROM stops WHERE id = $1', [stopId]);
    
    // Emit Socket.IO event
    const io = req.app.get('io');
    io.emit('stop:deleted', { id: stopId });
    
    res.json({ message: 'Stop deleted successfully' });
  } catch (error) {
    console.error('Error deleting stop:', error);
    res.status(500).json({ message: 'Failed to delete stop' });
  }
};

// Reverse Geocoding - coordinates to address
export const reverseGeocode = async (req: Request, res: Response) => {
  try {
    const { latitude, longitude } = req.body;
    
    if (!latitude || !longitude) {
      return res.status(400).json({ 
        success: false,
        message: 'Latitude and longitude are required' 
      });
    }
    
    // Use Nominatim OpenStreetMap API (free, no API key needed)
    const response = await axios.get('https://nominatim.openstreetmap.org/reverse', {
      params: {
        lat: latitude,
        lon: longitude,
        format: 'json',
        addressdetails: 1,
      },
      headers: {
        'User-Agent': 'JourneyPlannerApp/1.0',
      },
      timeout: 5000,
    });

    const data = response.data;
    const address = data.address || {};

    res.json({
      success: true,
      data: toCamelCase({
        address: data.display_name || '',
        street: address.road || address.street || '',
        city: address.city || address.town || address.village || address.municipality || '',
        country: address.country || '',
        countryCode: address.country_code?.toUpperCase() || '',
        postcode: address.postcode || '',
      }),
      message: 'Address found successfully'
    });
    
  } catch (error: any) {
    console.error('Error reverse geocoding:', error.message);
    res.status(500).json({ 
      success: false,
      message: 'Failed to get address from coordinates. Please enter manually.' 
    });
  }
};

// Scrape Booking.com URL - Real HTML scraping
export const scrapeBookingUrl = async (req: Request, res: Response) => {
  try {
    const { url } = req.body;
    
    if (!url || !url.includes('booking.com')) {
      return res.status(400).json({ 
        success: false,
        message: 'Invalid Booking.com URL' 
      });
    }

    // Fetch HTML page
    const response = await axios.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
      },
      timeout: 10000,
    });

    const $ = cheerio.load(response.data);
    
    // Extract hotel name - use title tag as fallback
    let hotelName = $('h2[data-testid="title"]').text().trim();
    if (!hotelName) hotelName = $('h2.pp-header__title').text().trim();
    if (!hotelName) hotelName = $('h1').first().text().trim();
    if (!hotelName) {
      // Extract from page title
      const title = $('title').text().trim();
      if (title) {
        hotelName = title.split(',')[0].trim();
      }
    }
    
    // Extract city and country from meta keywords or title
    let city = '';
    let country = '';
    let address = '';
    
    // Try to extract from page title (most reliable)
    const pageTitle = $('title').text().trim();
    if (pageTitle) {
      // Format: "Hotel Name, City (extra info)" or "Hotel Name, City, Country"
      const titleParts = pageTitle.split(',').map(p => p.trim());
      if (titleParts.length >= 2) {
        city = titleParts[1].replace(/\([^)]*\)/g, '').trim(); // Remove parentheses
      }
    }
    
    // Try meta keywords for country
    const keywords = $('meta[name="keywords"]').attr('content');
    if (keywords) {
      const parts = keywords.split(',').map(p => p.trim());
      // Format: "Hotel Name, City, Country, District, Region"
      if (parts.length >= 3) {
        if (!city) city = parts[1]; // Fallback for city
        country = parts[2]; // Third element is usually country
      }
    }
    
    // Fallback to location tooltip
    if (!city) {
      const locationText = $('span[data-node_tt_id="location_score_tooltip"]').text().trim();
      if (locationText) {
        const parts = locationText.split(',').map(p => p.trim());
        if (parts.length >= 2) {
          city = parts[0];
          country = parts[parts.length - 1];
        }
      }
    }
    
    // Try breadcrumb as last resort
    if (!city) {
      const breadcrumb = $('.bui-breadcrumb__text').last().text().trim();
      if (breadcrumb) city = breadcrumb;
    }
    
    // Extract address
    address = $('span[data-node_tt_id="location_address"]').text().trim();
    if (!address) address = $('.hp_address_subtitle').text().trim();
    
    // Extract price (may not always be available)
    let price: number | null = null;
    let currency = 'PLN';
    
    const priceText = $('span[data-testid="price-and-discounted-price"]').text().trim();
    if (priceText) {
      const priceMatch = priceText.match(/[\d\s,]+/);
      if (priceMatch) {
        price = parseFloat(priceMatch[0].replace(/\s/g, '').replace(',', '.'));
      }
      if (priceText.includes('zł')) currency = 'PLN';
      else if (priceText.includes('€')) currency = 'EUR';
      else if (priceText.includes('$')) currency = 'USD';
    }
    
    // Parse URL for dates (fallback)
    const urlObj = new URL(url);
    const checkin = urlObj.searchParams.get('checkin') || '';
    const checkout = urlObj.searchParams.get('checkout') || '';

    // Return scraped data
    res.json({
      success: true,
      data: toCamelCase({
        accommodationName: hotelName || '',
        accommodationUrl: url,
        city: city || '',
        country: country || '',
        address: address || '',
        arrivalDate: checkin,
        departureDate: checkout,
        accommodationPrice: price,
        accommodationCurrency: currency
      }),
      message: hotelName 
        ? `Hotel details extracted: ${hotelName}${city ? ' in ' + city : ''}${price ? `, ${price} ${currency}` : ''}`
        : 'Could not extract all details. Please verify and fill manually.'
    });
    
  } catch (error: any) {
    console.error('Error scraping Booking URL:', error.message);
    res.status(500).json({ 
      success: false,
      message: `Failed to scrape Booking.com page: ${error.message}. Please enter details manually.` 
    });
  }
};
