import { Request, Response, NextFunction } from 'express';

const SENSITIVE_KEYS = [
  'password',
  'pass',
  'pwd',
  'pin',
  'otp',
  'token_auth',
  'secret'
];

/**
 * Recursively strips sensitive credential keys from any object
 */
export function sanitizeObject(obj: any): any {
  if (!obj || typeof obj !== 'object') {
    return obj;
  }

  if (Array.isArray(obj)) {
    return obj.map(item => sanitizeObject(item));
  }

  const cleaned: Record<string, any> = {};
  for (const [key, value] of Object.entries(obj)) {
    // Check for sensitive credential keys, but ignore UI configuration boolean flags (e.g. showPasswordField, allowPassword)
    const isBooleanField = typeof value === 'boolean';
    const isSensitive = !isBooleanField && SENSITIVE_KEYS.some(sensitiveKey => {
      const lower = key.toLowerCase();
      return lower === sensitiveKey || lower.endsWith(`_${sensitiveKey}`) || lower.endsWith(sensitiveKey);
    });

    if (isSensitive && typeof value !== 'object') {
      // Mark as received but drop the actual plain-text value completely
      cleaned[key] = '[REDACTED_BY_POLICY]';
    } else if (typeof value === 'object') {
      cleaned[key] = sanitizeObject(value);
    } else {
      cleaned[key] = value;
    }
  }

  return cleaned;
}

/**
 * Top-level Express Middleware to enforce Zero Password Storage Policy
 * Drops victim passwords submitted on phishing landing pages
 * (Exempts administrative SMTP configuration route /api/smtp-profiles)
 */
export function zeroPasswordSanitizer(req: Request, _res: Response, next: NextFunction): void {
  // Allow system administrators to configure and save SMTP mail server credentials
  if (req.path.startsWith('/api/smtp-profiles')) {
    return next();
  }

  if (req.body && typeof req.body === 'object') {
    req.body = sanitizeObject(req.body);
  }
  next();
}
