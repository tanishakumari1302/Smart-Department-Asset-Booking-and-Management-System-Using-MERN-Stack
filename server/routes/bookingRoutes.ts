import { Router, Request, Response } from 'express';
import {
  getAllBookings,
  createBooking,
  approveBooking,
  rejectBooking,
  dispatchAsset,
  returnAsset,
  cancelBooking,
  detectBookingConflict,
} from '../services/dataService.js';
import { authenticateJWT, requireRole, AuthRequest } from '../middleware/auth.js';

const router = Router();

// GET /api/bookings
router.get('/', async (req: Request, res: Response) => {
  try {
    const { requesterEmail, status, type } = req.query as {
      requesterEmail?: string;
      status?: string;
      type?: string;
    };
    const bookings = await getAllBookings({ requesterEmail, status, type });
    return res.json({ count: bookings.length, bookings });
  } catch (err: any) {
    return res.status(500).json({ message: 'Failed to fetch bookings', error: err.message });
  }
});

// POST /api/bookings/check-conflict
router.post('/check-conflict', async (req: Request, res: Response) => {
  try {
    const { assetCode, bookingDate, startTime, endTime, excludeReqId } = req.body;
    if (!assetCode || !bookingDate || !startTime || !endTime) {
      return res.status(400).json({ message: 'assetCode, bookingDate, startTime, and endTime are required' });
    }

    const result = await detectBookingConflict({
      assetCode,
      bookingDate,
      startTime,
      endTime,
      excludeReqId,
    });

    return res.json(result);
  } catch (err: any) {
    return res.status(500).json({ message: 'Conflict check failed', error: err.message });
  }
});

// POST /api/bookings
router.post('/', authenticateJWT, async (req: AuthRequest, res: Response) => {
  try {
    const {
      type,
      assetCode,
      venue,
      purpose,
      bookingDate,
      startTime,
      endTime,
      grantId,
      tenancyDuration,
      quantity,
      pickupLocation,
    } = req.body;

    if (!type || !assetCode) {
      return res.status(400).json({ message: 'type and assetCode are required' });
    }

    const booking = await createBooking({
      type,
      assetCode,
      requesterId: req.user?._id || req.user?.id,
      requesterName: req.user?.name || 'Faculty Member',
      requesterRole: req.user?.role || 'faculty',
      requesterDept: req.user?.department || 'Department of Computer Science & Engineering',
      requesterEmail: req.user?.email || 'faculty@college.edu',
      venue: venue || 'Classroom / Lab',
      purpose: purpose || 'Academic instructional session',
      bookingDate,
      startTime,
      endTime,
      grantId,
      tenancyDuration,
      quantity: Number(quantity || 1),
      pickupLocation: pickupLocation || 'Central Tech Desk',
    });

    return res.status(201).json({ message: 'Requisition submitted successfully', booking });
  } catch (err: any) {
    return res.status(400).json({ message: err.message || 'Booking creation failed' });
  }
});

// POST /api/bookings/:reqId/approve (Admin)
router.post('/:reqId/approve', authenticateJWT, requireRole(['admin']), async (req: AuthRequest, res: Response) => {
  try {
    const { isStockIssue } = req.body;
    const actorName = req.user?.name || 'College Administrator';
    const approved = await approveBooking(req.params.reqId, actorName, !!isStockIssue);
    return res.json({ message: 'Booking approved', booking: approved });
  } catch (err: any) {
    return res.status(400).json({ message: err.message || 'Approval failed' });
  }
});

// POST /api/bookings/:reqId/reject (Admin)
router.post('/:reqId/reject', authenticateJWT, requireRole(['admin']), async (req: AuthRequest, res: Response) => {
  try {
    const { reason, remarks } = req.body;
    if (!reason) {
      return res.status(400).json({ message: 'Rejection reason is required' });
    }
    const actorName = req.user?.name || 'College Administrator';
    const rejected = await rejectBooking(req.params.reqId, reason, remarks, actorName);
    return res.json({ message: 'Booking rejected', booking: rejected });
  } catch (err: any) {
    return res.status(400).json({ message: err.message || 'Rejection failed' });
  }
});

// POST /api/bookings/:reqId/dispatch (Tech or Admin)
router.post('/:reqId/dispatch', authenticateJWT, requireRole(['admin', 'tech']), async (req: AuthRequest, res: Response) => {
  try {
    const actorName = req.user?.name || 'Tech Bay 2';
    const dispatched = await dispatchAsset(req.params.reqId, actorName);
    return res.json({ message: 'Asset dispatched', booking: dispatched });
  } catch (err: any) {
    return res.status(400).json({ message: err.message || 'Dispatch failed' });
  }
});

// POST /api/bookings/:reqId/return (Tech or Admin)
router.post('/:reqId/return', authenticateJWT, requireRole(['admin', 'tech']), async (req: AuthRequest, res: Response) => {
  try {
    const { condition } = req.body;
    const actorName = req.user?.name || 'Lab Technical Officer';
    const returned = await returnAsset(req.params.reqId, condition || 'intact', actorName);
    return res.json({ message: 'Asset return recorded', booking: returned });
  } catch (err: any) {
    return res.status(400).json({ message: err.message || 'Return recording failed' });
  }
});

// POST /api/bookings/:reqId/cancel
router.post('/:reqId/cancel', authenticateJWT, async (req: AuthRequest, res: Response) => {
  try {
    const actorName = req.user?.name || 'Faculty';
    const cancelled = await cancelBooking(req.params.reqId, actorName);
    return res.json({ message: 'Booking cancelled', booking: cancelled });
  } catch (err: any) {
    return res.status(400).json({ message: err.message || 'Cancellation failed' });
  }
});

export default router;
