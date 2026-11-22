import React from 'react';

interface GuidelinesModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const GuidelinesModal: React.FC<GuidelinesModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#0e1c2f]/60 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="bg-white rounded-2xl max-w-2xl w-full p-6 sm:p-7 shadow-2xl border border-[#cbdbf5] flex flex-col gap-5 text-xs max-h-[90vh] overflow-y-auto">
        {/* Document Header */}
        <div className="flex items-start justify-between pb-4 border-b border-[#e5eeff]">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#009299]/10 border border-[#009299]/30 text-[#009299] flex items-center justify-center shrink-0 mt-0.5">
              <span className="material-symbols-outlined text-[24px]">verified_user</span>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#eff4ff] text-[#009299] font-bold border border-[#cbdbf5]">
                  INST-SOP-2026/V2.4
                </span>
                <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 font-bold border border-emerald-200">
                  Active Institutional Policy
                </span>
              </div>
              <h3 className="text-base font-bold text-[#0b1c30] mt-1">
                Central Facilities &amp; Equipment Requisition SOP Wiki
              </h3>
              <p className="text-[11px] text-[#44474c] mt-0.5">
                Standard operating guidelines for faculty checkouts, laboratory allocations, and security gatepass compliance.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-[#44474c] hover:text-[#0b1c30] p-1.5 rounded-lg hover:bg-[#eff4ff] transition-colors"
          >
            <span className="material-symbols-outlined text-[20px]">close</span>
          </button>
        </div>

        {/* Structured SOP Clauses */}
        <div className="flex flex-col gap-3.5 text-[#44474c]">
          {/* Clause 1.0 */}
          <div className="border border-[#e5eeff] rounded-xl overflow-hidden shadow-2xs">
            <div className="bg-[#eff4ff]/80 px-4 py-2 border-b border-[#e5eeff] flex items-center justify-between">
              <span className="font-bold text-[#0b1c30] flex items-center gap-2">
                <span className="w-5 h-5 rounded-md bg-[#009299] text-white flex items-center justify-center text-[10px] font-mono font-bold">
                  1.0
                </span>
                Requisition Windows &amp; Operational Dispatch
              </span>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-white text-[#426086] font-semibold border border-[#cbdbf5]">
                Dispatch Protocol
              </span>
            </div>
            <div className="p-4 bg-white flex flex-col gap-2 text-xs">
              <div className="flex items-start gap-2.5">
                <span className="text-[#009299] font-bold font-mono text-[11px] mt-0.5">1.1</span>
                <div>
                  <strong className="text-[#0b1c30]">Same-Day Temporary Checkouts (&lt; 8 Hours):</strong> Immediate dispatch upon Lab Assistant physical verification. All units must be checked back into Central Tech Desk before 17:00 hrs on the reservation date.
                </div>
              </div>
              <div className="flex items-start gap-2.5 pt-2 border-t border-gray-100">
                <span className="text-[#009299] font-bold font-mono text-[11px] mt-0.5">1.2</span>
                <div>
                  <strong className="text-[#0b1c30]">Overnight &amp; Multi-Day Reservations:</strong> Requisitions extending beyond regular operating hours require a minimum 24-hour advance submission and mandatory Department HOD digital endorsement.
                </div>
              </div>
            </div>
          </div>

          {/* Clause 2.0 */}
          <div className="border border-[#e5eeff] rounded-xl overflow-hidden shadow-2xs">
            <div className="bg-[#eff4ff]/80 px-4 py-2 border-b border-[#e5eeff] flex items-center justify-between">
              <span className="font-bold text-[#0b1c30] flex items-center gap-2">
                <span className="w-5 h-5 rounded-md bg-[#426086] text-white flex items-center justify-center text-[10px] font-mono font-bold">
                  2.0
                </span>
                Concurrency Protection &amp; Priority Overrides
              </span>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-white text-[#426086] font-semibold border border-[#cbdbf5]">
                Conflict Lock
              </span>
            </div>
            <div className="p-4 bg-white flex flex-col gap-2 text-xs">
              <div className="flex items-start gap-2.5">
                <span className="text-[#426086] font-bold font-mono text-[11px] mt-0.5">2.1</span>
                <div>
                  <strong className="text-[#0b1c30]">Automated Conflict Prevention:</strong> The system locks reserved time slots strictly. Double-booking of projectors, audio kits, or specialized audiovisual gear is blocked at submission time.
                </div>
              </div>
              <div className="flex items-start gap-2.5 pt-2 border-t border-gray-100">
                <span className="text-[#426086] font-bold font-mono text-[11px] mt-0.5">2.2</span>
                <div>
                  <strong className="text-[#0b1c30]">Institutional Convocations:</strong> Accreditations and official university examinations supersede routine classroom reservations with a mandatory 12-hour advance electronic notice.
                </div>
              </div>
            </div>
          </div>

          {/* Clause 3.0 */}
          <div className="border border-[#e5eeff] rounded-xl overflow-hidden shadow-2xs">
            <div className="bg-[#eff4ff]/80 px-4 py-2 border-b border-[#e5eeff] flex items-center justify-between">
              <span className="font-bold text-[#0b1c30] flex items-center gap-2">
                <span className="w-5 h-5 rounded-md bg-amber-600 text-white flex items-center justify-center text-[10px] font-mono font-bold">
                  3.0
                </span>
                Stationery Consumables &amp; Faculty Quota Rules
              </span>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-white text-[#426086] font-semibold border border-[#cbdbf5]">
                Quota Ledger
              </span>
            </div>
            <div className="p-4 bg-white flex flex-col gap-2 text-xs">
              <div className="flex items-start gap-2.5">
                <span className="text-amber-600 font-bold font-mono text-[11px] mt-0.5">3.1</span>
                <div>
                  <strong className="text-[#0b1c30]">Non-Returnable Allocation:</strong> Whiteboard markers (Black/Blue), dust-free chalk boxes, and paper reams are non-returnable upon issuance and deduct directly from the semester departmental quota.
                </div>
              </div>
              <div className="flex items-start gap-2.5 pt-2 border-t border-gray-100">
                <span className="text-amber-600 font-bold font-mono text-[11px] mt-0.5">3.2</span>
                <div>
                  <strong className="text-[#0b1c30]">Automated Reorder Alerts:</strong> When consumable inventory reaches safety thresholds (&le; min threshold), reorder notifications are triggered to central procurement.
                </div>
              </div>
            </div>
          </div>

          {/* Clause 4.0 */}
          <div className="border border-[#e5eeff] rounded-xl overflow-hidden shadow-2xs">
            <div className="bg-[#eff4ff]/80 px-4 py-2 border-b border-[#e5eeff] flex items-center justify-between">
              <span className="font-bold text-[#0b1c30] flex items-center gap-2">
                <span className="w-5 h-5 rounded-md bg-purple-600 text-white flex items-center justify-center text-[10px] font-mono font-bold">
                  4.0
                </span>
                Custody Handover, Visual Inspection &amp; Gatepasses
              </span>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-white text-[#426086] font-semibold border border-[#cbdbf5]">
                Security Audit
              </span>
            </div>
            <div className="p-4 bg-white flex flex-col gap-2 text-xs">
              <div className="flex items-start gap-2.5">
                <span className="text-purple-600 font-bold font-mono text-[11px] mt-0.5">4.1</span>
                <div>
                  <strong className="text-[#0b1c30]">Barcode &amp; Photo Audit:</strong> High-value assets undergo physical barcode scanning and timestamped condition photo logging on both checkout and check-in.
                </div>
              </div>
              <div className="flex items-start gap-2.5 pt-2 border-t border-gray-100">
                <span className="text-purple-600 font-bold font-mono text-[11px] mt-0.5">4.2</span>
                <div>
                  <strong className="text-[#0b1c30]">Inter-Block Transit Gatepass:</strong> Any asset movement across campus blocks requires an active printed or QR-verified Security Gatepass signed by the Lab In-charge.
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between pt-3 border-t border-[#e5eeff]">
          <span className="text-[11px] text-[#77849c] font-mono">
            College Facilities &amp; Asset Management Council • Reviewed Term I 2026-27
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 text-xs font-bold bg-[#0e1c2f] text-white rounded-lg hover:bg-[#426086] transition-all shadow-sm cursor-pointer"
          >
            Acknowledge &amp; Close
          </button>
        </div>
      </div>
    </div>
  );
};
