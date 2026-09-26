export interface AnomalyLocation {
  city: string;
  country: string;
  location: string;
  ip: string;
  device: string;
  time: string;
}

/**
 * 30 Realistic Threat Actor & Anomaly Sign-in Profiles
 * Designed specifically for Microsoft 365 Unusual Sign-in Activity simulation.
 * 100% self-contained, offline-ready (Zero external libraries or CDN dependencies).
 */
export const ANOMALY_LOCATIONS: AnomalyLocation[] = [
  { city: 'Hanoi', country: 'Vietnam', location: 'Hanoi, Vietnam', ip: '14.162.180.95', device: 'Windows 10 • Chrome Browser', time: '03:42' },
  { city: 'Ho Chi Minh City', country: 'Vietnam', location: 'Ho Chi Minh City, Vietnam', ip: '118.69.182.41', device: 'Android 14 • Chrome Mobile', time: '02:18' },
  { city: 'Moscow', country: 'Russia', location: 'Moscow, Russia', ip: '95.173.136.72', device: 'Windows 11 • Firefox', time: '04:15' },
  { city: 'Saint Petersburg', country: 'Russia', location: 'Saint Petersburg, Russia', ip: '178.62.204.18', device: 'Windows 10 • Chrome Browser', time: '03:09' },
  { city: 'Frankfurt', country: 'Germany', location: 'Frankfurt, Germany', ip: '185.220.101.5', device: 'Linux x86_64 • Chrome Headless', time: '01:54' },
  { city: 'Berlin', country: 'Germany', location: 'Berlin, Germany', ip: '194.26.29.112', device: 'Windows 11 • Edge', time: '04:33' },
  { city: 'Amsterdam', country: 'Netherlands', location: 'Amsterdam, Netherlands', ip: '185.107.56.201', device: 'macOS Sonoma • Safari', time: '02:47' },
  { city: 'Lagos', country: 'Nigeria', location: 'Lagos, Nigeria', ip: '102.89.23.114', device: 'Android 13 • Chrome Mobile', time: '03:25' },
  { city: 'Abuja', country: 'Nigeria', location: 'Abuja, Nigeria', ip: '197.210.54.89', device: 'Windows 10 • Opera', time: '01:38' },
  { city: 'São Paulo', country: 'Brazil', location: 'São Paulo, Brazil', ip: '177.18.24.80', device: 'macOS Sonoma • Safari', time: '04:02' },
  { city: 'Rio de Janeiro', country: 'Brazil', location: 'Rio de Janeiro, Brazil', ip: '186.232.140.66', device: 'Windows 10 • Chrome Browser', time: '02:51' },
  { city: 'Shenzhen', country: 'China', location: 'Shenzhen, China', ip: '113.116.12.44', device: 'Windows 10 • Edge', time: '03:14' },
  { city: 'Guangzhou', country: 'China', location: 'Guangzhou, China', ip: '120.236.174.150', device: 'Windows 11 • Chrome Browser', time: '04:22' },
  { city: 'Bucharest', country: 'Romania', location: 'Bucharest, Romania', ip: '185.191.171.12', device: 'Windows 11 • Opera', time: '02:30' },
  { city: 'Singapore', country: 'Singapore', location: 'Singapore', ip: '103.253.25.78', device: 'macOS Ventura • Chrome Browser', time: '03:55' },
  { city: 'Seoul', country: 'South Korea', location: 'Seoul, South Korea', ip: '211.234.118.33', device: 'Windows 11 • Whale Browser', time: '01:45' },
  { city: 'Busan', country: 'South Korea', location: 'Busan, South Korea', ip: '121.166.45.19', device: 'Android 14 • Samsung Internet', time: '04:10' },
  { city: 'Tokyo', country: 'Japan', location: 'Tokyo, Japan', ip: '133.242.18.90', device: 'Windows 11 • Edge', time: '02:28' },
  { city: 'Jakarta', country: 'Indonesia', location: 'Jakarta, Indonesia', ip: '182.253.160.105', device: 'Windows 10 • Chrome Browser', time: '03:36' },
  { city: 'Manila', country: 'Philippines', location: 'Manila, Philippines', ip: '112.198.102.60', device: 'Windows 10 • Chrome Browser', time: '04:48' },
  { city: 'Mumbai', country: 'India', location: 'Mumbai, India', ip: '103.110.170.25', device: 'Android 13 • Chrome Mobile', time: '02:05' },
  { city: 'New Delhi', country: 'India', location: 'New Delhi, India', ip: '49.36.80.142', device: 'Windows 10 • Firefox', time: '03:19' },
  { city: 'Istanbul', country: 'Turkey', location: 'Istanbul, Turkey', ip: '88.255.219.14', device: 'Windows 11 • Chrome Browser', time: '01:50' },
  { city: 'Warsaw', country: 'Poland', location: 'Warsaw, Poland', ip: '185.180.12.48', device: 'Windows 10 • Edge', time: '04:12' },
  { city: 'Kyiv', country: 'Ukraine', location: 'Kyiv, Ukraine', ip: '195.138.70.16', device: 'Windows 11 • Chrome Browser', time: '02:40' },
  { city: 'Johannesburg', country: 'South Africa', location: 'Johannesburg, South Africa', ip: '196.25.1.189', device: 'Windows 10 • Chrome Browser', time: '03:22' },
  { city: 'Buenos Aires', country: 'Argentina', location: 'Buenos Aires, Argentina', ip: '181.44.120.30', device: 'macOS Monterey • Safari', time: '01:15' },
  { city: 'Bogota', country: 'Colombia', location: 'Bogota, Colombia', ip: '190.157.8.210', device: 'Windows 10 • Chrome Browser', time: '04:35' },
  { city: 'Dubai', country: 'United Arab Emirates', location: 'Dubai, United Arab Emirates', ip: '94.200.12.85', device: 'iOS 17.4 • Mobile Safari', time: '02:58' },
  { city: 'Kuala Lumpur', country: 'Malaysia', location: 'Kuala Lumpur, Malaysia', ip: '175.139.210.45', device: 'Windows 11 • Chrome Browser', time: '03:49' }
];

/**
 * Returns a randomly picked anomaly profile from the 30-item pool
 */
export function getRandomAnomalyLocation(): AnomalyLocation {
  const index = Math.floor(Math.random() * ANOMALY_LOCATIONS.length);
  return ANOMALY_LOCATIONS[index];
}
