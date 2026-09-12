import { Router, Request, Response } from 'express';
import { prisma } from '../prisma.js';
import { renderTemplate } from '../services/templateService.js';
import nodemailer from 'nodemailer';

export const templatesRouter = Router();

// ================= EMAIL TEMPLATES =================

// GET all email templates
templatesRouter.get('/emails', async (_req: Request, res: Response) => {
  try {
    const templates = await prisma.emailTemplate.findMany({
      orderBy: [{ isPreset: 'desc' }, { createdAt: 'desc' }]
    });
    return res.json(templates);
  } catch (err) {
    return res.status(500).json({ error: 'Failed to fetch email templates' });
  }
});

// CREATE custom email template
templatesRouter.post('/emails', async (req: Request, res: Response) => {
  const { name, subject, bodyHtml, bodyText } = req.body;
  if (!name || !subject || !bodyHtml) {
    return res.status(400).json({ error: 'Name, subject, and bodyHtml are required' });
  }

  try {
    const template = await prisma.emailTemplate.create({
      data: { name, subject, bodyHtml, bodyText, isPreset: false }
    });
    return res.status(201).json(template);
  } catch (err) {
    return res.status(500).json({ error: 'Failed to create template' });
  }
});

// CLONE email template (1-Click Clone)
templatesRouter.post('/emails/:id/clone', async (req: Request, res: Response) => {
  const { id } = req.params;
  try {
    const source = await prisma.emailTemplate.findUnique({ where: { id } });
    if (!source) return res.status(404).json({ error: 'Source template not found' });

    const cloned = await prisma.emailTemplate.create({
      data: {
        name: `${source.name} (Customized)`,
        subject: source.subject,
        bodyHtml: source.bodyHtml,
        bodyText: source.bodyText,
        isPreset: false
      }
    });
    return res.status(201).json(cloned);
  } catch (err) {
    return res.status(500).json({ error: 'Failed to clone template' });
  }
});

// UPDATE email template
templatesRouter.put('/emails/:id', async (req: Request, res: Response) => {
  const { id } = req.params;
  const { name, subject, bodyHtml, bodyText } = req.body;

  try {
    const updated = await prisma.emailTemplate.update({
      where: { id },
      data: { name, subject, bodyHtml, bodyText }
    });
    return res.json(updated);
  } catch (err) {
    return res.status(500).json({ error: 'Failed to update email template' });
  }
});

// DELETE email template
templatesRouter.delete('/emails/:id', async (req: Request, res: Response) => {
  const { id } = req.params;
  try {
    await prisma.emailTemplate.delete({ where: { id } });
    return res.json({ success: true });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to delete template' });
  }
});

// TEST SEND email template
templatesRouter.post('/emails/test-send', async (req: Request, res: Response) => {
  const { smtpProfileId, recipientEmail, subject, bodyHtml } = req.body;

  if (!smtpProfileId || !recipientEmail || !subject || !bodyHtml) {
    return res.status(400).json({ error: 'Missing required parameters for test send' });
  }

  try {
    const smtp = await prisma.smtpProfile.findUnique({ where: { id: smtpProfileId } });
    if (!smtp) return res.status(404).json({ error: 'SMTP profile not found' });

    const transporter = nodemailer.createTransport({
      host: smtp.host,
      port: smtp.port,
      secure: smtp.secure,
      auth: smtp.username ? { user: smtp.username, pass: smtp.password || '' } : undefined
    });

    const renderedSubject = renderTemplate(subject, { name: 'Test User', phishing_url: 'https://example.com/test' });
    const renderedHtml = renderTemplate(bodyHtml, { name: 'Test User', phishing_url: 'https://example.com/test' });

    await transporter.sendMail({
      from: `"${smtp.fromName}" <${smtp.fromEmail}>`,
      to: recipientEmail,
      subject: `[TEST] ${renderedSubject}`,
      html: renderedHtml
    });

    return res.json({ success: true, message: `Test email sent to ${recipientEmail}` });
  } catch (err: any) {
    return res.status(500).json({ error: `SMTP Send Error: ${err.message}` });
  }
});

// ================= LANDING PAGE TEMPLATES =================

// GET all landing page templates
templatesRouter.get('/landing-pages', async (_req: Request, res: Response) => {
  try {
    const templates = await prisma.landingPageTemplate.findMany({
      orderBy: [{ isPreset: 'desc' }, { createdAt: 'desc' }]
    });
    return res.json(templates);
  } catch (err) {
    return res.status(500).json({ error: 'Failed to fetch landing page templates' });
  }
});

// CREATE custom landing page template
templatesRouter.post('/landing-pages', async (req: Request, res: Response) => {
  const {
    name, pageTitle, logoUrl, headerText, subHeaderText,
    submitButtonText, showEmpIdField, showEmailField,
    showPasswordField, postSubmitAction, redirectUrl, awarenessContent
  } = req.body;

  if (!name || !pageTitle) {
    return res.status(400).json({ error: 'Name and pageTitle are required' });
  }

  try {
    const template = await prisma.landingPageTemplate.create({
      data: {
        name, pageTitle, logoUrl, headerText, subHeaderText,
        submitButtonText: submitButtonText || 'Sign In',
        showEmpIdField: showEmpIdField ?? false,
        showEmailField: showEmailField ?? true,
        showPasswordField: showPasswordField ?? true,
        postSubmitAction: postSubmitAction || 'AWARENESS_PAGE',
        redirectUrl, awarenessContent,
        isPreset: false
      }
    });
    return res.status(201).json(template);
  } catch (err: any) {
    console.error('[Templates] Create landing page error:', err);
    return res.status(500).json({ error: `Failed to create landing page template: ${err.message}` });
  }
});

// CLONE landing page template
templatesRouter.post('/landing-pages/:id/clone', async (req: Request, res: Response) => {
  const { id } = req.params;
  try {
    const source = await prisma.landingPageTemplate.findUnique({ where: { id } });
    if (!source) return res.status(404).json({ error: 'Source template not found' });

    const cloned = await prisma.landingPageTemplate.create({
      data: {
        name: `${source.name} (Customized)`,
        pageTitle: source.pageTitle,
        logoUrl: source.logoUrl,
        headerText: source.headerText,
        subHeaderText: source.subHeaderText,
        submitButtonText: source.submitButtonText,
        showEmpIdField: source.showEmpIdField,
        showEmailField: source.showEmailField,
        showPasswordField: source.showPasswordField,
        postSubmitAction: source.postSubmitAction,
        redirectUrl: source.redirectUrl,
        awarenessContent: source.awarenessContent,
        isPreset: false
      }
    });
    return res.status(201).json(cloned);
  } catch (err: any) {
    console.error('[Templates] Clone landing page error:', err);
    return res.status(500).json({ error: `Failed to clone landing page: ${err.message}` });
  }
});

// UPDATE landing page template
templatesRouter.put('/landing-pages/:id', async (req: Request, res: Response) => {
  const { id } = req.params;
  const {
    name, pageTitle, logoUrl, headerText, subHeaderText,
    submitButtonText, showEmpIdField, showEmailField,
    showPasswordField, postSubmitAction, redirectUrl, awarenessContent
  } = req.body;

  try {
    const updated = await prisma.landingPageTemplate.update({
      where: { id },
      data: {
        name, pageTitle, logoUrl, headerText, subHeaderText,
        submitButtonText, showEmpIdField, showEmailField,
        showPasswordField, postSubmitAction, redirectUrl, awarenessContent
      }
    });
    return res.json(updated);
  } catch (err: any) {
    console.error('[Templates] Update landing page error:', err);
    return res.status(500).json({ error: `Failed to update landing page template: ${err.message}` });
  }
});

// DELETE landing page template
templatesRouter.delete('/landing-pages/:id', async (req: Request, res: Response) => {
  const { id } = req.params;
  try {
    await prisma.landingPageTemplate.delete({ where: { id } });
    return res.json({ success: true });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to delete landing page template' });
  }
});

