import { PrismaClient } from '@prisma/client';

export const prisma = new PrismaClient();

// Configure SQLite WAL mode for high concurrency
export async function initDatabasePragmas(): Promise<void> {
  try {
    // SQLite PRAGMA journal_mode returns a result row, so $queryRawUnsafe is required
    await prisma.$queryRawUnsafe('PRAGMA journal_mode = WAL;');
    await prisma.$queryRawUnsafe('PRAGMA busy_timeout = 5000;');
    await prisma.$queryRawUnsafe('PRAGMA synchronous = NORMAL;');
    console.log('[Database] SQLite WAL mode and busy_timeout configured successfully.');
  } catch (err) {
    console.warn('[Database] Failed to set SQLite pragmas:', err);
  }
}
