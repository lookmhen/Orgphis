import { prisma } from '../prisma.js';

interface BufferedEvent {
  campaignId: string;
  campaignTargetId?: string;
  eventType: string; // SENT, OPENED, CLICKED, SUBMITTED, REPORTED
  ipAddress?: string;
  userAgent?: string;
  isBot?: boolean;
  metadata?: Record<string, any>;
  createdAt: Date;
}

class TrackingService {
  private eventBuffer: BufferedEvent[] = [];
  private flushTimer: NodeJS.Timeout | null = null;
  private socIpWhitelist: Set<string> = new Set(['127.0.0.1', '::1']); // Default local SOC testing

  constructor() {
    // Flush buffer every 1.5 seconds to handle spike traffic without locking SQLite
    this.flushTimer = setInterval(() => this.flushBuffer(), 1500);
  }

  public addSocWhitelistIp(ip: string) {
    this.socIpWhitelist.add(ip);
  }

  public isSocIp(ip?: string | null): boolean {
    if (!ip) return false;
    return this.socIpWhitelist.has(ip);
  }

  /**
   * Enqueues an event into the high-performance in-memory buffer
   */
  public enqueueEvent(event: BufferedEvent): void {
    this.eventBuffer.push(event);
    if (this.eventBuffer.length >= 100) {
      this.flushBuffer();
    }
  }

  /**
   * Flushes buffered events into SQLite using batch operations
   */
  public async flushBuffer(): Promise<void> {
    if (this.eventBuffer.length === 0) return;

    const eventsToFlush = [...this.eventBuffer];
    this.eventBuffer = [];

    try {
      await prisma.$transaction(async (tx) => {
        for (const ev of eventsToFlush) {
          await tx.eventLog.create({
            data: {
              campaignId: ev.campaignId,
              campaignTargetId: ev.campaignTargetId,
              eventType: ev.eventType,
              ipAddress: ev.ipAddress,
              userAgent: ev.userAgent,
              isBot: ev.isBot || false,
              metadata: ev.metadata ? JSON.stringify(ev.metadata) : null,
              createdAt: ev.createdAt
            }
          });

          // Update Target flags on first occurrence (ignoring bots and SOC IPs)
          if (ev.campaignTargetId && !ev.isBot && !this.isSocIp(ev.ipAddress)) {
            const currentTarget = await tx.campaignTarget.findUnique({
              where: { id: ev.campaignTargetId }
            });

            if (currentTarget) {
              // If already reported, freeze state (do not count as compromised)
              if (currentTarget.isReported && (ev.eventType === 'CLICKED' || ev.eventType === 'SUBMITTED')) {
                continue;
              }

              const updateData: Record<string, any> = {};
              if (ev.eventType === 'OPENED' && !currentTarget.isOpened) {
                updateData.isOpened = true;
                updateData.openedAt = ev.createdAt;
              } else if (ev.eventType === 'CLICKED' && !currentTarget.isClicked) {
                updateData.isClicked = true;
                updateData.clickedAt = ev.createdAt;
              } else if (ev.eventType === 'SUBMITTED' && !currentTarget.isSubmitted) {
                updateData.isSubmitted = true;
                updateData.submittedAt = ev.createdAt;
              } else if (ev.eventType === 'REPORTED' && !currentTarget.isReported) {
                updateData.isReported = true;
                updateData.reportedAt = ev.createdAt;
              }

              if (Object.keys(updateData).length > 0) {
                await tx.campaignTarget.update({
                  where: { id: ev.campaignTargetId },
                  data: updateData
                });
              }
            }
          }
        }
      });
    } catch (err) {
      console.error('[TrackingService] Error flushing events to database:', err);
      // Re-queue unwritten events on transient database errors
      this.eventBuffer.unshift(...eventsToFlush);
    }
  }

  public shutdown(): void {
    if (this.flushTimer) {
      clearInterval(this.flushTimer);
    }
    this.flushBuffer();
  }
}

export const trackingService = new TrackingService();
