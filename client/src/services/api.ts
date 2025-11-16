import type { Journey, JourneyShare } from '../types/journey';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001/api';

// Helper function to get auth headers
const getAuthHeaders = () => {
  const token = localStorage.getItem('accessToken');
  return {
    'Content-Type': 'application/json',
    ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
  };
};

export const journeyService = {
  async getAllJourneys(): Promise<Journey[]> {
    const token = localStorage.getItem('accessToken');
    const response = await fetch(`${API_URL}/journeys`, {
      headers: {
        ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
      },
    });
    if (!response.ok) throw new Error('Failed to fetch journeys');
    return response.json();
  },

  async getJourneyById(id: number): Promise<Journey> {
    const token = localStorage.getItem('accessToken');
    const response = await fetch(`${API_URL}/journeys/${id}`, {
      headers: {
        ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
      },
    });
    if (!response.ok) throw new Error('Failed to fetch journey');
    return response.json();
  },

  async createJourney(journey: Partial<Journey>): Promise<Journey> {
    const response = await fetch(`${API_URL}/journeys`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(journey),
    });
    if (!response.ok) throw new Error('Failed to create journey');
    return response.json();
  },

  async updateJourney(id: number, journey: Partial<Journey>): Promise<Journey> {
    const response = await fetch(`${API_URL}/journeys/${id}`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify(journey),
    });
    if (!response.ok) throw new Error('Failed to update journey');
    return response.json();
  },

  async deleteJourney(id: number): Promise<void> {
    const token = localStorage.getItem('accessToken');
    const response = await fetch(`${API_URL}/journeys/${id}`, {
      method: 'DELETE',
      headers: {
        ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
      },
    });
    if (!response.ok) throw new Error('Failed to delete journey');
  },

  async calculateTotalCost(id: number): Promise<{ totalCost: number; currency: string }> {
    const response = await fetch(`${API_URL}/journeys/${id}/calculate-cost`, {
      method: 'POST',
      headers: getAuthHeaders(),
    });
    if (!response.ok) throw new Error('Failed to calculate cost');
    return response.json();
  },

  async exportJourneys(id?: number) {
    const token = localStorage.getItem('accessToken');
    const url = id ? `${API_URL}/journeys/export?id=${id}` : `${API_URL}/journeys/export`;
    const response = await fetch(url, {
      headers: { ...(token ? { 'Authorization': `Bearer ${token}` } : {}) },
    });
    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err.message || 'Failed to export journeys');
    }
    return response.json();
  },

  async importJourneys(payload: any) {
    const response = await fetch(`${API_URL}/journeys/import`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(payload),
    });
    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err.message || 'Failed to import journeys');
    }
    return response.json();
  },
};

// Stop Service
export const stopService = {
  async getStopsByJourneyId(journeyId: number) {
    const token = localStorage.getItem('accessToken');
    const response = await fetch(`${API_URL}/stops/journey/${journeyId}`, {
      headers: {
        ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
      },
    });
    if (!response.ok) throw new Error('Failed to fetch stops');
    return response.json();
  },

  async createStop(journeyId: number, stop: any) {
      const response = await fetch(`${API_URL}/stops/journey/${journeyId}`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(stop),
    });
    if (!response.ok) throw new Error('Failed to create stop');
    return response.json();
  },

  async updateStop(stopId: number, stop: any) {
      const response = await fetch(`${API_URL}/stops/${stopId}`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify(stop),
    });
    if (!response.ok) throw new Error('Failed to update stop');
    return response.json();
  },

  async deleteStop(stopId: number) {
    const token = localStorage.getItem('accessToken');
    const response = await fetch(`${API_URL}/stops/${stopId}`, {
      method: 'DELETE',
      headers: {
        ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
      },
    });
    if (!response.ok) throw new Error('Failed to delete stop');
  },

  async scrapeBookingUrl(url: string) {
    const response = await fetch(`${API_URL}/stops/scrape-booking`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ url }),
    });
    if (!response.ok) throw new Error('Failed to scrape Booking.com URL');
    return response.json();
  },

  async updatePaymentStatus(stopId: number, isPaid: boolean) {
    const response = await fetch(`${API_URL}/stops/${stopId}`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify({ isPaid }),
    });
    if (!response.ok) throw new Error('Failed to update payment status');
    return response.json();
  },
};

// Attraction Service
export const attractionService = {
  async getAttractionsByStopId(stopId: number) {
    const token = localStorage.getItem('accessToken');
    const response = await fetch(`${API_URL}/attractions/stop/${stopId}`, {
      headers: {
        ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
      },
    });
    if (!response.ok) throw new Error('Failed to fetch attractions');
    return response.json();
  },

  async createAttraction(stopId: number, attraction: any) {
      const response = await fetch(`${API_URL}/attractions/stop/${stopId}`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(attraction),
    });
    if (!response.ok) throw new Error('Failed to create attraction');
    return response.json();
  },

  async updateAttraction(attractionId: number, attraction: any) {
      const response = await fetch(`${API_URL}/attractions/${attractionId}`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify(attraction),
    });
    if (!response.ok) throw new Error('Failed to update attraction');
    return response.json();
  },

  async deleteAttraction(attractionId: number) {
    const token = localStorage.getItem('accessToken');
    const response = await fetch(`${API_URL}/attractions/${attractionId}`, {
      method: 'DELETE',
      headers: {
        ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
      },
    });
    if (!response.ok) throw new Error('Failed to delete attraction');
  },

  async updatePaymentStatus(attractionId: number, isPaid: boolean) {
    const response = await fetch(`${API_URL}/attractions/${attractionId}`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify({ isPaid }),
    });
    if (!response.ok) throw new Error('Failed to update payment status');
    return response.json();
  },
};

// Transport Service
export const transportService = {
  async getTransportsByJourneyId(journeyId: number) {
    const token = localStorage.getItem('accessToken');
    const response = await fetch(`${API_URL}/transports/journey/${journeyId}`, {
      headers: {
        ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
      },
    });
    if (!response.ok) throw new Error('Failed to fetch transports');
    return response.json();
  },

  async createTransport(journeyId: number, transport: any) {
      const response = await fetch(`${API_URL}/transports/journey/${journeyId}`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(transport),
    });
    if (!response.ok) throw new Error('Failed to create transport');
    return response.json();
  },

  async updateTransport(transportId: number, transport: any) {
      const response = await fetch(`${API_URL}/transports/${transportId}`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify(transport),
    });
    if (!response.ok) throw new Error('Failed to update transport');
    return response.json();
  },

  async deleteTransport(transportId: number) {
    const token = localStorage.getItem('accessToken');
    const response = await fetch(`${API_URL}/transports/${transportId}`, {
      method: 'DELETE',
      headers: {
        ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
      },
    });
    if (!response.ok) throw new Error('Failed to delete transport');
  },

  async scrapeTicket(url: string) {
    const response = await fetch(`${API_URL}/transports/scrape-ticket`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ url }),
    });
    if (!response.ok) throw new Error('Failed to scrape ticket');
    return response.json();
  },

  async updatePaymentStatus(transportId: number, isPaid: boolean) {
    const response = await fetch(`${API_URL}/transports/${transportId}`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify({ isPaid }),
    });
    if (!response.ok) throw new Error('Failed to update payment status');
    return response.json();
  },
};

// Journey Share Service
export const journeyShareService = {
  async shareJourney(journeyId: number, emailOrUsername: string): Promise<JourneyShare> {
    const token = localStorage.getItem('accessToken');
    const response = await fetch(`${API_URL}/journeys/${journeyId}/share`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({ emailOrUsername }),
    });
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to share journey');
    }
    return response.json();
  },

  async getSharedWithMe(): Promise<JourneyShare[]> {
    const token = localStorage.getItem('accessToken');
    const response = await fetch(`${API_URL}/journeys/shared-with-me`, {
      headers: { 
        'Authorization': `Bearer ${token}`,
      },
    });
    if (!response.ok) throw new Error('Failed to fetch shared journeys');
    return response.json();
  },

  async acceptInvitation(tokenOrId: string, isToken: boolean = true): Promise<JourneyShare> {
    const authToken = localStorage.getItem('accessToken');
    const body = isToken 
      ? { token: tokenOrId }
      : { invitationId: parseInt(tokenOrId) };
    
    const response = await fetch(`${API_URL}/journeys/invitations/accept`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authToken}`,
      },
      body: JSON.stringify(body),
    });
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to accept invitation');
    }
    return response.json();
  },

  async rejectInvitation(invitationId: number): Promise<JourneyShare> {
    const token = localStorage.getItem('accessToken');
    const response = await fetch(`${API_URL}/journeys/invitations/${invitationId}/reject`, {
      method: 'POST',
      headers: { 
        'Authorization': `Bearer ${token}`,
      },
    });
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to reject invitation');
    }
    return response.json();
  },
};
