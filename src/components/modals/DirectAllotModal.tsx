import React, { useState, useEffect, useMemo } from 'react';
import { Asset, Booking, BookingType, FacultyCustodyProfile, MarkerColor } from '../../types';

export interface DirectAllotPayload {
  facultyId: string;
  facultyName: string;
  facultyEmail: string;
  facultyDepartment: string;
  facultyCabin?: string;
  assetCode: string;
  assetName: string;
  assetCategory: Asset['category'];
  isCatalogAsset: boolean;
  allotmentType: BookingType;
  quantity: number;
  venue: string;
  startTime: string;
  endTime: string;
  markerColor?: MarkerColor;
  purpose: string;
  isExtraUnit: boolean;
  existingCustodySummary: string;
}

interface DirectAllotModalProps {
  isOpen: boolean;
  initialFaculty?: FacultyCustodyProfile | null;
  facultyRoster: FacultyCustodyProfile[];
  assets: Asset[];
  bookings: Booking[];
  onClose: () => void;
  onConfirmAllot: (payload: DirectAllotPayload) => Promise<void>;
}

export const DirectAllotModal: React.FC<DirectAllotModalProps> = ({
  isOpen,
  initialFaculty,
  facultyRoster,
  assets,
  bookings,
  onClose,
  onConfirmAllot,
}) => {
  const [selectedFacultyId, setSelectedFacultyId] = useState<string>('');
  const [assetCode, setAssetCode] = useState<string>('');
  const [customAssetName, setCustomAssetName] = useState<string>('');
  const [allotmentType, setAllotmentType] = useState<BookingType>('temporary');
  const [quantity, setQuantity] = useState<number>(1);
  const [venue, setVenue] = useState<string>('');
  const [startTime, setStartTime] = useState<string>('09:30 AM');
  const [endTime, setEndTime] = useState<string>('11:30 AM');
  const [markerColor, setMarkerColor] = useState<string>('none');
  const [purpose, setPurpose] = useState<string>('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    const defaultFac = initialFaculty || facultyRoster[0] || null;
    setSelectedFacultyId(defaultFac?.facultyId || '');
    setVenue(defaultFac?.currentVenue || defaultFac?.cabin || 'Academic Block');
    const firstAvailable = assets.find((a) => (a.availableQuantity || 0) > 0) || assets[0];
    setAssetCode(firstAvailable?.code || '__custom__');
    setCustomAssetName('');
    setAllotmentType(firstAvailable?.isConsumable ? 'consumable' : 'temporary');
    setQuantity(1);
    setMarkerColor('none');
    setPurpose('');
  }, [isOpen, initialFaculty, facultyRoster, assets]);

  const selectedFaculty = useMemo(
    () => facultyRoster.find((f) => f.facultyId === selectedFacultyId) || null,
    [facultyRoster, selectedFacultyId]
  );

  const selectedAsset = useMemo(
    () => (assetCode !== '__custom__' ? assets.find((a) => a.code === assetCode) || null : null),
    [assets, assetCode]
  );

  // Combine current roster custody items + active approved/dispatched bookings for this faculty
  const facultyActiveCustody = useMemo(() => {
    if (!selectedFaculty) return [];
    const emailLower = (selectedFaculty.email || '').toLowerCase();
    const nameLower = (selectedFaculty.facultyName || '').toLowerCase();

    const list: Array<{ code: string; name: string; qty: number; source: string }> = [];
    selectedFaculty.items.forEach((item) => {
      list.push({
        code: item.assetCode,
        name: item.name,
        qty: item.quantity,
        source: 'Custody Desk',
      });
    });

    bookings.forEach((b) => {
      if (b.status !== 'approved' && b.status !== 'dispatched') return;
      const bEmail = (b.requesterEmail || '').toLowerCase();
      const bName = (b.requesterName || '').toLowerCase();
      const matches = (emailLower && bEmail === emailLower) || (nameLower && bName === nameLower);
      if (!matches) return;
      const alreadyListed = list.some(
        (x) => x.code.toLowerCase() === (b.assetCode || '').toLowerCase() && x.name.toLowerCase() === (b.assetName || '').toLowerCase()
      );
      if (!alreadyListed) {
        list.push({
          code: b.assetCode,
          name: b.assetName,
          qty: b.quantity || 1,
          source: b.type === 'permanent' ? 'Permanent' : 'Active Booking',
        });
      }
    });

    return list;
  }, [selectedFaculty, bookings]);

  // Detect if faculty already holds same item or similar IT/hardware item (Extra Unit scenario)
  const extraUnitInfo = useMemo(() => {
    if (!selectedFaculty || facultyActiveCustody.length === 0) {
      return { isExtra: false, reason: '' };
    }
    const targetCode = (selectedAsset?.code || '').toLowerCase();
    const targetName = (selectedAsset?.name || customAssetName || '').toLowerCase();

    const exactMatch = facultyActiveCustody.find(
      (x) =>
        (targetCode && x.code.toLowerCase() === targetCode) ||
        (targetName && x.name.toLowerCase().includes(targetName.slice(0, 12)))
    );
    if (exactMatch) {
      return {
        isExtra: true,
        reason: `${selectedFaculty.facultyName} already holds ${exactMatch.qty}× ${exactMatch.name}. This will be logged as an Extra Unit Allotment.`,
      };
    }

    const isComputingTarget =
      selectedAsset?.category === 'it' ||
      /laptop|pc|computer|desktop|monitor|macbook|projector/i.test(targetName);
    const heldComputing = facultyActiveCustody.find((x) =>
      /laptop|pc|computer|desktop|monitor|macbook|projector|pointer|presenter/i.test(x.name)
    );
    if (isComputingTarget && heldComputing) {
      return {
        isExtra: true,
        reason: `${selectedFaculty.facultyName} already has ${heldComputing.name} in custody. Issuing this as an additional/extra hardware unit.`,
      };
    }

    return { isExtra: false, reason: '' };
  }, [selectedFaculty, facultyActiveCustody, selectedAsset, customAssetName]);

  if (!isOpen) return null;

  const maxAvailable = selectedAsset ? Math.max(0, selectedAsset.availableQuantity || 0) : 99;
  const stockExceeded = !!selectedAsset && quantity > maxAvailable;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFaculty) return;
    const finalName = selectedAsset ? selectedAsset.name : customAssetName.trim();
    if (!finalName) return;
    if (stockExceeded) return;

    setSubmitting(true);
    try {
      const custodySummary = facultyActiveCustody
        .map((x) => `${x.qty}× ${x.name}`)
        .join(', ');

      await onConfirmAllot({
        facultyId: selectedFaculty.facultyId,
        facultyName: selectedFaculty.facultyName,
        facultyEmail: selectedFaculty.email,
        facultyDepartment: selectedFaculty.department,
        facultyCabin: selectedFaculty.cabin,
        assetCode: selectedAsset ? selectedAsset.code : `EXT-${Date.now().toString().slice(-4)}`,
        assetName: finalName,
        assetCategory: selectedAsset?.category || 'it',
        isCatalogAsset: !!selectedAsset,
        allotmentType,
        quantity: Math.max(1, Number(quantity) || 1),
        venue: venue.trim() || selectedFaculty.currentVenue || 'Academic Block',
        startTime: startTime.trim() || '09:30 AM',
        endTime: endTime.trim() || '11:30 AM',
        markerColor: markerColor !== 'none' ? (markerColor as MarkerColor) : undefined,
        purpose:
          purpose.trim() ||
          (extraUnitInfo.isExtra
            ? 'Extra unit directly allotted by Admin / Office Staff'
            : 'Directly allotted by Admin / Office Staff'),
        isExtraUnit: extraUnitInfo.isExtra,
        existingCustodySummary: custodySummary,
      });
      onClose();
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-[#0e1c2f]/65 backdrop-blur-sm animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl max-w-xl w-full max-h-[92vh] overflow-hidden shadow-2xl border border-[#cbdbf5] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 py-4 flex items-center justify-between border-b border-[#e5eeff] bg-[#f8fafd] shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-[#009299] text-white flex items-center justify-center shadow-xs">
              <span className="material-symbols-outlined text-[20px]">assignment_add</span>
            </div>
            <div>
              <h3 className="text-base font-bold text-[#0b1c30]">
                Direct Asset Allotment (Admin &amp; Office Staff)
              </h3>
              <p className="text-[11px] text-[#426086]">
                Allot an extra PC, laptop, projector, or stationery directly — syncs stock, custody &amp; gatepass automatically.
              </p>
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

        {/* Scrollable Body */}
        <form
          id="direct-allot-form"
          onSubmit={handleSubmit}
          className="p-6 overflow-y-auto flex-1 flex flex-col gap-4 text-xs"
        >
          {/* Faculty Selector */}
          <div>
            <label className="block font-bold text-[#0b1c30] mb-1">1. Select Faculty Member *</label>
            <select
              required
              value={selectedFacultyId}
              onChange={(e) => {
                const nextId = e.target.value;
                setSelectedFacultyId(nextId);
                const fac = facultyRoster.find((f) => f.facultyId === nextId);
                if (fac) setVenue(fac.currentVenue || fac.cabin || 'Academic Block');
              }}
              className="w-full h-9 px-3 rounded-lg bg-white border border-[#cbdbf5] text-[#0b1c30] font-semibold focus:outline-none focus:ring-1 focus:ring-[#009299]"
            >
              {facultyRoster.map((f) => (
                <option key={f.facultyId} value={f.facultyId}>
                  {f.facultyName} — {f.department}
                </option>
              ))}
            </select>
          </div>

          {/* Live Existing Custody Awareness Box */}
          {selectedFaculty && (
            <div className="p-3 rounded-xl bg-[#f8fafd] border border-[#cbdbf5] flex flex-col gap-1.5">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-[#0b1c30] flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-[15px] text-[#426086]">inventory_2</span>
                  <span>Currently in {selectedFaculty.facultyName}&apos;s Custody:</span>
                </span>
                <span className="font-mono text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#eff4ff] text-[#426086]">
                  {facultyActiveCustody.reduce((s, i) => s + i.qty, 0)} units held
                </span>
              </div>
              {facultyActiveCustody.length === 0 ? (
                <p className="text-[11px] text-[#72777f] italic">
                  No active equipment currently held by this faculty member.
                </p>
              ) : (
                <div className="flex flex-wrap gap-1.5 pt-0.5">
                  {facultyActiveCustody.map((item, idx) => (
                    <span
                      key={`${item.code}-${idx}`}
                      className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-white border border-[#cbdbf5] text-[11px] font-medium text-[#0e1c2f]"
                    >
                      <span className="font-bold text-[#009299]">{item.qty}×</span>
                      <span>{item.name}</span>
                    </span>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Asset Selector */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="sm:col-span-2">
              <label className="block font-bold text-[#0b1c30] mb-1">2. Select Asset / Equipment *</label>
              <select
                value={assetCode}
                onChange={(e) => {
                  const val = e.target.value;
                  setAssetCode(val);
                  const found = assets.find((a) => a.code === val);
                  if (found) {
                    if (found.isConsumable) setAllotmentType('consumable');
                    else if (allotmentType === 'consumable') setAllotmentType('temporary');
                    if (found.name.toLowerCase().includes('black marker')) setMarkerColor('black');
                    else if (found.name.toLowerCase().includes('blue marker')) setMarkerColor('blue');
                    else if (found.name.toLowerCase().includes('red marker')) setMarkerColor('red');
                    else if (found.name.toLowerCase().includes('green marker')) setMarkerColor('green');
                    else setMarkerColor('none');
                  }
                }}
                className="w-full h-9 px-3 rounded-lg bg-white border border-[#cbdbf5] text-[#0b1c30] font-semibold focus:outline-none focus:ring-1 focus:ring-[#009299]"
              >
                {assets.map((a) => (
                  <option key={a.code} value={a.code}>
                    {a.name} ({a.code}) — {a.availableQuantity}/{a.totalQuantity} avail
                  </option>
                ))}
                <option value="__custom__">+ Custom / Extra Item (Not in Catalog)</option>
              </select>
            </div>

            <div>
              <label className="block font-bold text-[#0b1c30] mb-1">Quantity *</label>
              <input
                type="number"
                min={1}
                max={selectedAsset ? Math.max(1, maxAvailable) : 50}
                value={quantity}
                onChange={(e) => setQuantity(Math.max(1, Number(e.target.value) || 1))}
                className="w-full h-9 px-3 rounded-lg bg-white border border-[#cbdbf5] text-[#0b1c30] font-bold focus:outline-none focus:ring-1 focus:ring-[#009299]"
              />
              {selectedAsset && (
                <span
                  className={`text-[10px] block mt-0.5 font-semibold ${
                    stockExceeded ? 'text-[#ba1a1a]' : 'text-[#009299]'
                  }`}
                >
                  {maxAvailable > 0
                    ? `${maxAvailable} ${selectedAsset.unit} available in store`
                    : '0 units currently in stock!'}
                </span>
              )}
            </div>
          </div>

          {assetCode === '__custom__' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block font-bold text-[#0b1c30] mb-1">Custom Asset Name *</label>
                <input
                  type="text"
                  required
                  value={customAssetName}
                  onChange={(e) => setCustomAssetName(e.target.value)}
                  placeholder="e.g. Extra Dell Core i7 Desktop PC"
                  className="w-full h-9 px-3 rounded-lg bg-[#eff4ff]/60 border border-[#cbdbf5] text-[#0b1c30] focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#009299]"
                />
              </div>
              <div>
                <label className="block font-bold text-[#0b1c30] mb-1">Marker Color (Optional)</label>
                <select
                  value={markerColor}
                  onChange={(e) => setMarkerColor(e.target.value)}
                  className="w-full h-9 px-3 rounded-lg bg-white border border-[#cbdbf5] text-[#0b1c30]"
                >
                  <option value="none">Not a Marker (Hardware / General)</option>
                  <option value="black">Black Marker</option>
                  <option value="blue">Blue Marker</option>
                  <option value="red">Red Marker</option>
                  <option value="green">Green Marker</option>
                </select>
              </div>
            </div>
          )}

          {/* Extra Unit Notice Banner */}
          {extraUnitInfo.isExtra && (
            <div className="p-3 rounded-xl bg-amber-50 border border-amber-300 flex items-start gap-2.5 text-amber-900">
              <span className="material-symbols-outlined text-[18px] text-amber-600 shrink-0 mt-0.5">
                add_circle
              </span>
              <div className="flex flex-col gap-0.5">
                <span className="font-bold text-[11px] uppercase tracking-wider text-amber-800">
                  Extra Unit Allotment Detected
                </span>
                <p className="text-[11px] leading-relaxed">{extraUnitInfo.reason}</p>
              </div>
            </div>
          )}

          {/* Allotment Type */}
          <div>
            <label className="block font-bold text-[#0b1c30] mb-1.5">3. Allotment Type *</label>
            <div className="grid grid-cols-3 gap-2">
              {[
                {
                  id: 'temporary' as BookingType,
                  label: 'Temporary / Extra',
                  desc: 'Returnable • Issue Desk',
                  icon: 'schedule',
                },
                {
                  id: 'permanent' as BookingType,
                  label: 'Permanent Grant',
                  desc: 'Cabin / Office Desk',
                  icon: 'desk',
                },
                {
                  id: 'consumable' as BookingType,
                  label: 'Consumable Issue',
                  desc: 'Markers / Stationery',
                  icon: 'inventory',
                },
              ].map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => setAllotmentType(opt.id)}
                  className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer flex flex-col gap-0.5 ${
                    allotmentType === opt.id
                      ? 'bg-[#0e1c2f] text-white border-[#0e1c2f] shadow-sm'
                      : 'bg-[#f8fafd] text-[#0b1c30] border-[#cbdbf5] hover:border-[#009299]'
                  }`}
                >
                  <div className="flex items-center gap-1.5 font-bold text-[11px]">
                    <span className="material-symbols-outlined text-[15px]">{opt.icon}</span>
                    <span>{opt.label}</span>
                  </div>
                  <span
                    className={`text-[10px] ${
                      allotmentType === opt.id ? 'text-[#cbdbf5]' : 'text-[#72777f]'
                    }`}
                  >
                    {opt.desc}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Venue & Timing */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className={allotmentType === 'temporary' ? 'sm:col-span-1' : 'sm:col-span-3'}>
              <label className="block font-bold text-[#0b1c30] mb-1">Classroom / Cabin *</label>
              <input
                type="text"
                required
                value={venue}
                onChange={(e) => setVenue(e.target.value)}
                placeholder="e.g. MDP Hall 102 / Cabin 202"
                className="w-full h-9 px-3 rounded-lg bg-[#eff4ff]/60 border border-[#cbdbf5] text-[#0b1c30] focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#009299]"
              />
            </div>

            {allotmentType === 'temporary' && (
              <>
                <div>
                  <label className="block font-bold text-[#0b1c30] mb-1">Start Time</label>
                  <input
                    type="text"
                    value={startTime}
                    onChange={(e) => setStartTime(e.target.value)}
                    placeholder="09:30 AM"
                    className="w-full h-9 px-3 rounded-lg bg-[#eff4ff]/60 border border-[#cbdbf5] text-[#0b1c30] focus:bg-white"
                  />
                </div>
                <div>
                  <label className="block font-bold text-[#0b1c30] mb-1">Expected Return</label>
                  <input
                    type="text"
                    value={endTime}
                    onChange={(e) => setEndTime(e.target.value)}
                    placeholder="11:30 AM"
                    className="w-full h-9 px-3 rounded-lg bg-[#eff4ff]/60 border border-[#cbdbf5] text-[#0b1c30] focus:bg-white"
                  />
                </div>
              </>
            )}
          </div>

          {/* Reason / Remarks */}
          <div>
            <label className="block font-bold text-[#0b1c30] mb-1">
              Allotment Reason / Admin Note {extraUnitInfo.isExtra ? '(Recommended for Extra Unit)' : '(Optional)'}
            </label>
            <input
              type="text"
              value={purpose}
              onChange={(e) => setPurpose(e.target.value)}
              placeholder="e.g. Extra PC allotted for project demo / guest seminar..."
              className="w-full h-9 px-3 rounded-lg bg-[#eff4ff]/60 border border-[#cbdbf5] text-[#0b1c30] focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#009299]"
            />
          </div>
        </form>

        {/* Sticky Always-Visible Footer */}
        <div className="px-6 py-3.5 bg-[#f8fafd] border-t border-[#e5eeff] shrink-0 flex items-center justify-between gap-2 text-xs">
          <span className="text-[11px] text-[#426086] hidden sm:inline">
            Syncs Catalog Stock + Custody + Gatepass + Audit Log
          </span>
          <div className="flex items-center gap-2 ml-auto">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 font-semibold text-[#44474c] hover:bg-[#eff4ff] rounded-lg transition-all cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              form="direct-allot-form"
              disabled={submitting || stockExceeded}
              className="px-4 py-2 font-bold bg-[#009299] hover:bg-[#007a80] text-white rounded-lg shadow-sm transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              <span className="material-symbols-outlined text-[16px]">check_circle</span>
              <span>{submitting ? 'Allotting...' : 'Allot Now'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
