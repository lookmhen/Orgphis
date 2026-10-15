import os from 'os';
import fs from 'fs';
import path from 'path';

/**
 * Returns the primary non-internal IPv4 address of this machine.
 * Filters out loopbacks, link-local (169.254.*), and virtual adapter subnets if standard LAN exists.
 */
export function getLocalIpAddress(): string {
  const interfaces = os.networkInterfaces();
  const candidates: string[] = [];

  for (const name of Object.keys(interfaces)) {
    const netList = interfaces[name];
    if (!netList) continue;

    for (const net of netList) {
      // family can be 'IPv4' or 4 depending on Node version
      const isIpv4 = net.family === 'IPv4' || (net.family as any) === 4;
      if (isIpv4 && !net.internal && !net.address.startsWith('169.254.')) {
        // Prioritize Wi-Fi or Ethernet LAN addresses (e.g. 192.168.114.*) over VMware/VirtualBox/Hyper-V/Docker/WSL
        const isVirtual = /vmnet|vbox|wsl|hyper-v|virtual|vethernet|docker/i.test(name);
        if (!isVirtual) {
          return net.address;
        }
        candidates.push(net.address);
      }
    }
  }

  // Fallback to first non-internal candidate if no physical interface found
  if (candidates.length > 0) {
    return candidates[0];
  }

  return '127.0.0.1';
}

/**
 * Checks if a URL or host string points to localhost, loopback, or unspecified address.
 */
export function isLoopbackOrLocalhost(url?: string): boolean {
  if (!url || typeof url !== 'string') return true;
  const trimmed = url.trim().toLowerCase();
  return (
    trimmed === '' ||
    trimmed.includes('localhost') ||
    trimmed.includes('127.0.0.1') ||
    trimmed.includes('0.0.0.0') ||
    trimmed.includes('::1')
  );
}

/**
 * Checks if a URL contains a genuine domain name (e.g. phish.company.com)
 * rather than a raw numeric IPv4 address.
 */
export function isDomainNameUrl(url?: string): boolean {
  if (!url || isLoopbackOrLocalhost(url)) return false;
  try {
    const parsed = new URL(url.startsWith('http') ? url : `http://${url}`);
    const host = parsed.hostname;
    const isIpv4 = /^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(host);
    const isIpv6 = host.startsWith('[') || host.includes(':');
    return !isIpv4 && !isIpv6;
  } catch {
    return false;
  }
}

/**
 * Cleans and standardizes a URL by trimming and removing trailing slashes.
 */
export function sanitizeBaseUrl(url: string): string {
  let clean = url.trim().replace(/\/+$/, '');
  if (!clean.startsWith('http://') && !clean.startsWith('https://')) {
    clean = `http://${clean}`;
  }
  return clean;
}

/**
 * Finds the persistent data storage directory path.
 */
function getPersistentDataFilePath(): string {
  const candidates = [
    path.resolve(process.cwd(), 'data'),
    path.resolve(process.cwd(), '../data'),
    path.resolve(process.cwd(), './server/data')
  ];
  const found = candidates.find(c => fs.existsSync(c)) || candidates[0];
  return path.join(found, 'persistent_base_url.txt');
}

/**
 * Saves a valid domain name to persistent disk storage so that the system
 * remembers its public domain name across restarts or during background dispatches.
 */
export function savePersistentDomain(url: string): void {
  try {
    if (!isDomainNameUrl(url)) return;
    const clean = sanitizeBaseUrl(url);
    const filePath = getPersistentDataFilePath();
    const dir = path.dirname(filePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(filePath, clean, 'utf-8');
  } catch {
    // Non-fatal if running in restricted filesystem
  }
}

/**
 * Loads the previously remembered domain name from persistent storage.
 */
export function loadPersistentDomain(): string | undefined {
  try {
    const filePath = getPersistentDataFilePath();
    if (fs.existsSync(filePath)) {
      const content = fs.readFileSync(filePath, 'utf-8').trim();
      if (isDomainNameUrl(content)) {
        return sanitizeBaseUrl(content);
      }
    }
  } catch {
    // Non-fatal
  }
  return undefined;
}

/**
 * Resolves the absolute base URL for phishing links and tracking pixels.
 * Priority order:
 * 1. process.env.BASE_URL if configured with a real Domain Name (authoritative server config)
 * 2. Explicitly provided baseUrl from client browser if it is a real Domain Name (active web domain)
 * 3. Request Host header if it is a real Domain Name (reverse proxy host)
 * 4. Previously remembered persistent Domain Name from disk (from earlier admin sessions)
 * 5. process.env.BASE_URL if configured with a valid external/LAN IP
 * 6. Explicitly provided baseUrl from client browser if it is a valid external/LAN IP
 * 7. Request Host header if it is a valid external/LAN IP
 * 8. Auto-detected Host LAN IPv4 address (e.g. http://192.168.114.46:3000)
 * 
 * Under NO circumstances will this ever return localhost or 127.0.0.1 if any valid IP/domain exists.
 */
export function resolveServerBaseUrl(reqBaseUrl?: string, reqHost?: string, reqProtocol: string = 'http'): string {
  const envBaseUrl = process.env.BASE_URL?.trim();
  const rawReqHost = reqHost?.trim();
  const fullReqHostUrl = rawReqHost ? `${reqProtocol}://${rawReqHost}` : undefined;

  // Tier 1: Check for genuine Domain Names (e.g. https://phish.yourcompany.com)
  if (envBaseUrl && isDomainNameUrl(envBaseUrl)) {
    const clean = sanitizeBaseUrl(envBaseUrl);
    savePersistentDomain(clean);
    return clean;
  }
  if (reqBaseUrl && isDomainNameUrl(reqBaseUrl)) {
    const clean = sanitizeBaseUrl(reqBaseUrl);
    savePersistentDomain(clean);
    return clean;
  }
  if (fullReqHostUrl && isDomainNameUrl(fullReqHostUrl)) {
    const clean = sanitizeBaseUrl(fullReqHostUrl);
    savePersistentDomain(clean);
    return clean;
  }

  // Tier 1.5: Check for previously remembered persistent Domain Name from disk
  const persistentDomain = loadPersistentDomain();
  if (persistentDomain && isDomainNameUrl(persistentDomain)) {
    return persistentDomain;
  }

  // Tier 2: Check for valid non-loopback IP addresses
  if (envBaseUrl && !isLoopbackOrLocalhost(envBaseUrl)) {
    return sanitizeBaseUrl(envBaseUrl);
  }
  if (reqBaseUrl && !isLoopbackOrLocalhost(reqBaseUrl)) {
    return sanitizeBaseUrl(reqBaseUrl);
  }
  if (fullReqHostUrl && !isLoopbackOrLocalhost(fullReqHostUrl)) {
    return sanitizeBaseUrl(fullReqHostUrl);
  }

  // Tier 3: Auto-detect Host LAN IPv4
  const localIp = getLocalIpAddress();
  const port = process.env.PORT || '3000';
  return `http://${localIp}:${port}`;
}
