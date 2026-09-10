import { customAlphabet } from 'nanoid';

// URL-safe characters (letters and digits, no tricky punctuation)
const alphabet = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz';
const generateNanoId = customAlphabet(alphabet, 21);

/**
 * Generates a high-entropy, URL-safe tracking token
 */
export function generateTrackingToken(): string {
  return generateNanoId();
}

/**
 * Known Automated Security Scanner & Bot User-Agent signatures
 */
const BOT_SIGNATURES = [
  'proofpoint',
  'mimecast',
  'barracuda',
  'symantec',
  'messagelabs',
  'microsoft office',
  'safelinks',
  'headlesschrome',
  'phantomjs',
  'googleimageproxy',
  'curl',
  'wget',
  'python-requests',
  'aiohttp',
  'virustotal',
  'urlscan',
  'crawler',
  'spider',
  'bot'
];

/**
 * Checks if a given User-Agent belongs to an automated security scanner/bot
 */
export function isBotUserAgent(userAgent?: string | null): boolean {
  if (!userAgent || userAgent.trim().length === 0) {
    return true; // Missing User-Agent is treated as suspicious scanner
  }

  const lower = userAgent.toLowerCase();
  return BOT_SIGNATURES.some(sig => lower.includes(sig));
}
