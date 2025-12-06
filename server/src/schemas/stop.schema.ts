import { z } from 'zod';

/**
 * Schema dla tworzenia nowego przystanku (stop/city) - tylko body
 */
export const createStopSchema = z.object({
  journeyId: z.number().int().positive('Journey ID must be a positive integer'),
  city: z.string()
    .min(1, 'City name is required')
    .max(255, 'City name must not exceed 255 characters'),
  country: z.string()
    .min(1, 'Country is required')
    .max(255, 'Country must not exceed 255 characters'),
  latitude: z.number()
    .min(-90, 'Latitude must be between -90 and 90')
    .max(90, 'Latitude must be between -90 and 90'),
  longitude: z.number()
    .min(-180, 'Longitude must be between -180 and 180')
    .max(180, 'Longitude must be between -180 and 180'),
  arrivalDate: z.string().datetime('Invalid arrival date format').or(z.date()),
  departureDate: z.string().datetime('Invalid departure date format').or(z.date()),
  accommodationName: z.string().max(255, 'Accommodation name must not exceed 255 characters').optional(),
  accommodationUrl: z.string().url('Invalid URL format').optional().or(z.literal('')),
  accommodationPrice: z.number().nonnegative('Accommodation price must be non-negative').optional(),
  accommodationCurrency: z.string()
    .length(3, 'Currency must be a 3-letter code')
    .regex(/^[A-Z]{3}$/, 'Currency must be uppercase')
    .optional(),
  notes: z.string().max(2000, 'Notes must not exceed 2000 characters').optional(),
}).refine(
  (data) => {
    const arrival = new Date(data.arrivalDate);
    const departure = new Date(data.departureDate);
    return departure >= arrival;
  },
  {
    message: 'Departure date must be after or equal to arrival date',
    path: ['departureDate'],
  }
);

/**
 * Schema dla aktualizacji przystanku
 */
export const updateStopSchema = z.object({
  params: z.object({
    id: z.string().regex(/^\d+$/, 'Stop ID must be a number'),
  }),
  body: z.object({
    city: z.string().min(1).max(255).optional(),
    country: z.string().min(1).max(255).optional(),
    latitude: z.number().min(-90).max(90).optional(),
    longitude: z.number().min(-180).max(180).optional(),
    arrivalDate: z.string().datetime().or(z.date()).optional(),
    departureDate: z.string().datetime().or(z.date()).optional(),
    accommodationName: z.string().max(255).optional(),
    accommodationUrl: z.string().url().optional().or(z.literal('')),
    accommodationPrice: z.number().nonnegative().optional(),
    accommodationCurrency: z.string().length(3).regex(/^[A-Z]{3}$/).optional(),
    notes: z.string().max(2000).optional(),
  }),
});
