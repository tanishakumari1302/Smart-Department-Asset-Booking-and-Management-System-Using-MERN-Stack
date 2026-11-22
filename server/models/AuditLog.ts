import mongoose, { Document, Schema } from 'mongoose';

export interface IAuditLog {
  _id?: string;
  action: string;
  category: 'booking' | 'inventory' | 'auth' | 'system' | 'return';
  actorName: string;
  actorRole: string;
  targetId?: string;
  targetCode?: string;
  description: string;
  timestamp: Date;
  status: 'success' | 'warning' | 'alert';
}

const AuditLogSchema = new Schema<IAuditLog>(
  {
    _id: { type: String, default: () => new mongoose.Types.ObjectId().toString() },
    action: { type: String, required: true },
    category: {
      type: String,
      enum: ['booking', 'inventory', 'auth', 'system', 'return'],
      default: 'system',
    },
    actorName: { type: String, required: true },
    actorRole: { type: String, required: true },
    targetId: { type: String },
    targetCode: { type: String },
    description: { type: String, required: true },
    timestamp: { type: Date, default: Date.now },
    status: {
      type: String,
      enum: ['success', 'warning', 'alert'],
      default: 'success',
    },
  },
  { timestamps: true }
);

export const AuditLogModel = mongoose.models.AuditLog || mongoose.model<IAuditLog>('AuditLog', AuditLogSchema);
