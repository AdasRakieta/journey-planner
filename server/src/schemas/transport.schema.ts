import { z } from 'zod';

/**
 * Dozwolone typy transportu
 */
const transportTypes = ['flight', 'train', 'bus', 'car', 'other'] as const;

/**
 * Schema dla tworzenia nowego transportu - tylko body
 */
export const createTransportSchema = z.object({
  journeyId: z.number().int().positive('Journey ID must be a positive integer'),
  type: z.enum(transportTypes, {
    message: `Type must be one of: ${transportTypes.join(', ')}`,
  }),
  fromLocation: z.string()
    .min(1, 'From location is required')
    .max(255, 'From location must not exceed 255 characters'),
  toLocation: z.string()
    .min(1, 'To location is required')
    .max(255, 'To location must not exceed 255 characters'),
  departureDate: z.string().datetime('Invalid departure date format').or(z.date()),
  arrivalDate: z.string().datetime('Invalid arrival date format').or(z.date()),
  price: z.number().nonnegative('Price must be non-negative'),
  currency: z.string()
    .length(3, 'Currency must be a 3-letter code')
    .regex(/^[A-Z]{3}$/, 'Currency must be uppercase')
    .default('PLN'),
  bookingUrl: z.string().url('Invalid URL format').optional().or(z.literal('')),
  notes: z.string().max(2000, 'Notes must not exceed 2000 characters').optional(),
  flightNumber: z.string().max(50, 'Flight number must not exceed 50 characters').optional(),
  trainNumber: z.string().max(50, 'Train number must not exceed 50 characters').optional(),
}).refine(
  (data) => {
    const departure = new Date(data.departureDate);
    const arrival = new Date(data.arrivalDate);
    return arrival >= departure;
  },
  {
    message: 'Arrival date must be after or equal to departure date',
    path: ['arrivalDate'],
  }
);

/**
 * Schema dla aktualizacji transportu
 */
export const updateTransportSchema = z.object({
  params: z.object({
    id: z.string().regex(/^\d+$/, 'Transport ID must be a number'),
  }),
  body: z.object({
    type: z.enum(transportTypes).optional(),
    fromLocation: z.string().min(1).max(255).optional(),
    toLocation: z.string().min(1).max(255).optional(),
    departureDate: z.string().datetime().or(z.date()).optional(),
    arrivalDate: z.string().datetime().or(z.date()).optional(),
    price: z.number().nonnegative().optional(),
    currency: z.string().length(3).regex(/^[A-Z]{3}$/).optional(),
    bookingUrl: z.string().url().optional().or(z.literal('')),
    notes: z.string().max(2000).optional(),
    flightNumber: z.string().max(50).optional(),
    trainNumber: z.string().max(50).optional(),
  }),
});
