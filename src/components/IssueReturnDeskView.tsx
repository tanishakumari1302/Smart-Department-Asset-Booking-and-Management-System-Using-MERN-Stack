import React, { useState } from 'react';
import { Booking } from '../types';
import { AssetPhotoProofModal, PhotoProofModalMode } from './modals/AssetPhotoProofModal';

interface IssueReturnDeskViewProps {
  bookings: Booking[];
  onDispatch: (reqId: string, proofData?: { photo?: string; notes?: string; venue?: string }) => Promise<void>;
  onReturn: (
    reqId: string,
    condition: 'intact' | 'damaged' | 'minor-wear',
    proofData?: { photo?: string; notes?: string }
  ) => Promise<void>;
  onOpenGatepass: (booking: Booking) => void;
  showToast: (msg: string, type?: 'success' | 'warning' | 'info') => void;
}

export const IssueReturnDeskView: React.FC<IssueReturnDeskViewProps> = ({
  bookings,
  onDispatch,
  onReturn,
  onOpenGatepass,
  showToast,
}) => {
  const [proofModalBooking, setProofModalBooking] = useState<Booking | null>(null);
  const [proofModalMode, setProofModalMode] = useState<PhotoProofModalMode>('view');

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

                  <div className="flex items-center gap-1.5 shrink-0 self-end sm:self-center">
                    <button
                      type="button"
                      onClick={() => openProofModal(b, 'capture-handover')}
                      className="h-8 px-3 rounded bg-[#009299] text-white text-xs font-semibold hover:bg-[#009299]/90 transition-all flex items-center gap-1.5 shadow-sm"
                      title="Hand over with camera snapshot proof"
                    >
                      <span className="material-symbols-outlined text-[16px]">add_a_photo</span>
                      <span>Hand Over with Photo</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => onDispatch(b.reqId)}
                      className="h-8 px-2.5 rounded bg-[#0e1c2f] text-white text-xs font-semibold hover:bg-[#426086] transition-all"
                      title="Quick handover without photo"
                    >
                      <span>Direct</span>
                    </button>
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

                  <div className="flex items-center gap-1.5 shrink-0 self-end sm:self-center">
                    <button
                      type="button"
                      onClick={() => onOpenGatepass(b)}
                      className="h-8 px-2.5 rounded bg-white text-[#426086] text-xs font-semibold hover:bg-[#dce9ff] border border-[#cbdbf5]"
                      title="View Gatepass"
                    >
                      <span className="material-symbols-outlined text-[16px]">receipt_long</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => openProofModal(b, 'view')}
                      className="h-8 px-2.5 rounded bg-white text-[#0e1c2f] text-xs font-semibold hover:bg-gray-100 border border-[#cbdbf5]"
                      title="View Photo Proofs"
                    >
                      <span className="material-symbols-outlined text-[16px]">photo_library</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => openProofModal(b, 'capture-return')}
                      className="h-8 px-3 rounded bg-[#009299] text-white text-xs font-semibold hover:bg-[#009299]/90 transition-all flex items-center gap-1.5 shadow-sm"
                    >
                      <span className="material-symbols-outlined text-[16px]">assignment_turned_in</span>
                      <span>Verify Return</span>
                    </button>
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
                <th className="px-4 py-2 font-semibold text-right rounded-r-lg">Receipt</th>
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
                          className="px-2 py-0.5 rounded bg-[#eff4ff] hover:bg-[#dce9ff] text-[#0b1c30] text-[11px] font-semibold border border-[#cbdbf5] flex items-center gap-1"
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
                      <button
                        type="button"
                        onClick={() => onOpenGatepass(b)}
                        className="px-2.5 py-1 bg-[#eff4ff] text-[#426086] hover:bg-[#dce9ff] rounded text-xs font-semibold border border-[#cbdbf5]"
                      >
                        Slip
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

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
