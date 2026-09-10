import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { initDatabasePragmas } from './prisma.js';
import { zeroPasswordSanitizer } from './middleware/sanitizer.js';
import { seedOfficialPresets } from './services/templateService.js';
import { targetsRouter } from './routes/targets.js';
import { templatesRouter } from './routes/templates.js';
import { smtpRouter } from './routes/smtp.js';
import { campaignsRouter } from './routes/campaigns.js';
import { publicTrackingRouter } from './routes/publicTracking.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = parseInt(process.env.PORT || '3000', 10);

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

// 5. Mount Public Tracking & Simulation Endpoints
app.use(publicTrackingRouter);

// 6. Serve Static Client in Production (if client build exists)
const clientBuildPath = path.join(__dirname, '../../client/dist');
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
    console.log(`====================================================`);
    console.log(`🛡️  PhishCentral Server running on port ${PORT}`);
    console.log(`🌐 Base URL: ${process.env.BASE_URL || `http://localhost:${PORT}`}`);
    console.log(`====================================================`);
  });
}

bootstrap().catch(err => {
  console.error('Bootstrap failed:', err);
});

export default app;
