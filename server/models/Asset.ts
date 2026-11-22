import mongoose, { Document, Schema } from 'mongoose';

export type AssetCategory = 'stationery' | 'it' | 'audio' | 'recording';

export interface IAsset {
  _id?: string;
  code: string;
  name: string;
  category: AssetCategory;
  categoryLabel: string;
  classification: string;
  description: string;
  totalQuantity: number;
  availableQuantity: number;
  dispatchedQuantity: number;
  permanentQuantity: number;
  minThreshold: number;
  isConsumable: boolean;
  isReusable: boolean;
  unit: string;
  location: string;
  serialNumber?: string;
  specs?: string;
  status: 'operational' | 'low-stock' | 'maintenance' | 'dispatched';
  barcodeTagStatus: 'verified' | 'pending-retag' | 'unassigned';
}

const AssetSchema = new Schema<IAsset>(
  {
    _id: { type: String, default: () => new mongoose.Types.ObjectId().toString() },
    code: { type: String, required: true, unique: true, uppercase: true, trim: true },
    name: { type: String, required: true },
    category: {
      type: String,
      required: true,
      enum: ['stationery', 'it', 'audio', 'recording'],
    },
    categoryLabel: { type: String, required: true },
    classification: { type: String, required: true },
    description: { type: String, required: true },
    totalQuantity: { type: Number, required: true, min: 0 },
    availableQuantity: { type: Number, required: true, min: 0 },
    dispatchedQuantity: { type: Number, default: 0, min: 0 },
    permanentQuantity: { type: Number, default: 0, min: 0 },
    minThreshold: { type: Number, default: 2, min: 0 },
    isConsumable: { type: Boolean, default: false },
    isReusable: { type: Boolean, default: true },
    unit: { type: String, default: 'units' },
    location: { type: String, default: 'Central Tech Desk (Bay 2)' },
    serialNumber: { type: String },
    specs: { type: String },
    status: {
      type: String,
      enum: ['operational', 'low-stock', 'maintenance', 'dispatched'],
      default: 'operational',
    },
    barcodeTagStatus: {
      type: String,
      enum: ['verified', 'pending-retag', 'unassigned'],
      default: 'verified',
    },
  },
  { timestamps: true }
);

export const AssetModel = mongoose.models.Asset || mongoose.model<IAsset>('Asset', AssetSchema);
