import argon2 from 'argon2';
import type { Env } from '../config/env.js';
import { prisma } from './prisma.js';

// Seeds the first admin account from environment variables. This only ever
// creates a user when the table is empty, so it is safe to run on every boot.
export async function ensureAdminSeeded(env: Env): Promise<void> {
  const existingCount = await prisma.adminUser.count();
  if (existingCount > 0) return;

  const passwordHash = await argon2.hash(env.ADMIN_PASSWORD, { type: argon2.argon2id });
  await prisma.adminUser.create({
    data: { email: env.ADMIN_EMAIL, passwordHash },
  });
}
