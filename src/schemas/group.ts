import { z } from 'zod';
import { EXPENSE_CATEGORIES } from '../lib/categories.js';
import { isSupportedCurrency } from '../lib/currencies.js';
import { normalizePixKey } from '../lib/pixKey.js';

// Postgres INTEGER tops out near 2.1 billion cents; anything past this is a
// typo, and without a cap it surfaced as a 500 from the database.
const MAX_AMOUNT_CENTS = 1_000_000_000;
const amountCentsSchema = z.number().int().positive().max(MAX_AMOUNT_CENTS);

const categorySchema = z.enum(EXPENSE_CATEGORIES);
// Empty means "no note", so clearing the field removes it.
const noteSchema = z
  .string()
  .trim()
  .max(140)
  .transform((value) => value || null)
  .nullable();

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

export const updateParticipantSchema = z.object({
  // null or "" removes the key.
  pixKey: z
    .string()
    .max(100)
    .transform((value, ctx) => {
      if (!value.trim()) return null;
      const result = normalizePixKey(value);
      if (!result.ok) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: result.error });
        return z.NEVER;
      }
      return result.key;
    })
    .nullable(),
});

const expenseShareInputSchema = z.object({
  participantId: z.string().min(1),
  shareCents: amountCentsSchema,
});

export const createExpenseSchema = z.object({
  description: z.string().trim().min(1).max(200),
  amountCents: amountCentsSchema,
  paidById: z.string().min(1),
  category: categorySchema.optional(),
  note: noteSchema.optional(),
  participantIds: z.array(z.string().min(1)).min(1).max(50).optional(),
  // Custom, unequal shares as an alternative to participantIds (equal
  // split). If both are sent, shares wins; the shares must sum to
  // amountCents exactly, which the route validates.
  shares: z.array(expenseShareInputSchema).min(1).max(50).optional(),
});

export const updateExpenseSchema = z.object({
  description: z.string().trim().min(1).max(200).optional(),
  amountCents: amountCentsSchema.optional(),
  paidById: z.string().min(1).optional(),
  category: categorySchema.optional(),
  note: noteSchema.optional(),
  participantIds: z.array(z.string().min(1)).min(1).max(50).optional(),
  shares: z.array(expenseShareInputSchema).min(1).max(50).optional(),
});

export const createRecurringSchema = z.object({
  description: z.string().trim().min(1).max(200),
  amountCents: amountCentsSchema,
  paidById: z.string().min(1),
  participantIds: z.array(z.string().min(1)).min(1).max(50),
  category: categorySchema.optional(),
  // 1 to 28 so every month, February included, has the day.
  dayOfMonth: z.number().int().min(1).max(28),
});

export const recordPaymentSchema = z.object({
  fromId: z.string().min(1),
  toId: z.string().min(1),
  amountCents: amountCentsSchema,
});
