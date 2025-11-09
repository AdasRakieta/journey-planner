import type { Journey } from '../types/journey';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001/api';

export const journeyService = {
  async getAllJourneys(): Promise<Journey[]> {
    const response = await fetch(`${API_URL}/journeys`);
    if (!response.ok) throw new Error('Failed to fetch journeys');
    return response.json();
  },

  async getJourneyById(id: number): Promise<Journey> {
    const response = await fetch(`${API_URL}/journeys/${id}`);
    if (!response.ok) throw new Error('Failed to fetch journey');
    return response.json();
  },

  async createJourney(journey: Partial<Journey>): Promise<Journey> {
    const response = await fetch(`${API_URL}/journeys`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(journey),
    });
    if (!response.ok) throw new Error('Failed to create journey');
    return response.json();
  },

  async updateJourney(id: number, journey: Partial<Journey>): Promise<Journey> {
    const response = await fetch(`${API_URL}/journeys/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(journey),
    });
    if (!response.ok) throw new Error('Failed to update journey');
    return response.json();
  },

  async deleteJourney(id: number): Promise<void> {
    const response = await fetch(`${API_URL}/journeys/${id}`, {
      method: 'DELETE',
    });
    if (!response.ok) throw new Error('Failed to delete journey');
  },

  async calculateTotalCost(id: number): Promise<{ totalCost: number; currency: string }> {
    const response = await fetch(`${API_URL}/journeys/${id}/calculate-cost`, {
      method: 'POST',
    });
    if (!response.ok) throw new Error('Failed to calculate cost');
    return response.json();
  },
};

// Stop Service
export const stopService = {
  async getStopsByJourneyId(journeyId: number) {
    const response = await fetch(`${API_URL}/journeys/${journeyId}/stops`);
    if (!response.ok) throw new Error('Failed to fetch stops');
    return response.json();
  },

  async createStop(journeyId: number, stop: any) {
    const response = await fetch(`${API_URL}/journeys/${journeyId}/stops`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(stop),
    });
    if (!response.ok) throw new Error('Failed to create stop');
    return response.json();
  },

  async updateStop(stopId: number, stop: any) {
    const response = await fetch(`${API_URL}/stops/${stopId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(stop),
    });
    if (!response.ok) throw new Error('Failed to update stop');
    return response.json();
  },

  async deleteStop(stopId: number) {
    const response = await fetch(`${API_URL}/stops/${stopId}`, {
      method: 'DELETE',
    });
    if (!response.ok) throw new Error('Failed to delete stop');
  },

  async scrapeBookingUrl(url: string) {
    const response = await fetch(`${API_URL}/stops/scrape-booking`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url }),
    });
    if (!response.ok) throw new Error('Failed to scrape Booking.com URL');
    return response.json();
  },
};

// Attraction Service
export const attractionService = {
  async getAttractionsByStopId(stopId: number) {
    const response = await fetch(`${API_URL}/stops/${stopId}/attractions`);
    if (!response.ok) throw new Error('Failed to fetch attractions');
    return response.json();
  },

  async createAttraction(stopId: number, attraction: any) {
    const response = await fetch(`${API_URL}/stops/${stopId}/attractions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(attraction),
    });
    if (!response.ok) throw new Error('Failed to create attraction');
    return response.json();
  },

  async updateAttraction(attractionId: number, attraction: any) {
    const response = await fetch(`${API_URL}/attractions/${attractionId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(attraction),
    });
    if (!response.ok) throw new Error('Failed to update attraction');
    return response.json();
  },

  async deleteAttraction(attractionId: number) {
    const response = await fetch(`${API_URL}/attractions/${attractionId}`, {
      method: 'DELETE',
    });
    if (!response.ok) throw new Error('Failed to delete attraction');
  },
};

// Transport Service
export const transportService = {
  async getTransportsByJourneyId(journeyId: number) {
    const response = await fetch(`${API_URL}/journeys/${journeyId}/transports`);
    if (!response.ok) throw new Error('Failed to fetch transports');
    return response.json();
  },

  async createTransport(journeyId: number, transport: any) {
    const response = await fetch(`${API_URL}/journeys/${journeyId}/transports`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(transport),
    });
    if (!response.ok) throw new Error('Failed to create transport');
    return response.json();
  },

  async updateTransport(transportId: number, transport: any) {
    const response = await fetch(`${API_URL}/transports/${transportId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(transport),
    });
    if (!response.ok) throw new Error('Failed to update transport');
    return response.json();
  },

  async deleteTransport(transportId: number) {
    const response = await fetch(`${API_URL}/transports/${transportId}`, {
      method: 'DELETE',
    });
    if (!response.ok) throw new Error('Failed to delete transport');
  },
};
