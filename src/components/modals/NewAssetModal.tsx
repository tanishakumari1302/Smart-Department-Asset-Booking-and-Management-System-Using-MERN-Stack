import React, { useState } from 'react';
import { AssetCategory, AssetCondition } from '../../types';

interface NewAssetModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAssetCreated: (assetData: any) => void;
}

export const NewAssetModal: React.FC<NewAssetModalProps> = ({
  isOpen,
  onClose,
  onAssetCreated,
}) => {
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [category, setCategory] = useState<AssetCategory>('it');
  const [classification, setClassification] = useState('Standard Hardware');
  const [description, setDescription] = useState('');
  const [totalQuantity, setTotalQuantity] = useState(5);
  const [minThreshold, setMinThreshold] = useState(2);
  const [location, setLocation] = useState('Central Tech Desk (Bay 2)');
  const [isConsumable, setIsConsumable] = useState(false);
  const [condition, setCondition] = useState<AssetCondition>('new');
  const [conditionRemarks, setConditionRemarks] = useState('');
  const [barcodeValue, setBarcodeValue] = useState('');
  const [barcodeTagStatus, setBarcodeTagStatus] = useState<'verified' | 'pending' | 'unlabeled'>('verified');

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    const cleanBarcode = barcodeValue.trim();
    onAssetCreated({
      name: name.trim(),
      code: code.trim().toUpperCase() || undefined,
      barcodeValue: cleanBarcode || undefined,
      barcodeTagStatus: cleanBarcode ? barcodeTagStatus : barcodeTagStatus === 'unlabeled' ? 'unlabeled' : 'pending',
      category,
      classification,
      description: description.trim() || 'Departmental resource unit',
      totalQuantity: Number(totalQuantity),
      minThreshold: Number(minThreshold),
      location,
      isConsumable,
      condition,
      conditionRemarks: conditionRemarks.trim() || undefined,
    });
    setName('');
    setCode('');
    setBarcodeValue('');
    setBarcodeTagStatus('verified');
    setDescription('');
    setConditionRemarks('');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-[#0e1c2f]/50 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="bg-white rounded-2xl max-w-lg w-full max-h-[92vh] overflow-hidden shadow-2xl border border-[#cbdbf5] flex flex-col">
        <div className="px-6 py-4 flex items-center justify-between border-b border-[#e5eeff] bg-[#f8fafd] shrink-0">
          <div className="flex items-center gap-2 text-[#0e1c2f]">
            <span className="material-symbols-outlined text-[24px]">add_box</span>
            <h3 className="text-base font-bold text-[#0b1c30]">Add New Asset to Catalog</h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-[#44474c] hover:text-[#0b1c30] p-1 rounded-lg hover:bg-[#eff4ff] cursor-pointer"
          >
            <span className="material-symbols-outlined text-[20px]">close</span>
          </button>
        </div>

        <form id="new-asset-form" onSubmit={handleSubmit} className="p-6 overflow-y-auto flex-1 flex flex-col gap-3.5 text-xs">
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1">
              <label className="font-semibold text-[#0b1c30]">Asset Name *</label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. HDMI Splitter 4-Port"
                className="h-9 px-3 rounded-lg bg-[#eff4ff] text-[#0b1c30] focus:outline-none focus:ring-1 focus:ring-[#009299] border border-[#cbdbf5]"
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="font-semibold text-[#0b1c30]">Asset SKU / Code (Optional)</label>
              <input
                type="text"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder="Auto-generated if empty"
                className="h-9 px-3 rounded-lg bg-[#eff4ff] text-[#0b1c30] font-mono focus:outline-none focus:ring-1 focus:ring-[#009299] border border-[#cbdbf5]"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 p-3 rounded-lg bg-[#f8faff] border border-[#cbdbf5]">
            <div className="flex flex-col gap-1">
              <label className="font-semibold text-[#0b1c30] flex items-center gap-1">
                <span className="material-symbols-outlined text-[15px] text-[#009299]">barcode</span>
                <span>Physical Machine Barcode</span>
              </label>
              <input
                type="text"
                value={barcodeValue}
                onChange={(e) => setBarcodeValue(e.target.value)}
                placeholder="Scan or type e.g. 8901425001234"
                className="h-9 px-3 rounded-lg bg-white text-[#0b1c30] font-mono focus:outline-none focus:ring-1 focus:ring-[#009299] border border-[#cbdbf5]"
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="font-semibold text-[#0b1c30]">Barcode Tag Status</label>
              <select
                value={barcodeTagStatus}
                onChange={(e) => setBarcodeTagStatus(e.target.value as 'verified' | 'pending' | 'unlabeled')}
                className="h-9 px-2.5 rounded-lg bg-white text-[#0b1c30] font-medium focus:outline-none focus:ring-1 focus:ring-[#009299] border border-[#cbdbf5]"
              >
                <option value="verified">Verified (Machine-Scanned)</option>
                <option value="pending">Pending Verification</option>
                <option value="unlabeled">No Barcode / Unlabeled</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1">
              <label className="font-semibold text-[#0b1c30]">Catalog Category</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as AssetCategory)}
                className="h-9 px-3 rounded-lg bg-[#eff4ff] text-[#0b1c30] focus:outline-none focus:ring-1 focus:ring-[#009299] border border-[#cbdbf5]"
              >
                <option value="stationery">Classroom Stationery</option>
                <option value="it">Technical & IT Equipment</option>
                <option value="audio">Audio & Presentation</option>
                <option value="recording">Recording & Accessories</option>
              </select>
            </div>
            <div className="flex flex-col gap-1">
              <label className="font-semibold text-[#0b1c30]">Classification Label</label>
              <input
                type="text"
                value={classification}
                onChange={(e) => setClassification(e.target.value)}
                placeholder="e.g. Interconnect / Reusable"
                className="h-9 px-3 rounded-lg bg-[#eff4ff] text-[#0b1c30] focus:outline-none focus:ring-1 focus:ring-[#009299] border border-[#cbdbf5]"
              />
            </div>
          </div>

          <div className="flex flex-col gap-1">
            <label className="font-semibold text-[#0b1c30]">Description & Specifications</label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Hardware details, brand, resolution, or connectors..."
              className="h-9 px-3 rounded-lg bg-[#eff4ff] text-[#0b1c30] focus:outline-none focus:ring-1 focus:ring-[#009299] border border-[#cbdbf5]"
            />
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="flex flex-col gap-1">
              <label className="font-semibold text-[#0b1c30]">Total Quantity</label>
              <input
                type="number"
                min={1}
                value={totalQuantity}
                onChange={(e) => setTotalQuantity(Number(e.target.value))}
                className="h-9 px-3 rounded-lg bg-[#eff4ff] text-[#0b1c30] focus:outline-none focus:ring-1 focus:ring-[#009299] border border-[#cbdbf5]"
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="font-semibold text-[#0b1c30]">Min Alert Threshold</label>
              <input
                type="number"
                min={0}
                value={minThreshold}
                onChange={(e) => setMinThreshold(Number(e.target.value))}
                className="h-9 px-3 rounded-lg bg-[#eff4ff] text-[#0b1c30] focus:outline-none focus:ring-1 focus:ring-[#009299] border border-[#cbdbf5]"
              />
            </div>
            <div className="flex flex-col gap-1 justify-center pt-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={isConsumable}
                  onChange={(e) => setIsConsumable(e.target.checked)}
                  className="rounded text-[#0e1c2f] focus:ring-[#009299]"
                />
                <span className="font-semibold text-[#0b1c30]">Consumable item</span>
              </label>
            </div>
          </div>

          <div className="flex flex-col gap-1">
            <label className="font-semibold text-[#0b1c30]">Storage Location</label>
            <input
              type="text"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="e.g. AV Storage Annex Bay 3"
              className="h-9 px-3 rounded-lg bg-[#eff4ff] text-[#0b1c30] focus:outline-none focus:ring-1 focus:ring-[#009299] border border-[#cbdbf5]"
            />
          </div>

          {/* Asset Physical Condition & Remarks */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3 rounded-lg bg-[#eff4ff]/60 border border-[#cbdbf5]">
            <div className="flex flex-col gap-1">
              <label className="font-semibold text-[#0b1c30] flex items-center gap-1">
                <span className="material-symbols-outlined text-[15px] text-[#009299]">verified</span>
                Physical Condition *
              </label>
              <select
                value={condition}
                onChange={(e) => setCondition(e.target.value as AssetCondition)}
                className="h-9 px-2.5 rounded-lg bg-white text-[#0b1c30] font-medium focus:outline-none focus:ring-1 focus:ring-[#009299] border border-[#cbdbf5]"
              >
                <option value="new">🟢 Brand New (Unopened / Box-Pack)</option>
                <option value="good">🔵 Operational / Good (Ready for use)</option>
                <option value="repair">🟡 Under Repair / Maintenance</option>
                <option value="damaged">🔴 Damaged / Defective (Out of Order)</option>
              </select>
            </div>

            <div className="flex flex-col gap-1">
              <label className="font-semibold text-[#0b1c30] flex items-center gap-1">
                <span className="material-symbols-outlined text-[15px] text-[#426086]">edit_note</span>
                Condition Remarks / Note
              </label>
              <input
                type="text"
                value={conditionRemarks}
                onChange={(e) => setConditionRemarks(e.target.value)}
                placeholder="e.g. Minor scratch, battery healthy, port loose..."
                className="h-9 px-3 rounded-lg bg-white text-[#0b1c30] focus:outline-none focus:ring-1 focus:ring-[#009299] border border-[#cbdbf5]"
              />
            </div>
          </div>

        </form>

        <div className="px-6 py-3.5 bg-[#f8fafd] border-t border-[#e5eeff] shrink-0 flex items-center justify-end gap-2 text-xs">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 font-semibold text-[#44474c] hover:bg-[#eff4ff] rounded-lg transition-all cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="submit"
            form="new-asset-form"
            className="px-4 py-2 font-semibold bg-[#0e1c2f] text-white hover:bg-[#426086] rounded-lg shadow-sm transition-all flex items-center gap-1.5 cursor-pointer"
          >
            <span className="material-symbols-outlined text-[18px]">save</span>
            <span>Register Asset</span>
          </button>
        </div>
      </div>
    </div>
  );
};
