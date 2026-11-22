import React, { useState } from 'react';
import { Booking } from '../../types';

interface RejectModalProps {
  booking: Booking | null;
  isOpen: boolean;
  onClose: () => void;
  onConfirmReject: (reqId: string, reason: string, remarks: string) => void;
}

export const RejectModal: React.FC<RejectModalProps> = ({
  booking,
  isOpen,
  onClose,
  onConfirmReject,
}) => {
  const [reason, setReason] = useState('Time Slot Conflict');
  const [remarks, setRemarks] = useState('');

  if (!isOpen || !booking) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onConfirmReject(booking.reqId, reason, remarks);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#0e1c2f]/50 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="bg-white rounded-xl max-w-md w-full p-6 shadow-2xl border border-[#cbdbf5] flex flex-col gap-4">
        <div className="flex items-center justify-between pb-2 border-b border-[#e5eeff]">
          <div className="flex items-center gap-2 text-[#ba1a1a]">
            <span className="material-symbols-outlined text-[24px]">cancel</span>
            <h3 className="text-lg font-bold text-[#0b1c30]">Reject Reservation</h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-[#44474c] hover:text-[#0b1c30] p-1 rounded-lg"
          >
            <span className="material-symbols-outlined text-[20px]">close</span>
          </button>
        </div>

        <p className="text-xs text-[#44474c] leading-relaxed">
          You are rejecting requisition{' '}
          <span className="font-mono font-bold text-[#0b1c30]">{booking.reqId}</span> for{' '}
          <span className="font-semibold text-[#0b1c30]">{booking.requesterName}</span>. Please specify the
          administrative reason:
        </p>

        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          <div className="flex flex-col gap-1">
            <label className="text-xs font-semibold text-[#0b1c30]">Select Reason</label>
            <select
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="w-full h-10 px-3 rounded-lg bg-[#eff4ff] text-[#0b1c30] text-xs focus:outline-none focus:ring-1 focus:ring-[#009299] border border-[#cbdbf5]"
            >
              <option value="Time Slot Conflict">Time slot conflict with higher priority lecture</option>
              <option value="Insufficient Stock">Insufficient reserve units / Low stock buffer</option>
              <option value="Scheduled Maintenance">Equipment scheduled for periodic servicing</option>
              <option value="Venue Incompatible">Venue lacks compatible electrical / rigging ports</option>
              <option value="Other">Other departmental rationale</option>
            </select>
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-xs font-semibold text-[#0b1c30]">
              Additional Remarks (Optional)
            </label>
            <textarea
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
              placeholder="Provide context sent to faculty notification inbox..."
              rows={3}
              className="w-full p-3 rounded-lg bg-[#eff4ff] text-[#0b1c30] text-xs focus:outline-none focus:ring-1 focus:ring-[#009299] border border-[#cbdbf5] placeholder:text-gray-400"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-[#44474c] hover:bg-[#eff4ff] rounded-lg transition-all"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 text-xs font-semibold bg-[#ba1a1a] text-white hover:bg-[#ba1a1a]/90 rounded-lg shadow-sm transition-all flex items-center gap-1.5"
            >
              <span>Confirm Rejection</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
