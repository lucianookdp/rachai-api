import jwt from 'jsonwebtoken';

interface GroupTokenPayload {
  type: 'group';
  groupId: string;
}

interface AdminTokenPayload {
  type: 'admin';
  adminId: string;
}

interface AdminTempTokenPayload {
  type: 'admin-2fa-pending';
  adminId: string;
}

const GROUP_TOKEN_TTL = '24h';
const ADMIN_TOKEN_TTL = '12h';
const ADMIN_TEMP_TOKEN_TTL = '5m';

export function signGroupToken(groupId: string, secret: string): string {
  const payload: GroupTokenPayload = { type: 'group', groupId };
  return jwt.sign(payload, secret, { expiresIn: GROUP_TOKEN_TTL });
}

export function verifyGroupToken(token: string, secret: string): GroupTokenPayload | null {
  try {
    const decoded = jwt.verify(token, secret);
    if (typeof decoded === 'object' && decoded.type === 'group') {
      return decoded as GroupTokenPayload;
    }
    return null;
  } catch {
    return null;
  }
}

export function signAdminToken(adminId: string, secret: string): string {
  const payload: AdminTokenPayload = { type: 'admin', adminId };
  return jwt.sign(payload, secret, { expiresIn: ADMIN_TOKEN_TTL });
}

export function verifyAdminToken(token: string, secret: string): AdminTokenPayload | null {
  try {
    const decoded = jwt.verify(token, secret);
    if (typeof decoded === 'object' && decoded.type === 'admin') {
      return decoded as AdminTokenPayload;
    }
    return null;
  } catch {
    return null;
  }
}

export function signAdminTempToken(adminId: string, secret: string): string {
  const payload: AdminTempTokenPayload = { type: 'admin-2fa-pending', adminId };
  return jwt.sign(payload, secret, { expiresIn: ADMIN_TEMP_TOKEN_TTL });
}

export function verifyAdminTempToken(token: string, secret: string): AdminTempTokenPayload | null {
  try {
    const decoded = jwt.verify(token, secret);
    if (typeof decoded === 'object' && decoded.type === 'admin-2fa-pending') {
      return decoded as AdminTempTokenPayload;
    }
    return null;
  } catch {
    return null;
  }
}

export function extractBearerToken(header: string | undefined): string | null {
  if (!header?.startsWith('Bearer ')) return null;
  return header.slice('Bearer '.length).trim() || null;
}
