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
    // Get user ID from authenticated request
    const userId = req.user?.userId;
    if (!userId) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    // Get journeys that user owns OR that have been shared with them (accepted)
    const journeysQuery = `
      SELECT DISTINCT j.* 
      FROM journeys j
      LEFT JOIN journey_shares js ON j.id = js.journey_id
      WHERE j.created_by = $1 
         OR (js.shared_with_user_id = $1 AND js.status = 'accepted')
      ORDER BY j.created_at DESC
    `;
    
    const journeysResult = await query(journeysQuery, [userId]);
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

        // Check if this journey is shared (not owned by user)
        const isShared = journey.created_by !== userId;

        return {
          ...journey,
          stops,
          transports: transportsResult.rows,
          isShared // Add flag to indicate if journey is shared with user
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
    const userId = req.user?.userId;
    
    if (!userId) {
      return res.status(401).json({ message: 'Unauthorized' });
    }
    
    const result = await query(
      'INSERT INTO journeys (title, description, start_date, end_date, currency, created_by) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *',
      [title, description, startDate, endDate, currency || 'USD', userId]
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

// Share journey with another user
export const shareJourney = async (req: Request, res: Response) => {
  try {
    const journeyId = parseInt(req.params.id);
    const { emailOrUsername } = req.body;
    const userId = req.user?.userId;

    if (!userId) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    if (!emailOrUsername) {
      return res.status(400).json({ message: 'Email or username is required' });
    }

    // Check if journey exists and user is the owner
    const journeyResult = await query(
      'SELECT * FROM journeys WHERE id = $1',
      [journeyId]
    );

    if (!journeyResult.rows[0]) {
      return res.status(404).json({ message: 'Journey not found' });
    }

    const journey = journeyResult.rows[0];
    if (journey.created_by !== userId) {
      return res.status(403).json({ message: 'Only the journey owner can share it' });
    }

    // Find user by email or username
    const userResult = await query(
      'SELECT * FROM users WHERE email = $1 OR username = $1',
      [emailOrUsername]
    );

    if (!userResult.rows[0]) {
      return res.status(404).json({ message: 'User not found with this email or username' });
    }

    const targetUser = userResult.rows[0];

    // Check if already shared
    const existingShare = await query(
      'SELECT * FROM journey_shares WHERE journey_id = $1 AND shared_with_user_id = $2',
      [journeyId, targetUser.id]
    );

    if (existingShare.rows[0]) {
      return res.status(400).json({ message: 'Journey already shared with this user' });
    }

    // Generate invitation token
    const crypto = require('crypto');
    const invitationToken = crypto.randomBytes(32).toString('hex');

    // Create share record
    const shareResult = await query(
      `INSERT INTO journey_shares 
       (journey_id, shared_with_user_id, shared_by_user_id, status, invited_email, invitation_token) 
       VALUES ($1, $2, $3, 'pending', $4, $5) 
       RETURNING *`,
      [journeyId, targetUser.id, userId, targetUser.email, invitationToken]
    );

    // Send email notification
    try {
      const emailService = require('../services/emailService');
      const senderResult = await query('SELECT username FROM users WHERE id = $1', [userId]);
      const senderName = senderResult.rows[0]?.username || 'Someone';
      
      await emailService.sendJourneyInvitation(
        targetUser.email,
        targetUser.username,
        senderName,
        journey.title,
        invitationToken
      );
    } catch (emailError) {
      console.error('Failed to send email:', emailError);
      // Continue even if email fails
    }

    res.status(201).json(toCamelCase(shareResult.rows[0]));
  } catch (error) {
    console.error('Error sharing journey:', error);
    res.status(500).json({ message: 'Failed to share journey' });
  }
};

// Get journeys shared with me (pending invitations)
export const getSharedWithMe = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userId;

    if (!userId) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const result = await query(
      `SELECT 
        js.*,
        j.title as journey_title,
        j.description as journey_description,
        j.start_date,
        j.end_date,
        u.username as shared_by_username,
        u.email as shared_by_email
       FROM journey_shares js
       JOIN journeys j ON js.journey_id = j.id
       JOIN users u ON js.shared_by_user_id = u.id
       WHERE js.shared_with_user_id = $1 AND js.status = 'pending'
       ORDER BY js.created_at DESC`,
      [userId]
    );

    res.json(toCamelCase(result.rows));
  } catch (error) {
    console.error('Error fetching shared journeys:', error);
    res.status(500).json({ message: 'Failed to fetch shared journeys' });
  }
};

// Accept journey invitation
export const acceptInvitation = async (req: Request, res: Response) => {
  try {
    const { token, invitationId } = req.body;
    const userId = req.user?.userId;

    let shareRecord;

    // Accept by token (from email link) - requires authentication
    if (token) {
      const result = await query(
        'SELECT * FROM journey_shares WHERE invitation_token = $1 AND status = \'pending\'',
        [token]
      );

      if (!result.rows[0]) {
        return res.status(404).json({ message: 'Invalid or expired invitation' });
      }

      shareRecord = result.rows[0];

      // Verify user matches
      if (userId && shareRecord.shared_with_user_id !== userId) {
        return res.status(403).json({ message: 'This invitation is not for you' });
      }
    }
    // Accept by ID (from Settings page) - requires authentication
    else if (invitationId) {
      if (!userId) {
        return res.status(401).json({ message: 'Unauthorized' });
      }

      const result = await query(
        'SELECT * FROM journey_shares WHERE id = $1 AND shared_with_user_id = $2 AND status = \'pending\'',
        [invitationId, userId]
      );

      if (!result.rows[0]) {
        return res.status(404).json({ message: 'Invitation not found' });
      }

      shareRecord = result.rows[0];
    } else {
      return res.status(400).json({ message: 'Token or invitationId is required' });
    }

    // Update status to accepted
    const updateResult = await query(
      'UPDATE journey_shares SET status = \'accepted\', accepted_at = NOW() WHERE id = $1 RETURNING *',
      [shareRecord.id]
    );

    res.json(toCamelCase(updateResult.rows[0]));
  } catch (error) {
    console.error('Error accepting invitation:', error);
    res.status(500).json({ message: 'Failed to accept invitation' });
  }
};

// Reject journey invitation
export const rejectInvitation = async (req: Request, res: Response) => {
  try {
    const invitationId = parseInt(req.params.id);
    const userId = req.user?.userId;

    if (!userId) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const result = await query(
      'UPDATE journey_shares SET status = \'rejected\', rejected_at = NOW() WHERE id = $1 AND shared_with_user_id = $2 AND status = \'pending\' RETURNING *',
      [invitationId, userId]
    );

    if (!result.rows[0]) {
      return res.status(404).json({ message: 'Invitation not found' });
    }

    res.json(toCamelCase(result.rows[0]));
  } catch (error) {
    console.error('Error rejecting invitation:', error);
    res.status(500).json({ message: 'Failed to reject invitation' });
  }
};
