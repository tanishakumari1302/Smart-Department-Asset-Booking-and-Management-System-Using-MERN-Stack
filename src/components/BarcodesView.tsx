import React, { useMemo, useState, useEffect } from 'react';
import { Asset, User } from '../types';

interface BarcodesViewProps {
  assets: Asset[];
  currentUser?: User | null;
  onOpenScanner: () => void;
  onPrintAllTags: () => void;
  onUpdateAsset?: (code: string, updates: Partial<Asset>) => Promise<void>;
  onDeleteAsset?: (code: string) => Promise<void>;
  onOpenNewAssetModal?: () => void;
  showToast?: (text: string, type?: 'success' | 'warning' | 'info') => void;
}

/** Deterministically generates realistic varying bar widths from any barcode string */
function generateBarcodeBars(code: string): number[] {
  const text = (code || '0000').toUpperCase();
  const bars: number[] = [2, 1, 2, 1]; // start guard
  for (let i = 0; i < Math.min(text.length, 18); i++) {
    const ch = text.charCodeAt(i);
    bars.push((ch % 3) + 1);
    bars.push(((ch >> 2) % 2) + 1);
  }
  bars.push(1, 2, 1, 2); // end guard
  return bars;
}

export const BarcodesView: React.FC<BarcodesViewProps> = ({
  assets,
  currentUser,
  onOpenScanner,
  onPrintAllTags,
  onUpdateAsset,
  onDeleteAsset,
  onOpenNewAssetModal,
  showToast,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'verified' | 'pending' | 'unlabeled'>('all');

  // Edit Barcode Modal State
  const [editingAsset, setEditingAsset] = useState<Asset | null>(null);
  const [editBarcodeValue, setEditBarcodeValue] = useState('');
  const [editSerialNumber, setEditSerialNumber] = useState('');
  const [editLocation, setEditLocation] = useState('');
  const [editTagStatus, setEditTagStatus] = useState<'verified' | 'pending' | 'unlabeled'>('verified');
  const [saving, setSaving] = useState(false);

  // Quick inline remove confirmation & busy state
  const [confirmRemoveCode, setConfirmRemoveCode] = useState<string | null>(null);
  const [busyCode, setBusyCode] = useState<string | null>(null);

  const canManage = !currentUser || currentUser.role !== 'faculty';

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setEditingAsset(null);
      }
    };
    if (editingAsset) {
      window.addEventListener('keydown', onKeyDown);
    }
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [editingAsset]);

  // Normalize effective barcode string & status for each asset
  const getEffectiveBarcode = (asset: Asset): string => {
    if (asset.barcodeTagStatus === 'unlabeled' || asset.barcodeTagStatus === 'unassigned') {
      return (asset.barcodeValue || '').trim();
    }
    return (asset.barcodeValue !== undefined ? asset.barcodeValue : asset.code).trim();
  };

  const getNormalizedStatus = (asset: Asset): 'verified' | 'pending' | 'unlabeled' => {
    const eff = getEffectiveBarcode(asset);
    if (!eff || asset.barcodeTagStatus === 'unlabeled' || asset.barcodeTagStatus === 'unassigned') {
      return 'unlabeled';
    }
    if (asset.barcodeTagStatus === 'verified') return 'verified';
    return 'pending';
  };

  // Real-time compliance stats (computed dynamically from live Firestore assets)
  const stats = useMemo(() => {
    const total = assets.length;
    let verified = 0;
    let pending = 0;
    let unlabeled = 0;
    let customTagged = 0;

    assets.forEach((a) => {
      const st = getNormalizedStatus(a);
      if (st === 'verified') verified++;
      else if (st === 'pending') pending++;
      else unlabeled++;

      const eff = getEffectiveBarcode(a);
      if (eff && eff.toUpperCase() !== a.code.toUpperCase()) {
        customTagged++;
      }
    });

    const pct = total > 0 ? Math.round((verified / total) * 100) : 0;
    return { total, verified, pending, unlabeled, customTagged, pct };
  }, [assets]);

  const filteredAssets = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    return assets.filter((a) => {
      const st = getNormalizedStatus(a);
      if (statusFilter !== 'all' && st !== statusFilter) return false;
      if (!q) return true;
      const effBarcode = getEffectiveBarcode(a).toLowerCase();
      return (
        a.code.toLowerCase().includes(q) ||
        a.name.toLowerCase().includes(q) ||
        effBarcode.includes(q) ||
        (a.serialNumber || '').toLowerCase().includes(q) ||
        (a.location || '').toLowerCase().includes(q) ||
        (a.categoryLabel || '').toLowerCase().includes(q)
      );
    });
  }, [assets, searchQuery, statusFilter]);

  const openEditModal = (asset: Asset) => {
    setEditingAsset(asset);
    const eff = getEffectiveBarcode(asset);
    setEditBarcodeValue(eff);
    setEditSerialNumber(asset.serialNumber || '');
    setEditLocation(asset.location || '');
    setEditTagStatus(getNormalizedStatus(asset) === 'unlabeled' ? 'verified' : getNormalizedStatus(asset));
  };

  const handleSaveBarcode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingAsset || !onUpdateAsset) return;
    setSaving(true);
    try {
      const cleanBarcode = editBarcodeValue.trim();
      const nextStatus: Asset['barcodeTagStatus'] = cleanBarcode ? editTagStatus : 'unlabeled';
      await onUpdateAsset(editingAsset.code, {
        barcodeValue: cleanBarcode,
        serialNumber: editSerialNumber.trim(),
        location: editLocation.trim() || editingAsset.location,
        barcodeTagStatus: nextStatus,
      });
      if (showToast) {
        showToast(
          cleanBarcode
            ? `Saved barcode "${cleanBarcode}" (${nextStatus.toUpperCase()}) for ${editingAsset.name}`
            : `Cleared barcode tag for ${editingAsset.name}`,
          'success'
        );
      }
      setEditingAsset(null);
    } catch (err: any) {
      if (showToast) showToast(err.message || 'Failed to update barcode', 'warning');
    } finally {
      setSaving(false);
    }
  };

  const handleToggleVerify = async (asset: Asset) => {
    if (!onUpdateAsset) return;
    const currentStatus = getNormalizedStatus(asset);
    const eff = getEffectiveBarcode(asset);

    // If unlabeled, open edit modal so admin can enter real barcode first
    if (currentStatus === 'unlabeled' && !eff) {
      openEditModal(asset);
      return;
    }

    const nextStatus: Asset['barcodeTagStatus'] = currentStatus === 'verified' ? 'pending' : 'verified';
    setBusyCode(asset.code);
    try {
      await onUpdateAsset(asset.code, {
        barcodeValue: eff || asset.code,
        barcodeTagStatus: nextStatus,
      });
      if (showToast) {
        showToast(
          nextStatus === 'verified'
            ? `Verified barcode for ${asset.name}`
            : `Marked ${asset.name} barcode as Pending Verification`,
          'info'
        );
      }
    } catch (err: any) {
      if (showToast) showToast(err.message || 'Failed to update verification status', 'warning');
    } finally {
      setBusyCode(null);
    }
  };

  const handleRemoveBarcode = async (asset: Asset) => {
    if (!onUpdateAsset) return;
    setBusyCode(asset.code);
    try {
      await onUpdateAsset(asset.code, {
        barcodeValue: '',
        barcodeTagStatus: 'unlabeled',
      });
      setConfirmRemoveCode(null);
      if (showToast) {
        showToast(`Cleared barcode tag from ${asset.name}. Click Edit anytime to assign a new machine code.`, 'info');
      }
    } catch (err: any) {
      if (showToast) showToast(err.message || 'Failed to remove barcode', 'warning');
    } finally {
      setBusyCode(null);
    }
  };

  const handleDeleteEntireAsset = async (asset: Asset) => {
    if (!onDeleteAsset) return;
    setBusyCode(asset.code);
    try {
      await onDeleteAsset(asset.code);
      setConfirmRemoveCode(null);
      setEditingAsset(null);
    } catch (err: any) {
      if (showToast) showToast(err.message || 'Failed to delete asset', 'warning');
    } finally {
      setBusyCode(null);
    }
  };

  const modalPreviewBars = useMemo(
    () => generateBarcodeBars(editBarcodeValue.trim() || editingAsset?.code || '0000'),
    [editBarcodeValue, editingAsset]
  );

  return (
    <div className="flex flex-col w-full gap-5 text-[#0b1c30]">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="font-mono text-xs uppercase text-[#009299] font-bold">
              Hardware Tagging Registry
            </span>
            <span className="w-1.5 h-1.5 rounded-full bg-[#009299]"></span>
            <span className="text-[11px] uppercase text-[#44474c] font-semibold">
              Live Machine Barcode Matrix
            </span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-[#0b1c30]">
            Asset Barcodes &amp; Tag Compliance
          </h1>
        </div>

        <div className="flex items-center flex-wrap gap-2">
          {canManage && onOpenNewAssetModal && (
            <button
              type="button"
              onClick={onOpenNewAssetModal}
              className="h-9 px-3.5 bg-[#009299] text-white rounded-lg text-xs font-semibold shadow-sm hover:bg-[#007a80] transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <span className="material-symbols-outlined text-[18px]">add_circle</span>
              <span>Add New Asset</span>
            </button>
          )}
          <button
            type="button"
            onClick={onOpenScanner}
            className="h-9 px-3.5 bg-white text-[#426086] border border-[#cbdbf5] rounded-lg text-xs font-semibold shadow-sm hover:bg-[#eff4ff] transition-all flex items-center gap-1.5 cursor-pointer"
          >
            <span className="material-symbols-outlined text-[18px]">barcode_scanner</span>
            <span>Launch Scanner</span>
          </button>
          <button
            type="button"
            onClick={onPrintAllTags}
            className="h-9 px-3.5 bg-[#0e1c2f] text-white rounded-lg text-xs font-semibold shadow-sm hover:bg-[#426086] transition-all flex items-center gap-1.5 cursor-pointer"
          >
            <span className="material-symbols-outlined text-[18px]">print</span>
            <span>Print All {assets.length} Barcode Tags</span>
          </button>
        </div>
      </div>

      {/* Real-Time Audit Metric Banner */}
      <div className="p-4 bg-white rounded-xl shadow-sm border border-[#e5eeff] flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-[#eff4ff] text-[#009299] rounded-xl border border-[#cbdbf5]">
            <span className="material-symbols-outlined text-[28px]">verified</span>
          </div>
          <div>
            <div className="flex items-center flex-wrap gap-2">
              <span className="text-base font-bold text-[#0b1c30]">
                {stats.verified} of {stats.total} Assets Verified with Machine-Scannable Code
              </span>
              <span className="text-xs px-2 py-0.5 rounded-full bg-[#dce9ff] text-[#009299] font-bold">
                {stats.pct}% Compliant
              </span>
              {stats.customTagged > 0 && (
                <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 font-bold">
                  {stats.customTagged} Custom Machine Codes
                </span>
              )}
            </div>
            <p className="text-xs text-[#44474c] mt-0.5">
              {stats.pending > 0 || stats.unlabeled > 0
                ? `${stats.pending} pending verification • ${stats.unlabeled} unlabeled. Click Edit Barcode on any item to scan or enter its real physical code.`
                : 'All catalog items are verified. Click Edit Barcode on any card to enter or update its real product/machine barcode.'}
            </p>
          </div>
        </div>

        {/* Search & Status Filter */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative">
            <span className="material-symbols-outlined text-[16px] text-[#426086] absolute left-2.5 top-1/2 -translate-y-1/2">
              search
            </span>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search item, SKU, or barcode..."
              className="h-9 pl-8 pr-3 w-56 rounded-lg bg-[#eff4ff] border border-[#cbdbf5] text-xs text-[#0b1c30] focus:outline-none focus:ring-1 focus:ring-[#009299] focus:bg-white"
            />
          </div>

          <div className="flex items-center bg-[#eff4ff] p-0.5 rounded-lg border border-[#cbdbf5] text-[11px] font-semibold">
            {(
              [
                { id: 'all', label: `All (${stats.total})` },
                { id: 'verified', label: `Verified (${stats.verified})` },
                { id: 'pending', label: `Pending (${stats.pending})` },
                { id: 'unlabeled', label: `Unlabeled (${stats.unlabeled})` },
              ] as const
            ).map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setStatusFilter(tab.id)}
                className={`px-2.5 py-1 rounded-md transition-all cursor-pointer ${
                  statusFilter === tab.id
                    ? 'bg-[#0e1c2f] text-white shadow-2xs'
                    : 'text-[#426086] hover:text-[#0b1c30]'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Barcode Tags Grid */}
      {filteredAssets.length === 0 ? (
        <div className="bg-white p-10 rounded-xl border border-[#e5eeff] text-center">
          <span className="material-symbols-outlined text-[40px] text-[#72777f]">qr_code_2</span>
          <p className="text-sm font-bold text-[#0b1c30] mt-2">No matching assets found</p>
          <p className="text-xs text-[#44474c] mt-1">Try clearing your search or status filter.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filteredAssets.map((asset) => {
            const effBarcode = getEffectiveBarcode(asset);
            const normStatus = getNormalizedStatus(asset);
            const isCustom = !!effBarcode && effBarcode.toUpperCase() !== asset.code.toUpperCase();
            const bars = generateBarcodeBars(effBarcode || asset.code);
            const isBusy = busyCode === asset.code;

            return (
              <div
                key={asset.code}
                className={`bg-white p-4 rounded-xl shadow-sm border flex flex-col justify-between hover:shadow-md transition-shadow ${
                  normStatus === 'unlabeled'
                    ? 'border-rose-200'
                    : normStatus === 'pending'
                    ? 'border-amber-200'
                    : 'border-[#cbdbf5]'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <span className="font-mono text-xs font-bold text-[#0e1c2f] bg-[#eff4ff] px-2 py-0.5 rounded">
                      {asset.code}
                    </span>
                    <span
                      className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${
                        normStatus === 'verified'
                          ? 'bg-teal-50 text-[#009299] border border-teal-200'
                          : normStatus === 'pending'
                          ? 'bg-amber-50 text-amber-700 border border-amber-200'
                          : 'bg-rose-50 text-rose-700 border border-rose-200'
                      }`}
                    >
                      {normStatus === 'verified'
                        ? 'Verified'
                        : normStatus === 'pending'
                        ? 'Pending'
                        : 'Unlabeled'}
                    </span>
                  </div>
                  <h4 className="text-xs font-bold text-[#0b1c30] truncate" title={asset.name}>
                    {asset.name}
                  </h4>
                  <div className="flex items-center justify-between gap-1 mt-0.5">
                    <p className="text-[11px] text-[#44474c] capitalize truncate">
                      {asset.categoryLabel || asset.category}
                    </p>
                    {isCustom && (
                      <span className="text-[9px] font-bold uppercase px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200 shrink-0">
                        Custom Code
                      </span>
                    )}
                  </div>
                </div>

                {/* Visual Barcode Graphic */}
                {normStatus === 'unlabeled' || !effBarcode ? (
                  <div className="my-3 p-3.5 bg-rose-50/50 rounded-lg border border-dashed border-rose-300 flex flex-col items-center justify-center gap-1 min-h-[76px]">
                    <span className="material-symbols-outlined text-[20px] text-rose-500">
                      barcode_scanner
                    </span>
                    <span className="text-[11px] font-bold text-rose-700">No Barcode Assigned</span>
                    <span className="text-[10px] text-rose-600">Click Edit Barcode to add machine code</span>
                  </div>
                ) : (
                  <div className="my-3 p-3 bg-[#f8f9ff] rounded-lg border border-[#e5eeff] flex flex-col items-center justify-center gap-1.5 min-h-[76px]">
                    <div className="flex items-center gap-[1.5px] h-9 w-full justify-center overflow-hidden">
                      {bars.map((widthUnit, idx) => (
                        <span
                          key={idx}
                          className="h-full bg-[#0b1c30] shrink-0"
                          style={{
                            width: widthUnit === 3 ? '3px' : widthUnit === 2 ? '2px' : '1px',
                          }}
                        />
                      ))}
                    </div>
                    <span
                      className="font-mono text-[10px] text-[#0b1c30] font-bold tracking-wider truncate max-w-full"
                      title={effBarcode}
                    >
                      *{effBarcode}*
                    </span>
                  </div>
                )}

                <div className="space-y-2">
                  <div className="text-[11px] text-[#44474c] flex items-center justify-between">
                    <span>Location:</span>
                    <span className="font-medium truncate max-w-[140px]" title={asset.location}>
                      {asset.location || 'Central Bay'}
                    </span>
                  </div>
                  {asset.serialNumber && (
                    <div className="text-[10px] text-[#426086] flex items-center justify-between font-mono">
                      <span>Serial:</span>
                      <span className="truncate max-w-[140px]" title={asset.serialNumber}>
                        {asset.serialNumber}
                      </span>
                    </div>
                  )}

                  {/* Admin & Staff Action Bar: Edit / Verify / Clear Tag or Delete Asset */}
                  {canManage && (onUpdateAsset || onDeleteAsset) && (
                    <div className="pt-2 border-t border-[#e5eeff] flex flex-col gap-1.5">
                      {confirmRemoveCode === asset.code ? (
                        <div className="flex items-center justify-between gap-1 bg-rose-50 border border-rose-200 px-2 py-1.5 rounded-lg">
                          <div className="flex items-center gap-1 flex-wrap">
                            {normStatus !== 'unlabeled' && onUpdateAsset && (
                              <button
                                type="button"
                                disabled={isBusy}
                                onClick={() => handleRemoveBarcode(asset)}
                                className="px-2 py-1 bg-amber-600 hover:bg-amber-700 text-white rounded text-[10px] font-bold cursor-pointer"
                                title="Only clear barcode tag (keep asset in catalog)"
                              >
                                {isBusy ? '...' : 'Clear Tag'}
                              </button>
                            )}
                            {onDeleteAsset && (
                              <button
                                type="button"
                                disabled={isBusy}
                                onClick={() => handleDeleteEntireAsset(asset)}
                                className="px-2 py-1 bg-rose-600 hover:bg-rose-700 text-white rounded text-[10px] font-bold cursor-pointer"
                                title="Permanently delete this asset from Catalog & Barcodes"
                              >
                                {isBusy ? '...' : 'Delete Asset'}
                              </button>
                            )}
                          </div>
                          <button
                            type="button"
                            onClick={() => setConfirmRemoveCode(null)}
                            className="px-1.5 py-1 text-[#44474c] hover:bg-white rounded text-[10px] font-semibold cursor-pointer"
                          >
                            No
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-1.5">
                          {onUpdateAsset && (
                            <button
                              type="button"
                              disabled={isBusy}
                              onClick={() => openEditModal(asset)}
                              className="flex-1 py-1.5 px-2 bg-[#eff4ff] hover:bg-[#dce9ff] text-[#0e1c2f] border border-[#cbdbf5] rounded-lg text-[11px] font-bold flex items-center justify-center gap-1 cursor-pointer transition-colors"
                              title="Edit physical machine barcode, serial number & status"
                            >
                              <span className="material-symbols-outlined text-[14px]">edit</span>
                              <span>Edit Barcode</span>
                            </button>
                          )}

                          {onUpdateAsset && (
                            <button
                              type="button"
                              disabled={isBusy}
                              onClick={() => handleToggleVerify(asset)}
                              className={`py-1.5 px-2 rounded-lg text-[11px] font-bold border flex items-center justify-center gap-1 cursor-pointer transition-colors ${
                                normStatus === 'verified'
                                  ? 'bg-white text-amber-700 border-amber-200 hover:bg-amber-50'
                                  : 'bg-[#009299] text-white border-[#009299] hover:bg-[#007a80]'
                              }`}
                              title={
                                normStatus === 'verified'
                                  ? 'Mark as Pending Verification'
                                  : 'Verify this barcode'
                              }
                            >
                              <span className="material-symbols-outlined text-[14px]">
                                {normStatus === 'verified' ? 'pending_actions' : 'verified'}
                              </span>
                              <span>{normStatus === 'verified' ? 'Unverify' : 'Verify'}</span>
                            </button>
                          )}

                          {(onDeleteAsset || (normStatus !== 'unlabeled' && onUpdateAsset)) && (
                            <button
                              type="button"
                              disabled={isBusy}
                              onClick={() => setConfirmRemoveCode(asset.code)}
                              className="p-1.5 text-rose-600 hover:bg-rose-50 rounded-lg border border-rose-200 cursor-pointer transition-colors"
                              title={normStatus === 'unlabeled' ? 'Delete asset permanently' : 'Clear barcode tag or delete asset'}
                            >
                              <span className="material-symbols-outlined text-[15px]">delete</span>
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Edit / Add Real Physical Machine Barcode Modal */}
      {editingAsset && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#0e1c2f]/60 backdrop-blur-sm"
          onClick={() => setEditingAsset(null)}
        >
          <div
            className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-[#cbdbf5] overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-4 bg-[#0e1c2f] text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-[#75f5fd]">barcode</span>
                <div>
                  <h3 className="text-sm font-bold">Edit Physical Machine Barcode</h3>
                  <p className="text-[11px] text-white/75 truncate max-w-[270px]">
                    {editingAsset.code} • {editingAsset.name}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setEditingAsset(null)}
                className="p-1 rounded-lg hover:bg-white/10 text-white cursor-pointer"
              >
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>

            <form onSubmit={handleSaveBarcode} className="p-5 space-y-4 text-xs">
              {/* Live Barcode Preview */}
              <div className="p-3.5 bg-[#f8f9ff] rounded-xl border border-[#cbdbf5] flex flex-col items-center justify-center gap-1.5">
                {editBarcodeValue.trim() ? (
                  <>
                    <div className="flex items-center gap-[2px] h-10 justify-center overflow-hidden max-w-full">
                      {modalPreviewBars.map((w, i) => (
                        <span
                          key={i}
                          className="h-full bg-[#0b1c30] shrink-0"
                          style={{ width: w === 3 ? '3px' : w === 2 ? '2px' : '1px' }}
                        />
                      ))}
                    </div>
                    <span className="font-mono text-xs font-bold text-[#0b1c30] tracking-widest">
                      *{editBarcodeValue.trim()}*
                    </span>
                  </>
                ) : (
                  <span className="text-xs font-semibold text-rose-600 py-3">
                    Barcode empty — saving will mark this asset as Unlabeled
                  </span>
                )}
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="font-bold text-[#0b1c30]">
                    Real Machine / Product Barcode
                  </label>
                  <button
                    type="button"
                    onClick={() => setEditBarcodeValue(editingAsset.code)}
                    className="text-[10px] font-bold text-[#009299] hover:underline cursor-pointer"
                  >
                    Use Default SKU ({editingAsset.code})
                  </button>
                </div>
                <input
                  type="text"
                  autoFocus
                  value={editBarcodeValue}
                  onChange={(e) => setEditBarcodeValue(e.target.value)}
                  placeholder="Scan with USB scanner or type e.g. 8901425001234"
                  className="w-full h-10 px-3 rounded-lg bg-[#eff4ff] border border-[#cbdbf5] font-mono text-sm font-bold text-[#0b1c30] focus:outline-none focus:ring-2 focus:ring-[#009299] focus:bg-white"
                />
                <p className="text-[10px] text-[#44474c] mt-1">
                  Tip: Marker, Printer, Monitor ya kisi bhi item par print asli barcode number yahan type ya USB scanner se scan karein.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-[#0b1c30] mb-1">Serial Number (Optional)</label>
                  <input
                    type="text"
                    value={editSerialNumber}
                    onChange={(e) => setEditSerialNumber(e.target.value)}
                    placeholder="e.g. SN-HP401299"
                    className="w-full h-9 px-3 rounded-lg bg-[#eff4ff]/70 border border-[#cbdbf5] font-mono text-[#0b1c30] focus:outline-none focus:ring-1 focus:ring-[#009299] focus:bg-white"
                  />
                </div>
                <div>
                  <label className="block font-bold text-[#0b1c30] mb-1">Verification Status</label>
                  <select
                    value={editTagStatus}
                    onChange={(e) =>
                      setEditTagStatus(e.target.value as 'verified' | 'pending' | 'unlabeled')
                    }
                    className="w-full h-9 px-2.5 rounded-lg bg-[#eff4ff]/70 border border-[#cbdbf5] font-semibold text-[#0b1c30] focus:outline-none focus:ring-1 focus:ring-[#009299] focus:bg-white"
                  >
                    <option value="verified">Verified</option>
                    <option value="pending">Pending Verification</option>
                    <option value="unlabeled">Unlabeled</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-bold text-[#0b1c30] mb-1">Storage Location</label>
                <input
                  type="text"
                  value={editLocation}
                  onChange={(e) => setEditLocation(e.target.value)}
                  placeholder="e.g. Central Store Shelf 2"
                  className="w-full h-9 px-3 rounded-lg bg-[#eff4ff]/70 border border-[#cbdbf5] text-[#0b1c30] focus:outline-none focus:ring-1 focus:ring-[#009299] focus:bg-white"
                />
              </div>

              <div className="flex items-center justify-between pt-3 border-t border-[#e5eeff]">
                <button
                  type="button"
                  onClick={() => {
                    setEditBarcodeValue('');
                    setEditTagStatus('unlabeled');
                  }}
                  className="px-3 py-2 text-rose-600 hover:bg-rose-50 rounded-lg font-bold flex items-center gap-1 cursor-pointer"
                >
                  <span className="material-symbols-outlined text-[15px]">delete</span>
                  <span>Clear Barcode</span>
                </button>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setEditingAsset(null)}
                    className="px-3.5 py-2 rounded-lg text-[#44474c] hover:bg-[#eff4ff] font-semibold cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={saving}
                    className="px-4 py-2 rounded-lg bg-[#0e1c2f] hover:bg-[#426086] text-white font-bold flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                  >
                    <span className="material-symbols-outlined text-[16px]">save</span>
                    <span>{saving ? 'Saving...' : 'Save Barcode'}</span>
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
