import { Request, Response } from 'express';
import Journey, { Stop, Transport, Attraction } from '../models/Journey';

export const createJourney = async (req: Request, res: Response) => {
  try {
    const { stops, transports, ...journeyData } = req.body;
    const journey = await Journey.create(journeyData);

    // Create stops if provided
    if (stops && stops.length > 0) {
      for (const stopData of stops) {
        const { attractions, ...stopInfo } = stopData;
        const stop = await Stop.create({ ...stopInfo, journeyId: journey.id });
        
        // Create attractions for this stop
        if (attractions && attractions.length > 0) {
          for (const attraction of attractions) {
            await Attraction.create({ ...attraction, stopId: stop.id });
          }
        }
      }
    }

    // Create transports if provided
    if (transports && transports.length > 0) {
      for (const transport of transports) {
        await Transport.create({ ...transport, journeyId: journey.id });
      }
    }

    const fullJourney = await Journey.findByPk(journey.id, {
      include: [
        { model: Stop, as: 'stops', include: [{ model: Attraction, as: 'attractions' }] },
        { model: Transport, as: 'transports' }
      ]
    });

    res.status(201).json(fullJourney);
  } catch (error) {
    res.status(400).json({ error: (error as Error).message });
  }
};

export const getAllJourneys = async (req: Request, res: Response) => {
  try {
    const journeys = await Journey.findAll({
      include: [
        { model: Stop, as: 'stops', include: [{ model: Attraction, as: 'attractions' }] },
        { model: Transport, as: 'transports' }
      ],
      order: [['createdAt', 'DESC']]
    });
    res.json(journeys);
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
};

export const getJourneyById = async (req: Request, res: Response) => {
  try {
    const journey = await Journey.findByPk(req.params.id, {
      include: [
        { model: Stop, as: 'stops', include: [{ model: Attraction, as: 'attractions' }] },
        { model: Transport, as: 'transports' }
      ]
    });
    if (!journey) {
      return res.status(404).json({ error: 'Journey not found' });
    }
    res.json(journey);
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
};

export const updateJourney = async (req: Request, res: Response) => {
  try {
    const journey = await Journey.findByPk(req.params.id);
    if (!journey) {
      return res.status(404).json({ error: 'Journey not found' });
    }

    const { stops, transports, ...journeyData } = req.body;
    await journey.update(journeyData);

    // Update stops if provided
    if (stops) {
      // Delete existing stops (cascade will delete attractions)
      await Stop.destroy({ where: { journeyId: journey.id } });
      
      // Create new stops
      for (const stopData of stops) {
        const { attractions, ...stopInfo } = stopData;
        const stop = await Stop.create({ ...stopInfo, journeyId: journey.id });
        
        if (attractions && attractions.length > 0) {
          for (const attraction of attractions) {
            await Attraction.create({ ...attraction, stopId: stop.id });
          }
        }
      }
    }

    // Update transports if provided
    if (transports) {
      await Transport.destroy({ where: { journeyId: journey.id } });
      for (const transport of transports) {
        await Transport.create({ ...transport, journeyId: journey.id });
      }
    }

    const updatedJourney = await Journey.findByPk(journey.id, {
      include: [
        { model: Stop, as: 'stops', include: [{ model: Attraction, as: 'attractions' }] },
        { model: Transport, as: 'transports' }
      ]
    });

    res.json(updatedJourney);
  } catch (error) {
    res.status(400).json({ error: (error as Error).message });
  }
};

export const deleteJourney = async (req: Request, res: Response) => {
  try {
    const journey = await Journey.findByPk(req.params.id);
    if (!journey) {
      return res.status(404).json({ error: 'Journey not found' });
    }
    await journey.destroy();
    res.json({ message: 'Journey deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
};

export const calculateTotalCost = async (req: Request, res: Response) => {
  try {
    const journey = await Journey.findByPk(req.params.id, {
      include: [
        { model: Stop, as: 'stops', include: [{ model: Attraction, as: 'attractions' }] },
        { model: Transport, as: 'transports' }
      ]
    });
    
    if (!journey) {
      return res.status(404).json({ error: 'Journey not found' });
    }

    let totalCost = 0;

    // Sum accommodation costs
    const stops = await Stop.findAll({ where: { journeyId: journey.id } });
    for (const stop of stops) {
      if (stop.accommodationPrice) {
        totalCost += parseFloat(stop.accommodationPrice.toString());
      }
      
      // Sum attraction costs
      const attractions = await Attraction.findAll({ where: { stopId: stop.id } });
      for (const attraction of attractions) {
        if (attraction.estimatedCost) {
          totalCost += parseFloat(attraction.estimatedCost.toString());
        }
      }
    }

    // Sum transport costs
    const transports = await Transport.findAll({ where: { journeyId: journey.id } });
    for (const transport of transports) {
      totalCost += parseFloat(transport.price.toString());
    }

    await journey.update({ totalEstimatedCost: totalCost });

    res.json({ totalCost, currency: journey.currency });
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
};
