import mongoose, { Document, Schema } from 'mongoose';

export type BookingType = 'temporary' | 'permanent' | 'consumable';
export type BookingStatus = 'pending' | 'approved' | 'rejected' | 'dispatched' | 'returned' | 'cancelled';

export interface IBooking {
  _id?: string;
  reqId: string;
  type: BookingType;
  assetId: string;
  assetCode: string;
  assetName: string;
  assetCategory?: string;
  requesterId?: string;
  requesterName: string;
  requesterRole: string;
  requesterDept: string;
  requesterEmail: string;
  venue?: string;
  purpose?: string;
  bookingDate?: string;
  startTime?: string;
  endTime?: string;
  grantId?: string;
  tenancyDuration?: string;
  quantity: number;
  pickupLocation?: string;
  status: BookingStatus;
  hasConflict: boolean;
  conflictDetails?: string;
  rejectReason?: string;
  rejectRemarks?: string;
  approvedBy?: string;
  approvedAt?: Date;
  dispatchedAt?: Date;
  returnedAt?: Date;
  returnCondition?: 'intact' | 'damaged' | 'minor-wear';
  returnAuditedBy?: string;
}

const BookingSchema = new Schema<IBooking>(
  {
    _id: { type: String, default: () => new mongoose.Types.ObjectId().toString() },
    reqId: { type: String, required: true, unique: true, uppercase: true, trim: true },
    type: {
      type: String,
      required: true,
      enum: ['temporary', 'permanent', 'consumable'],
    },
    assetId: { type: String, required: true },
    assetCode: { type: String, required: true },
    assetName: { type: String, required: true },
    assetCategory: { type: String },
    requesterId: { type: String },
    requesterName: { type: String, required: true },
    requesterRole: { type: String, default: 'Faculty' },
    requesterDept: { type: String, default: 'Department of Computer Science & Engineering' },
    requesterEmail: { type: String, required: true },
    venue: { type: String },
    purpose: { type: String },
    bookingDate: { type: String },
    startTime: { type: String },
    endTime: { type: String },
    grantId: { type: String },
    tenancyDuration: { type: String },
    quantity: { type: Number, default: 1, min: 1 },
    pickupLocation: { type: String, default: 'Central Tech Desk' },
    status: {
      type: String,
      enum: ['pending', 'approved', 'rejected', 'dispatched', 'returned', 'cancelled'],
      default: 'pending',
    },
    hasConflict: { type: Boolean, default: false },
    conflictDetails: { type: String },
    rejectReason: { type: String },
    rejectRemarks: { type: String },
    approvedBy: { type: String },
    approvedAt: { type: Date },
    dispatchedAt: { type: Date },
    returnedAt: { type: Date },
    returnCondition: {
      type: String,
      enum: ['intact', 'damaged', 'minor-wear'],
      default: 'intact',
    },
    returnAuditedBy: { type: String },
  },
  { timestamps: true }
);

export const BookingModel = mongoose.models.Booking || mongoose.model<IBooking>('Booking', BookingSchema);
