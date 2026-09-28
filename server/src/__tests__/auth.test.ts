import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import app from '../index.js';
import { authService } from '../services/authService.js';
import { prisma } from '../prisma.js';

describe('Authentication & Authorization Suite', () => {
  beforeAll(async () => {
    await authService.seedDefaultAdmin();
  });

  const credentials = {
    username: process.env.ADMIN_DEFAULT_USERNAME || 'admin',
    password: process.env.ADMIN_DEFAULT_PASSWORD || 'PhishCentral@2026'
  };

  let accessToken = '';
  let refreshToken = '';

  it('1. Login with correct credentials should return tokens and user info', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send(credentials);

    expect(res.status).toBe(200);
    expect(res.body.accessToken).toBeDefined();
    expect(res.body.refreshToken).toBeDefined();
    expect(res.body.expiresIn).toBeGreaterThan(0);
    expect(res.body.user.username).toBe(credentials.username);
    expect(res.body.user.displayName).toBeDefined();
    expect(res.body.user.id).toBeDefined();

    accessToken = res.body.accessToken;
    refreshToken = res.body.refreshToken;
  });

  it('2. Login with wrong password should return 401 with generic message', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ username: credentials.username, password: 'wrong-password-123' });

    expect(res.status).toBe(401);
    expect(res.body.error).toBe('Invalid credentials');
    // Should NOT reveal whether username or password was wrong
    expect(res.body.message).not.toContain('username');
    expect(res.body.message).not.toContain('password');
  });

  it('3. Login with non-existent username should return same 401 (prevent enumeration)', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ username: 'nonexistent_user_xyz', password: 'test' });

    expect(res.status).toBe(401);
    expect(res.body.error).toBe('Invalid credentials');
  });

  it('4. Access protected endpoint without token should return 401', async () => {
    const res = await request(app)
      .get('/api/campaigns');

    expect(res.status).toBe(401);
    expect(res.body.error).toContain('Authentication required');
  });

  it('5. Access protected endpoint with valid token should succeed', async () => {
    const res = await request(app)
      .get('/api/campaigns')
      .set('Authorization', `Bearer ${accessToken}`);

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });

  it('6. Access protected endpoint with invalid token should return 401', async () => {
    const res = await request(app)
      .get('/api/campaigns')
      .set('Authorization', 'Bearer invalid.jwt.token.here');

    expect(res.status).toBe(401);
  });

  it('7. Refresh token should rotate and return new access token', async () => {
    const oldRefresh = refreshToken;
    const res = await request(app)
      .post('/api/auth/refresh')
      .send({ refreshToken });

    expect(res.status).toBe(200);
    expect(res.body.accessToken).toBeDefined();
    expect(res.body.refreshToken).toBeDefined();
    expect(res.body.accessToken).not.toBe(accessToken); // Unique via jti

    // Old refresh token should now be revoked
    const reuseRes = await request(app)
      .post('/api/auth/refresh')
      .send({ refreshToken: oldRefresh });
    expect(reuseRes.status).toBe(401);

    // Update tokens for subsequent tests
    accessToken = res.body.accessToken;
    refreshToken = res.body.refreshToken;
  });

  it('8. Public tracking & simulation callbacks remain accessible without authentication', async () => {
    // System status
    const statusRes = await request(app).get('/api/system/status');
    expect(statusRes.status).toBe(200);
    expect(statusRes.body.status).toBe('healthy');

    // Tracking pixel open (returns 200 GIF without auth)
    const pixelRes = await request(app).get('/track/open/test-token-123');
    expect(pixelRes.status).toBe(200);
    expect(pixelRes.header['content-type']).toContain('image/gif');

    // Landing page & report callbacks (404 for unknown token, NEVER 401)
    const landingRes = await request(app).get('/l/unknown-token-123');
    expect(landingRes.status).toBe(404);

    const submitRes = await request(app).post('/l/unknown-token-123/submit').send({ password: 'secret' });
    expect(submitRes.status).toBe(404);

    const reportRes = await request(app).get('/report/unknown-token-123');
    expect(reportRes.status).toBe(404);

    // Static assets (may 404 if no file, but NEVER 401)
    const staticRes = await request(app).get('/static/nonexistent.png');
    expect(staticRes.status).not.toBe(401);
  });

  it('9. GET /api/auth/me and /api/auth/sessions should return user and session telemetry', async () => {
    const meRes = await request(app)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${accessToken}`);

    expect(meRes.status).toBe(200);
    expect(meRes.body.username).toBe(credentials.username);
    expect(meRes.body.displayName).toBeDefined();
    expect(meRes.body.id).toBeDefined();

    const sessRes = await request(app)
      .get('/api/auth/sessions')
      .set('Authorization', `Bearer ${accessToken}`);

    expect(sessRes.status).toBe(200);
    expect(sessRes.body.activeSession).toBeDefined();
    expect(sessRes.body.activeSession.hasActiveRefreshToken).toBe(true);
    expect(Array.isArray(sessRes.body.recentActivity)).toBe(true);
  });

  it('10. POST /api/auth/change-password should update password and invalidate refresh tokens', async () => {
    const newPassword = 'NewSecurePassword@2026';

    // Reject wrong current password
    const failRes = await request(app)
      .post('/api/auth/change-password')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ currentPassword: 'WrongCurrentPassword', newPassword });
    expect(failRes.status).toBe(400);

    // Succeed with valid current password
    const okRes = await request(app)
      .post('/api/auth/change-password')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ currentPassword: credentials.password, newPassword });
    expect(okRes.status).toBe(200);
    expect(okRes.body.success).toBe(true);

    // Restore original password so other tests are unaffected
    const restoreRes = await request(app)
      .post('/api/auth/change-password')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ currentPassword: newPassword, newPassword: credentials.password });
    expect(restoreRes.status).toBe(200);
  });

  it('11. Default admin should be seeded only once (idempotent)', async () => {
    await authService.seedDefaultAdmin();
    const count = await prisma.adminUser.count();
    expect(count).toBeGreaterThanOrEqual(1);
  });

  it('12. Multi-Admin Management: Should create, list, suspend/activate, enforce VIEWER read-only, and delete additional admins', async () => {
    const secondAdminUsername = `soc_admin2_${Date.now()}`;
    const viewerUsername = `auditor_viewer_${Date.now()}`;

    // 1. Create a second Full Admin
    const createAdminRes = await request(app)
      .post('/api/auth/users')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        username: secondAdminUsername,
        displayName: 'SOC Lead Two',
        password: 'Admin2Password@2026',
        role: 'ADMIN'
      });
    expect(createAdminRes.status).toBe(201);
    expect(createAdminRes.body.username).toBe(secondAdminUsername);
    expect(createAdminRes.body.role).toBe('ADMIN');
    const secondAdminId = createAdminRes.body.id;

    // 2. Create a Read-Only Viewer account
    const createViewerRes = await request(app)
      .post('/api/auth/users')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        username: viewerUsername,
        displayName: 'Executive Auditor',
        password: 'ViewerPassword@2026',
        role: 'VIEWER'
      });
    expect(createViewerRes.status).toBe(201);
    expect(createViewerRes.body.role).toBe('VIEWER');
    const viewerId = createViewerRes.body.id;

    // 3. List all users
    const listRes = await request(app)
      .get('/api/auth/users')
      .set('Authorization', `Bearer ${accessToken}`);
    expect(listRes.status).toBe(200);
    expect(listRes.body.length).toBeGreaterThanOrEqual(3);

    // 4. Verify VIEWER can read (GET) but cannot mutate (POST/DELETE)
    const { signAccessToken } = await import('../utils/jwt.js');
    const viewerToken = signAccessToken({
      userId: viewerId,
      username: viewerUsername,
      displayName: 'Executive Auditor',
      role: 'VIEWER'
    });

    const viewerGetRes = await request(app)
      .get('/api/campaigns')
      .set('Authorization', `Bearer ${viewerToken}`);
    expect(viewerGetRes.status).toBe(200);

    const viewerPostRes = await request(app)
      .post('/api/targets/groups')
      .set('Authorization', `Bearer ${viewerToken}`)
      .send({ name: 'Should Be Blocked' });
    expect(viewerPostRes.status).toBe(403);

    const viewerCreateUserRes = await request(app)
      .post('/api/auth/users')
      .set('Authorization', `Bearer ${viewerToken}`)
      .send({ username: 'hacker', password: 'Password1234' });
    expect(viewerCreateUserRes.status).toBe(403);

    // 5. Suspend second admin
    const suspendRes = await request(app)
      .patch(`/api/auth/users/${secondAdminId}/status`)
      .set('Authorization', `Bearer ${accessToken}`);
    expect(suspendRes.status).toBe(200);
    expect(suspendRes.body.isActive).toBe(false);

    // 6. Prevent self-deletion
    const meRes = await request(app)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${accessToken}`);
    const selfDeleteRes = await request(app)
      .delete(`/api/auth/users/${meRes.body.id}`)
      .set('Authorization', `Bearer ${accessToken}`);
    expect(selfDeleteRes.status).toBe(400);

    // 7. Delete created test accounts
    const delAdminRes = await request(app)
      .delete(`/api/auth/users/${secondAdminId}`)
      .set('Authorization', `Bearer ${accessToken}`);
    expect(delAdminRes.status).toBe(200);

    const delViewerRes = await request(app)
      .delete(`/api/auth/users/${viewerId}`)
      .set('Authorization', `Bearer ${accessToken}`);
    expect(delViewerRes.status).toBe(200);
  });
});
