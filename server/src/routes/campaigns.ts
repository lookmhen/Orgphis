import { Router, Request, Response } from 'express';
import { prisma } from '../prisma.js';
import { generateTrackingToken } from '../utils/tokenAndBot.js';
import { dispatchService } from '../services/dispatchService.js';
import { resolveServerBaseUrl } from '../utils/network.js';

export const campaignsRouter = Router();

// GET all campaigns with telemetry aggregation
campaignsRouter.get('/', async (_req: Request, res: Response) => {
  try {
    const campaigns = await prisma.campaign.findMany({
      include: {
        targetGroup: { select: { name: true } },
        targetGroups: {
          include: {
            targetGroup: { select: { name: true } }
          }
        },
        emailTemplate: { select: { name: true, subject: true } },
        landingPageTemplate: { select: { name: true } },
        smtpProfile: { select: { name: true, fromEmail: true } },
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

        const statsObj = {
          total: totalTargets,
          sent,
          opened,
          clicked,
          submitted,
          reported,
          compromiseRate: parseFloat(compromiseRate),
          reportRate: parseFloat(reportRate)
        };

        // Determine friendly group names (supports single or multiple groups)
        let groupNames = c.targetGroups.map(tg => tg.targetGroup.name);
        if (groupNames.length === 0 && c.targetGroup?.name) {
          groupNames = [c.targetGroup.name];
        }

        return {
          ...c,
          targetGroupNames: groupNames,
          metrics: statsObj,
          stats: statsObj
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
        targetGroups: {
          include: { targetGroup: true }
        },
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

    let groupNames = campaign.targetGroups.map(tg => tg.targetGroup.name);
    if (groupNames.length === 0 && campaign.targetGroup?.name) {
      groupNames = [campaign.targetGroup.name];
    }

    return res.json({
      ...campaign,
      targetGroupNames: groupNames,
      departmentStats
    });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to fetch campaign details' });
  }
});

// CREATE campaign (Supports single targetGroupId or array of targetGroupIds)
campaignsRouter.post('/', async (req: Request, res: Response) => {
  const { name, description, targetGroupId, targetGroupIds, emailTemplateId, landingPageTemplateId, smtpProfileId } = req.body;

  // Accept targetGroupIds array or single targetGroupId
  const groupIds: string[] = Array.isArray(targetGroupIds) && targetGroupIds.length > 0
    ? targetGroupIds
    : targetGroupId
    ? [targetGroupId]
    : [];

  if (!name || groupIds.length === 0 || !emailTemplateId || !landingPageTemplateId || !smtpProfileId) {
    return res.status(400).json({ error: 'Missing required campaign setup fields (name, target groups, templates, or smtp profile)' });
  }

  try {
    // 1. Create campaign record
    const campaign = await prisma.campaign.create({
      data: {
        name,
        description,
        targetGroupId: groupIds[0], // fallback for backward compatibility
        emailTemplateId,
        landingPageTemplateId,
        smtpProfileId,
        status: 'DRAFT',
        targetGroups: {
          create: groupIds.map(gid => ({
            targetGroupId: gid
          }))
        }
      }
    });

    // 2. Fetch all targets across the selected target groups (deduplicated by target id and email)
    const targets = await prisma.target.findMany({
      where: {
        targetGroupId: { in: groupIds }
      }
    });

    // Deduplicate by target email in case a user is in multiple selected groups
    const uniqueTargetsMap = new Map<string, typeof targets[0]>();
    for (const t of targets) {
      if (!uniqueTargetsMap.has(t.email.toLowerCase())) {
        uniqueTargetsMap.set(t.email.toLowerCase(), t);
      }
    }
    const uniqueTargets = Array.from(uniqueTargetsMap.values());

    if (uniqueTargets.length > 0) {
      await prisma.campaignTarget.createMany({
        data: uniqueTargets.map((t) => ({
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
  const baseUrl = resolveServerBaseUrl(req.body?.baseUrl, req.get('host'), req.protocol);

  try {
    console.log(`[Campaigns] Launching campaign ${id} with Phishing Base URL: ${baseUrl}`);
    await dispatchService.launchCampaign({ campaignId: id, baseUrl });
    return res.json({ success: true, message: `Campaign launched. Phishing links point to ${baseUrl}`, baseUrl });
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

// RESET SINGLE CAMPAIGN (Reset stats back to 0 & DRAFT)
campaignsRouter.post('/:id/reset', async (req: Request, res: Response) => {
  const { id } = req.params;

  try {
    // If currently running, stop queue first
    dispatchService.killCampaign(id);

    await prisma.$transaction([
      // 1. Delete all event logs associated with this campaign
      prisma.eventLog.deleteMany({ where: { campaignId: id } }),
      // 2. Reset campaign targets stats
      prisma.campaignTarget.updateMany({
        where: { campaignId: id },
        data: {
          dispatchStatus: 'PENDING',
          sendAttempts: 0,
          lastError: null,
          isSent: false,
          isOpened: false,
          isClicked: false,
          isSubmitted: false,
          isReported: false,
          sentAt: null,
          openedAt: null,
          clickedAt: null,
          submittedAt: null,
          reportedAt: null
        }
      }),
      // 3. Reset campaign status
      prisma.campaign.update({
        where: { id },
        data: {
          status: 'DRAFT',
          startedAt: null,
          endedAt: null
        }
      })
    ]);

    return res.json({ success: true, message: 'Campaign stats reset successfully.' });
  } catch (err: any) {
    console.error('[Campaigns] Reset error:', err);
    return res.status(500).json({ error: 'Failed to reset campaign' });
  }
});

// DELETE SINGLE CAMPAIGN
campaignsRouter.delete('/:id', async (req: Request, res: Response) => {
  const { id } = req.params;

  try {
    dispatchService.killCampaign(id);

    await prisma.$transaction([
      prisma.eventLog.deleteMany({ where: { campaignId: id } }),
      prisma.campaignTarget.deleteMany({ where: { campaignId: id } }),
      prisma.campaign.delete({ where: { id } })
    ]);

    return res.json({ success: true, message: 'Campaign deleted successfully.' });
  } catch (err: any) {
    console.error('[Campaigns] Delete error:', err);
    return res.status(500).json({ error: 'Failed to delete campaign' });
  }
});

// RESET ALL CAMPAIGNS & TEST HISTORY (Clean slate for production, keeps Targets, Templates, SMTP)
campaignsRouter.post('/reset-all', async (_req: Request, res: Response) => {
  try {
    await prisma.$transaction([
      prisma.eventLog.deleteMany({}),
      prisma.campaignTarget.deleteMany({}),
      prisma.campaign.deleteMany({})
    ]);

    return res.json({
      success: true,
      message: 'All campaign history and test logs have been completely cleared. Ready for production.'
    });
  } catch (err: any) {
    console.error('[Campaigns] Reset all error:', err);
    return res.status(500).json({ error: 'Failed to reset all campaign history' });
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
    res.write('\ufeffEmail,Name,Department,Status,SentAt,OpenedAt,ClickedAt,SubmittedAt,ReportedAt\n');

    for (const ct of campaign.campaignTargets) {
      const name = `"${(`${ct.target.firstName || ''} ${ct.target.lastName || ''}`).trim()}"`;
      const email = `"${ct.target.email}"`;
      const dept = `"${ct.target.department || ''}"`;
      const status = ct.isSubmitted ? 'COMPROMISED' : ct.isReported ? 'REPORTED' : ct.isClicked ? 'CLICKED' : ct.isOpened ? 'OPENED' : ct.isSent ? 'SENT' : 'PENDING';
      const sent = ct.sentAt ? `"${ct.sentAt.toISOString()}"` : '""';
      const opened = ct.openedAt ? `"${ct.openedAt.toISOString()}"` : '""';
      const clicked = ct.clickedAt ? `"${ct.clickedAt.toISOString()}"` : '""';
      const submitted = ct.submittedAt ? `"${ct.submittedAt.toISOString()}"` : '""';
      const reported = ct.reportedAt ? `"${ct.reportedAt.toISOString()}"` : '""';

      res.write(`${email},${name},${dept},${status},${sent},${opened},${clicked},${submitted},${reported}\n`);
    }

    res.end();
  } catch (err) {
    return res.status(500).send('Export failed');
  }
});
