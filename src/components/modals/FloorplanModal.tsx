import React from 'react';

interface FloorplanModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const FloorplanModal: React.FC<FloorplanModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#0e1c2f]/50 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="bg-white rounded-xl max-w-2xl w-full p-6 shadow-2xl border border-[#cbdbf5] flex flex-col gap-4">
        <div className="flex items-center justify-between pb-2 border-b border-[#e5eeff]">
          <div className="flex items-center gap-2 text-[#426086]">
            <span className="material-symbols-outlined text-[24px]">map</span>
            <h3 className="text-base font-bold text-[#0b1c30]">Departmental Visual Floorplan & Lab Deployments</h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-[#44474c] hover:text-[#0b1c30] p-1 rounded-lg"
          >
            <span className="material-symbols-outlined text-[20px]">close</span>
          </button>
        </div>

        {/* Visual Map Grid */}
        <div className="grid grid-cols-2 gap-4 p-4 bg-[#eff4ff] rounded-xl border border-[#cbdbf5]">
          {/* Lab 1 */}
          <div className="p-4 bg-white rounded-lg border border-[#cbdbf5] flex flex-col justify-between shadow-sm">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-[#0b1c30]">Computer Lab 1 (Main)</span>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-[#eff4ff] text-[#426086]">
                34 Units
              </span>
            </div>
            <p className="text-[11px] text-[#44474c]">32 PCs · 1 Projector · 1 Laser Printer</p>
            <div className="mt-3 flex items-center gap-1.5 text-[10px] text-[#009299] font-semibold">
              <span className="w-2 h-2 rounded-full bg-[#009299]"></span> All Nodes Operational
            </div>
          </div>

          {/* Lab 2 */}
          <div className="p-4 bg-white rounded-lg border border-[#cbdbf5] flex flex-col justify-between shadow-sm">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-[#0b1c30]">Computer Lab 2 (Software Dev)</span>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-[#eff4ff] text-[#426086]">
                23 Units
              </span>
            </div>
            <p className="text-[11px] text-[#44474c]">20 PCs · Document Camera · Consumables Locker</p>
            <div className="mt-3 flex items-center gap-1.5 text-[10px] text-[#009299] font-semibold">
              <span className="w-2 h-2 rounded-full bg-[#009299]"></span> Stock Monitored
            </div>
          </div>

          {/* Seminar Hall A */}
          <div className="p-4 bg-white rounded-lg border border-[#cbdbf5] flex flex-col justify-between shadow-sm">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-[#0b1c30]">Seminar Hall A</span>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-[#eff4ff] text-[#426086]">
                5 Units
              </span>
            </div>
            <p className="text-[11px] text-[#44474c]">Epson 3LCD Projector · JBL PA Sound · Wireless Mic</p>
            <div className="mt-3 flex items-center gap-1.5 text-[10px] text-[#426086] font-semibold">
              <span className="w-2 h-2 rounded-full bg-[#426086]"></span> Active Presentation Rig
            </div>
          </div>

          {/* Faculty Research Wing */}
          <div className="p-4 bg-white rounded-lg border border-[#cbdbf5] flex flex-col justify-between shadow-sm">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-[#0b1c30]">Faculty Research Wing</span>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-[#eff4ff] text-[#426086]">
                16 Units
              </span>
            </div>
            <p className="text-[11px] text-[#44474c]">10 ThinkPads · 4 USB Hubs · 2 Flatbed Scanners</p>
            <div className="mt-3 flex items-center gap-1.5 text-[10px] text-[#009299] font-semibold">
              <span className="w-2 h-2 rounded-full bg-[#009299]"></span> Permanent Custody
            </div>
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#e5eeff]">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold bg-[#0e1c2f] text-white rounded-lg hover:bg-[#426086] transition-all"
          >
            Close Floorplan
          </button>
        </div>
      </div>
    </div>
  );
};
