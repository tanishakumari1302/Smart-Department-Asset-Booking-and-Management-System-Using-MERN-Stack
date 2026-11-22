import { Router, Request, Response } from 'express';
import { getDashboardKPIs, getAuditLogs } from '../services/dataService.js';
import { isAtlasConnected } from '../config/db.js';

const router = Router();

// GET /api/stats/dashboard
router.get('/dashboard', async (_req: Request, res: Response) => {
  try {
    const kpis = await getDashboardKPIs();
    return res.json({
      success: true,
      data: kpis,
      cluster: {
        node: 'COLLEGE-LAB-01',
        name: 'Node // COLLEGE-CENTRAL-CLUSTER',
        term: 'AY 2025–2026 Term II',
        atlasConnected: isAtlasConnected(),
        dbName: 'assethub',
        latencyMs: isAtlasConnected() ? 12 : 2,
      },
    });
  } catch (err: any) {
    return res.status(500).json({ message: 'Failed to retrieve dashboard metrics', error: err.message });
  }
});

// GET /api/stats/audit-logs
router.get('/audit-logs', async (req: Request, res: Response) => {
  try {
    const limit = Number(req.query.limit || 30);
    const logs = await getAuditLogs(limit);
    return res.json({ count: logs.length, logs });
  } catch (err: any) {
    return res.status(500).json({ message: 'Failed to retrieve audit log', error: err.message });
  }
});

// GET /api/stats/health
router.get('/health', (_req: Request, res: Response) => {
  return res.json({
    status: 'online',
    version: '1.2.0',
    atlasConnected: isAtlasConnected(),
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
  });
});

export default router;
