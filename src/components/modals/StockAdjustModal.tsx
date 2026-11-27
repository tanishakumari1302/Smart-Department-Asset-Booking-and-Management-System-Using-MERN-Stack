import React, { useState, useEffect } from 'react';
import { Asset, AssetCondition, Department } from '../../types';

interface StockAdjustModalProps {
  asset: Asset | null;
  isOpen: boolean;
  departments?: Department[];
  onClose: () => void;
  onConfirmAdjust: (
    code: string,
    newAvailableQuantity: number,
    condition?: AssetCondition,
    conditionRemarks?: string
  ) => void;
  onSaveFullAsset?: (code: string, updates: Partial<Asset>) => Promise<void>;
  onDeleteAsset?: (code: string) => Promise<void>;
}

const CATEGORY_OPTIONS: { value: Asset['category']; label: string }[] = [
  { value: 'it', label: 'IT & Computing Hardware' },
  { value: 'audio', label: 'Audio & Visual Systems' },
  { value: 'recording', label: 'Recording & Production Gear' },
  { value: 'stationery', label: 'Classroom Stationery & Supplies' },
];

export const StockAdjustModal: React.FC<StockAdjustModalProps> = ({
  asset,
  isOpen,
  departments = [],
  onClose,
  onConfirmAdjust,
  onSaveFullAsset,
  onDeleteAsset,
}) => {
  const [name, setName] = useState('');
  const [category, setCategory] = useState<Asset['category']>('it');
  const [classification, setClassification] = useState('Reusable');
  const [department, setDepartment] = useState('');
  const [location, setLocation] = useState('');
  const [serialNumber, setSerialNumber] = useState('');
  const [barcodeValue, setBarcodeValue] = useState('');
  const [barcodeTagStatus, setBarcodeTagStatus] = useState<Asset['barcodeTagStatus']>('verified');
  const [unit, setUnit] = useState('units');
  const [totalQty, setTotalQty] = useState<number>(1);
  const [availQty, setAvailQty] = useState<number>(0);
  const [minThreshold, setMinThreshold] = useState<number>(2);
  const [isConsumable, setIsConsumable] = useState(false);
  const [condition, setCondition] = useState<AssetCondition>('good');
  const [conditionRemarks, setConditionRemarks] = useState('');
  const [description, setDescription] = useState('');
  const [specs, setSpecs] = useState('');
  const [saving, setSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (asset) {
      setName(asset.name || '');
      setCategory(asset.category || 'it');
      setClassification(asset.classification || (asset.isConsumable ? 'Consumable' : 'Reusable'));
      setDepartment(asset.department || 'Central College Lab & Facilities Node');
      setLocation(asset.location || '');
      setSerialNumber(asset.serialNumber || '');
      setBarcodeValue(asset.barcodeValue !== undefined ? asset.barcodeValue : asset.code);
      setBarcodeTagStatus(asset.barcodeTagStatus || 'verified');
      setUnit(asset.unit || 'units');
      setTotalQty(asset.totalQuantity ?? 1);
      setAvailQty(asset.availableQuantity ?? 0);
      setMinThreshold(asset.minThreshold ?? 2);
      setIsConsumable(!!asset.isConsumable);
      setCondition(asset.condition || (asset.status === 'maintenance' ? 'repair' : 'good'));
      setConditionRemarks(asset.conditionRemarks || '');
      setDescription(asset.description || '');
      setSpecs(asset.specs || '');
      setConfirmDelete(false);
    }
  }, [asset]);

  if (!isOpen || !asset) return null;

  const deptNames =
    departments.length > 0
      ? departments.map((d) => d.name)
      : [
          'Department of Computer Science & Engineering',
          'Department of Computer Applications',
          'Department of Electronics & Communication',
          'Department of Mechanical Engineering',
          'Department of Management Studies',
          'Central College Lab & Facilities Node',
        ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const catLabel =
        CATEGORY_OPTIONS.find((c) => c.value === category)?.label || asset.categoryLabel || category;
      const safeAvail = Math.max(0, Number(availQty) || 0);
      const safeTotal = Math.max(safeAvail, Number(totalQty) || safeAvail);

      if (onSaveFullAsset) {
        await onSaveFullAsset(asset.code, {
          name: name.trim() || asset.name,
          category,
          categoryLabel: catLabel,
          classification: isConsumable ? 'Consumable' : classification.trim() || 'Reusable',
          department: department.trim() || asset.department,
          location: location.trim() || asset.location,
          serialNumber: serialNumber.trim(),
          barcodeValue: barcodeValue.trim(),
          barcodeTagStatus: barcodeValue.trim() ? barcodeTagStatus : 'unlabeled',
          unit: unit.trim() || 'units',
          totalQuantity: safeTotal,
          availableQuantity: safeAvail,
          minThreshold: Math.max(0, Number(minThreshold) || 0),
          isConsumable,
          isReusable: !isConsumable,
          condition,
          conditionRemarks: conditionRemarks.trim(),
          description: description.trim(),
          specs: specs.trim(),
        });
      } else {
        onConfirmAdjust(asset.code, safeAvail, condition, conditionRemarks);
      }
      onClose();
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!onDeleteAsset) return;
    setDeleting(true);
    try {
      await onDeleteAsset(asset.code);
      onClose();
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-[#0e1c2f]/60 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[92vh] overflow-hidden shadow-2xl border border-[#cbdbf5] flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 flex items-center justify-between border-b border-[#e5eeff] bg-[#f8fafd]">
          <div className="flex items-center gap-2.5 text-[#0e1c2f]">
            <div className="w-9 h-9 rounded-xl bg-[#0e1c2f] text-[#75f5fd] flex items-center justify-center">
              <span className="material-symbols-outlined text-[20px]">edit_square</span>
            </div>
            <div>
              <h3 className="text-base font-bold text-[#0b1c30]">Edit Asset, Stock &amp; Condition</h3>
              <span className="text-[11px] font-mono text-[#426086]">
                SKU: {asset.code} • Full Admin / Office Staff Edit Access
              </span>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-[#44474c] hover:text-[#0b1c30] p-1.5 rounded-lg hover:bg-[#eff4ff] cursor-pointer"
          >
            <span className="material-symbols-outlined text-[20px]">close</span>
          </button>
        </div>

        {/* Scrollable Form */}
        <form id="stock-adjust-form" onSubmit={handleSubmit} className="p-6 overflow-y-auto flex-1 flex flex-col gap-4 text-xs">
          {/* Asset Name & Category */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="sm:col-span-2">
              <label className="block font-bold text-[#0b1c30] mb-1">Asset Name *</label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full h-9 px-3 rounded-lg bg-[#eff4ff]/60 border border-[#cbdbf5] text-[#0b1c30] font-semibold focus:outline-none focus:ring-1 focus:ring-[#009299] focus:bg-white"
              />
            </div>

            <div>
              <label className="block font-bold text-[#0b1c30] mb-1">Category</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as Asset['category'])}
                className="w-full h-9 px-3 rounded-lg bg-white border border-[#cbdbf5] text-[#0b1c30] font-semibold focus:outline-none focus:ring-1 focus:ring-[#009299]"
              >
                {CATEGORY_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block font-bold text-[#0b1c30] mb-1">Classification</label>
              <input
                type="text"
                value={classification}
                onChange={(e) => setClassification(e.target.value)}
                placeholder="e.g. Reusable, High-Value IT, Consumable"
                className="w-full h-9 px-3 rounded-lg bg-[#eff4ff]/60 border border-[#cbdbf5] text-[#0b1c30] focus:outline-none focus:ring-1 focus:ring-[#009299] focus:bg-white"
              />
            </div>

            <div>
              <label className="block font-bold text-[#0b1c30] mb-1">Department</label>
              <input
                list="asset-dept-list"
                value={department}
                onChange={(e) => setDepartment(e.target.value)}
                className="w-full h-9 px-3 rounded-lg bg-[#eff4ff]/60 border border-[#cbdbf5] text-[#0b1c30] focus:outline-none focus:ring-1 focus:ring-[#009299] focus:bg-white"
              />
              <datalist id="asset-dept-list">
                {deptNames.map((d) => (
                  <option key={d} value={d} />
                ))}
              </datalist>
            </div>

            <div>
              <label className="block font-bold text-[#0b1c30] mb-1">Storage Location / Room</label>
              <input
                type="text"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="e.g. Main Store Room, Lab 101"
                className="w-full h-9 px-3 rounded-lg bg-[#eff4ff]/60 border border-[#cbdbf5] text-[#0b1c30] focus:outline-none focus:ring-1 focus:ring-[#009299] focus:bg-white"
              />
            </div>

            <div>
              <label className="block font-bold text-[#0b1c30] mb-1">Serial Number (Optional)</label>
              <input
                type="text"
                value={serialNumber}
                onChange={(e) => setSerialNumber(e.target.value)}
                placeholder="e.g. 6LLWH8AY905198Z"
                className="w-full h-9 px-3 rounded-lg bg-[#eff4ff]/60 border border-[#cbdbf5] text-[#0b1c30] font-mono focus:outline-none focus:ring-1 focus:ring-[#009299] focus:bg-white"
              />
            </div>

            <div>
              <label className="block font-bold text-[#0b1c30] mb-1">Physical Machine Barcode</label>
              <input
                type="text"
                value={barcodeValue}
                onChange={(e) => setBarcodeValue(e.target.value)}
                placeholder="Scan or type product barcode (e.g. 890123...)"
                className="w-full h-9 px-3 rounded-lg bg-[#eff4ff]/60 border border-[#cbdbf5] text-[#0b1c30] font-mono focus:outline-none focus:ring-1 focus:ring-[#009299] focus:bg-white"
              />
            </div>

            <div>
              <label className="block font-bold text-[#0b1c30] mb-1">Barcode Verification Status</label>
              <select
                value={barcodeTagStatus}
                onChange={(e) => setBarcodeTagStatus(e.target.value as Asset['barcodeTagStatus'])}
                className="w-full h-9 px-3 rounded-lg bg-[#eff4ff]/60 border border-[#cbdbf5] text-[#0b1c30] font-semibold focus:outline-none focus:ring-1 focus:ring-[#009299] focus:bg-white"
              >
                <option value="verified">Verified</option>
                <option value="pending">Pending Verification</option>
                <option value="unlabeled">Unlabeled / Removed</option>
              </select>
            </div>

            <div>
              <label className="block font-bold text-[#0b1c30] mb-1">Unit Label</label>
              <input
                type="text"
                value={unit}
                onChange={(e) => setUnit(e.target.value)}
                placeholder="units, boxes, packs, cables"
                className="w-full h-9 px-3 rounded-lg bg-[#eff4ff]/60 border border-[#cbdbf5] text-[#0b1c30] focus:outline-none focus:ring-1 focus:ring-[#009299] focus:bg-white"
              />
            </div>
          </div>

          {/* Stock Controls */}
          <div className="p-3.5 rounded-xl bg-[#eff4ff]/60 border border-[#cbdbf5] grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block font-bold text-[#0b1c30] mb-1">Available / Ready Units</label>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setAvailQty((prev) => Math.max(0, prev - 1))}
                  className="w-9 h-9 rounded-lg bg-white text-[#0b1c30] font-bold text-base hover:bg-[#dce9ff] border border-[#cbdbf5] cursor-pointer"
                >
                  -
                </button>
                <input
                  type="number"
                  min={0}
                  value={availQty}
                  onChange={(e) => {
                    const next = Math.max(0, Number(e.target.value));
                    setAvailQty(next);
                    if (next > totalQty) setTotalQty(next);
                  }}
                  className="flex-1 min-w-0 h-9 px-2 text-center rounded-lg bg-white text-[#0b1c30] font-bold text-sm border border-[#cbdbf5] focus:outline-none focus:ring-1 focus:ring-[#009299]"
                />
                <button
                  type="button"
                  onClick={() => {
                    const next = availQty + 1;
                    setAvailQty(next);
                    if (next > totalQty) setTotalQty(next);
                  }}
                  className="w-9 h-9 rounded-lg bg-white text-[#0b1c30] font-bold text-base hover:bg-[#dce9ff] border border-[#cbdbf5] cursor-pointer"
                >
                  +
                </button>
              </div>
            </div>

            <div>
              <label className="block font-bold text-[#0b1c30] mb-1">Total Pool Quantity</label>
              <input
                type="number"
                min={0}
                value={totalQty}
                onChange={(e) => setTotalQty(Math.max(0, Number(e.target.value)))}
                className="w-full h-9 px-3 rounded-lg bg-white text-[#0b1c30] font-bold border border-[#cbdbf5] focus:outline-none focus:ring-1 focus:ring-[#009299]"
              />
            </div>

            <div>
              <label className="block font-bold text-[#0b1c30] mb-1">Low-Stock Alert Limit</label>
              <input
                type="number"
                min={0}
                value={minThreshold}
                onChange={(e) => setMinThreshold(Math.max(0, Number(e.target.value)))}
                className="w-full h-9 px-3 rounded-lg bg-white text-[#0b1c30] font-bold border border-[#cbdbf5] focus:outline-none focus:ring-1 focus:ring-[#009299]"
              />
              <span className="text-[10px] text-[#426086] block mt-1">
                Alert triggers if Available ≤ {minThreshold} {unit}
              </span>
            </div>

            <div className="sm:col-span-3 flex items-center justify-between pt-1">
              <label className="inline-flex items-center gap-2 cursor-pointer font-semibold text-[#0b1c30]">
                <input
                  type="checkbox"
                  checked={isConsumable}
                  onChange={(e) => setIsConsumable(e.target.checked)}
                  className="rounded border-[#cbdbf5] text-[#009299] focus:ring-[#009299]"
                />
                <span>Consumable Item (e.g. Markers, Dusters, Pens — non-returnable)</span>
              </label>

              {availQty <= minThreshold && (
                <span className="text-[11px] text-[#ba1a1a] font-semibold flex items-center gap-1">
                  <span className="material-symbols-outlined text-[14px]">warning</span>
                  Low Stock Alert
                </span>
              )}
            </div>
          </div>

          {/* Condition & Remarks */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="font-bold text-[#0b1c30] flex items-center gap-1 mb-1">
                <span className="material-symbols-outlined text-[15px] text-[#009299]">verified</span>
                Physical Condition Status
              </label>
              <select
                value={condition}
                onChange={(e) => setCondition(e.target.value as AssetCondition)}
                className="w-full h-9 px-3 rounded-lg bg-white text-[#0b1c30] font-semibold focus:outline-none focus:ring-1 focus:ring-[#009299] border border-[#cbdbf5]"
              >
                <option value="new">Brand New (Unopened / Box-Pack)</option>
                <option value="good">Operational / Good (Working Fine)</option>
                <option value="repair">Under Repair / Maintenance</option>
                <option value="damaged">Damaged / Defective (Out of Service)</option>
              </select>
            </div>

            <div>
              <label className="font-bold text-[#0b1c30] flex items-center gap-1 mb-1">
                <span className="material-symbols-outlined text-[15px] text-[#426086]">edit_note</span>
                Condition Remarks
              </label>
              <input
                type="text"
                value={conditionRemarks}
                onChange={(e) => setConditionRemarks(e.target.value)}
                placeholder="e.g. Tested working, HDMI port checked..."
                className="w-full h-9 px-3 rounded-lg bg-[#eff4ff]/60 text-[#0b1c30] focus:outline-none focus:ring-1 focus:ring-[#009299] focus:bg-white border border-[#cbdbf5]"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block font-bold text-[#0b1c30] mb-1">Description</label>
              <textarea
                rows={2}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Brief asset description..."
                className="w-full p-2.5 rounded-lg bg-[#eff4ff]/60 border border-[#cbdbf5] text-[#0b1c30] focus:outline-none focus:ring-1 focus:ring-[#009299] focus:bg-white resize-none"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block font-bold text-[#0b1c30] mb-1">Technical Specs (Optional)</label>
              <input
                type="text"
                value={specs}
                onChange={(e) => setSpecs(e.target.value)}
                placeholder="e.g. 1080p, 100Hz, HDMI + VGA, Warranty 3 yrs"
                className="w-full h-9 px-3 rounded-lg bg-[#eff4ff]/60 border border-[#cbdbf5] text-[#0b1c30] focus:outline-none focus:ring-1 focus:ring-[#009299] focus:bg-white"
              />
            </div>
          </div>

        </form>

        {/* Sticky Always-Visible Footer Buttons */}
        <div className="px-6 py-3.5 bg-[#f8fafd] border-t border-[#e5eeff] shrink-0 flex flex-wrap items-center justify-between gap-2 text-xs">
          {onDeleteAsset ? (
            confirmDelete ? (
              <div className="flex items-center gap-2 bg-rose-50 border border-rose-200 px-3 py-1.5 rounded-lg">
                <span className="text-[11px] font-bold text-rose-800">Delete {asset.code}?</span>
                <button
                  type="button"
                  disabled={deleting}
                  onClick={handleDelete}
                  className="px-2.5 py-1 rounded bg-rose-600 hover:bg-rose-700 text-white font-bold text-[11px] cursor-pointer disabled:opacity-50"
                >
                  {deleting ? 'Deleting...' : 'Confirm Delete'}
                </button>
                <button
                  type="button"
                  onClick={() => setConfirmDelete(false)}
                  className="px-2 py-1 rounded text-[#44474c] hover:bg-white font-semibold text-[11px] cursor-pointer"
                >
                  No
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setConfirmDelete(true)}
                className="px-3 py-2 font-semibold text-rose-600 hover:bg-rose-50 rounded-lg border border-rose-200 transition-all flex items-center gap-1 cursor-pointer"
              >
                <span className="material-symbols-outlined text-[16px]">delete</span>
                <span>Delete Asset</span>
              </button>
            )
          ) : (
            <span />
          )}

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 font-semibold text-[#44474c] hover:bg-[#eff4ff] rounded-lg transition-all cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              form="stock-adjust-form"
              disabled={saving}
              className="px-4 py-2 font-bold bg-[#0e1c2f] text-white hover:bg-[#426086] rounded-lg shadow-sm transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-60"
            >
              <span className="material-symbols-outlined text-[16px]">save</span>
              <span>{saving ? 'Saving...' : 'Save All Changes'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
