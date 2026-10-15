import { Router, Request, Response } from 'express';
import { prisma } from '../prisma.js';
import { generateTrackingToken } from '../utils/tokenAndBot.js';
import { dispatchService } from '../services/dispatchService.js';
import { resolveServerBaseUrl } from '../utils/network.js';
import { generateRandomizedSchedule, generateDepartmentAwareSchedule } from '../utils/scheduler.js';
import { syncTelemetryData } from '../services/reconciliationService.js';

export const campaignsRouter = Router();
campaignsRouter.get('/', async (_req: Request, res: Response) => {
  try {
    // Reconcile telemetry to ensure all submissions and events are accurately reflected
    await syncTelemetryData();

    const campaigns = await prisma.campaign.findMany({
      include: {
        targetGroup: { select: { name: true } },
        targetGroups: {
          include: {
            targetGroup: { select: { name: true } }
          }
        },
        emailTemplate: { select: { id: true, name: true, subject: true } },
        campaignEmailTemplates: {
          include: {
            emailTemplate: { select: { id: true, name: true, subject: true } }
          }
        },
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
          by: ['isSent', 'isClicked', 'isSubmitted', 'isReported'],
          where: { campaignId: c.id },
          _count: { _all: true }
        });

        let sent = 0;
        let clicked = 0;
        let submitted = 0;
        let reported = 0;

        for (const s of stats) {
          const count = s._count._all;
          if (s.isSent) sent += count;
          if (s.isClicked) clicked += count;
          if (s.isSubmitted) submitted += count;
          if (s.isReported) reported += count;
        }

        // Defensive verification: ensure count is never less than targets with confirmed SUBMITTED events
        const verifiedSubmitted = await prisma.campaignTarget.count({
          where: {
            campaignId: c.id,
            OR: [
              { isSubmitted: true },
              { events: { some: { eventType: 'SUBMITTED', isBot: false } } }
            ]
          }
        });
        submitted = Math.max(submitted, verifiedSubmitted);
        clicked = Math.max(clicked, submitted);

        const totalTargets = c._count.campaignTargets;
        const compromiseRate = sent > 0 ? ((submitted / sent) * 100).toFixed(1) : '0';
        const reportRate = sent > 0 ? ((reported / sent) * 100).toFixed(1) : '0';

        const statsObj = {
          total: totalTargets,
          sent,
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
        campaignEmailTemplates: {
          include: { emailTemplate: true }
        },
        landingPageTemplate: true,
        smtpProfile: true,
        campaignTargets: {
          include: {
            target: true,
            emailTemplate: true,
            events: {
              where: { isBot: false },
              select: { eventType: true, createdAt: true }
            }
          }
        },
        events: {
          orderBy: { createdAt: 'desc' },
          take: 50
        }
      }
    });

    if (!campaign) return res.status(404).json({ error: 'Campaign not found' });

    // Reconcile and enrich campaign targets with verified event telemetry
    const enrichedTargets = campaign.campaignTargets.map(ct => {
      const subEv = ct.events?.find(e => e.eventType === 'SUBMITTED');
      const isSub = ct.isSubmitted || Boolean(subEv);
      const subAt = ct.submittedAt || subEv?.createdAt || null;

      const clkEv = ct.events?.find(e => e.eventType === 'CLICKED');
      const isClk = ct.isClicked || Boolean(clkEv) || isSub;
      const clkAt = ct.clickedAt || clkEv?.createdAt || (isSub ? subAt : null);

      const repEv = ct.events?.find(e => e.eventType === 'REPORTED');
      const isRep = ct.isReported || Boolean(repEv);
      const repAt = ct.reportedAt || repEv?.createdAt || null;

      return {
        ...ct,
        isSubmitted: isSub,
        submittedAt: subAt,
        isClicked: isClk,
        clickedAt: clkAt,
        isReported: isRep,
        reportedAt: repAt
      };
    });

    // Department breakdown
    const departmentStats: Record<string, { sent: number; compromised: number; reported: number }> = {};
    for (const ct of enrichedTargets) {
      const dept = ct.target.department || 'Unknown';
      if (!departmentStats[dept]) {
        departmentStats[dept] = { sent: 0, compromised: 0, reported: 0 };
      }
      if (ct.isSent) departmentStats[dept].sent++;
      if (ct.isSubmitted) departmentStats[dept].compromised++;
      if (ct.isReported) departmentStats[dept].reported++;
    }

    // Per-template breakdown (Multi-vector template analytics)
    const templateStatsMap: Record<string, { id: string; name: string; subject: string; sent: number; clicked: number; compromised: number; reported: number }> = {};
    for (const ct of enrichedTargets) {
      const tmpl = ct.emailTemplate || campaign.emailTemplate;
      const tid = tmpl.id;
      if (!templateStatsMap[tid]) {
        templateStatsMap[tid] = {
          id: tmpl.id,
          name: tmpl.name,
          subject: tmpl.subject,
          sent: 0,
          clicked: 0,
          compromised: 0,
          reported: 0
        };
      }
      if (ct.isSent) templateStatsMap[tid].sent++;
      if (ct.isClicked) templateStatsMap[tid].clicked++;
      if (ct.isSubmitted) templateStatsMap[tid].compromised++;
      if (ct.isReported) templateStatsMap[tid].reported++;
    }

    let groupNames = campaign.targetGroups.map(tg => tg.targetGroup.name);
    if (groupNames.length === 0 && campaign.targetGroup?.name) {
      groupNames = [campaign.targetGroup.name];
    }

    const assignedTemplates = campaign.campaignEmailTemplates?.map(cet => cet.emailTemplate) || [campaign.emailTemplate];

    return res.json({
      ...campaign,
      campaignTargets: enrichedTargets,
      targetGroupNames: groupNames,
      departmentStats,
      templateStats: Object.values(templateStatsMap),
      assignedTemplates
    });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to fetch campaign details' });
  }
});

// CREATE campaign (Supports single targetGroupId or array of targetGroupIds + Multi-Template Randomization + Scheduling)
campaignsRouter.post('/', async (req: Request, res: Response) => {
  const {
    name,
    description,
    targetGroupId,
    targetGroupIds,
    emailTemplateId,
    emailTemplateIds,
    landingPageTemplateId,
    smtpProfileId,
    scheduleType = 'IMMEDIATE',
    startDate,
    endDate,
    allowedDays = '1,2,3,4,5',
    dailyStartTime = '08:30',
    dailyEndTime = '17:00',
    randomizeSendTimes = true,
    timezoneOffset
  } = req.body;

  // Accept targetGroupIds array or single targetGroupId
  const groupIds: string[] = Array.isArray(targetGroupIds) && targetGroupIds.length > 0
    ? targetGroupIds
    : targetGroupId
    ? [targetGroupId]
    : [];

  // Accept emailTemplateIds array or single emailTemplateId
  const templateIds: string[] = Array.isArray(emailTemplateIds) && emailTemplateIds.length > 0
    ? emailTemplateIds
    : emailTemplateId
    ? [emailTemplateId]
    : [];

  if (!name || groupIds.length === 0 || templateIds.length === 0 || !landingPageTemplateId || !smtpProfileId) {
    return res.status(400).json({ error: 'Missing required campaign setup fields (name, target groups, templates, or smtp profile)' });
  }

  try {
    const isRandomized = scheduleType === 'RANDOMIZED';
    const parsedStartDate = startDate ? new Date(startDate) : new Date();
    const parsedEndDate = endDate ? new Date(endDate) : new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    // 1. Create campaign record
    const campaign = await prisma.campaign.create({
      data: {
        name,
        description,
        targetGroupId: groupIds[0], // fallback for backward compatibility
        emailTemplateId: templateIds[0], // primary / fallback
        landingPageTemplateId,
        smtpProfileId,
        status: isRandomized ? 'SCHEDULED' : 'DRAFT',
        scheduleType,
        startDate: isRandomized ? parsedStartDate : null,
        endDate: isRandomized ? parsedEndDate : null,
        allowedDays: isRandomized ? String(allowedDays) : null,
        dailyStartTime: isRandomized ? dailyStartTime : null,
        dailyEndTime: isRandomized ? dailyEndTime : null,
        randomizeSendTimes: Boolean(randomizeSendTimes),
        targetGroups: {
          create: groupIds.map(gid => ({
            targetGroupId: gid
          }))
        },
        campaignEmailTemplates: {
          create: templateIds.map(tid => ({
            emailTemplateId: tid
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

    // 3. Pre-calculate randomized scheduled send dates if configured
    // 3. Pre-calculate randomized scheduled send dates if configured (Department-Aware Day Separation)
    let scheduleMap = new Map<string, Date>();
    if (isRandomized && uniqueTargets.length > 0) {
      const parsedDays = String(allowedDays).split(',').map(d => parseInt(d.trim(), 10)).filter(Boolean);
      scheduleMap = generateDepartmentAwareSchedule(uniqueTargets, {
        startDate: startDate || parsedStartDate,
        endDate: endDate || parsedEndDate,
        allowedDays: parsedDays.length > 0 ? parsedDays : [1, 2, 3, 4, 5],
        dailyStartTime,
        dailyEndTime,
        randomizeSendTimes: Boolean(randomizeSendTimes),
        timezoneOffset: typeof timezoneOffset === 'number' ? timezoneOffset : undefined
      });
    }

    if (uniqueTargets.length > 0) {
      // If multiple templates selected, shuffle targets so distribution is randomly and evenly balanced
      const shuffledTargets = templateIds.length > 1
        ? [...uniqueTargets].sort(() => Math.random() - 0.5)
        : uniqueTargets;
      const numTemplates = templateIds.length;

      await prisma.campaignTarget.createMany({
        data: shuffledTargets.map((t, idx) => ({
          campaignId: campaign.id,
          targetId: t.id,
          emailTemplateId: templateIds[idx % numTemplates],
          token: generateTrackingToken(),
          dispatchStatus: 'PENDING',
          scheduledAt: isRandomized && scheduleMap.get(t.id) ? scheduleMap.get(t.id)! : null
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

// PAUSE campaign
campaignsRouter.post('/:id/pause', async (req: Request, res: Response) => {
  const { id } = req.params;

  try {
    await dispatchService.pauseCampaign(id);
    return res.json({ success: true, message: 'พักการส่งแคมเปญชั่วคราวเรียบร้อยแล้ว' });
  } catch (err: any) {
    console.error(`[Campaigns] Pause error:`, err);
    return res.status(500).json({ error: `พักแคมเปญไม่สำเร็จ: ${err.message}` });
  }
});

// RESUME campaign
campaignsRouter.post('/:id/resume', async (req: Request, res: Response) => {
  const { id } = req.params;
  const baseUrl = resolveServerBaseUrl(req.body?.baseUrl, req.get('host'), req.protocol);

  try {
    console.log(`[Campaigns] Resuming campaign ${id} with Phishing Base URL: ${baseUrl}`);
    await dispatchService.resumeCampaign({ campaignId: id, baseUrl });
    return res.json({ success: true, message: `รันแคมเปญต่อเรียบร้อยแล้ว`, baseUrl });
  } catch (err: any) {
    console.error(`[Campaigns] Resume error:`, err);
    return res.status(500).json({ error: `รันแคมเปญต่อไม่สำเร็จ: ${err.message}` });
  }
});

// EMERGENCY KILL SWITCH
campaignsRouter.post('/:id/kill', async (req: Request, res: Response) => {
  const { id } = req.params;

  try {
    await dispatchService.killCampaign(id);
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
      prisma.campaignEmailTemplate.deleteMany({ where: { campaignId: id } }),
      prisma.campaignTargetGroup.deleteMany({ where: { campaignId: id } }),
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
      prisma.campaignEmailTemplate.deleteMany({}),
      prisma.campaignTargetGroup.deleteMany({}),
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

// MANUAL REPORT (Phone / Verbal / Walk-in / Helpdesk report by employee)
campaignsRouter.post('/:campaignId/targets/:targetId/manual-report', async (req: Request, res: Response) => {
  const { campaignId, targetId } = req.params;
  const { channel = 'PHONE', note = '' } = req.body;
  const adminUsername = (req as any).user?.username || (req as any).user?.displayName || 'admin';

  try {
    // Locate the campaign target by targetId (either CampaignTarget.id or Target.id)
    const ct = await prisma.campaignTarget.findFirst({
      where: {
        campaignId,
        OR: [
          { id: targetId },
          { targetId: targetId }
        ]
      },
      include: { target: true, emailTemplate: true }
    });

    if (!ct) {
      return res.status(404).json({ error: 'ไม่พบข้อมูลเป้าหมายในแคมเปญนี้' });
    }

    const reportTimestamp = new Date();

    // Update campaign target status
    const updated = await prisma.campaignTarget.update({
      where: { id: ct.id },
      data: {
        isReported: true,
        reportedAt: ct.reportedAt || reportTimestamp,
        isOpened: true,
        openedAt: ct.openedAt || reportTimestamp
      },
      include: { target: true, emailTemplate: true }
    });

    // Record EventLog for audit and analytics
    await prisma.eventLog.create({
      data: {
        campaignId,
        campaignTargetId: ct.id,
        eventType: 'REPORTED',
        isBot: false,
        metadata: JSON.stringify({
          source: 'MANUAL',
          channel, // 'PHONE' | 'VERBAL' | 'CHAT' | 'OTHER'
          note: (note || '').trim() || 'แจ้งเตือนด้วยตนเอง (โทรแจ้ง / ปากเปล่า)',
          reportedByAdmin: adminUsername,
          recordedAt: reportTimestamp.toISOString()
        }),
        createdAt: reportTimestamp
      }
    });

    return res.json({
      success: true,
      message: `บันทึกการแจ้งเบาะแสของ ${updated.target.firstName || ''} ${updated.target.lastName || ''} (${updated.target.email}) เรียบร้อยแล้ว`,
      campaignTarget: updated
    });
  } catch (err: any) {
    console.error('[Campaigns] Manual report error:', err);
    return res.status(500).json({ error: 'เกิดข้อผิดพลาดในการบันทึกการแจ้งเบาะแส' });
  }
});

// CANCEL / UNDO MANUAL REPORT
campaignsRouter.post('/:campaignId/targets/:targetId/manual-report/cancel', async (req: Request, res: Response) => {
  const { campaignId, targetId } = req.params;

  try {
    const ct = await prisma.campaignTarget.findFirst({
      where: {
        campaignId,
        OR: [
          { id: targetId },
          { targetId: targetId }
        ]
      },
      include: { target: true, emailTemplate: true }
    });

    if (!ct) {
      return res.status(404).json({ error: 'ไม่พบข้อมูลเป้าหมายในแคมเปญนี้' });
    }

    // Revert reported status
    const updated = await prisma.campaignTarget.update({
      where: { id: ct.id },
      data: {
        isReported: false,
        reportedAt: null
      },
      include: { target: true, emailTemplate: true }
    });

    // Clean up or remove MANUAL report event log
    await prisma.eventLog.deleteMany({
      where: {
        campaignId,
        campaignTargetId: ct.id,
        eventType: 'REPORTED'
      }
    });

    return res.json({
      success: true,
      message: 'ยกเลิกการบันทึกแจ้งเบาะแสเรียบร้อยแล้ว',
      campaignTarget: updated
    });
  } catch (err: any) {
    console.error('[Campaigns] Cancel manual report error:', err);
    return res.status(500).json({ error: 'เกิดข้อผิดพลาดในการยกเลิกการบันทึกแจ้งเบาะแส' });
  }
});

// STREAMING EXPORT CSV
campaignsRouter.get('/:id/export', async (req: Request, res: Response) => {
  const { id } = req.params;

  try {
    // Reconcile telemetry to ensure all submissions and events are accurately reflected
    await syncTelemetryData();

    const campaign = await prisma.campaign.findUnique({
      where: { id },
      include: {
        emailTemplate: true,
        campaignTargets: {
          include: {
            target: true,
            emailTemplate: true,
            events: {
              where: { isBot: false },
              select: { eventType: true, createdAt: true }
            }
          }
        }
      }
    });

    if (!campaign) return res.status(404).send('Campaign not found');

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="campaign-${id}-report.csv"`);

    // UTF-8 BOM for Excel compatibility
    res.write('\ufeffEmail,Name,Department,Template,Status,ScheduledAt,SentAt,ClickedAt,SubmittedAt,ReportedAt\n');

    let totalSent = 0;
    let totalClicked = 0;
    let totalSubmitted = 0;
    let totalReported = 0;

    const escapeCsv = (val: any): string => {
      if (val === null || val === undefined) return '""';
      const str = String(val).replace(/"/g, '""');
      return `"${str}"`;
    };

    for (const ct of campaign.campaignTargets) {
      const subEv = ct.events?.find((e: any) => e.eventType === 'SUBMITTED');
      const isSub = ct.isSubmitted || Boolean(subEv);
      const submittedAt = ct.submittedAt || subEv?.createdAt || null;

      const clkEv = ct.events?.find((e: any) => e.eventType === 'CLICKED');
      const isClk = ct.isClicked || Boolean(clkEv) || isSub;
      const clickedAt = ct.clickedAt || clkEv?.createdAt || (isSub ? submittedAt : null);

      const repEv = ct.events?.find((e: any) => e.eventType === 'REPORTED');
      const isRep = ct.isReported || Boolean(repEv);
      const reportedAt = ct.reportedAt || repEv?.createdAt || null;

      if (ct.isSent) totalSent++;
      if (isClk) totalClicked++;
      if (isSub) totalSubmitted++;
      if (isRep) totalReported++;

      const name = escapeCsv((`${ct.target.firstName || ''} ${ct.target.lastName || ''}`).trim());
      const email = escapeCsv(ct.target.email);
      const dept = escapeCsv(ct.target.department || '');
      const tmplName = escapeCsv(ct.emailTemplate?.name || campaign.emailTemplate?.name || 'General');
      const status = escapeCsv(isSub ? 'COMPROMISED' : isRep ? 'REPORTED' : isClk ? 'CLICKED' : ct.isSent ? 'SENT' : 'PENDING');
      const scheduled = escapeCsv(ct.scheduledAt ? ct.scheduledAt.toISOString() : '');
      const sent = escapeCsv(ct.sentAt ? ct.sentAt.toISOString() : '');
      const clicked = escapeCsv(clickedAt ? clickedAt.toISOString() : '');
      const submitted = escapeCsv(submittedAt ? submittedAt.toISOString() : '');
      const reported = escapeCsv(reportedAt ? reportedAt.toISOString() : '');

      res.write(`${email},${name},${dept},${tmplName},${status},${scheduled},${sent},${clicked},${submitted},${reported}\n`);
    }

    // Append Campaign Summary section at bottom of CSV for Excel overview
    const compRate = totalSent > 0 ? ((totalSubmitted / totalSent) * 100).toFixed(1) : '0.0';
    const repRate = totalSent > 0 ? ((totalReported / totalSent) * 100).toFixed(1) : '0.0';

    res.write('\n');
    res.write('"=== สรุปผลลัพธ์แคมเปญ (CAMPAIGN SUMMARY) ===","","","","","","","","",""\n');
    res.write(`"เป้าหมายทั้งหมด (Total Targets)",${campaign.campaignTargets.length},"","","","","","","",""\n`);
    res.write(`"ส่งแล้ว (Total Sent)",${totalSent},"","","","","","","",""\n`);
    res.write(`"คลิกลิงก์ (Total Clicked)",${totalClicked},"","","","","","","",""\n`);
    res.write(`"เผลอกรอกข้อมูล (Total Compromised)",${totalSubmitted},"","","","","","","",""\n`);
    res.write(`"แจ้งเบาะแส (Total Reported)",${totalReported},"","","","","","","",""\n`);
    res.write(`"อัตราเผลอกรอกข้อมูล (Compromise Rate)","${compRate}%","","","","","","","",""\n`);
    res.write(`"อัตราแจ้งเบาะแส (Report Rate)","${repRate}%","","","","","","","",""\n`);

    res.end();
  } catch (err) {
    return res.status(500).send('Export failed');
  }
});
