import { describe, it, expect } from 'vitest';
import request from 'supertest';
import app from '../index.js';
import { prisma } from '../prisma.js';

describe('Feature Endpoints: Email Attachments & Auto-Group Import', () => {
  let createdGroupId: string = '';
  let createdTemplateId: string = '';

  it('POST /api/targets/import-auto-groups should automatically create target groups by department', async () => {
    const testDeptA = `TestDept_${Date.now()}_A`;
    const testDeptB = `TestDept_${Date.now()}_B`;

    const payload = {
      targets: [
        { email: `user1_${Date.now()}@corp.test`, name: 'User One', department: testDeptA },
        { email: `user2_${Date.now()}@corp.test`, name: 'User Two', department: testDeptA },
        { email: `user3_${Date.now()}@corp.test`, name: 'User Three', department: testDeptB }
      ]
    };

    const res = await request(app)
      .post('/api/targets/import-auto-groups')
      .send(payload);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.totalImported).toBe(3);
    expect(res.body.groupCount).toBe(2);
    expect(res.body.newGroupsCreated).toContain(testDeptA);
    expect(res.body.newGroupsCreated).toContain(testDeptB);

    // Verify groups in database
    const groupA = await prisma.targetGroup.findFirst({
      where: { name: testDeptA },
      include: { targets: true }
    });
    expect(groupA).toBeDefined();
    expect(groupA?.targets.length).toBe(2);
    if (groupA) createdGroupId = groupA.id;

    // Clean up test groups
    await prisma.targetGroup.deleteMany({
      where: { name: { in: [testDeptA, testDeptB] } }
    });
  });

  it('PUT /api/targets/groups/:id/targets/:targetId should edit target email, name and department', async () => {
    // Create temp group & target
    const group = await prisma.targetGroup.create({
      data: { name: `EditTestGroup_${Date.now()}` }
    });

    const target = await prisma.target.create({
      data: {
        email: `original_${Date.now()}@corp.test`,
        firstName: 'Original Name',
        department: 'Original Dept',
        targetGroupId: group.id
      }
    });

    const updatePayload = {
      email: `updated_${Date.now()}@corp.test`,
      firstName: 'Updated Name',
      department: 'Updated Dept'
    };

    const res = await request(app)
      .put(`/api/targets/groups/${group.id}/targets/${target.id}`)
      .send(updatePayload);

    expect(res.status).toBe(200);
    expect(res.body.email).toBe(updatePayload.email.toLowerCase());
    expect(res.body.firstName).toBe('Updated Name');
    expect(res.body.department).toBe('Updated Dept');

    // Clean up
    await prisma.targetGroup.delete({ where: { id: group.id } });
  });

  it('POST & PUT /api/templates/emails should support simulated email attachments', async () => {
    const createPayload = {
      name: `Attachment Test Template ${Date.now()}`,
      subject: 'Urgent Document Attached',
      bodyHtml: '<p>Please find attached invoice {{name}}</p>',
      hasAttachment: true,
      attachmentName: 'Invoice_2026.pdf',
      attachmentType: 'application/pdf',
      attachmentContent: 'Mock PDF Content'
    };

    // 1. Create template with attachment
    const createRes = await request(app)
      .post('/api/templates/emails')
      .send(createPayload);

    expect(createRes.status).toBe(201);
    expect(createRes.body.hasAttachment).toBe(true);
    expect(createRes.body.attachmentName).toBe('Invoice_2026.pdf');
    expect(createRes.body.attachmentType).toBe('application/pdf');
    createdTemplateId = createRes.body.id;

    // 2. Update attachment to HTML
    const updatePayload = {
      name: createPayload.name,
      subject: 'Updated Subject',
      bodyHtml: createPayload.bodyHtml,
      hasAttachment: true,
      attachmentName: 'Salary_Slip.html',
      attachmentType: 'text/html'
    };

    const updateRes = await request(app)
      .put(`/api/templates/emails/${createdTemplateId}`)
      .send(updatePayload);

    expect(updateRes.status).toBe(200);
    expect(updateRes.body.attachmentName).toBe('Salary_Slip.html');
    expect(updateRes.body.attachmentType).toBe('text/html');

    // 3. Clone template should duplicate attachment settings
    const cloneRes = await request(app)
      .post(`/api/templates/emails/${createdTemplateId}/clone`);

    expect(cloneRes.status).toBe(201);
    expect(cloneRes.body.hasAttachment).toBe(true);
    expect(cloneRes.body.attachmentName).toBe('Salary_Slip.html');

    // Clean up
    await prisma.emailTemplate.delete({ where: { id: cloneRes.body.id } });
    await prisma.emailTemplate.delete({ where: { id: createdTemplateId } });
  });

  it('GET /api/dashboard/export should stream multi-section Executive Summary CSV with UTF-8 BOM', async () => {
    const res = await request(app)
      .get('/api/dashboard/export');

    expect(res.status).toBe(200);
    expect(res.header['content-type']).toContain('text/csv');
    expect(res.header['content-disposition']).toContain('attachment; filename="phishcentral-summary-');

    const csvText = res.text;
    // Check for UTF-8 BOM (\ufeff)
    expect(csvText.startsWith('\ufeff')).toBe(true);

    // Verify all 3 required sections exist
    expect(csvText).toContain('=== สรุปภาพรวมระดับองค์กร (EXECUTIVE SUMMARY) ===');
    expect(csvText).toContain('=== สถิติเปรียบเทียบตามแผนก (DEPARTMENT BENCHMARKS) ===');
    expect(csvText).toContain('=== รายชื่อพนักงานกลุ่มเสี่ยงสูง (REPEAT OFFENDERS & HIGH RISK) ===');

    // Verify key metric labels exist
    expect(csvText).toContain('ดัชนีความพร้อมรับมือ (Resilience Score)');
    expect(csvText).toContain('เกรดความมั่นคงปลอดภัย (Resilience Grade)');
    expect(csvText).toContain('จำนวนอีเมลจำลองที่ส่ง (Total Emails Sent)');
  });

  it('DELETE /api/targets/groups/:id should delete target group and cascade delete its targets', async () => {
    // 1. Create a group with targets
    const group = await prisma.targetGroup.create({
      data: {
        name: `DeleteGroup_${Date.now()}`,
        description: 'Test Group to be deleted'
      }
    });

    const target = await prisma.target.create({
      data: {
        email: `deluser_${Date.now()}@corp.test`,
        firstName: 'Delete User',
        targetGroupId: group.id
      }
    });

    // 2. Perform delete
    const res = await request(app)
      .delete(`/api/targets/groups/${group.id}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);

    // 3. Verify group is removed from DB
    const checkGroup = await prisma.targetGroup.findUnique({
      where: { id: group.id }
    });
    expect(checkGroup).toBeNull();

    // 4. Verify target is also removed from DB
    const checkTarget = await prisma.target.findUnique({
      where: { id: target.id }
    });
    expect(checkTarget).toBeNull();
  });

  it('DELETE /api/targets/groups/:id should reject deletion when used in a RUNNING or SCHEDULED campaign', async () => {
    // 1. Create group
    const group = await prisma.targetGroup.create({
      data: { name: `ActiveCampaignGroup_${Date.now()}` }
    });

    // 2. Need minimal template, landing page, smtp profile to create campaign
    const emailTemplate = await prisma.emailTemplate.create({
      data: { name: `TempTmpl_${Date.now()}`, subject: 'Sub', bodyHtml: '<p>Hi</p>' }
    });
    const lpTemplate = await prisma.landingPageTemplate.create({
      data: { name: `TempLP_${Date.now()}`, pageTitle: 'Login' }
    });
    const smtp = await prisma.smtpProfile.create({
      data: { name: `TempSmtp_${Date.now()}`, host: 'localhost', port: 25, fromEmail: 'test@corp.test', fromName: 'Test' }
    });

    // 3. Create RUNNING campaign using this targetGroupId
    const campaign = await prisma.campaign.create({
      data: {
        name: `ActiveRunningCampaign_${Date.now()}`,
        status: 'RUNNING',
        targetGroupId: group.id,
        emailTemplateId: emailTemplate.id,
        landingPageTemplateId: lpTemplate.id,
        smtpProfileId: smtp.id
      }
    });

    // 4. Attempt delete should return 400 Bad Request
    const res = await request(app)
      .delete(`/api/targets/groups/${group.id}`);

    expect(res.status).toBe(400);
    expect(res.body.error).toContain('ไม่สามารถลบกลุ่มเป้าหมายนี้ได้');
    expect(res.body.error).toContain(campaign.name);

    // 5. Clean up campaign, then delete group
    await prisma.campaign.delete({ where: { id: campaign.id } });
    await prisma.emailTemplate.delete({ where: { id: emailTemplate.id } });
    await prisma.landingPageTemplate.delete({ where: { id: lpTemplate.id } });
    await prisma.smtpProfile.delete({ where: { id: smtp.id } });
    await prisma.targetGroup.delete({ where: { id: group.id } });
  });

  it('ANOMALY_LOCATIONS should have exactly 30 diverse sets and randomize M365 Unusual Sign-in template', async () => {
    const { ANOMALY_LOCATIONS, getRandomAnomalyLocation } = await import('../utils/anomalyLocations.js');
    const { renderTemplate, seedOfficialPresets } = await import('../services/templateService.js');

    // 1. Verify pool size
    expect(ANOMALY_LOCATIONS.length).toBe(30);

    // 2. Verify all entries have complete, non-empty fields
    for (const item of ANOMALY_LOCATIONS) {
      expect(item.city).toBeTruthy();
      expect(item.country).toBeTruthy();
      expect(item.location).toBeTruthy();
      expect(item.ip).toMatch(/^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/);
      expect(item.device).toBeTruthy();
      expect(item.time).toBeTruthy();
    }

    // 3. Verify seedOfficialPresets updates preset in database
    await seedOfficialPresets();
    const m365Tmpl = await prisma.emailTemplate.findFirst({
      where: { name: 'Microsoft 365 Unusual Sign-in Activity' }
    });
    expect(m365Tmpl).toBeDefined();
    expect(m365Tmpl?.bodyHtml).toContain('{{signin_location}}');
    expect(m365Tmpl?.bodyHtml).toContain('{{signin_ip}}');
    expect(m365Tmpl?.bodyHtml).toContain('{{signin_device}}');

    // 4. Verify renderTemplate dynamically substitutes anomaly fields
    const rendered = renderTemplate(m365Tmpl!.bodyHtml, {
      email: 'victim@company.com',
      phishing_url: 'https://test.corp/l/token123'
    });

    expect(rendered).not.toContain('{{signin_location}}');
    expect(rendered).not.toContain('{{signin_ip}}');
    expect(rendered).not.toContain('{{signin_device}}');
    expect(rendered).not.toContain('{{signin_time}}');
    expect(rendered).toContain('victim@company.com');
    expect(rendered).toContain('https://test.corp/l/token123');

    // 5. Test rendering multiple times yields random locations
    const locations = new Set<string>();
    for (let i = 0; i < 25; i++) {
      const r = renderTemplate(m365Tmpl!.bodyHtml, { email: `user${i}@corp.test` });
      // Find which anomaly location was picked
      const matched = ANOMALY_LOCATIONS.find(loc => r.includes(loc.location));
      if (matched) locations.add(matched.location);
    }
    // Across 25 renders, we should see multiple distinct locations picked (statistical diversity)
    expect(locations.size).toBeGreaterThan(1);
  });
});



