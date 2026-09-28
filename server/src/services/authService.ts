import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { prisma } from '../prisma.js';
import { signAccessToken, signRefreshToken, verifyToken, getExpiresInSeconds } from '../utils/jwt.js';

const BCRYPT_ROUNDS = 12;

/**
 * Hash refresh token with SHA-256 (avoids bcrypt's 72-byte truncation limit on long JWTs)
 */
function hashRefreshToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}

export const authService = {
  /**
   * Validate credentials and return tokens + user info
   */
  async login(username: string, password: string, ipAddress?: string) {
    const user = await prisma.adminUser.findUnique({
      where: { username: username.toLowerCase().trim() }
    });

    if (!user || !user.isActive) {
      return null; // Generic failure — don't reveal whether username exists
    }

    const isValid = await bcrypt.compare(password, user.passwordHash);
    if (!isValid) {
      return null;
    }

    const payload = {
      userId: user.id,
      username: user.username,
      displayName: user.displayName
    };

    const accessToken = signAccessToken(payload);
    const refreshToken = signRefreshToken(payload);

    // Store SHA-256 hashed refresh token and update last login
    const refreshHash = hashRefreshToken(refreshToken);
    await prisma.adminUser.update({
      where: { id: user.id },
      data: {
        refreshToken: refreshHash,
        lastLoginAt: new Date(),
        lastLoginIp: ipAddress || null
      }
    });

    // Audit log
    await prisma.auditLog.create({
      data: {
        userId: user.id,
        action: 'LOGIN_SUCCESS',
        resource: 'auth',
        ipAddress: ipAddress || null,
        details: `User "${user.username}" logged in successfully`
      }
    });

    return {
      accessToken,
      refreshToken,
      expiresIn: getExpiresInSeconds(),
      user: {
        id: user.id,
        username: user.username,
        displayName: user.displayName
      }
    };
  },

  /**
   * Refresh access token using a valid refresh token
   */
  async refresh(refreshTokenInput: string) {
    let payload;
    try {
      payload = verifyToken(refreshTokenInput);
    } catch {
      return null;
    }

    const user = await prisma.adminUser.findUnique({
      where: { id: payload.userId }
    });

    if (!user || !user.isActive || !user.refreshToken) {
      return null;
    }

    // Verify full JWT refresh token via SHA-256 digest comparison
    const inputHash = hashRefreshToken(refreshTokenInput);
    if (inputHash !== user.refreshToken) {
      return null;
    }

    // Issue new tokens (rotation)
    const newPayload = {
      userId: user.id,
      username: user.username,
      displayName: user.displayName
    };

    const newAccessToken = signAccessToken(newPayload);
    const newRefreshToken = signRefreshToken(newPayload);

    // Store new SHA-256 hashed refresh token
    const newRefreshHash = hashRefreshToken(newRefreshToken);
    await prisma.adminUser.update({
      where: { id: user.id },
      data: { refreshToken: newRefreshHash }
    });

    return {
      accessToken: newAccessToken,
      refreshToken: newRefreshToken,
      expiresIn: getExpiresInSeconds()
    };
  },

  /**
   * Revoke refresh token (logout)
   */
  async logout(userId: string) {
    await prisma.adminUser.update({
      where: { id: userId },
      data: { refreshToken: null }
    });
  },

  /**
   * Get current user info
   */
  async getMe(userId: string) {
    const user = await prisma.adminUser.findUnique({
      where: { id: userId },
      select: {
        id: true,
        username: true,
        displayName: true,
        lastLoginAt: true,
        lastLoginIp: true,
        createdAt: true
      }
    });
    return user;
  },

  /**
   * Change password for the current user
   */
  async changePassword(userId: string, currentPassword: string, newPassword: string) {
    const user = await prisma.adminUser.findUnique({
      where: { id: userId }
    });

    if (!user) return { success: false, error: 'User not found' };

    const isValid = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!isValid) {
      return { success: false, error: 'รหัสผ่านปัจจุบันไม่ถูกต้อง (Current password is incorrect)' };
    }

    if (newPassword.length < 8) {
      return { success: false, error: 'รหัสผ่านใหม่ต้องมีอย่างน้อย 8 ตัวอักษร (New password must be at least 8 characters)' };
    }

    const newHash = await bcrypt.hash(newPassword, BCRYPT_ROUNDS);
    await prisma.adminUser.update({
      where: { id: userId },
      data: {
        passwordHash: newHash,
        refreshToken: null // Force re-login after password change
      }
    });

    await prisma.auditLog.create({
      data: {
        userId,
        action: 'PASSWORD_CHANGED',
        resource: 'auth',
        details: `Admin user changed password and invalidated sessions`
      }
    });

    return { success: true };
  },

  /**
   * Get session status and recent authentication audit logs
   */
  async getSessionsInfo(userId: string) {
    const user = await prisma.adminUser.findUnique({
      where: { id: userId },
      select: {
        id: true,
        username: true,
        displayName: true,
        lastLoginAt: true,
        lastLoginIp: true,
        refreshToken: true
      }
    });

    const recentLogs = await prisma.auditLog.findMany({
      where: { resource: 'auth' },
      orderBy: { createdAt: 'desc' },
      take: 15
    });

    return {
      activeSession: user ? {
        username: user.username,
        displayName: user.displayName,
        lastLoginAt: user.lastLoginAt,
        lastLoginIp: user.lastLoginIp,
        hasActiveRefreshToken: Boolean(user.refreshToken)
      } : null,
      recentActivity: recentLogs
    };
  },

  /**
   * Revoke all active refresh tokens for the user
   */
  async revokeAllSessions(userId: string, ipAddress?: string) {
    await prisma.adminUser.update({
      where: { id: userId },
      data: { refreshToken: null }
    });

    await prisma.auditLog.create({
      data: {
        userId,
        action: 'SESSIONS_REVOKED',
        resource: 'auth',
        ipAddress: ipAddress || null,
        details: `All active refresh tokens were revoked by administrator`
      }
    });

    return { success: true };
  },

  /**
   * Seed default admin user from environment variables (first-boot only, concurrency-safe)
   */
  async seedDefaultAdmin() {
    const existingCount = await prisma.adminUser.count();
    if (existingCount > 0) {
      return; // Admin already exists — don't overwrite
    }

    const username = (process.env.ADMIN_DEFAULT_USERNAME || 'admin').toLowerCase().trim();
    const password = process.env.ADMIN_DEFAULT_PASSWORD || 'PhishCentral@2026';
    const displayName = process.env.ADMIN_DEFAULT_DISPLAY_NAME || 'System Administrator';

    const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);

    try {
      await prisma.adminUser.upsert({
        where: { username },
        update: {},
        create: {
          username,
          displayName,
          passwordHash
        }
      });
      console.log(`[Auth] Default admin account verified/created: "${username}"`);
    } catch {
      // Concurrent worker already seeded the admin user
    }
  }
};
