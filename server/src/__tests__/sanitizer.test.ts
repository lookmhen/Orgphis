import { describe, it, expect } from 'vitest';
import { sanitizeObject } from '../middleware/sanitizer.js';

describe('Zero-Password Sanitizer Middleware', () => {
  it('should strip password from flat object', () => {
    const input = {
      email: 'employee@company.com',
      password: 'SuperSecretPassword123!',
      empid: 'EMP-001'
    };

    const sanitized = sanitizeObject(input);
    expect(sanitized.email).toBe('employee@company.com');
    expect(sanitized.empid).toBe('EMP-001');
    expect(sanitized.password).toBe('[REDACTED_BY_POLICY]');
  });

  it('should recursively strip sensitive fields (pin, otp, secret, pwd)', () => {
    const input = {
      username: 'somchai',
      credentials: {
        pin: '1234',
        otp_code: '987654',
        nested: {
          secret_key: 'confidential'
        }
      }
    };

    const sanitized = sanitizeObject(input);
    expect(sanitized.credentials.pin).toBe('[REDACTED_BY_POLICY]');
    expect(sanitized.credentials.otp_code).toBe('[REDACTED_BY_POLICY]');
    expect(sanitized.credentials.nested.secret_key).toBe('[REDACTED_BY_POLICY]');
    expect(sanitized.username).toBe('somchai');
  });
});
