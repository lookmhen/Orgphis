import { describe, it, expect, beforeEach, afterEach, afterAll } from 'vitest';
import fs from 'fs';
import path from 'path';
import { 
  isLoopbackOrLocalhost, 
  isDomainNameUrl, 
  sanitizeBaseUrl, 
  resolveServerBaseUrl 
} from '../utils/network.js';

describe('Network & Base URL Resolution Suite', () => {
  const originalEnv = process.env.BASE_URL;

  beforeEach(() => {
    delete process.env.BASE_URL;
  });

  afterEach(() => {
    if (originalEnv !== undefined) {
      process.env.BASE_URL = originalEnv;
    } else {
      delete process.env.BASE_URL;
    }
  });

  afterAll(() => {
    const candidates = [
      path.resolve(process.cwd(), 'data/persistent_base_url.txt'),
      path.resolve(process.cwd(), 'server/data/persistent_base_url.txt'),
      path.resolve(process.cwd(), '../data/persistent_base_url.txt')
    ];
    candidates.forEach(f => {
      if (fs.existsSync(f)) {
        try { fs.unlinkSync(f); } catch {}
      }
    });
  });

  describe('isLoopbackOrLocalhost', () => {
    it('should identify localhost variations as loopback', () => {
      expect(isLoopbackOrLocalhost('http://localhost:3000')).toBe(true);
      expect(isLoopbackOrLocalhost('http://localhost')).toBe(true);
      expect(isLoopbackOrLocalhost('localhost:3000')).toBe(true);
      expect(isLoopbackOrLocalhost('http://127.0.0.1:3000')).toBe(true);
      expect(isLoopbackOrLocalhost('http://0.0.0.0:3000')).toBe(true);
      expect(isLoopbackOrLocalhost('http://[::1]:3000')).toBe(true);
      expect(isLoopbackOrLocalhost('')).toBe(true);
      expect(isLoopbackOrLocalhost(undefined)).toBe(true);
    });

    it('should identify legitimate LAN IPs and domains as non-loopback', () => {
      expect(isLoopbackOrLocalhost('http://192.168.1.100:3000')).toBe(false);
      expect(isLoopbackOrLocalhost('http://10.0.0.5:3000')).toBe(false);
      expect(isLoopbackOrLocalhost('https://phish.company.com')).toBe(false);
      expect(isLoopbackOrLocalhost('http://security-drill.internal:3000')).toBe(false);
    });
  });

  describe('isDomainNameUrl', () => {
    it('should correctly identify domain names', () => {
      expect(isDomainNameUrl('https://phish.company.com')).toBe(true);
      expect(isDomainNameUrl('http://security-drill.internal:3000')).toBe(true);
      expect(isDomainNameUrl('http://portal.local')).toBe(true);
    });

    it('should return false for raw IPs and localhost', () => {
      expect(isDomainNameUrl('http://192.168.1.100:3000')).toBe(false);
      expect(isDomainNameUrl('http://10.0.0.1')).toBe(false);
      expect(isDomainNameUrl('http://localhost:3000')).toBe(false);
      expect(isDomainNameUrl('http://127.0.0.1:3000')).toBe(false);
      expect(isDomainNameUrl('')).toBe(false);
    });
  });

  describe('resolveServerBaseUrl', () => {
    it('should prioritize genuine Domain Name from process.env.BASE_URL', () => {
      process.env.BASE_URL = 'https://phish.myenterprise.com';
      const resolved = resolveServerBaseUrl('http://localhost:3000', 'localhost:3000');
      expect(resolved).toBe('https://phish.myenterprise.com');
    });

    it('should prioritize genuine Domain Name from client browser if process.env.BASE_URL is not set', () => {
      const resolved = resolveServerBaseUrl('https://security-verify.corp.com', 'security-verify.corp.com', 'https');
      expect(resolved).toBe('https://security-verify.corp.com');
    });

    it('should prioritize Domain Name over a stale LAN IP in process.env.BASE_URL', () => {
      // If .env had an internal IP, but browser accesses via domain name, domain name should win
      process.env.BASE_URL = 'http://192.168.1.50:3000';
      const resolved = resolveServerBaseUrl('https://phish.corp.com', 'phish.corp.com', 'https');
      expect(resolved).toBe('https://phish.corp.com');
    });

    it('should NEVER return localhost when request came from localhost and BASE_URL is empty', () => {
      const resolved = resolveServerBaseUrl('http://localhost:3000', 'localhost:3000', 'http');
      expect(resolved).not.toContain('localhost');
      expect(resolved).not.toContain('127.0.0.1');
      expect(resolved).toMatch(/^http:\/\/\d+\.\d+\.\d+\.\d+:3000$/);
    });

    it('should reject localhost in process.env.BASE_URL and fallback to LAN IP', () => {
      process.env.BASE_URL = 'http://localhost:3000';
      const resolved = resolveServerBaseUrl('http://localhost:3000', 'localhost:3000');
      expect(resolved).not.toContain('localhost');
      expect(resolved).toMatch(/^http:\/\/\d+\.\d+\.\d+\.\d+:3000$/);
    });

    it('should remember and use previously saved persistent domain on server restart', () => {
      // First session: admin browses via domain
      resolveServerBaseUrl('https://phish.mycompany.com');

      // Server restart: no env, no reqBaseUrl, no reqHost
      const resolvedOnRestart = resolveServerBaseUrl();
      expect(resolvedOnRestart).toBe('https://phish.mycompany.com');
    });
  });
});
