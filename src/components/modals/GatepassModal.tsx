import React, { useState } from 'react';
import { Booking } from '../../types';
import { printGatepassSlip, downloadGatepassSlip } from '../../utils/printUtils';

interface GatepassModalProps {
  booking: Booking | null;
  isOpen: boolean;
  onClose: () => void;
  onPrint?: () => void;
  showToast?: (msg: string, type?: 'info' | 'success' | 'warning') => void;
}

export const GatepassModal: React.FC<GatepassModalProps> = ({
  booking,
  isOpen,
  onClose,
  onPrint,
  showToast,
}) => {
  const [isPrinting, setIsPrinting] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);

  if (!isOpen || !booking) return null;

  const handleTriggerPrint = () => {
    setIsPrinting(true);
    try {
      printGatepassSlip(booking, 'Bharati Vidyapeeth / Campus AssetHub', showToast);
      if (onPrint) {
        onPrint();
      }
    } catch (err: any) {
      console.error('Error invoking print:', err);
      // Fallback direct download
      downloadGatepassSlip(booking, 'Bharati Vidyapeeth / Campus AssetHub');
      showToast?.(`Slip downloaded directly as fallback.`, 'info');
    } finally {
      setTimeout(() => setIsPrinting(false), 1200);
    }
  };

  const handleTriggerDownload = () => {
    setIsDownloading(true);
    try {
      const ok = downloadGatepassSlip(booking, 'Bharati Vidyapeeth / Campus AssetHub');
      if (ok) {
        showToast?.(`Official Gatepass ${booking.reqId} downloaded successfully!`, 'success');
      } else {
        showToast?.('Failed to download slip.', 'warning');
      }
    } catch (err) {
      showToast?.('Error downloading slip.', 'warning');
    } finally {
      setTimeout(() => setIsDownloading(false), 1000);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#0e1c2f]/60 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="w-full max-w-lg bg-white rounded-xl shadow-2xl overflow-hidden flex flex-col border border-[#cbdbf5]">
        {/* Header */}
        <div className="p-4 bg-[#0e1c2f] text-white flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-[#009299]">receipt_long</span>
            <span className="text-base font-bold font-['Inter']">Official Campus Asset Gatepass</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-[#cbdbf5] hover:text-white p-1 rounded transition-colors"
            title="Close"
          >
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        {/* Gatepass Body */}
        <div className="p-6 flex flex-col gap-4 max-h-[75vh] overflow-y-auto">
          <div className="p-3 rounded-lg bg-[#eff4ff] flex items-center justify-between border border-[#cbdbf5]/60">
            <div className="flex flex-col">
              <span className="text-[11px] text-[#44474c] uppercase font-semibold">
                Gatepass Reference
              </span>
              <span className="font-mono text-sm font-bold text-[#0b1c30]">{booking.reqId}</span>
            </div>
            <span className="px-2.5 py-1 rounded bg-white text-[#009299] text-[11px] font-bold border border-[#009299]/30 shadow-xs">
              STAMPED APPROVED
            </span>
          </div>

          <div className="flex flex-col gap-2.5 text-xs text-[#0b1c30]">
            <div className="flex justify-between py-1 border-b border-[#eff4ff]">
              <span className="text-[#44474c]">Borrower / Faculty:</span>
              <span className="font-semibold">{booking.requesterName}</span>
            </div>
            <div className="flex justify-between py-1 border-b border-[#eff4ff]">
              <span className="text-[#44474c]">Department:</span>
              <span>{booking.requesterDept || booking.department || 'Corporate Training & Placement Cell'}</span>
            </div>
            <div className="flex justify-between py-1 border-b border-[#eff4ff]">
              <span className="text-[#44474c]">Asset Details:</span>
              <span className="font-semibold text-right max-w-xs">{booking.assetName}</span>
            </div>
            <div className="flex justify-between py-1 border-b border-[#eff4ff]">
              <span className="text-[#44474c]">Scheduled Destination:</span>
              <span className="font-medium text-[#426086]">{booking.venue || 'Section A & Central Lab 1'}</span>
            </div>
            <div className="flex justify-between py-1 border-b border-[#eff4ff]">
              <span className="text-[#44474c]">Validity / Slot:</span>
              <span className="font-mono">
                {booking.bookingDate || '2026-10-26'}{' '}
                {booking.startTime ? `${booking.startTime} - ${booking.endTime}` : '09:00 - 17:00'}
              </span>
            </div>
            <div className="flex justify-between py-1">
              <span className="text-[#44474c]">Campus Checkpoint:</span>
              <span className="font-medium">Central Security Gate &amp; Bay 2 Tech Station</span>
            </div>
          </div>

          {/* Asset Condition Photo Evidence (if available) */}
          {(booking.handoverPhoto || booking.returnPhoto) && (
            <div className="p-3 bg-[#f8f9ff] rounded-lg border border-[#cbdbf5] flex flex-col gap-2">
              <span className="text-[10px] font-mono uppercase font-bold text-[#426086]">
                Photographic Custody Verification
              </span>
              <div className="grid grid-cols-2 gap-2">
                {booking.handoverPhoto && (
                  <div className="flex flex-col gap-1">
                    <span className="text-[9px] text-[#44474c] font-semibold">1. Handover Condition</span>
                    <img
                      src={booking.handoverPhoto}
                      alt="Handover Proof"
                      className="w-full h-20 object-cover rounded border border-[#cbdbf5]"
                    />
                  </div>
                )}
                {booking.returnPhoto && (
                  <div className="flex flex-col gap-1">
                    <span className="text-[9px] text-[#44474c] font-semibold">
                      2. Return Condition ({booking.returnCondition || 'Intact'})
                    </span>
                    <img
                      src={booking.returnPhoto}
                      alt="Return Proof"
                      className="w-full h-20 object-cover rounded border border-[#cbdbf5]"
                    />
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Barcode Graphic */}
          <div className="p-4 bg-[#f8f9ff] rounded-lg border border-[#cbdbf5] flex flex-col items-center justify-center gap-1.5">
            <div className="flex items-center gap-1 h-12 w-full justify-center">
              <span className="w-1.5 h-full bg-[#0b1c30]"></span>
              <span className="w-0.5 h-full bg-[#0b1c30]"></span>
              <span className="w-2 h-full bg-[#0b1c30]"></span>
              <span className="w-1 h-full bg-[#0b1c30]"></span>
              <span className="w-0.5 h-full bg-[#0b1c30]"></span>
              <span className="w-2.5 h-full bg-[#0b1c30]"></span>
              <span className="w-1 h-full bg-[#0b1c30]"></span>
              <span className="w-0.5 h-full bg-[#0b1c30]"></span>
              <span className="w-2 h-full bg-[#0b1c30]"></span>
              <span className="w-1 h-full bg-[#0b1c30]"></span>
              <span className="w-2 h-full bg-[#0b1c30]"></span>
              <span className="w-0.5 h-full bg-[#0b1c30]"></span>
              <span className="w-1.5 h-full bg-[#0b1c30]"></span>
            </div>
            <span className="font-mono text-xs text-[#44474c] tracking-widest font-bold">
              *{booking.reqId}-GATEPASS-SEC*
            </span>
          </div>

          <div className="text-[10px] text-[#77849c] bg-[#eff4ff]/50 p-2.5 rounded border border-[#cbdbf5]/50 flex items-center gap-2">
            <span className="material-symbols-outlined text-[16px] text-[#009299]">verified_user</span>
            <span>Gatepass digitally validated for security station dispatch and return logging.</span>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-4 bg-[#eff4ff] flex flex-wrap items-center justify-between gap-2 border-t border-[#cbdbf5]/60">
          <button
            type="button"
            onClick={onClose}
            className="h-9 px-4 rounded-lg bg-white text-[#0b1c30] text-xs font-semibold hover:bg-gray-100 transition-all border border-[#cbdbf5]"
          >
            Close
          </button>
          
          <div className="flex items-center gap-2">
            {/* Direct Download Option */}
            <button
              type="button"
              onClick={handleTriggerDownload}
              disabled={isDownloading}
              className="h-9 px-3 rounded-lg bg-white text-[#0b1c30] text-xs font-semibold hover:bg-gray-50 transition-all border border-[#cbdbf5] flex items-center gap-1.5 shadow-xs"
              title="Download standalone printable gatepass file (opens in any browser and prints to PDF)"
            >
              <span className="material-symbols-outlined text-[16px] text-[#426086]">
                {isDownloading ? 'hourglass_top' : 'download'}
              </span>
              <span>{isDownloading ? 'Saving...' : 'Download Slip'}</span>
            </button>

            {/* Print Official Slip Button */}
            <button
              type="button"
              onClick={handleTriggerPrint}
              disabled={isPrinting}
              className="h-9 px-4 rounded-lg bg-[#0e1c2f] text-white text-xs font-semibold hover:bg-[#1a3454] active:bg-[#081220] transition-all flex items-center gap-1.5 shadow-sm cursor-pointer"
            >
              <span className="material-symbols-outlined text-[18px]">
                {isPrinting ? 'hourglass_top' : 'print'}
              </span>
              <span>{isPrinting ? 'Preparing Slip...' : 'Print Official Slip'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
