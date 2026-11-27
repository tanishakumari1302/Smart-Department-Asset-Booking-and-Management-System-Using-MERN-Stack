import React, { useState } from 'react';
import { Booking, BookingStatus } from '../types';
import { AssetPhotoProofModal } from './modals/AssetPhotoProofModal';
import { playBookingConfirmedSound } from '../utils/soundUtils';

interface ApprovalsViewProps {
  bookings: Booking[];
  isAdmin?: boolean;
  onApprove: (reqId: string, isStockIssue?: boolean) => void;
  onOpenRejectModal: (booking: Booking) => void;
  onOpenGatepass: (booking: Booking) => void;
  onUpdateBooking?: (reqId: string, updates: Partial<Booking>) => Promise<void>;
  onDeleteBooking?: (reqId: string) => Promise<void>;
  showToast?: (text: string, type: 'success' | 'warning' | 'info') => void;
}

export const ApprovalsView: React.FC<ApprovalsViewProps> = ({
  bookings,
  isAdmin = false,
  onApprove,
  onOpenRejectModal,
  onOpenGatepass,
  onUpdateBooking,
  onDeleteBooking,
  showToast,
}) => {
  const [filterType, setFilterType] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('pending');
  const [proofModalBooking, setProofModalBooking] = useState<Booking | null>(null);

  // Edit booking modal state
  const [editingBooking, setEditingBooking] = useState<Booking | null>(null);
  const [editRequesterName, setEditRequesterName] = useState('');
  const [editVenue, setEditVenue] = useState('');
  const [editBookingDate, setEditBookingDate] = useState('');
  const [editStartTime, setEditStartTime] = useState('');
  const [editEndTime, setEditEndTime] = useState('');
  const [editQuantity, setEditQuantity] = useState<number>(1);
  const [editPurpose, setEditPurpose] = useState('');
  const [editStatus, setEditStatus] = useState<BookingStatus>('pending');
  const [editRemarks, setEditRemarks] = useState('');
  const [savingEdit, setSavingEdit] = useState(false);

  // Inline delete confirm state
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const filtered = bookings.filter((b) => {
    const matchesType = filterType === 'all' || b.type === filterType;
    const matchesStatus = filterStatus === 'all' || b.status === filterStatus;
    return matchesType && matchesStatus;
  });

  const handleStartEdit = (b: Booking) => {
    setEditingBooking(b);
    setEditRequesterName(b.requesterName || '');
    setEditVenue(b.venue || '');
    setEditBookingDate(b.bookingDate || '');
    setEditStartTime(b.startTime || '');
    setEditEndTime(b.endTime || '');
    setEditQuantity(b.quantity || 1);
    setEditPurpose(b.purpose || '');
    setEditStatus(b.status || 'pending');
    setEditRemarks(b.remarks || '');
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingBooking || !onUpdateBooking) return;
    setSavingEdit(true);
    try {
      const targetId = editingBooking.id || editingBooking.reqId || editingBooking._id;
      await onUpdateBooking(targetId, {
        requesterName: editRequesterName.trim() || editingBooking.requesterName,
        venue: editVenue.trim(),
        bookingDate: editBookingDate.trim(),
        startTime: editStartTime.trim(),
        endTime: editEndTime.trim(),
        quantity: Math.max(1, Number(editQuantity) || 1),
        purpose: editPurpose.trim(),
        status: editStatus,
        remarks: editRemarks.trim(),
      });
      if (showToast) showToast(`Updated booking ${targetId}`, 'success');
      setEditingBooking(null);
    } catch (err: any) {
      if (showToast) showToast(err.message || 'Failed to update booking', 'warning');
    } finally {
      setSavingEdit(false);
    }
  };

  const handleConfirmDelete = async (reqId: string) => {
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
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="font-mono text-xs uppercase text-[#009299] font-bold">
              Admin &amp; Office Staff Command
            </span>
            <span className="w-1.5 h-1.5 rounded-full bg-[#009299]"></span>
            <span className="text-[11px] uppercase text-[#44474c] font-semibold">
              Requisition Approvals Desk
            </span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-[#0b1c30]">
            Departmental Request Approvals Queue
          </h1>
        </div>

        {/* Filters */}
        <div className="flex items-center gap-2">
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="h-9 px-3 rounded-lg bg-white border border-[#cbdbf5] text-xs font-semibold text-[#0b1c30] shadow-sm"
          >
            <option value="pending">Status: Pending Only</option>
            <option value="approved">Status: Approved</option>
            <option value="dispatched">Status: Dispatched / In-Use</option>
            <option value="returned">Status: Returned</option>
            <option value="rejected">Status: Rejected</option>
            <option value="cancelled">Status: Cancelled</option>
            <option value="all">Status: All Records</option>
          </select>

          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="h-9 px-3 rounded-lg bg-white border border-[#cbdbf5] text-xs font-semibold text-[#0b1c30] shadow-sm"
          >
            <option value="all">All Request Types</option>
            <option value="temporary">Temporary Checkouts</option>
            <option value="permanent">Permanent Allocations</option>
            <option value="consumable">Consumable Issues</option>
          </select>
        </div>
      </div>

      {/* Table Card */}
      <div className="bg-white rounded-xl shadow-sm border border-[#e5eeff] p-5">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-[#eff4ff] text-[#44474c] text-[11px] uppercase tracking-wider h-10">
                <th className="px-4 py-2 font-semibold rounded-l-lg">Req ID</th>
                <th className="px-4 py-2 font-semibold">Item &amp; Code</th>
                <th className="px-4 py-2 font-semibold">Requester</th>
                <th className="px-4 py-2 font-semibold">Destination / Slot</th>
                <th className="px-4 py-2 font-semibold">Type</th>
                <th className="px-4 py-2 font-semibold">Status</th>
                <th className="px-4 py-2 font-semibold text-right rounded-r-lg">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#e5eeff] text-xs">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-gray-500">
                    No requisitions found matching current filters.
                  </td>
                </tr>
              ) : (
                filtered.map((b, idx) => {
                  const rowId = b.reqId || b.id || b._id;
                  const bEmail = (b.requesterEmail || '').toLowerCase();
                  const bName = (b.requesterName || '').toLowerCase();
                  const activeHeldByRequester = bookings.filter((other) => {
                    if ((other.reqId || other.id) === (b.reqId || b.id)) return false;
                    if (other.status !== 'approved' && other.status !== 'dispatched') return false;
                    const oEmail = (other.requesterEmail || '').toLowerCase();
                    const oName = (other.requesterName || '').toLowerCase();
                    return (bEmail && oEmail === bEmail) || (bName && oName === bName);
                  });
                  const alreadyHoldsSameItem = activeHeldByRequester.some(
                    (other) => (other.assetCode || '').toLowerCase() === (b.assetCode || '').toLowerCase()
                  );
                  const showExtraBadge = !!b.isExtraUnitRequest || alreadyHoldsSameItem;
                  const custodySummaryText =
                    b.existingCustodyNote ||
                    (activeHeldByRequester.length > 0
                      ? activeHeldByRequester
                          .slice(0, 2)
                          .map((o) => `${o.quantity || 1}× ${o.assetName}`)
                          .join(', ') +
                        (activeHeldByRequester.length > 2 ? ` +${activeHeldByRequester.length - 2} more` : '')
                      : '');

                  return (
                    <tr key={b.id || b._id || b.reqId || `appr-${idx}`} className="hover:bg-[#eff4ff]/40 transition-colors">
                      <td className="px-4 py-3 font-mono font-bold text-[#0e1c2f]">
                        <div>{b.reqId}</div>
                        {b.allottedDirectly && (
                          <span className="inline-block mt-0.5 px-1.5 py-0.2 rounded bg-teal-50 text-[#009299] border border-teal-200 text-[9px] font-bold uppercase">
                            Direct Allot
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-col gap-0.5">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="font-semibold text-[#0b1c30]">
                              {b.assetName} {b.quantity > 1 ? `(x${b.quantity})` : ''}
                            </span>
                            {showExtraBadge && (
                              <span
                                className="px-1.5 py-0.5 rounded bg-amber-100 text-amber-800 border border-amber-300 text-[9px] font-bold uppercase"
                                title="Faculty already holds this or similar hardware in active custody"
                              >
                                Extra Unit
                              </span>
                            )}
                          </div>
                          <span className="font-mono text-[10px] text-[#44474c]">{b.assetCode}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-col gap-0.5">
                          <span className="font-medium text-[#0b1c30]">{b.requesterName}</span>
                          <span className="text-[10px] text-[#44474c]">{b.requesterRole}</span>
                          {custodySummaryText && (
                            <span
                              className="inline-flex items-center gap-1 mt-0.5 px-1.5 py-0.5 rounded bg-[#eff4ff] text-[#426086] border border-[#cbdbf5] text-[10px] font-medium max-w-[210px] truncate"
                              title={`Already holds: ${custodySummaryText}`}
                            >
                              <span className="material-symbols-outlined text-[11px] text-[#009299]">inventory_2</span>
                              <span className="truncate">Holds: {custodySummaryText}</span>
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-col">
                          <span className="text-[#0b1c30]">{b.venue || 'Academic Wing'}</span>
                          <span className="text-[10px] text-[#44474c] font-mono">
                            {b.bookingDate || 'Today'} {b.startTime ? `${b.startTime} - ${b.endTime}` : ''}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className="px-2 py-0.5 rounded-full bg-[#eff4ff] text-[#426086] text-[10px] font-bold uppercase">
                          {b.type}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                            b.status === 'approved' || b.status === 'dispatched'
                              ? 'bg-[#dce9ff] text-[#009299]'
                              : b.status === 'pending'
                              ? 'bg-[#d3e4fe] text-[#0b1c30]'
                              : b.status === 'returned'
                              ? 'bg-emerald-50 text-emerald-700'
                              : 'bg-[#ffdad6] text-[#ba1a1a]'
                          }`}
                        >
                          {b.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-1.5 flex-wrap">
                          {b.status === 'pending' && (
                            <>
                              <button
                                onClick={() => {
                                  playBookingConfirmedSound();
                                  onApprove(b.reqId, b.type === 'consumable');
                                }}
                                className="px-2.5 py-1 bg-[#0e1c2f] text-white hover:bg-[#426086] rounded text-xs font-semibold transition-all shadow-sm flex items-center gap-1 cursor-pointer"
                              >
                                <span className="material-symbols-outlined text-[15px]">thumb_up</span>
                                <span>{b.type === 'consumable' ? 'Issue Stock' : 'Approve'}</span>
                              </button>
                              <button
                                onClick={() => onOpenRejectModal(b)}
                                className="px-2 py-1 text-[#ba1a1a] hover:bg-[#ffdad6] rounded text-xs font-semibold transition-all cursor-pointer"
                                title="Reject Requisition"
                              >
                                <span className="material-symbols-outlined text-[16px]">close</span>
                              </button>
                            </>
                          )}
                          {(b.handoverPhoto || b.returnPhoto) && (
                            <button
                              type="button"
                              onClick={() => setProofModalBooking(b)}
                              className="px-2 py-1 bg-[#eff4ff] text-[#009299] hover:bg-[#dce9ff] rounded text-xs font-semibold transition-all border border-[#cbdbf5] flex items-center gap-1 cursor-pointer"
                              title="View Photo Proof"
                            >
                              <span className="material-symbols-outlined text-[15px]">photo_camera</span>
                              <span>Proof</span>
                            </button>
                          )}
                          {(b.status === 'approved' || b.status === 'dispatched') && (
                            <button
                              onClick={() => onOpenGatepass(b)}
                              className="px-2.5 py-1 bg-[#eff4ff] text-[#0b1c30] hover:bg-[#dce9ff] rounded text-xs font-semibold transition-all border border-[#cbdbf5] flex items-center gap-1 cursor-pointer"
                            >
                              <span className="material-symbols-outlined text-[15px]">receipt_long</span>
                              <span>Gatepass</span>
                            </button>
                          )}

                          {/* Admin Full Edit & Delete Actions */}
                          {isAdmin && onUpdateBooking && (
                            <button
                              type="button"
                              onClick={() => handleStartEdit(b)}
                              className="p-1.5 text-[#426086] hover:bg-[#eff4ff] rounded border border-[#cbdbf5] cursor-pointer"
                              title="Edit Requisition Details"
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
                                  onClick={() => handleConfirmDelete(rowId)}
                                  className="px-2 py-0.5 bg-rose-600 hover:bg-rose-700 text-white rounded text-[10px] font-bold cursor-pointer"
                                >
                                  {deletingId === rowId ? '...' : 'Confirm'}
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
                                className="p-1.5 text-rose-600 hover:bg-rose-50 rounded border border-rose-200 cursor-pointer"
                                title="Delete Requisition Record"
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

      {/* Edit Booking Modal */}
      {editingBooking && (
        <div className="fixed inset-0 z-50 bg-[#0e1c2f]/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl shadow-2xl border border-[#cbdbf5] max-w-lg w-full p-6 flex flex-col gap-4">
            <div className="flex items-center justify-between pb-3 border-b border-[#e5eeff]">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-[#009299]">edit_document</span>
                <div>
                  <h3 className="text-base font-bold text-[#0b1c30]">Edit Requisition Record</h3>
                  <span className="text-[11px] font-mono text-[#426086]">
                    {editingBooking.reqId} • {editingBooking.assetName}
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setEditingBooking(null)}
                className="text-gray-400 hover:text-gray-700 p-1 cursor-pointer"
              >
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="flex flex-col gap-3 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-[#0b1c30] mb-1">Requester Name</label>
                  <input
                    type="text"
                    required
                    value={editRequesterName}
                    onChange={(e) => setEditRequesterName(e.target.value)}
                    className="w-full h-9 px-3 rounded-lg border border-[#cbdbf5] bg-[#eff4ff]/40 focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#009299]"
                  />
                </div>
                <div>
                  <label className="block font-bold text-[#0b1c30] mb-1">Status</label>
                  <select
                    value={editStatus}
                    onChange={(e) => setEditStatus(e.target.value as BookingStatus)}
                    className="w-full h-9 px-3 rounded-lg border border-[#cbdbf5] bg-white font-semibold"
                  >
                    <option value="pending">Pending</option>
                    <option value="approved">Approved</option>
                    <option value="dispatched">Dispatched / In-Use</option>
                    <option value="returned">Returned</option>
                    <option value="rejected">Rejected</option>
                    <option value="cancelled">Cancelled</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-[#0b1c30] mb-1">Destination / Venue</label>
                  <input
                    type="text"
                    value={editVenue}
                    onChange={(e) => setEditVenue(e.target.value)}
                    className="w-full h-9 px-3 rounded-lg border border-[#cbdbf5] bg-[#eff4ff]/40 focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#009299]"
                  />
                </div>
                <div>
                  <label className="block font-bold text-[#0b1c30] mb-1">Quantity</label>
                  <input
                    type="number"
                    min={1}
                    value={editQuantity}
                    onChange={(e) => setEditQuantity(Math.max(1, Number(e.target.value)))}
                    className="w-full h-9 px-3 rounded-lg border border-[#cbdbf5] bg-[#eff4ff]/40 focus:bg-white font-bold"
                  />
                </div>

                <div>
                  <label className="block font-bold text-[#0b1c30] mb-1">Booking Date</label>
                  <input
                    type="date"
                    value={editBookingDate}
                    onChange={(e) => setEditBookingDate(e.target.value)}
                    className="w-full h-9 px-3 rounded-lg border border-[#cbdbf5] bg-[#eff4ff]/40 focus:bg-white"
                  />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block font-bold text-[#0b1c30] mb-1">Start</label>
                    <input
                      type="text"
                      value={editStartTime}
                      onChange={(e) => setEditStartTime(e.target.value)}
                      placeholder="10:00"
                      className="w-full h-9 px-2.5 rounded-lg border border-[#cbdbf5] bg-[#eff4ff]/40 focus:bg-white"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-[#0b1c30] mb-1">End</label>
                    <input
                      type="text"
                      value={editEndTime}
                      onChange={(e) => setEditEndTime(e.target.value)}
                      placeholder="12:00"
                      className="w-full h-9 px-2.5 rounded-lg border border-[#cbdbf5] bg-[#eff4ff]/40 focus:bg-white"
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="block font-bold text-[#0b1c30] mb-1">Purpose</label>
                <input
                  type="text"
                  value={editPurpose}
                  onChange={(e) => setEditPurpose(e.target.value)}
                  className="w-full h-9 px-3 rounded-lg border border-[#cbdbf5] bg-[#eff4ff]/40 focus:bg-white"
                />
              </div>

              <div>
                <label className="block font-bold text-[#0b1c30] mb-1">Admin Remarks</label>
                <textarea
                  rows={2}
                  value={editRemarks}
                  onChange={(e) => setEditRemarks(e.target.value)}
                  className="w-full p-2.5 rounded-lg border border-[#cbdbf5] bg-[#eff4ff]/40 focus:bg-white resize-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#e5eeff]">
                <button
                  type="button"
                  onClick={() => setEditingBooking(null)}
                  className="px-4 py-2 rounded-lg border border-[#cbdbf5] font-semibold text-[#44474c] hover:bg-[#eff4ff] cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingEdit}
                  className="px-4 py-2 rounded-lg bg-[#0e1c2f] hover:bg-[#426086] text-white font-bold flex items-center gap-1.5 cursor-pointer disabled:opacity-60"
                >
                  <span className="material-symbols-outlined text-[16px]">save</span>
                  <span>{savingEdit ? 'Saving...' : 'Save Changes'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <AssetPhotoProofModal
        isOpen={!!proofModalBooking}
        onClose={() => setProofModalBooking(null)}
        booking={proofModalBooking}
        mode="view"
        showToast={() => {}}
      />
    </div>
  );
};
