import React, { useState } from 'react';
import { Booking, BookingStatus } from '../types';
import { AssetPhotoProofModal, PhotoProofModalMode } from './modals/AssetPhotoProofModal';

interface IssueReturnDeskViewProps {
  bookings: Booking[];
  isAdmin?: boolean;
  onDispatch: (reqId: string, proofData?: { photo?: string; notes?: string; venue?: string }) => Promise<void>;
  onReturn: (
    reqId: string,
    condition: 'intact' | 'damaged' | 'minor-wear',
    proofData?: { photo?: string; notes?: string }
  ) => Promise<void>;
  onOpenGatepass: (booking: Booking) => void;
  onUpdateBooking?: (reqId: string, updates: Partial<Booking>) => Promise<void>;
  onDeleteBooking?: (reqId: string) => Promise<void>;
  showToast: (msg: string, type?: 'success' | 'warning' | 'info') => void;
}

export const IssueReturnDeskView: React.FC<IssueReturnDeskViewProps> = ({
  bookings,
  isAdmin = false,
  onDispatch,
  onReturn,
  onOpenGatepass,
  onUpdateBooking,
  onDeleteBooking,
  showToast,
}) => {
  const [proofModalBooking, setProofModalBooking] = useState<Booking | null>(null);
  const [proofModalMode, setProofModalMode] = useState<PhotoProofModalMode>('view');

  // Admin Edit & Delete state
  const [editingBooking, setEditingBooking] = useState<Booking | null>(null);
  const [editRequesterName, setEditRequesterName] = useState('');
  const [editVenue, setEditVenue] = useState('');
  const [editStatus, setEditStatus] = useState<BookingStatus>('approved');
  const [editReturnCondition, setEditReturnCondition] = useState<'intact' | 'minor-wear' | 'damaged'>('intact');
  const [editRemarks, setEditRemarks] = useState('');
  const [savingEdit, setSavingEdit] = useState(false);

  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Active checkouts waiting for return
  const activeCheckouts = bookings.filter((b) => b.status === 'dispatched' && b.type === 'temporary');
  // Approved checkouts waiting for physical dispatch
  const readyForDispatch = bookings.filter((b) => b.status === 'approved' && b.type === 'temporary');
  // Recent returns
  const returnHistory = bookings.filter((b) => b.status === 'returned');

  const openProofModal = (booking: Booking, mode: PhotoProofModalMode) => {
    setProofModalBooking(booking);
    setProofModalMode(mode);
  };

  const handleStartEdit = (b: Booking) => {
    setEditingBooking(b);
    setEditRequesterName(b.requesterName || '');
    setEditVenue(b.venue || '');
    setEditStatus(b.status || 'approved');
    setEditReturnCondition((b.returnCondition as 'intact' | 'minor-wear' | 'damaged') || 'intact');
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
        status: editStatus,
        returnCondition: editStatus === 'returned' ? editReturnCondition : editingBooking.returnCondition,
        remarks: editRemarks.trim(),
      });
      setEditingBooking(null);
    } catch (err: any) {
      showToast(err.message || 'Failed to update dispatch record', 'warning');
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

  const handleConfirmHandoverProof = async (data: { photo: string; notes: string; venue: string }) => {
    if (!proofModalBooking) return;
    await onDispatch(proofModalBooking.reqId, {
      photo: data.photo,
      notes: data.notes,
      venue: data.venue,
    });
  };

  const handleConfirmReturnProof = async (data: {
    photo: string;
    notes: string;
    condition: 'intact' | 'damaged' | 'minor-wear';
  }) => {
    if (!proofModalBooking) return;
    await onReturn(proofModalBooking.reqId, data.condition, {
      photo: data.photo,
      notes: data.notes,
    });
  };

  const renderAdminActions = (b: Booking) => {
    if (!isAdmin) return null;
    const rowId = b.reqId || b.id || b._id;
    return (
      <>
        {onUpdateBooking && (
          <button
            type="button"
            onClick={() => handleStartEdit(b)}
            className="h-8 px-2 rounded bg-white text-[#426086] hover:bg-[#dce9ff] border border-[#cbdbf5] cursor-pointer"
            title="Edit Dispatch / Return Record"
          >
            <span className="material-symbols-outlined text-[15px]">edit</span>
          </button>
        )}
        {onDeleteBooking && (
          confirmDeleteId === rowId ? (
            <div className="flex items-center gap-1 bg-rose-50 border border-rose-200 px-1.5 py-0.5 rounded h-8">
              <button
                type="button"
                disabled={deletingId === rowId}
                onClick={() => handleConfirmDelete(rowId)}
                className="px-2 py-0.5 bg-rose-600 hover:bg-rose-700 text-white rounded text-[10px] font-bold cursor-pointer"
              >
                {deletingId === rowId ? '...' : 'Del'}
              </button>
              <button
                type="button"
                onClick={() => setConfirmDeleteId(null)}
                className="px-1 py-0.5 text-[#44474c] hover:bg-white rounded text-[10px] font-semibold cursor-pointer"
              >
                No
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setConfirmDeleteId(rowId)}
              className="h-8 px-2 rounded bg-white text-rose-600 hover:bg-rose-50 border border-rose-200 cursor-pointer"
              title="Delete Record"
            >
              <span className="material-symbols-outlined text-[15px]">delete</span>
            </button>
          )
        )}
      </>
    );
  };

  return (
    <div className="flex flex-col w-full gap-5 text-[#0b1c30]">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2 mb-1">
          <span className="font-mono text-xs uppercase text-[#009299] font-bold">
            Bay 2 Tech Station
          </span>
          <span className="w-1.5 h-1.5 rounded-full bg-[#009299]"></span>
          <span className="text-[11px] uppercase text-[#44474c] font-semibold">
            Central Custody &amp; Photo Audit Checkpoint
          </span>
        </div>
        <h1 className="text-2xl font-bold tracking-tight text-[#0b1c30]">
          Issue &amp; Return Desk Operations
        </h1>
        <p className="text-xs text-[#44474c] mt-0.5">
          Dual photographic proof custody verification: Photo clicked at approval/handover and photo clicked when returned from classroom.
        </p>
      </div>

      {/* Grid: Ready For Dispatch & Active Checkouts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Approved: Awaiting Physical Dispatch */}
        <div className="bg-white rounded-xl shadow-sm border border-[#e5eeff] p-5 flex flex-col gap-3">
          <div className="flex items-center justify-between pb-2 border-b border-[#e5eeff]">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-[#426086]">output</span>
              <h2 className="text-sm font-bold text-[#0b1c30]">Approved – Ready for Dispatch</h2>
            </div>
            <span className="px-2 py-0.5 rounded-full bg-[#eff4ff] text-[#426086] text-xs font-bold font-mono">
              {readyForDispatch.length} Units
            </span>
          </div>

          <div className="flex flex-col gap-2.5 max-h-80 overflow-y-auto">
            {readyForDispatch.length === 0 ? (
              <div className="py-6 text-center text-gray-500 text-xs">
                No approved bookings waiting for pickup.
              </div>
            ) : (
              readyForDispatch.map((b, idx) => (
                <div
                  key={b.id || b._id || b.reqId || `dispatch-${idx}`}
                  className="p-3.5 rounded-lg bg-[#eff4ff]/60 border border-[#cbdbf5] flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                >
                  <div className="flex flex-col">
                    <span className="font-semibold text-xs text-[#0b1c30]">{b.assetName}</span>
                    <span className="font-mono text-[10px] text-[#426086]">{b.reqId} · {b.assetCode}</span>
                    <span className="text-[11px] text-[#44474c]">Borrower: {b.requesterName} ({b.venue})</span>
                  </div>

                  <div className="flex items-center gap-1.5 flex-wrap shrink-0 self-end sm:self-center">
                    <button
                      type="button"
                      onClick={() => openProofModal(b, 'capture-handover')}
                      className="h-8 px-3 rounded bg-[#009299] text-white text-xs font-semibold hover:bg-[#009299]/90 transition-all flex items-center gap-1.5 shadow-sm cursor-pointer"
                      title="Hand over with camera snapshot proof"
                    >
                      <span className="material-symbols-outlined text-[16px]">add_a_photo</span>
                      <span>Hand Over with Photo</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => onDispatch(b.reqId)}
                      className="h-8 px-2.5 rounded bg-[#0e1c2f] text-white text-xs font-semibold hover:bg-[#426086] transition-all cursor-pointer"
                      title="Quick handover without photo"
                    >
                      <span>Direct</span>
                    </button>
                    {renderAdminActions(b)}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Active Checkouts: In-Custody */}
        <div className="bg-white rounded-xl shadow-sm border border-[#e5eeff] p-5 flex flex-col gap-3">
          <div className="flex items-center justify-between pb-2 border-b border-[#e5eeff]">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-[#ba1a1a]">pending_actions</span>
              <h2 className="text-sm font-bold text-[#0b1c30]">Active Checkouts (In Classroom)</h2>
            </div>
            <span className="px-2 py-0.5 rounded-full bg-[#eff4ff] text-[#ba1a1a] text-xs font-bold font-mono">
              {activeCheckouts.length} Units
            </span>
          </div>

          <div className="flex flex-col gap-2.5 max-h-80 overflow-y-auto">
            {activeCheckouts.length === 0 ? (
              <div className="py-6 text-center text-gray-500 text-xs">
                All checked-out units have been safely returned.
              </div>
            ) : (
              activeCheckouts.map((b, idx) => (
                <div
                  key={b.id || b._id || b.reqId || `active-${idx}`}
                  className="p-3.5 rounded-lg bg-[#eff4ff]/60 border border-[#cbdbf5] flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                >
                  <div className="flex flex-col">
                    <div className="flex items-center gap-1.5">
                      <span className="font-semibold text-xs text-[#0b1c30]">{b.assetName}</span>
                      {b.handoverPhoto && (
                        <span
                          onClick={() => openProofModal(b, 'view')}
                          className="cursor-pointer inline-flex items-center gap-0.5 px-1.5 py-0.2 rounded bg-[#009299]/15 text-[#009299] text-[9px] font-bold"
                          title="Handover photo verified"
                        >
                          <span className="material-symbols-outlined text-[11px]">photo_camera</span>
                          <span>Issue Proof OK</span>
                        </span>
                      )}
                    </div>
                    <span className="font-mono text-[10px] text-[#44474c]">{b.reqId} · {b.assetCode}</span>
                    <span className="text-[11px] text-[#44474c]">In Custody: {b.requesterName} ({b.venue})</span>
                  </div>

                  <div className="flex items-center gap-1.5 flex-wrap shrink-0 self-end sm:self-center">
                    <button
                      type="button"
                      onClick={() => onOpenGatepass(b)}
                      className="h-8 px-2.5 rounded bg-white text-[#426086] text-xs font-semibold hover:bg-[#dce9ff] border border-[#cbdbf5] cursor-pointer"
                      title="View Gatepass"
                    >
                      <span className="material-symbols-outlined text-[16px]">receipt_long</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => openProofModal(b, 'view')}
                      className="h-8 px-2.5 rounded bg-white text-[#0e1c2f] text-xs font-semibold hover:bg-gray-100 border border-[#cbdbf5] cursor-pointer"
                      title="View Photo Proofs"
                    >
                      <span className="material-symbols-outlined text-[16px]">photo_library</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => openProofModal(b, 'capture-return')}
                      className="h-8 px-3 rounded bg-[#009299] text-white text-xs font-semibold hover:bg-[#009299]/90 transition-all flex items-center gap-1.5 shadow-sm cursor-pointer"
                    >
                      <span className="material-symbols-outlined text-[16px]">assignment_turned_in</span>
                      <span>Verify Return</span>
                    </button>
                    {renderAdminActions(b)}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Return Audit History Table */}
      <div className="bg-white rounded-xl shadow-sm border border-[#e5eeff] p-5">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h3 className="text-sm font-bold text-[#0b1c30]">Recent Return Audit Receipts &amp; Photographic Evidence</h3>
            <p className="text-[11px] text-[#44474c]">Complete audit trail of equipment condition when handed over and when returned from classroom.</p>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="bg-[#eff4ff] text-[#44474c] text-[11px] uppercase tracking-wider h-9">
                <th className="px-4 py-2 font-semibold rounded-l-lg">Req ID</th>
                <th className="px-4 py-2 font-semibold">Equipment</th>
                <th className="px-4 py-2 font-semibold">Returned By</th>
                <th className="px-4 py-2 font-semibold">Condition Assessment</th>
                <th className="px-4 py-2 font-semibold">Photographic Proof</th>
                <th className="px-4 py-2 font-semibold">Audited By</th>
                <th className="px-4 py-2 font-semibold text-right rounded-r-lg">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#e5eeff]">
              {returnHistory.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-6 text-center text-gray-500">
                    No returned assets logged yet.
                  </td>
                </tr>
              ) : (
                returnHistory.map((b, idx) => (
                  <tr key={b.id || b._id || b.reqId || `ret-hist-${idx}`} className="hover:bg-[#eff4ff]/40">
                    <td className="px-4 py-2.5 font-mono font-bold text-[#0e1c2f]">{b.reqId}</td>
                    <td className="px-4 py-2.5 font-medium">
                      <div>{b.assetName}</div>
                      <span className="text-[10px] font-mono text-[#44474c]">{b.venue}</span>
                    </td>
                    <td className="px-4 py-2.5">{b.requesterName}</td>
                    <td className="px-4 py-2.5">
                      <span
                        className={`px-2 py-0.5 rounded-full font-bold text-[10px] uppercase ${
                          b.returnCondition === 'intact'
                            ? 'bg-[#dce9ff] text-[#009299]'
                            : b.returnCondition === 'minor-wear'
                            ? 'bg-amber-100 text-amber-800'
                            : 'bg-rose-100 text-rose-800'
                        }`}
                      >
                        {b.returnCondition || 'Intact'}
                      </span>
                    </td>
                    <td className="px-4 py-2.5">
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => openProofModal(b, 'view')}
                          className="px-2 py-0.5 rounded bg-[#eff4ff] hover:bg-[#dce9ff] text-[#0b1c30] text-[11px] font-semibold border border-[#cbdbf5] flex items-center gap-1 cursor-pointer"
                        >
                          <span className="material-symbols-outlined text-[13px] text-[#009299]">
                            {b.returnPhoto || b.handoverPhoto ? 'photo_camera' : 'add_a_photo'}
                          </span>
                          <span>
                            {b.handoverPhoto && b.returnPhoto
                              ? 'Both Photos OK'
                              : b.returnPhoto
                              ? 'Return Photo'
                              : b.handoverPhoto
                              ? 'Handover Photo'
                              : 'Add Photo'}
                          </span>
                        </button>
                      </div>
                    </td>
                    <td className="px-4 py-2.5 text-[#44474c]">{b.returnAuditedBy || b.returnBy || 'Tech Officer'}</td>
                    <td className="px-4 py-2.5 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          type="button"
                          onClick={() => onOpenGatepass(b)}
                          className="h-8 px-2.5 bg-[#eff4ff] text-[#426086] hover:bg-[#dce9ff] rounded text-xs font-semibold border border-[#cbdbf5] cursor-pointer"
                        >
                          Slip
                        </button>
                        {renderAdminActions(b)}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Admin Edit Record Modal */}
      {editingBooking && (
        <div className="fixed inset-0 z-50 bg-[#0e1c2f]/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl shadow-2xl border border-[#cbdbf5] max-w-md w-full overflow-hidden flex flex-col">
            <div className="px-5 py-3.5 bg-[#f8fafd] border-b border-[#e5eeff] flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-[#0b1c30]">Edit Issue / Return Record</h3>
                <span className="text-[11px] font-mono text-[#426086]">
                  {editingBooking.reqId} • {editingBooking.assetName}
                </span>
              </div>
              <button
                type="button"
                onClick={() => setEditingBooking(null)}
                className="text-gray-400 hover:text-gray-700 p-1 cursor-pointer"
              >
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="p-5 flex flex-col gap-3 text-xs">
              <div>
                <label className="block font-bold text-[#0b1c30] mb-1">Borrower / Faculty Name</label>
                <input
                  type="text"
                  required
                  value={editRequesterName}
                  onChange={(e) => setEditRequesterName(e.target.value)}
                  className="w-full h-9 px-3 rounded-lg border border-[#cbdbf5] bg-[#eff4ff]/40 focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#009299]"
                />
              </div>
              <div>
                <label className="block font-bold text-[#0b1c30] mb-1">Classroom / Venue</label>
                <input
                  type="text"
                  value={editVenue}
                  onChange={(e) => setEditVenue(e.target.value)}
                  className="w-full h-9 px-3 rounded-lg border border-[#cbdbf5] bg-[#eff4ff]/40 focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#009299]"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-[#0b1c30] mb-1">Status</label>
                  <select
                    value={editStatus}
                    onChange={(e) => setEditStatus(e.target.value as BookingStatus)}
                    className="w-full h-9 px-2.5 rounded-lg border border-[#cbdbf5] bg-white font-semibold"
                  >
                    <option value="approved">Approved (Ready)</option>
                    <option value="dispatched">Dispatched (In-Use)</option>
                    <option value="returned">Returned</option>
                    <option value="cancelled">Cancelled</option>
                  </select>
                </div>
                {editStatus === 'returned' && (
                  <div>
                    <label className="block font-bold text-[#0b1c30] mb-1">Return Condition</label>
                    <select
                      value={editReturnCondition}
                      onChange={(e) => setEditReturnCondition(e.target.value as 'intact' | 'minor-wear' | 'damaged')}
                      className="w-full h-9 px-2.5 rounded-lg border border-[#cbdbf5] bg-white font-semibold"
                    >
                      <option value="intact">Intact</option>
                      <option value="minor-wear">Minor Wear</option>
                      <option value="damaged">Damaged</option>
                    </select>
                  </div>
                )}
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

      {/* Asset Photo Proof Modal */}
      <AssetPhotoProofModal
        isOpen={!!proofModalBooking}
        onClose={() => setProofModalBooking(null)}
        booking={proofModalBooking}
        mode={proofModalMode}
        onConfirmHandover={handleConfirmHandoverProof}
        onConfirmReturn={handleConfirmReturnProof}
        showToast={showToast}
      />
    </div>
  );
};

