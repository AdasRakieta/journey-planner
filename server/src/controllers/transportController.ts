import { Request, Response } from 'express';
import { query } from '../config/db';
import { scrapeTicketData } from '../services/ticketScraper';

// Convert snake_case to camelCase and handle Date objects
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

// Get all transports for a journey
export const getTransportsByJourneyId = async (req: Request, res: Response) => {
  try {
    const journeyId = parseInt(req.params.journeyId);
    const result = await query(
      'SELECT * FROM transports WHERE journey_id = $1 ORDER BY departure_date ASC',
      [journeyId]
    );
    res.json(toCamelCase(result.rows));
  } catch (error) {
    console.error('Error fetching transports:', error);
    res.status(500).json({ message: 'Failed to fetch transports' });
  }
};

// Create transport
export const createTransport = async (req: Request, res: Response) => {
  try {
    const journeyId = parseInt(req.params.journeyId);
    const {
      type,
      fromLocation,
      toLocation,
      departureDate,
      arrivalDate,
      price,
      currency,
      bookingUrl,
      notes
    } = req.body;
    
    // Convert empty strings to null for optional date fields
    const cleanArrivalDate = arrivalDate && arrivalDate.trim() !== '' ? arrivalDate : null;
    const cleanDepartureDate = departureDate && departureDate.trim() !== '' ? departureDate : null;
    
    const result = await query(
      `INSERT INTO transports (
        journey_id, type, from_location, to_location,
        departure_date, arrival_date, price, currency, booking_url, notes
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING *`,
      [
        journeyId, type, fromLocation, toLocation,
        cleanDepartureDate, cleanArrivalDate, price, currency, bookingUrl, notes
      ]
    );
    
    const transport = toCamelCase(result.rows[0]);
    
    // Emit Socket.IO event
    const io = req.app.get('io');
    io.emit('transport:created', transport);
    
    res.status(201).json(transport);
  } catch (error) {
    console.error('Error creating transport:', error);
    res.status(500).json({ message: 'Failed to create transport' });
  }
};

// Update transport
export const updateTransport = async (req: Request, res: Response) => {
  try {
    const transportId = parseInt(req.params.id);
    // Handle payment status toggle as a lightweight partial update
    if (req.body.isPaid !== undefined && Object.keys(req.body).length === 1) {
      console.log(`✅ Updating transport ${transportId} payment status to:`, req.body.isPaid);
      const { isPaid } = req.body;
      const paidResult = await query(
        `UPDATE transports SET is_paid=$1 WHERE id=$2 RETURNING *`,
        [isPaid, transportId]
      );
      if (!paidResult.rows[0]) {
        console.error(`❌ Transport ${transportId} not found`);
        return res.status(404).json({ message: 'Transport not found' });
      }
      const updated = toCamelCase(paidResult.rows[0]);
      console.log(`✅ Transport ${transportId} updated successfully, is_paid=${updated.isPaid}`);
      const io = req.app.get('io');
      io.emit('transport:updated', updated);
      return res.json(updated);
    }

    const {
      type,
      fromLocation,
      toLocation,
      departureDate,
      arrivalDate,
      price,
      currency,
      bookingUrl,
      notes
    } = req.body;
    
    // Convert empty strings to null for optional date fields
    const cleanArrivalDate = arrivalDate && arrivalDate.trim() !== '' ? arrivalDate : null;
    const cleanDepartureDate = departureDate && departureDate.trim() !== '' ? departureDate : null;
    
    const result = await query(
      `UPDATE transports SET
        type=$1, from_location=$2, to_location=$3,
        departure_date=$4, arrival_date=$5, price=$6,
        currency=$7, booking_url=$8, notes=$9
      WHERE id=$10 RETURNING *`,
      [
        type, fromLocation, toLocation,
        cleanDepartureDate, cleanArrivalDate, price,
        currency, bookingUrl, notes, transportId
      ]
    );
    
    if (!result.rows[0]) {
      return res.status(404).json({ message: 'Transport not found' });
    }
    
    const transport = toCamelCase(result.rows[0]);
    
    // Emit Socket.IO event
    const io = req.app.get('io');
    io.emit('transport:updated', transport);
    
    res.json(transport);
  } catch (error) {
    console.error('Error updating transport:', error);
    res.status(500).json({ message: 'Failed to update transport' });
  }
};

// Delete transport
export const deleteTransport = async (req: Request, res: Response) => {
  try {
    const transportId = parseInt(req.params.id);
    
    // Get journeyId before deleting
    const transportResult = await query('SELECT journey_id FROM transports WHERE id = $1', [transportId]);
    const journeyId = transportResult.rows[0]?.journey_id;
    
    await query('DELETE FROM transports WHERE id = $1', [transportId]);
    
    // Emit Socket.IO event with journeyId for proper filtering
    const io = req.app.get('io');
    io.emit('transport:deleted', { id: transportId, journeyId });
    
    res.json({ message: 'Transport deleted successfully' });
  } catch (error) {
    console.error('Error deleting transport:', error);
    res.status(500).json({ message: 'Failed to delete transport' });
  }
};

/**
 * Scrape ticket data from URL (flight, train, etc.)
 */
export const scrapeTicket = async (req: Request, res: Response) => {
  try {
    const { url } = req.body;
    
    if (!url) {
      return res.status(400).json({ message: 'URL is required' });
    }
    
    console.log(`🔍 Scraping ticket data from: ${url}`);
    const scrapedData = await scrapeTicketData(url);
    
    if (!scrapedData.success) {
      return res.status(400).json({ 
        message: 'Failed to scrape ticket data',
        error: scrapedData.error 
      });
    }
    
    console.log('✅ Scraped data:', scrapedData);
    res.json(scrapedData);
    
  } catch (error: any) {
    console.error('Error scraping ticket:', error);
    res.status(500).json({ 
      message: 'Failed to scrape ticket data',
      error: error.message 
    });
  }
};
