import { z } from 'zod';

/**
 * Schema dla tworzenia nowej podróży
 */
export const createJourneySchema = z.object({
  body: z.object({
    title: z.string()
      .min(1, 'Title is required')
      .max(255, 'Title must not exceed 255 characters'),
    description: z.string().max(2000, 'Description must not exceed 2000 characters').optional(),
    startDate: z.string().datetime('Invalid start date format').or(z.date()),
    endDate: z.string().datetime('Invalid end date format').or(z.date()),
    totalEstimatedCost: z.number().nonnegative('Total cost must be non-negative').optional(),
    currency: z.string()
      .length(3, 'Currency must be a 3-letter code (e.g., PLN, EUR, USD)')
      .regex(/^[A-Z]{3}$/, 'Currency must be uppercase 3-letter code')
      .default('PLN'),
  }).refine(
    (data) => {
      const start = new Date(data.startDate);
      const end = new Date(data.endDate);
      return end >= start;
    },
    {
      message: 'End date must be after or equal to start date',
      path: ['endDate'],
    }
  ),
});

/**
 * Schema dla aktualizacji podróży
 */
export const updateJourneySchema = z.object({
  params: z.object({
    id: z.string().regex(/^\d+$/, 'Journey ID must be a number'),
  }),
  body: z.object({
    title: z.string()
      .min(1, 'Title is required')
      .max(255, 'Title must not exceed 255 characters')
      .optional(),
    description: z.string().max(2000, 'Description must not exceed 2000 characters').optional(),
    startDate: z.string().datetime('Invalid start date format').or(z.date()).optional(),
    endDate: z.string().datetime('Invalid end date format').or(z.date()).optional(),
    totalEstimatedCost: z.number().nonnegative('Total cost must be non-negative').optional(),
    currency: z.string()
      .length(3, 'Currency must be a 3-letter code')
      .regex(/^[A-Z]{3}$/, 'Currency must be uppercase')
      .optional(),
  }).refine(
    (data) => {
      if (data.startDate && data.endDate) {
        const start = new Date(data.startDate);
        const end = new Date(data.endDate);
        return end >= start;
      }
      return true;
    },
    {
      message: 'End date must be after or equal to start date',
      path: ['endDate'],
    }
  ),
});

/**
 * Schema dla pobierania listy podróży (pagination) - tylko query
 */
export const getJourneysSchema = z.object({
  page: z.string().regex(/^\d+$/, 'Page must be a number').optional().default('1'),
  limit: z.string().regex(/^\d+$/, 'Limit must be a number').optional().default('25'),
  pageSize: z.string().regex(/^\d+$/, 'PageSize must be a number').optional(),
});

/**
 * Schema dla pobierania pojedynczej podróży
 */
export const getJourneyByIdSchema = z.object({
  params: z.object({
    id: z.string().regex(/^\d+$/, 'Journey ID must be a number'),
  }),
});

/**
 * Schema dla usuwania podróży
 */
export const deleteJourneySchema = z.object({
  params: z.object({
    id: z.string().regex(/^\d+$/, 'Journey ID must be a number'),
  }),
});
