import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import app from '../index.js';
import { prisma } from '../prisma.js';
import { getAuthToken } from './helpers/auth.js';
import { syncTelemetryData } from '../services/reconciliationService.js';

describe('Telemetry & Submission Reconciliation Test Suite', () => {
  let authToken: string = '';
  let createdLandingPageId: string = '';
  let createdSmtpId: string = '';
  let createdTemplateId: string = '';
  let createdGroupId: string = '';
  let createdCampaignId: string = '';
  let target1Id: string = '';
  let ct1Id: string = '';
  let targetToken: string = '';

  beforeAll(async () => {
    authToken = await getAuthToken();

    // 1. Setup Landing Page
    const lp = await prisma.landingPageTemplate.create({
      data: {
        name: `Reconcile LP ${Date.now()}`,
        pageTitle: 'Sign In Simulation',
        postSubmitAction: 'AWARENESS_PAGE'
      }
    });
    createdLandingPageId = lp.id;

    // 2. Setup SMTP Profile
    const smtp = await prisma.smtpProfile.create({
      data: {
        name: `Reconcile SMTP ${Date.now()}`,
        host: 'smtp.test.local',
        port: 587,
        fromEmail: 'sec@corp.local',
        fromName: 'Security Drill'
      }
    });
    createdSmtpId = smtp.id;

    // 3. Setup Template
    const tmpl = await prisma.emailTemplate.create({
      data: {
        name: `Reconcile Email ${Date.now()}`,
        subject: 'Important Drill Document',
        bodyHtml: '<p>Click <a href="{{phishing_url}}">here</a></p>'
      }
    });
    createdTemplateId = tmpl.id;

    // 4. Setup Target Group & Target
    const group = await prisma.targetGroup.create({
      data: {
        name: `Reconcile Group ${Date.now()}`,
        targets: {
          create: [
            {
              email: `victim_${Date.now()}@corp.test`,
              firstName: 'Test',
              lastName: 'Victim',
              department: 'Engineering'
            }
          ]
        }
      },
      include: { targets: true }
    });
    createdGroupId = group.id;
    target1Id = group.targets[0].id;

    // 5. Setup Campaign
    const campaign = await prisma.campaign.create({
      data: {
        name: `Reconcile Campaign ${Date.now()}`,
        status: 'COMPLETED',
        targetGroupId: createdGroupId,
        emailTemplateId: createdTemplateId,
        landingPageTemplateId: createdLandingPageId,
        smtpProfileId: createdSmtpId,
        campaignTargets: {
          create: [
            {
              targetId: target1Id,
              token: `rec_tok_${Date.now()}`,
              dispatchStatus: 'SENT',
              isSent: true,
              sentAt: new Date(Date.now() - 3600000),
              isOpened: false,
              isClicked: false,
              isSubmitted: false, // Intentionally false to simulate out-of-sync state
              isReported: true,   // User was marked as reported (e.g. clicked footer trap or reported)
              reportedAt: new Date(Date.now() - 1800000)
            }
          ]
        }
      },
      include: { campaignTargets: true }
    });
    createdCampaignId = campaign.id;
    ct1Id = campaign.campaignTargets[0].id;
    targetToken = campaign.campaignTargets[0].token;

    // 6. Simulate EventLog having an actual SUBMITTED event (the form response)
    const submissionTime = new Date(Date.now() - 900000);
    await prisma.eventLog.create({
      data: {
        campaignId: createdCampaignId,
        campaignTargetId: ct1Id,
        eventType: 'SUBMITTED',
        isBot: false,
        metadata: JSON.stringify({ fieldsSubmitted: ['username', 'password'] }),
        createdAt: submissionTime
      }
    });
  });

  afterAll(async () => {
    // Cleanup
    if (createdCampaignId) {
      await prisma.eventLog.deleteMany({ where: { campaignId: createdCampaignId } });
      await prisma.campaignTarget.deleteMany({ where: { campaignId: createdCampaignId } });
      await prisma.campaign.delete({ where: { id: createdCampaignId } }).catch(() => {});
    }
    if (createdGroupId) {
      await prisma.target.deleteMany({ where: { targetGroupId: createdGroupId } });
      await prisma.targetGroup.delete({ where: { id: createdGroupId } }).catch(() => {});
    }
    if (createdTemplateId) {
      await prisma.emailTemplate.delete({ where: { id: createdTemplateId } }).catch(() => {});
    }
    if (createdLandingPageId) {
      await prisma.landingPageTemplate.delete({ where: { id: createdLandingPageId } }).catch(() => {});
    }
    if (createdSmtpId) {
      await prisma.smtpProfile.delete({ where: { id: createdSmtpId } }).catch(() => {});
    }
  });

  it('1. syncTelemetryData() should self-heal CampaignTarget isSubmitted flag from EventLog history', async () => {
    // Before sync: ct1 has isSubmitted = false
    const beforeCt = await prisma.campaignTarget.findUnique({ where: { id: ct1Id } });
    expect(beforeCt?.isSubmitted).toBe(false);

    // Run reconciliation with force=true to bypass test cooldown
    const result = await syncTelemetryData(true);
    expect(result.reconciledSubmitted).toBeGreaterThanOrEqual(1);

    // After sync: ct1 is now isSubmitted = true, submittedAt is populated, isClicked = true
    const afterCt = await prisma.campaignTarget.findUnique({ where: { id: ct1Id } });
    expect(afterCt?.isSubmitted).toBe(true);
    expect(afterCt?.submittedAt).toBeDefined();
    expect(afterCt?.isClicked).toBe(true);
  });

  it('2. GET /api/campaigns/:id should reflect the compromised target in stats and recipients', async () => {
    const res = await request(app)
      .get(`/api/campaigns/${createdCampaignId}`)
      .set('Authorization', `Bearer ${authToken}`);

    expect(res.status).toBe(200);
    expect(res.body.departmentStats['Engineering']).toBeDefined();
    expect(res.body.departmentStats['Engineering'].compromised).toBe(1);

    const targetRow = res.body.campaignTargets.find((t: any) => t.id === ct1Id);
    expect(targetRow).toBeDefined();
    expect(targetRow.isSubmitted).toBe(true);
    expect(targetRow.submittedAt).toBeTruthy();
  });

  it('3. GET /api/campaigns/:id/export CSV should include COMPROMISED status and CAMPAIGN SUMMARY section', async () => {
    const res = await request(app)
      .get(`/api/campaigns/${createdCampaignId}/export`)
      .set('Authorization', `Bearer ${authToken}`);

    expect(res.status).toBe(200);
    const csvContent = res.text;

    // Header check
    expect(csvContent).toContain('Email,Name,Department,Template,Status,ScheduledAt,SentAt,ClickedAt,SubmittedAt,ReportedAt');

    // Row check: must have COMPROMISED
    expect(csvContent).toContain('COMPROMISED');

    // Summary Section check
    expect(csvContent).toContain('=== สรุปผลลัพธ์แคมเปญ (CAMPAIGN SUMMARY) ===');
    expect(csvContent).toContain('"เผลอกรอกข้อมูล (Total Compromised)",1');
    expect(csvContent).toContain('"อัตราเผลอกรอกข้อมูล (Compromise Rate)","100.0%"');
  });

  it('4. GET /api/dashboard/export should accurately reflect Total Compromised in Executive Summary CSV', async () => {
    const res = await request(app)
      .get('/api/dashboard/export')
      .set('Authorization', `Bearer ${authToken}`);

    expect(res.status).toBe(200);
    const csvContent = res.text;

    expect(csvContent).toContain('=== สรุปภาพรวมระดับองค์กร (EXECUTIVE SUMMARY) ===');
    expect(csvContent).toContain('จำนวนการเผลอกรอกข้อมูล (Total Compromised)');
    // Section 3 check: high-risk target who submitted form must be listed with Compromised status and Campaign column
    expect(csvContent).toContain('=== รายชื่อพนักงานกลุ่มเสี่ยงสูง (HIGH-RISK TARGETS) ===');
    expect(csvContent).toContain('แคมเปญที่พบพฤติกรรม (Campaigns)');
    expect(csvContent).toContain('victim_');
    expect(csvContent).toContain('Compromised');
  });

  it('5. POST /l/:token/submit should directly persist isSubmitted to CampaignTarget immediately', async () => {
    // Create a new target in this campaign to test direct submission
    const target2 = await prisma.target.create({
      data: {
        email: `victim2_${Date.now()}@corp.test`,
        firstName: 'Victim',
        lastName: 'Two',
        department: 'Finance',
        targetGroupId: createdGroupId
      }
    });

    const token2 = `tok2_${Date.now()}`;
    const ct2 = await prisma.campaignTarget.create({
      data: {
        campaignId: createdCampaignId,
        targetId: target2.id,
        token: token2,
        dispatchStatus: 'SENT',
        isSent: true,
        sentAt: new Date(),
        isSubmitted: false
      }
    });

    // Post submission
    const res = await request(app)
      .post(`/l/${token2}/submit`)
      .send({ username: 'testuser', password: 'testpassword123' });

    expect(res.status).toBe(200);

    // Verify CampaignTarget was updated immediately in SQLite
    const updatedCt2 = await prisma.campaignTarget.findUnique({ where: { id: ct2.id } });
    expect(updatedCt2?.isSubmitted).toBe(true);
    expect(updatedCt2?.submittedAt).toBeDefined();
    expect(updatedCt2?.isClicked).toBe(true);
  });
});
