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
      displayName: user.displayName,
      role: user.role || 'ADMIN'
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
        details: `User "${user.username}" (${user.role}) logged in successfully`
      }
    });

    return {
      accessToken,
      refreshToken,
      expiresIn: getExpiresInSeconds(),
      user: {
        id: user.id,
        username: user.username,
        displayName: user.displayName,
        role: user.role || 'ADMIN'
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
      displayName: user.displayName,
      role: user.role || 'ADMIN'
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
    }).catch(() => {});
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
        role: true,
        isActive: true,
        lastLoginAt: true,
        lastLoginIp: true,
        createdAt: true
      }
    });
    if (!user || !user.isActive) return null;
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
        details: `Admin user "${user.username}" changed password and invalidated sessions`
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
        role: true,
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
        role: user.role,
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
   * List all administrator accounts (Multi-Admin Management)
   */
  async listUsers() {
    return prisma.adminUser.findMany({
      select: {
        id: true,
        username: true,
        displayName: true,
        role: true,
        isActive: true,
        lastLoginAt: true,
        lastLoginIp: true,
        createdAt: true
      },
      orderBy: { createdAt: 'asc' }
    });
  },

  /**
   * Create a new administrator or viewer account
   */
  async createUser(actorUserId: string, data: { username: string; displayName: string; password: string; role?: string }) {
    const cleanUsername = data.username.toLowerCase().trim();
    if (!cleanUsername || cleanUsername.length < 3) {
      return { success: false, error: 'ชื่อผู้ใช้ (Username) ต้องมีอย่างน้อย 3 ตัวอักษร' };
    }
    if (!data.password || data.password.length < 8) {
      return { success: false, error: 'รหัสผ่านต้องมีอย่างน้อย 8 ตัวอักษร' };
    }

    const existing = await prisma.adminUser.findUnique({ where: { username: cleanUsername } });
    if (existing) {
      return { success: false, error: `ชื่อผู้ใช้ "${cleanUsername}" มีอยู่ในระบบแล้ว` };
    }

    const role = data.role === 'VIEWER' ? 'VIEWER' : 'ADMIN';
    const passwordHash = await bcrypt.hash(data.password, BCRYPT_ROUNDS);

    const created = await prisma.adminUser.create({
      data: {
        username: cleanUsername,
        displayName: data.displayName.trim() || cleanUsername,
        passwordHash,
        role
      },
      select: {
        id: true,
        username: true,
        displayName: true,
        role: true,
        isActive: true,
        createdAt: true
      }
    });

    await prisma.auditLog.create({
      data: {
        userId: actorUserId,
        action: 'ADMIN_USER_CREATED',
        resource: 'auth',
        details: `Created user "${created.username}" with role ${created.role}`
      }
    });

    return { success: true, user: created };
  },

  /**
   * Toggle active status (Suspend / Activate) of an admin user
   */
  async toggleUserStatus(actorUserId: string, targetUserId: string) {
    if (actorUserId === targetUserId) {
      return { success: false, error: 'ไม่สามารถระงับสิทธิ์บัญชีของตนเองได้' };
    }

    const target = await prisma.adminUser.findUnique({ where: { id: targetUserId } });
    if (!target) {
      return { success: false, error: 'ไม่พบบัญชีผู้ใช้งานนี้' };
    }

    const nextActive = !target.isActive;
    const updated = await prisma.adminUser.update({
      where: { id: targetUserId },
      data: {
        isActive: nextActive,
        refreshToken: nextActive ? target.refreshToken : null // Revoke session if suspended
      },
      select: {
        id: true,
        username: true,
        displayName: true,
        role: true,
        isActive: true
      }
    });

    await prisma.auditLog.create({
      data: {
        userId: actorUserId,
        action: nextActive ? 'ADMIN_USER_ACTIVATED' : 'ADMIN_USER_SUSPENDED',
        resource: 'auth',
        details: `User "${updated.username}" status changed to ${nextActive ? 'ACTIVE' : 'SUSPENDED'}`
      }
    });

    return { success: true, user: updated };
  },

  /**
   * Delete an admin user (prevents self-deletion and last-admin deletion)
   */
  async deleteUser(actorUserId: string, targetUserId: string) {
    if (actorUserId === targetUserId) {
      return { success: false, error: 'ไม่สามารถลบบัญชีที่กำลังล็อกอินใช้งานอยู่ได้' };
    }

    const target = await prisma.adminUser.findUnique({ where: { id: targetUserId } });
    if (!target) {
      return { success: false, error: 'ไม่พบบัญชีผู้ใช้งานนี้' };
    }

    const totalAdmins = await prisma.adminUser.count({
      where: { role: 'ADMIN', isActive: true }
    });
    if (target.role === 'ADMIN' && target.isActive && totalAdmins <= 1) {
      return { success: false, error: 'ไม่สามารถลบผู้ดูแลระบบคนสุดท้ายได้' };
    }

    await prisma.adminUser.delete({ where: { id: targetUserId } });

    await prisma.auditLog.create({
      data: {
        userId: actorUserId,
        action: 'ADMIN_USER_DELETED',
        resource: 'auth',
        details: `Deleted user "${target.username}" (${target.role})`
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
          passwordHash,
          role: 'ADMIN'
        }
      });
      console.log(`[Auth] Default admin account verified/created: "${username}"`);
    } catch {
      // Concurrent worker already seeded the admin user
    }
  }
};
