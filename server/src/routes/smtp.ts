import { Router, Request, Response } from 'express';
import { prisma } from '../prisma.js';
import nodemailer from 'nodemailer';

export const smtpRouter = Router();

// GET all SMTP profiles
smtpRouter.get('/', async (_req: Request, res: Response) => {
  try {
    const profiles = await prisma.smtpProfile.findMany({
      orderBy: { createdAt: 'desc' }
    });
    return res.json(profiles);
  } catch (err) {
    return res.status(500).json({ error: 'Failed to fetch SMTP profiles' });
  }
});

// CREATE SMTP profile
smtpRouter.post('/', async (req: Request, res: Response) => {
  const { name, host, port, secure, username, password, fromName, fromEmail, rateLimit, delaySeconds } = req.body;

  if (!name || !host || !port || !fromName || !fromEmail) {
    return res.status(400).json({ error: 'Missing required SMTP configuration fields' });
  }

  try {
    const profile = await prisma.smtpProfile.create({
      data: {
        name,
        host,
        port: parseInt(port.toString()),
        secure: secure ?? false,
        username,
        password,
        fromName,
        fromEmail,
        rateLimit: rateLimit ? parseInt(rateLimit.toString()) : 5,
        delaySeconds: delaySeconds ? parseInt(delaySeconds.toString()) : 2
      }
    });
    return res.status(201).json(profile);
  } catch (err) {
    return res.status(500).json({ error: 'Failed to create SMTP profile' });
  }
});

// UPDATE SMTP profile
smtpRouter.put('/:id', async (req: Request, res: Response) => {
  const { id } = req.params;
  const { name, host, port, secure, username, password, fromName, fromEmail, rateLimit, delaySeconds } = req.body;

  try {
    const updated = await prisma.smtpProfile.update({
      where: { id },
      data: {
        name,
        host,
        port: parseInt(port.toString()),
        secure: secure ?? false,
        username,
        password,
        fromName,
        fromEmail,
        rateLimit: rateLimit ? parseInt(rateLimit.toString()) : 5,
        delaySeconds: delaySeconds ? parseInt(delaySeconds.toString()) : 2
      }
    });
    return res.json(updated);
  } catch (err) {
    return res.status(500).json({ error: 'Failed to update SMTP profile' });
  }
});

// DELETE SMTP profile
smtpRouter.delete('/:id', async (req: Request, res: Response) => {
  const { id } = req.params;
  try {
    await prisma.smtpProfile.delete({ where: { id } });
    return res.json({ success: true });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to delete SMTP profile' });
  }
});

// TEST SMTP Handshake
smtpRouter.post('/:id/test', async (req: Request, res: Response) => {
  const { id } = req.params;

  try {
    const smtp = await prisma.smtpProfile.findUnique({ where: { id } });
    if (!smtp) return res.status(404).json({ error: 'SMTP profile not found' });

    const isPort587 = Number(smtp.port) === 587;
    const transporter = nodemailer.createTransport({
      host: smtp.host.trim(),
      port: Number(smtp.port),
      secure: smtp.secure ?? false,
      requireTLS: isPort587,
      auth: smtp.username ? { user: smtp.username.trim(), pass: (smtp.password || '').trim() } : undefined,
      connectionTimeout: 10000,
      tls: {
        ciphers: 'SSLv3',
        rejectUnauthorized: false
      }
    });

    await transporter.verify();
    return res.json({ success: true, message: 'SMTP handshake connection verified successfully!' });
  } catch (err: any) {
    return res.status(500).json({ error: `SMTP verification failed: ${err.message}` });
  }
});
