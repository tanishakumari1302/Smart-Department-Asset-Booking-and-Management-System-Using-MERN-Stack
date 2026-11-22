import React, { useState, useEffect } from 'react';
import { Asset, AssetCondition } from '../../types';

interface StockAdjustModalProps {
  asset: Asset | null;
  isOpen: boolean;
  onClose: () => void;
  onConfirmAdjust: (
    code: string,
    newAvailableQuantity: number,
    condition?: AssetCondition,
    conditionRemarks?: string
  ) => void;
}

export const StockAdjustModal: React.FC<StockAdjustModalProps> = ({
  asset,
  isOpen,
  onClose,
  onConfirmAdjust,
}) => {
  const [qty, setQty] = useState<number>(0);
  const [condition, setCondition] = useState<AssetCondition>('good');
  const [conditionRemarks, setConditionRemarks] = useState('');

  useEffect(() => {
    if (asset) {
      setQty(asset.availableQuantity);
      setCondition(asset.condition || (asset.status === 'maintenance' ? 'repair' : 'good'));
      setConditionRemarks(asset.conditionRemarks || '');
    }
  }, [asset]);

  if (!isOpen || !asset) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onConfirmAdjust(asset.code, qty, condition, conditionRemarks);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#0e1c2f]/50 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="bg-white rounded-xl max-w-md w-full p-6 shadow-2xl border border-[#cbdbf5] flex flex-col gap-4">
        <div className="flex items-center justify-between pb-2 border-b border-[#e5eeff]">
          <div className="flex items-center gap-2 text-[#426086]">
            <span className="material-symbols-outlined text-[22px]">tune</span>
            <h3 className="text-base font-bold text-[#0b1c30]">Adjust Asset & Condition</h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-[#44474c] hover:text-[#0b1c30] p-1 rounded-lg"
          >
            <span className="material-symbols-outlined text-[20px]">close</span>
          </button>
        </div>

        <div className="flex flex-col gap-1 p-2.5 bg-[#eff4ff]/50 rounded-lg border border-[#e5eeff]">
          <div className="flex items-center gap-2">
            <span className="font-mono text-xs font-bold text-[#0e1c2f] bg-white px-2 py-0.5 rounded border border-[#cbdbf5]">
              {asset.code}
            </span>
            <span className="text-xs font-semibold text-[#0b1c30] truncate">{asset.name}</span>
          </div>
          <div className="flex items-center justify-between text-xs text-[#44474c] mt-1">
            <span>
              Category: <span className="capitalize font-medium">{asset.categoryLabel || asset.category}</span>
            </span>
            <span>
              Total Pool: <span className="font-bold text-[#0b1c30]">{asset.totalQuantity}</span>
            </span>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-3.5 text-xs">
          {/* Quantity Counter */}
          <div className="flex flex-col gap-1.5">
            <label className="font-semibold text-[#0b1c30]">
              Available / Ready Units
            </label>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setQty((prev) => Math.max(0, prev - 1))}
                className="w-10 h-10 rounded-lg bg-[#eff4ff] text-[#0b1c30] font-bold text-lg hover:bg-[#dce9ff] flex items-center justify-center border border-[#cbdbf5]"
              >
                -
              </button>
              <input
                type="number"
                min={0}
                max={asset.totalQuantity * 3}
                value={qty}
                onChange={(e) => setQty(Number(e.target.value))}
                className="flex-1 h-10 px-3 text-center rounded-lg bg-[#eff4ff] text-[#0b1c30] font-bold text-sm focus:outline-none focus:ring-1 focus:ring-[#009299] border border-[#cbdbf5]"
              />
              <button
                type="button"
                onClick={() => setQty((prev) => prev + 1)}
                className="w-10 h-10 rounded-lg bg-[#eff4ff] text-[#0b1c30] font-bold text-lg hover:bg-[#dce9ff] flex items-center justify-center border border-[#cbdbf5]"
              >
                +
              </button>
            </div>
            {qty <= asset.minThreshold && (
              <span className="text-[11px] text-[#ba1a1a] font-semibold flex items-center gap-1 mt-1">
                <span className="material-symbols-outlined text-[14px]">warning</span>
                Level will trigger Low Stock warning (Threshold: {asset.minThreshold})
              </span>
            )}
          </div>

          {/* Physical Condition Dropdown */}
          <div className="flex flex-col gap-1">
            <label className="font-semibold text-[#0b1c30] flex items-center gap-1">
              <span className="material-symbols-outlined text-[15px] text-[#009299]">verified</span>
              Physical Condition Status
            </label>
            <select
              value={condition}
              onChange={(e) => setCondition(e.target.value as AssetCondition)}
              className="h-9 px-3 rounded-lg bg-[#eff4ff] text-[#0b1c30] font-semibold focus:outline-none focus:ring-1 focus:ring-[#009299] border border-[#cbdbf5]"
            >
              <option value="new">🟢 Brand New (Unopened / Box-Pack)</option>
              <option value="good">🔵 Operational / Good (Working Fine)</option>
              <option value="repair">🟡 Under Repair / Maintenance (Tech Bench)</option>
              <option value="damaged">🔴 Damaged / Defective (Out of Service)</option>
            </select>
          </div>

          {/* Condition Remarks */}
          <div className="flex flex-col gap-1">
            <label className="font-semibold text-[#0b1c30] flex items-center gap-1">
              <span className="material-symbols-outlined text-[15px] text-[#426086]">edit_note</span>
              Condition Remarks / Inspection Note
            </label>
            <textarea
              rows={2}
              value={conditionRemarks}
              onChange={(e) => setConditionRemarks(e.target.value)}
              placeholder="e.g. Broken hinge, HDMI socket loose, tested working, fresh replacement..."
              className="p-2.5 rounded-lg bg-[#eff4ff] text-[#0b1c30] text-xs focus:outline-none focus:ring-1 focus:ring-[#009299] border border-[#cbdbf5] resize-none"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#e5eeff]">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 font-semibold text-[#44474c] hover:bg-[#eff4ff] rounded-lg transition-all"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 font-semibold bg-[#0e1c2f] text-white hover:bg-[#426086] rounded-lg shadow-sm transition-all flex items-center gap-1.5"
            >
              <span className="material-symbols-outlined text-[16px]">save</span>
              <span>Update Asset Status</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
