import { z } from 'zod';

export const adminLoginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export const adminTotpVerifySchema = z.object({
  tempToken: z.string().min(1),
  code: z.string().regex(/^\d{6}$/),
});
