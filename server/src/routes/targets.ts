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

// DELETE target
targetsRouter.delete('/groups/:id/targets/:targetId', async (req: Request, res: Response) => {
  const { targetId } = req.params;
  try {
    await prisma.target.delete({ where: { id: targetId } });
    return res.json({ success: true });
  } catch (err: any) {
    return res.status(500).json({ error: 'Failed to delete target' });
  }
});
