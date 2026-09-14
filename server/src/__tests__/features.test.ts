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
});
