import { Request, Response } from 'express';
import { query, getClient, DB_AVAILABLE } from '../config/db';
import jsonStore from '../config/jsonStore';
import { convert as convertCurrency } from '../services/currencyService';

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
    if (!DB_AVAILABLE) {
      // Fallback: read from JSON store
      const journeysAll = await jsonStore.getAll('journeys');
      const shares = await jsonStore.getAll('journey_shares');
      // Filter journeys owned by user or shared and accepted
      const journeys = journeysAll.filter((j: any) => {
        if (j.created_by === userId) return true;
        const shared = shares.find((s: any) => s.journey_id === j.id && s.shared_with_user_id === userId && s.status === 'accepted');
        return !!shared;
      }).sort((a: any, b: any) => (new Date(b.created_at || 0).getTime()) - (new Date(a.created_at || 0).getTime()));

      const enrichedJourneys = await Promise.all(journeys.map(async (journey: any) => {
        const stops = (await jsonStore.findByField('stops', 'journey_id', journey.id))
          .sort((a: any, b: any) => (new Date(a.arrival_date || 0).getTime()) - (new Date(b.arrival_date || 0).getTime()));

        const stopsWithAttractions = await Promise.all(stops.map(async (stop: any) => {
          const attractions = await jsonStore.findByField('attractions', 'stop_id', stop.id);
          return { ...stop, attractions };
        }));

        const transports = (await jsonStore.findByField('transports', 'journey_id', journey.id))
          .sort((a: any, b: any) => (new Date(a.departure_date || 0).getTime()) - (new Date(b.departure_date || 0).getTime()));

        const isShared = journey.created_by !== userId;

        return { ...journey, stops: stopsWithAttractions, transports, isShared };
      }));

      return res.json(toCamelCase(enrichedJourneys));
    }
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ message: 'Failed to fetch journeys' });
  }
};

// Export journeys as JSON — single journey (id) or all owned by user
export const exportJourneys = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userId;
    if (!userId) return res.status(401).json({ message: 'Unauthorized' });

    const idParam = req.query.id as string | undefined;
    const exportSingleId = idParam ? parseInt(idParam) : null;

    if (!DB_AVAILABLE) {
      const journeysAll = await jsonStore.getAll('journeys');
      const shares = await jsonStore.getAll('journey_shares');
      const owned = journeysAll.filter((j: any) => j.created_by === userId || shares.some((s: any) => s.journey_id === j.id && s.shared_with_user_id === userId && s.status === 'accepted'));
      const toExport = exportSingleId ? owned.filter((j: any) => j.id === exportSingleId) : owned;

      const payload = await Promise.all(toExport.map(async (journey: any) => {
        const stops = (await jsonStore.findByField('stops', 'journey_id', journey.id));
        const transports = (await jsonStore.findByField('transports', 'journey_id', journey.id));
        const stopsWithAttractions = await Promise.all(stops.map(async (s: any) => ({ ...s, attractions: await jsonStore.findByField('attractions', 'stop_id', s.id) })));
        return { ...journey, stops: stopsWithAttractions, transports };
      }));

      return res.json({ exportedAt: new Date().toISOString(), journeys: payload });
    }

    // DB flow: fetch user's journeys and their nested data
    const result = await query('SELECT * FROM journeys WHERE created_by = $1', [userId]);
    const journeys = result.rows.filter((j: any) => !exportSingleId || j.id === exportSingleId);
    const payload = await Promise.all(journeys.map(async (j: any) => {
      const stopsRes = await query('SELECT * FROM stops WHERE journey_id = $1 ORDER BY arrival_date', [j.id]);
      const stops = stopsRes.rows;
      const stopsWithAttractions = await Promise.all(stops.map(async (s: any) => {
        const attractionsRes = await query('SELECT * FROM attractions WHERE stop_id = $1', [s.id]);
        return { ...s, attractions: attractionsRes.rows };
      }));
      const transportsRes = await query('SELECT * FROM transports WHERE journey_id = $1 ORDER BY departure_date', [j.id]);
      return { ...j, stops: stopsWithAttractions, transports: transportsRes.rows };
    }));

    res.json({ exportedAt: new Date().toISOString(), journeys: payload });
  } catch (error) {
    console.error('Export journeys error:', error);
    res.status(500).json({ message: 'Failed to export journeys' });
  }
};

// Import journeys JSON. If DB available, insert into DB (transaction); otherwise insert into JSON store.
export const importJourneys = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userId;
    if (!userId) return res.status(401).json({ message: 'Unauthorized' });

    const { journeys } = req.body;
    if (!journeys || !Array.isArray(journeys)) return res.status(400).json({ message: 'Invalid payload: journeys array required' });

    const imported: any[] = [];
    if (!DB_AVAILABLE) {
      for (const j of journeys) {
        const newJourney = await jsonStore.insert('journeys', { title: j.title, description: j.description, start_date: j.startDate || j.start_date, end_date: j.endDate || j.end_date, currency: j.currency || 'PLN', created_by: userId, created_at: new Date().toISOString(), updated_at: new Date().toISOString(), total_estimated_cost: j.totalEstimatedCost || j.total_estimated_cost || 0 });
        // stops
        if (Array.isArray(j.stops)) {
          for (const s of j.stops) {
            const newStop = await jsonStore.insert('stops', { journey_id: newJourney.id, city: s.city, country: s.country, latitude: s.latitude, longitude: s.longitude, arrival_date: s.arrivalDate || s.arrival_date, departure_date: s.departureDate || s.departure_date, accommodation_name: s.accommodationName || s.accommodation_name, accommodation_url: s.accommodationUrl || s.accommodation_url, accommodation_price: s.accommodationPrice || s.accommodation_price, accommodation_currency: s.accommodationCurrency || s.accommodation_currency, notes: s.notes, is_paid: s.isPaid || s.is_paid || false });
            if (Array.isArray(s.attractions)) {
              for (const a of s.attractions) {
                await jsonStore.insert('attractions', { stop_id: newStop.id, name: a.name, description: a.description, estimated_cost: a.estimatedCost || a.estimated_cost, duration: a.duration, currency: a.currency || a.currency || 'PLN', is_paid: a.isPaid || a.is_paid || false });
              }
            }
          }
        }
        // transports
        if (Array.isArray(j.transports)) {
          for (const t of j.transports) {
            await jsonStore.insert('transports', { journey_id: newJourney.id, type: t.type, from_location: t.fromLocation || t.from_location, to_location: t.toLocation || t.to_location, departure_date: t.departureDate || t.departure_date, arrival_date: t.arrivalDate || t.arrival_date, price: t.price, currency: t.currency || 'PLN', booking_url: t.bookingUrl || t.booking_url, notes: t.notes, flight_number: t.flightNumber || t.flight_number, train_number: t.trainNumber || t.train_number, is_paid: t.isPaid || t.is_paid || false });
          }
        }
        imported.push(newJourney);
      }
      return res.status(201).json({ message: 'Imported into JSON store', count: imported.length, journeys: imported });
    }

    // DB flow: transactional insert
    const client = await getClient();
    try {
      await client.query('BEGIN');
      for (const j of journeys) {
        const journeyRes = await client.query('INSERT INTO journeys (title, description, start_date, end_date, currency, created_by, total_estimated_cost, created_at, updated_at) VALUES ($1,$2,$3,$4,$5,$6,$7,NOW(),NOW()) RETURNING *', [j.title, j.description, j.startDate || j.start_date, j.endDate || j.end_date, j.currency || 'PLN', userId, j.totalEstimatedCost || j.total_estimated_cost || 0]);
        const newJourney = journeyRes.rows[0];
        // stops
        if (Array.isArray(j.stops)) {
          for (const s of j.stops) {
            const stopRes = await client.query('INSERT INTO stops (journey_id, city, country, latitude, longitude, arrival_date, departure_date, accommodation_name, accommodation_url, accommodation_price, accommodation_currency, notes, is_paid) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13) RETURNING *', [newJourney.id, s.city, s.country, s.latitude, s.longitude, s.arrivalDate || s.arrival_date, s.departureDate || s.departure_date, s.accommodationName || s.accommodation_name || null, s.accommodationUrl || s.accommodation_url || null, s.accommodationPrice || s.accommodation_price || null, s.accommodationCurrency || s.accommodation_currency || null, s.notes || null, s.isPaid || s.is_paid || false]);
            const newStop = stopRes.rows[0];
            if (Array.isArray(s.attractions)) {
              for (const a of s.attractions) {
                await client.query('INSERT INTO attractions (stop_id, name, description, estimated_cost, duration, currency, is_paid) VALUES ($1,$2,$3,$4,$5,$6,$7)', [newStop.id, a.name, a.description || null, a.estimatedCost || a.estimated_cost || null, a.duration || null, a.currency || a.currency || 'PLN', a.isPaid || a.is_paid || false]);
              }
            }
          }
        }
        // transports
        if (Array.isArray(j.transports)) {
          for (const t of j.transports) {
            await client.query('INSERT INTO transports (journey_id, type, from_location, to_location, departure_date, arrival_date, price, currency, booking_url, notes, flight_number, train_number, is_paid) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)', [newJourney.id, t.type, t.fromLocation || t.from_location, t.toLocation || t.to_location, t.departureDate || t.departure_date, t.arrivalDate || t.arrival_date, t.price || null, t.currency || 'PLN', t.bookingUrl || t.booking_url || null, t.notes || null, t.flightNumber || t.flight_number || null, t.trainNumber || t.train_number || null, t.isPaid || t.is_paid || false]);
          }
        }
        imported.push(newJourney);
      }
      await client.query('COMMIT');
      return res.status(201).json({ message: 'Imported into database', count: imported.length, journeys: imported });
    } catch (err) {
      await client.query('ROLLBACK');
      console.error('Import transaction failed:', err);
      return res.status(500).json({ message: 'Import failed' });
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Import journeys error:', error);
    res.status(500).json({ message: 'Failed to import journeys' });
  }
};

export const getJourneyById = async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    if (!DB_AVAILABLE) {
      const journey = await jsonStore.getById('journeys', id);
      if (!journey) return res.status(404).json({ message: 'Not found' });

      const stops = (await jsonStore.findByField('stops', 'journey_id', journey.id))
        .sort((a: any, b: any) => (new Date(a.arrival_date || 0).getTime()) - (new Date(b.arrival_date || 0).getTime()));

      const stopsWithAttractions = await Promise.all(stops.map(async (stop: any) => {
        const attractions = await jsonStore.findByField('attractions', 'stop_id', stop.id);
        return { ...stop, attractions };
      }));

      const transports = (await jsonStore.findByField('transports', 'journey_id', journey.id))
        .sort((a: any, b: any) => (new Date(a.departure_date || 0).getTime()) - (new Date(b.departure_date || 0).getTime()));

      const enrichedJourney = { ...journey, stops: stopsWithAttractions, transports };
      return res.json(toCamelCase(enrichedJourney));
    }
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
    if (!DB_AVAILABLE) {
      const newJourney = await jsonStore.insert('journeys', {
        title,
        description,
        start_date: startDate,
        end_date: endDate,
        currency: currency || 'PLN',
        created_by: userId,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      });
      const journey = toCamelCase(newJourney);
      const io = req.app.get('io');
      io.emit('journey:created', journey);
      return res.status(201).json(journey);
    }
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ message: 'Failed to create journey' });
  }
};

export const updateJourney = async (req: Request, res: Response) => {
  try {
    const { title, description, startDate, endDate, currency } = req.body;
    const id = parseInt(req.params.id);
    if (!DB_AVAILABLE) {
      const updated = await jsonStore.updateById('journeys', id, {
        title, description, start_date: startDate, end_date: endDate, currency, updated_at: new Date().toISOString()
      });
      if (!updated) return res.status(404).json({ message: 'Not found' });
      const journey = toCamelCase(updated);
      const io = req.app.get('io');
      io.emit('journey:updated', journey);
      return res.json(journey);
    }
  } catch (error) {
    res.status(500).json({ message: 'Failed to update journey' });
  }
};

export const deleteJourney = async (req: Request, res: Response) => {
  try {
    const journeyId = parseInt(req.params.id);
    if (!DB_AVAILABLE) {
      const ok = await jsonStore.deleteById('journeys', journeyId);
      if (!ok) return res.status(404).json({ message: 'Not found' });
      const io = req.app.get('io');
      io.emit('journey:deleted', { id: journeyId });
      return res.json({ message: 'Deleted successfully' });
    }
    await query('DELETE FROM journeys WHERE id = $1', [journeyId]);
    const io = req.app.get('io');
    io.emit('journey:deleted', { id: journeyId });
    res.json({ message: 'Deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Failed to delete journey' });
  }
};

export const calculateTotalCost = async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    if (!DB_AVAILABLE) {
      const journey = await jsonStore.getById('journeys', id);
      if (!journey) return res.status(404).json({ message: 'Journey not found' });
      const mainCurrency = journey.currency || 'PLN';

      const stops = await jsonStore.findByField('stops', 'journey_id', id);
      const transports = await jsonStore.findByField('transports', 'journey_id', id);

      let sumStops = 0;
      for (const s of (stops || [])) {
        const price = parseFloat(s.accommodation_price || 0) || 0;
        const curr = s.accommodation_currency || journey.currency || 'PLN';
        if (price && curr !== mainCurrency) {
          try {
            const converted = await convertCurrency(price, curr, mainCurrency);
            sumStops += converted;
          } catch (e) {
            console.warn('Currency conversion failed for stop:', e);
            sumStops += price; // fallback: add raw
          }
        } else {
          sumStops += price;
        }
      }

      let sumTrans = 0;
      for (const t of (transports || [])) {
        const price = parseFloat(t.price || 0) || 0;
        const curr = t.currency || journey.currency || 'PLN';
        if (price && curr !== mainCurrency) {
          try {
            const converted = await convertCurrency(price, curr, mainCurrency);
            sumTrans += converted;
          } catch (e) {
            console.warn('Currency conversion failed for transport:', e);
            sumTrans += price;
          }
        } else {
          sumTrans += price;
        }
      }

      // Attractions may have estimated_cost and optional currency
      const attractions = await jsonStore.getAll('attractions');
      const journeyStopIds = (stops || []).map((s: any) => s.id);
      let sumAttr = 0;
      for (const a of (attractions || [])) {
        if (!journeyStopIds.includes(a.stop_id)) continue;
        const cost = parseFloat(a.estimated_cost || 0) || 0;
        const curr = a.currency || mainCurrency;
        if (cost && curr !== mainCurrency) {
          try {
            const converted = await convertCurrency(cost, curr, mainCurrency);
            sumAttr += converted;
          } catch (e) {
            console.warn('Currency conversion failed for attraction:', e);
            sumAttr += cost;
          }
        } else {
          sumAttr += cost;
        }
      }

      const total = sumStops + sumTrans + sumAttr;
      await jsonStore.updateById('journeys', id, { total_estimated_cost: total });
      return res.json({ totalCost: total, currency: mainCurrency });
    }
    // DB available flow below
    const journeyRes = await query('SELECT * FROM journeys WHERE id = $1', [id]);
    const journey = journeyRes.rows[0];
    if (!journey) return res.status(404).json({ message: 'Journey not found' });
    const mainCurrency = journey.currency || 'PLN';

    const stopsRes = await query('SELECT * FROM stops WHERE journey_id = $1', [id]);
    const transportsRes = await query('SELECT * FROM transports WHERE journey_id = $1', [id]);

    let sumStops = 0;
    for (const s of stopsRes.rows) {
      const price = parseFloat(s.accommodation_price || 0) || 0;
      const curr = s.accommodation_currency || journey.currency || 'PLN';
      if (price && curr !== mainCurrency) {
        try {
          const converted = await convertCurrency(price, curr, mainCurrency);
          sumStops += converted;
        } catch (e) {
          console.warn('Currency conversion failed for stop (DB):', e);
          sumStops += price;
        }
      } else {
        sumStops += price;
      }
    }

    let sumTrans = 0;
    for (const t of transportsRes.rows) {
      const price = parseFloat(t.price || 0) || 0;
      const curr = t.currency || journey.currency || 'PLN';
      if (price && curr !== mainCurrency) {
        try {
          const converted = await convertCurrency(price, curr, mainCurrency);
          sumTrans += converted;
        } catch (e) {
          console.warn('Currency conversion failed for transport (DB):', e);
          sumTrans += price;
        }
      } else {
        sumTrans += price;
      }
    }

    // Attractions for DB
    let sumAttr = 0;
    for (const s of stopsRes.rows) {
      const attrRes = await query('SELECT * FROM attractions WHERE stop_id = $1', [s.id]);
      for (const a of attrRes.rows) {
        const cost = parseFloat(a.estimated_cost || 0) || 0;
        const curr = a.currency || mainCurrency;
        if (cost && curr !== mainCurrency) {
          try {
            const converted = await convertCurrency(cost, curr, mainCurrency);
            sumAttr += converted;
          } catch (e) {
            console.warn('Currency conversion failed for attraction (DB):', e);
            sumAttr += cost;
          }
        } else {
          sumAttr += cost;
        }
      }
    }

    const total = sumStops + sumTrans + sumAttr;
    await query('UPDATE journeys SET total_estimated_cost = $1 WHERE id = $2', [total, id]);
    return res.json({ totalCost: total, currency: mainCurrency });
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

    if (!DB_AVAILABLE) {
      // JSON fallback
      const journey = await jsonStore.getById('journeys', journeyId);
      if (!journey) return res.status(404).json({ message: 'Journey not found' });
      if (journey.created_by !== userId) return res.status(403).json({ message: 'Only the journey owner can share it' });

      const users = await jsonStore.getAll('users');
      const targetUser = users.find((u: any) => u.email === emailOrUsername || u.username === emailOrUsername);
      if (!targetUser) return res.status(404).json({ message: 'User not found with this email or username' });

      const shares = await jsonStore.findByField('journey_shares', 'journey_id', journeyId);
      if (shares.some((s: any) => s.shared_with_user_id === targetUser.id)) return res.status(400).json({ message: 'Journey already shared with this user' });

      const crypto = require('crypto');
      const invitationToken = crypto.randomBytes(32).toString('hex');
      const newShare = await jsonStore.insert('journey_shares', { journey_id: journeyId, shared_with_user_id: targetUser.id, shared_by_user_id: userId, status: 'pending', invited_email: targetUser.email, invitation_token: invitationToken, created_at: new Date().toISOString() });

      try {
        const emailService = require('../services/emailService');
        const sender = await jsonStore.getById('users', userId);
        const senderName = sender?.username || 'Someone';
        await emailService.sendJourneyInvitation(targetUser.email, targetUser.username, senderName, journey.title, invitationToken);
      } catch (emailError) {
        console.error('Failed to send email:', emailError);
      }

      return res.status(201).json(toCamelCase(newShare));
    }

    // DB flow
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

    if (!DB_AVAILABLE) {
      const shares = (await jsonStore.getAll('journey_shares')).filter((s: any) => s.shared_with_user_id === userId && s.status === 'pending').sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
      const enriched = await Promise.all(shares.map(async (s: any) => {
        const j = await jsonStore.getById('journeys', s.journey_id);
        const u = await jsonStore.getById('users', s.shared_by_user_id);
        return { ...s, journey_title: j?.title, journey_description: j?.description, start_date: j?.start_date, end_date: j?.end_date, shared_by_username: u?.username, shared_by_email: u?.email };
      }));
      return res.json(toCamelCase(enriched));
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
        if (!DB_AVAILABLE) {
          const tokens = await jsonStore.findByField('journey_shares', 'invitation_token', token);
          const found = tokens.find((t: any) => t.status === 'pending');
          if (!found) return res.status(404).json({ message: 'Invalid or expired invitation' });
          shareRecord = found;
          if (userId && shareRecord.shared_with_user_id !== userId) return res.status(403).json({ message: 'This invitation is not for you' });
        } else {
          const result = await query('SELECT * FROM journey_shares WHERE invitation_token = $1 AND status = \'pending\'', [token]);
          if (!result.rows[0]) return res.status(404).json({ message: 'Invalid or expired invitation' });
          shareRecord = result.rows[0];
          if (userId && shareRecord.shared_with_user_id !== userId) return res.status(403).json({ message: 'This invitation is not for you' });
        }
    }
    // Accept by ID (from Settings page) - requires authentication
    else if (invitationId) {
      if (!userId) {
        return res.status(401).json({ message: 'Unauthorized' });
      }

        if (!DB_AVAILABLE) {
          const s = await jsonStore.getById('journey_shares', invitationId);
          if (!s || s.shared_with_user_id !== userId || s.status !== 'pending') return res.status(404).json({ message: 'Invitation not found' });
          shareRecord = s;
        } else {
          const result = await query('SELECT * FROM journey_shares WHERE id = $1 AND shared_with_user_id = $2 AND status = \'pending\'', [invitationId, userId]);
          if (!result.rows[0]) return res.status(404).json({ message: 'Invitation not found' });
          shareRecord = result.rows[0];
        }
    } else {
      return res.status(400).json({ message: 'Token or invitationId is required' });
    }

      // Update status to accepted
      if (!DB_AVAILABLE) {
        const updated = await jsonStore.updateById('journey_shares', shareRecord.id, { status: 'accepted', accepted_at: new Date().toISOString() });
        return res.json(toCamelCase(updated));
      }
      const updateResult = await query('UPDATE journey_shares SET status = \'accepted\', accepted_at = NOW() WHERE id = $1 RETURNING *', [shareRecord.id]);
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

    if (!DB_AVAILABLE) {
      const s = await jsonStore.getById('journey_shares', invitationId);
      if (!s || s.shared_with_user_id !== userId || s.status !== 'pending') return res.status(404).json({ message: 'Invitation not found' });
      const updated = await jsonStore.updateById('journey_shares', invitationId, { status: 'rejected', rejected_at: new Date().toISOString() });
      return res.json(toCamelCase(updated));
    }
    const result = await query('UPDATE journey_shares SET status = \'rejected\', rejected_at = NOW() WHERE id = $1 AND shared_with_user_id = $2 AND status = \'pending\' RETURNING *', [invitationId, userId]);
    if (!result.rows[0]) return res.status(404).json({ message: 'Invitation not found' });
    res.json(toCamelCase(result.rows[0]));
  } catch (error) {
    console.error('Error rejecting invitation:', error);
    res.status(500).json({ message: 'Failed to reject invitation' });
  }
};
