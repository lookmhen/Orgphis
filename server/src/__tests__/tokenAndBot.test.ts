import { describe, it, expect } from 'vitest';
import { generateTrackingToken, isBotUserAgent } from '../utils/tokenAndBot.js';

describe('Token Generation & Bot Filter Utility', () => {
  it('should generate URL-safe token of length 21 without spaces or symbols', () => {
    const token = generateTrackingToken();
    expect(token).toHaveLength(21);
    expect(/^[A-Za-z0-9]+$/.test(token)).toBe(true);
  });

  it('should generate unique tokens across 10,000 iterations without collisions', () => {
    const tokens = new Set<string>();
    for (let i = 0; i < 10000; i++) {
      tokens.add(generateTrackingToken());
    }
    expect(tokens.size).toBe(10000);
  });

  it('should accurately detect security scanner bots', () => {
    expect(isBotUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) Proofpoint URL Defense')).toBe(true);
    expect(isBotUserAgent('Microsoft Office/16.0 (Windows NT 10.0; Microsoft Outlook 16.0.12026; Pro)')).toBe(true);
    expect(isBotUserAgent('HeadlessChrome/90.0.4430.212')).toBe(true);
    expect(isBotUserAgent('GoogleImageProxy')).toBe(true);
    expect(isBotUserAgent('')).toBe(true); // Empty agent is flagged
  });

  it('should allow legitimate human browsers as non-bot', () => {
    const realChrome = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36';
    const realSafari = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Safari/605.1.15';
    expect(isBotUserAgent(realChrome)).toBe(false);
    expect(isBotUserAgent(realSafari)).toBe(false);
  });
});
