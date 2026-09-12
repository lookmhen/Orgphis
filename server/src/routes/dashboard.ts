import { Router, Request, Response } from 'express';
import { prisma } from '../prisma.js';

export const dashboardRouter = Router();

// GET /api/dashboard/insights
dashboardRouter.get('/insights', async (_req: Request, res: Response) => {
  try {
    // 1. Fetch all campaign targets with related target, campaign, and template
    const campaignTargets = await prisma.campaignTarget.findMany({
      include: {
        target: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
            department: true
          }
        },
        campaign: {
          select: {
            id: true,
            name: true,
            createdAt: true,
            startedAt: true,
            emailTemplate: {
              select: {
                id: true,
                name: true,
                subject: true
              }
            }
          }
        }
      }
    });

    // 2. Department Benchmark
    const deptMap = new Map<string, {
      department: string;
      sent: number;
      opened: number;
      clicked: number;
      submitted: number;
      reported: number;
    }>();

    for (const ct of campaignTargets) {
      const deptName = ct.target?.department?.trim() || 'ทั่วไป (General)';
      if (!deptMap.has(deptName)) {
        deptMap.set(deptName, {
          department: deptName,
          sent: 0,
          opened: 0,
          clicked: 0,
          submitted: 0,
          reported: 0
        });
      }
      const entry = deptMap.get(deptName)!;
      if (ct.isSent) entry.sent += 1;
      if (ct.isOpened) entry.opened += 1;
      if (ct.isClicked) entry.clicked += 1;
      if (ct.isSubmitted) entry.submitted += 1;
      if (ct.isReported) entry.reported += 1;
    }

    const departmentStats = Array.from(deptMap.values()).map(d => {
      const compromiseRate = d.sent > 0 ? Number(((d.submitted / d.sent) * 100).toFixed(1)) : 0;
      const reportRate = d.sent > 0 ? Number(((d.reported / d.sent) * 100).toFixed(1)) : 0;
      const clickRate = d.sent > 0 ? Number(((d.clicked / d.sent) * 100).toFixed(1)) : 0;
      return {
        ...d,
        compromiseRate,
        reportRate,
        clickRate
      };
    }).sort((a, b) => b.sent - a.sent);

    // 3. Campaign Progress Over Time (Campaign Trends)
    const campaigns = await prisma.campaign.findMany({
      where: {
        status: { in: ['RUNNING', 'COMPLETED'] }
      },
      include: {
        campaignTargets: {
          select: {
            isSent: true,
            isOpened: true,
            isClicked: true,
            isSubmitted: true,
            isReported: true
          }
        }
      },
      orderBy: { createdAt: 'asc' }
    });

    const campaignTrends = campaigns.map((c, index) => {
      let sent = 0;
      let opened = 0;
      let clicked = 0;
      let submitted = 0;
      let reported = 0;

      for (const ct of c.campaignTargets) {
        if (ct.isSent) sent += 1;
        if (ct.isOpened) opened += 1;
        if (ct.isClicked) clicked += 1;
        if (ct.isSubmitted) submitted += 1;
        if (ct.isReported) reported += 1;
      }

      const compromiseRate = sent > 0 ? Number(((submitted / sent) * 100).toFixed(1)) : 0;
      const reportRate = sent > 0 ? Number(((reported / sent) * 100).toFixed(1)) : 0;
      const dateStr = new Date(c.createdAt).toLocaleDateString('th-TH', { month: 'short', day: 'numeric' });

      return {
        id: c.id,
        name: c.name,
        round: `แคมเปญ ${index + 1}`,
        date: dateStr,
        sent,
        opened,
        clicked,
        submitted,
        reported,
        compromiseRate,
        reportRate
      };
    });

    // 4. Time to Click Speed Distribution
    const timeBuckets = {
      under5m: 0,
      m5to30: 0,
      m30to60: 0,
      h1to4: 0,
      over4h: 0
    };

    let totalTimeToClickMs = 0;
    let validClickCount = 0;

    for (const ct of campaignTargets) {
      if (ct.isClicked && ct.clickedAt && ct.sentAt) {
        const diffMs = ct.clickedAt.getTime() - ct.sentAt.getTime();
        if (diffMs >= 0) {
          totalTimeToClickMs += diffMs;
          validClickCount += 1;
          const diffMins = Math.floor(diffMs / (1000 * 60));

          if (diffMins < 5) timeBuckets.under5m += 1;
          else if (diffMins < 30) timeBuckets.m5to30 += 1;
          else if (diffMins < 60) timeBuckets.m30to60 += 1;
          else if (diffMins < 240) timeBuckets.h1to4 += 1;
          else timeBuckets.over4h += 1;
        }
      }
    }

    const avgMinutesToClick = validClickCount > 0
      ? Math.round(totalTimeToClickMs / (validClickCount * 1000 * 60))
      : 0;

    const timeDistribution = [
      { range: '< 5 นาที (เสี่ยงทันที)', count: timeBuckets.under5m },
      { range: '5 - 30 นาที', count: timeBuckets.m5to30 },
      { range: '30 - 60 นาที', count: timeBuckets.m30to60 },
      { range: '1 - 4 ชั่วโมง', count: timeBuckets.h1to4 },
      { range: '> 4 ชั่วโมง', count: timeBuckets.over4h }
    ];

    // 5. Template Effectiveness (Top Phishing Hooks)
    const templateMap = new Map<string, {
      name: string;
      sent: number;
      clicked: number;
      submitted: number;
    }>();

    for (const ct of campaignTargets) {
      const templateName = ct.campaign?.emailTemplate?.name || 'Unknown Template';
      if (!templateMap.has(templateName)) {
        templateMap.set(templateName, {
          name: templateName,
          sent: 0,
          clicked: 0,
          submitted: 0
        });
      }
      const entry = templateMap.get(templateName)!;
      if (ct.isSent) entry.sent += 1;
      if (ct.isClicked) entry.clicked += 1;
      if (ct.isSubmitted) entry.submitted += 1;
    }

    const templateStats = Array.from(templateMap.values()).map(t => {
      const compromiseRate = t.sent > 0 ? Number(((t.submitted / t.sent) * 100).toFixed(1)) : 0;
      const clickRate = t.sent > 0 ? Number(((t.clicked / t.sent) * 100).toFixed(1)) : 0;
      return {
        ...t,
        compromiseRate,
        clickRate
      };
    }).sort((a, b) => b.compromiseRate - a.compromiseRate);

    // 6. Enterprise Resilience Score & Grade
    let globalSent = 0;
    let globalSubmitted = 0;
    let globalReported = 0;

    for (const ct of campaignTargets) {
      if (ct.isSent) globalSent += 1;
      if (ct.isSubmitted) globalSubmitted += 1;
      if (ct.isReported) globalReported += 1;
    }

    const globalCompromiseRate = globalSent > 0 ? (globalSubmitted / globalSent) * 100 : 0;
    const globalReportRate = globalSent > 0 ? (globalReported / globalSent) * 100 : 0;

    // Base score = 70. Bonus for reports (+0.3x), penalty for compromises (-0.7x)
    let resilienceScore = 70;
    if (globalSent > 0) {
      resilienceScore = Math.round(70 + (globalReportRate * 0.3) - (globalCompromiseRate * 0.7));
      resilienceScore = Math.max(0, Math.min(100, resilienceScore));
    } else {
      resilienceScore = 100; // No incidents or tests yet
    }

    let grade = 'A';
    let gradeLabel = 'ยอดเยี่ยม (High Resilience)';
    let gradeColor = 'text-forest bg-forest-light border-forest/30';

    if (resilienceScore >= 80) {
      grade = 'A';
      gradeLabel = 'ตระหนักรู้ระดับยอดเยี่ยม (High Resilience)';
      gradeColor = 'text-forest bg-forest-light border-forest/30';
    } else if (resilienceScore >= 65) {
      grade = 'B';
      gradeLabel = 'เกณฑ์มาตรฐาน (Moderate Resilience)';
      gradeColor = 'text-blue-700 bg-blue-50 border-blue-200';
    } else if (resilienceScore >= 50) {
      grade = 'C';
      gradeLabel = 'ต้องเฝ้าระวัง (Needs Attention)';
      gradeColor = 'text-amber-700 bg-amber-50 border-amber-200';
    } else {
      grade = 'D';
      gradeLabel = 'ความเสี่ยงสูง (High Vulnerability)';
      gradeColor = 'text-red-700 bg-red-50 border-red-200';
    }

    // 7. High-Risk / Repeat Clickers (Targeted Retraining)
    const targetCompromiseMap = new Map<string, {
      id: string;
      email: string;
      name: string;
      department: string;
      compromisedCount: number;
      clickedCount: number;
    }>();

    for (const ct of campaignTargets) {
      if (!ct.target?.email) continue;
      const emailKey = ct.target.email.toLowerCase().trim();
      if (!targetCompromiseMap.has(emailKey)) {
        targetCompromiseMap.set(emailKey, {
          id: ct.target.id,
          email: ct.target.email,
          name: `${ct.target.firstName || ''} ${ct.target.lastName || ''}`.trim() || ct.target.email.split('@')[0],
          department: ct.target.department || 'ทั่วไป (General)',
          compromisedCount: 0,
          clickedCount: 0
        });
      }
      const entry = targetCompromiseMap.get(emailKey)!;
      if (ct.isSubmitted) entry.compromisedCount += 1;
      if (ct.isClicked) entry.clickedCount += 1;
    }

    // Filter repeat clickers (compromised or clicked >= 2 times)
    const repeatOffenders = Array.from(targetCompromiseMap.values())
      .filter(t => t.compromisedCount >= 2 || t.clickedCount >= 2)
      .sort((a, b) => b.compromisedCount - a.compromisedCount || b.clickedCount - a.clickedCount)
      .slice(0, 10);

    return res.json({
      departmentStats,
      campaignTrends,
      timeDistribution,
      avgMinutesToClick,
      templateStats,
      resilience: {
        score: resilienceScore,
        grade,
        gradeLabel,
        gradeColor,
        globalCompromiseRate: Number(globalCompromiseRate.toFixed(1)),
        globalReportRate: Number(globalReportRate.toFixed(1))
      },
      repeatOffenders
    });
  } catch (err: any) {
    console.error('[Dashboard Insights Error]:', err);
    return res.status(500).json({ error: `Failed to generate dashboard insights: ${err.message}` });
  }
});
