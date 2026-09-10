import { Router, Request, Response } from 'express';
import { prisma } from '../prisma.js';
import { generateTrackingToken } from '../utils/tokenAndBot.js';
import { dispatchService } from '../services/dispatchService.js';

export const campaignsRouter = Router();

// GET all campaigns with telemetry aggregation
campaignsRouter.get('/', async (_req: Request, res: Response) => {
  try {
    const campaigns = await prisma.campaign.findMany({
      include: {
        targetGroup: { select: { name: true } },
        emailTemplate: { select: { name: true, subject: true } },
        landingPageTemplate: { select: { name: true } },
        _count: {
          select: { campaignTargets: true }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    // Compute quick metrics for each campaign
    const enriched = await Promise.all(
      campaigns.map(async (c) => {
        const stats = await prisma.campaignTarget.groupBy({
          by: ['isSent', 'isOpened', 'isClicked', 'isSubmitted', 'isReported'],
          where: { campaignId: c.id },
          _count: { _all: true }
        });

        let sent = 0;
        let opened = 0;
        let clicked = 0;
        let submitted = 0;
        let reported = 0;

        for (const s of stats) {
          const count = s._count._all;
          if (s.isSent) sent += count;
          if (s.isOpened) opened += count;
          if (s.isClicked) clicked += count;
          if (s.isSubmitted) submitted += count;
          if (s.isReported) reported += count;
        }

        const totalTargets = c._count.campaignTargets;
        const compromiseRate = sent > 0 ? ((submitted / sent) * 100).toFixed(1) : '0';
        const reportRate = sent > 0 ? ((reported / sent) * 100).toFixed(1) : '0';

        return {
          ...c,
          metrics: {
            total: totalTargets,
            sent,
            opened,
            clicked,
            submitted,
            reported,
            compromiseRate: parseFloat(compromiseRate),
            reportRate: parseFloat(reportRate)
          }
        };
      })
    );

    return res.json(enriched);
  } catch (err) {
    console.error('[Campaigns] Error listing:', err);
    return res.status(500).json({ error: 'Failed to fetch campaigns' });
  }
});

// GET single campaign details with full telemetry
campaignsRouter.get('/:id', async (req: Request, res: Response) => {
  const { id } = req.params;
  try {
    const campaign = await prisma.campaign.findUnique({
      where: { id },
      include: {
        targetGroup: true,
        emailTemplate: true,
        landingPageTemplate: true,
        smtpProfile: true,
        campaignTargets: {
          include: { target: true }
        },
        events: {
          orderBy: { createdAt: 'desc' },
          take: 50
        }
      }
    });

    if (!campaign) return res.status(404).json({ error: 'Campaign not found' });

    // Department breakdown
    const departmentStats: Record<string, { sent: number; compromised: number; reported: number }> = {};
    for (const ct of campaign.campaignTargets) {
      const dept = ct.target.department || 'Unknown';
      if (!departmentStats[dept]) {
        departmentStats[dept] = { sent: 0, compromised: 0, reported: 0 };
      }
      if (ct.isSent) departmentStats[dept].sent++;
      if (ct.isSubmitted) departmentStats[dept].compromised++;
      if (ct.isReported) departmentStats[dept].reported++;
    }

    return res.json({
      ...campaign,
      departmentStats
    });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to fetch campaign details' });
  }
});

// CREATE campaign
campaignsRouter.post('/', async (req: Request, res: Response) => {
  const { name, description, targetGroupId, emailTemplateId, landingPageTemplateId, smtpProfileId } = req.body;

  if (!name || !targetGroupId || !emailTemplateId || !landingPageTemplateId || !smtpProfileId) {
    return res.status(400).json({ error: 'Missing required campaign setup fields' });
  }

  try {
    // 1. Create campaign record
    const campaign = await prisma.campaign.create({
      data: {
        name,
        description,
        targetGroupId,
        emailTemplateId,
        landingPageTemplateId,
        smtpProfileId,
        status: 'DRAFT'
      }
    });

    // 2. Map targets from target group and generate unique NanoId tokens
    const targets = await prisma.target.findMany({
      where: { targetGroupId }
    });

    if (targets.length > 0) {
      await prisma.campaignTarget.createMany({
        data: targets.map((t) => ({
          campaignId: campaign.id,
          targetId: t.id,
          token: generateTrackingToken(),
          dispatchStatus: 'PENDING'
        }))
      });
    }

    return res.status(201).json(campaign);
  } catch (err) {
    console.error('[Campaigns] Create error:', err);
    return res.status(500).json({ error: 'Failed to create campaign' });
  }
});

// LAUNCH campaign
campaignsRouter.post('/:id/launch', async (req: Request, res: Response) => {
  const { id } = req.params;
  const baseUrl = process.env.BASE_URL || `${req.protocol}://${req.get('host')}`;

  try {
    await dispatchService.launchCampaign({ campaignId: id, baseUrl });
    return res.json({ success: true, message: 'Campaign launched and email queue active.' });
  } catch (err: any) {
    return res.status(500).json({ error: `Launch failed: ${err.message}` });
  }
});

// EMERGENCY KILL SWITCH
campaignsRouter.post('/:id/kill', async (req: Request, res: Response) => {
  const { id } = req.params;

  try {
    dispatchService.killCampaign(id);
    await prisma.campaign.update({
      where: { id },
      data: { status: 'CANCELLED', endedAt: new Date() }
    });
    return res.json({ success: true, message: 'Emergency kill switch triggered. Campaign stopped.' });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to stop campaign' });
  }
});

// STREAMING EXPORT CSV
campaignsRouter.get('/:id/export', async (req: Request, res: Response) => {
  const { id } = req.params;

  try {
    const campaign = await prisma.campaign.findUnique({
      where: { id },
      include: {
        campaignTargets: {
          include: { target: true }
        }
      }
    });

    if (!campaign) return res.status(404).send('Campaign not found');

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="campaign-${id}-report.csv"`);

    // UTF-8 BOM for Excel compatibility
    res.write('\ufeffEmail,Name,Department,EmployeeID,Status,SentAt,OpenedAt,ClickedAt,SubmittedAt,ReportedAt\n');

    for (const ct of campaign.campaignTargets) {
      const name = `"${(`${ct.target.firstName || ''} ${ct.target.lastName || ''}`).trim()}"`;
      const email = `"${ct.target.email}"`;
      const dept = `"${ct.target.department || ''}"`;
      const empId = `"${ct.target.employeeId || ''}"`;
      const status = ct.isSubmitted ? 'COMPROMISED' : ct.isReported ? 'REPORTED' : ct.isClicked ? 'CLICKED' : ct.isOpened ? 'OPENED' : ct.isSent ? 'SENT' : 'PENDING';
      const sent = ct.sentAt ? `"${ct.sentAt.toISOString()}"` : '""';
      const opened = ct.openedAt ? `"${ct.openedAt.toISOString()}"` : '""';
      const clicked = ct.clickedAt ? `"${ct.clickedAt.toISOString()}"` : '""';
      const submitted = ct.submittedAt ? `"${ct.submittedAt.toISOString()}"` : '""';
      const reported = ct.reportedAt ? `"${ct.reportedAt.toISOString()}"` : '""';

      res.write(`${email},${name},${dept},${empId},${status},${sent},${opened},${clicked},${submitted},${reported}\n`);
    }

    res.end();
  } catch (err) {
    return res.status(500).send('Export failed');
  }
});
