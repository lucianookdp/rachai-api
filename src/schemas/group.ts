import { z } from 'zod';
import { isSupportedCurrency } from '../lib/currencies.js';

export const pinSchema = z
  .string()
  .regex(/^\d{4,6}$/, 'PIN must be 4 to 6 digits');

export const currencySchema = z
  .string()
  .length(3)
  .transform((value) => value.toUpperCase())
  .refine(isSupportedCurrency, { message: 'Unsupported currency code' });

export const createGroupSchema = z.object({
  name: z.string().trim().min(1).max(80),
  pin: pinSchema,
  currency: currencySchema,
});

export const joinGroupSchema = z.object({
  pin: pinSchema,
});

export const addParticipantSchema = z.object({
  name: z.string().trim().min(1).max(80),
});

export const createExpenseSchema = z.object({
  description: z.string().trim().min(1).max(200),
  amountCents: z.number().int().positive(),
  paidById: z.string().min(1),
  participantIds: z.array(z.string().min(1)).min(1).optional(),
});

export const updateExpenseSchema = z.object({
  description: z.string().trim().min(1).max(200).optional(),
  amountCents: z.number().int().positive().optional(),
  paidById: z.string().min(1).optional(),
  participantIds: z.array(z.string().min(1)).min(1).optional(),
});

export const recordPaymentSchema = z.object({
  fromId: z.string().min(1),
  toId: z.string().min(1),
  amountCents: z.number().int().positive(),
});
