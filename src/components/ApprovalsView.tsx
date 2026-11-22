import React, { useState } from 'react';
import { Booking } from '../types';
import { AssetPhotoProofModal } from './modals/AssetPhotoProofModal';
import { playBookingConfirmedSound } from '../utils/soundUtils';

interface ApprovalsViewProps {
  bookings: Booking[];
  onApprove: (reqId: string, isStockIssue?: boolean) => void;
  onOpenRejectModal: (booking: Booking) => void;
  onOpenGatepass: (booking: Booking) => void;
}

export const ApprovalsView: React.FC<ApprovalsViewProps> = ({
  bookings,
  onApprove,
  onOpenRejectModal,
  onOpenGatepass,
}) => {
  const [filterType, setFilterType] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('pending');
  const [proofModalBooking, setProofModalBooking] = useState<Booking | null>(null);

  const filtered = bookings.filter((b) => {
    const matchesType = filterType === 'all' || b.type === filterType;
    const matchesStatus = filterStatus === 'all' || b.status === filterStatus;
    return matchesType && matchesStatus;
  });

  return (
    <div className="flex flex-col w-full gap-5 text-[#0b1c30]">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="font-mono text-xs uppercase text-[#009299] font-bold">
              Admin &amp; HOD Command
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
            <option value="rejected">Status: Rejected</option>
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
                filtered.map((b, idx) => (
                  <tr key={b.id || b._id || b.reqId || `appr-${idx}`} className="hover:bg-[#eff4ff]/40 transition-colors">
                    <td className="px-4 py-3 font-mono font-bold text-[#0e1c2f]">{b.reqId}</td>
                    <td className="px-4 py-3">
                      <div className="flex flex-col">
                        <span className="font-semibold text-[#0b1c30]">{b.assetName}</span>
                        <span className="font-mono text-[10px] text-[#44474c]">{b.assetCode}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-col">
                        <span className="font-medium text-[#0b1c30]">{b.requesterName}</span>
                        <span className="text-[10px] text-[#44474c]">{b.requesterRole}</span>
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
                            : 'bg-[#ffdad6] text-[#ba1a1a]'
                        }`}
                      >
                        {b.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1.5">
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
                              className="px-2 py-1 text-[#ba1a1a] hover:bg-[#ffdad6] rounded text-xs font-semibold transition-all"
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
                            className="px-2 py-1 bg-[#eff4ff] text-[#009299] hover:bg-[#dce9ff] rounded text-xs font-semibold transition-all border border-[#cbdbf5] flex items-center gap-1"
                            title="View Photo Proof"
                          >
                            <span className="material-symbols-outlined text-[15px]">photo_camera</span>
                            <span>Photo Proof</span>
                          </button>
                        )}
                        {(b.status === 'approved' || b.status === 'dispatched') && (
                          <button
                            onClick={() => onOpenGatepass(b)}
                            className="px-2.5 py-1 bg-[#eff4ff] text-[#0b1c30] hover:bg-[#dce9ff] rounded text-xs font-semibold transition-all border border-[#cbdbf5] flex items-center gap-1"
                          >
                            <span className="material-symbols-outlined text-[15px]">receipt_long</span>
                            <span>Gatepass</span>
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

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
