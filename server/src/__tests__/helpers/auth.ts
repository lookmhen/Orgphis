import { prisma } from '../../prisma.js';
import { authService } from '../../services/authService.js';
import { signAccessToken } from '../../utils/jwt.js';

let _cachedToken: string | null = null;

/**
 * Get a valid JWT access token for test requests without consuming HTTP rate-limit slots.
 */
export async function getAuthToken(): Promise<string> {
  if (_cachedToken) return _cachedToken;

  await authService.seedDefaultAdmin();

  const admin = await prisma.adminUser.findFirst();
  if (!admin) {
    throw new Error('Auth helper: Default admin user not found after seeding');
  }

  _cachedToken = signAccessToken({
    userId: admin.id,
    username: admin.username,
    displayName: admin.displayName
  });

  return _cachedToken;
}

export function clearAuthToken() {
  _cachedToken = null;
}
