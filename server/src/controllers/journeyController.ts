import { Request, Response } from 'express';
import { query, getClient } from '../config/db';

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

export const getAllJourneys = async (req: Request, res: Response) => {
  try {
    // Get all journeys
    const journeysResult = await query(`SELECT * FROM journeys ORDER BY created_at DESC`);
    const journeys = journeysResult.rows;

    // For each journey, fetch related stops (with attractions) and transports
    const enrichedJourneys = await Promise.all(
      journeys.map(async (journey) => {
        // Fetch stops for this journey
        const stopsResult = await query(
          'SELECT * FROM stops WHERE journey_id = $1 ORDER BY arrival_date',
          [journey.id]
        );
        
        // For each stop, fetch attractions
        const stops = await Promise.all(
          stopsResult.rows.map(async (stop) => {
            const attractionsResult = await query(
              'SELECT * FROM attractions WHERE stop_id = $1',
              [stop.id]
            );
            return {
              ...stop,
              attractions: attractionsResult.rows
            };
          })
        );

        // Fetch transports for this journey
        const transportsResult = await query(
          'SELECT * FROM transports WHERE journey_id = $1 ORDER BY departure_date',
          [journey.id]
        );

        return {
          ...journey,
          stops,
          transports: transportsResult.rows
        };
      })
    );

    res.json(toCamelCase(enrichedJourneys));
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ message: 'Failed to fetch journeys' });
  }
};

export const getJourneyById = async (req: Request, res: Response) => {
  try {
    // Get journey
    const journeyResult = await query('SELECT * FROM journeys WHERE id = $1', [parseInt(req.params.id)]);
    if (!journeyResult.rows[0]) return res.status(404).json({ message: 'Not found' });
    
    const journey = journeyResult.rows[0];

    // Fetch stops for this journey
    const stopsResult = await query(
      'SELECT * FROM stops WHERE journey_id = $1 ORDER BY arrival_date',
      [journey.id]
    );
    
    // For each stop, fetch attractions
    const stops = await Promise.all(
      stopsResult.rows.map(async (stop) => {
        const attractionsResult = await query(
          'SELECT * FROM attractions WHERE stop_id = $1',
          [stop.id]
        );
        return {
          ...stop,
          attractions: attractionsResult.rows
        };
      })
    );

    // Fetch transports for this journey
    const transportsResult = await query(
      'SELECT * FROM transports WHERE journey_id = $1 ORDER BY departure_date',
      [journey.id]
    );

    const enrichedJourney = {
      ...journey,
      stops,
      transports: transportsResult.rows
    };

    res.json(toCamelCase(enrichedJourney));
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ message: 'Failed to fetch journey' });
  }
};

export const createJourney = async (req: Request, res: Response) => {
  try {
    const { title, description, startDate, endDate, currency } = req.body;
    const result = await query(
      'INSERT INTO journeys (title, description, start_date, end_date, currency) VALUES ($1, $2, $3, $4, $5) RETURNING *',
      [title, description, startDate, endDate, currency || 'USD']
    );
    const journey = toCamelCase(result.rows[0]);
    
    // Emit Socket.IO event
    const io = req.app.get('io');
    io.emit('journey:created', journey);
    
    res.status(201).json(journey);
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ message: 'Failed to create journey' });
  }
};

export const updateJourney = async (req: Request, res: Response) => {
  try {
    const { title, description, startDate, endDate, currency } = req.body;
    const result = await query(
      'UPDATE journeys SET title=$1, description=$2, start_date=$3, end_date=$4, currency=$5 WHERE id=$6 RETURNING *',
      [title, description, startDate, endDate, currency, parseInt(req.params.id)]
    );
    if (!result.rows[0]) return res.status(404).json({ message: 'Not found' });
    
    const journey = toCamelCase(result.rows[0]);
    
    // Emit Socket.IO event
    const io = req.app.get('io');
    io.emit('journey:updated', journey);
    
    res.json(journey);
  } catch (error) {
    res.status(500).json({ message: 'Failed to update journey' });
  }
};

export const deleteJourney = async (req: Request, res: Response) => {
  try {
    const journeyId = parseInt(req.params.id);
    await query('DELETE FROM journeys WHERE id = $1', [journeyId]);
    
    // Emit Socket.IO event
    const io = req.app.get('io');
    io.emit('journey:deleted', { id: journeyId });
    
    res.json({ message: 'Deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Failed to delete journey' });
  }
};

export const calculateTotalCost = async (req: Request, res: Response) => {
  try {
    const result = await query(
      'SELECT COALESCE(SUM(s.accommodation_price), 0) + COALESCE(SUM(t.price), 0) as total FROM journeys j LEFT JOIN stops s ON s.journey_id=j.id LEFT JOIN transports t ON t.journey_id=j.id WHERE j.id=$1',
      [parseInt(req.params.id)]
    );
    const total = result.rows[0]?.total || 0;
    await query('UPDATE journeys SET total_estimated_cost=$1 WHERE id=$2', [total, parseInt(req.params.id)]);
    res.json({ totalCost: total });
  } catch (error) {
    res.status(500).json({ message: 'Failed to calculate cost' });
  }
};
