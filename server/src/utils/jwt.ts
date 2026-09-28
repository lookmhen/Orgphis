import jwt from 'jsonwebtoken';
import crypto from 'crypto';

const DEFAULT_FALLBACK_SECRET = 'phishcentral-jwt-secret-change-in-production-2026';

function getJwtSecret(): string {
  return process.env.JWT_SECRET || DEFAULT_FALLBACK_SECRET;
}

function getJwtExpiresIn(): string {
  return process.env.JWT_EXPIRES_IN || '1h';
}

function getJwtRefreshExpiresIn(): string {
  return process.env.JWT_REFRESH_EXPIRES_IN || '7d';
}

export interface JwtPayload {
  userId: string;
  username: string;
  displayName: string;
  role?: string;
}

export function signAccessToken(payload: JwtPayload): string {
  return jwt.sign(payload, getJwtSecret(), {
    expiresIn: getJwtExpiresIn(),
    jwtid: crypto.randomUUID()
  } as jwt.SignOptions);
}

export function signRefreshToken(payload: JwtPayload): string {
  return jwt.sign({ ...payload, type: 'refresh' }, getJwtSecret(), {
    expiresIn: getJwtRefreshExpiresIn(),
    jwtid: crypto.randomUUID()
  } as jwt.SignOptions);
}

export function verifyToken(token: string): JwtPayload {
  const decoded = jwt.verify(token, getJwtSecret()) as JwtPayload & { type?: string };
  return {
    userId: decoded.userId,
    username: decoded.username,
    displayName: decoded.displayName,
    role: decoded.role || 'ADMIN'
  };
}

export function getExpiresInSeconds(): number {
  const match = getJwtExpiresIn().match(/^(\d+)(s|m|h|d)$/);
  if (!match) return 3600;
  const [, num, unit] = match;
  const multipliers: Record<string, number> = { s: 1, m: 60, h: 3600, d: 86400 };
  return parseInt(num) * (multipliers[unit] || 3600);
}
