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
