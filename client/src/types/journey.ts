export interface Stop {
  id?: number;
  city: string;
  country: string;
  latitude: number;
  longitude: number;
  arrivalDate: Date | string;
  departureDate: Date | string;
  accommodationName?: string;
  accommodationUrl?: string;
  accommodationPrice?: number;
  accommodationCurrency?: string;
  notes?: string;
  attractions?: Attraction[];
}

export interface Transport {
  id?: number;
  type: 'flight' | 'train' | 'bus' | 'car' | 'other';
  fromLocation: string;
  toLocation: string;
  departureDate: Date | string;
  arrivalDate: Date | string;
  price: number;
  currency: string;
  bookingUrl?: string;
  notes?: string;
}

export interface Attraction {
  id?: number;
  name: string;
  description?: string;
  estimatedCost?: number;
  duration?: string; // e.g., "2 hours", "30 minutes"
}

export interface Journey {
  id?: number;
  title: string;
  description?: string;
  startDate: Date | string;
  endDate: Date | string;
  stops?: Stop[];
  transports?: Transport[];
  totalEstimatedCost?: number;
  currency: string;
  createdAt?: Date | string;
  updatedAt?: Date | string;
}

export type TransportType = 'flight' | 'train' | 'bus' | 'car' | 'other';
