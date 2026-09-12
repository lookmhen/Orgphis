import nodemailer, { type Transporter } from 'nodemailer';
import { prisma } from '../prisma.js';
import { renderTemplate } from './templateService.js';
import { trackingService } from './trackingService.js';

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

    while (this.activeCampaigns.has(campaignId)) {
      // Find targets pending dispatch
      const pendingTargets = await prisma.campaignTarget.findMany({
        where: {
          campaignId,
          dispatchStatus: { in: ['PENDING', 'QUEUED'] }
        },
        include: { target: true },
        take: batchSize
      });

      if (pendingTargets.length === 0) {
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

            const htmlBody = renderTemplate(campaign.emailTemplate.bodyHtml, variables);
            const textBody = campaign.emailTemplate.bodyText
              ? renderTemplate(campaign.emailTemplate.bodyText, variables)
              : undefined;

            // Simulation headers
            const headers: Record<string, string> = {
              'X-PhishCentral-Simulation': campaignId,
              'X-PhishCentral-Target': ct.token
            };

            await transporter.sendMail({
              from: `"${campaign.smtpProfile.fromName}" <${campaign.smtpProfile.fromEmail}>`,
              to: ct.target.email,
              subject: renderTemplate(campaign.emailTemplate.subject, variables),
              html: htmlBody,
              text: textBody,
              headers
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
  public killCampaign(campaignId: string): void {
    this.activeCampaigns.delete(campaignId);
  }
}

export const dispatchService = new DispatchService();
