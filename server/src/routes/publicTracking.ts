import { Router, Request, Response } from 'express';
import { prisma } from '../prisma.js';
import { trackingService } from '../services/trackingService.js';
import { isBotUserAgent } from '../utils/tokenAndBot.js';
import { renderTemplate } from '../services/templateService.js';

export const publicTrackingRouter = Router();

// Transparent 1x1 GIF buffer (43 bytes)
const TRANSPARENT_GIF_BUFFER = Buffer.from(
  'R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7',
  'base64'
);

/**
 * 1x1 Tracking Pixel Endpoint for Email Open
 */
publicTrackingRouter.get('/track/open/:token', async (req: Request, res: Response) => {
  const { token } = req.params;
  const userAgent = req.headers['user-agent'] || '';
  const ipAddress = req.ip || req.socket.remoteAddress;
  const isBot = isBotUserAgent(userAgent);

  // Serve image response immediately with zero-cache headers
  res.setHeader('Content-Type', 'image/gif');
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
  res.end(TRANSPARENT_GIF_BUFFER);

  // Process tracking asynchronously in memory buffer
  try {
    const target = await prisma.campaignTarget.findUnique({
      where: { token },
      select: { id: true, campaignId: true, isReported: true }
    });

    if (target) {
      trackingService.enqueueEvent({
        campaignId: target.campaignId,
        campaignTargetId: target.id,
        eventType: 'OPENED',
        ipAddress: ipAddress || undefined,
        userAgent,
        isBot,
        createdAt: new Date()
      });
    }
  } catch (err) {
    console.error('[Tracking] Open tracking error:', err);
  }
});

/**
 * Phishing Landing Page Serving
 */
publicTrackingRouter.get('/l/:token', async (req: Request, res: Response) => {
  const { token } = req.params;
  const userAgent = req.headers['user-agent'] || '';
  const ipAddress = req.ip || req.socket.remoteAddress;
  const isBot = isBotUserAgent(userAgent);

  // Ignore HTTP HEAD scanner requests
  if (req.method === 'HEAD') {
    return res.status(200).end();
  }

  // Anti-crawler & SEO headers
  res.setHeader('X-Robots-Tag', 'noindex, nofollow, noarchive');

  try {
    const target = await prisma.campaignTarget.findUnique({
      where: { token },
      include: {
        target: true,
        campaign: {
          include: {
            landingPageTemplate: true
          }
        }
      }
    });

    if (!target) {
      return res.status(404).send('Resource not found or campaign link expired.');
    }

    if (target.campaign.status === 'CANCELLED') {
      return res.status(200).send(`
        <!DOCTYPE html>
        <html>
        <head><title>Simulation Ended</title></head>
        <body style="font-family: sans-serif; text-align: center; padding: 40px;">
          <h2>การทดสอบความปลอดภัยนี้สิ้นสุดลงแล้ว</h2>
          <p>ขอบคุณที่ให้ความร่วมมือในการเสริมสร้างความปลอดภัยไซเบอร์ขององค์กร</p>
        </body>
        </html>
      `);
    }

    // Enqueue CLICKED event
    trackingService.enqueueEvent({
      campaignId: target.campaignId,
      campaignTargetId: target.id,
      eventType: 'CLICKED',
      ipAddress: ipAddress || undefined,
      userAgent,
      isBot,
      createdAt: new Date()
    });

    const lp = target.campaign.landingPageTemplate;
    const variables = {
      name: `${target.target.firstName || ''} ${target.target.lastName || ''}`.trim() || target.target.email,
      email: target.target.email,
      department: target.target.department || ''
    };

    // Render HTML form
    const html = `
<!DOCTYPE html>
<html lang="th">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="robots" content="noindex, nofollow, noarchive">
  <title>${renderTemplate(lp.pageTitle, variables)}</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      background-color: #FAF8F5;
      color: #24292F;
      display: flex;
      justify-content: center;
      align-items: center;
      min-height: 100vh;
      padding: 20px;
    }
    .login-card {
      background: #ffffff;
      border: 1px solid #E7E5E0;
      box-shadow: 0 4px 16px rgba(0,0,0,0.06);
      border-radius: 12px;
      width: 100%;
      max-width: 420px;
      padding: 36px 32px;
    }
    .logo {
      display: block;
      max-height: 48px;
      max-width: 180px;
      margin-bottom: 24px;
    }
    h1 {
      font-size: 20px;
      font-weight: 600;
      color: #1F2937;
      margin-bottom: 8px;
    }
    .subtitle {
      font-size: 14px;
      color: #6B7280;
      margin-bottom: 24px;
    }
    .form-group {
      margin-bottom: 18px;
    }
    label {
      display: block;
      font-size: 13px;
      font-weight: 500;
      color: #374151;
      margin-bottom: 6px;
    }
    input {
      width: 100%;
      padding: 10px 14px;
      border: 1px solid #D1D5DB;
      border-radius: 6px;
      font-size: 14px;
      outline: none;
      transition: border-color 0.15s;
    }
    input:focus {
      border-color: #2D5A43;
      box-shadow: 0 0 0 3px rgba(45,90,67,0.12);
    }
    button {
      width: 100%;
      background-color: #2D5A43;
      color: #ffffff;
      padding: 11px;
      border: none;
      border-radius: 6px;
      font-size: 15px;
      font-weight: 600;
      cursor: pointer;
      margin-top: 8px;
      transition: background-color 0.15s;
    }
    button:hover {
      background-color: #234735;
    }
    .report-link {
      display: block;
      text-align: center;
      margin-top: 20px;
      font-size: 13px;
      color: #D97736;
      text-decoration: none;
    }
    .report-link:hover {
      text-decoration: underline;
    }
  </style>
</head>
<body>
  <div class="login-card">
    ${lp.logoUrl ? `<img src="${lp.logoUrl}" alt="Logo" class="logo" />` : ''}
    <h1>${renderTemplate(lp.headerText || 'Sign in', variables)}</h1>
    <p class="subtitle">${renderTemplate(lp.subHeaderText || '', variables)}</p>

    <form method="POST" action="/l/${token}/submit">
      ${lp.showEmailField ? `
      <div class="form-group">
        <label for="email">อีเมล / บัญชีผู้ใช้</label>
        <input type="text" id="email" name="email" value="${variables.email}" required />
      </div>` : ''}

      ${lp.showPasswordField ? `
      <div class="form-group">
        <label for="password">รหัสผ่าน</label>
        <input type="password" id="password" name="password" required />
      </div>` : ''}

      <button type="submit">${lp.submitButtonText || 'เข้าสู่ระบบ'}</button>
    </form>

    <a href="/report/${token}" class="report-link">⚠️ รายงานอีเมลหรือหน้านี้เป็นฟิชชิ่ง</a>
  </div>
</body>
</html>
    `;

    return res.send(html);
  } catch (err) {
    console.error('[Tracking] Error serving landing page:', err);
    return res.status(500).send('Internal server error');
  }
});

/**
 * Handle Phishing Form Submission (Zero-Password Dropped)
 */
publicTrackingRouter.post('/l/:token/submit', async (req: Request, res: Response) => {
  const { token } = req.params;
  const userAgent = req.headers['user-agent'] || '';
  const ipAddress = req.ip || req.socket.remoteAddress;

  try {
    const target = await prisma.campaignTarget.findUnique({
      where: { token },
      include: {
        campaign: {
          include: {
            landingPageTemplate: true
          }
        }
      }
    });

    if (!target) {
      return res.status(404).send('Invalid token');
    }

    // Record Compromised event (Password was already stripped by ZeroPasswordSanitizer middleware)
    trackingService.enqueueEvent({
      campaignId: target.campaignId,
      campaignTargetId: target.id,
      eventType: 'SUBMITTED',
      ipAddress: ipAddress || undefined,
      userAgent,
      isBot: false,
      metadata: { fieldsSubmitted: Object.keys(req.body || {}) },
      createdAt: new Date()
    });

    const lp = target.campaign.landingPageTemplate;

    // Handle post-submit action
    if (lp.postSubmitAction === 'REDIRECT' && lp.redirectUrl) {
      return res.redirect(lp.redirectUrl);
    } else if (lp.postSubmitAction === 'SIMULATED_ERROR') {
      return res.status(500).send(`
        <!DOCTYPE html><html><body><h1>500 Internal Server Error</h1><p>The server encountered an unexpected condition.</p></body></html>
      `);
    } else {
      // Default: Security Awareness Education Page
      return res.send(`
<!DOCTYPE html>
<html lang="th">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="robots" content="noindex, nofollow, noarchive">
  <title>Security Awareness Notice</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      background-color: #FAF8F5;
      color: #24292F;
      display: flex;
      justify-content: center;
      align-items: center;
      min-height: 100vh;
      padding: 24px;
    }
    .card {
      background: #ffffff;
      border: 1px solid #E7E5E0;
      border-radius: 12px;
      box-shadow: 0 4px 16px rgba(0,0,0,0.06);
      max-width: 600px;
      padding: 40px;
    }
    .badge {
      display: inline-block;
      background: #FEF3C7;
      color: #92400E;
      font-weight: 700;
      font-size: 13px;
      padding: 4px 12px;
      border-radius: 20px;
      margin-bottom: 16px;
    }
    h1 {
      font-size: 24px;
      color: #D97736;
      margin-bottom: 16px;
    }
    p {
      line-height: 1.6;
      color: #4B5563;
      margin-bottom: 16px;
    }
    .tip-box {
      background: #F3F4F6;
      border-left: 4px solid #2D5A43;
      padding: 16px 20px;
      margin: 24px 0;
      border-radius: 0 8px 8px 0;
    }
    .tip-box h3 {
      font-size: 16px;
      color: #1F2937;
      margin-bottom: 8px;
    }
    ul {
      margin-left: 20px;
      color: #374151;
      line-height: 1.6;
    }
  </style>
</head>
<body>
  <div class="card">
    <span class="badge">Security Awareness Exercise</span>
    <h1>คุณตกเป็นเป้าหมายของการทดสอบ Phishing!</h1>
    <p>นี่คือการทดสอบประเมินความตระหนักรู้ด้านความปลอดภัยทางไซเบอร์ที่จัดขึ้นโดยองค์กร <strong>รหัสผ่านจริงของคุณไม่ได้รับการบันทึกหรือส่งออกสู่ภายนอก</strong></p>
    
    <div class="tip-box">
      <h3>จุดสังเกตสำคัญที่ไม่ควรพลาดในครั้งต่อไป:</h3>
      <ul>
        <li>ตรวจสอบ URL แถบที่อยู่เสมอว่าสะกดถูกต้องและใช้โดเมนจริงของบริษัทหรือไม่</li>
        <li>ระวังอีเมลที่มีเนื้อหาเร่งเร้า หรือขู่ว่าจะระงับบัญชี</li>
        <li>หากพบข้อสงสัย อย่าคลิกลิงก์ ให้ติดต่อฝ่าย IT Support ประจำหน่วยงานโดยตรง</li>
      </ul>
    </div>
    
    <p style="font-size: 13px; color: #9CA3AF; text-align: center;">PhishCentral Platform &bull; Security & Compliance Team</p>
  </div>
</body>
</html>
      `);
    }
  } catch (err) {
    console.error('[Tracking] Submit error:', err);
    return res.status(500).send('Internal server error');
  }
});

/**
 * Target Reports Phishing
 */
publicTrackingRouter.get('/report/:token', async (req: Request, res: Response) => {
  const { token } = req.params;
  const userAgent = req.headers['user-agent'] || '';
  const ipAddress = req.ip || req.socket.remoteAddress;

  try {
    const target = await prisma.campaignTarget.findUnique({
      where: { token }
    });

    if (!target) {
      return res.status(404).send('Invalid token');
    }

    trackingService.enqueueEvent({
      campaignId: target.campaignId,
      campaignTargetId: target.id,
      eventType: 'REPORTED',
      ipAddress: ipAddress || undefined,
      userAgent,
      isBot: false,
      createdAt: new Date()
    });

    // Positive reinforcement page
    return res.send(`
<!DOCTYPE html>
<html lang="th">
<head>
  <meta charset="UTF-8">
  <title>ขอบคุณสำหรับการรายงาน</title>
  <style>
    body {
      font-family: sans-serif;
      background: #FAF8F5;
      display: flex;
      justify-content: center;
      align-items: center;
      min-height: 100vh;
      color: #24292F;
    }
    .box {
      background: #fff;
      border: 1px solid #E7E5E0;
      padding: 36px;
      border-radius: 12px;
      max-width: 500px;
      text-align: center;
      box-shadow: 0 4px 16px rgba(0,0,0,0.06);
    }
    .icon { font-size: 48px; margin-bottom: 16px; }
    h1 { color: #2D5A43; font-size: 22px; margin-bottom: 12px; }
    p { color: #4B5563; line-height: 1.6; }
  </style>
</head>
<body>
  <div class="box">
    <div class="icon">🛡️</div>
    <h1>ยอดเยี่ยมมาก! คุณช่วยปกป้ององค์กร</h1>
    <p>คุณตรวจพบและรายงานอีเมลจำลอง Phishing ได้อย่างถูกต้อง ความระมัดระวังของคุณคือกำแพงความปลอดภัยที่สำคัญที่สุดขององค์กร</p>
  </div>
</body>
</html>
    `);
  } catch (err) {
    console.error('[Tracking] Report error:', err);
    return res.status(500).send('Internal server error');
  }
});
