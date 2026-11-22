import { Router, Request, Response } from 'express';
import { getAllAssets, getAssetByIdOrCode, createAsset, adjustAssetStock } from '../services/dataService.js';
import { authenticateJWT, requireRole, AuthRequest } from '../middleware/auth.js';

const router = Router();

// GET /api/assets
router.get('/', async (req: Request, res: Response) => {
  try {
    const { category, stockStatus, search } = req.query as {
      category?: string;
      stockStatus?: string;
      search?: string;
    };
    const assets = await getAllAssets({ category, stockStatus, search });
    return res.json({ count: assets.length, assets });
  } catch (err: any) {
    return res.status(500).json({ message: 'Failed to fetch catalog', error: err.message });
  }
});

// GET /api/assets/export/csv
router.get('/export/csv', async (_req: Request, res: Response) => {
  try {
    const assets = await getAllAssets();
    const headers = [
      'SKU / Code',
      'Item Name',
      'Category Group',
      'Classification',
      'Total Quantity',
      'Available Quantity',
      'Dispatched Quantity',
      'Permanent Quantity',
      'Unit',
      'Location',
      'Status',
      'Tag Status',
    ];

    const rows = assets.map((a: any) => [
      `"${a.code}"`,
      `"${a.name}"`,
      `"${a.categoryLabel || a.category}"`,
      `"${a.classification}"`,
      a.totalQuantity,
      a.availableQuantity,
      a.dispatchedQuantity || 0,
      a.permanentQuantity || 0,
      `"${a.unit || 'units'}"`,
      `"${a.location || 'Central Desk'}"`,
      `"${a.status}"`,
      `"${a.barcodeTagStatus || 'verified'}"`,
    ]);

    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="AssetHub-Stock-Ledger-AY2025.csv"');
    return res.send(csvContent);
  } catch (err: any) {
    return res.status(500).json({ message: 'CSV Export failed', error: err.message });
  }
});

// GET /api/assets/:code
router.get('/:code', async (req: Request, res: Response) => {
  try {
    const asset = await getAssetByIdOrCode(req.params.code);
    if (!asset) {
      return res.status(404).json({ message: 'Asset not found in catalog' });
    }
    return res.json({ asset });
  } catch (err: any) {
    return res.status(500).json({ message: 'Failed to find asset', error: err.message });
  }
});

// POST /api/assets (Admin only)
router.post('/', authenticateJWT, requireRole(['admin']), async (req: AuthRequest, res: Response) => {
  try {
    const { name, category, classification, description, totalQuantity, minThreshold, location, unit, isConsumable } = req.body;
    if (!name || !category) {
      return res.status(400).json({ message: 'Name and category are required' });
    }

    const newAsset = await createAsset({
      name,
      category,
      categoryLabel:
        category === 'stationery'
          ? 'Classroom Stationery'
          : category === 'it'
          ? 'Technical & IT Equipment'
          : category === 'audio'
          ? 'Audio & Presentation'
          : 'Recording & Accessories',
      classification: classification || (isConsumable ? 'Consumable' : 'Reusable'),
      description: description || 'Departmental resource unit',
      totalQuantity: Number(totalQuantity || 1),
      availableQuantity: Number(totalQuantity || 1),
      minThreshold: Number(minThreshold || 2),
      location: location || 'Central Tech Bay 2',
      unit: unit || 'units',
      isConsumable: !!isConsumable,
      isReusable: !isConsumable,
    });

    return res.status(201).json({ message: 'Asset catalog entry created', asset: newAsset });
  } catch (err: any) {
    return res.status(500).json({ message: 'Asset creation failed', error: err.message });
  }
});

// PATCH /api/assets/:code/adjust-stock
router.patch('/:code/adjust-stock', authenticateJWT, async (req: AuthRequest, res: Response) => {
  try {
    const { availableQuantity } = req.body;
    if (availableQuantity === undefined || isNaN(Number(availableQuantity))) {
      return res.status(400).json({ message: 'Valid availableQuantity is required' });
    }

    const updated = await adjustAssetStock(
      req.params.code,
      Math.max(0, Number(availableQuantity)),
      req.user?.name || 'Staff'
    );
    return res.json({ message: 'Stock updated', asset: updated });
  } catch (err: any) {
    return res.status(500).json({ message: 'Stock adjustment failed', error: err.message });
  }
});

export default router;
