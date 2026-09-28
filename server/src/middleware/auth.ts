import { Request, Response, NextFunction } from 'express';
import { verifyToken, JwtPayload } from '../utils/jwt.js';

// Extend Express Request type to include user info
declare global {
  namespace Express {
    interface Request {
      user?: JwtPayload;
    }
  }
}

/**
 * Extract JWT token from Authorization Bearer header, HttpOnly cookie, or query parameter
 */
export function extractTokenFromRequest(req: Request): string | null {
  // 1. Standard Authorization: Bearer <token> header
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return authHeader.substring(7);
  }

  // 2. HttpOnly cookie fallback (enables native browser <a download> CSV exports)
  const cookieHeader = req.headers.cookie;
  if (cookieHeader) {
    const match = cookieHeader.match(/(?:^|;\s*)phishcentral_token=([^;]+)/);
    if (match && match[1]) {
      return decodeURIComponent(match[1]);
    }
  }

  // 3. Query string token fallback
  if (typeof req.query.token === 'string' && req.query.token) {
    return req.query.token;
  }

  return null;
}

/**
 * JWT Authentication Middleware
 *
 * Mounted on /api BEFORE admin routers but AFTER publicTrackingRouter and authRouter.
 * Validates Bearer token from Authorization header or HttpOnly cookie.
 */
export function requireAuth(req: Request, res: Response, next: NextFunction) {
  // Allow auth endpoints through (mounted before this middleware, but defense-in-depth)
  if (req.path.startsWith('/auth')) {
    return next();
  }

  // Allow system status endpoint without auth
  if (req.path === '/system/status') {
    return next();
  }

  const token = extractTokenFromRequest(req);
  if (!token) {
    return res.status(401).json({
      error: 'Authentication required',
      message: 'กรุณาเข้าสู่ระบบก่อนใช้งาน'
    });
  }

  try {
    const payload = verifyToken(token);
    req.user = payload;

    // Enforce read-only permissions for VIEWER role on Admin APIs
    if (payload.role === 'VIEWER' && !['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
      return res.status(403).json({
        error: 'Insufficient permissions (Read-Only Viewer)',
        message: 'บัญชีประเภทผู้ดูรายงาน (Viewer) ไม่ได้รับอนุญาตให้สร้าง แก้ไข หรือลบข้อมูล'
      });
    }

    return next();
  } catch (err: any) {
    const isExpired = err?.name === 'TokenExpiredError';
    return res.status(401).json({
      error: isExpired ? 'Token expired' : 'Invalid token',
      message: isExpired ? 'Session หมดอายุ กรุณาเข้าสู่ระบบอีกครั้ง' : 'Token ไม่ถูกต้อง'
    });
  }
}
