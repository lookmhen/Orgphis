import { Router, Request, Response } from 'express';
import rateLimit from 'express-rate-limit';
import { authService } from '../services/authService.js';
import { extractTokenFromRequest } from '../middleware/auth.js';
import { verifyToken } from '../utils/jwt.js';

export const authRouter = Router();

// Rate limit login attempts: 5 per 15 minutes per IP
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: {
    error: 'Too many login attempts',
    message: 'ล็อกอินล้มเหลวเกินจำนวนครั้งที่กำหนด กรุณารอ 15 นาทีแล้วลองอีกครั้ง'
  },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => req.ip || req.socket.remoteAddress || 'unknown'
});

/**
 * POST /api/auth/login
 */
authRouter.post('/login', loginLimiter, async (req: Request, res: Response) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({
      error: 'Missing credentials',
      message: 'กรุณากรอกชื่อผู้ใช้และรหัสผ่าน'
    });
  }

  try {
    const ipAddress = req.ip || req.socket.remoteAddress;
    const result = await authService.login(username, password, ipAddress);

    if (!result) {
      // Log failed attempt
      const { prisma } = await import('../prisma.js');
      await prisma.auditLog.create({
        data: {
          action: 'LOGIN_FAILED',
          resource: 'auth',
          ipAddress: ipAddress || null,
          details: `Failed login attempt for username "${username}"`
        }
      });

      return res.status(401).json({
        error: 'Invalid credentials',
        message: 'ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง'
      });
    }

    // Set HttpOnly cookie for browser CSV download support
    res.cookie('phishcentral_token', result.accessToken, {
      httpOnly: true,
      sameSite: 'lax',
      maxAge: result.expiresIn * 1000,
      path: '/'
    });

    return res.json(result);
  } catch (err) {
    console.error('[Auth] Login error:', err);
    return res.status(500).json({ error: 'Authentication service error' });
  }
});

/**
 * POST /api/auth/refresh
 */
authRouter.post('/refresh', async (req: Request, res: Response) => {
  const { refreshToken } = req.body;

  if (!refreshToken) {
    return res.status(400).json({ error: 'Refresh token is required' });
  }

  try {
    const result = await authService.refresh(refreshToken);

    if (!result) {
      return res.status(401).json({
        error: 'Invalid refresh token',
        message: 'Refresh token ไม่ถูกต้องหรือหมดอายุ กรุณาเข้าสู่ระบบอีกครั้ง'
      });
    }

    res.cookie('phishcentral_token', result.accessToken, {
      httpOnly: true,
      sameSite: 'lax',
      maxAge: result.expiresIn * 1000,
      path: '/'
    });

    return res.json(result);
  } catch (err) {
    console.error('[Auth] Refresh error:', err);
    return res.status(500).json({ error: 'Token refresh failed' });
  }
});

/**
 * POST /api/auth/logout
 */
authRouter.post('/logout', async (req: Request, res: Response) => {
  res.clearCookie('phishcentral_token', { path: '/' });

  const token = extractTokenFromRequest(req);
  let userId: string | undefined;

  if (token) {
    try {
      const payload = verifyToken(token);
      userId = payload.userId;
    } catch {
      // Token might be expired, that's ok for logout
    }
  }

  if (!userId) {
    return res.json({ success: true });
  }

  try {
    await authService.logout(userId);
    return res.json({ success: true, message: 'ออกจากระบบเรียบร้อย' });
  } catch (err) {
    console.error('[Auth] Logout error:', err);
    return res.json({ success: true });
  }
});

/**
 * GET /api/auth/me — requires valid access token
 */
authRouter.get('/me', async (req: Request, res: Response) => {
  const token = extractTokenFromRequest(req);
  if (!token) {
    return res.status(401).json({ error: 'Not authenticated' });
  }

  try {
    const payload = verifyToken(token);
    const user = await authService.getMe(payload.userId);

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    return res.json(user);
  } catch {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
});

/**
 * POST /api/auth/change-password — requires valid access token
 */
authRouter.post('/change-password', async (req: Request, res: Response) => {
  const token = extractTokenFromRequest(req);
  if (!token) {
    return res.status(401).json({ error: 'Not authenticated' });
  }

  try {
    const payload = verifyToken(token);
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        error: 'Missing fields',
        message: 'กรุณากรอกรหัสผ่านปัจจุบันและรหัสผ่านใหม่'
      });
    }

    const result = await authService.changePassword(payload.userId, currentPassword, newPassword);

    if (!result.success) {
      return res.status(400).json({ error: result.error });
    }

    res.clearCookie('phishcentral_token', { path: '/' });
    return res.json({ success: true, message: 'เปลี่ยนรหัสผ่านเรียบร้อย กรุณาเข้าสู่ระบบอีกครั้ง' });
  } catch {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
});

/**
 * GET /api/auth/sessions — returns active session info and recent login audit logs
 */
authRouter.get('/sessions', async (req: Request, res: Response) => {
  const token = extractTokenFromRequest(req);
  if (!token) {
    return res.status(401).json({ error: 'Not authenticated' });
  }

  try {
    const payload = verifyToken(token);
    const data = await authService.getSessionsInfo(payload.userId);
    return res.json(data);
  } catch {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
});

/**
 * POST /api/auth/revoke-sessions — revokes all refresh tokens
 */
authRouter.post('/revoke-sessions', async (req: Request, res: Response) => {
  const token = extractTokenFromRequest(req);
  if (!token) {
    return res.status(401).json({ error: 'Not authenticated' });
  }

  try {
    const payload = verifyToken(token);
    const ipAddress = req.ip || req.socket.remoteAddress;
    await authService.revokeAllSessions(payload.userId, ipAddress);
    res.clearCookie('phishcentral_token', { path: '/' });
    return res.json({ success: true, message: 'ยกเลิก Session ทั้งหมดเรียบร้อย' });
  } catch {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
});
