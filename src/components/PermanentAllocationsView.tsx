import React, { useState, useMemo, useEffect } from 'react';
import { Asset, Booking, BookingStatus, StaffMember, User, buildMergedStaffLists } from '../types';

interface PermanentAllocationsViewProps {
  assets: Asset[];
  bookings: Booking[];
  currentUser?: User | null;
  staffDirectory?: StaffMember[];
  onOpenGatepass: (booking: Booking) => void;
  onAddPermanentAllocation?: (data: {
    assetCode: string;
    assetName: string;
    requesterName: string;
    requesterEmail?: string;
    requesterRole?: string;
    requesterDept?: string;
    venue: string;
    grantId?: string;
    tenancyDuration?: string;
    quantity?: number;
    status?: BookingStatus;
    purpose?: string;
    remarks?: string;
  }) => Promise<void>;
  onUpdateBooking?: (reqId: string, updates: Partial<Booking>) => Promise<void>;
  onDeleteBooking?: (reqId: string) => Promise<void>;
  showToast?: (text: string, type: 'success' | 'warning' | 'info') => void;
}

type PermDetailModalType = 'units' | 'audit' | null;

export const PermanentAllocationsView: React.FC<PermanentAllocationsViewProps> = ({
  assets,
  bookings,
  currentUser,
  staffDirectory = [],
  onOpenGatepass,
  onAddPermanentAllocation,
  onUpdateBooking,
  onDeleteBooking,
  showToast,
}) => {
  const [activeModal, setActiveModal] = useState<PermDetailModalType>(null);
  const [tableSearch, setTableSearch] = useState('');
  const [modalSearch, setModalSearch] = useState('');

  // Add/Edit Permanent Allocation Modal State
  const [isAddEditOpen, setIsAddEditOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState<Booking | null>(null);
  const [selectedAssetCode, setSelectedAssetCode] = useState('');
  const [customAssetCode, setCustomAssetCode] = useState('');
  const [assetName, setAssetName] = useState('');
  const [custodianName, setCustodianName] = useState('');
  const [custodianEmail, setCustodianEmail] = useState('');
  const [custodianDept, setCustodianDept] = useState('Central Administration & Activation Node');
  const [venue, setVenue] = useState('');
  const [grantId, setGrantId] = useState('PERM-GRANT-2026');
  const [duration, setDuration] = useState('Permanent Allocation (Multi-Year Institutional Tenure)');
  const [quantity, setQuantity] = useState<number>(1);
  const [status, setStatus] = useState<BookingStatus>('approved');
  const [remarks, setRemarks] = useState('');
  const [saving, setSaving] = useState(false);

  // Inline remove confirm state
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const isAdmin = currentUser?.role === 'admin';

  // Live merged staff roster for quick custodian selection
  const allCustodians = useMemo(() => {
    const { allActive } = buildMergedStaffLists(staffDirectory);
    return allActive;
  }, [staffDirectory]);

  // Live permanent bookings from Firestore (excluding legacy Adil Raja / AST-0017 if still cached)
  const permBookings = useMemo(() => {
    return bookings.filter((b) => {
      const isPerm = b.type === 'permanent' || b.bookingType === 'permanent';
      if (!isPerm) return false;
      const code = (b.assetCode || '').toUpperCase();
      const name = (b.requesterName || '').toLowerCase();
      if (code === 'AST-0017' && name.includes('adil')) return false;
      return true;
    });
  }, [bookings]);

  // Total live permanent units
  const totalPermanentUnits = useMemo(() => {
    return permBookings.reduce((acc, b) => acc + Math.max(1, Number(b.quantity || 1)), 0);
  }, [permBookings]);

  const uniqueCustodiansCount = useMemo(() => {
    return new Set(permBookings.map((b) => (b.requesterName || '').trim().toLowerCase()).filter(Boolean)).size;
  }, [permBookings]);

  // Close modal on Escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setActiveModal(null);
        setIsAddEditOpen(false);
      }
    };
    if (activeModal || isAddEditOpen) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeModal, isAddEditOpen]);

  // Main table filter
  const tableFilteredBookings = useMemo(() => {
    if (!tableSearch.trim()) return permBookings;
    const q = tableSearch.toLowerCase().trim();
    return permBookings.filter(
      (b) =>
        b.assetCode?.toLowerCase().includes(q) ||
        b.assetName?.toLowerCase().includes(q) ||
        b.requesterName?.toLowerCase().includes(q) ||
        b.venue?.toLowerCase().includes(q) ||
        b.grantId?.toLowerCase().includes(q)
    );
  }, [permBookings, tableSearch]);

  // Modal filtered list
  const modalFilteredBookings = useMemo(() => {
    if (!modalSearch.trim()) return permBookings;
    const q = modalSearch.toLowerCase().trim();
    return permBookings.filter(
      (b) =>
        b.assetCode?.toLowerCase().includes(q) ||
        b.assetName?.toLowerCase().includes(q) ||
        b.requesterName?.toLowerCase().includes(q) ||
        b.venue?.toLowerCase().includes(q) ||
        b.grantId?.toLowerCase().includes(q) ||
        b.requesterDept?.toLowerCase().includes(q)
    );
  }, [permBookings, modalSearch]);

  const openAddModal = () => {
    setEditingRecord(null);
    const defaultAsset = assets[0];
    setSelectedAssetCode(defaultAsset?.code || '__custom__');
    setCustomAssetCode(defaultAsset?.code || 'AST-0099');
    setAssetName(defaultAsset?.name || '');
    setCustodianName(allCustodians[0]?.name || 'Malay Aggarwal');
    setCustodianEmail(allCustodians[0]?.email || 'malay@sunstone.in');
    setCustodianDept(allCustodians[0]?.department || 'Central Administration & Activation Node');
    setVenue(allCustodians[0]?.room || 'Main Admin Building, Suite 101');
    setGrantId(`PERM-GRANT-${new Date().getFullYear()}`);
    setDuration('Permanent Allocation (Multi-Year Institutional Tenure)');
    setQuantity(1);
    setStatus('approved');
    setRemarks('');
    setIsAddEditOpen(true);
  };

  const openEditModal = (b: Booking) => {
    setEditingRecord(b);
    const matchesCatalog = assets.some((a) => a.code === b.assetCode);
    setSelectedAssetCode(matchesCatalog ? b.assetCode : '__custom__');
    setCustomAssetCode(b.assetCode || '');
    setAssetName(b.assetName || '');
    setCustodianName(b.requesterName || '');
    setCustodianEmail(b.requesterEmail || '');
    setCustodianDept(b.requesterDept || b.department || 'Central Administration');
    setVenue(b.venue || '');
    setGrantId(b.grantId || 'PERM-GRANT-2026');
    setDuration(b.tenancyDuration || 'Permanent Allocation (Multi-Year Institutional Tenure)');
    setQuantity(b.quantity || 1);
    setStatus(b.status || 'approved');
    setRemarks(b.remarks || '');
    setIsAddEditOpen(true);
  };

  const handleSavePermanent = async (e: React.FormEvent) => {
    e.preventDefault();
    const finalCode =
      selectedAssetCode === '__custom__' ? customAssetCode.trim() : selectedAssetCode.trim();
    if (!finalCode || !assetName.trim() || !custodianName.trim() || !venue.trim()) {
      if (showToast) showToast('Please fill SKU code, asset name, custodian, and venue.', 'warning');
      return;
    }

    setSaving(true);
    try {
      if (editingRecord && onUpdateBooking) {
        const targetId = editingRecord.id || editingRecord.reqId || editingRecord._id;
        await onUpdateBooking(targetId, {
          assetCode: finalCode.toUpperCase(),
          assetName: assetName.trim(),
          requesterName: custodianName.trim(),
          requesterEmail: custodianEmail.trim().toLowerCase(),
          requesterDept: custodianDept.trim(),
          department: custodianDept.trim(),
          venue: venue.trim(),
          grantId: grantId.trim(),
          tenancyDuration: duration.trim(),
          quantity: Math.max(1, Number(quantity) || 1),
          status,
          remarks: remarks.trim(),
        });
        if (showToast) showToast(`Updated permanent allocation for ${assetName.trim()}`, 'success');
      } else if (onAddPermanentAllocation) {
        await onAddPermanentAllocation({
          assetCode: finalCode.toUpperCase(),
          assetName: assetName.trim(),
          requesterName: custodianName.trim(),
          requesterEmail: custodianEmail.trim().toLowerCase(),
          requesterDept: custodianDept.trim(),
          venue: venue.trim(),
          grantId: grantId.trim(),
          tenancyDuration: duration.trim(),
          quantity: Math.max(1, Number(quantity) || 1),
          status,
          remarks: remarks.trim(),
        });
        if (showToast) showToast(`Added permanent allocation for ${custodianName.trim()}`, 'success');
      }
      setIsAddEditOpen(false);
    } catch (err: any) {
      if (showToast) showToast(err.message || 'Failed to save permanent allocation', 'warning');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteRecord = async (reqId: string) => {
    if (!onDeleteBooking) return;
    setDeletingId(reqId);
    try {
      await onDeleteBooking(reqId);
      setConfirmDeleteId(null);
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="flex flex-col w-full gap-5 text-[#0b1c30]">
      {/* Title Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="font-mono text-xs uppercase text-[#009299] font-bold">
              Academic Infrastructure
            </span>
            <span className="w-1.5 h-1.5 rounded-full bg-[#009299]"></span>
            <span className="text-[11px] uppercase text-[#44474c] font-semibold">
              Dedicated Asset Custody
            </span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-[#0b1c30]">
            Departmental Permanent Allocations Ledger
          </h1>
          <p className="text-xs text-[#72777f] mt-0.5">
            Live Firestore ledger of permanent hardware custody. Admin &amp; Office Staff can add, edit, or remove permanent allocations anytime.
          </p>
        </div>

        {isAdmin && onAddPermanentAllocation && (
          <button
            type="button"
            onClick={openAddModal}
            className="h-9 px-4 rounded-lg bg-[#0e1c2f] hover:bg-[#426086] text-white text-xs font-bold shadow-sm flex items-center gap-1.5 transition-all cursor-pointer shrink-0"
          >
            <span className="material-symbols-outlined text-[18px]">add_circle</span>
            <span>Add Permanent Allocation</span>
          </button>
        )}
      </div>

      {/* 3 Live Overview KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Card 1: Permanent Hardware Units */}
        <div
          onClick={() => {
            setModalSearch('');
            setActiveModal('units');
          }}
          className="p-4 bg-white rounded-xl shadow-xs border border-[#e5eeff] hover:border-[#009299] hover:shadow-md transition-all cursor-pointer group flex flex-col justify-between"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs uppercase text-[#44474c] font-bold tracking-wider">
              Permanent Hardware Units
            </span>
            <div className="flex items-center gap-1 text-[#009299] opacity-70 group-hover:opacity-100 transition-opacity">
              <span className="text-[10px] font-bold hidden sm:inline">Inspect</span>
              <span className="material-symbols-outlined text-[16px] group-hover:translate-x-0.5 transition-transform">
                arrow_forward
              </span>
            </div>
          </div>
          <div className="text-2xl font-bold mt-1 text-[#0b1c30]">
            {totalPermanentUnits} {totalPermanentUnits === 1 ? 'Unit' : 'Units'}
          </div>
          <div className="flex items-center justify-between mt-2 pt-2 border-t border-[#f1f5f9]">
            <span className="text-[11px] text-[#44474c] truncate">
              Active verified permanent allocations
            </span>
            <span className="text-[10px] font-bold text-[#009299] bg-[#eff4ff] px-1.5 py-0.5 rounded shrink-0 ml-1">
              {permBookings.length} {permBookings.length === 1 ? 'Record' : 'Records'}
            </span>
          </div>
        </div>

        {/* Card 2: Active Custodians */}
        <div
          onClick={() => {
            setModalSearch('');
            setActiveModal('units');
          }}
          className="p-4 bg-white rounded-xl shadow-xs border border-[#e5eeff] hover:border-[#009299] hover:shadow-md transition-all cursor-pointer group flex flex-col justify-between"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs uppercase text-[#44474c] font-bold tracking-wider">
              Assigned Custodians
            </span>
            <div className="flex items-center gap-1 text-[#009299] opacity-70 group-hover:opacity-100 transition-opacity">
              <span className="text-[10px] font-bold hidden sm:inline">View</span>
              <span className="material-symbols-outlined text-[16px] group-hover:translate-x-0.5 transition-transform">
                arrow_forward
              </span>
            </div>
          </div>
          <div className="text-2xl font-bold mt-1 text-[#009299]">
            {uniqueCustodiansCount} {uniqueCustodiansCount === 1 ? 'Custodian' : 'Custodians'}
          </div>
          <div className="flex items-center justify-between mt-2 pt-2 border-t border-[#f1f5f9]">
            <span className="text-[11px] text-[#44474c] truncate">
              {permBookings.map((b) => b.requesterName).filter(Boolean).slice(0, 2).join(', ') || 'No active custodians'}
            </span>
            <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded shrink-0 ml-1">
              Live Sync
            </span>
          </div>
        </div>

        {/* Card 3: Audit Reconciliation */}
        <div
          onClick={() => setActiveModal('audit')}
          className="p-4 bg-white rounded-xl shadow-xs border border-[#e5eeff] hover:border-[#426086] hover:shadow-md transition-all cursor-pointer group flex flex-col justify-between"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs uppercase text-[#44474c] font-bold tracking-wider">
              Audit Reconciliation
            </span>
            <div className="flex items-center gap-1 text-[#426086] opacity-70 group-hover:opacity-100 transition-opacity">
              <span className="text-[10px] font-bold hidden sm:inline">Details</span>
              <span className="material-symbols-outlined text-[16px] group-hover:translate-x-0.5 transition-transform">
                arrow_forward
              </span>
            </div>
          </div>
          <div className="text-2xl font-bold mt-1 text-[#426086]">
            Annual Term II
          </div>
          <div className="flex items-center justify-between mt-2 pt-2 border-t border-[#f1f5f9]">
            <span className="text-[11px] text-[#44474c] truncate">
              Audited by Malay Aggarwal &amp; Arpit Singh
            </span>
            <span className="text-[10px] font-bold text-[#426086] bg-[#cbdbf5] px-1.5 py-0.5 rounded shrink-0 ml-1">
              Audit Schedule
            </span>
          </div>
        </div>
      </div>

      {/* Permanent Allocations Ledger Table Card */}
      <div className="bg-white rounded-xl shadow-sm border border-[#e5eeff] p-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
          <div>
            <h2 className="text-sm font-bold text-[#0b1c30]">
              Permanent Asset Grants &amp; Room Allocations
            </h2>
            <span className="text-xs text-[#72777f]">
              Official live records stored in Cloud Firestore for dedicated institutional custody.
            </span>
          </div>

          <div className="flex items-center gap-2">
            <div className="relative">
              <span className="material-symbols-outlined absolute left-2.5 top-2 text-[16px] text-[#72777f]">
                search
              </span>
              <input
                type="text"
                value={tableSearch}
                onChange={(e) => setTableSearch(e.target.value)}
                placeholder="Search allocations..."
                className="pl-8 pr-3 py-1.5 text-xs bg-[#f8fafd] border border-[#cbdbf5] rounded-lg focus:outline-none focus:ring-1 focus:ring-[#009299] w-48 sm:w-60"
              />
            </div>
            <button
              type="button"
              onClick={() => setActiveModal('units')}
              className="px-3 py-1.5 bg-[#eff4ff] hover:bg-[#cbdbf5] text-[#0e1c2f] rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer border border-[#cbdbf5]"
            >
              <span className="material-symbols-outlined text-[16px]">visibility</span>
              <span>Inspect ({totalPermanentUnits})</span>
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="bg-[#eff4ff] text-[#426086] text-[11px] uppercase tracking-wider h-10">
                <th className="px-4 py-2 font-semibold rounded-l-lg">SKU / Code</th>
                <th className="px-4 py-2 font-semibold">Asset Description</th>
                <th className="px-4 py-2 font-semibold">Assigned Custodian / Venue</th>
                <th className="px-4 py-2 font-semibold">Grant / Project ID</th>
                <th className="px-4 py-2 font-semibold">Duration</th>
                <th className="px-4 py-2 font-semibold">Status</th>
                <th className="px-4 py-2 font-semibold text-right rounded-r-lg">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#e5eeff]">
              {tableFilteredBookings.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-10 text-center text-gray-500">
                    <span className="material-symbols-outlined text-[32px] text-[#cbdbf5] mb-1">
                      inventory_2
                    </span>
                    <p className="font-semibold text-xs text-[#0b1c30]">
                      No permanent allocations found.
                    </p>
                    {isAdmin && onAddPermanentAllocation && (
                      <p className="text-[11px] text-[#72777f] mt-1">
                        Click &quot;Add Permanent Allocation&quot; above to assign hardware permanently.
                      </p>
                    )}
                  </td>
                </tr>
              ) : (
                tableFilteredBookings.map((b, idx) => {
                  const rowId = b.reqId || b.id || b._id;
                  return (
                    <tr key={rowId || `perm-${idx}`} className="hover:bg-[#eff4ff]/40 transition-colors">
                      <td className="px-4 py-3 font-mono font-bold text-[#0e1c2f]">{b.assetCode}</td>
                      <td className="px-4 py-3 font-medium text-[#0b1c30]">
                        {b.assetName}
                        {b.quantity > 1 && (
                          <span className="ml-1.5 text-[10px] font-bold px-1.5 py-0.5 rounded bg-[#eff4ff] text-[#009299]">
                            x{b.quantity}
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-col">
                          <span className="font-semibold text-[#0b1c30]">{b.requesterName}</span>
                          <span className="text-[11px] text-[#44474c]">{b.venue || 'Main Admin Building'}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 font-mono text-[11px] text-[#426086]">
                        {b.grantId || 'RES-GRANT-2025'}
                      </td>
                      <td className="px-4 py-3 text-[#44474c]">
                        {b.tenancyDuration || 'Permanent Allocation'}
                      </td>
                      <td className="px-4 py-3">
                        <span className="px-2 py-0.5 rounded-full bg-[#dce9ff] text-[#009299] font-bold text-[10px] uppercase">
                          {b.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => onOpenGatepass(b)}
                            className="px-2.5 py-1 bg-[#eff4ff] text-[#426086] hover:bg-[#dce9ff] rounded text-xs font-semibold border border-[#cbdbf5] cursor-pointer transition-colors"
                          >
                            Grant Voucher
                          </button>

                          {isAdmin && onUpdateBooking && (
                            <button
                              type="button"
                              onClick={() => openEditModal(b)}
                              className="p-1.5 rounded text-[#426086] hover:bg-[#eff4ff] border border-[#cbdbf5] cursor-pointer"
                              title="Edit Permanent Allocation"
                            >
                              <span className="material-symbols-outlined text-[16px]">edit</span>
                            </button>
                          )}

                          {isAdmin && onDeleteBooking && (
                            confirmDeleteId === rowId ? (
                              <div className="flex items-center gap-1 bg-rose-50 border border-rose-200 px-2 py-0.5 rounded">
                                <button
                                  type="button"
                                  disabled={deletingId === rowId}
                                  onClick={() => handleDeleteRecord(rowId)}
                                  className="px-2 py-0.5 bg-rose-600 hover:bg-rose-700 text-white rounded text-[10px] font-bold cursor-pointer"
                                >
                                  {deletingId === rowId ? '...' : 'Remove'}
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setConfirmDeleteId(null)}
                                  className="px-1.5 py-0.5 text-[#44474c] hover:bg-white rounded text-[10px] font-semibold cursor-pointer"
                                >
                                  No
                                </button>
                              </div>
                            ) : (
                              <button
                                type="button"
                                onClick={() => setConfirmDeleteId(rowId)}
                                className="p-1.5 rounded text-rose-600 hover:bg-rose-50 border border-rose-200 cursor-pointer"
                                title="Remove Permanent Allocation"
                              >
                                <span className="material-symbols-outlined text-[16px]">delete</span>
                              </button>
                            )
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ADD / EDIT PERMANENT ALLOCATION MODAL */}
      {isAddEditOpen && (
        <div
          className="fixed inset-0 z-50 bg-[#0e1c2f]/65 backdrop-blur-sm flex items-center justify-center p-3 sm:p-5 animate-in fade-in duration-150"
          onClick={() => setIsAddEditOpen(false)}
        >
          <div
            className="bg-white rounded-2xl shadow-2xl border border-[#cbdbf5] max-w-xl w-full max-h-[92vh] flex flex-col overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-6 py-4 border-b border-[#e5eeff] flex items-center justify-between bg-[#f8fafd]">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-[#0e1c2f] text-[#75f5fd] flex items-center justify-center">
                  <span className="material-symbols-outlined text-[20px]">
                    {editingRecord ? 'edit' : 'add_box'}
                  </span>
                </div>
                <div>
                  <h3 className="text-base font-bold text-[#0b1c30]">
                    {editingRecord ? 'Edit Permanent Allocation' : 'Add New Permanent Allocation'}
                  </h3>
                  <p className="text-[11px] text-[#72777f]">
                    Saved directly in Cloud Firestore for real-time departmental custody tracking.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsAddEditOpen(false)}
                className="p-1 text-gray-400 hover:text-gray-700 cursor-pointer"
              >
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>

            <form onSubmit={handleSavePermanent} className="p-6 overflow-y-auto flex-1 flex flex-col gap-3.5 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="sm:col-span-2">
                  <label className="block font-bold text-[#0b1c30] mb-1">Select Catalog Asset (or Custom)</label>
                  <select
                    value={selectedAssetCode}
                    onChange={(e) => {
                      const code = e.target.value;
                      setSelectedAssetCode(code);
                      if (code !== '__custom__') {
                        const found = assets.find((a) => a.code === code);
                        if (found) {
                          setCustomAssetCode(found.code);
                          setAssetName(found.name);
                        }
                      }
                    }}
                    className="w-full h-9 px-3 rounded-lg border border-[#cbdbf5] bg-white font-semibold"
                  >
                    <option value="__custom__">-- Enter Custom SKU / Asset Manually --</option>
                    {assets.map((a) => (
                      <option key={a.code} value={a.code}>
                        {a.code} — {a.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-[#0b1c30] mb-1">SKU / Asset Code *</label>
                  <input
                    type="text"
                    required
                    value={selectedAssetCode === '__custom__' ? customAssetCode : selectedAssetCode}
                    onChange={(e) => {
                      setSelectedAssetCode('__custom__');
                      setCustomAssetCode(e.target.value);
                    }}
                    placeholder="e.g. AST-0036"
                    className="w-full h-9 px-3 rounded-lg border border-[#cbdbf5] font-mono font-bold bg-[#eff4ff]/40 focus:bg-white"
                  />
                </div>

                <div>
                  <label className="block font-bold text-[#0b1c30] mb-1">Quantity *</label>
                  <input
                    type="number"
                    min={1}
                    required
                    value={quantity}
                    onChange={(e) => setQuantity(Math.max(1, Number(e.target.value)))}
                    className="w-full h-9 px-3 rounded-lg border border-[#cbdbf5] font-bold bg-[#eff4ff]/40 focus:bg-white"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block font-bold text-[#0b1c30] mb-1">Asset Description *</label>
                  <input
                    type="text"
                    required
                    value={assetName}
                    onChange={(e) => setAssetName(e.target.value)}
                    placeholder='e.g. Samsung 27" Curved FHD Monitor (LS27D388GAWXXL)'
                    className="w-full h-9 px-3 rounded-lg border border-[#cbdbf5] bg-[#eff4ff]/40 focus:bg-white font-semibold"
                  />
                </div>

                <div>
                  <label className="block font-bold text-[#0b1c30] mb-1">Assigned Custodian *</label>
                  <input
                    list="perm-custodian-list"
                    required
                    value={custodianName}
                    onChange={(e) => {
                      const val = e.target.value;
                      setCustodianName(val);
                      const matched = allCustodians.find(
                        (u) => u.name.toLowerCase() === val.toLowerCase().trim()
                      );
                      if (matched) {
                        setCustodianEmail(matched.email);
                        setCustodianDept(matched.department);
                        if (matched.room && !venue) setVenue(matched.room);
                      }
                    }}
                    placeholder="e.g. Malay Aggarwal"
                    className="w-full h-9 px-3 rounded-lg border border-[#cbdbf5] bg-[#eff4ff]/40 focus:bg-white font-semibold"
                  />
                  <datalist id="perm-custodian-list">
                    {allCustodians.map((u) => (
                      <option key={u.id || u.email} value={u.name} />
                    ))}
                  </datalist>
                </div>

                <div>
                  <label className="block font-bold text-[#0b1c30] mb-1">Custodian Email</label>
                  <input
                    type="email"
                    value={custodianEmail}
                    onChange={(e) => setCustodianEmail(e.target.value)}
                    placeholder="malay@sunstone.in"
                    className="w-full h-9 px-3 rounded-lg border border-[#cbdbf5] bg-[#eff4ff]/40 focus:bg-white font-mono"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block font-bold text-[#0b1c30] mb-1">Dedicated Venue / Office / Room *</label>
                  <input
                    type="text"
                    required
                    value={venue}
                    onChange={(e) => setVenue(e.target.value)}
                    placeholder="e.g. Main Admin Building, Suite 101 (Malay Sir Office)"
                    className="w-full h-9 px-3 rounded-lg border border-[#cbdbf5] bg-[#eff4ff]/40 focus:bg-white"
                  />
                </div>

                <div>
                  <label className="block font-bold text-[#0b1c30] mb-1">Grant / Project ID</label>
                  <input
                    type="text"
                    value={grantId}
                    onChange={(e) => setGrantId(e.target.value)}
                    placeholder="RES-GRANT-2025"
                    className="w-full h-9 px-3 rounded-lg border border-[#cbdbf5] font-mono bg-[#eff4ff]/40 focus:bg-white"
                  />
                </div>

                <div>
                  <label className="block font-bold text-[#0b1c30] mb-1">Status</label>
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value as BookingStatus)}
                    className="w-full h-9 px-3 rounded-lg border border-[#cbdbf5] bg-white font-semibold"
                  >
                    <option value="approved">Approved</option>
                    <option value="dispatched">Dispatched / Active</option>
                    <option value="pending">Pending Verification</option>
                  </select>
                </div>

                <div className="sm:col-span-2">
                  <label className="block font-bold text-[#0b1c30] mb-1">Duration / Tenure</label>
                  <input
                    type="text"
                    value={duration}
                    onChange={(e) => setDuration(e.target.value)}
                    placeholder="Permanent Allocation (Multi-Year Institutional Tenure)"
                    className="w-full h-9 px-3 rounded-lg border border-[#cbdbf5] bg-[#eff4ff]/40 focus:bg-white"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block font-bold text-[#0b1c30] mb-1">Notes / Serial Number Remarks</label>
                  <textarea
                    rows={2}
                    value={remarks}
                    onChange={(e) => setRemarks(e.target.value)}
                    placeholder="Serial number, adapter specs, or custody notes..."
                    className="w-full p-2.5 rounded-lg border border-[#cbdbf5] bg-[#eff4ff]/40 focus:bg-white resize-none"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#e5eeff]">
                <button
                  type="button"
                  onClick={() => setIsAddEditOpen(false)}
                  className="px-4 py-2 rounded-lg border border-[#cbdbf5] font-semibold text-[#44474c] hover:bg-[#eff4ff] cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-4 py-2 rounded-lg bg-[#0e1c2f] hover:bg-[#426086] text-white font-bold flex items-center gap-1.5 cursor-pointer disabled:opacity-60"
                >
                  <span className="material-symbols-outlined text-[16px]">save</span>
                  <span>{saving ? 'Saving...' : editingRecord ? 'Update Allocation' : 'Save Permanent Allocation'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 1: LIVE PERMANENT UNITS DRILL-DOWN */}
      {activeModal === 'units' && (
        <div
          className="fixed inset-0 z-50 bg-[#0e1c2f]/70 backdrop-blur-sm flex items-center justify-center p-3 sm:p-5 animate-in fade-in duration-200"
          onClick={() => setActiveModal(null)}
        >
          <div
            className="bg-white rounded-2xl shadow-2xl border border-[#cbdbf5] max-w-4xl w-full max-h-[90vh] flex flex-col overflow-hidden text-left"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-6 py-4 border-b border-[#e5eeff] flex items-center justify-between bg-[#f8fafd]">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#0e1c2f]/10 text-[#0e1c2f] flex items-center justify-center">
                  <span className="material-symbols-outlined text-[24px]">devices</span>
                </div>
                <div>
                  <h2 className="text-lg font-bold text-[#0b1c30]">
                    Active Permanent Hardware Custody ({totalPermanentUnits} {totalPermanentUnits === 1 ? 'Unit' : 'Units'})
                  </h2>
                  <p className="text-xs text-[#72777f]">
                    Synced directly with your live permanent allocations ledger.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setActiveModal(null)}
                className="w-8 h-8 rounded-lg text-[#72777f] hover:text-[#0b1c30] hover:bg-[#eff4ff] flex items-center justify-center cursor-pointer"
              >
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>

            <div className="p-4 border-b border-[#e5eeff] bg-white">
              <div className="relative">
                <span className="material-symbols-outlined absolute left-3 top-2.5 text-[18px] text-[#72777f]">
                  search
                </span>
                <input
                  type="text"
                  placeholder="Search by SKU code, asset name, custodian, venue, or grant..."
                  value={modalSearch}
                  onChange={(e) => setModalSearch(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 bg-[#f8fafd] border border-[#cbdbf5] rounded-lg text-xs font-medium text-[#0b1c30]"
                />
              </div>
            </div>

            <div className="p-6 overflow-y-auto flex-1">
              {modalFilteredBookings.length === 0 ? (
                <div className="py-12 text-center text-[#72777f] text-xs">
                  No permanent allocations match your search.
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                  {modalFilteredBookings.map((b, idx) => (
                    <div
                      key={b.reqId || b.id || `mperm-${idx}`}
                      className="p-4 bg-white rounded-xl border border-[#cbdbf5] hover:border-[#009299] transition-all flex flex-col justify-between gap-3 text-xs"
                    >
                      <div>
                        <div className="flex items-center justify-between gap-2 mb-1.5">
                          <span className="font-mono font-bold text-[#0e1c2f] bg-[#eff4ff] px-2 py-0.5 rounded text-[11px]">
                            {b.assetCode}
                          </span>
                          <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 uppercase">
                            {b.status}
                          </span>
                        </div>
                        <h3 className="font-bold text-[#0b1c30] text-sm leading-snug">{b.assetName}</h3>
                        <div className="mt-3 p-2.5 rounded-lg bg-[#f8fafd] border border-[#e5eeff] space-y-1.5 text-[11px]">
                          <div className="flex items-center justify-between">
                            <span className="text-[#72777f]">Custodian:</span>
                            <span className="font-bold text-[#0b1c30]">{b.requesterName}</span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-[#72777f]">Venue:</span>
                            <span className="font-semibold text-[#0b1c30] text-right">{b.venue || 'Main Admin Building'}</span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-[#72777f]">Grant / Project:</span>
                            <span className="font-mono text-[10px] text-[#426086]">{b.grantId || 'RES-GRANT-2025'}</span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-[#72777f]">Quantity:</span>
                            <span className="font-bold text-[#009299]">{b.quantity || 1} Unit(s)</span>
                          </div>
                        </div>
                        {b.remarks && (
                          <p className="mt-2 text-[11px] text-[#44474c] bg-[#f8fafd] p-2 rounded border border-[#f1f5f9]">
                            {b.remarks}
                          </p>
                        )}
                      </div>
                      <div className="pt-2 border-t border-[#f1f5f9] flex items-center justify-between text-[10px] text-[#72777f]">
                        <span className="text-emerald-700 font-semibold flex items-center gap-1">
                          <span className="material-symbols-outlined text-[13px]">verified</span>
                          Permanent Custody Active
                        </span>
                        <span className="font-mono">{b.reqId}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="px-6 py-3 border-t border-[#e5eeff] bg-[#f8fafd] flex items-center justify-between">
              <span className="text-xs text-[#72777f]">Live Institutional Hardware Registry</span>
              <button
                type="button"
                onClick={() => setActiveModal(null)}
                className="px-4 py-1.5 rounded-lg bg-[#0e1c2f] hover:bg-[#426086] text-white text-xs font-semibold cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: AUDIT RECONCILIATION DRILL-DOWN */}
      {activeModal === 'audit' && (
        <div
          className="fixed inset-0 z-50 bg-[#0e1c2f]/70 backdrop-blur-sm flex items-center justify-center p-3 sm:p-5 animate-in fade-in duration-200"
          onClick={() => setActiveModal(null)}
        >
          <div
            className="bg-white rounded-2xl shadow-2xl border border-[#cbdbf5] max-w-3xl w-full max-h-[90vh] flex flex-col overflow-hidden text-left"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-6 py-4 border-b border-[#e5eeff] flex items-center justify-between bg-[#f8fafd]">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#426086]/10 text-[#426086] flex items-center justify-center">
                  <span className="material-symbols-outlined text-[24px]">fact_check</span>
                </div>
                <div>
                  <h2 className="text-lg font-bold text-[#0b1c30]">
                    Physical Audit Reconciliation (Annual Term II)
                  </h2>
                  <p className="text-xs text-[#72777f]">
                    Conducted by authorized Admin &amp; Office Staff (Malay Aggarwal &amp; Arpit Singh).
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setActiveModal(null)}
                className="w-8 h-8 rounded-lg text-[#72777f] hover:text-[#0b1c30] hover:bg-[#eff4ff] flex items-center justify-center cursor-pointer"
              >
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>

            <div className="p-6 overflow-y-auto flex-1 space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200">
                  <span className="font-bold text-emerald-800 block">Reconciled Units</span>
                  <span className="text-lg font-bold text-[#0b1c30]">{totalPermanentUnits} / {totalPermanentUnits}</span>
                </div>
                <div className="p-3 rounded-xl bg-[#eff4ff] border border-[#cbdbf5]">
                  <span className="font-bold text-[#426086] block">Audit Officers</span>
                  <span className="text-xs font-bold text-[#0b1c30]">Malay Aggarwal &amp; Arpit Singh</span>
                </div>
                <div className="p-3 rounded-xl bg-sky-50 border border-sky-200">
                  <span className="font-bold text-sky-800 block">Variance</span>
                  <span className="text-lg font-bold text-emerald-700">0 Missing</span>
                </div>
              </div>

              <div className="overflow-x-auto border border-[#cbdbf5] rounded-xl">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="bg-[#eff4ff] text-[#426086] font-bold uppercase text-[10px] border-b border-[#cbdbf5]">
                      <th className="py-2.5 px-3">SKU</th>
                      <th className="py-2.5 px-3">Asset</th>
                      <th className="py-2.5 px-3">Custodian</th>
                      <th className="py-2.5 px-3">Venue</th>
                      <th className="py-2.5 px-3">Audit Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#e5eeff]">
                    {permBookings.map((b, i) => (
                      <tr key={b.reqId || `aud-${i}`}>
                        <td className="py-2.5 px-3 font-mono font-bold">{b.assetCode}</td>
                        <td className="py-2.5 px-3 font-medium">{b.assetName}</td>
                        <td className="py-2.5 px-3 font-semibold">{b.requesterName}</td>
                        <td className="py-2.5 px-3 text-[#44474c]">{b.venue}</td>
                        <td className="py-2.5 px-3">
                          <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 font-bold text-[10px]">
                            Verified
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="px-6 py-3 border-t border-[#e5eeff] bg-[#f8fafd] flex justify-end">
              <button
                type="button"
                onClick={() => setActiveModal(null)}
                className="px-4 py-1.5 rounded-lg bg-[#0e1c2f] hover:bg-[#426086] text-white text-xs font-semibold cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
