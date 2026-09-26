import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import app from '../index.js';
import { prisma } from '../prisma.js';

describe('Multi-Template Campaign Randomization & Deduplication Suite', () => {
  let createdLandingPageId: string = '';
  let createdSmtpId: string = '';
  let template1Id: string = '';
  let template2Id: string = '';
  let template3Id: string = '';

  let groupAId: string = '';
  let groupBId: string = '';
  let groupOverlapId: string = '';

  let createdCampaignIds: string[] = [];

  beforeAll(async () => {
    // 1. Setup Landing Page
    const lp = await prisma.landingPageTemplate.create({
      data: {
        name: `Test Landing Page ${Date.now()}`,
        pageTitle: 'Test Sign In',
        customHtml: '<html><body>Test Login</body></html>',
        redirectUrl: 'https://example.com'
      }
    });
    createdLandingPageId = lp.id;

    // 2. Setup SMTP Profile
    const smtp = await prisma.smtpProfile.create({
      data: {
        name: `Test SMTP ${Date.now()}`,
        host: 'smtp.test.local',
        port: 587,
        fromEmail: 'security-test@corp.local',
        fromName: 'IT Security'
      }
    });
    createdSmtpId = smtp.id;

    // 3. Setup 3 Email Templates
    const t1 = await prisma.emailTemplate.create({
      data: {
        name: `Template IT Password Reset ${Date.now()}`,
        subject: 'แจ้งเตือน: รหัสผ่านของคุณกำลังจะหมดอายุ',
        bodyHtml: '<p>รีเซ็ตรหัสผ่านได้ที่ <a href="{{phishing_url}}">คลิกที่นี่</a></p>'
      }
    });
    const t2 = await prisma.emailTemplate.create({
      data: {
        name: `Template HR Welfare ${Date.now()}`,
        subject: 'ประกาศ: อัปเดตสวัสดิการพนักงานประจำปี',
        bodyHtml: '<p>ตรวจสอบสิทธิประโยชน์ <a href="{{phishing_url}}">คลิกที่นี่</a></p>'
      }
    });
    const t3 = await prisma.emailTemplate.create({
      data: {
        name: `Template M365 Alert ${Date.now()}`,
        subject: 'Security Alert: New Sign-in from Unusual Location',
        bodyHtml: '<p>Review sign-in activity: <a href="{{phishing_url}}">Verify Account</a></p>'
      }
    });
    template1Id = t1.id;
    template2Id = t2.id;
    template3Id = t3.id;

    // 4. Setup Target Groups
    // Group A: 3 employees
    const gA = await prisma.targetGroup.create({
      data: {
        name: `Group A Sales ${Date.now()}`,
        targets: {
          create: [
            { email: `sales1_${Date.now()}@corp.test`, firstName: 'Sales One', department: 'Sales' },
            { email: `sales2_${Date.now()}@corp.test`, firstName: 'Sales Two', department: 'Sales' },
            { email: `sales3_${Date.now()}@corp.test`, firstName: 'Sales Three', department: 'Sales' }
          ]
        }
      }
    });
    groupAId = gA.id;

    // Group B: 3 employees
    const gB = await prisma.targetGroup.create({
      data: {
        name: `Group B Marketing ${Date.now()}`,
        targets: {
          create: [
            { email: `mkt1_${Date.now()}@corp.test`, firstName: 'Marketing One', department: 'Marketing' },
            { email: `mkt2_${Date.now()}@corp.test`, firstName: 'Marketing Two', department: 'Marketing' },
            { email: `mkt3_${Date.now()}@corp.test`, firstName: 'Marketing Three', department: 'Marketing' }
          ]
        }
      }
    });
    groupBId = gB.id;

    // Group Overlap: contains an employee whose email is identical to sales1
    const sales1Target = await prisma.target.findFirst({
      where: { targetGroupId: groupAId, email: { startsWith: 'sales1_' } }
    });
    const gOverlap = await prisma.targetGroup.create({
      data: {
        name: `Group Overlap ${Date.now()}`,
        targets: {
          create: [
            { email: sales1Target!.email, firstName: 'Sales One Duplicate', department: 'Special Projects' },
            { email: `unique_${Date.now()}@corp.test`, firstName: 'Unique Person', department: 'Special Projects' }
          ]
        }
      }
    });
    groupOverlapId = gOverlap.id;
  });

  afterAll(async () => {
    // Cleanup created campaigns
    for (const cid of createdCampaignIds) {
      await prisma.campaignEmailTemplate.deleteMany({ where: { campaignId: cid } });
      await prisma.eventLog.deleteMany({ where: { campaignId: cid } });
      await prisma.campaignTarget.deleteMany({ where: { campaignId: cid } });
      await prisma.campaign.delete({ where: { id: cid } }).catch(() => {});
    }

    // Cleanup groups and targets
    await prisma.target.deleteMany({
      where: { targetGroupId: { in: [groupAId, groupBId, groupOverlapId] } }
    });
    await prisma.targetGroup.deleteMany({
      where: { id: { in: [groupAId, groupBId, groupOverlapId] } }
    });

    // Cleanup templates & SMTP & landing page
    await prisma.emailTemplate.deleteMany({
      where: { id: { in: [template1Id, template2Id, template3Id] } }
    });
    if (createdLandingPageId) {
      await prisma.landingPageTemplate.delete({ where: { id: createdLandingPageId } }).catch(() => {});
    }
    if (createdSmtpId) {
      await prisma.smtpProfile.delete({ where: { id: createdSmtpId } }).catch(() => {});
    }
  });

  it('1. Should create a multi-template campaign and randomly/evenly distribute 3 templates across 6 targets', async () => {
    const payload = {
      name: `Multi-Template Campaign ${Date.now()}`,
      description: 'Testing multi-template randomization',
      targetGroupIds: [groupAId, groupBId],
      emailTemplateIds: [template1Id, template2Id, template3Id],
      landingPageTemplateId: createdLandingPageId,
      smtpProfileId: createdSmtpId,
      scheduleType: 'IMMEDIATE'
    };

    const res = await request(app)
      .post('/api/campaigns')
      .send(payload);

    expect(res.status).toBe(201);
    expect(res.body.id).toBeDefined();
    createdCampaignIds.push(res.body.id);

    const campaignId = res.body.id;

    // Verify CampaignEmailTemplate records
    const joinRecords = await prisma.campaignEmailTemplate.findMany({
      where: { campaignId }
    });
    expect(joinRecords.length).toBe(3);
    const linkedTemplateIds = joinRecords.map(r => r.emailTemplateId);
    expect(linkedTemplateIds).toContain(template1Id);
    expect(linkedTemplateIds).toContain(template2Id);
    expect(linkedTemplateIds).toContain(template3Id);

    // Verify CampaignTarget records and template distribution
    const campaignTargets = await prisma.campaignTarget.findMany({
      where: { campaignId }
    });
    expect(campaignTargets.length).toBe(6);

    // Ensure every target was assigned an emailTemplateId
    campaignTargets.forEach(ct => {
      expect(ct.emailTemplateId).toBeDefined();
      expect([template1Id, template2Id, template3Id]).toContain(ct.emailTemplateId);
    });

    // Distribution check: 6 targets divided by 3 templates = exactly 2 targets per template
    const countsPerTemplate: Record<string, number> = {};
    campaignTargets.forEach(ct => {
      countsPerTemplate[ct.emailTemplateId!] = (countsPerTemplate[ct.emailTemplateId!] || 0) + 1;
    });

    expect(countsPerTemplate[template1Id]).toBe(2);
    expect(countsPerTemplate[template2Id]).toBe(2);
    expect(countsPerTemplate[template3Id]).toBe(2);
  });

  it('2. Should guarantee zero duplicate emails when employee is in multiple target groups', async () => {
    // Target group A (3 targets) and groupOverlap (2 targets, 1 has same email as sales1)
    // Total raw targets = 5, but unique distinct emails = 4
    const payload = {
      name: `Deduplication Test Campaign ${Date.now()}`,
      description: 'Testing employee deduplication across overlapping groups',
      targetGroupIds: [groupAId, groupOverlapId],
      emailTemplateIds: [template1Id, template2Id],
      landingPageTemplateId: createdLandingPageId,
      smtpProfileId: createdSmtpId,
      scheduleType: 'IMMEDIATE'
    };

    const res = await request(app)
      .post('/api/campaigns')
      .send(payload);

    expect(res.status).toBe(201);
    createdCampaignIds.push(res.body.id);

    const campaignTargets = await prisma.campaignTarget.findMany({
      where: { campaignId: res.body.id },
      include: { target: true }
    });

    // Verify total targets in campaign equals distinct emails (4, not 5)
    expect(campaignTargets.length).toBe(4);

    const targetEmails = campaignTargets.map(ct => ct.target.email.toLowerCase());
    const uniqueEmails = new Set(targetEmails);
    expect(uniqueEmails.size).toBe(campaignTargets.length);
  });

  it('3. GET /api/campaigns/:id should return per-template analytics (templateStats)', async () => {
    const campaignId = createdCampaignIds[0];

    // Find targets with template 1 and template 2
    const targets = await prisma.campaignTarget.findMany({
      where: { campaignId },
      include: { target: true }
    });

    const targetWithT1 = targets.find(t => t.emailTemplateId === template1Id);
    const targetWithT2 = targets.find(t => t.emailTemplateId === template2Id);

    // Simulate events:
    // targetWithT1 sent & clicked
    await prisma.campaignTarget.update({
      where: { id: targetWithT1!.id },
      data: { isSent: true, sentAt: new Date(), isClicked: true, clickedAt: new Date() }
    });
    await prisma.eventLog.create({
      data: {
        campaignId,
        campaignTargetId: targetWithT1!.id,
        eventType: 'CLICKED'
      }
    });

    // targetWithT2 sent, clicked and submitted (compromised)
    await prisma.campaignTarget.update({
      where: { id: targetWithT2!.id },
      data: { isSent: true, sentAt: new Date(), isClicked: true, clickedAt: new Date(), isSubmitted: true, submittedAt: new Date() }
    });
    await prisma.eventLog.create({
      data: {
        campaignId,
        campaignTargetId: targetWithT2!.id,
        eventType: 'SUBMITTED'
      }
    });

    const res = await request(app).get(`/api/campaigns/${campaignId}`);
    expect(res.status).toBe(200);
    expect(res.body.templateStats).toBeDefined();
    expect(Array.isArray(res.body.templateStats)).toBe(true);
    expect(res.body.templateStats.length).toBe(3);

    const statT1 = res.body.templateStats.find((s: any) => s.id === template1Id);
    expect(statT1).toBeDefined();
    expect(statT1.sent).toBe(1);
    expect(statT1.clicked).toBe(1);
    expect(statT1.compromised).toBe(0);

    const statT2 = res.body.templateStats.find((s: any) => s.id === template2Id);
    expect(statT2).toBeDefined();
    expect(statT2.sent).toBe(1);
    expect(statT2.clicked).toBe(1);
    expect(statT2.compromised).toBe(1);
  });

  it('4. Backward Compatibility: Should work seamlessly with single template campaign', async () => {
    const payload = {
      name: `Single Template Campaign ${Date.now()}`,
      description: 'Testing backward compatibility for single template',
      targetGroupIds: [groupBId],
      emailTemplateId: template1Id, // single template string (legacy format)
      landingPageTemplateId: createdLandingPageId,
      smtpProfileId: createdSmtpId,
      scheduleType: 'IMMEDIATE'
    };

    const res = await request(app)
      .post('/api/campaigns')
      .send(payload);

    expect(res.status).toBe(201);
    createdCampaignIds.push(res.body.id);

    const campaign = await prisma.campaign.findUnique({
      where: { id: res.body.id },
      include: {
        campaignEmailTemplates: true,
        campaignTargets: true
      }
    });

    expect(campaign?.emailTemplateId).toBe(template1Id);
    expect(campaign?.campaignEmailTemplates.length).toBe(1);
    expect(campaign?.campaignEmailTemplates[0].emailTemplateId).toBe(template1Id);
    expect(campaign?.campaignTargets.length).toBe(3);
    campaign?.campaignTargets.forEach(ct => {
      expect(ct.emailTemplateId).toBe(template1Id);
    });
  });
});
