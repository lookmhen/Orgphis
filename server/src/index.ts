import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { initDatabasePragmas } from './prisma.js';
import { zeroPasswordSanitizer } from './middleware/sanitizer.js';
import { seedOfficialPresets } from './services/templateService.js';
import { targetsRouter } from './routes/targets.js';
import { templatesRouter } from './routes/templates.js';
import { smtpRouter } from './routes/smtp.js';
import { campaignsRouter } from './routes/campaigns.js';
import { dashboardRouter } from './routes/dashboard.js';
import { publicTrackingRouter } from './routes/publicTracking.js';
import { getLocalIpAddress } from './utils/network.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = parseInt(process.env.PORT || '3000', 10);

// Trust reverse proxy (for correct protocol/host under Nginx, Cloudflare, etc.)
app.set('trust proxy', true);

// 1. Security Headers & CORS
app.use(helmet({
  contentSecurityPolicy: false // Allow dynamic preview iframes
}));
app.use(cors());

// 2. Body parsers with top-level Zero-Password Sanitizer
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(zeroPasswordSanitizer);

// 3. System Status API
app.get('/api/system/status', (_req, res) => {
  res.json({
    status: 'healthy',
    system: 'PhishCentral Enterprise',
    version: '2.1.0',
    timestamp: new Date().toISOString()
  });
});

// 4. Mount API Routes
app.use('/api/targets', targetsRouter);
app.use('/api/templates', templatesRouter);
app.use('/api/smtp-profiles', smtpRouter);
app.use('/api/campaigns', campaignsRouter);
app.use('/api/dashboard', dashboardRouter);

// 5. Mount Public Tracking & Simulation Endpoints
app.use(publicTrackingRouter);

// 6. Serve Local Static Assets (Logos, Icons)
const serverPublicCandidates = [
  path.resolve(__dirname, '../public'),
  path.resolve(__dirname, './public'),
  path.resolve(process.cwd(), 'public'),
  path.resolve(process.cwd(), 'server/public')
];
const serverPublicPath = serverPublicCandidates.find(p => fs.existsSync(p)) || path.resolve(__dirname, '../public');
app.use('/static', express.static(serverPublicPath));

// 7. Serve Static Client in Production (if client build exists)
const clientBuildCandidates = [
  path.resolve(__dirname, '../../client/dist'),
  path.resolve(__dirname, '../client/dist'),
  path.resolve(process.cwd(), 'client/dist'),
  path.resolve(process.cwd(), 'dist/client')
];
const clientBuildPath = clientBuildCandidates.find(p => fs.existsSync(path.join(p, 'index.html'))) || path.resolve(__dirname, '../../client/dist');
app.use(express.static(clientBuildPath));
app.get('*', (_req, res, next) => {
  if (_req.path.startsWith('/api') || _req.path.startsWith('/l') || _req.path.startsWith('/track') || _req.path.startsWith('/report')) {
    return next();
  }
  res.sendFile(path.join(clientBuildPath, 'index.html'), (err) => {
    if (err) next();
  });
});

// Initialize database pragmas, seed presets and start server
async function bootstrap() {
  await initDatabasePragmas();
  await seedOfficialPresets();

  app.listen(PORT, '0.0.0.0', () => {
    const localIp = getLocalIpAddress();
    console.log(`====================================================`);
    console.log(`🛡️  PhishCentral Server running on port ${PORT} (0.0.0.0)`);
    console.log(`🌐 Base URL: ${process.env.BASE_URL || `http://${localIp}:${PORT}`}`);
    console.log(`🏠 LAN Host Access: http://${localIp}:${PORT}`);
    console.log(`====================================================`);
  });
}

bootstrap().catch(err => {
  console.error('Bootstrap failed:', err);
});

export default app;
