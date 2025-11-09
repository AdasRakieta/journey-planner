import { Request, Response } from 'express';
import { query } from '../config/db';

// Helper: Convert snake_case to camelCase recursively
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

// Get all attractions for a stop
export const getAttractionsByStopId = async (req: Request, res: Response) => {
  try {
    const stopId = parseInt(req.params.stopId);
    const result = await query(
      'SELECT * FROM attractions WHERE stop_id = $1 ORDER BY id ASC',
      [stopId]
    );
    res.json(toCamelCase(result.rows));
  } catch (error) {
    console.error('Error fetching attractions:', error);
    res.status(500).json({ message: 'Failed to fetch attractions' });
  }
};

// Create attraction
export const createAttraction = async (req: Request, res: Response) => {
  try {
    const stopId = parseInt(req.params.stopId);
    const { name, description, estimatedCost, duration } = req.body;
    
    const result = await query(
      'INSERT INTO attractions (stop_id, name, description, estimated_cost, duration) VALUES ($1, $2, $3, $4, $5) RETURNING *',
      [stopId, name, description, estimatedCost, duration]
    );
    
    const attraction = toCamelCase(result.rows[0]);
    
    // Emit Socket.IO event
    const io = req.app.get('io');
    io.emit('attraction:created', attraction);
    
    res.status(201).json(attraction);
  } catch (error) {
    console.error('Error creating attraction:', error);
    res.status(500).json({ message: 'Failed to create attraction' });
  }
};

// Update attraction
export const updateAttraction = async (req: Request, res: Response) => {
  try {
    const attractionId = parseInt(req.params.id);
    const { name, description, estimatedCost, duration } = req.body;
    
    const result = await query(
      'UPDATE attractions SET name=$1, description=$2, estimated_cost=$3, duration=$4 WHERE id=$5 RETURNING *',
      [name, description, estimatedCost, duration, attractionId]
    );
    
    if (!result.rows[0]) {
      return res.status(404).json({ message: 'Attraction not found' });
    }
    
    const attraction = toCamelCase(result.rows[0]);
    
    // Emit Socket.IO event
    const io = req.app.get('io');
    io.emit('attraction:updated', attraction);
    
    res.json(attraction);
  } catch (error) {
    console.error('Error updating attraction:', error);
    res.status(500).json({ message: 'Failed to update attraction' });
  }
};

// Delete attraction
export const deleteAttraction = async (req: Request, res: Response) => {
  try {
    const attractionId = parseInt(req.params.id);
    await query('DELETE FROM attractions WHERE id = $1', [attractionId]);
    
    // Emit Socket.IO event
    const io = req.app.get('io');
    io.emit('attraction:deleted', { id: attractionId });
    
    res.json({ message: 'Attraction deleted successfully' });
  } catch (error) {
    console.error('Error deleting attraction:', error);
    res.status(500).json({ message: 'Failed to delete attraction' });
  }
};
