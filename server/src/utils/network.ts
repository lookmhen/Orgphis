import os from 'os';

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
        // Prioritize Wi-Fi or Ethernet LAN addresses (e.g. 192.168.114.*) over VMware/VirtualBox (VMnet)
        const isVirtual = /vmnet|vbox|wsl|hyper-v|virtual/i.test(name);
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
 * Resolves the absolute base URL for phishing links and tracking pixels.
 * Priority order:
 * 1. Explicitly provided baseUrl in request body (e.g., from client)
 * 2. process.env.BASE_URL if configured and not pointing to localhost/127.0.0.1
 * 3. Request Host header if not pointing to localhost/127.0.0.1
 * 4. Auto-detected Host LAN IPv4 address (e.g., http://192.168.114.46:3000)
 */
export function resolveServerBaseUrl(reqBaseUrl?: string, reqHost?: string, reqProtocol: string = 'http'): string {
  // 1. Explicitly provided baseUrl
  if (reqBaseUrl && typeof reqBaseUrl === 'string' && reqBaseUrl.trim().length > 0) {
    let clean = reqBaseUrl.trim().replace(/\/+$/, '');
    if (!clean.includes('localhost') && !clean.includes('127.0.0.1')) {
      return clean;
    }
  }

  // 2. process.env.BASE_URL
  const envBaseUrl = process.env.BASE_URL?.trim();
  if (envBaseUrl && !envBaseUrl.includes('localhost') && !envBaseUrl.includes('127.0.0.1')) {
    return envBaseUrl.replace(/\/+$/, '');
  }

  // 3. Request Host header
  if (reqHost && !reqHost.includes('localhost') && !reqHost.includes('127.0.0.1')) {
    return `${reqProtocol}://${reqHost}`.replace(/\/+$/, '');
  }

  // 4. Auto-detect LAN IPv4
  const localIp = getLocalIpAddress();
  const port = process.env.PORT || '3000';
  return `http://${localIp}:${port}`;
}
