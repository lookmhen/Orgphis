import { Router, Request, Response } from 'express';
import { prisma } from '../prisma.js';

export const targetsRouter = Router();

// GET all target groups with stats
targetsRouter.get('/groups', async (_req: Request, res: Response) => {
  try {
    const groups = await prisma.targetGroup.findMany({
      include: {
        _count: {
          select: { targets: true, campaigns: true }
        }
      },
      orderBy: { createdAt: 'desc' }
    });
    return res.json(groups);
  } catch (err) {
    return res.status(500).json({ error: 'Failed to fetch target groups' });
  }
});

// GET all unique departments across all targets
targetsRouter.get('/departments', async (_req: Request, res: Response) => {
  try {
    const rawDepts = await prisma.target.findMany({
      select: { department: true },
      distinct: ['department']
    });

    const departments = rawDepts
      .map(d => d.department?.trim())
      .filter((d): d is string => Boolean(d && d.length > 0));

    // Get count of targets per department
    const deptStats = await Promise.all(
      departments.map(async (dept) => {
        const count = await prisma.target.count({ where: { department: dept } });
        return { name: dept, count };
      })
    );

    return res.json(deptStats);
  } catch (err) {
    return res.status(500).json({ error: 'Failed to fetch departments' });
  }
});

// CREATE target group
targetsRouter.post('/groups', async (req: Request, res: Response) => {
  const { name, description } = req.body;
  if (!name) return res.status(400).json({ error: 'Group name is required' });

  try {
    const group = await prisma.targetGroup.create({
      data: { name, description }
    });
    return res.status(201).json(group);
  } catch (err) {
    return res.status(500).json({ error: 'Failed to create group' });
  }
});

// DELETE target group (with active campaign safety check and clean cascade)
targetsRouter.delete('/groups/:id', async (req: Request, res: Response) => {
  const { id } = req.params;

  try {
    const group = await prisma.targetGroup.findUnique({
      where: { id },
      include: { _count: { select: { targets: true } } }
    });

    if (!group) {
      return res.status(404).json({ error: 'ไม่พบกลุ่มเป้าหมายที่ระบุ' });
    }

    // Safety check: Prevent deleting group if actively referenced in RUNNING or SCHEDULED campaigns
    const activeCampaigns = await prisma.campaign.findMany({
      where: {
        status: { in: ['RUNNING', 'SCHEDULED'] },
        OR: [
          { targetGroupId: id },
          { targetGroups: { some: { targetGroupId: id } } }
        ]
      },
      select: { name: true, status: true }
    });

    if (activeCampaigns.length > 0) {
      const names = activeCampaigns.map(c => `"${c.name}"`).join(', ');
      return res.status(400).json({
        error: `ไม่สามารถลบกลุ่มเป้าหมายนี้ได้ เนื่องจากกำลังถูกใช้งานอยู่ในแคมเปญที่กำลังดำเนินการ (${names}) กรุณาหยุดหรือยกเลิกแคมเปญก่อนลบกลุ่ม`
      });
    }

    // Perform cascade deletion cleanly in a transaction
    await prisma.$transaction(async (tx) => {
      // 1. Find all targets belonging to this group
      const targets = await tx.target.findMany({
        where: { targetGroupId: id },
        select: { id: true }
      });
      const targetIds = targets.map(t => t.id);

      // 2. Delete any campaign targets pointing to these targets
      if (targetIds.length > 0) {
        await tx.campaignTarget.deleteMany({
          where: { targetId: { in: targetIds } }
        });
        await tx.target.deleteMany({
          where: { id: { in: targetIds } }
        });
      }

      // 3. Remove many-to-many references in CampaignTargetGroup
      await tx.campaignTargetGroup.deleteMany({
        where: { targetGroupId: id }
      });

      // 4. Nullify single-group references in Campaign if any
      await tx.campaign.updateMany({
        where: { targetGroupId: id },
        data: { targetGroupId: null }
      });

      // 5. Delete the target group itself
      await tx.targetGroup.delete({
        where: { id }
      });
    });

    return res.json({ success: true, message: `ลบกลุ่มเป้าหมาย "${group.name}" เรียบร้อยแล้ว` });
  } catch (err: any) {
    console.error('[Targets] Delete target group error:', err);
    return res.status(500).json({ error: 'ลบกลุ่มเป้าหมายไม่สำเร็จ: ' + err.message });
  }
});

// GET targets in group
targetsRouter.get('/groups/:id/targets', async (req: Request, res: Response) => {
  const { id } = req.params;
  try {
    const targets = await prisma.target.findMany({
      where: { targetGroupId: id },
      orderBy: { createdAt: 'desc' }
    });
    return res.json(targets);
  } catch (err) {
    return res.status(500).json({ error: 'Failed to fetch targets' });
  }
});

// IMPORT targets via JSON list (parsed from CSV on client)
targetsRouter.post('/groups/:id/import', async (req: Request, res: Response) => {
  const { id } = req.params;
  const { targets } = req.body; // Array of { email, firstName, lastName, employeeId, department, position }

  if (!Array.isArray(targets) || targets.length === 0) {
    return res.status(400).json({ error: 'Targets array is required' });
  }

  try {
    let createdCount = 0;
    for (const t of targets) {
      if (!t.email) continue;
      const cleanEmail = t.email.trim().toLowerCase();

      await prisma.target.upsert({
        where: {
          email_targetGroupId: {
            email: cleanEmail,
            targetGroupId: id
          }
        },
        update: {
          firstName: t.firstName || t.name,
          lastName: t.lastName,
          employeeId: t.employeeId || t.empid,
          department: t.department,
          position: t.position
        },
        create: {
          email: cleanEmail,
          firstName: t.firstName || t.name,
          lastName: t.lastName,
          employeeId: t.employeeId || t.empid,
          department: t.department,
          position: t.position,
          targetGroupId: id
        }
      });
      createdCount++;
    }

    return res.json({ success: true, count: createdCount });
  } catch (err) {
    console.error('[Targets] Import error:', err);
    return res.status(500).json({ error: 'Failed to import targets' });
  }
});

// ADD single target to group
targetsRouter.post('/groups/:id/targets', async (req: Request, res: Response) => {
  const { id } = req.params;
  const { email, firstName, lastName, employeeId, department, position } = req.body;

  if (!email || !email.includes('@')) {
    return res.status(400).json({ error: 'Valid email address is required' });
  }

  try {
    const cleanEmail = email.trim().toLowerCase();
    const target = await prisma.target.upsert({
      where: {
        email_targetGroupId: {
          email: cleanEmail,
          targetGroupId: id
        }
      },
      update: {
        firstName,
        lastName,
        employeeId,
        department,
        position
      },
      create: {
        email: cleanEmail,
        firstName,
        lastName,
        employeeId,
        department: department || 'General',
        position,
        targetGroupId: id
      }
    });

    return res.status(201).json(target);
  } catch (err: any) {
    console.error('[Targets] Add single target error:', err);
    return res.status(500).json({ error: 'Failed to add target: ' + err.message });
  }
});

// IMPORT targets with auto-creation of groups based on department column
targetsRouter.post('/import-auto-groups', async (req: Request, res: Response) => {
  const { targets, defaultGroupName = 'General' } = req.body;

  if (!Array.isArray(targets) || targets.length === 0) {
    return res.status(400).json({ error: 'Targets array is required' });
  }

  try {
    // 1. Group targets by department name
    const deptMap = new Map<string, any[]>();

    for (const t of targets) {
      if (!t.email || !t.email.includes('@')) continue;
      const deptName = (t.department?.trim()) || defaultGroupName;
      if (!deptMap.has(deptName)) {
        deptMap.set(deptName, []);
      }
      deptMap.get(deptName)!.push({
        email: t.email.trim().toLowerCase(),
        firstName: (t.name || t.firstName || '').trim(),
        lastName: (t.lastName || '').trim(),
        department: deptName,
        position: (t.position || '').trim()
      });
    }

    let totalImported = 0;
    const createdGroups: string[] = [];

    // 2. Ensure each group exists, then upsert targets into that group
    for (const [deptName, targetList] of deptMap.entries()) {
      let group = await prisma.targetGroup.findFirst({
        where: { name: deptName }
      });

      if (!group) {
        group = await prisma.targetGroup.create({
          data: {
            name: deptName,
            description: `กลุ่มเป้าหมายแผนก ${deptName} (สร้างอัตโนมัติจากการนำเข้า CSV)`
          }
        });
        createdGroups.push(deptName);
      }

      for (const t of targetList) {
        await prisma.target.upsert({
          where: {
            email_targetGroupId: {
              email: t.email,
              targetGroupId: group.id
            }
          },
          update: {
            firstName: t.firstName,
            lastName: t.lastName,
            department: t.department,
            position: t.position
          },
          create: {
            email: t.email,
            firstName: t.firstName,
            lastName: t.lastName,
            department: t.department,
            position: t.position,
            targetGroupId: group.id
          }
        });
        totalImported++;
      }
    }

    return res.json({
      success: true,
      totalImported,
      groupCount: deptMap.size,
      newGroupsCreated: createdGroups
    });
  } catch (err: any) {
    console.error('[Targets] Import auto groups error:', err);
    return res.status(500).json({ error: 'Failed to import and auto-create groups: ' + err.message });
  }
});

// UPDATE target details (Edit email, name, department)
targetsRouter.put('/groups/:id/targets/:targetId', async (req: Request, res: Response) => {
  const { id: targetGroupId, targetId } = req.params;
  const { email, firstName, lastName, department, position } = req.body;

  if (!email || !email.includes('@')) {
    return res.status(400).json({ error: 'Valid email is required' });
  }

  try {
    const cleanEmail = email.trim().toLowerCase();

    // Check if updating email conflicts with another target in the same group
    const existing = await prisma.target.findFirst({
      where: {
        email: cleanEmail,
        targetGroupId,
        NOT: { id: targetId }
      }
    });

    if (existing) {
      return res.status(400).json({ error: `อีเมล ${cleanEmail} มีอยู่ในกลุ่มนี้แล้ว` });
    }

    const updated = await prisma.target.update({
      where: { id: targetId },
      data: {
        email: cleanEmail,
        firstName: firstName !== undefined ? firstName.trim() : undefined,
        lastName: lastName !== undefined ? lastName.trim() : undefined,
        department: department !== undefined ? department.trim() : undefined,
        position: position !== undefined ? position.trim() : undefined
      }
    });

    return res.json(updated);
  } catch (err: any) {
    console.error('[Targets] Update target error:', err);
    return res.status(500).json({ error: 'Failed to update target: ' + err.message });
  }
});

// DELETE target
targetsRouter.delete('/groups/:id/targets/:targetId', async (req: Request, res: Response) => {
  const { targetId } = req.params;
  try {
    await prisma.$transaction(async (tx) => {
      await tx.campaignTarget.deleteMany({ where: { targetId } });
      await tx.target.delete({ where: { id: targetId } });
    });
    return res.json({ success: true });
  } catch (err: any) {
    console.error('[Targets] Delete target error:', err);
    return res.status(500).json({ error: 'Failed to delete target: ' + err.message });
  }
});
