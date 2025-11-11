export interface Stop {
  id?: number;
  journeyId?: number;
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
  isPaid?: boolean;
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
  flightNumber?: string;  // For flights (e.g., "LO123")
  trainNumber?: string;   // For trains (e.g., "TLK 12345")
  isPaid?: boolean;
}

export interface Attraction {
  id?: number;
  stopId?: number;
  name: string;
  description?: string;
  estimatedCost?: number;
  duration?: string; // e.g., "2 hours", "30 minutes"
  isPaid?: boolean;
}

export interface JourneyShare {
  id: number;
  journeyId: number;
  sharedWithUserId?: number;
  sharedByUserId: number;
  status: 'pending' | 'accepted' | 'rejected';
  invitedEmail?: string;
  invitationToken?: string;
  createdAt: Date | string;
  acceptedAt?: Date | string;
  rejectedAt?: Date | string;
  // Additional fields from joined queries
  journeyTitle?: string;
  journeyDescription?: string;
  startDate?: Date | string;
  endDate?: Date | string;
  sharedByUsername?: string;
  sharedByEmail?: string;
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
  createdBy?: number;
  isShared?: boolean; // Flag indicating if journey is shared with current user
  createdAt?: Date | string;
  updatedAt?: Date | string;
}

export type TransportType = 'flight' | 'train' | 'bus' | 'car' | 'other';
