import nodemailer, { type Transporter } from 'nodemailer';
import { prisma } from '../prisma.js';
import { renderTemplate } from './templateService.js';
import { trackingService } from './trackingService.js';
import { isWithinBusinessHours, generateDepartmentAwareSchedule } from '../utils/scheduler.js';
import { getLocalIpAddress } from '../utils/network.js';

interface DispatchOptions {
  campaignId: string;
  baseUrl: string;
}

class DispatchService {
  private activeCampaigns = new Set<string>();

  /**
   * Starts or resumes email dispatch for a campaign
   */
  public async launchCampaign(options: DispatchOptions): Promise<void> {
    const { campaignId, baseUrl } = options;

    if (this.activeCampaigns.has(campaignId)) {
      return;
    }

    this.activeCampaigns.add(campaignId);

    try {
      const campaign = await prisma.campaign.findUnique({
        where: { id: campaignId },
        include: {
          smtpProfile: true,
          emailTemplate: true,
          targetGroup: true
        }
      });

      if (!campaign || campaign.status === 'CANCELLED') {
        this.activeCampaigns.delete(campaignId);
        return;
      }

      await prisma.campaign.update({
        where: { id: campaignId },
        data: { status: 'RUNNING', startedAt: campaign.startedAt || new Date() }
      });

      // Initialize Nodemailer connection pool
      const isPort587 = Number(campaign.smtpProfile.port) === 587;
      const transporter = nodemailer.createTransport({
        pool: true,
        host: campaign.smtpProfile.host.trim(),
        port: Number(campaign.smtpProfile.port),
        secure: campaign.smtpProfile.secure ?? false,
        requireTLS: isPort587,
        maxConnections: campaign.smtpProfile.maxConnections || 3,
        connectionTimeout: 15000,
        greetingTimeout: 7000,
        socketTimeout: 20000,
        tls: {
          ciphers: 'SSLv3',
          rejectUnauthorized: false
        },
        auth: campaign.smtpProfile.username ? {
          user: campaign.smtpProfile.username.trim(),
          pass: (campaign.smtpProfile.password || '').trim()
        } : undefined
      });

      // Background worker to process targets in batches
      this.processDispatchLoop(campaignId, transporter, campaign, baseUrl);
    } catch (err) {
      console.error(`[DispatchService] Failed to initialize campaign ${campaignId}:`, err);
      this.activeCampaigns.delete(campaignId);
    }
  }

  private async processDispatchLoop(
    campaignId: string,
    transporter: Transporter,
    campaign: any,
    baseUrl: string
  ): Promise<void> {
    const batchSize = campaign.smtpProfile.rateLimit || 5;
    const delayMs = (campaign.smtpProfile.delaySeconds || 2) * 1000;
    const isRandomized = campaign.scheduleType === 'RANDOMIZED';

    while (this.activeCampaigns.has(campaignId)) {
      const now = new Date();

      // Working Hours Guard: Never dispatch randomized simulation emails outside allowed days / hours
      if (isRandomized) {
        const parsedDays = campaign.allowedDays
          ? String(campaign.allowedDays).split(',').map((d: string) => parseInt(d.trim(), 10)).filter(Boolean)
          : [1, 2, 3, 4, 5];
        const dailyStartTime = campaign.dailyStartTime || '08:30';
        const dailyEndTime = campaign.dailyEndTime || '17:00';

        const inBusinessHours = isWithinBusinessHours(
          now,
          parsedDays.length > 0 ? parsedDays : [1, 2, 3, 4, 5],
          dailyStartTime,
          dailyEndTime
        );

        if (!inBusinessHours) {
          // Pause and wait for next check (60 seconds)
          await new Promise((resolve) => setTimeout(resolve, 60000));
          continue;
        }
      }

      // Find targets pending dispatch.
      // If RANDOMIZED, only pick targets whose scheduledAt has arrived (scheduledAt <= now)
      const targetQueryCondition: any = {
        campaignId,
        dispatchStatus: { in: ['PENDING', 'QUEUED'] }
      };

      if (isRandomized) {
        targetQueryCondition.OR = [
          { scheduledAt: null },
          { scheduledAt: { lte: now } }
        ];
      }

      const pendingTargets = await prisma.campaignTarget.findMany({
        where: targetQueryCondition,
        include: { target: true, emailTemplate: true },
        take: batchSize,
        orderBy: isRandomized ? { scheduledAt: 'asc' } : { id: 'asc' }
      });

      if (pendingTargets.length === 0) {
        // If it's randomized, there may still be targets scheduled for the future
        if (isRandomized) {
          const futureTargets = await prisma.campaignTarget.count({
            where: {
              campaignId,
              dispatchStatus: { in: ['PENDING', 'QUEUED'] },
              scheduledAt: { gt: now }
            }
          });

          if (futureTargets > 0) {
            // Sleep for 30 seconds before polling future scheduled targets again
            await new Promise((resolve) => setTimeout(resolve, 30000));
            continue;
          }
        }

        // Check if all are done
        const remaining = await prisma.campaignTarget.count({
          where: { campaignId, dispatchStatus: { in: ['PENDING', 'QUEUED', 'SENDING'] } }
        });

        if (remaining === 0) {
          await prisma.campaign.update({
            where: { id: campaignId },
            data: { status: 'COMPLETED', endedAt: new Date() }
          });
        }
        break;
      }

      // Process batch concurrently
      await Promise.all(
        pendingTargets.map(async (ct) => {
          if (!this.activeCampaigns.has(campaignId)) return;

          try {
            await prisma.campaignTarget.update({
              where: { id: ct.id },
              data: { dispatchStatus: 'SENDING', sendAttempts: { increment: 1 } }
            });

            const phishingUrl = `${baseUrl}/l/${ct.token}`;
            const reportUrl = `${baseUrl}/report/${ct.token}`;

            const variables = {
              name: `${ct.target.firstName || ''} ${ct.target.lastName || ''}`.trim() || ct.target.email.split('@')[0],
              email: ct.target.email,
              department: ct.target.department || 'General',
              phishing_url: phishingUrl,
              report_url: reportUrl
            };

            // Use target-specific assigned template if multi-template campaign, else fallback to campaign template
            const tmpl = ct.emailTemplate || campaign.emailTemplate;

            const htmlBody = renderTemplate(tmpl.bodyHtml, variables);
            const textBody = tmpl.bodyText
              ? renderTemplate(tmpl.bodyText, variables)
              : undefined;

            // Simulation headers
            const headers: Record<string, string> = {
              'X-PhishCentral-Simulation': campaignId,
              'X-PhishCentral-Target': ct.token
            };

            // Attachment Simulation
            const attachments: any[] = [];
            if (tmpl.hasAttachment && tmpl.attachmentName) {
              const content = tmpl.attachmentContent || (
                tmpl.attachmentName.endsWith('.html')
                  ? `<!DOCTYPE html><html><body style="font-family:sans-serif;text-align:center;padding:40px;"><h2>⚠️ Phishing Simulation Notice</h2><p>This is a simulated security drill document.</p><p><a href="${phishingUrl}">Click here to verify your identity</a></p></body></html>`
                  : `[Phishing Simulation Document: ${tmpl.attachmentName}]\r\nThis document is part of an authorized security exercise.\r\nPlease visit: ${phishingUrl} to verify.`
              );

              attachments.push({
                filename: tmpl.attachmentName,
                content: content,
                contentType: tmpl.attachmentType || 'application/pdf'
              });
            }

            await transporter.sendMail({
              from: `"${campaign.smtpProfile.fromName}" <${campaign.smtpProfile.fromEmail}>`,
              to: ct.target.email,
              subject: renderTemplate(tmpl.subject, variables),
              html: htmlBody,
              text: textBody,
              headers,
              attachments: attachments.length > 0 ? attachments : undefined
            });

            const now = new Date();
            await prisma.campaignTarget.update({
              where: { id: ct.id },
              data: {
                dispatchStatus: 'SENT',
                isSent: true,
                sentAt: now
              }
            });

            trackingService.enqueueEvent({
              campaignId,
              campaignTargetId: ct.id,
              eventType: 'SENT',
              createdAt: now
            });
          } catch (err: any) {
            console.error(`[DispatchService] Failed to send email to ${ct.target.email}:`, err.message);
            await prisma.campaignTarget.update({
              where: { id: ct.id },
              data: {
                dispatchStatus: 'FAILED',
                lastError: err.message
              }
            });
          }
        })
      );

      // Throttle delay between batches to respect rate limits
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }

    this.activeCampaigns.delete(campaignId);
    transporter.close();
  }

  /**
   * Emergency Kill Switch to stop active dispatching immediately
   */
  public async killCampaign(campaignId: string): Promise<void> {
    this.activeCampaigns.delete(campaignId);
    await prisma.campaignTarget.updateMany({
      where: { campaignId, dispatchStatus: 'SENDING' },
      data: { dispatchStatus: 'PENDING' }
    });
  }

  /**
   * Pauses an active campaign dispatching loop
   */
  public async pauseCampaign(campaignId: string): Promise<void> {
    this.activeCampaigns.delete(campaignId);

    // Reset any targets stuck in SENDING back to PENDING so they are not lost
    await prisma.campaignTarget.updateMany({
      where: { campaignId, dispatchStatus: 'SENDING' },
      data: { dispatchStatus: 'PENDING' }
    });

    await prisma.campaign.update({
      where: { id: campaignId },
      data: { status: 'PAUSED' }
    });

    console.log(`[DispatchService] Campaign ${campaignId} paused.`);
  }

  /**
   * Resumes a paused campaign
   */
  public async resumeCampaign(options: DispatchOptions): Promise<void> {
    const { campaignId, baseUrl } = options;

    // Reschedule any targets that became overdue during the pause
    await this.rescheduleOverdueTargets(campaignId);

    // Reset any targets stuck in SENDING back to PENDING
    await prisma.campaignTarget.updateMany({
      where: { campaignId, dispatchStatus: 'SENDING' },
      data: { dispatchStatus: 'PENDING' }
    });

    await prisma.campaign.update({
      where: { id: campaignId },
      data: { status: 'RUNNING' }
    });

    return this.launchCampaign({ campaignId, baseUrl });
  }

  /**
   * Reschedules any overdue targets whose scheduledAt timestamp has already passed
   * into upcoming business hours, maintaining department separation and randomized jitter.
   */
  public async rescheduleOverdueTargets(campaignId: string): Promise<number> {
    const campaign = await prisma.campaign.findUnique({
      where: { id: campaignId }
    });
    if (!campaign || campaign.scheduleType !== 'RANDOMIZED') return 0;

    const now = new Date();
    // Overdue targets: PENDING/QUEUED whose scheduledAt is in the past (<= now) or null
    const overdueTargets = await prisma.campaignTarget.findMany({
      where: {
        campaignId,
        dispatchStatus: { in: ['PENDING', 'QUEUED'] },
        OR: [
          { scheduledAt: null },
          { scheduledAt: { lte: now } }
        ]
      },
      include: { target: true }
    });

    if (overdueTargets.length === 0) return 0;

    const parsedDays = campaign.allowedDays
      ? String(campaign.allowedDays).split(',').map((d: string) => parseInt(d.trim(), 10)).filter(Boolean)
      : [1, 2, 3, 4, 5];
    const dailyStartTime = campaign.dailyStartTime || '08:30';
    const dailyEndTime = campaign.dailyEndTime || '17:00';

    let schedEnd = campaign.endDate ? new Date(campaign.endDate) : null;
    if (!schedEnd || schedEnd.getTime() <= now.getTime()) {
      // Extend end date to 3 business days into the future if campaign endDate was in the past
      schedEnd = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);
    }

    const targetObjects = overdueTargets.map(ct => ct.target);
    const newScheduleMap = generateDepartmentAwareSchedule(targetObjects, {
      startDate: now,
      endDate: schedEnd,
      allowedDays: parsedDays.length > 0 ? parsedDays : [1, 2, 3, 4, 5],
      dailyStartTime,
      dailyEndTime,
      randomizeSendTimes: campaign.randomizeSendTimes ?? true
    });

    for (const ct of overdueTargets) {
      const newSlot = newScheduleMap.get(ct.targetId);
      if (newSlot) {
        await prisma.campaignTarget.update({
          where: { id: ct.id },
          data: { scheduledAt: newSlot }
        });
      }
    }

    console.log(`[DispatchService] Rescheduled ${overdueTargets.length} overdue target(s) for campaign "${campaign.name}" into upcoming business hours.`);
    return overdueTargets.length;
  }

  /**
   * Automatically restores and resumes any campaigns that were in RUNNING state
   * prior to a server restart.
   */
  public async autoResumeRunningCampaigns(defaultBaseUrl?: string): Promise<void> {
    try {
      const runningCampaigns = await prisma.campaign.findMany({
        where: { status: 'RUNNING' }
      });

      if (runningCampaigns.length === 0) {
        return;
      }

      console.log(`[DispatchService] Auto-resume: Found ${runningCampaigns.length} running campaign(s) to restore...`);

      let resolvedBaseUrl = defaultBaseUrl;
      if (!resolvedBaseUrl) {
        const localIp = getLocalIpAddress();
        const port = process.env.PORT || '3000';
        resolvedBaseUrl = process.env.BASE_URL || `http://${localIp}:${port}`;
      }

      for (const campaign of runningCampaigns) {
        // 1. Reset any targets stuck in SENDING from unexpected server crash
        await prisma.campaignTarget.updateMany({
          where: { campaignId: campaign.id, dispatchStatus: 'SENDING' },
          data: { dispatchStatus: 'PENDING' }
        });

        // 2. Check if all targets are already finished
        const remaining = await prisma.campaignTarget.count({
          where: {
            campaignId: campaign.id,
            dispatchStatus: { in: ['PENDING', 'QUEUED'] }
          }
        });

        if (remaining === 0) {
          await prisma.campaign.update({
            where: { id: campaign.id },
            data: { status: 'COMPLETED', endedAt: new Date() }
          });
          console.log(`[DispatchService] Campaign "${campaign.name}" (${campaign.id}) already completed all dispatches.`);
          continue;
        }

        // 3. Reschedule any overdue targets
        if (campaign.scheduleType === 'RANDOMIZED') {
          await this.rescheduleOverdueTargets(campaign.id);
        }

        // 4. Launch campaign dispatch loop
        this.launchCampaign({
          campaignId: campaign.id,
          baseUrl: resolvedBaseUrl
        });

        console.log(`[DispatchService] Auto-resumed campaign "${campaign.name}" (${campaign.id}) successfully.`);
      }
    } catch (err: any) {
      console.error('[DispatchService] Error during auto-resume of running campaigns:', err.message);
    }
  }
}

export const dispatchService = new DispatchService();
